# FEATURE_OWNERSHIP_MAP.md (Phase 7.3)

Target-state ownership for every domain. Principle enforced: **business rules live in exactly ONE authoritative layer** (domain services / SQL RPCs); React components render; pages orchestrate; database guards invariants. No rule may exist simultaneously in a component, a page, a util, and SQL.

| Domain | UI owner | Application/service owner (rule authority) | Data owner | Authorization owner | Audit owner | Reporting owner |
| ------ | -------- | ------------------------------------------ | ---------- | -------------------- | ----------- | ---------------- |
| Identity/Accounts | auth pages (`/auth/*`) | AuthService (register/login/logout/status gate BR-022/025) | profiles + auth identities | role middleware + RLS role claims | identity audit events (AUD63-008) | — |
| Worker management | admin workers pages | WorkerService (search/detail/approve TR-EMP-001; D-01 states) | profiles table | staff route guard + RLS write policy | worker lifecycle events | roster exports |
| Production | entry forms + history pages | ProductionService (BR-001..003/024/026/027; CALC inputs) | production_entries | staff-write RLS | create/remove events (AUD63-006) | REP-007 production section |
| Payroll (weekly pay) | weekly grid + dashboards | **PayrollService — SOLE owner of CALC-002/009** (+rate BR-006/039) | weekly_ledger quantity group (write: ArchiveService only) | staff guard | rate-change + settlement-flip events (AUD63-007) | REP-001/REP-004 |
| Advances | grid actions | **AdvanceService — give/clear/carry (BR-007/008/019/040; CALC-005)** | advance balance column + unified audit_events rows | staff guard + RPC locks | ADJUST/CLEAR/CARRY rows (AUD63-001..003) | advance column feeds |
| Settlement (payment) | grid actions | **SettlementService — markPaid/markUnpaid (BR-013/015/021/031/032)** | weekly_ledger payment group ONLY | staff guard | flip events (AUD63-007) | paid badges in reports |
| Materials (Pagdi/Warp) | assign forms + lists + my-pages | **MaterialService — assign/auto-finish/finish (BR-009..011/028/029; CALC-003/004)** | material_assignments (type discriminator) | staff guard | CREATE/FINISH rows | progress columns |
| Archive | ops console | **ArchiveService — freezeWeek sole quantity writer (BR-012/014/016..018/033/037; CALC-007)** | weekly_ledger canonicalization | operator-only invocation | run records (AUD63-009) | enables historical accuracy |
| Audit | admin audit viewer | AuditService.emit + read API | *_events tables (append-only) | superadmin-read RLS | itself | audit exports |
| Reporting/Exports | export buttons/pages | ReportService (slip REP-003) + ExportService (XLSX REP-005/006) via PricingStrategy (D-08) | reads only | staff guard | export-run log (optional) | all REP-* |
| Notifications | none today | NotificationService — DO NOT BUILD until D-09 resolved | alert_recipients (only if D-09 → build) | n/a | n/a | n/a |

## Calculation ownership (single-source mandate)

| Calculation | Sole authoritative implementation | Prohibited duplicate sites |
| ----------- | ---------------------------------- | --------------------------- |
| CALC-001 week bounds | `lib/domain/week.ts` pure function | any page/component/util re-deriving weekday math |
| CALC-002 payable | PayrollService.computeWeek (+ identical-math SQL RPC used by archive; one spec, two coordinated executors, one test suite) | grid components, dashboards, slip generator computing inline |
| CALC-003/004 progress | MaterialService | list components summing rows client-side |
| CALC-005 carry | AdvanceService.carry | CLI/script reimplementations |
| CALC-007 freeze | ArchiveService.freezeWeek | cron jobs or triggers writing quantity columns directly |
| CALC-008 pricing | PricingStrategy (strategy object; basis per D-08) | export code multiplying inline |

## Duplication findings against external evidence
External app had ≥5 inline copies of the salary formula (R-06). Target architecture mandates: pages receive PRE-COMPUTED values from services; no arithmetic beyond display formatting in components. Enforced by review checklist + parity tests (CALC-009 obligation).
