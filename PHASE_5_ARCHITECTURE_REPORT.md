# Phase 5 — Architecture Report (Independent Reconciliation)

Scope: independent review of application architecture against Phases 1–4.5 claims and current source. No code modified.

## 1. Verified Architecture (current repository)

| Layer | Implementation | Evidence |
| ----- | -------------- | -------- |
| Pattern | Server-rendered Django MTV monolith; no SPA/REST | `loomserver/urls.py` (3 includes), all routes HTML-returning |
| Apps | `core` = domain (models, services, commands); `accounts` = ALL web views/URLs | directory layout; `accounts/views.py` 909 lines |
| Service layer | Money/material mutations transactional (`@transaction.atomic` + `select_for_update`) | `core/services.py:42-318` (give/clear/carry/archive/finish_pagdi/finish_warp) |
| AuthN | Django session auth, phone=username, approval gate | `accounts/views.py:37-97` |
| AuthZ | `staff_required` decorator on all panel views; employee pages resolve via `request.user.employee` | views.py:27-31 + per-view decorators |
| Data layer | Django ORM only; SQLite local / PostgreSQL via `DATABASE_URL`; Cloudinary media | settings.py:45-67 |
| Frontend | Django templates + Tailwind CDN; `{% url %}` navigation | templates/*; base templates ×17 url tags |
| Ops CLI | `reset_weekly_salary`, `carry_advance` with dry-run rollback sentinel pattern | management/commands/* |
| Deploy | Procfile (release migrate+collectstatic), Dockerfile python:3.11-slim+gunicorn, WhiteNoise manifest statics | deploy files |

## 2. Contradictions Checked

- **"Modular architecture" vs business-logic duplication** → CONFIRMED CONTRADICTION: the canonical weekly formula exists once in `services.compute_salary_for_employee_for_week` but is re-implemented inline in ≥5 view paths (dashboard views.py:119-124; admin detail :315-330; weekly grid :607-623; mark_paid :675-679; slip :739-740). Values agree everywhere tested (Phase 4 §25, Phase 4.5 parity checks), so this is a maintainability/integration risk, not a correctness defect today. Management-V1 must not add a seventh implementation.
- **"core app owns domain" vs stub** → `core/views.py` is an empty scaffold (3 lines); harmless but misleading.
- **Audit visibility**: `WarpChangeHistory` (new in 0007) is NOT registered in `core/admin.py` (8 models registered, it is absent) while PagdiChangeHistory/AdvanceHistory are → inconsistent forensic access via Django admin.

## 3. Integration Risk Assessment for Management-V1

| Aspect | Risk | Class |
| ------ | ---- | ----- |
| Single-app URL namespace under `/accounts/` mount | Low — documented since Phase 4 route discovery | ACCEPTABLE |
| Inline salary math in views | Medium maintainability risk when extending payroll | REQUIRES DISCIPLINE during integration (reuse service) |
| All views in one module (909 lines) | Medium — merge surface for M-V1 features | ACCEPTABLE RISK |
| Service layer as extension point | LOW risk — correct place to integrate M-V1 money logic | — |
| Session-key `employee_id` legacy usage | Residual only in none of the money paths (BUG-24 fixed both consumers) | ACCEPTABLE |

## Verdict

ARCHITECTURE: SUPPORTS INTEGRATION. Sound MTV boundaries with a real service layer; duplication and file-size findings are P3 engineering-debt items (see Risk Register R-07), not integration blockers.
