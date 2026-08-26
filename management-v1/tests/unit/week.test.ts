import { describe, it, expect } from "vitest";
import { weekBounds, toISODate } from "@/lib/domain/week";

const d = (s: string) => new Date(s + "T12:00:00"); // midday avoids TZ edges

describe("CALC-001 week bounds (Mon–Sun)", () => {
  it("maps a Wednesday into Mon..Sun of same week", () => {
    const { monday, sunday } = weekBounds(d("2026-08-26"));
    expect(toISODate(monday)).toBe("2026-08-24");
    expect(toISODate(sunday)).toBe("2026-08-30");
  });
  it("Sunday maps back to its own week's Monday", () => {
    const { monday, sunday } = weekBounds(d("2026-08-23"));
    expect(toISODate(monday)).toBe("2026-08-17");
    expect(toISODate(sunday)).toBe("2026-08-23");
  });
  it("Monday maps to itself", () => {
    const { monday, sunday } = weekBounds(d("2026-08-24"));
    expect(toISODate(monday)).toBe("2026-08-24");
    expect(toISODate(sunday)).toBe("2026-08-30");
  });
  it("year boundary (EC-24): 2025-12-31 → [2025-12-29 .. 2026-01-04]", () => {
    const { monday, sunday } = weekBounds(d("2025-12-31"));
    expect(toISODate(monday)).toBe("2025-12-29");
    expect(toISODate(sunday)).toBe("2026-01-04");
  });
  it("leap-year day (EC-25): 2024-02-29 → [2024-02-26 .. 2024-03-03]", () => {
    const { monday, sunday } = weekBounds(d("2024-02-29"));
    expect(toISODate(monday)).toBe("2024-02-26");
    expect(toISODate(sunday)).toBe("2024-03-03");
  });
});
