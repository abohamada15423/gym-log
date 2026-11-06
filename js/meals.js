// Meals tab: calorie and protein rings, quick add, custom foods.
// Classic script sharing the page's global scope; see README for load order.

/* ---------- MEALS VIEW ---------- */
function ring(label, val, target, unit, cls) {
  var C = 2 * Math.PI * 46, over = val > target, frac = Math.min(1, val / target);
  var box = h("div", { class: "ringbox" }), wrap = h("div", { class: "wrap" });
  wrap.innerHTML = '<svg viewBox="0 0 120 120"><circle class="rtrack" cx="60" cy="60" r="46"/><circle class="rprog' + (cls ? " " + cls : "") + (over ? " over" : "") + '" cx="60" cy="60" r="46" style="stroke-dasharray:' + C + ';stroke-dashoffset:' + (C * (1 - frac)) + '"/></svg>';
  wrap.appendChild(h("div", { class: "rc" }, [h("b", { text: String(Math.round(val)) }), h("small", { text: unit })]));
  var left = Math.round(target - val);
  box.appendChild(wrap);
  box.appendChild(h("div", { class: "rcap" }, [h("b", { text: label }), h("br"), over ? (-left) + " over " + target : left + " left of " + target]));
  return box;
}

function renderMeals(root) {
  var dateIn = h("input", { type: "date", value: foodDate });
  dateIn.onchange = function () { foodDate = dateIn.value || today(); render(); };
  var rows = state.food.filter(function (f) { return f.date === foodDate; }), kc = 0, pr = 0, cb = 0, ft = 0;
  rows.forEach(function (f) { kc += f.kcal; pr += f.p; cb += f.c || 0; ft += f.f || 0; });
  function addFood(m) {
    var e = { id: uid(), date: foodDate, name: m.name, kcal: m.kcal, p: m.p };
    if (m.c != null) e.c = m.c; if (m.f != null) e.f = m.f;
    state.food.push(e); save(); toast(m.name + " added"); render();
  }
  function macroText(m) {
    var t = m.kcal + " kcal · " + mbFmt(m.p) + "g P";
    if (m.c != null) t += " · " + mbFmt(m.c) + "g C";
    if (m.f != null) t += " · " + mbFmt(m.f) + "g F";
    return t;
  }

  root.appendChild(h("label", {}, ["Date", dateIn]));
  root.appendChild(h("div", { class: "rings" }, [
    ring("Calories", kc, goals().kcal, "kcal", ""),
    ring("Protein", pr, goals().protein, "g", "gold")
  ]));
  if (cb || ft) root.appendChild(h("div", { class: "macros" }, [
    h("div", {}, [h("span", { text: "Carbs " }), mbFmt(Math.round(cb)) + " g"]),
    h("div", {}, [h("span", { text: "Fat " }), mbFmt(Math.round(ft)) + " g"])
  ]));

  if (state.myFoods.length) {
    root.appendChild(h("h2", { text: "My Foods" }));
    var mine = h("div", { class: "fchips" });
    state.myFoods.forEach(function (m) {
      var b = h("button", { class: "btn ghost", type: "button", text: "+ " + m.name + " (" + mbFmt(m.p) + "g P)", title: macroText(m) });
      b.onclick = function () { addFood(m); };
      var x = h("button", { class: "btn ghost x", type: "button", "aria-label": "Delete " + m.name + " from My Foods", text: "✕" });
      x.onclick = function () { removeWithUndo("myFoods", m, m.name); };
      mine.appendChild(h("span", { class: "myfood" }, [b, x]));
    });
    root.appendChild(mine);
  }

  root.appendChild(h("h2", { text: "Quick Add Meals & High-Protein Staples" }));
  var chips = h("div", { class: "fchips" });
  MEALS.concat(QUICK_FOODS).forEach(function (m) {
    var b = h("button", { class: "btn ghost", text: "+ " + m.name + " (" + m.p + "g P)" });
    b.onclick = function () { addFood(m); };
    chips.appendChild(b);
  });
  root.appendChild(chips);

  root.appendChild(h("h2", { text: "Add Custom Food" }));
  var f = {
    name: h("input", { type: "text", placeholder: "Food name", style: "text-align:start" }),
    kcal: h("input", { type: "text", inputmode: "numeric", placeholder: "auto" }),
    pro: h("input", { type: "text", inputmode: "decimal", placeholder: "g" }),
    carb: h("input", { type: "text", inputmode: "decimal", placeholder: "g" }),
    fat: h("input", { type: "text", inputmode: "decimal", placeholder: "g" }),
    keep: h("input", { type: "checkbox" })
  };
  var add = h("button", { class: "btn", text: "Add Food" });
  add.onclick = function () {
    var k = num(f.kcal.value), p = num(f.pro.value), c = num(f.carb.value), ff = num(f.fat.value);
    if ([p, c, ff].some(function (v) { return v !== null && v < 0; })) { toast("Macros can't be negative"); return; }
    if ((k === null || k <= 0) && (p || c || ff)) k = 4 * (p || 0) + 4 * (c || 0) + 9 * (ff || 0);
    if (k === null || k <= 0) { toast("Enter calories or macros"); return; }
    var m = { name: f.name.value.trim() || "Food", kcal: Math.round(k), p: p || 0 };
    if (c !== null) m.c = c; if (ff !== null) m.f = ff;
    if (f.keep.checked) {
      if (!f.name.value.trim()) { toast("Name the food to save it"); f.name.focus(); return; }
      state.myFoods = state.myFoods.filter(function (x) { return x.name.toLowerCase() !== m.name.toLowerCase(); });
      state.myFoods.push(Object.assign({}, m));
    }
    addFood(m);
  };
  root.appendChild(h("div", { class: "card", style: "display:flex;flex-direction:column;gap:10px" }, [
    h("label", {}, ["Food", f.name]),
    h("div", { class: "grid2" }, [h("label", {}, ["Calories", f.kcal]), h("label", {}, ["Protein (g)", f.pro])]),
    h("div", { class: "grid2" }, [h("label", {}, ["Carbs (g)", f.carb]), h("label", {}, ["Fat (g)", f.fat])]),
    h("label", { class: "check" }, [f.keep, "Save to My Foods for one-tap adding"]),
    h("div", { class: "note", text: "Leave calories empty to work them out from the macros." }),
    add
  ]));

  var list = h("div", { class: "card list" });
  if (!rows.length) list.appendChild(h("div", { class: "empty", text: "Nothing logged today yet." }));
  rows.forEach(function (r) {
    var del = h("button", { class: "btn ghost sm", text: "Remove" });
    del.onclick = function () { removeWithUndo("food", r, r.name); };
    var mac = mbFmt(r.p) + "g protein" + (r.c != null ? " · " + mbFmt(r.c) + "g carbs" : "") + (r.f != null ? " · " + mbFmt(r.f) + "g fat" : "");
    list.appendChild(h("div", { class: "item" }, [
      h("div", {}, [h("div", { text: r.name }), h("div", { class: "d", text: mac })]),
      h("div", { class: "row-r" }, [h("div", { class: "v", style: "white-space:nowrap", text: r.kcal + " kcal" }), del])
    ]));
  });
  root.appendChild(list);
}
