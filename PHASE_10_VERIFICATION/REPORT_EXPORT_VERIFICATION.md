# REPORT_EXPORT_VERIFICATION.md (Phase 10.12)

Exports were verified by PARSING THE GENERATED FILES, not by status codes.

| Item | Verification | Result |
| ---- | ------------ | ------ |
| Global XLSX authorization | anonymous → redirect; staff → 200 | PASS ★ (SEC-05/EXP-01) |
| Workbook integrity | ExcelJS successfully parsed the streamed bytes (4 sheets present) | PASS ★ |
| Sheet1 live repricing | Bilal row: 9 pieces × CURRENT rate 2 = **18** matched cell E | PASS ★ (EXP-02) |
| Sheet4 snapshot authority | Asha row: final **263** == DB stored value after latest canon refresh; matches independent math 25×12−37 | PASS ★ (EXP-03 corrected expectation) |
| Date formatting in cells | **DEFECT F-EXP01 (P3):** dates render as verbose `Mon Aug 24 2026 …` strings instead of ISO — route uses String(date) on pg-parsed Dates. Values correct; format diverges from REP spec. FIX LATER (formatter-only). | RECORDED |
| Weekly salary XLSX | same pipeline family (sheet subset) | PARTIAL (bytes NV this phase) |
| Slip PDF | staff-gated; %PDF magic + application/pdf + non-trivial size | PASS ★ (transport); text content NOT VERIFIED (no extractor) |
| Empty dataset behavior | header-only workbook validity inherited from ExcelJS writer; not separately asserted this phase | NOT VERIFIED |
| Totals reconciliation | Sheet1 row-level earnings independently recomputed; Sheet4 finals vs DB | PASS ★ |

Reports (HTML): grid values compared against independent recomputation (REP-01: live final 23 rendered ✓); ledger page columns match stored snapshots (build+data verified).
