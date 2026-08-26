# Phase 5 — Application Engineering Report (Independent Reconciliation)

## 1. Testability & Automated Coverage

- `manage.py test` → **"Found 30 test(s)" / Ran 30 / OK** (runtime, this phase's verification environment). Suite covers: duplicate-day handling, advance input safety + auditing, approval security (GET/CSRF/idempotency/anon), pagdi lifecycle invariant + invalid inputs, warp lifecycle (auto-finish, explicit finish POST-only, capacity parsing), weekly snapshot semantics (refresh-keeps-paid, idempotent archive, repeat mark-paid, negative-final pinning), unified capacity formulas (future-exclusion, clamp), rate-setting authorization ×3, audit survival after user deletion.
- Coverage gaps (honest): no browser/responsive tests; concurrency covered by live probes not unit tests; export byte-level checks exist only in prior-session live QA; PDF inner text never parsed; management commands tested at service level.

## 2. Error Handling & Validation

All six Phase 4 crash-input classes now return friendly flashes with constraint backstops (unit + runtime verified). Unknown routes → clean 404. Unhandled exceptions now LOG tracebacks under DEBUG=False (`django.request ERROR` observed in server log).

## 3. Business Logic Placement

- Money/material mutations correctly live in `core/services.py` (atomic, locked, audited).
- **Residual duplication**: weekly-salary arithmetic re-implemented inline in ≥5 views instead of calling `services.compute_salary_for_employee_for_week` (values proven consistent everywhere tested). P3 — the single most important discipline point for Management-V1 integration.
- Dead/divergent code: `accounts/forms.py SignupForm` (requires email/confirm-password, exposes thread counters) is referenced NOWHERE and contradicts actual signup flow — P4 cleanup candidate; `core/views.py` stub; orphaned templates noted in Phase 2 remain.

## 4. Dependency & Migration Consistency

- Pinned set installs cleanly on Python 3.13 (Pillow 11.1.0); interpreter pins aligned to 3.11 across runtime.txt/.python-version/Dockerfile.
- Models ↔ migrations consistent ("No changes detected"); fresh migrate clean.

## 5. Observability

| Kind | Status |
| ---- | ------ |
| Audit logging (domain events) | PRESENT for advances/materials (CREATE/FINISH/CARRY/ADJUST/CLEAR incl. no-ops, actor+before/after); ABSENT for approve/rate/mark-paid/saree-delete (documented gap) |
| Application error monitoring | Console tracebacks only (LOGGING added in 4.5). No external error tracking (Sentry etc.) — adequate for workshop scale, revisit at deployment |
| Infrastructure monitoring | NONE configured (no health-check endpoint beyond `/` 200 string; platform-level monitoring belongs to host) |

## 6. Maintainability Risks Affecting Integration

| Risk | Class |
| ---- | ----- |
| Single 909-line views module = merge surface | ACCEPTABLE RISK |
| Formula duplication | REQUIRES DISCIPLINE (reuse service in M-V1 code) |
| Dead SignupForm may mislead integrators | DOCUMENTATION ONLY |
| No pagination on lists/exports (scale ceiling ~hundreds of rows) | ACCEPTABLE RISK at workshop scale |

## Verdict

ENGINEERING: SUFFICIENT FOR INTEGRATION. Executable regression net exists (was absent at Phase 4), failure modes are friendly and observable, and extension points are clear.
