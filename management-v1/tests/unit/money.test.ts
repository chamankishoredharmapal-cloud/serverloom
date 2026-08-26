import { describe, it, expect } from "vitest";
import { gross, finalPay, scaleBalance } from "@/lib/domain/money";

describe("CALC-002 primitives", () => {
  it("G = Q × R", () => expect(gross(25, 15)).toBe(375));
  it("P = G − A may be NEGATIVE and is never clamped (BR-013)", () => {
    expect(finalPay(100, 140)).toBe(-40);
  });
  it("zero pieces → P = −A (EC-02)", () => expect(finalPay(gross(0, 15), 45)).toBe(-45));
});

describe("CALC-005 exact carry truncation toward zero (ADR-008)", () => {
  it("140 × ½ → 70", () =>
    expect(scaleBalance(140, { num: 1, den: 2 })).toBe(70));
  it("40 × 29/100 → 11 (float artifact 11.600000000000001 class eliminated)", () =>
    expect(scaleBalance(40, { num: 29, den: 100 })).toBe(11));
  it("100 × 29/100 → 29 EXACTLY — external float artifact (28.999…→28 'steal') designed out per ADR-008/C64 §9 IMPROVE", () =>
    expect(scaleBalance(100, { num: 29, den: 100 })).toBe(29));
  it("wipe-to-zero edge B=1 f=½ → 0 (TR-ADV-006 behavior preserved)", () =>
    expect(scaleBalance(1, { num: 1, den: 2 })).toBe(0));
  it("full carry unchanged", () =>
    expect(scaleBalance(70, { num: 1, den: 1 })).toBe(70));
});
