# Phase 5 — Cross-Expert Reconciliation Report

Method: every prior PASS/FAIL and every new probe result was treated as claim-only. Conflicts were re-tested where possible (bounded: ≤3 attempts/item) and resolved strictly by evidence authority: runtime > repository > database/config > automated tests > documentation > assumption. Nothing was averaged.

## Contradiction Table

| ID | Claim A | Claim B | Evidence | Retest | Final Determination |
| -- | ------- | ------- | -------- | ------ | ------------------- |
| C-01 | Probe run #1: employee reached panel pages with status 200 (authorization FAIL) | Unit test `test_employee_cannot_set_own_rate` + Phase 4 runtime say employees are bounced | Instrumented raw-status retest (no redirect-following) showed **302** bounces; original probe followed redirects to login page and misread final 200; login itself had silently failed in that harness run | YES (attempt 2/3) | **Authorization HOLDS** (runtime authority). Harness artifact |
| C-02 | Retest: employee POST to staff mutation returned 403, expectation said 302 | Phase 4 documented 302 bounce for GET | CSRF middleware rejects token-less POST before auth check → 403; GET bounces 302 | static + runtime | **BLOCKED either way** — control stronger than expected path |
| C-03 | Substring probe suggested Alpha's page "leaks" Beta's total ('90') | View code filters `employee=request.user`; B-with-no-data saw empty state | '90' matches Tailwind class `bg-slate-900` (`base_employee.html:35`); positive empty-state proof decisive | YES (static grep) | **Isolation VERIFIED — zero leakage** |
| C-04 | Phase 2: warp has no completion path | Phase 4.5: lifecycle fixed | Current source has `finish_warp` service + POST route + audit model/migration; unit ×4 + live single-active | YES (this session) | **FIXED & VERIFIED** |
| C-05 | Phase 2: rate setter unreachable BACKEND_ONLY | Phase 4.5: rate form live | Form present in detail template; unit ×3 incl. employee-blocked | YES | **FIXED & VERIFIED** |
| C-06 | Phase 3: weekly formula implemented six times | Phase 4.5 did not consolidate it | Inline math still present in ≥5 views alongside service function | static | **STILL TRUE — P3 duplication risk stands** |
| C-07 | Phase 4: session cookie HttpOnly per defaults | Probe collapsed-header capture read HttpOnly absent | Django `global_settings.py`: `SESSION_COOKIE_HTTPONLY=True`, `SAMESITE="Lax"`; settings untouched; runtime capture method proven unreliable (multi-header dict collapse) | config source review | **Defaults hold (config authority); runtime flag capture inconclusive** |
| C-08 | 30/30 tests PASS | Coverage gaps exist (browser/concurrency/export-scale/PDF-text) | Suite inventory vs prior-phase live-only checks | inventory comparison | **PASS WITH DOCUMENTED LIMITS** — gaps listed, not hidden |
| C-09 | Phase 4.5 verdict READY WITH MINOR KNOWN ISSUES | Independent audit must not inherit it | Fresh verification reproduced every load-bearing claim (tests, security, payroll semantics, invariants); independent audit ADDS two P2 items (TLS hardening absent, scheduler absent) without contradicting any 4.5 conclusion | full phase | **CONFIRMED, with additions** |
| C-10 | Prior-session archive-count expectations ("FAIL M3.03") | New refresh semantics produce create+refresh counts | Dry-run prediction == real run == pinned design; rerun idempotent | YES (Phase 4.5 recovery, re-checked) | **New semantics correct; old assertion obsolete** |
| C-11 | Parallel pagdi race yields HTTP 500s (looks like failure) | Invariant single-ACTIVE held | Log shows `database is locked` lock-timeouts; DB truth clean; atomic rollback | YES (log + ORM truth) | **Safe-fail under contention on SQLite; PG expected better; P3 note** |

## Unreconciled (→ NOT VERIFIED by rule)

| Item | Why |
| ---- | --- |
| PostgreSQL-specific locking/migration behavior | No PG environment available |
| Real deploy stack (Render/gunicorn/Docker build) | Not deployed |
| Python 3.11 interpreter execution | Only 3.13 available |
| Cloudinary upload path | No credentials/surface |
| PDF inner text values | No extractor |

These remain NOT VERIFIED; none contradicts a passing claim — they are open environmental questions carried into the Risk Register.
