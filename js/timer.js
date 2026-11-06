// Rest timer, beeps, notifications and screen wake lock.
// Classic script sharing the page's global scope; see README for load order.

/* ---------- AUDIO + REST TIMER + ALERTS ---------- */
var rest = { end: 0, total: 90, iv: null, name: "" };
var actx = null, wake = null, goT = 0;
function audioCtx() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
  return actx;
}
function unlockAudio() { var c = audioCtx(); if (c && c.state === "suspended") { try { c.resume(); } catch (e) { } } }
["pointerdown", "touchend", "click"].forEach(function (ev) { document.addEventListener(ev, unlockAudio, { passive: true }); });
function beep() {
  try {
    var ctx = audioCtx(); if (!ctx) return; if (ctx.state === "suspended") ctx.resume();
    [520, 660, 880].forEach(function (freq, i) {
      var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.14;
      o.frequency.value = freq; o.type = "triangle";
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.13);
    });
  } catch (e) { }
}
function showNotif(title, body) {
  title = trText(title); body = trText(body);
  var o = { body: body, icon: "icon-192.png", badge: "icon-192.png", tag: "gymlog", renotify: true, vibrate: [200, 100, 200] };
  function direct() { try { new Notification(title, o); } catch (e) { } }
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then(function (r) { if (r && r.showNotification) return r.showNotification(title, o); direct(); }).catch(direct);
    } else direct();
  } catch (e) { direct(); }
}
function notifyOK() { return !!state.notify && ("Notification" in window) && Notification.permission === "granted"; }
function holdScreen() {
  if (!state.keepAwake || !navigator.wakeLock || wake) return;
  try { navigator.wakeLock.request("screen").then(function (l) { wake = l; l.addEventListener("release", function () { wake = null; }); }).catch(function () { }); } catch (e) { }
}
// Focus mode keeps the screen on for the whole workout, not just during rest.
function freeScreen() { if (typeof focusActive !== "undefined" && focusActive) return; if (wake) { try { wake.release(); } catch (e) { } wake = null; } }
function endRestUI() {
  clearTimeout(goT); $("rest").hidden = true; $("rest").classList.remove("go"); freeScreen();
  if (typeof dockRest === "function") dockRest();
}
function startRest(sec, name) {
  clearTimeout(goT);
  rest.total = sec || 90; rest.end = Date.now() + rest.total * 1000; rest.name = name || "";
  var el = $("rest"); el.hidden = false; el.classList.remove("go"); el.style.setProperty("--p", "0");
  $("rlabel").textContent = "Rest";
  if (rest.iv) clearInterval(rest.iv);
  rest.iv = setInterval(tickRest, 250); tickRest(); holdScreen();
}
function tickRest() {
  var left = Math.max(0, Math.ceil((rest.end - Date.now()) / 1000));
  $("rtime").textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
  $("rest").classList.toggle("soon", left > 0 && left <= 5);
  if (typeof dockRest === "function") dockRest();
  $("rest").style.setProperty("--p", String(Math.min(100, Math.max(0, (1 - (rest.end - Date.now()) / (rest.total * 1000)) * 100)).toFixed(1)));
  if (left <= 0) {
    clearInterval(rest.iv); rest.iv = null; $("rlabel").textContent = "GO!"; $("rest").classList.remove("soon"); $("rest").classList.add("go");
    if (typeof dockRest === "function") dockRest();
    beep(); try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { }
    if (document.hidden && notifyOK()) showNotif("Rest over — GO! 💪", rest.name ? ("Next set: " + rest.name) : "Time for your next set");
    freeScreen();
    goT = setTimeout(endRestUI, 3200);
  }
}
document.addEventListener("visibilitychange", function () {
  if (!document.hidden && rest.iv) { holdScreen(); tickRest(); }
});
$("r-15").onclick = function () { rest.end = Math.max(Date.now() + 1000, rest.end - 15000); tickRest(); };
$("r+15").onclick = function () { rest.end += 15000; rest.total += 15; tickRest(); };
$("rskip").onclick = function () { if (rest.iv) clearInterval(rest.iv); rest.iv = null; endRestUI(); };
