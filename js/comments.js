// Comments between a client and their coach (docs/coach-plan.md, phase 4), drawn the same way in the app
// and on the coach page. Each page says where comments come from and go to by setting commentsSource:
//   me()                    the viewer's account id
//   them()                  the other person, as shown: "Coach Karim" in the app, the client's name for the coach
//   raw                     true when them() is a name to show exactly as written (never translated)
//   all()                   the whole thread, oldest first: {id, author, type, ref, body, at, read, pending, failed}
//   send(type, ref, body)   Promise; the comment shows straight away
//   remove(id)              Promise; only your own
//   seen(ids)               the viewer has now seen these (only the other person's comments count)
//   canWrite()              optional: false while writing is closed (a coach whose client's subscription ended)
// A comment is about a workout (type "session", ref its id), a day of meals ("food_day", ref the date),
// a check-in ("checkin", ref its id) or nothing in particular ("general").
// Classic script sharing the page's global scope.

var commentsSource = null;
var CM_TYPES = { session: 1, food_day: 1, checkin: 1, general: 1 };

function cmAll() { return commentsSource ? commentsSource.all() : []; }
function cmCanWrite() { return !!commentsSource && (!commentsSource.canWrite || commentsSource.canWrite()); }
function cmMine(c) { return !!commentsSource && c.author === commentsSource.me(); }
function cmOn(type, ref) { return cmAll().filter(function (c) { return c.type === type && c.ref === ref; }); }
function cmUnread(list) { return (list || cmAll()).filter(function (c) { return !cmMine(c) && !c.read; }); }
// The viewer has these on screen now.
function cmSeen(list) {
  var ids = cmUnread(list).map(function (c) { return c.id; });
  if (ids.length && commentsSource) commentsSource.seen(ids);
}
function cmDayOf(iso) { var d = new Date(iso); return isNaN(d) ? "" : fmt(d); }
function cmDayLabel(day) { return day === today() ? "Today" : day === ymdAdd(today(), -1) ? "Yesterday" : mbDay(day); }
function cmClock(iso) { var d = new Date(iso); return isNaN(d) ? "" : String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

// What a comment is about, for the thread: ["Push", "Tue 12 Nov"], ["Meals", "Tue 12 Nov"], ...
function cmAbout(c) {
  if (c.type === "session") {
    var s = (state.sessions || []).filter(function (x) { return x.id === c.ref; })[0];
    return s ? [sessionName(s), mbDay(s.date)] : ["A workout that was removed"];
  }
  if (c.type === "food_day") return ["Meals", mbDay(c.ref)];
  if (c.type === "checkin") {
    var b = (state.body || []).filter(function (x) { return x.id === c.ref; })[0];
    return b ? ["Check-in", mbDay(b.date)] : ["A check-in that was removed"];
  }
  return null;
}

// One comment. opts.about: say what it's about (the thread); opts.reply: offer to answer about the same thing;
// opts.clock: the time only (the thread shows the day above it).
function cmNote(c, opts) {
  opts = opts || {};
  var mine = cmMine(c), fresh = !mine && !c.read;
  var note = h("article", { class: "cm" + (mine ? " mine" : " theirs") + (fresh ? " new" : "") });
  var who = mine ? h("b", { text: "You" }) : commentsSource.raw ? h("b", { text: commentsSource.them(), translate: "no" }) : h("b", { text: commentsSource.them() });
  var when = c.failed ? h("span", { class: "cm-bad", text: "Not sent" }) : c.pending ? h("span", { text: "Sending…" })
    : h("span", {}, [opts.clock ? null : h("span", { text: cmDayLabel(cmDayOf(c.at)) }), opts.clock ? null : " ", h("span", { text: cmClock(c.at) })]);
  note.appendChild(h("div", { class: "cm-meta" }, [who, when]));
  var about = opts.about ? cmAbout(c) : null;
  if (about) note.appendChild(h("div", { class: "cm-about" }, [h("span", { text: about.join(" · ") })]));
  // what people wrote: never translated, and laid out in its own direction (English in the Arabic app too)
  note.appendChild(h("p", { class: "cm-body", translate: "no", dir: "auto", text: c.body }));
  var acts = [];
  if (opts.reply && !mine && c.type !== "general" && cmCanWrite()) {
    var rep = h("button", { class: "linkbtn", type: "button", text: "Reply" });
    rep.onclick = function () { opts.reply(c); };
    acts.push(rep);
  }
  if (mine && !c.pending) {
    var del = h("button", { class: "linkbtn", type: "button", text: "Delete" });
    del.onclick = function () {
      if (!confirm("Delete this comment?")) return;
      Promise.resolve(commentsSource.remove(c.id)).then(function () { if (opts.repaint) opts.repaint(); }, function (e) { toast(e && e.message ? e.message : "Couldn't delete. Try again.", 3200); });
    };
    acts.push(del);
  }
  if (acts.length) note.appendChild(h("div", { class: "cm-acts" }, acts));
  return note;
}

// A box to write in. opts.target() says what the comment is about at the moment it's sent.
function cmComposer(opts) {
  opts = opts || {};
  var form = h("form", { class: "cm-compose" });
  var ta = h("textarea", { rows: "2", maxlength: "2000", placeholder: opts.placeholder || "Write a comment…", "aria-label": opts.label || "Your comment" });
  var go = h("button", { class: "btn sm", type: "submit", text: "Send" });
  form.onsubmit = function (e) {
    if (e) e.preventDefault();
    var v = ta.value.trim();
    if (!v) { ta.focus(); return; }
    var t = opts.target ? opts.target() : { type: "general", ref: null };
    go.disabled = true;
    Promise.resolve(commentsSource.send(t.type, t.ref, v)).then(function () {
      ta.value = ""; go.disabled = false;
      if (opts.sent) opts.sent();
    }, function (err) { go.disabled = false; toast(err && err.message ? err.message : "Couldn't send. Try again.", 3200); });
  };
  // Enter makes a new line (people write more than one); Ctrl or Cmd + Enter sends
  ta.onkeydown = function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.onsubmit(); } };
  form.appendChild(ta);
  form.appendChild(go);
  form.input = ta;
  return form;
}

// Under one workout, day of meals or check-in: what was said about it, and a way to add to it.
// opts.later: it starts hidden (inside a closed <details>); call .seen() when it opens.
function commentBlock(type, ref, opts) {
  opts = opts || {};
  var box = h("div", { class: "cm-block" });
  function paint(writing) {
    box.textContent = "";
    var list = cmOn(type, ref);
    list.forEach(function (c) { box.appendChild(cmNote(c, { repaint: function () { paint(false); } })); });
    if (!cmCanWrite()) return;  // read only: what was said stays, nothing new can be added
    if (writing) {
      var f = cmComposer({ placeholder: opts.placeholder, target: function () { return { type: type, ref: ref }; }, sent: function () { paint(false); if (opts.changed) opts.changed(); } });
      var cancel = h("button", { class: "linkbtn", type: "button", text: "Cancel" });
      cancel.onclick = function () { paint(false); };
      f.insertBefore(cancel, f.lastChild);  // Cancel, then Send at the end of the line
      box.appendChild(f);
      f.input.focus();
    } else {
      // answer the other person; after your own words, add to them
      var last = list[list.length - 1];
      var open = h("button", { class: "linkbtn cm-open", type: "button", text: !last ? (opts.cta || "Comment") : cmMine(last) ? "Add a comment" : "Reply" });
      open.onclick = function () { paint(true); };
      box.appendChild(open);
    }
  }
  paint(false);
  box.repaint = function () { paint(false); };
  box.write = function () { paint(true); };
  box.seen = function () { cmSeen(cmOn(type, ref)); };
  if (!opts.later) box.seen();
  return box;
}

// The whole conversation, oldest first, with a box at the bottom. Answering a comment about a workout
// keeps the answer about that workout.
function commentThread(opts) {
  opts = opts || {};
  var wrap = h("div", { class: "cm-thread" }), log = h("div", { class: "cm-log", role: "log", "aria-label": "Comments" });
  var to = null, toLine = h("div", { class: "cm-to" });
  var form = cmComposer({
    placeholder: opts.placeholder, label: opts.label,
    target: function () { return to ? { type: to.type, ref: to.ref } : { type: "general", ref: null }; },
    sent: function () { setTo(null); paint(); toEnd(); }
  });
  function setTo(c) {
    to = c; toLine.textContent = ""; toLine.hidden = !c;
    if (!c) return;
    var x = h("button", { class: "linkbtn", type: "button", text: "✕", "aria-label": "Not about this" });
    x.onclick = function () { setTo(null); form.input.focus(); };
    toLine.appendChild(h("span", {}, [h("span", { text: "About" }), " ", h("b", { text: (cmAbout(c) || []).join(" · ") })]));
    toLine.appendChild(x);
    form.input.focus();
  }
  function toEnd() { log.scrollTop = log.scrollHeight; }
  function paint() {
    log.textContent = "";
    var all = cmAll(), day = null;
    if (!all.length) log.appendChild(h("p", { class: "cm-empty", text: opts.empty || "No comments yet." }));
    all.forEach(function (c) {
      var d = cmDayOf(c.at);
      if (d !== day) { day = d; log.appendChild(h("div", { class: "cm-day", text: cmDayLabel(d) })); }
      log.appendChild(cmNote(c, { about: true, clock: true, reply: setTo, repaint: paint }));
    });
    cmSeen(all);
  }
  setTo(null);
  paint();
  wrap.appendChild(log);
  wrap.appendChild(toLine);
  if (cmCanWrite()) wrap.appendChild(form);
  else if (opts.locked) wrap.appendChild(h("p", { class: "cm-empty", text: opts.locked }));
  wrap.repaint = function () { var end = log.scrollHeight - log.scrollTop - log.clientHeight < 40; paint(); if (end) toEnd(); };
  wrap.toEnd = toEnd;
  wrap.input = form.input;
  return wrap;
}
