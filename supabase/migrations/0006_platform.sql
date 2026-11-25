-- Gym Log: a platform for more than one coach (phase 7 of docs/coach-plan.md)
--
-- Run once, after 0001 to 0005.
--   1. admins: whoever runs the platform, marked by hand (supabase/README.md), never through the API
--   2. a coach's page: a short bio and a logo, shown to whoever holds one of their invites, before signing up
--   3. what an admin does: make an account a coach, stop a coach, and see the numbers, never a client's log
--   4. privileges
--
-- Coaches are added by an admin only: someone creates an ordinary account in the app, and the admin makes
-- it a coach account by its email.

begin;

-- 1. Admins ------------------------------------------------------------------------------------------
alter table public.profiles add column is_admin boolean not null default false;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin)
$$;

-- 2. A coach's page ----------------------------------------------------------------------------------
-- The bio is theirs to write. avatar_path (from 0001) holds the logo: a file in their own folder of the
-- public bucket coach-logos, named by the app, so it can never point at anyone else's file.
alter table public.profiles add column bio text constraint profiles_bio check (char_length(bio) <= 300);
alter table public.profiles add constraint profiles_avatar_path check (
  avatar_path is null
  or (split_part(avatar_path, '/', 1) = id::text and avatar_path ~ '^[0-9a-f-]{36}/logo-[A-Za-z0-9-]{1,40}\.(webp|jpg|png)$'));

-- Logos are public on purpose: they're how a coach presents themself. Small pictures only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coach-logos', 'coach-logos', true, 524288, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "coach logos: a coach adds to their own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'coach-logos' and split_part(name, '/', 1) = (select auth.uid())::text and private.is_coach());
create policy "coach logos: a coach replaces their own" on storage.objects for update to authenticated
  using (bucket_id = 'coach-logos' and split_part(name, '/', 1) = (select auth.uid())::text)
  with check (bucket_id = 'coach-logos' and split_part(name, '/', 1) = (select auth.uid())::text and private.is_coach());
create policy "coach logos: a coach lists their own" on storage.objects for select to authenticated
  using (bucket_id = 'coach-logos' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "coach logos: a coach deletes their own" on storage.objects for delete to authenticated
  using (bucket_id = 'coach-logos' and split_part(name, '/', 1) = (select auth.uid())::text);

-- Who invited me? For someone holding a code that still works, before they have an account: the coach's
-- name, bio and logo, and nothing else. A code that doesn't work returns nothing.
create function public.invite_info(p_code text) returns table (coach_name text, bio text, logo text)
language sql stable security definer set search_path = '' as $$
  select p.full_name, p.bio, p.avatar_path
    from public.invites i
    join public.profiles p on p.id = i.coach_id and p.role = 'coach'
   where i.code = upper(btrim(p_code)) and i.used_at is null and i.expires_at > now()
$$;

-- 3. What an admin does ------------------------------------------------------------------------------
-- The platform in numbers: per coach, how many clients and subscriptions and what was recorded this month.
-- No client's name, log or payment line ever appears here.
create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date := private.today();
  v_month timestamptz := date_trunc('month', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo';
begin
  if not private.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'accounts', (select count(*) from auth.users),
    'coaches', (select count(*) from public.profiles p where p.role = 'coach'),
    'clients', (select count(distinct cc.client_id) from public.coach_clients cc where cc.status <> 'archived'),
    'recorded', (select coalesce(sum(pm.amount), 0) from public.payments pm where pm.deleted_at is null and pm.created_at >= v_month),
    'list', coalesce((
      select jsonb_agg(x.item order by x.sort)
        from (
          select lower(coalesce(p.full_name, u.email, '')) as sort, jsonb_build_object(
                   'id', p.id, 'name', p.full_name, 'email', u.email, 'admin', p.is_admin,
                   'active', (select count(*) from public.coach_clients cc where cc.coach_id = p.id and cc.status = 'active'),
                   'paused', (select count(*) from public.coach_clients cc where cc.coach_id = p.id and cc.status = 'paused'),
                   'paying', (select count(*) from public.coach_clients cc where cc.coach_id = p.id and cc.status <> 'archived' and cc.paid_until >= v_today),
                   'ended', (select count(*) from public.coach_clients cc where cc.coach_id = p.id and cc.status <> 'archived' and cc.paid_until < v_today),
                   'recorded', (select coalesce(sum(pm.amount), 0) from public.payments pm where pm.coach_id = p.id and pm.deleted_at is null and pm.created_at >= v_month),
                   'invites', (select count(*) from public.invites i where i.coach_id = p.id and i.used_at is null and i.expires_at > now())
                 ) as item
            from public.profiles p
            join auth.users u on u.id = p.id
           where p.role = 'coach'
        ) x), '[]'::jsonb));
end $$;

-- Make an account a coach, by the email it signed up with.
create function public.admin_make_coach(p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_role text;
  v_name text;
begin
  if not private.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  select u.id into v_id from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_id is null then
    raise exception 'No account with that email. They need to create one in the app first.' using errcode = 'P0001';
  end if;
  select p.role, p.full_name into v_role, v_name from public.profiles p where p.id = v_id;
  if v_role = 'coach' then
    return jsonb_build_object('id', v_id, 'name', v_name, 'already', true);
  end if;
  -- a coach can't be someone's client at the same time
  if exists (select 1 from public.coach_clients cc where cc.client_id = v_id and cc.status <> 'archived') then
    raise exception 'They are a client of a coach right now. They need to leave their coach first.' using errcode = 'P0001';
  end if;
  update public.profiles p set role = 'coach' where p.id = v_id;
  return jsonb_build_object('id', v_id, 'name', v_name, 'already', false);
end $$;

-- Stop a coach: only once they have no clients left, so nobody's coaching ends from one side. Their open
-- invites go; their account stays, as an ordinary one.
create function public.admin_stop_coach(p_coach uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if exists (select 1 from public.coach_clients cc where cc.coach_id = p_coach and cc.status <> 'archived') then
    raise exception 'They still have clients. They need to remove them first.' using errcode = 'P0001';
  end if;
  delete from public.invites i where i.coach_id = p_coach and i.used_at is null;
  update public.profiles p set role = 'client' where p.id = p_coach and p.role = 'coach';
end $$;

-- 4. Privileges --------------------------------------------------------------------------------------
grant update (bio) on public.profiles to authenticated;  -- is_admin stays out of reach, like role

revoke all on function public.invite_info(text), public.admin_overview(), public.admin_make_coach(text), public.admin_stop_coach(uuid)
  from public, anon;
grant execute on function public.invite_info(text) to anon, authenticated;  -- the one thing a visitor may ask
grant execute on function public.admin_overview(), public.admin_make_coach(text), public.admin_stop_coach(uuid) to authenticated;

revoke all on function private.is_admin() from public, anon, authenticated;  -- only used inside the functions above

commit;
