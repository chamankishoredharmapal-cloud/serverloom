# Phase 5 — Consolidated Risk Register

Owner for all items: project owner / next integration phase (unless noted). Status reflects post-Phase-5 reconciliation.

| ID | Domain | Finding | Evidence | Priority | Action | Status |
| -- | ------ | ------- | -------- | -------- | ------ | ------ |
| R-01 | Security/Infra | No TLS/session hardening: HSTS 0, no SSL_REDIRECT, SESSION/CSRF_COOKIE_SECURE unset, no SECURE_PROXY_SSL_HEADER | Django defaults verified (`global_settings.py`); settings.py untouched | **P2** | REQUIRES FIX at deploy configuration time (env/proxy), before public rollout | OPEN (non-blocking for isolated integration work) |
| R-02 | Operations | No scheduler runs weekly archive/carry; weeks stay open forever without an operator; double-fired carry f≠1 compounds balances | Phase 2/4 finding, still true in current repo | **P2** | HUMAN ACTION — define operating procedure/scheduler policy before real use | OPEN (non-blocking for integration design) |
| R-03 | Infrastructure | PostgreSQL production behavior (locking/migrations) never executed | No PG environment available | P2 | NOT VERIFIED — verify on deploy target pre-go-live | OPEN |
| R-04 | Infrastructure | Real deploy stack (Render/gunicorn/Docker build) never built/run | Static review only | P3 | NOT VERIFIED — smoke-test at deploy | OPEN |
| R-05 | Infrastructure | Python 3.11 target interpreter untested locally | Only 3.13 available | P3 | NOT VERIFIED — covered by Docker build test | OPEN |
| R-06 | Engineering | Weekly-salary formula duplicated inline across ≥5 views vs service function | views.py:119/315/607/675/739 vs services.py:106 | P3 | ACCEPTABLE RISK — mandate service reuse during M-V1 work | OPEN (discipline) |
| R-07 | Auditability | Approve / rate-change / mark-paid flips / saree deletion leave no audit trail | services/views inspection; Phase 3 finding persists | P3 | ACCEPTABLE RISK — recommend extending audit model when M-V1 touches these flows | OPEN |
| R-08 | Concurrency | SQLite same-row write contention can surface lock-timeout 500s under artificial parallelism | server5 log `database is locked`; atomic rollbacks proven | P3 | ACCEPTABLE RISK (PG target); document ops guidance | OPEN |
| R-09 | Security | Dependency CVE triage not performed | pins reviewed but not scanned | P3 | REQUIRES FIX (run pip-audit) pre-production | OPEN |
| R-10 | Engineering | Dead divergent `SignupForm` (unused, misleading fields) | accounts/forms.py; zero references | P4 | DOCUMENTATION ONLY / optional cleanup | OPEN |
| R-11 | Admin/Forensics | `WarpChangeHistory` not registered in Django admin while sibling audits are | core/admin.py registrations | P4 | DOCUMENTATION ONLY | OPEN |
| R-12 | Data model | Vestigial `current_week_salary` retained (documented deprecated) | models.py comment; zeroed by archive | P4 | ACCEPTED RISK | CLOSED (decision) |
| R-13 | Templates | Cosmetic debt: mojibake glyphs, dual Tailwind CDN loads, orphaned files (BUG-23) | template inspection | P4 | DOCUMENTATION ONLY | OPEN |
| R-14 | UX/Features | Employee self-finish of pagdi has POST branch but no form; pagdi lacks explicit admin finish button (warp has one) | pagdi.html unchanged; views.pagdi_view POST branch | P4 | DOCUMENTATION ONLY (design gap, not regression) | OPEN |
| R-15 | Reporting | Exports price historical saree rows at CURRENT rate (business rule) | Phase 3 rule re-confirmed in export code | P4 | DOCUMENTATION ONLY — preserve rule in integration | OPEN |
| R-16 | Reporting | PDF slip inner text values never parsed | no extractor available any phase | P4 | NOT VERIFIED (stream validity proven) | OPEN |

## Counts

- **P0: 0**
- **P1: 0**
- **P2: 3** (R-01 TLS hardening, R-02 scheduler policy, R-03 PG verification)
- P3: 6 · P4: 7

All P2 items are pre-production/human-action gates. None blocks beginning Management-V1 integration work in isolated environments.
