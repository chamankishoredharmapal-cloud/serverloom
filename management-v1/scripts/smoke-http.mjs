#!/usr/bin/env node
// Phase 9 HTTP smoke: boots embedded Postgres + migrations + seeded staff,
// then `next start` and asserts security/liveness over real HTTP.
import EmbeddedPostgres from "embedded-postgres";
import { spawnSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID, scryptSync, randomBytes } from "node:crypto";

const PORT_DB = 54332, PORT_APP = 3999;
const PASS = [], FAIL = [];
const check = (n, c, d = "") => { (c ? PASS : FAIL).push(n); console.log(`${c ? "PASS" : "FAIL"} - ${n}${d ? " :: " + d : ""}`); };

const dataDir = mkdtempSync(join(tmpdir(), "mv1smoke-"));
let pg, app;
try {
  pg = new EmbeddedPostgres({ databaseDir: join(dataDir, "db"), user: "postgres", password: "pw", port: PORT_DB, persistent: false });
  await pg.initialise(); await pg.start(); await pg.createDatabase("mv1");
  const url = `postgresql://postgres:pw@localhost:${PORT_DB}/mv1`;
  const mig = spawnSync(process.execPath, ["scripts/migrate.mjs"], { env: { ...process.env, DATABASE_URL: url }, encoding: "utf8" });
  if (mig.status !== 0) throw new Error("migrations failed: " + mig.stderr);

  // seed SUPERADMIN with local-mode credential (scrypt salt:key, same as auth.ts)
  const { Client } = await import("pg");
  const c = new Client({ connectionString: url }); await c.connect();
  const sid = randomUUID();
  const salt = randomBytes(16).toString("hex");
  const hash = `${salt}:${scryptSync("secret123", salt, 64).toString("hex")}`;
  await c.query(`insert into profiles (id, full_name, phone, role, status) values ($1,'Smoke Admin','7000000001','SUPERADMIN','ACTIVE')`, [sid]);
  await c.query(`insert into app_credentials values ($1,$2)`, [sid, hash]);
  await c.end();

  app = spawn(process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(PORT_APP)],
    { env: { ...process.env, DATABASE_URL: url, OPS_SECRET: "smoke-secret" }, stdio: "ignore" });

  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    await new Promise(r => setTimeout(r, 500));
    try { const r = await fetch(`http://localhost:${PORT_APP}/login`); up = r.status === 200; } catch {}
  }
  check("app boots and /login serves 200", up);
  if (!up) throw new Error("app never came up");

  const rRoot = await fetch(`http://localhost:${PORT_APP}/`, { redirect: "manual" });
  check("anonymous / redirects to /login", rRoot.status === 307 || rRoot.status === 302);
  const rAdmin = await fetch(`http://localhost:${PORT_APP}/admin`, { redirect: "manual" });
  check("anonymous /admin blocked (redirect)", rAdmin.status === 307 || rAdmin.status === 302);
  const rApp = await fetch(`http://localhost:${PORT_APP}/app`, { redirect: "manual" });
  check("anonymous /app blocked (redirect)", rApp.status === 307 || rApp.status === 302);
  const rExport = await fetch(`http://localhost:${PORT_APP}/api/export/global-history`, { redirect: "manual" });
  check("anonymous export blocked (redirect)", rExport.status === 307 || rExport.status === 302);

  const o1 = await fetch(`http://localhost:${PORT_APP}/api/ops/archive`, { method: "POST", body: "{}" });
  check("ops archive WITHOUT secret → 401", o1.status === 401);
  const o2 = await fetch(`http://localhost:${PORT_APP}/api/ops/archive`, { method: "POST", headers: { "x-ops-secret": "wrong" }, body: "{}" });
  check("ops archive WRONG secret → 401", o2.status === 401);
  const o3 = await fetch(`http://localhost:${PORT_APP}/api/ops/archive`, { method: "POST", headers: { "x-ops-secret": "smoke-secret", "content-type": "application/json" }, body: JSON.stringify({ dryRun: true }) });
  const o3body = await o3.json();
  check("ops archive CORRECT secret executes dry-run", o3.status === 200 && typeof o3body.created === "number", JSON.stringify(o3body));

  console.log(`\n===== SMOKE ${PASS.length} passed, ${FAIL.length} failed =====`);
  if (FAIL.length) process.exit(1);
} catch (err) {
  console.error("SMOKE ERROR:", err); process.exit(1);
} finally {
  try { app?.kill(); } catch {}
  try { await pg.stop(); } catch {}
  try { rmSync(dataDir, { recursive: true, force: true }); } catch {}
}
