# Phase 6.2 — Complete Workflow Specification

Perspective: BUSINESS workflows only. Implementation locations (Django views/services/commands) are cited as EVIDENCE, never as requirements. All behaviors below were runtime-verified during Phases 4/4.5/5 unless explicitly marked otherwise.

---

## 1. Workflow Principles

1. A workflow is a complete business operation crossing features/screens — not a page.
2. Business rules belong to the requirement; code locations are evidence only.
3. Money and material state changes must be atomic, auditable, and concurrency-safe (proven behavior to preserve).
4. The weekly ledger has TWO independent authorities: quantities (archive) and payment state (settlement actions) — they never overwrite each other.
5. Idempotency characteristics are contractual for any future scheduler.

## 2. Workflow Inventory

See `WORKFLOW_INVENTORY.md` — 14 workflows (13 fully reconstructed; WF-014 partial by design gap).

## 3. Authentication & Employee Lifecycle (WF-001 + WF-002)

# WF-001 — Worker Onboarding & Activation
**Purpose:** Let a workshop worker self-register and become a productive, paid identity under admin control.
**Actors:** Visitor (submits), Admin (approves), Employee (first login).
**Trigger:** Registration form submission.
**Preconditions:** Phone number unused.
**Inputs:** Name, phone, password.
**Flow:**
1. Visitor submits name/phone/password → validation: all required → else inline error, no state change.
2. Uniqueness check on phone → duplicate rejected with message ("Phone already registered"), no state change.
3. Account created in PENDING state (cannot log in); success feedback shown on login page ("waiting for admin approval").
4. Admin reviews pending list → POST approval (CSRF-protected; GET returns 400) → account becomes ACTIVE.
5. Employee logs in → lands on personal dashboard.
**Decision points:** missing fields → reject; duplicate phone → reject; login before approval → refuse WITHOUT session ("not approved yet"); wrong credentials → generic refusal; staff credentials → admin landing instead of dashboard.
**State changes:** none → Pending → Approved(active).
**Data effects:** identity record + worker profile created at signup (rate defaults 0, balance 0).
**Audit:** none currently (gap G-02 family — see AUD-008 requirement).
**Feedback:** per-case messages listed above.
**Failures/recovery:** every rejection leaves zero partial state; retry safe. Approval repeat-safe (idempotent).
**End state:** approved worker with session-capable identity, rate 0 until configured (WF-003).
**Next:** WF-003 → WF-004/WF-010/WF-011 become meaningful.
**Evidence:** views.py:37-97, 796-810; runtime: Phase 4 §6 table (all rows), 4.5 L5.01, unit ×4 approval tests, GET→400 probe.
**Confidence:** HIGH.

# WF-002 — Session Access Control
**Purpose:** Route each actor to the right surface; keep unapproved users out; end sessions cleanly.
**Flow:** credentials checked → unapproved-worker refusal (no session) | employee → dashboard | staff → panel. Logout destroys session immediately (post-logout protected access → redirect to login). Direct URL access to either surface without session → redirect-to-login (`next` preserved). Session cookie flags: HttpOnly+Lax per framework defaults.
**Failure paths:** nonexistent user / bad password → single generic error (no user enumeration).
**Idempotency:** logout repeat-safe.
**Evidence:** Phase 4 §6–7 full matrix; Phase 5 raw-status probes (302 bounces); settings/global_settings review.
**Confidence:** HIGH.

## 4. Employee Approval Workflow
Covered inside WF-001 step 4 (single business process). POST-only + CSRF enforced; idempotent; confirmation flash. No revocation path exists anywhere (GAP G-01).

## 5. Production Workflow (WF-004)

# WF-004 — Daily Production Recording & Correction
**Purpose:** Record each worker's daily piece output — the sole earnings input.
**Actors:** Admin ONLY (workers are read-only by explicit design).
**Trigger:** Entry form submit (two entry points: global form, worker-detail form — one capability) OR delete action.
**Preconditions:** Worker exists (approved workers offered in picker; detail-page path works for any existing worker).
**Inputs:** worker, date (defaults today if blank), count, optional note.
**Flow:**
1. Validate count integer → non-numeric → friendly error, no change.
2. Validate count ≥ 0 → negative → friendly error, no change.
3. Validate date format (ISO) → malformed → friendly error, no change. Future dates ALLOWED by design.
4. Insert entry → same-day duplicate for that worker → REJECTED gracefully ("already exists") with DB uniqueness as final backstop (no corruption even under parallel submits).
5. Success flash; weekly aggregates immediately reflect the new entry everywhere (dashboard/grid/detail parity runtime-proven).
**Correction sub-flow:** deletion by id → removed permanently; deleting a nonexistent id reports failure explicitly (no false success). Deletion is UNAUDITED (requirement AUD-006 demands better in Management-V1). No edit-in-place exists — correction = delete + re-create (with duplicate-day constraint interaction: re-create same day requires prior delete).
**State changes:** production total for that worker/date set; week totals shift live.
**Calculations:** CALC-001/CALC-002 consume these entries.
**Idempotency:** insert NOT idempotent (duplicate rejected — intentionally error-producing); delete idempotent-failure (second delete = "not found").
**Transactions:** single-record atomic insert; constraint-guarded.
**Temporal:** date may be past/future; only entries within current Mon–Sun window affect current-week numbers (verified across midnight rollovers).
**Evidence:** views.py:362-406, 757-793; units ×5; qa45 W1.x incl. parallel [200,200,200]; truth45 exclusion checks.
**Confidence:** HIGH.

## 6. Production → Salary Workflow (core spine, cross-feature)

Connected process: **WF-004 → WF-005 → WF-007 → WF-008 → WF-012/013.**

| Transition | Why | Data passed | State created | Evidence |
| ---------- | --- | ----------- | ------------- | -------- |
| Production entry → Weekly review | Earnings accumulate per Mon–Sun week | aggregate of counts × rate (CALC-001) | live week totals visible on grid/dashboard | parity checks F01/F03/M2.01 |
| Weekly review → Payment settlement | Admin decides settlement from live numbers | week bounds, worker id | ledger row created-if-missing (click-time quantities) or payment-fields-only update | mark_paid code + units |
| More production after mid-week payment | work continues after settlement | additional counts | divergence between stored row & live totals — TEMPORARY by design | BUG-17 resolution semantics |
| Settlement → Archive | week closes | all workers' weeks | archive REFRESHES quantity fields of pre-existing rows to full-week truth, PRESERVES paid flags | units pay→work→archive test; CLI dry-run==real |
| Archive → Ledger/Exports | history becomes authoritative | immutable-ish ledger rows | historical records; next week starts clean (live counters zeroed) | post-archive truth checks |

**Authority model (pinned business decision):**
- QUANTITY authority = archive operation alone. Mark-paid NEVER alters quantities when the row exists.
- PAYMENT authority = mark-paid/unpaid alone. Archive NEVER touches paid flags/dates.
- Before archive: everything mutable; mid-week ledger rows may hold stale quantities temporarily.
- After archive runs for a week: that week's quantities are canonical; app offers NO edit of archived weeks (super-admin surgery only, out-of-band).
- Archive rerun: numerically no-op refreshes, created=0 (idempotent).

## 7. Advance Workflow (WF-006 + WF-009)

# WF-006 — Advance Issuance & Clearing
**Purpose:** Track money advanced against future wages; deduct it from weekly pay until cleared.
**Actors:** Admin.
**Inputs:** amount (integer > 0) for give; none for clear.
**Flow (give):** validate >0 → lock worker row → additive top-up → write ADJUST audit (before/after/actor/note) atomically → confirm flash. Parallel gives serialize; combined sum exact (runtime: two +70 → exactly 140, both audited).
**Flow (clear):** set 0; ALWAYS audit CLEAR including deliberate no-op record when already zero (audit honesty rule).
**Effect on pay:** outstanding balance deducted from EVERY week's final (CALC-002) until cleared/carry-reduced — no installment logic exists.
**Failure/concurrency:** invalid amounts rejected friendly; row locks prevent lost updates.
**Idempotency:** give NON-IDEMPOTENT by design (money accumulation); clear effectively idempotent (audited no-op).
**Evidence:** services.give_advance/clear_advance; units; E-series runtime incl. no-op clear audit.
**Confidence:** HIGH.

# WF-009 — Advance Carry-Forward
**Purpose:** Period-close adjustment scaling all outstanding balances by an operator-chosen factor.
**Actor/trigger:** Operator via CLI (`carry_advance --factor F [--dry-run]`).
**Rules:** factor ≥ 0 else exit≠0; per-worker: prev==0 → recorded NO-OP CARRY event; else new=int(prev×F) written + CARRY audit (before/after). CLI runs record NULL actor (distinguishes operator commands from panel actions). `--dry-run` predicts count then rolls back.
**⚠ NON-IDEMPOTENCE CONSTRAINT (pinned):** repeating with F≠1 multiplies again (100→50→25 observed). Any scheduler double-fire CORRUPTS balances downward/upward. Management-V1 MUST treat carry as operator-gated or make execution inherently once-per-period. Zero-balance workers still receive audit rows each run.
**Rounding:** truncation toward int(prev×factor).
**Evidence:** services.carry_advances_to_next_week:248-317; K-series (f=1.0 audits-all; f=0.5 halvings exact chain; f=-1 rejected; repeat compounding observed); M4.x rerun rc=0.
**Confidence:** HIGH.

## 8. Payment Workflow (WF-007)

Covered in §6 transitions; specifics:
- Mark PAID: current-week scope only; creates ledger row if absent (storing click-time quantities + paid flag/date + note) or updates ONLY payment fields if present; repeats converge (one row).
- Mark UNPAID: clears flag/date; quantities untouched; repeat-safe.
- Negative finals are payable (debt-recovery semantics pinned as intended business rule — CALC-002 note).
- Reversal after archive: possible only for CURRENT week; archived past weeks' flags immutable through the app (GAP G-03).
- Failure: unknown worker id → clean 404; GET on endpoint → 400 POST-only guard.
**Evidence:** views.py:667-724; units ×4; qa45 M3 cycle; truth45 paid-preservation.

## 9. Weekly Archive Workflow (WF-008)

**PRE-ARCHIVE:** live week open; entries accumulate; ledger rows exist only where earlier payment clicks created them (possibly stale quantities); vestigial counter arbitrary; advances untouched by anything automatic.
**Operation (operator-run command):**
1. Compute week window (Mon–Sun of target date; default today; `--date` override).
2. Lock entire workforce (write-blocking snapshot).
3. Per worker: compute full-week truth (CALC-004) → ledger row EXISTS? refresh its five quantity fields : create row (paid=false, note configurable).
4. Zero vestigial live counter where nonzero.
5. Report {created, refreshed}; `--dry-run` computes identical numbers inside rolled-back transaction first.
**POST-ARCHIVE:** every worker has a canonical week row; paid flags exactly as-settlement-left them; advances untouched (survive into next week — verified); week closed (new entries land next week's window).
**Repeat execution:** created=0, refreshed=N with identical values — IDEMPOTENT.
**Note behavior:** `--note` seeds created-row notes only.
**Audit:** archive itself writes NO dedicated audit events beyond resulting ledger rows (operator action visibility = command output only) — noted as AUD improvement requirement AUD-009.
**Failure:** whole-run transaction; any error rolls back everything (dry-run sentinel proves rollback machinery).
**Evidence:** reset_weekly_salary.py; services:126-192; this-session CLI triple-run (predict 3c+1r == actual; rerun 0c+4r); units ×3; Phase 4 G-series original idempotency proof.
**Confidence:** HIGH.

## 10. Pagdi Workflow (WF-010)

Lifecycle: **assign → ACTIVE → progress accrues → auto-finish on reassignment (or implicit completion paths) → FINISHED (terminal) → history.**
- Assign: validated inputs (ISO date required & well-formed; capacity integer ≥0; worker must exist) → ATOMIC locked sequence: finish every open pagdi of that worker (each FINISH-audited) → create new ACTIVE (+CREATE audit w/ capacity & actor). Friendly errors replace all crash classes.
- Progress: made = production entries within [start, bound] where bound = min(today, end); remaining = max(0, capacity − made) (CALC-003/4).
- Completion: ONLY via new assignment (auto-finish) — no explicit admin finish button; worker self-finish branch exists but unreachable (inert). GAP G-05.
- Reassignment convergence: repeated assigns leave exactly ONE ACTIVE (race-proven: 5-way parallel → 1 ACTIVE, losers roll back atomically, audits consistent CREATE→FINISH→CREATE).
- Deletion: not offered in app (super-admin only).
- History: full assignment list per worker + global list with badges/progress.
**Differences vs Warp:** see §11.
**Evidence:** views.py:449-511; finish_pagdi service; units; race probes; tmp_invariant sweeps.
**Confidence:** HIGH.

## 11. Warp Workflow (WF-011)

Identical skeleton to Pagdi with these VERIFIED DIFFERENCES:
1. Start date always TODAY (server-local) — no date input.
2. EXPLICIT completion exists: POST-only finish route per active warp; GET→400; finishing finished warp → friendly info (idempotent outcome); FINISH audited.
3. Capacity input labeled simply "capacity"; identical validation/clamping.
4. Dedicated audit model (WarpChangeHistory) mirroring pagdi audits.
Everything else (atomic auto-finish-on-reassign, single-ACTIVE invariant, progress math, history surfaces) matches WF-010.
**Evidence:** views.py:532-593; finish_warp service; units ×4; live double-assign=1-active check.
**Confidence:** HIGH.

## 12. Employee History Workflow (WF-012)

Consumption-only projections: personal pages (production w/ per-row pay at CURRENT rate, active-material progress, combined histories, salary ledger w/ empty states) and admin consoles (searchable roster, drill-down console aggregating all four history types, global ledger table). Strict self-scoping proven positively (zero-data user sees empty states while others hold rows). Search = free-text contains over name/phone.
**Evidence:** views.py:138-252, 290-301, 628-631; isolation probes; L3/L4 nav probes.
**Confidence:** HIGH.

## 13. Salary History Workflow (WF-012 subsection)
Ledger rows appear via settlement-clicks (current week) or archive (all workers). Rows list week range, pieces, rate, gross, advance, final, paid flag/date, note. Historical quantities are archive-canonical; CURRENT-week rows may be pre-archive snapshots. Empty-state handled. See REP-002.

## 14. Reporting Workflow (WF-013)

| Output | Source | Period | Calculation authority | Permission | Notes |
| ------ | ------ | ------ | --------------------- | ---------- | ----- |
| PDF slip | LIVE current-week aggregates | current Mon–Sun | inline live compute | staff | content spec REP-003; text-layer never parsed (NOT VERIFIED) |
| Global XLSX | FULL DB dump (production/materials/ledger) | all-time | per-row earnings at CURRENT rate (CALC-008) | staff | 4 fixed sheets, bold headers; cell-exact vs DB |
| Weekly XLSX | ledger table | all weeks | ledger values as-stored | staff | mirrors REP-002 columns |
| Dashboards/cards | live counts/aggregates | current week | CALC-001/002 | role-scoped | parity-proven |

Export pricing caveat (business rule BR-023): historical production rows valued at TODAY'S rate — intentional external design; Management-V1 must decide consciously (Open Question Q-06).
**Evidence:** R4-series cell-match verifications; export code; permission probes (employee blocked 302).
**Confidence:** HIGH (structure/permission/values-at-cell-level); MEDIUM for slip inner text.

## 15. Export Workflow
Covered in §14 — exports are outputs of ledger/live data, not independent lifecycles. Files streamed, never persisted server-side.

## 16. Audit Workflow (WF-014)

| Business action | Audit event? | Actor captured | Before/After |
| --------------- | ------------ | -------------- | ------------ |
| Give advance | ADJUST ✓ | yes (panel) / NULL (CLI context) | yes |
| Clear advance | CLEAR ✓ (incl. no-op) | yes | yes |
| Carry run | CARRY ✓ per worker (incl. zeros) | NULL | yes |
| Pagdi assign/auto-finish | CREATE/FINISH ✓ | yes | capacities/end-dates |
| Warp assign/explicit finish | CREATE/FINISH ✓ | yes | capacities/end-dates |
| Production add/delete | ✗ NONE | — | — |
| Rate change | ✗ NONE | — | — |
| Approve | ✗ NONE | — | — |
| Paid/unpaid flips | ✗ NONE | — | — |
| Signup/approval identity events | ✗ NONE | — | — |

Missing coverage = REQUIREMENT finding (AUD-006..008): Management-V1 must audit these mutations; do NOT inherit silence. Audit rows survive worker deletion (SET_NULL + name snapshot) — verified. Read surface currently super-admin-only (AUD-009 proposes proper UI).
**Evidence:** models/services audit writes; truth45 chain counts; AuditSurvivalTests; Phase 4 §16 gaps table.
**Confidence:** HIGH.

## 17. Failure & Recovery Workflows (consolidated)

| Scenario | Behavior | Recovery |
| -------- | -------- | -------- |
| Invalid input (any class) | friendly message, zero state change | resubmit corrected |
| Duplicate-day production | rejected w/ message; constraint backstop; parallel-safe | different date or delete existing first |
| Unauthorized access | redirect(302)/400/403 depending surface/method | authenticate properly |
| Nonexistent object | clean 404 (staff detail/finish routes) or explicit not-found flash (entry delete) | — |
| Concurrent same-target writes | serialized via row locks (advances) / atomic converge (materials); SQLite lock-timeout → 500 but ATOMIC rollback (no corruption) | retry |
| Mid-operation crash | transaction rollback (whole-command for archive/carry; per-request elsewhere) | rerun (idempotent ops) |
| Archive rerun | created=0 refresh-no-op | — |
| Payment reversal | flags-only flip, repeat-safe | re-mark |
| Deleting already-deleted entry | explicit "not found" failure | — |

## 18. Idempotency Analysis (scheduler contract)

| Action | Class | Evidence |
| ------ | ----- | -------- |
| Approve | IDEMPOTENT | repeat POST test |
| Production insert | ERROR-PRODUCING (dup rejected) | constraint + friendly handling |
| Production delete | CONDITIONALLY (second attempt fails cleanly) | not-found flash |
| Give advance | NON-IDEMPOTENT (additive) | 140 sum test |
| Clear advance | IDEMPOTENT (audited no-op) | E07 |
| Mark paid/unpaid | IDEMPOTENT | M3 cycle |
| Archive | IDEMPOTENT (created=0) | triple-run |
| Carry f=1.0 | value-idempotent, audit-writing | K01 |
| Carry f≠1 | **NON-IDEMPOTENT** | 100→50→25 compounding |
| Material assign | CONVERGENT (single-ACTIVE outcome) | race tests |
| Warp finish (repeat) | IDEMPOTENT-friendly | info message |

## 19. Transaction & Atomicity Analysis

Single-transaction operations: give/clear advance (lock+update+audit), material assign (finish-old+create-new+audits), archive (whole workforce), carry (whole run), dry-runs (rollback-by-sentinel). Multi-request races: advances serialize; materials converge; duplicates rejected. Partial-state impossibility demonstrated under forced contention (lock-timeout 500s rolled back clean). Constraint layer (uniqueness/positivity) acts as final guardian everywhere.

## 20. Temporal Workflow Analysis

- Clock source: server-local date; timezone pinned Asia/Kolkata.
- Week definition: Monday–Sunday (weekday arithmetic), CONFIRMED by boundary tests incl. live midnight rollover observations (Sat→Sun→Mon across sessions).
- Current-week scope: dashboards/grid/settlement/archive default to the week containing "today".
- Future-dated entries: accepted, stored, EXCLUDED from totals until their week becomes current (both directions verified: next-Monday excluded now; previous-Saturday excluded after rollover).
- `--date` on archive permits reconstructing any specific week's window.
- No month/year boundaries exist in logic (pure weekly system).
- Carry operates on balances regardless of week phase; archive does NOT touch advances.

## 21. Complete Business Dependency Graph

See `WORKFLOW_DEPENDENCY_GRAPH.md` (three spines + ops/audit layers, full transition annotations).

## 22. Workflow Traceability

See `WORKFLOW_FEATURE_TRACEABILITY.md` — all 31 verified features mapped; supporting/administrative items explicitly classified so nothing disappears.

## 23. Workflow Gaps

See `WORKFLOW_GAP_ANALYSIS.md` — G-01…G-07 (lifecycle one-way-ness, unaudited corrections, past-week immutability, carry scheduling hazard, pagdi finish asymmetry, archive ownership undefined, notification intent unknown).

## 24. Unverified Workflow Behavior

1. PDF slip inner text values (stream valid; content assumed from shared computation path).
2. Behavior under PostgreSQL-specific locking (environment absent).
3. Scheduled-execution interactions (nothing schedules anything — constraint documented instead).

## 25. Completeness Assessment

All 14 inventoried workflows reconstructed start→finish with actors/validation/state/data/audit/failure/idempotency/temporal dimensions; core spine traced cross-feature with authority model; blind-developer test passes for business operation understanding (a developer could rebuild behavior without the repository). Remaining unknowns are environmental or flagged as human-decision gaps, none silent.
