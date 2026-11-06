// Storage, programs, theme, exercise history, suggestions, warm-ups and habits.
// Classic script sharing the page's global scope; see README for load order.

/* ---------- STORAGE ---------- */
function load() {
  try {
    var raw = localStorage.getItem("gymlog-v1");
    if (raw) {
      var s = JSON.parse(raw);
      if (s && Array.isArray(s.sessions)) adopt(s);
    }
  } catch (e) { }
  applyLoaded();
}
// Make saved or imported data safe to use: fill in anything older versions did not store.
function adopt(s) {
  state = Object.assign(fresh(), s);
  ["sessions", "body", "food", "customLib", "myFoods"].forEach(function (k) { if (!Array.isArray(state[k])) state[k] = []; });
  ["drafts", "baselines", "habits", "setAdj", "draftNotes"].forEach(function (k) { if (!state[k] || typeof state[k] !== "object") state[k] = {}; });
  sessionDates = state.sessionDates || {};
  state.programId = state.programId || "split4";
  state.notify = !!state.notify; state.keepAwake = state.keepAwake !== false;
  if (!state.goals || typeof state.goals !== "object") state.goals = {};
}
function applyLoaded() {
  document.documentElement.setAttribute("data-theme", "dark");
  applyProgram();
  dayId = nextDay();
  expandedExercise = null;
}

/* ---------- PROGRAM MANAGEMENT ---------- */
function getProgram(id) {
  for (var i = 0; i < PROGRAMS.length; i++)if (PROGRAMS[i].id === id) return PROGRAMS[i];
  return PROGRAMS[0];
}
function applyProgram() {
  if (state.programId === "custom" && state.custom && state.custom.days && state.custom.days.length) {
    DAYS = state.custom.days;
  } else {
    if (state.programId === "custom") state.programId = "split4";
    DAYS = getProgram(state.programId).days;
  }
}
function progName() { return state.programId === "custom" && state.custom ? state.custom.name : getProgram(state.programId).name; }
function dk(id) { return (state.programId === "split4" ? "" : state.programId + "|") + id; }
function allLib() { return LIB.concat(state.customLib || []); }
function retag() { state.custom.days.forEach(function (d, i) { d.tag = "Day " + (i + 1); }); }
// Any edit to a built-in program first copies it into "My Program"
function ensureCustom() {
  if (state.programId !== "custom" || !state.custom) {
    state.custom = { name: "My Program", days: JSON.parse(JSON.stringify(DAYS)) };
    state.programId = "custom";
    applyProgram();
    if (DAYS.indexOf(DAYS.filter(function (x) { return x.id === dayId; })[0]) < 0) dayId = DAYS[0].id;
    toast("Copied to “My Program” — now editable", 2600);
  }
  return state.custom;
}
function selectProgram(id) {
  state.programId = id; applyProgram(); dayId = nextDay(); save(); render();
  toast("Switched to " + progName());
}
function createBlankCustom() {
  state.custom = { name: "My Program", days: [NEW_DAY(1)] };
  state.programId = "custom"; applyProgram(); dayId = DAYS[0].id; save(); render();
}
function save() {
  try {
    localStorage.setItem("gymlog-v1", JSON.stringify(state));
    $("status").textContent = "Saved ✓";
  } catch (e) { $("status").textContent = "Storage Error"; }
}

/* ---------- THEME ---------- */
// The design is dark-only. isDark() stays for the animation palette.
function isDark() { return true; }

/* ---------- LAST LIFTED MEMORY ENGINE ---------- */
// Searches all previous sessions (or user-defined baseline) for the most recent time this specific exercise was logged
function getExerciseHistory(exName) {
  var lastSets = null, lastDate = null, bestWeight = 0, bestSet = null;
  for (var i = 0; i < state.sessions.length; i++) {
    var s = state.sessions[i];
    var sets = s.sets && s.sets[exName];
    if (sets && sets.length) {
      lastSets = sets;
      lastDate = s.date;
      sets.forEach(function (p) {
        if (p[0] > bestWeight || (p[0] === bestWeight && (!bestSet || p[1] > bestSet[1]))) {
          bestWeight = p[0]; bestSet = [p[0], p[1]];
        }
      });
    }
  }
  if (!lastSets && state.baselines && state.baselines[exName]) {
    var b = state.baselines[exName];
    lastSets = [[b[0], b[1]], [b[0], b[1]], [b[0], b[1]], [b[0], b[1]]];
    lastDate = "Baseline";
    bestWeight = b[0]; bestSet = [b[0], b[1]];
  }
  return { sets: lastSets || [], date: lastDate, pr: bestSet };
}

// "8" -> {lo:8, hi:8}; "6–8" -> {lo:6, hi:8}; timed targets like "30s" -> null
function repRange(t) {
  var m = /^\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/.exec(String(t || ""));
  if (!m) return null;
  var lo = +m[1], hi = m[2] ? +m[2] : lo;
  return { lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
}
// Double progression: hit the top of the range on every set -> add 2.5 kg next time.
function suggestNext(exName, setsCount, repsTarget) {
  var range = repRange(repsTarget); if (!range) return null;
  var last = null;
  for (var i = state.sessions.length - 1; i >= 0; i--) {
    var ss = state.sessions[i].sets && state.sessions[i].sets[exName];
    if (ss && ss.length && (!last || state.sessions[i].date > last.date)) last = { date: state.sessions[i].date, sets: ss };
  }
  if (!last) return null;
  var work = last.sets.slice(0, setsCount);
  var base = Math.min.apply(null, work.map(function (p) { return p[0]; }));
  if (!(base > 0)) return null;
  var allTop = work.length >= setsCount && work.every(function (p) { return p[1] >= range.hi; });
  if (allTop) return { up: true, w: Math.round((base + 2.5) * 100) / 100, r: range.lo, why: "You hit " + range.hi + "+ reps on all " + setsCount + " sets last time" };
  return { up: false, w: base, why: "Get " + range.hi + " reps on all " + setsCount + " sets, then add 2.5 kg" };
}
// Sets for an exercise in today's workout: the program's count plus any sets added or removed during the session.
function setsFor(d, e) {
  var adj = (state.setAdj[dk(d.id)] || {})[e[0]] || 0;
  return Math.max(1, e[1] + adj);
}
function platesFor(weight, bar) {
  var side = Math.max(0, (weight - bar) / 2), plates = [];
  [25, 20, 15, 10, 5, 2.5, 1.25].forEach(function (p) { while (side >= p - 0.01) { plates.push(p); side -= p; } });
  return plates;
}
function isBarbell(name) {
  return /barbell|bench press|squat|deadlift|overhead press|push press|pendlay|rack pull|good morning|hip thrust|skull|close-grip bench|jm press/i.test(name) &&
    !/dumbbell|machine|cable|smith|goblet|hack|leg press|bodyweight|single-leg|bulgarian|split squat/i.test(name);
}
// Ramp-up sets toward a working weight, rounded to 2.5 kg. Light weights need fewer steps.
function warmupSets(work, barbell) {
  var bar = barbell ? 20 : 0, out = [];
  if (barbell && work > 20) out.push({ w: 20, r: 10, note: "Empty bar" });
  [[0.45, 5], [0.65, 3], [0.85, 1]].forEach(function (st) {
    if (work < 50 && st[0] > 0.8) return;
    if (work < 35 && st[0] > 0.6) return;
    var w = Math.round(work * st[0] / 2.5) * 2.5;
    if (w <= bar || w >= work) return;
    if (out.length && w <= out[out.length - 1].w) return;
    out.push({ w: w, r: st[1] });
  });
  return out;
}
function lastExerciseNote(exName) {
  for (var i = state.sessions.length - 1; i >= 0; i--) {
    var n = state.sessions[i].notes && state.sessions[i].notes[exName];
    if (n) return { text: n, date: state.sessions[i].date };
  }
  return null;
}
// Habits: { id, name, icon, type: "check" | "count", target, step, unit }. Ticks live in state.habits[date][id].
var HABIT_DEFAULTS = [
  { id: "creatine", name: "Creatine 5g", icon: "⚡", type: "check" },
  { id: "water", name: "Water", icon: "💧", type: "count", target: 3.5, step: 0.5, unit: "L" }
];
function habitList() { return Array.isArray(state.habitList) ? state.habitList : HABIT_DEFAULTS; }
function ownHabits() { if (!Array.isArray(state.habitList)) state.habitList = JSON.parse(JSON.stringify(HABIT_DEFAULTS)); return state.habitList; }
function habitDone(hb, v) { return hb.type === "count" ? (v || 0) >= hb.target : !!v; }
function habitWeek(hb) {
  var n = 0; for (var i = 0; i < 7; i++) { var day = state.habits[ymdAdd(today(), -i)]; if (day && habitDone(hb, day[hb.id])) n++; }
  return n;
}
function sessionName(s) {
  if (s.dayName) return s.dayName;
  var d = DAYS.filter(function (x) { return x.id === s.day; })[0];
  return d ? d.name : (s.day || "Workout");
}
function sessionVolume(s) {
  var v = 0; for (var k in (s.sets || {})) s.sets[k].forEach(function (p) { v += p[0] * p[1]; }); return v;
}

function nextDay() {
  var ids = DAYS.map(function (d) { return d.id; });
  for (var i = state.sessions.length - 1; i >= 0; i--) {
    var s = state.sessions[i];
    if ((s.prog || "split4") === state.programId) {
      var idx = ids.indexOf(s.day);
      if (idx > -1) return ids[(idx + 1) % ids.length];
    }
  }
  return ids[0];
}

// Simple line icon for an exercise list row, picked from its muscle label.
var EX_ICONS = {
  chest: '<path d="M3 16h18M7 16v3M17 16v3M5 10h14M5 8v4M19 8v4"/><circle cx="12" cy="6" r="1.6"/>',
  back: '<path d="M4 4h16M8 4v3.5a4 4 0 008 0V4M12 11.5V20M9 20h6"/>',
  shoulders: '<path d="M3 4h18M5 2.5v3M19 2.5v3M8 4l2.5 6.5M16 4l-2.5 6.5M12 10.5V16M12 16l-3 5M12 16l3 5"/><circle cx="12" cy="8.3" r="1.6"/>',
  arms: '<path d="M6 9v6M3 10.5v3M18 9v6M21 10.5v3M6 12h12"/>',
  legs: '<path d="M9 3h6M12 3v6l-4 5v7M12 9l4 5v7M6 21h4M14 21h4"/>',
  core: '<rect x="7" y="4" width="10" height="16" rx="3"/><path d="M12 4v16M7 9.3h10M7 14.6h10"/>',
  cardio: '<path d="M3 12h4l2-5 4 10 2-5h6"/>'
};
function exIcon(muscle) {
  var m = String(muscle || "").toLowerCase(), k = "arms";
  if (/cardio/.test(m)) k = "cardio";
  else if (/chest|pec/.test(m)) k = "chest";
  else if (/back|lat|trap/.test(m)) k = "back";
  else if (/shoulder|delt/.test(m)) k = "shoulders";
  else if (/leg|quad|ham|glute|calf|calves|adductor/.test(m)) k = "legs";
  else if (/core|abs|oblique/.test(m)) k = "core";
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + EX_ICONS[k] + '</svg>';
}
