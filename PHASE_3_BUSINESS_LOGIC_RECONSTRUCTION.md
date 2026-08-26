# Phase 3 — Business Workflow & Logic Reconstruction

Companion to `PHASE_1_REPOSITORY_RECONNAISSANCE.md` and `PHASE_2_FEATURE_DISCOVERY.md`.
Scope: what business processes ServerLoom (`serverloom-main/`, Django 5.2.8) **actually implements**, the rules governing them, how state moves, and what assumptions are embedded in the code. No comparison, redesign, or recommendations — reconstruction only.

Evidence paths are relative to the inner repo root (`serverloom-main/serverloom-main/`). All source files were read in full during this phase: `core/services.py`, `core/models.py`, `accounts/views.py`, both management commands, tests, settings, and key templates.

Classification legend used throughout:

- **CONFIRMED** — clearly expressed by UI text / docstrings / business terminology and implemented.
- **IMPL** — implementation rule: enforced by code but not confirmed as a stated business requirement.
- **INFERRED** — strongly implied by multiple implementation details, not explicitly established.
- **UNCLEAR** — insufficient evidence.

---

## 1. Executive Summary

ServerLoom runs the payroll of a piece-rate saree workshop around one central quantity:

```text
Weekly Final Salary = (sarees entered during Mon–Sun week × worker's per-saree rate) − outstanding advance
```

The system's real business processes are: onboarding workers behind an admin approval gate; recording daily production counts (admin-entered only); assigning two kinds of material work (pagdi, warp) with capacity tracking; managing a persistent advance balance that is deducted from every week until cleared or scaled down by an operator command; settling each week as Paid/Unpaid; freezing weeks into a snapshot ledger via a CLI archive command; and exporting slips/workbooks.

Key structural facts of the business logic:

- **One canonical formula, six live implementations.** A service function exists (`core/services.py:104`) but five views re-implement the same math inline (`accounts/views.py:122`, `:324`, `:488`, `:550`, `:607`), plus per-row variants elsewhere.
- **Advances are the only fully audited money domain.** Every give/clear/carry writes a before→after audit row inside the same transaction as the mutation, including deliberate no-op records (`core/services.py:60-67`, `:81-89`, `:230-237`).
- **Payment status is a reversible flag on a weekly snapshot row**, not a ledger; reversal intentionally keeps the stale amount snapshot (`accounts/views.py:578-592`).
- **The week never ends by itself.** Archive/reset is an operator CLI command (idempotent, whole-workforce transaction). Nothing schedules it — if nobody runs it, no history ever exists.
- **Pagdi lifecycle completes only implicitly** (assigning a new pagdi auto-finishes the old); warp has **no completion path at all** inside the app — both divergences are implementation facts, not documented policy.
- **Production deletion, approval, payment flips, and rate changes leave no audit trail.**
- The full outstanding advance hits **every** week's pay until explicitly cleared or reduced — there is no partial-installment logic anywhere.

---

## 2. Business Domain Map

Domains derived from actual behavior (not folder names):

### Domain: Workforce & Access Control

- **Purpose:** Register workers, gate their access behind admin approval, split employee vs staff experiences.
- **Actors:** Visitor (self-signup), Admin (approval), Employee (login/use).
- **Main entities:** `auth_user`, `Employee.is_approved`.
- **Rules:** Phone = username; signup always creates *pending* accounts; pending accounts cannot log in; staff bypass to panel.
- **Inputs:** name, phone, password. **Outputs:** active/pending Employee identity + session.
- **Dependencies:** Everything else requires login; production/material/payroll screens require approval.

### Domain: Production Tracking

- **Purpose:** Record daily saree output per worker — the sole earnings input.
- **Actors:** Admin only (employees are read-only by explicit design comments, `views.py:105-107`, `:140`).
- **Main entities:** `SareeCount(employee, date, count, notes)` — unique `(employee, date)`.
- **Rules:** One entry per worker per day (DB constraint); any date allowed (past/future unrestricted); entries deletable but not editable; deletion unaudited.
- **Outputs:** aggregates consumed by payroll grid, dashboards, material progress, archives.

### Domain: Pagdi Material Assignment

- **Purpose:** Give a worker a batch of decorative-band work with a saree capacity; track progress to capacity.
- **Actors:** Admin assigns; employee views own progress; completion implicit via reassignment.
- **Main entities:** `PagdiHistory(start, end=NULL⇒active, capacity_sarees)`; audit `PagdiChangeHistory(CREATE/FINISH)`.
- **Rules:** New assignment auto-finishes the open one; progress = all sarees since start_date (not material-specific); remaining clamped ≥0 in UI.

### Domain: Warp Material Assignment

- **Purpose:** Same pattern for warp-thread work.
- **Divergence from pagdi:** no auto-finish, no finish action, start_date forced to today; multiple concurrent open warps possible; completion only via Django `/admin/`.

### Domain: Advances

- **Purpose:** Track money owed by the worker, recovered through future pay.
- **Actors:** Admin (give/clear), Operator CLI (carry).
- **Main entities:** `Employee.advance_salary` (live balance); `AdvanceHistory` (ADJUST/CLEAR/CARRY audit).
- **Rules:** Additive give; explicit clear to zero (audited even when already 0); carry multiplies balance by factor at rollover; balance persists across archives; deducted **in full** every week.

### Domain: Live Payroll Computation

- **Purpose:** Show current-week pay everywhere it is needed.
- **Entities:** none stored — computed on demand from SareeCount aggregate × current rate − current advance.
- **Rules:** Always current rate/current advance (retroactive within live week); negative finals allowed.

### Domain: Payment Settlement

- **Purpose:** Record that a worker's week was paid out.
- **Entities:** `SalaryHistory.paid_status / paid_date / final_salary / notes`.
- **Rules:** Mark-paid creates-or-updates the week's snapshot row with paid=True + today's date + freshly recomputed final; mark-unpaid flips flag/date only, keeps stale amounts; reversible toggle.

### Domain: Weekly Payroll Archiving

- **Purpose:** Freeze a finished week into immutable-ish history and reset running state.
- **Actor:** Operator via CLI (`reset_weekly_salary`), dry-run supported.
- **Entities:** `SalaryHistory` rows (unique per employee+week), `Employee.current_week_salary` zeroed.
- **Rules:** Idempotent per week; skips employees already having a row (including mid-week mark-paid rows); advances untouched; creates rows for **all** employees including zero-production ones.

### Domain: Reporting & Exports

- **Purpose:** PDF payslip (current week), XLSX global history (4 sheets), XLSX salary-history dump.
- **Actor:** Admin. Read-only, streamed, nothing persisted.

### Domain: Audit History

- **Purpose:** Forensic trail for advances and pagdi lifecycle only.
- **Entities:** `AdvanceHistory`, `PagdiChangeHistory`. No app-facing UI — visible only in Django `/admin/`.

### Domain: Administration (out-of-app)

Django `/admin/` is the only interface for: salary-rate changes, employee creation/deletion, profile pictures, performance/thread counters, warp completion, un-approval, and reading audit tables.

---

## 3. Major End-to-End Workflows

### Workflow 1 — Worker Onboarding & Activation

**Business Purpose:** Bring a new piece-rate worker onto the books with controlled activation.

**Actors:** Visitor → Admin → Worker.

**Preconditions:** Phone number not already registered.

**Main Flow:**

```text
Worker opens /accounts/signup/ manually (nav links between login/signup are broken)
 ↓ POST name+phone+password
System: validates non-empty + phone uniqueness → INSERT auth_user(username=phone) + Employee(is_approved=False, rate=0, advance=0)
Worker sees "waiting for admin approval" → blocked at login meanwhile
 ↓
Admin sees "Pending" card on /panel/employees/ → clicks GET Approve link
 ↓
UPDATE core_employee.is_approved=True (no audit, idempotent)
 ↓
Worker logs in → gate passes → session["employee_id"] set → /employee/dashboard/
```

**Alternate Flows (actual behavior):**
- Duplicate phone → form re-render with error (`views.py:46-47`).
- Login before approval → rejected "Account not approved yet." (`views.py:78-79`).
- Repeat approve → harmless boolean flip (`views.py:643-649`).
- Missing fields → re-render with error. No password confirmation/strength check (the built `SignupForm` is dead code).

**Final State:** Approved Employee able to log in and see read-only pages; appears in assignment dropdowns.

**Reversal:** None in app (no deactivate/unapprove in panel; Django `/admin/` can flip `is_active`/`is_approved`).

**Evidence:** `accounts/views.py:37-97`; route `accounts/urls.py`; templates `signup.html`, `login.html`, `admin_employees.html`.

---

### Workflow 2 — Daily Production Logging

**Business Purpose:** Capture each worker's daily output so pay can be computed.

**Actors:** Admin (entry + delete); effects visible to worker.

**Preconditions:** Employee exists (dropdown shows approved employees for global page, `views.py:627`); detail-page form works for any listed employee.

**Main Flow:**

```text
Admin POST /panel/saree-entry/ (or hidden add_saree form on detail page): employee, date, count, notes
 ↓ guarded int-parse of count; date defaults to server-today if empty
INSERT SareeCount  ← unique(employee,date) enforced
 ↓ flash success
Value immediately reflected in: employee dashboard, weekly grid, detail totals, material progress, future archive
```

**Alternate Flows:**
- Duplicate same-day entry → **unhandled IntegrityError → HTTP 500** (`views.py:367`, `:637`; constraint `models.py:62`). No friendly message; retry with another date required.
- Invalid count → friendly flash error.
- Wrong entry → delete via detail-page row form (`views.py:371-375`): hard DELETE scoped to that employee, JS confirm, **no audit record**, silent no-op if id mismatched.
- Past/future dates accepted freely (server does not restrict).

**Final State:** Permanent-looking production record feeding every downstream computation.

**Failure semantics:** single INSERT autocommit; no partial-failure window.

**Evidence:** `accounts/views.py:357-375`, `:625-640`; `core/models.py:51-71`.

---

### Workflow 3 — Pagdi Assignment & Completion

**Business Purpose:** Hand a worker a bounded batch of band-weaving work and track completion against capacity.

**Actors:** Admin (assign), Employee (view own progress).

**Preconditions:** Approved employees selectable (`views.py:419`).

**Main Flow:**

```text
Admin POST /panel/pagdi/create/: employee, start_date, capacity_sarees, notes
 ↓ capacity int-guarded
IF an open pagdi exists (end_date IS NULL):
    services.finish_pagdi(old.id)   [atomic + row lock]
      → end_date = today; PagdiChangeHistory(FINISH, prev/new end dates, capacities, actor, note)
 ↓ (separate autocommit)
INSERT PagdiHistory(start, capacity, notes)          ← new ACTIVE row
 ↓ (separate autocommit)
INSERT PagdiChangeHistory(action="CREATE", new_capacity, actor)
 ↓
Employee's /employee/pagdi/ now shows new active period:
    made = Σ sarees since start_date (no upper bound)
    remaining = max(0, capacity − made)
```

**Alternate Flows:**
- Non-integer capacity → friendly error redirect (`views.py:424-428`).
- Empty `start_date` or unknown/forged employee id → ValueError/FK error → **500**.
- Two admins assign concurrently → check-then-act race: both may see the same open pagdi; outcome can be **two ACTIVE pagdis** for one worker (no lock spans the sequence, no uniqueness constraint).
- Finish+create+audit run as **three separate transactions** — crash between them leaves old pagdi finished with no replacement, or new pagdi without CREATE audit.

**Completion paths (actual reachability):**
1. Auto-finish by new assignment — the ONLY reachable UI path.
2. Employee self-finish POST — implemented (`views.py:170-173` calls the same service, note "Finished by employee") but `pagdi.html` contains **no form** → unreachable.
3. Explicit standalone "Finish" button — does not exist.

**Final State:** Exactly one active pagdi under normal operation; full CREATE/FINISH audit chain survives pagdi deletion (SET_NULL FK).

**Reversal:** None in app (end_date edits only via Django `/admin/`).

**Evidence:** `accounts/views.py:417-443`; `core/services.py:173-194`; `core/models.py:111-137`, `:215-235`.

---

### Workflow 4 — Warp Assignment (incomplete lifecycle)

**Business Purpose:** Assign warp-thread work batches (parallel to pagdi).

**Main Flow:**

```text
Admin POST /panel/warp/create/: employee, capacity (start_date forced to server-today)
 ↓ UNGUARDED int(request.POST.get("capacity") or 0)  → non-numeric string crashes → 500
INSERT WarpHistory(active)     ← prior warp NOT finished; no audit entity for warp at all
 ↓
/employee/warp/ shows active warp + clamped remaining; admin list shows Active/Completed badges
```

**Alternate Flows:** Duplicate-day constraint irrelevant here (no date input). Multiple concurrent ACTIVE warps accumulate silently — the list simply shows several "Active" rows.

**Completion:** No app path sets `end_date`. Only Django `/admin/` direct edit. There is no WarpChangeHistory equivalent.

**Evidence:** `accounts/views.py:446-472`; `core/models.py:78-104`.

---

### Workflow 5 — Advance Management (give / clear / carry)

**Business Purpose:** Lend money to a worker and recover it through reduced weekly pay.

**Actors:** Admin (give/clear), Operator (carry command).

**Preconditions:** Existing Employee row.

**Give flow:**

```text
Admin POST /panel/give-advance/<id>/ {amount≥1, note?}
 ↓ POST-only guard; int parse → 400 on garbage
transaction.atomic:
    SELECT … FOR UPDATE employee row
    advance_salary += amount        (additive; accumulates across givens)
    INSERT AdvanceHistory(ADJUST, previous_amount, new_amount, actor, note)
 ↓ commit → flash "Advance ₹X added." → redirect weekly grid (final drops immediately)
```

**Clear flow:** same locking; sets 0; **always** writes AdvanceHistory(CLEAR), including deliberate no-op records when already 0 (`services.py:79-89`).

**Carry flow (operator):**

```text
python manage.py carry_advance [--factor F] [--note] [--dry-run]
 ↓ atomic; SELECT … FOR UPDATE ALL employees
per employee: new = int(prev × F); clamp ≥0; write only if changed;
ALWAYS write AdvanceHistory(CARRY) incl. zero-balance no-op rows (actor NULL for CLI)
dry-run: identical execution inside a transaction rolled back via sentinel exception
```

**Alternate Flows:**
- amount ≤ 0 → service `ValueError` **uncatched by view → 500** (`views.py:520-527`, `services.py:51-52`).
- Negative factor → `ValueError` (command aborts atomically).
- Double give → amount applied twice (additive; not idempotent) — safe under lock, but no duplicate detection.
- Carry factor ≠ 1 twice → multiplied twice (documented non-idempotency, `services.py:212-214`).

**Final State:** Single undifferentiated advance balance; complete before→after forensic trail with actor and note.

**Reversal:** Only CLEAR (full zero) or another ADJUST/CARRY. No targeted rollback of a specific advance event.

**Evidence:** `core/services.py:42-101`, `:197-265`; `accounts/views.py:516-537`; commands `carry_advance.py`, tests `core/tests/test_advance_and_reset.py:16-35`.

---

### Workflow 6 — Weekly Payroll Close-Out (watch → settle → archive → history)

**Business Purpose:** Pay workers for the week and freeze the record.

**Actors:** Admin (grid actions), Operator (archive command).

**Preconditions:** SareeCount rows within Monday–Sunday bounds; rate set (default 0!).

**Main Flow:**

```text
During the week
 ↓ Admin watches /panel/weekly-salary/ — per-worker card recomputed LIVE:
    sarees(week) × current rate − current advance = Final   [negative shown as-is]
    paid badge read from existence+flag of SalaryHistory row for this week
 ↓
Admin marks an individual PAID (POST, optional note):
    inline formula recomputed NOW
    SalaryHistory.get_or_create(employee, week_start, week_end,
        defaults={sarees,rate,total,advance,final, paid_status=True, paid_date=today, notes})
    if existed: update ONLY paid_status/paid_date/final_salary/notes  ← sarees/rate/total stay stale
Mistake? Set Unpaid → flips paid_status=False, paid_date=None; final_salary snapshot KEPT
 ↓
Operator (week end): python manage.py reset_weekly_salary [--date --note --dry-run]
    atomic; FOR-UPDATE-lock ALL employees
    per employee: skip if SalaryHistory row exists for this week (idempotent; also zeroes leftover current_week_salary)
    else compute canonical numbers → INSERT SalaryHistory(paid_status=False, note="Archived by scheduled reset …")
         zero Employee.current_week_salary
 ↓
History surfaces: /panel/salary-history/, /employee/salary-history/, XLSX exports
PDF slip available for CURRENT week only (recomputed live, not from snapshot)
```

**Critical interaction:** a worker marked PAID mid-week already has a SalaryHistory row → archive **skips** that employee entirely → the mid-week snapshot (possibly smaller totals, since taken before week end) stands as the permanent record with `paid_status=True` preserved.

**Second critical interaction:** clicking Mark Paid again later (same week) refreshes only `final_salary` — the row can end up mixing stale `sarees/rate/total` fields with a fresh `final_salary`.

**Alternate Flows:**
- Command re-run same week → zero rows created (unit-tested, `tests:37-49`).
- Command never run → weeks remain live forever; salary-history pages/exports stay empty.
- Rate changed mid-week → entire live week retroactively repriced (computed at display/archive time from current rate).
- Advance given after marking paid → archived row's stored advance/final diverges from reality; grid keeps showing live numbers regardless.
- Negative final (advance > earnings) → allowed and displayed; snapshot fields are plain IntegerField so negatives persist legally.

**Final State:** Immutable-in-practice snapshot row(s); live counters zeroed; advance untouched.

**Reversal:** Mark-unpaid (flag only). No app mechanism to re-archive, delete, or correct a snapshot — Django `/admin/` direct edits are the only recourse.

**Evidence:** `accounts/views.py:478-504`, `:540-592`, `:598-619`; `core/services.py:104-170`; command `reset_weekly_salary.py`; templates `admin_weekly_salary.html` (mutually exclusive Paid buttons driven by row state).

---

### Workflow 7 — Reporting & Exports

**Purpose:** Produce human/accounting artifacts.

```text
PDF slip:  GET /panel/salary-slip/<id>/ → current-week live recompute → 3-line ReportLab PDF (name, week range, final ₹) → streamed, never stored
XLSX #1:   GET /panel/download-history/ → workbook sheets Saree/Pagdi/Warp/Salary (full-table dumps; saree sheet prices HISTORICAL rows at CURRENT rates)
XLSX #2:   GET /panel/download-global-weekly-salary/ → all SalaryHistory snapshots verbatim
```

All `@staff_required`, no filtering/pagination, full querysets into memory. Empty history ⇒ near-empty sheets.

**Evidence:** `accounts/views.py:598-619`, `:655-748`.

---

## 4. Business Rule Inventory

| # | Business Rule | Domain | Evidence | Type |
| - | ------------- | ------ | -------- | ---- |
| 1 | Signup always creates a PENDING (unapproved) account | Workforce | `views.py:50-57` | CONFIRMED |
| 2 | Unapproved employees cannot log in ("Account not approved yet.") | Workforce | `views.py:78-79` | CONFIRMED |
| 3 | Employees cannot enter/edit their own production (read-only by design comment) | Production | `views.py:105-107`, `:140` | CONFIRMED |
| 4 | One production entry per employee per day | Production | `models.py:62` unique_together | IMPL (constraint; intent undocumented) |
| 5 | Production may be back/post-dated freely (any date accepted) | Production | `views.py:635`, date input unrestricted | IMPL |
| 6 | Deleting a production entry is allowed and leaves no trace | Production | `views.py:371-375` | IMPL |
| 7 | Only APPROVED employees appear in assignment/entry dropdowns | Workforce | `views.py:419`, `:465`, `:627` | IMPL |
| 8 | Assigning a new pagdi automatically finishes the open one (note: "Auto-finish due to new assignment") | Pagdi | `views.py:432-434`, `services.py:174-194` | CONFIRMED (explicit note) |
| 9 | Exactly one active pagdi per worker is intended | Pagdi | implied by rule 8; NO DB constraint enforces it | INFERRED |
| 10 | Warp assignment does NOT finish prior warps; multiple concurrent actives possible | Warp | `views.py:468` (direct create) | IMPL (divergence from pagdi pattern) |
| 11 | Warp has no completion path in the app UI | Warp | no writer of `WarpHistory.end_date` outside Django admin | IMPL |
| 12 | Material progress = ALL worker production since material start (work is not tied to the material) | Material | `views.py:179`, `:204`, `:407`, `:454`; `models.py:93-98`, `:126-131` | INFERRED |
| 13 | Remaining capacity displayed clamped at 0 (never negative in UI) | Material | `max(0, …)` `views.py:180`, `:205`, `:411`, `:458` | IMPL |
| 14 | Model-level remaining capacity is UNclamped and capped at today | Material | `models.py:92-98`, `:125-131` | IMPL (diverges from #12/#13 view copies) |
| 15 | Advances are additive; repeated gives accumulate | Advances | `services.py:56-58` | IMPL |
| 16 | Advance balance persists through weekly archive ("Advances are carried by default; clearing… explicit admin action") | Advances/Payroll | `services.py:132-133` docstring | CONFIRMED |
| 17 | Full outstanding advance is deducted from EVERY week until cleared/reduced | Payroll | formula `services.py:114`, `views.py:123` etc.; no installment logic anywhere | IMPL |
| 18 | Clearing an advance records an audit row even when balance already 0 | Advances | `services.py:79-89` | CONFIRMED (commented intent) |
| 19 | Carry logs an audit row for EVERY employee including zero balances | Advances | `services.py:228-239` | CONFIRMED (commented intent) |
| 20 | Carry is deliberately NOT idempotent for factor ≠ 1 | Advances | `services.py:212-214` docstring | CONFIRMED |
| 21 | Carry result truncated toward zero via int(); negatives clamped to 0 | Advances | `services.py:242-245` | IMPL |
| 22 | Week runs Monday→Sunday | Payroll | `services.py:31-39` (weekday offset) | IMPL unless workshop docs say otherwise |
| 23 | Weekly salary = week sarees × CURRENT rate − FULL current advance; may be negative | Payroll | `services.py:104-121`; snapshot IntegerFields `models.py:161-163` | IMPL |
| 24 | Rate and live advance cannot be negative (PositiveIntegerField + validator); snapshot fields CAN be negative | Payroll | `models.py:32-33` vs `:161-163` | IMPL (inconsistent discipline) |
| 25 | Salary rate changes apply retroactively to the whole live week | Payroll | computation always reads current rate | INFERRED |
| 26 | Changing a worker's rate is impossible through the panel (handler exists, no UI posts it) | Payroll | `views.py:343-355` BACKEND_ONLY | IMPL |
| 27 | Weekly archive is idempotent per (employee, week) | Archiving | `services.py:143-149` + `models.py:174` unique_together + unit test | IMPL (engineered) |
| 28 | Archive writes `paid_status=False` only for NEWLY created rows | Archiving | `services.py:161` | IMPL |
| 29 | Archive skips anyone already having a row for the week (incl. mid-week mark-paid) | Archiving | `services.py:143-149` | IMPL |
| 30 | Archive creates a snapshot for EVERY employee, including zero-production ones | Archiving | loop over all employees, no filter | IMPL |
| 31 | Marking paid freezes amounts AT CLICK TIME; re-click refreshes only final/flags, leaving sarees/rate/total stale | Payment | `views.py:555-571` | IMPL |
| 32 | Unmarking payment keeps the stale amount snapshot (only flags revert) | Payment | `views.py:578-592` | IMPL |
| 33 | Payment toggles are fully reversible | Payment | mutually exclusive buttons `admin_weekly_salary.html:66-77` | CONFIRMED (UI) |
| 34 | Money/material mutations require POST (GET → 400) | All | `views.py:518-519`, `:533-534`, `:542-543`, `:580-581` | IMPL |
| 35 | Approval is a bare idempotent boolean flip with no audit | Workforce | `views.py:337-341`, `:643-649` | IMPL |
| 36 | Advance & pagdi events must keep forensic trails incl. actor (actor nullable for CLI) | Audit | `services.py:60-67`, `:183-193`; FK SET_NULL `models.py:193`, `:218` | CONFIRMED (design notes in module docstring) |
| 37 | Dry-run must write nothing (rollback-by-exception pattern) | Ops | both commands, e.g. `reset_weekly_salary.py:25-36` | CONFIRMED (CLI help/docstrings) |

---

## 5. Calculation & Formula Inventory

### Calculation 1: Week Bounds

```text
(monday, sunday) where monday = d − weekday(d) days ; sunday = monday + 6
d defaults to timezone.localdate()
```

- **Inputs:** optional date (else server-local today).
- **Source:** `core/services.py:31-39`. Used by dashboard, detail, home, grid, mark_paid/unpaid, slip, archive.
- **Timing:** computed fresh on every request/command invocation.
- **Rounding:** n/a. **Negatives:** n/a. **Stored vs calc:** calculated only.
- **Single source of truth** — every caller goes through this function (good).

### Calculation 2: Weekly Final Salary (the core business quantity)

Canonical (`core/services.py:104-121`):

```text
sarees            = Σ SareeCount.count  where employee=e AND week_start ≤ date ≤ week_end
salary_rate       = int(e.salary_per_saree or 0)
total_before_adv  = sarees × salary_rate
advance_applied   = int(e.advance_salary or 0)
final_salary      = total_before_adv − advance_applied        (may be < 0)
```

Inline duplicates (all integer arithmetic, identical semantics):

| Location | Lines | Context |
| -------- | ----- | ------- |
| `accounts/views.py` `employee_dashboard` | 118-123 | employee self-view |
| `accounts/views.py` `admin_employee_detail` | 310-325 | admin drill-down (sums counts first, then ×rate — equivalent) |
| `accounts/views.py` `admin_weekly_salary` | 486-491 | payroll grid |
| `accounts/views.py` `mark_paid` | 548-552 | settlement snapshot |
| `accounts/views.py` `salary_slip_pdf` | 607-608 | PDF |

- **Timing:** LIVE on every relevant GET; frozen into `SalaryHistory` only by mark_paid click or archive command.
- **Rounding:** none (pure ints). **Negative results:** permitted and displayed everywhere.
- **Stored vs calculated:** live values always recalculated; `SalaryHistory.final_salary` is the only persisted instance; `Employee.current_week_salary` exists as a stored field but is **never incremented anywhere** — its only writer is the archive zeroing it (`services.py:146-148`, `:166-167`).

### Calculation 3: Per-Entry Pay

```text
entry_pay = count × (employee.salary_per_saree or 0)
```

| Location | Evidence | Note |
| -------- | -------- | ---- |
| `SareeCount.salary_earned()` model method | `models.py:66-68` | unused by views |
| `saree_count_view` | `views.py:155` | employee history rows |
| `admin_employee_detail` weekly rows | `views.py:320` | |
| `download_global_history` saree sheet | `views.py:668` | ⚠ prices HISTORICAL entries at CURRENT rate |

### Calculation 4: Material Remaining Capacity

Two semantically different implementations:

```text
Model methods (models.py:92-98, :125-131):
    remaining = capacity − Σ(count where date ∈ [start_date, date.today()])     ← UNCLAMPED (can be negative)

Views (views.py:180, :205, :407-411, :454-458):
    remaining = max(0, capacity − Σ(count where date ≥ start_date))             ← CLAMPED, NO upper date bound
```

- **Divergences:** (a) views include future-dated entries; model caps at today; (b) model can report negative remaining; UI never does. Neither version restricts to the material's `end_date`.
- **Stored vs calculated:** capacity stored on the row; "made" always aggregated live (N+1 per row in list views).
- **Note:** model uses `datetime.date.today()` (OS clock), views use unbounded queries — neither uses `timezone.localdate()` here, unlike the rest of the app.

### Calculation 5: Advance Carry

```text
new_balance = int(previous × factor)      # truncation toward zero
if new_balance < 0: new_balance = 0
write only when changed; audit row written ALWAYS (even unchanged/zero)
```

- **Source:** `core/services.py:226-263`; inputs: previous balance, CLI float factor.
- **Timing:** manual CLI run only. **Rounding:** int() truncation (documented "rounding -> int" comment at `:241`).
- **Negatives:** impossible post-clamp on output; input validated non-negative (`:219-220`).

---

## 6. Entity Lifecycles

### Employee

```text
CREATED (public signup: forced pending, rate=0, advance=0)
   ↓ admin GET approve
ACTIVE/APPROVED ──── produces entries, receives materials, accrues pay
   ↓ (app: no exit)                      Django /admin/ only: rate edits, counters,
DELETED (cascade) — only via /admin/      picture, unapprove, delete
```

- Creation actor: anonymous visitor. Required: name, phone (unique-as-username), password.
- Joining date stamped automatically (`auto_now_add`, `models.py:20`) and never displayed.
- Deletion cascades ALL child records (production, histories, audits die too — `on_delete=CASCADE` throughout except audit FKs to User/Pagdi which use SET_NULL).

### SareeCount

```text
CREATED (admin, either entry form; unique per employee+day)
   ↓ lives forever contributing to: live payroll, material progress, future archives
HARD-DELETED (admin, detail page; unaudited, unrecoverable)
```

No edit capability anywhere (only delete+recreate). Rows in ARCHIVED weeks remain deletable — deleting them does **not** alter already-written SalaryHistory snapshots.

### PagdiHistory

```text
CREATED (admin assign; PagdiChangeHistory CREATE row)
   ↓ ACTIVE while end_date IS NULL
COMPLETED (end_date=today) — only via auto-finish on reassignment
   (employee self-finish implemented but unreachable; standalone finish absent)
   ↓
DELETED only via /admin/ (audit survives via SET_NULL)
```

Reopening: impossible in app; `/admin/` can null the end_date (undone without audit).

### WarpHistory

```text
CREATED (admin assign; start forced today; NO audit entity)
   ↓ ACTIVE indefinitely; multiple concurrent ACTIVES possible
COMPLETED — only via Django /admin/ end_date edit
```

### SalaryHistory

```text
CREATED by EITHER mark_paid (mid-week, paid_status=True) OR archive command (paid_status=False)
   ↓ UNIQUE per (employee, week_start, week_end)
UPDATED by mark_paid (flags+final only) / mark_unpaid (flags only) / Django /admin/ (anything)
   ↓ effectively permanent ledger row
```

Snapshot fields plain IntegerField → negatives legal. Acts as both payment register and weekly ledger — dual role.

### AdvanceHistory

Auto-created only (ADJUST/CLEAR/CARRY), never edited/deleted by app. Actor NULL for CLI runs. Visible only in Django `/admin/`. Dies with Employee cascade.

### PagdiChangeHistory

Auto-created only (CREATE/FINISH). Survives PagdiHistory deletion (SET_NULL) but dies with Employee cascade. No app UI.

### AlertEmail

Registry table with **zero consumers** — CRUD only via `/admin/`. Dead scaffold.

---

## 7. State Transition Analysis

### Employee.approval

```text
PENDING ──admin GET link (or unreachable detail POST)──▶ APPROVED
```

| Transition | Actor | Trigger | Preconditions | DB Change | Audit | Reversible in app |
| ---------- | ----- | ------- | ------------- | --------- | ----- | ----------------- |
| PENDING→APPROVED | Admin | GET `/panel/employees/<id>/approve/` | logged-in staff | `is_approved=True` | NONE | No (only /admin/) |
| APPROVED→PENDING | — | — | — | impossible in app | — | — |

Automatic/UI-triggered: UI (plain GET link — a state change without POST protection). Idempotent.

### PagdiHistory

```text
ACTIVE(end_date NULL) ──auto-finish on new assignment──▶ COMPLETED(end_date=today)
ACTIVE ──employee POST (UNREACHABLE—no form)──────────▶ COMPLETED
```

| Transition | Actor | Trigger | Preconditions | DB Changes | Audit | Reversible |
| ---------- | ----- | ------- | ------------- | ---------- | ----- | ---------- |
| ACTIVE→COMPLETED | Admin (implicit) | new pagdi POST | open pagdi exists | end_date=today | PagdiChangeHistory(FINISH) w/ prev/new dates+capacities | No (app) |
| ACTIVE→COMPLETED | Employee | POST /employee/pagdi/ | active pagdi | same | FINISH "Finished by employee" | UNREACHABLE via UI |

### WarpHistory

```text
ACTIVE ──(no transition exists anywhere in app)──▶ COMPLETED   [/admin/ only]
```

### SalaryHistory.paid_status (per week-row)

```text
UNPAID ◀────mark_paid────▶ PAID        (fully reversible via panel)
```

| Transition | Actor | Trigger | Preconditions | DB Changes | Audit | Reversible |
| ---------- | ----- | ------- | ------------- | ---------- | ----- | ---------- |
| →PAID | Admin | POST mark-paid | current-week context | upsert row; paid=True, paid_date=today, final recomputed | none (notes field only) | Yes |
| →UNPAID | Admin | POST mark-unpaid | existing row | paid=False, paid_date=None | none | Yes |

### Logical Week

```text
LIVE (pure computation) ──reset_weekly_salary (idempotent, CLI-only)──▶ ARCHIVED (SalaryHistory row)
```

Impossible through web UI — CLI/operator only. Re-archive prevented by unique constraint.

### Advance Balance (Employee.advance_salary, ≥0)

```text
any ──give(+n, audited ADJUST)──▶ any
>0  ──clear(→0, audited CLEAR incl. no-ops)──▶ 0
any ──carry(×f, audited CARRY incl. zeros, CLI)──▶ int(prev×f) clamped ≥0
```

All transitions transactional + row-locked; reversal only via further transitions.

---

## 8. Business Rule Dependencies

```text
Signup
  ↓
Admin Approval (rule 1,35)
  ↓
Login gate passes (rule 2)
  ↓
┌─────────────────────────────┬──────────────────────────────┐
│ PRODUCTION                  │ MATERIALS                    │
│ Saree Entry (rules 3,4,5)   │ Pagdi/Warp Assign (7,8,10)   │
│   ↓                         │   ↓                          │
│ Live Weekly Computation ◀───┤ Material progress reads the  │
│ (rules 22,23,25)            │ SAME SareeCount stream (12)  │
│   ↓              ↑          └──────────────────────────────┘
│ Give/Clear Advance (15,16,17)│
│   ↓                         │
│ Mark Paid ⇄ Unpaid (31-33)  │
│   ↓ (row exists)            │
│ reset_weekly_salary SKIPS   │
│ that employee (29)          │
│   ↓                         │
│ SalaryHistory ledger        │
│   ↓                         │
│ History pages + XLSX #2     │
└─────────────────────────────┘
        │
        ▼
carry_advance (19-21) reshapes next week's deduction
```

Important dependencies:

- **Rate is upstream of everything monetary** — yet changeable only via Django admin (rule 26). A wrong rate poisons the live week and any archive taken before correction.
- **Mark-paid preempts archive** (rule 29): whoever settles first defines the permanent record's content.
- **Material progress depends only on raw production**, not on material-specific work attribution (rule 12) — pagdi and warp progress for the same worker move together.
- **Exports depend on the archive command having been run** (except XLSX #1's live sheets).

---

## 9. Data Ownership

| Data | Created By | Updated By | Deleted By | Read By | Source of Truth |
| ---- | ---------- | ---------- | ---------- | ------- | --------------- |
| auth_user | Public signup | /admin/ only | /admin/ only | system | auth_user table |
| Employee profile | Signup (+ /admin/) | Admin approve (panel); everything else /admin/ | /admin/ only | both roles (own vs all) | core_employee |
| salary_per_saree | default 0 at signup | **/admin/ only** (panel handler unreachable) | — | both roles | core_employee.salary_per_saree |
| SareeCount | Admin (2 forms) | nobody | Admin (detail page) | both roles (own/all) | core_sareecount |
| PagdiHistory | Admin assign | services.finish_pagdi (end_date); /admin/ | /admin/ | both roles | core_pagdihistory |
| WarpHistory | Admin assign | /admin/ only (end_date) | /admin/ | both roles | core_warphistory |
| Employee.advance_salary | default 0 | services.give/carry/clear (locked) | — | grid/detail/employee dashboard | core_employee.advance_salary |
| AdvanceHistory | services only | nobody | /admin/ | **nobody in app** | append-only log |
| PagdiChangeHistory | services/view only | nobody | /admin/ | **nobody in app** | append-only log |
| SalaryHistory | mark_paid OR archive cmd | mark_paid/unpaid; /admin/ | /admin/ | both roles | weekly snapshot ledger |
| current_week_salary | default 0 | archive zeroing only | — | **nobody displays it** | vestigial field |
| Exports (PDF/XLSX) | generated on demand | — | ephemeral | admin | derived, never persisted |

Derived/duplicate representations: weekly totals (live agg vs snapshot vs vestigial field — see §10); material "made" counts (live agg in 6 places); paid state (row existence + flag).

---

## 10. Source of Truth Analysis

### 10.1 Current-week salary

- **Primary source:** live aggregation `Σ SareeCount(week) × rate − advance` (6 implementations).
- **Secondary representations:** `SalaryHistory.final_salary` (once settled/archived); `Employee.current_week_salary` (stored, never maintained — always 0 in practice).
- **When synchronized:** only at mark_paid click or archive run.
- **Who updates:** mark_paid (partial refresh), archive command (create-or-skip).
- **Risk of divergence:** HIGH within a live week after any rate/advance/production change following a mark_paid; the grid then disagrees with the stored row until re-click. `current_week_salary` is permanently desynchronized by design (vestigial).

### 10.2 The current week's SalaryHistory row

- **Primary source:** whichever writer came FIRST (mark_paid mid-week vs archive at week end).
- **Risk of divergence:** HIGH — mid-week snapshot has smaller totals but wins permanently because archive skips existing rows (rule 29). Also mark_paid re-clicks create mixed-stale rows (fresh final over old sarees/rate/total).

### 10.3 Advance balance

- **Primary source:** `Employee.advance_salary` (single mutable cell).
- **Secondary representation:** `AdvanceHistory` before/after ledger (complete); `SalaryHistory.advance_salary` (point-in-time copy at snapshot).
- **Synchronization:** ledger written transactionally with every mutation (strong); snapshot copy frozen at capture time (drifts immediately after).
- **Risk:** snapshot's advance becomes historical fact while live cell keeps moving — by design, but consumers must know which they're reading.

### 10.4 Material remaining capacity

- **Primary:** `capacity_sarees` stored on the row.
- **Secondary:** "made" computed live — **two divergent formulas** (model: bounded-by-today, unclamped; views: unbounded, clamped). Risk: API/template consumers using the model method get different numbers than every screen.

### 10.5 Employee identity

- **Primary:** `request.user` ↔ `Employee` 1:1.
- **Secondary:** `session["employee_id"]` cached at login, trusted by `employee_dashboard` (`views.py:108-113`) and `warp_view` (`:195-196`) without revalidation; other employee views use `user.employee`. Divergence risk if session/user mismatch (currently mitigated by login binding only).

---

## 11. Auditability Model

Question answered by the system: *"who did what, when, what changed?"* — only for advances and pagdi.

| Operation | Actor recorded | Timestamp | Before/After | Reason/Note | Audit mechanism |
| --------- | -------------- | --------- | ------------ | ----------- | --------------- |
| Give advance | admin_user (nullable) | created_at | prev→new amounts | yes | AdvanceHistory(ADJUST) — same transaction |
| Clear advance | admin_user | created_at | prev→0 | yes (incl. no-op label) | AdvanceHistory(CLEAR) — same transaction |
| Carry advance | NULL (CLI) | created_at | prev→new | factor/note | AdvanceHistory(CARRY) — same transaction |
| Pagdi assigned | request.user | created_at | new_capacity | notes | PagdiChangeHistory(CREATE) — separate tx from creation |
| Pagdi finished | acting user | created_at | prev/new end dates + capacities | yes ("Auto-finish…" / "Finished by employee") | PagdiChangeHistory(FINISH) — same tx |
| Saree entry added | — | created_at only | — | notes free-text | NO audit |
| Saree entry deleted | — | — | — | — | NO audit (hard delete) |
| Approve employee | — | updated_at only | — | — | NO audit |
| Rate change (/admin/) | django_admin_log row | yes | no value diff beyond admin log | — | framework log only |
| Mark paid/unpaid | — | paid_date / updated_at | final kept on unpaid | optional note on paid | NO audit |
| Archive run | NULL (notes string mentions "scheduled reset") | created_at | snapshot itself | --note | snapshot row IS the record |

Categories present: **Full audit** (advance domain), **Partial audit** (pagdi domain — CREATE audit written in a separate transaction), **Implicit history** (created_at/updated_at everywhere; django_admin_log), **Snapshot history** (SalaryHistory). **None**: production changes, approval, payment flags.

Audit rows share the business mutation's transaction only in the service layer; the pagdi CREATE audit is a distinct autocommit (see §12).

---

## 12. Transaction Boundaries

| Workflow | Boundary | Lock | Atomic? | Partial Failure Risk |
| -------- | -------- | ---- | ------- | -------------------- |
| Give advance | view `atomic()` wrap + service `@atomic` (nested = one tx) | FOR UPDATE employee row | Yes | none (audit rolls back with mutation) |
| Clear advance | service `@atomic` | employee row | Yes | none |
| Carry advance | command/service `@atomic` whole-run | ALL employee rows | Yes | none (all-or-nothing) |
| Archive/reset week | service `@atomic` whole-run | ALL employee rows | Yes | none; failure aborts entire batch |
| Finish pagdi | service `@atomic` | pagdi row | Yes | none |
| **Assign pagdi** | THREE autocommits: finish-tx → insert pagdi → insert audit | only inside finish | **NO** | old finished with no new pagdi; or new pagdi missing CREATE audit |
| Mark paid | none explicit; `get_or_create` relies on unique triple | none | Partial | rare IntegrityError race unhandled; update-after-create partially refreshes row |
| Mark unpaid | single UPDATE autocommit | none | effectively yes | none |
| Saree entry | single INSERT autocommit | none | yes | IntegrityError on dup day surfaces as raw 500 |
| Delete saree | single DELETE autocommit | none | yes | silent no-op on mismatched id |
| Approve | single UPDATE autocommit | none | yes | benign |
| Signup | TWO autocommits (User then Employee) | username unique | **NO** | orphan User possible if second insert fails |
| Dry-run commands | `atomic()` + sentinel RuntimeError rollback | all employees | Yes (by construction) | none |

Observation: the money-critical service layer is genuinely disciplined; newer view-level mutations (mark_paid, pagdi assignment sequence, saree entry, signup) sit outside that discipline.

---

## 13. Concurrency & Duplication Analysis

### Scenario modeling

**A. Two admins give advances simultaneously:**

```text
Admin A: reads advance=100 ─┐
Admin B: reads advance=100 ─┤ both POST +50
                            ▼
FOR UPDATE serializes: A commits 150 → B waits → B applies on fresh row → 200 ✓ (no lost update)
```

**B. Duplicate production entry:** unique(employee,date) rejects second insert → unhandled IntegrityError → 500. Protection exists; UX handling absent.

**C. Two admins assign pagdi simultaneously:** both run the check `filter(end_date__isnull=True).first()` before either finishes → both proceed → possible **two ACTIVE pagdis** (check-then-act race; no lock spans decision+insert; no constraint).

**D. Archive concurrent with give_advance:** archive locks ALL employee rows first; give blocks until archive commits → advance lands in the *next* week's live balance, not the archived snapshot.

**E. Archive run twice / cron double-fire:** second run skips everyone (existence check + unique constraint) → 0 rows. Safe (unit-tested).

**F. carry_advance double-fire with factor≠1:** balance multiplied twice (documented, intended). With factor=1.0 harmless (audited no-ops).

**G. Double-click Mark Paid:** first creates row; second updates same row → converges. Narrow get_or_create race could raise unhandled IntegrityError.

**H. Simultaneous mark_paid + archive:** whichever inserts the row first wins; the other path skips/upserts onto it.

### Summary table

| Operation | Concurrent Risk | Protection | Actual Outcome |
| --------- | --------------- | ---------- | -------------- |
| Give advance | lost update | row lock + tx | serialized, additive — correct |
| Clear advance | none | lock | audited, idempotent |
| Carry (f≠1) | double application | none (by design) | multiplies repeatedly |
| Archive | double archive | existence check + unique triple | second run = no-op |
| Assign pagdi | two active pagdis | NONE (check-then-act) | rare duplicate-active state |
| Mark paid | dup row / race | unique triple via get_or_create | converges; rare 500 |
| Saree entry | dup day | unique(employee,date) | 500 on violation |
| Approve | double approve | none needed | idempotent |
| Warp assign | multiple actives | none (accepted by design?) | accumulates open warps |

---

## 14. Reversal & Correction Logic

| Mechanism | Original State → Action → New State | Original event remains visible? |
| --------- | ----------------------------------- | ------------------------------- |
| Delete saree entry | entry exists → DELETE → gone | **NO — hard delete, no trace** |
| Clear advance | N>0 → CLEAR → 0 | YES — AdvanceHistory prev/new preserved |
| Mark unpaid | PAID → flag flip → UNPAID | YES partially — row persists; stale final_salary/notes retained; paid_date erased |
| Re-mark paid (correction) | any → reclick → refreshed final | Row overwritten in place; no history of prior values |
| Pagdi reassignment | active → auto-FINISH → completed | YES — original row + FINISH audit retained |
| Un-finish pagdi | — | Not possible in app; /admin/ end_date edit leaves NO audit |
| Correct archived week | — | Not possible in app; /admin/ direct field edits (framework log only) |
| Un-approve employee | — | Not possible in app; /admin/ only |
| Undo archive | — | Does not exist (rows deletable only via /admin/) |
| Reduce (not zero) advance | — | only via carry command with 0<f<1, or /admin/ raw edit (unaudited) |
| Rehearsal | dry-run flags on both commands — full simulation rolled back | Nothing written |

Pattern: corrections cluster around *current* state; once a week is archived or an entry deleted, the app offers no corrective narrative — Django `/admin/` raw edits are the escape hatch, themselves barely audited.

---

## 15. Time & Date Rules

```text
Timezone:        TIME_ZONE = "Asia/Kolkata", USE_TZ = True   (loomserver/settings.py:99,101)
Week start:      Monday  (weekday() offset)                   (core/services.py:31-39)
Week end:        Sunday  (monday + 6)
Date source:     SERVER-side timezone.localdate() at every decision point
                 (dashboard, grid, mark_paid/unpaid, slip, finish_pagdi, warp start, archive)
Browser-supplied dates: saree-entry date picker (unrestricted), pagdi start_date (free text date input)
Exceptions:      material "made" aggregates use date.today() in MODEL methods (OS clock, models.py:96,:129)
                 and have NO upper bound in VIEW computations — three different temporal scopes exist
Archive date:    operator-chosen (--date) else localdate; week derived from it
Paid date:       server-today at mark_paid click
Joining date:    auto_now_add at Employee creation, never surfaced
Timestamps:      created_at/updated_at auto on all 8 models
Historical dates: saree rows priced at CURRENT rate regardless of entry date (export included)
```

Notable: the app is consistent about Kolkata local dates except the two model-method aggregates; whether deployment server OS clock matches Asia/Kolkata determines whether those differ in practice (UNCLEAR — depends on host TZ, e.g., Render runs UTC).

---

## 16. Permission & Actor Model

| Operation | Actor | Permission Mechanism | Object-Level Check |
| --------- | ----- | -------------------- | ------------------ |
| Signup / Login | Anonymous | public routes | phone uniqueness / approval gate |
| View own dashboard/history | Approved Employee | `@login_required` | scoped to resolved Employee (session id or user.employee) |
| Finish own pagdi | Approved Employee | `@login_required` + own-active lookup | scoped (but UI-unreachable) |
| All /panel/* reads & mutations | Admin/staff | `staff_required = user_passes_test(is_staff or is_superuser)` (views.py:27-31) | PK-based fetch; no scoping needed (staff-trusted) |
| Money mutations | Admin | decorator + POST-method guard | employee id from URL |
| Approve | Admin | decorator — **state change via GET link, no POST/CSRF** | get_object_or_404 |
| reset/carry commands | Operator (CLI) | server/shell access; actor recorded NULL | whole workforce |
| Full CRUD all tables | Staff via Django /admin/ | framework staff perms | framework |

Authorization layers: **view-decorator level only**. No service-level or database-level authorization exists; anything bypassing views (shell, future API) bypasses authorization entirely. CSRF tokens present in all form templates; the approve GET link is the lone unprotected mutation.

---

## 17. Failure & Recovery Model

| Workflow | Failure | User Sees | Data State | Recovery |
| -------- | ------- | --------- | ---------- | -------- |
| Signup | duplicate phone / blank fields | inline form error | nothing written | retry |
| Signup | process dies between 2 inserts | 500 | possible orphan User | manual /admin/ cleanup |
| Login | bad creds / unapproved | inline messages | none | retry |
| Saree entry | duplicate (employee,day) | **raw 500** (IntegrityError) | first insert stands | re-enter different date; no dedup UX |
| Saree entry | invalid count | flash error | nothing | retry |
| Saree delete | wrong/foreign id | false success flash | unchanged | n/a (silent) |
| Give advance | amount ≤ 0 | **raw 500** (service ValueError uncaught) | nothing | retry with valid amount |
| Give advance | non-int amount | 400 "Invalid amount" | nothing | retry |
| Pagdi assign | blank date / forged employee id | **raw 500** | possibly old pagdi finished, new missing (non-atomic seq) | manual repair via /admin/ |
| Warp assign | non-numeric capacity | **raw 500** (unguarded int()) | nothing | retry |
| Mark paid | rare get_or_create race | 500 | row likely created | re-click converges |
| Archive command | any exception | traceback in console | whole run rolled back | rerun safely (idempotent) |
| Carry command | negative factor / crash | error | rolled back | fix args, rerun |
| External services | Cloudinary unreachable (upload via /admin/) | upload error | Employee saved without picture? (field nullable) | retry; app functions without pictures |

General shape: friendly flash-message errors for *anticipated* input problems; unhandled 500s for constraint violations, type errors in newer views, and service-raised ValueErrors. Database failures roll back cleanly wherever transactions wrap the work; recovery thereafter relies on idempotency (archive/clear/approve) or on Django admin surgery.

---

## 18. Operational Model

```text
DAILY (as evidenced by features)
 ├ Admin enters each worker's day-end saree count
 ├ Admin assigns/rotates pagdi work (old auto-closes)
 ├ Admin may assign warp work
 └ Admin issues advances when workers need cash

WEEKLY
 ├ Admin watches /panel/weekly-salary/ (Mon–Sun live grid)
 ├ Admin marks individuals PAID (optionally noting method), reverses mistakes via Set Unpaid
 ├ Admin hands out printed/generated PDF slips (current week)
 ├ OPERATOR runs reset_weekly_salary  (freeze week; advances survive)
 ├ OPERATOR optionally runs carry_advance --factor F  (reshape surviving balances)
 └ Admin exports XLSX history / salary workbook for records

ADMINISTRATIVE (Django /admin/ only)
 └ set/change salary rates · create/delete workers · edit any field ·
   close warps · browse advance/pagdi audit trails · manage AlertEmail registry

EXCEPTIONAL / CORRECTION
 ├ wrong count → delete entry (traceless) → re-enter
 ├── overpaid advance → CLEAR → re-give correct amount (both audited)
 ├── mistaken payment → Set Unpaid
 └── anything deeper → direct DB/admin edits

REPORTING
 └ stat cards · live grid · history tables · 2× XLSX · 1× PDF
```

Nothing in the repository schedules or reminds about the two weekly commands — the weekly rhythm exists only if a human or external cron performs it.

---

## 19. Hidden Business Assumptions

| Assumption | Where encoded | What breaks if false | Class |
| ---------- | ------------- | -------------------- | ----- |
| A worker's entire daily output is ONE number (no job types/mixed rates) | SareeCount single `count`; unique(employee,date) | piece-rate differentiation impossible; second entry/day = 500 | IMPL |
| One per-saree rate applies to ALL of a worker's work, current AND historical repricing | rate read at compute time everywhere | retroactive pay changes; historical exports misprice | IMPL |
| One active pagdi per worker | auto-finish pattern | race (§13-C) yields two actives; UI shows first found | INFERRED |
| Multiple active warps acceptable | no auto-finish/constraint | capacity tracking meaningless across stacked warps | IMPL |
| All production counts toward EVERY open material | aggregates ignore material linkage (there is none) | pagdi+warp both "consume" the same sarees; progress double-counts | INFERRED |
| Advance is one undifferentiated balance recovered in FULL from each week | formula deducts entire balance; no installments | long-term debt makes wages negative indefinitely until carry/clear | IMPL |
| Operators run carry_advance with factor<1 to amortize | command design implies rollover shaping | with default 1.0, deductions repeat forever | UNCLEAR |
| The week closes via external command execution | no scheduler configured | history never exists; exports starve | IMPL |
| Mark-paid happens at true settlement moment | snapshot-at-click semantics | early clicks freeze low totals permanently (archive skips) | IMPL |
| Session employee_id ≡ logged-in user | trusted without revalidation in 2 views | identity confusion if session tampered/shared | IMPL |
| Admins, not workers, are the source of production truth | employees read-only | no worker self-service corrections; disputes need admin | CONFIRMED |
| Every employee gets a history row weekly, even zero-output | archive loops all employees | ledger noise for inactive workers | IMPL |
| Money is integer rupees | IntegerFields everywhere | paise/subunits unsupported | IMPL |
| Phone numbers are unique identities | username=phone | shared/family phones block second registration | IMPL |
| `current_week_salary` tracks something live | field exists, never incremented | dead weight; misleads maintainers | INFERRED (vestigial) |
| AlertEmail will power notifications someday | model only | expectation vs zero functionality | UNCLEAR |

---

## 20. Business Logic Duplication

| Rule / Formula | Locations | Identical? | Can diverge? | Current behavior |
| -------------- | --------- | ---------- | ------------ | ---------------- |
| Weekly final salary | `services.py:104-121` (canonical) + `views.py:122-123`, `:310-325`, `:486-491`, `:548-552`, `:607-608` | Semantically yes | YES — any edit must touch 6 sites | currently agree; drift risk live |
| Per-entry pay | `models.py:66-68`, `views.py:155`, `:320`, `:668` | yes (count×current rate) | export variant already differs in *context* (historical rows at current rate) | agree numerically |
| Remaining capacity | model methods `models.py:92-98`,`:125-131` vs views `views.py:180`,`:205`,`:407-411`,`:454-458` | **NO — different clamping AND date bounds** | already divergent | UI clamps at 0 & includes future dates; model doesn't clamp & stops at today |
| Approve employee | `views.py:337-341` (POST branch) + `:643-649` (GET view) | yes | branch is dead code | GET path used |
| Saree insertion | `views.py:357-369` vs `:625-640` | near (different guards) | validation differs slightly | both live |
| Week bounds | single service — NOT duplicated | — | no | healthy |
| Tailwind load (cosmetic) | base + 2 templates | conflicting versions | yes | cosmetic conflict |

---

## 21. Business Logic Gaps

Observations only:

- Backend supports more than UI exposes: rate-change handler (`save_salary`, `views.py:343-355`), detail-approve branch (`:337-341`), employee pagdi self-finish (`:170-173`) — all coded, none triggerable.
- Warp lifecycle: model supports completion; UI lists a "Completed" state; nothing in-app can produce it.
- History exists without UI: AdvanceHistory & PagdiChangeHistory invisible outside `/admin/`.
- Stored field without purpose: `current_week_salary`.
- Registry without consumer: `AlertEmail`.
- Fields without readers: `performance`, `pagdi_thread_1/2`, `warp_threads`.
- UI promises navigation the backend lacks: login↔signup cross-links 404; dashboard "Warp History" quick-link 404.
- PDF slip ignores archived snapshots — prints live current-week numbers only; no historical slip capability.
- No edit path for production entries (delete+recreate only); no pagination/filtering on any history.
- Payment "note" captured on mark-paid is the only annotation channel for settlements; unpaid erases no note and stores no reason.

---

## 22. Real-World Workflow Reconstruction

*(Plain-language version, as the workshop operates.)*

**Bringing a weaver in.** The weaver registers herself with her name, phone number and a password. She cannot do anything yet — the owner sees her on a pending list and clicks Approve. From then on she can sign in with her phone number and see her own pages.

**Recording the work.** At day's end the owner types each weaver's saree count into the system — one number per weaver per day. If he mistypes, he can delete the day's entry and enter it again, though the system keeps no record of the removal. The weaver herself can see these numbers but can never change them.

**Handing out work.** When the owner gives a weaver a batch of pagdi work — say 500 bands — the system remembers the batch and counts down how many are left as her daily entries come in. If he gives her a new batch, the old one quietly closes itself. Warp batches behave differently: handing out a new one does not close the old one, and in fact nothing in the workshop's own pages can ever close a warp — that can only be done from the hidden maintenance back door.

**Money advances.** When a weaver needs money upfront, the owner records the amount. From then on, every week's pay is reduced by the *whole* outstanding amount — not an installment, the whole thing — until he explicitly clears it (wiping it to zero, with a receipt trail) or runs the special command that shrinks debts by a chosen fraction at week's end. Every touch of this money leaves a permanent receipt showing what it was before and after, who did it, and why.

**Payday.** Through the week the owner watches one screen showing, per weaver: sarees done × her rate − her debt = take-home. It can show less than zero if she owes more than she earned. When he pays someone, he clicks Mark Paid — the system freezes that person's numbers right then and stamps the day. Made a mistake? Set Unpaid unhooks the payment stamp but leaves the old frozen figures in place. Once a week he (or a scheduled task nobody has wired up) runs the closing command: every weaver's week is written permanently into the books — including weavers who produced nothing — and the counters restart. Debts survive the closing untouched. After closing, the books appear on the owner's history screen and on each weaver's own salary-history page, and can be dumped to Excel. Payslips print only for the *current* week.

**What the weaver sees.** Her own dashboard (this week's count, rate, debt, take-home), her full count history with per-day pay, her current pagdi/warp progress, and every closed week with its Paid/Unpaid stamp. She can do exactly one thing to her own record — declare a pagdi finished — but the button for it was never put on her page.

---

## 23. Technical Workflow Reconstruction

**Give Advance (canonical money path):**

```text
Form POST (CSRF) admin_weekly_salary.html:53
 → POST /panel/give-advance/<id>/            accounts/urls.py
 → @staff_required → give_advance_view       views.py:516
 → transaction.atomic()                       views.py:525
 → services.give_advance                     services.py:42
 → SELECT…FOR UPDATE core_employee → UPDATE advance_salary (update_fields)
 → INSERT core_advancehistory(ADJUST)
 → COMMIT → messages.success → 302 → /panel/weekly-salary/ (GET recomputes grid)
```

**Mark Paid (settlement path):**

```text
Form POST admin_weekly_salary.html:72 → /panel/mark-paid/<id>/
 → mark_paid views.py:540 (no explicit tx)
 → get_week_bounds → SUM(SareeCount) → inline formula
 → SalaryHistory.objects.get_or_create(unique triple, defaults{…paid…})
 → if existed: UPDATE paid_status/paid_date/final_salary/notes only
 → flash → redirect grid
```

**Weekly Archive (operator path):**

```text
$ python manage.py reset_weekly_salary [--date --note --dry-run]
 → handle() → optional dry-run: atomic + sentinel-exception rollback
 → services.archive_and_reset_weekly_salaries  services.py:124
 → @atomic → SELECT…FOR UPDATE ALL core_employee
 → per emp: exists-check on SalaryHistory(week) → skip | compute → INSERT snapshot → zero current_week_salary
 → COMMIT → stdout count
```

**Assign Pagdi (composite path):**

```text
POST /panel/pagdi/create/ → admin_pagdi_create views.py:417
 → finish_pagdi (tx#1: lock, end_date=today, FINISH audit)
 → PagdiHistory.create (autocommit tx#2)
 → PagdiChangeHistory CREATE (autocommit tx#3)
 → redirect pagdi list
```

**Read paths:** every screen resolves identity → `get_week_bounds` → aggregate SareeCount → arithmetic in Python → render context dict. No template arithmetic (deliberate comment, `views.py:141`).

---

## 24. Business vs Implementation Gaps

| Area | Apparent Business Process | Actual Implementation | Evidence |
| ---- | ------------------------- | --------------------- | -------- |
| Rate management | Owner should control each weaver's rate | Panel handler exists; no button/form anywhere posts it — rate frozen except via hidden admin | `views.py:343-355` + template grep |
| Pagdi completion | Weaver finishes a batch and reports it | Self-finish coded, page has no form; completion only as side-effect of next assignment | `views.py:170-173` vs `pagdi.html` |
| Warp completion | Batches eventually complete | No completing mechanism in app at all | no end_date writer outside /admin/ |
| Debt repayment | Debt reduces as it's repaid from wages | Whole balance subtracted every week; reduction only via manual carry command with chosen factor | formula + `services.py:132-133` |
| Weekly close | Happens automatically each week | Manual CLI, unscheduled; skipping it means no history ever | no scheduler config; Phase 1 §17 |
| Fair historical records | Old entries valued at their era's rate | Historical rows priced at CURRENT rate in exports and live views | `views.py:668` etc. |
| Payment accuracy | Paid amount = week's final amount | Snapshot taken at click-time; later production/advance changes don't flow into it; archive won't overwrite | `views.py:555-571`, `services.py:143-149` |
| Accountability | Actions attributable | Approvals, deletions, payment flips, rate edits leave no actor/trace | §11 |
| Navigation | Users move between login/signup | Both cross-links 404; onboarding works only via typed URLs | `signup.html:43`, `login.html:41` |
| One active material per worker | Implied by pagdi behavior | Enforced informally (race-prone) for pagdi; openly violated for warp | §13-C, `views.py:468` |

---

## 25. Consolidated Business System Map

```text
                              SERVERLOOM BUSINESS SYSTEM
                                          │
        ┌────────────────┬────────────────┼────────────────────┬──────────────────┐
        │                │                │                    │                  │
    WORKFORCE        PRODUCTION       MATERIALS             ADVANCES          PAYROLL
        │                │                │                    │                  │
  Signup(pending)   SareeCount     PagdiHistory          advance_salary    live formula ×6
  Admin approval    (unique/day,   ├ assign→CREATE       ├ GIVE (+,lock)   Weekly Grid
  Login gate         admin-only,   ├ auto-FINISH on      ├ CLEAR (0,lock)  Mark Paid⇄Unpaid
  Session identity   deletable)    │  reassignment       ├ CARRY ×f (CLI)  SalaryHistory
        │                │        └ WarpHistory          └ full audit     (unique/week)
        │           feeds everything  (no finish path,                        │
        │                │         multiple actives)          │                 │
        └────────────────┴───────────────┴────────────────────┴─────────────────┘
                                          │
                              WEEKLY ARCHIVE (CLI, idempotent, unscheduled)
                              freeze snapshot · zero counter · keep advance
                                          │
                                   HISTORY / AUDIT
                    SalaryHistory ledger · AdvanceHistory · PagdiChangeHistory
                              (audit tables visible only in Django admin)
                                          │
                     REPORTING: PDF slip (live week) · XLSX global · XLSX salaries

  OUT OF BAND: Django /admin/ = rates, deletes, unapprove, warp completion,
               counters, pictures, audit browsing, everything else
```

---

## 26. Important Findings

1. **The business is one formula plus a ledger.** Everything monetary reduces to `week_sarees × rate − advance`, snapshotted weekly; six parallel implementations of the formula currently agree but are structurally free to drift (§20).
2. **Advance semantics are harsher than typical installment lending** — full deduction every week, indefinite persistence, reduction only by explicit operator action (§19-A6/A7, rule 17).
3. **First-writer-wins on the weekly record:** mark-paid beats archive; the earlier, possibly smaller snapshot becomes permanent (rule 29, §10.2).
4. **Audit coverage is asymmetric by domain, not by risk:** advances/pagdi fully traced; production edits, approvals, payments, and rates untraced (§11).
5. **Transaction discipline is bifurcated:** service layer exemplary (locks, atomicity, no-op auditing); view-level mutations (pagdi assignment trio, mark_paid, signup pair) sit outside it (§12).
6. **Idempotency is engineered where automation was expected** (archive) and deliberately withheld where it wasn't (carry f≠1) — revealing which operations were designed for robots versus humans (rules 20, 27).
7. **Three coded capabilities are UI-dead** (rate change, detail approve, self-finish pagdi) — the panel's effective power is smaller than its code suggests, pushing real control into Django `/admin/`.
8. **Time is consistently Kolkata/Monday-based** except the material-progress model methods (OS-clock `today()`, unclamped, bounded) — the one place three temporal scopes coexist for the same concept (§15, §20).
9. **Deletion is the only production-correction tool and it is traceless**; combined with retroactive pricing, the books can silently change meaning without changing appearance (§14, rule 25).
10. **The system degrades to a calculator without the CLI:** no scheduler exists, so the archival heartbeat — and therefore all history/reporting — depends entirely on an undocumented external habit (Phase 1 §17; rule 22 context).

---

## 27. Uncertainties

| Item | Status | Reason |
| ---- | ------ | ------ |
| Whether operators actually run carry with factor < 1 (amortization intent) | UNCLEAR | command supports it; no docs/config evidence of usage |
| Whether reset/carry run in production at all, and by what trigger | UNCLEAR | no scheduler config anywhere in repo (Phase 1 §17) |
| Whether "Monday week" is workshop policy or developer choice | IMPL-leaning | encoded only in `get_week_bounds`; no doc confirms |
| Whether one-active-pagdi is a formal rule | INFERRED | enforced informally; no constraint/doc |
| Whether material progress *should* attribute work to materials | INFERRED gap | current counting double-counts across open materials; intent unknowable from code |
| Whether negative weekly pay is acceptable business-wise | UNCLEAR | schema allows; UI displays; no warning/block anywhere |
| Whether `AlertEmail`, `performance`, thread-counter fields reflect planned features | UNCLEAR | zero consumers |
| Deployment-server OS clock vs Asia/Kolkata (affects model-method `today()` scope) | UNCLEAR | depends on host (e.g., Render = UTC); not determinable from repo |
| Runtime behavior of 500-paths and races | STATIC-ONLY | analysis is code-level; no runtime reproduction performed |
| Whether archived rows are treated as immutable by the business | INFERRED | app never mutates sarees/rate fields post-write except mark_paid's partial refresh; /admin/ can edit anything |

---

**Phase 3 status: COMPLETE** — business workflows, rules, calculations, lifecycles, state machines, dependencies, ownership, audit, transactions, concurrency, time rules, permissions, failures, operations, assumptions, duplication, and gaps reconstructed with repository evidence. No Management-V1 comparison, recommendations, redesign, or code modifications performed.
