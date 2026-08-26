# SECURITY_ARCHITECTURE.md (Phase 7.7)

Management-V1 security designed independently; external weaknesses are classified KEEP/IMPROVE/REJECT — never imported as-is. Presumed platform: Supabase Auth + Postgres RLS behind a Next.js server layer (ADR-001). Labels as standard.

## 1. Authentication
- Supabase Auth (email+password initially, phone optional later) — IMPROVE over external (no validators → full password policy via provider settings: min length 10, breach check where available).
- Session model: provider-managed JWT + httpOnly secure cookies (server components read session server-side only) — IMPROVE (external framework defaults, TTL unconfigured D-14).
- Approval gate: login flow refuses session issuance for profiles.status ≠ 'ACTIVE' with category-only messaging (parity BR-022, no enumeration) — PRESERVE requirement.
- Role resolution: `profiles.role` ('WORKER','STAFF','SUPERADMIN') mirrored into JWT app_metadata claims at promotion; server middleware trusts ONLY verified claims.
- D-14 session lifetime: BUSINESS DECISION REQUIRED — options documented in ADR section (default recommendation: 7-day rolling + absolute 30-day).

## 2. Authorization (defense in depth)
Layer 1 route/middleware guards per role. Layer 2 service asserts (role + object scope). Layer 3 Postgres RLS:
- worker role: SELECT own rows only (`worker_id = auth.uid()` mapping or profiles.id = auth.uid()); NO insert/update/delete on domain tables except none (workers are read-only per BR-035).
- staff role: SELECT all domain data; INSERT/UPDATE on operational tables ONLY via security-definer RPCs that re-check claims (prevents fat-fingered broad policies).
- audit tables: INSERT allowed to service role only; SELECT superadmin; UPDATE/DELETE denied to ALL incl. service role (append-only ◧).
- service_role key NEVER exposed client-side; all cross-worker operations execute through the server layer.
Object-level: workers structurally scoped (own-id reads); staff global by design (PG6.6-01 noted); SUPERADMIN reserved for /admin-equivalent surfaces.

## 3. Mutation safety
All writes POST/POST-like server actions; CSRF: SameSite=strict cookies + origin checks (Next.js server actions have built-in protections) — IMPROVE over token-middleware parity. Method discipline: GET never mutates (SEC63-004 preserved).
Idempotency/conflict controls: DB uniques (worker-day, worker-week, partial active-material) + typed conflict errors → friendly messages (BR-003 class preserved without 500s).

## 4. Rate limiting & abuse
External had NONE → REJECT-as-is, IMPROVE: provider-level + edge middleware throttling on auth endpoints and mutation actions (D-10 scope).

## 5. Input validation
Zod schemas shared client+server; DB CHECK constraints mirror critical ranges (count/rate/capacity ≥0; factor ≥0; week math). Negative payable remains LEGAL output (never clamped) — validation applies to INPUTS only.

## 6. Secrets & configuration
Service-role key, cron secret, storage keys — server env only; fail-fast boot validation (external SEC63-008 behavior PRESERVED/improved with schema validation at startup). No secret in client bundle (build-time audit obligation).

## 7. Auditability
Every mutating service call emits audit_events inside its tx (AUD63-006..009 satisfied by design, pending D-07 scope sign-off). Actor NULL/kind SYSTEM distinguishes operator jobs.

## 8. Data exposure & privacy
Exports/PDFs generated server-side, streamed; stored artifacts (if any) in PRIVATE bucket w/ signed short-lived URLs. PII minimized: phone visible to staff only (RLS column policy if needed), no email collection beyond auth identity unless product asks.

## 9. Backups / DR
Platform PITR enabled (Supabase) + scheduled logical dumps to private storage — RECOMMENDATION (external had NOTHING specified). Restore runbook + monthly restore drill obligation recorded.

## 10. Admin privileges
Superadmin surface separated from daily staff ops; privileged out-of-band corrections REQUIRE audit event with reason (fixes PG6.6-10 unaudited-surgery weakness) — IMPROVE.

## 11. External-posture classification table

| External observation | Class | M-V1 stance |
| -------------------- | ----- | ----------- |
| Approval gate + no-session refusal | KEEP | preserve exactly |
| POST+CSRF discipline | KEEP | preserve equivalent guarantees |
| Structural employee isolation | KEEP | preserve + RLS enforcement |
| Fail-fast secrets / env hosts | KEEP | preserve pattern |
| Generic credential errors | KEEP | preserve |
| No login throttle | IMPROVE | add |
| Weak/no password policy | IMPROVE | add provider policy |
| Free-form phone | IMPROVE | normalize digits (display unchanged) |
| Staff≡Admin flatness | BUSINESS DECISION REQUIRED | single-workshop may keep flatness; ADR documents least-privilege option |
| Unaudited sensitive mutations | REJECT | audits mandatory |
| TLS/cookie defaults unset | IMPROVE | enforce HSTS+secure cookies at host+app |
| Cascade ledger destruction | REJECT default | D-13 decision gates FK behavior |
| Inert dual paths / live-but-unreachable branches | REJECT | single paths only |

## 12. Residual risks register
RLS policy misconfiguration (mitigation: policy test-suite obligation + no client service-role key) · cron secret leakage (rotation + scoped function) · export PII handling (staff-gated already).
