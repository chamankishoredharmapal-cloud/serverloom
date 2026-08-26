# BUSINESS_SERVICES_IMPLEMENTATION.md (Phase 9.4)

Single-owner boundaries per Phase 7 SERVICE_BOUNDARIES. All mutations route through SQL RPCs (single authoritative implementation); TS services validate inputs (Zod) and map errors to the domain taxonomy. Pages receive PRE-COMPUTED values — zero business arithmetic in components (CALC-009 mandate).

| Service | File | Owns (rules/calcs) | Mutations via |
| ------- | ---- | ------------------- | ------------- |
| AuthService | services/authService.ts | register PENDING defaults (BR-025) · login eligibility/status gate (BR-022) · generic credential errors | direct profile+credential inserts (bridge) / Supabase Auth later |
| WorkerService | services/workerService.ts | roster search `q` (sole filter FR-013) · detail aggregation · approve/status transitions | approve_worker, set_worker_status |
| ProductionService | services/productionService.ts | create/remove correction model (BR-026) · duplicate UX mapping | create/remove_production_entry |
| PayrollService | services/payrollService.ts | **CALC-002 sole owner** (computeWeek/grid/dashboard) · rate setting (BR-006/039) | set_rate |
| AdvanceService | services/advanceService.ts | give/clear/carry edges incl. truncation-to-zero surfacing | give/clear/carry_advances |
| MaterialService | services/materialService.ts | assign/finish orchestration · **CALC-003/004 progress authority** | assign_material, finish_material |
| SettlementService | services/settlementService.ts | payment flags two-path semantics (BR-015/031/032) | mark_paid, mark_unpaid |
| ArchiveService | services/archiveService.ts | freezeWeek invocation + run reports (BR-018/AUD63-009) | archive_week |
| AuditService (read surface) | admin/audit page | superadmin-filtered trail reads | none (append-only elsewhere) |
| Report/Export | app/api/export/[kind] | REP-005/006 XLSX assembly, REP-003 slip PDF — consumes service/data outputs only | none |

Prohibited-responsibility rules enforced by review: no cross-service table writes; all window math from `lib/domain/week.ts`; money integer-only via `lib/domain/money.ts`.

Each service's transaction/authorization/audit behavior is inherited from its RPC (see DATABASE_IMPLEMENTATION_REPORT §0003) — one place, tested once, reused everywhere.
