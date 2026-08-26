# 11_DATABASE_REQUIREMENTS.md

Primary authority: Phase 8. Current MV1 database already conforms; required modifications for the FINAL system:

| Object | Class | Requirement |
| ------ | ----- | ----------- |
| All tables/constraints/indexes of FINAL_SCHEMA | EXISTING (implemented 0001) | maintain verbatim; no weakening |
| RLS policies + grant floor | EXISTING (0002) | keep; add policy test-suite to CI at provider wiring |
| Authoritative RPCs (13 functions) | EXISTING (0003) | F-RACE01 fix: `approve_worker` becomes conditional UPDATE ... WHERE status<>'ACTIVE' + emit-on-rowcount (P3, pre-cutover) |
| app_credentials bridge | REMOVE at production cutover | replaced by Supabase Auth |
| auth schema linkage blocks | EXISTING-CONDITIONAL | activate automatically on Supabase (already coded) |
| entry-rate snapshot column | NEW **only if** D-08=ENTRY_RATE chosen | documented seam, not applied |
| carry_executions guard table | NEW **only if** D-04 automates carry | hook reserved |
| Notifications tables | NOT APPLICABLE until D-09 | — |

Migration policy: versioned SQL files, staging-first, never auto-applied to prod; `_migrations` bookkeeping retained.

Transaction/RPC requirements: every mutation through security-definer functions with pinned search_path; locks/upserts/advisory keys exactly per TRANSACTION_CONCURRENCY doc (unchanged). Deletion policy: RESTRICT defaults; status-based offboarding; D-13 gate untouched.

NO MIGRATION REQUIRED from external data (Phase 11 proof); only forward schema evolution applies.
