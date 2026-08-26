-- ============================================================
-- MANAGEMENT-V1 migration 0002 -- Row-Level Security floor
-- (Phase 8 DATABASE_SECURITY / Phase 7 X-02/X-10 layer contract)
--
-- Principle: client roles NEVER get table write grants; staff/worker reads are
-- RLS-scoped; ALL mutations flow through security-definer RPCs (0003) that
-- re-verify role claims. On non-Supabase Postgres (local integration tests)
-- auth.uid() does not exist -> policies evaluate via current_profile_id()
-- which returns NULL -> deny-by-default.
-- ============================================================

-- ---------- ensure platform client roles exist (parity on vanilla Postgres) ----------
-- Supabase provides anon/authenticated/service_role; plain instances get NOLOGIN
-- stand-ins so policies/grants behave identically and are locally testable via
-- SET ROLE. Requires owner/superuser to create — always true during migration.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

-- Identity bridge: resolve caller's profile id from JWT claims when present.
-- Created CONDITIONALLY because auth.uid() cannot be parsed without the auth schema
-- (plain Postgres / embedded test instances get the NULL stub = deny-by-default).
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'auth') then
    execute $fn$
      create or replace function public.current_profile_id() returns uuid
      language sql stable security definer set search_path = public, auth as
      'select p.id from public.profiles p where p.id = auth.uid()'
    $fn$;
  else
    execute $fn$
      create or replace function public.current_profile_id() returns uuid
      language sql stable security definer set search_path = public as
      'select null::uuid'
    $fn$;
  end if;
end $$;

create or replace function public.current_role_name() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = public.current_profile_id()
$$;

-- ---------- enable RLS ----------
alter table public.profiles             enable row level security;
alter table public.production_entries   enable row level security;
alter table public.material_assignments enable row level security;
alter table public.weekly_ledger        enable row level security;
alter table public.audit_events         enable row level security;
alter table public.archive_runs         enable row level security;

-- ---------- profiles ----------
-- worker: read own row; staff+: read all
drop policy if exists p_profiles_select on public.profiles;
create policy p_profiles_select on public.profiles for select to authenticated
  using (
    id = public.current_profile_id()
    or public.current_role_name() in ('STAFF','SUPERADMIN')
  );
-- no client UPDATE/INSERT policies: registration/approval/rate go through RPCs.

-- ---------- production_entries ----------
drop policy if exists p_production_select on public.production_entries;
create policy p_production_select on public.production_entries for select to authenticated
  using (
    worker_id = public.current_profile_id()
    or public.current_role_name() in ('STAFF','SUPERADMIN')
  );

-- ---------- material_assignments ----------
drop policy if exists p_material_select on public.material_assignments;
create policy p_material_select on public.material_assignments for select to authenticated
  using (
    worker_id = public.current_profile_id()
    or public.current_role_name() in ('STAFF','SUPERADMIN')
  );

-- ---------- weekly_ledger ----------
drop policy if exists p_ledger_select on public.weekly_ledger;
create policy p_ledger_select on public.weekly_ledger for select to authenticated
  using (
    worker_id = public.current_profile_id()
    or public.current_role_name() in ('STAFF','SUPERADMIN')
  );

-- ---------- audit_events: superadmin read-only ----------
drop policy if exists p_audit_select on public.audit_events;
create policy p_audit_select on public.audit_events for select to authenticated
  using (public.current_role_name() = 'SUPERADMIN');
-- NO insert/update/delete policies for ANY client role (append-only via RPC path).

-- ---------- archive_runs: staff+ read ----------
drop policy if exists p_archive_runs_select on public.archive_runs;
create policy p_archive_runs_select on public.archive_runs for select to authenticated
  using (public.current_role_name() in ('STAFF','SUPERADMIN'));

-- ---------- explicit hard denials for client roles ----------
revoke insert, update, delete on all tables in schema public from anon;
revoke insert, update, delete on all tables in schema public from authenticated;
grant insert on table public.audit_events to service_role; -- service path may append
revoke update, delete on table public.audit_events from service_role, authenticated, anon;
