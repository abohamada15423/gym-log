// Accounts and sync for the coach version (docs/coach-plan.md, section 5).
//
// The phone always writes to localStorage first (save() in logic.js). Once this device is linked to an
// account, each save is compared with what the server last had, and every changed record goes into an
// outbox that uploads as soon as there is a connection. Other devices' changes come back by pulling each
// table by the server's updated_at, with a 5-minute overlap. Conflicts: the newest edit wins, judged by
// modified_at (when the change was made on a device), never by when it reached the server. The server
// half of these rules is private.sync_row() in supabase/migrations/0001_coach_core.sql.
// Classic script sharing the page's global scope; see README for load order.

var SYNC_KEY = "gymlog-sync-v1";
// Edit time given to what was on the phone before it had an account: any real edit is newer.
var LEGACY_M = "2000-01-01T00:00:00.000Z";
var SYNC_OVERLAP_MS = 5 * 60 * 1000, SYNC_PAGE = 500, SYNC_CHUNK = 100, SYNC_PULL_EVERY = 5 * 60 * 1000;

// What a client logs. list: the array in state; conflict: what an upsert matches on; order: tie-breaker for paging.
var SYNC_TABLES = {
  workout_sessions: { list: "sessions", conflict: "id", order: "id" },
  food_logs: { list: "food", conflict: "id", order: "id" },
  body_checkins: { list: "body", conflict: "id", order: "id" },
  habit_days: { conflict: "client_id,date", order: "date" },
  client_settings: { conflict: "client_id,key", order: "key" }
};
// Written by the coach, read here.
var COACH_TABLES = ["programs", "meal_plans"];
// One client_settings row per key, so two devices editing different settings don't overwrite each other.
var SETTING_FIELDS = { goals: "goals", habit_list: "habitList", my_foods: "myFoods", custom_lib: "customLib", baselines: "baselines", custom_program: "custom", reminder: "reminder" };
var BODY_KEYS = ["kg", "waist", "chest", "arm", "thigh", "hips", "fat"];

/* ---------- state kept next to the app's data ---------- */
// uid: the account this device's data belongs to. outbox: key -> {m: edit time, del}. shadow: key -> hash of
// the version the server has. hold: records the user chose to keep on this phone. cursor: table -> the
// newest server updated_at pulled. ask: waiting for the user to say what happens to this phone's data.
// comments: the thread with the coach, id -> comment (comments.js shape); cout: comments written or deleted
// here and not uploaded yet, id -> {op: "add" | "del"}; readOut: comments seen here whose read receipt
// hasn't reached the server. push: this browser's notification subscription for the account, if it's on.
function freshSync() {
  return {
    v: 1, uid: null, email: null, name: null, role: null, ask: false,
    cursor: {}, outbox: {}, shadow: {}, hold: {}, rejected: {},
    coach: null, programs: {}, plans: {}, seenProgram: null, seenProgramM: null, seenPlan: null, lastSync: null, invite: null,
    comments: {}, cout: {}, readOut: [], push: null
  };
}
var sync = (function () {
  try { var s = JSON.parse(localStorage.getItem(SYNC_KEY)); if (s && s.v === 1) return Object.assign(freshSync(), s); } catch (e) { }
  return freshSync();
})();
function saveSync() { try { localStorage.setItem(SYNC_KEY, JSON.stringify(sync)); } catch (e) { } }
function persistState() { try { localStorage.setItem("gymlog-v1", JSON.stringify(state)); } catch (e) { } }
function syncLinked() { return !!sync.uid; }
function syncPending() { return Object.keys(sync.outbox).length + Object.keys(sync.cout).length; }

// What is happening right now (not saved): phase is one of local, saved, syncing, ok, offline, signin, error.
var syncRt = { phase: "local", busy: null, again: null, lastPull: 0, retry: null, wait: 0, note: null, signingOut: false, hasSession: false, error: null, urlType: null, renderLater: false };

/* ---------- small helpers ---------- */
function isoNow() { return new Date().toISOString(); }
function msOf(t) { var n = Date.parse(t); return isFinite(n) ? n : 0; }
function isDay(d) { return typeof d === "string" && /^\d{4}-\d\d-\d\d$/.test(d) && isFinite(Date.parse(d + "T00:00:00Z")); }
function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s); }
function isEmptyVal(v) { return v == null || (Array.isArray(v) ? !v.length : typeof v === "object" && !Object.keys(v).length); }
// JSON with sorted keys: the database stores objects in its own key order, and that must not count as an edit.
function stableStr(v) {
  if (v === null || v === undefined || typeof v !== "object") return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return "[" + v.map(stableStr).join(",") + "]";
  return "{" + Object.keys(v).filter(function (k) { return v[k] !== undefined; }).sort().map(function (k) { return JSON.stringify(k) + ":" + stableStr(v[k]); }).join(",") + "}";
}
// cyrb128 (public domain, bryc): a fast 128-bit string hash. Not for secrets: only to spot changes and name old records.
function cyrb128(str) {
  var h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (var i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0].map(function (x) { return (x + 0x100000000).toString(16).slice(1); }).join("");
}
function rowHash(row) { return cyrb128(stableStr(row)).slice(0, 20); }
// The same text always gives the same uuid, so an old record keeps one id on every device it was copied to.
function uuidFrom(str) {
  var x = cyrb128(str);
  return x.slice(0, 8) + "-" + x.slice(8, 12) + "-8" + x.slice(13, 16) + "-" + ((parseInt(x[16], 16) & 3) | 8).toString(16) + x.slice(17, 20) + "-" + x.slice(20, 32);
}
function netError() { var e = new Error("offline"); e.net = true; return e; }
function isNetLike(e) {
  if (!e) return false;
  if (e.net || e.status === 0 || e.name === "AuthRetryableFetchError" || e.name === "AbortError") return true;
  return /failed to fetch|networkerror|load failed|fetcherror|aborterror|network request failed/i.test(String(e.message || ""));
}

/* ---------- local records <-> server rows ---------- */
function txt(v, max) { if (v == null) return null; v = String(v); return v.trim() ? v.slice(0, max) : null; }
// a number with lo <= v < hi (closed: lo < v < hi), otherwise null; these mirror the table's check constraints
function rng(v, lo, hi, open) { v = typeof v === "number" ? v : num(v); return v !== null && isFinite(v) && (open ? v > lo : v >= lo) && v < hi ? v : null; }
function plainObj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : null; }

var ROW = {
  workout_sessions: function (s) {
    var notes = plainObj(s.notes);
    return {
      id: s.id, date: s.date, day_id: txt(s.day, 64), day_name: txt(s.dayName, 80), program_id: txt(s.prog, 64),
      sets: plainObj(s.sets) || {}, notes: notes && Object.keys(notes).length ? notes : null, note: txt(s.note, 2000)
    };
  },
  food_logs: function (f) {
    return { id: f.id, date: f.date, name: txt(f.name, 120) || "Food", kcal: rng(f.kcal, 0, 20000) || 0, p: rng(f.p, 0, 2000) || 0, c: rng(f.c, 0, 2000), f: rng(f.f, 0, 2000) };
  },
  body_checkins: function (b) {
    var r = { id: b.id, date: b.date };
    BODY_KEYS.forEach(function (k) { r[k] = k === "kg" ? rng(b.kg, 20, 400, true) : k === "fat" ? rng(b.fat, 0, 70, true) : rng(b[k], 0, 300, true); });
    r.note = txt(b.note, 500);
    return r;
  },
  habit_days: function (v, d) { return { date: d, data: v }; },
  client_settings: function (v, k) { return { key: k, value: v }; }
};
var FROM = {
  workout_sessions: function (r) {
    var s = { id: r.id, date: r.date, day: r.day_id, dayName: r.day_name, prog: r.program_id, sets: plainObj(r.sets) || {} };
    if (plainObj(r.notes) && Object.keys(r.notes).length) s.notes = r.notes;
    if (r.note) s.note = r.note;
    return orderSets(s);
  },
  food_logs: function (r) {
    var f = { id: r.id, date: r.date, name: r.name, kcal: Number(r.kcal) || 0, p: Number(r.p) || 0 };
    if (r.c != null) f.c = Number(r.c); if (r.f != null) f.f = Number(r.f);
    return f;
  },
  body_checkins: function (r) {
    var b = { id: r.id, date: r.date, note: r.note || "" };
    BODY_KEYS.forEach(function (k) { b[k] = r[k] == null ? null : Number(r[k]); });
    return b;
  },
  habit_days: function (r) { return plainObj(r.data); },
  client_settings: function (r) { return r.value; }
};
// The database keeps a workout's exercises in its own order; put them back in the order of the day they came from.
function orderSets(s) {
  var lists = [];
  if (s.prog === "coach" && coachProgram()) lists.push(coachProgram().days);
  else if (s.prog === "custom" && state.custom && Array.isArray(state.custom.days)) lists.push(state.custom.days);
  PROGRAMS.forEach(function (p) { if (p.id === (s.prog || "split4")) lists.push(p.days); });
  var day = null;
  lists.forEach(function (L) { L.forEach(function (d) { if (!day && d.id === s.day) day = d; }); });
  if (!day) return s;
  var out = {};
  day.ex.forEach(function (e) { if (s.sets[e[0]]) out[e[0]] = s.sets[e[0]]; });
  Object.keys(s.sets).forEach(function (n) { if (!out[n]) out[n] = s.sets[n]; });
  s.sets = out;
  return s;
}
function tableOf(key) { return key.slice(0, key.indexOf(":")); }
function idOf(key) { return key.slice(key.indexOf(":") + 1); }
function rowKeyOf(t, r) {
  var v = t === "habit_days" ? r.date : t === "client_settings" ? r.key : r.id;
  return v ? t + ":" + v : null;
}
function indexById(list, id) { for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return i; return -1; }

// Every record on this phone that the server keeps, as the row the server would store.
function eachLocal(cb) {
  ["workout_sessions", "food_logs", "body_checkins"].forEach(function (t) {
    (state[SYNC_TABLES[t].list] || []).forEach(function (rec) {
      if (rec && isUuid(rec.id) && isDay(rec.date)) cb(t + ":" + rec.id, t, ROW[t](rec));
    });
  });
  var hab = state.habits || {};
  Object.keys(hab).forEach(function (d) { if (isDay(d) && plainObj(hab[d])) cb("habit_days:" + d, "habit_days", ROW.habit_days(hab[d], d)); });
  Object.keys(SETTING_FIELDS).forEach(function (k) {
    var v = state[SETTING_FIELDS[k]], key = "client_settings:" + k;
    // a setting nobody has touched yet isn't sent; once it has been, emptying it is an edit like any other
    if (v == null || (isEmptyVal(v) && !sync.shadow[key])) return;
    cb(key, "client_settings", ROW.client_settings(v, k));
  });
}
function localCounts() {
  var hab = Object.keys(state.habits || {}).filter(function (d) {
    var v = state.habits[d]; return plainObj(v) && Object.keys(v).some(function (k) { return !!v[k]; });
  }).length;
  var c = { sessions: state.sessions.length, food: state.food.length, body: state.body.length, habits: hab };
  c.total = c.sessions + c.food + c.body + c.habits;
  return c;
}

// Records made before this version have short ids, and check-ins had none. Give each one a uuid made from
// the account and its old id (or its content), so the same old record copied to two phones becomes one row.
function normalizeIds(target) {
  var changed = false, ns = sync.uid || "local";
  ["sessions", "food", "body"].forEach(function (list) {
    var seen = {};
    (target[list] || []).forEach(function (rec) {
      if (!rec || typeof rec !== "object") return;
      var id = typeof rec.id === "string" ? rec.id.toLowerCase() : rec.id;
      if (!isUuid(id)) id = uuidFrom(ns + "|" + list + "|" + (rec.id != null && rec.id !== "" ? String(rec.id) : rec.date + "|" + stableStr(rec)));
      var base = id, n = 1;
      while (seen[id]) id = uuidFrom(base + "#" + (n++));
      seen[id] = 1;
      if (rec.id !== id) { rec.id = id; changed = true; }
    });
  });
  return changed;
}

/* ---------- finding what changed on this phone ---------- */
function syncScan() {
  if (!sync.uid || sync.ask) return 0;
  syncRt.dirty = false;
  reminderRefresh();
  var ids = normalizeIds(state), now = isoNow(), seen = {}, n = 0;
  eachLocal(function (key, t, row) {
    seen[key] = 1;
    if (sync.hold[key]) return;
    var hs = rowHash(row);
    if (sync.shadow[key] !== hs) { sync.shadow[key] = hs; sync.outbox[key] = { m: now }; delete sync.rejected[key]; n++; }
  });
  Object.keys(sync.shadow).forEach(function (key) {
    if (seen[key]) return;
    delete sync.shadow[key]; delete sync.rejected[key];
    sync.outbox[key] = { m: now, del: true }; n++;
  });
  Object.keys(sync.hold).forEach(function (k) { if (!seen[k]) delete sync.hold[k]; });
  if (ids) persistState();
  if (n || ids) saveSync();
  return n;
}
// Called by save(): show that it's on the phone, then upload shortly (one upload for a burst of edits).
function syncNoteSave() {
  if (!sync.uid || sync.ask) return;
  syncRt.dirty = true;  // counts as waiting to upload until the scan has run
  if (syncRt.phase !== "offline" && syncRt.phase !== "signin") setPhase("saved");
  else if (typeof paintAccount === "function") paintAccount();
  clearTimeout(syncRt.note);
  syncRt.note = setTimeout(function () { syncNow(); }, 1200);
}

/* ---------- talking to the server ---------- */
// Everything sync.js asks of the server goes through this adapter; the tests swap it for a fake server.
var syncApi = {
  user: function () {
    return sbReady().then(function (c) { return c.auth.getSession(); }).then(function (r) {
      if (r.error && isNetLike(r.error)) throw netError();
      return r.data && r.data.session ? r.data.session.user : null;
    });
  },
  upsert: function (t, rows, conflict) { return sb.from(t).upsert(rows, { onConflict: conflict }); },
  softDelete: function (t, match, m) {
    var q = sb.from(t).update({ deleted_at: m, modified_at: m });
    Object.keys(match).forEach(function (k) { q = q.eq(k, match[k]); });
    return q;
  },
  pull: function (t, uid, since, from, n, order) {
    var q = sb.from(t).select("*").eq("client_id", uid);
    if (since) q = q.gt("updated_at", since);
    return q.order("updated_at", { ascending: true }).order(order, { ascending: true }).range(from, from + n - 1);
  },
  profile: function (id) { return sb.from("profiles").select("id,full_name,role").eq("id", id).maybeSingle(); },
  coachLink: function (uid) { return sb.from("coach_clients").select("coach_id,status").eq("client_id", uid).neq("status", "archived").limit(1); },
  leaveCoach: function (uid, coachId) { return sb.from("coach_clients").update({ status: "archived" }).eq("client_id", uid).eq("coach_id", coachId); },
  rpc: function (name, args) { return sb.rpc(name, args || {}); },
  addComment: function (row) { return sb.from("comments").insert(row); },
  removeComment: function (id) { return sb.from("comments").update({ deleted_at: isoNow() }).eq("id", id); },
  savePush: function (row) { return sb.from("push_subscriptions").upsert(row, { onConflict: "user_id,endpoint" }); },
  dropPush: function (uid, endpoint) { return sb.from("push_subscriptions").delete().eq("user_id", uid).eq("endpoint", endpoint); },
  photos: function (uid) { return sb.storage.from("progress").list(uid, { limit: 1000 }); },
  removePhotos: function (paths) { return sb.storage.from("progress").remove(paths); }
};

// Sorts a failed request: no connection, signed out and server trouble are thrown (retry later);
// anything else means the server refused the data itself, and the caller sets that record aside.
function syncCheck(res) {
  var e = res.error || {}, st = res.status || e.status || 0, code = String(e.code || "");
  if (st === 0 || isNetLike(e)) throw netError();
  if (st === 401 || /^PGRST30/.test(code) || /jwt/i.test(String(e.message || ""))) { var a = new Error("signed out"); a.auth = true; throw a; }
  var dataErr = /^2[23]/.test(code) || code === "42501" || /^PGRST1/.test(code);
  if (!dataErr) { var s = new Error(e.message || "The server had a problem"); s.server = true; throw s; }
}

async function syncPush() {
  var keys = Object.keys(sync.outbox);
  if (!keys.length) return;
  var now = {}, groups = {};
  eachLocal(function (key, t, row) { now[key] = row; });
  keys.forEach(function (key) {
    var t = tableOf(key), e = sync.outbox[key];
    if (!SYNC_TABLES[t]) { delete sync.outbox[key]; return; }
    var g = groups[t] = groups[t] || { up: [], del: [] };
    if (e.del) g.del.push(key);
    else if (now[key]) g.up.push(key);
    // else it went away since the scan: the next scan turns it into a delete
  });
  for (var t in groups) {
    for (var i = 0; i < groups[t].up.length; i += SYNC_CHUNK) await pushRows(t, groups[t].up.slice(i, i + SYNC_CHUNK), now);
    for (var j = 0; j < groups[t].del.length; j++) await pushDelete(t, groups[t].del[j]);
  }
}
async function pushRows(t, keys, now) {
  var sent = keys.map(function (k) { return sync.outbox[k].m; });
  var rows = keys.map(function (k, i) { return Object.assign({ client_id: sync.uid }, now[k], { modified_at: sent[i], deleted_at: null }); });
  var res = await syncApi.upsert(t, rows, SYNC_TABLES[t].conflict);
  if (res.error) {
    syncCheck(res);
    // One record the server won't take must not hold up the rest: send them one by one, set the bad one aside.
    if (keys.length > 1) { for (var i = 0; i < keys.length; i++) await pushRows(t, [keys[i]], now); return; }
    sync.rejected[keys[0]] = { m: sent[0], why: String(res.error.message || res.error.code || "refused").slice(0, 200) };
  }
  // an edit made while this was uploading has a newer time and stays queued
  keys.forEach(function (k, i) { if (sync.outbox[k] && sync.outbox[k].m === sent[i]) delete sync.outbox[k]; });
  saveSync();
}
async function pushDelete(t, key) {
  var m = sync.outbox[key].m, v = idOf(key), match = { client_id: sync.uid };
  match[t === "habit_days" ? "date" : t === "client_settings" ? "key" : "id"] = v;
  var res = await syncApi.softDelete(t, match, m);
  if (res.error) { syncCheck(res); sync.rejected[key] = { m: m, why: String(res.error.message || "refused").slice(0, 200) }; }
  if (sync.outbox[key] && sync.outbox[key].m === m) delete sync.outbox[key];
  saveSync();
}

async function syncPull() {
  var changed = false, tables = Object.keys(SYNC_TABLES).concat(COACH_TABLES, ["comments"]);
  for (var i = 0; i < tables.length; i++) if (await pullTable(tables[i])) changed = true;
  if (await pullPeople()) changed = true;
  syncRt.lastPull = Date.now();
  if (changed) syncApplied();
}
async function pullTable(t) {
  // updated_at is set when the server's transaction starts, so a row can land just behind the cursor: overlap a bit
  var since = sync.cursor[t] ? new Date(msOf(sync.cursor[t]) - SYNC_OVERLAP_MS).toISOString() : null;
  var max = sync.cursor[t] || null, from = 0, changed = false, coach = COACH_TABLES.indexOf(t) > -1;
  for (; ;) {
    var res = await syncApi.pull(t, sync.uid, since, from, SYNC_PAGE, coach || t === "comments" ? "id" : SYNC_TABLES[t].order);
    if (res.error) { syncCheck(res); var e = new Error(res.error.message || "Could not download"); e.server = true; throw e; }
    var rows = res.data || [];
    rows.forEach(function (r) {
      if (t === "comments" ? mergeComment(r) : coach ? mergeCoachRow(t, r) : mergeRow(t, r)) changed = true;
      if (r.updated_at && (!max || msOf(r.updated_at) > msOf(max))) max = r.updated_at;
    });
    // the data first, then the cursor: if the app stops in between, the rows are simply pulled again
    if (changed) persistState();
    if (max) sync.cursor[t] = max;
    saveSync();
    if (rows.length < SYNC_PAGE) break;
    from += SYNC_PAGE;
  }
  return changed;
}
// A row from the server. Returns true if this phone's data changed.
function mergeRow(t, r) {
  var key = rowKeyOf(t, r); if (!key) return false;
  var pend = sync.outbox[key];
  if (pend && !(msOf(r.modified_at) > msOf(pend.m))) return false;  // the edit on this phone is newer: it uploads next
  if (pend) delete sync.outbox[key];
  delete sync.hold[key]; delete sync.rejected[key];
  if (r.deleted_at) { delete sync.shadow[key]; return removeLocal(t, idOf(key)); }
  var rec = FROM[t](r);
  if (rec == null || !validLocal(t, idOf(key), rec)) return false;
  var hs = rowHash(t === "habit_days" || t === "client_settings" ? ROW[t](rec, idOf(key)) : ROW[t](rec));
  if (!pend && sync.shadow[key] === hs && hasLocal(t, idOf(key))) return false;  // nothing new
  putLocal(t, idOf(key), rec);
  sync.shadow[key] = hs;
  return true;
}
function validLocal(t, k, v) {
  if (t === "habit_days") return isDay(k) && !!plainObj(v);
  if (t === "client_settings") {
    if (k === "goals" || k === "baselines" || k === "reminder") return !!plainObj(v);
    if (k === "custom_program") return !!plainObj(v) && Array.isArray(v.days) && v.days.length > 0;
    return Array.isArray(v);
  }
  return isUuid(v.id) && isDay(v.date);
}
function hasLocal(t, k) {
  if (t === "habit_days") return !!(state.habits && state.habits[k]);
  if (t === "client_settings") return state[SETTING_FIELDS[k]] != null;
  return indexById(state[SYNC_TABLES[t].list], k) > -1;
}
function putLocal(t, k, rec) {
  if (t === "habit_days") { state.habits[k] = rec; return; }
  if (t === "client_settings") { if (SETTING_FIELDS[k]) state[SETTING_FIELDS[k]] = rec; return; }
  var list = state[SYNC_TABLES[t].list], i = indexById(list, k);
  if (i > -1) list[i] = rec;
  else { list.push(rec); syncRt.sortLists = true; }
}
function removeLocal(t, k) {
  if (t === "habit_days") { if (!state.habits[k]) return false; delete state.habits[k]; return true; }
  if (t === "client_settings") {
    var f = SETTING_FIELDS[k]; if (!f || state[f] == null) return false;
    if (f === "habitList") delete state.habitList; else state[f] = fresh()[f];
    return true;
  }
  var list = state[SYNC_TABLES[t].list], i = indexById(list, k);
  if (i < 0) return false;
  list.splice(i, 1);
  return true;
}

/* ---------- what the coach sends: programs and meal plans ---------- */
function mergeCoachRow(t, r) {
  var map = t === "programs" ? sync.programs : sync.plans, had = !!map[r.id];
  var v = !r.deleted_at && r.active !== false && r.client_id === sync.uid ? (t === "programs" ? cleanProgram(r) : cleanPlan(r)) : null;
  if (!v) { delete map[r.id]; return had; }
  var before = stableStr(map[r.id] || null);
  map[r.id] = v;
  return stableStr(v) !== before;
}
// A program from the server becomes the same shape as the built-in ones (js/data.js); anything odd is dropped.
function cleanProgram(r) {
  if (!Array.isArray(r.days)) return null;
  var days = [], seen = {};
  r.days.slice(0, 14).forEach(function (d) {
    if (!plainObj(d) || !Array.isArray(d.ex)) return;
    var n = days.length + 1, id = String(d.id || "d" + n).slice(0, 64);
    while (seen[id]) id += "-" + n;
    seen[id] = 1;
    var ex = d.ex.slice(0, 40).map(function (e) {
      if (!Array.isArray(e) || typeof e[0] !== "string" || !e[0].trim()) return null;
      var name = e[0].trim().slice(0, 80), L = LIBMAP[name];
      var sets = Math.round(Number(e[1])), rest = Math.round(Number(e[4]));
      return [name, sets >= 1 && sets <= 20 ? sets : (L ? L[3] : 3),
        e[2] != null && String(e[2]).trim() ? String(e[2]).trim().slice(0, 12) : (L ? L[4] : "10"),
        typeof e[3] === "string" && e[3].trim() ? e[3].slice(0, 60) : (L ? L[2] : ""),
        rest >= 15 && rest <= 600 ? rest : (L ? L[5] : 90)];
    }).filter(Boolean);
    days.push({ id: id, tag: "Day " + n, name: String(d.name || "Day " + n).slice(0, 80), ex: ex });
  });
  if (!days.length) return null;
  return { id: r.id, name: String(r.name || "Coach's program").slice(0, 80), days: days, m: r.modified_at, coach: r.coach_id };
}
function cleanPlan(r) {
  var t = plainObj(r.targets) || {}, targets = {};
  var kcal = rng(t.kcal, 800, 8001), protein = rng(t.protein, 20, 501), carbs = rng(t.carbs, 0, 1501), fat = rng(t.fat, 0, 501);
  if (kcal !== null) targets.kcal = Math.round(kcal);
  if (protein !== null) targets.protein = Math.round(protein);
  if (carbs !== null) targets.carbs = Math.round(carbs);
  if (fat !== null) targets.fat = Math.round(fat);
  var meals = (Array.isArray(r.meals) ? r.meals : []).slice(0, 12).map(function (m) {
    if (!plainObj(m) || !txt(m.name, 80)) return null;
    var out = { name: txt(m.name, 80), kcal: Math.round(rng(m.kcal, 0, 20000) || 0), p: rng(m.p, 0, 2000) || 0 };
    if (rng(m.c, 0, 2000) !== null) out.c = rng(m.c, 0, 2000);
    if (rng(m.f, 0, 2000) !== null) out.f = rng(m.f, 0, 2000);
    out.items = (Array.isArray(m.items) ? m.items : []).filter(function (x) { return typeof x === "string" && x.trim(); }).slice(0, 20).map(function (x) { return x.slice(0, 120); });
    return out;
  }).filter(Boolean);
  return { id: r.id, name: String(r.name || "Meal plan").slice(0, 80), targets: targets, meals: meals, m: r.modified_at };
}
function newest(map) {
  var best = null;
  Object.keys(map || {}).forEach(function (id) { var v = map[id]; if (!best || msOf(v.m) > msOf(best.m)) best = v; });
  return best;
}
function coachProgram() { return sync.uid ? newest(sync.programs) : null; }
function coachPlan() { return sync.uid ? newest(sync.plans) : null; }
// Calories and protein from the coach's meal plan override the client's own goals.
function coachTargets() {
  var p = coachPlan(), out = {};
  if (p && p.targets) ["kcal", "protein"].forEach(function (k) { if (p.targets[k] != null) out[k] = p.targets[k]; });
  return out;
}

/* ---------- comments with the coach (phase 4) ---------- */
// They are written here first, like everything else, and upload with the next sync. Read receipts too.
function syncCommentList() {
  return Object.keys(sync.comments).map(function (k) { return sync.comments[k]; })
    .sort(function (a, b) { return msOf(a.at) - msOf(b.at) || (a.id < b.id ? -1 : 1); });
}
// A comment row from the server. Returns true if the thread on this phone changed.
function mergeComment(r) {
  if (!r || !isUuid(r.id)) return false;
  var had = sync.comments[r.id], op = sync.cout[r.id];
  if (op && op.op === "del") return false;  // deleted here; that uploads next
  if (r.deleted_at) { if (!had) return false; delete sync.comments[r.id]; return true; }
  var c = { id: r.id, author: r.author_id, type: CM_TYPES[r.target_type] ? r.target_type : "general", ref: r.target_ref == null ? null : String(r.target_ref), body: String(r.body || ""), at: r.created_at, read: r.read_at || null };
  if (had && had.read && !c.read && sync.readOut.indexOf(r.id) > -1) c.read = had.read;  // seen here; the receipt is still on its way
  if (had && stableStr(had) === stableStr(c)) return false;
  sync.comments[r.id] = c;
  if (!had && c.author !== sync.uid && !c.read) (syncRt.fresh = syncRt.fresh || []).push(c);
  return true;
}
async function pushComments() {
  var ids = Object.keys(sync.cout);
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i], op = sync.cout[id], c = sync.comments[id], res;
    if (op.op === "add") {
      if (!c) { delete sync.cout[id]; continue; }
      res = await syncApi.addComment({ id: id, client_id: sync.uid, author_id: sync.uid, target_type: c.type, target_ref: c.ref, body: c.body });
      // already there (the answer to an earlier try was lost) counts as sent; a refusal shows as not sent
      if (res.error && String(res.error.code) !== "23505") { syncCheck(res); c.failed = true; }
      delete c.pending;
    } else {
      res = await syncApi.removeComment(id);
      if (res.error) syncCheck(res);
    }
    if (sync.cout[id] === op) delete sync.cout[id];  // a delete made meanwhile stays queued
    saveSync();
  }
  if (sync.readOut.length) {
    var seen = sync.readOut.slice(0, 200), r = await syncApi.rpc("mark_comments_read", { p_client: sync.uid, p_ids: seen });
    if (r.error) syncCheck(r);
    sync.readOut = sync.readOut.filter(function (x) { return seen.indexOf(x) < 0; });
    saveSync();
  }
}
function syncSendComment(type, ref, body) {
  if (!sync.uid || sync.ask) return Promise.reject(new Error("Sign in first"));
  body = String(body || "").trim().slice(0, 2000);
  if (!body) return Promise.reject(new Error("Write something first"));
  var id = rid();
  sync.comments[id] = { id: id, author: sync.uid, type: CM_TYPES[type] ? type : "general", ref: ref == null ? null : String(ref).slice(0, 64), body: body, at: isoNow(), read: null, pending: true };
  sync.cout[id] = { op: "add" };
  saveSync();
  if (typeof paintAccount === "function") paintAccount();
  syncNow();
  return Promise.resolve(sync.comments[id]);
}
function syncRemoveComment(id) {
  var c = sync.comments[id];
  if (!c || c.author !== sync.uid) return Promise.resolve();
  delete sync.comments[id];
  // never uploaded and not uploading now: it simply goes
  if (sync.cout[id] && sync.cout[id].op === "add" && !syncRt.busy) delete sync.cout[id];
  else sync.cout[id] = { op: "del" };
  saveSync();
  syncNow();
  return Promise.resolve();
}
function syncSeenComments(ids) {
  var n = 0;
  (ids || []).forEach(function (id) {
    var c = sync.comments[id];
    if (!c || c.author === sync.uid || c.read) return;
    c.read = isoNow(); n++;
    if (sync.readOut.indexOf(id) < 0) sync.readOut.push(id);
  });
  if (!n) return;
  saveSync();
  if (typeof paintAccount === "function") paintAccount();
  clearTimeout(syncRt.seenT);
  syncRt.seenT = setTimeout(function () { syncNow(); }, 800);
}
// What comments.js draws in the app.
var appComments = {
  me: function () { return sync.uid; },
  them: function () { return sync.coach && sync.coach.name ? "Coach " + sync.coach.name : "Your coach"; },
  raw: false,
  all: syncCommentList,
  send: syncSendComment,
  remove: syncRemoveComment,
  seen: syncSeenComments
};
if (typeof commentsSource !== "undefined") commentsSource = appComments;
function syncUnread() { return sync.uid ? syncCommentList().filter(function (c) { return c.author !== sync.uid && !c.read; }).length : 0; }

/* ---------- notifications on this browser (phase 4) ---------- */
// The browser part is in push.js; here the subscription is saved for the account, in the app's language.
function pushLang() { return state.lang === "ar" ? "ar" : "en"; }
async function syncPushOn() {
  await requireUser();
  var row = await pushSubscribe();
  row.user_id = sync.uid; row.lang = pushLang();
  var r = await syncApi.savePush(row);
  if (r.error) { syncCheck(r); throw new Error(r.error.message || "Couldn't turn notifications on. Try again."); }
  sync.push = { endpoint: row.endpoint, lang: row.lang };
  saveSync();
}
async function syncPushOff() {
  var p = sync.push;
  sync.push = null; saveSync();
  if (!p) return;
  await requireUser();
  var r = await syncApi.dropPush(sync.uid, p.endpoint);
  if (r.error) syncCheck(r);
}
// After start-up and a change of language: keep the saved subscription the same as this browser's.
async function syncPushRefresh() {
  if (!sync.uid || !sync.push) return;
  var old = sync.push, row = await pushCurrent();
  if (!row) {
    // notifications were switched off in the browser, or its subscription ended
    sync.push = null; saveSync();
    var gone = await syncApi.dropPush(sync.uid, old.endpoint);
    if (gone.error) syncCheck(gone);
    return;
  }
  row.user_id = sync.uid; row.lang = pushLang();
  var r = await syncApi.savePush(row);
  if (r.error) { syncCheck(r); return; }
  if (row.endpoint !== old.endpoint) await syncApi.dropPush(sync.uid, old.endpoint);
  sync.push = { endpoint: row.endpoint, lang: row.lang };
  saveSync();
}

/* ---------- training-day reminders (phase 4) ---------- */
// The setting syncs like any other (client_settings, key "reminder"); the database sends the reminder.
// Before each upload, the day the app would offer next and this phone's time zone are written into it,
// so the reminder can say "Next up: Push" and come at the right local time.
function reminderRefresh() {
  var r = state.reminder;
  if (!plainObj(r) || !r.on) return;
  var next = null;
  try {
    var id = nextDay(), d = DAYS.filter(function (x) { return x.id === id; })[0];
    if (d && d.name) next = String(typeof trText === "function" ? trText(d.name) : d.name).slice(0, 60);
  } catch (e) { }
  var tz = null;
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) { }
  if (next && r.next !== next) r.next = next;
  if (tz && r.tz !== tz) r.tz = tz;
}

async function pullPeople() {
  var changed = false, me = await syncApi.profile(sync.uid);
  if (me.error) syncCheck(me);
  else if (me.data) {
    if (sync.name !== (me.data.full_name || null) || sync.role !== (me.data.role || "client")) changed = true;
    sync.name = me.data.full_name || null; sync.role = me.data.role || "client";
  }
  var link = await syncApi.coachLink(sync.uid);
  if (link.error) syncCheck(link);
  else {
    var row = (link.data || [])[0], coach = null;
    if (row) {
      var p = await syncApi.profile(row.coach_id);
      if (p.error) syncCheck(p);
      coach = { id: row.coach_id, status: row.status, name: (p.data && p.data.full_name) || null };
    }
    if (stableStr(coach) !== stableStr(sync.coach)) changed = true;
    sync.coach = coach;
  }
  saveSync();
  return changed;
}

// After a pull changed something: put the coach's program to work, keep lists in date order, redraw.
function syncApplied() {
  // say what the coach changed, once, in one message
  var cp = coachProgram(), plan = coachPlan(), said = [];
  if (cp && sync.seenProgram !== cp.id) {
    sync.seenProgram = cp.id; sync.seenProgramM = cp.m;
    if (state.programId !== "coach") { state.programId = "coach"; said.push("New program from your coach: " + cp.name); }
  } else if (cp && sync.seenProgramM !== cp.m) { sync.seenProgramM = cp.m; said.push("Your coach updated your program"); }
  if (!cp) { sync.seenProgram = null; sync.seenProgramM = null; }
  var planSig = plan ? plan.id + "@" + plan.m : null;
  if (plan && sync.seenPlan !== planSig) said.push(sync.seenPlan && sync.seenPlan.split("@")[0] === plan.id ? "Your coach updated your meal plan" : "New meal plan from your coach: " + plan.name);
  sync.seenPlan = planSig;
  // comments from the coach that arrived just now (not the ones this phone already showed)
  var fresh = (syncRt.fresh || []).filter(function (c) { return sync.comments[c.id] && !sync.comments[c.id].read; });
  syncRt.fresh = [];
  if (fresh.length) said.push(fresh.length === 1 ? "New comment from your coach" : fresh.length + " new comments from your coach");
  // each part is translated on its own: one rule must not swallow the next part (program names hold " · ")
  if (said.length) toast(said.map(function (x) { return typeof trText === "function" ? trText(x) : x; }).join(" · "), 4200,
    fresh.length && typeof openComments === "function" && acctOpen !== "comments" ? { label: "Open", run: function () { openComments(); } } : null);
  if (typeof commentsChanged === "function") commentsChanged();
  if (syncRt.sortLists) {
    ["sessions", "food", "body"].forEach(function (list) {
      state[list] = state[list].map(function (x, i) { return { x: x, i: i }; })
        .sort(function (a, b) { return a.x.date < b.x.date ? -1 : a.x.date > b.x.date ? 1 : a.i - b.i; }).map(function (o) { return o.x; });
    });
    syncRt.sortLists = false;
  }
  applyProgram();
  if (!DAYS.some(function (d) { return d.id === dayId; })) dayId = nextDay();
  persistState(); saveSync();
  syncRender();
}
// Redraw for changes from another device, but not under someone's fingers.
function syncRender() {
  var ae = document.activeElement;
  var busy = !$("modal").hidden || (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.nodeName)) || document.body.classList.contains("focusing");
  if (busy) { syncRt.renderLater = true; return; }
  syncRt.renderLater = false;
  rerenderKeepScroll();
}

/* ---------- running a sync ---------- */
function setPhase(p) {
  syncRt.phase = p;
  if (typeof paintAccount === "function") paintAccount();
}
function syncStatusText() {
  if (!sync.uid) return "";
  if (sync.ask) return "Not synced yet";
  var n = syncPending() + (syncRt.dirty ? 1 : 0);  // a save the scan hasn't looked at yet counts as waiting
  switch (syncRt.phase) {
    case "saved": return "Saved on this phone ✓";
    case "syncing": return "Syncing…";
    case "offline": return n ? "Offline · will upload later" : "Offline";
    case "signin": return "Sign in to sync";
    case "error": return "Sync problem";
    case "ok": return n ? "Saved on this phone ✓" : "Saved online ✓";
    default: return "";
  }
}
function syncRetryLater() {
  clearTimeout(syncRt.retry);
  syncRt.wait = Math.min(300000, (syncRt.wait || 5000) * 2);
  syncRt.retry = setTimeout(function () { syncNow(); }, syncRt.wait);
}
// Scan, upload, then download if it's due. One at a time; a request made meanwhile runs right after.
function syncNow(opts) {
  opts = opts || {};
  if (!sync.uid || sync.ask) return Promise.resolve(false);
  if (opts.pull) syncRt.lastPullTry = Date.now();  // when it was tried, whether or not it gets that far
  if (syncRt.busy) {
    syncRt.again = { pull: !!(opts.pull || (syncRt.again && syncRt.again.pull)) };
    return syncRt.busy;
  }
  clearTimeout(syncRt.retry); clearTimeout(syncRt.note);
  syncRt.busy = (async function () {
    try {
      syncScan();
      var user = await syncApi.user();
      if (!user || user.id !== sync.uid) { syncRt.hasSession = false; setPhase(navigator.onLine === false ? "offline" : "signin"); return false; }
      syncRt.hasSession = true;
      setPhase("syncing");
      await syncPush();
      await pushComments();
      if (opts.pull || Date.now() - syncRt.lastPull > SYNC_PULL_EVERY) await syncPull();
      sync.lastSync = isoNow(); syncRt.wait = 0; syncRt.error = null; saveSync();
      setPhase("ok");
      if (!syncRt.pushChecked) { syncRt.pushChecked = true; syncPushRefresh().catch(function () { syncRt.pushChecked = false; }); }
      return true;
    } catch (e) {
      if (e && e.auth) { syncRt.hasSession = false; setPhase("signin"); }
      else if (isNetLike(e)) { setPhase("offline"); syncRetryLater(); }
      else { syncRt.error = e && e.message ? String(e.message) : String(e); setPhase("error"); syncRetryLater(); }
      return false;
    } finally {
      syncRt.busy = null;
      if (syncRt.again) { var a = syncRt.again; syncRt.again = null; setTimeout(function () { syncNow(a); }, 0); }
    }
  })();
  return syncRt.busy;
}

/* ---------- linking this phone to an account ---------- */
// First sign-in on this phone (or a different account): ask what happens to what's already here.
function syncLink(user) {
  var prev = sync, counts = localCounts();
  sync = freshSync();
  sync.uid = user.id; sync.email = user.email || null; sync.invite = prev.invite;
  sync.ask = counts.total > 0;
  saveSync();
  if (sync.ask && typeof acctAskUpload === "function") acctAskUpload(counts);
  else return syncAdopt(true);
}
// upload: add this phone's data to the account. Otherwise it stays on this phone only, and the account's
// data is added next to it. Old records get LEGACY_M, so they never overwrite an edit already in the account.
function syncAdopt(upload) {
  if (!sync.uid) return Promise.resolve(false);
  sync.ask = false;
  normalizeIds(state);
  eachLocal(function (key, t, row) {
    if (upload) { sync.shadow[key] = rowHash(row); sync.outbox[key] = { m: LEGACY_M }; }
    else sync.hold[key] = 1;
  });
  saveSync(); persistState();
  return syncNow({ pull: true }).then(function (ok) {
    if (sync.invite && typeof acctInvite === "function") acctInvite();
    return ok;
  });
}
// Later: "add this phone's data to my account" for what was kept on the phone.
function syncUploadHeld() {
  syncScan();
  var n = 0;
  Object.keys(sync.hold).forEach(function (k) { delete sync.hold[k]; });
  eachLocal(function (key, t, row) { if (!sync.shadow[key]) { sync.shadow[key] = rowHash(row); sync.outbox[key] = { m: LEGACY_M }; n++; } });
  saveSync();
  return syncNow().then(function () { return n; });
}
// A backup opened on a linked phone is added to the account: nothing in the account is deleted by it,
// and where the backup has the same record, its copy wins.
function mergeBackup(b) {
  normalizeIds(b);
  ["sessions", "food", "body"].forEach(function (list) {
    (Array.isArray(b[list]) ? b[list] : []).forEach(function (rec) {
      if (!rec || !rec.id) return;
      var i = indexById(state[list], rec.id);
      if (i > -1) state[list][i] = rec; else state[list].push(rec);
    });
    state[list] = state[list].map(function (x, i) { return { x: x, i: i }; })
      .sort(function (p, q) { return p.x.date < q.x.date ? -1 : p.x.date > q.x.date ? 1 : p.i - q.i; }).map(function (o) { return o.x; });
  });
  if (plainObj(b.habits)) Object.keys(b.habits).forEach(function (d) { if (plainObj(b.habits[d])) state.habits[d] = b.habits[d]; });
  Object.keys(SETTING_FIELDS).forEach(function (k) { var f = SETTING_FIELDS[k]; if (b[f] != null) state[f] = b[f]; });
}

/* ---------- account actions used by the account screens (account.js) ---------- */
var sb = null, sbLoading = null;
// The Supabase library loads only for people who use an account, from this site so it works offline too.
function sbReady() {
  if (sb) return Promise.resolve(sb);
  if (sbLoading) return sbLoading;
  sbLoading = new Promise(function (resolve, reject) {
    if (window.supabase && window.supabase.createClient) { resolve(); return; }
    var s = document.createElement("script");
    s.src = "js/vendor/supabase.js";
    s.onload = function () { resolve(); };
    s.onerror = function () { s.remove(); reject(netError()); };
    document.head.appendChild(s);
  }).then(function () {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storageKey: "gymlog-auth", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
      global: { fetch: syncFetch }
    });
    sb.auth.onAuthStateChange(syncAuthEvent);
    return sb;
  });
  sbLoading.catch(function () { sbLoading = null; });
  return sbLoading;
}
// A request that hangs on a weak gym connection gives up after 20 seconds instead of blocking sync.
function syncFetch(input, init) {
  init = init || {};
  if (typeof AbortController === "undefined") return fetch(input, init);
  var ctl = new AbortController(), outer = init.signal;
  if (outer) { if (outer.aborted) ctl.abort(); else outer.addEventListener("abort", function () { ctl.abort(); }); }
  var timer = setTimeout(function () { ctl.abort(); }, 20000);
  return fetch(input, Object.assign({}, init, { signal: ctl.signal })).finally(function () { clearTimeout(timer); });
}
function syncAppUrl() { return location.origin + location.pathname.replace(/[^/]*$/, ""); }
// Supabase calls this on sign-in, sign-out, token refresh and the password-reset link. Its docs say
// not to call it back from inside, so the work runs on the next tick.
function syncAuthEvent(event, session) {
  setTimeout(function () {
    var user = session && session.user;
    syncRt.hasSession = !!user;
    if (event === "PASSWORD_RECOVERY" && typeof acctRecovery === "function") acctRecovery();
    if (user) {
      if (user.id !== sync.uid) syncLink(user);
      else {
        if (sync.email !== (user.email || null)) { sync.email = user.email || null; saveSync(); }
        if (!syncRt.busy && Date.now() - syncRt.lastPull > 10000) syncNow({ pull: true });
      }
      if (event === "SIGNED_IN" && syncRt.urlType === "signup") toast("Email confirmed ✓ You're signed in", 3400);
      syncRt.urlType = null;
    } else if (sync.uid && !syncRt.signingOut && (event === "SIGNED_OUT" || event === "INITIAL_SESSION")) {
      setPhase(navigator.onLine === false ? "offline" : "signin");
    }
    if (typeof paintAccount === "function") paintAccount();
  }, 0);
}
function authCall(fn) {
  return sbReady().then(fn).then(function (r) {
    if (r && r.error) throw r.error;
    return r ? r.data : null;
  });
}
function authSignIn(email, password) { return authCall(function (c) { return c.auth.signInWithPassword({ email: email, password: password }); }); }
function authSignUp(name, email, password) {
  return authCall(function (c) {
    return c.auth.signUp({ email: email, password: password, options: { emailRedirectTo: syncAppUrl(), data: { full_name: name, lang: state.lang === "ar" ? "ar" : "en" } } });
  });
}
function authResend(email) { return authCall(function (c) { return c.auth.resend({ type: "signup", email: email, options: { emailRedirectTo: syncAppUrl() } }); }); }
function authReset(email) { return authCall(function (c) { return c.auth.resetPasswordForEmail(email, { redirectTo: syncAppUrl() }); }); }
function authNewPassword(pw) { return authCall(function (c) { return c.auth.updateUser({ password: pw }); }); }

async function requireUser() {
  var user = await syncApi.user();
  if (!user || user.id !== sync.uid) { var e = new Error("Sign in first"); e.auth = true; throw e; }
  return user;
}
async function syncJoinCoach(code) {
  await requireUser();
  var r = await syncApi.rpc("accept_invite", { p_code: String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "") });
  if (r.error) { syncCheck(r); throw new Error(r.error.message || "Something went wrong. Try again."); }
  sync.invite = null; saveSync();
  await pullPeople();
  await syncNow({ pull: true });
  return sync.coach;
}
async function syncLeaveCoach() {
  await requireUser();
  if (!sync.coach) return;
  var r = await syncApi.leaveCoach(sync.uid, sync.coach.id);
  if (r.error) { syncCheck(r); throw new Error(r.error.message || "Something went wrong. Try again."); }
  sync.coach = null; saveSync();
}
// Sign out of this phone. wipe: also remove the account's data from it (language and alerts stay).
async function syncSignOut(wipe) {
  syncRt.signingOut = true;
  clearTimeout(syncRt.retry); clearTimeout(syncRt.note);
  // notifications for this account stop on this browser (best effort: offline, they stop being shown)
  if (sync.push) { try { await syncApi.dropPush(sync.uid, sync.push.endpoint); } catch (e) { } }
  try { var c = await sbReady(); await c.auth.signOut({ scope: "local" }); } catch (e) { }
  try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("gymlog-auth") === 0) localStorage.removeItem(k); }); } catch (e) { }
  sync = freshSync(); saveSync();
  if (wipe) {
    var keep = { lang: state.lang, notify: state.notify, keepAwake: state.keepAwake };
    state = Object.assign(fresh(), keep);
  }
  applyLoaded(); persistState();  // the coach's program goes with the account
  syncRt.signingOut = false; syncRt.hasSession = false; syncRt.lastPull = 0; syncRt.pushChecked = false;
  setPhase("local");
  if (typeof paintAccount === "function") paintAccount();
}
// Photos first: they are files, which the database can't remove. Then the account and, with it, every row.
async function syncDeleteAccount(wipe) {
  var user = await requireUser();
  var list = await syncApi.photos(user.id);
  if (list.error) syncCheck(list);
  var files = (list.data || []).filter(function (f) { return f && f.name && f.id; }).map(function (f) { return user.id + "/" + f.name; });
  if (files.length) { var rm = await syncApi.removePhotos(files); if (rm.error) syncCheck(rm); }
  var r = await syncApi.rpc("delete_my_account");
  if (r.error) { syncCheck(r); throw new Error(r.error.message || "Something went wrong. Try again."); }
  await syncSignOut(wipe);
}

/* ---------- start-up ---------- */
function syncStart() {
  // ?invite=CODE from a coach's link: remember it until this phone is signed in
  try {
    var q = new URLSearchParams(location.search), inv = (q.get("invite") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    if (inv) {
      sync.invite = inv; syncRt.inviteNow = true; saveSync();
      q.delete("invite");
      history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q.toString() : "") + location.hash);
    }
    // links from the confirmation and password emails come back with the result after the #
    var hp = new URLSearchParams(location.hash.slice(1));
    syncRt.urlType = hp.get("type");
    if (hp.get("error_description") || hp.get("error_code")) {
      syncRt.urlError = hp.get("error_code") || hp.get("error") || "error";
      history.replaceState(null, "", location.pathname + location.search);
    }
  } catch (e) { }
  window.addEventListener("online", function () { syncRt.wait = 0; syncNow({ pull: true }); });
  window.addEventListener("offline", function () { if (sync.uid) setPhase("offline"); });
  document.addEventListener("visibilitychange", function () {
    if (!sync.uid) return;
    if (document.visibilityState === "hidden") { if (syncScan() || syncPending()) syncNow(); }
    else syncNow({ pull: Date.now() - syncRt.lastPull > 30000 });
  });
  setInterval(function () {
    if (!sync.uid) return;
    if (syncRt.renderLater) syncRender();
    // a regular download, counted from the last try, so a phone that's offline isn't asked every 2 seconds
    if (document.visibilityState !== "hidden" && Date.now() - (syncRt.lastPullTry || 0) > SYNC_PULL_EVERY) syncNow({ pull: true });
  }, 2000);
  if (sync.uid || syncRt.urlType || sync.invite) sbReady().catch(function () { });
  if (sync.uid && !sync.ask) { setPhase(navigator.onLine === false ? "offline" : "syncing"); syncNow({ pull: true }); }
  if (typeof acctStart === "function") acctStart();
}
