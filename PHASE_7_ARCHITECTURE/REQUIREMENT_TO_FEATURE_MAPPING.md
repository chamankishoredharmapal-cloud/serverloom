# REQUIREMENT_TO_FEATURE_MAPPING.md (Phase 7.2)

Maps EVERY Phase 6 requirement artifact to its Management-V1 target home. Current-MV1 column is **NOT FOUND** throughout — no repository exists (see `00_ARCHITECTURE_BASELINE.md`). Decisions are therefore provisional target-design decisions; they MUST be re-validated against real MV1 code when the repository is provided (re-run trigger documented in baseline §3).

Decision vocabulary: REUSE / EXTEND / REBUILD / REPLACE / NEW / NOT APPLICABLE / BUSINESS DECISION REQUIRED / NOT VERIFIED. Target locations use the component names defined in `SERVICE_BOUNDARIES.md` / `DATA_ARCHITECTURE.md` / `SYSTEM_ARCHITECTURE.md`.

## 1. Feature requirements FR-001..031

| Req ID | Requirement | Current MV1 | Decision | Target location |
| ------ | ----------- | ----------- | -------- | --------------- |
| FR-001 | Self-registration → PENDING | NOT FOUND | NEW | `/auth/signup` page → AuthService.register → profiles(status=PENDING) |
| FR-002 | Approval-gated role-routed login | NOT FOUND | NEW | `/auth/login` → AuthService.login → role router (staff→/admin, worker→/app) |
| FR-003 | Logout immediate | NOT FOUND | NEW | AuthProvider.signOut → session destroy |
| FR-004 | Worker approval (POST-equivalent, idempotent) | NOT FOUND | NEW | AdminWorkersPage → WorkerService.approve → RPC guarded transition |
| FR-005 | Rate setting (int ≥0) | NOT FOUND | NEW | WorkerDetailPage → PayrollService.setRate |
| FR-006 | Worker weekly dashboard card | NOT FOUND | NEW | WorkerDashboardPage → PayrollService.currentWeek(w) [CALC-002] |
| FR-007 | Own production history (+display earnings) | NOT FOUND | NEW | MyProductionPage → ProductionService.listMine + CALC-008 view |
| FR-008 | Own pagdi progress/history | NOT FOUND | NEW | MyPagdiPage → MaterialService.myActive('pagdi') |
| FR-009 | Own warp progress/history | NOT FOUND | NEW | MyWarpPage → MaterialService.myActive('warp') |
| FR-010 | Combined personal history | NOT FOUND | NEW | MyHistoryPage (composite read) |
| FR-011 | Own salary ledger w/ empty state | NOT FOUND | NEW | MySalaryPage → LedgerService.listMine |
| FR-012 | Admin stats dashboard | NOT FOUND | NEW | AdminHomePage → StatsService.counters |
| FR-013 | Employee list + search (`q` contains name/phone) | NOT FOUND | NEW | AdminEmployeesPage → WorkerService.search |
| FR-014 | Worker detail console | NOT FOUND | NEW | AdminWorkerDetailPage (aggregated reads) |
| FR-015 | Production entry (admin) incl. graceful dup handling | NOT FOUND | NEW | SareeEntryForm → ProductionService.create |
| FR-016 | Delete entry w/ explicit not-found failure | NOT FOUND | NEW | DetailPage delete → ProductionService.remove (audited soft-delete recommended — D-02) |
| FR-017 | Pagdi assign (atomic auto-finish) | NOT FOUND | NEW | AssignPagdiForm → MaterialService.assign('pagdi') |
| FR-018 | Pagdi list + progress | NOT FOUND | NEW | AdminPagdisPage |
| FR-019 | Warp assign (start=today) | NOT FOUND | NEW | AssignWarpForm → MaterialService.assign('warp') |
| FR-020 | Warp list + explicit finish | NOT FOUND | NEW | AdminWarpsPage → MaterialService.finish (in-lock recheck per SBG-01 lesson) |
| FR-021 | Weekly salary grid | NOT FOUND | NEW | AdminWeeklyPayPage → PayrollService.weekGrid [CALC-002/009] |
| FR-022 | Give advance (>0 additive) | NOT FOUND | NEW | Grid action → AdvanceService.give |
| FR-023 | Clear advance (audited no-op) | NOT FOUND | NEW | Grid action → AdvanceService.clear |
| FR-024 | Mark paid (create-path snapshot semantics) | NOT FOUND | NEW | Grid action → SettlementService.markPaid |
| FR-025 | Mark unpaid (flags-only reversal) | NOT FOUND | NEW | Grid action → SettlementService.markUnpaid |
| FR-026 | Salary slip PDF | NOT FOUND | NEW | SlipButton → ReportService.slipPdf (content spec per D-11) |
| FR-027 | Global history XLSX (4 sheets, mixed pricing per D-08) | NOT FOUND | BUSINESS DECISION REQUIRED (pricing basis D-08 before build of Sheet 1) | ExportsPage → ExportService.globalXlsx |
| FR-028 | Weekly XLSX (snapshot values) | NOT FOUND | NEW | ExportsPage → ExportService.weeklyXlsx |
| FR-029 | Salary ledger table (admin) | NOT FOUND | NEW | AdminLedgerPage → LedgerService.listAll |
| FR-030 | Weekly archive command (quantity authority, idempotent) | NOT FOUND | NEW | OpsConsole/CronTrigger → ArchiveService.runWeek |
| FR-031 | Carry command (factor scaling, non-idempotent hazard) | NOT FOUND | BUSINESS DECISION REQUIRED (D-04 guard policy) | OpsConsole → AdvanceService.carry |

## 2. Business rules BR-001..040

| Rule | Decision | Target enforcement home |
| ---- | -------- | ------------------------ |
| BR-001 admin-only production writes | NEW | route guard + RLS (staff write policy) + service assert |
| BR-002 count non-negative int, graceful reject | NEW | Zod/form validation + DB CHECK + service |
| BR-003 unique(worker,day), friendly dup | NEW | DB UNIQUE + savepoint-style catch in service → typed DuplicateError |
| BR-004 phone=identity unique | NEW | auth identities + profiles.phone UNIQUE |
| BR-005 approved-only eligibility (hard-enforced) | NEW | FK/RPC check `status='ACTIVE'` inside transition functions |
| BR-006 rate staff-set int ≥0 | NEW | PayrollService.setRate + CHECK |
| BR-007 give additive >0 locked | NEW | AdvanceService.give (SELECT FOR UPDATE via RPC tx) + ADJUST audit row |
| BR-008 clear→0 audited no-op | NEW | AdvanceService.clear |
| BR-009 ≤1 ACTIVE material/type/worker | NEW | PARTIAL UNIQUE INDEX (worker,type) WHERE finished_on IS NULL + tx order |
| BR-010 atomic auto-finish on assign | NEW | MaterialService.assign single SQL transaction (RPC) |
| BR-011 capacity int ≥0 | NEW | validation + CHECK |
| BR-012 Mon–Sun week | NEW | shared date util (single source) consumed by all services |
| BR-013 negative payable allowed end-to-end | NEW | signed columns; NO clamp anywhere; UI shows negatives |
| BR-014 archive sole quantity authority | NEW | ArchiveService exclusive UPDATE grant on quantity columns (service ownership + RLS deny others) |
| BR-015 settlement sole payment authority | NEW | SettlementService exclusive payment-column updates |
| BR-016 archive preserves payment group | NEW | archive UPDATE column-list excludes payment fields |
| BR-017 archive never touches balances | NEW | archive code path has no balance writer |
| BR-018 archive rerun idempotent created=0 | NEW | UPSERT-on-(worker,week) + counts report |
| BR-019 carry factor ≥0 | NEW | CLI/RPC arg check abort |
| BR-020 CLI audits all incl. zeros, actor=NULL(system) | NEW | AuditService.emit with actor_type='SYSTEM' |
| BR-021 current-week-only settlement | NEW | SettlementService bounds from CALC-001(today); archived-week flips = D-03 policy gate |
| BR-022 approval gates login/session | NEW | AuthProvider maps status≠ACTIVE → no session grant |
| BR-023 export current-rate pricing | BUSINESS DECISION REQUIRED (D-08) | CALC-008 implementation behind pricing-strategy switch |
| BR-024 dates any; future excluded till window current | NEW | window-filtered queries only (no date input restriction) |
| BR-025 signup → PENDING defaults zeroed | NEW | AuthService.register defaults |
| BR-026 correction = remove+recreate; explicit not-found | BUSINESS DECISION REQUIRED (D-02 audit depth/soft-delete) | ProductionService.remove/recreate |
| BR-027 zero-count legal | NEW | validation `<0` only |
| BR-028 warp start=today forced; pagdi requires date | NEW | MaterialService.assign per-type input contract |
| BR-029 completion asymmetry | BUSINESS DECISION REQUIRED (D-05 unify) | MaterialService.finish exposed per decision |
| BR-030 full balance every week | NEW | CALC-006 term in CALC-002 (no amortization tables) |
| BR-031 click-time snapshot create-path | NEW | SettlementService.markPaid upsert defaults |
| BR-032 unpaid flags-only; absent-row benign no-op | NEW | SettlementService.markUnpaid semantics |
| BR-033 archive covers every worker | NEW | ArchiveService loop over active roster (D-01 interacts: INACTIVE excluded? → flagged) |
| BR-034 vestigial counter zeroing | NOT APPLICABLE | do not port field |
| BR-035 employee surfaces read-only | NEW | RLS SELECT-only policies for worker role + no mutation routes |
| BR-036 one-way lifecycle currently | BUSINESS DECISION REQUIRED (D-01 states model) | profiles.status machine |
| BR-037 archive --date targeting | NEW | ArchiveService.runWeek(date?) parameterized; cron default today |
| BR-038 carry phase-independent | NEW | AdvanceService.carry independent op |
| BR-039 rate live vs frozen semantics | NEW | live reads current rate; ledger rows immutable post-close |
| BR-040 carry non-idempotent f≠1 | BUSINESS DECISION REQUIRED (D-04) | guard table once-per-period if automated |

## 3. Calculations CALC-001..009

| Calc | Decision | Single authoritative owner |
| ---- | -------- | -------------------------- |
| CALC-001 week bounds | NEW | `lib/domain/week.ts` (pure function; imported by ALL services/UI — never re-derived) |
| CALC-002 weekly payable | NEW | PayrollService.computeWeek (sole implementation; DB RPC shares same SQL math for archive) |
| CALC-003 made quantity | NEW | MaterialService.made (windowed SUM) |
| CALC-004 remaining clamp | NEW | MaterialService.remaining = max(0,C−M) |
| CALC-005 carry scaling | NEW | AdvanceService.carry — exact integer/decimal math per C64 recommendation (float artifact class REJECTED); truncation semantics preserved toward-zero on non-negative domain |
| CALC-006 advance term | NEW | defined INSIDE CALC-002 (A=balance) |
| CALC-007 archive canon | NEW | ArchiveService.freezeWeek — sole writer of ledger quantity columns |
| CALC-008 display/export earnings | BUSINESS DECISION REQUIRED (D-08 strategy) | PricingStrategy behind ReportService/ExportService |
| CALC-009 live parity | NEW | invariant test-suite obligation + single-service consumption rule |

## 4. State machines SM-01..10 (transitions TR-* per STATE_TRANSITION_MATRIX.md)

| Machine | Decision | Transition owner / enforcement |
| ------- | -------- | ------------------------------- |
| SM-01 account PENDING→ACTIVE(+D-01 extensions) | BUSINESS DECISION REQUIRED (D-01 states) | AuthService/WorkerService guarded transitions + profiles.status CHECK |
| SM-02 session/auth class | NEW | AuthProvider + middleware route guards + RLS role claims |
| SM-03 production existence | BUSINESS DECISION REQUIRED (D-02 soft vs hard delete) | ProductionService |
| SM-04 pagdi ACTIVE→FINISHED (+D-05 finish control?) | BUSINESS DECISION REQUIRED (D-05) | MaterialService.assign auto-finish (+finish if unified) |
| SM-05 warp ACTIVE→FINISHED dual trigger | NEW | MaterialService (assign-auto + explicit finish w/ in-lock recheck) |
| SM-06 ledger row birth paths | NEW | SettlementService.create-path / ArchiveService.create-path (unique(worker,week)) |
| SM-07 payment UNPAID⇄PAID flags-only | NEW (+D-03 scope policy) | SettlementService |
| SM-08 week OPEN→ARCHIVED idempotent rerun | NEW (owner/cadence D-06) | ArchiveService + cron/manual trigger |
| SM-09 advance balance 0⇄positive | NEW | AdvanceService give/clear/carry (truncation-to-zero edge preserved as behavior) |
| SM-10 audit event log append-only | NEW | AuditService.emit inside every mutating tx; UPDATE/DELETE denied by RLS |

## 5. Reports REP-001..007
All NEW via ReportingService/ExportService (client pages + server generation). REP-003 content pending D-11; REP-005 Sheet1 pricing pending D-08. Empty-state and streaming requirements carried. Sorting/filters exactly per REPORT_EXPORT_REQUIREMENTS.md (only `q` search filter).

## 6. Series rollups (each member rule maps like its series row)

| Series | Count | Decision pattern | Enforcement homes |
| ------ | ----- | ---------------- | ------------------ |
| VAL-001..011 input contracts | 11 | NEW | shared Zod schemas at form+service boundary + DB constraints |
| VAL-012 phone format / VAL-013 password policy | 2 | BUSINESS DECISION REQUIRED (D-10) | AuthService validation config |
| SEC-001..008 access contract | 8 | NEW (all IMPROVED where external was weak) | middleware guards + RLS + service asserts |
| DATA-001..011 integrity | 11 | NEW | DATA_ARCHITECTURE constraints (uniques, CHECKs, FK behaviors, tx boundaries) |
| AUD-001..005 event types (existing) | 5 | NEW | AuditService.emit variants |
| AUD-006..009 audit REQUIREMENTS | 4 | NEW | mandatory M-V1 scope (D-07 sign-off) |
| OPS-001..010 operational | 10 | NEW (+OPS-001/004/010 BDR-linked) | OpsConsole/Cron/Secrets/Deploy docs |
| NFR sections (security/perf/availability/backups/auditability/scalability/usability/maintainability/reliability/observability/deployment) | 11 domains | MIXED: verified set CR → NEW; gap items → recommendations pending decisions | SYSTEM/SECURITY/DEPLOYMENT architecture docs |
| EC-01..45 edge behaviors | 45 | NEW | covered by the owning services above + regression suite obligations |

## 7. Mapping counts (provisional until MV1 repo re-run)

| Decision | Count | Notes |
| -------- | ----- |-------|
| REUSE | 0 | nothing inspectable |
| EXTEND | 0 | — |
| REBUILD | 0 | reserved: re-classify NEW→REBUILD where MV1 code exists but diverges |
| REPLACE | 0 | reserved likewise |
| NEW | **146** | FR 31 + BR 40 + CALC 9 + SM 10 + REP 7 + VAL 13 + SEC 8 + DATA 11 + AUD 9 + OPS 10 − NOT APPLICABLE(2) adjustments ≈ 146 rows mapped NEW |
| NOT APPLICABLE | **2** | BR-034 vestigial counter; AlertEmail registry (pending D-09 could flip to NEW) |
| BUSINESS DECISION REQUIRED | **16** | BR-021(D-03), BR-023(D-08), BR-026(D-02), BR-029(D-05), BR-033∩D-01, BR-036(D-01), BR-040(D-04), FR-027(D-08), FR-031(D-04), CALC-008(D-08), SM-01(D-01), SM-03(D-02), SM-04(D-05), VAL-012/013(D-10) |
| NOT VERIFIED | 0 mapping cells | all Current-MV1 columns uniformly NOT FOUND (tracked separately, not a decision value) |

Re-run obligation: when the Management-V1 repository is provided, refresh this table's Current/Evidence/Decision columns and the §7 counts before implementation planning.

