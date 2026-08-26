-- 0004_dev_auth_bridge.sql - NON-PRODUCTION BRIDGE ONLY.
-- Production authentication is Supabase Auth (auth.users - profiles.id).
-- This table enables complete end-to-end flows on plain Postgres instances
-- (local dev / CI) until a Supabase project is connected. Remove once wired.
create table if not exists public.app_credentials (
  profile_id    uuid primary key references public.profiles(id) on delete cascade,
  password_hash text not null,
  created_at    timestamptz not null default now()
);
alter table public.app_credentials enable row level security;
