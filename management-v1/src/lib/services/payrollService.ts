import "server-only";
import { query, callRpc } from "@/lib/db";
import { weekBounds, todayISO } from "@/lib/domain/week";

// PayrollService — SOLE owner of CALC-002 weekly payable and the live grid/dashboards
// (CALC-009 parity consumers). Pages receive PRE-COMPUTED values; no UI arithmetic.

export type WeekRow = {
  worker_id: string; full_name: string; pieces: number; rate: number;
  gross: number; advance: number; final_pay: number; paid: boolean;
};

/** Live current-week figures for one worker (worker dashboard). */
export async function currentWeekFor(workerId: string): Promise<{
  pieces: number; rate: number; gross: number; advance: number; final_pay: number;
  monday: string; sunday: string;
}> {
  const monday = toISO(weekBounds(new Date()).monday);
  const sunday = toISO(weekBounds(new Date()).sunday);
  const r = await query(
    `with wk as (
       select coalesce(sum(count),0)::int pieces
         from production_entries
        where worker_id=$1 and work_date between $2 and $3)
     select p.salary_rate rate, wk.pieces,
            wk.pieces * p.salary_rate gross,
            p.advance_balance advance,
            (wk.pieces * p.salary_rate) - p.advance_balance final_pay
       from profiles p cross join wk where p.id=$1`,
    [workerId, monday, sunday]
  );
  const row = r.rows[0] as unknown as {
    pieces: number; rate: number; gross: number; advance: number; final_pay: number;
  };
  return { ...row, monday, sunday };
}

/** Staff weekly grid — one precomputed row per ACTIVE worker. */
export async function weekGrid(): Promise<{ rows: WeekRow[]; monday: string; sunday: string }> {
  const monday = toISO(weekBounds(new Date()).monday);
  const sunday = toISO(weekBounds(new Date()).sunday);
  const r = await query(
    `with wk as (
       select worker_id, coalesce(sum(count),0)::int pieces
         from production_entries
        where work_date between $1 and $2
        group by worker_id)
     select p.id worker_id, p.full_name,
            coalesce(wk.pieces,0) pieces,
            p.salary_rate rate,
            coalesce(wk.pieces,0) * p.salary_rate gross,
            p.advance_balance advance,
            (coalesce(wk.pieces,0) * p.salary_rate) - p.advance_balance final_pay,
            coalesce(l.paid,false) paid
       from profiles p
       left join wk on wk.worker_id = p.id
       left join weekly_ledger l on l.worker_id=p.id and l.week_start=$1 and l.week_end=$2
      where p.status='ACTIVE'
      order by p.full_name`,
    [monday, sunday]
  );
  return { rows: r.rows as WeekRow[], monday, sunday };
}

function toISO(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function setRate(workerId: string, salaryPerSaree: number) {
  await callRpc("set_rate", [workerId, salaryPerSaree]);
}

export function today() { return todayISO(); }
