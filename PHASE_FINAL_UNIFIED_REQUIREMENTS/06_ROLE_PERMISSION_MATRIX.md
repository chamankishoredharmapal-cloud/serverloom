# 06_ROLE_PERMISSION_MATRIX.md

FINAL roles — derived from actual responsibilities, nothing invented: **WORKER · STAFF (operator) · SUPERADMIN** (+ System/CLI executor; anonymous). Granular manager roles (salary-manager etc.) are NOT created — Phase 6 shows a single-workshop flat model; if the business later wants granularity it is an additive `profiles.role` enum + policy change (**HUMAN DECISION REQUIRED**, default stays flat).

| Capability | Anonymous | WORKER | STAFF | SUPERADMIN | System/CLI |
| ---------- | --------- | ------ | ----- | ---------- | ---------- |
| Register | ALLOW | n/a | n/a | n/a | n/a |
| Login (status=ACTIVE gate) | CONDITIONAL ★ | self session | self session | self session | n/a |
| View own dashboard/history/ledger/progress | DENY | OWN-ONLY ★ | n/a (no worker profile) | n/a | n/a |
| Mutate own payroll/material data | DENY | DENY ★ | — | — | — |
| View all workers/data | DENY | DENY ★ | ALLOW | ALLOW | — |
| Approve / lifecycle / rate | DENY | DENY ★ | ALLOW ★ | ALLOW | — |
| Production create/delete | DENY | DENY ★ | ALLOW ★ | ALLOW | — |
| Material assign/finish | DENY | DENY ★ | ALLOW ★ | ALLOW | — |
| Advance give/clear | DENY | DENY ★ | ALLOW ★ | ALLOW | — |
| Carry command | no route | no route | via ops secret/console | same | EXECUTOR |
| Settlement paid/unpaid | DENY ★ | DENY ★ | ALLOW ★ | ALLOW | — |
| Weekly archive | no route | no route | console ★ / cron(secret) | console | EXECUTOR |
| Exports XLSX/PDF | redirect ★ | DENY ★ | ALLOW ★ | ALLOW | — |
| Audit trail read | DENY | DENY (invisible) ★ | policy-hidden | ALLOW ★ | append-only write path |

Record-level access: WORKER rows filtered by `auth.uid()` at RLS; STAFF/SUPERADMIN global by design. Field-level: none required today (phone visible to staff only already implicit via staff-gated pages). Enforcement: route guard → service assert → RLS/RPC re-check (server/database-side; UI hiding never authoritative).

Every DENY cell above is backed by a Phase 10 runtime probe or grant-level proof.
