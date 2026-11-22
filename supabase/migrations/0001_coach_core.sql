-- Gym Log: coach and clients, core schema (phase 0 of docs/coach-plan.md)
--
-- Run once, top to bottom, in the Supabase SQL editor (or with `supabase db push`).
--   1. extensions and the private schema for helpers
--   2. tables
--   3. helper functions used by the policies
--   4. triggers (timestamps, last-write-wins sync, new-user profiles)
--   5. row level security policies
--   6. functions the app calls (invites, read receipts)
--   7. privileges: anon gets nothing, authenticated gets only what the policies are written for
--   8. storage bucket and policies for progress photos
--
-- Rules this file follows (docs/coach-plan.md, section 4):
--   * every table has RLS on
--   * security definer functions pin `search_path = ''` and use schema-qualified names
--   * helpers that answer "who coaches whom" live in schema `private`, which the API does not expose
--   * data a client logs is soft-deleted (deleted_at) and synced last-write-wins on modified_at,
--     the time of the edit on the device; updated_at is the server's clock and only a pull cursor

begin;

-- 1. Extensions and private schema ------------------------------------------------------------

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;  -- gen_random_bytes for invite codes

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- 2. Tables ---------------------------------------------------------------------------------------

-- One row per account, created by a trigger when someone signs up. Coaches are made by hand:
--   update public.profiles set role = 'coach' where id = '<user id>';
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'client' check (role in ('coach', 'client')),
  full_name   text check (char_length(full_name) <= 80),
  phone       text check (char_length(phone) <= 32),
  lang        text not null default 'en' check (lang in ('en', 'ar')),
  avatar_path text check (char_length(avatar_path) <= 200),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Who coaches whom. Rows are only created by accept_invite().
create table public.coach_clients (
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  client_id  uuid not null references public.profiles (id) on delete cascade,
  status     text not null default 'active' check (status in ('active', 'paused', 'archived')),
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (coach_id, client_id),
  check (coach_id <> client_id)
);
-- a client has at most one coach that is not archived
create unique index coach_clients_one_coach on public.coach_clients (client_id) where status <> 'archived';

-- The coach's private notes about a client. Kept out of coach_clients, which the client can read.
create table public.coach_notes (
  coach_id   uuid not null,
  client_id  uuid not null,
  body       text not null default '' check (char_length(body) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (coach_id, client_id),
  foreign key (coach_id, client_id) references public.coach_clients (coach_id, client_id) on delete cascade
);

-- Invite codes: 12 characters from a 31-letter alphabet (about 59 bits), single use, expire.
-- Created only by create_invite(), redeemed only by accept_invite().
create table public.invites (
  code       text primary key check (code ~ '^[A-Z2-9]{12}$'),
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_by    uuid references public.profiles (id) on delete set null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index invites_coach on public.invites (coach_id);

-- Programs and meal plans written by a coach. client_id null = a template only the coach sees.
create table public.programs (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles (id) on delete cascade,
  client_id   uuid references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  days        jsonb not null default '[]' check (jsonb_typeof(days) = 'array'),  -- same shape as DAYS in js/data.js
  active      boolean not null default true,
  starts_on   date,
  modified_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index programs_client_sync on public.programs (client_id, updated_at);
create index programs_coach_sync on public.programs (coach_id, updated_at);

create table public.meal_plans (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles (id) on delete cascade,
  client_id   uuid references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  targets     jsonb not null default '{}' check (jsonb_typeof(targets) = 'object'),  -- {kcal, protein, carbs, fat}
  meals       jsonb not null default '[]' check (jsonb_typeof(meals) = 'array'),     -- [{name, items[], kcal, p, c, f}]
  active      boolean not null default true,
  modified_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index meal_plans_client_sync on public.meal_plans (client_id, updated_at);
create index meal_plans_coach_sync on public.meal_plans (coach_id, updated_at);

-- What a client logs. ids are made on the device (crypto.randomUUID()) so offline records keep them.
create table public.workout_sessions (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date        date not null,
  day_id      text check (char_length(day_id) <= 64),
  day_name    text check (char_length(day_name) <= 80),
  program_id  text check (char_length(program_id) <= 64),  -- a built-in program key or a programs.id
  sets        jsonb not null default '{}' check (jsonb_typeof(sets) = 'object'),  -- {exercise: [[kg, reps], ...]}
  notes       jsonb check (notes is null or jsonb_typeof(notes) = 'object'),     -- {exercise: note}
  note        text check (char_length(note) <= 2000),
  modified_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index workout_sessions_sync on public.workout_sessions (client_id, updated_at);
create index workout_sessions_date on public.workout_sessions (client_id, date);

create table public.food_logs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date        date not null,
  name        text not null check (char_length(name) between 1 and 120),
  kcal        numeric not null check (kcal >= 0 and kcal < 20000),
  p           numeric not null default 0 check (p >= 0 and p < 2000),
  c           numeric check (c >= 0 and c < 2000),
  f           numeric check (f >= 0 and f < 2000),
  modified_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index food_logs_sync on public.food_logs (client_id, updated_at);
create index food_logs_date on public.food_logs (client_id, date);

create table public.body_checkins (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date        date not null,
  kg          numeric check (kg > 20 and kg < 400),
  waist       numeric check (waist > 0 and waist < 300),
  chest       numeric check (chest > 0 and chest < 300),
  arm         numeric check (arm > 0 and arm < 300),
  thigh       numeric check (thigh > 0 and thigh < 300),
  hips        numeric check (hips > 0 and hips < 300),
  fat         numeric check (fat > 0 and fat < 70),
  photo_path  text check (char_length(photo_path) <= 200),
  note        text check (char_length(note) <= 500),
  modified_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index body_checkins_sync on public.body_checkins (client_id, updated_at);

-- One row per client per day: two devices ticking habits on the same day update the same row.
create table public.habit_days (
  client_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date        date not null,
  data        jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  modified_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  primary key (client_id, date)
);
create index habit_days_sync on public.habit_days (client_id, updated_at);

-- One row per setting, so editing goals on one device and My Foods on another don't overwrite each other.
create table public.client_settings (
  client_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  key         text not null check (key in ('goals', 'habit_list', 'my_foods', 'custom_lib', 'baselines', 'custom_program')),
  value       jsonb not null,
  modified_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  primary key (client_id, key)
);
create index client_settings_sync on public.client_settings (client_id, updated_at);

-- Comments between a client and their coach. Each person edits and deletes only their own.
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles (id) on delete cascade,
  author_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null default 'general' check (target_type in ('session', 'food_day', 'checkin', 'general')),
  target_ref  text check (char_length(target_ref) <= 64),  -- a session id or a date
  body        text not null check (char_length(btrim(body)) between 1 and 2000),
  read_at     timestamptz,                                  -- set only by mark_comments_read()
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index comments_sync on public.comments (client_id, updated_at);

-- 3. Helpers for the policies ---------------------------------------------------------------------

create function private.is_coach_of(p_client uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.coach_clients cc
    where cc.coach_id = (select auth.uid()) and cc.client_id = p_client and cc.status <> 'archived')
$$;

create function private.is_client_of(p_coach uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.coach_clients cc
    where cc.client_id = (select auth.uid()) and cc.coach_id = p_coach and cc.status <> 'archived')
$$;

create function private.is_coach() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'coach')
$$;

-- Storage paths look like '<client uuid>/<file>'. Compared as text, so a path in another bucket
-- that isn't a uuid can never make a query fail on a cast.
create function private.can_read_progress_path(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select split_part(p_name, '/', 1) = (select auth.uid())::text
      or exists (
        select 1 from public.coach_clients cc
        where cc.coach_id = (select auth.uid()) and cc.status <> 'archived'
          and cc.client_id::text = split_part(p_name, '/', 1))
$$;

-- 4. Triggers ------------------------------------------------------------------------------------

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Rows that devices sync. The newest edit wins, judged by modified_at (when the user made the change),
-- not by when it reached the server: an edit made offline yesterday must not beat one made this morning.
create function private.sync_row() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- a phone clock running fast must not win every future conflict
  if new.modified_at is null or new.modified_at > now() then
    new.modified_at := now();
  end if;
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    new.updated_at := old.updated_at;
    if new.modified_at < old.modified_at then
      return null;                  -- an older edit: keep the newer row as it is
    end if;
    if new is not distinct from old then
      return null;                  -- the same edit sent twice: nothing to change
    end if;
    if new.modified_at = old.modified_at then
      new.modified_at := now();     -- a change that didn't stamp its own edit time
    end if;
  end if;
  new.updated_at := now();          -- server clock: what devices pull by
  return new;
end $$;

create trigger touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger touch before update on public.coach_clients for each row execute function private.touch_updated_at();
create trigger touch before update on public.coach_notes for each row execute function private.touch_updated_at();
create trigger touch before update on public.comments for each row execute function private.touch_updated_at();

create trigger sync before insert or update on public.programs for each row execute function private.sync_row();
create trigger sync before insert or update on public.meal_plans for each row execute function private.sync_row();
create trigger sync before insert or update on public.workout_sessions for each row execute function private.sync_row();
create trigger sync before insert or update on public.food_logs for each row execute function private.sync_row();
create trigger sync before insert or update on public.body_checkins for each row execute function private.sync_row();
create trigger sync before insert or update on public.habit_days for each row execute function private.sync_row();
create trigger sync before insert or update on public.client_settings for each row execute function private.sync_row();

-- New account -> profile (role client). Name and language come from the sign-up metadata.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, lang)
  values (
    new.id,
    nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 80), ''),
    case when new.raw_user_meta_data ->> 'lang' = 'ar' then 'ar' else 'en' end)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- 5. Row level security ---------------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.coach_clients    enable row level security;
alter table public.coach_notes      enable row level security;
alter table public.invites          enable row level security;
alter table public.programs         enable row level security;
alter table public.meal_plans       enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.food_logs        enable row level security;
alter table public.body_checkins    enable row level security;
alter table public.habit_days       enable row level security;
alter table public.client_settings  enable row level security;
alter table public.comments         enable row level security;

-- profiles: you, your clients, your coach. Only you edit yours (and never your role: see privileges).
create policy "profiles: read own, my clients, my coach" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.is_coach_of(id) or private.is_client_of(id));
create policy "profiles: edit own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- coach_clients: both sides read the link. The coach pauses or archives an active link;
-- an archived client comes back only through a new invite. The client can leave (archive).
create policy "coach_clients: both sides read" on public.coach_clients for select to authenticated
  using (coach_id = (select auth.uid()) or client_id = (select auth.uid()));
create policy "coach_clients: coach changes status" on public.coach_clients for update to authenticated
  using (coach_id = (select auth.uid()) and status <> 'archived')
  with check (coach_id = (select auth.uid()));
create policy "coach_clients: client leaves" on public.coach_clients for update to authenticated
  using (client_id = (select auth.uid()) and status <> 'archived')
  with check (client_id = (select auth.uid()) and status = 'archived');

-- coach_notes: the coach only, and only about their current clients.
create policy "coach_notes: coach only" on public.coach_notes for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) and private.is_coach_of(client_id));

-- invites: the coach sees and withdraws their own unused codes. Creating and redeeming go through functions.
create policy "invites: coach reads own" on public.invites for select to authenticated
  using (coach_id = (select auth.uid()));
create policy "invites: coach withdraws unused" on public.invites for delete to authenticated
  using (coach_id = (select auth.uid()) and used_by is null);

-- programs and meal plans: the coach writes; the client they are assigned to reads.
create policy "programs: coach and assigned client read" on public.programs for select to authenticated
  using (coach_id = (select auth.uid()) or client_id = (select auth.uid()));
create policy "programs: coach creates" on public.programs for insert to authenticated
  with check (coach_id = (select auth.uid()) and private.is_coach()
              and (client_id is null or private.is_coach_of(client_id)));
create policy "programs: coach edits" on public.programs for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) and (client_id is null or private.is_coach_of(client_id)));

create policy "meal_plans: coach and assigned client read" on public.meal_plans for select to authenticated
  using (coach_id = (select auth.uid()) or client_id = (select auth.uid()));
create policy "meal_plans: coach creates" on public.meal_plans for insert to authenticated
  with check (coach_id = (select auth.uid()) and private.is_coach()
              and (client_id is null or private.is_coach_of(client_id)));
create policy "meal_plans: coach edits" on public.meal_plans for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) and (client_id is null or private.is_coach_of(client_id)));

-- What a client logs: the client reads and writes their own rows; their coach reads them.
-- No delete policy: deletes are soft (deleted_at) so they reach every device.
create policy "workout_sessions: client and coach read" on public.workout_sessions for select to authenticated
  using (client_id = (select auth.uid()) or private.is_coach_of(client_id));
create policy "workout_sessions: client adds" on public.workout_sessions for insert to authenticated
  with check (client_id = (select auth.uid()));
create policy "workout_sessions: client edits" on public.workout_sessions for update to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

create policy "food_logs: client and coach read" on public.food_logs for select to authenticated
  using (client_id = (select auth.uid()) or private.is_coach_of(client_id));
create policy "food_logs: client adds" on public.food_logs for insert to authenticated
  with check (client_id = (select auth.uid()));
create policy "food_logs: client edits" on public.food_logs for update to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

create policy "body_checkins: client and coach read" on public.body_checkins for select to authenticated
  using (client_id = (select auth.uid()) or private.is_coach_of(client_id));
create policy "body_checkins: client adds" on public.body_checkins for insert to authenticated
  with check (client_id = (select auth.uid()));
create policy "body_checkins: client edits" on public.body_checkins for update to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

create policy "habit_days: client and coach read" on public.habit_days for select to authenticated
  using (client_id = (select auth.uid()) or private.is_coach_of(client_id));
create policy "habit_days: client adds" on public.habit_days for insert to authenticated
  with check (client_id = (select auth.uid()));
create policy "habit_days: client edits" on public.habit_days for update to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

create policy "client_settings: client and coach read" on public.client_settings for select to authenticated
  using (client_id = (select auth.uid()) or private.is_coach_of(client_id));
create policy "client_settings: client adds" on public.client_settings for insert to authenticated
  with check (client_id = (select auth.uid()));
create policy "client_settings: client edits" on public.client_settings for update to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

-- comments: the client and their coach read the thread; each writes, edits and deletes only their own.
create policy "comments: client and coach read" on public.comments for select to authenticated
  using (client_id = (select auth.uid()) or private.is_coach_of(client_id));
create policy "comments: write your own" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid())
              and (client_id = (select auth.uid()) or private.is_coach_of(client_id)));
create policy "comments: edit your own" on public.comments for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid())
              and (client_id = (select auth.uid()) or private.is_coach_of(client_id)));

-- 6. Functions the app calls -----------------------------------------------------------------------

-- A coach makes a single-use code that a client types (or opens as ?invite=CODE).
create function public.create_invite(p_days integer default 7) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- no 0/O, 1/I/L to misread
  v_bytes bytea;
  v_code text;
begin
  if not private.is_coach() then
    raise exception 'Only coaches can create invites' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 30 then
    raise exception 'An invite lasts 1 to 30 days' using errcode = '22023';
  end if;
  loop
    v_bytes := extensions.gen_random_bytes(12);
    v_code := '';
    for i in 0..11 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 31) + 1, 1);
    end loop;
    begin
      insert into public.invites (code, coach_id, expires_at)
      values (v_code, (select auth.uid()), now() + make_interval(days => p_days));
      return v_code;
    exception when unique_violation then
      null;  -- practically impossible; draw another code
    end;
  end loop;
end $$;

-- A client redeems a code: once, before it expires, and not if they already have another coach.
-- A wrong code and an expired one get the same message, so the reply doesn't help anyone guess.
create function public.accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_coach uuid;
begin
  if v_me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles p where p.id = v_me and p.role = 'coach') then
    raise exception 'Coaches cannot join as clients' using errcode = '42501';
  end if;
  update public.invites
     set used_by = v_me, used_at = now()
   where code = upper(btrim(p_code)) and used_by is null and expires_at > now()
  returning coach_id into v_coach;
  if v_coach is null then
    raise exception 'This code is wrong or has expired' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.coach_clients cc
             where cc.client_id = v_me and cc.coach_id <> v_coach and cc.status <> 'archived') then
    raise exception 'You already have a coach. Leave them before joining another.' using errcode = 'P0001';
  end if;
  insert into public.coach_clients as cc (coach_id, client_id, status, started_at)
  values (v_coach, v_me, 'active', now())
  on conflict (coach_id, client_id) do update
    set status = 'active',
        started_at = case when cc.status = 'archived' then now() else cc.started_at end;
  return v_coach;
end $$;

-- Mark the other person's comments in a client's thread as read. Returns how many changed.
create function public.mark_comments_read(p_client uuid) returns integer
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
   where c.client_id = p_client and c.author_id <> v_me and c.read_at is null and c.deleted_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- 7. Privileges ----------------------------------------------------------------------------------
-- Supabase grants everything on new public tables and functions to anon and authenticated.
-- Take it all back, then grant only what the policies above are written for.

revoke all on table
  public.profiles, public.coach_clients, public.coach_notes, public.invites,
  public.programs, public.meal_plans, public.workout_sessions, public.food_logs,
  public.body_checkins, public.habit_days, public.client_settings, public.comments
  from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, phone, lang, avatar_path) on public.profiles to authenticated;  -- not role

grant select on public.coach_clients to authenticated;
grant update (status) on public.coach_clients to authenticated;

grant select, insert, update, delete on public.coach_notes to authenticated;
grant select, delete on public.invites to authenticated;

grant select, insert, update on public.programs, public.meal_plans to authenticated;
grant select, insert, update on
  public.workout_sessions, public.food_logs, public.body_checkins, public.habit_days, public.client_settings
  to authenticated;

grant select on public.comments to authenticated;
grant insert (id, client_id, author_id, target_type, target_ref, body) on public.comments to authenticated;  -- not read_at
grant update (body, deleted_at) on public.comments to authenticated;

revoke all on function public.create_invite(integer), public.accept_invite(text), public.mark_comments_read(uuid)
  from public, anon;
grant execute on function public.create_invite(integer), public.accept_invite(text), public.mark_comments_read(uuid)
  to authenticated;

revoke all on all functions in schema private from public, anon;
grant execute on function
  private.is_coach_of(uuid), private.is_client_of(uuid), private.is_coach(), private.can_read_progress_path(text)
  to authenticated;

-- 8. Progress photos ------------------------------------------------------------------------------
-- Private bucket; files at '<client id>/<yyyy-mm-dd>-<uuid>.webp'. Never make it public:
-- the app shows them through short-lived signed URLs.

insert into storage.buckets (id, name, public) values ('progress', 'progress', false)
  on conflict (id) do nothing;

create policy "progress photos: client adds to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'progress' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "progress photos: client replaces own" on storage.objects for update to authenticated
  using (bucket_id = 'progress' and split_part(name, '/', 1) = (select auth.uid())::text)
  with check (bucket_id = 'progress' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "progress photos: client deletes own" on storage.objects for delete to authenticated
  using (bucket_id = 'progress' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "progress photos: client and coach read" on storage.objects for select to authenticated
  using (bucket_id = 'progress' and private.can_read_progress_path(name));

commit;
