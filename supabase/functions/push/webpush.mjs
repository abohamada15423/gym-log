// Web Push with nothing but WebCrypto, so the same file runs on Supabase (Deno) and in the tests (Node):
// the message encryption of RFC 8291 (the aes128gcm format of RFC 8188) and the VAPID signature of RFC 8292.

const te = new TextEncoder();

export function b64u(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unb64u(str) {
  const s = String(str).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}
async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
// A P-256 key from its 65-byte public point (and, for a private key, its 32-byte secret d).
function jwk(publicRaw, d) {
  const key = { kty: "EC", crv: "P-256", x: b64u(publicRaw.slice(1, 33)), y: b64u(publicRaw.slice(33, 65)), ext: true };
  if (d) key.d = d;
  return key;
}
export async function ecdhKeys(publicB64, privateB64) {
  const pub = unb64u(publicB64);
  return {
    publicKey: await crypto.subtle.importKey("jwk", jwk(pub), { name: "ECDH", namedCurve: "P-256" }, true, []),
    privateKey: await crypto.subtle.importKey("jwk", jwk(pub, privateB64), { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]),
  };
}

// The body for one browser: the payload encrypted to its keys (p256dh, auth), as one aes128gcm record.
// asKeys and salt are fresh for every message; the tests fix them to check against RFC 8291's example.
export async function encrypt(payload, keys, opts = {}) {
  const uaPublic = unb64u(keys.p256dh), authSecret = unb64u(keys.auth);
  if (uaPublic.length !== 65 || uaPublic[0] !== 4 || authSecret.length !== 16) throw new Error("bad subscription keys");
  const as = opts.asKeys || (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]));
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const salt = opts.salt || crypto.getRandomValues(new Uint8Array(16));
  // RFC 8291 section 3.4: mix the browser's auth secret into the shared secret, then derive key and nonce
  const prkKey = await hmac(authSecret, ecdh);
  const ikm = await hmac(prkKey, concat(te.encode("WebPush: info\0"), uaPublic, asPublic, Uint8Array.of(1)));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(te.encode("Content-Encoding: aes128gcm\0"), Uint8Array.of(1)))).slice(0, 16);
  const nonce = (await hmac(prk, concat(te.encode("Content-Encoding: nonce\0"), Uint8Array.of(1)))).slice(0, 12);
  const data = concat(typeof payload === "string" ? te.encode(payload) : payload, Uint8Array.of(2));  // last record, no padding
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, data));
  // header: salt, record size 4096, then the server's one-time public key
  return concat(salt, Uint8Array.of(0, 0, 16, 0), Uint8Array.of(65), asPublic, sealed);
}

// RFC 8292: a token signed with the app's VAPID key, for the push service the endpoint belongs to.
export async function vapidAuth(endpoint, vapid, now = Date.now()) {
  const pub = unb64u(vapid.publicKey);
  const head = b64u(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(te.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: vapid.subject })));
  const key = await crypto.subtle.importKey("jwk", jwk(pub, vapid.privateKey), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  // WebCrypto signs in the r||s form that JWT's ES256 uses
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(head + "." + claims)));
  return "vapid t=" + head + "." + claims + "." + b64u(sig) + ", k=" + vapid.publicKey;
}

// One notification to one browser. Returns the push service's response; 404 and 410 mean it's gone.
export async function sendPush(sub, payload, vapid, opts = {}) {
  const body = await encrypt(payload, sub);
  return (opts.fetch || fetch)(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(opts.ttl ?? 86400),
      Urgency: opts.urgency || "normal",
      Authorization: await vapidAuth(sub.endpoint, vapid),
    },
    body,
  });
}
