# PERMISSION_GAPS.md (Phase 6.6)

Permission/authorization gaps and observations in the external application. Classification separates OBSERVED BEHAVIOR from MANAGEMENT-V1 RECOMMENDATION. None of these were silently "fixed" or upgraded.

## Gaps

| # | Gap | Class | Evidence | Impact | M-V1 Recommendation |
| - | --- | ----- | -------- | ------ | ------------------- |
| PG-01 | Staff ≡ Admin: any `is_staff` user wields the ENTIRE operator surface (money, materials, exports). No granular roles. | OBSERVED DESIGN | V:27-31 single `_is_staff` predicate; zero Groups/Permissions usage | acceptable for single-workshop scale; no least-privilege | Introduce role granularity ONLY if business requires; otherwise document trust model |
| PG-02 | Permission-relevant events are UNAUDITED: approvals, rate changes, payment flips leave no trail of WHO did WHAT. | GAP (requirement AUD63-006..008 already raised) | Phase 4 §16 audit table | disputes unverifiable | Audit all authorization-gated mutations |
| PG-03 | No login throttling / brute-force protection. | OBSERVED ABSENCE | framework defaults only | credential stuffing feasible | add throttle/backoff (D-10 scope) |
| PG-04 | No password strength validators configured. | OBSERVED ABSENCE | settings.py has no AUTH_PASSWORD_VALIDATORS | weak credentials possible | add minimum policy (D-10) |
| PG-05 | Session/TLS cookie hardening unset (SESSION_COOKIE_SECURE, CSRF_COOKIE_SECURE, HSTS, SSL redirect). | OBSERVED ABSENCE — deploy-time config | R-01 risk register | session exposure over plain HTTP if deployed without proxy hardening | mandatory pre-rollout env hardening (OPS63-010) |
| PG-06 | Dual approval code paths (dedicated endpoint + inert detail branch) — one transition, two server-live entries; both unaudited. | IMPLEMENTATION DEBT | V:796-810 vs V:342-346 | maintenance/confusion risk | collapse to one audited path |
| PG-07 | WarpChangeHistory not registered in /admin/ — audit read-surface inconsistency. | INCONSISTENCY | core/admin.py registrations vs model set | forensic visibility gap for warp events | register + first-class audit UI (AUD63-009) |
| PG-08 | Employee self-finish pagdi POST branch is server-live but UI-unreachable — a permission surface nobody can legitimately trigger (yet an authenticated employee COULD craft it). **Final-session probe: CONFIRMED REAL — crafted POST finished the employee's own ACTIVE pagdi and wrote a FINISH audit row.** | INERT-BUT-LIVE SURFACE → RUNTIME-VERIFIED MARGINAL CAPABILITY | V:171-174; template grep zero posters; KT-05 probe this session | an employee CAN finish own pagdi via crafted POST — contradicts "employees read-only" posture at the margin | remove or formalize as intended capability (D-05 adjacent) |
| PG-09 | CLI executorship unauthenticated at app layer (shell trust). | OBSERVED DESIGN | commands have no HTTP route | anyone with shell = full operator | keep shell-trust model; log operator identity externally |
| PG-10 | Out-of-app super-admin can perform unaudited reversals (unapprove, reopen material by nulling end_date, cascade-delete workers destroying ledger history). | OUT-OF-APP BOUNDARY | Django admin capabilities; SalaryHistory FK CASCADE (M:174) | silent history destruction possible | restrict/audit these operations in M-V1 |
| PG-11 | Failure-mode inconsistency on forged ids: give/clear advance raise uncaught `Employee.DoesNotExist` → HTTP 500 (zero mutation), while sibling action routes return clean 404 via `get_object_or_404`. Runtime-reproven final session (KT-06). Legacy tag OBS-SM-01. | BUG-CLASS LOW (consistency only) | V:650/V:662 → S:54/S:78 `.get()` without 404 wrapper; FG-PROBE server ISE logs | ugly 500s for operators; no data risk | Management-V1: uniform 404 on all staff action routes |

## Explicitly NOT gaps (verified sound)

Role gating on every route (decorator coverage complete) · object isolation structural for employees · CSRF global · POST-only mutations · forged-id fail-closed · fail-fast secrets · env-driven hosts · ORM-only data access.
