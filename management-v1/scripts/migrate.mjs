#!/usr/bin/env node
// Applies db/migrations/*.sql in lexicographic order; records applied files.
// Repeatable: re-running is a no-op. Never destructive.
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "db", "migrations");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(2);
}

const pool = new Pool({ connectionString: url });
try {
  await pool.query(
    `create table if not exists public._migrations (
       name text primary key,
       applied_at timestamptz not null default now())`
  );
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const done = await pool.query("select 1 from public._migrations where name=$1", [f]);
    if (done.rowCount > 0) continue;
    const sql = readFileSync(join(dir, f), "utf8");
    try {
      await pool.query("begin");
      await pool.query(sql);
      await pool.query("insert into public._migrations(name) values ($1)", [f]);
      await pool.query("commit");
      console.log("applied:", f);
    } catch (err) {
      await pool.query("rollback");
      console.error("FAILED:", f, err.message);
      process.exit(1);
    }
  }
  console.log("migrations complete");
} finally {
  await pool.end();
}
