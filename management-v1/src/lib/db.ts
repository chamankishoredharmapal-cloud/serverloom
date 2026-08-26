import { Pool, type QueryResult, type QueryResultRow } from "pg";

// Thin data-access port (Phase 7 SYSTEM_ARCHITECTURE data layer).
// Binds to DATABASE_URL (Supabase direct connection in prod / embedded PG in tests).

const globalForPg = globalThis as unknown as { __mv1Pool?: Pool };

export function pool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  if (!globalForPg.__mv1Pool) {
    globalForPg.__mv1Pool = new Pool({ connectionString: url, max: 10 });
  }
  return globalForPg.__mv1Pool;
}

export function query<T extends QueryResultRow = Record<string, any>>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return pool().query(text, params as never[]);
}

/** Run a mutation RPC and map known SQL error codes/messages to the domain taxonomy. */
export async function callRpc(fn: string, params: unknown[] = []): Promise<QueryResult> {
  const placeholders = params.map((_, i) => `$${i + 1}`).join(",");
  try {
    return await query(`select * from public.${fn}(${placeholders})`, params);
  } catch (err) {
    throw mapDbError(err);
  }
}

export function mapDbError(err: unknown): Error {
  const e = err as { code?: string; message?: string };
  const msg = e?.message ?? "";
  if (e?.code === "23505" || msg.includes("DUPLICATE_WORKER_DAY")) {
    return Object.assign(new Error("An entry for this worker on this date already exists."), {
      kind: "DuplicateError",
      httpStatus: 409,
    });
  }
  if (e?.code === "42501" || msg === "FORBIDDEN") {
    return Object.assign(new Error("You are not allowed to perform this action."), {
      kind: "AuthzError",
      httpStatus: 403,
    });
  }
  if (msg.startsWith("NOT_FOUND")) return Object.assign(new Error("Not found."), { kind: "NotFound", httpStatus: 404 });
  if (msg === "INELIGIBLE_WORKER") return Object.assign(new Error("Please choose an active worker."), { kind: "ValidationError", httpStatus: 400 });
  if (msg === "AMOUNT_MUST_BE_POSITIVE") return Object.assign(new Error("Could not add advance: amount must be positive."), { kind: "ValidationError", httpStatus: 400 });
  if (msg === "COUNT_INVALID") return Object.assign(new Error("Invalid saree entry."), { kind: "ValidationError", httpStatus: 400 });
  if (msg === "CAPACITY_INVALID") return Object.assign(new Error("Capacity cannot be negative."), { kind: "ValidationError", httpStatus: 400 });
  if (msg === "START_REQUIRED") return Object.assign(new Error("Start date is required."), { kind: "ValidationError", httpStatus: 400 });
  if (msg === "INVALID_RATE" ) return Object.assign(new Error("Invalid salary value."), { kind: "ValidationError", httpStatus: 400 });
  if (msg === "FACTOR_INVALID") return Object.assign(new Error("carry_factor must be non-negative"), { kind: "ValidationError", httpStatus: 400 });
  if (msg === "INVALID_STATUS") return Object.assign(new Error("Invalid status."), { kind: "ValidationError", httpStatus: 400 });
  if (e?.code === "P0002" || msg.startsWith("NOT_FOUND")) return Object.assign(new Error("Not found."), { kind: "NotFound", httpStatus: 404 });
  console.error("[db]", msg); // server-side detail; client gets safe generic
  return Object.assign(new Error("Something went wrong. Please try again."), { kind: "Internal", httpStatus: 500 });
}
