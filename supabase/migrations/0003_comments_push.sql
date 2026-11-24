-- Gym Log: comments and notifications (phase 4 of docs/coach-plan.md)
--
-- Run once, after 0001 and 0002.
--   1. extensions: pg_net (the database calls the push function) and pg_cron (reminders)
--   2. push subscriptions: one row per account per browser that turned notifications on
--   3. comments: read receipts for chosen comments, and the coach's inbox
--   4. what each notification says, in each device's language
--   5. triggers: a new comment, and a program or meal plan from the coach
--   6. training-day reminders, every 15 minutes
--   7. privileges
--
-- The database decides who is told what; the push function (supabase/functions/push) only encrypts and
-- delivers. It reads two Vault secrets, set once by hand (supabase/README.md): push_url and push_secret.
-- Until they exist nothing is sent, and everything else here works the same.

begin;

-- 1. Extensions ----------------------------------------------------------------------------------
-- Both come with every Supabase project. The local test database has stand-ins (supabase_stub.sql).
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'net')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension pg_net with schema extensions;
  end if;
  if not exists (select 1 from pg_namespace where nspname = 'cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension pg_cron;
  end if;
end $$;

-- 2. Push subscriptions --------------------------------------------------------------------------
-- What a browser gives when someone turns notifications on: where to send, and the keys to encrypt with.
-- One browser can hold two accounts (the app and the coach page sign in separately), so the key is both.
-- Only the big push services are accepted, so the push function never posts anywhere else.
create table public.push_subscriptions (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint   text not null check (char_length(endpoint) <= 1000 and endpoint ~
               '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'),
  p256dh     text not null check (p256dh ~ '^[A-Za-z0-9_-]{87}=?$'),   -- the browser's public key, 65 bytes
  auth       text not null check (auth ~ '^[A-Za-z0-9_-]{22}(==)?$'),  -- its auth secret, 16 bytes
  lang       text not null default 'en' check (lang in ('en', 'ar')),  -- the language notifications arrive in
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);
create index push_subscriptions_endpoint on public.push_subscriptions (endpoint);
create trigger touch before update on public.push_subscriptions for each row execute function private.touch_updated_at();

-- Twenty browsers per account is far more than anyone uses; it stops one account filling the table.
create function private.push_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.push_subscriptions s where s.user_id = new.user_id and s.endpoint = new.endpoint)
     and (select count(*) from public.push_subscriptions s where s.user_id = new.user_id) >= 20 then
    raise exception 'Notifications are on in too many browsers for this account' using errcode = '54000';
  end if;
  return new;
end $$;
create trigger push_limit before insert on public.push_subscriptions for each row execute function private.push_limit();

alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions: your own" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 3. Comments ------------------------------------------------------------------------------------
-- Read receipts. With ids, only those comments (the ones on the workout someone opened); without, the
-- whole thread. Only the other person's comments are ever marked.
drop function public.mark_comments_read(uuid);
create function public.mark_comments_read(p_client uuid, p_ids uuid[] default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_count integer;
begin
  if v_me is null or not (p_client = v_me or private.is_coach_of(p_client)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.comments c
     set read_at = now()
   where c.client_id = p_client and c.author_id <> v_me and c.read_at is null and c.deleted_at is null
     and (p_ids is null or c.id = any (p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- The coach's inbox: for each current client, how many of the client's comments are unread, and whether
-- the last word in the thread is the client's (waiting for the coach's reply). The policies decide what
-- the caller can see, so a client calling it gets nothing.
create function public.comment_inbox() returns table (client_id uuid, unread integer, waiting boolean, last_at timestamptz)
language sql stable set search_path = '' as $$
  select cc.client_id,
         (count(c.id) filter (where c.author_id = cc.client_id and c.read_at is null))::integer,
         coalesce((array_agg(c.author_id = cc.client_id order by c.created_at desc) filter (where c.id is not null))[1], false),
         max(c.created_at)
    from public.coach_clients cc
    left join public.comments c on c.client_id = cc.client_id and c.deleted_at is null
   where cc.coach_id = (select auth.uid()) and cc.status <> 'archived'
   group by cc.client_id
$$;

-- 4. Notifications ---------------------------------------------------------------------------------
-- A job is one notification for one browser:
--   {user, endpoint, p256dh, auth, lang, title, body, url, tag}
-- url is relative to the app's folder; tag lets a newer notification replace an older one on the phone.
create function private.say(p_lang text, p_en text, p_ar text) returns text
language sql immutable set search_path = '' as $$
  select case when p_lang = 'ar' then p_ar else p_en end
$$;

-- Hand the jobs to the push function. pg_net sends the request after the transaction commits, so a
-- rolled-back comment is never announced, and nothing waits for the push services.
create function private.push(p_jobs jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
begin
  if p_jobs is null or jsonb_typeof(p_jobs) <> 'array' or jsonb_array_length(p_jobs) = 0 then
    return;
  end if;
  select s.decrypted_secret into v_url from vault.decrypted_secrets s where s.name = 'push_url';
  select s.decrypted_secret into v_secret from vault.decrypted_secrets s where s.name = 'push_secret';
  if v_url is null or v_secret is null then
    return;  -- notifications aren't set up on this project
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('jobs', p_jobs),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 10000);
end $$;

-- A new comment goes to the other side of the thread: the client's coach when the client wrote it, the
-- client when the coach did. The text is the comment itself.
create function private.comment_jobs(p_comment uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with c as (
    select c.id, c.client_id, c.author_id, c.body, c.author_id = c.client_id as from_client
      from public.comments c
     where c.id = p_comment and c.deleted_at is null
  ), told as (
    select cc.coach_id as to_id, c.* from c
      join public.coach_clients cc on cc.client_id = c.client_id and cc.status <> 'archived'
     where c.from_client
    union all
    select c.client_id as to_id, c.* from c where not c.from_client
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'user', s.user_id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth, 'lang', s.lang,
           'title', case when t.from_client
                      then coalesce(nullif(btrim(pc.full_name), ''), private.say(s.lang, 'Your client', 'المتدرب'))
                      else coalesce(private.say(s.lang, 'Coach ', 'الكابتن ') || nullif(btrim(pa.full_name), ''),
                                    private.say(s.lang, 'Your coach', 'الكابتن')) end,
           'body', left(t.body, 180),
           'url', case when t.from_client then 'coach.html#client=' || t.client_id || '&tab=comments' else './#comments' end,
           'tag', 'comments-' || t.client_id)), '[]'::jsonb)
    from told t
    join public.push_subscriptions s on s.user_id = t.to_id
    left join public.profiles pa on pa.id = t.author_id
    left join public.profiles pc on pc.id = t.client_id
$$;

-- A program or meal plan the coach sent or changed.
create function private.plan_jobs(p_client uuid, p_kind text, p_new boolean, p_name text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'user', s.user_id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth, 'lang', s.lang,
           'title', case
             when p_kind = 'program' and p_new then private.say(s.lang, 'New program from your coach', 'برنامج جديد من الكابتن')
             when p_kind = 'program' then private.say(s.lang, 'Your coach updated your program', 'الكابتن حدّث برنامجك')
             when p_new then private.say(s.lang, 'New meal plan from your coach', 'نظام أكل جديد من الكابتن')
             else private.say(s.lang, 'Your coach updated your meal plan', 'الكابتن حدّث نظام أكلك') end,
           'body', left(coalesce(btrim(p_name), ''), 120),
           'url', case when p_kind = 'program' then './' else './#meals' end,
           'tag', p_kind || '-' || p_client)), '[]'::jsonb)
    from public.push_subscriptions s
   where s.user_id = p_client
$$;

-- 5. Triggers --------------------------------------------------------------------------------------
create function private.on_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.push(private.comment_jobs(new.id));
  return null;
end $$;
create trigger notify after insert on public.comments for each row execute function private.on_comment();

-- Only what the client follows: a template, a retired plan or a save that changed nothing says nothing.
-- (sync_row() already drops a stale or repeated save before this runs.)
create function private.on_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_kind text := case when tg_table_name = 'programs' then 'program' else 'meal_plan' end;
  v_was_on boolean := tg_op = 'UPDATE' and old.active and old.deleted_at is null;
begin
  if new.client_id is null or not new.active or new.deleted_at is not null then
    return null;
  end if;
  if v_was_on and old.name is not distinct from new.name
     and (to_jsonb(old) -> 'days') is not distinct from (to_jsonb(new) -> 'days')
     and (to_jsonb(old) -> 'meals') is not distinct from (to_jsonb(new) -> 'meals')
     and (to_jsonb(old) -> 'targets') is not distinct from (to_jsonb(new) -> 'targets') then
    return null;
  end if;
  perform private.push(private.plan_jobs(new.client_id, v_kind, not v_was_on, new.name));
  return null;
end $$;
create trigger notify after insert or update on public.programs for each row execute function private.on_plan();
create trigger notify after insert or update on public.meal_plans for each row execute function private.on_plan();

-- 6. Training-day reminders ------------------------------------------------------------------------
-- The app keeps the setting with the client's other settings (client_settings, key 'reminder'):
--   {"on": true, "days": [0-6, Sunday is 0], "time": "18:30", "tz": "Africa/Cairo", "next": "Push"}
-- next is the day the app will offer, already in the app's language. Every 15 minutes, each client whose
-- time has come today (up to 2 hours late, if a run was missed) gets one notification, unless they
-- already trained today or were already reminded.
alter table public.client_settings drop constraint client_settings_key_check;
alter table public.client_settings add constraint client_settings_key_check
  check (key in ('goals', 'habit_list', 'my_foods', 'custom_lib', 'baselines', 'custom_program', 'reminder'));

create table private.reminders_sent (
  client_id uuid not null references public.profiles (id) on delete cascade,
  day       date not null,
  primary key (client_id, day)
);

create function private.send_reminders(p_now timestamptz default now()) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_jobs jsonb;
  v_count integer;
begin
  with wanted as (
    -- a time zone the database doesn't know is skipped instead of failing everyone's reminders
    select s.client_id, s.value, (p_now at time zone z.name) as local_now
      from public.client_settings s
      join pg_catalog.pg_timezone_names z on z.name = s.value ->> 'tz'
     where s.key = 'reminder' and s.deleted_at is null and jsonb_typeof(s.value) = 'object'
       and s.value -> 'on' = 'true'::jsonb
       and jsonb_typeof(s.value -> 'days') = 'array'
       and coalesce(s.value ->> 'time', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ), due as (
    select w.client_id, w.value, w.local_now::date as day
      from wanted w
     where w.value -> 'days' @> to_jsonb(extract(dow from w.local_now)::integer)
       and w.local_now >= w.local_now::date + (w.value ->> 'time')::time
       and w.local_now < w.local_now::date + (w.value ->> 'time')::time + interval '2 hours'
       and not exists (select 1 from public.workout_sessions ws
                        where ws.client_id = w.client_id and ws.date = w.local_now::date and ws.deleted_at is null)
       and exists (select 1 from public.push_subscriptions ps where ps.user_id = w.client_id)
  ), sent as (
    insert into private.reminders_sent (client_id, day)
    select d.client_id, d.day from due d
    on conflict do nothing
    returning client_id
  )
  select count(distinct t.client_id)::integer,
         coalesce(jsonb_agg(jsonb_build_object(
           'user', ps.user_id, 'endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth, 'lang', ps.lang,
           'title', private.say(ps.lang, 'Training day', 'النهارده يوم تمرين'),
           'body', case when coalesce(btrim(d.value ->> 'next'), '') = ''
                     then private.say(ps.lang, 'Your workout is waiting. Tap to start.', 'تمرينك مستنيك. دوس عشان تبدأ.')
                     else private.say(ps.lang, 'Next up: ', 'عليك النهارده: ') || left(btrim(d.value ->> 'next'), 60)
                          || private.say(ps.lang, '. Tap to start.', '. دوس عشان تبدأ.') end,
           'url', './',
           'tag', 'reminder')), '[]'::jsonb)
    into v_count, v_jobs
    from sent t
    join due d on d.client_id = t.client_id
    join public.push_subscriptions ps on ps.user_id = t.client_id;
  perform private.push(v_jobs);
  delete from private.reminders_sent r where r.day < (p_now at time zone 'UTC')::date - 7;
  return coalesce(v_count, 0);
end $$;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('gymlog-reminders', '*/15 * * * *', 'select private.send_reminders()');
  end if;
end $$;

-- 7. Privileges ------------------------------------------------------------------------------------
revoke all on table public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
-- the push function forgets browsers the push service says are gone. Supabase no longer grants new
-- tables to its API roles by default, so the function's role needs this said out loud.
grant select, delete on public.push_subscriptions to service_role;

revoke all on function public.mark_comments_read(uuid, uuid[]), public.comment_inbox() from public, anon;
grant execute on function public.mark_comments_read(uuid, uuid[]), public.comment_inbox() to authenticated;

-- Postgres lets everyone run a new function; the helpers here are for the database itself.
revoke all on function
  private.push_limit(), private.say(text, text, text), private.push(jsonb), private.comment_jobs(uuid),
  private.plan_jobs(uuid, text, boolean, text), private.on_comment(), private.on_plan(), private.send_reminders(timestamptz)
  from public, anon, authenticated;
revoke all on table private.reminders_sent from public, anon, authenticated;

commit;
