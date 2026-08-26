import { NextRequest, NextResponse } from "next/server";
import { runWeek } from "@/lib/services/archiveService";
import { carry } from "@/lib/services/advanceService";

// Operator/system surface (ADR-011): CRON_SECRET-gated; never client-facing.
// POST /api/ops/archive {forDate?, dryRun?}   → archive_week RPC
// POST /api/ops/carry   {factorNum,factorDen} → carry RPC (guard policy = D-04)

async function authorized(req: NextRequest) {
  const secret = process.env.OPS_SECRET;
  if (!secret) return false;
  return req.headers.get("x-ops-secret") === secret;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ op: string }> }) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { op } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    if (op === "archive") {
      const result = await runWeek({
        forDate: body.forDate, dryRun: Boolean(body.dryRun), triggeredBy: "SYSTEM",
        note: body.note ?? "Scheduled reset",
      });
      return NextResponse.json(result);
    }
    if (op === "carry") {
      const processed = await carry(
        Number(body.factorNum ?? 1), Number(body.factorDen ?? 1),
        { triggeredBy: "SYSTEM", actorNote: body.note ?? "" }
      );
      return NextResponse.json({ processed });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 404 });
  } catch (err) {
    console.error("[ops]", err);
    return NextResponse.json({ error: "operation failed" }, { status: 500 });
  }
}
