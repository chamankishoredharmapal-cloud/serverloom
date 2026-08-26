# REQUIREMENT_IMPLEMENTATION_MATRIX.md (Phase 9.18)

Coverage rollup over the Phase 6 contract (166 artifacts). Series members inherit their series row unless marked. Statuses are evidence-backed: IMPLEMENTED = working code + passing test/runtime probe; PARTIALLY IMPLEMENTED = shipped but a named verification or provider wiring is open.

## Features FR-001..031

| Req | Item | Impl location | Test | Status |
| --- | ---- | ------------- | ---- | ------ |
| FR-001 | signup→PENDING | /signup + authService | unit(VAL-001) + path ✓ | IMPLEMENTED |
| FR-002 | approval-gated role login | login page/action + status gate | gate logic ✓; E2E pending Supabase | PARTIALLY IMPLEMENTED |
| FR-003 | logout | logoutAction | route ✓ | IMPLEMENTED |
| FR-004 | approve worker | workers list/detail action | DB harness D-02 ★ | IMPLEMENTED |
| FR-005 | rate set ≥0 | detail form → set_rate | D-04 ★ | IMPLEMENTED |
| FR-006 | worker dashboard | /app | build ✓ | IMPLEMENTED |
| FR-007 | own production history | /app/production (CALC-008 display) | ✓ | IMPLEMENTED |
| FR-008/009 | own pagdi/warp progress | /app/[type] | schema semantics ✓; UI E2E pending | PARTIALLY IMPLEMENTED |
| FR-010 | combined history | /app/history | ✓ | IMPLEMENTED |
| FR-011 | own ledger + empty state | /app/salary | ✓ | IMPLEMENTED |
| FR-012 | admin stats | /admin home | ✓ | IMPLEMENTED |
| FR-013 | list+search q | /admin/workers | query ✓ | IMPLEMENTED |
| FR-014 | detail console | /admin/workers/[id] | ✓ | IMPLEMENTED |
| FR-015 | production entry graceful | detail/global forms | D-05..08 ★ | IMPLEMENTED |
| FR-016 | delete explicit failure | remove RPC NotFound mapping | mapping ✓ | IMPLEMENTED |
| FR-017/018 | pagdi assign/list | /admin/materials/pagdi | D-15..19 ★ | IMPLEMENTED |
| FR-019/020 | warp assign/list/finish | /admin/materials/warp | D-15..19 ★ | IMPLEMENTED |
| FR-021 | weekly grid | /admin/weekly | ✓ | IMPLEMENTED |
| FR-022/023 | give/clear advance | grid actions | D-09..14 ★ | IMPLEMENTED |
| FR-024/025 | mark paid/unpaid | grid actions | D-20..22 ★ | IMPLEMENTED |
| FR-026 | slip PDF | /api/export/slip | transport ✓; content NV | PARTIALLY IMPLEMENTED |
| FR-027 | global XLSX | /api/export/global-history | built; bytes NV | PARTIALLY IMPLEMENTED |
| FR-028 | weekly XLSX | /api/export/weekly-salary | same | PARTIALLY IMPLEMENTED |
| FR-029 | ledger table | /admin/ledger | ✓ | IMPLEMENTED |
| FR-030 | weekly archive | console + ops API | D-23..30 ★ | IMPLEMENTED |
| FR-031 | carry command | ops API carry | D-11..14 ★ | IMPLEMENTED |

## Rules BR-001..040
All mapped to owning services/RPCs/constraints per BUSINESS_SERVICES + CONSTRAINT docs. IMPLEMENTED except: BR-021 archived-flips policy (D-03 default current-week-only shipped), BR-023 pricing basis (D-08 seam default CURRENT_RATE), BR-026 soft-vs-hard mode (D-02 reserve), BR-029 completion symmetry (D-05: warp-only finish exposed), BR-036 lifecycle extension values (D-01 reserved) → these five = BUSINESS DECISION REQUIRED defaults active. BR-034 NOT APPLICABLE (field intentionally absent).

## Calculations CALC-001..009 — IMPLEMENTED (see CALCULATION doc; single owners + tests)
## State machines SM-01..10 — IMPLEMENTED (STATE_MACHINE doc; race classes runtime-proven)
## Roles/permissions SEC series — IMPLEMENTED at DB/service layers; JWT↔RLS positive-path verification pending provider (PARTIALLY VERIFIED)
## Data E-01..E-11 — IMPLEMENTED per FINAL_SCHEMA (E-10 not created pending D-09; E-11 implicit by design)
## Validation VAL-001..013 — IMPLEMENTED at Zod+DB; VAL-012/013 policies = D-10 defaults pending
## Edge cases EC-01..46 — covered by owning services/tests where behavioral (zero/negative/dup/races/truncation/date-boundaries runtime-proven); browser-level EC rows pending E2E
## Reports REP-001..007 — see REPORTING_EXPORT statuses (REP-003/005/006 content-byte NV)
## NFR — security verified-set implemented; perf N/A scale; backups plan documented (provider-side execution pending project creation)
