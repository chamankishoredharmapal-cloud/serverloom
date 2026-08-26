# Phase 6.3 — Management-V1 Business Rule Specification

Perspective: BUSINESS requirements for Management-V1. The external application (serverloom) is EVIDENCE, not specification. Every rule below is classified; implementation behavior that must NOT be reproduced is flagged. Evidence keys are defined in §2.3.

---

## 1. Purpose

This document is the complete business-rule system extracted from the external/reference application and reconciled against Phases 1–5 and Phase 6.1/6.2. It answers: *what conditions must be true, what actions are allowed, what calculations must occur, what transitions are valid, and what outcomes must happen* — independent of the external app's Django implementation.

Consumers: Management-V1 architecture (Phase 6.4+) and implementation (Phase 7). Companion documents:

- `BUSINESS_RULE_INVENTORY.md` — flat master inventory of all 109 rules with classification, confidence, priority, status.
- `BUSINESS_RULE_TRACEABILITY.md` — rule ↔ feature ↔ workflow ↔ calculation ↔ state ↔ data/security/audit/test mapping.
- `BUSINESS_RULE_DECISIONS_REQUIRED.md` — human decision register (12 open business decisions).
- `BUSINESS_RULE_RECONCILIATION.md` — ID reconciliation vs prior phases, contradiction analysis, second-pass record.

## 2. Rule Classification

### 2.1 Classification vocabulary

| Class | Meaning |
| ----- | ------- |
| VERIFIED BUSINESS RULE | Behavior intended by the business, runtime/repository verified |
| VERIFIED SECURITY RULE | Access/integrity boundary verified by test or probe |
| VERIFIED VALIDATION RULE | Input acceptance/rejection contract verified |
| VERIFIED CALCULATION RULE | Formula/rounding/order-of-operations verified |
| VERIFIED STATE RULE | Lifecycle/transition verified |
| VERIFIED DATA-INTEGRITY RULE | Constraint/invariant/atomicity verified |
| OBSERVED IMPLEMENTATION BEHAVIOR | What the code does today; NOT automatically a requirement |
| BUG / UNDESIRED BEHAVIOR | Historical defect; Management-V1 must NOT reproduce it as a rule |
| MANAGEMENT-V1 DECISION REQUIRED | External behavior may not be desired; routed to decision register |
| UNKNOWN | Could not be established within investigation bounds |

### 2.2 Rule counts (this phase)

| Series | Domain | Count | IDs |
| ------ | ------ | ----- | --- |
| BR-xxx | Business rules | 40 | BR-001…BR-040 |
| VAL-xxx | Validation rules | 13 | VAL-001…VAL-013 |
| CALC-xxx | Calculation rules | 9 | CALC-001…CALC-009 |
| STATE-xxx | State rules | 9 | STATE-001…STATE-009 |
| SEC-xxx | Security rules | 8 | SEC-001…SEC-008 |
| DATA-xxx | Data-integrity rules | 11 | DATA-001…DATA-011 |
| AUD-xxx | Audit rules | 9 | AUD-001…AUD-009 |
| OPS-xxx | Operational rules | 10 | OPS-001…OPS-010 |
| **Total** | | **109** | |

### 2.3 Evidence keys

| Key | Source |
| --- | ------ |
| EV-VIEWS | `serverloom-main/accounts/views.py` (line refs current file) |
| EV-SVC | `serverloom-main/core/services.py` |
| EV-MDL | `serverloom-main/core/models.py` |
| EV-CMD-R / EV-CMD-C | `core/management/commands/reset_weekly_salary.py` / `carry_advance.py` |
| EV-TS | `core/tests/test_stabilization.py`; EV-TA = `core/tests/test_advance_and_reset.py` |
| EV-P4 | PHASE_4_APPLICATION_VERIFICATION.md |
| EV-R45 | PHASE_4_5_STABILIZATION_REPORT.md (runtime verification session) |
| EV-WF62 | PHASE_6_REQUIREMENTS/02_WORKFLOW_SPECIFICATION.md |
| EV-FC61 | PHASE_6_REQUIREMENTS/01_FEATURE_CATALOG.md (F-xx) |
| EV-GAP62 | WORKFLOW_GAP_ANALYSIS.md (G-xx) |

Confidence: HIGH = repository + runtime/test evidence; MEDIUM = repository evidence only, or partial runtime; LOW = inference.

### 2.4 Rule entry format

Every rule uses the compact structure: Rule / Domain / Applies To / Trigger / Preconditions / Condition / Required Outcome / Forbidden Outcome / Exceptions / State·Data·Calculation·Audit·Security Effect (when applicable) / Evidence / Verification Method / Confidence / Priority+Status / Management-V1 Decision. Fields that do not apply are omitted.

### 2.5 Worked salary example (runtime-proven, reused throughout)

From Phase 4/4.5 runtime sessions (EV-R45 §3b, §8; EV-P4 §10, §25):

```text
Worker Alpha   rate=25  week pieces=15   advance=0
  Gross = 15 × 25        = 375
  Final = 375 − 0        = 375          → archived UNPAID row exact (15 / 375)

Worker Gamma   gross=0  advance=140 (two parallel gives of +70)
  Final = 0 − 140        = −140         → stored −140 consistently (compute + archive);
                                          payable debt-recovery semantics (BUG-18 pin)

Worker Beta    mid-week Mark-Paid click, then MORE production same week
  Click row stores click-time quantities, paid=True
  Archive REFRESHES quantity fields to full-week truth, KEEPS paid=True
  → quantities authoritative from archive only (BR-014/BR-016)

Carry chain (f=0.5): 100 → 50 → 25 observed across repeated runs
  → NON-IDEMPOTENT for f≠1 (BR-040)
```

---

## 3. Identity & Employee Rules

# BR-004 — Phone Is the Login Identity and Must Be Unique
## Rule
A worker's phone number IS their account username; at most one account may exist per phone.
- **Domain:** Identity. **Applies To:** F-01 signup, F-02 login. **Trigger:** Signup submission; login authentication.
- **Preconditions:** — **Condition:** `User(username=phone)` does not already exist.
- **Required Outcome:** Unique phone creates User + Employee profile; duplicate rejected with message "Phone already registered"; no state change on rejection.
- **Forbidden:** Second account on same phone; silent overwrite; enumeration-friendly errors.
- **Data Effect:** username=phone persisted (max 15 chars); Employee.phone indexed.
- **Evidence:** EV-VIEWS:46-49 (uniqueness check), EV-MDL:17 (phone field/index); EV-P4 §6 duplicate rejection runtime; unit DuplicateSareeEntryTests family covers constraint discipline generally.
- **Verification:** Runtime signup duplicate probe (Phase 4 §6). **Confidence:** HIGH. **P1 / DOCUMENTATION ONLY.**
- **Management-V1 Decision:** PRESERVE (phone-as-identity). See D-10 for format hardening (VAL-012).

# BR-022 — Approval Gates Login
## Rule
An unapproved worker account MUST NOT obtain a session. Wrong credentials get one generic error; non-staff/non-employee users are refused outright.
- **Domain:** Identity / Security boundary. **Applies To:** WF-001/WF-002.
- **Trigger:** Login POST. **Condition:** authenticated user's employee.is_approved == False → refuse ("Account not approved yet.") WITHOUT calling login(); no employee profile and not staff/superuser → "Unauthorized account."
- **Required Outcome:** No session issued for unapproved/unauthorized identities; generic "Invalid phone or password." for bad credentials (no enumeration).
- **Forbidden:** Session issuance to pending accounts; distinct errors revealing account existence beyond framework behavior.
- **State Effect:** none on refusal. **Security Effect:** complements SEC-002.
- **Evidence:** EV-VIEWS:65-92; EV-P4 §6 full auth matrix; EV-R45 §3a T1/T2.
- **Confidence:** HIGH. **P0 / DOCUMENTATION ONLY** (core access gate).
- **Management-V1 Decision:** PRESERVE.

# BR-025 — Signup Always Creates a PENDING Worker With Zeroed Payroll Defaults
## Rule
Self-signup creates an INACTIVE (is_approved=False) worker profile with rate 0 and advance balance 0; activation requires explicit admin approval.
- **Domain:** Identity / Payroll setup. **Applies To:** F-01, WF-001.
- **Trigger:** Successful signup POST. **Condition:** valid unique inputs.
- **Required Outcome:** User + Employee created (rate=0, advance=0, approved=False); redirect to login with visible confirmation ("waiting for admin approval" — fixed BUG-05).
- **Forbidden:** Auto-approval; nonzero starting rate/balance; partial records on failure.
- **Data Effect:** DATA-001/DATA-002 defaults. **Audit Effect:** none today → requirement AUD-008.
- **Evidence:** EV-VIEWS:37-60; EV-MDL:32-33,40; EV-R45 §3b L5.01 confirmation visibility.
- **Confidence:** HIGH. **P1 / DOCUMENTATION ONLY.**
- **Management-V1 Decision:** PRESERVE + ADD audit (AUD-008).

# BR-035 — Employees Have Read-Only Self-Service Surfaces Only
## Rule
Workers can view their own dashboard, production history, material progress/history, combined history, and salary ledger. They can NEVER add, edit, delete, price, or settle anything.
- **Domain:** Authorization / Production. **Applies To:** all `/employee/*` routes.
- **Trigger:** Any employee-surface request. **Condition:** request mutates nothing.
- **Required Outcome:** All employee pages are pure reads scoped to self (SEC-005).
- **Forbidden:** Any mutation endpoint reachable by employees (rate setting, entries, advances, payments — all tested blocked).
- **Exceptions:** Inert self-finish pagdi POST branch exists in code but has no UI trigger anywhere — OBSERVED INERT, NOT a rule (see BR-029/G-05).
- **Evidence:** EV-VIEWS:103-252 (read-only views); RateSettingTests employee-block; export/slips staff-gated probes; EV-FC61 F-07/F-08/F-09.
- **Confidence:** HIGH. **P0 / DOCUMENTATION ONLY.**
- **Management-V1 Decision:** PRESERVE.

# BR-036 — Worker Lifecycle Is Currently One-Way (OBSERVED — DECISION REQUIRED)
## Rule (CURRENT EXTERNAL RULE)
Approval is irreversible through the app: there is NO deactivate, suspend, rehire, or delete flow. Departed workers remain forever in pickers, grids, and archives.
- **Domain:** Identity lifecycle. **Applies To:** G-01.
- **Trigger:** n/a (absence). **Condition:** no transition writer for APPROVED→anything except out-of-app super-admin surgery (including CASCADE deletion which destroys production/material history).
- **Required Outcome (external):** one-way PENDING→APPROVED (STATE-001).
- **Forbidden (external):** none enforced — this is a GAP, not a safeguard.
- **Business Implication:** departed workers pollute operational surfaces indefinitely; deletion path destroys forensic history (mitigated for money audits only by DATA-008).
- **Evidence:** route/template sweep (Phase 6.1 §5); EV-GAP62 G-01; Phase 3 lifecycle §6; cascade probe EV-P4 §13.
- **Confidence:** HIGH (that the limitation exists); UNKNOWN (intended policy).
- **Priority:** P2 / HUMAN ACTION. **Management-V1 Decision:** HUMAN DECISION REQUIRED → register D-01 (do NOT auto-preserve).

# BR-005 — Approved Workers Are Eligible for Assignment Pickers
## Rule
The global production-entry form and both material-assignment forms offer ONLY approved workers. A pending worker cannot be assigned materials or entered via those pickers.
- **Domain:** Eligibility. **Applies To:** F-15 global form, F-17, F-19.
- **Trigger:** Form render + submit. **Condition:** `Employee.objects.filter(is_approved=True)`.
- **Required Outcome:** pickers exclude pending workers; forged ids rejected friendly (VAL-009).
- **Forbidden:** assigning materials to unapproved workers through supported paths.
- **Exceptions (OBSERVED IMPLEMENTATION BEHAVIOR):** the worker-detail add-entry path (`action=add_saree`) works for ANY existing worker id including pending ones — eligibility is picker-level, not hard-enforced there. Management-V1 should hard-enforce (IMPROVE).
- **Evidence:** EV-VIEWS:451,534,759 (filtered pickers) vs :362-396 (detail path unrestricted); EV-WF62 §5 precondition note.
- **Confidence:** HIGH. **P1 / DOCUMENTATION ONLY (+IMPROVE note).**
- **Management-V1 Decision:** IMPROVE — enforce approval server-side on every production/material write.

---

## 4. Approval Rules

# STATE-001 — Employee Account States
## Rule
Exactly two states exist: PENDING (default) → APPROVED. Transition is admin-triggered, POST+CSRF-only, idempotent, and irreversible in-app.
| Current state | Action | Condition | Allowed? | Next state | Actor | Forbidden transitions |
|---|---|---|---|---|---|---|
| PENDING | POST /panel/employees/<id>/approve/ (CSRF) | staff session | YES | APPROVED | Admin | self-approval, GET approval |
| APPROVED | repeat POST | staff | YES (no-op success) | APPROVED | Admin | APPROVED→PENDING (no revocation path exists) |
- **Effects:** is_approved=True; updated_at bump; NO audit event today (requirement AUD-008); no other data touched.
- **Evidence:** EV-VIEWS:796-810; template admin_employees.html POST form; ApprovalSecurityTests ×4 (GET→400, tokenless→403, idempotent, anonymous blocked); EV-P4 §7 BUG-12 historical.
- **Confidence:** HIGH. **P0 / DOCUMENTATION ONLY.**
- **Management-V1 Decision:** PRESERVE transition semantics; ADD audit (AUD-008); lifecycle extension = D-01.

# BR-021-adjacent approval facts (fold into STATE-001/D-01)
- Approval is required for LOGIN (BR-022) but NOT technically required for production entry via the detail-page path (BR-005 exception) — OBSERVED nuance, M-V1 must close.
- Approval is NOT reversible in-app → part of BR-036 (D-01).
- Duplicate/repeat approval is safe (idempotent) — verified.
- Method restriction evidence: GET→400, tokenless POST→403 — security mechanism recorded under SEC-004; the BUSINESS requirement is "approval is a deliberate staff act, not link-clickable".

---

## 5. Production Rules

# BR-001 — Production Recording Is Admin-Only
## Rule
Only staff may create or delete production entries. Workers have no write path (BR-035).
- **Domain:** Production. **Applies To:** WF-004 (F-15/F-16). **Trigger:** any entry create/delete request.
- **Required Outcome:** writes succeed only for staff sessions; two UI entry points (global form + detail form) are ONE capability.
- **Forbidden:** employee/self-service writes; unauthenticated writes.
- **Evidence:** EV-VIEWS:757-793, :362-406 (@staff_required); EV-FC61 F-15; EV-WF62 §5.
- **Confidence:** HIGH. **P0 / DOCUMENTATION ONLY.** **Decision:** PRESERVE.

# BR-002 — Count Must Be a Non-Negative Integer; Invalid Input Rejected Gracefully
## Rule
A production count must parse as an integer ≥ 0. Unparseable or negative input is refused with a friendly message and ZERO state change (historical HTTP-500 crash class eliminated — see §21 BUG list).
- **Domain:** Production / Validation. **Trigger:** entry submit.
- **Required Outcome:** reject non-numeric ("Invalid saree entry."/"Invalid count") and negative ("Count cannot be negative."); persist valid integers.
- **Forbidden:** negative stored rows; 500-class failures on operator input paths.
- **Evidence:** EV-VIEWS:377-385, :762-780; DB CHECK via PositiveIntegerField (DATA-010); tests NegativeCount/invalid-date friendly (EV-TS); EV-R45 W1.x live batch; EV-P4 §9 historical 500s.
- **Confidence:** HIGH. **P0 / DOCUMENTATION ONLY.** **Decision:** PRESERVE.

# BR-027 — Zero-Count Entries Are Valid
## Rule
A count of 0 is accepted and stored (it contributes 0 earnings and 0 material progress).
- **Evidence:** validation is `count < 0` only (EV-VIEWS:383,779); model default 0 (EV-MDL:57); no zero-rejection anywhere.
- **Confidence:** HIGH (repository; consistent with runtime batches). **P2 / DOCUMENTATION ONLY.**
- **Decision:** PRESERVE (supports e.g. recording an attended day with no output). Flag: confirm intent in D-07 review? No — low-risk; DOCUMENTATION ONLY.

# BR-003 — At Most One Entry Per Worker Per Calendar Day
## Rule
Duplicate same-day entries for the same worker are REJECTED gracefully ("already exists"); the database uniqueness is the final backstop even under parallel submits.
- **Domain:** Production / Duplicate prevention.
- **Condition:** unique (employee, date). **Required Outcome:** exactly one row per worker-day; violators receive message; no corruption under races (savepoint isolates integrity failure).
- **Forbidden:** duplicate rows; 500s; lost updates masking duplicates.
- **Evidence:** EV-MDL:65 (unique_together); EV-VIEWS:387-393,782-789 (friendly IntegrityError handling); DuplicateSareeEntryTests ×3; parallel S1.03 [200,200,200]→single row (EV-R45 §3a).
- **Confidence:** HIGH. **P0 / DOCUMENTATION ONLY.** **Decision:** PRESERVE invariant regardless of technology.

# BR-024 — Dates: Past and Future Both Accepted; Only Current-Window Entries Affect Live Numbers
## Rule
An entry date may be any calendar date (past back-dating and future pre-dating allowed BY DESIGN). Blank date defaults to server-local today. Future-dated entries are stored but EXCLUDED from weekly totals until their week becomes the current week (verified across rollovers both directions).
- **Domain:** Production / Temporal. **Trigger:** entry submit; every aggregate computation.
- **Required Outcome:** storage accepts any ISO date; aggregates filter strictly [monday..sunday] of the reference week (CALC-001).
- **Forbidden:** future entries inflating current totals; malformed dates storing.
- **Exceptions:** none (future-dating is intentional operator flexibility).
- **Evidence:** EV-VIEWS:369-375,768-776 (fromisoformat, blank→today); next-week-exclusion & post-rollover exclusion runtime (EV-WF62 §20; EV-R45 §8 truth batch); CapacityFormulaTests future-exclusion analog (EV-TS).
- **Confidence:** HIGH. **P1 / DOCUMENTATION ONLY.** **Decision:** PRESERVE (revisit product-wise if abuse emerges).

# BR-026 — Correction Model = Delete + Re-Create (No Edit-in-Place)
## Rule
The ONLY correction mechanism for a wrong entry is permanent deletion followed by re-entry. Deleting a nonexistent/duplicate-deleted id reports explicit failure ("Entry not found." — false-success bug eliminated). Deletion is currently UNAUDITED (requirement gap → AUD-006).
- **Domain:** Production correction. **Applies To:** G-02.
- **Required Outcome:** delete removes the single row permanently; re-create obeys BR-002/BR-003 (so same-day recreate needs prior delete).
- **Data Effect:** deleting an ARCHIVED-week entry leaves already-written ledger snapshots unchanged (ledger authority = archive, BR-014) — creating a possible drift between raw history and ledger truth (see Reconciliation C-02).
- **Evidence:** EV-VIEWS:398-406; delete-nonexistent test (EV-TS); EV-WF62 §5 correction sub-flow; EV-GAP62 G-02.
- **Confidence:** HIGH. **P1 / REQUIRES FIX (audit depth) → D-02.**
- **Management-V1 Decision:** IMPROVE — soft-delete or audited delete; HUMAN decides retention window (D-02).

---

## 6. Rate Rules

# BR-006 — Rate Configuration: Staff-Set Non-Negative Integer
## Rule
Per-piece rate is set/changed by staff only, from the worker detail page. Value must be an integer ≥ 0; invalid input leaves the previous rate unchanged ("Invalid salary value."). New workers start at 0 (zero rate legal — work still recordable, pays nothing).
- **Domain:** Payroll setup. **Applies To:** WF-003 (F-05).
- **Required Outcome:** valid integer persists immediately; invalid never corrupts.
- **Forbidden:** negative rates; non-staff changes; employee self-change.
- **Evidence:** EV-VIEWS:348-360; admin_employee_detail.html rate form; RateSettingTests ×3 (staff set / invalid rejected / employee blocked); EV-R45 W3.x.
- **Confidence:** HIGH. **P0 / DOCUMENTATION ONLY.** **Decision:** PRESERVE. No maximum bound exists (OBSERVED; large ints permitted — accept unless business objects, D-10 scope note).

# BR-039 — Rate Changes Are Immediately Live for Open Weeks; Archived Rows Never Recalculate
## Rule
All live computations read the CURRENT rate at request time, so a mid-week change re-prices the whole open week retroactively (by design). Once archive has written a week's ledger row, later rate changes NEVER rewrite that row's stored values.
- **Domain:** Payroll. **Trigger:** rate save; any aggregate/archive computation.
- **Calculation Effect:** live = pieces × current rate (CALC-002/CALC-008); archived = stored snapshot.
- **Business Implication:** operators can correct a mistyped rate before archive cleanly; after archive, corrections require out-of-band surgery — plan M-V1 policy accordingly (related: D-03/D-08).
- **Evidence:** EV-SVC:113-114 (live read); EV-VIEWS:149,318,609,676,739,829 (all read current rate); archive refresh uses compute-at-archive-time (EV-SVC:157-184); Phase 3 rule #25/#26 superseded by fixed rate UI.
- **Confidence:** HIGH. **P1 / DOCUMENTATION ONLY.** **Decision:** PRESERVE semantics; surface warning in M-V1 UX when changing mid-week rate.

---

## 7. Salary Calculation Rules

# CALC-001 — Week Bounds
## Rule
```text
(monday, sunday) for reference date d:
  monday = d − weekday(d) days      # Monday-based
  sunday = monday + 6 days
d defaults to timezone.localdate()   # Asia/Kolkata
```
- Single source of truth consumed by dashboard, detail, grid, settlement, slip, archive. **Evidence:** EV-SVC:31-39; boundary/rollover runtime proofs (EV-WF62 §20). **Confidence:** HIGH. **P0.**

# CALC-002 — Weekly Salary Formula (THE core money quantity)
## Rule
```text
sarees      = Σ SareeCount.count where employee=e AND monday ≤ date ≤ sunday
salary_rate = int(e.salary_per_saree or 0)
gross       = sarees × salary_rate                 # total_before_advance
final       = gross − int(e.advance_salary or 0)   # MAY BE NEGATIVE
```
- Integer arithmetic; NO rounding step; negatives permitted everywhere (BR-013).
- Stored ONLY in `SalaryHistory` snapshots; live contexts always recompute.
- **Worked examples:** §2.5 (Alpha 375; Gamma −140).
- **Evidence:** EV-SVC:106-123 canonical; inline equivalents EV-VIEWS:119-124,315-330,604-623,675-679,739-740; parity runtime checks (grid/dashboard/detail/slip) EV-R45 §8; WeeklySnapshotSemanticsTests.
- **Confidence:** HIGH. **P0 / DOCUMENTATION ONLY.**
- **Management-V1 Decision:** PRESERVE formula; IMPLEMENT ONCE in a single service (do not reproduce the external app's ≥5 inline copies — risk R-06).

# BR-013 — Negative Finals Are Representable AND Payable (PINNED PRODUCT DECISION)
## Rule
When advances exceed a week's earnings, final pay goes NEGATIVE and remains so end-to-end (compute → store → archive → reports). The system treats it as recoverable debt; it is NEVER silently clamped to zero.
- **History:** surfaced as BUG-18; deliberately pinned during stabilization as intended business behavior (debt recovery).
- **Required Outcome:** negative stored consistently; paid badge may coexist with negative final (Beta case: paid=True, final=−40 archived).
- **Forbidden:** clamping; hiding negatives in UI/reports.
- **Evidence:** test_negative_final_is_consistent_debt_recovery (EV-TS:298); EV-R45 §8/§10; EV-P4 §10.
- **Confidence:** HIGH. **P0 / DOCUMENTATION ONLY.**
- **Decision:** PRESERVE (pinned). If the workshop ever wants clamp-or-carry-installments, that is a NEW decision amending this rule.

# BR-030 — Full Outstanding Advance Deducted From EVERY Week Until Cleared/Scaled
## Rule
There is NO installment logic: the entire current advance balance reduces each week's final, every week, until Clear (→0) or Carry (×factor) changes it.
- **Evidence:** formula identity across all consumers; services docstring "Advances are carried by default"; carry/clear are the only balanace writers besides give (EV-SVC grep).
- **Confidence:** HIGH. **P0.** **Decision:** PRESERVE (installment plans would be a new Management-V1 feature, not a reconstruction).

# CALC-007 — Archive Canonical Truth Computation
## Rule
At archive time, per worker, the five quantity fields are recomputed with CALC-001+CALC-002 inside the locked transaction and written as the canonical week truth (create-if-missing / refresh-if-present). This resolves Phase 6.2's "CALC-004 refresh authority" reference (mapping in Reconciliation §2).
- **Evidence:** EV-SVC:126-192. **Confidence:** HIGH. **P0.**

# CALC-008 — Display/Export Per-Row Earnings Use the CURRENT Rate
## Rule
Any per-row earnings figure shown or exported (employee history rows, admin weekly rows, XLSX Saree sheet) is computed `count × (employee.salary_per_saree or 0)` AT RENDER/EXPORT TIME — i.e., historical rows are priced at TODAY'S rate (business rule BR-023 below).
- **Evidence:** EV-VIEWS:149-156,317-326,828-830. **Confidence:** HIGH. **P1.**
- **Decision:** see BR-023 / D-08.

# CALC-009 — Live Dashboard/Grid Aggregates Equal CALC-002 Semantics
## Rule
Employee dashboard card, admin stats context, weekly grid rows, and PDF slip all derive from the same formula computed live per request; cross-surface parity is a REQUIREMENT (verified runtime parity).
- **Evidence:** EV-VIEWS:119-124,604-623,739-740; parity checks EV-R45 M2.x/§8. **Confidence:** HIGH. **P1.**

# BR-023 — Exports Price Historical Production at CURRENT Rate (HUMAN DECISION REQUIRED)
## Rule (CURRENT EXTERNAL RULE)
The Global History XLSX values every historical saree entry at the worker's present rate — NOT the rate in effect when the piece was made.
- **Business implication:** after any rate change, historical export earnings diverge from the ledger's stored historical finals; two exports taken at different times can show different "earnings" for the same past period. Ledger sheet itself shows stored values (consistent).
- **CURRENT EXTERNAL RULE:** value-at-export-time. **BUSINESS IMPLICATION:** misleading trend/pay comparisons if rates change over time. **MANAGEMENT-V1 DECISION:** NOT auto-preserved → register D-08 (options: keep, freeze-at-entry rate column, dual columns).
- **Evidence:** EV-VIEWS:828-830; EV-WF62 §14; R4-series cell-match verification proves the behavior is exact (it is deliberate arithmetic, not a display bug).
- **Confidence:** HIGH (behavior), decision OPEN. **P2 / HUMAN ACTION.**

---

## 8. Advance Rules

# BR-007 — Give Advance Is Additive; Amount Must Be > 0
## Rule
Advance issuance adds to the existing balance under a row lock; amount must parse as integer > 0 (unparseable → clean 400; ≤ 0 → friendly flash, no change). Parallel gives serialize and sum exactly.
- **Worked example:** two simultaneous +70 → balance 140, two ADJUST audits, prev/new chains exact (§2.5).
- **Evidence:** EV-SVC:42-69 (lock+add+audit atomic); EV-VIEWS:637-655 (guarded endpoint, POST-only); AdvanceInputSafetyTests; S1.01 concurrency [200,200]→140.
- **Confidence:** HIGH. **P0 / DOCUMENTATION ONLY.** **Decision:** PRESERVE (non-idempotent by nature — money accumulation; repeats intentionally stack).

# BR-008 — Clear Advance Sets Balance to Zero; Audited Even When Already Zero
## Rule
Clearing zeroes the balance and ALWAYS writes a CLEAR audit event — including a DELIBERATE no-op record when the balance was already 0 (audit-honesty rule: attempts are visible, not just effects).
- **Evidence:** EV-SVC:72-103 (explicit no-op branch w/ note); clear-audit unit test (EV-TA); E-series runtime incl. no-op audit observation.
- **Confidence:** HIGH. **P1 / DOCUMENTATION ONLY.** **Decision:** PRESERVE (repeat-safe/idempotent effect).

# BR-019 — Carry Factor Must Be ≥ 0
## Rule
`carry_advance --factor F` rejects negative factors (exit ≠ 0, ValueError). Factors 0…n are accepted: 1.0 = full carry, 0.0 = wipe, fractions scale down, >1 scales up (allowed though unusual).
- **Evidence:** EV-SVC:270-271; EV-CMD-C; K-series negative-factor rejection runtime (EV-WF62 §7). **Confidence:** HIGH. **P1.** **Decision:** PRESERVE validation; scheduling policy → D-04.

# CALC-005 — Carry Scaling Math
## Rule
```text
new = int(prev × factor)     # float multiply then TRUNCATE toward zero
if new < 0: new = 0          # sanity clamp (defensive; unreachable for f≥0, prev≥0)
DB write ONLY if changed; CARRY audit row ALWAYS (even unchanged/zero balances)
```
- **Rounding hazard (note):** float multiplication precedes truncation; extreme balances could hit binary-float artifacts (e.g., huge ×0.1). Immaterial at workshop scale; M-V1 should use decimal math (IMPROVE note).
- **Worked example:** f=0.5 chain 100→50→25 (K-series runtime).
- **Evidence:** EV-SVC:277-316. **Confidence:** HIGH. **P1.** **Decision:** PRESERVE semantics, upgrade arithmetic type.

# BR-038 — Carry Timing Is Independent of Week Phase and Archive
## Rule
Carry operates on current balances whenever run; it neither requires nor waits for archive, and archive never triggers or blocks it.
- **Evidence:** command takes no week argument; services operate on Employee.advance_salary directly. **Confidence:** HIGH. **P2 / DOCUMENTATION ONLY.** **Decision:** PRESERVE decoupling; cadence → D-04/D-06.

# BR-040 — Carry Is NON-IDEMPOTENT For Factor ≠ 1 (VERIFIED HAZARD)
## Rule
Repeating carry with the same factor ≠ 1 multiplies AGAIN (100→50→25 with f=0.5 twice). Any scheduler double-fire CORRUPTS balances. f=1.0 is value-idempotent (still writes audits).
- **Classification:** verified behavior + documented dangerous constraint (G-04). This is NOT silently converted into an implementation requirement.
- **Business consequence:** unattended automation with f≠1 can silently shrink/grow wages owed.
- **Evidence:** K-series compounding runtime; EV-SVC docstring admits non-idempotence; EV-GAP62 G-04; Phase 5 R-02.
- **Confidence:** HIGH. **P1 / HUMAN ACTION.**
- **Management-V1 Decision:** HUMAN DECISION REQUIRED → D-04 (recommend: once-per-period execution guard OR operator-only ritual with dry-run-first procedure; evidence supports at minimum an operator-gate).

---

## 9. Payment Rules

# BR-015 — Payment Authority Belongs Exclusively to Mark Paid/Unpaid
## Rule
Mark Paid / Mark Unpaid are the ONLY writers of payment state (paid_status, paid_date, settlement notes). When a ledger row ALREADY exists, they update payment fields ONLY — quantities (sarees/rate/gross/advance/final) are left untouched until archive refreshes them (BUG-17 resolution, pinned).
- **Domain:** Payroll state. **Applies To:** WF-007.
- **Required Outcome:** settlement clicks never distort quantity truth; repeats converge to one row.
- **Forbidden:** mark-paid rewriting stored quantities of an existing row.
- **Evidence:** EV-VIEWS:667-707 (get_or_create + payment-fields-only update branch); WeeklySnapshotSemanticsTests ×4; EV-R45 §8.
- **Confidence:** HIGH. **P0 / DOCUMENTATION ONLY.** **Decision:** PRESERVE (authority separation is a cornerstone invariant).

# BR-031 — Settlement Click Creates the Row If Absent, Storing CLICK-TIME Quantities
## Rule
If no ledger row exists for the current week, Mark Paid creates one with click-time computed quantities (CALC-002 at click instant), paid=True, paid_date=today, note (or "Paid"). Pre-archive such rows may hold stale quantities if work continues — TEMPORARY by design, reconciled by archive (BR-014).
- **Note behavior:** on existing rows, a provided note OVERWRITES; empty note preserves prior text. Created rows default note "Paid".
- **Evidence:** EV-VIEWS:680-703; test_pay_then_more_work_then_archive… (EV-TS:243). **Confidence:** HIGH. **P1.** **Decision:** PRESERVE.

# BR-032 — Mark Unpaid Reverses Flags Only; Silent No-Op When No Row Exists
## Rule
Unpaid clears paid_status and paid_date; quantities untouched; repeat-safe. If NO ledger row exists for the week, nothing changes yet success is flashed (OBSERVED benign asymmetry — converge-safe, no corruption; M-V1 may prefer explicit "nothing to reverse").
- **Evidence:** EV-VIEWS:710-724; M3 cycle runtime. **Confidence:** HIGH. **P1 / DOCUMENTATION ONLY.** **Decision:** PRESERVE semantics; UX polish optional.

# BR-021 — App-Level Payment Actions Target the CURRENT Week Only
## Rule
Settlement endpoints compute bounds from TODAY; there is no in-app way to mark past/future weeks paid or unpaid. After archive, a past week's payment flags are immutable through the app (super-admin surgery only) — GAP G-03.
- **CURRENT EXTERNAL RULE:** current-week-finality. **BUSINESS IMPLICATION:** a late discovered mis-payment cannot be corrected in-app. **MANAGEMENT-V1 DECISION:** HUMAN REQUIRED → D-03 (retro-correction policy).
- **Evidence:** EV-VIEWS:671-673,715-716; EV-GAP62 G-03; EV-WF62 §8. **Confidence:** HIGH. **P2 / HUMAN ACTION.**

# Authority Separation Summary (QUANTITY vs PAYMENT — verify pin)
| Concern | Sole authority | Never touches |
| ------- | -------------- | ------------- |
| Weekly quantities (5 fields) | Archive command (CALC-007) | payment flags/dates/settlement notes |
| Payment state | Mark Paid / Mark Unpaid | quantity fields of existing rows |
- Verified jointly by pay→work→archive test: quantities refreshed, paid preserved (EV-R45 §3b/§8). Status: PINNED PRODUCT DECISION — Management-V1 must implement the separation regardless of storage technology.

---

## 10. Archive Rules

# BR-012 — The Business Week Is Monday–Sunday (Server-Local)
## Rule
All payroll scoping — dashboards, grid, settlement, slip, archive windows — uses Monday→Sunday of the reference date in Asia/Kolkata. No month/year logic exists anywhere (pure weekly system).
- **Evidence:** CALC-001; midnight-rollover boundary observations Sat→Sun→Mon (EV-WF62 §20); EV-R45 harness date-rollover incident (independently confirmed week math correct). **Confidence:** HIGH. **P0.** **Decision:** PRESERVE.

# BR-014 — Archive Is the SOLE Quantity Authority
## Rule
`reset_weekly_salary` freezes a week for EVERY worker: creates the missing ledger row (paid=False) or REFRESHES the five quantity fields of an existing row to end-of-week truth. Nothing else writes weekly quantity canon.
- **What becomes CANONICAL:** sarees, salary_rate, total_salary_before_advance, advance_salary(copy), final_salary for that week.
- **What remains MUTABLE afterward:** nothing in-app for archived weeks (no edit UI); raw production rows remain deletable (BR-026 drift note).
- **What is PRESERVED:** paid_status/paid_date/settlement notes (BR-016); advance BALANCE (BR-017).
- **What is RESET:** vestigial live counter → 0 where nonzero (BR-034); the week closes (new entries fall into next window).
- **Evidence:** EV-SVC:126-192; CLI runs this project: dry-run predicted 3c+1r == actual; rerun created=0 (EV-WF62 §9/EV-R45 §5.3). **Confidence:** HIGH. **P0 / DOCUMENTATION ONLY.** **Decision:** PRESERVE.

# BR-016 — Archive Preserves Payment Flags, Dates, Notes
## Rule
Existing rows' payment fields pass through archive byte-identical: a genuinely paid week stays paid; an unpaid stays unpaid. `--note` seeds CREATED rows only; refreshed rows keep their notes.
- **Evidence:** update_fields list excludes payment fields (EV-SVC:181-184); preservation test (EV-TS:243). **Confidence:** HIGH. **P0.** **Decision:** PRESERVE.

# BR-017 — Archive Never Touches Advance Balances
## Rule
Advances survive week-close untouched by design; clearing/scaling is exclusively explicit give/clear/carry actions.
- **Evidence:** EV-SVC:146-148 docstring + code (advance_salary copied INTO the row snapshot, never modified on Employee); post-archive advance checks (EV-R45 §8). **Confidence:** HIGH. **P0.** **Decision:** PRESERVE.

# BR-018 — Archive Rerun Is Idempotent
## Rule
Re-running for the same week yields created=0 with numerically identical refreshes; safe to retry after ambiguous failure.
- **Evidence:** triple-run CLI proof; test_archive_rerun_is_idempotent (EV-TS:264). **Confidence:** HIGH. **P0.** **Decision:** PRESERVE (scheduler contract).

# BR-033 — Archive Covers EVERY Worker Including Zero-Production
## Rule
Every employee gets a week row (zero-production workers archive 0/0/0−balance), so the ledger is complete and comparable across the workforce.
- **Evidence:** loop without filters (EV-SVC:154-158); zero-row archives observed in CLI runs. **Confidence:** HIGH. **P1.** **Decision:** PRESERVE.

# BR-037 — Archive Window Control: Default Today; `--date` Reconstructs Any Week
## Rule
Without arguments the command archives the week containing today; `--date YYYY-MM-DD` targets that date's Mon–Sun window (back-fill/repair capability). Invalid --date format aborts the command before writes (strptime raises).
- **Evidence:** EV-CMD-R:10-23; CLI --date runs (Phase 4 G-series). **Confidence:** HIGH. **P1.** **Decision:** PRESERVE.

# BR-034 — Vestigial Live Counter Zeroing (LEGACY — NOT A REQUIREMENT)
## Rule (OBSERVED IMPLEMENTATION BEHAVIOR)
Archive also zeroes `Employee.current_week_salary`, a deprecated field incremented by NO code path. Kept only for backward compatibility.
- **Management-V1:** NOT APPLICABLE — do not port the field; keep only the *behavioral* goal (no stale live aggregates). **Evidence:** EV-MDL:34-37 comment; BUG-21/R-12 closed decisions. **P4 / DOCUMENTATION ONLY.**

# STATE-002 — Logical Week Lifecycle
## Rule
Weeks are LIVE (pure computation, fully mutable) → ARCHIVED (CLI-only act; quantities canonical; payment state still reversible ONLY while current — see BR-021/G-03). Re-archive of the same week is a no-op refresh (idempotent), not a state change. There is no CLOSED-vs-ARCHIVED distinction beyond "archive has run"; nothing marks weeks closed automatically (G-06).
| Current | Action | Condition | Next | Actor |
|---|---|---|---|---|
| OPEN | reset_weekly_salary [--date] | operator CLI | ARCHIVED | System/operator |
| ARCHIVED | rerun same window | — | ARCHIVED (values identical, created=0) | operator |
- **Evidence:** as BR-014/BR-018. **Confidence:** HIGH. **P0.**

---

## 11. Pagdi Rules

# BR-009 — At Most ONE ACTIVE Assignment Per Material Type Per Worker
## Rule
A worker has at most one ACTIVE pagdi (end_date NULL) at any instant. Same invariant independently for warp. Enforced as a business invariant via atomic assignment; NOT by a DB unique constraint (M-V1 may add one — see DATA-R note).
- **Evidence:** race-proven 5-way parallel assigns → exactly 1 ACTIVE, losers roll back atomically (S1.02/EV-R45 §7); invariant sweeps tmp_invariant; double-assign tests.
- **Confidence:** HIGH. **P0 / DOCUMENTATION ONLY.**
- **Decision:** PRESERVE INVARIANT regardless of implementation mechanism.

# BR-010 — New Assignment Atomically Auto-Finishes Open Assignments
## Rule
Assigning pagdi to a worker finishes EVERY open pagdi of that worker inside ONE locked transaction (each FINISH audited: capacities/end-dates/actor/note "Auto-finish due to new assignment"), then creates the new ACTIVE with a CREATE audit. Partial states impossible.
- **Evidence:** EV-VIEWS:484-506 (select_for_update employee + open set); finish_pagdi service; audit-chain exactness checks (CREATE→FINISH→CREATE). **Confidence:** HIGH. **P0.** **Decision:** PRESERVE.

# BR-011 — Capacity Must Be a Non-Negative Integer (Friendly Rejection)
## Rule
Assignment capacity parses as integer ≥ 0; unparseable/negative → friendly flash, zero state change. Zero capacity legal (progress completes instantly; remaining clamps 0).
- **Evidence:** EV-VIEWS:457-465 (pagdi), :538-546 (warp); non-numeric capacity tests. **Confidence:** HIGH. **P1.** **Decision:** PRESERVE.

# BR-028 — Start-Date Semantics DIFFER: Pagdi Requires Explicit Date; Warp Is Always TODAY
## Rule
Pagdi assignment REQUIRES an ISO start_date (blank/malformed rejected). Warp assignment ignores input and stamps server-local TODAY.
- **Verified difference (not assumed identical).** **Evidence:** EV-VIEWS:469-478 vs :562-566. **Confidence:** HIGH. **P1 / DOCUMENTATION ONLY.**
- **Decision:** PRESERVE unless D-05 unification changes the model.

# BR-029 — Completion Asymmetry: Warp Has Explicit Finish; Pagdi Does Not (DECISION REQUIRED)
## Rule (CURRENT EXTERNAL RULE)
Warp completion: (a) auto-finish on reassignment, OR (b) explicit staff POST finish button (GET→400; finishing finished warp → friendly info, idempotent outcome; FINISH audited). Pagdi completion: reassignment ONLY — no admin finish control; an employee self-finish POST branch EXISTS but is unreachable (no button anywhere — inert).
- **Consequence:** an idle pagdi can only be closed by assigning a new one (fabricates a bogus replacement) or super-admin surgery.
- **CURRENT EXTERNAL RULE:** asymmetric completion. **MANAGEMENT-V1 DECISION:** HUMAN REQUIRED → D-05 (likely IMPROVE: give pagdi the same explicit finish).
- **Evidence:** EV-VIEWS:582-593 warp finish route; template grep zero pagdi-finish posters (Phase 6.1 C-01); EV-GAP62 G-05; R-14.
- **Confidence:** HIGH. **P2 / HUMAN ACTION.**

# STATE-004 — Pagdi States
ACTIVE(end_date NULL) → FINISHED(end_date=today at finish moment). FINISHED terminal in-app; reopen impossible (super-admin could null end_date unaudited — out-of-band). Creation only via assignment. Deletion only via super-admin (audit survives via SET_NULL).
- **Actor:** Admin (auto-finish trigger); no reachable employee path. **Evidence:** as BR-009/BR-010; Phase 3 §7. **P0.**

# CALC-003 — Material Progress Made-Count
## Rule
```text
bound = end_date if finished else timezone.localdate()
made  = Σ SareeCount.count where employee=worker AND start_date ≤ date ≤ bound
```
Production is tied to the WORKER, not to the material — ALL production since start counts toward progress (including pieces made before this material existed? No — window starts at material start_date; overlapping materials share the same stream by design).
- **Evidence:** EV-MDL:95-105/:137-145 (post-BUG-19 unified); CapacityFormulaTests future-exclusion + end-date bounding. **Confidence:** HIGH. **P1.**

# CALC-004 — Remaining Capacity Clamp
## Rule
`remaining = max(0, capacity − made)` — UI/report consumers NEVER see negative remaining (overproduction hides overshoot; OBSERVED consequence worth noting to business).
- **Evidence:** EV-MDL:107-110/:147-150. **Confidence:** HIGH. **P1.** **Decision:** PRESERVE clamp; optionally expose oversupply metric in M-V1.

---

## 12. Warp Rules

Warp shares BR-009 (single-ACTIVE), BR-010 (atomic auto-finish), BR-011 (capacity validation), CALC-003/004 (progress math) with IDENTICAL semantics — verified, not assumed.

# STATE-005 — Warp States
ACTIVE → FINISHED via EITHER trigger: new-assignment auto-finish OR explicit POST finish (staff; GET→400; re-finish friendly no-op). FINISH audited to dedicated WarpChangeHistory. Terminal; reopen impossible in-app.
- **Evidence:** EV-VIEWS:532-593; WarpLifecycleTests ×4; live single-active check. **Confidence:** HIGH. **P0.**

Verified Pagdi↔Warp difference register (complete):
| Aspect | Pagdi | Warp |
| ------ | ----- | ---- |
| Start date | explicit ISO required | forced today |
| Explicit finish control | NONE (G-05/D-05) | POST button, GET-refused |
| Employee self-finish branch | present, INERT | absent |
| Audit model | PagdiChangeHistory | WarpChangeHistory |
| Everything else | — | identical |

---

## 13. Duplicate Prevention Rules

| # | Scenario | Expected result | Current result | DB protection | Application protection | Concurrency protection |
|---|----------|-----------------|----------------|---------------|------------------------|------------------------|
| DUP-1 | Same phone twice (BR-004/VAL-002) | reject + message | ✓ | unique username | explicit pre-check | check-then-insert window exists (race could 500) — acceptable; M-V1: rely on constraint first |
| DUP-2 | Same worker+day production (BR-003) | reject + message | ✓ | unique(employee,date) | friendly IntegrityError catch w/ savepoint | proven 3-way parallel → 1 row |
| DUP-3 | Two ACTIVE pagdis/warps (BR-009) | impossible | ✓ | none (design choice) | locked atomic finish-then-create | 5-way race → 1 ACTIVE proven |
| DUP-4 | One ledger row per worker-week (DATA-004) | single row | ✓ | unique(employee,week_start,week_end) | get_or_create (mark-paid) / exists-check (archive) | archive locks workforce; races serialize |
| DUP-5 | Repeat approval | harmless | ✓ idempotent | — | boolean flip | benign |
| DUP-6 | Repeat mark-paid/unpaid | converge | ✓ | unique backstop | payment-fields-only update | single-row ops |
| DUP-7 | Repeat archive same week | created=0 | ✓ | unique backstop | refresh path | whole-command lock |
| DUP-8 | Parallel give advance | serialize + exact sum | ✓ 140 case | — | select_for_update | row lock |
| DUP-9 | AlertEmail duplicate address | rejected | ✓ (unique field, admin-only surface) | unique | admin form | n/a |

All rows HIGH confidence (runtime or unit-proven). Management-V1 requirement: preserve every EXPECTED result irrespective of mechanism.

---

## 14. State Transition Rules

Consolidated machine index (details in each rule):

| Entity | States | Transitions | Actor | Rule IDs |
| ------ | ------ | ----------- | ----- | -------- |
| Employee account | PENDING, APPROVED | PENDING→APPROVED (POST, idempotent, one-way) | Admin | STATE-001, BR-022, BR-036 |
| Session/auth | anonymous ↔ employee ↔ staff | login role-routes; logout immediate | any | STATE-008, SEC-001..003 |
| Production entry | exists, deleted | create (guarded) → hard-delete (permanent, unaudited) | Admin | STATE-003, BR-026 |
| Pagdi | ACTIVE, FINISHED | ACTIVE→FINISHED (auto-finish only) | Admin(implicit) | STATE-004, BR-010 |
| Warp | ACTIVE, FINISHED | ACTIVE→FINISHED (auto-finish OR explicit POST) | Admin | STATE-005 |
| Week ledger payment state | UNPAID ⇄ PAID | reversible flags-only flips | Admin | STATE-006, BR-015/032 |
| Week lifecycle | OPEN, ARCHIVED | OPEN→ARCHIVED (CLI, idempotent rerun) | Operator | STATE-002, BR-014/018 |
| Advance balance | 0 ⇄ positive | give(+), clear(→0), carry(×f) | Admin / CLI | STATE-007, BR-007/008/019/040 |
| Worker lifecycle extension (INACTIVE etc.) | DOES NOT EXIST | proposed for M-V1 | — | D-01 (STATE-009 proposal) |

States that do not exist today but Management-V1 likely needs (proposal list, NOT external rules): worker INACTIVE/SUSPENDED (D-01), week CLOSED marker independent of archive execution (D-06), notification subscription states (D-09), production-entry VOIDED (soft-delete, D-02).

---

## 15. Concurrency & Data Integrity Rules

Business invariants (technology-independent):
- DATA-011 — Every money/material mutation is ATOMIC: lock → mutate → audit in ONE transaction; partial state impossible under contention (proven by forced lock-timeout rollbacks leaving zero corruption).
- DATA-010 — Database positivity guardians: count/rate/balance/capacity are non-negative at the STORAGE layer (CHECK constraints); ledger snapshot fields deliberately allow negatives (BR-013).
- DATA-005 — Advance balance and its FULL event history (prev/new chains) stay mutually consistent; balance equals last event's new_amount per worker.
- DATA-004 — Ledger uniqueness per (employee, week_start, week_end); quantity-field group and payment-field group are independently owned (authority separation).
- BR-009 — single-ACTIVE materials under parallel assignment attempts.
- BR-003 — one production row per worker-day under parallel submits.
- OPS-008 — SQLite-local caveat: heavy same-row parallel writes can surface lock-timeout 500s AFTER clean rollback (honest failures); PostgreSQL target expected to narrow the window but is UNTESTED (NOT VERIFIED component).

Implementation evidence (mechanism, NOT the requirement): select_for_update on employee rows/open sets, transaction.atomic scopes, SQLite busy timeout 20s, unique constraints as final guardian. Management-V1 must preserve INVARIANTS; mechanisms are replaceable.

---

## 16. Correction & Reversal Rules

| Operation | Who | Mechanism | Reversible again? | Audit today | Historical impact | Requirement |
| --------- | --- | --------- | ----------------- | ----------- | ----------------- | ----------- |
| Wrong production entry | Admin | delete + re-create (BR-026) | yes (delete the re-create) | NONE (gap AUD-006) | archived ledgers unaffected (drift risk) | D-02 |
| Mis-payment | Admin | mark unpaid (BR-032) — CURRENT week only | yes (re-mark) | NONE (AUD-007 req) | past weeks immutable in-app (G-03/D-03) | D-03 |
| Advance given in error | Admin | clear (BR-008) — wipes WHOLE balance (no partial reversal of a specific give) | yes | CLEAR ✓ | affects subsequent computes only | PRESERVE; partial-reversal would be new feature |
| Carry mistake | Operator | re-carry with corrective factor (f>1 compensates f<1) — lossy for truncation remainders | approximate only | CARRY ✓ | balance-level | D-04 |
| Wrong material capacity/assignment | Admin | assign anew (auto-finishes old, BR-010); no edit | yes | CREATE/FINISH ✓ | progress window resets to new start | PRESERVE |
| Archived-week quantity error | — | NO in-app path; archive rerun recomputes from surviving raw entries (so fixing source rows + rerun --date repairs numerically!) | conditional | command output only | ledger refresh | document as repair recipe; formal policy → D-06/D-02 |
| Worker deactivation | — | DOES NOT EXIST (G-01/D-01) | — | — | — | D-01 |

REQUIREMENT GAP (not reproduced as-is): the external app has no audited correction trail for production/payment mutations; Management-V1 requires AUD-006/AUD-007 coverage.

---

## 17. Audit Rules

Verified existing events (preserve):
- AUD-001 — ADJUST on give: before/after/actor/note, transactional (EV-SVC:60-68).
- AUD-002 — CLEAR always, incl. deliberate no-op record (EV-SVC:79-91).
- AUD-003 — CARRY per worker incl. zeros/no-ops; CLI actor NULL distinguishes operator runs (EV-SVC:281-316).
- AUD-004 — Pagdi CREATE/FINISH with capacities/end-dates/actor/name snapshot.
- AUD-005 — Warp CREATE/FINISH mirrored model (added during stabilization).

Requirements where the external app is SILENT (do NOT inherit silence):
- AUD-006 — production creation/deletion MUST be audited in Management-V1 (today: none; disputes unverifiable — G-02).
- AUD-007 — rate changes and payment flag flips MUST be audited (today: none).
- AUD-008 — identity events (signup/approval/lifecycle) SHOULD be audited (today: none).
- AUD-009 — operator commands (archive/carry) MUST leave their own durable audit trail beyond console output; plus first-class audit READ surface (today: super-admin Django-admin tables only; WarpChangeHistory even unregistered — inconsistency R-11).

Audit matrix:

| Action | Must audit (M-V1)? | Current external | Requirement ref |
| ------ | ------------------ | ---------------- | --------------- |
| Employee approval | YES | ✗ none | AUD-008 |
| Worker offboard/reactivate | YES | n/a (feature absent) | AUD-008/D-01 |
| Rate change | YES | ✗ none | AUD-007 |
| Production create | YES | ✗ none | AUD-006 |
| Production delete | YES (before/after image) | ✗ none | AUD-006 |
| Advance give | YES | ✓ ADJUST | AUD-001 |
| Advance clear (incl. no-op) | YES | ✓ CLEAR | AUD-002 |
| Advance carry (incl. zeros) | YES | ✓ CARRY | AUD-003 |
| Mark paid | YES | ✗ none | AUD-007 |
| Mark unpaid | YES | ✗ none | AUD-007 |
| Material assign/auto-finish | YES | ✓ CREATE/FINISH | AUD-004/005 |
| Material explicit finish | YES | ✓ (warp) | AUD-005 |
| Archive run | YES (operator, window, counts) | ✗ output-only | AUD-009 |
| Carry run | YES | ✓ per-worker rows (NULL actor) | AUD-003/009 |
| Audit survival on worker deletion | YES | ✓ SET_NULL + name snapshot (money/material trails) | DATA-008 |

Do NOT assume lack of current audit means audit is unnecessary — inverted finding, recorded as requirements.

---

## 18. Temporal Rules

- OPS-007 — Timezone: Asia/Kolkata pinned (settings TIME_ZONE, USE_TZ=True); ALL business dates are server-local dates (timezone.localdate). Confidence HIGH (settings + runtime rollover proofs).
- BR-012 — Week = Monday–Sunday (see §10).
- BR-024 — Future/past entry dating rules (see §5).
- CALC-001 — Bounds derivation (see §7).
- BR-037 — Archive target-date control (see §10).
- Temporal facts: joining_date stamped automatically, never displayed (OBSERVED); no fiscal periods; paid_date = click-day today (not editable); audit timestamps auto (created_at/updated_at).

---

## 19. Reporting & Export Rules

Report specifications (REP ids referenced by Phase 6.2 traceability):

| REP | Report | Source | Period | Calculation authority | Permission | Sorting/output |
| --- | ------ | ------ | ------ | -------------------- | ---------- | -------------- |
| REP-001 | Weekly review grid rows | live aggregates | current Mon–Sun | CALC-002 live | staff | one card per worker |
| REP-002 | Salary ledger views (admin table + employee history) | SalaryHistory rows | all weeks | stored values as-is | staff / self | newest week first |
| REP-003 | PDF salary slip | live compute | current week | CALC-002 live | staff | name, week range, ₹final; streamed attachment; inner-text content NOT VERIFIED (never parsed) |
| REP-004 | Dashboards/stat cards | live counts | current week | CALC-001/002 | role-scoped | counters + ranges |
| REP-005 | Global History XLSX (4 sheets: Saree/Pagdi/Warp/Salary) | full-domain dump | all-time | CALC-008 per-row at CURRENT rate (BR-023) | staff | -date / -start_date / -week_start; bold headers; cell-exact vs DB proven |
| REP-006 | Weekly Salary XLSX | ledger table | all weeks | stored values | staff | mirrors REP-002 columns |
| REP-007 | Combined personal history page | three querysets | all-time | display-only | self | newest-first lists |

Cross-cutting report rules:
- OPS-006 — Files are STREAMED; nothing persisted server-side.
- SEC-003 — every export/slip is staff-gated (employee probes blocked 302/redirect).
- BR-023 — pricing caveat (D-08).
- REP-003 status: transport verified (magic bytes/filename/status); CONTENT VALUES NOT VERIFIED — carries NOT VERIFIED status until an extractor validates (bounded-investigation honesty; shared computation path makes divergence unlikely).
- No pagination/filter parameters exist on ANY report (scale limitation OPS-009).

---

## 20. Security & Authorization Rules

Business security requirements (framework mechanisms are evidence, not the rule):

- SEC-001 — Unauthenticated requests to protected surfaces redirect to login (next preserved); no data disclosure. Evidence: Phase 5 raw-status probes (302 bounces). P0.
- SEC-002 — Login gating per BR-022 (approval + account-type refusals). P0.
- SEC-003 — Staff-only enforcement on EVERY /panel/* surface INCLUDING exports/slips/actions; direct URL access by employees bounces; object routes return clean 404 for missing ids. Evidence: role matrix runtime; RateSettingTests employee-block; export probes. P0.
- SEC-004 — Every state-changing endpoint requires POST + CSRF: GET → 400 ("POST only"), tokenless POST → 403. Applies: approve, advance give/clear, mark paid/unpaid, warp finish, all form posts. Evidence: ApprovalSecurityTests, GET-probes across surfaces; historical CSRFable approve (BUG-12) FIXED. P0.
- SEC-005 — Object-level isolation: employee pages resolve identity from the AUTHENTICATED USER ONLY (session-key trust removed — BUG-24 fix); zero-leak cross-worker data (empty-state isolation probes). P0.
- SEC-006 — No credential enumeration: single generic failure message for bad phone/password. Evidence: EV-VIEWS:72-73. P1.
- SEC-007 — Direct-URL/forged-ID bypass attempts fail closed: authorization decorators execute BEFORE object fetch; nonexistent ids → 404 (staff) / friendly rejection (forms). Evidence: forged-id probes S2.x/W2.03. P0.
- SEC-008 — Production secrets hygiene: SECRET_KEY mandatory when DEBUG=False (fail-fast RuntimeError — runtime-proven twice); ALLOWED_HOSTS env-driven (wildcard removed; disallowed host → 400). P1.
- Deploy-time additions REQUIRED before public rollout (external gap, R-01): TLS/HSTS, SESSION_COOKIE_SECURE, CSRF_COOKIE_SECURE, SSL redirect/proxy header — OPS-010. Status REQUIRES FIX (environment configuration, not code).
- OBSERVED gaps routed to decisions (not silently inherited): no password strength validators (VAL-013), free-form phone (VAL-012), no login throttling — grouped in D-10.

---

## 21. External-App Bugs That MUST NOT Become Rules

Historical defects (Phases 4/4.5) and their requirement disposition — none may leak into Management-V1 as behavior:

| Bug | Current(historical) behavior | Required business behavior | Disposition |
| --- | ---------------------------- | -------------------------- | ----------- |
| BUG-01 dup-day 500 | crash on duplicate insert | graceful reject, single row | fixed; rule BR-003 |
| BUG-02 no rate UI | rates unsettable via app | staff rate form | fixed; BR-006 |
| BUG-03/04 nav 404s | broken links | resolving navigation | fixed (UX, not rule) |
| BUG-05 invisible feedback | signup msg unseen | visible confirmation | fixed; BR-025 |
| BUG-06 ≤0 advance 500 | crash | friendly reject | fixed; BR-007/VAL-006 |
| BUG-07/08/09 material 500s | crashes on bad input | friendly rejects | fixed; BR-011/VAL-007/008/009 |
| BUG-10 warp stacked ACTIVE | multiple actives | single-ACTIVE + explicit finish | fixed; BR-009/STATE-005 |
| BUG-11 pagdi race | 2 ACTIVE + crashed req | atomic converge | fixed; BR-009/010 |
| BUG-12 GET approval | CSRFable link flip | POST+CSRF only | fixed; SEC-004/STATE-001 |
| BUG-13 false delete success | fake success flash | explicit not-found | fixed; BR-026 |
| BUG-14 dead tests | 0 runnable | executable suite | fixed (30/30) — engineering NFR |
| BUG-15 pins | uninstallable deps | installable pins | fixed (deploy hygiene) |
| BUG-16 invisible 500s | no tracebacks | logged errors | fixed (OPS hygiene) |
| BUG-17 frozen first-write | stale quantities immortal | authority split | fixed; BR-014/015/031 |
| BUG-18 negative pay | treated as defect then | PINNED as debt-recovery | rule BR-013 (intentional) |
| BUG-19 formula divergence | 40 vs 31 remaining | single authoritative calc | fixed; CALC-003/004 |
| BUG-20 secrets/hosts | fallback key, wildcard hosts | fail-fast, env hosts | fixed; SEC-008 |
| BUG-21 vestigial counter | dead field | n/a | NOT APPLICABLE to M-V1 (BR-034) |
| BUG-22 audit cascade-death | audits died with worker | SET_NULL + name snapshot | fixed; DATA-008 |
| BUG-23 cosmetic debt | mojibake etc. | n/a | cosmetic; excluded |
| BUG-24 session-key trust | tamperable identity | request.user resolution | fixed; SEC-005 |

Also NOT rules: inert employee pagdi self-finish branch; inert detail-page approve branch; dead SignupForm (misleading fields, zero references); vestigial thread-counter fields (`pagdi_thread_1/2`, `warp_threads`) and unused `performance` display field (zero consumers outside super-admin listing) — all recorded OBSERVED INERT in the Inventory.

## 22. Human Business Decisions Required

Full register with alternatives/risks/recommendations: `BUSINESS_RULE_DECISIONS_REQUIRED.md`. Summary:

| # | Topic | Trigger rule(s) | Status |
| - | ----- | --------------- | ------ |
| D-01 | Worker lifecycle (offboard/rehire) | BR-036, STATE-009 proposal | OPEN |
| D-02 | Production correction audit depth | BR-026, AUD-006 | OPEN |
| D-03 | Past-week payment correction policy | BR-021, G-03 | OPEN |
| D-04 | Carry scheduling & once-per-period guard | BR-040, OPS-004, G-04 | OPEN (rec: guard) |
| D-05 | Pagdi/Warp completion unification | BR-029, G-05 | OPEN (rec: unify) |
| D-06 | Archive ownership & cadence | OPS-001, G-06, STATE-002 | OPEN |
| D-07 | Final target audit matrix sign-off | AUD-006..009, G-07 | OPEN |
| D-08 | Export pricing basis (current vs historical rate) | BR-023, CALC-008 | OPEN |
| D-09 | Notification registry intent (AlertEmail) | F-34 | OPEN (UNKNOWN) |
| D-10 | Credential/input hardening (password policy, phone format, throttle) | VAL-012/013, SEC notes | OPEN |
| D-11 | PDF slip content spec acceptance | REP-003 (NOT VERIFIED content) | OPEN |
| D-12 | PostgreSQL concurrency assumption sign-off | DATA-011/OPS-008 | OPEN |

## 23. Rule Traceability

Complete matrix in `BUSINESS_RULE_TRACEABILITY.md`. Coverage guarantee: every CORE workflow (WF-001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011) maps to ≥2 rules + its calculation/state/data/security/audit dependencies; all 31 verified features trace to ≥1 rule; zero orphan rules.

## 24. Contradictions & Reconciliation

Detailed analysis in `BUSINESS_RULE_RECONCILIATION.md`. Headline resolutions:

1. Pre-fix Phase 3 statements (stacked warps, skip-if-exists archive, mark-paid freezing) are SUPERSEDED evidence, not contradictions (stabilization pinned new semantics).
2. "Archived quantities immutable" vs "raw entries deletable post-archive": resolved as authority-model consequence with drift risk noted → feeds D-02.
3. "Employees read-only" vs inert self-finish branch: resolved (inert ≠ rule).
4. "Approved-only eligibility" vs detail-path exception: resolved as picker-level enforcement; M-V1 IMPROVE (BR-005).
5. Positivity constraints vs negative finals: consistent dual discipline (source fields ≥0; snapshot fields signed) — pinned by BR-013.
6. Unresolved→UNKNOWN count: 0 contradictions remain unresolved; 12 topics require human business decisions (not contradictions — underdetermined policies).

## 25. Completeness Assessment

- [x] Every major workflow covered by rules (traceability doc, CORE matrix)
- [x] Every important calculation ruled (CALC-001..009 incl. rounding/negative/zero/historical behavior)
- [x] Quantity constraints (BR-002/003/024/027; VAL-003/004; DATA-003/010)
- [x] Duplicate prevention (§13 matrix, DUP-1..9)
- [x] Employee eligibility (BR-005/022/025/035/036)
- [x] Approval rules (STATE-001 §4)
- [x] Rate rules (BR-006/039/023)
- [x] Salary rules (CALC-001/002/007/008/009, BR-012/013/030)
- [x] Advance rules (BR-007/008/019/040, CALC-005/006, STATE-007)
- [x] Payment rules (§9 authority separation)
- [x] Material capacity rules (§11/§12 incl. verified differences)
- [x] State transitions (§14 machines)
- [x] Archive rules (§10 canonical/mutable/preserved/reset)
- [x] Correction rules (§16)
- [x] Reversal rules (§16)
- [x] Concurrency invariants (§15)
- [x] Audit requirements (§17 matrix)
- [x] Temporal rules (§18)
- [x] Security rules (§20)
- [x] Report/export rules (§19)
- [x] Historical bugs separated (§21)
- [x] Human decisions documented (§22 + register)
- [x] Evidence + confidence per rule
- [x] Priority/status per inventory row
- [x] Traceability complete
- [x] Contradiction review completed
- [x] Independent second pass completed (Reconciliation §4)
- [x] No critical rule silently unresolved — 0 silent unknowns; 12 explicit decision items; NOT VERIFIED limited to REP-003 content, PG-concurrency component, deploy-runtime items (documented, bounded)

Explicitly NOT VERIFIED (bounded investigations exhausted): PDF slip inner text; PostgreSQL locking behavior; Python 3.11/deploy-stack runtime. Each carries impact notes in the Inventory.
