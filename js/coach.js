// Coach dashboard (coach.html): every client at a glance, one client's log read-only, private notes and
// invites. Phase 2 of docs/coach-plan.md (section 7).
//
// It reuses the app's own pieces. While a client is open, `state` holds that client's log in the app's
// shape, so the Progress tab's week card, calendar, records and muscle map draw it exactly as the client
// sees it. Nothing here writes a client's data: the database only lets a coach read it.
// Classic script sharing the page's global scope; loaded last on coach.html.

/* ---------- this page's own settings ---------- */
var COACH_PREFS = "gymlog-coach";
var coachPrefs = (function () {
  var p = {};
  try { p = JSON.parse(localStorage.getItem(COACH_PREFS)) || {}; } catch (e) { }
  if (!p.lang) { try { p.lang = (JSON.parse(localStorage.getItem("gymlog-v1")) || {}).lang; } catch (e) { } }
  p.lang = p.lang === "ar" ? "ar" : "en";
  return p;
})();
function savePrefs() { try { localStorage.setItem(COACH_PREFS, JSON.stringify(coachPrefs)); } catch (e) { } }

var baseState = state;
baseState.lang = coachPrefs.lang;

// The app's save() writes `state` to this device's log. Here `state` can be a client's log: never save it.
function save() { }

// C: everything the page knows. phase: loading | signin | notcoach | ready | error.
// edit: the program or meal plan being written ({ kind, clientId (null = template), rowId, draft, dirty }).
// templates: the coach's own programs and meal plans with no client, loaded when first needed.
var C = { phase: "loading", me: null, clients: [], byId: {}, view: "list", id: null, tab: "summary", client: null, error: null, tallied: false, edit: null, templates: null };
var CLIENT_TABS = [["summary", "Summary"], ["workouts", "Workouts"], ["meals", "Meals"], ["body", "Body"], ["program", "Program"], ["mealplan", "Meal plan"], ["notes", "Notes"]];

/* ---------- talking to the server ---------- */
// The coach page has its own sign-in, kept apart from the app's, so signing in here never links the
// app on this device to the coach's account.
var cdb = null;
function coachDb() {
  if (!cdb) {
    if (!window.supabase || !window.supabase.createClient) throw Object.assign(new Error("offline"), { net: true });
    cdb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storageKey: "gymlog-coach-auth", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
  }
  return cdb;
}
function must(r) {
  if (r.error) { var e = new Error(r.error.message || "Something went wrong. Try again."); e.code = r.error.code; e.status = r.status; throw e; }
  return r.data;
}
function since(q, from) { return from ? q.gte("date", from) : q; }
// Everything the page asks of the server. The tests put a fake one on the page before this file runs.
var coachApi = window.coachApi || {
  user: function () { return coachDb().auth.getSession().then(function (r) { return r.data && r.data.session ? r.data.session.user : null; }); },
  signIn: function (email, pw) { return coachDb().auth.signInWithPassword({ email: email, password: pw }).then(function (r) { if (r.error) throw r.error; return r.data.user; }); },
  signOut: function () { return coachDb().auth.signOut({ scope: "local" }); },
  profile: function (id) { return coachDb().from("profiles").select("id,full_name,role").eq("id", id).maybeSingle().then(must); },
  links: function (me) { return coachDb().from("coach_clients").select("client_id,status,started_at").eq("coach_id", me).neq("status", "archived").then(must); },
  profiles: function (ids) { return coachDb().from("profiles").select("id,full_name").in("id", ids).then(must); },
  // rows of a client table for these clients, newest first, all pages
  rows: async function (table, ids, cols, from) {
    var out = [], n = 1000;
    for (var i = 0; ; i += n) {
      var q = coachDb().from(table).select(cols).in("client_id", ids).is("deleted_at", null);
      if (table !== "client_settings") q = since(q, from).order("date", { ascending: false });
      var page = must(await q.range(i, i + n - 1));
      out = out.concat(page || []);
      if (!page || page.length < n) return out;
    }
  },
  // what the coach has given these clients: the newest active program and meal plan each
  plans: function (ids) { return coachDb().from("meal_plans").select("id,client_id,name,targets,meals,modified_at").in("client_id", ids).eq("active", true).is("deleted_at", null).then(must); },
  programs: function (ids) { return coachDb().from("programs").select("id,client_id,name,days,modified_at").in("client_id", ids).eq("active", true).is("deleted_at", null).then(must); },
  // what the coach writes: programs and meal plans for a client, or templates (no client)
  templates: function (table, me) { return coachDb().from(table).select("*").eq("coach_id", me).is("client_id", null).is("deleted_at", null).order("modified_at", { ascending: false }).then(must); },
  insertRow: function (table, row) { return coachDb().from(table).insert(row).select("id").single().then(must).then(function (r) { return r.id; }); },
  updateRow: function (table, id, fields) { return coachDb().from(table).update(fields).eq("id", id).then(must); },
  // a client has one program and one meal plan at a time: switch off the others
  retire: function (table, me, clientId, keepId) {
    var q = coachDb().from(table).update({ active: false, modified_at: new Date().toISOString() }).eq("coach_id", me).eq("client_id", clientId).eq("active", true);
    return (keepId ? q.neq("id", keepId) : q).then(must);
  },
  note: function (me, id) { return coachDb().from("coach_notes").select("body").eq("coach_id", me).eq("client_id", id).maybeSingle().then(must).then(function (r) { return r ? r.body : ""; }); },
  saveNote: function (me, id, body) { return coachDb().from("coach_notes").upsert({ coach_id: me, client_id: id, body: body }, { onConflict: "coach_id,client_id" }).then(must); },
  setStatus: function (me, id, status) { return coachDb().from("coach_clients").update({ status: status }).eq("coach_id", me).eq("client_id", id).then(must); },
  invites: function () { return coachDb().from("invites").select("code,expires_at,created_at").is("used_at", null).order("created_at", { ascending: false }).then(must); },
  createInvite: function (days) { return coachDb().rpc("create_invite", { p_days: days }).then(must); },
  withdrawInvite: function (code) { return coachDb().from("invites").delete().eq("code", code).then(must); }
};
function netMsg(e) {
  return e && (e.net || /fetch|network|load failed/i.test(String(e.message))) ? "No connection. Check your internet and try again." : String(e && e.message || "Something went wrong. Try again.");
}

/* ---------- a client's rows in the app's shape ---------- */
function newest(rows) { var b = null; (rows || []).forEach(function (r) { if (!b || r.modified_at > b.modified_at) b = r; }); return b; }
function planTargets(plan) {
  var t = plan && plan.targets && typeof plan.targets === "object" ? plan.targets : {}, out = {};
  if (t.kcal >= 800 && t.kcal <= 8000) out.kcal = Math.round(t.kcal);
  if (t.protein >= 20 && t.protein <= 500) out.protein = Math.round(t.protein);
  return out;
}
function settingsOf(rows) { var s = {}; (rows || []).forEach(function (r) { s[r.key] = r.value; }); return s; }
function toState(d) {
  var s = Object.assign(fresh(), { lang: coachPrefs.lang });
  s.sessions = (d.sessions || []).map(function (r) {
    var x = { id: r.id, date: r.date, day: r.day_id, dayName: r.day_name, prog: r.program_id, sets: r.sets || {} };
    if (r.notes && Object.keys(r.notes).length) x.notes = r.notes;
    if (r.note) x.note = r.note;
    return x;
  }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  s.food = (d.food || []).map(function (r) { var f = { id: r.id, date: r.date, name: r.name, kcal: Number(r.kcal) || 0, p: Number(r.p) || 0 }; if (r.c != null) f.c = Number(r.c); if (r.f != null) f.f = Number(r.f); return f; })
    .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  s.body = (d.body || []).map(function (r) { var b = { id: r.id, date: r.date, note: r.note || "" }; BODY_METRICS.forEach(function (m) { b[m.k] = r[m.k] == null ? null : Number(r[m.k]); }); return b; })
    .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  (d.habits || []).forEach(function (r) { if (r.data && typeof r.data === "object") s.habits[r.date] = r.data; });
  var set = settingsOf(d.settings);
  if (set.goals && typeof set.goals === "object") s.goals = set.goals;
  if (Array.isArray(set.habit_list)) s.habitList = set.habit_list;
  if (set.custom_program && Array.isArray(set.custom_program.days)) s.custom = set.custom_program;
  return s;
}
// Used by the app's goals(): calories and protein from the coach's meal plan for the client on screen.
function coachTargets() { return C.view === "client" && C.client ? planTargets(C.client.plan) : {}; }
function coachProgram() { return C.view === "client" && C.client ? C.client.program : null; }

/* ---------- the roster numbers ---------- */
// One client's week, protein, weight and flags. d holds their recent rows; now is today (yyyy-mm-dd).
// Targets only count when someone set them: the coach's meal plan first, then the client's own goals.
function clientSummary(d, now) {
  var maxDate = function (list) { var m = null; (list || []).forEach(function (x) { if (x.date <= now && (!m || x.date > m)) m = x.date; }); return m; };
  var goals = d.goals || {}, targets = planTargets(d.plan);
  var lastWorkout = maxDate(d.sessions), lastMeal = maxDate(d.food), lastCheckin = maxDate(d.body), lastHabit = maxDate(d.habits);
  var lastActive = [lastWorkout, lastMeal, lastCheckin, lastHabit].filter(Boolean).sort().pop() || null;
  var weekFrom = ymdAdd(now, -6);
  var done = (d.sessions || []).filter(function (s) { return s.date >= weekFrom && s.date <= now; }).length;

  // planned workouts a week: the coach's program, otherwise the program of their latest workout
  var planned = null;
  if (d.program && Array.isArray(d.program.days) && d.program.days.length) planned = d.program.days.length;
  else {
    var latest = (d.sessions || []).filter(function (s) { return s.date <= now; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
    if (latest) {
      if (latest.program_id === "custom" && d.custom && Array.isArray(d.custom.days)) planned = d.custom.days.length || null;
      else PROGRAMS.forEach(function (p) { if (p.id === (latest.program_id || "split4")) planned = p.days.length; });
    }
  }

  // protein: average of the last 7 full days that have meals logged (today is still going)
  var byDay = {};
  (d.food || []).forEach(function (f) { if (f.date < now && f.date >= ymdAdd(now, -7)) byDay[f.date] = (byDay[f.date] || 0) + (Number(f.p) || 0); });
  var pDays = Object.keys(byDay), proteinTarget = targets.protein || (goals.protein >= 20 ? goals.protein : null);
  var protein = pDays.length ? pDays.reduce(function (t, k) { return t + byDay[k]; }, 0) / pDays.length : null;

  // weight: latest weigh-in against the one about two weeks before it
  var kgs = (d.body || []).filter(function (b) { return b.kg != null && b.date <= now; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  var weight = null, goalKg = goals.kg > 20 ? goals.kg : null;
  if (kgs.length) {
    var last = kgs[kgs.length - 1], ref = null;
    kgs.forEach(function (b) { var gap = daysBetween(b.date, last.date); if (gap >= 12 && gap <= 28) ref = b; });
    var change = ref ? Math.round((last.kg - ref.kg) * 10) / 10 : null;
    // which way is progress: towards the goal weight, from where they started
    var dir = goalKg == null ? 0 : goalKg < kgs[0].kg ? -1 : goalKg > kgs[0].kg ? 1 : 0;
    weight = { kg: Number(last.kg), date: last.date, change: change, good: change == null || !dir || Math.abs(change) < 0.3 ? null : change * dir > 0 };
  }

  var flags = [], startedGap = d.startedAt ? daysBetween(String(d.startedAt).slice(0, 10), now) : 0;
  var noWorkout = lastWorkout ? daysBetween(lastWorkout, now) : startedGap;
  if (noWorkout >= 5) flags.push({ k: "workout", n: noWorkout, text: lastWorkout ? "No workout for " + noWorkout + " days" : "No workout yet" });
  if (proteinTarget) {
    var low = [1, 2, 3].every(function (i) { var day = ymdAdd(now, -i); return byDay[day] != null && byDay[day] < proteinTarget * 0.8; });
    if (low) flags.push({ k: "protein", text: "Protein under 80% for 3 days" });
  }
  if (weight && weight.good === false) flags.push({ k: "weight", text: "Weight moving away from the goal for 2 weeks" });
  var noCheckin = lastCheckin ? daysBetween(lastCheckin, now) : startedGap;
  if (noCheckin >= 14) flags.push({ k: "checkin", n: noCheckin, text: lastCheckin ? "No check-in for " + noCheckin + " days" : "No check-in yet" });

  return {
    lastActive: lastActive, lastWorkout: lastWorkout, done: done, planned: planned,
    protein: protein == null ? null : Math.round(protein), proteinTarget: proteinTarget, proteinDays: pDays.length,
    weight: weight, flags: flags
  };
}
// 15 Oct, with the year when it isn't this year
function longDate(ymd) {
  var d = ymdParse(String(ymd || "").slice(0, 10)); if (!d) return "";
  return d.getDate() + " " + MB_MON[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : "");
}
function activeText(ymd) {
  if (!ymd) return "No activity yet";
  var n = daysBetween(ymd, today());
  return n <= 0 ? "Active today" : n === 1 ? "Active yesterday" : "Active " + n + " days ago";
}

/* ---------- loading ---------- */
async function start() {
  C.phase = "loading"; render();
  try {
    var user = await coachApi.user();
    if (!user) { C.phase = "signin"; render(); return; }
    var p = await coachApi.profile(user.id);
    C.me = { id: user.id, email: user.email, name: p && p.full_name, role: p && p.role };
    if (C.me.role !== "coach") { C.phase = "notcoach"; render(); return; }
    await loadRoster();
    C.phase = "ready";
    route();
  } catch (e) { C.phase = "error"; C.error = netMsg(e); render(); }
}
async function loadRoster() {
  var links = await coachApi.links(C.me.id), ids = links.map(function (l) { return l.client_id; }), now = today();
  var people = {}, got = [[], [], [], [], [], [], []];
  if (ids.length) {
    (await coachApi.profiles(ids)).forEach(function (p) { people[p.id] = p; });
    got = await Promise.all([
      coachApi.rows("workout_sessions", ids, "client_id,date,program_id", ymdAdd(now, -35)),
      coachApi.rows("food_logs", ids, "client_id,date,p", ymdAdd(now, -14)),
      coachApi.rows("body_checkins", ids, "client_id,date,kg", null),
      coachApi.rows("habit_days", ids, "client_id,date", ymdAdd(now, -14)),
      coachApi.rows("client_settings", ids, "client_id,key,value", null),
      coachApi.plans(ids), coachApi.programs(ids)
    ]);
  }
  var of = function (list, id) { return list.filter(function (r) { return r.client_id === id; }); };
  C.clients = links.map(function (l) {
    var id = l.client_id, set = settingsOf(of(got[4], id));
    var d = {
      sessions: of(got[0], id), food: of(got[1], id), body: of(got[2], id), habits: of(got[3], id),
      goals: set.goals && typeof set.goals === "object" ? set.goals : {}, custom: set.custom_program,
      plan: newest(of(got[5], id)), program: newest(of(got[6], id)), startedAt: l.started_at
    };
    var name = people[id] && people[id].full_name;
    return { id: id, name: name || "Client", status: l.status, startedAt: l.started_at, sum: clientSummary(d, now) };
  });
  C.byId = {};
  C.clients.forEach(function (c) { C.byId[c.id] = c; });
}
async function loadClient(id) {
  var from = ymdAdd(today(), -120);
  var got = await Promise.all([
    coachApi.rows("workout_sessions", [id], "*", null),
    coachApi.rows("food_logs", [id], "*", from),
    coachApi.rows("body_checkins", [id], "*", null),
    coachApi.rows("habit_days", [id], "date,data", from),
    coachApi.rows("client_settings", [id], "key,value", null),
    coachApi.plans([id]), coachApi.programs([id]),
    coachApi.note(C.me.id, id)
  ]);
  var prog = newest(got[6]), plan = newest(got[5]);
  return {
    id: id, state: toState({ sessions: got[0], food: got[1], body: got[2], habits: got[3], settings: got[4] }),
    plan: plan, program: prog && Array.isArray(prog.days) ? { name: prog.name, days: prog.days } : null,
    programRow: prog, planRow: plan, note: got[7] || ""
  };
}

/* ---------- routes: #client=<id>&tab=<tab> ---------- */
function route() {
  var q = new URLSearchParams(location.hash.slice(1)), id = q.get("client");
  if (C.phase !== "ready") { render(); return; }
  if (location.hash === "#templates") { C.view = "templates"; C.id = null; C.client = null; state = baseState; render(); return; }
  if (!id || !C.byId[id]) { openList(); return; }
  var tab = q.get("tab");
  C.tab = CLIENT_TABS.some(function (t) { return t[0] === tab; }) ? tab : "summary";
  if (C.view === "client" && C.id === id && C.client) { state = C.client.state; render(); return; }
  C.view = "client"; C.id = id; C.client = null; state = baseState; mbOffset = 0; calMonth = null;
  render();
  loadClient(id).then(function (cl) {
    if (C.id !== id) return;
    C.client = cl; state = cl.state; render();
  }).catch(function (e) { if (C.id === id) { C.error = netMsg(e); C.client = { failed: true }; render(); } });
}
function openList() { C.view = "list"; C.id = null; C.client = null; state = baseState; render(); }
function go(hash) { if (location.hash !== hash) location.hash = hash; else route(); }
window.addEventListener("hashchange", route);

/* ---------- drawing ---------- */
function render() {
  var root = $("view"); root.textContent = "";
  $("c-lang").textContent = coachPrefs.lang === "ar" ? "English" : "العربية";
  $("c-lang").setAttribute("lang", coachPrefs.lang === "ar" ? "en" : "ar");
  $("c-out").hidden = !C.me;
  var nav = $("c-nav");
  nav.hidden = C.phase !== "ready";
  nav.querySelectorAll("a").forEach(function (a) { a.setAttribute("aria-current", String(a.getAttribute("data-view") === (C.view === "templates" ? "templates" : "list") && C.phase === "ready" ? "page" : false)); });
  if (typeof clearAnimLoops === "function") clearAnimLoops();
  document.title = (C.view === "client" && C.byId[C.id] ? C.byId[C.id].name + " | " : "") + trText("Gym Log Coach");
  if (C.phase === "loading") root.appendChild(h("p", { class: "c-quiet", text: "Loading…" }));
  else if (C.phase === "signin") renderSignIn(root);
  else if (C.phase === "notcoach") renderNotCoach(root);
  else if (C.phase === "error") renderError(root);
  else if (C.view === "client") renderClient(root);
  else if (C.view === "templates") renderTemplates(root);
  else renderRoster(root);
}
function renderError(root) {
  var again = h("button", { class: "btn", type: "button", text: "Try again" });
  again.onclick = start;
  root.appendChild(h("section", { class: "c-panel c-narrow" }, [h("h1", { class: "c-h1", text: "Couldn't load your clients" }), h("p", { class: "c-quiet", text: C.error }), again]));
}
function renderSignIn(root) {
  var em = h("input", { type: "email", autocomplete: "email", autocapitalize: "none", spellcheck: "false", placeholder: "you@example.com" });
  var pw = h("input", { type: "password", autocomplete: "current-password" });
  var err = h("p", { class: "form-err", role: "alert" }); err.hidden = true;
  var btn = h("button", { class: "btn", type: "submit", text: "Sign in" });
  var form = h("form", { class: "acct-form", novalidate: "novalidate" }, [h("label", {}, ["Email", em]), h("label", {}, ["Password", pw]), err, btn]);
  form.onsubmit = function (e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim()) || !pw.value) { err.hidden = false; err.textContent = "Enter your email and password"; return; }
    btn.disabled = true; btn.classList.add("busy"); err.hidden = true;
    coachApi.signIn(em.value.trim(), pw.value).then(start).catch(function (x) {
      btn.disabled = false; btn.classList.remove("busy"); err.hidden = false;
      err.textContent = /invalid login credentials/i.test(String(x && x.message)) || (x && x.code) === "invalid_credentials" ? "Wrong email or password" : netMsg(x);
    });
  };
  root.appendChild(h("section", { class: "c-panel c-narrow" }, [
    h("h1", { class: "c-h1", text: "Coach sign-in" }),
    h("p", { class: "c-quiet", text: "Use the account you made in the Gym Log app. The app's owner turns it into a coach account." }),
    form,
    h("p", { class: "c-quiet c-small" }, [h("a", { href: "./", text: "Open the app" }), " to create an account or reset your password."])
  ]));
}
function renderNotCoach(root) {
  root.appendChild(h("section", { class: "c-panel c-narrow" }, [
    h("h1", { class: "c-h1", text: "This page is for coaches" }),
    h("p", { class: "c-quiet", text: "You're signed in as " + (C.me && C.me.email || "a client") + ". Ask the app's owner to make this a coach account, then reload this page." }),
    h("a", { class: "btn ghost", href: "./", text: "Open the app" })
  ]));
}

// The week as tally marks, like the sets on the Train tab: one per planned workout, lime when done.
function weekTally(done, planned) {
  var n = Math.max(planned || 0, done), wrap = h("span", { class: "wtally", "aria-hidden": "true" });
  for (var i = 0; i < Math.min(n, 7); i++) {
    var m = h("i", { class: i < done ? "on" : "" });
    m.style.setProperty("--k", String(i));
    wrap.appendChild(m);
  }
  return wrap;
}
function flagList(flags) { return h("ul", { class: "c-flags" }, flags.map(function (f) { return h("li", { text: f.text }); })); }
function clientRow(c) {
  var s = c.sum, paused = c.status === "paused", flags = paused ? [] : s.flags;
  var row = h("a", { class: "crow" + (flags.length ? " needs" : ""), href: "#client=" + c.id });
  var weekLabel = s.planned ? s.done + " of " + s.planned : s.done === 1 ? "1 workout" : s.done + " workouts";
  var pro = h("div", { class: "c-col c-pro" });
  if (s.protein == null) pro.appendChild(h("small", { text: s.proteinDays ? "–" : "No meals logged" }));
  else {
    pro.appendChild(h("b", { text: s.protein + " g" }));
    if (s.proteinTarget) {
      var pct = Math.min(1, s.protein / s.proteinTarget);
      pro.appendChild(h("small", { text: "of " + s.proteinTarget + " g" }));
      var bar = h("i", { class: "c-bar" + (pct < 0.8 ? " low" : "") }, [h("i")]);
      bar.firstChild.style.width = Math.round(pct * 100) + "%";
      pro.appendChild(bar);
    }
  }
  var kg = h("div", { class: "c-col c-kg" });
  if (!s.weight) kg.appendChild(h("small", { text: "No weigh-ins" }));
  else {
    kg.appendChild(h("b", { text: mbFmt(s.weight.kg) + " kg" }));
    if (s.weight.change != null) kg.appendChild(h("small", { class: s.weight.good === true ? "good" : s.weight.good === false ? "bad" : "", text: (s.weight.change > 0 ? "▲ " : s.weight.change < 0 ? "▼ " : "") + mbFmt(Math.abs(s.weight.change)) + " kg in 2 weeks" }));
  }
  [
    h("div", { class: "c-col c-who" }, [
      h("span", { class: "acct-av", "aria-hidden": "true", translate: "no", text: initials(c.name) }),
      h("div", {}, [h("b", { text: c.name, translate: "no" }), h("small", { text: activeText(s.lastActive) })])
    ]),
    h("div", { class: "c-col c-week" }, [weekTally(s.done, s.planned), h("small", { text: weekLabel })]),
    pro, kg,
    h("div", { class: "c-col c-flagcol" }, [flags.length ? flagList(flags) : h("small", { class: "c-ok", text: paused ? "Paused" : "On track" })])
  ].forEach(function (x) { row.appendChild(x); });
  row.setAttribute("aria-label", c.name + ". " + (flags.length ? flags.map(function (f) { return trText(f.text); }).join(". ") : trText(paused ? "Paused" : "On track")));
  return row;
}
function rosterGroup(title, list, note, heads) {
  if (!list.length) return null;
  var sec = h("section", { class: "c-group" }, [h("h2", { class: "c-h2" }, [title, h("span", { class: "c-count", text: String(list.length) })])]);
  if (note) sec.appendChild(h("p", { class: "c-quiet c-small", text: note }));
  var panel = h("div", { class: "c-roster" });
  if (heads) panel.appendChild(h("div", { class: "crow c-colhead", "aria-hidden": "true" }, ["Client", "Last 7 days", "Protein, daily average", "Weight", "Flags"].map(function (t) { return h("div", { class: "c-col", text: t }); })));
  list.forEach(function (c) { panel.appendChild(clientRow(c)); });
  sec.appendChild(panel);
  return sec;
}
function renderRoster(root) {
  var invite = h("button", { class: "btn", type: "button", text: "Invite a client" });
  invite.onclick = openInvites;
  var active = C.clients.filter(function (c) { return c.status !== "paused"; }), paused = C.clients.filter(function (c) { return c.status === "paused"; });
  // most flags first; then whoever has been quiet longest
  var needs = active.filter(function (c) { return c.sum.flags.length; }).sort(function (a, b) {
    return (b.sum.flags.length - a.sum.flags.length) || ((a.sum.lastActive || "") < (b.sum.lastActive || "") ? -1 : (a.sum.lastActive || "") > (b.sum.lastActive || "") ? 1 : 0);
  });
  var fine = active.filter(function (c) { return !c.sum.flags.length; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  var lead = !C.clients.length ? "No clients yet." : needs.length === 0 ? "Everyone is on track." : needs.length === 1 ? "1 client needs you today." : needs.length + " clients need you today.";
  root.appendChild(h("div", { class: "c-head" }, [
    h("div", {}, [h("h1", { class: "c-h1", text: "Clients" }), h("p", { class: "c-lead", text: lead })]),
    invite
  ]));
  if (!C.clients.length) {
    root.appendChild(h("section", { class: "c-panel c-empty" }, [
      h("p", { text: "Invite your first client. They open the link on their phone, create an account and join you. Their workouts, meals and check-ins show up here." }),
      (function () { var b = h("button", { class: "btn", type: "button", text: "Invite a client" }); b.onclick = openInvites; return b; })()
    ]));
    return;
  }
  var first = true;
  [["Needs you", needs], ["On track", fine], ["Paused", paused, "You can still see their log. They don't get flags while paused."]].forEach(function (g) {
    var sec = rosterGroup(g[0], g[1], g[2], first);
    if (sec) { root.appendChild(sec); first = false; }
  });
  // the one moment of motion: the week's marks fill in the first time the roster shows
  if (!C.tallied && !REDUCED) { root.classList.add("tally-in"); setTimeout(function () { root.classList.remove("tally-in"); }, 1600); }
  C.tallied = true;
}

/* ---------- one client ---------- */
function renderClient(root) {
  var c = C.byId[C.id], cl = C.client;
  var back = h("a", { class: "c-back", href: "#", text: "‹ All clients" });
  var status = c.status === "paused" ? h("span", { class: "pill gold", text: "Paused" }) : null;
  var pause = h("button", { class: "btn ghost sm", type: "button", text: c.status === "paused" ? "Resume" : "Pause" });
  pause.onclick = function () { setStatus(c, c.status === "paused" ? "active" : "paused"); };
  var remove = h("button", { class: "btn ghost sm c-danger", type: "button", text: "Remove client" });
  remove.onclick = function () {
    if (!confirm("Remove " + c.name + " from your clients? You'll stop seeing their log. They can join you again with a new invite.")) return;
    setStatus(c, "archived");
  };
  root.appendChild(back);
  root.appendChild(h("div", { class: "c-head" }, [
    h("div", {}, [
      h("h1", { class: "c-h1" }, [h("span", { text: c.name, translate: "no" }), status]),
      h("p", { class: "c-lead c-facts" }, [c.startedAt ? h("span", { text: "Client since " + longDate(c.startedAt) }) : null, h("span", { text: activeText(c.sum.lastActive) })])
    ]),
    h("div", { class: "c-actions" }, [pause, remove])
  ]));
  var tabs = h("nav", { class: "c-tabs", "aria-label": "Client" });
  CLIENT_TABS.forEach(function (t) {
    tabs.appendChild(h("a", { href: "#client=" + c.id + "&tab=" + t[0], text: t[1], "aria-current": C.tab === t[0] ? "page" : "false" }));
  });
  root.appendChild(tabs);
  var body = h("div", { class: "c-tab" });
  root.appendChild(body);
  if (!cl) { body.appendChild(h("p", { class: "c-quiet", text: "Loading…" })); return; }
  if (cl.failed) { body.appendChild(h("p", { class: "form-err", text: C.error })); return; }
  ({ summary: tabSummary, workouts: tabWorkouts, meals: tabMeals, body: tabBody, program: tabProgram, mealplan: tabMealPlan, notes: tabNotes })[C.tab](body, c, cl);
}
function setStatus(c, status) {
  coachApi.setStatus(C.me.id, c.id, status).then(function () {
    toast(status === "archived" ? c.name + " removed" : status === "paused" ? c.name + " paused" : c.name + " resumed");
    return loadRoster();
  }).then(function () {
    if (status === "archived") go("#"); else route();
  }).catch(function (e) { toast(netMsg(e), 3200); });
}
function tabSummary(body, c) {
  var left = h("div", { class: "c-stack" }), right = h("div", { class: "c-stack" });
  if (c.sum.flags.length && c.status !== "paused") left.appendChild(h("section", { class: "card c-alert" }, [h("b", { text: "Needs attention" }), flagList(c.sum.flags)]));
  if (coachProgram()) left.appendChild(h("section", { class: "card c-note-card" }, [h("small", { text: "Your program for them" }), h("b", { text: coachProgram().name })]));
  [renderWeekCard(), renderCalendar(), renderRecordsCard()].forEach(function (x) { left.appendChild(x); });
  right.appendChild(renderMuscleCard());
  body.appendChild(h("div", { class: "c-sum" }, [left, right]));
}
// "Bench press" then "60 × 8, 62.5 × 6": the name stays as written, the sets read the same in both languages
function setLine(sets) { return sets.map(function (p) { return p[0] > 0 ? mbFmt(p[0]) + " × " + p[1] : "0 × " + p[1]; }).join(", "); }
function tabWorkouts(body) {
  var list = state.sessions.slice().reverse();
  if (!list.length) { body.appendChild(h("p", { class: "c-quiet", text: "No workouts logged yet." })); return; }
  var month = null, panel = null;
  list.forEach(function (s) {
    var m = s.date.slice(0, 7);
    if (m !== month) {
      month = m;
      var d = ymdParse(s.date + "");
      body.appendChild(h("h2", { class: "c-h2", text: MB_MON[d.getMonth()] + " " + d.getFullYear() }));
      panel = h("div", { class: "c-roster c-log" });
      body.appendChild(panel);
    }
    var nSets = 0; Object.keys(s.sets || {}).forEach(function (k) { nSets += s.sets[k].length; });
    var ex = h("ul", { class: "c-sets" });
    Object.keys(s.sets || {}).forEach(function (k) {
      ex.appendChild(h("li", {}, [h("span", {}, [h("b", { class: "c-exname", text: k }), h("span", { class: "c-setnums", translate: "no", text: setLine(s.sets[k]) })]), s.notes && s.notes[k] ? h("small", { text: s.notes[k] }) : null]));
    });
    panel.appendChild(h("article", { class: "c-entry" }, [
      h("div", { class: "c-when" }, [h("b", { text: mbDay(s.date) }), h("small", { text: sessionName(s) })]),
      h("div", {}, [
        h("p", { class: "c-small c-quiet", text: nSets + " sets, " + Math.round(sessionVolume(s)).toLocaleString() + " kg volume" }),
        ex,
        s.note ? h("p", { class: "c-said" }, [h("small", { text: "Their note" }), s.note]) : null
      ])
    ]));
  });
}
function meter(v, target, unit) {
  var wrap = h("div", { class: "c-meter" }, [h("b", { text: Math.round(v).toLocaleString() + (unit ? " " + unit : "") })]);
  if (target) {
    var pct = v / target;
    wrap.appendChild(h("small", { text: "of " + target.toLocaleString() + (unit ? " " + unit : "") }));
    var bar = h("i", { class: "c-bar" + (pct < 0.8 ? " low" : pct > 1.15 ? " over" : "") }, [h("i")]);
    bar.firstChild.style.width = Math.round(Math.min(1, pct) * 100) + "%";
    wrap.appendChild(bar);
  }
  return wrap;
}
function tabMeals(body) {
  var G = goals(), t = coachTargets(), set = state.goals || {};
  var kcalT = t.kcal || (set.kcal ? G.kcal : null), proT = t.protein || (set.protein ? G.protein : null);
  body.appendChild(h("p", { class: "c-quiet c-small", text: kcalT || proT ? (t.kcal || t.protein ? "Targets from your meal plan." : "Targets the client set.") : "No targets yet. They come from your meal plan, or the client's own goals." }));
  var days = {};
  state.food.forEach(function (f) { (days[f.date] = days[f.date] || []).push(f); });
  var keys = Object.keys(days).sort().reverse();
  if (!keys.length) { body.appendChild(h("p", { class: "c-quiet", text: "No meals logged in the last 4 months." })); return; }
  var panel = h("div", { class: "c-roster c-log" });
  keys.forEach(function (k) {
    var items = days[k], kc = 0, pr = 0;
    items.forEach(function (f) { kc += f.kcal; pr += f.p; });
    var det = h("details", { class: "c-day" }, [
      h("summary", {}, [
        h("div", { class: "c-when" }, [h("b", { text: mbDay(k) }), h("small", { text: items.length === 1 ? "1 food" : items.length + " foods" })]),
        meter(kc, kcalT, "kcal"), meter(pr, proT, "g protein")
      ]),
      h("ul", { class: "c-sets" }, items.map(function (f) { return h("li", {}, [h("span", { text: f.name }), h("small", { text: f.kcal + " kcal, " + mbFmt(f.p) + " g protein" })]); }))
    ]);
    panel.appendChild(det);
  });
  body.appendChild(panel);
}
function tabBody(body) {
  var G = goals(), entries = state.body.slice();
  var shown = BODY_METRICS.filter(function (m) { return entries.some(function (b) { return b[m.k] != null; }); });
  if (!shown.length) { body.appendChild(h("p", { class: "c-quiet", text: "No check-ins yet." })); return; }
  var grid = h("div", { class: "c-grid" });
  shown.forEach(function (M) {
    var pts = entries.filter(function (b) { return b[M.k] != null; });
    var card = h("section", { class: "card" });
    if (pts.length < 2) {
      card.appendChild(h("div", { class: "chart-head" }, [h("div", {}, [h("small", { text: M.label }), h("br"), h("b", { text: mbFmt(pts[0][M.k]) + " " + M.unit }), h("small", { class: "c-one", text: "One check-in so far" })])]));
    } else {
      // weight: progress depends on the goal, and without one there is nothing to judge it by
      var p0 = pts[0], pN = pts[pts.length - 1], isKg = M.k === "kg", hasGoal = !!(state.goals && state.goals.kg);
      card.appendChild(chartHead(M.label, pN[M.k], M.unit, pN[M.k] - p0[M.k], isKg ? (hasGoal ? G.kg > p0.kg : null) : M.upGood));
      card.appendChild(lineChart(pts.map(function (b) { return { d: b.date, y: b[M.k] }; }), {
        goal: isKg && state.goals && state.goals.kg ? G.kg : null, minSpan: M.unit === "kg" ? 1 : 0.5,
        label: M.label + " from " + p0[M.k] + " " + M.unit + " on " + p0.date + " to " + pN[M.k] + " " + M.unit + " on " + pN.date
      }));
    }
    grid.appendChild(card);
  });
  body.appendChild(grid);
  body.appendChild(h("h2", { class: "c-h2", text: "Check-ins" }));
  var panel = h("div", { class: "c-roster c-log" });
  entries.slice().reverse().forEach(function (b) {
    panel.appendChild(h("article", { class: "c-entry" }, [
      h("div", { class: "c-when" }, [h("b", { text: mbDay(b.date) }), b.note ? h("small", { text: b.note }) : null]),
      h("p", { class: "c-metrics" }, BODY_METRICS.filter(function (m) { return b[m.k] != null; }).map(function (m) {
        return h("span", {}, [h("small", { text: m.label }), h("b", { text: mbFmt(b[m.k]) + (m.unit === "%" ? "%" : " " + m.unit) })]);
      }))
    ]));
  });
  body.appendChild(panel);
}
function tabNotes(body, c, cl) {
  var area = h("textarea", { class: "c-notes", "aria-label": "Private notes about " + c.name, placeholder: "Injuries, goals, what you agreed, how they're doing…" });
  area.value = cl.note || "";
  var said = h("small", { class: "c-quiet", "aria-live": "polite", text: "Only you see these notes." });
  var timer = null, last = area.value;
  function flush() {
    if (area.value === last) return;
    var v = area.value;
    said.textContent = "Saving…";
    coachApi.saveNote(C.me.id, c.id, v).then(function () { last = v; cl.note = v; said.textContent = "Saved. Only you see these notes."; })
      .catch(function (e) { said.textContent = netMsg(e); });
  }
  area.oninput = function () { clearTimeout(timer); timer = setTimeout(flush, 800); };
  area.onblur = function () { clearTimeout(timer); flush(); };
  body.appendChild(h("section", { class: "c-panel" }, [area, said]));
}

/* ---------- programs and meal plans: what the coach writes ---------- */
// A program has the shape of the app's built-in ones (js/data.js): days of [name, sets, reps, muscle, rest].
function copyDays(days) {
  return (days || []).map(function (d, i) {
    return { id: String(d.id || "d" + (i + 1)), tag: "Day " + (i + 1), name: String(d.name || "Day " + (i + 1)).slice(0, 80), ex: (d.ex || []).map(function (e) { return e.slice(0, 5); }) };
  });
}
// a meal plan while it is being written: numbers stay as typed until it is saved
function planDraft(from) {
  from = from || {};
  var t = from.targets || {}, v = function (x) { return x == null ? "" : String(x); };
  return {
    name: from.name || "", targets: { kcal: v(t.kcal), protein: v(t.protein), carbs: v(t.carbs), fat: v(t.fat) },
    meals: (from.meals || []).map(function (m) { return { name: m.name || "", items: (m.items || []).join("\n"), kcal: v(m.kcal), p: v(m.p), c: v(m.c), f: v(m.f) }; })
  };
}
function templatesOf(kind) { return C.templates ? C.templates[kind === "program" ? "programs" : "plans"] : []; }
function ensureTemplates() {
  if (C.templates || C.loadingTemplates) return;
  C.loadingTemplates = true;
  Promise.all([coachApi.templates("programs", C.me.id), coachApi.templates("meal_plans", C.me.id)]).then(function (r) {
    C.templates = { programs: r[0] || [], plans: r[1] || [] }; C.loadingTemplates = false; render();
  }).catch(function (e) { C.loadingTemplates = false; toast(netMsg(e), 3200); });
}
// What a client follows right now, judged by their latest workout.
function theirProgram(cl) {
  var last = cl.state.sessions[cl.state.sessions.length - 1], pid = last ? last.prog : "split4";
  if (pid === "coach") return null;
  if (pid === "custom" && cl.state.custom && Array.isArray(cl.state.custom.days)) return { name: cl.state.custom.name || "My Program", days: cl.state.custom.days };
  return PROGRAMS.filter(function (x) { return x.id === (pid || "split4"); })[0] || null;
}
function startEdit(kind, clientId, row, from) {
  C.edit = {
    kind: kind, clientId: clientId, rowId: row ? row.id : null, dirty: false,
    draft: kind === "program" ? { name: from && from.name || "", days: copyDays(from && from.days && from.days.length ? from.days : [NEW_DAY(1)]) } : planDraft(from)
  };
  render();
  var first = $("view").querySelector(".c-editor input");
  if (first) first.focus({ preventScroll: true });
}
function cancelEdit() {
  if (C.edit && C.edit.dirty && !confirm("Discard your changes?")) return;
  C.edit = null; render();
}
async function afterSave(clientId) {
  C.edit = null; C.templates = null;
  if (clientId && C.id === clientId) {
    await loadRoster();
    C.client = await loadClient(clientId); state = C.client.state;
  }
  render();
}

// the start menu: a blank one, what the client follows now, a built-in program, the example meals, or a template
function startMenu(kind, c, cl, replacing) {
  var sel = h("select", { "aria-label": "Start from" }), src = { blank: null };
  var opt = function (parent, value, label) { parent.appendChild(h("option", { value: value, text: label })); };
  opt(sel, "blank", kind === "program" ? "A blank program" : "A blank meal plan");
  if (kind === "program") {
    var theirs = cl && theirProgram(cl);
    if (theirs) { opt(sel, "theirs", "What they follow now: " + theirs.name); src.theirs = theirs; }
    var g = h("optgroup", { label: "Built-in programs" });
    PROGRAMS.forEach(function (p) { opt(g, "p:" + p.id, p.name); src["p:" + p.id] = p; });
    sel.appendChild(g);
  } else {
    opt(sel, "example", "The app's example meals"); src.example = { name: "", targets: {}, meals: MEALS };
  }
  var tpls = templatesOf(kind);
  if (tpls.length) {
    var tg = h("optgroup", { label: "Your templates" });
    tpls.forEach(function (t) { opt(tg, "t:" + t.id, t.name); src["t:" + t.id] = t; });
    sel.appendChild(tg);
  }
  var go = h("button", { class: "btn" + (replacing ? " ghost" : ""), type: "button", text: kind === "program" ? "Write the program" : "Write the meal plan" });
  go.onclick = function () { var from = src[sel.value]; startEdit(kind, c ? c.id : null, null, from ? { name: from.name, days: from.days, targets: from.targets, meals: from.meals } : null); };
  var title = replacing ? (kind === "program" ? "Send a different program" : "Send a different meal plan") : kind === "program" ? "Write a program" : "Write a meal plan";
  return h("section", { class: "c-start" }, [h("h3", { class: "acct-h", text: title }), h("div", { class: "c-start-row" }, [h("label", {}, ["Start from", sel]), go])]);
}
function editBar(who, onSave) {
  var send = h("button", { class: "btn", type: "button", text: who ? "Send to " + who : "Save template" });
  var asTpl = who ? h("button", { class: "btn ghost", type: "button", text: "Save as template" }) : null;
  var cancel = h("button", { class: "linkbtn", type: "button", text: "Cancel" });
  function run(btn, asTemplate) {
    btn.disabled = true; btn.classList.add("busy");
    onSave(asTemplate).catch(function (e) { toast(netMsg(e), 3400); }).then(function () { btn.disabled = false; btn.classList.remove("busy"); });
  }
  send.onclick = function () { run(send, false); };
  if (asTpl) asTpl.onclick = function () { run(asTpl, true); };
  cancel.onclick = cancelEdit;
  return h("div", { class: "c-editbar" }, [send, asTpl, cancel]);
}

/* ---------- the program editor ---------- */
// Days are edited with the app's own day editor and exercise library. While it is open, `state` is a
// small editing copy whose "My Program" is the draft, so the editor changes the draft directly.
function editDay(id) {
  var keep = state, E = C.edit;
  state = Object.assign(fresh(), { lang: coachPrefs.lang, programId: "custom", custom: E.draft, customLib: (coachPrefs.lib || []).slice() });
  openDayEditor(id);
  modalOnClose = function () {
    coachPrefs.lib = state.customLib; savePrefs();  // exercises the coach created stay in their library
    state = keep; E.dirty = true; render();
  };
}
function programEditor(body, who) {
  var E = C.edit, P = E.draft;
  var nameIn = h("input", { type: "text", maxlength: "80", value: P.name, placeholder: "e.g. Strength block" });
  nameIn.oninput = function () { P.name = nameIn.value; E.dirty = true; };
  var list = h("div", { class: "c-roster c-editdays" });
  P.days.forEach(function (d, i) {
    var ed = h("button", { class: "btn ghost sm", type: "button", text: "Edit day" });
    ed.onclick = function () { editDay(d.id); };
    var up = h("button", { class: "btn ghost sm", type: "button", text: "▲", "aria-label": "Move up" });
    up.disabled = i === 0;
    up.onclick = function () { P.days.splice(i - 1, 0, P.days.splice(i, 1)[0]); E.dirty = true; render(); };
    var rm = h("button", { class: "btn ghost sm", type: "button", text: "Remove" });
    rm.onclick = function () {
      if (P.days.length < 2) { toast("Keep at least one day"); return; }
      if (d.ex.length && !confirm("Remove " + d.name + " and its exercises?")) return;
      P.days.splice(i, 1); E.dirty = true; render();
    };
    list.appendChild(h("div", { class: "c-editday" }, [
      h("div", { class: "c-when" }, [h("b", { text: d.name }), h("small", { text: d.ex.length === 1 ? "1 exercise" : d.ex.length + " exercises" })]),
      d.ex.length ? h("p", { class: "c-exlist", translate: "no", text: d.ex.map(function (e) { return e[0]; }).join(", ") }) : h("p", { class: "c-quiet c-small", text: "No exercises yet." }),
      h("div", { class: "c-actions" }, [ed, up, rm])
    ]));
  });
  var add = h("button", { class: "btn ghost", type: "button", text: "＋ Add a training day" });
  add.onclick = function () { var nd = NEW_DAY(P.days.length + 1); P.days.push(nd); E.dirty = true; editDay(nd.id); };
  body.appendChild(h("section", { class: "c-panel c-editor" }, [
    h("h2", { class: "c-h2 c-flat", text: who ? (E.rowId ? "Edit their program" : "New program") : (E.rowId ? "Edit the template" : "New program template") }),
    h("label", {}, ["Program name", nameIn]),
    list, add,
    editBar(who, saveProgram)
  ]));
}
async function saveProgram(asTemplate) {
  var E = C.edit, name = E.draft.name.trim(), days = copyDays(E.draft.days);
  if (!name) { toast("Name the program first", 2600); return; }
  if (!days.some(function (d) { return d.ex.length; })) { toast("Add at least one exercise", 2600); return; }
  var row = { name: name, days: days, modified_at: new Date().toISOString() };
  if (asTemplate) {
    await coachApi.insertRow("programs", Object.assign({ coach_id: C.me.id, client_id: null, active: true }, row));
    C.templates = null; toast("Saved as a template");
    return;
  }
  if (E.rowId) await coachApi.updateRow("programs", E.rowId, row);
  else E.rowId = await coachApi.insertRow("programs", Object.assign({ coach_id: C.me.id, client_id: E.clientId, active: true }, row));
  if (E.clientId) await coachApi.retire("programs", C.me.id, E.clientId, E.rowId);
  var c = E.clientId && C.byId[E.clientId];
  toast(c ? "Sent to " + c.name : "Template saved", 2600);
  await afterSave(E.clientId);
}
function daysView(days) {
  return h("div", { class: "c-days" }, (days || []).map(function (d) {
    return h("section", { class: "c-dayview" }, [
      h("h3", { text: d.name }),
      d.ex && d.ex.length ? h("ul", { class: "c-sets" }, d.ex.map(function (e) {
        return h("li", {}, [h("span", {}, [h("b", { class: "c-exname", text: e[0] }), h("span", { class: "c-setnums", translate: "no", text: e[1] + " × " + e[2] })])]);
      })) : h("p", { class: "c-quiet c-small", text: "No exercises yet." })
    ]);
  }));
}
function tabProgram(body, c, cl) {
  if (C.edit && C.edit.kind === "program" && C.edit.clientId === c.id) { programEditor(body, c.name); return; }
  ensureTemplates();
  var cur = cl.programRow;
  if (cur) {
    var edit = h("button", { class: "btn", type: "button", text: "Edit program" });
    edit.onclick = function () { startEdit("program", c.id, cur, cur); };
    var stop = h("button", { class: "btn ghost", type: "button", text: "Stop this program" });
    stop.onclick = function () {
      if (!confirm("Stop " + cur.name + " for " + c.name + "? They go back to their own program.")) return;
      coachApi.updateRow("programs", cur.id, { active: false, modified_at: new Date().toISOString() })
        .then(function () { toast("Program stopped"); return afterSave(c.id); }).catch(function (e) { toast(netMsg(e), 3200); });
    };
    body.appendChild(h("section", { class: "c-panel" }, [
      h("div", { class: "c-panel-head" }, [
        h("div", {}, [h("h2", { class: "c-h2 c-flat", text: cur.name, translate: "no" }), h("small", { class: "c-quiet", text: "Sent " + longDate(cur.modified_at) })]),
        h("div", { class: "c-actions" }, [edit, stop])
      ]),
      daysView(cur.days)
    ]));
  } else {
    var theirs = theirProgram(cl);
    body.appendChild(h("p", { class: "c-quiet", text: theirs ? "No program from you yet. They follow " + theirs.name + " in the app." : "No program from you yet." }));
  }
  body.appendChild(startMenu("program", c, cl, !!cur));
}

/* ---------- the meal plan editor ---------- */
var TARGET_FIELDS = [["kcal", "Calories a day", "kcal", 800, 8000], ["protein", "Protein", "g", 20, 500], ["carbs", "Carbs", "g", 0, 1500], ["fat", "Fat", "g", 0, 500]];
function planEditor(body, who) {
  var E = C.edit, P = E.draft, touch = function () { E.dirty = true; };
  var nameIn = h("input", { type: "text", maxlength: "80", value: P.name, placeholder: "e.g. Lean bulk" });
  nameIn.oninput = function () { P.name = nameIn.value; touch(); };
  var targets = h("div", { class: "c-fields4" }, TARGET_FIELDS.map(function (f) {
    var inp = h("input", { type: "text", inputmode: "numeric", value: P.targets[f[0]], placeholder: "–" });
    inp.oninput = function () { P.targets[f[0]] = inp.value; touch(); };
    return h("label", {}, [f[1] + " (" + f[2] + ")", inp]);
  }));
  var meals = h("div", { class: "c-meals" });
  P.meals.forEach(function (m, i) {
    var name = h("input", { type: "text", maxlength: "80", value: m.name, placeholder: "e.g. Breakfast" });
    name.oninput = function () { m.name = name.value; touch(); };
    var nums = h("div", { class: "c-fields4" }, [["kcal", "Calories"], ["p", "Protein (g)"], ["c", "Carbs (g)"], ["f", "Fat (g)"]].map(function (f) {
      var inp = h("input", { type: "text", inputmode: "decimal", value: m[f[0]], placeholder: "–" });
      inp.oninput = function () { m[f[0]] = inp.value; touch(); };
      return h("label", {}, [f[1], inp]);
    }));
    var items = h("textarea", { rows: "3", placeholder: "One food per line, e.g. 3 eggs" });
    items.value = m.items;
    items.oninput = function () { m.items = items.value; touch(); };
    var up = h("button", { class: "btn ghost sm", type: "button", text: "▲", "aria-label": "Move up" });
    up.disabled = i === 0;
    up.onclick = function () { P.meals.splice(i - 1, 0, P.meals.splice(i, 1)[0]); touch(); render(); };
    var rm = h("button", { class: "btn ghost sm", type: "button", text: "Remove" });
    rm.onclick = function () { P.meals.splice(i, 1); touch(); render(); };
    meals.appendChild(h("section", { class: "c-meal" }, [
      h("div", { class: "c-meal-top" }, [h("label", {}, ["Meal", name]), h("div", { class: "c-actions" }, [up, rm])]),
      nums, h("label", {}, ["What's in it", items])
    ]));
  });
  var add = h("button", { class: "btn ghost", type: "button", text: "＋ Add a meal" });
  add.onclick = function () { P.meals.push({ name: "", items: "", kcal: "", p: "", c: "", f: "" }); touch(); render(); };
  body.appendChild(h("section", { class: "c-panel c-editor" }, [
    h("h2", { class: "c-h2 c-flat", text: who ? (E.rowId ? "Edit their meal plan" : "New meal plan") : (E.rowId ? "Edit the template" : "New meal plan template") }),
    h("label", {}, ["Meal plan name", nameIn]),
    h("h3", { class: "acct-h", text: "Daily targets" }),
    h("p", { class: "c-quiet c-small", text: "Calories and protein replace the client's own goals in the app." }),
    targets,
    h("h3", { class: "acct-h", text: "Meals" }),
    P.meals.length ? null : h("p", { class: "c-quiet c-small", text: "Meals show up in the client's Meals tab, ready to log with one tap." }),
    meals, add,
    editBar(who, savePlan)
  ]));
}
// The draft as a row, or the first thing that's wrong with it.
function planRow(P) {
  var num0 = function (v) { v = String(v).trim(); return v === "" ? null : num(v); };
  var out = { name: P.name.trim().slice(0, 80), targets: {}, meals: [] };
  if (!out.name) return { error: "Name the meal plan first" };
  for (var i = 0; i < TARGET_FIELDS.length; i++) {
    var f = TARGET_FIELDS[i], v = num0(P.targets[f[0]]);
    if (v === null) continue;
    if (!(v >= f[3] && v <= f[4])) return { error: f[1] + " must be " + f[3] + "–" + f[4] + " " + f[2] };
    out.targets[f[0]] = Math.round(v);
  }
  for (var j = 0; j < P.meals.length; j++) {
    var m = P.meals[j], name = m.name.trim();
    if (!name) return { error: "Name every meal" };
    var meal = { name: name.slice(0, 80), items: m.items.split("\n").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 20), kcal: Math.round(num0(m.kcal) || 0), p: num0(m.p) || 0 };
    if (num0(m.c) !== null) meal.c = num0(m.c);
    if (num0(m.f) !== null) meal.f = num0(m.f);
    if ([meal.kcal, meal.p, meal.c || 0, meal.f || 0].some(function (x) { return !(x >= 0 && x < 20000); })) return { error: "Check the numbers for " + meal.name };
    out.meals.push(meal);
  }
  if (!Object.keys(out.targets).length && !out.meals.length) return { error: "Add a target or a meal" };
  return out;
}
async function savePlan(asTemplate) {
  var E = C.edit, r = planRow(E.draft);
  if (r.error) { toast(r.error, 3000); return; }
  var row = { name: r.name, targets: r.targets, meals: r.meals, modified_at: new Date().toISOString() };
  if (asTemplate) {
    await coachApi.insertRow("meal_plans", Object.assign({ coach_id: C.me.id, client_id: null, active: true }, row));
    C.templates = null; toast("Saved as a template");
    return;
  }
  if (E.rowId) await coachApi.updateRow("meal_plans", E.rowId, row);
  else E.rowId = await coachApi.insertRow("meal_plans", Object.assign({ coach_id: C.me.id, client_id: E.clientId, active: true }, row));
  if (E.clientId) await coachApi.retire("meal_plans", C.me.id, E.clientId, E.rowId);
  var c = E.clientId && C.byId[E.clientId];
  toast(c ? "Sent to " + c.name : "Template saved", 2600);
  await afterSave(E.clientId);
}
function targetsLine(t) {
  var bits = [];
  if (t.kcal) bits.push(t.kcal.toLocaleString() + " kcal");
  if (t.protein) bits.push(t.protein + " g protein");
  if (t.carbs != null && t.carbs !== "") bits.push(t.carbs + " g carbs");
  if (t.fat != null && t.fat !== "") bits.push(t.fat + " g fat");
  return h("p", { class: "c-chips" }, bits.map(function (b) { return h("span", { text: b }); }));
}
function mealsView(meals) {
  return h("div", { class: "c-days" }, (meals || []).map(function (m) {
    return h("section", { class: "c-dayview" }, [
      h("h3", { text: m.name, translate: "no" }),
      h("p", { class: "c-quiet c-small", text: Math.round(m.kcal || 0) + " kcal, " + mbFmt(m.p || 0) + " g protein" }),
      m.items && m.items.length ? h("ul", { class: "c-items" }, m.items.map(function (x) { return h("li", { text: x, translate: "no" }); })) : null
    ]);
  }));
}
function tabMealPlan(body, c, cl) {
  if (C.edit && C.edit.kind === "plan" && C.edit.clientId === c.id) { planEditor(body, c.name); return; }
  ensureTemplates();
  var cur = cl.planRow;
  if (cur) {
    var edit = h("button", { class: "btn", type: "button", text: "Edit meal plan" });
    edit.onclick = function () { startEdit("plan", c.id, cur, cur); };
    var stop = h("button", { class: "btn ghost", type: "button", text: "Stop this meal plan" });
    stop.onclick = function () {
      if (!confirm("Stop " + cur.name + " for " + c.name + "? Their own targets apply again.")) return;
      coachApi.updateRow("meal_plans", cur.id, { active: false, modified_at: new Date().toISOString() })
        .then(function () { toast("Meal plan stopped"); return afterSave(c.id); }).catch(function (e) { toast(netMsg(e), 3200); });
    };
    body.appendChild(h("section", { class: "c-panel" }, [
      h("div", { class: "c-panel-head" }, [
        h("div", {}, [h("h2", { class: "c-h2 c-flat", text: cur.name, translate: "no" }), h("small", { class: "c-quiet", text: "Sent " + longDate(cur.modified_at) })]),
        h("div", { class: "c-actions" }, [edit, stop])
      ]),
      targetsLine(cur.targets || {}),
      mealsView(cur.meals)
    ]));
  } else body.appendChild(h("p", { class: "c-quiet", text: "No meal plan from you yet. The app uses their own goals." }));
  body.appendChild(startMenu("plan", c, cl, !!cur));
}

/* ---------- templates ---------- */
function renderTemplates(root) {
  root.appendChild(h("div", { class: "c-head" }, [h("div", {}, [
    h("h1", { class: "c-h1", text: "Templates" }),
    h("p", { class: "c-lead", text: "Write a program or meal plan once, then start from it on any client's page." })
  ])]));
  if (C.edit && C.edit.clientId === null) { (C.edit.kind === "program" ? programEditor : planEditor)(root, null); return; }
  if (!C.templates) { root.appendChild(h("p", { class: "c-quiet", text: "Loading…" })); ensureTemplates(); return; }
  [["program", "Programs", "programs"], ["plan", "Meal plans", "meal_plans"]].forEach(function (k) {
    var list = templatesOf(k[0]);
    root.appendChild(h("h2", { class: "c-h2" }, [k[1], h("span", { class: "c-count", text: String(list.length) })]));
    var panel = h("div", { class: "c-roster c-log" });
    list.forEach(function (t) {
      var ed = h("button", { class: "btn ghost sm", type: "button", text: "Edit" });
      ed.onclick = function () { startEdit(k[0], null, t, t); };
      var del = h("button", { class: "btn ghost sm c-danger", type: "button", text: "Delete" });
      del.onclick = function () {
        if (!confirm("Delete the template " + t.name + "? What you already sent to clients stays.")) return;
        var now = new Date().toISOString();
        coachApi.updateRow(k[2], t.id, { deleted_at: now, active: false, modified_at: now })
          .then(function () { toast("Template deleted"); C.templates = null; render(); }).catch(function (e) { toast(netMsg(e), 3200); });
      };
      var what = k[0] === "program" ? ((t.days || []).length === 1 ? "1 day" : (t.days || []).length + " days")
        : ((t.meals || []).length === 1 ? "1 meal" : (t.meals || []).length + " meals");
      panel.appendChild(h("article", { class: "c-entry c-tplrow" }, [
        h("div", { class: "c-when" }, [h("b", { text: t.name, translate: "no" }), h("small", { text: what })]),
        h("div", { class: "c-actions" }, [ed, del])
      ]));
    });
    if (!list.length) panel.appendChild(h("p", { class: "c-entry c-quiet", text: k[0] === "program" ? "No program templates yet." : "No meal plan templates yet." }));
    root.appendChild(panel);
    root.appendChild(startMenu(k[0], null, null, false));
  });
}

/* ---------- invites ---------- */
function inviteLink(code) { return location.origin + location.pathname.replace(/[^/]*$/, "") + "?invite=" + code; }
function codeText(code) { return code.replace(/(.{4})(?=.)/g, "$1 "); }
function openInvites(fresh) {
  var box = $("mbox"); box.textContent = "";
  var close = h("button", { class: "btn ghost sm", type: "button", text: "✕", "aria-label": "Close" });
  close.onclick = closeModal;
  box.appendChild(h("div", { class: "mhead" }, [h("div", { class: "mtitle", text: "Invite a client" }), close]));
  var body = h("div", { class: "acct-sheet" });
  box.appendChild(body);
  if (typeof fresh === "string") {
    var link = inviteLink(fresh);
    var copy = h("button", { class: "btn", type: "button", text: "Copy link" });
    copy.onclick = function () {
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { toast("Link copied"); }, function () { toast(link, 6000); });
    };
    var share = navigator.share ? h("button", { class: "btn ghost", type: "button", text: "Share" }) : null;
    if (share) share.onclick = function () { navigator.share({ title: "Gym Log", text: "Join me on Gym Log. Your code: " + fresh, url: link }).catch(function () { }); };
    body.appendChild(h("p", { class: "c-quiet", text: "Send this link. Your client opens it on their phone, creates an account and joins you. Or they type the code in the app." }));
    body.appendChild(h("div", { class: "inv-code", translate: "no", text: codeText(fresh) }));
    body.appendChild(h("p", { class: "inv-link", translate: "no", text: link }));
    body.appendChild(h("div", { class: share ? "grid2" : "acct-stack" }, [copy, share]));
    body.appendChild(h("p", { class: "c-quiet c-small", text: "It works once and expires in 7 days." }));
  } else {
    var make = h("button", { class: "btn", type: "button", text: "Make an invite code" });
    make.onclick = function () {
      make.disabled = true; make.classList.add("busy");
      coachApi.createInvite(7).then(function (code) { openInvites(code); }).catch(function (e) { make.disabled = false; make.classList.remove("busy"); toast(netMsg(e), 3200); });
    };
    body.appendChild(h("p", { class: "c-quiet", text: "Each code works for one client, once, for 7 days." }));
    body.appendChild(make);
  }
  var open = h("div", { class: "inv-open" }, [h("p", { class: "c-quiet c-small", text: "Loading your open codes…" })]);
  body.appendChild(open);
  coachApi.invites().then(function (list) {
    open.textContent = "";
    var live = (list || []).filter(function (i) { return Date.parse(i.expires_at) > Date.now() && i.code !== fresh; });
    if (!live.length) return;
    open.appendChild(h("h3", { class: "acct-h", text: "Open codes" }));
    live.forEach(function (i) {
      var days = Math.max(1, Math.ceil((Date.parse(i.expires_at) - Date.now()) / 864e5));
      var w = h("button", { class: "btn ghost sm", type: "button", text: "Withdraw" });
      w.onclick = function () {
        w.disabled = true;
        coachApi.withdrawInvite(i.code).then(function () { toast("Code withdrawn"); openInvites(fresh); }).catch(function (e) { w.disabled = false; toast(netMsg(e), 3200); });
      };
      open.appendChild(h("div", { class: "inv-row" }, [h("div", {}, [h("b", { translate: "no", text: codeText(i.code) }), h("small", { text: days === 1 ? "Expires in 1 day" : "Expires in " + days + " days" })]), w]));
    });
  }).catch(function () { open.textContent = ""; });
  $("modal").setAttribute("aria-label", "Invite a client");
  $("modal").hidden = false;
  close.focus({ preventScroll: true });
}

/* ---------- start ---------- */
$("c-lang").onclick = function () {
  coachPrefs.lang = coachPrefs.lang === "ar" ? "en" : "ar"; savePrefs();
  baseState.lang = coachPrefs.lang;
  if (C.client && C.client.state) C.client.state.lang = coachPrefs.lang;
  applyLang(); render();
};
$("c-out").onclick = function () {
  coachApi.signOut().catch(function () { }).then(function () {
    C.me = null; C.clients = []; C.byId = {}; C.client = null; C.view = "list"; state = baseState;
    if (location.hash) history.replaceState(null, "", location.pathname);
    C.phase = "signin"; render();
  });
};
applyLang();
start();
