-- ============================================================
-- MANAGEMENT-V1 migration 0001 -- canonical schema (Phase 8 FINAL_SCHEMA.md)
-- Portable PostgreSQL. On Supabase, conditional blocks attach auth.users links.
-- Classification: every object NEW. Do NOT weaken constraints for convenience.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id              uuid primary key,
  full_name       text not null,
  phone           text not null unique,
  role            text not null default 'WORKER'
                  check (role in ('WORKER','STAFF','SUPERADMIN')),
  status          text not null default 'PENDING'
                  check (status in ('PENDING','ACTIVE','INACTIVE','SUSPENDED')),
  salary_rate     integer not null default 0 check (salary_rate >= 0),
  advance_balance integer not null default 0 check (advance_balance >= 0),
  joined_on       date not null default current_date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Attach to Supabase Auth identity when the auth schema exists (Phase 8 E-01).
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'auth') then
    alter table public.profiles
      add constraint profiles_id_auth_fkey
      foreign key (id) references auth.users(id) on delete restrict;
  end if;
end $$;

-- ---------- production_entries ----------
create table if not exists public.production_entries (
  id            uuid primary key default gen_random_uuid(),
  worker_id     uuid not null references public.profiles(id),
  work_date     date not null,
  count         integer not null check (count >= 0),
  note          text,
  deleted_at    timestamptz,
  deleted_by    uuid,
  delete_reason text,
  created_at    timestamptz not null default now()
);
-- C-01 one entry per worker per day (hard-delete default form; partial swap documented for D-02)
create unique index if not exists uq_production_worker_day
  on public.production_entries (worker_id, work_date);
create index if not exists ix_production_workdate on public.production_entries (work_date);

-- ---------- material_assignments ----------
create table if not exists public.material_assignments (
  id            uuid primary key default gen_random_uuid(),
  worker_id     uuid not null references public.profiles(id),
  material_type text not null check (material_type in ('PAGDI','WARP')),
  started_on    date not null,
  finished_on   date,
  capacity      integer not null check (capacity >= 0),
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (finished_on is null or finished_on >= started_on)
);
-- C-03 ONE-ACTIVE invariant -- DATABASE-enforced regardless of caller
create unique index if not exists uq_material_one_active
  on public.material_assignments (worker_id, material_type)
  where finished_on is null;
create index if not exists ix_material_worker_started
  on public.material_assignments (worker_id, started_on desc);

-- ---------- weekly_ledger ----------
create table if not exists public.weekly_ledger (
  id              uuid primary key default gen_random_uuid(),
  worker_id       uuid not null references public.profiles(id),
  week_start      date not null,
  week_end        date not null,
  pieces          integer not null default 0 check (pieces >= 0),
  rate            integer not null default 0 check (rate >= 0),
  gross           integer not null default 0 check (gross >= 0),
  advance_applied integer not null default 0,
  final_pay       integer not null default 0,
  paid            boolean not null default false,
  paid_on         date,
  settlement_note text,
  canonical       boolean not null default false,
  source          text not null check (source in ('SETTLEMENT','ARCHIVE')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (week_end = week_start + 6)
);
-- C-05 one row per worker-week
create unique index if not exists uq_ledger_worker_week
  on public.weekly_ledger (worker_id, week_start, week_end);
create index if not exists ix_ledger_week_start on public.weekly_ledger (week_start);
-- IX-10 optional partial -- created now, harmless
create index if not exists ix_ledger_unpaid_partial
  on public.weekly_ledger (week_start) where paid = false;

-- ---------- audit_events (unified append-only -- ADR-006) ----------
create table if not exists public.audit_events (
  id          uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id    uuid,
  actor_kind  text not null check (actor_kind in ('USER','SYSTEM')),
  actor_name  text not null default '',
  entity_type text not null,
  entity_id   uuid,
  action      text not null,
  before      jsonb,
  after       jsonb,
  note        text not null default ''
);
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'auth') then
    alter table public.audit_events
      add constraint audit_actor_auth_fkey
      foreign key (actor_id) references auth.users(id) on delete set null;
  end if;
end $$;
create index if not exists ix_audit_occurred on public.audit_events (occurred_at desc);
create index if not exists ix_audit_entity on public.audit_events (entity_type, entity_id);

-- ---------- archive_runs ----------
create table if not exists public.archive_runs (
  id             uuid primary key default gen_random_uuid(),
  week_start     date not null,
  week_end       date not null,
  triggered_by   text not null check (triggered_by in ('CRON','OPERATOR')),
  actor_id       uuid,
  rows_created   integer not null default 0,
  rows_refreshed integer not null default 0,
  dry_run        boolean not null default false,
  note           text not null default '',
  created_at     timestamptz not null default now(),
  check (week_end = week_start + 6)
);
create index if not exists ix_archive_runs_week on public.archive_runs (week_start, week_end);

-- ---------- updated_at maintenance ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_touch_profiles on public.profiles;
create trigger trg_touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_material on public.material_assignments;
create trigger trg_touch_material before update on public.material_assignments
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_ledger on public.weekly_ledger;
create trigger trg_touch_ledger before update on public.weekly_ledger
  for each row execute function public.touch_updated_at();
