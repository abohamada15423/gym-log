// Web Push on this browser (docs/coach-plan.md, phase 4): asking for permission, the browser's subscription
// with the app's VAPID key (js/config.js), and the row a page saves for its account. The server side is
// supabase/migrations/0003_comments_push.sql and supabase/functions/push.
// Classic script sharing the page's global scope; used by the app and the coach page.

function pushSupported() { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && typeof VAPID_PUBLIC_KEY === "string"; }
// iPhones and iPads only show notifications from a web app added to the Home Screen and opened from there.
function pushNeedsInstall() {
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var standalone = navigator.standalone === true || !!(window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  return ios && !standalone;
}
function pushErr(why) { var e = new Error(why); e.push = why; return e; }
function pushKey() {
  var s = VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/"), bin = atob(s + "===".slice((s.length + 3) % 4));
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
// Made with today's key? A subscription made with another key can't receive our notifications.
function pushSameKey(sub) {
  var k = sub && sub.options && sub.options.applicationServerKey;
  if (!k) return true;  // the browser doesn't say: assume it is
  var a = new Uint8Array(k), b = pushKey();
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
function pushRow(sub) { var j = sub.toJSON(); return { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }; }
// Only after a tap: ask, then subscribe. Resolves with {endpoint, p256dh, auth}; rejects with e.push =
// "install" (iPhone, not on the Home Screen), "unsupported" or "blocked".
function pushSubscribe() {
  if (!pushSupported()) return Promise.reject(pushErr(pushNeedsInstall() ? "install" : "unsupported"));
  var ask = Notification.permission === "granted" ? Promise.resolve("granted") : new Promise(function (resolve) {
    var done = false, finish = function (p) { if (!done) { done = true; resolve(p); } };
    try { var r = Notification.requestPermission(finish); if (r && r.then) r.then(finish); } catch (e) { finish("denied"); }
  });
  return ask.then(function (p) {
    if (p !== "granted") throw pushErr("blocked");
    return navigator.serviceWorker.register("sw.js").then(function () { return navigator.serviceWorker.ready; });
  }).then(function (reg) {
    return reg.pushManager.getSubscription().then(function (s) {
      if (s && !pushSameKey(s)) return s.unsubscribe().then(function () { return null; });
      return s;
    }).then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: pushKey() }); });
  }).then(pushRow);
}
// What this browser has right now, without asking anything: null if notifications aren't allowed or
// there is no subscription any more.
function pushCurrent() {
  if (!pushSupported() || Notification.permission !== "granted") return Promise.resolve(null);
  return navigator.serviceWorker.getRegistration().then(function (reg) { return reg ? reg.pushManager.getSubscription() : null; })
    .then(function (s) { return s && pushSameKey(s) ? pushRow(s) : null; })
    .catch(function () { return null; });
}
// Why turning notifications on didn't work, for people.
function pushMsg(e) {
  var why = e && e.push;
  if (why === "install") return "On iPhone, add Gym Log to your Home Screen first, then open it from there.";
  if (why === "unsupported") return "This browser can't show notifications from Gym Log.";
  if (why === "blocked") return "Notifications are blocked. Allow them for this site in your browser or phone settings.";
  if (e && (e.net || /offline|network|fetch/i.test(String(e.message || "")))) return "No connection. Check your internet and try again.";
  return "Couldn't turn notifications on. Try again.";
}
// Notifications the service worker passes on: what was tapped, and that something new arrived.
function pushListen(onOpen, onArrive) {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("message", function (e) {
    var d = e.data || {};
    if (d.type === "open" && onOpen) onOpen(String(d.url || ""));
    if (d.type === "push" && onArrive) onArrive(d);
  });
}
