// Train tab: exercise cards, sets, finishing a workout.
// Classic script sharing the page's global scope; see README for load order.

/* ---------- TRAIN VIEW ---------- */
function renderTrain(root) {
  var d = DAYS.filter(function (x) { return x.id === dayId; })[0];
  if (!d) { d = DAYS[0]; dayId = d.id; }
  var draft = state.drafts[dk(d.id)] || {};
  var dateKey = dk(d.id);
  var totalSets = d.ex.reduce(function (a, e) { return a + setsFor(d, e); }, 0);
  var pct = 0;

  // Calculate live session completion
  var doneSets = 0, liveVol = 0;
  d.ex.forEach(function (e) {
    var arr = draft[e[0]] || [];
    arr.slice(0, setsFor(d, e)).forEach(function (s) { if (s && s.done) { doneSets++; liveVol += (num(s.w) || 0) * (num(s.r) || 0); } });
  });

  pct = totalSets ? Math.round(doneSets / totalSets * 100) : 0;
  // Hero: the bar loaded for your next set.
  var streak = weekStreak();
  var steps = focusSteps(d), nextIdx = focusNextOpen(d, steps, 0), nextStep = nextIdx < 0 ? null : steps[nextIdx];
  var hero = h("section", { class: "hero", "aria-label": "Next set" });
  // Reload the bar only when the exercise or the weight changes, like re-racking in the gym.
  var heroKey = dayId + "|" + (nextStep ? nextStep.name : "done");
  if (!d.ex.length) {
    hero.appendChild(barbellViz(0, true));
    hero.appendChild(h("p", { class: "hero-line", text: "This day has no exercises yet." }));
  } else if (!nextStep) {
    hero.appendChild(barbellViz(0, true));
    hero.appendChild(h("div", { class: "hero-weight done" }, [h("b", { text: "Done" })]));
    hero.appendChild(h("p", { class: "hero-line", text: "Every set is logged. Save the workout to keep it." }));
    var finHero = h("button", { class: "btn hero-go", type: "button", text: "Finish workout" });
    finHero.onclick = function () { var b = document.querySelector(".session-dock .dock-finish"); if (b) b.click(); };
    hero.appendChild(finHero);
  } else {
    var nc = (draft[nextStep.name] || [])[nextStep.i], nd = focusDefaults(d, nextStep);
    var nw = nc && nc.w !== "" ? num(nc.w) : (nd.w === "" ? null : num(nd.w));
    var nr = nc && nc.r !== "" ? nc.r : nd.r;
    var bb = isBarbell(nextStep.name);
    hero.appendChild(barbellViz(nw || 0, bb));
    heroKey += "|" + nw;
    hero.appendChild(h("div", { class: "hero-weight" }, nw !== null
      ? [h("b", { text: mbFmt(nw) }), h("span", { text: "kg" }), nr !== "" ? h("i", { text: "× " + nr }) : null]
      : [h("b", { class: "tbd", text: "Pick a weight" })]));
    var line = h("p", { class: "hero-line" }, [h("span", { text: nextStep.name + ", set " + (nextStep.i + 1) + " of " + nextStep.n + "." })]);
    if (nd.prev) line.appendChild(h("span", { text: " Last time " + mbFmt(nd.prev[0]) + " × " + nd.prev[1] + "." }));
    hero.appendChild(line);
    var go = h("button", { class: "btn hero-go", type: "button", text: "Start set" });
    go.onclick = openFocus;
    hero.appendChild(go);
  }
  if (heroKey !== lastHeroKey) hero.classList.add("load");
  lastHeroKey = heroKey;
  root.appendChild(hero);

  // Tally: one mark per set, grouped by exercise.
  if (d.ex.length) {
    var tally = h("div", { class: "tally", role: "img", "aria-label": doneSets + " of " + totalSets + " sets done" });
    d.ex.forEach(function (e) {
      var g = h("span", { class: "tg" }), arr = draft[e[0]] || [];
      for (var i = 0; i < setsFor(d, e); i++) {
        var isNow = nextStep && nextStep.name === e[0] && nextStep.i === i;
        var on = arr[i] && arr[i].done, just = on && fx.pop === e[0] + ":" + i;
        g.appendChild(h("i", { class: (on ? "on" : "") + (just ? " just" : "") + (isNow ? " now" : "") }));
      }
      tally.appendChild(g);
    });
    root.appendChild(tally);
    var sum = h("p", { class: "tally-note" }, [h("span", { text: liveVol > 0 ? Math.round(liveVol).toLocaleString() + " kg lifted today." : "Nothing lifted yet today." })]);
    if (streak) sum.appendChild(h("span", { text: " " + streak + (streak === 1 ? " week" : " weeks") + " in a row." }));
    root.appendChild(sum);
  }
  if (backupDue()) root.appendChild(backupNag());
  lastPct = { day: dayId, pct: pct, vol: liveVol };

  // Daily Creatine + Water Quick Strip
  var td = today(), hab = state.habits[td] || {};
  var dailyHabits = h("div", { class: "qbar" });
  habitList().forEach(function (hb) {
    var v = hab[hb.id], done = habitDone(hb, v), wk = habitWeek(hb) + "/7 days";
    function setVal(nv) { hab[hb.id] = nv; state.habits[td] = hab; save(); rerenderKeepScroll(); }
    if (hb.type === "count") {
      var amt = v || 0;
      var plus = h("button", { class: "qpill" + (done ? " on" : ""), type: "button", "aria-label": hb.name + ": " + mbFmt(amt) + " of " + mbFmt(hb.target) + " " + hb.unit + ". Add " + mbFmt(hb.step) }, [
        h("div", {}, [h("b", { text: hb.name + ": " + mbFmt(amt) + " / " + mbFmt(hb.target) + (hb.unit || "") }), h("small", { text: "+" + mbFmt(hb.step) + (hb.unit || "") + " a tap · " + wk })]),
        h("span", { text: done ? "✅" : hb.icon || "•" })
      ]);
      plus.onclick = function () { setVal(Math.round((amt + hb.step) * 100) / 100); };
      var minus = h("button", { class: "hminus", type: "button", "aria-label": "Subtract " + mbFmt(hb.step) + " from " + hb.name, text: "−" });
      minus.disabled = amt <= 0;
      minus.onclick = function () { setVal(Math.max(0, Math.round((amt - hb.step) * 100) / 100)); };
      dailyHabits.appendChild(h("div", { class: "hpill count" }, [plus, minus]));
    } else {
      var b = h("button", { class: "qpill" + (done ? " on" : ""), type: "button", "aria-pressed": String(done) }, [
        h("div", {}, [h("b", { text: hb.name }), h("small", { text: (done ? "Done today ✓" : "Tap when done") + " · " + wk })]),
        h("span", { text: done ? "✅" : hb.icon || "•" })
      ]);
      b.onclick = function () { setVal(!done); };
      dailyHabits.appendChild(h("div", { class: "hpill" }, [b]));
    }
  });

  // Day selector chips
  var nx = nextDay();
  var chips = h("div", { class: "chips-row" }, DAYS.map(function (x) {
    var hasDr = state.drafts[dk(x.id)] && Object.keys(state.drafts[dk(x.id)]).length > 0;
    var b = h("button", { class: "day", "aria-pressed": String(x.id === dayId) }, [
      h("b", { text: x.name }),
      x.id === nx ? h("span", { class: "nx", title: "Up next" }) : null,
      hasDr ? h("span", { class: "dr", title: "Saved draft" }) : null
    ]);
    b.onclick = function () { dayId = x.id; expandedExercise = null; fx.enter = true; render(); };
    return b;
  }));
  var dayInd = h("span", { class: "day-ind", "aria-hidden": "true" });
  chips.appendChild(dayInd);
  root.appendChild(chips);
  placeDayInd(chips, dayInd);

  // Program name + customize / change system
  var editDayBtn = h("button", { class: "btn ghost", type: "button", text: "✎ Edit exercises" });
  editDayBtn.onclick = function () { openDayEditor(d.id); };
  var sysBtn = h("button", { class: "btn ghost", type: "button", text: "⇄ Change system" });
  sysBtn.onclick = function () { tab = "plan"; window.scrollTo(0, 0); fx.enter = true; render(); };
  var dateIn = h("input", { type: "date", value: sessionDates[dateKey] || today() });
  dateIn.onchange = function () {
    sessionDates[dateKey] = dateIn.value || today();
    state.sessionDates = sessionDates; save();
  };
  root.appendChild(h("details", { class: "workout-settings" }, [h("summary", { text: "Workout date and program" }), h("div", { class: "workout-tools" }, [h("label", {}, ["Session date", dateIn]), editDayBtn, sysBtn])]));
  root.appendChild(h("h2", { class: "sec-title", text: "Exercises" }));
  var nextExercise = null, openNow = null;
  var firstUnfinished = d.ex.findIndex(function (exercise) { var n = setsFor(d, exercise); return (draft[exercise[0]] || []).slice(0, n).filter(function (s) { return s && s.done; }).length < n; });

  if (!d.ex.length) {
    var addFirst = h("button", { class: "btn", type: "button", text: "＋ Add exercises to this day" });
    addFirst.onclick = function () { openDayEditor(d.id); };
    root.appendChild(h("div", { class: "card", style: "display:flex;flex-direction:column;gap:10px" }, [
      h("div", { class: "empty", text: "This day has no exercises yet. Pick them from the library." }), addFirst
    ]));
  }

  // Render Each Exercise Card with Quick "Last Weight" Memory
  d.ex.forEach(function (e, exerciseIndex) {
    var name = e[0], setsCount = setsFor(d, e), repsTarget = e[2], muscle = e[3], restSec = e[4] || 90;
    var hist = getExerciseHistory(name);
    var lastSets = hist.sets;
    var exDraft = (draft[name] = draft[name] || []);

    var completedCount = exDraft.slice(0, setsCount).filter(function (s) { return s && s.done; }).length;
    var cardId = "exercise-" + exerciseIndex;
    if (!nextExercise && completedCount < setsCount) nextExercise = { id: cardId, name: name, set: completedCount + 1 };
    var isExpanded = expandedExercise === null ? exerciseIndex === firstUnfinished : expandedExercise === name;
    var card = h("section", { class: "card ex" + (isExpanded ? " open" : "") + (isExpanded && lastOpenEx !== name ? " opening" : ""), id: cardId, "aria-label": name, tabindex: "-1" });
    if (isExpanded) openNow = name;
    var exerciseBody = h("div", { class: "exercise-body", id: cardId + "-body" });
    exerciseBody.hidden = !isExpanded;
    var expandBtn = h("button", { class: "exercise-toggle", type: "button", "aria-expanded": String(isExpanded), "aria-controls": cardId + "-body", "aria-label": (isExpanded ? "Collapse " : "Expand ") + name, text: "⌄" });
    expandBtn.onclick = function () {
      expandedExercise = isExpanded ? "" : name;
      var scroll = window.scrollY; render(); window.scrollTo(0, scroll);
      $(cardId).querySelector(".exercise-toggle").focus({ preventScroll: true });
    };
    var icoBox = h("button", { class: "ico", type: "button", "aria-label": "Form and plate calculator for " + name, html: exIcon(muscle) });
    icoBox.onclick = function () {
      var topW = hist.pr ? hist.pr[0] : 60;
      openPlateModal(name, topW, parseInt(repsTarget, 10) || 8);
    };

    // Top metadata + Fill all button
    var fillAllBtn = h("button", { class: "set-base-btn", text: lastSets.length ? "↺ Fill last" : "＋ Set last weight" });
    fillAllBtn.onclick = function () {
      if (!lastSets.length) { openBaselineModal(name); return; }
      for (var i = 0; i < setsCount; i++) {
        var ref = lastSets[i] || lastSets[lastSets.length - 1];
        exDraft[i] = exDraft[i] || { w: "", r: "", done: false };
        if (exDraft[i].done) continue;
        exDraft[i].w = String(ref[0]);
        exDraft[i].r = String(ref[1]);
      }
      state.drafts[dk(d.id)] = draft; save(); render();
      toast("Filled last weights for " + name);
    };

    // One plain line under the name: target, then last time if there is one.
    var desc = h("p", { class: "ex-desc" }, [h("span", { text: setsCount + " sets of " + repsTarget + "." })]);
    if (lastSets.length) desc.appendChild(h("span", { text: " Last time " + mbFmt(lastSets[0][0]) + " × " + lastSets[0][1] + "." }));
    if (hist.pr && hist.date !== "Baseline") desc.appendChild(h("span", { class: "best", text: " Best " + mbFmt(hist.pr[0]) + " × " + hist.pr[1] + "." }));
    var countEl = h("span", { class: "ex-count" + (completedCount === setsCount ? " complete" : ""), "aria-label": completedCount + " of " + setsCount + " sets complete", text: completedCount + "/" + setsCount });

    var head = h("div", { class: "ex-head" }, [
      icoBox,
      h("div", { class: "ex-meta" }, [
        h("div", { class: "ex-name", text: name, onclick: icoBox.onclick }),
        desc
      ]), countEl, expandBtn
    ]);
    card.appendChild(head);
    var warmBtn = h("button", { class: "set-base-btn", type: "button", text: "🔥 Warm-up" });
    warmBtn.onclick = function () {
      var first = exDraft.filter(function (x) { return x && num(x.w) > 0; })[0];
      var sg = suggestNext(name, e[1], repsTarget);
      var work = first ? num(first.w) : sg ? sg.w : (lastSets.length ? Math.max.apply(null, lastSets.map(function (p) { return p[0]; })) : 0);
      openWarmupModal(name, work);
    };
    exerciseBody.appendChild(h("div", { class: "exercise-actions" }, [warmBtn, fillAllBtn]));

    /* --- QUICK LAST LIFTED MEMORY STRIP --- */
    var lastBox = h("div", { class: "last-box" });
    if (lastSets.length) {
      var editBaseBtn = h("button", { class: "set-base-btn", style: "background:transparent;padding:0", text: "Edit" });
      editBaseBtn.onclick = function () { openBaselineModal(name); };
      lastBox.appendChild(h("div", { class: "last-hdr" }, [
        h("div", { class: "last-title" }, [hist.date === "Baseline" ? "Your reference" : "Last time, " + mbDay(hist.date), h("small", { text: "Tap a set to copy it" })]),
        editBaseBtn
      ]));
      var chipWrap = h("div", { class: "last-chips" });
      lastSets.forEach(function (pair, idx) {
        var isTop = hist.pr && pair[0] === hist.pr[0] && pair[1] === hist.pr[1];
        var ch = h("button", { class: "lchip" + (isTop ? " top" : ""), type: "button" }, [
          h("span", { text: "S" + (idx + 1) }),
          pair[0] + "kg × " + pair[1]
        ]);
        ch.onclick = function () {
          var targetIdx = Math.min(idx, setsCount - 1);
          exDraft[targetIdx] = exDraft[targetIdx] || { w: "", r: "", done: false };
          if (exDraft[targetIdx].done) { toast("Undo this set before replacing its values"); return; }
          exDraft[targetIdx].w = String(pair[0]);
          exDraft[targetIdx].r = String(pair[1]);
          state.drafts[dk(d.id)] = draft; save(); render();
          toast("Copied " + pair[0] + "kg × " + pair[1] + " to Set " + (targetIdx + 1));
        };
        chipWrap.appendChild(ch);
      });
      lastBox.appendChild(chipWrap);
    } else {
      var setNow = h("button", { class: "set-base-btn", text: "＋ Set Last Weight You Lifted" });
      setNow.onclick = function () { openBaselineModal(name); };
      lastBox.appendChild(h("div", { class: "last-hdr" }, [
        h("div", { class: "last-title", text: "No previous weight recorded yet" }),
        setNow
      ]));
    }
    var sug = suggestNext(name, e[1], repsTarget);
    if (sug) {
      var useBtn = null;
      if (sug.up) {
        useBtn = h("button", { class: "btn sm", type: "button", text: "Use " + sug.w + " kg" });
        useBtn.onclick = function () {
          for (var i = 0; i < setsCount; i++) {
            exDraft[i] = exDraft[i] || { w: "", r: "", done: false };
            if (exDraft[i].done) continue;
            exDraft[i].w = String(sug.w);
            exDraft[i].r = String(sug.r);
          }
          state.drafts[dk(d.id)] = draft; save(); render();
          toast(name + ": " + sug.w + " kg × " + sug.r + " filled");
        };
      }
      lastBox.appendChild(h("div", { class: "suggest" + (sug.up ? " up" : "") }, [
        h("div", {}, [h("b", { text: sug.up ? "▲ Next: " + sug.w + " kg × " + sug.r : "Stay at " + sug.w + " kg" }), h("small", { text: sug.why })]),
        useBtn
      ]));
    }
    var prevNote = lastExerciseNote(name);
    if (prevNote) lastBox.appendChild(h("div", { class: "last-note", text: "📝 " + prevNote.date + ": " + prevNote.text }));
    exerciseBody.appendChild(lastBox);

    /* --- SETS TABLE --- */
    var grid = h("div", { class: "sets" }, [
      h("div", { class: "cols" }, [
        h("span", { text: "SET" }),
        h("span", { text: "KG" }),
        h("span", { text: "REPS" }),
        h("span", { text: "" })
      ])
    ]);

    for (var s = 0; s < setsCount; s++) {
      (function (s) {
        var curSet = exDraft[s] || (exDraft[s] = { w: "", r: "", done: false });
        var prevPair = lastSets[s] || lastSets[lastSets.length - 1] || null;

        var row = h("div", { class: "set" + (curSet.done ? " done" : "") + (fx.pop === name + ":" + s ? " flash" : "") });
        var wIn = h("input", { type: "text", inputmode: "decimal", "aria-label": name + ", set " + (s + 1) + ", weight in kilograms", value: curSet.w, placeholder: prevPair ? String(prevPair[0]) : "kg" });
        var rIn = h("input", { type: "text", inputmode: "numeric", "aria-label": name + ", set " + (s + 1) + ", reps", value: curSet.r, placeholder: prevPair ? String(prevPair[1]) : repsTarget });
        var infoCell = h("div", { class: "sinfo" });

        function updateDelta() {
          infoCell.textContent = "";
          var cw = num(wIn.value), cr = num(rIn.value);
          if (prevPair) {
            var pBtn = h("button", { class: "prev-btn", type: "button", title: "Tap to fill " + prevPair[0] + "kg × " + prevPair[1], text: "prev " + prevPair[0] + "×" + prevPair[1] });
            pBtn.onclick = function () {
              if (curSet.done) { toast("Undo this set before replacing its values"); return; }
              wIn.value = prevPair[0]; rIn.value = prevPair[1];
              curSet.w = String(prevPair[0]); curSet.r = String(prevPair[1]);
              state.drafts[dk(d.id)] = draft; save(); updateDelta();
            };
            infoCell.appendChild(pBtn);
          }
          if (cw !== null && cr !== null) {
            if (prevPair) {
              var dw = Math.round((cw - prevPair[0]) * 10) / 10;
              var dr = cr - prevPair[1];
              var txt = dw > 0 ? "+" + dw + "kg" : (dw === 0 && dr > 0 ? "+" + dr + " rep" : (dw === 0 && dr === 0 ? "= SAME" : dw + "kg"));
              var cls = (dw > 0 || (dw === 0 && dr > 0)) ? "up" : "same";
              infoCell.appendChild(h("span", { class: "delta " + cls, text: txt }));
            } else {
              var rm = Math.round(cw * (1 + cr / 30));
              var rmSp = h("span", { class: "delta rm", text: "1RM " + rm });
              rmSp.onclick = function () { openPlateModal(name, cw, cr); };
              infoCell.appendChild(rmSp);
            }
          }
        }
        updateDelta();

        wIn.oninput = function () { curSet.w = wIn.value; state.drafts[dk(d.id)] = draft; save(); updateDelta(); };
        rIn.oninput = function () { curSet.r = rIn.value; state.drafts[dk(d.id)] = draft; save(); updateDelta(); };

        var chk = h("button", { class: "chk" + (fx.pop === name + ":" + s ? " pop" : ""), type: "button", "aria-pressed": String(!!curSet.done), "aria-label": (curSet.done ? "Undo " : "Complete ") + name + ", set " + (s + 1) });
        chk.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
        function refreshSet() {
          var scroll = window.scrollY;
          render(); window.scrollTo(0, scroll);
          $(cardId).querySelectorAll(".chk")[s].focus({ preventScroll: true });
        }
        chk.onclick = function () {
          if (curSet.done) {
            curSet.done = false; state.drafts[dk(d.id)] = draft; save(); refreshSet(); return;
          }
          if (!wIn.value.trim() && prevPair) wIn.value = prevPair[0];
          if (!rIn.value.trim() && prevPair) rIn.value = prevPair[1];
          var weight = num(wIn.value), reps = num(rIn.value);
          if (weight === null || weight < 0 || reps === null || reps <= 0 || Math.floor(reps) !== reps) {
            toast("Enter a weight of 0 or more and a whole rep count above 0");
            (weight === null || weight < 0 ? wIn : rIn).focus(); return;
          }
          curSet.w = wIn.value; curSet.r = rIn.value; curSet.done = true;
          state.drafts[dk(d.id)] = draft; save();
          fx.pop = name + ":" + s;
          startRest(restSec, name);
          refreshSet();
        };

        row.appendChild(h("span", { class: "n", text: String(s + 1) }));
        row.appendChild(h("label", { class: "fld" }, [wIn, h("small", { text: "kg" })]));
        row.appendChild(h("label", { class: "fld" }, [rIn, h("small", { text: "reps" })]));
        row.appendChild(chk);
        grid.appendChild(row);
      })(s);
    }

    var allDone = exDraft.length >= setsCount && exDraft.slice(0, setsCount).every(function (x) { return x && x.done; });
    if (allDone) card.classList.add("done");
    if (allDone && fx.pop && fx.pop.indexOf(name + ":") === 0) {
      card.classList.add("celebrate");
      var tg = root.querySelectorAll(".tally .tg")[exerciseIndex]; if (tg) tg.classList.add("full");
    }
    exerciseBody.appendChild(grid);

    function adjustSets(delta) {
      var adj = state.setAdj[dk(d.id)] = state.setAdj[dk(d.id)] || {};
      var next = setsCount + delta;
      if (next < 1) { toast("Keep at least one set"); return; }
      if (delta < 0 && exDraft[next] && exDraft[next].done) { toast("Undo the last set before removing it"); return; }
      adj[name] = next - e[1];
      if (!adj[name]) delete adj[name];
      if (delta < 0) exDraft.length = Math.min(exDraft.length, next);
      state.drafts[dk(d.id)] = draft; save();
      var scroll = window.scrollY; render(); window.scrollTo(0, scroll);
      toast(name + ": " + next + " set" + (next === 1 ? "" : "s") + " today");
    }
    var addSetBtn = h("button", { class: "btn ghost", type: "button", text: "＋ Add set" });
    addSetBtn.onclick = function () { adjustSets(1); };
    var dropSetBtn = h("button", { class: "btn ghost", type: "button", text: "− Remove set" });
    dropSetBtn.onclick = function () { adjustSets(-1); };
    dropSetBtn.disabled = setsCount <= 1;
    exerciseBody.appendChild(h("div", { class: "set-adjust" }, [addSetBtn, dropSetBtn]));

    var notes = state.draftNotes[dk(d.id)] = state.draftNotes[dk(d.id)] || {};
    var noteIn = h("textarea", { "aria-label": "Note for " + name, placeholder: "Grip, seat setting, how it felt…" });
    noteIn.value = notes[name] || "";
    noteIn.oninput = function () {
      if (noteIn.value.trim()) notes[name] = noteIn.value; else delete notes[name];
      save();
    };
    var noteBox = h("details", { class: "ex-note" }, [h("summary", { text: notes[name] ? "📝 Note (saved)" : "📝 Add a note" }), noteIn]);
    if (notes[name]) noteBox.open = true;
    exerciseBody.appendChild(noteBox);
    card.appendChild(exerciseBody);
    root.appendChild(card);
  });

  // Save Session Button
  var saveBtn = h("button", { class: "btn dock-finish", text: "Finish", type: "button" });
  saveBtn.disabled = doneSets === 0;
  saveBtn.onclick = function () {
    var sess = { id: uid(), date: dateIn.value || today(), day: d.id, dayName: d.name, prog: state.programId, sets: {} }, any = false;
    d.ex.forEach(function (e) {
      var name = e[0], arr = draft[name] || [];
      arr.slice(0, setsFor(d, e)).forEach(function (s) {
        var w = num(s && s.w), r = num(s && s.r);
        if (s && s.done && w !== null && w >= 0 && r !== null && r > 0 && Math.floor(r) === r) { (sess.sets[name] = sess.sets[name] || []).push([w, r]); any = true; }
      });
    });
    if (!any) { toast("Log at least one set first"); return; }
    var dn = state.draftNotes[dk(d.id)] || {};
    Object.keys(dn).forEach(function (n) { if (n !== "_session" && sess.sets[n] && dn[n].trim()) (sess.notes = sess.notes || {})[n] = dn[n].trim(); });
    var prs = [];
    d.ex.forEach(function (e) {
      var arr = sess.sets[e[0]]; if (!arr) return;
      var prev = getExerciseHistory(e[0]), best = 0;
      arr.forEach(function (pr) { if (pr[0] > best) best = pr[0]; });
      if (prev.pr && best > prev.pr[0]) prs.push(e[0] + " " + best + "kg");
    });
    var box = $("mbox"); box.textContent = "";
    var savedSets = 0, savedVolume = 0;
    Object.keys(sess.sets).forEach(function (name) { sess.sets[name].forEach(function (p) { savedSets++; savedVolume += p[0] * p[1]; }); });
    box.appendChild(h("div", { class: "eyebrow", text: "WORKOUT SUMMARY" }));
    box.appendChild(h("h2", { text: d.name + " · " + sess.date }));
    box.appendChild(h("div", { class: "summary-grid" }, [
      h("div", {}, [h("b", { text: String(savedSets) }), h("small", { text: "sets" })]),
      h("div", {}, [h("b", { text: String(Object.keys(sess.sets).length) }), h("small", { text: "exercises" })]),
      h("div", {}, [h("b", { text: Math.round(savedVolume).toLocaleString() }), h("small", { text: "kg volume" })])
    ]));
    box.appendChild(h("p", { text: savedSets < totalSets ? "You've completed " + savedSets + " of " + totalSets + " sets. Only checked sets will be saved." : "Every set complete. Ready to save your workout?" }));
    var sessNote = h("textarea", { class: "sess-note", "aria-label": "Workout notes", placeholder: "Workout notes (optional): energy, sleep, anything to remember" });
    sessNote.value = dn._session || "";
    sessNote.oninput = function () { var dd = state.draftNotes[dk(d.id)] = state.draftNotes[dk(d.id)] || {}; dd._session = sessNote.value; save(); };
    box.appendChild(sessNote);
    var keepGoing = h("button", { class: "btn ghost", text: "Keep training", type: "button" });
    var confirmSave = h("button", { class: "btn", text: "Save workout", type: "button" });
    keepGoing.onclick = closeModal;
    modalOnClose = function () { saveBtn.focus({ preventScroll: true }); };
    confirmSave.onclick = function () {
      confirmSave.disabled = true;
      if (sessNote.value.trim()) sess.note = sessNote.value.trim();
      state.sessions.push(sess);
      delete state.drafts[dk(d.id)];
      delete state.setAdj[dk(d.id)];
      delete state.draftNotes[dk(d.id)];
      delete sessionDates[dateKey]; state.sessionDates = sessionDates;
      if (rest.iv) clearInterval(rest.iv); rest.iv = null; endRestUI();
      closeModal();
      dayId = nextDay();
      save();
      fx.enter = true;
      render();
      toast(prs.length ? "New PR 🏆 " + prs.slice(0, 2).join(" · ") : "Session saved! Great work 💪", 2800);
      if (prs.length) requestAnimationFrame(function () { confetti(innerWidth / 2, innerHeight * 0.55, 110); });
      window.scrollTo(0, 0);
    };
    box.appendChild(h("div", { class: "grid2" }, [keepGoing, confirmSave]));
    $("modal").hidden = false;
    keepGoing.focus();
  };
  lastOpenEx = openNow;

  // Workout bar: what's next (tap to jump there), progress or rest countdown, Finish and Focus.
  var idleSub = doneSets + " / " + totalSets + " sets done";
  var subEl = h("small", { class: "dock-sub", text: idleSub });
  subEl.setAttribute("data-idle", idleSub);
  var info;
  if (nextExercise) {
    // name under the set number; the rest countdown takes its place while resting
    subEl.textContent = nextExercise.name; subEl.setAttribute("data-idle", nextExercise.name);
    info = h("button", { class: "dock-info continue-btn", type: "button", "aria-label": "Go to " + nextExercise.name }, [h("b", { text: "Set " + nextExercise.set + " of " + setsFor(d, d.ex.filter(function (e) { return e[0] === nextExercise.name; })[0]) }), subEl]);
    info.onclick = function () {
      expandedExercise = nextExercise.name;
      render();
      var target = $(nextExercise.id);
      target.focus({ preventScroll: true }); target.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    };
  } else info = h("div", { class: "dock-info" }, [h("b", { text: d.ex.length ? "All sets done 💪" : d.name }), subEl]);
  var skipR = h("button", { class: "dock-rest", type: "button", text: "Skip" });
  skipR.onclick = function () { $("rskip").click(); dockRest(); };
  var actions = h("div", { class: "dock-actions" }, [skipR, saveBtn]);
  if (nextExercise) {
    var focusBtn = h("button", { class: "focus-btn", type: "button", "aria-label": "Start focus mode" }, [h("span", { "aria-hidden": "true", text: "◎ " }), "Focus"]);
    focusBtn.onclick = openFocus;
    actions.appendChild(focusBtn);
  }
  var dock = h("div", { class: "session-dock", role: "region", "aria-label": "Workout actions" }, [info, actions]);
  root.appendChild(dock);
  dockRest();
  root.appendChild(h("h2", { text: "Daily habits" }));
  root.appendChild(dailyHabits);

  // Recent Sessions History
  root.appendChild(h("h2", { text: "Recent workouts" }));
  var list = h("div", { class: "card list" }), recent = state.sessions.slice(-6).reverse();
  if (!recent.length) list.appendChild(h("div", { class: "empty", text: "No completed sessions yet." }));
  recent.forEach(function (s) {
    var del = h("button", { class: "btn ghost sm", text: "Remove" });
    del.onclick = function (ev) { ev.stopPropagation(); removeWithUndo("sessions", s, sessionName(s) + " · " + s.date); };
    var it = h("div", { class: "item tap", role: "button", tabindex: "0", "aria-label": "Show " + sessionName(s) + " on " + s.date }, [
      h("div", {}, [h("div", { style: "font-weight:700", text: sessionName(s) }), h("div", { class: "d", text: s.date })]),
      h("div", { class: "row-r" }, [h("div", { class: "v", text: Math.round(sessionVolume(s)).toLocaleString() + " kg" }), del])
    ]);
    it.onclick = function () { openHistoryModal(s.id); };
    it.onkeydown = function (ev) { if ((ev.key === "Enter" || ev.key === " ") && ev.target === it) { ev.preventDefault(); openHistoryModal(s.id); } };
    list.appendChild(it);
  });
  if (state.sessions.length) {
    var allBtn = h("button", { class: "btn ghost", type: "button", text: "View all " + state.sessions.length + " workout" + (state.sessions.length === 1 ? "" : "s") });
    allBtn.onclick = function () { openHistoryModal(null); };
    list.appendChild(allBtn);
  }
  root.appendChild(list);
}

// Show the rest countdown in the workout bar (the floating timer is hidden on the Train tab).
function dockRest() {
  var dock = document.querySelector(".session-dock"); if (!dock) return;
  var on = !!rest.iv, sub = dock.querySelector(".dock-sub");
  dock.classList.toggle("resting", on);
  if (!sub) return;
  if (on) {
    var left = Math.max(0, Math.ceil((rest.end - Date.now()) / 1000));
    sub.textContent = "Rest " + Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0") + " left";
  } else sub.textContent = sub.getAttribute("data-idle");
}

var lastHeroKey = null, lastOpenEx = null, lastDayIndX = null;
// Slide the underline from the previous day to the selected one (offsets ignore transforms).
function placeDayInd(row, ind) {
  var b = row.querySelector('.day[aria-pressed="true"]'); if (!b || !b.offsetWidth) return;
  var x = b.offsetLeft, w = b.offsetWidth;
  ind.style.width = w + "px";
  if (lastDayIndX !== null && lastDayIndX !== x && !REDUCED) {
    ind.style.transform = "translateX(" + lastDayIndX + "px)";
    requestAnimationFrame(function () { requestAnimationFrame(function () { ind.classList.add("glide"); ind.style.transform = "translateX(" + x + "px)"; }); });
  } else ind.style.transform = "translateX(" + x + "px)";
  lastDayIndX = x;
}
