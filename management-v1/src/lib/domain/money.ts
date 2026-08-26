// Money policy (Phase 8 TD-12): integers (₹ whole units) end-to-end.
// Negative payable P = G − A is LEGAL output and must never be clamped (BR-013 pinned).
// CALC-002 sole owner: PayrollService.computeWeek — this module supplies the shared math
// primitive so TS service and SQL archive executor stay aligned (ADR-002 one-spec-two-executors).

export function gross(pieces: number, rate: number): number {
  return pieces * rate;
}

export function finalPay(grossAmount: number, advanceBalance: number): number {
  return grossAmount - advanceBalance; // may be negative — NEVER clamp
}

/**
 * CALC-005 carry scaling — EXACT truncation toward zero on the non-negative domain
 * (ADR-008). factor is given as a rational num/den (e.g. 0.5 → {num:1,den:2}) so no
 * binary float ever touches money. Observable contract matches external int(B×f)
 * semantics minus the float-artifact class (100×0.29→28 case eliminated).
 */
export function scaleBalance(
  balance: number,
  factor: { num: number; den: number }
): number {
  if (factor.num < 0 || factor.den <= 0) throw new Error("invalid carry factor");
  const scaled = Math.trunc((balance * factor.num) / factor.den); // toward zero; balance ≥ 0 ⇒ ≡ floor
  return Math.max(0, scaled);
}
