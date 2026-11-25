-- Gym Log: subscriptions (phase 6 of docs/coach-plan.md)
--
-- Run once, after 0001 to 0004.
--   1. what's paid: coach_clients.paid_until, and the payments a coach records
--   2. the coach's access follows what's paid
--   3. reminders before a subscription ends, and on the day it has
--   4. privileges
--
-- Clients pay their coach outside the app (InstaPay, Vodafone Cash, cash, a bank transfer) and the coach
-- records it. While a subscription runs, nothing changes. Once it has ended, the client keeps logging as
-- usual, but the coach sees only what was logged up to the last paid day, and can't send programs, meal
-- plans or comments until the next payment. A client the coach never recorded a payment for has no end
-- date, and everything works as before.

begin;

-- 1. What's paid -------------------------------------------------------------------------------------
alter table public.coach_clients add column paid_until date;  -- the last day paid for; null: not tracked

create table public.payments (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  client_id  uuid not null references public.profiles (id) on delete cascade,
  amount     numeric(10, 2) not null check (amount >= 0 and amount <= 1000000),
  currency   text not null default 'EGP' check (currency = 'EGP'),
  method     text not null check (method in ('instapay', 'vodafone_cash', 'cash', 'bank', 'other')),
  days       integer not null check (days between 1 and 366),
  starts_on  date not null,
  ends_on    date not null,
  note       text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,  -- taken back (recorded by mistake)
  check (ends_on = starts_on + days - 1)
);
create index payments_link on public.payments (coach_id, client_id, ends_on);
alter table public.payments enable row level security;
create policy "payments: the coach and the client read" on public.payments for select to authenticated
  using (coach_id = (select auth.uid()) or client_id = (select auth.uid()));

-- A day of a subscription is a day in Egypt, where the coaches and clients are.
create function private.today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Africa/Cairo')::date
$$;

-- A coach records a payment. The subscription runs on from its last paid day, or from today if it had
-- ended or wasn't tracked yet. Returns the new last paid day.
create function public.record_payment(p_client uuid, p_amount numeric, p_days integer, p_method text, p_note text default null)
returns date
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_paid date;
  v_from date;
begin
  select cc.paid_until into v_paid
    from public.coach_clients cc
   where cc.coach_id = v_me and cc.client_id = p_client and cc.status <> 'archived'
     for update;
  if not found then
    raise exception 'Only their coach can record a payment' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 366 then
    raise exception 'A payment covers 1 to 366 days' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 0 or p_amount > 1000000 then
    raise exception 'Check the amount' using errcode = '22023';
  end if;
  if p_method is null or p_method not in ('instapay', 'vodafone_cash', 'cash', 'bank', 'other') then
    raise exception 'Choose how they paid' using errcode = '22023';
  end if;
  v_from := greatest(private.today(), coalesce(v_paid + 1, private.today()));
  insert into public.payments (coach_id, client_id, amount, method, days, starts_on, ends_on, note)
  values (v_me, p_client, round(p_amount, 2), p_method, p_days, v_from, v_from + p_days - 1, nullif(left(btrim(p_note), 200), ''));
  update public.coach_clients cc set paid_until = v_from + p_days - 1
   where cc.coach_id = v_me and cc.client_id = p_client;
  return v_from + p_days - 1;
end $$;

-- A payment recorded by mistake: the latest one can be taken back. The subscription then ends where the
-- one before it ended, or isn't tracked any more if it was the only one. Returns the last paid day.
create function public.withdraw_payment(p_payment uuid) returns date
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_client uuid;
  v_ends date;
  v_at timestamptz;
  v_paid date;
begin
  select p.client_id, p.ends_on, p.created_at into v_client, v_ends, v_at
    from public.payments p
   where p.id = p_payment and p.coach_id = v_me and p.deleted_at is null;
  if not found then
    raise exception 'No such payment' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.payments p
              where p.coach_id = v_me and p.client_id = v_client and p.deleted_at is null and p.id <> p_payment
                and (p.ends_on > v_ends or (p.ends_on = v_ends and p.created_at > v_at))) then
    raise exception 'Only the latest payment can be taken back' using errcode = 'P0001';
  end if;
  update public.payments p set deleted_at = now() where p.id = p_payment;
  select max(p.ends_on) into v_paid
    from public.payments p
   where p.coach_id = v_me and p.client_id = v_client and p.deleted_at is null;
  update public.coach_clients cc set paid_until = v_paid
   where cc.coach_id = v_me and cc.client_id = v_client;
  return v_paid;
end $$;

-- Coming back through a new invite starts afresh: what the client paid before doesn't carry over.
create or replace function public.accept_invite(p_code text) returns uuid
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
  if exists (select 1 from public.coach_clients cc where cc.client_id = v_me and cc.status <> 'archived') then
    raise exception 'You already have a coach. Leave them before joining another.' using errcode = 'P0001';
  end if;
  update public.invites
     set used_by = v_me, used_at = now()
   where code = upper(btrim(p_code)) and used_at is null and expires_at > now()
  returning coach_id into v_coach;
  if v_coach is null then
    raise exception 'This code is wrong or has expired' using errcode = 'P0001';
  end if;
  insert into public.coach_clients as cc (coach_id, client_id, status, started_at)
  values (v_coach, v_me, 'active', now())
  on conflict (coach_id, client_id) do update
    set status = 'active',
        started_at = case when cc.status = 'archived' then now() else cc.started_at end,
        paid_until = case when cc.status = 'archived' then null else cc.paid_until end;
  return v_coach;
end $$;

-- 2. The coach's access follows what's paid ----------------------------------------------------------
-- They may look at one of the client's days: they coach them, and the day is inside what's paid (or
-- payments aren't tracked for this client).
create function private.coach_sees(p_client uuid, p_day date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.coach_clients cc
     where cc.coach_id = (select auth.uid()) and cc.client_id = p_client and cc.status <> 'archived'
       and (cc.paid_until is null or p_day <= cc.paid_until))
$$;
-- They may send something now: they coach them, and the subscription hasn't ended.
create function private.coach_active(p_client uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.coach_clients cc
     where cc.coach_id = (select auth.uid()) and cc.client_id = p_client and cc.status <> 'archived'
       and (cc.paid_until is null or cc.paid_until >= private.today()))
$$;

alter policy "workout_sessions: client and coach read" on public.workout_sessions
  using (client_id = (select auth.uid()) or private.coach_sees(client_id, date));
alter policy "food_logs: client and coach read" on public.food_logs
  using (client_id = (select auth.uid()) or private.coach_sees(client_id, date));
alter policy "body_checkins: client and coach read" on public.body_checkins
  using (client_id = (select auth.uid()) or private.coach_sees(client_id, date));
alter policy "habit_days: client and coach read" on public.habit_days
  using (client_id = (select auth.uid()) or private.coach_sees(client_id, date));
alter policy "comments: client and coach read" on public.comments
  using (client_id = (select auth.uid()) or private.coach_sees(client_id, (created_at at time zone 'Africa/Cairo')::date));
alter policy "comments: write your own" on public.comments
  with check (author_id = (select auth.uid())
              and (client_id = (select auth.uid()) or private.coach_active(client_id)));
alter policy "programs: coach creates" on public.programs
  with check (coach_id = (select auth.uid()) and private.is_coach()
              and (client_id is null or private.coach_active(client_id)));
alter policy "programs: coach edits" on public.programs
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) and (client_id is null or private.coach_active(client_id)));
alter policy "meal_plans: coach creates" on public.meal_plans
  with check (coach_id = (select auth.uid()) and private.is_coach()
              and (client_id is null or private.coach_active(client_id)));
alter policy "meal_plans: coach edits" on public.meal_plans
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) and (client_id is null or private.coach_active(client_id)));

-- Progress photos are named after their day ('<client>/<yyyy-mm-dd>-...'): the same rule as the log.
create or replace function private.can_read_progress_path(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_day date;
begin
  if split_part(p_name, '/', 1) = (select auth.uid())::text then
    return true;
  end if;
  begin
    v_day := left(split_part(p_name, '/', 2), 10)::date;
  exception when others then
    v_day := null;  -- not a name the app made: only its owner sees it
  end;
  return exists (
    select 1 from public.coach_clients cc
     where cc.coach_id = (select auth.uid()) and cc.status <> 'archived'
       and cc.client_id::text = split_part(p_name, '/', 1)
       and (cc.paid_until is null or (v_day is not null and v_day <= cc.paid_until)));
end $$;

-- A client's new comment reaches their coach only while the subscription runs.
create or replace function private.comment_jobs(p_comment uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with c as (
    select c.id, c.client_id, c.author_id, c.body, c.author_id = c.client_id as from_client
      from public.comments c
     where c.id = p_comment and c.deleted_at is null
  ), told as (
    select cc.coach_id as to_id, c.* from c
      join public.coach_clients cc on cc.client_id = c.client_id and cc.status <> 'archived'
                                  and (cc.paid_until is null or cc.paid_until >= private.today())
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

-- 3. Reminders ---------------------------------------------------------------------------------------
-- Once a day: three days before a subscription ends, and the day after its last paid day, the client and
-- the coach are told (once for each). Paused clients aren't.
create table private.renewals_sent (
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  client_id  uuid not null references public.profiles (id) on delete cascade,
  paid_until date not null,
  kind       text not null check (kind in ('soon', 'ended')),
  primary key (coach_id, client_id, paid_until, kind)
);

create function private.send_renewals(p_now timestamptz default now()) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (p_now at time zone 'Africa/Cairo')::date;
  v_jobs jsonb;
  v_count integer;
begin
  with due as (
    select cc.coach_id, cc.client_id, cc.paid_until, case when cc.paid_until = v_today + 3 then 'soon' else 'ended' end as kind
      from public.coach_clients cc
     where cc.status = 'active' and (cc.paid_until = v_today + 3 or cc.paid_until = v_today - 1)
  ), fresh as (
    insert into private.renewals_sent (coach_id, client_id, paid_until, kind)
    select d.coach_id, d.client_id, d.paid_until, d.kind from due d
    on conflict do nothing
    returning coach_id, client_id, kind
  ), jobs as (
    select jsonb_build_object(
             'user', s.user_id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth, 'lang', s.lang,
             'title', case when f.kind = 'soon' then private.say(s.lang, 'Your coaching ends in 3 days', 'اشتراكك مع الكابتن بيخلص بعد ٣ أيام')
                           else private.say(s.lang, 'Your coaching has ended', 'اشتراكك مع الكابتن خلص') end,
             'body', case when f.kind = 'soon'
                       then private.say(s.lang, 'Renew with your coach to keep your program and comments coming.', 'جدّد مع الكابتن عشان البرنامج والتعليقات يفضلوا شغالين.')
                       else private.say(s.lang, 'Your coach won''t see what you log until you renew.', 'الكابتن مش هيشوف اللي بتسجّله لحد ما تجدد.') end,
             'url', './', 'tag', 'renewal') as job
      from fresh f join public.push_subscriptions s on s.user_id = f.client_id
    union all
    select jsonb_build_object(
             'user', s.user_id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth, 'lang', s.lang,
             'title', coalesce(nullif(btrim(p.full_name), ''), private.say(s.lang, 'Your client', 'المتدرب')),
             'body', case when f.kind = 'soon' then private.say(s.lang, 'Subscription ends in 3 days', 'الاشتراك بيخلص بعد ٣ أيام')
                          else private.say(s.lang, 'Subscription ended', 'الاشتراك خلص') end,
             'url', 'coach.html#client=' || f.client_id || '&tab=payments', 'tag', 'renewal-' || f.client_id)
      from fresh f
      join public.push_subscriptions s on s.user_id = f.coach_id
      left join public.profiles p on p.id = f.client_id
  )
  select (select count(*) from fresh)::integer, coalesce((select jsonb_agg(j.job) from jobs j), '[]'::jsonb)
    into v_count, v_jobs;
  perform private.push(v_jobs);
  delete from private.renewals_sent r where r.paid_until < v_today - 60;
  return v_count;
end $$;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('gymlog-renewals', '7 7 * * *', 'select private.send_renewals()');  -- 09:07 in Cairo (winter)
  end if;
end $$;

-- 4. Privileges --------------------------------------------------------------------------------------
revoke all on table public.payments from anon, authenticated;
grant select on public.payments to authenticated;  -- written only through record_payment() and withdraw_payment()

revoke all on function public.record_payment(uuid, numeric, integer, text, text), public.withdraw_payment(uuid) from public, anon;
grant execute on function public.record_payment(uuid, numeric, integer, text, text), public.withdraw_payment(uuid) to authenticated;

revoke all on function private.today(), private.coach_sees(uuid, date), private.coach_active(uuid), private.send_renewals(timestamptz)
  from public, anon, authenticated;
grant execute on function private.today(), private.coach_sees(uuid, date), private.coach_active(uuid) to authenticated;  -- the policies use them
revoke all on table private.renewals_sent from public, anon, authenticated;

commit;
