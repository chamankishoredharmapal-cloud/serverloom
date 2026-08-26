# REPORT_EXPORT_REQUIREMENTS.md (Phase 6.9)

Complete report/dashboard/export inventory. Filters/sorting/GROUPING documented AS-IS — nothing invented. Authority column cross-references C64 (current vs snapshot). Labels: ★ verified; ◆ code; NV = NOT VERIFIED.

## Inventory

| REP | Name/Purpose | Actor | Source | Fields | Filters | Range | Sorting | Grouping | Calculations | Data authority | Format/Output | Empty behavior |
| --- | ------------ | ----- | ------ | ------ | ------- | ----- | -------- | -------- | ------------ | -------------- | -------------- | ------------- |
| REP-001 | Weekly review grid (per-worker cards) | Staff | live aggregates | worker, pieces, gross, advance, final, paid badge, action forms | NONE | current Mon–Sun only | employee table order | none | CALC-002/009 live | LIVE | HTML page | zero rows render 0s ★ |
| REP-002a | Admin salary ledger table | Staff | SalaryHistory | worker, week range, pieces, rate, gross, advance, final, paid, date, note | NONE | all weeks | −week_start | none | stored as-is | SNAPSHOT | HTML | empty ok ◆ |
| REP-002b | Employee own salary history | Employee(self) | own SalaryHistory | same minus ops | OWN-ONLY | all weeks | −week_start | none | stored as-is | SNAPSHOT | HTML + empty-state text ★ | isolation-proven |
| REP-003 | Salary slip PDF (current week) | Staff | live compute | name, week range, ₹final | NONE (per-worker path id) | current week | n/a | n/a | CALC-002 live | LIVE | streamed PDF attachment `salary_slip_{name}.pdf` | always renders values |
| REP-004a | Employee dashboard summary card | Employee(self) | live aggregates | week range, pieces, rate, advance, final, personal badges | OWN-ONLY | current week | n/a | n/a | CALC-002/009 | LIVE | HTML | zeros fine ★ |
| REP-004b | Admin stats dashboard | Staff | counts | total workers, pending, active pagdis, active warps, week range | NONE | current week context | n/a | counts | COUNT queries | LIVE | HTML | zeros fine |
| REP-005 | Global History XLSX | Staff | full-domain dump | Sheet1 Saree: employee,date,count,notes,SALARY EARNED(CALC-008 @CURRENT rate); Sheet2 Pagdi: employee,start,end("Active"),capacity,notes; Sheet3 Warp: same; Sheet4 Salary: ledger row fields + Paid Yes/No | NONE | ALL-TIME | −date / −start_date / −week_start per sheet | sheets only | mixed: sheet1 repriced LIVE-at-export; sheet4 SNAPSHOT | **MIXED AUTHORITY** | streamed XLSX `Global_History_Report.xlsx`, bold headers | header-only workbook when empty ★(cell-exact checks R4) |
| REP-006 | Weekly salary XLSX | Staff | ledger table | worker, weeks, pieces, rate, advance, final, Paid?, notes | NONE | all weeks | −week_start | single sheet | stored as-is | SNAPSHOT | streamed `Global_Weekly_Salary.xlsx` | header-only ★ |
| REP-007 | Combined personal history page | Employee(self) | three querysets | production rows (+display earnings CALC-008), pagdi list, warp list | OWN-ONLY | all-time | −date/−start_date | sections | display-only | LIVE-repriced | HTML | empty sections ★ |

Supporting lists with progress math (REP-adjacent): admin pagdi/warp lists show made/remaining via CALC-003/004 per row ★.

## Filter inventory (complete — nothing else exists)

The ONLY filter parameter in the entire application is the employees-list search `?q=` — case-insensitive CONTAINS across name OR phone (V:292-296) ★. No date/status/payment/assignment filters anywhere.

## Historical-reporting authority statement

MIXED BY DESIGN: ledger-backed outputs (REP-002, REP-005 sheet4, REP-006) show frozen snapshots; production-row pricing outputs (REP-005 sheet1, REP-007, detail weekly rows) reprice at CURRENT rate at render/export (C64 CALC-008; BR63 BR-023 → decision D-08 OPEN). Both behaviors cell-exact verified ★ — divergence after rate changes is expected system behavior, not a bug.

## Export correctness & integrity

Source queries: full unfiltered querysets (select_related used) ◆. Formatting: XLSX via openpyxl, bold headers; PDF via reportlab canvas. Filenames fixed as above (slip embeds raw worker name — cosmetic). Permissions: staff-only ★ probes. Streaming: generated into response, NEVER persisted server-side ★. Empty datasets: valid header-only artifacts ★. Large-dataset/memory behavior and pagination: ABSENT — NV at scale (OPS63-009). PDF inner text values: transport-verified (%PDF magic/filename/status) but CONTENT never machine-parsed in any phase — **NV** (D-11 open).
