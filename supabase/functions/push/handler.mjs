// The push function's work, kept apart from Deno.serve so the tests can run it in Node.
// The database posts {jobs: [...]} with its shared secret (private.push() in 0003_comments_push.sql). Each job
// is one notification for one browser, already written in that browser's language; this only delivers it.
import { sendPush } from "./webpush.mjs";

// The same list the database checks endpoints against: never post anywhere but a real push service.
export const PUSH_HOSTS = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;
const MAX_JOBS = 500;

// Same length and same characters, without stopping at the first difference.
function sameSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const text = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });

export async function handle(req, env, net = fetch) {
  if (req.method !== "POST") return json({ error: "not found" }, 404);
  if (!sameSecret(req.headers.get("x-push-secret") || "", env.PUSH_SECRET || "")) return json({ error: "forbidden" }, 403);
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return json({ error: "push keys are not set" }, 500);
  let jobs = null;
  try { jobs = (await req.json()).jobs; } catch (e) { /* not JSON */ }
  if (!Array.isArray(jobs)) return json({ error: "expected {jobs: [...]}" }, 400);

  const vapid = { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT };
  const out = { sent: 0, gone: 0, failed: 0, skipped: 0 }, gone = new Set();
  await Promise.all(jobs.slice(0, MAX_JOBS).map(async (j) => {
    if (!j || typeof j.endpoint !== "string" || !PUSH_HOSTS.test(j.endpoint)) { out.skipped++; return; }
    const payload = JSON.stringify({
      title: text(j.title, 120), body: text(j.body, 400), url: text(j.url, 300), tag: text(j.tag, 80), lang: j.lang === "ar" ? "ar" : "en",
    });
    try {
      const r = await sendPush({ endpoint: j.endpoint, p256dh: j.p256dh, auth: j.auth }, payload, vapid, { fetch: net });
      if (r.status === 404 || r.status === 410) { gone.add(j.endpoint); out.gone++; }
      else if (r.ok) out.sent++;
      else out.failed++;
    } catch (e) { out.failed++; }
  }));
  // the browser unsubscribed or was reset: forget it, for every account that used it
  for (const endpoint of gone) {
    try {
      await net(env.SUPABASE_URL + "/rest/v1/push_subscriptions?endpoint=eq." + encodeURIComponent(endpoint), {
        method: "DELETE",
        headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY },
      });
    } catch (e) { /* the next notification finds it gone again */ }
  }
  return json(out);
}
