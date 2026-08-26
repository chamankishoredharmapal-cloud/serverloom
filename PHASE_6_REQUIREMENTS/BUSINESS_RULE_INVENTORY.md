# BUSINESS_RULE_INVENTORY.md (Phase 6.3)

Master flat inventory of every extracted rule. Classification vocabulary per `03_BUSINESS_RULES.md` §2.1. Status values: BLOCKER / REQUIRES FIX / HUMAN ACTION / ACCEPTABLE RISK / DOCUMENTATION ONLY / NOT VERIFIED. No open BLOCKERs exist (all Phase 4 blockers fixed+verified; P0 here means "must-hold requirement for Management-V1", documented).

Evidence keys: V=accounts/views.py · S=core/services.py · M=core/models.py · CR=reset_weekly_salary cmd · CC=carry_advance cmd · TS=test_stabilization.py · TA=test_advance_and_reset.py · R45=Phase 4.5 report · P4=Phase 4 report · W62=02_WORKFLOW_SPECIFICATION · G62=WORKFLOW_GAP_ANALYSIS.

## Business Rules (40)

| ID | Rule (short) | Class | Domain | Evidence | Conf | P | Status | M-V1 Decision |
| -- | ------------ | ----- | ------ | -------- | ---- | - | ------ | ------------- |
| BR-001 | Production recording admin-only; workers read-only | VERIFIED BUSINESS RULE | Production | V:757-793,362-406; W62§5 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-002 | Count = non-negative integer; graceful rejection | VERIFIED VALIDATION/BUSINESS | Production | V:377-385,762-780; TS; R45 W1.x | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-003 | One entry per worker per day; dup rejected gracefully; DB backstop | VERIFIED BUSINESS/DATA | Production | M:65; V:387-393,782-789; TS; S1.03 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE invariant |
| BR-004 | Phone is identity, globally unique | VERIFIED BUSINESS | Identity | V:46-49; M:17; P4§6 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| BR-005 | Approved-only pickers for entry/materials (detail-path exception noted) | VERIFIED BUSINESS + OBSERVED nuance | Eligibility | V:451,534,759 vs 362-396 | HIGH | P1 | DOCUMENTATION ONLY | IMPROVE (hard-enforce) |
| BR-006 | Rate staff-set non-negative integer; invalid unchanged; default 0 | VERIFIED BUSINESS/VALIDATION | Payroll setup | V:348-360; TS RateSettingTests | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-007 | Give advance additive, amount>0, row-locked, exact under races | VERIFIED BUSINESS/CALC | Advances | S:42-69; V:637-655; TS; S1.01 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-008 | Clear → 0; audited incl. deliberate no-op | VERIFIED BUSINESS/AUDIT | Advances | S:72-103; TA | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| BR-009 | ≤1 ACTIVE assignment per material type per worker | VERIFIED STATE/DATA invariant | Materials | race proofs R45§7; TS | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE invariant |
| BR-010 | New assignment atomically auto-finishes open ones (audited) | VERIFIED STATE | Materials | V:484-506,555-571; S:196-245 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-011 | Capacity non-negative integer; friendly rejection; zero legal | VERIFIED VALIDATION | Materials | V:457-465,538-546; TS | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| BR-012 | Week = Monday–Sunday server-local; sole scoping window | VERIFIED BUSINESS/TEMPORAL | Payroll | S:31-39; rollover runtime | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-013 | Negative final representable AND payable (pinned debt recovery) | VERIFIED BUSINESS (pinned) | Payroll | TS:298; R45§8; P4§10 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-014 | Archive sole QUANTITY authority (create-or-refresh) | VERIFIED BUSINESS (pinned) | Archive/Payroll | S:126-192; CLI triple-run | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-015 | Mark paid/unpaid sole PAYMENT authority; quantities untouched when row exists | VERIFIED BUSINESS (pinned) | Payment | V:667-707; TS ×4 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-016 | Archive preserves payment flags/date/notes (--note seeds created only) | VERIFIED BUSINESS | Archive | S:160-184; TS:243 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-017 | Archive never touches advance balances | VERIFIED BUSINESS | Archive/Advances | S:146-148+code; R45§8 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-018 | Archive rerun idempotent (created=0) | VERIFIED BUSINESS/OPS | Archive | TS:264; CLI rerun | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-019 | Carry factor ≥ 0 enforced | VERIFIED VALIDATION/BUSINESS | Carry | S:270-271; K-series | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| BR-020 | CLI runs audit EVERY worker incl. zeros with NULL actor | VERIFIED AUDIT/BUSINESS | Carry/Audit | S:277-316; K01 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| BR-021 | Payment actions current-week-only via app; archived weeks immutable in-app | OBSERVED→BUSINESS boundary; DECISION REQ | Payment/G-03 | V:671-673,715-716; G62 G-03 | HIGH | P2 | HUMAN ACTION | HUMAN DECISION REQUIRED |
| BR-022 | Approval gates login; no session for unapproved; unauthorized refused | VERIFIED SECURITY/BUSINESS | Identity | V:65-92; P4§6 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-023 | Exports price historical rows at CURRENT rate | OBSERVED INTENTIONAL; DECISION REQ | Reporting/Q-06 | V:828-830; R4 cell-match | HIGH | P2 | HUMAN ACTION | HUMAN DECISION REQUIRED |
| BR-024 | Past/future dates accepted; future excluded until week current; blank→today | VERIFIED BUSINESS/TEMPORAL | Production | V:369-375,768-776; W62§20 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| BR-025 | Signup creates PENDING profile, rate 0/balance 0, visible confirmation | VERIFIED BUSINESS | Identity | V:37-60; R45 L5.01 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE (+AUD-008) |
| BR-026 | Correction = delete+recreate; delete permanent; explicit not-found failure | VERIFIED BUSINESS; audit GAP | Production/G-02 | V:398-406; TS; G62 G-02 | HIGH | P1 | REQUIRES FIX (audit) | IMPROVE via D-02 |
| BR-027 | Zero-count entries valid and stored | VERIFIED VALIDATION | Production | V:383,779 (`<0` only) | HIGH | P2 | DOCUMENTATION ONLY | PRESERVE |
| BR-028 | Pagdi start explicit ISO required; Warp start forced today | VERIFIED DIFFERENCE | Materials | V:469-478 vs 562-566 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE (or D-05) |
| BR-029 | Completion asymmetry: warp explicit finish; pagdi reassign-only (self-finish inert) | OBSERVED; DECISION REQ | Materials/G-05 | V:582-593; grep zero posters; G62 G-05 | HIGH | P2 | HUMAN ACTION | HUMAN DECISION REQUIRED |
| BR-030 | FULL outstanding advance deducted every week until cleared/scaled | VERIFIED CALC/BUSINESS | Payroll | formula identity all consumers | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-031 | Settlement click creates row w/ click-time snapshot if absent | VERIFIED BUSINESS | Payment | V:680-703; TS:243 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| BR-032 | Unpaid reverses flags only; silent benign no-op w/o row | VERIFIED BUSINESS + OBSERVED UX | Payment | V:710-724 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| BR-033 | Archive covers EVERY worker incl. zero-production | VERIFIED BUSINESS | Archive | S:154-158 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| BR-034 | Vestigial live counter zeroed by archive | OBSERVED IMPLEMENTATION (legacy) | Data model/BUG-21 | M:34-37 | HIGH | P4 | DOCUMENTATION ONLY | NOT APPLICABLE (don't port field) |
| BR-035 | Employee surfaces strictly read-only self-service | VERIFIED BUSINESS/SECURITY | Authorization | V:103-252; blocked-write probes | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| BR-036 | Worker lifecycle one-way; no offboard/rehire/delete in-app | OBSERVED LIMITATION; DECISION REQ | Lifecycle/G-01 | route sweep; G62 G-01 | HIGH | P2 | HUMAN ACTION | HUMAN DECISION REQUIRED |
| BR-037 | Archive window default today; --date reconstructs any week | VERIFIED OPS/BUSINESS | Archive | CR:10-23; CLI runs | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| BR-038 | Carry timing independent of archive/week phase | VERIFIED BUSINESS | Carry | CC/S structure | HIGH | P2 | DOCUMENTATION ONLY | PRESERVE decoupling |
| BR-039 | Rate change re-prices open week live; archived rows never recalc | VERIFIED BUSINESS/CALC | Payroll | S:113-114; V multi; archive refresh | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| BR-040 | Carry NON-IDEMPOTENT for f≠1 (compounding verified); scheduler hazard | VERIFIED BEHAVIOR + hazard | Carry/G-04 | K-series 100→50→25; G62 G-04 | HIGH | P1 | HUMAN ACTION | D-04 (rec: guard) |

## Validation Rules (13)

| ID | Rule | Evidence | Conf | P | Status | Decision |
| -- | ---- | -------- | ---- | - | ------ | -------- |
| VAL-001 | Signup requires name+phone+password else inline error, no state change | V:43-44 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| VAL-002 | Duplicate phone rejected w/ "Phone already registered" | V:46-47; P4§6 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| VAL-003 | Entry date must be ISO YYYY-MM-DD; blank → today | V:369-375,768-776 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| VAL-004 | Count unparseable → friendly error; negative rejected | V:377-385,762-780; TS | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| VAL-005 | Rate unparseable/negative → "Invalid salary value.", unchanged | V:348-355; TS | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| VAL-006 | Advance amount: unparseable → clean 400; ≤0 → friendly flash, no change | V:641-653; TS AdvanceInputSafety | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| VAL-007 | Capacity unparseable/negative rejected (both materials) | V:457-465,538-546 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| VAL-008 | Pagdi start_date required + ISO; blank/malformed rejected | V:469-478 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| VAL-009 | Worker reference must resolve (forged id → message/404; no 500) | V:480-482,504-506; S2/W2 probes | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| VAL-010 | Carry factor must parse as float ≥ 0; negative → rc≠0 | CC:15; S:270 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| VAL-011 | Archive --date strict YYYY-MM-DD; invalid aborts before writes | CR:19-21 | HIGH | P2 | DOCUMENTATION ONLY | PRESERVE |
| VAL-012 | Phone format unconstrained (any string ≤15 chars accepted) | V:39-41; M:17 | HIGH | P3 | ACCEPTABLE RISK | IMPROVE candidate → D-10 |
| VAL-013 | No password strength validators configured (no AUTH_PASSWORD_VALIDATORS) | settings.py absent | HIGH | P3 | ACCEPTABLE RISK | IMPROVE candidate → D-10 |

## Calculation Rules (9)

| ID | Rule (formula contract) | Rounding | Negative behavior | Zero behavior | Historical behavior | Evidence | Conf | P | Status | Decision |
| -- | ----------------------- | -------- | ----------------- | ------------- | ------------------- | -------- | ---- | - | ------ | -------- |
| CALC-001 | monday=d−weekday(d); sunday=monday+6; d=localdate() default | n/a | n/a | n/a | recomputed each call | S:31-39 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| CALC-002 | gross=sarees×rate; final=gross−advance; pure ints; single canonical service | none (ints) | allowed & payable (BR-013) | sarees 0/rate 0/balance 0 → 0 | live always recomputes; stored only in ledger | S:106-123 + parity checks | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE formula, implement ONCE |
| CALC-003 | made=Σ counts where start≤date≤(end_date or today) | ints | n/a | empty window → 0 | bounded by finish date | M:95-105,137-145; TS | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| CALC-004 | remaining=max(0,capacity−made) | ints | clamped ≥0 (overshoot hidden) | capacity 0 → 0 remaining | follows CALC-003 bound | M:107-110,147-150 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE clamp |
| CALC-005 | carry new=int(prev×f), truncate toward zero; write-if-changed; audit ALWAYS | truncation via int() after float mult (decimal upgrade advised) | output clamped ≥0 defensively | prev 0 → recorded no-op CARRY | operates on current balance only | S:277-316 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE semantics |
| CALC-006 | Advance term = ENTIRE current balance applied to EVERY week (no amortization) | ints | increases deduction | balance 0 → no deduction | balance persists across weeks | formula identity; S docstring | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| CALC-007 | Archive truth = CALC-001+002 computed inside locked transaction at archive instant; writes 5 quantity fields create-or-refresh | ints | negatives preserved into ledger | zero rows created for everyone | THE historical authority | S:126-192 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| CALC-008 | Display/export row earnings = count × CURRENT rate at render time | ints | n/a | 0-count rows show 0 | historical rows repriced at export time (BR-023) | V:149-156,317-326,828-830 | HIGH | P1 | DOCUMENTATION ONLY | pricing → D-08 |
| CALC-009 | Live dashboard/grid/slip aggregates share CALC-002 semantics; cross-surface parity REQUIRED | ints | displayed everywhere | zero weeks render zeros | n/a (live) | V:119-124,604-623,739-740; parity tests | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |

## State Rules (9)

| ID | Entity/machine | Transitions | Actor | Forbidden | Evidence | Conf | P | Status | Decision |
| -- | -------------- | ----------- | ----- | --------- | -------- | ---- | - | ------ | -------- |
| STATE-001 | Employee account PENDING→APPROVED | POST approve (idempotent) | Admin | APPROVED→PENDING (none exists); GET path | V:796-810; TS ×4 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE; lifecycle ext → D-01 |
| STATE-002 | Week OPEN→ARCHIVED | reset_weekly_salary [--date]; rerun=no-op refresh | Operator CLI | UI-triggered archive (impossible) | S:126-192; CR | HIGH | P0 | DOCUMENTATION ONLY | ownership → D-06 |
| STATE-003 | Production entry existence | create(guarded)/hard-delete(permanent) | Admin | edit-in-place (does not exist) | V:362-406 | HIGH | P1 | DOCUMENTATION ONLY | soft-delete → D-02 |
| STATE-004 | Pagdi ACTIVE→FINISHED | auto-finish on new assignment only | Admin (implicit) | reopen; employee path (inert branch) | V:484-506; race tests | HIGH | P0 | DOCUMENTATION ONLY | finish control → D-05 |
| STATE-005 | Warp ACTIVE→FINISHED | auto-finish OR explicit POST finish (GET→400; refinish info) | Admin | reopen | V:532-593; TS ×4 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| STATE-006 | Ledger payment UNPAID⇄PAID | reversible flags-only flips; paid_date=today on paid | Admin | quantity edits via flips | V:667-724; M3 cycle | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| STATE-007 | Advance balance 0⇄positive | give(+audited)/clear(→0 audited)/carry(×f audited) | Admin/CLI | direct untracked edits (none exist) | S advance services | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| STATE-008 | Session/auth states anonymous↔employee↔staff | role-routed login; logout immediate | Any | cross-role access | V:65-97; P4§6-7 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| STATE-009 | Worker lifecycle extension states (INACTIVE/SUSPENDED…) | DO NOT EXIST externally — Management-V1 PROPOSAL only | — | — | G62 G-01 | UNKNOWN intent | P2 | HUMAN ACTION | D-01 |

## Security Rules (8)

| ID | Requirement | Mechanism evidence (not the rule) | Conf | P | Status | Decision |
| -- | ----------- | -------------------------------- | ---- | - | ------ | -------- |
| SEC-001 | Unauthenticated protected access → login redirect, zero data leak | login_required/staff_required 302 probes | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| SEC-002 | Login gating: approval + account-type refusals (BR-022 detail) | V:65-92 matrix | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| SEC-003 | Staff-only enforcement across ALL panel surfaces incl. exports/slips; missing ids → clean 404 | @staff_required; blocked employee probes | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| SEC-004 | Mutations require POST+CSRF (GET→400, tokenless→403) | guards V:585-586,639-640,659-661,669-670,712-714,804-805; TS ApprovalSecurityTests | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| SEC-005 | Employee pages resolve from authenticated user only; strict self-scope | V:111,144,167,198,228,247; BUG-24 fix | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| SEC-006 | Generic credential-failure message (no enumeration) | V:72-73 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| SEC-007 | Direct URL/forged-ID bypass fails closed (authz before object access) | decorator order; forged-id probes | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| SEC-008 | SECRET_KEY fail-fast when DEBUG=False; env-driven ALLOWED_HOSTS (disallowed host→400) | settings.py:9-21; R45 fail-fast ×2 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE (+OPS-010 deploy hardening) |

## Data-Integrity Rules (11)

| ID | Invariant (business) | Implementation evidence (mechanism) | Conf | P | Status | Decision |
| -- | -------------------- | ----------------------------------- | ---- | - | ------ | -------- |
| DATA-001 | One User↔One Employee; username=phone; joining_date stamped | M:15-20 CASCADE link | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| DATA-002 | New workers: rate=0, balance=0, approved=False defaults | V:50-57; M:32-40 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| DATA-003 | Production row fields + unique(employee,date) backstop | M:54-67 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| DATA-004 | Ledger unique(employee,week_start,week_end); quantity-group vs payment-group field ownership split | M:173-184; authority code | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| DATA-005 | Balance ≥0 storage constraint; full prev/new event history consistent with balance | M:33 validator; audit chains | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| DATA-006 | Pagdi record fields (start/end/capacity/notes) immutable post-create except end_date-by-finish | M:123-131 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| DATA-007 | Warp record fields; same immutability | M:81-90 | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| DATA-008 | Audit rows survive worker/user deletion: SET_NULL FKs + denormalized employee_name snapshot | M:210-214 etc.; migration 0007; AuditSurvivalTests | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| DATA-009 | Audit read surface super-admin only; WarpChangeHistory UNREGISTERED (inconsistency) | core/admin.py registrations | HIGH | P4 | DOCUMENTATION ONLY | IMPROVE (AUD-009 UI) |
| DATA-010 | Storage-level positivity guardians: count/rate/balance/capacity non-negative; ledger snapshot fields signed by design | PositiveIntegerField+validators; CHECK constraints observed P4§9 | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE discipline |
| DATA-011 | Money/material mutations atomic: lock→mutate→audit single transaction; partial-state impossible | transaction.atomic+select_for_update; forced-contention rollbacks | HIGH (SQLite) / NOT VERIFIED (PG specifics) | P0 | DOCUMENTATION ONLY (+PG sign-off D-12) | PRESERVE invariant |

## Audit Rules (9)

| ID | Rule | Type | Evidence | Conf | P | Status |
| -- | ---- | ---- | -------- | ---- | - | ------ |
| AUD-001 | Give advance writes ADJUST (before/after/actor/note) atomically | VERIFIED | S:60-68 | HIGH | P1 | DOCUMENTATION ONLY |
| AUD-002 | Clear always writes CLEAR incl. deliberate no-op record | VERIFIED | S:79-91 | HIGH | P1 | DOCUMENTATION ONLY |
| AUD-003 | Carry writes CARRY per worker incl. zeros; CLI actor NULL | VERIFIED | S:281-316 | HIGH | P1 | DOCUMENTATION ONLY |
| AUD-004 | Pagdi CREATE/FINISH audits w/ capacities/end-dates/name | VERIFIED | V:499-503; S:223-245 | HIGH | P1 | DOCUMENTATION ONLY |
| AUD-005 | Warp CREATE/FINISH audits (mirrored model) | VERIFIED | V:567-571; S:196-220 | HIGH | P1 | DOCUMENTATION ONLY |
| AUD-006 | REQUIREMENT: production add/delete MUST be audited in M-V1 (external silence = gap G-02) | REQUIREMENT (gap) | P4§16; G62 G-02 | HIGH (gap) | P1 | REQUIRES FIX → D-02 |
| AUD-007 | REQUIREMENT: rate changes + payment flips MUST be audited | REQUIREMENT (gap) | P4§16; G62 G-07 | HIGH (gap) | P1 | REQUIRES FIX → D-07 |
| AUD-008 | REQUIREMENT: identity events (signup/approval/lifecycle) SHOULD be audited | REQUIREMENT (gap) | G62 G-07 | HIGH (gap) | P2 | HUMAN ACTION → D-07 |
| AUD-009 | REQUIREMENT: operator commands need durable audit trail + first-class audit read UI (today console-only; read surface super-admin) | REQUIREMENT (gap) | W62§9/§16; R-11 | HIGH (gap) | P2 | HUMAN ACTION → D-06/D-07 |

## Operational Rules (10)

| ID | Rule | Evidence | Conf | P | Status | Decision |
| -- | ---- | -------- | ---- | - | ------ | -------- |
| OPS-001 | Commands are operator-run; NOTHING schedules anything (weeks stay open without an operator) | scheduler sweep Phases 2/4/5; G62 G-06 | HIGH | P2 | HUMAN ACTION | D-06 |
| OPS-002 | Dry-run modes predict EXACT effects and commit nothing (rollback-sentinel pattern) | CR:25-37; CC:19-31; prediction==actual runs | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| OPS-003 | Command failures roll back the WHOLE run (single transaction scope) | S decorators; sentinel machinery | HIGH | P1 | DOCUMENTATION ONLY | PRESERVE |
| OPS-004 | Scheduler contract: carry f≠1 double-fire corrupts balances → once-per-period guard OR operator-gate mandatory | BR-040 evidence chain | HIGH | P1 | HUMAN ACTION | D-04 |
| OPS-005 | Root endpoint returns simple liveness 200 | loomserver/urls.py:7 | HIGH | P4 | DOCUMENTATION ONLY | KEEP as nicety |
| OPS-006 | Exports/slips streamed as attachments; nothing persisted server-side | V:742-751,861-864,902-906 | HIGH | P3 | DOCUMENTATION ONLY | PRESERVE |
| OPS-007 | Timezone pinned Asia/Kolkata; ALL business dates server-local (localdate) | settings.py:114-116; rollover proofs | HIGH | P0 | DOCUMENTATION ONLY | PRESERVE |
| OPS-008 | SQLite same-row contention can surface lock-timeout 500s AFTER clean rollback; PG target expected better but UNTESTED | settings timeout 20s; P4§15; R45§7 | HIGH(SQLite)/NOT VERIFIED(PG) | P3 | ACCEPTABLE RISK | D-12 sign-off pre-prod |
| OPS-009 | No pagination anywhere (lists/exports) — documented scale limitation | template/view sweep; FC61 F-37 | HIGH | P3 | ACCEPTABLE RISK | revisit at scale |
| OPS-010 | Deploy-time TLS/session-cookie hardening REQUIRED before public rollout (HSTS, secure cookies, SSL redirect/proxy header) | R-01 register | HIGH (gap) | P2 | REQUIRES FIX (deploy config) | mandatory gate |

## Observed-inert items explicitly NOT rules

Inert pagdi self-finish POST branch (V:171-174, zero posters) · inert detail-page approve branch (V:342-346) · dead SignupForm (forms.py, zero refs, misleading fields) · vestigial `pagdi_thread_1/2`, `warp_threads`, `performance` fields (zero app consumers) · vestigial `current_week_salary` (BR-034) · AlertEmail registry (no sender anywhere → D-09) · duplicate login route/dashboard alias (implementation redundancy).

## Totals

Business 40 · Validation 13 · Calculation 9 · State 9 · Security 8 · Data-integrity 11 · Audit 9 · Operational 10 · **Total 109**.
Human decisions required: **12** (D-01…D-12). NOT VERIFIED components: REP-003 slip content, PG-concurrency specifics, deploy-stack runtime (bounded investigations exhausted). Silent unresolved: **0**.
