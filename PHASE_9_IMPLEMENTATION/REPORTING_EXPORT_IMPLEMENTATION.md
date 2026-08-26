# REPORTING_EXPORT_IMPLEMENTATION.md (Phase 9.11–9.12)

## Reports (pages consume precomputed service values — no UI arithmetic)

| REP | Surface | Status |
| --- | ------- | ------ |
| REP-001 weekly grid | /admin/weekly | IMPLEMENTED ✓ |
| REP-002a admin ledger | /admin/ledger (snapshot authority columns incl. canonical/source flags) | IMPLEMENTED ✓ |
| REP-002b own ledger | /app/salary (+ empty state FR-011) | IMPLEMENTED ✓ |
| REP-003 slip PDF | GET /api/export/slip?workerId=… (staff-only, streamed pdf-lib; content = minimal breakdown pending D-11) | IMPLEMENTED (content NV — never parsed) |
| REP-004 dashboards | /app (worker card) + /admin home stats | IMPLEMENTED ✓ |
| REP-005 global XLSX | GET /api/export/global-history — 4 sheets, exact ordering; sheet1 repriced CURRENT rate (CALC-008 default strategy), sheet4 snapshots (MIXED AUTHORITY preserved) | IMPLEMENTED; byte-level cell-exactness NOT VERIFIED this phase |
| REP-006 weekly XLSX | GET /api/export/weekly-salary | same status as REP-005 |
| REP-007 combined history | /app/history | IMPLEMENTED ✓ |

Sole filter remains workers search `?q=` (FR-013); pagination intentionally absent at target scale (Phase 6 OPS63-009 note carried).

## Exports pipeline

authoritative queries → formatter (exceljs/pdf-lib) → streamed response; nothing persisted server-side; staff-gated (anonymous blocked — HTTP-smoke verified for export route).

## Error handling (Phase 9.14)

Domain taxonomy maps every failure to safe messages (DuplicateError→409 friendly, NotFound→404, Authz→403, validation→400 field messages); unexpected errors logged server-side with a generic client message — no stacks/SQL/secrets leak (verified pattern in `safeMessage` + ops route catch).
