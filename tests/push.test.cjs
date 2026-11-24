// The push function (supabase/functions/push): message encryption against the worked example in RFC 8291,
// the VAPID signature, and how a request from the database is handled. Runs in Node with WebCrypto, like
// the function itself does on Supabase.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'supabase', 'functions', 'push');
const load = name => import(path.join(DIR, name));
const subtle = globalThis.crypto.subtle;

// RFC 8291, Appendix A
const RFC = {
  plaintext: 'When I grow up, I want to be a watermelon',
  asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  uaPrivate: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  body: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN'
};

// The browser's side of RFC 8291: what a phone does with the body it receives.
async function decrypt(body, uaKeys, authB64, wp) {
  const te = new TextEncoder();
  const salt = body.slice(0, 16), idlen = body[20], asPublic = body.slice(21, 21 + idlen), sealed = body.slice(21 + idlen);
  const uaPublic = new Uint8Array(await subtle.exportKey('raw', uaKeys.publicKey));
  const asKey = await subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: asKey }, uaKeys.privateKey, 256));
  const hmac = async (k, d) => new Uint8Array(await subtle.sign('HMAC', await subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), d));
  const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; a.forEach(x => { o.set(x, i); i += x.length; }); return o; };
  const ikm = await hmac(await hmac(wp.unb64u(authB64), ecdh), cat(te.encode('WebPush: info\0'), uaPublic, asPublic, Uint8Array.of(1)));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(te.encode('Content-Encoding: aes128gcm\0'), Uint8Array.of(1)))).slice(0, 16);
  const nonce = (await hmac(prk, cat(te.encode('Content-Encoding: nonce\0'), Uint8Array.of(1)))).slice(0, 12);
  const key = await subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, sealed));
  assert.equal(plain[plain.length - 1], 2, 'one final record');
  return new TextDecoder().decode(plain.slice(0, -1));
}
async function browserKeys(wp) {
  const k = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const auth = wp.b64u(globalThis.crypto.getRandomValues(new Uint8Array(16)));
  return { keys: k, p256dh: wp.b64u(new Uint8Array(await subtle.exportKey('raw', k.publicKey))), auth };
}
async function vapidPair(wp) {
  const k = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const j = await subtle.exportKey('jwk', k.privateKey);
  return { publicKey: wp.b64u(new Uint8Array(await subtle.exportKey('raw', k.publicKey))), privateKey: j.d, subject: 'https://example.github.io/gym-log/', verify: k.publicKey };
}

test('encryption matches the worked example in RFC 8291 byte for byte', async () => {
  const wp = await load('webpush.mjs');
  const asKeys = await wp.ecdhKeys(RFC.asPublic, RFC.asPrivate);
  const body = await wp.encrypt(RFC.plaintext, { p256dh: RFC.uaPublic, auth: RFC.auth }, { asKeys, salt: wp.unb64u(RFC.salt) });
  assert.equal(wp.b64u(body), RFC.body);
  // and the browser in the example can read it
  const ua = await wp.ecdhKeys(RFC.uaPublic, RFC.uaPrivate);
  assert.equal(await decrypt(body, ua, RFC.auth, wp), RFC.plaintext);
});

test('every message gets its own key and salt, and only the right browser can read it', async () => {
  const wp = await load('webpush.mjs');
  const phone = await browserKeys(wp), other = await browserKeys(wp);
  const msg = JSON.stringify({ title: 'الكابتن كريم', body: 'Nice work today 💪' });
  const a = await wp.encrypt(msg, phone), b = await wp.encrypt(msg, phone);
  assert.notEqual(wp.b64u(a), wp.b64u(b));
  assert.equal(await decrypt(a, phone.keys, phone.auth, wp), msg);
  await assert.rejects(decrypt(a, other.keys, other.auth, wp));
  await assert.rejects(wp.encrypt(msg, { p256dh: 'AAAA', auth: phone.auth }), /bad subscription keys/);
});

test('the VAPID token is signed by the app key, for that push service, and expires', async () => {
  const wp = await load('webpush.mjs');
  const v = await vapidPair(wp), now = Date.UTC(2026, 10, 24, 12);
  const auth = await wp.vapidAuth('https://fcm.googleapis.com/fcm/send/abc', v, now);
  const m = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(auth);
  assert.ok(m, auth);
  assert.equal(m[4], v.publicKey);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(wp.unb64u(m[1]))), { typ: 'JWT', alg: 'ES256' });
  assert.deepEqual(JSON.parse(new TextDecoder().decode(wp.unb64u(m[2]))), { aud: 'https://fcm.googleapis.com', exp: now / 1000 + 12 * 3600, sub: v.subject });
  const ok = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, v.verify, wp.unb64u(m[3]), new TextEncoder().encode(m[1] + '.' + m[2]));
  assert.ok(ok, 'signature checks out with the public key');
});

// A fake network: push services answer by endpoint; the REST API records deletes.
function fakeNet(answers) {
  const calls = [];
  const net = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).startsWith('https://db.example.co/')) return new Response(null, { status: 204 });
    const status = answers[String(url)] || 201;
    return new Response(null, { status });
  };
  return { net, calls };
}
const req = (body, secret = 's3cret', method = 'POST') =>
  new Request('https://db.example.co/functions/v1/push', { method, headers: { 'x-push-secret': secret, 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify(body) : undefined });

test('the function only answers the database, and delivers each job to its browser', async () => {
  const wp = await load('webpush.mjs'), { handle } = await load('handler.mjs');
  const v = await vapidPair(wp), phone = await browserKeys(wp);
  const env = { PUSH_SECRET: 's3cret', VAPID_PUBLIC_KEY: v.publicKey, VAPID_PRIVATE_KEY: v.privateKey, VAPID_SUBJECT: v.subject, SUPABASE_URL: 'https://db.example.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' };
  const f = fakeNet({});
  assert.equal((await handle(req({ jobs: [] }, 'wrong'), env, f.net)).status, 403);
  assert.equal((await handle(req({ jobs: [] }, ''), { ...env, PUSH_SECRET: '' }, f.net)).status, 403);
  assert.equal((await handle(req(null, 's3cret', 'GET'), env, f.net)).status, 404);
  assert.equal((await handle(req({ nope: 1 }), env, f.net)).status, 400);
  assert.equal((await handle(req({ jobs: [] }), { ...env, VAPID_PRIVATE_KEY: '' }, f.net)).status, 500);
  assert.equal(f.calls.length, 0);

  const endpoint = 'https://fcm.googleapis.com/fcm/send/phone-1';
  const job = { endpoint, p256dh: phone.p256dh, auth: phone.auth, lang: 'ar', title: 'الكابتن كريم', body: 'Nice work today', url: './#comments', tag: 'comments-x', user: 'u1' };
  const r = await handle(req({ jobs: [job, { ...job, endpoint: 'https://evil.example.com/hook' }] }), env, f.net);
  assert.deepEqual(await r.json(), { sent: 1, gone: 0, failed: 0, skipped: 1 });
  assert.deepEqual(f.calls.map(c => c.url), [endpoint], 'nothing goes to a host that is not a push service');
  const h = f.calls[0].init.headers;
  assert.deepEqual([h['Content-Encoding'], h.TTL, h.Urgency], ['aes128gcm', '86400', 'normal']);
  assert.match(h.Authorization, /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/);
  // what the phone reads: only what the notification needs
  const seen = JSON.parse(await decrypt(f.calls[0].init.body, phone.keys, phone.auth, wp));
  assert.deepEqual(seen, { title: 'الكابتن كريم', body: 'Nice work today', url: './#comments', tag: 'comments-x', lang: 'ar' });
});

test('a browser the push service says is gone is forgotten; other failures are only counted', async () => {
  const wp = await load('webpush.mjs'), { handle } = await load('handler.mjs');
  const v = await vapidPair(wp), phone = await browserKeys(wp);
  const env = { PUSH_SECRET: 's3cret', VAPID_PUBLIC_KEY: v.publicKey, VAPID_PRIVATE_KEY: v.privateKey, VAPID_SUBJECT: v.subject, SUPABASE_URL: 'https://db.example.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' };
  const gone = 'https://updates.push.services.mozilla.com/wpush/v2/gone?x=1&y=2', busy = 'https://web.push.apple.com/busy';
  const f = fakeNet({ [gone]: 410, [busy]: 429 });
  const job = e => ({ endpoint: e, p256dh: phone.p256dh, auth: phone.auth, title: 't', body: 'b', url: './', tag: 'reminder' });
  const r = await handle(req({ jobs: [job(gone), job(busy), { ...job(busy), p256dh: 'bad' }] }), env, f.net);
  assert.deepEqual(await r.json(), { sent: 0, gone: 1, failed: 2, skipped: 0 });
  const del = f.calls.filter(c => c.init.method === 'DELETE');
  assert.equal(del.length, 1);
  assert.equal(del[0].url, 'https://db.example.co/rest/v1/push_subscriptions?endpoint=eq.' + encodeURIComponent(gone));
  assert.equal(del[0].init.headers.apikey, 'service-key');
});

// ---- the service worker (sw.js): showing a notification, and where a tap goes ----------------------
const fs = require('node:fs');
const vm = require('node:vm');
function worker(windows) {
  const on = {}, shown = [], opened = [], waits = [];
  const self = {
    location: { origin: 'https://example.github.io' },
    registration: { scope: 'https://example.github.io/gym-log/', showNotification: async (title, o) => { shown.push({ title, o }); } },
    clients: { matchAll: async () => windows, openWindow: async url => { opened.push(url); }, claim: async () => {} },
    addEventListener: (type, fn) => { on[type] = fn; },
    skipWaiting: async () => {}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), { self, URL, Promise, caches: {}, fetch: () => Promise.reject(new Error('offline')) });
  const fire = async (type, ev) => { ev.waitUntil = p => waits.push(p); on[type](ev); await Promise.all(waits.splice(0)); };
  return { fire, shown, opened };
}
const plain = v => JSON.parse(JSON.stringify(v));  // objects made inside the worker's context
const win = url => { const w = { url, posted: [], focused: 0, postMessage: m => w.posted.push(m), focus: async () => { w.focused++; return w; } }; return w; };
const pushEvent = payload => ({ data: payload == null ? null : { json: () => payload, text: () => JSON.stringify(payload) } });

test('a push shows the notification in its own language, and tells open pages something arrived', async () => {
  const app = win('https://example.github.io/gym-log/'), sw = worker([app]);
  await sw.fire('push', pushEvent({ title: 'الكابتن كريم', body: 'شغل ممتاز النهارده', url: './#comments', tag: 'comments-1', lang: 'ar' }));
  assert.deepEqual(plain(sw.shown), [{ title: 'الكابتن كريم', o: { body: 'شغل ممتاز النهارده', icon: 'icon-192.png', badge: 'icon-192.png', tag: 'comments-1', renotify: true, data: { url: './#comments' }, lang: 'ar', dir: 'rtl' } }]);
  assert.deepEqual(plain(app.posted), [{ type: 'push', tag: 'comments-1' }]);
  // an empty push still shows something (browsers require it)
  await sw.fire('push', pushEvent(null));
  assert.equal(sw.shown[1].title, 'Gym Log');
});

test('a tap opens the page it points at, reusing a window that already shows it', async () => {
  const note = url => ({ notification: { data: { url }, close() { } } });
  // the coach page, while only the app is open: a new window on the coach page
  const app = win('https://example.github.io/gym-log/index.html'), sw = worker([app]);
  await sw.fire('notificationclick', note('coach.html#client=abc&tab=comments'));
  assert.deepEqual(sw.opened, ['https://example.github.io/gym-log/coach.html#client=abc&tab=comments']);
  assert.equal(app.focused, 0);
  // the app's comments, with the app open: that window comes forward and is told where to go
  await sw.fire('notificationclick', note('./#comments'));
  assert.equal(app.focused, 1);
  assert.deepEqual(plain(app.posted), [{ type: 'open', url: 'https://example.github.io/gym-log/#comments' }]);
  // the rest timer's own notifications have no link: the app
  const none = worker([]);
  await none.fire('notificationclick', { notification: { close() { } } });
  assert.deepEqual(none.opened, ['https://example.github.io/gym-log/']);
});
