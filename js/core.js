// App state, DOM helper h(), dates, numbers, toast and undo.
// Classic script sharing the page's global scope; see README for load order.

function goals() { return Object.assign({}, GOAL_DEFAULTS, state.goals || {}); }

function fresh() {
  return { v: 2, sessions: [], body: [Object.assign({}, BASE)], food: [], drafts: {}, baselines: {}, habits: {}, theme: null, programId: "split4", custom: null, customLib: [], myFoods: [], setAdj: {}, draftNotes: {}, notify: false, keepAwake: true, goals: {} };
}

var state = fresh(), tab = "train", dayId = "push", foodDate = today();
var animLoops = [];
var sessionDates = {};
var expandedExercise = null;

function $(id) { return document.getElementById(id); }
function h(tag, attrs, kids) {
  var e = document.createElement(tag);
  for (var k in (attrs || {})) {
    if (k === "text") e.textContent = attrs[k];
    else if (k === "class") e.className = attrs[k];
    else if (k === "html") e.innerHTML = attrs[k];
    else if (typeof attrs[k] === "function") e[k] = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  (kids || []).forEach(function (c) {
    if (c != null && c !== false) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return e;
}
function today() { var d = new Date(); return fmt(d); }
function fmt(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function num(v) { var n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : null; }
function uid() { return String(Date.now()) + Math.random().toString(36).slice(2, 6); }
function toast(t, ms, action) {
  var e = $("toast"); e.hidden = false; e.textContent = t;
  if (action) {
    var b = h("button", { class: "toast-act", type: "button", text: action.label });
    b.onclick = function () { clearTimeout(toast._t); e.hidden = true; action.run(); };
    e.appendChild(b);
  }
  clearTimeout(toast._t); toast._t = setTimeout(function () { e.hidden = true; }, ms || 1800);
}
