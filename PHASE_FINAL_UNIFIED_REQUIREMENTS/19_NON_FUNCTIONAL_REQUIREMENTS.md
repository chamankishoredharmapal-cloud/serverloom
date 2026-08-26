# 19_NON_FUNCTIONAL_REQUIREMENTS.md

Evidence-based only (Phase 6 NFR + Phase 8 platform decision + Phase 10 posture). No invented SLAs.

| Domain | Requirement |
| ------ | ----------- |
| Security | 3-layer authz; RLS floor; append-only audit; fail-fast secrets; provider password/throttle policies (gate); TLS at host |
| Performance | NO FORMAL SLA. Target envelope: ≤100 workers, weekly cadence — interactive pages <1s at this scale on Micro compute; exports stream. Pagination deferred until workforce ×10 |
| Availability | Managed platform availability; health route liveness; archive/carry are operator-invoked (cron optional per D-06); no uptime % contracted |
| Backup/Recovery | L1 daily provider snapshots(7d) · optional PITR(RPO decision) · L3 weekly dumps off-site · quarterly restore DRILLS with recorded evidence; RPO/RTO targets = HUMAN DECISION REQUIRED |
| Auditability | every mutation paired in-tx with immutable event; superadmin read surface |
| Scalability | single workshop assumption explicit; Postgres headroom orders-of-magnitude beyond forecast; exit = pg_dump |
| Maintainability | strict TS; single-source calc mandate; versioned SQL migrations; parity test suite obligation; no duplicated formulas permitted in review |
| Usability | flash feedback on all mutations; empty/error/success states everywhere; truthful idempotent messages; role-routed landings |
| Observability | structured server logs w/o secrets/PII; provider dashboards; AlertEmail stays absent until D-09 |
| Reliability | atomic tx around all money/material mutations; constraint backstops; documented idempotency classes; SQLite-class file-store risks structurally excluded |
