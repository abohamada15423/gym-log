// Body tab: weekly summary, calendar, records, trends and check-ins.
// Classic script sharing the page's global scope; see README for load order.

/* ---------- BODY VIEW ---------- */
/* ---------- PROGRESS: WEEK SUMMARY, CALENDAR, RECORDS ---------- */
var calMonth = null;
function weekSummary(ws) {
  var we = ymdAdd(ws, 6), inWk = function (d) { return d >= ws && d <= we; };
  var ss = state.sessions.filter(function (s) { return inWk(s.date); });
  var sets = 0, vol = 0;
  ss.forEach(function (s) { for (var k in (s.sets || {})) s.sets[k].forEach(function (p) { sets++; vol += p[0] * p[1]; }); });
  var days = {}, pro = 0;
  state.food.forEach(function (fd) { if (inWk(fd.date)) { days[fd.date] = 1; pro += fd.p || 0; } });
  var nd = Object.keys(days).length;
  var kgs = state.body.filter(function (b) { return b.kg != null && inWk(b.date); }).map(function (b) { return b.kg; });
  return {
    workouts: ss.length, sets: sets, vol: vol,
    protein: nd ? pro / nd : null,
    kg: kgs.length ? kgs.reduce(function (a, b) { return a + b; }, 0) / kgs.length : null
  };
}
function renderWeekCard() {
  var ws = weekStart(), cur = weekSummary(ws), prev = weekSummary(ymdAdd(ws, -7));
  function cell(label, v, pv, fmt, unit, upGood) {
    var em = null;
    if (v != null && pv != null) {
      var dlt = v - pv, shown = fmt(Math.abs(dlt));
      em = h("em", { class: Math.abs(dlt) < 1e-9 ? "flat" : (dlt > 0) === upGood ? "up" : "down", text: Math.abs(dlt) < 1e-9 ? "same" : (dlt > 0 ? "▲ " : "▼ ") + shown });
    }
    return h("div", {}, [h("small", { text: label }), h("b", { text: v == null ? "–" : fmt(v) + (unit || "") }), em]);
  }
  var cutting = goals().kg <= ((state.body.filter(function (b) { return b.kg != null; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0] || {}).kg || Infinity);
  var r1 = function (x) { return mbFmt(Math.round(x * 10) / 10); }, r0 = function (x) { return Math.round(x).toLocaleString(); };
  return h("div", { class: "card" }, [
    h("div", { class: "chart-head" }, [h("div", {}, [h("small", { text: "Since " + mbDay(ws) }), h("br"), h("b", { text: "Against last week" })])]),
    h("div", { class: "wk" }, [
      cell("Workouts", cur.workouts, prev.workouts, r0, "", true),
      cell("Sets", cur.sets, prev.sets, r0, "", true),
      cell("Volume", cur.vol, prev.vol, r0, " kg", true),
      cell("Avg protein", cur.protein, prev.protein, r0, " g", true),
      cell("Avg weight", cur.kg, prev.kg, r1, " kg", !cutting)
    ])
  ]);
}
// Weeks in a row (Saturday to Friday) with at least one workout. The current week only counts once it has one.
function weekStreak() {
  var weeks = {};
  state.sessions.forEach(function (s) { var w = weekStart(s.date); if (w) weeks[w] = 1; });
  var w = weekStart(), n = 0;
  if (!weeks[w]) w = ymdAdd(w, -7);
  while (weeks[w]) { n++; w = ymdAdd(w, -7); }
  return n;
}
function renderCalendar() {
  var t = ymdParse(today());
  if (!calMonth) calMonth = [t.getFullYear(), t.getMonth()];
  var y = calMonth[0], m = calMonth[1];
  var trained = {};
  state.sessions.forEach(function (s) { trained[s.date] = (trained[s.date] || 0) + 1; });
  var first = new Date(y, m, 1), lead = (first.getDay() + 1) % 7, daysIn = new Date(y, m + 1, 0).getDate();
  var grid = h("div", { class: "cal", role: "grid", "aria-label": MB_MON[m] + " " + y });
  ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"].forEach(function (d) { grid.appendChild(h("div", { class: "dow", text: d })); });
  for (var i = 0; i < lead; i++) grid.appendChild(h("div", { class: "c out" }));
  var inMonth = 0;
  for (var dd = 1; dd <= daysIn; dd++) {
    var ymd = fmt(new Date(y, m, dd)), on = !!trained[ymd];
    if (on) inMonth++;
    grid.appendChild(h("div", { class: "c" + (on ? " on" : "") + (ymd === today() ? " today" : ""), style: "--d:" + dd, role: "gridcell", "aria-label": mbDay(ymd) + (on ? ", trained" : ""), text: String(dd) }));
  }
  var prev = h("button", { class: "icon-btn mnav", type: "button", "aria-label": "Previous month", text: "‹" });
  var next = h("button", { class: "icon-btn mnav", type: "button", "aria-label": "Next month", text: "›" });
  prev.onclick = function () { calMonth = m === 0 ? [y - 1, 11] : [y, m - 1]; rerenderKeepScroll(); };
  next.onclick = function () { calMonth = m === 11 ? [y + 1, 0] : [y, m + 1]; rerenderKeepScroll(); };
  next.disabled = y > t.getFullYear() || (y === t.getFullYear() && m >= t.getMonth());
  var streak = weekStreak();
  return h("div", { class: "card" }, [
    h("div", { class: "cal-head" }, [prev, h("b", { text: MB_MON[m] + " " + y }), next]),
    grid,
    h("div", { class: "streak" }, [
      h("div", {}, [h("b", { text: (streak ? "🔥 " : "") + streak }), h("small", { text: "week streak" })]),
      h("div", {}, [h("b", { text: String(inMonth) }), h("small", { text: "workouts in " + MB_MON[m] })]),
      h("div", {}, [h("b", { text: String(state.sessions.length) }), h("small", { text: "all time" })])
    ])
  ]);
}
function rerenderKeepScroll() { var sy = window.scrollY; render(); window.scrollTo(0, sy); }
// Best set per exercise: heaviest weight (most reps at that weight); bodyweight-only exercises use most reps.
function personalRecords() {
  var best = {};
  state.sessions.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).forEach(function (s) {
    for (var n in (s.sets || {})) s.sets[n].forEach(function (p) {
      var b = best[n], e1 = p[0] > 0 ? p[0] * (1 + p[1] / 30) : 0;
      var better = !b || p[0] > b.w || (p[0] === b.w && p[1] > b.r);
      if (better) best[n] = { name: n, w: p[0], r: p[1], date: s.date, e1: Math.max(e1, b ? b.e1 : 0) };
      else if (e1 > b.e1) b.e1 = e1;
    });
  });
  return Object.keys(best).map(function (k) { return best[k]; }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.name < b.name ? -1 : 1; });
}
function prRow(p) {
  var fresh = daysBetween(p.date, today()) <= 7;
  return h("div", { class: "pr-row" }, [
    h("div", {}, [h("b", { text: p.name }), fresh ? h("span", { class: "new", text: "NEW" }) : null, h("small", { text: mbDay(p.date) })]),
    h("div", { class: "v" }, [p.w > 0 ? mbFmt(p.w) + " kg × " + p.r : p.r + " reps", p.w > 0 ? h("small", { text: "est. 1RM " + Math.round(p.e1) + " kg" }) : null])
  ]);
}
function openRecordsModal() {
  var box = $("mbox"); box.textContent = "";
  var close = h("button", { class: "btn ghost sm", type: "button", text: "Close" });
  close.onclick = closeModal;
  var prs = personalRecords();
  box.appendChild(h("div", { class: "mhead" }, [h("div", { class: "mtitle", text: "Personal records" }), close]));
  var list = h("div", {});
  prs.forEach(function (p, i) { var r = prRow(p); r.style.setProperty("--d", i); list.appendChild(r); });
  box.appendChild(list);
  $("modal").hidden = false; close.focus();
}
function renderRecordsCard() {
  var prs = personalRecords();
  var card = h("div", { class: "card" });
  if (!prs.length) { card.appendChild(h("div", { class: "empty", text: "Your best lifts appear here after your first workout." })); return card; }
  prs.slice(0, 5).forEach(function (p, i) { var r = prRow(p); r.style.setProperty("--d", i); card.appendChild(r); });
  if (prs.length > 5) {
    var all = h("button", { class: "btn ghost", type: "button", text: "View all " + prs.length + " records" });
    all.onclick = openRecordsModal;
    card.appendChild(all);
  }
  return card;
}

// upGood: which direction counts as progress (weight and body fat depend on the goal).
var BODY_METRICS = [
  { k: "kg", label: "Weight", unit: "kg" }, { k: "waist", label: "Waist", unit: "cm", upGood: false },
  { k: "chest", label: "Chest", unit: "cm", upGood: true }, { k: "arm", label: "Arms", unit: "cm", upGood: true },
  { k: "thigh", label: "Thighs", unit: "cm", upGood: true }, { k: "hips", label: "Hips", unit: "cm", upGood: false },
  { k: "fat", label: "Body fat", unit: "%", upGood: false }
];
var bodyMetric = "kg";

function renderBody(root) {
  root.appendChild(h("h2", { text: "This week" }));
  root.appendChild(renderWeekCard());
  root.appendChild(h("h2", { text: "Training calendar" }));
  root.appendChild(renderCalendar());
  root.appendChild(h("h2", { text: "Personal records" }));
  root.appendChild(renderRecordsCard());
  root.appendChild(renderMuscleCard(!!fx.enter));
  var sorted = state.body.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  var withKg = sorted.filter(function (b) { return b.kg != null; });
  var cur = withKg[withKg.length - 1], first = withKg[0];
  var diff = cur && first ? Math.round((cur.kg - first.kg) * 10) / 10 : 0;
  var G = goals(), cutting = !first || G.kg <= first.kg;
  var toGoal = cur ? Math.round(Math.abs(cur.kg - G.kg) * 10) / 10 : 0;
  var reached = cur && (cutting ? cur.kg <= G.kg : cur.kg >= G.kg);

  function tile(k, n, u) {
    var big = h("div", { class: "n", text: n }); if (u) big.appendChild(h("small", { text: u }));
    return h("div", { class: "stat" }, [h("div", { class: "k", text: k }), big]);
  }
  root.appendChild(h("div", { class: "grid2" }, [
    tile("Current Weight", cur ? String(cur.kg) : "–", "kg"),
    tile("Target Goal", String(G.kg), "kg"),
    tile("Total Change", (diff > 0 ? "+" : "") + diff, "kg"),
    tile("To Goal", !cur ? "–" : reached ? "Reached!" : toGoal + " " + (cutting ? "to lose" : "to gain"), reached || !cur ? "" : "kg")
  ]));

  root.appendChild(h("h2", { text: "Trends" }));
  var have = BODY_METRICS.filter(function (m) { return sorted.some(function (b) { return b[m.k] != null; }); });
  if (!have.some(function (m) { return m.k === bodyMetric; })) bodyMetric = "kg";
  var M = BODY_METRICS.filter(function (m) { return m.k === bodyMetric; })[0];
  var pts = sorted.filter(function (b) { return b[M.k] != null; });
  var tcard = h("div", { class: "card" });
  if (have.length > 1) {
    var mch = h("div", { class: "mchips", role: "group", "aria-label": "Measurement to chart" });
    have.forEach(function (m) {
      var b = h("button", { class: "btn ghost", type: "button", "aria-pressed": String(m.k === bodyMetric), text: m.label });
      b.onclick = function () { bodyMetric = m.k; rerenderKeepScroll(); };
      mch.appendChild(b);
    });
    tcard.appendChild(mch);
  }
  if (pts.length < 2) {
    tcard.appendChild(h("div", { class: "empty", text: "Log at least two " + M.label.toLowerCase() + " entries to see your trend." }));
  } else {
    var p0 = pts[0], pN = pts[pts.length - 1], isKg = M.k === "kg";
    tcard.appendChild(chartHead(M.label, pN[M.k], M.unit, pN[M.k] - p0[M.k], isKg ? !cutting : M.upGood));
    tcard.appendChild(lineChart(pts.map(function (b) { return { d: b.date, y: b[M.k] }; }), {
      goal: isKg ? G.kg : null, minSpan: M.unit === "kg" ? 1 : 0.5,
      label: M.label + " from " + p0[M.k] + " " + M.unit + " on " + p0.date + " to " + pN[M.k] + " " + M.unit + " on " + pN.date + (isKg ? ", goal " + G.kg + " kg" : "")
    }));
  }
  root.appendChild(tcard);

  root.appendChild(h("h2", { text: "Log a check-in" }));
  var f = { date: h("input", { type: "date", value: today() }) };
  BODY_METRICS.forEach(function (m) {
    f[m.k] = h("input", { type: "text", inputmode: "decimal", placeholder: m.k === "kg" ? "e.g. 88.5" : m.unit });
  });
  var add = h("button", { class: "btn", text: "Save check-in" });
  add.onclick = function () {
    var entry = { date: f.date.value || today(), note: "" }, any = false, bad = null;
    BODY_METRICS.forEach(function (m) {
      var v = num(f[m.k].value);
      if (v !== null && (v <= 0 || (m.k === "fat" && v >= 70))) bad = bad || m.label;
      entry[m.k] = v; if (v !== null) any = true;
    });
    if (bad) { toast("Check the " + bad.toLowerCase() + " value"); return; }
    if (!any) { toast("Enter at least one measurement"); return; }
    state.body.push(entry);
    save(); toast("Check-in saved"); render();
  };
  var lbl = function (m) { return h("label", {}, [m.label + " (" + m.unit + ")", f[m.k]]); };
  var more = BODY_METRICS.slice(2).map(lbl), moreGrid = [];
  for (var mi = 0; mi < more.length; mi += 2) moreGrid.push(h("div", { class: "grid2" }, more.slice(mi, mi + 2)));
  root.appendChild(h("div", { class: "card", style: "display:flex;flex-direction:column;gap:10px" }, [
    h("label", {}, ["Date", f.date]),
    h("div", { class: "grid2" }, [lbl(BODY_METRICS[0]), lbl(BODY_METRICS[1])]),
    h("details", { class: "more-m" }, [h("summary", { text: "More measurements: chest, arms, thighs, hips, body fat" })].concat(moreGrid)),
    add
  ]));

  root.appendChild(h("h2", { text: "History" }));
  var list = h("div", { class: "card list" });
  sorted.slice().reverse().forEach(function (b) {
    var parts = BODY_METRICS.filter(function (m) { return b[m.k] != null; }).map(function (m) { return m.k === "kg" ? b.kg + " kg" : m.label + " " + b[m.k] + (m.unit === "%" ? "%" : " cm"); });
    var del = h("button", { class: "btn ghost sm", text: "Remove" });
    del.onclick = function () { removeWithUndo("body", b, "Check-in · " + b.date); };
    list.appendChild(h("div", { class: "item" }, [
      h("div", {}, [h("div", { text: b.note || "Check-in" }), h("div", { class: "d", text: b.date })]),
      h("div", { class: "row-r" }, [h("div", { class: "v", text: parts.join(" · ") }), del])
    ]));
  });
  root.appendChild(list);
}
