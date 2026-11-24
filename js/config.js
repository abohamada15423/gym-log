// The Supabase project behind the coach version (docs/coach-plan.md, supabase/README.md).
// All three values are public by design: what anyone can read or write is decided by the database's
// row level security, not by these keys. Never put a secret key (sb_secret_..., service_role), the
// database password or the VAPID private key in this file or anywhere in the app.
var SUPABASE_URL = "https://wacekcjwcvcawdptbgwv.supabase.co";
var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_a0hwM_YBow0EaUgwz1PYLg_6v_m3Fte";
// Notifications (phase 4): browsers subscribe with this public key; the push function signs with its
// private half, which is kept only in the project's Edge Function secrets.
var VAPID_PUBLIC_KEY = "BDFvyarPkauccwDXjWPbZpXE9Q2QAgXrpIRv906vXWZTWyH0-v_F2QTo9G10iCv2DnNU_2QRpQ86NmGTlZquJ2M";
