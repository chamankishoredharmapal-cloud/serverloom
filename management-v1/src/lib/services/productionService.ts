import "server-only";
import { query, callRpc } from "@/lib/db";
import { NotFoundError } from "@/lib/domain/errors";

// ProductionService â€” create/remove (correction model) + listing.
// Duplicate-day arbitration lives in the RPC (C-01); audit inside same tx.

export async function createEntry(workerId: string, workDate: string | undefined, count: number, note?: string) {
  await callRpc("create_production_entry", [workerId, workDate || null, count, note ?? ""]);
}

export async function removeEntry(entryId: string) {
  try {
    await callRpc("remove_production_entry", [entryId]);
  } catch (err) {
    const msg = (err as Error).message;
    if (/NOT_FOUND/.test(msg)) throw ("Entry not found.");
    throw err;
  }
}

export async function listMine(workerId: string) {
  return query(
    `select id, work_date, count, note from production_entries
      where worker_id=$1 and deleted_at is null
      order by work_date desc limit 500`, [workerId]
  ).then(r => r.rows);
}

export async function weekEntriesFor(workerId: string, monday: string, sunday: string) {
  return query(
    `select id, work_date, count, note from production_entries
      where worker_id=$1 and deleted_at is null and work_date between $2 and $3
      order by work_date desc`, [workerId, monday, sunday]
  ).then(r => r.rows);
}
