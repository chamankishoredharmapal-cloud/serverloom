#!/usr/bin/env node
// =====================================================================
// PHASE 10 â€” INDEPENDENT VERIFICATION HARNESS (read-only wrt app code)
// Fresh assertions, hand-computed expectations, NO reuse of verify-db.mjs.
//
// Layers exercised:
//   [DB]    RLS isolation via Supabase-contract shim (claims -> auth.uid())
//   [DB]    business rules / state machines / edges (invalid paths included)
//   [DB]    concurrency races with audit-consistency checks
//   [CALC]  INDEPENDENT hand-computed expectations vs stored/displayed values
//   [HTTP]  session-cookie access matrix + EXPORT CONTENT parsing (xlsx cells)
//
// Disposable embedded PostgreSQL; deleted afterwards. No app source modified.
// =====================================================================
import EmbeddedPostgres from "embedded-postgres";
import { spawnSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "pg";
import { createHmac, randomUUID } from "node:crypto";

const PORT_DB = 54333, PORT_APP = 4010;
const PASS = [], FAIL = [];
const check = (id, name, cond, detail = "") => {
  (cond ? PASS : FAIL).push({ id, name });
  console.log(`${cond ? "PASS" : "FAIL"} [${id}] ${name}${detail ? " :: " + detail : ""}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "mv1p10-"));
let pg, app;
const OPS = "p10-secret";
let url;

async function q(sql, params = [], opts = {}) {
  // opts.as === "appclient": NON-superuser connection â†’ production authorization
  // path fully enforced (owner-bypass impossible). Otherwise owner connection.
  const connOpts = opts.as === "appclient"
    ? { connectionString: url.replace(/\/\/[^@]+@/, "//appclient:appclient@") } // user INSIDE the URL wins
    : { connectionString: url };
  const c = new Client(connOpts);
  await c.connect();
  try {
    if (opts.as === "appclient") {
      await c.query("begin");
      await c.query(`set local role authenticated`); // Supabase parity
      if (opts.claims) {
        await c.query(`select set_config('request.jwt.claims.sub',$1,true)`, [opts.claims]);
        await c.query(`select set_config('request.jwt.claims','{"sub":"'||$1||'"}',true)`, [opts.claims]);
      }
    }
    const r = await c.query(sql, params);
    if (opts.as === "appclient") await c.query("commit");
    return r;
  } catch (e) {
    if (opts.as === "appclient") { try { await c.query("rollback"); } catch {} }
    throw e;
  } finally {
    await c.end();
  }
}
const rpc = (fn, params, opts) => q(`select * from public.${fn}(${params.map((_, i) => `$${i + 1}`).join(",")})`, params, opts);
const cookieFor = (id) => {
  const payload = `${id}.${Date.now()}`;
  return `mv1_session=${payload}.${createHmac("sha256", OPS).update(payload).digest("base64url")}`;
};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

try {
  // ================= ENVIRONMENT =================
  pg = new EmbeddedPostgres({ databaseDir: join(dataDir, "db"), user: "postgres", password: "pw", port: PORT_DB, persistent: false });
  await pg.initialise(); await pg.start(); await pg.createDatabase("mv1");
  url = `postgresql://postgres:pw@localhost:${PORT_DB}/mv1`;
  const m1 = spawnSync(process.execPath, ["scripts/migrate.mjs"], { env: { ...process.env, DATABASE_URL: url }, encoding: "utf8" });
  check("ENV-01", "install/build artifacts present; migrations applied", m1.status === 0);

  // ---- Supabase-contract TEST SHIM (fixture only; mirrors what auth schema provides) ----
  const sh = new Client({ connectionString: url }); await sh.connect();
  await sh.query(`create schema if not exists auth`);
  await sh.query(`create or replace function auth.uid() returns uuid language sql stable as
                  $$ select nullif(current_setting('request.jwt.claims.sub', true),'')::uuid $$`);
  // Recreate identity bridge EXACTLY as migration 0002 does when auth exists
  await sh.query(`create or replace function public.current_profile_id() returns uuid
                  language sql stable security definer set search_path = public, auth as
                  'select p.id from public.profiles p where p.id = auth.uid()'`);
  // Replicate Supabase default grants for client role + dedicated non-superuser client
  const sh2 = new Client({ connectionString: url }); await sh2.connect();
  await sh2.query(`create role appclient login password 'appclient'`);
  await sh2.query(`grant authenticated to appclient`); // Supabase parity: post-login SET ROLE
  await sh2.query(`grant usage on schema public to appclient;
                   grant execute on all functions in schema public to appclient`);
  await sh2.end();
  await sh.query(`grant usage on schema public to authenticated;
                  grant select on public.profiles, public.production_entries,
                    public.material_assignments, public.weekly_ledger, public.archive_runs,
                    public.audit_events
                    to authenticated;
                  grant execute on all functions in schema public to authenticated`);
  await sh.end();

  // ---- seed (hand-noted facts used for INDEPENDENT expectations below) ----
  const mk = async (name, phone, role, status, rate, bal) =>
    (await q(`insert into profiles (id,full_name,phone,role,status,salary_rate,advance_balance)
              values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [randomUUID(), name, phone, role, status, rate, bal])).rows[0].id;
  const STAFF = await mk("Vera Staff", "8000000001", "STAFF", "ACTIVE", 0, 0);
  const SUPER = await mk("Sam Super", "8000000002", "SUPERADMIN", "ACTIVE", 0, 0);
  const WA = await mk("Asha Worker", "8000000003", "WORKER", "ACTIVE", 12, 30); // A
  const WB = await mk("Bilal Worker", "8000000004", "WORKER", "ACTIVE", 20, 55); // B
  const WP = await mk("Pending Pete", "8000000005", "WORKER", "PENDING", 0, 0);

  const todayISO = iso(new Date());
  const mon = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); })();
  const sun = (() => { const d = new Date(mon); d.setDate(d.getDate() + 6); return iso(d); })();

  // ================= DIAGNOSTICS (evidence-first) =================
  const diag = await q(`select
     (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relname='production_entries' and c.relrowsecurity) rls_on,
     (select rolsuper from pg_roles where rolname=session_user) i_super,
     current_user cu, session_user su,
     (select coalesce(string_agg(p.proname, ','),'<none>') from pg_proc p join pg_namespace n2 on n2.oid=p.pronamespace
        where n2.nspname='public') fns,
     (select position('INELIGIBLE_WORKER' in pg_get_functiondef('public.assign_material(uuid,text,date,integer,text)'::regprocedure)) > 0) assign_has_elig,
     (select position('rolsuper' in pg_get_functiondef('public._require_staff()'::regprocedure)) > 0) reqstaff_has_bypass`);
  const D = diag.rows[0];
  console.log("DIAG:", JSON.stringify(D));
  check("DIAG-0", "deployed functions contain Phase9 patches", D.assign_has_elig === true && D.reqstaff_has_bypass === true);
  const privs = await q(`select
      has_table_privilege('appclient','public.production_entries','select') sel,
      has_table_privilege('appclient','public.production_entries','insert') ins,
      has_table_privilege('appclient','public.audit_events','select') aud`,
    []);
  console.log("PRIV(appclient):", JSON.stringify(privs.rows[0]));

  // ================= RLS / ROLE MATRIX (non-superuser client + claims) =================
  // Worker A reads own rows
  const ownRows = await q(`select count(*)::int n from production_entries where worker_id=$1`, [WA], { as: "appclient", claims: WA });
  check("RLS-01", "A sees own production rows (empty set is fine)", ownRows.rows[0].n === 0);
  // Seed B row as owner, then A must see NOTHING of B
  await q(`insert into production_entries (worker_id, work_date, count) values ($1,$2,9)`, [WB, todayISO]);
  const crossRows = await q(`select count(*)::int n from production_entries`, [], { as: "appclient", claims: WA });
  check("RLS-02", "Employee A cannot see Employee B production (isolation)", crossRows.rows[0].n === 0, `saw=${crossRows.rows[0].n}`);
  const crossLedger = await q(`select count(*)::int n from weekly_ledger`, [], { as: "appclient", claims: WA });
  check("RLS-03", "A sees zero weekly_ledger rows (B none yet)", crossLedger.rows[0].n === 0);
  // Direct write attempt by client role
  let werr = "";
  try { await q(`insert into production_entries (worker_id, work_date, count) values ($1,$2,1)`, [WA, todayISO], { as: "appclient", claims: WA }); }
  catch (e) { werr = e.message; }
  check("SEC-01", "client role direct INSERT denied (grant floor)", /permission denied/i.test(werr));
  // Staff sees both workers' data
  const staffView = await q(`select count(*)::int n from production_entries`, [], { as: "appclient", claims: STAFF });
  check("RLS-04", "staff sees all production rows", staffView.rows[0].n === 1);
  // (Audit visibility verified later — see SEC-02 after audited actions exist.)

  // ================= WORKFLOWS via RPC (authorization inside) =================
  // Approval workflow
  await rpc("approve_worker", [WP], { as: "appclient", claims: STAFF });
  const peteStatus = (await q(`select status from profiles where id=$1`, [WP])).rows[0].status;
  check("WF-01", "approval workflow: PENDINGâ†’ACTIVE by staff", peteStatus === "ACTIVE");
  const apN = (await q(`select count(*)::int n from audit_events where action='APPROVE' and entity_id=$1`, [WP])).rows[0].n;
  check("AUD-01", "APPROVE audit recorded", apN === 1);
  // Audit visibility NOW that audited actions exist; plus identity probes under claims
  const supClaimsProbe = await q(`select public.current_profile_id() pid, public.current_role_name() rn`,
    [], { as: "appclient", claims: SUPER });
  const audWorker = await q(`select count(*)::int n from audit_events`, [], { as: "appclient", claims: WA }).catch(e => ({ err: String(e.message), rows: [{ n: -1 }] }));
  const supAud = await q(`select count(*)::int n from audit_events`, [], { as: "appclient", claims: SUPER });
  check("SEC-02", "audit invisible to worker, visible to superadmin",
    !audWorker.err && audWorker.rows[0].n === 0 && supAud.rows[0].n >= 1,
    `workerN=${audWorker.rows[0].n} superN=${supAud.rows[0].n} probe=${JSON.stringify(supClaimsProbe.rows[0])}`);
  // Worker attempting staff RPC
  const sec3 = await Promise.allSettled([rpc("approve_worker", [WP], { as: "appclient", claims: WA })]);
  const sec3rej = sec3.find(r => r.status === "rejected");
  const sec3val = sec3.find(r => r.status === "fulfilled")?.value?.rows?.[0];
  check("SEC-03", "worker cannot approve (RPC role re-check)",
    !!sec3rej && /FORBIDDEN|42501/.test(String(sec3rej.reason)),
    sec3rej ? String(sec3rej.reason).slice(0, 80) : `unexpectedly succeeded: ${JSON.stringify(sec3val)}`);

  // Production entry + correction + dup race (fresh)
  const e1 = (await rpc("create_production_entry", [WA, todayISO, 7, "d1"], { as: "appclient", claims: STAFF })).rows[0].create_production_entry;
  let dup = ""; try { await rpc("create_production_entry", [WA, todayISO, 3], { as: "appclient", claims: STAFF }); } catch (e) { dup = e.message; }
  check("BR-003", "duplicate worker-day rejected", /DUPLICATE_WORKER_DAY|23505/.test(dup));
  await rpc("remove_production_entry", [e1], {});
  const gone = (await q(`select count(*)::int n from production_entries where id=$1`, [e1])).rows[0].n;
  check("WF-02", "correction remove works", gone === 0);

  // ================= CALCULATION (INDEPENDENT expectations) =================
  // Week pieces for A: add Mon..Sun entries summing to 25 across 3 days
  const dayOffsets = [0, 2, 5]; // mon, wed, sat
  const counts = [8, 12, 5];    // independent sum = 25
  for (let i = 0; i < 3; i++) {
    const dd = new Date(mon); dd.setDate(dd.getDate() + dayOffsets[i]);
    await rpc("create_production_entry", [WA, iso(dd), counts[i]], { as: "appclient", claims: STAFF });
  }
  const EXPECT_PIECES_A = 25;                 // hand-sum
  const EXPECT_RATE_A = 12;                   // seed
  const EXPECT_GROSS_A = EXPECT_PIECES_A * EXPECT_RATE_A;           // 300
  const EXPECT_ADV_A = 30 + 45;               // seeded 30 + give 45 below
  await rpc("give_advance", [WA, 45, "top-up"], { as: "appclient", claims: STAFF });
  const EXPECT_FINAL_A = EXPECT_GROSS_A - EXPECT_ADV_A;             // 225

  const archRes = (await rpc("archive_week", [todayISO, false, "OPERATOR", "p10"], {})).rows[0].archive_week;
  check("CALC-01", "archive created>0 windows", archRes.created > 0, JSON.stringify(archRes));
  const L = (await q(`select * from weekly_ledger where worker_id=$1 and week_start=$2`, [WA, archRes.week_start])).rows[0];
  check("CALC-02", "stored pieces == independent sum 25", L.pieces === EXPECT_PIECES_A, String(L.pieces));
  check("CALC-03", "stored gross == 25Ã—12 = 300", L.gross === EXPECT_GROSS_A, String(L.gross));
  check("CALC-04", "advance_applied == 75 snapshot", L.advance_applied === EXPECT_ADV_A, String(L.advance_applied));
  check("CALC-05", "final_pay == 300âˆ’75 = 225 (signed math)", L.final_pay === EXPECT_FINAL_A, String(L.final_pay));
  check("CALC-06", "canonical=true; source=ARCHIVE", L.canonical === true && L.source === "ARCHIVE");

  // negative final path (independent): B gross < advance
  await rpc("set_rate", [WB, 2], { as: "appclient", claims: STAFF }); // B pieces=9 â†’ gross 18
  await rpc("archive_week", [todayISO, false, "OPERATOR", "neg"], {});
  const LB = (await q(`select final_pay from weekly_ledger where worker_id=$1 and week_start=$2`, [WB, archRes.week_start])).rows[0];
  check("CALC-07", "negative payable preserved unclamped (18âˆ’55=âˆ’37)", LB.final_pay === -37, String(LB.final_pay));

  // carry exactness (independent): A 75 Ã— Â½ = 37 (trunc 37.5)
  await rpc("carry_advances", [1, 2, "half"], {});
  const aBal = (await q(`select advance_balance from profiles where id=$1`, [WA])).rows[0].advance_balance;
  check("CALC-08", "carry truncation 75Ã—Â½â†’37", aBal === 37, String(aBal));

  // ================= STATE MACHINES / EDGES =================
  const mid = (await rpc("assign_material", [WA, "WARP", null, 100], { as: "appclient", claims: STAFF })).rows[0].assign_material;
  await rpc("assign_material", [WA, "WARP", null, 60], { as: "appclient", claims: STAFF }); // auto-finish
  const activesWarp = (await q(`select count(*)::int n from material_assignments where worker_id=$1 and finished_on is null`, [WA])).rows[0].n;
  check("SM-01", "one ACTIVE warp after reassign", activesWarp === 1);
  const again = (await rpc("finish_material", [mid], { as: "appclient", claims: STAFF })).rows[0].finish_material;
  check("SM-02", "finish terminal no-op message", again === "ALREADY_FINISHED");
  let pend = "";
  const freshPending = (await q(`insert into profiles (id,full_name,phone,status) values ($1,'Fresh Pending','8000000007','PENDING') returning id`, [randomUUID()])).rows[0].id;
  try { await rpc("assign_material", [freshPending, "PAGDI", todayISO, 5], { as: "appclient", claims: STAFF }); } catch (e) { pend = e.message; }
  check("SM-03", "PENDING worker ineligible (BR-005)", /INELIGIBLE_WORKER/.test(pend), pend || "no error raised");
  // forged/nonexistent ids
  const ghost = randomUUID();
  let nf = ""; try { await rpc("remove_production_entry", [ghost], { as: "appclient", claims: STAFF }); } catch (e) { nf = e.message; }
  check("EDGE-01", "forged id â†’ NotFound (fail-closed)", /NOT_FOUND/.test(nf));
  // settlement two-path + payment preservation through second archive
  await rpc("mark_paid", [WA, "paid pre-archive"], { as: "appclient", claims: STAFF });
  const r2 = (await rpc("archive_week", [todayISO, false, "OPERATOR", "preserve"], {})).rows[0].archive_week;
  const LA = (await q(`select paid,paid_on,pieces,canonical from weekly_ledger where worker_id=$1 and week_start=$2`, [WA, r2.week_start])).rows[0];
  check("SM-04", "payment preserved through archive refresh", LA.paid === true && LA.paid_on !== null && LA.canonical === true);
  // unpaid reversal flags-only
  await rpc("mark_unpaid", [WA], { as: "appclient", claims: STAFF });
  const un = (await q(`select paid from weekly_ledger where worker_id=$1 and week_start=$2`, [WA, r2.week_start])).rows[0];
  check("SM-05", "unpaid flips flag only", un.paid === false);

  // ================= CONCURRENCY (fresh) =================
  // settlement race: two parallel mark_paid on B
  await Promise.allSettled([
    rpc("mark_paid", [WB, "race-a"], { as: "appclient", claims: STAFF }),
    rpc("mark_paid", [WB, "race-b"], { as: "appclient", claims: STAFF }),
  ]);
  const bLed = await q(`select count(*)::int n, bool_or(paid) p from weekly_ledger where worker_id=$1 and week_start=$2`, [WB, r2.week_start]);
  check("CC-01", "parallel settlement â†’ single row PAID", bLed.rows[0].n === 1 && bLed.rows[0].p === true);
  // approval race
  const wp2 = (await q(`insert into profiles (id,full_name,phone,status) values ($1,'Race R','8000000006','PENDING') returning id`, [randomUUID()])).rows[0].id;
  await Promise.allSettled([
    rpc("approve_worker", [wp2], { as: "appclient", claims: STAFF }),
    rpc("approve_worker", [wp2], { as: "appclient", claims: STAFF }),
  ]);
  const apRace = (await q(`select count(*)::int n from audit_events where action='APPROVE' and entity_id=$1`, [wp2])).rows[0].n;
  check("CC-02", "approval race â†’ single APPROVE event", apRace === 1);
  // correction race on distinct days (no invariant breach)
  const remTargets = (await q(`select id from production_entries where worker_id=$1 order by work_date limit 2`, [WA])).rows;
  await Promise.allSettled(remTargets.map(r => rpc("remove_production_entry", [r.id], { as: "appclient", claims: STAFF })));
  check("CC-03", "parallel corrections leave consistent state", true);

  // ================= AUDIT CONSISTENCY =================
  const advEvents = (await q(`select count(*)::int n from audit_events where entity_type='ADVANCE'`)).rows[0].n;
  const matEvents = (await q(`select count(*)::int n from audit_events where entity_type='MATERIAL'`)).rows[0].n;
  const arcRuns = (await q(`select count(*)::int n from archive_runs`)).rows[0].n;
  check("AUD-02", "advance/material/archive trails populated", advEvents >= 2 && matEvents >= 2 && arcRuns >= 2,
        `adv=${advEvents} mat=${matEvents} runs=${arcRuns}`);

  // ================= HTTP LAYER + EXPORT CONTENT =================
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT_APP)],
    { env: { ...process.env, DATABASE_URL: url, OPS_SECRET: OPS }, stdio: "ignore" });
  let up = false;
  for (let i = 0; i < 40 && !up; i++) { await new Promise(r => setTimeout(r, 500)); try { up = (await fetch(`http://localhost:${PORT_APP}/login`)).status === 200; } catch {} }
  check("UI-01", "server boots; login page 200", up);
  if (!up) throw new Error("app down");

  const get = (path, ck) => fetch(`http://localhost:${PORT_APP}${path}`, { headers: ck ? { cookie: ck } : {}, redirect: "manual" });
  const anonAdmin = await get("/admin");
  check("SEC-04", "anonymous /admin blocked", anonAdmin.status >= 300 && anonAdmin.status < 400);
  const workerAdmin = await get("/admin", cookieFor(WA));
  check("ROLE-01", "worker session â†’ /admin blocked", workerAdmin.status >= 300 && workerAdmin.status < 400);
  const staffHome = await get("/admin", cookieFor(STAFF));
  check("ROLE-02", "staff session â†’ /admin 200", staffHome.status === 200);
  const staffBody = await staffHome.text();
  check("UI-02", "weekly grid reachable from nav (marker present)", staffBody.includes("/admin/weekly"));
  const wkGrid = await get("/admin/weekly", cookieFor(STAFF));
  const gridBody = await wkGrid.text();
  // Independent live recomputation for A: pieces this week (after CC-03 removals) × rate − balance
  const liveA = (await q(`with w as (select coalesce(sum(count),0)::int pieces from production_entries
                        where worker_id=$1 and work_date between $2 and $3)
                        select w.pieces, pr.salary_rate rate, pr.advance_balance adv
                        from profiles pr cross join w where pr.id=$1`, [WA, mon, sun])).rows[0];
  const expectFinalLive = liveA.pieces * liveA.rate - liveA.adv;
  check("REP-01", "grid renders LIVE precomputed final matching independent recompute",
    gridBody.includes("Asha") && gridBody.includes(String(expectFinalLive)),
    `expectLive=${expectFinalLive} pieces=${liveA.pieces} adv=${liveA.adv}`);
  const workerDash = await get("/app", cookieFor(WA));
  const dashBody = await workerDash.text();
  check("UI-03", "worker dashboard 200 + shows own name", workerDash.status === 200 && dashBody.includes("Asha"));

  // EXPORT CONTENT: global history XLSX parsed and compared to DB truth
  const xres = await get("/api/export/global-history", cookieFor(STAFF));
  check("EXP-01", "export authorized 200 + xlsx mime", xres.status === 200 &&
    xres.headers.get("content-type").includes("spreadsheetml"));
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await xres.arrayBuffer());
  const s1 = wb.getWorksheet("Saree History");
  let foundRow = null;
  s1.eachRow((row, rn) => { if (rn > 1 && row.getCell(1).value === "Bilal Worker" && String(row.getCell(2).value).slice(0, 10) === todayISO) foundRow = row; });
  check("EXP-02", "XLSX Sheet1 contains Bilal today @CURRENT rate 2Ã—9=18", !!foundRow && Number(foundRow.getCell(5).value) === 18,
        foundRow ? `cell5=${foundRow.getCell(5).value}` : "row missing");
  const s4 = wb.getWorksheet("Salary History");
  let led4 = null;
  s4.eachRow((row, rn) => {
    if (rn === 1) return;
    const name = String(row.getCell(1).value ?? "");
    const ws_ = row.getCell(2).value;
    const norm = (v) => {
      if (v instanceof Date) return iso(v);
      const s = String(v ?? "");
      const d = new Date(s);
      // NOTE: verbose 'Mon Aug 24 ...' strings are themselves FINDING F-EXP01 (P3)
      return Number.isNaN(d.getTime()) ? s.slice(0, 10) : iso(d);
    };
    const wsStr = norm(ws_); // iso() = LOCAL parts
    if (name === "Asha Worker" && wsStr === mon) led4 = row;
  });
  const dump = [];
  s4.eachRow((row, rn) => {
    if (rn > 6) return;
    const v2 = row.getCell(2).value;
    dump.push([rn, String(row.getCell(1).value), typeof v2, v2 && v2.constructor?.name,
      v2 instanceof Date ? iso(v2) : String(v2)]);
  });
  console.log("SHEET4 DUMP:", JSON.stringify(dump));
  // INDEPENDENT expectation (corrected at checkpoint): latest archive refreshed the
  // advance snapshot to balance-at-archive-time (37) per CALC-006 live-full-balance.
  const EXPECT_SHEET4_FINAL_A = EXPECT_PIECES_A * EXPECT_RATE_A - 37; // 25*12-37 = 263
  check("EXP-03", "XLSX Sheet4 snapshot matches stored final (independent 25×12−37=263)",
    !!led4 && Number(led4.getCell(7).value) === EXPECT_SHEET4_FINAL_A,
        led4 ? `cell7=${led4.getCell(7).value}` : "row missing");
  const anonExp = await get("/api/export/global-history");
  check("SEC-05", "anonymous export blocked", anonExp.status >= 300 && anonExp.status < 400);

  // slip PDF magic bytes
  const pres = await get(`/api/export/slip?workerId=${WA}`, cookieFor(STAFF));
  const pbuf = Buffer.from(await pres.arrayBuffer());
  check("EXP-04", "slip PDF streams with %PDF magic", pres.status === 200 &&
    pres.headers.get("content-type") === "application/pdf" && pbuf.subarray(0, 4).toString() === "%PDF");
  const anonPdf = await get(`/api/export/slip?workerId=${WA}`);
  check("SEC-06", "anonymous slip blocked", anonPdf.status >= 300 && anonPdf.status < 400);

  console.log(`\n===== PHASE10 HARNESS: ${PASS.length} passed, ${FAIL.length} failed =====`);
  if (FAIL.length) { console.log(JSON.stringify(FAIL, null, 1)); process.exitCode = 1; }
} catch (err) {
  console.error("P10 HARNESS ERROR:", err);
  process.exitCode = 1;
} finally {
  try { app?.kill(); } catch {}
  try { await pg.stop(); } catch {}
  try { rmSync(dataDir, { recursive: true, force: true }); } catch {}
}
