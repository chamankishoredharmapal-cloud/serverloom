# BUSINESS_RULE_DECISIONS_REQUIRED.md (Phase 6.3)

Human decision register: every point where external behavior is NOT automatically the desired Management-V1 behavior. No business decision is made where evidence cannot establish intent. Format per item: Decision / Why required / External behavior / Alternatives / Risk / Recommended default (ONLY if evidence supports) / Status.

| # | Topic | Trigger rule(s)/gap | Status |
| - | ----- | ------------------- | ------ |
| D-01 | Worker lifecycle (offboard/rehire) | BR-036, STATE-009, G-01 | OPEN |
| D-02 | Production correction audit & archived-week edits | BR-026, AUD-006, G-02 | OPEN |
| D-03 | Past-week payment correction policy | BR-021, G-03 | OPEN |
| D-04 | Carry scheduling / once-per-period guard | BR-040, OPS-004, G-04 | OPEN |
| D-05 | Pagdi/Warp completion unification | BR-029, G-05 | OPEN |
| D-06 | Archive ownership & cadence | OPS-001, STATE-002, G-06 | OPEN |
| D-07 | Target audit matrix sign-off | AUD-006..009, G-07 | OPEN |
| D-08 | Export pricing basis | BR-023, CALC-008 | OPEN |
| D-09 | Notification registry intent | F-34 AlertEmail | OPEN (UNKNOWN) |
| D-10 | Credential/input hardening | VAL-012/013 | OPEN |
| D-11 | PDF slip content spec acceptance | REP-003 NOT VERIFIED | OPEN |
| D-12 | PostgreSQL concurrency assumption | DATA-011/OPS-008 | OPEN |

---

## D-01 — Worker Lifecycle (Offboard / Reactivate / Delete)
- **Decision:** define worker states beyond PENDING/APPROVED.
- **Why required:** lifecycle is ONE-WAY (BR-036): no deactivate/suspend/rehire; departed workers stay in pickers/grids/archives forever; only removal path (super-admin CASCADE delete) destroys production/material history (money audits survive — DATA-008).
- **External behavior:** approval irreversible; deletion = cascade wipe (G-01).
- **Alternatives:** (a) INACTIVE state excluded from pickers/aggregates, history retained; (b) status quo; (c) soft-delete + audit.
- **Risk of inaction:** operational noise; wrong grids; destructive deletes.
- **Recommended default:** (a), evidenced by deliberate audit-retention engineering (DATA-008/migration 0007) — destruction is clearly not the intent. Final call human.
- **Status:** OPEN — HUMAN ACTION.

## D-02 — Production Correction Audit & Archived-Week Edits
- **Decision:** how corrections are audited; whether archived-period raw rows may still be deleted.
- **Why required:** correction = delete+recreate, UNAUDITED (AUD-006/G-02); deleting an archived week's raw entry leaves the ledger snapshot unchanged → silent drift raw-vs-ledger (Reconciliation C-02).
- **External behavior:** permanent hard delete; no before/after image; no week-state restriction.
- **Alternatives:** (a) soft-delete/void flag + audit; (b) hard delete + full audit record; (c) forbid changes after archive (reversal-entry policy); (d) status quo.
- **Risk:** unverifiable disputes; undetectable ledger/history drift.
- **Recommended default:** (b)+(c): audited hard delete on OPEN weeks; reversal entries for ARCHIVED weeks — aligns with pinned archive authority (BR-014). Human confirms (changes operator freedom).
- **Status:** OPEN — HUMAN ACTION.

## D-03 — Past-Week Payment Correction Policy
- **Decision:** may payment flags on ARCHIVED weeks be corrected in-app?
- **Why required:** settlement is current-week-only (BR-021/G-03); late mispayments need super-admin surgery today.
- **External behavior:** archived flags immutable through the app.
- **Alternatives:** (a) retro flips w/ mandatory audit+reason; (b) formal payment-adjustment transaction; (c) keep finality + documented out-of-band procedure.
- **Risk:** (a/b) rewriting settled history without trace unless audited (AUD-007); (c) operational pain.
- **Recommended default:** NONE — money-semantics policy evidence cannot establish. NO DEFAULT OFFERED.
- **Status:** OPEN — HUMAN ACTION.

## D-04 — Carry Scheduling & Once-Per-Period Guard
- **Decision:** operator-only ritual vs automated-with-guard execution.
- **Why required:** carry f≠1 NON-IDEMPOTENT (BR-040: 100→50→25 verified); scheduler double-fire corrupts wages (G-04/OPS-004/R-02).
- **External behavior:** manual CLI only; nothing scheduled; dry-run exists; audits expose repeats but prevent nothing.
- **Alternatives:** (a) operator-gated ritual (dry-run first); (b) automate with once-per-period idempotency key; (c) replace carry with installment feature (new capability).
- **Risk:** automation without guard = silent balance corruption.
- **Recommended default:** (a) now + design hook for (b) later — commands were built operator-first (dry-run sentinel, NULL-actor audits, zero scheduler infra).
- **Status:** OPEN — HUMAN ACTION (guard mandatory if automating).

## D-05 — Pagdi/Warp Completion Model Unification
- **Decision:** should pagdi gain an explicit finish control like warp?
- **Why required:** verified asymmetry (BR-029/G-05): pagdi closes ONLY via new assignment — operators must fabricate a replacement to close an idle pagdi, which also RESETS the progress window (CALC-003 start bound); employee self-finish branch inert.
- **External behavior:** asymmetric; no documented domain reason found.
- **Alternatives:** (a) mirror warp's POST finish for pagdi; (b) remove warp button (pure auto-finish everywhere); (c) keep asymmetry as intended difference.
- **Risk:** (c) perpetuates polluting workaround assignments.
- **Recommended default:** (a) — warp's explicit-finish pattern was introduced during stabilization precisely to fix lifecycle coherence (BUG-10 direction); evidence favors symmetry. Human confirms.
- **Status:** OPEN — HUMAN ACTION.

## D-06 — Archive Ownership & Cadence
- **Decision:** who runs weekly archive, when, missed-week policy; does M-V1 need a CLOSED marker independent of command execution?
- **Why required:** nothing schedules anything (OPS-001/G-06); unarchived weeks leave history empty and live numbers stale; forgetting is invisible (reruns safe per BR-018, but no detector exists).
- **External behavior:** pure operator ritual; `--date` back-fill; no missed-week detection.
- **Alternatives:** (a) named owner + runbook (dry-run first); (b) cron (must honor BR-018 + D-04 guard for carry); (c) built-in "close week" admin action with confirmation.
- **Risk:** silent payroll staleness.
- **Recommended default:** (b)/(c) plus mechanically verifiable missed-week warning (current week > last archived +7d ⇒ alert). Policy choice human.
- **Status:** OPEN — HUMAN ACTION.

## D-07 — Target Audit Matrix Sign-Off
- **Decision:** confirm Management-V1 audit matrix depth/retention/read-surface (AUD-006..009).
- **Why required:** approvals, rate changes, payment flips, production add/delete have NO trail today (G-07); silence must not be inherited, but exact requirements are business choices.
- **External behavior:** money/material events only; read surface super-admin-only; WarpChangeHistory even unregistered (DATA-009).
- **Alternatives:** minimal (status quo) / matrix as drafted in 03 §17 / extended (+read-access logging).
- **Risk:** under-auditing repeats accountability holes; over-auditing adds noise/cost.
- **Recommended default:** adopt 03 §17 matrix as drafted (every mutation mapped to an event type; nothing exotic). Human confirms scope.
- **Status:** OPEN — HUMAN ACTION.

## D-08 — Export Pricing Basis (Current vs Historical Rate)
- **Decision:** value historical production exports at TODAY'S rate (external rule BR-023/CALC-008) or freeze at period rate?
- **Why required:** after any rate change, current-rate pricing makes historical export earnings inconsistent across time and divergent from stored ledger finals; two exports of the same past month can differ. Deliberate arithmetic (cell-exact R4 verification), not display bug — but intent undocumented (Q-06/R-15).
- **CURRENT EXTERNAL RULE:** count × CURRENT rate at render/export time.
- **BUSINESS IMPLICATION:** misleading pay comparisons/trend analysis whenever rates change over a worker's tenure.
- **Alternatives:** (a) preserve rule; (b) store per-entry rate at creation, price historically; (c) dual columns (historical + current).
- **Risk:** (a) misleading reports; (b/c) small schema/report changes.
- **Recommended default:** none offered — reporting semantics are a business preference; both behaviors are defensible. (If forced by evidence alone: external behavior was knowingly kept through stabilization, i.e., tolerated — but tolerance ≠ endorsement.)
- **Status:** OPEN — HUMAN ACTION.

## D-09 — Notification Registry Intent (AlertEmail)
- **Decision:** what did/do notifications notify ABOUT, and does Management-V1 need them?
- **Why required:** AlertEmail model + super-admin CRUD exist; NOTHING sends anything anywhere (F-34/Q-10). Business intent undocumented — UNKNOWN classification.
- **External behavior:** inert registry (unique email list, zero consumers).
- **Alternatives:** (a) drop entirely; (b) repurpose for archive-missed/payment-summary alerts (synergy with D-06); (c) keep dormant.
- **Risk:** building on unknown intent wastes effort or misses real need.
- **Recommended default:** none — pure UNKNOWN. Investigate with business owner.
- **Status:** OPEN — UNKNOWN INTENT.

## D-10 — Credential/Input Hardening
- **Decision:** password policy, phone format validation, login throttling for Management-V1.
- **Why required:** external app has NO password strength validators (no AUTH_PASSWORD_VALIDATORS in settings), free-form phone ≤15 chars as username, and no login rate limiting — all OBSERVED gaps, not rules (VAL-012/013, SEC notes).
- **External behavior:** accepts weak passwords; any phone-like string; unlimited attempts.
- **Alternatives:** (a) keep permissive (workshop trust model); (b) standard hardening (validators, format check, throttle/backoff).
- **Risk:** (a) credential stuffing/typo accounts; (b) minor onboarding friction for workers.
- **Recommended default:** (b) lightweight: minimum password length + normalized phone digits + basic throttle — industry baseline; human sets thresholds.
- **Status:** OPEN — HUMAN ACTION.

## D-11 — PDF Slip Content Spec Acceptance
- **Decision:** accept current slip content set (name, week range, final ₹) or expand (pieces, gross, advance breakdown)?
- **Why required:** slip inner text was NEVER machine-parsed in any phase — content values carry NOT VERIFIED status (stream validity proven only; REP-003). Shared computation path makes divergence unlikely but unproven; and the minimal content may not satisfy worker expectations.
- **External behavior:** three text lines; streamed PDF attachment.
- **Alternatives:** (a) accept as-is once visually confirmed; (b) expand to full breakdown matching grid (REP-001 parity).
- **Risk:** paying/arguing over a slip that omits composition.
- **Recommended default:** (b) — trivially derivable from the same CALC-002 service M-V1 will implement once. Human confirms format.
- **Status:** OPEN — HUMAN ACTION (+verification task).

## D-12 — PostgreSQL Concurrency Assumption Sign-Off
- **Decision:** confirm production DB target behavior satisfies DATA-011 invariants under load before go-live.
- **Why required:** all concurrency proofs ran on SQLite (row locks emulated, busy-timeout); PostgreSQL-specific locking never executed in ANY phase (R-03); OPS-008 marks PG component NOT VERIFIED.
- **External behavior:** atomic rollbacks proven under forced SQLite contention; PG expected better window but untested.
- **Alternatives:** (a) verify on staging PG with parallel advance/material/archive probes; (b) accept invariant-by-design argument without runtime proof.
- **Risk:** unverified locking edge under real deployment.
- **Recommended default:** (a) mandatory pre-go-live smoke (cheap, decisive).
- **Status:** OPEN — HUMAN ACTION (verification gate, not design change).

---

## Register summary

- Total items: **12**. All OPEN. None resolvable by further code investigation (each is policy/intent or environment-bound).
- Items with evidence-backed recommended defaults: D-01(a), D-02(b+c), D-04(a→hook b), D-05(a), D-06(b/c+detector), D-07(matrix as drafted), D-10(b light), D-11(b), D-12(verify).
- Items explicitly WITHOUT recommended default (pure business preference/unknown): D-03, D-08, D-09.
