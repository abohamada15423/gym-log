// Supabase Edge Function "push": delivers the Web Push notifications the database asks for
// (supabase/migrations/0003_comments_push.sql). Deployed with JWT checks off, because its only caller is
// the database, which sends a shared secret instead (handler.mjs). Secrets: supabase/README.md.
import { handle } from "./handler.mjs";

const env = {
  PUSH_SECRET: Deno.env.get("PUSH_SECRET") ?? "",
  VAPID_PUBLIC_KEY: Deno.env.get("VAPID_PUBLIC_KEY") ?? "",
  VAPID_PRIVATE_KEY: Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
  VAPID_SUBJECT: Deno.env.get("VAPID_SUBJECT") ?? "",
  SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
};

Deno.serve((req: Request) => handle(req, env));
