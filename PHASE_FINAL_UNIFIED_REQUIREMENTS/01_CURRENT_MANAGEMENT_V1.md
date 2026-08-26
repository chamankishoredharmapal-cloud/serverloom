# 01_CURRENT_MANAGEMENT_V1.md

Inspected: `management-v1/` @ HEAD `269e3af` (+1 uncommitted verification harness `scripts/verify-phase10.mjs`, to be committed under PHASE9-VERIFIED or removed). Next.js **15.5.24**, React 19, TypeScript strict, npm.

## Actual inventory

| Layer | Contents |
| ----- | -------- |
| Pages (16 routes) | `/login`,`/signup` · worker `/app{,/production,/pagdi,/warp,/history,/salary}` via `/app/[type]` · admin `/admin{,/workers,/workers/[id],/weekly,/materials/[type],/ledger,/audit}` |
| API | `/api/ops/[op]` (archive,carry — OPS_SECRET) · `/api/export/[kind]` (global-history, weekly-salary, slip) |
| Services (10) | auth, worker, production, payroll(CALC-002 owner), advance, settlement, material(CALC-003/004), archive(CALC-007 trigger), audit-read, report/export |
| Domain core | week.ts (CALC-001), money.ts (CALC-002 primitives + exact CALC-005 truncation), errors.ts taxonomy, validation.ts (Zod VAL contracts) |
| Data | pg Pool → SQL; migrations 0001 schema/indexes · 0002 RLS/grants · 0003 authoritative RPCs · 0004 dev-auth bridge (non-prod) |
| Tests | vitest units (20) · verify-db.mjs (32) · smoke-http.mjs (8) · verify-phase10.mjs (44) |
| Deploy config | .env.example contract (DATABASE_URL, OPS_SECRET, SUPABASE trio); Vercel-ready; no CI files yet |

## Authentication status

Local-mode bridge active (scrypt + HMAC cookie) for development; **Supabase Auth seam prepared** (conditional migration blocks activate automatically when `auth` schema exists; env vars reserved). Production path = wire Supabase Auth (see 12_SECURITY_REQUIREMENTS).

## Known deltas vs final form

Supabase Auth not wired · F-RACE01/F-EXP01 unfixed · no Playwright E2E · no CI pipeline files · harness script uncommitted. Everything else matches the Phase 10 verified state exactly (no drift: git history is linear from FOUNDATION→SECURITY).
