# DATABASE_OPTIONS_COMPARISON.md (Phase 8.4)

Candidates evaluated against DATABASE_REQUIREMENTS (8.1) for a verified-greenfield, SMALL-workload, integrity-critical payroll system. Pricing verified July–August 2026 (sources cited in TCO_ANALYSIS.md); anything unverifiable is NOT VERIFIED. Ratings: EXCELLENT / GOOD / ACCEPTABLE / WEAK / UNSUITABLE.

## Option A — SUPABASE POSTGRESQL (managed; Auth+Storage+RLS platform)

| # | Dimension | Rating | Notes |
| - | --------- | ------ | ----- |
| 1 | Data integrity | EXCELLENT | real Postgres: CHECKs, uniques, partial unique index, FK behaviors |
| 2 | Transactions | EXCELLENT | ACID; security-definer RPCs give atomic multi-table ops (Phase 7 ADR-002/007) |
| 3 | Concurrency | EXCELLENT | MVCC + row locks + advisory locks; provider pooling included |
| 4 | RLS/security | EXCELLENT | full RLS; policies identical on every tier |
| 5 | Auth integration | EXCELLENT | Supabase Auth JWT claims drive RLS directly (`auth.uid()`) — exactly the Phase 7 security layer contract |
| 6 | Reporting | GOOD | plain SQL/views; exports generated app-side anyway |
| 7 | Audit history | EXCELLENT | append-only tables + privileges deny UPDATE/DELETE; survives independent of app bugs |
| 8 | Backups | GOOD | Pro: daily, 7-day retention; PITR add-on available. Free: NONE automated |
| 9 | Recovery | GOOD | dashboard restores + PITR; restore drill still an operator obligation |
| 10 | Monitoring | GOOD | built-in dashboards/logs |
| 11 | Scalability | GOOD | compute ladder Micro→Large; years of headroom at this scale |
| 12 | Availability | GOOD | managed; no SLA until Team tier (acceptable: BDR-class need) |
| 13 | Maintenance | EXCELLENT | zero DBA work: patching, upgrades, failover handled |
| 14 | Deployment complexity | EXCELLENT | project-per-env; branching via separate projects |
| 15 | Developer complexity | EXCELLENT | matches team's presumed stack vocabulary (ADR-001) |
| 16 | Migration complexity (future exit) | GOOD | 100% vanilla Postgres — `pg_dump`/restore portable ("100% portable, no vendor lock-in", supabase.com/database) |
| 17 | Vendor lock-in | ACCEPTABLE | schema portable; lock-in limited to Auth+Edge conveniences (documented seam) |
| 18 | Monthly infra cost | GOOD | dev $0 · prod $25 (Pro incl. Micro compute credit) · +$0.09/GB egress beyond 250GB (irrelevant here) |
| 19 | TCO | GOOD | ≈ infra cost; ops burden minimal |
| 20 | Failure/recovery risk | LOW-MED | provider outage risk shared w/ app host choice; PITR mitigates human error |

## Option B — SELF-HOSTED POSTGRESQL (e.g., Hetzner CX22 ≈ $4.35–5.49/mo, verified 2026)

| # | Dimension | Rating | Notes |
| - | --------- | ------ | ----- |
| 1–3 | Integrity/tx/concurrency | EXCELLENT | same Postgres engine |
| 4 | RLS/security | GOOD (engine) / WEAK (operation) | RLS exists but every policy, role grant, network rule, TLS cert, patch cycle becomes manual |
| 5 | Auth integration | WEAK | no managed auth↔claims layer; must build JWT→DB trust (auth hook or external IdP wiring) — new security surface |
| 6 | Reporting | GOOD | |
| 7 | Audit history | GOOD | same mechanics, self-managed |
| 8 | Backups | WEAK default | pgBackRest/WAL-G must be installed, configured, monitored; off-site storage arranged; restore drills owned by us |
| 9 | Recovery | WEAK | untested-until-disaster unless drills scheduled; disk-loss scenario = our runbook |
| 10 | Monitoring | WEAK | assemble own (alerts, disk, slow-query) or accept blindness |
| 11 | Scalability | GOOD | vertical headroom ample |
| 12 | Availability | WEAK | single VPS = single point of failure; HA = multi-instance complexity |
| 13 | Maintenance | UNSUITABLE-for-solo-ops | OS+PG patching, cert renewal, incident response at 2am — recurring hours |
| 14 | Deployment complexity | WEAK | full stack ownership |
| 15 | Developer complexity | WEAK | DevOps skill demand |
| 16 | Migration complexity | GOOD | plain Postgres |
| 17 | Lock-in | EXCELLENT | none |
| 18 | Monthly infra cost | EXCELLENT | ≈ $5 + backups(≈20%) ≈ **$6/mo** |
| 19 | TCO | MEDIOCRE | infra cheapest; true cost = operator hours + recovery-risk premium. At solo-operator valuation of time, exceeds Option A quickly; "₹0-effort" assumption false |
| 20 | Failure/recovery risk | HIGH vs A | unmonitored backup rot is the classic failure mode |

## Option C — OTHER MANAGED POSTGRESQL (Neon serverless; Crunchy Bridge from ~$10/mo)

| # | Dimension | Rating | Notes |
| - | --------- | ------ | ----- |
| 1–3 | Integrity/tx/concurrency | EXCELLENT | real Postgres; Neon pooling built-in |
| 4 | RLS/security | EXCELLENT (engine feature parity) | RLS works; but no integrated auth-token bridge — app must wire claims itself |
| 5 | Auth integration | WEAK/ACCEPTABLE | Neon/Crunchy are DB-only: pair with NextAuth/Clerk/etc. + custom `ALTER ROLE` claim settings or proxy — extra design surface vs Option A's native path |
| 6–7 | Reporting/Audit | EXCELLENT | |
| 8–9 | Backups/Recovery | GOOD | Neon: PITR 7d @$0.20/GB-mo (Launch), scale-to-zero; Crunchy: managed backups |
| 10–12 | Monitoring/Scalability/Availability | GOOD | Neon scale plan has 99.95% SLA; Crunchy Postgres-expert support |
| 13–15 | Maintenance/complexity | EXCELLENT | fully managed |
| 16–17 | Migration/Lock-in | GOOD | vanilla PG |
| 18 | Cost | EXCELLENT/GOOD | Neon usage-based: always-on micro ≈ $0.106×730h ≈ **$8–15/mo** + storage $0.35/GB; Crunchy from **$10/mo** |
| 19 | TCO | GOOD | comparable to A; slightly more integration labor up-front |
| 20 | Risk | LOW | reputable platforms |

Serious candidate — narrowly loses to A on Requirement §5 (auth-integration) without winning any requirement outright at this scale.

## Option D — SQLITE

Fair evaluation per RULE 5, against REQUIREMENTS not prejudice:

| Requirement | Verdict | Why |
| ----------- | ------- | --- |
| Networked multi-user access (staff desktops + workers' phones) | FAILS | file-local engine; needs an app-server owning ALL access — acceptable only if every access funnels through one server process (Phase 7 architecture could do this…) |
| Server-enforced row isolation (BR-035 at DB level, Phase 7 X-02) | FAILS | no RLS; isolation becomes purely application code — violates Phase 7 principle 7 ("employee isolation enforced server-side/database-side") |
| Managed backups/PITR | FAILS as-is | hand-rolled file backup + WAL archiving + restore drills; no provider |
| Partial unique index / CHECK richness | PARTIAL | unique indexes + triggers can emulate; triggers-as-invariants contradicts Phase 7 TD-3 |
| Concurrent writers | PARTIAL | WAL allows reader∥writer; single-writer-at-a-time remains — fine at this scale honestly |
| Zero-cost/zero-ops | PASSES | genuinely excellent |
| Audit append-only enforcement | PARTIAL | revoke-file-write impossible; rely on app discipline |

Verdict: **UNSUITABLE for the TARGET** — fails three requirement classes simultaneously (database-enforced isolation, managed recovery, networked deployment topology). It is NOT rejected because "external app had SQLite problems"; it is rejected because those specific requirements are non-negotiable parts of the Phase 6/7 contract. Legitimate niche noted: single-user offline tooling would be fine — that is not this product.

## Summary matrix (key differentiators)

| Requirement driver | A Supabase | B Self-host | C Neon/Crunchy | D SQLite |
| ------------------ | ---------- | ----------- | -------------- | -------- |
| DB-enforced worker isolation | ✅ native RLS | ⚠️ self-run | ✅ RLS | ❌ |
| Auth↔DB claims layer | ✅ native | ❌ build | ❌ build | n/a |
| ONE-ACTIVE partial unique | ✅ | ✅ | ✅ | ⚠️ emulate |
| Managed backups + PITR | ✅ | ❌ DIY | ✅ | ❌ DIY |
| Atomic RPC transactions | ✅ | ✅ | ✅ | ⚠️ app-only |
| Solo-operator ops burden | minimal | high | minimal | minimal |
| Monthly cost (prod-grade) | **$25** | ~$6 + hours | ~$8–15 | $0 (host-dependent) |
| Exit portability | ✅ pg_dump | ✅ | ✅ | n/a |

No scoring manipulation: D wins cost and loses requirements; B wins raw cost and loses operability; C ties A except auth integration; A wins the requirement-weighted column set.
