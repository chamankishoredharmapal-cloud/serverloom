# 12_SECURITY_REQUIREMENTS.md

Final security requirements (Phase 7 design + Phase 10 proven posture + provider gate):

## Authentication
Supabase Auth email/password (min length 10, breach-check where available — D-10 default), httpOnly SameSite cookies, server-side session reads only. Status≠ACTIVE ⇒ NO session (BR-022). Local-mode bridge exists for dev only and is REMOVED before production.

## Authorization (3 enforced layers)
1 Route/middleware role guards · 2 service asserts (`requireStaff`) before validation · 3 Postgres RLS + security-definer RPC claim re-checks. Client roles hold zero table-write grants. UI hiding is explicitly not authorization.

## Isolation
Worker sees own rows only via `auth.uid()`-driven policies (runtime-proven A/B ★). Staff global-by-design (flat model; granular split = HUMAN DECISION). Audit read superadmin-only.

## Mutation safety
All writes POST/server-actions; GET never mutates (400s); CSRF via framework origin protections + SameSite; typed conflict errors instead of raw DB codes.

## Input validation & injection
Zod at every boundary mirrored by DB CHECKs; parameterized queries exclusively; pinned search_path in definer functions.

## Secrets & config
DATABASE_URL/anon/service-role/OPS_SECRET/CRON_SECRET in env only; fail-fast boot validation; bundle-scan obligation at build; rotation procedure documented.

## Abuse controls
Auth throttling at provider + edge middleware on mutation actions (D-10 defaults) — REQUIRED before production.

## Session management
Provider-managed JWT; interim TTL 7d rolling/30d absolute (D-14 open); logout destroys; expiry behavior verified at provider gate.

## Audit coupling
Every mutating RPC emits its event inside the tx; append-only privileges deny UPDATE/DELETE to all roles.

## Error handling
Domain taxonomy maps failures to safe messages; unknown errors logged server-side, generic client message; no stack/SQL/secret leakage anywhere.
