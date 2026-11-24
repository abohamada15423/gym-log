// App state, DOM helper h(), dates, numbers, toast and undo.
// Classic script sharing the page's global scope; see README for load order.

// Daily targets: your own goals, with calories and protein from your coach's meal plan when there is one.
function goals() { return Object.assign({}, GOAL_DEFAULTS, state.goals || {}, typeof coachTargets === "function" ? coachTargets() : {}); }

// A new device starts empty: no check-in, so nobody's first weigh-in is someone else's.
function fresh() {
  return { v: 2, sessions: [], body: [], food: [], drafts: {}, baselines: {}, habits: {}, theme: null, programId: "split4", custom: null, customLib: [], myFoods: [], setAdj: {}, draftNotes: {}, notify: false, keepAwake: true, goals: {} };
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
// Id for a workout, food or check-in: a uuid, so it is the same row on the server and every device.
function rid() {
  var c = window.crypto;
  if (c && c.randomUUID) return c.randomUUID();
  var b = new Uint8Array(16);
  if (c && c.getRandomValues) c.getRandomValues(b); else for (var i = 0; i < 16; i++) b[i] = Math.random() * 256 | 0;
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  var x = Array.prototype.map.call(b, function (n) { return (n + 256).toString(16).slice(1); }).join("");
  return x.slice(0, 8) + "-" + x.slice(8, 12) + "-" + x.slice(12, 16) + "-" + x.slice(16, 20) + "-" + x.slice(20);
}
// Two letters for a round avatar: first and last name, or the start of an email address.
function initials(s) {
  s = String(s || "").trim(); if (!s) return "";
  if (s.indexOf("@") > 0 && s.indexOf(" ") < 0) s = s.split("@")[0];
  var parts = s.split(/[\s._-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0].charAt(0) + parts[parts.length - 1].charAt(0) : s.slice(0, 2)).toUpperCase();
}
function toast(t, ms, action) {
  var e = $("toast"); e.hidden = false; e.textContent = t;
  if (action) {
    var b = h("button", { class: "toast-act", type: "button", text: action.label });
    b.onclick = function () { clearTimeout(toast._t); e.hidden = true; action.run(); };
    e.appendChild(b);
  }
  clearTimeout(toast._t); toast._t = setTimeout(function () { e.hidden = true; }, ms || 1800);
}
