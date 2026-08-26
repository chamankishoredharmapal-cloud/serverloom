# BUSINESS_RULE_RECONCILIATION.md (Phase 6.3)

Independent reconciliation: rule-ID continuity with prior phases, contradiction analysis (Step 6.3.22), and the record of the second independent sweep (Step 6.3.25).

---

## 1. Rule-ID reconciliation

### 1.1 Phase 6.2 forward references → final rule IDs

`WORKFLOW_FEATURE_TRACEABILITY.md` and `02_WORKFLOW_SPECIFICATION.md` cited BR/CALC/STATE/SEC/DATA/AUD/REP IDs "defined in the Phase 6 requirement set" before 03 existed. This phase DEFINES those IDs; the mapping below locks each 6.2 citation to its final rule so no duplicate or orphan exists.

| 6.2 reference | Final rule ID | Reconciliation note |
| ------------- | ------------- | ------------------- |
| BR-001..BR-003 (WF-004) | BR-001, BR-002, BR-003 | admin-only / count validation / one-per-day |
| BR-004, BR-022 (WF-001) | BR-004, BR-022 | phone identity; approval gate |
| BR-005 (WF-010) | BR-005 | approved-only eligibility |
| BR-006 (WF-003) | BR-006 | rate configuration |
| BR-007/BR-008 (WF-006) | BR-007, BR-008 | give/clear advance |
| BR-009..BR-011 (WF-010/011) | BR-009, BR-010, BR-011 | single-ACTIVE / atomic auto-finish / capacity validation |
| BR-012, BR-013 (WF-005) | BR-012, BR-013 | Mon–Sun week; negative payable |
| BR-014/BR-015 authority split (6.1 §9 + 6.2 §6) | BR-014, BR-015 | pinned QUANTITY vs PAYMENT authorities |
| BR-016, BR-017, BR-018 (WF-008) | BR-016, BR-017, BR-018 | payment preserved / advances untouched / rerun idempotent |
| BR-019, BR-020 (WF-009/014) | BR-019, BR-020 | factor ≥0; CLI audits NULL actor |
| BR-021 (WF-007) | BR-021 | current-week settlement boundary |
| BR-023 export pricing (6.2 §14) | BR-023 | current-rate pricing → D-08 |
| BR-024-note (WF-004 traceability) | BR-024 | past/future dating semantics |
| CALC-001..CALC-005, CALC-008, CALC-009 | same IDs defined here | week bounds / salary formula / made-count / remaining clamp / carry math / display pricing / live parity |
| CALC-004 "refresh authority" (WF-008 row) | CALC-007 (+ CALC-002) | archive truth computation; dual-use citation resolved: material clamp keeps CALC-004, archive refresh is CALC-007 |
| STATE-001 (WF-001) | STATE-001 | account states |
| STATE-008 (WF-001/002 session citations) | STATE-008 | authentication/session states |
| STATE-003 (WF-004) | STATE-003 | production entry existence |
| STATE-004/005 (WF-010/011) | STATE-004, STATE-005 | pagdi/warp machines |
| STATE-006 (WF-007/008 incl. "transition") | STATE-006 (payment) + STATE-002 (week OPEN→ARCHIVED) | 6.2 used one number for two machines; split, both mapped |
| STATE-007 (WF-006/009) | STATE-007 | advance balance machine |
| SEC-001..004 (WF-002) | SEC-001..004 | redirect/gating/staff-only/POST+CSRF |
| SEC-005 isolation (WF-012) | SEC-005 | self-scoping |
| DATA-001..DATA-009 | same IDs defined here | per Inventory |
| AUD-006..AUD-009 (gap→requirement refs) | AUD-006..009 | requirements as drafted |
| REP-001..REP-007 | §19 report specs | defined as report requirement refs |

New IDs introduced by this phase (no prior reference): **BR-025…BR-040** (except none conflicting), **VAL series**, **SEC-006..008**, **DATA-010/011**, **OPS series**, **STATE-002/009**, **CALC-006/007**. No ID from any earlier document was reused for a DIFFERENT rule.

### 1.2 Phase 3 business-rule inventory (37 rows) → disposition

Every Phase 3 rule was re-tested against post-stabilization code/runtime:

| Phase 3 # | Disposition |
| --------- | ----------- |
| 1 signup pending | → BR-025 (unchanged) |
| 2 approval-gated login | → BR-022 |
| 3 employees read-only | → BR-001/BR-035 |
| 4 unique worker-day | → BR-003/DATA-003 (now friendly-handled; intent confirmed by keeping constraint) |
| 5 free back/post-dating | → BR-024 (confirmed intended) |
| 6 unaudited delete | → BR-026 + requirement AUD-006 (gap NOT preserved) |
| 7 approved-only dropdowns | → BR-005 (+ picker-vs-hard-enforce nuance documented) |
| 8 pagdi auto-finish | → BR-010 |
| 9 single active pagdi intended | → BR-009 (invariant now ENFORCED, race-proven) |
| 10 warp stacking | SUPERSEDED — fixed (BUG-10); current rule = BR-009 symmetric |
| 11 warp no completion path | SUPERSEDED — explicit finish exists (STATE-005); asymmetry remains → BR-029/D-05 |
| 12 progress = all production since start | → CALC-003 (confirmed) |
| 13 UI clamp ≥0 | → CALC-004 (now model-level too) |
| 14 model unclamped divergence | RESOLVED by BUG-19 fix (single authoritative implementation) |
| 15 additive advances | → BR-007 |
| 16 advances survive archive | → BR-017 |
| 17 full-balance-every-week | → BR-030/CALC-006 |
| 18 clear audited no-op | → BR-008/AUD-002 |
| 19 carry audits zeros | → BR-020/AUD-003 |
| 20 carry non-idempotent f≠1 | → BR-040 (+ hazard decision D-04) |
| 21 int() truncation + clamp | → CALC-005 |
| 22 Monday–Sunday | → BR-012/CALC-001 (HIGH after rollover proofs) |
| 23 weekly formula may be negative | → CALC-002/BR-013 (pinned) |
| 24 positivity discipline inconsistency | RESOLVED as deliberate dual discipline → DATA-010 + BR-013 |
| 25 rate retroactive to live week | → BR-039 (confirmed intended) |
| 26 rate unchangeable via panel | SUPERSEDED — BUG-02 fixed (BR-006) |
| 27 archive idempotent per week | → BR-018 |
| 28 archive paid=False only new rows | ABSORBED into BR-014/BR-016 (refresh semantics supersede skip-if-exists) |
| 29 archive skips existing rows | SUPERSEDED — BUG-17 fix: create-or-refresh (CALC-007) |
| 30 archive covers everyone | → BR-033 |
| 31 mark-paid freezes at click | PARTIALLY SUPERSEDED — click-time snapshot on CREATE only (BR-031); existing-row quantities now protected (BR-015) |
| 32 unmark keeps snapshot | → BR-032 (confirmed, now correct-by-design under authority split) |
| 33 payment toggles reversible | → STATE-006 |
| 34 POST-only mutations | → SEC-004 (extended to approve/warp-finish) |
| 35 approval bare flip no audit | behavior unchanged → STATE-001 + requirement AUD-008 |
| 36 forensic trails w/ nullable actor | → AUD-001..005/DATA-008 |
| 37 dry-run writes nothing | → OPS-002 |

No Phase 3 finding vanished: each maps to a rule, a superseded-fix note, or an explicit requirement.

### 1.3 Phase 4/4.5/5 findings → rules or decisions

BUG-01…BUG-24 dispositions: `03 §21` (none became rules except BUG-18's PINNED product decision BR-013 and fixes that DEFINE required behavior). Phase 5 risk register: R-01→OPS-010, R-02→D-04/D-06, R-06→CALC-002 implement-once mandate, R-07→AUD-006..007, R-08→OPS-008, R-10/R-11/R-13→observed-inert register, R-14→D-05, R-15→BR-023/D-08, R-16→REP-003/D-11. R-03/R-04/R-05 remain deploy-phase verification gates (outside rule scope; D-12 covers R-03).

---

## 2. Contradiction analysis (Step 6.3.22)

Method: every extracted rule cross-compared against Phase 3 logic, 6.2 workflows, calculations, state machines, and Phase 5 reconciliation. Evidence → authority → re-test where possible → determination. No averaging.

| # | Apparent contradiction | Evidence | Authority test | Determination |
| --- | ---------------------- | -------- | -------------- | ------------- |
| C-01 | P3: "warp stacks ACTIVEs/no completion" vs BR-009/STATE-005 single-ACTIVE+finish | pre-fix vs post-fix source; race tests | runtime re-proven post-fix (double assign → 1 ACTIVE) | SUPERSEDED FIX — not a contradiction; current rules authoritative |
| C-02 | "Archived week quantities canonical/immutable" vs "raw entries deletable anytime (incl. archived weeks)" | S archive scope vs V delete path (no week filter) | re-test: delete branch has no archived-week guard; ledger update_fields exclude raw history | REAL tension resolved as AUTHORITY-MODEL CONSEQUENCE: archive owns LEDGER truth only; raw stream stays editable-but-unaudited ⇒ drift risk recorded; routed to D-02 (policy), not averaged away |
| C-03 | "Employees read-only" vs employee pagdi self-finish POST branch | V:171-174; template grep zero posters | reachability test: no UI path | INERT ≠ RULE; excluded (documented inert) |
| C-04 | "Only approved workers entered/assigned" vs detail-page add_saree accepting pending workers | filtered pickers vs unrestricted detail path | code-path comparison | ENFORCEMENT-LEVEL nuance; rule stated at picker level + IMPROVE note (BR-005) |
| C-05 | DB positivity constraints vs negative finals stored | PositiveInteger sources vs signed ledger fields | field-class audit | CONSISTENT DUAL DISCIPLINE (sources ≥0, snapshots signed) pinned by BR-013 |
| C-06 | "Carry writes only when changed" vs "audit always" | S:299-315 | read both branches | NO conflict: write-suppression ≠ audit-suppression; codified in CALC-005 |
| C-07 | P3 #31 "re-click refreshes final" vs BR-015 "quantities untouched when row exists" | pre-fix vs post-fix mark_paid | unit WeeklySnapshotSemanticsTests | SUPERSEDED FIX (BUG-17) — BR-015 authoritative |
| C-08 | Archive "--note seeds notes" vs BR-016 "payment notes preserved" | CR default/note flow vs refresh update_fields | field-level check | CONSISTENT: --note touches CREATED rows' notes; refreshed rows untouched |
| C-09 | "Mark unpaid repeat-safe success" vs "no row exists" case | V:717-723 | trace: success flashed regardless | BENIGN ASYMMETRY documented inside BR-032 (converges to target state; no corruption) |
| C-10 | "Archive preserves everything" vs "archive zeroes live counter" | S:187-190 | writer audit: sole writer is archive | CONSISTENT: counter is vestigial legacy (BR-034), not payroll data |

Unresolved contradictions: **0**. Items needing human policy (not contradictions): the 12 decision-register entries.

---

## 3. Second independent sweep (Step 6.3.25) — what a developer might miss

Re-searched SOURCE (not my own draft) specifically for: limits, minima/maxima, uniqueness, ordering, permissions, dates, calculations, rounding, state transitions, side effects, rollback, audit, history, concurrency, archive, correction, reversal, repeat execution, CLI behavior.

New finds incorporated (absent from first-draft thinking):
1. **mark_unpaid silent no-op success** when no ledger row exists (V:717-723) → folded into BR-032.
2. **mark_paid note-overwrite nuance**: existing rows get note ONLY when provided (V:700-702); created rows default "Paid" → BR-031 note behavior.
3. **No password validators / free-form phone / no login throttle** (settings absence; VAL-012/013; D-10).
4. **Vestigial fields beyond current_week_salary**: `pagdi_thread_1/2`, `warp_threads`, unused `performance` display field, dead SignupForm (R-10) → observed-inert register.
5. **Export sort orders & bold headers** as part of report specs (REP-005/006) and streaming rule (OPS-006).
6. **Carry float-multiplication truncation hazard** for extreme balances → CALC-005 IMPROVE note (decimal arithmetic).
7. **Content-Disposition uses raw worker name** in slip filename (cosmetic; noted under REP-003 scope).
8. **Archive `--note` default text** ("Archived by scheduled reset on …") despite nothing being scheduled — naming artifact of external app; M-V1 should not inherit misleading default text (folded into BR-037/OPS-001 context).
9. **check-then-insert window at signup** (pre-check then create_user without constraint-first insert) → DUP-1 note (benign; constraint backstop exists at username level).
10. **Employee Meta ordering ["name"] vs panel "-id" ordering** — list-sorting rules captured in REP specs; no contradiction (different surfaces, deliberate).

Searches that returned nothing new (confirming coverage): month/quarter logic (none), email collection (none), notification senders (none), additional state writers for end_date/is_approved/paid_status beyond catalogued ones (none), hidden management commands (only the two catalogued), signals/middleware customization (none — stock), scheduled jobs (none).

## 4. Priority rationale (P0/P1 assignments)

- **P0** = rules whose violation corrupts MONEY TRUTH, breaks the access boundary, or destroys a proven invariant: authority separation (BR-014/015/016/017/018), core money math (CALC-002/006/007, BR-013/030), identity gate (BR-022, SEC-001..005/007), atomicity/uniqueness invariants (BR-003/009/010, DATA-003/004/005/010/011), temporal spine (BR-012, OPS-007), recording integrity (BR-001/002). All are verified-working today → status DOCUMENTATION ONLY (nothing to fix in the reference; mandatory to preserve in Management-V1).
- **P1** = correctness/usability of daily operations and their validation/audit plumbing (BR-004..008/011/019..020/024..026/028/031..033/037/039/040, most VAL/CALC-P1, DATA-006..008, AUD-001..005, OPS-002/003/004). BR-040/OPS-004 carry HUMAN ACTION because automation policy is undecided even though the behavior itself is fully understood.
- **P2** = policy gaps and operational ownership (G-family decisions), P3/P4 = hardening/scale/cosmetic/documentation items. No BLOCKER-status items exist: every former Phase 4 blocker is FIXED+VERIFIED (Phase 4.5 §10 closure table).

## 5. Bounded-investigation honesty

NOT VERIFIED (investigation bounds reached, impact documented): REP-003 PDF inner-text values (no extractor available in any phase; transport verified; shared compute path argued, not proven); PostgreSQL-specific locking (no PG environment; SQLite proofs stand; D-12 gate); Python 3.11/deploy-stack runtime (environment absent — outside business-rule scope, tracked as deploy verification). Each is explicitly statused NOT VERIFIED in the Inventory rather than silently dropped.

Blind-spec test: a developer holding ONLY the five Phase 6.3 documents can state, for every business action — who may act, what inputs are legal, what must be computed (with formulas/rounding/sign behavior), which transitions are legal, what is duplicated-or-rejected, what must be audited, what happens on failure/race/repeat/archive — plus the 12 open human policies. Verdict: PASS.
