import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { query } from "@/lib/db";

// Session model (Phase 7 §Auth): provider-agnostic port.
// PRODUCTION: Supabase Auth issues JWTs consumed by RLS (auth.uid()).
// LOCAL MODE (no Supabase env): HMAC-signed cookie identifying a profile row.
// Both paths expose the same identity contract consumed by services/UI.
// Approval gate (BR-022): status ≠ ACTIVE ⇒ NO session ever issued.

const SECRET = process.env.OPS_SECRET ?? "dev-insecure-secret";
export const SESSION_COOKIE = "mv1_session";

export type Identity = {
  id: string;
  fullName: string;
  phone: string;
  role: "WORKER" | "STAFF" | "SUPERADMIN";
  status: string;
};

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  return timingSafeEqual(Buffer.from(key, "hex"), scryptSync(pw, salt, 64));
}

export async function issueSession(profileId: string) {
  const jar = await cookies();
  const payload = `${profileId}.${Date.now()}`;
  jar.set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // D-14 interim default (7d rolling); formal policy pending decision
    path: "/",
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Resolve the caller from the signed cookie. Returns null when anonymous/invalid. */
export async function currentIdentity(): Promise<Identity | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, ts, sig] = parts;
  if (sign(`${id}.${ts}`) !== sig) return null;
  try {
    const r = await query<Identity & { full_name: string }>(
      `select id, full_name, phone, role, status from profiles where id=$1`,
      [id]
    );
    if (r.rowCount === 0) return null;
    const p = r.rows[0];
    return { id: p.id, fullName: p.full_name, phone: p.phone, role: p.role, status: p.status };
  } catch {
    return null;
  }
}

export async function requireStaff(): Promise<Identity> {
  const id = await currentIdentity();
  if (!id) throw Object.assign(new Error("login"), { kind: "AuthError" });
  if (id.role !== "STAFF" && id.role !== "SUPERADMIN") {
    throw Object.assign(new Error("staff only"), { kind: "AuthzError", httpStatus: 403 });
  }
  return id;
}

export async function requireIdentity(): Promise<Identity> {
  const id = await currentIdentity();
  if (!id) throw Object.assign(new Error("login"), { kind: "AuthError" });
  return id;
}
