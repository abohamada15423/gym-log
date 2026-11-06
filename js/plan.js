// Plan tab: goals, habits, alerts, backup and rules.
// Classic script sharing the page's global scope; see README for load order.

/* ---------- PLAN & BACKUP VIEW ---------- */
function renderPlan(root) {
  function tile(k, n, u) {
    var big = h("div", { class: "n", text: n }); if (u) big.appendChild(h("small", { text: u }));
    return h("div", { class: "stat" }, [h("div", { class: "k", text: k }), big]);
  }

  renderPrograms(root);
  var G = goals();
  var startEntry = state.body.filter(function (b) { return b.kg != null; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
  root.appendChild(h("h2", { text: "Your goals" }));
  function goalField(label, key, unit, min, max) {
    var inp = h("input", { type: "text", inputmode: "decimal", value: String(G[key]), "aria-label": label + " (" + unit + ")" });
    inp.onchange = function () {
      var v = num(inp.value);
      if (v === null || v < min || v > max) { toast(label + " must be " + min + "–" + max + " " + unit); inp.value = String(goals()[key]); return; }
      v = key === "kg" ? Math.round(v * 10) / 10 : Math.round(v);
      state.goals[key] = v; inp.value = String(v); save(); toast(label + " set to " + v + " " + unit);
    };
    return h("label", {}, [label + " (" + unit + ")", inp]);
  }
  root.appendChild(h("div", { class: "card", style: "display:flex;flex-direction:column;gap:10px" }, [
    h("div", { class: "grid2" }, [goalField("Daily calories", "kcal", "kcal", 800, 8000), goalField("Daily protein", "protein", "g", 20, 500)]),
    h("div", { class: "grid2" }, [goalField("Goal weight", "kg", "kg", 30, 300),
      tile("Starting weight", startEntry ? String(startEntry.kg) : "–", startEntry ? "kg" : "")]),
    h("div", { class: "note", text: "Changes save straight away and update the Body and Meals tabs." })
  ]));

  root.appendChild(h("h2", { text: "Daily habits" }));
  var hcard = h("div", { class: "card" });
  habitList().forEach(function (hb) {
    var del = h("button", { class: "btn ghost sm", type: "button", text: "Remove" });
    del.onclick = function () { ownHabits(); removeWithUndo("habitList", state.habitList.filter(function (x) { return x.id === hb.id; })[0], hb.name); };
    hcard.appendChild(h("div", { class: "hed" }, [
      h("div", {}, [h("b", { text: (hb.icon ? hb.icon + " " : "") + hb.name }), h("small", { text: hb.type === "count" ? "Goal " + mbFmt(hb.target) + " " + (hb.unit || "") + " a day, " + mbFmt(hb.step) + " per tap" : "Yes / no each day" })]),
      del
    ]));
  });
  if (!habitList().length) hcard.appendChild(h("div", { class: "empty", text: "No habits. Add one below." }));
  var hf = {
    name: h("input", { type: "text", placeholder: "e.g. Stretch 10 min", style: "text-align:start" }),
    icon: h("input", { type: "text", placeholder: "🧘", maxlength: "4" }),
    type: h("select", {}, [h("option", { value: "check", text: "Yes / no" }), h("option", { value: "count", text: "Amount" })]),
    target: h("input", { type: "text", inputmode: "decimal", placeholder: "e.g. 8" }),
    step: h("input", { type: "text", inputmode: "decimal", placeholder: "1" }),
    unit: h("input", { type: "text", placeholder: "e.g. hrs" })
  };
  var amountRow = h("div", { class: "grid2" }, [h("label", {}, ["Daily goal", hf.target]), h("label", {}, ["Per tap", hf.step]), h("label", {}, ["Unit", hf.unit])]);
  amountRow.hidden = true;
  hf.type.onchange = function () { amountRow.hidden = hf.type.value !== "count"; };
  var hadd = h("button", { class: "btn", type: "button", text: "Add habit" });
  hadd.onclick = function () {
    var nm = hf.name.value.trim();
    if (!nm) { toast("Name the habit"); hf.name.focus(); return; }
    var hb = { id: "h" + uid(), name: nm.slice(0, 40), icon: hf.icon.value.trim().slice(0, 4), type: hf.type.value };
    if (hb.type === "count") {
      var tg = num(hf.target.value), st = num(hf.step.value);
      if (tg === null || tg <= 0) { toast("Enter a daily goal above 0"); hf.target.focus(); return; }
      hb.target = tg; hb.step = st && st > 0 ? st : 1; hb.unit = hf.unit.value.trim().slice(0, 8);
    }
    ownHabits().push(hb); save(); rerenderKeepScroll(); toast(hb.name + " added to your daily habits");
  };
  hcard.appendChild(h("div", { class: "hadd", style: "display:flex;flex-direction:column;gap:10px;margin-top:10px;padding-top:12px;border-top:1px solid var(--line)" }, [
    h("div", { class: "grid2" }, [h("label", {}, ["New habit", hf.name]), h("label", {}, ["Icon (optional)", hf.icon])]),
    h("label", {}, ["Type", hf.type]),
    amountRow,
    hadd
  ]));
  root.appendChild(hcard);

  // Each option is written in its own language so it can always be found.
  var langRow = h("div", { class: "lang-switch", role: "group", "aria-label": "Language / اللغة" });
  [["en", "English"], ["ar", "العربية"]].forEach(function (L) {
    var b = h("button", { class: "btn ghost", type: "button", lang: L[0], "aria-pressed": String((state.lang || "en") === L[0]) });
    b.appendChild(document.createTextNode(L[1]));
    b.onclick = function () {
      if ((state.lang || "en") === L[0]) return;
      state.lang = L[0]; save(); applyLang(); window.scrollTo(0, 0); render();
    };
    langRow.appendChild(b);
  });
  root.appendChild(h("h2", { text: "Language" }));
  root.appendChild(langRow);

  root.appendChild(h("h2", { text: "Alerts and screen" }));
  function toggleRow(title, sub, on) {
    var sw = h("span", { class: "sw" + (on ? " on" : "") });
    var b = h("button", { class: "qpill" + (on ? " on" : ""), type: "button" }, [h("div", {}, [h("b", { text: title }), h("small", { text: sub })]), sw]);
    b.setOn = function (v) { b.classList.toggle("on", v); sw.classList.toggle("on", v); };
    return b;
  }
  var nBtn = toggleRow("Rest-end alert", "Notification + sound when rest finishes", !!state.notify && notifyOK());
  nBtn.onclick = function () {
    if (state.notify) { state.notify = false; save(); nBtn.setOn(false); toast("Rest alerts off"); return; }
    if (!("Notification" in window)) { toast("iPhone: add the app to Home Screen first, then enable", 3600); return; }
    var handled = false;
    function done(perm) {
      if (handled) return; handled = true;
      if (perm === "granted") {
        state.notify = true; save(); nBtn.setOn(true);
        showNotif("Gym Log", "Rest alerts are on ✓");
      } else {
        nBtn.setOn(false); toast("Blocked — allow it in iPhone Settings → Notifications", 3600);
      }
    }
    try { var r = Notification.requestPermission(done); if (r && r.then) r.then(done); } catch (e) { done("denied"); }
  };
  var awakeOK = !!navigator.wakeLock;
  var wBtn2 = toggleRow("Keep screen on while resting", awakeOK ? "Stops the phone locking during the rest timer" : "Not supported on this device", awakeOK && state.keepAwake);
  wBtn2.onclick = function () {
    if (!awakeOK) { toast("Not supported on this device"); return; }
    state.keepAwake = !state.keepAwake; save(); wBtn2.setOn(state.keepAwake);
    if (!state.keepAwake) freeScreen();
  };
  root.appendChild(h("div", { style: "display:flex;flex-direction:column;gap:8px" }, [nBtn, wBtn2,
    h("div", { class: "note", text: "On iPhone the alert arrives while the app is open or just backgrounded. Keeping the screen on during rest is the most reliable way to hear the beep." })]));

  root.appendChild(h("h2", { text: "Backup" }));
  var expBtn = h("button", { class: "btn", text: "⬇ Export Backup (JSON)" });
  expBtn.onclick = exportBackup;
  var fileIn = h("input", { type: "file", accept: ".json", style: "display:none" });
  var impBtn = h("button", { class: "btn ghost", text: "⬆ Import Backup (JSON)" });
  impBtn.onclick = function () { fileIn.click(); };
  fileIn.onchange = function (e) {
    var file = e.target.files && e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var parsed = JSON.parse(ev.target.result);
        if (!parsed || !Array.isArray(parsed.sessions)) { toast("That file isn't a Gym Log backup"); return; }
        var n = parsed.sessions.length, m = Array.isArray(parsed.body) ? parsed.body.length : 0;
        if (!confirm("Replace everything on this device with this backup?\n\nBackup: " + n + " workout" + (n === 1 ? "" : "s") + ", " + m + " check-in" + (m === 1 ? "" : "s") + ".\nThis device: " + state.sessions.length + " workouts, " + state.body.length + " check-ins.\n\nExport a backup first if you want to keep what's here.")) return;
        adopt(parsed); applyLoaded(); save(); render(); toast("Backup restored!");
      } catch (err) { toast("Invalid backup file"); }
    };
    reader.readAsText(file);
    fileIn.value = "";
  };
  root.appendChild(h("div", { class: "card", style: "display:flex;flex-direction:column;gap:10px" }, [
    h("div", { class: "grid2" }, [expBtn, impBtn, fileIn]),
    h("div", { class: "note", text: state.lastBackup ? "Last backup: " + mbDay(state.lastBackup) + " (" + (state.backupCount || 0) + " workouts)." : "No backup yet. Your data only lives on this device." })
  ]));

  root.appendChild(h("h2", { text: "How to progress" }));
  var ul = h("ul", { class: "rules" });
  [
    "Stop each set 1–2 reps before failure.",
    "When you hit the top of the rep range on every set, add 2.5 kg next session.",
    (!startEntry || G.kg <= startEntry.kg ? "Aim to lose 0.3–0.5 kg per week toward your " : "Aim to gain 0.2–0.4 kg per week toward your ") + G.kg + " kg goal.",
    startEntry ? "Starting point (" + startEntry.date + "): " + startEntry.kg + " kg" + (startEntry.fat != null ? " · " + startEntry.fat + "% body fat" : "") + "." : null
  ].forEach(function (t) { if (t) ul.appendChild(h("li", { text: t })); });
  root.appendChild(h("div", { class: "card" }, [ul]));
}
