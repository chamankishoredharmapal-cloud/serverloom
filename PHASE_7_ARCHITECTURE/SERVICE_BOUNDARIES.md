# SERVICE_BOUNDARIES.md (Phase 7.5)

Boundaries derived from Phase 6 workflows/state machines — not from naming aesthetics. Each service is the SINGLE authority for its rules/calculations. Common contract: inputs are validated DTOs; outputs are domain results; every mutation emits audit inside its transaction; errors map to the domain error taxonomy (ValidationError/AuthzError/DuplicateError/NotFound/Conflict).

## AuthService
- Responsibility: register (PENDING defaults BR-025), login eligibility gate (BR-022), logout, session/class resolution (SM-02).
- Owns: identity linkage (phone-as-username), status gate.
- DB: auth identities + profiles(status). Transactions: profile creation atomic with identity.
- Audit: REGISTER, LOGIN_DENIED_REASON(category only — no enumeration leak), APPROVE handled by WorkerService.
- Prohibited: any payroll/material logic; storing plaintext credentials; trusting client role claims.

## WorkerService
- Responsibility: roster search (q contains name/phone), detail aggregation, approve transition TR-EMP-001 (idempotent, single path — collapses external dual-path debt), lifecycle states per D-01 when decided.
- DB access: profiles (+reads of dependents for console).
- Audit: WORKER_APPROVED, future LIFECYCLE_* events.
- Prohibited: rate/pay mutations (PayrollService owns); deletion policy execution (D-13 gate).

## ProductionService
- Responsibility: create entry (BR-002/003/024/027 incl. DuplicateError on worker-day conflict), remove (explicit NotFound; soft/hard per D-02), list mine/all.
- Calc dependency: none owned (aggregates consumed by Payroll/Material services).
- DB: production_entries UNIQUE(worker,date) + CHECK count≥0; savepoint-equivalent catch of unique violation → typed DuplicateError.
- Audit: ENTRY_CREATED / ENTRY_REMOVED with before-image (AUD63-006).
- Prohibited: computing pay; touching ledger.

## PayrollService
- Responsibility: setRate (BR-006/039); computeWeek (CALC-002 = CALC-001+Q×R−B via CALC-006) — SOLE authority; weekGrid; dashboard figures (CALC-009 parity consumers).
- Reads: production_entries (window), advance balance, rate. Writes ONLY profiles.salary_rate.
- Audit: RATE_CHANGED (from,to,actor).
- Prohibited: writing weekly_ledger ANY column (Archive/Settlement own those); amortization logic (none exists by requirement).

## AdvanceService
- Responsibility: give (>0 additive, serialized), clear (→0, audited no-op at zero), carry (factor ≥0; N=trunc(B×f) toward-zero exact-math; write-if-changed; audit ALWAYS incl. zeros; once-per-period guard IF automated per D-04; truncation-to-zero edge preserved and surfaced in result).
- DB: profiles.advance_balance (sole writer set {give,clear,carry}) + unified audit_events append-only (ADR-006).
- Audit: ADJUST/CLEAR/CARRY rows w/ prev/new/actor(SYSTEM for CLI)/note (AUD63-001..003).
- Prohibited: ledger writes; week-window logic (phase-independent by design BR-038).

## SettlementService
- Responsibility: markPaid (create-path snapshot vs existing-row flags-only — two distinct code paths per C64 §20), markUnpaid (flags-only; absent-row benign no-op), current-week bounds from CALC-001 (BR-021 scope; archived-week flips blocked pending D-03).
- DB: weekly_ledger payment group ONLY (paid_status,paid_date,settlement_note); quantity columns untouched when row exists.
- Audit: PAYMENT_MARKED / PAYMENT_REVERSED (AUD63-007).
- Prohibited: quantity-column writes (ArchiveService-only); advance changes.

## MaterialService
- Responsibility: assign(type∈{pagdi,warp}) — validate capacity/date-contract (BR-028 difference), ATOMIC auto-finish open assignments then insert ACTIVE (BR-009/010) via partial-unique-index-backed tx; explicit finish (warp now; pagdi if D-05 unifies) WITH in-lock active re-check (SBG-01 lesson); progress made/remaining (CALC-003/004).
- DB: material_assignments (type column; partial UNIQUE (worker,type) WHERE finished_on IS NULL) + audit events.
- Audit: ASSIGNMENT_CREATED/FINISHED (AUD63-004/005 equivalents).
- Prohibited: payroll reads beyond worker existence for validation.

## ArchiveService
- Responsibility: freezeWeek(date?=today) — lock roster snapshot, for EVERY worker evaluate CALC-007 canon (PayrollService.computeWeek math via shared SQL executor), UPSERT-or-refresh FIVE quantity columns ONLY, preserve payment group byte-identical, report {created,refreshed}; rerun idempotent (BR-018). Trigger surface: operator console + cron (ownership/cadence D-06). Stream-consistency note: serialize against production inserts within run window or document rerun-repair (SBG-02 design choice recorded as implementation obligation).
- Audit: ARCHIVE_RUN record (window, counts, actor) (AUD63-009).
- Prohibited: payment-group writes; balance writes; deleting anything.

## AuditService
- Responsibility: emit(event_type, actor{user|SYSTEM}, before/after, note) INSIDE caller's transaction; read API (superadmin) with filters; retention unlimited (no deletion paths).
- DB: unified append-only audit_events table (type-discriminated JSONB payload + typed columns for money events) or per-family tables — ADR-006 decides; both satisfy survival requirements.

## ReportService / ExportService
- Responsibility: REP-001..007 assembly using service outputs (never raw ad-hoc queries duplicated elsewhere); slip PDF (content per D-11 acceptance); XLSX workbooks with EXACT sheet/sort/format contracts; PricingStrategy injection (D-08) for CALC-008 surfaces.
- Prohibited: mutating anything; persisting artifacts server-side unless storage decision taken (optional bucket).

## StatsService (thin)
- Counters for admin home (workers, pending, active materials, current week range) — pure reads over owned tables.

## Cross-service rules
1. Services call other services' READ functions freely; WRITE ownership never crosses boundaries.
2. No service imports another service's tables directly for writes.
3. All date/window derivation comes from lib/domain/week.ts exclusively.
4. Money arithmetic integer-exact (money.ts policy); carry uses sanctioned exact-truncation helper.
