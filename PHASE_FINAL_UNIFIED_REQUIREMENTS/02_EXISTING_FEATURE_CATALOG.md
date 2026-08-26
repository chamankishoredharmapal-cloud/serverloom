# 02_EXISTING_FEATURE_CATALOG.md

Every feature currently in Management-V1 (verified Phase 10). Classification for the unified system.

| # | Feature | Where | Roles | Status | Decision |
| - | ------- | ----- | ----- | ------ | -------- |
| E1 | Self-registration → PENDING | /signup + AuthService | anon | working | EXISTING — KEEP |
| E2 | Approval-gated role-routed login | /login + gate | all | working (local-mode) | EXISTING — EXTEND (Supabase Auth wiring) |
| E3 | Logout | nav action | authed | working | KEEP |
| E4 | Worker approval | /admin/workers | staff+ | POST-only RPC | KEEP |
| E5 | Lifecycle states (INACTIVE/SUSPENDED) | setStatus RPC | staff+ | backend-ready, no UI control yet | EXISTING — MODIFY (add UI select; D-01 values) |
| E6 | Rate setting | worker detail | staff+ | audited RPC | KEEP |
| E7 | Worker dashboard (CALC-002 live) | /app | worker | precomputed | KEEP |
| E8..E11 | Own production/pagdi/warp/history/salary pages | /app/* | worker OWN-ONLY via RLS | RLS-proven | KEEP |
| E12 | Admin stats home | /admin | staff+ | counts | KEEP |
| E13 | Workers list + `q` search | /admin/workers | staff+ | sole filter | KEEP |
| E14 | Worker detail console (rate/entries/advance trail/lifecycle) | /admin/workers/[id] | staff+ | ✓ | KEEP |
| E15/E16 | Production entry create/delete (correction model) | detail forms | staff+ | dup-safe, audited | KEEP |
| E17..E20 | Pagdi/Warp assign/list/finish (+progress CALC-003/004) | /admin/materials/* | staff+ | one-ACTIVE DB-enforced | KEEP |
| E21 | Weekly grid (live payroll) | /admin/weekly | staff+ | CALC-002/009 | KEEP |
| E22/23 | Give/Clear advance | grid actions | staff+ | audited incl. no-ops | KEEP |
| E24/25 | Mark paid/unpaid (two-path) | grid actions | staff+ | authority split proven | KEEP |
| E26 | Slip PDF | /api/export/slip | staff+ | streamed | EXISTING — MODIFY (F-EXP01-class formatting; content per D-11) |
| E27/28 | Global & weekly XLSX exports | /api/export/* | staff+ | 4-sheet mixed authority | EXISTING — MODIFY (date format fix F-EXP01; pricing strategy seam D-08) |
| E29 | Salary ledger table | /admin/ledger | staff+ | snapshot view | KEEP |
| E30 | Weekly archive (+dry-run) + run records | console + ops API | operator/system | idempotent | KEEP |
| E31 | Carry command | ops API | operator/system | exact truncation; D-04 guard hook | KEEP |
| E32 | Audit viewer | /admin/audit | superadmin | filterable trail | KEEP |
| E33 | Dev-auth bridge | app_credentials table | dev only | non-production | EXISTING — REMOVE at production cutover (replaced by Supabase Auth) |

Limitations carried: no granular manager roles (flat staff), no notifications, no pagination (scale N/A). None removed.
