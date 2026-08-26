# CALCULATION_VERIFICATION.md (Phase 10.5)

Method: expectations computed INDEPENDENTLY (hand arithmetic / harness-local sums) from raw seeded inputs — never by calling the implementation under test — then compared against DB-stored values, page-rendered values, and export cells.

| Calc | Raw inputs | Independent expectation | MV1 actual | Where compared | Verdict |
| ---- | ---------- | ----------------------- | ---------- | -------------- | ------- |
| CALC-001 bounds | fixed dates | EC-24 [2025-12-29..2026-01-04]; EC-25 leap window | week.ts outputs identical | unit suite (20/20) | PASS |
| CALC-002 pieces | A: 8+12+5 across Mon/Wed/Sat | **25** | weekly_ledger.pieces=25 ★ | DB after archive | PASS |
| CALC-002 gross | 25 × rate 12 | **300** | gross=300 ★ | DB | PASS |
| CALC-002 advance term | balance 30 seed + 45 give | **75** | advance_applied=75 ★ | DB | PASS |
| CALC-002 final | 300−75 | **225** | final_pay=225 ★ | DB + first archive | PASS |
| CALC-002 live grid | post-correction live state (5 pieces, adv 37) | 5×12−37=**23** | HTML contains 23 ★ | HTTP body | PASS |
| CALC-006 live-full-balance refresh | later archive with balance 37 | refreshed final = 300−37=**263** | Sheet4 cell7=263 ★ | XLSX content parse | PASS |
| Negative path | B: 9×2=18 gross vs 55 adv | **−37** unclamped | final_pay=−37 stored & exported ★ | DB+XLSX | PASS |
| CALC-005 truncation | 75×½ → 37 (not 37.5) | **37** | balance=37 ★ | DB | PASS |
| Artifact-class elimination | 40×29/100 → exact 11 (float would risk 12) | **11** | balance=11 ★ (P9 runtime) + unit ★ | DB | PASS |
| Wipe edge | 1×½ → **0** | TR-ADV-006 behavior preserved | balance=0 ★ | DB | PASS |
| Rounding policy | none anywhere except carry truncation-toward-zero | — | grep + tests confirm no rounding/clamping of finals | code+tests | PASS |
| Historical rates | archive freezes rate at canon; display repricing CURRENT | Sheet1 Bilal @rate2 → 18 ★ vs ledger rate frozen 20 | both verified in one workbook ★ | XLSX | PASS |

Export-value independence: EXP-02/EXP-03 compare workbook cells to DB truth and hand-math — satisfying "check exported value" without reusing producer code paths.
