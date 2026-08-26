# MASTER_ARCHITECTURE.md — Phase 7 Authority

## 1. Executive summary
Phase 7 maps the completed Phase 6 functional contract (166 artifacts) onto a target Management-V1 architecture. The Management-V1 repository was NOT FOUND in the environment; current-state stages are honestly BLOCKED and all Reuse/Extend decisions are provisionally zero with a documented re-run trigger. The TARGET architecture is complete: a server-layer domain-service design over Postgres/Supabase with database-enforced invariants, single-source calculations, column-group authority split, append-only audit, and explicit open-decision seams.

## 2. Current Management-V1 architecture
NOT FOUND — see `00_ARCHITECTURE_BASELINE.md` §1 discovery log and `CURRENT_MANAGEMENT_V1_ARCHITECTURE.md` (audit template ready). Stack presumed by program vocabulary (Next.js/Supabase/Vercel) is UNCONFIRMED.

## 3. Target architecture
`SYSTEM_ARCHITECTURE.md`: UI → thin API/actions → 11 domain services → shared pure domain core → typed data access + SQL RPCs → Postgres (constraints/RLS/append-only audit) with cron/operator side channels.

## 4. Requirement→architecture mapping
`REQUIREMENT_TO_FEATURE_MAPPING.md`: every FR/BR/CALC/SM/REP/series row has a Decision + target home. Provisional counts: NEW 146 · N/A 2 · BDR-linked rows 16 · REUSE/EXTEND/REBUILD/REPLACE 0 (re-run on repo provision).

## 5–6. Domain/service boundaries & calculation ownership
`FEATURE_OWNERSHIP_MAP.md`, `SERVICE_BOUNDARIES.md`. Exclusive writers per table/column-group; one implementation per calculation (CALC-001 lib/domain/week.ts; CALC-002 PayrollService+coordinated archive RPC; CALC-005 AdvanceService exact-truncation helper; CALC-007 ArchiveService; CALC-008 PricingStrategy seam).

## 7–8. Data / security / authz architecture
`DATA_ARCHITECTURE.md`: profiles(status enum) · production_entries(+soft-delete reserve) · material_assignments(partial unique ACTIVE invariant) · weekly_ledger(unique worker-week; column-group authorities; FK gated by D-13 RESTRICT-default) · unified append-only audit_events.
`SECURITY_ARCHITECTURE.md`: Supabase Auth + claims; approval gate; RLS floors + service asserts + RPC re-checks; throttle/password-policy improvements; secrets fail-fast; KEEP/IMPROVE/REJECT/BDR classification of every external posture item.

## 9. Calculation ownership — see §5 table; parity suite is a build obligation.
## 10. State-machine ownership
Transitions owned exactly per SERVICE_BOUNDARIES (WorkerService approve · MaterialService assign/finish · SettlementService flags · ArchiveService week-close · AdvanceService balance machine); DB enforces invariants (unique/partial-index/status CHECK); no transition reachable outside its owning service.

## 11. Audit architecture
Unified append-only audit_events written inside mutation transactions; actor NULL/SYSTEM for jobs; survival via SET NULL+name snapshot; read surface superadmin; event breadth pending D-07.

## 12. Reporting/export architecture
ReportService/ExportService assemble REP-001..007 from service outputs; streamed; staff-gated; PricingStrategy seam for D-08; slip content builder per D-11.

## 13. Deployment architecture
`DEPLOYMENT_ARCHITECTURE.md`: Vercel+Supabase per-env projects; Cron→archive candidate; PITR+dump backups; CI gates typecheck/lint/tests/migration-dry-run; staging-first migrations.

## 14. Technology decisions
`TECHNOLOGY_DECISIONS.md`: TD-1..13 with KEEP/ADOPT verdicts and rejected alternatives recorded.

## 15. Reuse/extend/rebuild/replace decisions
Provisionally: REUSE 0 · EXTEND 0 · REPLACE 0 · NEW 146 · N/A 2 · BDR 16 rows. RECLASSIFICATION OBLIGATED when repository provided (baseline §3 trigger).

## 16. Business decisions still open
D-01..D-14 classified in ADR §7.12: RESOLVED-by-architecture seams vs BUSINESS DECISION REQUIRED vs ARCHITECTURE DEPENDENT — only D-13 blocks a schema migration choice (ships protective default).

## 17. Architecture risks
R1 stack presumption wrong until repo confirmed (impact: mapping refresh) · R2 RLS policy errors (mitigation: policy tests) · R3 D-13 late flip after data accrual (mitigation: early decision) · R4 archive stream window if SBG-02 obligation skipped · R5 carry automation without guard (D-04).

## 18. Migration implications
External data NOT assumed to migrate (no requirement stated); if import ever requested, ledger/history tables map cleanly via DATA_ARCHITECTURE model; entry-rate snapshots needed only if D-08=ENTRY_RATE.

## 19. Implementation sequencing (future phases — not now)
Foundation(repo/tooling/envs) → migrations core(profiles,statuses,uniques,partial index) → Auth/authz middleware+RLS → Worker domain → Production → Payroll(CALC-002 service+parity vectors) → Advances(+events) → Materials(assign/finish+invariant tests) → Settlement(two-path semantics tests) → Archive(RPC+cron+run records+dry-run) → Audit viewer → Reports/Exports(strategy seam) → Edge-case regression sweep (EC matrix) → Ops runbooks → Staging PG concurrency probe (D-12) → Production cutover checklist.

## 20. Explicit non-goals
No multi-tenancy · no caching layer · no notifications until D-09 · no mobile apps · no external-schema copying (incl. vestigial fields/inert branches) · no defect reproduction (SBG-01/02 classes designed out).

## 21. Final architecture diagram
See SYSTEM_ARCHITECTURE.md §3/§4 (logical layers + canonical flows) and DATA_ARCHITECTURE.md entity map — incorporated by reference as the authoritative diagrams.

Gate answer: for EVERY Phase 6 requirement the mapping file states where it lives (service/table/page), what existing code applies (none yet — NEW), what must change (re-run trigger), what data enforces it (constraints/indexes named), which service owns it (exclusive writer), and which security boundary protects it (middleware+RLS+RPC layer).
