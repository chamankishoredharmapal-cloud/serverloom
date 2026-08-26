# 07_WORKFLOW_SPECIFICATION.md

Complete workflows (trigger→actor→preconditions→steps→validation→DB→audit→result/failure/rollback). Each is implemented and runtime-verified; this is the binding behavioral contract.

## WF-A Onboard worker
Trigger: visitor submits signup → PENDING profile (zeroed defaults, REGISTER audit).
Staff opens Workers → Approve → `approve_worker` RPC (idempotent, single APPROVE event) → status ACTIVE.
Failure: duplicate phone → friendly reject; unauthorized caller → FORBIDDEN. Rollback: none needed (single tx).

## WF-B Record production
Staff (worker detail or global form) → Zod validate (date ISO/blank=today, count ≥0 int) → `create_production_entry` in tx: eligibility(ACTIVE)+unique(worker,day)+ENTRY_CREATED audit.
Invalid/duplicate/negative → typed error flash, zero change. Concurrent duplicates → one winner.

## WF-C Correct production
Delete entry (before-image audited ENTRY_REMOVED; explicit "not found" on repeat) → recreate corrected. Aggregates react immediately; archived windows require rerun-repair ritual (documented SBG-02 contract).

## WF-D Assign material
Capacity≥0 + eligible ACTIVE worker → single tx: lock actives FOR UPDATE → auto-finish each (FINISH event) → insert new (partial-unique backstop) → CREATE event. WARP start forced today; PAGDI date required. Failure: INELIGIBLE/INVALID_* friendly rejects; whole-tx rollback.

## WF-E Finish material
Explicit POST → in-lock re-check: ACTIVE→set end-date+FINISH event; ALREADY_FINISHED → strict info no-op. Terminal; reopen path absent.

## WF-F Give advance
amount>0 → row lock → additive update → ADJUST event (prev/new). ≤0 rejected pre-write.

## WF-G Clear advance
lock → 0 (audited CLEAR even at zero as deliberate no-op).

## WF-H Carry advances (operator)
factor rational ≥0 → per-worker lock → N=trunc(B×f) exact → write-if-changed → CARRY event ALWAYS (incl. zeros) → processed count. Dry-run variant rolls back. Automation requires once-per-period guard (D-04).

## WF-I Weekly settlement
Mark paid: bounds from CALC-001(today) → upsert ledger: create-path snapshots quantities(paid=true,source SETTLEMENT); existing-row path flips payment columns ONLY. Mark unpaid: flags-only; absent-row benign success. Both audited. Race-safe by unique+upsert.

## WF-J Archive week (operator/cron)
advisory lock per window → roster lock → per worker canon pieces×rate−balance → UPSERT quantity columns only (payment preserved) → canonical=true → run record {created,refreshed} → ARCHIVE_RUN event. Rerun idempotent; dry-run predicts without writing; parallel runs serialize.

## WF-K Corrections after archive
Fix raw rows → targeted `--date` rerun recomputes canon (repair ritual). Post-archive raw edits otherwise drift ledger until repaired — accepted operational contract (SBG-02).

## WF-L History & exports
Read-only service views (own/admin/audit) + streamed XLSX/PDF built from the same authoritative outputs; staff-gated.

Every workflow emits its audit inside the mutation transaction; failures roll back atomically leaving zero partial state.
