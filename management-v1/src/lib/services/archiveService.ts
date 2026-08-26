import "server-only";
import { query } from "@/lib/db";

// ArchiveService — freezeWeek trigger surface. The canonical math lives in the
// archive_week RPC (sole quantity-column writer); this boundary is invocation +
// reporting only.

export async function runWeek(opts?: {
  forDate?: string; dryRun?: boolean;
  triggeredBy?: "OPERATOR" | "SYSTEM"; note?: string;
}) {
  const r = await query<{ archive_week: { created: number; refreshed: number; week_start: string; week_end: string } }>(
    `select archive_week($1::date,$2::boolean,$3::text,$4::text)`,
    [opts?.forDate ?? new Date().toISOString().slice(0, 10),
     opts?.dryRun ?? false,
     opts?.triggeredBy ?? "OPERATOR",
     opts?.note ?? ""]
  );
  return r.rows[0].archive_week;
}

export function recentRuns(limit = 10) {
  return query(
    `select * from archive_runs order by created_at desc limit ${Math.min(Math.max(limit, 1), 50)}`
  ).then(r => r.rows);
}
