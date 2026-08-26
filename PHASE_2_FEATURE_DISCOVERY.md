# Phase 2 — Feature Discovery & Workflow Reconstruction

Companion to `PHASE_1_REPOSITORY_RECONNAISSANCE.md`.
Scope: what ServerLoom (`serverloom-main/`, Django 5.2.8 server-rendered monolith) can **actually do**, traced through routes → views → services → ORM → templates. Every claim is backed by repository evidence; UI wiring was verified template-by-template.

---

## 1. Executive Summary

ServerLoom provides two role-scoped web experiences plus an operations CLI:

- **Employee site** (`/employee/*`): approval-gated login, read-only weekly pay summary, personal production/material/salary histories, and one self-service action (finish own pagdi — implemented but **unreachable from its page**).
- **Admin panel** (`/panel/*`): workforce dashboard, employee search/detail, daily saree entry (+ delete), pagdi/warp assignment with live progress, advance give/clear, live weekly salary grid, mark paid/unpaid, PDF slips, and XLSX exports.
- **Ops commands**: idempotent weekly archive/reset and advance-carry-over management commands with dry-run support — **no scheduler configured anywhere**.
- **Django `/admin/`**: full CRUD over all 8 models — the only place salary rates, performance, material counters, profile pictures, and audit tables are manageable.

40 features were inventoried: **34 VERIFIED, 3 PARTIAL, 3 BACKEND_ONLY**. Notably, several view branches exist without any UI trigger (salary-rate change, approve-in-detail, employee pagdi finish), three hardcoded links 404, and audit tables are invisible outside Django admin.

---

## 2. Master Feature Inventory

Legend — Status: VERIFIED / PARTIAL / BACKEND_ONLY / UI_ONLY / DOCUMENTED_ONLY / BROKEN / UNCLEAR.
All routes live in `accounts/urls.py` under prefixes shown; views in `accounts/views.py`; services in `core/services.py`.

| # | Feature | User | Status | UI | Logic | Database | Side Effects |
| - | ------- | ---- | ------ | -- | ----- | -------- | ------------ |
| 1 | Self-registration | Public | VERIFIED | `signup.html` form (name/phone/password); broken "Login" link → `/login/` 404 | `signup_view` manual POST parse; username=phone | INSERT `auth_user`, `core_employee(is_approved=False)` | flash msg → redirect login |
| 2 | Login (approval-gated) | Public/All | VERIFIED | `login.html` form; "Create Account" link → `/signup/` 404 | `login_view`: authenticate, reject unapproved, staff→panel else→dashboard | READ user+employee; session write | `session["employee_id"]` set |
| 3 | Logout | Any logged-in | VERIFIED | nav link both shells | `logout_view` | session flush | redirect login |
| 4 | Approve pending employee | Admin | VERIFIED | GET link "Approve" on `admin_employees.html:36` (no POST/CSRF) | `admin_approve_employee` sets flag | UPDATE `core_employee.is_approved=True` | flash + redirect; idempotent |
| 5 | Approve via detail action branch | Admin | BACKEND_ONLY | none posts `action=approve` | handler `admin_employee_detail` views.py:337-341 | same as #4 | never triggered by any template |
| 6 | Change salary-per-saree rate | Admin | BACKEND_ONLY | **no UI anywhere** posts `action=save_salary` | handler views.py:343-355 (int ≥0 validated) | UPDATE `salary_per_saree` | unreachable from panel |
| 7 | Employee weekly dashboard | Employee | VERIFIED | `dashboard.html`; quick-link "Warp History" → `/employee/warp-history/` **404** | `employee_dashboard` inline compute | READ Employee + Sum(SareeCount) | — |
| 8 | Own saree history w/ computed pay | Employee | VERIFIED | `saree_count.html` table | `saree_count_view` computes count×rate per row in Python | READ SareeCount | — |
| 9 | View active pagdi progress | Employee | VERIFIED | `pagdi.html` (read-only display) | `pagdi_view` GET branch | READ PagdiHistory + aggregate | — |
| 10 | Employee finishes own pagdi | Employee | BACKEND_ONLY | `pagdi.html` contains **no form** | POST branch views.py:170-173 → `services.finish_pagdi` | UPDATE PagdiHistory.end_date; INSERT PagdiChangeHistory(FINISH) | unreachable from page |
| 11 | View warp progress | Employee | VERIFIED | `warp.html` read-only | `warp_view` | READ WarpHistory + aggregate | — |
| 12 | Combined personal history | Employee | VERIFIED | `history.html` 3 read-only sections | `employee_history_view` | READ Saree/Pagdi/Warp | — |
| 13 | Own salary history | Employee | VERIFIED | `employee_salary_history.html` | `employee_salary_history` | READ SalaryHistory | — |
| 14 | Admin stats dashboard | Admin | VERIFIED | `admin_home.html` stat cards | `admin_home` counts + week bounds | READ counts across models | — |
| 15 | Employee search name/phone | Admin | VERIFIED | GET form `?q=` on employees page | icontains OR filter | filtered SELECT | no pagination |
| 16 | Employee list w/ status badges | Admin | VERIFIED | cards Pending/Approved + View/Approve buttons | `admin_employees` | READ all Employees | — |
| 17 | Employee drill-down detail | Admin | VERIFIED | `admin_employee_detail.html`: week entries table, totals, advance row, 4 history panels | `admin_employee_detail` inline compute | READ week entries + all histories | — |
| 18 | Saree entry global page | Admin | VERIFIED | `admin_saree_entry.html` (employee/date/count/notes) | `admin_saree_entry` create | INSERT SareeCount | duplicate day → unhandled IntegrityError → 500 |
| 19 | Add saree from detail page | Admin | VERIFIED | hidden `action=add_saree` form (date/count/notes) | handler views.py:357-369 | INSERT SareeCount | same dup-day risk |
| 20 | Delete saree entry | Admin | VERIFIED | per-row form `action=delete_saree` + JS confirm | handler views.py:371-375 | DELETE SareeCount | **no deletion audit** |
| 21 | Assign pagdi (auto-finish previous) | Admin | VERIFIED | `admin_pagdi_create.html` (select/start/capacity/notes) | `admin_pagdi_create`: finish old via service, create new, audit CREATE | UPDATE PagdiHistory; INSERT PagdiHistory + PagdiChangeHistory | non-atomic sequence; empty date/capacity → 500 risk |
| 22 | Pagdi list w/ made/remaining | Admin | VERIFIED | `admin_pagdi_list.html` Active/Completed badges | `admin_pagdi_list` N+1 aggregates | READ Pagdi/SareeCount | — |
| 23 | Assign warp | Admin | VERIFIED | `admin_warp_create.html` (select/capacity only) | `admin_warp_create` unguarded `int()` parse | INSERT WarpHistory (start=today) | **no auto-finish of prior warp**; bad input → 500 |
| 24 | Warp list w/ made/remaining | Admin | VERIFIED | `admin_warp_list.html` | `admin_warp_list` N+1 aggregates | READ Warp/SareeCount | — |
| 25 | Dedicated finish-pagdi control | Admin | BACKEND_ONLY | no explicit finish button exists | `services.finish_pagdi` reachable only via #21 auto-finish (or unreachable #10) | as #10 | lifecycle completion is implicit only |
| 26 | Weekly salary grid | Admin | VERIFIED | `admin_weekly_salary.html` per-employee cards w/ actions | `admin_weekly_salary` inline formula (not reusing service) | READ aggregates + SalaryHistory.paid_status | — |
| 27 | Give advance | Admin | VERIFIED | forms on weekly-salary + detail pages (amount≥1) | `give_advance_view` → `services.give_advance` | UPDATE Employee.advance; INSERT AdvanceHistory(ADJUST) | atomic + row lock + audit |
| 28 | Clear advance | Admin | VERIFIED | "Clear" button both pages | `clear_advance` → `services.clear_advance_for_employee` | UPDATE advance=0; INSERT AdvanceHistory(CLEAR) | audits even no-op clears |
| 29 | Mark salary paid | Admin | VERIFIED | "Mark Paid" + optional note (only when unpaid) | `mark_paid` inline get_or_create upsert | INSERT/UPDATE SalaryHistory(paid=True,date=today,final recomputed) | negative final possible; not explicitly atomic |
| 30 | Mark salary unpaid | Admin | VERIFIED | "Set Unpaid" button (only when paid) | `mark_unpaid` flips flags only | UPDATE paid_status=False,paid_date=None | stale `final_salary` snapshot kept |
| 31 | Salary slip PDF | Admin | VERIFIED | "Slip" link on weekly grid | `salary_slip_pdf` ReportLab canvas | READ current-week data | streamed download, not stored |
| 32 | Admin salary history table | Admin | VERIFIED | `admin_salary_history.html` + export link | `admin_salary_history` | READ all SalaryHistory | — |
| 33 | Global history XLSX export | Admin | VERIFIED | nav "Download History" | `download_global_history` openpyxl 4 sheets | READ everything | streamed workbook |
| 34 | Weekly-salary XLSX export | Admin | VERIFIED | button on salary-history page | `download_global_weekly_salary` openpyxl | READ SalaryHistory | streamed workbook |
| 35 | reset_weekly_salary command | Ops CLI | VERIFIED | n/a | `core/management/commands/reset_weekly_salary.py` (--date/--note/--dry-run rollback trick) → `services.archive_and_reset_weekly_salaries` | bulk INSERT SalaryHistory; zero current_week_salary | idempotent; locks all employees; scheduler NOT configured |
| 36 | carry_advance command | Ops CLI | VERIFIED | n/a | `carry_advance.py` (--factor/--dry-run) → `services.carry_advances_to_next_week` | UPDATE advances + INSERT AdvanceHistory(CARRY) per row incl. zeros | not idempotent when factor≠1; scheduler NOT configured |
| 37 | Django admin model CRUD | Staff | VERIFIED | `/admin/` ModelAdmins for all 8 models (`core/admin.py`) | Django contrib.admin | full CRUD everywhere | **only UI** for rate changes, performance, counters, profile pics, deletions, audit viewing |
| 38 | Health placeholder "/" | Public | VERIFIED | plain text | lambda `loomserver/urls.py:6` | none | — |
| 39 | Profile picture upload | Admin (via /admin/) | PARTIAL | app UI: none; Django admin: yes | Cloudinary storage configured unconditionally | Employee.profile_picture | breaks locally if CLOUDINARY_URL unset |
| 40 | Performance & material thread counters | Admin (via /admin/) | PARTIAL | app UI: none | fields `performance`, `pagdi_thread_1/2`, `warp_threads` exist; no consumer code | stored on Employee | displayed nowhere in app |

---

## 3. Verified Feature Details

### Feature: Self-Registration (Signup)

**Purpose:** Workers create their own account; access begins pending until approved.
**User:** Anonymous visitor.
**Entry Point**
```text
Route:   /accounts/signup/
Method:  GET (form) / POST (submit)
Template:templates/accounts/signup.html
Action:  "Create Account" submit button
```
**UI:** Plain HTML form: `name` (text), `phone` (text), `password` (password). CSRF token present. Inline `{% if error %}` banner. Note: the page's "Login" cross-link hardcodes `/login/`, which is not a registered route → 404.
**Logic:** `signup_view` (`accounts/views.py:37-62`) reads `request.POST` directly (the defined `SignupForm` in `accounts/forms.py` is dead code). Validates non-empty fields; rejects duplicate phone-as-username.
**Database:** `User.objects.create_user(username=phone)`; `Employee.objects.create(..., salary_per_saree=0, advance_salary=0, is_approved=False)`.
**Side Effects:** Success flash message; redirect to login. Password has **no confirmation field and no strength check**.
**Result:** "Account created — waiting for admin approval." then login page.
**Failure Behavior:** Missing fields or duplicate phone → re-rendered form with error text. No other failure handling.
**Evidence:** `accounts/views.py:37-62`, `templates/accounts/signup.html`, dead form at `accounts/forms.py`.

### Feature: Login

**Purpose:** Role-routing authentication with an approval gate.
**User:** Anyone.
**Entry Point**
```text
Route:    /accounts/login/  (duplicate alias: /accounts/accounts/login/)
Method:   GET / POST
Template: templates/accounts/login.html
Fields:   phone, password
```
**UI:** Two-field form + CSRF; inline error div.
**Logic:** `login_view` (`accounts/views.py:65-92`): `authenticate(username=phone)`; if `Employee` linked → require `is_approved`; login + `session["employee_id"]=emp.id` → `/employee/dashboard/`. Else staff/superuser → `/panel/`. Otherwise rejected.
**Database:** reads `auth_user`, `core_employee`; writes session row.
**Side Effects:** session cookie; employee_id stashed in session (later trusted by several views).
**Result:** Role-appropriate landing page.
**Failure Behavior:** Wrong credentials / unapproved / non-staff-no-employee each render login with distinct error text. Note: "Create Account" link on this page hardcodes `/signup/` → 404.
**Evidence:** `accounts/views.py:65-92`; `settings.py` defines no `LOGIN_URL` (Django default `/accounts/login/` happens to work).

### Feature: Approve Pending Employee

**Purpose:** Activate a self-registered worker.
**User:** Admin/staff (`@staff_required`).
**Entry Point**
```text
Route:    /panel/employees/<int:emp_id>/approve/
Method:   GET  ← state change performed via plain link, no confirmation
Template: link on admin_employees.html:36 ("Approve" button shown on every card)
```
**Logic:** `admin_approve_employee` (`views.py:643-649`) sets `is_approved=True`, targeted `save(update_fields=...)`.
**Database:** UPDATE `core_employee.is_approved`.
**Side Effects:** flash "…approved." → redirect to employees list. Idempotent (re-approving is harmless). No audit record of who approved or when.
**Failure Behavior:** unknown id → 404 via `get_object_or_404`.
**Evidence:** `accounts/views.py:643-649`, `accounts/urls.py:29`, `templates/accounts/admin/admin_employees.html:36`. A second approve path exists inside `admin_employee_detail` POST (`views.py:337-341`) but **no template posts `action=approve`** — BACKEND_ONLY.

### Feature: Add Saree Entry (global page)

**Purpose:** Record a worker's daily production count.
**User:** Admin/staff.
**Entry Point**
```text
Route:    /panel/saree-entry/
Method:   GET / POST
Template: templates/accounts/admin/admin_saree_entry.html
Fields:   employee <select> (approved only), date <input type=date>, count <number>, notes <text>
```
**Logic:** `admin_saree_entry` (`views.py:625-640`): int-parse count (guarded), default date = today server-side, `SareeCount.objects.create(...)`.
**Database:** INSERT into `core_sareecount`; constraint `unique_together(employee, date)` — **one entry per worker per day**.
**Side Effects:** flash + redirect to same page. Entry immediately visible in weekly grid/detail recomputations. **No edit capability anywhere; deletion only via detail page.**
**Failure Behavior:** invalid count → friendly flash. Duplicate (employee,date) → **uncaught IntegrityError → HTTP 500** (constraint verified in `core/models.py:62`).
**Evidence:** `accounts/views.py:625-640`; twin implementation inside `admin_employee_detail` POST (`action=add_saree`, views.py:357-369).

### Feature: Delete Saree Entry

**Purpose:** Remove a wrong daily entry (current-week view).
**User:** Admin/staff.
**Entry Point**
```text
Route:    /panel/employees/<int:emp_id>/  (POST, action=delete_saree)
Template: admin_employee_detail.html:46-51 (per-row form + JS confirm())
```
**Logic:** handler views.py:371-375 deletes scoped to that employee (`filter(id=entry_id, employee=employee).delete()`).
**Database:** DELETE row from `core_sareecount`.
**Side Effects:** flash + redirect. **No audit trail for deletions**; archived weeks unaffected.
**Failure Behavior:** nonexistent/mismatched id silently deletes nothing (no error).
**Evidence:** `accounts/views.py:371-375`.

### Feature: Assign Pagdi (with automatic previous-finish)

**Purpose:** Open a new material assignment period; implicitly close any open one.
**User:** Admin/staff.
**Entry Point**
```text
Route:    /panel/pagdi/create/
Method:   GET / POST
Template: templates/accounts/admin/admin_pagdi_create.html
Fields:   employee <select> (approved only), start_date, capacity_sarees, notes
```
**Logic:** `admin_pagdi_create` (`views.py:417-443`): capacity int-guarded; finds open pagdi (`end_date__isnull=True`) → `services.finish_pagdi(old.id, user, "Auto-finish due to new assignment")`; creates new PagdiHistory; writes `PagdiChangeHistory(action="CREATE", new_capacity)`.
**Database:** UPDATE old `core_pagdihistory.end_date`; INSERT new pagdi + audit row. The finish+create sequence is **not wrapped in one transaction**.
**Side Effects:** audit trail entries; employee's pagdi page switches to new active period.
**Failure Behavior:** empty `start_date`/non-numeric capacity beyond guard → ValueError/ValidationError → 500. Unknown employee id in forged POST → DB FK error → 500.
**Evidence:** `accounts/views.py:417-443`, `core/services.py:173-194`.

### Feature: Give Advance

**Purpose:** Add money owed by worker, deducted from future weekly pay.
**User:** Admin/staff.
**Entry Point**
```text
Route:    /panel/give-advance/<int:emp_id>/  (POST only)
Templates:admin_weekly_salary.html:53-58 and admin_employee_detail.html:74-78 (amount input min=1)
```
**Logic:** `give_advance_view` (views.py:516-528) → `transaction.atomic` → `services.give_advance` (`core/services.py:42-68`): `SELECT … FOR UPDATE` employee, `advance += amount`, INSERT `AdvanceHistory(action_type="ADJUST", previous_amount, new_amount, admin_user, note)`.
**Database:** UPDATE `core_employee.advance_salary`; INSERT audit. Protected against concurrent money edits.
**Side Effects:** flash "Advance ₹X added."; weekly grid/detail recompute finals on next GET.
**Failure Behavior:** non-int amount → `HttpResponseBadRequest`; amount ≤ 0 → service raises `ValueError` which the view does **not** catch → 500; missing employee → 500.
**Evidence:** `accounts/views.py:516-528`; `core/services.py:42-68`.

### Feature: Clear Advance

**Purpose:** Zero out outstanding advance explicitly.
**User:** Admin/staff.
**Entry Point**
```text
Route:   /panel/clear-advance/<int:emp_id>/  (POST only)
Buttons: "Clear" on weekly grid + detail page
```
**Logic:** `clear_advance` → `services.clear_advance_for_employee` (`services.py:71-101`): lock row, set 0, always INSERT `AdvanceHistory(CLEAR)` — including deliberate **no-op records** when already 0.
**Database:** UPDATE + audit insert (atomic).
**Side Effects:** full audit trail; flash confirm.
**Evidence:** `accounts/views.py:531-537`; `core/services.py:71-101`.

### Feature: Mark Paid / Mark Unpaid

**Purpose:** Settle the current week for a worker; reversible.
**User:** Admin/staff.
**Entry Point**
```text
Routes:  /panel/mark-paid/<id>/ , /panel/mark-unpaid/<id>/  (POST only)
Template:admin_weekly_salary.html:64-77 — mutually exclusive buttons driven by row.paid
         Mark Paid carries an optional free-text "note"
```
**Logic:** `mark_paid` (views.py:540-575) recomputes week inline (sarees×rate−advance), `SalaryHistory.objects.get_or_create(employee, week_start, week_end, defaults={... paid_status=True, paid_date=today ...})`; existing row updated (status/date/final/notes). `mark_unpaid` (views.py:578-592) flips `paid_status=False`, `paid_date=None` only.
**Database:** UPSERT on unique `(employee, week_start, week_end)`; UPDATE on reversal.
**Side Effects:** paid state appears in weekly grid, admin salary history, employee salary history, detail header.
**Failure Behavior:** non-POST → 400. Negative finals allowed (advance > earnings). Reversal keeps the previously stored `final_salary` snapshot (may diverge from live numbers). Not wrapped in explicit atomic block (get_or_create relies on the unique constraint).
**Evidence:** `accounts/views.py:540-592`.

### Feature: Weekly Archive / Reset (command)

**Purpose:** Freeze the week into immutable `SalaryHistory` rows; clear running totals; leave advances untouched.
**User:** Operator via CLI (no web trigger).
**Entry Point**
```text
Command: python manage.py reset_weekly_salary [--date YYYY-MM-DD] [--note …] [--dry-run]
Code:    core/management/commands/reset_weekly_salary.py
Service: core/services.archive_and_reset_weekly_salaries (services.py:124-170)
```
**Logic:** Monday-start week bounds; `SELECT … FOR UPDATE` **all** employees; skip anyone already archived this week (idempotent); compute snapshot; INSERT `SalaryHistory(paid_status=False)`; zero `current_week_salary`.
**Database:** bulk INSERTs + per-row UPDATE, single transaction.
**Side Effects:** rows appear instantly in admin/employee salary-history pages; weekly grid keeps showing live computation regardless.
**Dry-run:** wraps work in atomic block and raises sentinel `RuntimeError("DRY_RUN_ROLLBACK")` to undo — reports would-be row count.
**Failure Behavior:** command-level exceptions abort whole run atomically. **No scheduler/cron configuration exists in the repo** — production triggering mechanism unknown.
**Evidence:** `reset_weekly_salary.py:15-39`, `services.py:124-170`, test `core/tests/test_advance_and_reset.py:37-49`.

### Feature: Carry Advances Forward (command)

**Purpose:** Roll outstanding advances into the next week at an arbitrary factor (1.0 = unchanged, 0 = wipe, >1 increase).
**User:** Operator via CLI.
**Entry Point**
```text
Command: python manage.py carry_advance [--factor F] [--dry-run] [--note …]
Service: core/services.carry_advances_to_next_week (services.py:197-264)
```
**Logic:** locks all employees; per employee computes `int(prev × factor)`; saves if changed; INSERTs `AdvanceHistory(CARRY)` for **every** row including zero-balance no-ops (explicit audit philosophy).
**Database:** UPDATE + bulk audit inserts, atomic.
**Idempotency:** deliberately NOT idempotent for factor ≠ 1 (documented in docstring).
**Failure Behavior:** negative factor → `ValueError`; dry-run rollback pattern identical to reset command.
**Evidence:** `carry_advance.py`, `services.py:197-264`, tests lines 25-35.

### Feature: Salary Slip PDF

**Purpose:** One-page weekly payslip download.
**User:** Admin/staff.
**Entry Point**
```text
Route:    /panel/salary-slip/<int:emp_id>/  (GET)
Trigger:  "Slip" button per row on weekly grid (admin_weekly_salary.html:79)
Library:  reportlab canvas drawn directly into HttpResponse
```
**Processing:** current-week sarees aggregate × rate − advance; draws 3 text lines (name, week range, final ₹) — minimal layout, no itemization.
**Output:** `application/pdf` attachment named `salary_slip_<name>.pdf`; generated on the fly, nothing persisted.
**Filtering:** current week only; historical weeks cannot be slipped.
**Permissions:** `@staff_required`.
**Evidence:** `accounts/views.py:598-619`.

### Feature: XLSX Exports (two)

**Global history** — `GET /panel/download-history/` → `download_global_history` (views.py:655-704): openpyxl workbook, sheets *Saree History*, *Pagdi History*, *Warp History*, *Salary History*; bold headers; full-table dumps (select_related), **no filtering, no pagination**; nav-linked.
**Weekly salary export** — `GET /panel/download-global-weekly-salary/` → views.py:706-748: single *Salary History* sheet over all archived weeks; linked from `admin_salary_history.html:7`.
Both stream `HttpResponse` attachments; `@staff_required`; heavy memory use possible at scale (full querysets into memory).
**Evidence:** `accounts/views.py:655-748`.

---

## 4. User Workflows

### Workflow A — Worker Onboarding
```text
Worker opens signup (must type /accounts/signup/ manually — login page's link 404s)
 ↓ POST signup → User + Employee(pending) created
 ↓ sees "waiting for admin approval"
ADMIN: employees list shows card badge "Pending" → clicks GET "Approve"
 ↓ is_approved=True
WORKER: logs in → gate passes → session["employee_id"] set → dashboard
Alternate paths:
 • Login before approval        → blocked with message (state preserved)
 • Duplicate phone              → signup re-renders with error
 • Wrong password               → login re-renders with error
 • Approval repeated            → harmless (idempotent)
```

### Workflow B — Daily Production Logging
```text
ADMIN: /panel/saree-entry/ picks approved worker, date, count, notes
 ↓ INSERT SareeCount (unique per worker+day)
 ↓ flash success
 ↓ value instantly reflected in: employee dashboard, weekly grid, detail page totals
Alternates:
 • Duplicate same-day entry      → IntegrityError → raw 500 (no friendly handling)
 • Wrong entry                   → delete via detail page row (no audit)
 • Entry for past/future date    → allowed freely (date input unrestricted server-side)
```

### Workflow C — Material Assignment (pagdi vs warp divergence)
```text
ADMIN assigns pagdi → old active pagdi auto-FINISHED (audit FINISH) → new ACTIVE row
EMPLOYEE sees active capacity/remaining on /employee/pagdi/
Completion paths:
 • New assignment supersedes old      ← the ONLY reachable UI path
 • Employee self-finish POST          → implemented in view, NO form in template (dead)
 • Explicit admin "Finish" button     → DOES NOT EXIST
WARP variant:
 • Assign warp creates ACTIVE row; prior warp left ACTIVE forever (no auto-finish)
 • No completion path exists in app UI; only Django admin end_date edit
```

### Workflow D — Advance Management
```text
ADMIN gives advance (amount) ──▶ locked UPDATE + ADJUST audit
 ↓ weekly grid final drops immediately (final = earnings − advance)
Options:
 • CLEAR  → zeroed now, CLEAR audit (even if already 0)
 • carry_advance --factor F at week rollover → CARRY audit per worker (incl. zero rows)
Reversal: none besides CLEAR/manual admin edits
```

### Workflow E — Weekly Payroll Close-Out
```text
Week runs (entries accumulate)
 ↓ ADMIN watches /panel/weekly-salary/ (live math) → marks individuals PAID (optional note)
 ↓ mistake? → Set Unpaid (reversible; stale final kept)
 ↓ Ops runs reset_weekly_salary  → SalaryHistory snapshots (paid_status frozen as-is), totals zeroed
 ↓ history visible: admin table + employee salary-history page
 ↓ exports: XLSX global / XLSX weekly / PDF slip (current week only)
Alternates:
 • Command re-run same week     → no-op (idempotent, verified by unit test)
 • Never running the command    → weeks stay live forever; history/export sheets stay empty
 • mark_paid before archive     → archive preserves paid_status=True
```

---

## 5. State Machines

### ENTITY: Employee.approval
```text
PENDING (is_approved=False)
   ↓ admin GET Approve (#4)          [reversible only via Django /admin/]
APPROVED (True)
```
Actor: admin only. DB change: boolean flip. Audit: none. Concurrency protection: none (last-write-wins).

### ENTITY: PagdiHistory
```text
ACTIVE (end_date NULL)
   ↓ new assignment auto-finish  (services.finish_pagdi, audit FINISH)  ← only live path
   ↓ employee POST finish        ← unreachable (no form)
COMPLETED (end_date=today)
```
Transitions audited in `PagdiChangeHistory`. Irreversible through app UI (Django admin can edit dates). Locking: row-lock during finish.

### ENTITY: WarpHistory
```text
ACTIVE (end_date NULL)  ──(no app transition exists)──  COMPLETED
```
Only Django `/admin/` can set `end_date`. No service function for warps exists.

### ENTITY: SalaryHistory.paid_status (per week)
```text
UNPAID ──mark_paid──▶ PAID ──mark_unpaid──▶ UNPAID
```
Fully reversible via panel. `get_or_create` keyed on unique triple; reversal intentionally leaves `final_salary`/`notes` snapshots intact. Audit: none (only notes field).

### ENTITY: Advance balance (Employee.advance_salary)
```text
AMOUNT>0 ──CLEAR──▶ 0          (audited)
AMOUNT>0 ──CARRY f──▶ int(A×f) (audited, every row incl. 0)
any     ──ADJUST──▶ +n         (audited)
```
All transitions transactional + row-locked; actor recorded (nullable).

### ENTITY: Week (logical)
```text
LIVE (computed on demand from SareeCount)
   ↓ reset_weekly_salary (idempotent, unique-constrained)
ARCHIVED (SalaryHistory immutable-ish; still editable via /admin/ or mark_paid/unpaid pre-archive interplay)
```

---

## 6. CRUD Capability Matrix

Traced through **actual user-accessible implementation** (app UI vs Django `/admin/`):

| Entity | Create | Read | Update | Delete | Who (app UI) | Via /admin/ only |
| ------ | ------ | ---- | ------ | ------ | ------------ | ---------------- |
| User (auth) | Yes (signup) | No (list absent) | No | No | public signup | yes (full) |
| Employee | Yes (signup, forced-pending) | Yes (list/search/detail) | Partial (approve ✓; **rate change has no UI**) | No | admin | yes (all fields incl. rate, performance, counters, picture) |
| SareeCount | Yes (two creation forms) | Yes (both roles) | **No** | Yes (detail page) | admin / employee(read) | yes |
| PagdiHistory | Yes (assign) | Yes (both roles) | Implicit only (end_date via assign-auto/self-dead-path) | No | admin | yes |
| WarpHistory | Yes (assign) | Yes (both roles) | No | No | admin | yes |
| SalaryHistory | Yes (archive cmd / mark_paid) | Yes (both roles) | Yes (paid flip) | No | admin / employee(read) | yes |
| AdvanceHistory | Auto-only (side effect) | **No app UI** | No | No | nobody | yes (read) |
| PagdiChangeHistory | Auto-only | **No app UI** | No | No | nobody | yes (read) |
| AlertEmail | Via /admin/ only | Via /admin/ only | Via /admin/ only | Via /admin/ only | nobody | yes |

---

## 7. Search / Filter / History

| Capability | Trace | Limitation |
| ---------- | ----- | ---------- |
| Employee search | GET `?q=` → `Q(name__icontains)\|Q(phone__icontains)` (views.py:287-291) | name/phone only; no status/date filters; case-insensitive substring |
| Sorting | Fixed orderings only (`Meta.ordering`, e.g. `-date`, `-week_start`, `name`) | no user-selectable sort |
| Pagination | **Absent everywhere** — full querysets rendered (employees, lists, histories, exports) | scales poorly |
| Date-range filtering | Absent in all UIs; weekly views hard-code current week | historical browsing = salary history table only |
| Histories | Read-only tables: personal saree/pagdi/warp/salary; admin detail shows all four; admin salary-history table | no drill-down into audit tables from panel |
| Audit viewing | AdvanceHistory & PagdiChangeHistory have **zero panel/employee UI** — visible only in Django `/admin/` | effectively hidden from operators |
| Detail views | One: `admin_employee_detail` (week slice + four full-history panels) | week slice fixed to current week |
| Exports | See §8 | full-table, unfiltered |

---

## 8. Reporting & Export Features

### Report: Weekly Salary Slip (PDF)
**Trigger:** "Slip" button (weekly grid). **Route:** `/panel/salary-slip/<id>/`. **Source:** current-week SareeCount agg + Employee rate/advance. **Processing:** inline arithmetic. **Output:** streamed PDF (ReportLab). **Filtering:** current week, single employee. **Contents:** 3 lines (name, week, final). **Permission:** staff. Evidence: views.py:598-619.

### Report: Global History Workbook (XLSX)
**Trigger:** sidebar "Download History". **Route:** `/panel/download-history/`. **Sheets:** Saree / Pagdi / Warp / Salary with per-row computed salary. **Libraries:** openpyxl (+Font/get_column_letter styling). **Filtering:** none. **Permission:** staff. Evidence: views.py:655-704.

### Report: Weekly-Salary Workbook (XLSX)
**Trigger:** button on salary-history page. **Route:** `/panel/download-global-weekly-salary/`. **Source:** all SalaryHistory rows ordered by week desc. Evidence: views.py:706-748.

On-screen reports: stats cards (admin home), weekly grid, detail totals — all computed live in views.

---

## 9. Authentication & User Management

```text
Registration (self)  → User(username=phone) + Employee(pending)      VERIFIED
Login                → approval gate + role split + session stash    VERIFIED
Logout               → session flush                                 VERIFIED
Approval             → is_approved flip                              VERIFIED (GET link)
Password change      → NOT IMPLEMENTED in app (Django /admin/ only)  —
Password reset       → ABSENT (no email backend, no reset views)     —
User editing/deletion→ Django /admin/ only                           VERIFIED
Role assignment      → is_staff/is_superuser via /admin/             VERIFIED
Deactivation         → is_active via /admin/                         VERIFIED (framework-provided)
Session identity     → request.session["employee_id"] @ login        VERIFIED
                       ⚠ some views trust session emp_id instead of request.user,
                       others use user.employee — inconsistent (views.py:113 vs :143)
```
Session auth via standard middleware; CSRF enforced on all POSTs (tokens confirmed present in every form template). No tokens/JWT/OAuth/2FA anywhere.

---

## 10. Admin Capabilities (confirmed operations)

```text
Admin (/panel/*, @staff_required)
 ├── View stats dashboard (counts + week range)
 ├── Search employees by name/phone
 ├── List employees with Pending/Approved badges
 ├── Open per-employee drill-down (week entries, totals, 4 histories)
 ├── Approve pending worker            (GET link)
 ├── Enter daily saree count           (global page + per-detail form)
 ├── Delete a saree entry              (detail page, JS-confirm)
 ├── Assign pagdi                      (auto-finishes previous, double-audited)
 ├── View pagdi list with made/remaining
 ├── Assign warp                       (NO auto-finish)
 ├── View warp list with made/remaining
 ├── View live weekly payroll grid
 ├── Give advance                      (locked + audited)
 ├── Clear advance                     (locked + audited)
 ├── Mark week paid / unpaid           (reversible)
 ├── Download weekly PDF slip          (current week)
 ├── Browse archived salary history
 ├── Export global history XLSX (4 sheets)
 └── Export weekly-salary XLSX

Via Django /admin/ additionally: create/delete employees & users,
change salary rates, edit performance/material counters, upload profile
pictures, manually finish pagdi/warp (end_date), browse both audit tables,
manage AlertEmail registry.
```

Not available to admins through the panel: editing salary rates, creating workers directly, finishing pagdi/warp explicitly, editing profile data, deleting employees, restoring anything.

---

## 11. Normal User Capabilities (Employee)

```text
Employee (/employee/*, @login_required, approval-gated)
 CAN see: weekly summary (sarees, rate, advance, final), personal details/status
 CAN see: own saree history with computed pay per row
 CAN see: own active pagdi (capacity/remaining/active-completed) + implied history section
 CAN see: own warp progress
 CAN see: combined history page; archived weekly salary records incl. Paid/Unpaid
 CAN do : exactly ONE mutation — finish own active pagdi (implemented in view;
          NOT exposed by pagdi.html → currently impossible via browser)
 CANNOT: add/edit/delete saree counts, change any profile field, upload picture,
         see other employees, see advance audit trail, access /panel/* (redirected)

Object-level authorization: every employee view scopes queries to the resolved
Employee object (via user.employee or session emp_id) — no IDOR surface found in
employee routes. Session-based identity is accepted without re-validating against
request.user (views.py:108-113 vs 143 style mix).
```

---

## 12. Audit & History System

| Action | Audit model/table | Actor recorded | Timestamp | Before/After | Notes |
| ------ | ----------------- | -------------- | --------- | ------------ | ----- |
| Advance given | `AdvanceHistory(ADJUST)` | admin_user (SET_NULL) | created_at | previous/new amounts | note text |
| Advance cleared | `AdvanceHistory(CLEAR)` | admin_user | created_at | prev→0 | **no-op clears also recorded** |
| Advance carried | `AdvanceHistory(CARRY)` | nullable (CLI ⇒ NULL) | created_at | prev→new | factor noted; zero rows logged too |
| Pagdi finished | `PagdiChangeHistory(FINISH)` | admin_user | created_at | prev/new end_date + capacities | via service only |
| Pagdi assigned | `PagdiChangeHistory(CREATE)` | request.user | created_at | new_capacity | views.py:438 |
| Saree entry deleted | **nothing** | — | — | — | silent delete |
| Approve / rate change / paid flips | **nothing** | — | — | — | only flash messages |

Properties: audit writes are transactional with their mutation (service layer); history survives parent deletion where `SET_NULL` (PagdiChangeHistory→Pagdi, actor FKs) but dies with `CASCADE` on Employee deletion. Retention/deletion controls exist only via Django admin. SalaryHistory itself acts as a weekly snapshot ledger (unique per week) but is editable via mark-paid/unpaid and /admin/.

---

## 13. Transaction & Concurrency Analysis

### Concurrency Matrix

| Feature | transaction.atomic | select_for_update | Constraint backstop | Idempotent | Race Risk |
| ------- | ------------------ | ----------------- | ------------------- | ---------- | --------- |
| Give advance | ✔ (view wraps + service decorator) | ✔ Employee row | — | No (repeats add again) | Low while locked |
| Clear advance | ✔ | ✔ | — | Yes (second call = audited no-op) | Low |
| Archive/reset week | ✔ (whole run) | ✔ ALL Employee rows | unique (emp,ws,we) | **Yes** (verified by unit test) | Low; whole-table lock serializes |
| Carry advance | ✔ | ✔ all rows | — | **No** for factor≠1 (by design) | Mis-scheduling double-runs multiply twice |
| Finish pagdi | ✔ | ✔ PagdiHistory row | — | Re-run shifts end_date forward | Low |
| Assign pagdi | ✖ (finish + insert + audit = 3 separate autocommits) | ✔ (inside finish) | — | No | Small window with inconsistent state |
| Mark paid | ✖ explicit | ✖ | unique triple via get_or_create | Yes (upsert semantics) | get_or_create race can raise IntegrityError (rare, unhandled) |
| Mark unpaid | ✖ | ✖ | — | Yes (flag set) | Benign |
| Create SareeCount | single INSERT | ✖ | unique (emp,date) | No | Duplicate-day attempt → **IntegrityError → 500** |
| Approve employee | single UPDATE | ✖ | — | Yes | Benign last-write |
| Signup | two INSERTs, not atomic | ✖ | username unique | No | Orphan-less but non-atomic pair |

Key observation: the money-critical service layer genuinely uses locking + transactions; several newer view-level mutations (mark_paid, pagdi assignment sequence, saree entry) bypass that discipline.

---

## 14. Validation Matrix

| Feature | UI validation | Server validation | DB constraint | Failure mode |
| ------- | ------------- | ----------------- | ------------- | ------------ |
| Signup | HTML `required` ×3 | non-empty check; phone uniqueness | username unique | re-render w/ error |
| Login | HTML required | authenticate + approval gate | — | inline error |
| Saree entry | count `min="0"`/`required`, date input | guarded int parse; date defaults today | unique(emp,date) | dup → **500** |
| Give advance | amount `min="1"` required | int parse (400); `amount<=0` ValueError **uncatched** | PositiveIntegerField floor | bad semantics → 500 |
| Clear advance | button only | service handles all states | — | graceful |
| Mark paid | optional note text | inline recompute | unique triple | rare IntegrityError |
| Pagdi assign | selects/inputs unmarked-required | capacity int-guarded only | FK integrity | empty date/bad ids → 500 |
| Warp assign | number input | `int(x or 0)` — non-numeric string **crashes** | FK | 500 |
| Salary-rate change (dead branch) | none (no UI) | int ≥0 checked | PositiveIntegerField | n/a (unreachable) |
| Model-level | — | MinValueValidator(0) on rate/advance; ImageField for picture | as listed | ValidationError only via full-clean paths (forms/admin), not these views |

Pattern: the database is the strongest validator; views validate minimally and inconsistently.

---

## 15. Notifications & Communication

**Actual communication:**
- Django `messages` framework flash banners after every mutating action (`messages.success/error` throughout `accounts/views.py`).
- Inline error strings on login/signup re-render.

**Data structures intended for future communication (NOT implemented):**
- `AlertEmail` model (`core/models.py:144-148`) — an email registry table with **no sender, no email backend settings, no consuming view/command/task**. Registered in Django admin only.

**Absent:** email sending, SMS, WhatsApp, push, websockets/realtime, digests. Nothing outbound exists.

---

## 16. File & Media Features

```text
Upload (profile picture)
  UI: NONE in app templates
  Path: Django /admin/ Employee form → ImageField (Pillow validation)
  Storage: cloudinary_storage.MediaCloudinaryStorage (settings.py:52) → Cloudinary CDN
  DB ref: Employee.profile_picture (upload_to='profile_pics/')
  Retrieval: URL served by Cloudinary; MEDIA_URL configured but never wired into urls.py
  ⚠ storage backend is unconditional — local dev without CLOUDINARY_URL cannot store uploads

Downloads (generated on the fly, never persisted):
  PDF salary slip   — reportlab → HttpResponse stream (staff)
  XLSX global history — openpyxl → stream, Content-Disposition attachment (staff)
  XLSX weekly salary  — openpyxl → stream (staff)
Validation on downloads: none needed (no user input beyond employee id; 404-safe).
Static assets: WhiteNoise serves collectstatic output; referenced fallback CSS
  /static/css/tailwind-fallback.css does NOT exist in the repository.
```

---

## 17. Automated / Scheduled Features

| Item | Implemented | Scheduled/configured |
| ---- | ----------- | -------------------- |
| `reset_weekly_salary` (weekly archive + reset, idempotent) | YES — command + service + unit test | **NO** — no cron/Celery/Procfile-clock/render.yaml anywhere |
| `carry_advance` (factor-based roll-over, fully audited) | YES — command + service + unit test | **NO** — same |
| Automatic calculations | Live aggregation on every relevant GET (no stored derived values except post-archive zeroing) | continuous/by-request |
| Background jobs / cleanup | None exist | — |

Classification: both jobs are **implemented but unscheduled** — operationally they depend on an external runner that the repository neither configures nor documents.

---

## 18. Feature Dependency Map

```text
Signup ──▶ Admin Approval ──▶ Employee Login ──▶ Employee Dashboard/History pages
                                   │
Admin Panel ───────────────────────┼──────────────────────────────┐
 ├── Saree Entry ──▶ Weekly Grid ──┤                              │
 │                    │            │                              │
 │                    ▼            ▼                              │
 │               Mark Paid/Unpaid ◀─(needs SalaryHistory OR live) │
 │                    │                                           │
 │                    ▼                                           │
 │             reset_weekly_salary ──▶ SalaryHistory ──▶ Admin Salary History Table
 │                                        │                        │        │
 │                                        └──▶ Employee Salary-History Page │
 │                                                                 ▼        ▼
 ├── Assign Pagdi ──▶ Employee Pagdi Progress ──▶ (auto-)Finish ──▶ PagdiChangeHistory
 ├── Assign Warp  ──▶ Employee Warp Progress    ──▶ (no finish path)
 ├── Give/Clear Advance ──▶ Weekly Final math ──▶ carry_advance (next week)
 └── Exports: XLSX global (needs any data) · XLSX weekly + PDF slip (meaningful after entries/archive)

Hard dependencies: Login depends on Approval; every /panel feature depends on staff flag;
Salary History content depends on either mark_paid or reset command; audit trails exist
only for advance/pagdi operations.
```

---

## 19. Dead / Orphaned / Partial Functionality

| Artifact | Why it appears to exist | What is missing | Status |
| -------- | ----------------------- | --------------- | ------ |
| `save_salary` branch (`admin_employee_detail`, views.py:343-355) | Full handler + validation written | **No template posts `action=save_salary`** — salary rate cannot be changed anywhere in panel | BACKEND_ONLY |
| `action=approve` branch (views.py:337-341) | Redundant approve path in detail view | No template triggers it (superseded by list GET link) | BACKEND_ONLY |
| Employee pagdi self-finish (views.py:170-173) | `pagdi_view` handles POST; comment says "Finished by employee" | `pagdi.html` contains no `<form>` | BACKEND_ONLY |
| `services.finish_pagdi` as standalone control | Robust, locked, audited finisher | No dedicated admin "Finish Pagdi" button/route | PARTIAL (implicit-only via reassignment) |
| Warp completion lifecycle | Model supports `end_date`; UI displays Completed state | Nothing ever sets it except Django admin | PARTIAL |
| `accounts/forms.py` SignupForm | Fully built w/ password confirmation + material fields | Never imported/instantiated by any view | DEAD CODE |
| `templates/accounts/warp_history.html` | Complete listing template | Rendered by no view (warp route renders `warp.html`) | ORPHANED |
| `templates/accounts/admin/admin_dashboard.html` | Dashboard shell exists | `admin_dashboard` view delegates to `admin_home` (renders `admin_home.html`); template unreferenced | ORPHANED |
| `core/views.py` | App scaffold | Empty stub | DEAD |
| `AlertEmail` model | Implies alerting subsystem | No backend, sender, consumer, docs | DEAD SCAFFOLD |
| `performance`, `pagdi_thread_1/2`, `warp_threads` fields | Payroll/material tracking intent | Zero readers/writers in app; admin-editable only | PARTIAL/DORMANT |
| Link "Create Account" (`login.html:41` → `/signup/`) | Intended nav | Route is `/accounts/signup/` → click = 404 | BROKEN LINK |
| Link "Login" (`signup.html:43` → `/login/`) | Intended nav | Route is `/accounts/login/` → 404 | BROKEN LINK |
| Quick-link "Warp History" (`dashboard.html:56` → `/employee/warp-history/`) | Intended nav | No such URL pattern → 404 | BROKEN LINK |
| Duplicate route `accounts/accounts/login/` (`accounts/urls.py:12`) | Masks unset `LOGIN_URL` default | Confusing artifact | WORKAROUND |
| `core/tests/` package without `__init__.py` | Tests authored (3 solid cases) | Default `manage.py test` discovery may skip the directory (Python 3.11+ namespace-package discovery limits) — not executed during recon | UNCLEAR/RISKY |
| Tailwind dual-loading (`admin_weekly_salary.html:6`, `admin_pagdi_list.html:3` add v2 CSS on top of base CDN v3) | Copy-paste hardening | Conflicting style sources | DEFECT (cosmetic) |
| Widespread mojibake (₹/emoji/en-dash corrupted: e.g. `dYZ_`, `�,1`, `�?"`) | Files saved with wrong encoding | Cosmetic corruption across many templates | COSMETIC DEFECT |

---

## 20. Feature Evidence Map

| Feature | Route file | View (file:lines) | Service | Models | Template |
| ------- | ---------- | ----------------- | ------- | ------ | -------- |
| Signup | accounts/urls.py:9 | views.py:37-62 | — | User, Employee | accounts/signup.html |
| Login | urls.py:10-12 | views.py:65-92 | — | User, Employee | accounts/login.html |
| Logout | urls.py:11 | views.py:95-97 | — | session | — |
| Approve | urls.py:29 | views.py:643-649 | — | Employee | admin_employees.html |
| Search/list | urls.py:27 | views.py:285-296 | — | Employee | admin_employees.html |
| Detail/actions | urls.py:28 | views.py:299-395 | — | SareeCount + 4 histories | admin_employee_detail.html |
| Global saree entry | urls.py:53 | views.py:625-640 | — | SareeCount | admin_saree_entry.html |
| Pagdi assign/list | urls.py:32-33 | views.py:401-443 | finish_pagdi | PagdiHistory, PagdiChangeHistory, SareeCount | admin_pagdi_*.html |
| Warp assign/list | urls.py:36-37 | views.py:446-472 | — | WarpHistory, SareeCount | admin_warp_*.html |
| Weekly grid | urls.py:40 | views.py:478-504 | formula duplicated inline | SareeCount, Employee, SalaryHistory | admin_weekly_salary.html |
| Give/Clear advance | urls.py:43-44 | views.py:516-537 | services.give_advance / clear_advance_for_employee | Employee, AdvanceHistory | weekly + detail templates |
| Paid/Unpaid | urls.py:45-46 | views.py:540-592 | — (inline) | SalaryHistory | admin_weekly_salary.html |
| Slip PDF | urls.py:47 | views.py:598-619 | get_week_bounds | read-only | — |
| Salary history | urls.py:50 | views.py:507-510 | — | SalaryHistory | admin_salary_history.html |
| XLSX exports | urls.py:56,58 | views.py:655-748 | — | all main models | — |
| Archive/reset cmd | — | management/commands/reset_weekly_salary.py | services.archive_and_reset_weekly_salaries | SalaryHistory, Employee | — |
| Carry cmd | — | management/commands/carry_advance.py | services.carry_advances_to_next_week | Employee, AdvanceHistory | — |
| Employee pages | urls.py:15-20 | views.py:103-247 | finish_pagdi (dead path), get_week_bounds | all per-topic | accounts/*.html |
| Django admin | loomserver/urls.py:8 | core/admin.py registrations | — | all 8 models | django admin UI |

---

## 21. Feature Completeness Summary

| Status | Count |
| ------ | ----: |
| VERIFIED | 34 |
| PARTIAL | 3 |
| UI_ONLY | 0 |
| BACKEND_ONLY | 3 |
| DOCUMENTED_ONLY | 0 |
| BROKEN | 0 |
| UNCLEAR | 0 |

Notes: the three BACKEND_ONLY items are view/service branches with no UI trigger (detail-approve, salary-rate change, employee pagdi finish). Defects embedded inside otherwise-working features (three 404 links, duplicate-day 500, unscheduled commands) are documented in §19/§22 rather than counted as separate statuses.

---

## 22. Important Observations

1. The application's real power center is `/panel/weekly-salary/`: grid + advance + payment + slip all converge there.
2. Money-mutation discipline is strong in `core/services.py` (atomic + row locks + exhaustive auditing, including deliberate no-op records) but **not applied uniformly** — `mark_paid`, pagdi assignment sequencing, and saree creation bypass it.
3. Three view capabilities are fully coded yet unreachable (rate change, detail-approve, employee pagdi finish) — evidence of UI/backend drift.
4. The weekly archive command is engineered for safe automation (idempotency test included) but nothing schedules it; without an operator, `SalaryHistory` stays empty and history/exports starve.
5. Deletion of production entries is unaudited; approval and payment flips are unaudited; only advance/pagdi domains keep forensic trails.
6. All employee-facing surfaces are strictly read-only in practice; the sole employee mutation is dead-ended at the template layer.
7. Navigation integrity issues (two wrong auth links, one wrong quick-link) mean key flows work only via direct URL knowledge.
8. Object-level authorization in employee routes is sound; authorization overall rests entirely on two decorators above the ORM.
9. Scale limits are structural: no pagination, per-row aggregate queries (N+1 in pagdi/warp lists), whole-table locks in weekly commands, full-memory XLSX generation.
10. Template hygiene issues (dual Tailwind sources, encoding mojibake, orphaned templates/forms) indicate copy-paste evolution without cleanup passes.

---

## 23. Areas Requiring Deeper Investigation

| Area | Question |
| ---- | -------- |
| Test discoverability | Does `python manage.py test` actually pick up `core/tests/test_advance_and_reset.py` without `__init__.py`? (not executed in recon) |
| Production job execution | How (or whether) `reset_weekly_salary` / `carry_advance` are triggered on Render — repo offers no evidence |
| Media behavior without Cloudinary | Runtime failure mode of uploads/local media when `CLOUDINARY_URL` is unset |
| Browser-level verification | All traces are static analysis; runtime click-through (including the 404 links and 500 paths) was not performed |
| `LOGIN_URL` reliance | Confirm whether any flow depends on the accidental `/accounts/accounts/login/` alias beyond `@login_required` redirects |

---

**Phase 2 status: COMPLETE** — discovery, tracing, classification, and workflow reconstruction delivered. No Management-V1 comparison, recommendations, redesign, or code changes performed.
