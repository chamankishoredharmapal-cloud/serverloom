// CALC-001 — Week bounds. SOLE authoritative implementation.
// Phase 6 C64 §7 / BR-012: Monday–Sunday inclusive window, server-local reference date.
// PROHIBITED: re-deriving weekday math anywhere else (FEATURE_OWNERSHIP_MAP).

export function weekBounds(forDate: Date): { monday: Date; sunday: Date } {
  const d = new Date(Date.UTC(forDate.getUTCFullYear(), forDate.getUTCMonth(), forDate.getUTCDate()));
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const offsetToMonday = (dow + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - offsetToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { monday, sunday };
}

/** "YYYY-MM-DD" canonical form used across DB (date) columns.
 * Uses LOCAL calendar parts — node-pg delivers DATE columns as local-midnight
 * Dates; toISOString() would shift them to the previous UTC day under IST. */
export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function today(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function todayISO(): string {
  return toISODate(today());
}
