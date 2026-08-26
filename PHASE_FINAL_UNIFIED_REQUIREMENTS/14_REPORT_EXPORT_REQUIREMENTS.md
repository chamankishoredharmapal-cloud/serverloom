# 14_REPORT_EXPORT_REQUIREMENTS.md

REP-001..007 as specified in Phase 6, all consuming authoritative services (no separate export math).

| REP | Surface | Actor | Source authority | Format notes |
| --- | ------- | ----- | ---------------- | ------------ |
| REP-001 weekly grid | /admin/weekly | staff | CALC-002/009 live | per-worker cards→rows |
| REP-002a/b ledgers | /admin/ledger · /app/salary | staff / worker-self | SNAPSHOT stored values | negative finals visible |
| REP-003 slip PDF | /api/export/slip?workerId | staff | live compute | streamed attachment `salary_slip_{name}.pdf`; content breakdown per D-11 (minimal default) |
| REP-004 dashboards | /app + /admin | role-scoped | counts + CALC live | zeros fine |
| REP-005 global XLSX | /api/export/global-history | staff | Sheet1 CURRENT-rate repricing (D-08 default), Sheets2–4 verbatim incl. "Active" end cells; bold headers; fixed filename | **F-EXP01 fix required**: ISO date cells |
| REP-006 weekly XLSX | /api/export/weekly-salary | staff | snapshot columns | same date fix |
| REP-007 combined history | /app/history | worker self | three sections | display-only earnings |

Filters: ONLY employees search `?q=` (contains name/phone). Date-range filters: none in-app beyond implicit current-week scoping. Pagination: absent by scale decision.

Authorization: staff-gated (worker self pages OWN-only); anonymous redirect-blocked (runtime-proven). Empty datasets produce valid header-only artifacts.
