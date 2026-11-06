// Focus mode: a full-screen, one-set-at-a-time view of today's workout.
// It edits the same draft as the Train tab, so you can switch between the two at any point.

var focusActive = false, focusIdx = 0, focusMode = "set", focusIv = null, focusEl = null, focusLastLeft = -1;

function focusDay() { return DAYS.filter(function (x) { return x.id === dayId; })[0] || DAYS[0]; }
function focusDraft(d) { var k = dk(d.id); return (state.drafts[k] = state.drafts[k] || {}); }
// Every set of the day in order: one step per set.
function focusSteps(d) {
  var out = [];
  d.ex.forEach(function (e, xi) {
    var n = setsFor(d, e);
    for (var i = 0; i < n; i++) out.push({ e: e, name: e[0], i: i, n: n, xi: xi });
  });
  return out;
}
function focusCell(d, st) {
  var dr = focusDraft(d), arr = (dr[st.name] = dr[st.name] || []);
  return (arr[st.i] = arr[st.i] || { w: "", r: "", done: false });
}
function focusNextOpen(d, steps, from) {
  for (var k = 0; k < steps.length; k++) {
    var j = (from + k) % steps.length, c = focusDraft(d)[steps[j].name];
    if (!(c && c[steps[j].i] && c[steps[j].i].done)) return j;
  }
  return -1;
}
// What to pre-fill: what you typed, else last time's set, else the suggestion.
function focusDefaults(d, st) {
  var hist = getExerciseHistory(st.name), prev = hist.sets[st.i] || hist.sets[hist.sets.length - 1] || null;
  var sug = suggestNext(st.name, st.e[1], st.e[2]);
  return { prev: prev, sug: sug, w: sug && sug.up ? sug.w : prev ? prev[0] : "", r: sug && sug.up ? sug.r : prev ? prev[1] : (repRange(st.e[2]) || {}).lo || "" };
}

function openFocus() {
  var d = focusDay(), steps = focusSteps(d);
  if (!steps.length) { toast("Add exercises to this day first"); return; }
  var first = focusNextOpen(d, steps, 0);
  focusIdx = first < 0 ? 0 : first;
  focusMode = first < 0 ? "complete" : rest.iv ? "rest" : "set";
  if (!focusEl) {
    focusEl = h("div", { class: "focus", id: "focus", role: "dialog", "aria-modal": "true", "aria-label": "Focus mode" });
    document.body.appendChild(focusEl);
  }
  focusActive = true; focusEl.hidden = false;
  document.body.classList.add("focusing");
  holdScreen();
  paintFocus();
  clearInterval(focusIv); focusIv = setInterval(focusTick, 250);
}
function closeFocus() {
  if (!focusActive) return;
  focusActive = false; clearInterval(focusIv); focusIv = null;
  focusEl.hidden = true; focusEl.textContent = "";
  document.body.classList.remove("focusing");
  if (!rest.iv) freeScreen();
  var d = focusDay(), st = focusSteps(d)[focusIdx];
  if (st) expandedExercise = st.name;
  render();
}
function focusTick() {
  if (!focusActive || focusMode !== "rest") return;
  if (!rest.iv) { focusMode = "set"; paintFocus(); return; }
  var left = Math.max(0, Math.ceil((rest.end - Date.now()) / 1000));
  var ring = focusEl.querySelector(".f-ring"), tm = focusEl.querySelector(".f-time");
  if (!ring || !tm) return;
  var frac = Math.max(0, Math.min(1, (rest.end - Date.now()) / (rest.total * 1000)));
  ring.style.strokeDashoffset = String(1 - frac);
  if (left !== focusLastLeft) { tm.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0"); focusLastLeft = left; }
  focusEl.querySelector(".f-rest").classList.toggle("soon", left > 0 && left <= 5);
}

function paintFocus() {
  if (!focusActive) return;
  var d = focusDay(), steps = focusSteps(d), dr = focusDraft(d);
  var doneN = 0, vol = 0;
  steps.forEach(function (s) { var c = dr[s.name] && dr[s.name][s.i]; if (c && c.done) { doneN++; vol += (num(c.w) || 0) * (num(c.r) || 0); } });
  if (focusIdx >= steps.length) focusIdx = steps.length - 1;
  var st = steps[focusIdx];
  focusEl.textContent = "";

  var exit = h("button", { class: "f-exit", type: "button", "aria-label": "Exit focus mode", text: "✕" });
  exit.onclick = closeFocus;
  var bar = h("div", { class: "f-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(steps.length), "aria-valuenow": String(doneN) }, [h("i", { style: "width:" + (steps.length ? doneN / steps.length * 100 : 0) + "%" })]);
  focusEl.appendChild(h("div", { class: "f-top" }, [exit, h("div", { class: "f-prog" }, [h("small", { text: doneN + " / " + steps.length + " sets" }), bar]), h("span", { class: "f-day", text: d.name })]));

  var body = h("div", { class: "f-body f-" + focusMode });
  focusEl.appendChild(body);

  if (focusMode === "complete") {
    body.appendChild(h("div", { class: "f-done-icon", "aria-hidden": "true", text: "💪" }));
    body.appendChild(h("h2", { class: "f-title", text: "All sets done" }));
    body.appendChild(h("p", { class: "f-sub", text: doneN + " sets · " + Math.round(vol).toLocaleString() + " kg volume" }));
    var fin = h("button", { class: "btn f-main", type: "button", text: "Finish workout" });
    fin.onclick = function () { closeFocus(); var b = document.querySelector(".session-dock .btn"); if (b && !b.disabled) b.click(); };
    var backB = h("button", { class: "btn ghost", type: "button", text: "Back to workout" });
    backB.onclick = closeFocus;
    body.appendChild(h("div", { class: "f-actions" }, [fin, backB]));
    fin.focus();
    return;
  }

  if (focusMode === "rest") {
    var nxt = st, nd = focusDefaults(d, nxt), nc = focusCell(d, nxt);
    var nw = nc.w || nd.w, nr = nc.r || nd.r;
    var ring = '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="f-ring-bg" cx="60" cy="60" r="52"/><circle class="f-ring" pathLength="1" cx="60" cy="60" r="52"/></svg>';
    var dial = h("div", { class: "f-dial", html: ring });
    dial.appendChild(h("div", { class: "f-dial-txt" }, [h("small", { text: "Rest" }), h("b", { class: "f-time", text: "" })]));
    body.appendChild(h("div", { class: "f-rest" }, [dial]));
    var minus = h("button", { class: "btn ghost", type: "button", text: "−15s" }), plus = h("button", { class: "btn ghost", type: "button", text: "+15s" });
    var skip = h("button", { class: "btn", type: "button", text: "Skip rest" });
    minus.onclick = function () { $("r-15").click(); focusTick(); };
    plus.onclick = function () { $("r+15").click(); focusTick(); };
    skip.onclick = function () { $("rskip").click(); focusMode = "set"; paintFocus(); };
    body.appendChild(h("div", { class: "f-rest-btns" }, [minus, plus, skip]));
    body.appendChild(h("div", { class: "f-next" }, [
      h("small", { text: "Up next" }),
      h("b", { text: nxt.name }),
      h("span", { text: "Set " + (nxt.i + 1) + " of " + nxt.n + (nw !== "" ? " · " + nw + " kg × " + nr : "") })
    ]));
    focusLastLeft = -1; focusTick();
    skip.focus();
    return;
  }

  // set view
  var cell = focusCell(d, st), df = focusDefaults(d, st), restSec = st.e[4] || 90;
  // Show last time / the suggestion, but only write it to the draft when you act on it.
  function shown(key) { return cell[key] !== "" ? cell[key] : df[key] === "" ? "" : String(df[key]); }
  body.appendChild(h("div", { class: "f-eyebrow", text: "Exercise " + (st.xi + 1) + " of " + d.ex.length + " · " + st.e[3] }));
  body.appendChild(h("h2", { class: "f-title", text: st.name }));
  body.appendChild(h("p", { class: "f-sub", text: "Set " + (st.i + 1) + " of " + st.n + " · target " + st.e[2] + " reps" }));
  body.appendChild(h("div", { class: "f-anim" }, [exerciseDemo(st.name, 2.2)]));
  if (df.prev) body.appendChild(h("div", { class: "f-last", text: "Last time: " + mbFmt(df.prev[0]) + " kg × " + df.prev[1] }));
  if (df.sug && df.sug.up && !cell.done) body.appendChild(h("div", { class: "f-sug", text: "▲ Next: " + df.sug.w + " kg × " + df.sug.r }));

  function stepper(label, key, step, unitLabel) {
    var inp = h("input", { type: "text", inputmode: key === "w" ? "decimal" : "numeric", value: shown(key), placeholder: key === "w" ? "kg" : String(st.e[2]), "aria-label": label });
    inp.disabled = cell.done;
    inp.oninput = function () { cell[key] = inp.value; save(); };
    function bump(dir) {
      var v = num(inp.value); v = (v === null ? 0 : v) + dir * step;
      if (v < 0) v = 0;
      inp.value = String(Math.round(v * 100) / 100); cell[key] = inp.value; save();
      try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { }
    }
    var dn = h("button", { class: "f-step", type: "button", "aria-label": "Less " + label.toLowerCase(), text: "−" });
    var up = h("button", { class: "f-step", type: "button", "aria-label": "More " + label.toLowerCase(), text: "+" });
    dn.disabled = up.disabled = cell.done;
    dn.onclick = function () { bump(-1); }; up.onclick = function () { bump(1); };
    return h("div", { class: "f-field" }, [h("small", { text: unitLabel }), h("div", { class: "f-stepper" }, [dn, inp, up])]);
  }
  body.appendChild(h("div", { class: "f-fields" }, [stepper("Weight", "w", 2.5, "Weight (kg)"), stepper("Reps", "r", 1, "Reps")]));

  var main = h("button", { class: "btn f-main" + (cell.done ? " ghost" : ""), type: "button", text: cell.done ? "Undo this set" : "Done ✓" });
  main.onclick = function () {
    if (cell.done) { cell.done = false; save(); paintFocus(); return; }
    if (cell.w === "") cell.w = shown("w");
    if (cell.r === "") cell.r = shown("r");
    var w = num(cell.w), r = num(cell.r);
    if (w === null || w < 0 || r === null || r <= 0 || Math.floor(r) !== r) { toast("Enter a weight of 0 or more and a whole rep count above 0"); return; }
    cell.done = true; save();
    try { if (navigator.vibrate) navigator.vibrate([30, 40, 30]); } catch (e) { }
    var nx = focusNextOpen(d, steps, focusIdx + 1);
    if (nx < 0) { focusMode = "complete"; if (!REDUCED) confetti(innerWidth / 2, innerHeight * 0.4, 90); }
    else { focusIdx = nx; focusMode = "rest"; startRest(restSec, st.name); }
    paintFocus();
  };
  body.appendChild(main);

  var prevB = h("button", { class: "f-link", type: "button", text: "‹ Previous set" });
  prevB.disabled = focusIdx === 0;
  prevB.onclick = function () { focusIdx = Math.max(0, focusIdx - 1); paintFocus(); };
  var nextB = h("button", { class: "f-link", type: "button", text: "Skip set ›" });
  nextB.disabled = focusIdx >= steps.length - 1;
  nextB.onclick = function () { focusIdx = Math.min(steps.length - 1, focusIdx + 1); paintFocus(); };
  body.appendChild(h("div", { class: "f-nav" }, [prevB, nextB]));
  if (!cell.done) main.focus({ preventScroll: true });
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && focusActive && $("modal").hidden) { e.preventDefault(); closeFocus(); }
});
