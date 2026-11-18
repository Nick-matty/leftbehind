-- ============================================================================
-- LeftBehind — TEST-ONLY schema shims
--
-- A Supabase project provides `auth`, `storage` and the `anon` / `authenticated`
-- roles before any project migration runs. A plain PostgreSQL cluster does not,
-- so this file recreates the minimum surface the migrations touch.
--
-- DO NOT APPLY THIS FILE TO A SUPABASE PROJECT OR TO PRODUCTION. It defines a
-- permissive `auth.uid()` and an empty `storage.objects`; both are replaced by
-- the platform in a real deployment.
--
-- Used by scripts/local_db.sh only.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Roles that PostgREST switches to per request
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- auth schema: just enough for the profile trigger and auth.uid()
-- ---------------------------------------------------------------------------
create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

-- PostgREST publishes the verified claims as a transaction-local setting.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant execute on function auth.role() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- storage schema: buckets + objects so the storage policies can be created
-- ---------------------------------------------------------------------------
create schema if not exists storage;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text unique not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text not null references storage.buckets (id),
  name       text not null,
  owner      uuid,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)];
$$;

alter table storage.objects enable row level security;

grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;

-- ---------------------------------------------------------------------------
-- tests schema: assertion recording
-- ---------------------------------------------------------------------------
create schema if not exists tests;

create table if not exists tests.results (
  id         bigserial primary key,
  name       text not null,
  ok         boolean not null,
  detail     text,
  created_at timestamptz not null default now()
);

-- Security definer: assertions must be recorded even while the session is
-- running as `anon` or `authenticated`, which have no INSERT on this table.
create or replace function tests.record(p_name text, p_ok boolean, p_detail text default null)
returns void
language sql
security definer
set search_path = tests, pg_temp
as $$
  insert into tests.results (name, ok, detail)
  values (p_name, coalesce(p_ok, false), p_detail);
$$;

-- Compare a single scalar result against an expected text value.
create or replace function tests.check_eq(p_name text, p_sql text, p_expected text)
returns void
language plpgsql
security invoker
as $$
declare
  v text;
begin
  begin
    execute p_sql into v;
  exception when others then
    perform tests.record(p_name, false, 'unexpected error ' || sqlstate || ': ' || sqlerrm);
    return;
  end;

  perform tests.record(p_name, v is not distinct from p_expected, coalesce(v, '<null>'));
end
$$;

-- Assert that a statement raises a specific SQLSTATE.
create or replace function tests.err(p_name text, p_sql text, p_expected_state text)
returns void
language plpgsql
security invoker
as $$
declare
  v_state text;
begin
  begin
    execute p_sql;
    v_state := null;
  exception when others then
    v_state := sqlstate;
  end;

  perform tests.record(p_name, v_state is not distinct from p_expected_state, coalesce(v_state, '<no error>'));
end
$$;

-- Assert how many rows a DML statement affects (0 proves RLS filtered it out).
create or replace function tests.dml(p_name text, p_sql text, p_expected_rows integer)
returns void
language plpgsql
security invoker
as $$
declare
  n integer;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
  exception when others then
    perform tests.record(p_name, false, 'unexpected error ' || sqlstate || ': ' || sqlerrm);
    return;
  end;

  perform tests.record(p_name, n = p_expected_rows, n::text || ' row(s)');
end
$$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;
