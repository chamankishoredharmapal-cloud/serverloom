import "server-only";
import { query, callRpc } from "@/lib/db";

// AdvanceService — give (>0 additive) / clear (audited no-op at zero) / carry.
// All money mutation lives in the DB RPCs (row locks + exact truncation math);
// this boundary validates inputs at the edge and maps errors.

export async function giveAdvance(workerId: string, amount: number, note?: string) {
  await callRpc("give_advance", [workerId, amount, note ?? ""]);
}

export async function clearAdvance(workerId: string, note?: string) {
  await callRpc("clear_advance", [workerId, note ?? ""]);
}

export async function carry(factorNum: number, factorDen: number, opts?: {
  dryRun?: boolean; triggeredBy?: "OPERATOR" | "SYSTEM"; actorNote?: string;
}) {
  const r = await query<{ carry_advances: number }>(
    `select carry_advances($1,$2,$3,$4,$5)`,
    [factorNum, factorDen, opts?.actorNote ?? "", opts?.dryRun ?? false, opts?.triggeredBy ?? "OPERATOR"]
  );
  return r.rows[0].carry_advances;
}

/** Recent advance trail for one worker (own history page). */
export function advanceHistoryFor(workerId: string) {
  return query(
    `select action, previous_amount, new_amount, created_at, note
       from audit_events
      where entity_type='ADVANCE' and entity_id=$1
      order by occurred_at desc limit 100`, [workerId]
  ).then(r => r.rows);
}
