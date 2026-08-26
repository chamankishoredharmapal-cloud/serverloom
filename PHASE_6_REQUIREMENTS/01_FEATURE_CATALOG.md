# 01 — Feature Catalog (Phase 6 Requirements Extraction)

Perspective: the external application is a **reference application**. Each feature below describes BUSINESS CAPABILITY to be rebuilt natively in Management-V1 — not its Django implementation. Status values: VERIFIED REQUIREMENT / OBSERVED BEHAVIOR / BUSINESS RULE / IMPLEMENTATION DETAIL / BUG / UNKNOWN. Confidence: HIGH = runtime+repository verified; MEDIUM = repository/test evidence; LOW = inference.

Actors used below: **Admin** (= staff/superuser operator), **Employee** (approved worker), **System** (CLI/operator-run commands). There are no other roles.

---

## F-01 Self-Registration
- **Purpose:** A worker creates a pending account without admin help.
- **Actors:** Visitor.
- **Preconditions:** Phone number not already registered.
- **Inputs:** Name, phone, password.
- **Outputs:** Pending account; redirect to login with confirmation message "waiting for admin approval".
- **Business rules:** Phone is the login identity; account unusable until approved.
- **Validation:** All three fields required; duplicate phone rejected with message.
- **Errors:** Missing fields → inline error "All fields are required."; duplicate → "Phone already registered".
- **Audit:** None currently (see AUD requirements).
- **Requirement status:** VERIFIED REQUIREMENT (FR-001).
- **Evidence:** views.py:37-62; runtime signup tests (Phase 4 §6, Phase 4.5 L5.01); duplicate rejection runtime.
- **Confidence:** HIGH.

## F-02 Login (approval-gated, role-routed)
- **Purpose:** Single entry point routing Admins to panel and Employees to dashboard; blocks unapproved accounts.
- **Preconditions:** Account exists; employee must be approved.
- **Outputs:** Session; role-based landing page.
- **Rules:** Unapproved employee → refusal WITHOUT session ("Account not approved yet."); wrong credentials → generic error; non-staff non-employee user → "Unauthorized account."
- **Status:** VERIFIED REQUIREMENT (FR-002). Evidence: views.py:65-92; Phase 4 §6 all rows runtime. Confidence: HIGH.

## F-03 Logout
- Session destroyed immediately; protected pages unreachable afterwards. VERIFIED REQUIREMENT (FR-003). Evidence: views.py:95-97; Phase 4 A15 runtime.

## F-04 Employee Approval
- **Purpose:** Admin activates a pending worker.
- **Inputs:** Employee id (POST + CSRF only — GET returns 400).
- **Effects:** approval flag set; idempotent repeat safe; flash confirmation; employees list shows POST approve form per pending row.
- **Status:** VERIFIED REQUIREMENT (FR-004). Evidence: views.py:796-810; template admin_employees.html:37; unit ×4; prior A2.02–05; probe GET→400. Confidence: HIGH.
- **UPDATED (6.1):** inert alternate code path exists on the detail page (`action=approve`, views.py:342-346) that no template posts — recorded as OBSERVED INERT, superseded by this endpoint.

## F-05 Salary Rate Setting
- **Purpose:** Admin sets/changes a worker's per-piece rate from the panel detail page.
- **Inputs:** Non-negative integer rate via POST form (`action=save_salary`).
- **Errors:** Non-numeric/negative/empty → "Invalid salary value.", value unchanged.
- **Authorization:** staff-only (employee attempt bounced; tested).
- **Status:** VERIFIED REQUIREMENT (FR-005) — was a blocker bug (BUG-02) now fixed. Evidence: views.py:348-360; admin_employee_detail.html:20; RateSettingTests ×3; qa45 W3.01/02. Confidence: HIGH.

## F-06 Employee Weekly Dashboard
- Weekly summary card for the logged-in worker: current week range (Mon–Sun), week's piece count, outstanding advance, computed final pay; personal details incl. rate & approval badge; quick-link cards to own production/pagdi/warp pages (all resolve — fixed BUG-03).
- VERIFIED REQUIREMENT (FR-006). Evidence: views.py:103-135; dashboard.html (url-tag cards); live probes L3.01–03. Confidence: HIGH.

## F-07 Own Production History (employee)
- Read-only chronological list of the worker's daily entries with per-row earnings at CURRENT rate. Employees cannot add/edit/delete entries here. VERIFIED REQUIREMENT (FR-007). Evidence: views.py:138-162; Phase 2 #8. Confidence: HIGH.

## F-08 Active Pagdi Progress + History (employee)
- Shows active assignment progress (made/remaining), full personal pagdi history; self-finish capability exists as backend POST branch but has NO button (OBSERVED GAP — see FR-008 note + Open Question Q-07). **UPDATED (6.1):** the embedded self-finish branch is formally classified OBSERVED INERT CAPABILITY (unreachable by any user path). Evidence: views.py:165-191; Phase 2 #9/#10; template grep (zero posters). Confidence: HIGH (behavior), gap documented.

## F-09 Warp Progress + History (employee)
- Same pattern for warp assignments. VERIFIED REQUIREMENT (FR-008). Evidence: views.py:194-220. Confidence: HIGH.

## F-10 Combined Personal History (employee)
- One page listing the worker's production, pagdi, warp histories. VERIFIED REQUIREMENT (FR-009). Evidence: views.py:222-239. Confidence: HIGH.

## F-11 Own Salary History (employee)
- Worker's weekly ledger records (weeks, quantities, final, paid state) with empty-state text when none exist (isolation runtime-proven). VERIFIED REQUIREMENT (FR-010). Evidence: views.py:242-252; probe5c P2.04f. Confidence: HIGH.

## F-12 Admin Home / Stats Dashboard
- Counters: total workers, pending approvals, active pagdis, active warps; current week range. VERIFIED REQUIREMENT (FR-011). Evidence: views.py:258-279. Confidence: HIGH.

## F-13 Employee List & Search
- All workers newest-first; free-text search across name OR phone (case-insensitive contains). No pagination (documented scale limit, NFR note). VERIFIED REQUIREMENT (FR-012). Evidence: views.py:290-301. Confidence: HIGH.

## F-14 Employee Detail Drill-down (admin)
- Per-worker console: current-week entries w/ per-row pay, weekly totals, advance, final; full production/material/salary histories; action forms: rate change, add saree entry, delete saree entry, advance give/clear links. VERIFIED REQUIREMENT (FR-013). Evidence: views.py:304-426; template 8.7 KB. Confidence: HIGH.

## F-15 Production Entry (admin, global form)
- Admin records daily output for any approved worker: employee/date/count/notes. Friendly handling for invalid date format, negative count, non-numeric count, and same-day duplicates ("already exists" message; DB constraint backstop; no 500s even under parallel submits). Zero count allowed. Future dates allowed by design. VERIFIED REQUIREMENT (FR-014) incl. graceful-rejection requirement replacing former 500 bugs (BUG-01 family). Evidence: views.py:757-793 (+detail variant :362-396); units ×5; qa45 W1.x; parallel S1.03. Confidence: HIGH.

## F-16 Delete Production Entry
- Admin removes an entry; missing id → explicit "Entry not found." failure (false-success bug fixed). Deletion currently UNAUDITED (gap → AUD requirement). VERIFIED REQUIREMENT (FR-015) + AUD-006 requirement note. Evidence: views.py:398-406; unit test; qa45 W1.06. Confidence: HIGH.

## F-17 Pagdi Assignment (auto-finish lifecycle)
- Admin assigns capacity to an approved worker; any open assignment auto-finishes inside ONE atomic locked transaction; CREATE/FINISH audits written; friendly errors for blank date, malformed date, forged employee id, bad capacity; duplicate assignment converges to single ACTIVE. VERIFIED REQUIREMENT (FR-016). Evidence: views.py:449-511; services.finish_pagdi; units; live race test (5-way → exactly 1 ACTIVE). Confidence: HIGH.

## F-18 Pagdi List w/ Progress
- All pagdis newest-first with made/remaining per row and Active/Completed badges. VERIFIED REQUIREMENT (FR-017). Evidence: views.py:432-446. Confidence: HIGH. (No explicit admin finish control for pagdi — OBSERVED design gap Q-08.)

## F-19 Warp Assignment (auto-finish lifecycle)
- Mirrors pagdi: guarded capacity parse, atomic auto-finish of open warps, WarpChangeHistory audits. Former stacked-ACTIVE bug eliminated. VERIFIED REQUIREMENT (FR-018). Evidence: views.py:532-579; units ×4. Confidence: HIGH.

## F-20 Warp List + Explicit Finish Control
- List w/ progress; POST-only finish button per active warp; GET → 400; re-finish friendly info message. VERIFIED REQUIREMENT (FR-019). Evidence: views.py:582-593; template button; units; live checks. Confidence: HIGH.

## F-21 Weekly Salary Grid (live review)
- Per-worker current-week cards: pieces, gross, advance, final (may render negative), paid badge; action buttons: give advance (amount input), clear, mark paid (note input), mark unpaid, slip link. VERIFIED REQUIREMENT (FR-020). Evidence: views.py:599-625; templates. Confidence: HIGH.

## F-22 Give Advance
- Additive top-up of a worker's advance; amount must parse as integer >0 else friendly error; row-locked; ADJUST audit with before/after and actor; concurrency-safe (parallel gives serialize; sum exact). VERIFIED REQUIREMENT (FR-021). Evidence: views.py:637-655; services.give_advance; units; S1.01 [200,200]→140. Confidence: HIGH.

## F-23 Clear Advance
- Sets balance to zero; ALWAYS writes CLEAR audit including deliberate no-op record when already zero. VERIFIED REQUIREMENT (FR-022). Evidence: services.clear_advance_for_employee:72-103; prior E-series runtime. Confidence: HIGH.

## F-24 Mark Paid (payment authority)
- Marks the CURRENT week settled for a worker: creates the week's ledger row if absent (with click-time quantities) or updates PAYMENT STATE ONLY if present; stores paid date + optional note; repeats converge to one row. Mid-week payment followed by more work is reconciled by archive (quantities refreshed, paid preserved) — pinned product decision (BUG-17 resolution). VERIFIED REQUIREMENT (FR-023). Evidence: views.py:667-707; WeeklySnapshotSemanticsTests ×4. Confidence: HIGH.

## F-25 Mark Unpaid
- Reverses payment flags only (paid_status=False, date cleared); quantities untouched. Repeat-safe. VERIFIED REQUIREMENT (FR-024). Evidence: views.py:710-724. Confidence: HIGH.

## F-26 Salary Slip PDF
- Staff-only per-worker PDF slip for current week (worker name, week range, final pay). Streamed attachment. Inner-text parsing never verified (no extractor) — content requirement stated in REP-003. VERIFIED transport-level (magic bytes/filename/status). Evidence: views.py:730-751; R4.01. Confidence: MEDIUM (content), HIGH (availability).

## F-27 Global History XLSX Export
- One workbook, four sheets: Production (per-entry earnings at current rate), Pagdi history, Warp history, Salary ledger; bold headers; staff-only. Cell-level accuracy vs DB proven (5/5, 4/5-sheet matches). VERIFIED REQUIREMENT (FR-025). Evidence: views.py:816-865; R4.03/04.06/07. Confidence: HIGH.

## F-28 Weekly Salary XLSX Export
- Full salary-ledger workbook (all weeks, all workers). VERIFIED REQUIREMENT (FR-026). Evidence: views.py:867-909; R4.04. Confidence: HIGH.

## F-29 Salary Ledger Table (admin)
- All weekly records across workers, newest-week-first. VERIFIED REQUIREMENT (FR-027). Evidence: views.py:628-631. Confidence: HIGH.

## F-30 Weekly Archive / Reset Command
- Operator command freezes the week into ledger rows for EVERY worker: creates missing rows or REFRESHES existing ones' quantity fields to end-of-week truth; preserves payment flags; zeroes vestigial counter; reports created/refreshed counts; `--dry-run` predicts exact counts via rolled-back transaction; optional `--date`/`--note`; rerun = created 0 (idempotent). THE sole authority for weekly quantities (BUG-17 decision). VERIFIED REQUIREMENT (FR-028). Evidence: reset_weekly_salary.py; services.archive_and_reset_weekly_salaries:126-192; CLI runs this session (3 create +1 refresh predicted==actual; rerun 0). Confidence: HIGH.

## F-31 Advance Carry-Forward Command
- Operator command scales every outstanding advance by a factor (default 1.0): new = int(prev × factor); factor <0 rejected rc≠0; every worker audited each run incl. zeros (no-op CARRY rows); CLI actor recorded NULL; **`--dry-run` mode predicts affected count inside a rolled-back transaction** (UPDATED 6.1: dry-run sub-capability added); NON-IDEMPOTENT by design (repeat multiplies again) — dangerous under scheduler double-fire (documented constraint). VERIFIED REQUIREMENT (FR-029). Evidence: carry_advance command + services.carry_advances_to_next_week:248-317; K-series runtime; M4.x; grep of command parser. Confidence: HIGH.

## F-32 Django-Style Super Admin CRUD
- Out-of-app administrative surface over raw entities incl. audit tables (except WarpChangeHistory unregistered — OBSERVED inconsistency Q-09). Classified OBSERVED BEHAVIOR / OPTIONAL capability (REP of implementation detail) — Management-V1 may satisfy via its own admin tooling. Evidence: core/admin.py registrations. Confidence: HIGH (behavior).

## F-33 Audit Trail Views (via super-admin only)
- Money/material audit tables have NO app-facing UI anywhere; visible only through super-admin. Requirement split: capability exists (AUD data) vs accessibility requirement (AUD-009 proposes first-class audit UI in Management-V1). Evidence: Phase 2/4 findings; models. Confidence: HIGH.

## F-34 Notification Recipient Registry
- An entity for storing alert recipient emails exists (model + super-admin management) but NOTHING sends notifications anywhere. Classification: UNKNOWN / PARTIAL FEATURE (Q-10). Evidence: AlertEmail model; Phase 2. Confidence: HIGH that it is inert.

## F-35 Health/Root Endpoint
- Bare root URL returns a simple 200 string for liveness checks. OBSERVED BEHAVIOR → keep as NFR observability nicety (NFR-011). Evidence: urls.py:6; every server boot. Confidence: HIGH.

## F-36 Profile Picture Storage
- Media field exists on worker profile; storage provider configured; NO upload surface in app UI (super-admin only). OBSERVED BEHAVIOR / NOT APPLICABLE as core requirement (Q-11). Confidence: HIGH (inert).

## F-37 Search-in-Detail? / Pagination?
- Explicitly ABSENT: no pagination on lists or exports anywhere. OBSERVED LIMITATION → NFR-008 scale note + Open Question Q-12. Confidence: HIGH.

---

## Entry-Point Map (Phase 6.1 reconciliation)

One business capability may expose multiple UI/code entry points; these are NOT separate features:

| Capability | Primary entry | Alternates |
| ---------- | ------------- | ---------- |
| Production entry (F-15) | global panel form | detail-page `action=add_saree` form |
| Approval (F-04) | dedicated POST endpoint (list-page forms) | detail-page `action=approve` handler — **INERT** (no template posts it) |
| Admin dashboard (F-12) | `panel/` | `panel/dashboard/` alias (same view) |
| Login (F-02) | `/accounts/login/` | legacy in-app duplicate path |

**Inert sub-capabilities recorded (OBSERVED INERT — not requirements):**
1. Employee self-finish pagdi POST branch (views.py:171-174) — no button anywhere.
2. Detail-page approve branch (views.py:342-346) — superseded by F-04.

## Final Feature Catalog Summary (Phase 6.1)

| Category | Count | Items |
| -------- | ----- | ----- |
| Total features | **37** | F-01…F-37 |
| Verified requirements | **31** | F-01…F-31 |
| Observed behaviors/optional | **1** | F-32 |
| Partial | **1** | F-33 |
| Inert | **2** | F-36 (+ folded C-01/C-02 branches) |
| Unknown | **1** | F-34 |
| Reclassified technical/limitation | **2** | F-35, F-37 |
| Open bugs inside catalog | **0** | fixes absorbed as requirements; historical BUG register separate |
| New standalone discoveries | **0** | candidates merged/rejected |
| Merged entry-point duplicates | **3** | production entry, approval, dashboard alias |
| Removed/reclassified | **3** | F-34/F-35/F-37 |

**CORE:** F-01, F-02, F-15, F-17, F-19, F-21, F-22, F-23, F-24, F-28-ledger, F-30
**IMPORTANT:** F-03–F-05, F-06–F-11, F-14, F-16, F-18, F-20, F-25–F-27, F-29, F-31
**SUPPORTING:** F-12, F-13, F-32, F-33
**INERT/OBSERVED ONLY:** F-34, F-35, F-36, F-37

Full audit trail: `FEATURE_CATALOG_RECONCILIATION.md`.

## Feature Count Summary

36 catalogued features → mapped to functional requirements FR-001…FR-029 (+ capability notes F-32..F-37 mapped to REP/AUD/NFR/OQ items). Every feature above was traced to actual behavior (runtime where available), not merely to existence of models/buttons.
