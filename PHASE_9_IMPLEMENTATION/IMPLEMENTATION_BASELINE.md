# IMPLEMENTATION_BASELINE.md (Phase 9.0)

## Starting state (recorded before any implementation)

Management-V1 did **not exist** as a repository (verified across Phases 7–8; three discovery sweeps). Per the Phase 7 architecture authority (ADR-001 primary option) and Phase 8 platform decision, Phase 9 therefore **created** Management-V1 at:

```
C:\Users\siddh\Downloads\serverloom-main\management-v1\
```

## Baseline facts (this build)

| Item | Value |
| ---- | ----- |
| Stack | Next.js 15 (App Router) + TypeScript strict + React 19 |
| Database access | `pg` Pool over `DATABASE_URL` (Supabase-compatible) + security-definer SQL RPCs |
| Validation | Zod schemas shared by actions/services (`src/lib/domain/validation.ts`) |
| Exports | exceljs (XLSX), pdf-lib (PDF), streamed, staff-gated |
| Tests | vitest (unit) + embedded-postgres harnesses (DB integration/concurrency + HTTP smoke) |
| Auth | Local-mode bridge now; Supabase Auth is the production target (see AUTHORIZATION_IMPLEMENTATION) |
| Git | Fresh repo; checkpoints PHASE9-FOUNDATION → DATABASE → CORE → WORKFLOWS → SECURITY |

## Rollback points

Every stage committed with reviewable diffs:
`5fc43b5 FOUNDATION · 7cc58e9 DATABASE · e2d443a CORE · 17a6ad2 WORKFLOWS · 269e3af SECURITY`

Production: never touched (no deploy, no DNS, no external project created). All runtime verification ran on disposable embedded PostgreSQL 18.4 clusters under `%TEMP%`, deleted after each run.
