# ROLE_PERMISSION_MATRIX.md (Phase 6.6)

Single consolidated permission matrix. Values: ALLOW / DENY / OWN-ONLY / CONDITIONAL / N-A. ★ = verified by probe or test. Derived from `06_ROLE_PERMISSION_SPECIFICATION.md` (authority document) — this file is the lookup table.

| Capability | Anonymous | Employee | Staff/Admin | Superuser | System/CLI |
| ---------- | --------- | -------- | ----------- | --------- | ---------- |
| Self-register (create PENDING account) | ALLOW ★ | n/a | n/a | n/a | n/a |
| Login (role-routed) | CONDITIONAL: valid creds + approved employee OR staff flag ★ | ALLOW | ALLOW | ALLOW | n/a |
| Logout | ALLOW(authed) | ALLOW | ALLOW | ALLOW | n/a |
| View own dashboard | DENY ★ | OWN-ONLY ★ | n/a | n/a | n/a |
| View own production history | DENY ★ | OWN-ONLY ★ | n/a | n/a | n/a |
| View own pagdi progress/history | DENY ★ | OWN-ONLY ★ | n/a | n/a | n/a |
| View own warp progress/history | DENY ★ | OWN-ONLY ★ | n/a | n/a | n/a |
| View own combined history | DENY ★ | OWN-ONLY ★ | n/a | n/a | n/a |
| View own salary ledger | DENY ★ | OWN-ONLY ★ | n/a | n/a | n/a |
| Mutate ANY own data (entries/rate/pay) | DENY ★ | DENY ★ — ONE proven exception: crafted POST to own pagdi page finishes own assignment (PG-08, RUNTIME-VERIFIED KT-05) | — | — | — |
| View admin stats | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| List/search employees | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| Open worker detail console | DENY ★ | DENY ★ | ALLOW (any worker) | ALLOW | — |
| Approve worker (TR-EMP-001) | DENY ★ | DENY ★ | ALLOW ★ | ALLOW | — |
| Set/change rate | DENY ★ | DENY ★ | ALLOW ★ | ALLOW | — |
| Create production entry | DENY ★ | DENY ★ | ALLOW ★ | ALLOW | — |
| Delete production entry | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| Assign Pagdi / list | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| Assign Warp / list / explicit finish | DENY ★ | DENY ★ | ALLOW ★ | ALLOW | — |
| View weekly salary grid | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| Give advance | DENY ★(400) | DENY ★ | ALLOW ★ | ALLOW | — |
| Clear advance | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| Mark paid / unpaid | DENY ★ | DENY ★ | ALLOW ★ | ALLOW | — |
| Salary slip PDF (any worker) | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| Global history XLSX export | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| Weekly salary XLSX export | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| Salary ledger table (all workers) | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| Weekly archive command | DENY (no route) | DENY | via shell only | via shell | EXECUTOR ★ |
| Carry command | DENY (CLI-only) | DENY | via shell | via shell | EXECUTOR |
| Access another worker's data as Employee | DENY (structurally impossible — no id-bearing routes) ★ | DENY | ALLOW (by design: global operator) | ALLOW | — |
| Django /admin/ model CRUD + audit reads | DENY | DENY | CONDITIONAL (needs per-model perms) | ALLOW | — |
| Out-of-app lifecycle surgery (unapprove, reopen material, delete worker) | DENY | DENY | DENY (no app path) | ALLOW (unaudited) | — |
| Health root `/` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |

Object-scope summary: Employees = OWN-ONLY by construction; Staff = GLOBAL operators; CLI = bulk executor; Superadmin-oob = unrestricted including unaudited reversals.
