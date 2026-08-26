import "server-only";
import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";
import { ValidationError, DuplicateError, AuthzError } from "@/lib/domain/errors";

/**
 * AuthService â€” registration/login eligibility/status gate (Phase 7 boundary).
 * Local-mode credentials via app_credentials; swap to Supabase Auth in prod
 * (same identity contract; profiles.id = auth.users.id).
 */
export async function register(fullName: string, phone: string, password: string) {
  const exists = await query(`select 1 from profiles where phone=$1`, [phone]);
  if (exists.rowCount) throw ("Phone already registered");
  const { hashPassword } = await import("@/lib/auth");
  const id = randomUUID();
  // PENDING defaults zeroed (BR-025); approval required before any session (BR-022)
  await query(
    `insert into profiles (id, full_name, phone, role, status) values ($1,$2,$3,'WORKER','PENDING')`,
    [id, fullName, phone]
  );
  await query(`insert into app_credentials values ($1,$2)`, [id, hashPassword(password)]);
  await query(
    `select public._emit_audit($1,'USER',$2,'PROFILE',$3,'REGISTER',null,
       jsonb_build_object('status','PENDING'),'Self-registration')`,
    [id, fullName, id]
  );
  return { id };
}

export async function login(phone: string, password: string) {
  const r = await query<{ id: string; status: string }>(
    `select p.id, p.status from profiles p
       join app_credentials c on c.profile_id = p.id
     where p.phone=$1`,
    [phone]
  );
  const row = r.rows[0];
  const { verifyPassword } = await import("@/lib/auth");
  if (!row || !verifyPassword(password, (await query<{ password_hash: string }>(
    `select password_hash from app_credentials where profile_id=$1`, [row.id]
  )).rows[0]?.password_hash ?? "")) {
    throw ("Invalid phone or password."); // generic: no enumeration
  }
  if (row.status !== "ACTIVE") {
    throw ("Account not approved yet."); // refusal WITHOUT session (BR-022)
  }
  return row.id;
}
