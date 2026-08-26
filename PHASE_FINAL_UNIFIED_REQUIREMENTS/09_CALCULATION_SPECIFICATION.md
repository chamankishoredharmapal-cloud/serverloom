# 09_CALCULATION_SPECIFICATION.md

One authoritative owner per calculation; TS service + coordinated SQL executor from one spec; pinned by parity tests (ADR-002).

| Calc | Formula / contract | Owner | Edges (required behavior) | Verified |
| ---- | ------------------ | ----- | ------------------------- | -------- |
| CALC-001 | monday=d−weekday(d); sunday=+6 | lib/domain/week.ts | year-boundary, leap-week exact | unit ★ |
| CALC-002 | P = Q×R − A (A=full balance) | PayrollService.computeWeek (+SQL twin) | zero pieces→P=−A; negative P NEVER clamped | unit+DB ★ |
| CALC-003 | M = Σ count where start ≤ d ≤ min(today,end) | materialService | future-dated excluded beyond bound | tests ★ |
| CALC-004 | Rem = max(0, C−M) | materialService | overshoot clamps display only | ★ |
| CALC-005 | N = trunc(B×num/den) toward-zero, exact rational (no float) | AdvanceService.carry + SQL twin | 140×½→70 · 40×29/100→11 · 1×½→**0** wipe edge preserved | unit+runtime ★ |
| CALC-006 | A term = full current balance each week | inside CALC-002 | no amortization/proration | ★ via archive refresh math |
| CALC-007 | canon five fields = CALC-002 at freeze instant, ∀ ACTIVE workers | archive_week RPC sole writer | rerun identical; payment group untouched | runtime ★ |
| CALC-008 | display/export earning = pieces × CURRENT rate (strategy seam: CURRENT_RATE default \| ENTRY_RATE pending D-08) | ReportService strategy | historical rows never re-priced in place | XLSX cell check ★ |
| CALC-009 | live parity across all consumers | architectural mandate | single-service consumption; pages precomputed | structural ✓ |

Rounding: none anywhere except CALC-005 truncation-toward-zero (exact rational implementation replaces the external float-artifact class while preserving observable semantics). Partial periods: none — weeks are atomic Mon–Sun units. Corrections: delete+recreate changes live aggregates instantly; archives repair via targeted rerun.
