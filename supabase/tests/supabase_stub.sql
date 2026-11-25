-- A small stand-in for the parts of a Supabase project our migrations rely on:
-- the API roles, auth.users and auth.uid(), and the storage tables.
-- Used only by the local database tests (npm run test:db). Never run this on the real project.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role supabase_auth_admin nologin noinherit;

-- Stricter than Supabase: whatever postgres creates in public is granted to anon and authenticated,
-- so a table or function the migration forgets to lock down shows up in the tests. service_role gets
-- what a Supabase project gives it today on new tables (no reading or writing), so a grant the push
-- function needs and the migration forgot shows up too.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant truncate, references, trigger on tables to service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  aud                varchar(255),
  role               varchar(255),
  email              text unique,
  raw_app_meta_data  jsonb,
  raw_user_meta_data jsonb not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz
);
grant select, insert, update, delete on auth.users to supabase_auth_admin;

-- Same behaviour as Supabase's auth.uid(): the "sub" claim of the request's JWT.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role, supabase_auth_admin;

create schema storage;
grant usage on schema storage to anon, authenticated, service_role;

create table storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text not null,
  owner      uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;

-- pg_net, Vault and pg_cron: stand-ins that record what would happen, so the tests can read it.
create schema net;
create table net.calls (id bigserial primary key, url text, body jsonb, headers jsonb, at timestamptz not null default now());
create function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
                              headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000) returns bigint
language sql as $$ insert into net.calls (url, body, headers) values (url, body, headers) returning id $$;

create schema vault;
create table vault.secrets (name text primary key, secret text not null);
create view vault.decrypted_secrets as select name, secret as decrypted_secret from vault.secrets;

create schema cron;
create table cron.job (jobname text primary key, schedule text not null, command text not null);
create function cron.schedule(job_name text, schedule text, command text) returns bigint
language sql as $$
  insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command;
  select 1::bigint
$$;
