# CALCULATION_IMPLEMENTATION.md (Phase 9.7)

One authoritative implementation per calculation, exactly per Phase 6 C64.

| Calc | Owner | Implementation | Tests |
| ---- | ----- | -------------- | ----- |
| CALC-001 week bounds | `src/lib/domain/week.ts` | Monday–Sun inclusive; local-calendar safe formatting | unit ×5 incl. EC-24 year-boundary, EC-25 leap-week ★unit |
| CALC-002 P = G − A | PayrollService (SQL executor mirrors inside archive/mark_paid RPCs per ADR-002 one-spec-two-executors) | integer math, negative legal | unit primitives ★ + DB archive final_pay parity assertion ★ |
| CALC-003 M made | materialService windowed SUM ([start, coalesce(end,today)]) | future-dated excluded by bound | covered by capacity semantics in schema tests ✓ |
| CALC-004 Rem clamp | materialService `max(0,C−M)` | display-only | ✓ |
| CALC-005 carry scaling | `money.scaleBalance` rational truncation + SQL `trunc(b*num/den)` twin | toward-zero ≡ external contract minus float class | unit ×6 (incl. artifact case 100×29/100→**29** and wipe-edge→0) ★unit; SQL edges ★runtime |
| CALC-006 A term | defined inside CALC-002 (A = full balance) | — | via CALC-002 tests |
| CALC-007 archive canon | archive_week RPC sole quantity writer | create-or-refresh + canonical flag | runtime: freeze/preserve/rerun/dry-run/parallel ★ |
| CALC-008 pricing basis | PricingStrategy seam default CURRENT_RATE (D-08 open) | export sheet1 + production history display | implemented; strategy switch point documented |
| CALC-009 live parity | architecture mandate: services-only consumption | enforced by review + single-source imports | structural (no page arithmetic) ✓ |

Float-artifact note: the external "100×0.29→28 steal" is intentionally corrected to **29** (ADR-008 IMPROVE). Truncation-toward-zero observable behavior preserved everywhere else, including the B=1,f=½→0 edge (business visibility question Q-08 remains with the owner).
