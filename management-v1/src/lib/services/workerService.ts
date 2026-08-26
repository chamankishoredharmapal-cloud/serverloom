import "server-only";
import { query } from "@/lib/db";
import { callRpc } from "@/lib/db";
import { NotFoundError } from "@/lib/domain/errors";

// WorkerService â€” roster, search (sole filter FR-013), detail aggregation,
// approve/status transitions. Rate/pay/materials are OTHER services' property.

export async function searchWorkers(q: string) {
  const like = `%${q ?? ""}%`;
  return query(
    `select id, full_name, phone, role, status, salary_rate, advance_balance, joined_on
       from profiles
      where ($1 = '' or full_name ilike $2 or phone ilike $2)
      order by full_name`,
    [q ?? "", like]
  ).then(r => r.rows);
}

export async function pendingCount() {
  return query(`select count(*)::int n from profiles where status='PENDING'`)
    .then(r => r.rows[0].n);
}

export async function activeCounts() {
  const [mat] = await Promise.all([
    query(`select
             count(*) filter (where material_type='PAGDI')::int pagdis,
             count(*) filter (where material_type='WARP')::int warps
             from material_assignments where finished_on is null`),
  ]);
  return { pagdis: mat.rows[0].pagdis, warps: mat.rows[0].warps };
}

export async function getWorker(id: string) {
  const r = await query(
    `select id, full_name, phone, role, status, salary_rate, advance_balance, joined_on
       from profiles where id=$1`, [id]);
  if (!r.rowCount) throw ("Worker not found");
  return r.rows[0];
}

export async function approveWorker(workerId: string) {
  await callRpc("approve_worker", [workerId]);
}

export async function setStatus(workerId: string, status: string) {
  await callRpc("set_worker_status", [workerId, status]);
}
