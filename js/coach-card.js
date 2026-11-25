// A coach as their clients see them (docs/coach-plan.md, phase 7): a logo, or their initials when there
// isn't one, their name and a short bio. The app shows it on the invite, in the header and in the account
// sheet; the coach page shows it on "Your page", with a preview of the invite.
// Classic script sharing the page's global scope.

// Logos are in the public bucket coach-logos, at <coach id>/logo-<random>.<ext>: the database's own rule.
var LOGO_PATH = /^[0-9a-f-]{36}\/logo-[A-Za-z0-9-]{1,40}\.(webp|jpg|png)$/;
var LOGO_SIZE = 400;
function coachLogoUrl(path) {
  return typeof path === "string" && LOGO_PATH.test(path) ? SUPABASE_URL + "/storage/v1/object/public/coach-logos/" + path : null;
}

// The round face. cls: the size ("acct-av", "acct-av sm", "coach-face"); src: a picture to show instead
// of the saved logo (the coach page, before saving). Initials when there's no logo or it doesn't load.
function coachFace(name, logo, cls, src) {
  var el = h("span", { class: cls || "acct-av", "aria-hidden": "true", translate: "no" });
  var url = src || coachLogoUrl(logo);
  var letters = function () { el.textContent = initials(name) || "C"; el.classList.remove("has-logo"); };
  if (!url) { letters(); return el; }
  el.classList.add("has-logo");
  el.appendChild(h("img", { src: url, alt: "", draggable: "false", onerror: letters }));
  return el;
}

// "Coach Karim": the word is translated, the name never is.
function coachName(name) {
  return h("b", {}, name ? [h("span", { text: "Coach" }), " ", h("span", { translate: "no", text: name })] : [h("span", { text: "Your coach" })]);
}
// Who invited you: on the invite before joining, and the coach's preview of it.
// c: { name, bio, logo, src }; line: what it says under the name.
function coachCard(c, line) {
  return h("div", { class: "coach-card" }, [
    coachFace(c.name, c.logo, "coach-face", c.src),
    h("div", { class: "coach-card-txt" }, [
      coachName(c.name),
      line ? h("small", { text: line }) : null,
      c.bio ? h("p", { class: "coach-bio", translate: "no", dir: "auto", text: c.bio }) : null
    ])
  ]);
}

// A picture the coach picked, made into a logo: the middle square, LOGO_SIZE across, as WebP where the
// browser can write it, else PNG (which keeps a see-through background), else JPEG if PNG is too big.
function logoShrink(file) {
  var decode = window.createImageBitmap
    ? createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () { return createImageBitmap(file); })
    : new Promise(function (resolve, reject) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () { URL.revokeObjectURL(u); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(u); reject(new Error("not an image")); };
      img.src = u;
    });
  return decode.then(function (src) {
    var w = src.naturalWidth || src.width, ht = src.naturalHeight || src.height, side = Math.min(w, ht);
    if (!side) throw new Error("not an image");
    var out = Math.min(LOGO_SIZE, side), c = document.createElement("canvas");
    c.width = out; c.height = out;
    c.getContext("2d").drawImage(src, (w - side) / 2, (ht - side) / 2, side, side, 0, 0, out, out);
    if (src.close) src.close();
    var enc = function (type, q) { return new Promise(function (resolve) { c.toBlob(resolve, type, q); }); };
    return enc("image/webp", 0.86).then(function (b) {
      if (b && b.type === "image/webp") return b;
      return enc("image/png").then(function (p) {
        if (p && p.type === "image/png" && p.size <= 480 * 1024) return p;
        var x = c.getContext("2d");  // JPEG has no see-through: put the picture on white first
        x.globalCompositeOperation = "destination-over"; x.fillStyle = "#fff"; x.fillRect(0, 0, out, out);
        return enc("image/jpeg", 0.88);
      });
    });
  }).then(function (b) { if (!b) throw new Error("not an image"); return b; });
}
function logoName(uid, blob) {
  var ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  return uid + "/logo-" + rid().replace(/-/g, "").slice(0, 16) + "." + ext;
}
