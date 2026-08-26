# MASTER_DATABASE_ARCHITECTURE.md (Phase 8.19 — Database Authority)

## 1. Database requirements
`DATABASE_REQUIREMENTS.md`: SMALL workload («1 GB / 5 yr ESTIMATE); real transactions w/ row locking; PostgreSQL-class integrity (partial unique index, CHECKs, RLS, security-definer RPCs); permanent queryable history incl. append-only audit; managed backups; networked multi-user topology. RPO/RTO = BUSINESS DECISION REQUIRED.

## 2. Current Management-V1 database
**NONE — verified greenfield** (`CURRENT_DATABASE_AUDIT.md`; three-session evidence register). External SQLite store = behavior evidence only, explicitly uninherited.

## 3. Workload
`WORKLOAD_AND_SCALE.md`: SMALL — weekly payroll cadence, tens of actors, contention confined to five named race classes, all arbitrated by constraints/locks below. No caching/replicas/queues justified.

## 4. Platform comparison
`DATABASE_OPTIONS_COMPARISON.md`: A Supabase · B self-hosted · C Neon/Crunchy · D SQLite — 20 dimensions each; SQLite rejected on three requirement failures (not prejudice); self-hosted rejected on operability/TCO-of-time; C close second lacking integrated auth↔RLS claims bridge.

## 5. Final database decision
`DATABASE_DECISION.md`: **ADOPT SUPABASE POSTGRESQL** — dev Free / prod Pro $25/mo. Why: only candidate satisfying every requirement class natively while matching Phase 7 architecture (ADR-001); predictable cost; vanilla-Postgres exit.

## 6–7. Final schema & relationships
`FINAL_SCHEMA.md` + `RELATIONSHIP_MAP.md`: profiles(status enum, role, rate, advance_balance) · production_entries(+soft-delete reserve) · material_assignments(partial UNIQUE active invariant) · weekly_ledger(worker-week unique; quantity/payment column-group authorities; canonical+source birth-path flags) · audit_events(unified append-only) · archive_runs(run reports). Explicitly NOT created: alert_recipients(D-09), weeks table, vestigial counters. ER map: identity 1-1 profile → four domain children; audit anchored to auth.users SET NULL.

## 8. Constraints
`CONSTRAINT_SPECIFICATION.md` C-01..C-20: worker-day UNIQUE · worker-week UNIQUE · partial UNIQUE one-ACTIVE · positivity CHECKs on inputs · signed ledger money (negative legal) · week-math CHECK · enums · append-only audit privileges · RESTRICT FK defaults. DATABASE-vs-SERVICE allocation explicit per row.

## 9. Indexes
`INDEX_STRATEGY.md` IX-01..IX-13 — every index bound to a named query; anti-index restraint list included (no trigram search, no JSONB GIN yet).

## 10–11. Transactions & concurrency
`TRANSACTION_CONCURRENCY.md`: per-domain tx recipes (BEGIN→lock→mutate→audit→COMMIT): advance FOR UPDATE serialization · material auto-finish-then-insert under live-set lock · settlement UPSERT arbiter · archive advisory lock + disjoint-column upserts · duplicate-day constraint arbitration. Named mechanisms behind every safety claim; SBG-02 window consciously contracted to rerun-repair with revisit trigger.

## 12. Audit/history
`AUDIT_HISTORY_ARCHITECTURE.md`: unified audit_events; event catalog covering ALL former external gaps (AUD63-006..009) pending D-07 breadth sign-off; immutability via privileges; survival via SET NULL + name snapshots.

## 13. Deletion/retention
`RETENTION_DELETION_POLICY.md`: workers NEVER hard-deleted by default (status offboarding; D-13 gate ships RESTRICT) · ledger/materials/audit permanent · production correction model per D-02 mode · destructive acts require explicit signed flips.

## 14. Security
`DATABASE_SECURITY.md`: role topology (anon/worker/staff/superadmin/service_role/CRON_SECRET) · RLS floor + RPC re-checks · secrets server-only w/ rotation · injection-proof parameterization · KEEP/IMPROVE/REJECT inheritance table · self-hosting responsibility transfer list.

## 15. Backup/recovery
`BACKUP_RECOVERY_PLAN.md`: L1 daily provider snapshots(7d) · L2 optional PITR(RPO decision open) · L3 weekly cross-provider dumps(off-site, exit artifact) · L4 pre-migration anchors · quarterly restore DRILLS with recorded evidence · scenario/RPO/RTO matrix (targets = BDR).

## 16. Migration
`MIGRATION_PLAN.md`: **NO existing-data migration required**; external import documented as optional future path with full mapping/transformation/validation checklist; imports repeatable-validatable-rollback-aware against shadow projects.

## 17. Cost/TCO
`TCO_ANALYSIS.md`: prod **$25/mo ($300/yr)** infra; operator hours ≤1 h/mo; growth ×10 still <$60/mo; guardrails (spend-cap, quota headroom); quarterly pricing re-check commitment.

## 18. Risks
R-pricing drift (quarterly check) · RLS policy error (policy test suite gate) · D-13 late flip after data accrual (decide before first ledger migration) · SBG-02 operational drift if rerun ritual ignored (ops runbook item) · provider dependency bounded by dump-exit drill (annual).

## 19. Open decisions (database-relevant)
D-01 status value-set · D-02 delete mode activation · D-03 archived-week flips flag · D-04 carry automation guard · D-07 event-breadth sign-off · D-08 pricing strategy storage · D-13 FK policy (ONLY migration-gating item) · D-14 session TTL (auth config) · RPO/RTO targets (NEW BDR from this phase).

## 20. Implementation prerequisites
1. Owner decisions: D-13 confirmation (default acceptable?), RPO/RTO targets, D-07 breadth.
2. Create Supabase org → dev project (Free) + prod project (Pro, spend-cap on).
3. Versioned SQL migrations implementing FINAL_SCHEMA (tables → constraints → indexes → RPCs → RLS policies → seed parity vectors).
4. Policy/constraint test suite wired into CI before any UI work.
5. Backup plan L3 scheduled + first restore DRILL executed and evidenced.
6. Secrets distributed per env contract; bundle-scan job active.

## Canonical statement block

CURRENT DATABASE: NONE (verified greenfield)
TARGET DATABASE: PostgreSQL via Supabase (dev Free / prod Pro)
DECISION: ADOPT SUPABASE POSTGRESQL
REASON: sole platform satisfying integrity+isolation+recovery+auth-integration requirements natively at lowest responsible TCO; matches Phase 7 authority
MIGRATION REQUIRED: NO existing-data migration (greenfield)
PRODUCTION DATA PRESENT: NO (nothing exists)
PRODUCTION MIGRATION REQUIRED: NO — fresh schema rollout only
EXTERNAL DATA IMPORT REQUIRED: NO (optional path documented, precondition D-08)
OPEN RISKS: pricing drift · D-13 timing · RLS policy correctness · SBG-02 ritual compliance
