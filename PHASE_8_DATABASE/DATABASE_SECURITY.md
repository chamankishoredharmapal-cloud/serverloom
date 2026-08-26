# DATABASE_SECURITY.md (Phase 8.16)

Security model for the chosen platform (Supabase PostgreSQL), designed from Phase 7 SECURITY_ARCHITECTURE; every external weakness explicitly classified rather than inherited.

## Credential & role topology

| Principal | Credentials | Reach |
| --------- | ----------- | ----- |
| anon key (client) | publishable | zero data access except policies explicitly allowing (none planned beyond health) |
| authenticated worker JWT | session token | RLS-scoped: SELECT own rows only; NO domain writes |
| authenticated staff JWT | session token | reads via RLS staff policy; writes ONLY through security-definer RPCs that re-verify claim |
| service_role key | SECRET — server env only, NEVER in client bundle | bypasses RLS; used exclusively by trusted server layer/cron |
| CRON_SECRET | server env | gates scheduled archive endpoint |
| superadmin (human) | staff JWT + SUPERADMIN role claim | + audit SELECT |

Build-time obligation: bundle scan asserting no secret material ships client-side (Phase 7 §6).

## Row-Level Security floor

```sql
-- worker self-reads
CREATE POLICY p_worker_read ON production_entries FOR SELECT TO authenticated
  USING (worker_id = (select id from profiles where user_id = auth.uid())
         and (select role from profiles where …) = 'WORKER');
-- equivalent own-row policies for material_assignments / weekly_ledger
-- staff read-all policy; NO insert/update/delete grants on domain tables to client roles at all
```
Writes flow exclusively through security-definer RPCs (search_path pinned) which re-check role claims — the "RLS floor + service rules" layer contract (Phase 7 X-10). Policy test-suite = migration-gated (CONSTRAINT_SPECIFICATION obligations).

## Network & transport

TLS enforced by provider endpoints; no public port scanning surface beyond provider API; direct DB connection strings restricted to server environments. If direct Postgres wire access is ever enabled for tooling, IP-restrict + separate role with least privilege.

## Injection protection

Parameterized queries only (typed query layer / supabase-js / pg parameters). No string-concatenated SQL anywhere; RPC bodies are version-controlled SQL reviewed like code.

## Secrets management

Env-var contract per environment; fail-fast boot validation (external SEC63-008 KEEP); rotation procedure documented for service_role/CRON_SECRET (quarterly or on-suspicion); dumps bucket credentials separate from app credentials (blast-radius separation).

## Audit interplay

All security-relevant mutations emit audit_events inside their transactions (AUDIT_HISTORY doc) — authorization failures at middleware layer logged as category-only events without enumeration leaks (BR-022 parity).

## What moves to US if we ever self-host (standing answer)

Patching/upgrades · backup pipeline + offsite + restore drills · monitoring/alerting · TLS certificate lifecycle · network/firewall posture · failover/HA design · incident response · physical/security-patch trust. This list is WHY Option B lost (DATABASE_DECISION): each item is a recurring obligation a solo operator must price into TCO, not a one-time setup.

## External-posture inheritance table (KEEP/IMPROVE/REJECT summary — full detail Phase 7)

| External item | Verdict here |
| ------------- | ------------ |
| approval gate before any session | KEEP (status≠ACTIVE ⇒ no claims) |
| CSRF/method discipline | IMPROVE (server-action semantics + SameSite; GET never mutates) |
| structural employee isolation | KEEP+strengthen → now DATABASE-enforced RLS |
| fail-fast secrets/env hosts | KEEP pattern w/ schema validation |
| generic credential errors | KEEP |
| no throttle / weak passwords | IMPROVE (provider auth policies + edge rate limiting — D-10 defaults) |
| staff≡admin flatness | BUSINESS DECISION REQUIRED (single-workshop may keep; least-privilege option documented) |
| unaudited sensitive mutations | REJECT — audits mandatory by architecture |
| cascade ledger destruction | REJECT — RESTRICT default (D-13) |
| inert dual paths | REJECT — single paths only |
