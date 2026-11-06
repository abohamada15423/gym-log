// Plate calculator, backup, warm-up, history, day editor and program picker dialogs.
// Classic script sharing the page's global scope; see README for load order.

/* ---------- MODALS (Plate Calc & Baseline Setter & HD Form) ---------- */
function closeModal() {
  $("modal").hidden = true;
  var f = modalOnClose; modalOnClose = null; if (f) f();
}
$("modal").onclick = function (e) { if (e.target === $("modal")) closeModal(); };
// Escape closes any open dialog, even when focus is still on the page behind it.
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && !$("modal").hidden) { e.preventDefault(); closeModal(); }
});
$("modal").onkeydown = function (e) {
  if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }
  if (e.key !== "Tab") return;
  var items = $("mbox").querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]');
  if (!items.length) return;
  var first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
};

function openBaselineModal(exName) {
  var box = $("mbox"); box.textContent = "";
  var cur = state.baselines[exName] || [60, 8];
  var wIn = h("input", { type: "text", inputmode: "decimal", value: String(cur[0]), placeholder: "KG" });
  var rIn = h("input", { type: "text", inputmode: "numeric", value: String(cur[1]), placeholder: "Reps" });
  var saveB = h("button", { class: "btn", text: "Save Last Lifted Weight" });
  saveB.onclick = function () {
    var w = num(wIn.value), r = num(rIn.value);
    if (w === null || r === null) { toast("Enter valid kg & reps"); return; }
    state.baselines[exName] = [w, r]; save(); closeModal(); render();
    toast("Saved " + exName + ": " + w + "kg × " + r);
  };
  box.appendChild(h("div", { class: "mhead" }, [h("div", { class: "mtitle", text: exName }), h("button", { class: "btn ghost sm", text: "✕", onclick: closeModal })]));
  box.appendChild(h("div", { class: "empty", text: "Set the last weight & reps you lifted for this exercise so it appears as your reference in every set:" }));
  box.appendChild(h("div", { class: "grid2" }, [h("label", {}, ["Last Weight (KG)", wIn]), h("label", {}, ["Last Reps", rIn])]));
  box.appendChild(saveB);
  $("modal").hidden = false;
}

function openPlateModal(exName, weight, reps) {
  var box = $("mbox"); box.textContent = "";
  var oneRM = weight && reps ? Math.round(weight * (1 + reps / 30)) : 0;
  var plates = platesFor(weight, 20);
  var c = h("canvas", {});
  box.appendChild(h("div", { class: "mhead" }, [h("div", { class: "mtitle", text: exName }), h("button", { class: "btn ghost sm", text: "Close" })]));
  box.lastChild.lastChild.onclick = closeModal;
  var animWrap = h("div", { style: "display:grid;place-items:center;background:var(--soft);border-radius:16px;padding:10px" }, [c]);
  box.appendChild(animWrap);
  drawBiomechanicalExercise(c, exName, 1.8);
  if (weight > 0) {
    box.appendChild(h("div", { class: "grid2" }, [
      h("div", { class: "stat" }, [h("div", { class: "k", text: "Est. 1RM" }), h("div", { class: "n", text: oneRM + " kg" })]),
      h("div", { class: "stat" }, [h("div", { class: "k", text: "Per Side (20kg Bar)" }), h("div", { class: "n", style: "font-size:1.25rem", text: plates.length ? plates.join(" + ") + " kg" : "Bar only" })])
    ]));
  }
  var trend = exerciseTrend(exName), tp = trend.points, unit = trend.weighted ? "kg" : "reps";
  var what = trend.weighted ? "Best est. 1RM" : "Best set (reps)";
  if (tp.length >= 2) {
    box.appendChild(h("div", { class: "card" }, [
      chartHead(what + " · " + tp.length + " sessions", tp[tp.length - 1].y, unit, tp[tp.length - 1].y - tp[0].y, true),
      lineChart(tp, { minSpan: trend.weighted ? 2.5 : 1, label: exName + " " + what + " from " + tp[0].y + " to " + tp[tp.length - 1].y + " " + unit })
    ]));
  } else {
    box.appendChild(h("div", { class: "empty", text: tp.length ? "Log this exercise in one more workout to see your progress chart." : "Your progress chart appears here after you log this exercise in two workouts." }));
  }
  $("modal").hidden = false;
  box.querySelector(".mhead .btn").focus({ preventScroll: true });
}

/* ---------- BACKUP ---------- */
function daysBetween(a, b) { var x = ymdParse(a), y = ymdParse(b); return x && y ? Math.round((y - x) / 864e5) : 0; }
// Due when there are 3+ workouts and either no backup yet, or 14+ days and new workouts since the last one.
function backupDue() {
  if (state.sessions.length < 3) return false;
  if (state.backupSnooze && today() < state.backupSnooze) return false;
  if (!state.lastBackup) return true;
  return daysBetween(state.lastBackup, today()) >= 14 && state.sessions.length !== (state.backupCount || 0);
}
function markBackedUp() {
  state.lastBackup = today(); state.backupCount = state.sessions.length; delete state.backupSnooze;
  save(); render(); toast("Backup saved ✓");
}
// Share sheet where available (lets iPhone users save to Files or send it), otherwise a download.
function exportBackup() {
  var name = "gymlog-backup-" + today() + ".json", text = JSON.stringify(state, null, 2);
  try {
    var file = new File([text], name, { type: "application/json" });
    if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: "Gym Log backup" }).then(markBackedUp).catch(function () { });
      return;
    }
  } catch (e) { }
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  markBackedUp();
}
function backupNag() {
  var later = h("button", { class: "btn ghost", type: "button", text: "Remind me later" });
  later.onclick = function () { state.backupSnooze = ymdAdd(today(), 3); save(); render(); };
  var now = h("button", { class: "btn", type: "button", text: "Back up now" });
  now.onclick = exportBackup;
  var since = state.lastBackup ? "Your last backup was " + daysBetween(state.lastBackup, today()) + " days ago." : "You haven't backed up yet.";
  return h("section", { class: "card backup-nag", role: "region", "aria-label": "Backup reminder" }, [
    h("p", {}, [h("b", { text: "Back up your " + state.sessions.length + " workouts" }), since + " They only live on this phone."]),
    h("div", { class: "grid2" }, [later, now])
  ]);
}

/* ---------- WARM-UP ---------- */
function openWarmupModal(exName, work) {
  var box = $("mbox"); box.textContent = "";
  var close = h("button", { class: "btn ghost sm", type: "button", text: "Close" });
  close.onclick = closeModal;
  box.appendChild(h("div", { class: "mhead" }, [h("div", { class: "mtitle", text: "Warm-up" }), close]));
  var wIn = h("input", { type: "text", inputmode: "decimal", value: work ? String(work) : "", "aria-label": "Working weight in kg", placeholder: "kg" });
  var list = h("div", { class: "warm" });
  var barbell = isBarbell(exName);
  function paint() {
    list.textContent = "";
    var w = num(wIn.value);
    if (w === null || w <= 0) { list.appendChild(h("div", { class: "empty", text: "Enter your working weight to see warm-up sets." })); return; }
    var sets = warmupSets(w, barbell);
    if (!sets.length) list.appendChild(h("div", { class: "empty", text: "This weight is light enough to start straight away. A few easy reps are plenty." }));
    sets.concat([{ w: w, r: null, work: true }]).forEach(function (st, i) {
      var pl = barbell ? platesFor(st.w, 20) : null;
      var side = st.note || (pl ? (pl.length ? pl.join(" + ") + " a side" : "Bar only") : "");
      list.appendChild(h("div", { class: "warm-row" + (st.work ? " work" : ""), style: "--d:" + i }, [
        h("span", { text: st.work ? "▶" : String(i + 1) }),
        h("b", { text: mbFmt(st.w) + " kg" + (st.r ? " × " + st.r : " · working sets") }),
        h("small", { text: side })
      ]));
    });
  }
  wIn.oninput = paint;
  box.appendChild(h("div", { class: "empty", style: "text-align:start", text: exName + ". Rest about a minute between warm-up sets and keep them easy." }));
  box.appendChild(h("label", {}, ["Working weight (kg)", wIn]));
  box.appendChild(list);
  paint();
  $("modal").hidden = false;
  close.focus();
}

/* ---------- WORKOUT HISTORY ---------- */
function openHistoryModal(openId) {
  var box = $("mbox"); box.textContent = "";
  var close = h("button", { class: "btn ghost sm", type: "button", text: "Close" });
  close.onclick = closeModal;
  var all = state.sessions.map(function (s, i) { return { s: s, i: i }; })
    .sort(function (a, b) { return a.s.date === b.s.date ? b.i - a.i : (a.s.date < b.s.date ? 1 : -1); });
  var totalVol = all.reduce(function (t, x) { return t + sessionVolume(x.s); }, 0);
  box.appendChild(h("div", { class: "mhead" }, [h("div", { class: "mtitle", text: "Workout History" }), close]));
  box.appendChild(h("div", { class: "grid2" }, [
    h("div", { class: "stat" }, [h("div", { class: "k", text: "Workouts" }), h("div", { class: "n", text: String(all.length) })]),
    h("div", { class: "stat" }, [h("div", { class: "k", text: "Total volume" }), h("div", { class: "n" }, [Math.round(totalVol).toLocaleString(), h("small", { text: "kg" })])])
  ]));
  if (!all.length) box.appendChild(h("div", { class: "empty", text: "No completed sessions yet." }));
  var month = "", target = null;
  all.forEach(function (x) {
    var s = x.s, d = ymdParse(s.date), m = d ? MB_MON[d.getMonth()] + " " + d.getFullYear() : "Other";
    if (m !== month) { month = m; box.appendChild(h("div", { class: "hist-month", text: m })); }
    var names = Object.keys(s.sets || {}), nSets = names.reduce(function (t, n) { return t + s.sets[n].length; }, 0);
    var body = h("div", { class: "hist-body" });
    if (s.note) body.appendChild(h("div", { class: "hist-note", text: "📝 " + s.note }));
    names.forEach(function (n) {
      body.appendChild(h("div", { class: "hist-ex" }, [h("span", { text: n }), h("span", { text: s.sets[n].map(function (p) { return mbFmt(p[0]) + "×" + p[1]; }).join("  ") })]));
      if (s.notes && s.notes[n]) body.appendChild(h("div", { class: "hist-note", text: s.notes[n] }));
    });
    var del = h("button", { class: "btn ghost sm", type: "button", text: "Remove workout" });
    del.onclick = function () { closeModal(); removeWithUndo("sessions", s, sessionName(s) + " · " + s.date); };
    body.appendChild(del);
    var det = h("details", { class: "hist" }, [
      h("summary", {}, [h("div", {}, [h("b", { text: sessionName(s) }), h("small", { text: (d ? mbDay(s.date) : s.date) + " · " + names.length + " exercises · " + nSets + " sets" })]),
        h("span", { class: "v", text: Math.round(sessionVolume(s)).toLocaleString() + " kg" })]),
      body
    ]);
    if (s.id === openId) { det.open = true; target = det; }
    box.appendChild(det);
  });
  $("modal").hidden = false;
  if (target && target.scrollIntoView) target.scrollIntoView({ block: "nearest" });
  close.focus();
}

/* ---------- DAY EDITOR & EXERCISE PICKER ---------- */
function openDayEditor(did) {
  ensureCustom();
  var d = state.custom.days.filter(function (x) { return x.id === did; })[0];
  if (!d) return;
  save();
  modalOnClose = function () { save(); render(); };
  function paint() {
    var box = $("mbox"); box.textContent = "";
    var done = h("button", { class: "btn sm", type: "button", text: "Done" });
    done.onclick = closeModal;
    box.appendChild(h("div", { class: "mhead" }, [h("div", { class: "mtitle", text: "Edit Day" }), done]));
    var nameIn = h("input", { type: "text", value: d.name, style: "text-align:start" });
    nameIn.oninput = function () { d.name = nameIn.value; save(); };
    box.appendChild(h("label", {}, ["Day name", nameIn]));
    if (!d.ex.length) box.appendChild(h("div", { class: "empty", text: "No exercises yet. Add some from the library." }));
    d.ex.forEach(function (e, i) {
      var etc = h("canvas", { class: "thumb" }); thumbAnim(etc, e[0]);
      var sIn = h("input", { type: "text", inputmode: "numeric", value: String(e[1]) });
      sIn.oninput = function () { var n = parseInt(sIn.value, 10); if (n > 0) { e[1] = n; save(); } };
      var rIn = h("input", { type: "text", value: String(e[2]) });
      rIn.oninput = function () { if (rIn.value.trim()) { e[2] = rIn.value.trim(); save(); } };
      function mv(dir) {
        return function () {
          var j = i + dir; if (j < 0 || j >= d.ex.length) return;
          var t = d.ex[i]; d.ex[i] = d.ex[j]; d.ex[j] = t; save(); paint();
        };
      }
      var up = h("button", { class: "btn ghost sm", type: "button", text: "▲" }); up.onclick = mv(-1);
      var dn = h("button", { class: "btn ghost sm", type: "button", text: "▼" }); dn.onclick = mv(1);
      var rm = h("button", { class: "btn ghost sm", type: "button", text: "✕" });
      rm.onclick = function () { d.ex.splice(i, 1); save(); paint(); };
      box.appendChild(h("div", { class: "erow" }, [
        h("div", { style: "display:flex;align-items:center;gap:10px" }, [
          h("div", { class: "thumbbox" }, [etc]),
          h("div", { class: "en" }, [h("b", { text: e[0] }), h("small", { text: e[3] })])
        ]),
        h("div", { class: "eedit" }, [h("label", {}, ["Sets", sIn]), h("label", {}, ["Reps", rIn]), up, dn, rm])
      ]));
    });
    var add = h("button", { class: "btn", type: "button", text: "＋ Add exercises from library" });
    add.onclick = function () { openPicker(d, paint); };
    box.appendChild(add);
    $("modal").hidden = false;
  }
  paint();
}

function openPicker(d, back) {
  var box = $("mbox"); box.textContent = "";
  var group = "All", q = "";
  var done = h("button", { class: "btn sm", type: "button", text: "Done" });
  done.onclick = back;
  box.appendChild(h("div", { class: "mhead" }, [h("div", { class: "mtitle", text: "Exercise Library" }), done]));
  var search = h("input", { type: "text", placeholder: "Search exercises…", style: "text-align:start" });
  var chipRow = h("div", { class: "fchips" });
  var listEl = h("div", { class: "list" });
  box.appendChild(search); box.appendChild(chipRow); box.appendChild(listEl);
  function has(n) { return d.ex.some(function (e) { return e[0] === n; }); }
  function paintChips() {
    chipRow.textContent = "";
    ["All"].concat(GROUPS).forEach(function (g) {
      var b = h("button", { class: "btn sm" + (g === group ? "" : " ghost"), type: "button", text: g });
      b.onclick = function () { group = g; paintChips(); paintList(); };
      chipRow.appendChild(b);
    });
  }
  function paintList() {
    listEl.textContent = "";
    var items = allLib().filter(function (L) {
      return (group === "All" || L[1] === group) && (!q || L[0].toLowerCase().indexOf(q) > -1 || L[2].toLowerCase().indexOf(q) > -1);
    });
    if (!items.length) listEl.appendChild(h("div", { class: "empty", text: "No matches. Create your own below." }));
    items.forEach(function (L) {
      var on = has(L[0]);
      var tc = h("canvas", { class: "thumb" });
      var row = h("div", { class: "libitem" + (on ? " on" : "") }, [
        h("div", { class: "thumbbox" }, [tc]),
        h("div", { style: "flex:1;min-width:0" }, [h("b", { text: L[0] }), h("div", { class: "d", text: L[1] + " · " + L[2] + " · " + L[3] + "×" + L[4] })]),
        h("span", { class: "pill" + (on ? " gold" : ""), text: on ? "✓ Added" : "＋ Add" })
      ]);
      thumbAnim(tc, L[0]);
      row.onclick = function () {
        if (on) d.ex = d.ex.filter(function (e) { return e[0] !== L[0]; });
        else d.ex.push(exFromLib(L));
        save(); paintList();
      };
      listEl.appendChild(row);
    });
  }
  search.oninput = function () { q = search.value.trim().toLowerCase(); paintList(); };
  paintChips(); paintList();

  var nIn = h("input", { type: "text", placeholder: "Exercise name", style: "text-align:start" });
  var gSel = h("select", {}, GROUPS.map(function (g) { return h("option", { value: g, text: g }); }));
  var sIn = h("input", { type: "text", inputmode: "numeric", value: "3" });
  var rIn = h("input", { type: "text", value: "10" });
  var mk = h("button", { class: "btn ghost", type: "button", text: "＋ Create & add" });
  mk.onclick = function () {
    var name = nIn.value.trim();
    if (!name) { toast("Enter a name"); return; }
    var found = allLib().filter(function (L) { return L[0].toLowerCase() === name.toLowerCase(); })[0];
    if (found) {
      if (!has(found[0])) d.ex.push(exFromLib(found));
    } else {
      var L = [name, gSel.value, gSel.value, parseInt(sIn.value, 10) || 3, rIn.value.trim() || "10", 90, guessAnim(name, gSel.value)];
      state.customLib.push(L);
      d.ex.push(exFromLib(L));
    }
    nIn.value = ""; save(); paintList(); toast("Added " + name);
  };
  box.appendChild(h("h2", { text: "Your own exercise" }));
  box.appendChild(h("div", { style: "display:flex;flex-direction:column;gap:8px" }, [
    nIn,
    h("div", { class: "grid2" }, [h("label", {}, ["Muscle", gSel]), h("div", { class: "grid2" }, [h("label", {}, ["Sets", sIn]), h("label", {}, ["Reps", rIn])])]),
    mk
  ]));
  $("modal").hidden = false;
}

/* ---------- TRAINING SYSTEM SELECTOR ---------- */
function renderPrograms(root) {
  root.appendChild(h("h2", { text: "Training System" }));
  var wrap = h("div", { style: "display:flex;flex-direction:column;gap:8px" });
  function card(id, name, freq, desc, days, onclick) {
    var active = state.programId === id;
    var b = h("button", { class: "prog" + (active ? " active" : ""), type: "button" }, [
      h("div", { class: "prog-top2" }, [h("b", { text: name }), h("span", { class: "pill" + (active ? " gold" : ""), text: active ? "Active · " + freq : freq })]),
      h("div", { class: "empty", text: desc }),
      days ? h("div", { style: "font-family:var(--f-data);font-size:.72rem;color:var(--muted)", text: days }) : null
    ]);
    b.onclick = onclick; return b;
  }
  PROGRAMS.forEach(function (p) {
    wrap.appendChild(card(p.id, p.name, p.freq, p.desc, p.days.map(function (x) { return x.name; }).join(" · "), function () { selectProgram(p.id); }));
  });
  if (state.custom) {
    wrap.appendChild(card("custom", state.custom.name, state.custom.days.length + " days", "Your own program. Days and exercises are fully editable.",
      state.custom.days.map(function (x) { return x.name; }).join(" · "), function () { selectProgram("custom"); }));
  }
  root.appendChild(wrap);

  var newBtn = h("button", { class: "btn ghost", type: "button", text: "＋ Build from scratch" });
  newBtn.onclick = function () {
    if (state.custom && !confirm("Replace your current “" + state.custom.name + "” with a blank program?")) return;
    createBlankCustom();
  };
  var copyBtn = h("button", { class: "btn ghost", type: "button", text: "⎘ Customize active" });
  copyBtn.onclick = function () {
    if (state.programId === "custom") { toast("You are already editing My Program"); return; }
    ensureCustom(); save(); render();
  };
  root.appendChild(h("div", { class: "grid2" }, [newBtn, copyBtn]));

  if (state.programId === "custom" && state.custom) {
    root.appendChild(h("h2", { text: "Edit My Program" }));
    var nameIn = h("input", { type: "text", value: state.custom.name, style: "text-align:start" });
    nameIn.oninput = function () { state.custom.name = nameIn.value || "My Program"; save(); };
    var list = h("div", { class: "list" });
    state.custom.days.forEach(function (d) {
      var ed = h("button", { class: "btn ghost sm", type: "button", text: "Edit" });
      ed.onclick = function () { openDayEditor(d.id); };
      var del = h("button", { class: "btn ghost sm", type: "button", text: "✕" });
      del.onclick = function () {
        if (state.custom.days.length < 2) { toast("Keep at least one day"); return; }
        if (!confirm("Delete " + d.name + "?")) return;
        state.custom.days = state.custom.days.filter(function (x) { return x.id !== d.id; });
        delete state.drafts[dk(d.id)];
        retag(); applyProgram();
        if (dayId === d.id) dayId = DAYS[0].id;
        save(); render();
      };
      list.appendChild(h("div", { class: "item" }, [
        h("div", {}, [h("div", { style: "font-weight:700", text: d.name }), h("div", { class: "d", text: d.tag + " · " + d.ex.length + " exercises" })]),
        h("div", { class: "row-r" }, [ed, del])
      ]));
    });
    var addDay = h("button", { class: "btn", type: "button", text: "＋ Add training day" });
    addDay.onclick = function () {
      var nd = NEW_DAY(state.custom.days.length + 1);
      state.custom.days.push(nd); retag(); applyProgram(); save(); render();
      openDayEditor(nd.id);
    };
    root.appendChild(h("div", { class: "card", style: "display:flex;flex-direction:column;gap:10px" }, [
      h("label", {}, ["Program name", nameIn]), list, addDay
    ]));
  }
}
