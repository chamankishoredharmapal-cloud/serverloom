# ARCHITECTURE_DECISION_RECORD.md (Phase 7.10 + 7.12)

## ADR-001 — Primary technology stack
Context: Phase 6 contract complete; no MV1 repository found to confirm existing stack; program vocabulary references Supabase/Vercel/React.
Problem: choose implementation platform.
Options: (A) Next.js+TS+Supabase+Vercel (B) Django-parity port (C) SPA+standalone API+managed PG.
Decision: **(A) as primary option, CONFIRMATION PENDING repo discovery.**
Reason: matches presumed program stack; server-layer model satisfies rule-ownership and isolation mandates; lowest assumed migration cost.
Trade-offs: provider coupling (mitigated: domain core kept framework-free); RLS policy discipline required.
Consequences: all target docs assume (A); re-validate on repo provision.
Requirements affected: ALL (enabler). Risks: wrong presumption → re-run mapping Decisions column. Status: PROPOSED.

## ADR-002 — Single-source calculations w/ coordinated SQL executors
Problem: external duplication defect class (R-06) + archive needs DB-side atomic math.
Decision: one TS implementation per CALC for app paths + one SQL RPC per transactional path (archive/settlement/advance), both derived from ONE written spec and pinned by parity tests (CALC-009 suite).
Trade-offs: two executors to keep aligned → mitigated by shared spec doc + generated test vectors.
Status: ACCEPTED.

## ADR-003 — Column-group authority split
Problem: BR-014/015 authority separation must survive implementation.
Decision: weekly_ledger quantity columns writable ONLY by ArchiveService path; payment columns ONLY by SettlementService; enforced via dedicated security-definer RPCs + review gate; optional trigger guard (ADR-007).
Status: ACCEPTED.

## ADR-004 — One-ACTIVE-material via partial unique index
Problem: race-proof single-ACTIVE invariant.
Decision: partial UNIQUE (worker, material_type) WHERE finished_on IS NULL.
Trade-offs: auto-finish must precede insert in same tx (index would reject overlap mid-tx otherwise handled by ordering).
Status: ACCEPTED.

## ADR-005 — Ledger structural idempotency
Decision: UNIQUE(worker,week) + UPSERT freeze semantics; archive returns {created,refreshed}; rerun safe.
Status: ACCEPTED.

## ADR-006 — Audit storage shape
Options: per-family tables vs unified append-only audit_events.
Decision: unified table first (one write path, survival columns built-in); split later only if query patterns demand.
Status: ACCEPTED (D-07 scope still open).

## ADR-007 — Column-grant enforcement mechanism
Options: (a) convention+review (b) trigger guards rejecting disallowed column changes per source context (c) separate roles/grants per RPC function.
Decision: (c) security-definer RPCs as primary; (b) trigger as defense-in-depth OPTION if audit shows violations.
Status: ACCEPTED (b optional).

## ADR-008 — Carry arithmetic
Problem: float artifact class (100×0.29→28 steal case verified in Phase 6).
Decision: exact integer scaling `N = floor(B×num/den)` via rational inputs or Decimal with ROUND_DOWN; observable contract = truncation toward zero on non-negative outputs (parity with C64 §9 semantics minus artifact risk).
Status: ACCEPTED.

## ADR-009 — profiles.status enum replaces boolean approval
Decision: CHECK-constrained enum starting {PENDING,ACTIVE} with reserved {INACTIVE,SUSPENDED} for D-01; login gate checks ACTIVE.
Status: ACCEPTED (value set = D-01 open).

## ADR-010 — Soft-delete reserve on production_entries
Decision: schema reserves deleted_at/deleted_by/reason now; behavior OFF until D-02 decided (default hard-delete parity or soft mode — either non-breaking).
Status: ACCEPTED (behavior pending).

## ADR-011 — Operator surface & job secrets
Decision: cron/operator calls hit protected endpoints authenticated by CRON_SECRET / superadmin session; service-role key never client-side.
Status: ACCEPTED.

## ADR-012 — Pricing strategy seam (D-08)
Decision: CALC-008 implemented behind PricingStrategy{CURRENT_RATE|ENTRY_RATE|MIXED}; default CURRENT_RATE preserves verified behavior; switching requires decision + (if ENTRY_RATE) migration adding entry-rate snapshot column.
Status: ACCEPTED as seam; VALUE OPEN.

## Phase 6 decisions D-01..D-14 — classification

| D | Topic | Class | Architectural impact | Options/consequences | Recommended | Can implement proceed without it? |
| - | ----- | ----- | -------------------- | -------------------- | ----------- | ---------------------------------- |
| D-01 worker lifecycle states | BUSINESS DECISION REQUIRED | profiles.status enum (ADR-009 ready) | add INACTIVE etc.; affects pickers/archive roster/grid inclusion | extend enum + exclude non-ACTIVE from operational rosters (Phase-6 rec) | YES with {PENDING,ACTIVE} initial |
| D-02 production correction audit depth | ARCHITECTURE DEPENDENT | soft-delete columns reserved (ADR-010) | audit rows either way (AUD-006 mandatory) | audited soft-delete for open weeks; reversal entries post-archive | YES (audit emitted regardless) |
| D-03 retro payment flips | BUSINESS DECISION REQUIRED | SettlementService week-scope guard flag | allow-with-audit vs block | none offered (Phase 6) | YES default current-week-only |
| D-04 carry scheduling/guard | ARCHITECTURE DEPENDENT (guard design exists; automation policy open) | carry_executions period table if automated | double-fire corruption vs op friction | operator-gated now + hook (Phase-6 rec) | YES operator-gated |
| D-05 material completion symmetry | BUSINESS DECISION REQUIRED | MaterialService.finish exposure per type | unified vs asymmetric models | unify (warp pattern) per evidence | YES (pagdi assign-only works meanwhile) |
| D-06 archive ownership/cadence | BUSINESS DECISION REQUIRED (ops policy) | cron wiring + missed-week detector ready | unarchived weeks stall history | cron weekly + alert (Phase-6 rec) | YES manual interim |
| D-07 audit matrix sign-off | BUSINESS DECISION REQUIRED (scope depth) | AUD events already architected | breadth of events | adopt Phase-6 matrix | YES core money/material events first |
| D-08 export pricing basis | BUSINESS DECISION REQUIRED | PricingStrategy seam (ADR-012); ENTRY_RATE needs new column | report meaning after rate changes | none offered | YES default CURRENT_RATE (verified behavior) |
| D-09 notification intent | NOT RELEVANT until decided | no table/service built | registry purpose unknown | investigate with owner | YES omit |
| D-10 credential/input hardening | ARCHITECTURE DEPENDENT (provider config + Zod policies) | auth settings + validators | friction vs safety | light policy (len≥10, phone digits normalize) | YES recommended defaults |
| D-11 PDF slip content spec | BUSINESS DECISION REQUIRED | ReportService content builder | minimal vs breakdown | full breakdown from same computeWeek (rec) | YES render minimal then extend |
| D-12 PostgreSQL verification gate | ARCHITECTURE DEPENDENT (staging test obligation) | concurrency proof environment | locking edge confidence | staging probe pre-go-live | YES (gate before prod, not before build) |
| D-13 worker-deletion retention | BUSINESS DECISION REQUIRED — CRITICAL SCHEMA IMPACT | FK behavior + offboard flow (DATA_ARCHITECTURE options A/B/C) | history survival vs parity | Option C soft-delete worker (protect ledger) | Schema ships RESTRICT-by-default; flip requires explicit decision |
| D-14 session lifetime | BUSINESS DECISION REQUIRED | auth config values | UX vs exposure | 7d rolling/30d absolute | YES provider defaults interim |

Implementation can proceed on all paths without any D being finalized EXCEPT D-13's FK choice MUST be set before the ledger table migration is written (ships RESTRICT-default per recommendation, reversible only before real data accrues).
