# DATABASE_DECISION.md (Phase 8.5)

## DECISION

**ADOPT SUPABASE POSTGRESQL as the Management-V1 production database platform.**
First-time adoption for a verified-greenfield system (CURRENT_DATABASE_AUDIT.md) — not a retention decision. Tiering: **Free** for development/staging experiments · **Pro ($25/mo)** for production (always-on, daily backups 7-day retention, 8 GB DB — years of headroom). Re-evaluate compute add-ons only when measured load demands it (WORKLOAD_AND_SCALE: SMALL).

## Why this database?

Because it is the only candidate that satisfies EVERY requirement class natively while matching the Phase 7 architecture authority (SYSTEM_ARCHITECTURE, SECURITY_ARCHITECTURE, ADR-001):

1. **Integrity**: partial UNIQUE index makes the one-ACTIVE-material invariant physically impossible to violate (X-05) — the single most important concurrency guarantee of the domain.
2. **Security layering**: Supabase Auth issues the JWT whose claims (`auth.uid()`, role) drive RLS directly — worker self-row isolation (BR-035) becomes a DATABASE property, not an app promise. This closes the Phase 7 X-02/X-10 layer contract with zero custom plumbing.
3. **Transactional workflows**: security-definer RPCs implement assign/settlement/archive/advance as atomic units with in-lock active rechecks (SBG-01 lesson designed out).
4. **Managed recovery**: daily backups + optional PITR without a DBA; restore-drill obligation retained by us.
5. **TCO**: $25/mo predictable; overage dimensions (egress/MAU/storage) are orders of magnitude away at SMALL workload.
6. **Exit**: vanilla Postgres — `pg_dump` → any Postgres anywhere; schema carries zero Supabase-proprietary types.

## Why not self-hosted PostgreSQL?

Raw infra is cheapest (~$6/mo all-in on Hetzner) — and that number is misleading. It converts every managed guarantee into a personal obligation: backup pipeline + offsite rotation + monitoring/alerting + patch cadence + TLS + incident response + restore drills. For a solo/small team operating a payroll system of record, the dominant risks become *silent backup rot* and *unattended failure* — precisely the failure modes Phase 6 NFR-BAK flagged as unspecified and Phase 7 marked IMPROVE. The break-even math: at even a conservative 2 h/month of undifferentiated ops time, self-hosting costs more than $25/mo in effort alone, before pricing downtime risk. Chosen only if a future constraint (data residency, cost ceiling) makes managed tiers unacceptable — documented as the standing fallback, since exit is a dump away.

## Why not another managed PostgreSQL (Neon / Crunchy Bridge)?

Fully credible engines (EXCELLENT integrity/concurrency; competitive cost ≈ $8–15/mo typical). They lose on one decisive integration requirement: **no native auth-token→row-security bridge**. Adopting them forces building and maintaining the JWT→DB trust chain (custom claims settings, IdP choice, token verification path) — new security surface whose only payoff is a few dollars/month or scale-to-zero semantics this workload will never exploit (an always-on payroll grid is read weekly, written daily). Recorded as the first alternative if Supabase pricing/platform ever changes adversely.

## Why not SQLite?

Evaluated fairly (RULE 5): it wins cost/ops and its capacity/concurrency envelope is adequate for SMALL. It is rejected because it structurally cannot deliver three contract requirements regardless of tuning: (a) **server-enforced row-level isolation** (no RLS — BR-035 would degrade to app-code promise), (b) **managed, tested recovery** (DIY backup/WAL/restore), (c) **networked multi-client deployment topology** without funneling all access through one bespoke server process. The external application's SQLite locking incidents were treated as evidence about THAT app, not as the verdict; the verdict comes from these requirement failures alone.

## Cost & responsibilities

- Infra: dev $0 · prod **$25/mo** ($300/yr) + PITR add-on only if owner selects tighter-than-daily RPO (BUSINESS DECISION REQUIRED on RPO/RTO).
- Our responsibilities: schema migrations (versioned SQL), RLS policy correctness (+ policy test suite), RPC logic, backup-restore DRILL cadence, secret hygiene (service-role key server-only), spend-cap configuration.
- Provider responsibilities: engine patching, availability, infrastructure durability, daily snapshot execution.

## Risks & mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Platform dependency drift (Auth/Edge conveniences) | Domain core kept framework-free (Phase 7); data layer 100% portable |
| Free-tier dev pause disrupting CI | Use paid project for any always-on integration env, or tolerate pause in dev only |
| RLS policy mistake exposes rows | Policy test-suite obligation (Phase 7 R2) + service-role never client-side |
| Provider price/policy shift | Standing fallbacks documented above; quarterly re-check during ops reviews |

## Future migration path

`pg_dump`/restore to any Postgres (self-hosted, Neon, Crunchy, RDS) at any time; Auth migration is the only coupled component and has known export paths. Decision reversal cost: LOW.

## What happens if the provider becomes unavailable?

Data remains recoverable from the latest snapshot/dump into any Postgres target; application re-points via `DATABASE_URL`. Availability risk is bounded by the same regional/hosting strategy as the app tier (Vercel), i.e., acceptable for a single-workshop internal system; formal availability targets remain BUSINESS DECISION REQUIRED (D-list).
