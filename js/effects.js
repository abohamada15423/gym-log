// SVG line charts, count-up numbers and confetti.
// Classic script sharing the page's global scope; see README for load order.

/* ---------- CHARTS ---------- */
// points: [{ d: "YYYY-MM-DD", y: number }] sorted by date. Returns an SVG line chart scaled by real time.
function lineChart(points, opts) {
  opts = opts || {};
  points = points.filter(function (p) { return ymdParse(p.d) && isFinite(p.y); });
  if (!points.length) return h("div", { class: "empty", text: "No data to chart yet." });
  var W = 320, H = 150, L = 34, R = 10, T = 12, B = 22;
  var ys = points.map(function (p) { return p.y; });
  if (opts.goal != null) ys.push(opts.goal);
  var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
  var pad = Math.max((hi - lo) * 0.15, opts.minSpan || 1);
  lo -= pad; hi += pad;
  var t0 = ymdParse(points[0].d).getTime(), t1 = ymdParse(points[points.length - 1].d).getTime();
  var X = function (d) { return t1 === t0 ? L + (W - L - R) / 2 : L + (ymdParse(d).getTime() - t0) / (t1 - t0) * (W - L - R); };
  var Y = function (v) { return T + (hi - v) / (hi - lo) * (H - T - B); };
  var f = function (v) { return v.toFixed(1); };
  var out = [];
  [0, 0.5, 1].forEach(function (k) {
    var v = lo + (hi - lo) * k, y = Y(v);
    out.push('<line class="c-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + f(y) + '" y2="' + f(y) + '"/>');
    out.push('<text x="' + (L - 6) + '" y="' + f(y + 3) + '" text-anchor="end">' + mbFmt(Math.round(v * 10) / 10) + '</text>');
  });
  if (opts.goal != null) {
    var gy = Y(opts.goal);
    out.push('<line class="c-goal" x1="' + L + '" x2="' + (W - R) + '" y1="' + f(gy) + '" y2="' + f(gy) + '"/>');
    out.push('<text class="c-goal-t" x="' + (W - R) + '" y="' + f(gy - 4) + '" text-anchor="end">Goal ' + mbFmt(opts.goal) + '</text>');
  }
  var path = points.map(function (p, i) { return (i ? "L" : "M") + f(X(p.d)) + " " + f(Y(p.y)); }).join(" ");
  if (points.length > 1) {
    out.push('<path class="c-area" d="' + path + ' L' + f(X(points[points.length - 1].d)) + ' ' + (H - B) + ' L' + f(X(points[0].d)) + ' ' + (H - B) + ' Z"/>');
    out.push('<path class="c-line" pathLength="1" d="' + path + '"/>');
  }
  if (points.length <= 40) points.forEach(function (p, i) {
    out.push('<circle style="--d:' + i + '" class="' + (i === points.length - 1 ? "c-last" : "c-dot") + '" cx="' + f(X(p.d)) + '" cy="' + f(Y(p.y)) + '" r="' + (i === points.length - 1 ? 4 : 3) + '"/>');
  });
  out.push('<text x="' + L + '" y="' + (H - 5) + '">' + mbShort(points[0].d) + '</text>');
  if (points.length > 1) out.push('<text x="' + (W - R) + '" y="' + (H - 5) + '" text-anchor="end">' + mbShort(points[points.length - 1].d) + '</text>');
  var wrap = h("div", { class: "chart-wrap" });
  wrap.innerHTML = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img"></svg>';
  wrap.firstChild.setAttribute("aria-label", opts.label || "Chart");
  wrap.firstChild.innerHTML = out.join("");
  return wrap;
}
function chartHead(title, last, unit, change, upIsGood) {
  var c = Math.round(change * 10) / 10;
  return h("div", { class: "chart-head" }, [
    h("div", {}, [h("small", { text: title }), h("br"), h("b", { text: mbFmt(last) + " " + unit })]),
    h("small", { class: c === 0 ? "" : (c > 0) === !!upIsGood ? "up" : "down", text: (c > 0 ? "+" : "") + mbFmt(c) + " " + unit + " overall" })
  ]);
}
// Best estimated 1RM per training day for one exercise (Epley). Bodyweight-only work falls back to best reps.
function exerciseTrend(exName) {
  var byDate = {}, weighted = false;
  state.sessions.forEach(function (s) { (s.sets && s.sets[exName] || []).forEach(function (p) { if (p[0] > 0) weighted = true; }); });
  state.sessions.forEach(function (s) {
    (s.sets && s.sets[exName] || []).forEach(function (p) {
      var v = weighted ? (p[0] > 0 ? p[0] * (1 + p[1] / 30) : 0) : p[1];
      if (v > 0 && (byDate[s.date] == null || v > byDate[s.date])) byDate[s.date] = Math.round(v * 10) / 10;
    });
  });
  return { weighted: weighted, points: Object.keys(byDate).sort().map(function (d) { return { d: d, y: byDate[d] }; }) };
}

// Remove an entry from state[listName] and offer a few seconds to put it back where it was.
function removeWithUndo(listName, item, label) {
  var i = state[listName].indexOf(item); if (i < 0) return;
  state[listName].splice(i, 1); save(); render();
  toast(label + " removed", 6000, {
    label: "Undo", run: function () {
      var a = state[listName]; if (a.indexOf(item) > -1) return;
      a.splice(Math.min(i, a.length), 0, item); save(); render(); toast("Restored");
    }
  });
}

/* ---------- MOTION HELPERS ---------- */
var REDUCED = false; try { REDUCED = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { }
var fx = { enter: false, pop: null }, lastPct = { day: null, pct: 0, vol: 0 };
function countUp(el, from, to) {
  var shown = function (v) { el.textContent = Math.round(v).toLocaleString(); };
  if (REDUCED || from === to) { shown(to); return; }
  var t0 = performance.now(), dur = 650; shown(from);
  (function step(t) {
    var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    shown(from + (to - from) * e);
    if (k < 1 && el.isConnected) requestAnimationFrame(step); else shown(to);
  })(t0);
}
var fxParts = [], fxRaf = 0;
function confetti(x, y, n) {
  if (REDUCED) return;
  var cv = $("fx"), dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(innerWidth * dpr)) { cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); }
  var cols = ["#F5A400", "#FFD23F", "#2F5BFF", "#5B80FF", "#10B981", "#EAF0FA", "#FF6B3D"];
  for (var i = 0; i < n; i++) {
    var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = 4 + Math.random() * 7.5;
    fxParts.push({
      x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
      w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, c: cols[(Math.random() * cols.length) | 0], life: 70 + Math.random() * 50, age: 0
    });
  }
  if (!fxRaf) fxRaf = requestAnimationFrame(fxLoop);
}
function fxLoop() {
  var cv = $("fx"), c = cv.getContext("2d"), dpr = cv.width / innerWidth;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  fxParts = fxParts.filter(function (p) { return p.age < p.life; });
  fxParts.forEach(function (p) {
    p.age++; p.vy += 0.28; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr;
    c.save(); c.translate(p.x, p.y); c.rotate(p.r);
    c.globalAlpha = Math.max(0, Math.min(1, (p.life - p.age) / 24));
    c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore();
  });
  if (fxParts.length) fxRaf = requestAnimationFrame(fxLoop);
  else { fxRaf = 0; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); }
}

// A barbell loaded for `weight` (20 kg bar), plates in competition colours.
// Non-barbell lifts get a dumbbell. Weight 0 shows the empty bar.
var PLATE_STYLE = { 25: ["--p25", 96, 20], 20: ["--p20", 88, 18], 15: ["--p15", 76, 16], 10: ["--p10", 62, 14], 5: ["--p5", 46, 11], 2.5: ["--psmall", 34, 8], 1.25: ["--psmall", 28, 7] };
function barbellViz(weight, barbell) {
  var W = 340, H = 104, cy = H / 2, out = [];
  if (barbell) {
    var plates = weight > 20 ? platesFor(weight, 20) : [];
    var gap = 1.5, total = plates.reduce(function (a, p) { return a + PLATE_STYLE[p][2] + gap; }, 0);
    var room = 92, k = total > room ? room / total : 1;
    out.push('<rect class="bv-bar" x="14" y="' + (cy - 3) + '" width="' + (W - 28) + '" height="6" rx="3"/>');
    out.push('<rect class="bv-collar" x="104" y="' + (cy - 9) + '" width="7" height="18" rx="2"/><rect class="bv-collar" x="' + (W - 111) + '" y="' + (cy - 9) + '" width="7" height="18" rx="2"/>');
    out.push('<rect class="bv-knurl" x="122" y="' + (cy - 3) + '" width="' + (W - 244) + '" height="6"/>');
    [-1, 1].forEach(function (side) {
      var x = side < 0 ? 102 : W - 102;
      plates.forEach(function (p) {
        var st = PLATE_STYLE[p], w = st[2] * k, hh = st[1];
        var px = side < 0 ? x - w : x;
        out.push('<rect class="bv-plate" style="fill:var(' + st[0] + ')" x="' + px.toFixed(1) + '" y="' + (cy - hh / 2) + '" width="' + w.toFixed(1) + '" height="' + hh + '" rx="2"/>');
        x += side * (w + gap * k);
      });
    });
  } else {
    // dumbbell
    out.push('<rect class="bv-bar" x="128" y="' + (cy - 4) + '" width="84" height="8" rx="4"/>');
    [[104, 24], [212, 24]].forEach(function (b) { out.push('<rect class="bv-head" x="' + b[0] + '" y="' + (cy - 26) + '" width="' + b[1] + '" height="52" rx="7"/>'); });
  }
  var plates2 = barbell && weight > 20 ? platesFor(weight, 20) : [];
  var label = barbell ? (plates2.length ? "Bar loaded with " + plates2.join(" + ") + " kg on each side" : "Empty 20 kg bar") : "Dumbbell";
  var box = h("div", { class: "bar-viz" });
  box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img"></svg>';
  box.firstChild.setAttribute("aria-label", label);
  box.firstChild.innerHTML = out.join("");
  return box;
}
