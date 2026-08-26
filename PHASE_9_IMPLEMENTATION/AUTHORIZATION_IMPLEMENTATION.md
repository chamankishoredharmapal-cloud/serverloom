# AUTHORIZATION_IMPLEMENTATION.md (Phase 9.2)

## Model (per Phase 7 SECURITY_ARCHITECTURE / Phase 8 DATABASE_SECURITY)

Three enforcement layers, no reliance on UI:

1. **Route/session layer** — `src/lib/auth.ts` + layouts: anonymous → redirect `/login`; WORKER → `/app/*` only; STAFF/SUPERADMIN → `/admin/*`; audit viewer additionally gated to SUPERADMIN inside the page.
2. **Service/action layer** — every server action calls `requireStaff()` (or identity) BEFORE validation; services never trust client-supplied employee ids for authorization of *reads* (worker reads resolve identity server-side from session).
3. **Database layer** — RLS policies + privilege revokes (0002) and security-definer RPCs that re-verify role claims (0003). Client roles hold ZERO table-write grants.

Approval gate (BR-022): `login()` refuses any session for status ≠ ACTIVE; registration creates PENDING with zeroed defaults (BR-025).

## Auth provider status — HONEST SPLIT

| Path | Status |
| ---- | ------ |
| Local-mode auth (app_credentials bridge, scrypt hashes, HMAC-signed httpOnly SameSite cookie) | IMPLEMENTED + exercised via HTTP smoke boot path |
| Supabase Auth ↔ `auth.uid()` ↔ RLS claims | **NOT WIRED** — requires a live Supabase project (env contract already in `.env.example`; conditional migration blocks activate automatically when `auth` schema exists) |

Consequence: production-grade JWT↔RLS behavior is DESIGNED but NOT VERIFIED at runtime; the vanilla-PG stub denies by default, so fail-closed posture is verified (`current_profile_id()` → NULL ⇒ policies deny).

## Runtime evidence

HTTP smoke (real Next.js server + real Postgres), 8/8 PASS:
anonymous `/`, `/admin`, `/app`, `/api/export/*` all redirect-blocked · ops endpoints 401 without/with-wrong secret · correct secret executes dry-run archive.

DB-level authorization checks within verify harness: client-role UPDATE/DELETE on audit_events provably revoked; FORBIDDEN raised for non-staff callers without owner escape.
