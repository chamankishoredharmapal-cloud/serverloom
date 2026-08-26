import { describe, it, expect } from "vitest";
import {
  SignupInput, ProductionEntryInput, AdvanceGiveInput,
  MaterialAssignInput, CarryInput, RateInput,
} from "@/lib/domain/validation";

describe("validation contracts (VAL series)", () => {
  it("signup rejects missing fields (VAL-001)", () => {
    expect(SignupInput.safeParse({ fullName: "", phone: "", password: "" }).success).toBe(false);
  });
  it("production count negative rejected; zero legal (VAL-004/BR-027)", () => {
    const base = { workerId: "00000000-0000-4000-8000-000000000000" };
    expect(ProductionEntryInput.safeParse({ ...base, count: -1 }).success).toBe(false);
    expect(ProductionEntryInput.safeParse({ ...base, count: 0 }).success).toBe(true);
  });
  it("advance amount ≤ 0 rejected (VAL-006/BR-007)", () => {
    const base = { workerId: "00000000-0000-4000-8000-000000000000" };
    expect(AdvanceGiveInput.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(AdvanceGiveInput.safeParse({ ...base, amount: -5 }).success).toBe(false);
  });
  it("PAGDI requires start date; WARP may omit it (BR-028/VAL-008)", () => {
    const base = { workerId: "00000000-0000-4000-8000-000000000000", capacity: 10 };
    expect(MaterialAssignInput.safeParse({ ...base, materialType: "PAGDI" }).success).toBe(false);
    expect(MaterialAssignInput.safeParse({ ...base, materialType: "WARP" }).success).toBe(true);
    expect(MaterialAssignInput.safeParse({ ...base, materialType: "PAGDI", startedOn: "2026-01-05" }).success).toBe(true);
  });
  it("capacity negative rejected (VAL-007)", () => {
    const base = { workerId: "00000000-0000-4000-8000-000000000000", startedOn: "2026-01-05" };
    expect(MaterialAssignInput.safeParse({ ...base, materialType: "PAGDI", capacity: -1 }).success).toBe(false);
  });
  it("carry factor denominator must be positive (BR-019)", () => {
    expect(CarryInput.safeParse({ factorNum: -1, factorDen: 1 }).success).toBe(false);
    expect(CarryInput.safeParse({ factorNum: 1, factorDen: 0 }).success).toBe(false);
  });
  it("rate negative rejected; zero legal (VAL-005/BR-006)", () => {
    const base = { workerId: "00000000-0000-4000-8000-000000000000" };
    expect(RateInput.safeParse({ ...base, salaryPerSaree: -2 }).success).toBe(false);
    expect(RateInput.safeParse({ ...base, salaryPerSaree: 0 }).success).toBe(true);
  });
});
