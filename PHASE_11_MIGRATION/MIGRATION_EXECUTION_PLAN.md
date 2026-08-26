# MIGRATION_EXECUTION_PLAN.md (Phase 11.10) — GREENFIELD DEPLOYMENT RUNBOOK

Data-migration sequence: NOT APPLICABLE. This is the equivalent execution plan for bringing Management-V1 live from zero.

## Runbook

| # | Step | Gate |
| - | ---- | ---- |
| 1 | Create Supabase **non-production** project; run `npm run db:migrate` against it | migrations apply clean ×2 |
| 2 | Provider verification runbook (PROVIDER_VERIFICATION in FINAL_INTEGRATION_REPORT §9): signup/login/JWT/claims/profile link/RLS A-vs-B isolation/staff+admin paths/logout/expiry/password+throttle policy | all PASS, evidenced |
| 3 | Fix-or-accept F-RACE01 + F-EXP01 (human sign-off recorded) | sign-off artifact exists |
| 4 | Create production Supabase project; PITR enabled; run migrations; create first SUPERADMIN via invite + audited promotion | boot checks pass |
| 5 | Configure host (Vercel env trio per project; TLS/HSTS at edge) | headers verified |
| 6 | Enable L1 daily backups + schedule L3 dumps; execute FIRST restore drill into shadow project | drill evidence recorded |
| 7 | Business smoke: enter one real worker + entries; verify grid/dashboard/ledger/export | acceptance rows signed |
| 8 | Flip primary: point DNS/domain at MV1; external app stays archived read-only | cutover note |

Steps 2–6 are HUMAN-EXECUTED with credentials the operator controls; nothing in this phase performs them.
