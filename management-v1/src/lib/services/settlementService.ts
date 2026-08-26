import "server-only";
import { query, callRpc } from "@/lib/db";
import { weekBounds } from "@/lib/domain/week";

function iso(d: Date) { const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }

// SettlementService — payment-state authority ONLY (quantity columns untouched).

export async function markPaid(workerId: string, note?: string) {
  await callRpc("mark_paid", [workerId, note ?? ""]);
}

export async function markUnpaid(workerId: string) {
  await callRpc("mark_unpaid", [workerId]);
}

export async function ledgerAll() {
  return query(
    `select l.*, p.full_name from weekly_ledger l join profiles p on p.id=l.worker_id
      order by l.week_start desc, p.full_name`
  ).then(r => r.rows);
}

export async function ledgerMine(workerId: string) {
  return query(
    `select * from weekly_ledger where worker_id=$1 order by week_start desc`, [workerId]
  ).then(r => r.rows);
}

export function currentWindow() {
  const { monday, sunday } = weekBounds(new Date());
  return { monday: iso(monday), sunday: iso(sunday) };
}
