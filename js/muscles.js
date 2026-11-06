// Muscle model, weekly stats and the muscle balance card.
// Classic script sharing the page's global scope; see README for load order.

/* ---------- MUSCLE MODEL (one data table) ---------- */
// Codes: ch chest, la lats/upper back, tr traps, df front delt, ds side delt, dr rear delt,
//        bi biceps, tri triceps, fo forearms, ab abs/core, qu quads, ha hamstrings, gl glutes, ca calves
// Format: "primary muscles / secondary muscles". A working set counts 1 for each primary, 0.5 for each secondary.
var MC = { ch: "chest", la: "lats", tr: "traps", df: "delt_front", ds: "delt_side", dr: "delt_rear", bi: "biceps", tri: "triceps", fo: "forearms", ab: "abs", qu: "quads", ha: "hamstrings", gl: "glutes", ca: "calves" };
var MUSCLE_ORDER = ["chest", "lats", "traps", "delt_front", "delt_side", "delt_rear", "biceps", "triceps", "forearms", "abs", "quads", "hamstrings", "glutes", "calves"];
var MUSCLE_INFO = {
  chest: { name: "Chest", short: "Chest" }, lats: { name: "Lats / upper back", short: "Back" }, traps: { name: "Traps", short: "Traps" },
  delt_front: { name: "Front delts", short: "Front delts" }, delt_side: { name: "Side delts", short: "Side delts" }, delt_rear: { name: "Rear delts", short: "Rear delts" },
  biceps: { name: "Biceps", short: "Biceps" }, triceps: { name: "Triceps", short: "Triceps" }, forearms: { name: "Forearms", short: "Forearms" },
  abs: { name: "Abs / core", short: "Core" }, quads: { name: "Quads", short: "Quads" }, hamstrings: { name: "Hamstrings", short: "Hamstrings" },
  glutes: { name: "Glutes", short: "Glutes" }, calves: { name: "Calves", short: "Calves" }
};
// Muscles that get a lot of indirect work: coloured and listed as usual, but left out of the "below target" insight.
var MUSCLE_MINOR = { forearms: 1, delt_front: 1 };
var MUSCLE_MAP = {
  // chest
  "Bench press": "ch / tri df", "Incline barbell press": "ch / df tri", "Decline bench press": "ch / tri df",
  "Dumbbell bench press": "ch / tri df", "Incline dumbbell press": "ch / df tri", "Chest press machine": "ch / tri df",
  "Smith machine bench press": "ch / tri df", "Chest fly (cable)": "ch / df", "Dumbbell fly": "ch / df",
  "Incline dumbbell fly": "ch / df", "Cable crossover": "ch / df", "Pec deck": "ch / df",
  "Dips": "ch tri / df", "Push-ups": "ch / tri df", "Incline push-ups": "ch / tri df",
  "Diamond push-ups": "tri / ch df", "Dumbbell pullover": "ch la / tri",
  // back
  "Pull-ups": "la / bi dr", "Chin-ups": "la bi / dr", "Wide-grip pull-ups": "la / dr bi",
  "Neutral-grip pull-ups": "la / bi dr", "Assisted pull-ups": "la / bi dr", "Barbell row": "la / dr tr bi",
  "Pendlay row": "la / dr tr bi", "Dumbbell row": "la / dr bi", "Chest-supported row": "la / dr tr bi",
  "T-bar row": "la / tr dr bi", "Seal row": "la / dr tr bi", "Cable row": "la / dr bi tr",
  "Machine row": "la / dr bi", "Inverted row": "la / bi dr", "Lat pulldown": "la / bi dr",
  "Wide-grip pulldown": "la / bi dr", "Close-grip pulldown": "la / bi", "Straight-arm pulldown": "la / tri",
  "Deadlift": "gl ha / la tr qu fo", "Rack pull": "tr la / gl ha fo", "Good morning": "ha / gl", "Back extension": "gl / ha",
  // shoulders
  "Overhead press": "df / ds tri tr", "Push press": "df / ds tri tr", "Behind-the-neck press": "ds / df tri tr",
  "Seated shoulder press": "df / ds tri", "Machine shoulder press": "df / ds tri", "Dumbbell shoulder press": "df / ds tri",
  "Arnold press": "df ds / tri", "Lateral raise": "ds /", "Cable lateral raise": "ds /", "Machine lateral raise": "ds /",
  "Front raise": "df / ds", "Plate front raise": "df / ds", "Face pull": "dr / tr",
  "Rear delt fly": "dr / tr", "Reverse pec deck": "dr / tr", "Upright row": "ds tr / df bi",
  // traps
  "Shrugs": "tr / fo", "Dumbbell shrugs": "tr / fo", "Barbell shrugs": "tr / fo",
  // biceps
  "Barbell curl": "bi / fo", "EZ-bar curl": "bi / fo", "Dumbbell curl": "bi / fo", "Alternating dumbbell curl": "bi / fo",
  "Hammer curl": "bi / fo", "Cross-body hammer curl": "bi / fo", "Incline dumbbell curl": "bi / fo",
  "Preacher curl": "bi / fo", "Concentration curl": "bi /", "Spider curl": "bi /", "Cable curl": "bi / fo",
  "Zottman curl": "bi fo /", "Curls": "bi / fo",
  // triceps
  "Triceps pushdown": "tri /", "Rope pushdown": "tri /", "Reverse-grip pushdown": "tri /",
  "Overhead triceps extension": "tri /", "Cable overhead extension": "tri /", "Skull crushers": "tri /",
  "EZ-bar skull crushers": "tri /", "Close-grip bench press": "tri / ch df", "JM press": "tri / ch",
  "Dumbbell kickback": "tri /", "Bench dips": "tri / ch df",
  // forearms
  "Wrist curl": "fo /", "Reverse wrist curl": "fo /", "Reverse curl": "fo / bi",
  // legs
  "Squat": "qu gl / ha", "Front squat": "qu / gl ab", "Goblet squat": "qu gl / ab", "Bodyweight squat": "qu gl /",
  "Smith machine squat": "qu / gl", "Pause squat": "qu gl / ha", "Hack squat": "qu / gl", "Leg press": "qu / gl",
  "Single-leg press": "qu gl /", "Bulgarian split squat": "qu gl / ha", "Lunges": "qu gl / ha", "Walking lunges": "qu gl / ha",
  "Reverse lunge": "gl qu / ha", "Step-ups": "qu gl /", "Romanian deadlift": "ha gl /", "Stiff-leg deadlift": "ha / gl",
  "Single-leg RDL": "ha gl / ab", "Sumo deadlift": "gl qu / ha", "Cable pull-through": "gl ha /",
  "Leg extension": "qu /", "Leg curl": "ha / ca", "Seated leg curl": "ha / ca",
  // glutes
  "Hip thrust": "gl / ha", "Glute bridge": "gl / ha", "Single-leg glute bridge": "gl / ha",
  // calves
  "Calf raise": "ca /", "Standing calf raise": "ca /", "Seated calf raise": "ca /", "Leg press calf raise": "ca /",
  // core
  "Abs": "ab /", "Crunches": "ab /", "Cable crunch": "ab /", "Bicycle crunch": "ab /", "Sit-ups": "ab /",
  "Plank": "ab /", "Side plank": "ab /", "Hanging leg raise": "ab / fo", "Hanging knee raise": "ab / fo",
  "Lying leg raise": "ab /", "Mountain climbers": "ab / df qu"
  // cardio (Treadmill, Stair climber, Elliptical, Cycling, Rowing machine) deliberately left out: not working sets
};
// Fallback by library group, used for custom exercises and anything that is not in the table above
var GROUP_MAP = {
  Chest: "ch / tri df", Back: "la / bi dr", Shoulders: "ds / df", Traps: "tr /", Biceps: "bi / fo", Triceps: "tri /",
  Forearms: "fo /", Legs: "qu / gl ha", Glutes: "gl / ha", Calves: "ca /", Core: "ab /", Cardio: ""
};
var EMPTY_MM = { p: [], s: [] };
function mbNorm(v) { return String(v == null ? "" : v).trim().toLowerCase(); }
function mbParse(str) {
  var parts = String(str || "").split("/"), out = { p: [], s: [] };
  String(parts[0] || "").trim().split(/\s+/).forEach(function (c) { var m = MC[c]; if (m && out.p.indexOf(m) < 0) out.p.push(m); });
  String(parts[1] || "").trim().split(/\s+/).forEach(function (c) { var m = MC[c]; if (m && out.p.indexOf(m) < 0 && out.s.indexOf(m) < 0) out.s.push(m); });
  return out;
}
var MM_INDEX = {}, GROUP_MM = {}, MB_LIB_LC = {};
Object.keys(MUSCLE_MAP).forEach(function (k) { MM_INDEX[mbNorm(k)] = mbParse(MUSCLE_MAP[k]); });
Object.keys(GROUP_MAP).forEach(function (k) { GROUP_MM[k] = mbParse(GROUP_MAP[k]); });
LIB.forEach(function (L) { MB_LIB_LC[mbNorm(L[0])] = L; });
// last-resort guess from the exercise name when it is in neither the library nor customLib
function mbGuessGroup(k) {
  var R = [
    [/treadmill|elliptical|stair|cycl|bike|\bjog|\brun|rowing machine|ergometer/, "Cardio"],
    [/calf|calves/, "Calves"], [/glute|hip thrust|bridge/, "Glutes"],
    [/\bleg\b|legs|squat|lunge|quad|hamstring|deadlift|rdl|romanian|step-?up/, "Legs"],
    [/tricep|pushdown|skull|kickback/, "Triceps"], [/curl|bicep/, "Biceps"], [/shrug/, "Traps"],
    [/crunch|plank|\babs\b|sit-?up|\bcore\b|twist|rollout/, "Core"],
    [/shoulder|lateral|delt|raise|overhead press|arnold|upright|face pull/, "Shoulders"],
    [/\brow\b|pull|\blat\b|chin|back/, "Back"], [/bench|chest|fly|push-?up|pec|press|dip/, "Chest"]
  ];
  for (var i = 0; i < R.length; i++) if (R[i][0].test(k)) return R[i][1];
  return null;
}
function mbGroupOf(name) {
  var k = mbNorm(name), L = MB_LIB_LC[k];
  if (L) return L[1];
  var cl = (state && state.customLib) || [];
  for (var i = 0; i < cl.length; i++) if (cl[i] && mbNorm(cl[i][0]) === k) return cl[i][1];
  return mbGuessGroup(k);
}
// name -> { p: [muscle ids], s: [muscle ids] }. Never throws; unknown things return no muscles.
function mbMusclesFor(name) {
  try {
    var hit = MM_INDEX[mbNorm(name)];
    if (hit) return hit;
    var g = mbGroupOf(name);
    if (g && GROUP_MM[g]) return GROUP_MM[g];
  } catch (e) { }
  return EMPTY_MM;
}

/* ---------- SHARED STATS HELPERS (pure: no DOM; sessions default to saved state) ---------- */
var MB_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var MB_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Accepts "YYYY-MM-DD" (or longer ISO), Date, or timestamp. Returns "YYYY-MM-DD" or null when invalid.
function ymdOf(x) {
  if (x == null || x === "") return null;
  if (typeof x === "string") {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(x);
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return (d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]) ? m[0] : null;
  }
  var dt = x instanceof Date ? x : new Date(x);
  return isNaN(dt.getTime()) ? null : fmt(dt);
}
function ymdParse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
function ymdAdd(s, n) { var d = ymdParse(s); if (!d) return null; d.setDate(d.getDate() + n); return fmt(d); }
// Weeks start on Saturday. weekStart("2026-10-30") -> "2026-10-24". Returns null for an invalid date.
function weekStart(date) {
  var y = ymdOf(date === undefined ? new Date() : date);
  if (!y) return null;
  var back = (ymdParse(y).getDay() + 1) % 7; // Sat 0, Sun 1 ... Fri 6
  return ymdAdd(y, -back);
}
// Sessions with a date between a and b (inclusive), oldest first.
function sessionsInRange(a, b, sessions) {
  var lo = ymdOf(a), hi = ymdOf(b), list = sessions || (state && state.sessions) || [];
  if (!lo || !hi) return [];
  if (lo > hi) { var t = lo; lo = hi; hi = t; }
  return list.filter(function (s) { var d = s && ymdOf(s.date); return !!d && d >= lo && d <= hi; })
    .sort(function (x, y) { var dx = ymdOf(x.date), dy = ymdOf(y.date); return dx < dy ? -1 : dx > dy ? 1 : 0; });
}
function mbSessLabel(s) {
  if (s && s.dayName) return String(s.dayName);
  if (s && s.day) { var d = String(s.day); return d.charAt(0).toUpperCase() + d.slice(1); }
  return "Workout";
}
// Full per-week result: totals by muscle and the exercises/sessions behind each number.
function weekStats(ws, sessions) {
  var totals = {}, map = {}, contrib = {};
  MUSCLE_ORDER.forEach(function (m) { totals[m] = 0; map[m] = {}; contrib[m] = []; });
  var start = ymdOf(ws);
  if (!start) return { totals: totals, contrib: contrib };
  sessionsInRange(start, ymdAdd(start, 6), sessions).forEach(function (s) {
    var sets = s.sets;
    if (!sets || typeof sets !== "object") return;
    Object.keys(sets).forEach(function (exName) {
      var arr = sets[exName], n = Array.isArray(arr) ? arr.length : 0;
      if (!n) return;
      var mm = mbMusclesFor(exName);
      function add(list, w, role) {
        list.forEach(function (m) {
          var pts = n * w;
          totals[m] += pts;
          var c = map[m][exName] || (map[m][exName] = { ex: exName, role: role, w: w, sets: 0, pts: 0, sessions: [] });
          c.sets += n; c.pts += pts;
          c.sessions.push({ id: s.id, date: ymdOf(s.date), dayName: mbSessLabel(s), sets: n });
        });
      }
      add(mm.p, 1, "primary"); add(mm.s, 0.5, "secondary");
    });
  });
  MUSCLE_ORDER.forEach(function (m) {
    contrib[m] = Object.keys(map[m]).map(function (k) { return map[m][k]; })
      .sort(function (x, y) { return y.pts - x.pts || (x.ex < y.ex ? -1 : 1); });
  });
  return { totals: totals, contrib: contrib };
}
// Working sets per muscle for the week starting at ws: { chest: 12, quads: 4.5, ... }
function weeklySetsByMuscle(ws, sessions) { return weekStats(ws, sessions).totals; }
// Sets actually saved (not muscle points) in a range
function setCount(range, sessions) {
  var list = mbRangeList(range, sessions), n = 0;
  list.forEach(function (s) { if (s && s.sets && typeof s.sets === "object") Object.keys(s.sets).forEach(function (k) { if (Array.isArray(s.sets[k])) n += s.sets[k].length; }); });
  return n;
}
function mbRangeList(range, sessions) {
  var a = null, b = null;
  if (Array.isArray(range)) { a = range[0]; b = range[1]; }
  else if (range && typeof range === "object") { a = range.from != null ? range.from : range.a; b = range.to != null ? range.to : range.b; }
  if (ymdOf(a) && ymdOf(b)) return sessionsInRange(a, b, sessions);
  return sessions || (state && state.sessions) || [];
}
// Total kg x reps in a range: [from, to] or {from, to}. No range = everything.
function totalVolume(range, sessions) {
  var vol = 0;
  mbRangeList(range, sessions).forEach(function (s) {
    if (!s || !s.sets || typeof s.sets !== "object") return;
    Object.keys(s.sets).forEach(function (k) {
      var arr = s.sets[k]; if (!Array.isArray(arr)) return;
      arr.forEach(function (p) { var w = Number(p && p[0]), r = Number(p && p[1]); if (isFinite(w) && isFinite(r)) vol += w * r; });
    });
  });
  return vol;
}
try { window.GymStats = { MUSCLES: MUSCLE_ORDER, musclesFor: mbMusclesFor, weekStart: weekStart, sessionsInRange: sessionsInRange, weeklySetsByMuscle: weeklySetsByMuscle, weekStats: weekStats, totalVolume: totalVolume, setCount: setCount, level: function (v) { return mbLevel(v); } }; } catch (e) { }

/* ---------- MUSCLE BALANCE CARD ---------- */
var MB_LEVELS = [{ name: "none", range: "0" }, { name: "low", range: "1–5" }, { name: "almost", range: "6–9" }, { name: "optimal", range: "10–20" }, { name: "high", range: "20+" }];
function mbLevel(v) { return v <= 0 ? 0 : v < 6 ? 1 : v < 10 ? 2 : v <= 20 ? 3 : 4; }
function mbFmt(v) { return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1); }
function mbShort(ymd) { var d = ymdParse(ymd); return d ? d.getDate() + " " + MB_MON[d.getMonth()] : ""; }
function mbDay(ymd) { var d = ymdParse(ymd); return d ? MB_DOW[d.getDay()] + " " + d.getDate() + " " + MB_MON[d.getMonth()] : ""; }
var mbOffset = 0; // 0 = this week, 1 = last week, ...

// Stylised silhouette + muscles. Coordinates describe the LEFT half (x < 50); the right half is mirrored in code.
var MB_BODY = {
  sil: "M50 21 L44 21 L44 30 L31 34 L22 37 L18 44 L16 56 L14.5 68 L13 78 L11 92 L9.5 104 L8.5 112 L11 118 L15.5 113 L17 105 L19 93 L21 80 L22.5 68 L25 58 L27.5 51 L30.5 60 L34 74 L35.5 88 L33.5 104 L31 118 L31.5 134 L32.5 150 L31.5 164 L32 178 L34.5 195 L33 203 L43 206 L43.5 196 L44.5 178 L45 164 L46 150 L47 134 L48.3 120 L50 113 Z",
  front: {
    traps: "M44 30.5 L37 31.6 L31 34 L34.5 37 L41.5 35 Z",
    delt_side: "M28 35.5 L23 38 L18.8 45 L19.5 54 L24 54.5 L26 46 Z",
    delt_front: "M28 35.5 L31 34.8 L35.5 38 L34 46.5 L29 52.5 L24 54.5 L26 46 Z",
    chest: "M37 39.5 L49.3 41.5 L49.3 58 L40.5 61 L34.5 56 L35 47.5 Z",
    abs: "M49.3 63.5 L42.5 64 L42 71 L49.3 71.5 Z M49.3 73.5 L42 73 L42 80.5 L49.3 81 Z M49.3 83 L42.3 82.5 L42.8 90 L49.3 92 Z M40 64 L36.5 65 L34.8 74 L36 88 L40 89.5 L40.8 78 Z",
    biceps: "M23.8 55.5 L19.5 55.5 L16.8 62 L16 72 L20 75.5 L22 72 L23 64 Z",
    forearms: "M20 78.5 L15 78.5 L12.5 88 L10.8 101 L15.2 102.5 L18.5 92 L19.6 85 Z",
    quads: "M46.5 114 L37 111 L32.5 121 L33.8 145 L40 150.5 L45 146 L46.8 129 Z",
    calves: "M43 157 L34.5 157 L33 170 L35.5 189 L41.5 189 L43.5 172 Z"
  },
  back: {
    traps: "M49.3 23.5 L44.5 28.5 L36.5 33.5 L39.5 43.5 L45 50.5 L49.3 54 Z",
    delt_side: "M28 35.5 L23 38 L18.8 45 L19.5 54 L24 54.5 L26 46 Z",
    delt_rear: "M28 35.5 L31 34.8 L35.5 37.5 L34 45 L29 52 L24 54.5 L26 46 Z",
    lats: "M33 51.5 L37.5 46 L40.5 46 L46 53 L49.3 56.5 L49.3 91.5 L42 89.5 L35.5 80 L33 64 Z",
    triceps: "M23.8 55.5 L19.5 55.5 L16.8 62 L16 72 L20 75.5 L22 72 L23 64 Z",
    forearms: "M20 78.5 L15 78.5 L12.5 88 L10.8 101 L15.2 102.5 L18.5 92 L19.6 85 Z",
    glutes: "M49.3 93 L41.5 92.5 L35 96 L33.5 105 L36.5 114 L44 116.5 L49.3 112 Z",
    hamstrings: "M47.5 120 L37 118.5 L32.8 124 L34 146 L40 150 L45 146.5 L46.8 131 Z",
    calves: "M43.5 154 L34 154 L32.8 166 L35 183 L41 185 L44 173 Z"
  }
};
function mbMirror(d) {
  var out = [], isX = true;
  (d.match(/[A-Za-z]|-?\d*\.?\d+/g) || []).forEach(function (t) {
    if (/[A-Za-z]/.test(t)) { out.push(t); isX = true; }
    else { out.push(isX ? String(Math.round((100 - parseFloat(t)) * 100) / 100) : t); isX = !isX; }
  });
  return out.join(" ");
}
function mbBoth(d) { return d + " " + mbMirror(d); }
// Static markup built only from the constants above (no user data)
function mbSvg(view) {
  var shapes = MB_BODY[view], parts = ['<ellipse class="sil" cx="50" cy="12.5" rx="8.4" ry="9.6"/>', '<path class="sil" d="' + mbBoth(MB_BODY.sil) + '"/>'];
  MUSCLE_ORDER.forEach(function (m) {
    if (shapes[m]) parts.push('<path class="mpath lv0" data-muscle="' + m + '" role="button" tabindex="0" d="' + mbBoth(shapes[m]) + '"><title></title></path>');
  });
  return '<svg viewBox="0 0 100 214" role="group" aria-label="' + (view === "front" ? "Front" : "Back") + ' view muscle map">' + parts.join("") + '</svg>';
}

function mbMaxBack() {
  var first = null;
  state.sessions.forEach(function (s) { var d = s && ymdOf(s.date); if (d && (!first || d < first)) first = d; });
  if (!first) return 0;
  var weeks = Math.round((ymdParse(weekStart(today())) - ymdParse(weekStart(first))) / (7 * 864e5));
  return Math.max(1, weeks);
}

function mbInsight(tot, hasSets, isNow) {
  if (!hasSets) return isNow ? "Nothing logged this week yet." : "No sessions logged that week.";
  var below = MUSCLE_ORDER.filter(function (m) { return !MUSCLE_MINOR[m] && tot[m] < 10; })
    .sort(function (a, b) { return (10 - tot[b]) - (10 - tot[a]); });
  var ok = MUSCLE_ORDER.filter(function (m) { return tot[m] >= 10 && tot[m] <= 20; });
  var over = MUSCLE_ORDER.filter(function (m) { return tot[m] > 20; });
  function nm(m) { return MUSCLE_INFO[m].short; }
  var parts = [];
  if (below.length) parts.push("Below target: " + below.slice(0, 2).map(function (m) { return nm(m) + " −" + mbFmt(10 - tot[m]); }).join(", ") + " sets" + (below.length > 2 ? " (+" + (below.length - 2) + " more)" : ""));
  if (ok.length) parts.push("On track: " + ok.slice(0, 3).map(nm).join(", ") + (ok.length > 3 ? " +" + (ok.length - 3) : ""));
  if (over.length) parts.push("High volume: " + over.slice(0, 2).map(nm).join(", "));
  if (!below.length && !over.length) parts = ["Every major muscle is on target — well balanced."];
  else if (!below.length && !ok.length) parts.unshift("Nothing below target");
  var dayIdx = (ymdParse(today()).getDay() + 1) % 7;
  return (isNow && dayIdx < 5 ? "So far: " : "") + parts.join(" · ");
}

function mbOpenModal(m, ws, stats) {
  var box = $("mbox"); box.textContent = "";
  var info = MUSCLE_INFO[m], v = stats.totals[m], lv = mbLevel(v), list = stats.contrib[m] || [];
  var closeB = h("button", { class: "btn ghost mclose", type: "button", text: "Close" });
  closeB.onclick = closeModal;
  box.appendChild(h("div", { class: "mhead" }, [h("div", { class: "mtitle", text: info.name }), closeB]));
  box.appendChild(h("div", { class: "msub" }, [
    h("i", { class: "lvbg lv" + lv }),
    h("span", { text: mbFmt(v) + " sets · " + MB_LEVELS[lv].name + " · " + mbShort(ws) + " – " + mbShort(ymdAdd(ws, 6)) })
  ]));
  if (!list.length) {
    box.appendChild(h("div", { class: "empty", text: "No sets counted for this muscle in this week." }));
    var tips = [];
    LIB.forEach(function (L) { var mm = MM_INDEX[mbNorm(L[0])]; if (mm && mm.p.indexOf(m) > -1 && tips.length < 4) tips.push(L[0]); });
    if (tips.length) box.appendChild(h("div", { class: "empty", text: "Exercises that train it directly: " + tips.join(", ") + "." }));
  }
  list.forEach(function (c) {
    var ses = c.sessions.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).map(function (s) {
      return h("div", { class: "d", text: mbDay(s.date) + " · " + s.dayName + " — " + s.sets + (s.sets === 1 ? " set" : " sets") });
    });
    box.appendChild(h("div", { class: "mex" }, [
      h("div", { class: "mex-top" }, [
        h("div", {}, [h("b", { text: c.ex }), h("span", { class: "pill" + (c.role === "primary" ? "" : " muscle"), text: c.role === "primary" ? "Primary ×1" : "Secondary ×0.5" })]),
        h("div", { class: "mex-pts" }, [h("b", { text: "+" + mbFmt(c.pts) }), h("small", { text: c.sets + (c.sets === 1 ? " set" : " sets") })])
      ])
    ].concat(ses)));
  });
  box.appendChild(h("div", { class: "mnote", text: "Counts saved sessions only, not a workout in progress. Primary sets count 1, secondary sets count 0.5." }));
  $("modal").hidden = false;
}

function renderMuscleCard(firstView) {
  var maxBack = mbMaxBack();
  if (mbOffset > maxBack) mbOffset = maxBack;
  if (mbOffset < 0) mbOffset = 0;
  var card = h("section", { class: "card mcard" });
  var prev = h("button", { class: "icon-btn mnav", type: "button", "aria-label": "Previous week", text: "‹" });
  var next = h("button", { class: "icon-btn mnav", type: "button", "aria-label": "Next week", text: "›" });
  var wkName = h("b"), wkRange = h("small"), wkTot = h("small");
  var insight = h("div", { class: "minsight", "aria-live": "polite" }), empty = h("div", { class: "mempty" });
  card.appendChild(h("div", { class: "mtitle2", text: "Muscle balance" }));
  card.appendChild(h("div", { class: "mwk" }, [prev, h("div", { class: "mwk-mid" }, [wkName, wkRange, wkTot]), next]));
  card.appendChild(insight);
  card.appendChild(empty);

  var paths = {}, stats = null, curWs = null, clrT = 0;
  function openM(m) { mbOpenModal(m, curWs, stats); }
  var fig = h("div", { class: "mfig" });
  ["front", "back"].forEach(function (view) {
    var holder = h("div", { class: "mbody" });
    holder.innerHTML = mbSvg(view);
    fig.appendChild(h("figure", {}, [holder, h("figcaption", { text: view })]));
    Array.prototype.forEach.call(holder.querySelectorAll("path[data-muscle]"), function (p) {
      var m = p.getAttribute("data-muscle");
      (paths[m] = paths[m] || []).push(p);
      p.onclick = function () { openM(m); };
      p.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openM(m); } };
    });
  });
  card.appendChild(fig);

  card.appendChild(h("div", { class: "mleg" }, MB_LEVELS.map(function (L, i) {
    return h("span", {}, [h("i", { class: "lvbg lv" + i }), L.range + " · " + L.name]);
  })));

  var barsWrap = h("div", { class: "mbars" }), rows = {};
  MUSCLE_ORDER.forEach(function (m) {
    var band = h("span", { class: "mband" }), fill = h("span", { class: "mfill lv0" });
    var vB = h("b", { text: "0" }), vS = h("small", { text: "none" });
    var row = h("button", { class: "mrow", type: "button" }, [
      h("span", { class: "mname", text: MUSCLE_INFO[m].name }),
      h("span", { class: "mtrack" }, [band, fill]),
      h("span", { class: "mval" }, [vB, vS])
    ]);
    row.onclick = function () { openM(m); };
    rows[m] = { row: row, band: band, fill: fill, vB: vB, vS: vS };
    barsWrap.appendChild(row);
  });
  card.appendChild(barsWrap);
  var note = h("div", { class: "mnote", text: "Dashed band = 10–20 sets per week. Primary sets count 1, secondary sets 0.5. Tap a muscle for the exercises behind it." });
  card.appendChild(note);

  // blank = draw labels but keep colours/bars empty (so they can animate in)
  function paint(animate, blank) {
    curWs = ymdAdd(weekStart(today()), -7 * mbOffset);
    var we = ymdAdd(curWs, 6);
    stats = weekStats(curWs, state.sessions);
    var tot = stats.totals, anyEver = state.sessions.length > 0;
    var nSets = setCount([curWs, we], state.sessions);
    wkName.textContent = mbOffset === 0 ? "This week" : mbOffset === 1 ? "Last week" : mbOffset + " weeks ago";
    wkRange.textContent = mbShort(curWs) + " – " + mbShort(we);
    wkTot.textContent = nSets ? nSets + " sets · " + Math.round(totalVolume([curWs, we], state.sessions)).toLocaleString() + " kg" : "No sets logged";
    prev.disabled = mbOffset >= maxBack; next.disabled = mbOffset <= 0;
    if (!anyEver) {
      insight.hidden = true; empty.hidden = false; barsWrap.hidden = true; note.hidden = true;
      empty.textContent = "No sessions yet. Finish a workout on the Train tab and the muscles you hit will light up here.";
    } else {
      empty.hidden = true; insight.hidden = false; barsWrap.hidden = false; note.hidden = false;
      insight.textContent = mbInsight(tot, nSets > 0, mbOffset === 0);
    }
    var mx = 0; MUSCLE_ORDER.forEach(function (m) { if (tot[m] > mx) mx = tot[m]; });
    var scale = Math.max(24, Math.ceil(mx / 4) * 4);
    var rank = MUSCLE_ORDER.slice().sort(function (a, b) { return tot[b] - tot[a] || MUSCLE_ORDER.indexOf(a) - MUSCLE_ORDER.indexOf(b); });
    var useDelay = !!animate && !REDUCED;
    clearTimeout(clrT);
    MUSCLE_ORDER.forEach(function (m, i) {
      var v = tot[m], lv = mbLevel(v), shown = blank ? 0 : lv, dl = useDelay ? (i * 42) + "ms" : "0ms";
      var label = MUSCLE_INFO[m].name + ": " + mbFmt(v) + " sets, " + MB_LEVELS[lv].name;
      (paths[m] || []).forEach(function (p) {
        p.style.transitionDelay = dl;
        p.setAttribute("class", "mpath lv" + shown);
        p.setAttribute("aria-label", label + ". Tap for details");
        var t = p.querySelector("title"); if (t) t.textContent = label;
      });
      var r = rows[m];
      r.row.style.order = String(rank.indexOf(m));
      r.row.setAttribute("aria-label", label + ". Tap for details");
      r.band.style.left = (10 / scale * 100) + "%"; r.band.style.width = (10 / scale * 100) + "%";
      r.fill.style.transitionDelay = dl;
      r.fill.className = "mfill lv" + shown;
      r.fill.style.width = (blank || v <= 0) ? "0%" : Math.max(3, Math.min(100, v / scale * 100)) + "%";
      r.vB.textContent = mbFmt(v); r.vS.textContent = MB_LEVELS[lv].name;
    });
    if (useDelay) clrT = setTimeout(function () {
      MUSCLE_ORDER.forEach(function (m) {
        (paths[m] || []).forEach(function (p) { p.style.transitionDelay = ""; });
        rows[m].fill.style.transitionDelay = "";
      });
    }, MUSCLE_ORDER.length * 42 + 900);
  }
  prev.onclick = function () { if (mbOffset < maxBack) { mbOffset++; paint(true); } };
  next.onclick = function () { if (mbOffset > 0) { mbOffset--; paint(true); } };

  if (firstView) { paint(false, true); setTimeout(function () { paint(true); }, 240); }
  else paint(false);
  return card;
}
