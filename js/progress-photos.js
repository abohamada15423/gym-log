// Progress photos (docs/coach-plan.md, phase 5): front, side and back with a check-in, and a before/after
// comparison, drawn the same way in the app and on the coach page.
//
// In the app the files are kept on the phone (IndexedDB) and, with an account, in the client's private
// folder in Storage too (sync.js uploads them). The coach page reads them through short-lived signed links.
// Each page says how a photo is shown by setting photoSource:
//   url(name) -> Promise of an address for <img src>, or null when it can't be had right now
// A check-in's photos are {front, side, back: file name}; in Storage the file is '<client id>/<name>'.
// Classic script sharing the page's global scope.

var POSES = [["front", "Front"], ["side", "Side"], ["back", "Back"]];
var PHOTO_NAME = /^\d{4}-\d{2}-\d{2}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$/;
var photoSource = null;

/* ---------- the files on this phone ---------- */
// One IndexedDB store of Blobs by file name. The tests swap photoFiles for one in memory.
var photoDbOpen = null;
function photoDb() {
  if (photoDbOpen) return photoDbOpen;
  photoDbOpen = new Promise(function (resolve, reject) {
    if (!window.indexedDB) { reject(new Error("This browser can't keep photos")); return; }
    var rq = indexedDB.open("gymlog-photos", 1);
    rq.onupgradeneeded = function () { rq.result.createObjectStore("files"); };
    rq.onsuccess = function () { resolve(rq.result); };
    rq.onerror = function () { reject(rq.error || new Error("This browser can't keep photos")); };
  });
  photoDbOpen.catch(function () { photoDbOpen = null; });
  return photoDbOpen;
}
function photoTx(mode, fn) {
  return photoDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction("files", mode), rq = fn(tx.objectStore("files"));
      tx.oncomplete = function () { resolve(rq ? rq.result : undefined); };
      tx.onerror = tx.onabort = function () { reject(tx.error || new Error("Couldn't keep the photo")); };
    });
  });
}
var photoFiles = {
  get: function (name) { return photoTx("readonly", function (st) { return st.get(name); }).then(function (b) { return b || null; }); },
  put: function (name, blob) { return photoTx("readwrite", function (st) { st.put(blob, name); }); },
  del: function (names) { return names.length ? photoTx("readwrite", function (st) { names.forEach(function (n) { st.delete(n); }); }) : Promise.resolve(); },
  keys: function () { return photoTx("readonly", function (st) { return st.getAllKeys(); }).then(function (k) { return k || []; }); }
};

/* ---------- a check-in's photos ---------- */
// {front, side, back} with only well-formed file names, or null when there are none.
function cleanPhotos(p) {
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  var out = null;
  POSES.forEach(function (x) { if (typeof p[x[0]] === "string" && PHOTO_NAME.test(p[x[0]])) (out = out || {})[x[0]] = p[x[0]]; });
  return out;
}
function photoNames(p) { p = cleanPhotos(p); return p ? POSES.map(function (x) { return p[x[0]]; }).filter(Boolean) : []; }
// Check-ins that have photos, oldest first.
function photoCheckins(list) {
  return (list || []).filter(function (b) { return b && cleanPhotos(b.photos); }).slice()
    .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
}
// The weight that goes with a photo: its own check-in's, or another one from the same day.
function photoKg(b, all) {
  if (b.kg != null) return b.kg;
  var same = (all || []).filter(function (x) { return x.date === b.date && x.kg != null; })[0];
  return same ? same.kg : null;
}
function photoWhen(b, all) { var kg = photoKg(b, all); return mbDay(b.date) + (kg != null ? " · " + mbFmt(kg) + " kg" : ""); }

/* ---------- taking a photo ---------- */
// At most 1080 pixels on the long side, the right way up, and re-encoded on the phone, which also drops
// what the camera wrote into the file (location included). WebP where the browser can make it, else JPEG.
function photoShrink(file) {
  var decode = window.createImageBitmap
    ? createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () { return createImageBitmap(file); })
    : new Promise(function (resolve, reject) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () { URL.revokeObjectURL(u); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(u); reject(new Error("not an image")); };
      img.src = u;
    });
  return decode.then(function (src) {
    var w = src.naturalWidth || src.width, ht = src.naturalHeight || src.height, k = Math.min(1, 1080 / Math.max(w, ht));
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(ht * k));
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    if (src.close) src.close();
    var enc = function (type, q) { return new Promise(function (resolve) { c.toBlob(resolve, type, q); }); };
    return enc("image/webp", 0.82).then(function (b) { return b && b.type === "image/webp" ? b : enc("image/jpeg", 0.85); });
  }).then(function (b) { if (!b) throw new Error("not an image"); return b; });
}
function photoName(date, blob) { return date + "-" + rid() + (blob.type === "image/webp" ? ".webp" : ".jpg"); }

// Front, side and back for a new check-in. .picked() gives {pose: Blob}; .clear() empties the slots.
function photoSlots() {
  var picked = {}, urls = {}, el = h("div", { class: "ph-slots", role: "group", "aria-label": "Photos" });
  function paint() {
    el.textContent = "";
    POSES.forEach(function (p) {
      var input = h("input", { type: "file", accept: "image/*", class: "ph-file", tabindex: "-1", "aria-hidden": "true" });
      var slot;
      if (picked[p[0]]) {
        var x = h("button", { class: "ph-x", type: "button", "aria-label": "Remove the " + p[1].toLowerCase() + " photo", text: "✕" });
        x.onclick = function () { URL.revokeObjectURL(urls[p[0]]); delete picked[p[0]]; delete urls[p[0]]; paint(); };
        slot = h("div", { class: "ph-slot filled" }, [h("img", { src: urls[p[0]], alt: p[1] + " photo" }), h("span", { class: "ph-pose", text: p[1] }), x]);
      } else {
        slot = h("button", { class: "ph-slot", type: "button", "aria-label": "Add a " + p[1].toLowerCase() + " photo" }, [
          h("span", { class: "ph-cam", "aria-hidden": "true", html: '<svg viewBox="0 0 24 24"><path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4z"/><circle cx="12" cy="13.2" r="3.4"/></svg>' }),
          h("span", { class: "ph-pose", text: p[1] })
        ]);
        slot.onclick = function () { input.click(); };
      }
      input.onchange = function () {
        var f = input.files && input.files[0]; if (!f) return;
        slot.classList.add("busy");
        photoShrink(f).then(function (blob) {
          if (urls[p[0]]) URL.revokeObjectURL(urls[p[0]]);
          picked[p[0]] = blob; urls[p[0]] = URL.createObjectURL(blob); paint();
        }, function () { slot.classList.remove("busy"); toast("That photo couldn't be read. Try another one.", 3200); });
      };
      el.appendChild(h("div", { class: "ph-cell" }, [slot, input]));
    });
  }
  paint();
  el.picked = function () { return picked; };
  el.clear = function () { Object.keys(urls).forEach(function (k) { URL.revokeObjectURL(urls[k]); }); picked = {}; urls = {}; paint(); };
  return el;
}

/* ---------- showing photos ---------- */
// One photo, filled in when its file is ready; a plain note when it can't be had (offline, say).
function photoImg(name, alt) {
  var img = h("img", { alt: alt || "", decoding: "async", draggable: "false" });  // a press is for the slider, not for dragging the picture away
  var box = h("span", { class: "ph-frame loading" }, [img, h("span", { class: "ph-missing", text: "Photo not available right now" })]);
  if (!photoSource || !name) { box.className = "ph-frame missing"; return box; }
  photoSource.url(name).then(function (u) {
    box.classList.remove("loading");
    if (u) img.src = u; else box.classList.add("missing");
  }, function () { box.classList.remove("loading"); box.classList.add("missing"); });
  return box;
}
// Small pictures of one check-in's photos; a tap opens the photo large.
function photoThumbs(b, all) {
  var p = cleanPhotos(b.photos); if (!p) return null;
  var row = h("div", { class: "ph-thumbs" });
  POSES.forEach(function (x) {
    if (!p[x[0]]) return;
    var t = h("button", { class: "ph-thumb", type: "button", "aria-label": x[1] + " photo, " + photoWhen(b, all) }, [photoImg(p[x[0]], "")]);
    t.onclick = function () { openPhoto(p[x[0]], x[1], b, all); };
    row.appendChild(t);
  });
  return row;
}
function openPhoto(name, poseLabel, b, all) {
  var box = $("mbox"); box.textContent = "";
  var close = h("button", { class: "btn ghost sm", type: "button", text: "✕", "aria-label": "Close" });
  close.onclick = closeModal;
  box.appendChild(h("div", { class: "mhead" }, [h("div", { class: "mtitle", text: poseLabel }), close]));
  box.appendChild(h("div", { class: "ph-view" }, [photoImg(name, poseLabel + ", " + photoWhen(b, all))]));
  box.appendChild(h("p", { class: "ph-cap", text: photoWhen(b, all) }));
  $("modal").setAttribute("aria-label", poseLabel);
  var before = modalOnClose;
  modalOnClose = function () { $("modal").setAttribute("aria-label", "Workout details"); if (before) before(); };
  $("modal").hidden = false;
  close.focus({ preventScroll: true });
}

/* ---------- before and after ---------- */
// One pose at a time: the later photo slides over the earlier one. Drag across the photos, or use the slider
// under them (arrow keys work there). Which check-ins to compare can be picked; first and latest to start.
function photoCompare(all) {
  var list = photoCheckins(all);
  var poses = POSES.filter(function (p) { return list.some(function (b) { return cleanPhotos(b.photos)[p[0]]; }); });
  if (!poses.length) return null;
  var wrap = h("div", { class: "ph-compare" }), pose = poses[0][0], from = null, to = null, at = 50;
  function forPose() { return list.filter(function (b) { return cleanPhotos(b.photos)[pose]; }); }
  function label(k) { return poses.filter(function (p) { return p[0] === k; })[0][1]; }
  function paint() {
    wrap.textContent = "";
    var have = forPose();
    if (from && have.indexOf(from) < 0) from = null;
    if (to && have.indexOf(to) < 0) to = null;
    from = from || have[0]; to = to || have[have.length - 1];
    if (poses.length > 1) {
      var chips = h("div", { class: "mchips ph-poses", role: "group", "aria-label": "Pose" });
      poses.forEach(function (p) {
        var b = h("button", { class: "btn ghost", type: "button", "aria-pressed": String(p[0] === pose), text: p[1] });
        b.onclick = function () { if (pose !== p[0]) { pose = p[0]; from = to = null; paint(); } };
        chips.appendChild(b);
      });
      wrap.appendChild(chips);
    }
    if (have.length < 2) {
      wrap.appendChild(h("div", { class: "ph-stage one" }, [photoImg(cleanPhotos(have[0].photos)[pose], label(pose) + ", " + photoWhen(have[0], all))]));
      wrap.appendChild(h("p", { class: "ph-cap", text: photoWhen(have[0], all) }));
      wrap.appendChild(h("p", { class: "note", text: "Add another check-in with a " + label(pose).toLowerCase() + " photo to compare." }));
      return;
    }
    function pick(which, value) {
      var sel = h("select", { "aria-label": which === "from" ? "Before" : "After" });
      have.forEach(function (b, i) { sel.appendChild(h("option", { value: String(i), text: mbDay(b.date) })); });  // the weight is in the captions
      sel.value = String(have.indexOf(value));
      sel.onchange = function () { if (which === "from") from = have[+sel.value]; else to = have[+sel.value]; paint(); };
      return h("label", {}, [which === "from" ? "Before" : "After", sel]);
    }
    wrap.appendChild(h("div", { class: "grid2 ph-picks" }, [pick("from", from), pick("to", to)]));
    var top = h("div", { class: "ph-top" }, [photoImg(cleanPhotos(to.photos)[pose], "After, " + photoWhen(to, all))]);
    var line = h("div", { class: "ph-line", "aria-hidden": "true" }, [h("i")]);
    var stage = h("div", { class: "ph-stage" }, [photoImg(cleanPhotos(from.photos)[pose], "Before, " + photoWhen(from, all)), top, line,
      h("span", { class: "ph-tag before", text: "Before" }), h("span", { class: "ph-tag after", text: "After" })]);
    var range = h("input", { type: "range", min: "0", max: "100", step: "1", value: String(at), class: "ph-range", "aria-label": "Slide between before and after" });
    function set(v) {
      at = Math.max(0, Math.min(100, Math.round(v)));
      var rtl = document.documentElement.dir === "rtl";
      // the later photo shows from the handle to the end of the line (the left in Arabic)
      top.style.clipPath = rtl ? "inset(0 " + at + "% 0 0)" : "inset(0 0 0 " + at + "%)";
      line.style.insetInlineStart = at + "%";
      range.value = String(at);
    }
    range.oninput = function () { set(+range.value); };
    // dragging on the photos themselves; up and down still scroll the page
    stage.onpointerdown = function (e) {
      e.preventDefault();  // no picture drag or text selection
      var r = stage.getBoundingClientRect(), rtl = document.documentElement.dir === "rtl";
      var move = function (ev) { var x = (ev.clientX - r.left) / r.width * 100; set(rtl ? 100 - x : x); };
      move(e);
      stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
      stage.onpointermove = move;
      stage.onpointerup = stage.onpointercancel = function () { stage.onpointermove = null; };
    };
    wrap.appendChild(stage);
    wrap.appendChild(range);
    wrap.appendChild(h("div", { class: "ph-caps" }, [
      h("span", {}, [h("b", { text: "Before" }), " ", photoWhen(from, all)]),
      h("span", {}, [h("b", { text: "After" }), " ", photoWhen(to, all)])
    ]));
    set(at);
  }
  paint();
  return wrap;
}
