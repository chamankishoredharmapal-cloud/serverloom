# TECHNOLOGY_DECISIONS.md (Phase 7.9)

Evaluations against CURRENT (unconfirmed — no MV1 repo found; "current" = presumed program stack) with KEEP/CHANGE outcomes. No change recommended for novelty's sake.

| # | Decision area | Current/presumed | Alternatives considered | Verdict | Rationale (cost/complexity/security/perf/maintainability/risk) |
| - | ------------- | ---------------- | ----------------------- | ------- | ------------------------------------------------------------- |
| TD-1 | Frontend framework | Next.js + React + TS | Remix/SPA+API | **KEEP** (primary option) | server components fit precomputed-values mandate; ecosystem maturity; lowest migration cost given presumed base |
| TD-2 | Database platform | Supabase Postgres | self-hosted PG / SQLite / Mongo | **KEEP Postgres; REJECT SQLite/Mongo** | requirements demand constraints, partial unique index, RLS, RPC transactions, PITR — Postgres-native; SQLite dev-only heritage of external app explicitly not a target |
| TD-3 | Business-logic location | Server layer services + SQL RPCs | client-side logic / pure DB triggers | **KEEP server-layer authority** | client-side violates isolation/idempotency; trigger-only scatters rules; hybrid: invariants in DB, workflows in services |
| TD-4 | Authorization mechanism | RLS + claims + service asserts | app-only checks | **KEEP layered** | defense-in-depth required by Phase 6 SEC series; RLS alone too rigid for workflow authz; app-only too weak |
| TD-5 | REST vs RPC shape | typed server actions + few route handlers + SQL RPCs for tx | full REST API | **KEEP hybrid** | actions minimize surface; RPCs give atomic multi-table ops with real transactions |
| TD-6 | Validation library | Zod shared schemas | class-validator/manual | **KEEP Zod** | single schema reused UI+service; maps to domain error taxonomy |
| TD-7 | Background/scheduled jobs | Vercel Cron → protected endpoint | external scheduler/pg_cron/self worker | **KEEP Vercel Cron for archive cadence candidate**; pg_cron OPTION if DB-side preferred | simplest ops; guard table still mandatory for carry (D-04) |
| TD-8 | Export generation | server-side openpyxl-class lib equivalent (exceljs) + reportlab-class (pdf lib) in server runtime; stream response | client generation / third-party SaaS | **KEEP server generation** | cell-exact contracts + staff-gating + no-persist rule from Phase 6 REP specs; SaaS adds data-exposure risk |
| TD-9 | Storage | Supabase Storage private bucket (optional v1 stream-only) | S3 | **OPTIONAL — stream-only default** | avoids storage dependency until artifacts need retention |
| TD-10 | Caching layer | none | Redis/CDN caching of aggregates | **REJECT for now** | weekly-domain reads are cheap at target scale; premature complexity |
| TD-11 | Auth provider | Supabase Auth | NextAuth/Cognito | **KEEP Supabase Auth** | native JWT→RLS integration; phone-login future option aligns with phone-identity domain |
| TD-12 | Money representation | integers (₹ whole units) end-to-end; exact-truncation helper for carry | floats/Decimal everywhere | **KEEP integer policy** | matches C64 semantics; Decimal only inside carry helper internals if needed — observable behavior identical |
| TD-13 | Testing stack | Vitest/Jest unit + Playwright e2e + pg test harness for RPC parity | none/manual | **ADOPT** (obligation from CALC-009/edge matrix) | parity suite is a Phase 6 contract obligation |

Every CHANGE verdict above is relative to the EXTERNAL app's technology, never adopted merely for novelty; every KEEP verdict assumes repo confirmation will not reveal a conflicting existing investment.
