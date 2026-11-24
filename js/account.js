// Account screens: sign in, create an account, reset the password, join a coach, sign out and delete
// the account, plus the header's sync status and the Account card on the Plan tab.
// The work itself (Supabase, sync) is in sync.js; this file draws the screens and wires them up.
// Classic script sharing the page's global scope; see README for load order.

var ICON_USER = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.4" r="3.7"/><path d="M4.6 20.2c1.2-3.9 4-5.8 7.4-5.8s6.2 1.9 7.4 5.8"/></svg>';
var ICON_MAIL = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="11" width="36" height="26" rx="5"/><path d="M8 14l16 12 16-12"/></svg>';

function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
function privacyHref() { return "privacy.html" + (state.lang === "ar" ? "#ar" : ""); }

/* ---------- header: sync status and the account / coach button ---------- */
function paintAccount() {
  var b = $("acct"), cn = $("coach-name"); if (!b) return;
  var coach = sync.uid ? sync.coach : null;
  b.classList.toggle("on", !!sync.uid);
  b.classList.toggle("has-coach", !!coach);
  b.setAttribute("translate", "no");
  if (coach) b.textContent = initials(coach.name) || "C";
  else if (sync.uid) b.textContent = initials(sync.name || sync.email) || "✓";
  else b.innerHTML = ICON_USER;
  if (cn) {
    // the coach's name opens the comments; a lime dot says something new is waiting there
    var unread = coach ? syncUnread() : 0;
    cn.hidden = !coach;
    cn.textContent = coach ? (coach.name ? "Coach " + coach.name : "Your coach") : "";
    cn.classList.toggle("unread", unread > 0);
    cn.setAttribute("aria-label", unread ? "Comments · " + unread + " new" : "Comments");
  }
  b.setAttribute("aria-label", sync.uid ? "Account and sync" : "Sign in");
  paintSyncStatus();
}
function paintSyncStatus() {
  var st = $("status"); if (!st) return;
  if (sync.uid) { st.textContent = syncStatusText(); st.setAttribute("data-phase", sync.ask ? "ask" : syncRt.phase); }
  else st.removeAttribute("data-phase");
  var card = $("acct-card"); if (card) fillAccountCard(card);
}

/* ---------- the Account card on the Plan tab ---------- */
function renderAccountCard(root) {
  root.appendChild(h("h2", { text: "Account" }));
  var card = h("div", { class: "card acct-card", id: "acct-card" });
  fillAccountCard(card);
  root.appendChild(card);
}
function fillAccountCard(card) {
  card.textContent = "";
  if (!sync.uid) {
    card.appendChild(h("div", { class: "acct-pitch" }, [
      h("b", { text: "Save your log online" }),
      h("p", { text: "Use it on more than one phone, and let your coach follow your training and meals." })
    ]));
    var go = h("button", { class: "btn", type: "button", text: "Sign in or create account" });
    go.onclick = function () { openAccount("signin"); };
    card.appendChild(go);
    return;
  }
  card.appendChild(whoBlock());
  card.appendChild(h("div", { class: "acct-sync", "data-phase": sync.ask ? "ask" : syncRt.phase, text: syncLine() }));
  if (sync.coach) card.appendChild(h("div", { class: "acct-coach" }, [h("span", { class: "acct-av sm", "aria-hidden": "true", text: initials(sync.coach.name) || "C" }), sync.coach.name ? "Coach " + sync.coach.name : "Your coach"]));
  var open = h("button", { class: "btn ghost", type: "button", text: sync.ask ? "Choose" : "Account settings" });
  open.onclick = function () { openAccount(sync.ask ? "upload" : "account"); };
  card.appendChild(open);
}
function whoBlock() {
  var main = sync.name || sync.email || "Signed in";
  return h("div", { class: "acct-who" }, [
    h("span", { class: "acct-av", "aria-hidden": "true", text: initials(main) || "✓" }),
    h("div", {}, [
      h("b", { text: main, translate: "no" }),
      sync.name && sync.email ? h("small", { text: sync.email, translate: "no" }) : null,
      sync.role === "coach" ? h("span", { class: "pill gold", text: "Coach account" }) : null
    ])
  ]);
}
function ago(t) {
  var s = Math.max(0, (Date.now() - msOf(t)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.round(s / 60) + " min ago";
  if (s < 86400) return Math.round(s / 3600) + " h ago";
  return "on " + String(t).slice(0, 10);
}
function syncLine() {
  if (sync.ask) return "Choose where this phone's data goes";
  var n = syncPending(), rj = Object.keys(sync.rejected).length, held = Object.keys(sync.hold).length, parts = [];
  if (syncRt.phase === "signin") parts.push("Sign in to sync");
  else if (n) parts.push(n === 1 ? "1 change waiting to upload" : n + " changes waiting to upload");
  else if (sync.lastSync) parts.push("Last synced " + ago(sync.lastSync));
  else parts.push(syncStatusText() || "Syncing…");
  if (rj) parts.push(rj === 1 ? "1 item couldn't upload" : rj + " items couldn't upload");
  if (held) parts.push(held === 1 ? "1 item kept on this phone only" : held + " items kept on this phone only");
  return parts.join(" · ");
}

/* ---------- the account sheet ---------- */
function field(label, input) { return h("label", {}, [label, input]); }
function emailIn(v) { return h("input", { type: "email", autocomplete: "email", autocapitalize: "none", spellcheck: "false", inputmode: "email", placeholder: "you@example.com", value: v || "" }); }
function passIn(ac) { return h("input", { type: "password", autocomplete: ac, minlength: "8" }); }
function formErr() { var e = h("div", { class: "form-err", role: "alert" }); e.hidden = true; return e; }
function showErr(el, msg) { el.textContent = msg || ""; el.hidden = !msg; }
function busyBtn(btn, on) { btn.disabled = on; btn.classList.toggle("busy", on); }
function authMsg(e) {
  var code = String(e && e.code || ""), m = String(e && e.message || "");
  if (isNetLike(e)) return "No connection. Check your internet and try again.";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(m)) return "Wrong email or password";
  if (code === "email_not_confirmed" || /not confirmed/i.test(m)) return "Confirm your email first. Check your inbox for the link.";
  if (code === "user_already_exists" || code === "email_exists" || /already registered/i.test(m)) return "This email already has an account. Sign in instead.";
  if (code === "over_email_send_rate_limit" || /email rate limit/i.test(m)) return "Too many emails were sent. Try again in an hour.";
  if (code === "over_request_rate_limit" || e && e.status === 429) return "Too many tries. Wait a few minutes and try again.";
  if (code === "weak_password" || /password should/i.test(m)) return "That password is too easy to guess. Choose another.";
  if (code === "same_password") return "Choose a password you haven't used here before";
  if (code === "email_address_invalid" || /email address .* invalid|invalid email/i.test(m)) return "Enter a valid email";
  if (code === "signup_disabled") return "New accounts are switched off for now";
  return "Something went wrong. Try again.";
}
// Messages from the server's own checks (accept_invite) are written for people, so they are shown as they are.
function serverMsg(e) {
  if (isNetLike(e)) return "No connection. Check your internet and try again.";
  if (e && e.auth) return "Sign in again first";
  return String(e && e.message || "Something went wrong. Try again.");
}

/* ---------- comments with the coach (phase 4) ---------- */
var cmOpen = null;  // the thread on screen, if any
function openComments() {
  if (!sync.uid) { openAccount("signin"); return; }
  acctOpen = "comments";
  var box = $("mbox"); box.textContent = "";
  var close = h("button", { class: "btn ghost sm", type: "button", text: "✕", "aria-label": "Close" });
  close.onclick = closeModal;
  box.appendChild(h("div", { class: "mhead" }, [h("div", { class: "mtitle", text: appComments.them() }), close]));
  if (!sync.coach) box.appendChild(h("p", { class: "acct-note", text: "You don't have a coach right now. Your earlier comments stay here." }));
  cmOpen = commentThread({
    placeholder: "Write to your coach…", label: "Comment for your coach",
    empty: "No comments yet. Ask your coach about a workout, your meals or anything else."
  });
  if (!sync.coach) cmOpen.querySelector("form").hidden = true;  // nobody to write to
  box.appendChild(cmOpen);
  $("modal").setAttribute("aria-label", "Comments");
  modalOnClose = function () { acctOpen = null; cmOpen = null; $("modal").setAttribute("aria-label", "Workout details"); paintAccount(); if (syncRt.renderLater) syncRender(); };
  $("modal").hidden = false;
  cmOpen.toEnd();
  close.focus({ preventScroll: true });
}
// sync.js calls this when the thread changed: redraw it if it's open, and the dot in the header.
function commentsChanged() { if (cmOpen && cmOpen.isConnected) cmOpen.repaint(); paintAccount(); }
// Comments under a workout, a day of meals or a check-in: with a coach, or where some were written before.
function cmHere(type, ref) { return !!sync.uid && !sync.ask && (!!sync.coach || cmOn(type, ref).length > 0); }

/* ---------- notifications and training reminders, on the Plan tab (phase 4) ---------- */
function onOff(title, sub, on) {
  var sw = h("span", { class: "sw" + (on ? " on" : "") });
  return h("button", { class: "qpill" + (on ? " on" : ""), type: "button", "aria-pressed": String(on) }, [h("div", {}, [h("b", { text: title }), h("small", { text: sub })]), sw]);
}
// The days someone trained in the last four weeks: a good first guess at their training days.
function guessDays() {
  var from = ymdAdd(today(), -28), seen = {};
  state.sessions.forEach(function (x) { var d = x.date >= from ? ymdParse(x.date) : null; if (d) seen[d.getDay()] = 1; });
  return Object.keys(seen).map(Number).sort();
}
function renderNotifications(root) {
  if (!sync.uid || sync.ask) return;
  root.appendChild(h("h2", { text: "Notifications" }));
  var card = h("div", { class: "card notif-card" });
  root.appendChild(card);
  paintNotifications(card);
}
function paintNotifications(card) {
  card.textContent = "";
  if (!pushSupported()) {
    card.appendChild(h("p", { class: "acct-note", text: pushNeedsInstall()
      ? "On iPhone, notifications work once Gym Log is on your Home Screen: tap Share, then Add to Home Screen, and open it from there."
      : "This browser can't show notifications from Gym Log." }));
    return;
  }
  var on = !!sync.push && Notification.permission === "granted";
  var main = onOff("Notifications on this phone", sync.coach ? "Comments from your coach, new programs, and training reminders" : "Training reminders, and comments once you have a coach", on);
  main.onclick = function () {
    busyBtn(main, true);
    (on ? syncPushOff() : syncPushOn()).then(function () {
      toast(on ? "Notifications off on this phone" : "Notifications on ✓", 2600);
      paintNotifications(card);
    }).catch(function (e) {
      busyBtn(main, false);
      toast(on ? serverMsg(e) : pushMsg(e), 4200);
      paintNotifications(card);
    });
  };
  card.appendChild(main);
  if (!on) {
    if (Notification.permission === "denied") card.appendChild(h("p", { class: "acct-note", text: "Notifications are blocked for Gym Log. Allow them in your browser or phone settings, then turn them on here." }));
    return;
  }
  var r = Object.assign({ on: false, days: [], time: "18:00" }, plainObj(state.reminder) || {});
  function setReminder(change) {
    state.reminder = Object.assign({}, r, change);
    reminderRefresh(); save(); paintNotifications(card);
  }
  var rem = onOff("Remind me on training days", "Only on days you haven't trained yet", !!r.on);
  rem.onclick = function () { setReminder(r.on ? { on: false } : { on: true, days: r.days.length ? r.days : guessDays() }); };
  card.appendChild(rem);
  if (!r.on) return;
  // the week as it's lived here, Saturday first, labelled like the training calendar
  var days = h("div", { class: "rem-days", role: "group", "aria-label": "Training days" });
  var short = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"], long = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  [6, 0, 1, 2, 3, 4, 5].forEach(function (d) {
    var picked = r.days.indexOf(d) > -1, b = h("button", { class: "btn ghost", type: "button", "aria-pressed": String(picked), "aria-label": long[d], text: short[d] });
    b.onclick = function () { setReminder({ days: picked ? r.days.filter(function (x) { return x !== d; }) : r.days.concat([d]).sort() }); };
    days.appendChild(b);
  });
  var time = h("input", { type: "time", value: r.time, step: "300" });
  time.onchange = function () { if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time.value)) setReminder({ time: time.value }); else time.value = r.time; };
  card.appendChild(h("div", { class: "rem-when" }, [days, h("label", { class: "rem-time" }, ["At", time])]));
  card.appendChild(h("p", { class: "acct-note", text: r.days.length ? "You'll get one reminder at that time on each day you picked, unless you've already trained." : "Pick the days you train." }));
}

var ACCT_TITLES = {
  signin: "Your account", signup: "Create account", checkmail: "Check your email", forgot: "Reset your password",
  resetsent: "Check your email", newpass: "Choose a new password", upload: "Add this phone's data?", account: "Your account",
  join: "Join your coach", signout: "Sign out?", del: "Delete your account?"
};
var acctOpen = null;  // which account screen is showing, if any
function openAccount(view, opts) {
  opts = opts || {};
  acctOpen = view;
  var box = $("mbox"); box.textContent = "";
  var close = h("button", { class: "btn ghost sm", type: "button", text: "✕", "aria-label": "Close" });
  close.onclick = closeModal;
  box.appendChild(h("div", { class: "mhead" }, [h("div", { class: "mtitle", text: ACCT_TITLES[view] }), close]));
  var body = h("div", { class: "acct-sheet" });
  box.appendChild(body);
  ACCT_VIEWS[view](body, opts);
  $("modal").setAttribute("aria-label", ACCT_TITLES[view]);
  modalOnClose = function () { acctOpen = null; $("modal").setAttribute("aria-label", "Workout details"); if (syncRt.renderLater) syncRender(); };
  $("modal").hidden = false;
  var first = body.querySelector("input:not([type=checkbox]), button");
  if (first) first.focus({ preventScroll: true });
}
function segTabs(active) {
  var wrap = h("div", { class: "seg", role: "tablist", "aria-label": "Sign in or create account" });
  [["signin", "Sign in"], ["signup", "Create account"]].forEach(function (x) {
    var b = h("button", { type: "button", role: "tab", "aria-selected": String(x[0] === active), text: x[1] });
    b.onclick = function () {
      if (x[0] === active) return;
      var em = $("mbox").querySelector("input[type=email]");
      openAccount(x[0], { email: em ? em.value.trim() : "" });
    };
    wrap.appendChild(b);
  });
  return wrap;
}
function joinForm(code, done) {
  var inp = h("input", { type: "text", autocapitalize: "characters", autocomplete: "off", spellcheck: "false", maxlength: "16", placeholder: "ABCDEFGHJKMN", value: code || "", class: "code-in" });
  inp.oninput = function () { var v = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12); if (v !== inp.value) inp.value = v; };
  var go = h("button", { class: "btn", type: "submit", text: "Join" }), err = formErr();
  var form = h("form", { class: "acct-form", novalidate: "novalidate" }, [field("Invite code", inp), err, go]);
  form.onsubmit = function (e) {
    e.preventDefault();
    var c = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c.length !== 12) { showErr(err, "The code has 12 letters and numbers"); inp.focus(); return; }
    showErr(err, ""); busyBtn(go, true);
    var from = acctOpen;
    syncJoinCoach(c).then(function (coach) {
      paintAccount();
      toast(coach && coach.name ? "You're now training with Coach " + coach.name : "You joined your coach ✓", 3400);
      if (acctOpen !== from) return;  // the sheet was closed or changed meanwhile: leave it be
      if (done) done(); else openAccount("account");
    }).catch(function (e) { busyBtn(go, false); showErr(err, serverMsg(e)); });
  };
  return form;
}

var ACCT_VIEWS = {
  signin: function (body, opts) {
    body.appendChild(h("p", { class: "acct-note", text: sync.invite ? "Your coach invited you. Sign in or create an account to join." : "Sign in to save your log online and share it with your coach." }));
    body.appendChild(segTabs("signin"));
    var em = emailIn(opts.email), pw = passIn("current-password"), err = formErr();
    var go = h("button", { class: "btn", type: "submit", text: "Sign in" });
    var forgot = h("button", { class: "linkbtn", type: "button", text: "Forgot password?" });
    forgot.onclick = function () { openAccount("forgot", { email: em.value.trim() }); };
    var form = h("form", { class: "acct-form", novalidate: "novalidate" }, [field("Email", em), field("Password", pw), err, go, forgot]);
    form.onsubmit = function (e) {
      e.preventDefault();
      var email = em.value.trim();
      if (!validEmail(email)) { showErr(err, "Enter a valid email"); em.focus(); return; }
      if (!pw.value) { showErr(err, "Enter your password"); pw.focus(); return; }
      showErr(err, ""); busyBtn(go, true);
      authSignIn(email, pw.value).then(function () {
        closeModal(); toast("Signed in ✓");
      }).catch(function (x) {
        busyBtn(go, false);
        if (String(x && x.code) === "email_not_confirmed" || /not confirmed/i.test(String(x && x.message))) { openAccount("checkmail", { email: email, unconfirmed: true }); return; }
        showErr(err, authMsg(x));
      });
    };
    body.appendChild(form);
  },

  signup: function (body, opts) {
    if (sync.invite) body.appendChild(h("p", { class: "acct-note", text: "Your coach invited you. Sign in or create an account to join." }));
    body.appendChild(segTabs("signup"));
    var nm = h("input", { type: "text", autocomplete: "name", maxlength: "80" });
    var em = emailIn(opts.email), pw = passIn("new-password"), err = formErr();
    pw.setAttribute("placeholder", "At least 8 characters");
    var agree = h("input", { type: "checkbox" });
    agree.onchange = function () { if (agree.checked) showErr(err, ""); };
    var policy = h("a", { href: privacyHref(), target: "_blank", rel: "noopener", text: "privacy policy" });
    var consent = h("label", { class: "check acct-consent" }, [agree, h("span", {}, ["I agree to the ", policy, ", and to my coach seeing my workouts, meals and body measurements once I join them."])]);
    var go = h("button", { class: "btn", type: "submit", text: "Create account" });
    var form = h("form", { class: "acct-form", novalidate: "novalidate" }, [field("Name", nm), field("Email", em), field("Password", pw), consent, err, go]);
    form.onsubmit = function (e) {
      e.preventDefault();
      var name = nm.value.trim(), email = em.value.trim();
      if (!name) { showErr(err, "Enter your name"); nm.focus(); return; }
      if (!validEmail(email)) { showErr(err, "Enter a valid email"); em.focus(); return; }
      if (pw.value.length < 8) { showErr(err, "Password must be at least 8 characters"); pw.focus(); return; }
      if (!agree.checked) { showErr(err, "Tick the box to agree first"); agree.focus(); return; }
      showErr(err, ""); busyBtn(go, true);
      authSignUp(name, email, pw.value).then(function (d) {
        if (d && d.session) { closeModal(); toast("Account created ✓"); return; }
        // with email confirmation on, an address that already has an account comes back with no identities
        if (d && d.user && Array.isArray(d.user.identities) && !d.user.identities.length) {
          busyBtn(go, false); showErr(err, "This email already has an account. Sign in instead."); return;
        }
        openAccount("checkmail", { email: email });
      }).catch(function (x) { busyBtn(go, false); showErr(err, authMsg(x)); });
    };
    body.appendChild(form);
  },

  checkmail: function (body, opts) {
    body.appendChild(h("div", { class: "acct-mail", html: ICON_MAIL }));
    body.appendChild(h("p", { class: "acct-lead", text: opts.unconfirmed ? "Confirm your email first. Check your inbox for the link." : "We sent a link to " + opts.email + "." }));
    body.appendChild(h("p", { class: "acct-note", text: "Open it to confirm your email. It can open in any browser. Then come back here and sign in with your email and password." }));
    var err = formErr();
    var again = h("button", { class: "btn ghost", type: "button", text: "Send it again" });
    again.onclick = function () {
      busyBtn(again, true);
      authResend(opts.email).then(function () { busyBtn(again, false); toast("Sent ✓ Check your inbox", 2600); })
        .catch(function (x) { busyBtn(again, false); showErr(err, authMsg(x)); });
    };
    var back = h("button", { class: "btn", type: "button", text: "Back to sign in" });
    back.onclick = function () { openAccount("signin", { email: opts.email }); };
    body.appendChild(err);
    body.appendChild(h("div", { class: "grid2" }, [again, back]));
  },

  forgot: function (body, opts) {
    body.appendChild(h("p", { class: "acct-note", text: "We'll email you a link to choose a new password." }));
    var em = emailIn(opts.email), err = formErr();
    var go = h("button", { class: "btn", type: "submit", text: "Send reset link" });
    var back = h("button", { class: "linkbtn", type: "button", text: "Back to sign in" });
    back.onclick = function () { openAccount("signin", { email: em.value.trim() }); };
    var form = h("form", { class: "acct-form", novalidate: "novalidate" }, [field("Email", em), err, go, back]);
    form.onsubmit = function (e) {
      e.preventDefault();
      var email = em.value.trim();
      if (!validEmail(email)) { showErr(err, "Enter a valid email"); em.focus(); return; }
      showErr(err, ""); busyBtn(go, true);
      authReset(email).then(function () { openAccount("resetsent", { email: email }); })
        .catch(function (x) { busyBtn(go, false); showErr(err, authMsg(x)); });
    };
    body.appendChild(form);
  },

  resetsent: function (body, opts) {
    body.appendChild(h("div", { class: "acct-mail", html: ICON_MAIL }));
    body.appendChild(h("p", { class: "acct-lead", text: "We sent a reset link to " + opts.email + "." }));
    body.appendChild(h("p", { class: "acct-note", text: "If it opens in another browser, choose the new password there, then sign in here with it." }));
    var back = h("button", { class: "btn", type: "button", text: "Back to sign in" });
    back.onclick = function () { openAccount("signin", { email: opts.email }); };
    body.appendChild(back);
  },

  newpass: function (body) {
    body.appendChild(h("p", { class: "acct-note", text: "Choose a new password for your account." }));
    var pw = passIn("new-password"), err = formErr();
    pw.setAttribute("placeholder", "At least 8 characters");
    var go = h("button", { class: "btn", type: "submit", text: "Save new password" });
    var form = h("form", { class: "acct-form", novalidate: "novalidate" }, [field("New password", pw), err, go]);
    form.onsubmit = function (e) {
      e.preventDefault();
      if (pw.value.length < 8) { showErr(err, "Password must be at least 8 characters"); pw.focus(); return; }
      showErr(err, ""); busyBtn(go, true);
      authNewPassword(pw.value).then(function () {
        syncRt.recovery = false; closeModal(); toast("Password changed ✓");
        if (sync.ask) acctAskUpload(localCounts());
      }).catch(function (x) { busyBtn(go, false); showErr(err, authMsg(x)); });
    };
    body.appendChild(form);
  },

  upload: function (body, opts) {
    var c = opts.counts || localCounts(), items = [];
    if (c.sessions) items.push(c.sessions === 1 ? "1 workout" : c.sessions + " workouts");
    if (c.food) items.push(c.food === 1 ? "1 food" : c.food + " foods");
    if (c.body) items.push(c.body === 1 ? "1 check-in" : c.body + " check-ins");
    if (c.habits) items.push(c.habits === 1 ? "1 day of habits" : c.habits + " days of habits");
    body.appendChild(h("p", { class: "acct-lead", text: "This phone already has:" }));
    body.appendChild(h("ul", { class: "acct-counts" }, items.map(function (t) { return h("li", { text: t }); })));
    body.appendChild(h("p", { class: "acct-note", text: "Add it to your account to keep it safe online and see it on your other phones. Your coach sees what's in your account." }));
    var add = h("button", { class: "btn", type: "button", text: "Add to my account" });
    var keep = h("button", { class: "btn ghost", type: "button", text: "Keep it on this phone only" });
    add.onclick = function () { closeModal(); syncAdopt(true); toast("Uploading your data…", 2400); paintAccount(); };
    keep.onclick = function () { closeModal(); syncAdopt(false); paintAccount(); };
    body.appendChild(h("div", { class: "acct-stack" }, [add, keep]));
  },

  account: function (body) {
    body.appendChild(whoBlock());
    var now = h("button", { class: "btn ghost sm", type: "button", text: "Sync now" });
    var line = h("div", { class: "acct-sync", "data-phase": syncRt.phase, text: syncLine() });
    now.onclick = function () {
      busyBtn(now, true);
      var t = $("toast"), before = t.hidden ? null : t.textContent;
      syncNow({ pull: true }).then(function (ok) {
        busyBtn(now, false); line.textContent = syncLine(); line.setAttribute("data-phase", syncRt.phase);
        if (!ok && syncRt.phase === "signin") { openAccount("signin", { email: sync.email }); return; }
        // news from the sync itself (say, the coach updated the program) matters more than "up to date"
        if (ok && !t.hidden && t.textContent !== before) return;
        toast(ok ? "Up to date ✓" : syncRt.phase === "offline" ? "No connection. Check your internet and try again." : "Sync problem", 2400);
      });
    };
    body.appendChild(h("div", { class: "acct-row" }, [line, now]));
    if (syncRt.phase === "signin") {
      var again = h("button", { class: "btn", type: "button", text: "Sign in again" });
      again.onclick = function () { openAccount("signin", { email: sync.email }); };
      body.appendChild(again);
    }
    if (Object.keys(sync.hold).length) {
      var up = h("button", { class: "btn ghost", type: "button", text: "Add this phone's data to my account" });
      up.onclick = function () { busyBtn(up, true); syncUploadHeld().then(function () { if (acctOpen === "account") openAccount("account"); }); };
      body.appendChild(up);
    }
    if (Object.keys(sync.rejected).length) body.appendChild(h("p", { class: "acct-note", text: "Some items were refused by the server. Edit them and they'll be sent again." }));

    body.appendChild(h("h3", { class: "acct-h", text: "Your coach" }));
    if (sync.coach) {
      body.appendChild(h("div", { class: "acct-coach" }, [h("span", { class: "acct-av sm", "aria-hidden": "true", text: initials(sync.coach.name) || "C" }), sync.coach.name ? "Coach " + sync.coach.name : "Your coach"]));
      body.appendChild(h("p", { class: "acct-note", text: "Your coach sees your workouts, meals, check-ins and habits." }));
      var unread = syncUnread(), talk = h("button", { class: "btn", type: "button", text: unread ? "Comments · " + unread + " new" : "Comments" });
      talk.onclick = function () { openComments(); };
      body.appendChild(talk);
      var leave = h("button", { class: "btn ghost", type: "button", text: "Leave coach" });
      leave.onclick = function () {
        if (!confirm("Leave your coach? They won't see your new workouts, meals or check-ins.")) return;
        busyBtn(leave, true);
        syncLeaveCoach().then(function () { paintAccount(); toast("You left your coach"); if (acctOpen === "account") openAccount("account"); })
          .catch(function (x) { busyBtn(leave, false); toast(serverMsg(x), 3200); });
      };
      body.appendChild(leave);
    } else if (sync.role === "coach") {
      body.appendChild(h("p", { class: "acct-note", text: "This is a coach account." }));
      body.appendChild(h("a", { class: "btn", href: "coach.html", text: "Open the coach dashboard" }));
    } else {
      body.appendChild(h("p", { class: "acct-note", text: "Enter the code your coach gave you." }));
      body.appendChild(joinForm(sync.invite));
    }

    body.appendChild(h("h3", { class: "acct-h", text: "Your data" }));
    var exp = h("button", { class: "btn ghost", type: "button", text: "Export my data" });
    exp.onclick = exportBackup;
    body.appendChild(exp);
    body.appendChild(h("a", { class: "acct-link", href: privacyHref(), target: "_blank", rel: "noopener", text: "Privacy policy" }));
    var out = h("button", { class: "btn ghost", type: "button", text: "Sign out" });
    out.onclick = function () { openAccount("signout"); };
    var del = h("button", { class: "linkbtn danger", type: "button", text: "Delete account" });
    del.onclick = function () { openAccount("del"); };
    body.appendChild(h("div", { class: "acct-stack" }, [out, del]));
  },

  join: function (body, opts) {
    body.appendChild(h("p", { class: "acct-note", text: "Your coach invited you. Join to share your training and meals with them." }));
    body.appendChild(joinForm(opts.code, function () { closeModal(); }));
  },

  signout: function (body) {
    syncScan();
    var n = syncPending();
    body.appendChild(h("p", { class: "acct-note", text: "Your data stays in your account. Sign in again any time to get it back." }));
    if (n) {
      body.appendChild(h("p", { class: "form-err" }, [h("b", { text: n === 1 ? "1 change isn't uploaded yet" : n + " changes aren't uploaded yet" })]));
      body.appendChild(h("p", { class: "acct-note", text: "Connect to the internet first, or keep the data on this phone." }));
    }
    var wipe = h("input", { type: "checkbox" });
    wipe.checked = !n;
    body.appendChild(h("label", { class: "check" }, [wipe, "Also remove my data from this phone"]));
    var go = h("button", { class: "btn", type: "button", text: "Sign out" });
    var back = h("button", { class: "btn ghost", type: "button", text: "Cancel" });
    back.onclick = function () { openAccount("account"); };
    go.onclick = function () {
      busyBtn(go, true);
      syncSignOut(wipe.checked).then(function () { closeModal(); render(); paintAccount(); toast("Signed out"); });
    };
    body.appendChild(h("div", { class: "grid2" }, [back, go]));
  },

  del: function (body) {
    body.appendChild(h("p", { class: "acct-lead", text: "This permanently deletes your account and everything in it: workouts, meals, check-ins, habits and photos. Your coach won't see them any more." }));
    body.appendChild(h("p", { class: "acct-note", text: "It can't be undone. Export your data first if you want a copy." }));
    var exp = h("button", { class: "btn ghost", type: "button", text: "Export my data" });
    exp.onclick = exportBackup;
    body.appendChild(exp);
    var sure = h("input", { type: "checkbox" }), wipe = h("input", { type: "checkbox" });
    wipe.checked = true;
    body.appendChild(h("label", { class: "check" }, [sure, "I understand this can't be undone"]));
    body.appendChild(h("label", { class: "check" }, [wipe, "Also remove my data from this phone"]));
    var err = formErr();
    var go = h("button", { class: "btn danger", type: "button", text: "Delete my account" });
    go.disabled = true;
    sure.onchange = function () { go.disabled = !sure.checked; };
    var back = h("button", { class: "btn ghost", type: "button", text: "Cancel" });
    back.onclick = function () { openAccount("account"); };
    go.onclick = function () {
      showErr(err, ""); busyBtn(go, true);
      syncDeleteAccount(wipe.checked).then(function () { closeModal(); render(); paintAccount(); toast("Account deleted", 2600); })
        .catch(function (x) { busyBtn(go, !sure.checked); showErr(err, isNetLike(x) ? "You need to be online to delete your account" : serverMsg(x)); });
    };
    body.appendChild(err);
    body.appendChild(h("div", { class: "grid2" }, [back, go]));
  }
};

/* ---------- prompts sync.js asks for ---------- */
// First sign-in on a phone that already has data: upload it, or keep it here.
function acctAskUpload(counts) {
  if (syncRt.recovery) return;  // the new-password screen comes first; it asks again when done
  openAccount("upload", { counts: counts });
  paintAccount();
}
// The password-reset link opened the app.
function acctRecovery() { syncRt.recovery = true; openAccount("newpass"); }
// A coach's invite link, once this phone is signed in.
function acctInvite() {
  if (!sync.uid || !sync.invite) return;
  if (sync.coach) { sync.invite = null; saveSync(); toast("You already have a coach. Leave them before joining another.", 3600); return; }
  if (sync.role === "coach") { sync.invite = null; saveSync(); toast("Coaches cannot join as clients", 3200); return; }
  if (!$("modal").hidden && !acctOpen) return;  // don't cover another dialog; the account sheet offers the code too
  openAccount("join", { code: sync.invite });
}
function acctStart() {
  var b = $("acct"), cn = $("coach-name");
  if (b) b.onclick = function () { openAccount(sync.uid ? (sync.ask ? "upload" : "account") : "signin"); };
  if (cn) cn.onclick = function () { openComments(); };
  paintAccount();
  if (syncRt.urlError) toast(syncRt.urlError === "otp_expired" ? "This link has expired. Sign in, or ask for a new link." : "That link didn't work. Try signing in.", 4200);
  if (sync.uid && sync.ask) acctAskUpload(localCounts());
  else if (syncRt.inviteNow && !sync.uid) openAccount("signup");
  else if (syncRt.inviteNow) acctInvite();
}
