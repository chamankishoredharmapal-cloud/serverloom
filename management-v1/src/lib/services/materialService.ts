import "server-only";
import { query, callRpc } from "@/lib/db";
import { MaterialType } from "@/lib/domain/validation";

// MaterialService — assign (atomic auto-finish) / explicit finish / progress.
// CALC-003/004 (made/remaining) computed here as the single authority.

export type Assignment = {
  id: string; worker_id: string; full_name?: string;
  material_type: MaterialType; started_on: string; finished_on: string | null;
  capacity: number; pieces: number; remaining: number;
};

async function withProgress(rows: Record<string, unknown>[]): Promise<Assignment[]> {
  return rows.map(r => ({
    ...(r as unknown as Assignment),
    remaining: Math.max(0, Number(r.capacity) - Number(r.pieces)),
  }));
}

export async function assign(input: {
  workerId: string; materialType: MaterialType;
  startedOn?: string; capacity: number; note?: string;
}) {
  await callRpc("assign_material", [
    input.workerId, input.materialType,
    input.materialType === "WARP" ? null : input.startedOn ?? null,
    input.capacity, input.note ?? "",
  ]);
}

export async function finish(assignmentId: string, note?: string) {
  const r = await query<{ finish_material: string }>(
    `select finish_material($1,$2)`, [assignmentId, note ?? "Finished by admin"]
  );
  return r.rows[0].finish_material; // 'FINISHED' | 'ALREADY_FINISHED'
}

export async function activeFor(workerId: string, type: MaterialType) {
  const r = await query(
    `select a.*, coalesce((
       select sum(count) from production_entries p
        where p.worker_id=a.worker_id and p.work_date between a.started_on
              and coalesce(a.finished_on, current_date)),0)::int pieces
       from material_assignments a
      where a.worker_id=$1 and a.material_type=$2 and a.finished_on is null`,
    [workerId, type]
  );
  return (await withProgress(r.rows))[0] ?? null;
}

export async function historyFor(workerId: string, type?: MaterialType) {
  const r = await query(
    `select a.*, coalesce((
       select sum(count) from production_entries p
        where p.worker_id=a.worker_id and p.work_date between a.started_on
              and coalesce(a.finished_on, current_date)),0)::int pieces
       from material_assignments a
      where a.worker_id=$1 and ($2::text is null or a.material_type=$2)
      order by started_on desc`, [workerId, type ?? null]
  );
  return withProgress(r.rows);
}

export async function listAll(type: MaterialType) {
  const r = await query(
    `select a.id, a.worker_id, p.full_name, a.material_type, a.started_on,
            a.finished_on, a.capacity,
            coalesce((select sum(count) from production_entries pe
               where pe.worker_id=a.worker_id
                 and pe.work_date between a.started_on
                 and coalesce(a.finished_on, current_date)),0)::int pieces
       from material_assignments a join profiles p on p.id=a.worker_id
      where a.material_type=$1
      order by a.started_on desc`, [type]
  );
  return withProgress(r.rows);
}
