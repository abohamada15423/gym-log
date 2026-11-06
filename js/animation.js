// Canvas stick-figure exercise animations and list thumbnails.
// Classic script sharing the page's global scope; see README for load order.

/* ---------- 2D EXERCISE ANIMATION ENGINE ---------- */
var animGen = 0;
function clearAnimLoops() {
  animGen++;
  animLoops.forEach(function (id) { cancelAnimationFrame(id); });
  animLoops = [];
}

var AN = { C: null, P: null };
var FL = 60, T1 = 11.5, T2 = 10.5, TO = 14, A1 = 8, A2 = 8.3;
function hyp(x, y) { return Math.sqrt(x * x + y * y); }
function ease(x) { return x * x * (3 - 2 * x); }
function lerp(a, b, t) { return a + (b - a) * t; }
// two-bone IK: returns [jointX,jointY,endX,endY]
function ik(ax, ay, bx, by, l1, l2, dir) {
  var dx = bx - ax, dy = by - ay, D = hyp(dx, dy) || 0.001;
  var mx = l1 + l2 - 0.05, mn = Math.abs(l1 - l2) + 0.05;
  var d = Math.min(mx, Math.max(mn, D));
  var ux = dx / D, uy = dy / D;
  var a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return [ax + ux * a - uy * hh * dir, ay + uy * a + ux * hh * dir, ax + ux * d, ay + uy * d];
}
// Matches the app theme: a neutral figure, the far-side limbs a step lighter, equipment in the accent colour.
function pal(dark) {
  return dark ?
    { body: "#F3EFE9", far: "#8D8F97", out: "#1B1D22", skin: "#E7B48F", gold: "#FF9879", goldD: "#C8573B", gray: "#5A5D66", grayD: "#3A3C43", floor: "rgba(246,244,241,.16)", glow: "255,152,121" } :
    { body: "#2A2D35", far: "#A3A5AC", out: "#2A2D35", skin: "#E3A67E", gold: "#DA512E", goldD: "#9C2F19", gray: "#C9C5BF", grayD: "#99958F", floor: "rgba(32,33,38,.14)", glow: "218,81,46" };
}
// Lift, short pause, lower, short pause: reads more like a real rep than an even sway. Returns 0..1.
var REP_MS = 3400;
function tempo(t) {
  var c = (t % REP_MS) / REP_MS;
  if (c < 0.38) return ease(c / 0.38);
  if (c < 0.5) return 1;
  if (c < 0.9) return 1 - ease((c - 0.5) / 0.4);
  return 0;
}
function poly(pts, w, col) {
  var C = AN.C; C.lineCap = "round"; C.lineJoin = "round";
  C.beginPath(); C.moveTo(pts[0][0], pts[0][1]);
  for (var i = 1; i < pts.length; i++)C.lineTo(pts[i][0], pts[i][1]);
  C.lineWidth = w + 0.4; C.strokeStyle = col; C.stroke();
}
function line(x1, y1, x2, y2, w, col) {
  var C = AN.C; C.lineCap = "round"; C.beginPath(); C.moveTo(x1, y1); C.lineTo(x2, y2);
  C.lineWidth = w; C.strokeStyle = col; C.stroke();
}
function dot(x, y, r, col) { var C = AN.C; C.beginPath(); C.arc(x, y, r, 0, 6.2832); C.fillStyle = col; C.fill(); }
function plate(x, y, r) { var P = AN.P; dot(x, y, r + .9, P.goldD); dot(x, y, r, P.gold); dot(x, y, r * .34, P.goldD); }
function dumb(x, y) { var P = AN.P; dot(x, y, 3.7, P.goldD); dot(x, y, 2.9, P.gold); }
function glow(x, y, r, p) {
  var C = AN.C, g = C.createRadialGradient(x, y, 0, x, y, r), al = 0.28 + 0.5 * p;
  var gc = AN.P.glow || "255,96,40";
  g.addColorStop(0, "rgba(" + gc + "," + al + ")"); g.addColorStop(1, "rgba(" + gc + ",0)");
  C.fillStyle = g; C.beginPath(); C.arc(x, y, r, 0, 6.2832); C.fill();
}
function floor() { var P = AN.P; line(5, FL + 1.2, 77, FL + 1.2, 1.3, P.floor); }
function pad(x1, y1, x2, y2, w) { var P = AN.P; line(x1, y1, x2, y2, w + 1.2, P.grayD); line(x1, y1, x2, y2, w, P.gray); }
function post(x1, y1, x2, y2) { var P = AN.P; line(x1, y1, x2, y2, 2.4, P.grayD); }
function cable(x1, y1, x2, y2) { line(x1, y1, x2, y2, .9, AN.P.grayD); }

function limb2(root, tgt, l1, l2, dir, ex) {
  if (ex) return { j: ex, e: tgt };
  var q = ik(root[0], root[1], tgt[0], tgt[1], l1, l2, dir);
  return { j: [q[0], q[1]], e: [q[2], q[3]] };
}
// side-view figure facing right
function fig(o) {
  var P = AN.P, S = o.S, H = o.H, f = o.f || 1;
  var hn = o.hn, hf = o.hf || [o.hn[0] - 1.2, o.hn[1] + 0.3];
  var an = o.an, af = o.af || [o.an[0] - 4, o.an[1]];
  var lf = limb2(H, af, T1, T2, o.kd || -1, o.kf);
  poly([H, lf.j, lf.e], 3.2, P.far);
  var tf = o.tf || [lf.e[0] + 5.5 * f, lf.e[1] + 1.3]; poly([lf.e, tf], 2.6, P.far);
  var af2 = limb2(S, hf, A1, A2, o.ed || 1, o.ef);
  poly([S, af2.j, af2.e], 2.6, P.far);
  poly([H, S], 4.6, P.body);
  var ln = limb2(H, an, T1, T2, o.kd || -1, o.kn);
  poly([H, ln.j, ln.e], 3.5, P.body);
  var tn = o.tn || [ln.e[0] + 5.5 * f, ln.e[1] + 1.3]; poly([ln.e, tn], 2.7, P.body);
  var aa = limb2(S, hn, A1, A2, o.ed || 1, o.en);
  poly([S, aa.j, aa.e], 2.8, P.body);
  dot(aa.e[0], aa.e[1], 1.9, P.skin);
  var dx = S[0] - H[0], dy = S[1] - H[1], dl = hyp(dx, dy) || 1;
  var hc = o.head || [S[0] + dx / dl * 5.7 + 0.5 * f, S[1] + dy / dl * 5.7];
  dot(hc[0], hc[1], 4, P.skin);
  dot(hc[0] + 1.4 * f, hc[1] - 0.5, 0.6, P.out);
  return { hn: aa.e, hc: hc };
}
// front-view figure
function ffig(o) {
  var P = AN.P, sy = o.sy || 22.5, cx = 41;
  var hy = 36.4;
  poly([[cx - 2.5, hy], [cx - 4, 58]], 3.6, P.far); poly([[cx - 4, 58], [cx - 7, 59.2]], 2.6, P.far);
  poly([[cx + 2.5, hy], [cx + 4, 58]], 3.6, P.far); poly([[cx + 4, 58], [cx + 7, 59.2]], 2.6, P.far);
  poly([[cx, sy], [cx, hy]], 7.4, P.body);
  poly([[cx - 5.6, sy + 0.6], [cx + 5.6, sy + 0.6]], 3.6, P.body);
  var hc = [cx, 22.5 - 6.6 + (o.hy || 0)];
  for (var i = 0; i < 2; i++) {
    var sg = i ? 1 : -1, sh = [cx + sg * 5.6, sy + 0.6];
    poly([sh, o.el[i], o.hd[i]], 2.8, P.body);
    dot(o.hd[i][0], o.hd[i][1], 1.9, P.skin);
  }
  dot(hc[0], hc[1], 4, P.skin);
  return hc;
}

/* ---- exercise kinds: each draws one frame; p = 0..1 rep phase ---- */
var K = {};
K.bench = function (p, t, o) {
  var inc = (o === "bbi" || o === "dbi"), isdb = (o === "db" || o === "dbi");
  var S, H, n, hn, en;
  var an = [47, 58], af = [43, 58];
  if (!inc) {
    S = [24, 44]; H = [38, 44];
    pad(12, 47.6, 50, 47.6, 3.6); post(18, 48, 18, 58); post(44, 48, 44, 58);
    hn = [S[0] + 2 + 1.2 * p, S[1] - 16 + 12 * p];
  } else {
    S = [25.5, 35.5]; H = [37, 43.5];
    pad(37, 46.6, 53, 46.6, 3.4); pad(36, 46, 21, 33.5, 3.4); post(30, 46, 30, 58); post(48, 48, 48, 58);
    n = [0.57, -0.82]; var d = 16 - 11 * p; hn = [S[0] + n[0] * d, S[1] + n[1] * d];
  }
  floor();
  fig({ S: S, H: H, hn: hn, an: an, af: af, ed: 1, kd: -1, tn: [an[0] + 5, an[1] + 1.3] });
  if (isdb) { dumb(hn[0], hn[1]); dumb(hn[0] - 1.2, hn[1] + 0.3); } else plate(hn[0], hn[1], 4.6);
  glow(S[0] + 5, S[1] - 3, 9, p);
};
K.fly = function (p, t, o) {
  var S = [24, 44], H = [38, 44], an = [47, 58], af = [43, 58];
  pad(12, 47.6, 50, 47.6, 3.6); post(18, 48, 18, 58); post(44, 48, 44, 58); floor();
  var hn = [S[0] + 2 - 3 * p, S[1] - 15.5 + 8.5 * p];
  fig({ S: S, H: H, hn: hn, an: an, af: af, ed: 1, kd: -1 });
  dumb(hn[0], hn[1]); dumb(hn[0] - 1.2, hn[1] + 0.3);
  glow(S[0] + 5, S[1] - 3, 9, p);
};
K.pullover = function (p, t, o) {
  var S = [24, 44], H = [38, 44], an = [47, 58], af = [43, 58];
  pad(12, 47.6, 50, 47.6, 3.6); post(18, 48, 18, 58); post(44, 48, 44, 58); floor();
  var a = -1.75 + 1.75 * p;
  var hn = [S[0] + 16.2 * Math.sin(a), S[1] - 16.2 * Math.cos(a)];
  fig({ S: S, H: H, hn: hn, an: an, af: af, ed: -1, kd: -1 });
  dumb(hn[0], hn[1]);
  glow(S[0] + 4, S[1] - 3, 9, p);
};
K.pushup = function (p, t, o) {
  var A = [17, 57.5], dy = 14.5 - 9 * p;
  var S = [A[0] + Math.sqrt(36 * 36 - dy * dy), 57.5 - dy];
  var H = [A[0] + (S[0] - A[0]) * 22 / 36, A[1] + (S[1] - A[1]) * 22 / 36];
  floor();
  var hn = [S[0] + 3, 58.2];
  fig({ S: S, H: H, hn: hn, an: A, af: [A[0] - 1.5, A[1]], ed: 1, kd: -1, tn: [A[0] + 1.8, 59.3], tf: [A[0] + 0.3, 59.3] });
  glow(S[0] - 3, S[1] + 3, 9, p);
};
K.dip = function (p, t, o) {
  var S = [38, 14.5 + 10 * p], H = [38.6, S[1] + 14];
  var bar = 30;
  line(28, bar, 50, bar, 2.6, AN.P.grayD); post(50, bar, 50, 60); post(28, bar, 28, 60); floor();
  var an = [H[0] - 5, H[1] + 19], af = [H[0] - 8, H[1] + 17];
  fig({ S: S, H: H, hn: [39, bar - 1], an: an, af: af, ed: 1, kd: -1 });
  glow(S[0] - 1, S[1] + 4, 9, p);
};
K.squat = function (p, t, o) {
  var hx = 38 - 9 * p, hy = 36.4 + 13 * p, lean = 0.1 + 0.62 * p;
  var H = [hx, hy], S = [hx + Math.sin(lean) * TO, hy - Math.cos(lean) * TO];
  var an = [41, 58], af = [36, 58];
  floor();
  var hn, en, bar = null;
  if (o === "front") { bar = [S[0] + 4.2, S[1] - 1]; hn = [bar[0] + .4, bar[1] + .6]; en = [S[0] + 8, S[1] + 2]; }
  else if (o === "bw") { hn = [S[0] + 14, S[1] - 1 - 3 * p]; en = null; }
  else if (o === "goblet") { hn = [S[0] + 6, S[1] + 2.5]; en = null; }
  else { bar = [S[0] - 0.6, S[1] - 1.6]; hn = [S[0] + 1.4, S[1] - 1]; en = [S[0] - 4.5, S[1] + 3.5]; }
  fig({ S: S, H: H, hn: hn, en: en, an: an, af: af, ed: (o === "bw" ? 1 : 1), kd: -1 });
  if (bar) plate(bar[0], bar[1], 4.8);
  if (o === "goblet") dumb(hn[0] + 0.8, hn[1]);
  glow(H[0] + 4, H[1] + 4, 9, p);
};
K.legpress = function (p, t, o) {
  var H = [20, 48], S = [11.5, 37];
  pad(5, 52, 8, 36, 3.2); pad(10, 53.5, 28, 53.5, 3.2);
  var q = 1 - p, F = [29 + 9.7 * q, 39.5 - 2.3 * q];
  pad(14, 58, 48, 33, 1.6);
  var px = F[0] + 2.4;
  line(px, F[1] - 9, px + 1, F[1] + 8, 3.4, AN.P.grayD); line(px, F[1] - 9, px + 1, F[1] + 8, 2.4, AN.P.gray);
  fig({ S: S, H: H, hn: [H[0] + 4, H[1] - 2], an: F, af: [F[0] - 1, F[1] + 1], kd: -1, ed: 1, tn: [F[0] + 1.6, F[1] - 3.5], tf: [F[0] + 0.6, F[1] - 2.6] });
  glow(H[0] + 6, H[1] - 5, 9, p);
};
K.lunge = function (p, t, o) {
  var H = [34, 36.6 + 11.2 * p], S = [H[0] + 1.2, H[1] - 13.7];
  var an = [47, 58], ab = (o === "bulg") ? [19, 49.5] : [21, 55];
  floor();
  if (o === "bulg") pad(10, 52.5, 25, 52.5, 3.2);
  var tb = (o === "bulg") ? [17, 50.5] : [26, 59.2];
  var hn = (o === "bw") ? [S[0] + 3, S[1] + 6] : [S[0] + 1, S[1] + 14.5];
  fig({
    S: S, H: H, hn: hn, an: an, af: ab, ed: 1, kd: -1, tn: [an[0] + 5.5, an[1] + 1.3], tf: tb,
    kf: null
  });
  if (o !== "bw") { dumb(hn[0], hn[1]); dumb(hn[0] - 1.2, hn[1]); }
  glow(H[0] + 3, H[1] + 5, 9, p);
};
K.hinge = function (p, t, o) {
  var H, S, hn, en = null, bar = null, an = [40, 58], af = [36, 58];
  floor();
  if (o === "dl") {
    H = [34 - 6 * p, 36.4 + 10 * p]; var lean = 0.15 + 0.85 * p;
    S = [H[0] + Math.sin(lean) * TO, H[1] - Math.cos(lean) * TO];
    hn = [S[0] + 2.5, Math.min(S[1] + 16, 55.2)]; bar = hn;
  } else if (o === "gm") {
    H = [36 - 6 * p, 36.4 + 2 * p]; var l2 = 0.05 + 1.1 * p;
    S = [H[0] + Math.sin(l2) * TO, H[1] - Math.cos(l2) * TO];
    bar = [S[0] - 0.6, S[1] - 1.6]; hn = [S[0] + 1.4, S[1] - 1]; en = [S[0] - 4.5, S[1] + 3.5];
  } else {
    H = [36 - 6 * p, 36.4 + 1.5 * p]; var l3 = 0.08 + 1.1 * p;
    S = [H[0] + Math.sin(l3) * TO, H[1] - Math.cos(l3) * TO];
    hn = [S[0] + 1.5, S[1] + 15]; bar = hn;
  }
  fig({ S: S, H: H, hn: hn, en: en, an: an, af: af, ed: 1, kd: -1 });
  plate(bar[0], bar[1], o === "dl" ? 4.8 : 4.4);
  glow(H[0] + 3, H[1] + 7, 9, p);
};
K.thrust = function (p, t, o) {
  var S = [16, 43], hy = 53 - 12 * p, H = [S[0] + Math.sqrt(196 - (hy - S[1]) * (hy - S[1])), hy];
  pad(5, 47, 21, 47, 4.6); post(9, 48, 9, 58); floor();
  var hn = [H[0], H[1] - 3.6];
  fig({ S: S, H: H, hn: hn, an: [41, 58], af: [37, 58], ed: 1, kd: -1 });
  plate(H[0] + 0.5, H[1] - 4, 4.6);
  glow(H[0], H[1] - 1, 9, p);
};
K.bridge = function (p, t, o) {
  var S = [14, 56.4], hy = 55.5 - 11 * p, H = [S[0] + Math.sqrt(196 - (hy - S[1]) * (hy - S[1])), hy];
  floor();
  fig({ S: S, H: H, hn: [S[0] + 13, 57.4], an: [38, 58], af: [34, 58], ed: 1, kd: -1, head: [S[0] - 5.4, 55.6] });
  glow(H[0], H[1], 9, p);
};
K.leg = function (p, t, o) {
  floor();
  if (o === "lie" || o === "curl") {
    var S = [14, 45], H = [28, 45], kn = [39.5, 45], th = 0.05 + 1.85 * p;
    var an = [kn[0] + 10.5 * Math.cos(th), kn[1] - 10.5 * Math.sin(th)];
    pad(8, 48, 36, 48, 3.6); post(12, 49, 12, 58); post(32, 49, 32, 58);
    fig({ S: S, H: H, hn: [S[0] - 5, 51], an: an, af: [an[0] - 1, an[1] + 0.6], kn: kn, kf: kn, ed: 1, tn: [an[0] - 4.2 * Math.sin(th), an[1] - 4.2 * Math.cos(th)], head: [S[0] - 5, 44] });
    dot(an[0], an[1], 2.2, AN.P.grayD);
    glow(32, 44, 9, p);
  } else {
    var Hs = [26, 46], Ss = [25, 32], knee = [37.5, 46];
    var phi = (o === "ext") ? (0.05 + 1.4 * p) : (1.4 - 1.9 * p);
    var a2 = [knee[0] + 10.5 * Math.sin(phi), knee[1] + 10.5 * Math.cos(phi)];
    pad(14, 49.5, 36, 49.5, 3.4); pad(Ss[0] - 3, Ss[1] + 1, Hs[0] - 4, Hs[1] + 3, 3.2); post(20, 50, 20, 58);
    fig({
      S: Ss, H: Hs, hn: [Hs[0] + 3, Hs[1] - 2], an: a2, af: [a2[0] - 1, a2[1] + 0.6], kn: knee, kf: knee, ed: 1,
      tn: [a2[0] + 4.2 * Math.cos(phi), a2[1] - 4.2 * Math.sin(phi) + 1]
    });
    dot(a2[0], a2[1], 2.2, AN.P.grayD);
    glow(knee[0] - 5, knee[1] - 1, 9, (o === "ext") ? p : (1 - p) * 0.0 + p);
  }
};
K.calf = function (p, t, o) {
  var a = 0.28 + 0.87 * p, toe = [44, 59.3], an = [toe[0] - 6.5 * Math.cos(a), toe[1] - 6.5 * Math.sin(a)];
  var H = [an[0], an[1] - 21.6], S = [H[0], H[1] - 14];
  floor();
  fig({ S: S, H: H, hn: [S[0] + 1, S[1] + 15], an: an, af: [an[0] - 4, an[1]], ed: 1, kd: -1, tn: toe, tf: [toe[0] - 4, toe[1]] });
  dumb(S[0] + 1, S[1] + 15.5);
  glow(an[0] - 0.5, an[1] - 6, 7, p);
};
K.pullup = function (p, t, o) {
  var bar = 7, S = [38.5, 23.5 - 10.5 * p], H = [39.4, S[1] + 13.7];
  line(22, bar, 56, bar, 2.6, AN.P.grayD); post(22, bar, 22, 0); post(56, bar, 56, 0);
  fig({
    S: S, H: H, hn: [38, bar + 0.6], an: [H[0] - 6, H[1] + 19], af: [H[0] - 9, H[1] + 17], ed: -1, kd: -1,
    tn: [H[0] - 6 + 3, H[1] + 19.8]
  });
  glow(S[0] - 2, S[1] + 4, 9, p);
};
K.pulldown = function (p, t, o) {
  var lean = -0.05 - 0.22 * p, H = [28, 50], S = [H[0] + Math.sin(lean) * TO, H[1] - Math.cos(lean) * TO];
  pad(14, 53.5, 34, 53.5, 3.2); pad(41, 43.8, 41, 48, 5); post(26, 54, 26, 60); floor();
  var hn, en;
  if (o === "st") {
    var a = 2.3 - 2.15 * p; hn = [S[0] + 16.2 * Math.sin(a), S[1] + 16.2 * Math.cos(a)]; en = null;
  } else {
    hn = [S[0] + 5, S[1] - 15 + 17 * p]; en = [S[0] + 4 - 7 * p, S[1] - 8 + 14 * p];
  }
  cable(Math.min(hn[0] + 1, 60), 0, hn[0], hn[1]);
  fig({ S: S, H: H, hn: hn, en: en, an: [41.5, 58], af: [38, 58], ed: 1, kd: -1 });
  if (o !== "st") dot(hn[0], hn[1], 2.3, AN.P.gold);
  glow(S[0] - 1, S[1] + 3, 9, p);
};
K.row = function (p, t, o) {
  var H = [29, 38], S = [40.8, 30.4];
  floor();
  var hn = [S[0] + 1.5 - 3.5 * p, S[1] + 16 - 7.5 * p];
  var en = [S[0] + 1 - 8 * p, S[1] + 8 - 4.5 * p];
  fig({ S: S, H: H, hn: hn, en: en, an: [37, 58], af: [33, 58], ed: 1, kd: -1 });
  if (o === "db") dumb(hn[0], hn[1]); else plate(hn[0], hn[1], o === "tbar" ? 3.8 : 4.4);
  glow(S[0] - 3, S[1] + 3, 9, p);
};
K.seatrow = function (p, t, o) {
  var lean = -0.05 - 0.25 * p, H = [24, 53], S = [H[0] + Math.sin(lean) * TO, H[1] - Math.cos(lean) * TO];
  pad(14, 56.6, 30, 56.6, 3.2); post(47, 43, 47, 58); floor();
  var hn = [S[0] + 14 - 10 * p, S[1] + 8], en = [S[0] + 7 - 10 * p, S[1] + 4 + 2 * p];
  cable(hn[0], hn[1], 72, 48);
  fig({ S: S, H: H, hn: hn, en: en, an: [45, 52], af: [43, 53], ed: 1, kd: -1, tn: [46.5, 48.8] });
  dot(hn[0], hn[1], 2.3, AN.P.gold);
  glow(S[0] - 3, S[1] + 4, 9, p);
};
K.invrow = function (p, t, o) {
  var A = [12, 57.5], sy = 50 - 11 * p, S = [A[0] + Math.sqrt(36 * 36 - (57.5 - sy) * (57.5 - sy)), sy];
  var H = [A[0] + (S[0] - A[0]) * 22 / 36, A[1] + (S[1] - A[1]) * 22 / 36];
  line(44, 34, 60, 34, 2.6, AN.P.grayD); post(60, 34, 60, 60); post(44, 34, 44, 60); floor();
  fig({ S: S, H: H, hn: [S[0] + 1.5, 34.5], an: A, af: [A[0] - 1.5, A[1]], ed: -1, kd: -1, tn: [A[0] + 1.8, 59.3], tf: [A[0] + 0.3, 59.3] });
  glow(S[0] - 3, S[1] + 2, 9, p);
};
K.facepull = function (p, t, o) {
  var H = [38, 36.4], S = [38, 22.4]; floor();
  var hn = [S[0] + 16 - 9.5 * p, S[1] - 2 - 5.5 * p], en = [S[0] + 8 - 6 * p, S[1] - 1 - 2.5 * p];
  cable(76, 18, hn[0], hn[1]); post(76, 10, 76, 60);
  fig({ S: S, H: H, hn: hn, en: en, an: [40, 58], af: [35, 58], ed: 1, kd: -1 });
  dot(hn[0], hn[1], 2.2, AN.P.gold);
  glow(S[0] - 1, S[1] - 1, 8, p);
};
K.reardelt = function (p, t, o) {
  var H = [29, 38], S = [40.8, 30.4]; floor();
  var hn = [S[0] + 1.5 + 3 * p, S[1] + 16 - 9 * p], en = [S[0] + 1 + 2.5 * p, S[1] + 8 - 4 * p];
  fig({ S: S, H: H, hn: hn, en: en, an: [37, 58], af: [33, 58], ed: 1, kd: -1 });
  dumb(hn[0], hn[1]);
  glow(S[0] + 1, S[1] + 1, 8, p);
};
K.ohp = function (p, t, o) {
  var seat = (o === "seat"), H, S, an, af;
  floor();
  if (seat) {
    H = [34, 48]; S = [34, 34]; an = [44, 58]; af = [40, 58];
    pad(S[0] - 3, S[1] + 2, H[0] - 4, H[1] + 3, 3.2); pad(H[0] - 8, H[1] + 3.4, H[0] + 10, H[1] + 3.4, 3.2); post(H[0] - 2, H[1] + 4, H[0] - 2, 58);
  }
  else { H = [38, 36.4]; S = [38, 22.4]; an = [40, 58]; af = [36, 58]; }
  var hn = [S[0] + 4.5 - 2.5 * p, S[1] - 2.5 - 13 * p], en = [S[0] + 5.5 - 3.5 * p, S[1] + 6.5 - 14.5 * p];
  fig({ S: S, H: H, hn: hn, en: en, an: an, af: af, ed: 1, kd: -1 });
  if (o === "bb") plate(hn[0], hn[1], 4.4); else { dumb(hn[0], hn[1]); dumb(hn[0] - 1.2, hn[1] + 0.2); }
  glow(S[0] + 1, S[1] - 1, 8, p);
};
K.lateral = function (p, t, o) {
  var th = 0.12 + 1.33 * p, cx = 41, sy = 22.5, el = [], hd = [];
  for (var i = 0; i < 2; i++) {
    var sg = i ? 1 : -1, sx = cx + sg * 5.6, s0 = sy + 0.6;
    el[i] = [sx + sg * 8 * Math.sin(th), s0 + 8 * Math.cos(th) + 0.6 * Math.sin(th * 2)];
    hd[i] = [sx + sg * 16.2 * Math.sin(th), s0 + 16.2 * Math.cos(th)];
  }
  floor(); ffig({ el: el, hd: hd });
  dumb(hd[0][0], hd[0][1]); dumb(hd[1][0], hd[1][1]);
  glow(cx - 8, sy + 1, 7, p); glow(cx + 8, sy + 1, 7, p);
};
K.uprow = function (p, t, o) {
  var cx = 41, sy = 22.5, el = [], hd = [];
  for (var i = 0; i < 2; i++) {
    var sg = i ? 1 : -1;
    hd[i] = [cx + sg * 3.5, sy + 15 - 17 * p];
    el[i] = [cx + sg * (5 + 4 * p), sy + 8 - 8.5 * p];
  }
  floor(); ffig({ el: el, hd: hd });
  line(hd[0][0], hd[0][1], hd[1][0], hd[1][1], 1.8, AN.P.gold);
  glow(cx - 8, sy + 1, 7, p); glow(cx + 8, sy + 1, 7, p);
};
K.shrug = function (p, t, o) {
  var cx = 41, off = -3.4 * p, sy = 22.5 + off, el = [], hd = [];
  for (var i = 0; i < 2; i++) {
    var sg = i ? 1 : -1;
    el[i] = [cx + sg * 8.4, sy + 8.6]; hd[i] = [cx + sg * 8.8, sy + 16.8];
  }
  floor(); ffig({ sy: sy, el: el, hd: hd, hy: -off * 0.0 });
  dumb(hd[0][0], hd[0][1] + 0.6); dumb(hd[1][0], hd[1][1] + 0.6);
  glow(cx - 6, sy - 2, 7, p); glow(cx + 6, sy - 2, 7, p);
};
K.fraise = function (p, t, o) {
  var H = [38, 36.4], S = [38, 22.4]; floor();
  var a = 0.1 + 1.5 * p, hn = [S[0] + 16.2 * Math.sin(a), S[1] + 16.2 * Math.cos(a)];
  fig({ S: S, H: H, hn: hn, an: [40, 58], af: [35, 58], ed: 1, kd: -1 });
  dumb(hn[0], hn[1]);
  glow(S[0] + 3, S[1] + 1, 8, p);
};
K.curl = function (p, t, o) {
  var H, S, E, th, hn, an = [40, 58], af = [36, 58];
  floor();
  if (o === "preach") {
    H = [30, 44]; S = [31, 30]; E = [S[0] + 7, S[1] + 6]; th = 0.6 + 2.1 * p; an = [39, 58]; af = [35, 58];
    pad(S[0] + 4, S[1] + 2, S[0] + 13.5, S[1] + 17, 3.4); pad(H[0] - 8, H[1] + 3.4, H[0] + 8, H[1] + 3.4, 3.2); post(H[0] - 2, H[1] + 4, H[0] - 2, 58);
  } else if (o === "inc") {
    H = [37, 44]; S = [25.5, 34]; E = [S[0] + 1, S[1] + 8]; th = 0.05 + 2.0 * p; an = [45, 58]; af = [41, 58];
    pad(37, 46.8, 50, 46.8, 3.2); pad(36, 46, 22, 32.5, 3.4); post(30, 46, 30, 58);
  } else {
    H = [38, 36.4]; S = [38, 22.4]; E = [S[0] + 1.5, S[1] + 8]; th = 0.08 + 2.3 * p;
  }
  hn = [E[0] + A2 * Math.sin(th), E[1] + A2 * Math.cos(th)];
  if (o === "cable") cable(76, 58, hn[0], hn[1]);
  fig({ S: S, H: H, hn: hn, en: E, an: an, af: af, ed: 1, kd: -1 });
  if (o === "bb") plate(hn[0], hn[1], 3.8); else if (o === "cable") dot(hn[0], hn[1], 2.2, AN.P.gold); else dumb(hn[0], hn[1]);
  glow((S[0] + E[0]) / 2 + 2, (S[1] + E[1]) / 2, 6, p);
};
K.pushdown = function (p, t, o) {
  var H = [38, 36.4], S = [38, 22.4], E = [S[0] + 1, S[1] + 8], th = 2.0 - 1.95 * p;
  var hn = [E[0] + A2 * Math.sin(th), E[1] + A2 * Math.cos(th)];
  floor(); cable(S[0] + 8, 0, hn[0], hn[1]); post(S[0] + 8, 0, S[0] + 8, 3);
  fig({ S: S, H: H, hn: hn, en: E, an: [40, 58], af: [36, 58], ed: 1, kd: -1 });
  dot(hn[0], hn[1], 2.3, AN.P.gold);
  glow(S[0] - 1.5, S[1] + 4, 6, p);
};
K.overhead = function (p, t, o) {
  var H = [38, 36.4], S = [38, 22.4], E = [S[0] + 4, S[1] - 8], ph = -2.4 + 2.45 * p;
  var hn = [E[0] + A2 * Math.sin(ph), E[1] - A2 * Math.cos(ph)];
  floor();
  fig({ S: S, H: H, hn: hn, en: E, an: [40, 58], af: [36, 58], ed: 1, kd: -1 });
  dumb(hn[0], hn[1]);
  glow((S[0] + E[0]) / 2 - 1.5, (S[1] + E[1]) / 2, 6, p);
};
K.skull = function (p, t, o) {
  var S = [24, 44], H = [38, 44], E = [S[0] + 1, S[1] - 8], ph = 1.95 - 1.9 * p;
  var hn = [E[0] - A2 * Math.sin(ph), E[1] - A2 * Math.cos(ph)];
  pad(12, 47.6, 50, 47.6, 3.6); post(18, 48, 18, 58); post(44, 48, 44, 58); floor();
  fig({ S: S, H: H, hn: hn, en: E, an: [47, 58], af: [43, 58], ed: 1, kd: -1 });
  plate(hn[0], hn[1], 3.5);
  glow(E[0] - 1.5, E[1] + 3, 6, p);
};
K.kickback = function (p, t, o) {
  var H = [29, 38], S = [40.8, 30.4], E = [S[0] - 7.5, S[1] + 2.5], a = 0.1 - 1.6 * p;
  var hn = [E[0] + A2 * Math.sin(a), E[1] + A2 * Math.cos(a)];
  floor();
  fig({ S: S, H: H, hn: hn, en: E, hf: [S[0] + 4, S[1] + 15], an: [37, 58], af: [33, 58], ed: 1, kd: -1 });
  dumb(hn[0], hn[1]);
  glow(E[0] + 3, E[1] - 1, 6, p);
};
K.wrist = function (p, t, o) {
  var Hs = [26, 46], Ss = [25, 32], knee = [37.5, 46];
  pad(14, 49.5, 36, 49.5, 3.4); post(20, 50, 20, 58); floor();
  var E = [Ss[0] + 8, Ss[1] + 9], W = [E[0] + 6.5, E[1] + 4.2 + 1.2], ang = 0.5 - 1.0 * p;
  var hn = [W[0] + 4.8 * Math.cos(ang), W[1] - 4.8 * Math.sin(ang) * -1 + -4.8 * Math.sin(ang) * 0];
  hn = [W[0] + 4.8 * Math.cos(ang), W[1] - 4.8 * Math.sin(ang)];
  fig({ S: Ss, H: Hs, hn: hn, en: E, an: [38, 58], af: [34, 58], kn: knee, kf: knee, ed: 1 });
  plate(hn[0] + 0.5, hn[1], 3);
  glow(W[0] - 2, W[1] - 1, 5, p);
};
K.crunch = function (p, t, o) {
  var H = [40, 56], al = 0.05 + (o === "situp" ? 1.35 : 0.62) * p;
  var S = [H[0] - Math.cos(al) * TO, H[1] - Math.sin(al) * TO];
  floor();
  var dx = S[0] - H[0], dy = S[1] - H[1], dl = hyp(dx, dy), hc = [S[0] + dx / dl * 5.7, S[1] + dy / dl * 5.7 - 0.3];
  fig({ S: S, H: H, hn: [hc[0] + 2.5, hc[1] + 2], an: [52, 58], af: [49, 58], ed: -1, kd: -1, head: hc });
  glow((S[0] + H[0]) / 2, (S[1] + H[1]) / 2 - 1, 7, p);
};
K.lyleg = function (p, t, o) {
  var S = [14, 56], H = [28, 56], b = 0.08 + 1.35 * p;
  var an = [H[0] + 21.5 * Math.cos(b), H[1] - 21.5 * Math.sin(b)], kn = [H[0] + 11.5 * Math.cos(b), H[1] - 11.5 * Math.sin(b)];
  floor();
  fig({ S: S, H: H, hn: [S[0] + 13, 57], an: an, af: an, kn: kn, kf: kn, ed: 1, head: [S[0] - 5.2, 55.4], tn: [an[0] + 1, an[1] - 4.5], tf: [an[0] + 1, an[1] - 4.5] });
  glow(H[0] + 4, H[1] - 1, 7, p);
};
K.plank = function (p, t, o) {
  var S = [52, 49.5 + 0.8 * p], A = [S[0] - Math.sqrt(36 * 36 - (57.5 - S[1]) * (57.5 - S[1])), 57.5];
  var H = [A[0] + (S[0] - A[0]) * 22 / 36, A[1] + (S[1] - A[1]) * 22 / 36 - 1.2 * p];
  floor();
  fig({ S: S, H: H, hn: [58, 57.4], en: [52, 57.6], an: A, af: [A[0] - 1.5, A[1]], ed: 1, kd: -1, tn: [A[0] + 1.8, 59.3], tf: [A[0] + 0.3, 59.3] });
  glow((S[0] + H[0]) / 2, (S[1] + H[1]) / 2 + 2, 8, p);
};
K.hang = function (p, t, o) {
  var bar = 6, S = [38, 22], H = [38.6, 35.7], b = 0.1 + 1.35 * p, L = 21.5 - 6 * Math.sin(Math.PI * p);
  var an = [H[0] + L * Math.sin(b), H[1] + L * Math.cos(b)];
  line(22, bar, 56, bar, 2.6, AN.P.grayD); post(22, bar, 22, 0); post(56, bar, 56, 0);
  fig({ S: S, H: H, hn: [38, bar + 0.6], an: an, af: [an[0] - 1, an[1] + 0.5], ed: -1, kd: -1, tn: [an[0] + 1.5, an[1] + 5], tf: [an[0] + 0.5, an[1] + 5] });
  glow(H[0] + 3, H[1] - 3, 7, p);
};
K.run = function (p, t, o) {
  var ph = t / 210, H = [38, 37.6 - 1.3 * Math.abs(Math.sin(ph))], lean = 0.2;
  var S = [H[0] + Math.sin(lean) * TO, H[1] - Math.cos(lean) * TO];
  // moving floor dashes
  var off = (t / 14) % 12; for (var x = -12 + off; x < 80; x += 12)line(x, FL + 3, x + 5, FL + 3, 1.1, AN.P.floor);
  floor();
  function foot(q) { return [H[0] + 9 * Math.sin(q), 58 - 7 * Math.max(0, Math.cos(q))]; }
  var an = foot(ph), af = foot(ph + Math.PI);
  function arm(q) { var E = [S[0] + 3.2 * Math.sin(q) + 1, S[1] + 7.5], a = 1.15 + 0.9 * Math.sin(q); return [E, [E[0] + A2 * Math.sin(a), E[1] + A2 * Math.cos(a)]]; }
  var an1 = arm(ph + Math.PI), af1 = arm(ph);
  fig({
    S: S, H: H, hn: an1[1], en: an1[0], hf: af1[1], ef: af1[0], an: an, af: af, ed: 1, kd: -1,
    tn: [an[0] + 5.2, an[1] + 1 + 1.5 * Math.max(0, Math.cos(ph))], tf: [af[0] + 5.2, af[1] + 1 + 1.5 * Math.max(0, Math.cos(ph + Math.PI))]
  });
  glow(H[0] + 3, H[1] + 7, 8, 0.5 + 0.4 * Math.sin(ph * 2));
};
K.bike = function (p, t, o) {
  var ph = t / 260, P = AN.P;
  function wheel(cx, cy) {
    var C = AN.C; C.strokeStyle = P.grayD; C.lineWidth = 1.6; C.beginPath(); C.arc(cx, cy, 8.5, 0, 6.2832); C.stroke();
    for (var i = 0; i < 3; i++) { var a = ph + i * 1.047; line(cx - 8 * Math.cos(a), cy - 8 * Math.sin(a), cx + 8 * Math.cos(a), cy + 8 * Math.sin(a), 0.6, P.gray); }
  }
  wheel(18, 51.5); wheel(60, 51.5);
  line(18, 51.5, 34, 38, 1.6, P.grayD); line(34, 38, 50, 51.5, 1.6, P.grayD); line(34, 38, 52, 36, 1.6, P.grayD); line(52, 36, 60, 51.5, 1.6, P.grayD); line(34, 38, 38, 50, 1.6, P.grayD);
  pad(29, 36, 35, 36, 2.4);
  var H = [32, 35], S = [H[0] + Math.sin(0.95) * TO, H[1] - Math.cos(0.95) * TO];
  var an = [39 + 5 * Math.cos(ph), 50 + 5 * Math.sin(ph)], af = [39 - 5 * Math.cos(ph), 50 - 5 * Math.sin(ph)];
  fig({ S: S, H: H, hn: [52, 34.5], an: an, af: af, ed: 1, kd: -1, tn: [an[0] + 4, an[1] + 1], tf: [af[0] + 4, af[1] + 1] });
  glow(H[0] + 4, H[1] + 5, 7, 0.5 + 0.4 * Math.sin(ph));
};

K.sideplank = function (p, t, o) {
  var S = [26, 48.5], A = [62, 57.6];
  var H = [A[0] + (S[0] - A[0]) * 22 / 36, A[1] + (S[1] - A[1]) * 22 / 36 - 3.5 * p];
  floor();
  fig({ S: S, H: H, hn: [S[0] + 8.5, 57.4], en: [S[0] + 0.6, 56.8], hf: [S[0] + 1, S[1] - 15.5], ef: [S[0] + 1.4, S[1] - 7.5], an: A, af: [A[0] - 0.5, A[1] - 0.4], ed: 1, kd: -1, tn: [A[0] + 1.8, 59.3], tf: [A[0] + 0.8, 59] });
  glow(H[0] - 1, H[1] + 2, 8, p);
};
K.climber = function (p, t, o) {
  var ph = t / 230, q = 0.5 + 0.5 * Math.sin(ph);
  var S = [50, 42.5], A = [S[0] - Math.sqrt(36 * 36 - 15 * 15), 57.5];
  var H = [A[0] + (S[0] - A[0]) * 22 / 36, A[1] + (S[1] - A[1]) * 22 / 36];
  floor();
  function ft(k) { return [lerp(A[0], H[0] + 4, k), lerp(A[1], 55.5, k) - 3 * Math.sin(k * 3.1416)]; }
  var an = ft(q), af = ft(1 - q);
  fig({ S: S, H: H, hn: [S[0] + 1, 58], en: [S[0] + 0.6, 50.2], an: an, af: af, ed: -1, kd: 1, tn: [an[0] + 2, an[1] + 2], tf: [af[0] + 2, af[1] + 2] });
  glow((S[0] + H[0]) / 2, (S[1] + H[1]) / 2 + 2, 8, 0.5 + 0.4 * Math.sin(ph));
};
K.bicycle = function (p, t, o) {
  var ph = t / 300, H = [40, 55.6];
  var S = [H[0] - Math.cos(0.7) * TO, H[1] - Math.sin(0.7) * TO];
  floor();
  function leg(q) { var c = Math.cos(q), s = Math.sin(q); return [H[0] + 11 * Math.cos(0.35 + 0.0) + 9 * c - 8 * 0, H[1] - 11 * 0.35 - 9 * s * 0.0]; }
  var qa = Math.sin(ph), qb = Math.sin(ph + Math.PI);
  function ank(q) { return [H[0] + 3 + (10 + 9 * q) * 0.9, H[1] - 4 - (8 - 6 * q) + (q > 0 ? 0 : 0)]; }
  var a1 = [H[0] + 9 + 9 * (0.5 + 0.5 * qa), H[1] - 12 + 8 * (0.5 + 0.5 * qa)];
  var a2 = [H[0] + 9 + 9 * (0.5 + 0.5 * qb), H[1] - 12 + 8 * (0.5 + 0.5 * qb)];
  var dx = S[0] - H[0], dy = S[1] - H[1], dl = hyp(dx, dy), hc = [S[0] + dx / dl * 5.7, S[1] + dy / dl * 5.7];
  fig({ S: S, H: H, hn: [hc[0] + 1, hc[1] + 3], en: [hc[0] + 3, hc[1] + 4], an: a1, af: a2, ed: -1, kd: -1, head: hc, tn: [a1[0] + 3, a1[1] - 1.5], tf: [a2[0] + 3, a2[1] - 1.5] });
  glow((S[0] + H[0]) / 2, (S[1] + H[1]) / 2 - 1, 7, 0.5 + 0.5 * Math.sin(ph * 2));
};
K.hyper = function (p, t, o) {
  var H = [34, 38], l = 1.25 - 1.15 * p, S = [H[0] + Math.sin(l) * TO, H[1] - Math.cos(l) * TO];
  floor();
  pad(24, 42.5, 38, 38.2, 4.2); post(27, 43, 25, 58); post(36, 40.5, 40, 58);
  var hn = [S[0] + 2.6, S[1] + 3.4], en = [S[0] - 0.8, S[1] + 5.8];
  fig({ S: S, H: H, hn: hn, en: en, an: [43, 58], af: [39, 58], ed: 1, kd: -1 });
  glow(H[0] - 0.5, H[1] - 1, 8, p);
};
K.stepup = function (p, t, o) {
  var bx = 34, top = 48;
  pad(bx - 9, top + 2.2, bx + 9, top + 2.2, 4.4); post(bx - 7, top + 4, bx - 7, 58); post(bx + 7, top + 4, bx + 7, 58); floor();
  var H = [bx + 0.5, top - 16.6 - 5.6 * p], S = [H[0] + 1, H[1] - 13.8];
  var an = [bx + 1, top], af = [bx - 10 + 6 * p, 58 - 15 * p];
  var hn = [S[0] + 2, S[1] + 14];
  fig({ S: S, H: H, hn: hn, an: an, af: af, ed: 1, kd: -1, tn: [an[0] + 5, an[1] + 1.3], tf: [af[0] + 5, af[1] + 1.3] });
  dumb(hn[0], hn[1]);
  glow(H[0] + 3, H[1] + 5, 9, p);
};
K.benchdip = function (p, t, o) {
  var S = [27, 30 + 9 * p], H = [S[0] + 2, S[1] + 13.7];
  pad(14, 47.2, 26, 47.2, 3.8); post(17, 48, 17, 58); post(24, 48, 24, 58); floor();
  fig({ S: S, H: H, hn: [23.5, 46], en: [S[0] - 6.5, S[1] + 7 + 3 * p], an: [51, 57.8], af: [48, 57.8], ed: -1, kd: -1, tn: [57.5, 59.3], tf: [54.5, 59.3] });
  glow(S[0], S[1] + 3, 8, p);
};
K.pullthrough = function (p, t, o) {
  var H = [36 - 6 * p, 36.4 + 1.5 * p], l3 = 0.08 + 1.1 * p, S = [H[0] + Math.sin(l3) * TO, H[1] - Math.cos(l3) * TO];
  var hn = [H[0] + 3 - 4 * (1 - p), H[1] + 9 - 6 * p - 3 * (1 - p)];
  floor();
  cable(5, 57, hn[0], hn[1]);
  fig({ S: S, H: H, hn: hn, en: [S[0] + 3, S[1] + 6], an: [40, 58], af: [36, 58], ed: 1, kd: -1 });
  dot(hn[0], hn[1], 2.3, AN.P.gold);
  glow(H[0] + 2, H[1] + 3, 9, p);
};
K.sldl = function (p, t, o) {
  var l = 0.08 + 1.2 * p, H = [36 - 2 * p, 36.2 + 0.6 * p], S = [H[0] + Math.sin(l) * TO, H[1] - Math.cos(l) * TO];
  var fa = [H[0] - 21 * Math.sin(l * 0.95) + 0, H[1] + 21 * Math.cos(l * 0.95)];
  var hn = [S[0] + 1, S[1] + 15.5];
  floor();
  fig({ S: S, H: H, hn: hn, an: [38, 58], af: fa, ed: 1, kd: -1, tn: [43.5, 59.3], tf: [fa[0] - 1, fa[1] - 0.5] });
  dumb(hn[0], hn[1]);
  glow(H[0] + 1, H[1] + 8, 9, p);
};
K.rower = function (p, t, o) {
  var P = AN.P, H = [lerp(36, 23, p), 52.5], l = lerp(0.62, -0.38, p);
  var S = [H[0] + Math.sin(l) * TO, H[1] - Math.cos(l) * TO];
  pad(10, 56.4, 58, 56.4, 2.4); pad(H[0] - 4, 55, H[0] + 4, 55, 3.2);
  pad(52, 50.5, 57, 57, 2.6); floor();
  var hn = [lerp(S[0] + 14.5, S[0] + 4.5, p), S[1] + lerp(8, 9.5, p)];
  var en = [lerp(S[0] + 8, S[0] - 2.5, p), S[1] + lerp(6, 7, p)];
  cable(hn[0], hn[1], 74, 53); dot(74, 53, 3, P.grayD); dot(74, 53, 2.2, P.gray);
  fig({ S: S, H: H, hn: hn, en: en, an: [53.5, 51.5], af: [52, 52], ed: 1, kd: -1, tn: [55.5, 53], tf: [54, 53.5] });
  dot(hn[0], hn[1], 2.2, P.gold);
  glow(H[0] + 4, H[1] + 2, 9, p);
};
K.stairs = function (p, t, o) {
  var P = AN.P, ph = t / 330, s1 = 0.5 + 0.5 * Math.sin(ph), s2 = 1 - s1;
  var H = [36, 36.6 + 1.2 * Math.sin(ph * 2)], S = [H[0] + Math.sin(0.1) * TO, H[1] - Math.cos(0.1) * TO];
  post(52, 18, 52, 46); pad(49, 22, 56, 22, 2);
  pad(26, 58 + 0, 46, 58, 3.2);
  var an = [38, 57 - 9 * s1], af = [38, 57 - 9 * s2];
  floor();
  pad(31, an[1] + 2.2, 45, an[1] + 2.2, 2.4); pad(31, af[1] + 2.2, 45, af[1] + 2.2, 2.4);
  fig({ S: S, H: H, hn: [51, 22.5], en: [S[0] + 7, S[1] + 4], an: [an[0], an[1]], af: [af[0], af[1]], ed: 1, kd: -1, tn: [an[0] + 5, an[1] + 1.3], tf: [af[0] + 5, af[1] + 1.3] });
  glow(H[0] + 3, H[1] + 6, 8, 0.5 + 0.4 * Math.sin(ph));
};
K.elliptical = function (p, t, o) {
  var P = AN.P, ph = t / 360;
  var H = [34, 37], S = [H[0] + Math.sin(0.08) * TO, H[1] - Math.cos(0.08) * TO];
  var an = [34 + 8 * Math.cos(ph), 55 - 2.8 * Math.sin(ph)], af = [34 - 8 * Math.cos(ph), 55 + 2.8 * Math.sin(ph)];
  floor();
  pad(16, 58, 58, 58, 2.6);
  pad(an[0] - 4, an[1] + 2.6, an[0] + 8, an[1] + 2.6, 2.2); pad(af[0] - 4, af[1] + 2.6, af[0] + 8, af[1] + 2.6, 2.2);
  post(54, 20, 54, 58);
  var hx = S[0] + 11 + 4 * Math.cos(ph), hy = S[1] + 4;
  line(hx, hy - 8, 54, 24, 1.6, P.grayD);
  fig({ S: S, H: H, hn: [hx, hy], en: [S[0] + 5, S[1] + 7], an: an, af: af, ed: 1, kd: -1, tn: [an[0] + 4, an[1] + 1.3], tf: [af[0] + 4, af[1] + 1.3] });
  glow(H[0] + 3, H[1] + 6, 8, 0.5 + 0.4 * Math.sin(ph));
};
K.hack = function (p, t, o) {
  var H = [lerp(34.5, 30, p), lerp(37, 50, p)], S = [H[0] - 4.8, H[1] - 13.2];
  floor();
  pad(23, 58, 38.5, 14, 3.6); pad(37, 60, 51, 49, 3);
  var hn = [S[0] + 2, S[1] + 8.5], en = [S[0] - 2, S[1] + 6.5];
  fig({ S: S, H: H, hn: [S[0] + 7.5, S[1] + 6], en: [S[0] + 3, S[1] + 7], an: [44, 57.2], af: [41, 57.2], ed: 1, kd: -1, tn: [48.2, 58.3], tf: [45.2, 58.3] });
  glow(H[0] + 5, H[1] + 3, 9, p);
};
K.declinebench = function (p, t, o) {
  floor();
  pad(10, 51, 50, 44, 3.6); post(14, 52, 14, 58); post(46, 45, 46, 58);
  var S = [22, 46.4], H = [36, 43.8];
  var hn = [S[0] + 2 + 1.2 * p, S[1] - 16 + 12 * p];
  fig({ S: S, H: H, hn: hn, an: [48, 57.8], af: [44, 57.8], ed: 1, kd: -1, tn: [53, 59] });
  plate(hn[0], hn[1], 4.6);
  glow(S[0] + 5, S[1] - 3, 9, p);
};

/* ---- exercise name → animation spec ---- */
function guessAnim(name, group) {
  var k = String(name).toLowerCase();
  var R = [
    [/side plank/, "sideplank"], [/mountain|climber/, "climber"], [/bicycle/, "bicycle"], [/back ext|hyperext|reverse hyper/, "hyper"],
    [/step-?up/, "stepup"], [/bench dip/, "benchdip"], [/pull-?through/, "pullthrough"], [/single.?leg (rdl|romanian)|one.?leg (rdl|romanian)/, "sldl"],
    [/rowing machine|ergometer|concept ?2/, "rower"], [/stair|step ?mill/, "stairs"], [/elliptical|cross.?trainer/, "elliptical"],
    [/hack squat/, "hack"], [/decline/, "declinebench"],
    [/pull-?up|chin-?up/, "pullup"], [/pulldown|pull-down/, "pulldown"], [/face pull/, "facepull"],
    [/rear delt|reverse (pec|fly)/, "reardelt"], [/upright/, "uprow"], [/shrug/, "shrug"],
    [/lateral|side raise/, "lateral"], [/front raise/, "fraise"],
    [/pullover/, "pullover"], [/fly|flye|crossover|pec deck/, "fly|db"],
    [/incline.*(db|dumbbell)/, "bench|dbi"], [/incline/, "bench|bbi"],
    [/dumbbell.*(press|bench)/, "bench|db"], [/bench|chest press/, "bench|bb"],
    [/dip/, "dip"], [/push-?up/, "pushup"],
    [/skull|jm press/, "skull"], [/kickback/, "kickback"], [/pushdown|push-down/, "pushdown"], [/overhead.*(ext|tri)|french/, "overhead|db"],
    [/preacher|concentration|spider/, "curl|preach"], [/curl/, "curl|db"],
    [/wrist/, "wrist"],
    [/hip thrust/, "thrust"], [/bridge/, "bridge"],
    [/romanian|rdl|stiff|pull-?through/, "hinge|rdl"], [/deadlift|rack pull/, "hinge|dl"], [/good ?morning|back ext|hyperext/, "hinge|gm"],
    [/leg press/, "legpress"], [/leg ext/, "leg|ext"], [/seated.*leg curl/, "leg|seat"], [/leg curl|hamstring curl|nordic/, "leg|lie"],
    [/lunge|split squat|step-?up/, "lunge|bw"], [/goblet/, "squat|goblet"], [/front squat/, "squat|front"], [/squat/, "squat|back"],
    [/calf/, "calf"],
    [/inverted row/, "invrow"], [/cable row|seated row|machine row|rowing/, "seatrow"], [/t-?bar|seal/, "row|tbar"], [/dumbbell row|one-arm/, "row|db"], [/row/, "row|bb"],
    [/overhead press|shoulder press|military|push press|arnold/, "ohp|bb"],
    [/hanging|knee raise/, "hang"], [/leg raise/, "lyleg"], [/plank|rollout/, "plank"], [/sit-?up/, "crunch|situp"], [/crunch|abs|twist/, "crunch|crunch"],
    [/run|jog|treadmill|stair|elliptical|climber|jump/, "run"], [/cycl|bike/, "bike"]
  ];
  for (var i = 0; i < R.length; i++)if (R[i][0].test(k)) return R[i][1];
  var G = { Chest: "bench|bb", Back: "row|bb", Shoulders: "ohp|db", Traps: "shrug", Biceps: "curl|db", Triceps: "pushdown", Forearms: "wrist", Legs: "squat|back", Glutes: "thrust", Calves: "calf", Core: "crunch|crunch", Cardio: "run" };
  return G[group] || "curl|db";
}
function animSpec(name) {
  var L = LIBMAP[name];
  if (!L) { var cl = (state && state.customLib) || []; for (var i = 0; i < cl.length; i++)if (cl[i][0] === name) { L = cl[i]; break; } }
  if (L && L[6]) return L[6];
  return guessAnim(name, L ? L[1] : "");
}

function renderPose(c, spec, p, t, dark) {
  AN.C = c; AN.P = pal(dark);
  c.clearRect(0, 0, 82, 66);
  var a = String(spec).split("|"), fn = K[a[0]] || K.curl;
  c.lineCap = "round"; c.lineJoin = "round";
  fn(p, t, a[1] || "");
}

function drawBiomechanicalExercise(canvas, exName, scale) {
  scale = scale || 1;
  var dpr = Math.min(3, window.devicePixelRatio || 2);
  var W = canvas.width = Math.round(82 * scale * dpr), H = canvas.height = Math.round(66 * scale * dpr);
  canvas.style.width = (82 * scale) + "px"; canvas.style.height = (66 * scale) + "px";
  var ctx = canvas.getContext("2d");
  var spec = animSpec(exName), gen = animGen;
  var reduce = false; try { reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { }
  var slot = animLoops.length; animLoops.push(0);
  function frame(t) {
    if (gen !== animGen || !canvas.isConnected) return;
    var dark = document.documentElement.getAttribute("data-theme") === "dark" ||
      (!document.documentElement.getAttribute("data-theme") && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var p = tempo(t);
    if (reduce) p = 0.5;
    ctx.setTransform(W / 82, 0, 0, H / 66, 0, 0);
    renderPose(ctx, spec, p, t, dark);
    animLoops[slot] = requestAnimationFrame(frame);
  }
  animLoops[slot] = requestAnimationFrame(frame);
}


/* ---------- LIST THUMBNAILS (one shared loop, visible ones only) ---------- */
var THUMBS = [], thumbRaf = 0, thumbIO = null;
function thumbAnim(canvas, exName) {
  var sc = 0.82, dpr = Math.min(2, window.devicePixelRatio || 1.5);
  canvas.width = Math.round(82 * sc * dpr); canvas.height = Math.round(66 * sc * dpr);
  canvas.style.width = (82 * sc) + "px"; canvas.style.height = (66 * sc) + "px";
  var rec = { c: canvas, ctx: canvas.getContext("2d"), spec: animSpec(exName), vis: true, sc: sc * dpr };
  canvas.__th = rec; THUMBS.push(rec);
  if (window.IntersectionObserver) {
    if (!thumbIO) thumbIO = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.target.__th) e.target.__th.vis = e.isIntersecting; }); });
    rec.vis = false; thumbIO.observe(canvas);
  }
  if (!thumbRaf) thumbRaf = requestAnimationFrame(thumbLoop);
}
function thumbLoop(t) {
  thumbRaf = 0;
  THUMBS = THUMBS.filter(function (r) {
    if (r.c.isConnected) return true;
    if (thumbIO) thumbIO.unobserve(r.c); return false;
  });
  if (!THUMBS.length) return;
  var de = document.documentElement.getAttribute("data-theme");
  var dark = de === "dark" || (!de && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  var p = tempo(t);
  THUMBS.forEach(function (r) {
    if (!r.vis) return;
    r.ctx.setTransform(r.sc, 0, 0, r.sc, 0, 0);
    renderPose(r.ctx, r.spec, p, t, dark);
  });
  thumbRaf = requestAnimationFrame(thumbLoop);
}
