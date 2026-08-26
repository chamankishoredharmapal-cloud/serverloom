# Phase 1 — Repository Reconnaissance

Project inspected: **ServerLoom (`loomserver`)** — located at `serverloom-main/` within this workspace.
Report generated from direct inspection of settings, URLs, views, models, services, management commands, tests, templates, and deploy configuration.

---

## 1. Executive Summary

ServerLoom is a **server-rendered Django monolith** for managing piece-rate workers in a saree/weaving workshop. It tracks employees, daily saree production counts, material assignments (**pagdi** = decorative band assignment, **warp** = warp thread assignment), weekly salary computation (sarees × rate − outstanding advance), payment status, and exports (PDF salary slips, XLSX history reports).

It solves workforce/payroll administration: admins record production and advances; employees see their own dashboard, pagdi/warp status, and salary history through separate logins gated by admin approval.

Architecture is a classic **MTV (Model–Template–View)** Django app:

- **No SPA, no REST API, no frontend framework.** All HTML is rendered server-side via Django templates styled with **Tailwind CSS loaded from CDN**.
- Two Django apps: `core` (domain models, business-logic service layer, management commands) and `accounts` (all views/URLs/templates for both the employee site and the custom admin "panel").
- Persistence via Django ORM on **SQLite locally**, **PostgreSQL on Render** in deployment; media on **Cloudinary**.
- Money-mutating operations are wrapped in `transaction.atomic()` + `select_for_update()` in a dedicated service layer (`core/services.py`), with weekly archive/reset and advance-carry exposed as **management commands** with dry-run support.
- Auth is Django session auth using **phone number as username**, plus a custom `staff_required` guard for the admin panel.

Main technologies: Python 3.11/3.12, Django 5.2.8, Gunicorn, WhiteNoise, Cloudinary, ReportLab, openpyxl, PostgreSQL/SQLite.

---

## 2. Repository Structure

```text
serverloom-main/
├── manage.py                     # Django management entry point
├── requirements.txt              # Pinned deps (Django 5.2.8, gunicorn, cloudinary, reportlab, openpyxl…)
├── runtime.txt                   # python-3.11 (deploy runtime)
├── .python-version               # 3.12.4 (local pyenv — differs from runtime.txt)
├── Procfile                      # release: migrate+collectstatic / web: gunicorn (Render/Heroku style)
├── Dockerfile                    # python:3.11-slim, gunicorn on :8080
├── README_DEPLOY.md              # Render + Render Postgres + Cloudinary deployment guide
│
├── loomserver/                   # PROJECT CONFIG (settings/urls/wsgi/asgi)
│   ├── settings.py               # Env-driven config; SQLite↔Postgres switch; Cloudinary storage
│   ├── urls.py                   # Root URLconf: "/" placeholder, includes accounts.urls, /admin/
│   ├── wsgi.py / asgi.py
│
├── core/                         # DOMAIN APP (models + business logic)
│   ├── models.py                 # 8 models: Employee, SareeCount, WarpHistory, PagdiHistory,
│   │                             #   SalaryHistory, AdvanceHistory, PagdiChangeHistory, AlertEmail
│   ├── services.py               # ★ Transactional business logic (advances, weekly archive/reset,
│   │                             #   pagdi finish, advance carry) — atomic + row locks
│   ├── admin.py                  # All models registered in Django admin
│   ├── views.py                  # STUB (empty scaffold)
│   ├── management/commands/
│   │   ├── reset_weekly_salary.py    # Weekly archive/reset command (--dry-run, --date, --note)
│   │   └── carry_advance.py          # Advance-carry command (--factor, --dry-run)
│   ├── templatetags/multiply.py  # Template filters: multiply/div/mul/sub/pct (duplicated defs)
│   ├── tests/test_advance_and_reset.py  # Only real automated tests in repo (3 unit tests)
│   └── migrations/
│
├── accounts/                     # WEB APP (ALL views + URLs for employee & admin-panel pages)
│   ├── views.py                  # ~750 lines: auth, employee pages, admin panel, PDF/XLSX exports
│   ├── urls.py                   # Every application route lives here
│   ├── forms.py                  # SignupForm — DEFINED BUT UNUSED by any view
│   ├── models.py                 # Empty stub
│   ├── tests.py                  # Empty stub
│   ├── admin.py / apps.py
│   └── migrations/
│
└── templates/                    # Project-level templates (DIRS setting)
    ├── base_admin.html           # Tailwind CDN shell for admin panel
    ├── base_employee.html        # Tailwind CDN shell for employee site
    └── accounts/
        ├── login.html, signup.html, dashboard.html, saree_count.html,
        ├── pagdi.html, warp.html, warp_history.html (orphaned), history.html,
        ├── employee_salary_history.html
        └── admin/                # admin_home, admin_employees, admin_employee_detail,
                                  # admin_pagdi_list/create, admin_warp_list/create,
                                  # admin_weekly_salary, admin_salary_history, admin_saree_entry
```

Directory purposes:

| Directory | Purpose |
| --------- | ------- |
| `loomserver/` | Project configuration: settings, root URL routing, WSGI/ASGI entry |
| `core/` | Domain layer: ORM models, transactional services, scheduled-job management commands, template filters, unit tests |
| `accounts/` | Presentation layer: every functional view + route + page (despite the name, it is far more than authentication) |
| `templates/accounts/admin/` | Custom admin-panel UI ("panel"), distinct from Django's built-in `/admin/` |

---

## 3. Technology Stack

| Layer      | Technology | Evidence / Location |
| ---------- | ---------- | ------------------- |
| Language   | Python 3.11 (runtime.txt, Dockerfile) / 3.12.4 (.python-version) | `runtime.txt`, `.python-version`, `Dockerfile` |
| Framework  | Django 5.2.8 (MTV, server-rendered) | `requirements.txt`, `loomserver/settings.py` |
| Frontend   | Server-side Django templates + Tailwind CSS via CDN | `templates/base_admin.html:9`, `templates/base_employee.html:8` |
| UI         | Hand-written HTML templates; two base layouts (admin/employee) | `templates/base_admin.html`, `templates/base_employee.html`, `templates/accounts/**` |
| Backend    | Django function-based views; Gunicorn 21.2.0 WSGI server | `accounts/views.py`, `Procfile`, `Dockerfile` |
| Database   | SQLite (local fallback) / PostgreSQL via `DATABASE_URL` (Render) | `loomserver/settings.py:34-46`, `README_DEPLOY.md` |
| Media      | Cloudinary (`django-cloudinary-storage`) + Pillow | `requirements.txt`, `loomserver/settings.py:51-53` |
| Static     | WhiteNoise compressed manifest storage | `loomserver/settings.py:18` |
| Auth       | Django `contrib.auth` session auth (phone-as-username) + custom decorators | `accounts/views.py:27-97` |
| State      | Django sessions + database (no client state framework, no cache, no Celery) | `loomserver/settings.py` middleware, `accounts/views.py:82` |
| Exports    | ReportLab (PDF slips), openpyxl (XLSX reports) | `accounts/views.py:598-748` |
| Testing    | Django `TestCase` (unittest-based) | `core/tests/test_advance_and_reset.py` |
| Deployment | Render Web Service + Render PostgreSQL + Cloudinary; Docker image alternative | `README_DEPLOY.md`, `Procfile`, `Dockerfile` |

Notably **absent**: DRF/REST layer, Celery/queues, Redis/cache, JavaScript build tooling, linters/formatters config, CI config.

---

## 4. Application Entry Flow

```text
Developer runs gunicorn / runserver
      ↓
loomserver/wsgi.py  (WSGI_APPLICATION = "loomserver.wsgi.application")
      ↓
loomserver/settings.py  (env-driven: SECRET_KEY, DEBUG, DATABASE_URL, CLOUDINARY_URL)
      ↓
Middleware chain (Security → WhiteNoise → Sessions → Common → CSRF →
                  Authentication → Messages → XFrameOptions)   [settings.py:20-29]
      ↓
ROOT_URLCONF = loomserver.urls
      ├─ "/"            → lambda returning "Server Loom backend is running!" (health placeholder)
      ├─ "/accounts/"   → include(accounts.urls)   ← ALL app functionality
      └─ "/admin/"      → django.contrib.admin (staff-only back office)
      ↓
Request routed to accounts.views.* function-based views
      ↓
Guards applied per-view:
   @login_required                       → employee pages
   @staff_required (user_passes_test)    → "/panel/*" admin pages
      ↓
Template rendered from templates/ (base_admin.html or base_employee.html shells)
```

Key detail: the `core` app exposes **no URLs of its own** — it is pure domain logic consumed by `accounts.views`. There is no API layer between browser and Django; every interaction is a form POST redirecting back to a rendered page.

---

## 5. Route Map

All application routes are registered in `accounts/urls.py`; root wiring in `loomserver/urls.py`.

### Public / Auth

| Route | Page / Component (view) | Auth | Purpose |
| ----- | ----------------------- | ---- | ------- |
| `/` | inline lambda (`loomserver/urls.py:6`) | None | Health-check placeholder text |
| `/accounts/signup/` | `signup_view` | None | Self-registration → creates **unapproved** Employee |
| `/accounts/login/` (+ duplicate `/accounts/accounts/login/`) | `login_view` | None | Phone+password login; blocks unapproved employees; routes staff → panel |
| `/accounts/logout/` | `logout_view` | Any | Logout, redirect to login |

### Employee site (`@login_required`)

| Route | View | Purpose |
| ----- | ---- | ------- |
| `/employee/dashboard/` | `employee_dashboard` | Weekly sarees, salary-before/after-advance summary (read-only) |
| `/employee/saree-count/` | `saree_count_view` | Personal saree-entry history with computed pay per row |
| `/employee/pagdi/` | `pagdi_view` | Active pagdi progress; POST finishes active pagdi |
| `/employee/warp/` | `warp_view` | Active warp progress (read-only) |
| `/employee/history/` | `employee_history_view` | Combined saree + pagdi + warp history |
| `/employee/salary-history/` | `employee_salary_history` | Archived weekly salary records |

### Admin panel ("panel", `@staff_required`)

| Route | View | Purpose |
| ----- | ---- | ------- |
| `/panel/` , `/panel/dashboard/` | `admin_home`, `admin_dashboard` | Stats dashboard (employees, unapproved, active pagdis/warps) |
| `/panel/employees/` | `admin_employees` | Searchable employee list (?q= filter) |
| `/panel/employees/<id>/` | `admin_employee_detail` | Detail + POST actions: approve, save_salary, add_saree, delete_saree |
| `/panel/employees/<id>/approve/` | `admin_approve_employee` | Approve pending employee |
| `/panel/pagdi/` , `/panel/pagdi/create/` | `admin_pagdi_list`, `admin_pagdi_create` | List pagdis w/ remaining capacity; assign new pagdi (auto-finishes old) |
| `/panel/warp/` , `/panel/warp/create/` | `admin_warp_list`, `admin_warp_create` | Same pattern for warps |
| `/panel/weekly-salary/` | `admin_weekly_salary` | Current-week payroll grid (computed inline) |
| `/panel/give-advance/<id>/` (POST) | `give_advance_view` | Add advance → `services.give_advance` |
| `/panel/clear-advance/<id>/` (POST) | `clear_advance` | Zero advance → `services.clear_advance_for_employee` |
| `/panel/mark-paid/<id>/` (POST) | `mark_paid` | Create/update SalaryHistory paid row (inline logic) |
| `/panel/unpaid/<id>/` → `/panel/mark-unpaid/<id>/` (POST) | `mark_unpaid` | Revert paid status |
| `/panel/salary-slip/<id>/` | `salary_slip_pdf` | ReportLab PDF salary slip download |
| `/panel/salary-history/` | `admin_salary_history` | All archived weeks |
| `/panel/saree-entry/` | `admin_saree_entry` | Admin enters daily saree count for an approved employee |
| `/panel/download-history/` | `download_global_history` | XLSX workbook: Saree/Pagdi/Warp/Salary sheets |
| `/panel/download-global-weekly-salary/` | `download_global_weekly_salary` | XLSX export of all SalaryHistory |

### Django built-in

| Route | Auth | Purpose |
| ----- | ---- | ------- |
| `/admin/` | staff/superuser | Django ModelAdmin back office for all 8 models |

Note: `STATIC_URL`/`MEDIA_URL` patterns are not added to `urlpatterns` (media is expected to be served by Cloudinary; static by WhiteNoise).

---

## 6. Functional Module Map

### Module: Authentication & Onboarding

**Purpose:** Phone-number registration, approval-gated login, role split (employee vs staff).
**Main files:** `accounts/views.py:27-97`
**Routes:** `/accounts/signup/`, `/accounts/login/`, `/accounts/logout/`
**Components:** `templates/accounts/login.html`, `signup.html`
**Services/API:** none (direct ORM); sets `request.session["employee_id"]`
**Database dependencies:** `django.contrib.auth.User`, `core.Employee.is_approved`

### Module: Employee Self-Service

**Purpose:** Read-only personal dashboards; employees can only *finish* their own active pagdi.
**Main files:** `accounts/views.py:103-247`
**Routes:** `/employee/*` (6 routes above)
**Components:** `dashboard.html`, `saree_count.html`, `pagdi.html`, `warp.html`, `history.html`, `employee_salary_history.html`
**Hooks:** n/a (server-rendered)
**Services/API:** `services.finish_pagdi`, `services.get_week_bounds`
**Database dependencies:** `Employee`, `SareeCount`, `PagdiHistory`, `WarpHistory`, `SalaryHistory`

### Module: Workforce Administration ("panel")

**Purpose:** Approvals, salary-rate setting, saree entry, pagdi/warp assignment, payroll operations, exports.
**Main files:** `accounts/views.py:253-748`
**Routes:** all `/panel/*` routes
**Components:** `templates/accounts/admin/*.html` (10 pages)
**Services/API:** `services.give_advance`, `clear_advance_for_employee`, `finish_pagdi`, `get_week_bounds`; inline payroll math in `mark_paid`/`admin_weekly_salary`
**Database dependencies:** all `core.models`

### Module: Payroll & Advances Domain Logic

**Purpose:** Deterministic money handling: advances, weekly salary computation, archival/reset, advance carrying.
**Main files:** `core/services.py` (~265 lines)
**Routes:** none directly (invoked from views + commands)
**Database dependencies:** `Employee`, `SareeCount`, `SalaryHistory`, `AdvanceHistory`, `PagdiHistory`, `PagdiChangeHistory`
**Design:** `@transaction.atomic` + `select_for_update()` on all money mutations; idempotent weekly archive keyed on `(employee, week_start, week_end)` uniqueness

### Module: Scheduled Jobs (management commands)

**Purpose:** Weekly close-out and advance carry-over, runnable by cron/scheduler with safe dry-runs.
**Main files:** `core/management/commands/reset_weekly_salary.py`, `carry_advance.py`
**Routes:** none (CLI: `python manage.py reset_weekly_salary`, `python manage.py carry_advance`)
**Behavior:** dry-run wraps the service call in a transaction and raises a sentinel exception to roll back — simulates without persisting

### Module: Reporting & Exports

**Purpose:** PDF salary slip per employee; multi-sheet XLSX global history; weekly-salary XLSX.
**Main files:** `accounts/views.py:598-748`
**Routes:** `/panel/salary-slip/<id>/`, `/panel/download-history/`, `/panel/download-global-weekly-salary/`
**Libraries:** reportlab, openpyxl

---

## 7. Component Architecture

This is **not a component-based SPA**; the equivalent structure is templates + views:

- **Layouts (base shells):** `templates/base_admin.html` (admin panel nav/footer) and `templates/base_employee.html` (employee nav). Both load Tailwind from CDN with a JS fallback attempting `/static/css/tailwind-fallback.css`.
- **Page components:** one template per view, e.g. `accounts/admin/admin_weekly_salary.html` ↔ `admin_weekly_salary` view. Templates receive fully-computed context dicts (views deliberately pre-compute salaries "to avoid template arithmetic" — comments at `accounts/views.py:141,312`).
- **Shared partials:** minimal; repetition across admin templates rather than `{% include %}` composition.
- **Forms:** plain HTML `<form>`s posting to the same or action URLs. `accounts/forms.py.SignupForm` exists but is **dead code** — `signup_view` reads `request.POST` manually.
- **Tables/lists:** server-rendered `<table>`s (employees, weekly salary rows, histories). No pagination anywhere — lists render entire querysets.
- **Dialogs/modals:** none found beyond whatever Tailwind markup exists in-page; interactions rely on page navigation and Django `messages` flash banners.
- **Navigation:** sidebar/nav in base templates differentiated by role shell.
- **Custom template filters:** `core/templatetags/multiply.py` provides `multiply/div/mul/sub/pct` — note the file contains **duplicate definitions** of `multiply`, `div`, `mul` (later ones win at import time).
- **Orphaned artifact:** `templates/accounts/warp_history.html` is not rendered by any view (warp uses `warp.html`).

---

## 8. Hook & State Architecture

There are **no client hooks** (no React/Vue). State architecture is Django-classic:

| State kind | Implementation | Evidence |
| ---------- | -------------- | -------- |
| Global/app state | None (stateless views) | — |
| Session state | Django DB-backed sessions; `request.session["employee_id"]` set at login | `accounts/views.py:82,87,108,196` |
| User identity | `request.user` via `AuthenticationMiddleware`; `Employee` reached via `user.employee` OneToOne **or** session id — inconsistently across views | `accounts/views.py:143,113` |
| Persistent state | PostgreSQL/SQLite via ORM; aggregate fields on `Employee.advance_salary`, `current_week_salary` | `core/models.py:27-37` |
| Flash messages | `django.contrib.messages` for success/error feedback | throughout `accounts/views.py` |
| Query-string state | `?q=` search filter on employee list | `accounts/views.py:287-291` |
| Client storage | None (no localStorage/cookies beyond Django session cookie) | — |

Flow shape for the closest analogue to a "hook":

```text
View function (e.g. employee_dashboard)
 ↓ Reads: request.session["employee_id"] / request.user
 ↓ Writes: nothing (read-only) — or DB via POST actions
 ↓ Backend dependency: ORM queries (aggregate Sum over SareeCount)
 ↓ Used by: exactly one route each; no reuse layer
```

---

## 9. Business Logic Architecture

Business logic lives in **two places** — a proper service layer and duplicated inline in views.

```text
Browser form POST
 ↓
accounts.views.<action> (@staff_required/@login_required)
 ↓
Either: core.services.* (preferred path)   — OR — inline computation in the view
 ↓
Django ORM
 ↓
SQLite / PostgreSQL
 ↓
redirect + messages flash → GET renders updated page
```

Canonical implementation paths:

| Business operation | Actual implementation path | Transactional? |
| ------------------ | -------------------------- | -------------- |
| Give advance | `POST /panel/give-advance/<id>` → `give_advance_view` → `core/services.give_advance` (`services.py:42-68`) | Yes — atomic + `select_for_update` |
| Clear advance | `POST /panel/clear-advance/<id>` → `services.clear_advance_for_employee` (`services.py:71-101`) | Yes; records no-op clears for audit |
| Compute weekly salary | `services.compute_salary_for_employee_for_week` (`services.py:104-121`): `Σ sarees × rate − advance` | Pure function |
| Archive & reset week | `services.archive_and_reset_weekly_salaries` (`services.py:124-170`): snapshot into `SalaryHistory`, zero `current_week_salary`, **leaves advances untouched**; idempotent via existence check + unique constraint | Yes — locks all employee rows |
| Carry advances forward | `services.carry_advances_to_next_week(factor)` (`services.py:197-264`): multiply each advance by factor, audit-log every row including zeros | Yes |
| Finish pagdi | `services.finish_pagdi` (`services.py:173-194`): set `end_date=today`, write `PagdiChangeHistory(FINISH)` | Yes |
| Assign new pagdi | `admin_pagdi_create` (`accounts/views.py:417-443`): auto-finish existing open pagdi then create new + `CREATE` audit row | Partially (create itself non-atomic with finish) |
| Mark paid / unpaid | `mark_paid` / `mark_unpaid` (`accounts/views.py:540-592`): **inline** get_or_create + update of `SalaryHistory` — does NOT reuse the service module | get_or_create is atomic-ish; not wrapped explicitly |
| Enter saree count | `admin_saree_entry` / `admin_employee_detail(add_saree)` → `SareeCount.objects.create` | Single insert |
| Week bounds | `services.get_week_bounds` (Monday-start, server-local date, TZ Asia/Kolkata) | Pure |

Observation: `compute_salary_for_employee_for_week` exists precisely for reuse, yet `admin_weekly_salary`, `employee_dashboard`, `admin_employee_detail`, and `salary_slip_pdf` each **re-implement the same formula inline** — three parallel copies of the payroll formula.

---

## 10. Database Architecture

Backend: Django ORM. Locally SQLite (`db.sqlite3`), production PostgreSQL via `dj_database_url`. No raw SQL, stored procedures, triggers, or DB views anywhere — all logic is ORM/application-level.

### Tables

| Table (model) | Purpose | Important relationships / constraints |
| ------------- | ------- | --------------------------------------- |
| `core_employee` (Employee) | Worker profile + live payroll counters (`salary_per_saree`, `advance_salary`, `current_week_salary`) + material counters + `is_approved` gate | 1:1 → `auth_user` (CASCADE); index on `phone` |
| `core_sareecount` (SareeCount) | Daily production entries | FK → Employee (CASCADE); **unique_together(employee, date)** — one entry/day/worker; composite index (employee, date) |
| `core_warphistory` (WarpHistory) | Warp assignment periods + capacity | FK → Employee (CASCADE) |
| `core_pagdihistory` (PagdiHistory) | Pagdi assignment periods + capacity | FK → Employee (CASCADE) |
| `core_salaryhistory` (SalaryHistory) | Archived weekly payroll snapshots + paid status | FK → Employee (CASCADE); **unique_together(employee, week_start, week_end)** — idempotency key; index (employee, week_start) |
| `core_advancehistory` (AdvanceHistory) | Audit log of advance changes (CLEAR/CARRY/ADJUST) with before/after amounts | FK → Employee (CASCADE); FK → `auth_user` admin (SET_NULL); index (employee, created_at) |
| `core_pagdichangehistory` (PagdiChangeHistory) | Audit log of pagdi lifecycle events (CREATE/FINISH/…) | FK → PagdiHistory (**SET_NULL** — survives pagdi deletion); FK → Employee (CASCADE); FK → admin User (SET_NULL) |
| `core_alertemail` (AlertEmail) | Registry of alert recipient emails | Standalone; **no consumer code found** |
| Django built-ins | `auth_user`, `sessions`, `django_admin_log`, `contenttypes` | standard |

### Database Functions / RPCs

None. No Postgres functions, RPCs, or raw SQL calls found (pure ORM).

### Triggers

None.

### Views

None (DB-level). Read models are plain querysets.

### Constraints / Indexes

- `unique_together`: `(employee, date)` on SareeCount; `(employee, week_start, week_end)` on SalaryHistory
- Indexes: `Employee.phone`; `SareeCount.(employee,date)`; `SalaryHistory.week_start`, `(employee, week_start)`; `AdvanceHistory/PagdiChangeHistory.(employee, created_at)`
- Validators: `MinValueValidator(0)` on `salary_per_saree`, `advance_salary` (note: `SalaryHistory.advance_salary` and final fields are plain `IntegerField` → **negatives possible at snapshot level**)
- Auto timestamps: `created_at` / `updated_at` on every model

### Relationships

```text
auth_user (User)
  │ 1:1 (CASCADE)
  ▼
Employee ──(is_approved gate; live counters)
  │
  ├──1:N── SareeCount          (daily production; unique per day)
  ├──1:N── WarpHistory         (open ⇢ end_date NULL means active)
  ├──1:N── PagdiHistory
  │            └──1:N── PagdiChangeHistory   (audit; SET_NULL on pagdi delete)
  ├──1:N── SalaryHistory       (weekly snapshot; unique per week; paid_status/paid_date)
  └──1:N── AdvanceHistory      (audit: CLEAR/CARRY/ADJUST; prev→new amount)

auth_user ──SET_NULL──▶ AdvanceHistory.admin_user, PagdiChangeHistory.admin_user
AlertEmail             (standalone email registry — currently unused)
```

Derived data conventions: "active" pagdi/warp = `end_date IS NULL`; remaining capacity computed on the fly (`remaining_sarees()` methods run live aggregate queries — a per-row-query pattern in list views).

---

## 11. Authentication & Authorization

This is a Django-session application; there is no JWT/OAuth/API-token layer and **no database-level RLS** (not applicable outside Supabase-style stacks).

### Login flow (`accounts/views.py:65-92`)

1. `authenticate(username=<phone>, password=...)` against `auth_user` (phone doubles as username).
2. If linked `Employee` exists:
   - `is_approved == False` → rejected with "Account not approved yet."
   - else `login()`, stash `session["employee_id"]`, redirect to `/employee/dashboard/`.
3. Else if `user.is_staff or is_superuser` → `login()`, redirect `/panel/`.
4. Otherwise rejected ("Unauthorized account.").

Signup (`signup_view`) creates `User` + unapproved `Employee`; approval is a manual admin action.

### Roles & permissions

| Role | Determined by | Access |
| ---- | ------------- | ------ |
| Visitor | anonymous | signup/login only |
| Employee (approved) | `User` with approved `Employee` | `/employee/*` via `@login_required` |
| Employee (pending) | `Employee.is_approved=False` | **nothing** (blocked at login) |
| Admin/staff | `is_staff or is_superuser` | `/panel/*` via `@staff_required` (`user_passes_test`), plus `/admin/` Django admin |

### Route protection

- Decorator-based only: `@login_required` (employee views), custom `staff_required = user_passes_test(_is_staff, login_url="login")` (`accounts/views.py:27-31`).
- Mutating endpoints require POST (`HttpResponseBadRequest` otherwise) on advance/payment actions.
- **Frontend security** = these decorators + login gating. That is the entire model.

### Backend/database security

- Authorization is enforced **only at the Django view layer**; the database has no row-level security. Any code path bypassing views (shell, future API) would bypass authorization entirely.
- CSRF: `CsrfViewMiddleware` enabled; templates presumably emit `{% csrf_token %}`.
- Object-level checks are weak in places: most panel views fetch by primary key without scoping concerns (staff-only, acceptable), but employee identity relies on either `request.user.employee` **or** the raw `session["employee_id"]` — the session value is trusted after login and never re-validated against `request.user` in e.g. `employee_dashboard` (`accounts/views.py:108-113`). A mismatched session value yields another employee's page if guessable — mitigated only by session binding.
- Server-side validation is ad-hoc: `try/int(...)` around numeric POST fields with flash-message errors; `SignupForm` (with password-confirm validation) exists but is **unused** — signup accepts any non-empty password with no strength/confirm check.
- Config risks observed: `ALLOWED_HOSTS = ["*"]` (`settings.py:10`); `SECRET_KEY` falls back to hardcoded `"dev-secret-key"` when env var missing (`settings.py:7`); `DEBUG` defaults False (good).

---

## 12. Backend / API / Edge Functions

No serverless/edge functions exist. The backend surface = Django view functions + two management commands.

| Function | Trigger | Purpose | Database | External services |
| -------- | ------- | ------- | -------- | ----------------- |
| `signup_view` | POST `/accounts/signup/` | Register unapproved employee | User+Employee insert | — |
| `login_view` | POST `/accounts/login/` | Approval-aware login, role routing | read User/Employee | — |
| `employee_dashboard` | GET | Weekly totals for self | SareeCount agg | — |
| `pagdi_view` | GET/POST | Show/finish own active pagdi | PagdiHistory + audit | — |
| `admin_employee_detail` | GET/POST | Employee drill-down + 4 inline actions (approve/save_salary/add_saree/delete_saree) | Employee, SareeCount, histories | — |
| `admin_pagdi_create` | POST | Assign pagdi; auto-finish previous | PagdiHistory + audit | — |
| `give_advance_view` | POST | Add advance | Employee + AdvanceHistory | — |
| `mark_paid` / `mark_unpaid` | POST | Payment status flip | SalaryHistory upsert | — |
| `salary_slip_pdf` | GET | Per-employee weekly slip | read-only | — |
| `download_global_history` | GET | 4-sheet XLSX export | read-only | — |
| `reset_weekly_salary` (command) | CLI/scheduler | Idempotent weekly archive+reset | SalaryHistory bulk, Employee lock | — |
| `carry_advance` (command) | CLI/scheduler | Multiply advances by factor + audit | Employee bulk + AdvanceHistory | — |

Representative contract — `give_advance_view` (`accounts/views.py:516-528`):

- **Input:** POST form fields `amount:int`, `note:str`; URL param `emp_id`.
- **Authentication:** session cookie (Django middleware).
- **Authorization:** `@staff_required` (is_staff/is_superuser).
- **Main operation:** `transaction.atomic { SELECT … FOR UPDATE employee; advance += amount; INSERT AdvanceHistory(ADJUST) }`.
- **Output:** 302 redirect to `/panel/weekly-salary/` + success message.
- **Failure behavior:** non-int amount → `HttpResponseBadRequest("Invalid amount")`; invalid/negative amount inside service → `ValueError` (would surface as 500 since view doesn't catch it); missing employee → `DoesNotExist` → 500.

---

## 13. External Integrations

Only confirmed integrations:

| Service | Purpose | Where used | Data exchanged |
| ------- | ------- | ---------- | -------------- |
| Cloudinary | Media (profile pictures) storage/hosting | `settings.py:51-53` (`MediaCloudinaryStorage`), `Employee.profile_picture` | Image uploads via `CLOUDINARY_URL` credential |
| Render PostgreSQL | Managed production database | `DATABASE_URL` parsed by `dj_database_url` (`settings.py:34-39`) | SQL traffic |
| Tailwind CDN | CSS framework delivery | `<script src="https://cdn.tailwindcss.com">` in both base templates | Browser fetches JIT CSS script; fallback attempted from `/static/css/tailwind-fallback.css` (file not present in repo) |
| WhiteNoise | Static file serving from app process | `settings.py:18`, middleware | Local, bundled |

No payment gateways, email senders, SMS, analytics, or third-party APIs are wired. `core.AlertEmail` implies planned email alerts, but **no email backend, sending code, or consumer exists**.

---

## 14. Major Data Flows

**Flow A — Admin gives an advance (money mutation, canonical path):**

```text
Admin clicks "Give Advance" on /panel/weekly-salary/
 ↓ POST /panel/give-advance/<emp_id>  (amount, note)  [+ CSRF token]
 ↓ @staff_required passes
 ↓ give_advance_view → transaction.atomic
 ↓ services.give_advance: SELECT … FOR UPDATE on Employee row
 ↓ Employee.advance_salary += amount (update_fields save)
 ↓ AdvanceHistory.objects.create(action_type="ADJUST", prev, new, admin_user)
 ↓ commit → messages.success → redirect /panel/weekly-salary/
 ↓ GET recomputes grid inline (sarees × rate − advance) → table shows new final salary
```

**Flow B — Weekly close-out (scheduled/command path):**

```text
Operator: python manage.py reset_weekly_salary [--dry-run]
 ↓ command wraps services.archive_and_reset_weekly_salaries
 ↓ get_week_bounds(today) → Monday..Sunday (Asia/Kolkata)
 ↓ SELECT … FOR UPDATE all Employees
 ↓ per employee: skip if SalaryHistory exists for week (idempotent)
 ↓ else compute (Σ SareeCount × rate − advance) → INSERT SalaryHistory(paid_status=False)
 ↓ zero Employee.current_week_salary → commit
 ↓ output "N SalaryHistory rows created"
```

**Flow C — Employee views own pay:**

```text
GET /employee/dashboard/ (session cookie)
 ↓ @login_required → session["employee_id"] → Employee lookup (404-safe)
 ↓ services.get_week_bounds
 ↓ aggregate Sum(SareeCount.count) filtered employee+date range
 ↓ final = weekly_sarees × rate − advance (computed in view)
 ↓ render dashboard.html context
```

**Flow D — Production entry → payroll visibility:**

```text
Admin: POST /panel/saree-entry (employee, date, count, notes)
 ↓ SareeCount.objects.create   (unique constraint rejects dup day → IntegrityError → unhandled 500)
 ↓ next /panel/weekly-salary/ GET recomputes aggregates → new count reflected immediately
 ↓ at week end, Flow B freezes it into immutable SalaryHistory
```

---

## 15. Error / Loading / Validation Architecture

- **Loading states:** none needed — full-page server renders; no async fetching.
- **Empty states:** handled implicitly by template conditionals (e.g., "no active pagdi" branches in `pagdi_view`/`warp_view`); no dedicated empty-state design system.
- **Errors surfaced to users:** exclusively via `django.contrib.messages` flash banners (`messages.error/success`) on redirects, or inline `{"error": …}` template variables on login/signup re-renders.
- **Form validation:** hand-rolled in views — `int(request.POST.get(...))` inside try/except with flash-error + redirect. `SignupForm.clean()` (password match) is dead code; actual signup validates only non-empty fields and username uniqueness.
- **Network failures:** not handled (traditional form posts; browser default behavior).
- **Database failures:** unhandled → Django 500 page (`DEBUG=False` in prod). Notable risk spots: duplicate-day saree entry hits `unique_together` → `IntegrityError` uncaught (`admin_saree_entry`); `admin_warp_create` calls `int(...)` unguarded (`accounts/views.py:468`); `give_advance` `ValueError` propagates.
- **Permission failures:** `@login_required` → redirect to settings `LOGIN_URL` (**never configured** — Django default `/accounts/login/` happens to work because a duplicate route `accounts/accounts/login/` was registered, masking misconfiguration); `@staff_required` → redirect to named `login`.
- **Authentication failures:** friendly inline messages ("Invalid phone or password.", "Account not approved yet.").
- **Money-edge cases:** `final_salary` can go negative (advance > earnings) — allowed by schema and displayed as negative.

---

## 16. Testing Architecture

- **Framework:** Django's built-in unittest (`django.test.TestCase`), run via `python manage.py test`. No pytest, coverage tooling, or extra deps.
- **Unit tests:** `core/tests/test_advance_and_reset.py` — 3 tests covering: (1) clear-advance zeroes balance + writes audit row with correct prev/new, (2) carry-advance with factor 1.0 leaves balances intact + audits, (3) weekly archive/reset is idempotent and produces correct SalaryHistory.
- **Integration tests:** none.
- **E2E tests:** none.
- **Test locations:** `core/tests/` package; `core/tests.py` and `accounts/tests.py` are empty stubs.
- **Coverage gaps:** zero tests for views/routes/auth/permissions/exports; all HTTP behavior untested.
- **CI:** no CI configuration found (no `.github/`, no pipeline files).

Statement: meaningful but minimal automated tests exist (service layer only); everything else is unverified by automation.

---

## 17. Deployment Architecture

Confirmed from `README_DEPLOY.md`, `Procfile`, `Dockerfile`, `runtime.txt`, `settings.py`:

```text
Developer
 ↓ Git push (GitHub per README)
 ↓ (no CI/CD config in repo — manual dashboard deploys assumed)
 ↓ Render Web Service
      Build:   pip install -r requirements.txt
      Release (Procfile): python manage.py migrate && collectstatic --noinput
      Start:   gunicorn loomserver.wsgi --log-file -
 ↓ Environment variables
      SECRET_KEY, DEBUG ("True"/"False"), DATABASE_URL (Render Postgres),
      CLOUDINARY_URL
 ↓ Hosting
      Render (Python runtime 3.11 per runtime.txt; Docker alternative: python:3.11-slim, port 8080)
 ↓ Production services
      Render PostgreSQL (free tier) · Cloudinary (media) · WhiteNoise (static)
```

- **Database migration deployment:** via Procfile `release` phase (runs on every deploy). SQLite fallback only when `DATABASE_URL` unset.
- **Scheduled jobs:** `reset_weekly_salary` / `carry_advance` are designed for cron execution, but **no scheduler/cron configuration exists in the repo** — how they run in production is unknown.
- **`render.yaml`:** referenced as "optional" in README but **not present**.
- **Version inconsistency:** `runtime.txt`=python-3.11, `Dockerfile`=3.11-slim, `.python-version`=3.12.4.

---

# 18. CONSOLIDATED SYSTEM MAP

```text
                        SERVERLOOM — DJANGO MONOLITH (loomserver)
                                      │
              ┌───────────────────────┼───────────────────────────┐
              │                       │                           │
         PRESENTATION              DOMAIN                      INFRASTRUCTURE
              │                       │                           │
   ┌──────────┴─────────┐    ┌────────┴─────────┐        ┌────────┴─────────┐
   │ accounts/          │    │ core/            │        │ loomserver/      │
   │  views.py (~750ln) │───▶│  services.py ★   │───────▶│  settings.py     │
   │  urls.py (all      │    │  models.py (8)   │  ORM   │  urls.py         │
   │   /employee,/panel)│    │  mgmt commands   │        │  wsgi/asgi       │
   └──────────┬─────────┘    └────────┬─────────┘        └────────┬─────────┘
              │                       │                           │
     Django Templates         PostgreSQL / SQLite            WhiteNoise (static)
     (Tailwind CDN)           ┌──────────────────┐           Cloudinary (media)
              │               │ Employee         │           
              │               │  ├ SareeCount    │           EXTERNAL SERVICES
              │               │  ├ PagdiHistory  │           ┌────────────────┐
              │               │  │  └ ChangeHist │           │ Cloudinary     │
              │               │  ├ WarpHistory   │           │ Render Postgres│
              │               │  ├ SalaryHistory │           │ Tailwind CDN   │
              │               │  └ AdvanceHistory│           └────────────────┘
              │               └──────────────────┘
              │
   Guards: @login_required (employee) · @staff_required (panel) · Django session auth
   Ops:    manage.py reset_weekly_salary · carry_advance   (scheduler: UNCONFIGURED)
   Also:   /admin/ (Django ModelAdmin over all tables)      "/" health placeholder
```

---

# 19. IMPORTANT TECHNICAL FINDINGS

1. **Business logic is split and duplicated.** A disciplined service layer (`core/services.py`, atomic + row-locked) coexists with inline re-implementations of the same payroll formula in ≥4 views (`admin_weekly_salary`, `employee_dashboard`, `admin_employee_detail`, `salary_slip_pdf`) and in `mark_paid`. Drift risk is real.
2. **All application code funnels through one file.** `accounts/views.py` (~750 lines) contains auth, employee portal, admin panel, and both exporters; the `accounts` app name undersells its scope. `core/views.py` is an empty stub.
3. **Dual sources of truth for weekly salary.** `Employee.current_week_salary` is maintained by the reset command, while every screen recomputes live from `SareeCount`. The stored field is effectively vestigial except post-archive zeroing.
4. **Idempotency is engineered via DB constraints**, not locks alone: `unique_together(employee, week_start, week_end)` backs the weekly archive; dry-run commands simulate via intentional rollback.
5. **Audit trails are first-class**: every money/material mutation writes `AdvanceHistory` / `PagdiChangeHistory` with actor (`admin_user`, SET_NULL), before/after values, and notes — including deliberate no-op records.
6. **Authorization is decorator-thin**: no permission object model, no RLS, no API surface; database trusts the app entirely. `ALLOWED_HOSTS=["*"]` and a hardcoded `SECRET_KEY` dev fallback are production-risk configs committed in code.
7. **Identity resolution is inconsistent**: some views resolve `Employee` via `request.user.employee`, others via `session["employee_id"]` set once at login and never revalidated.
8. **Dead/orphaned artifacts**: `accounts/forms.py` (SignupForm), `core/views.py`, `AlertEmail` model (no mailer), `warp_history.html`, duplicated templatetag definitions in `multiply.py`, duplicate login route `accounts/accounts/login/`.
9. **Scalability smells**: no pagination; N+1 aggregate queries in pagdi/warp lists and `remaining_sarees()` model methods; whole-table `select_for_update` in archive/carry commands will serialize on large workforces.
10. **Negative-pay possibility**: schema permits `final_salary < 0` (advance exceeds earnings); `SalaryHistory.advance/final` drop the PositiveIntegerField discipline used on the live `Employee` fields.
11. **Environment drift**: Python pinned differently across `runtime.txt` (3.11), `Dockerfile` (3.11), `.python-version` (3.12.4).
12. **Unconfigured operability**: no `LOGIN_URL` setting (masked by a duplicate route), no scheduler for the two weekly commands, no CI running the existing tests.

---

# 20. UNCERTAINTIES

| Area | Status | Reason |
| ---- | ------ | ------ |
| Overall architecture (Django MTV monolith, server-rendered) | CONFIRMED | settings, urls, views, templates inspected |
| Technology stack versions | CONFIRMED (with internal conflict) | `requirements.txt` pinned; Python version conflicts between `runtime.txt`/`Dockerfile`/`.python-version` |
| Route map | CONFIRMED | `loomserver/urls.py`, `accounts/urls.py` read in full |
| Data model & constraints | CONFIRMED | `core/models.py` read in full |
| Service-layer behavior | CONFIRMED | `core/services.py` read in full |
| Migration files match models | LIKELY | `migrations/` dirs exist; individual migration bodies not diffed |
| Authentication model | CONFIRMED | `login_view`/decorators/session usage traced |
| Authorization depth (no RLS/no API tokens) | CONFIRMED | No such layers exist in code |
| Weekly-command production scheduling | UNCLEAR | Commands exist with dry-runs, but no cron/scheduler config in repo — requires deeper investigation |
| Email/alerting capability | NOT FOUND | `AlertEmail` model present; no email backend, settings, or consuming code |
| Static fallback CSS (`tailwind-fallback.css`) | NOT FOUND | Referenced by both base templates; no `static/` directory present in repo listing |
| `accounts/forms.py` usage | LIKELY UNUSED | No import found in `accounts/views.py`; signup parses raw POST |
| Test suite green/red status | UNCLEAR | Tests not executed during recon (would require env setup) |
| CI/CD | NOT FOUND | No `.github/`, pipelines, or `render.yaml` despite README mention |
| `render.yaml` | NOT FOUND | Called "optional" in README; absent from tree |
| Media serving in local/dev | UNCLEAR | `MEDIA_URL` set but no urlpatterns entry; Cloudinary storage configured unconditionally (may break if `CLOUDINARY_URL` unset) |

---

# 21. RECONNAISSANCE COMPLETION CHECK

## Reconnaissance Status

Repository structure: COMPLETE
Documentation: COMPLETE
Technology identification: COMPLETE
Entry flow: COMPLETE
Routes: COMPLETE
Modules: COMPLETE
Components: COMPLETE (adapted: template/view architecture documented; no SPA components exist)
Hooks/state: COMPLETE (adapted: session/context/ORM state documented; no client hooks exist)
Business logic: COMPLETE
Database: COMPLETE (ORM models, constraints, indexes; no DB functions/triggers/views exist by construction)
Authentication: COMPLETE
Authorization: COMPLETE
Backend/Edge Functions: COMPLETE (edge functions do not exist; Django views/commands documented instead)
External integrations: COMPLETE
Data flows: COMPLETE
Testing: COMPLETE
Deployment: COMPLETE (in-repo evidence; external scheduler/CI confirmed absent)
System map: COMPLETE

Phase 1 status: COMPLETE
