# Phase 6.4 — Management-V1 Calculation Specification

Perspective: implementation-ready MATHEMATICAL contracts for every business calculation in the external application (serverloom), as VERIFIED in Phases 3–6.3. Evidence keys: V=`accounts/views.py` · S=`core/services.py` · M=`core/models.py` · CR=`reset_weekly_salary.py` · CC=`carry_advance.py` · TS=`core/tests/test_stabilization.py` · TA=`test_advance_and_reset.py` · R45=Phase 4.5 report · P4=Phase 4 report · BR6.3=`BUSINESS_RULE_INVENTORY.md`. Arithmetic-semantics checks marked "py-verify" were executed this session with CPython 3.13 (IEEE-754 double, identical semantics to the app's Python 3.11 target).

> These formulas describe the external application's verified behavior, not an idealized redesign.

---

# 1. Executive Summary

| # | Calculation | Kind | Liveness | Authority |
| - | ----------- | ---- | -------- | --------- |
| CALC-001 | Week bounds | temporal helper | computed per use | authoritative (single source) |
| CALC-002 | Weekly payable P = G − A | core money | LIVE on read; frozen only by CALC-007 / payment create-path | authoritative formula; stored copies are snapshots |
| CALC-003 | Material made quantity M | progress | LIVE on read | authoritative |
| CALC-004 | Remaining Rem = max(0, C − M) | progress/display | LIVE on read | derived from CALC-003 |
| CALC-005 | Carry-forward balance scaling | operational batch (CLI) | executes at run time; mutates stored balance | authoritative over advance BALANCE (with give/clear) |
| CALC-006 | Advance term (full-balance-every-week) | money policy term | consumed inside CALC-002 | authoritative definition of A |
| CALC-007 | Archive canonical truth | historical authority batch | executes per run; writes ledger | THE authority for weekly quantities |
| CALC-008 | Display/export row earnings | presentation/export | LIVE at render/export (repriced) | DERIVED — pricing basis under decision D-08 |
| CALC-009 | Live-surface parity invariant | cross-consumer contract | continuous requirement | invariant, not a formula |

Dependencies: CALC-001 → CALC-002 → {CALC-007 snapshot, CALC-009 parity}; CALC-006 defines CALC-002's A input; CALC-003 → CALC-004; CALC-005 mutates the balance that CALC-006 exposes; CALC-008 reads stored quantities + current rate.

Live calculations: 001, 002, 003, 004, 008, 009 (recomputed on every read). Historical/stored: ledger rows written by 007 and by the payment create-path. Operational: 005 (and 007's execution).

---

# 2. Mathematical Notation

| Symbol | Name | Meaning | Type | Unit | Valid domain | Source | Mutable? | Timeline |
| ------ | ---- | ------- | ---- | ---- | ------------ | ------ | -------- | -------- |
| w | worker | an Employee record | entity id | — | existing workers | Employee table | row fields mutable | n/a |
| d | business date | a calendar date | date | day | any ISO date | input or clock | n/a | live parameter |
| d* | default date | server-local today (Asia/Kolkata) | date | day | — | timezone.localdate() | n/a | live |
| offset(d) | weekday number | Monday=0 … Sunday=6 | int 0..6 | day | — | Python date.weekday() | n/a | function |
| m(d) | week monday | monday of d's week | date | day | ≤ d | CALC-001 | n/a | computed |
| s(d) | week sunday | m(d)+6 days | date | day | ≥ d | CALC-001 | n/a | computed |
| W=(m,s) | week window | inclusive closed interval [m,s] | (date,date) | days | s=m+6 | CALC-001 | n/a | computed |
| q_i | production count | one SareeCount row's count | int ≥0 | pieces | storage-enforced | SareeCount.count | deletable row | persisted |
| Q_w(W) | qualifying quantity | Σ q_i for w within W | int ≥0 | pieces | ≥0 | aggregate query | recomputed | live |
| R_w(t) | applicable rate | worker's rate AT EVALUATION INSTANT t | int ≥0 | ₹/piece | ≥0 | salary_per_saree | mutable by staff | live-at-t |
| B_w(t) | advance balance | worker's outstanding balance at instant t | int ≥0 | ₹ | ≥0 (storage validator) | advance_salary | give/clear/carry | live-at-t |
| A_w | advance term | full B_w applied to a week computation | int ≥0 | ₹ | =B_w | CALC-006 | derived | live |
| G_w | gross | Q × R | int | ₹ | ≥0 | CALC-002 | derived | live-or-frozen |
| P_w | final payable | G − A | int | ₹ | ANY sign | CALC-002 | derived | live-or-frozen |
| C_a | capacity | material assignment capacity | int ≥0 | pieces | ≥0 | capacity_sarees | immutable post-create | persisted |
| σ_a | assignment start | material start_date | date | day | required (pagdi) / =d* (warp) | start_date | immutable post-create | persisted |
| ε_a | assignment end | end_date if finished else ∞ bound | date or null | day | ≥ start when set | end_date | finish sets it once | persisted |
| M_a(w) | made quantity | CALC-003 sum for assignment window | int ≥0 | pieces | ≥0 | model method | recomputed | live |
| Rem_a | remaining | max(0, C−M) | int ≥0 | pieces | ≥0 | CALC-004 | derived | display-only |
| f | carry factor | CLI scaling factor | float ≥0 | ratio | argparse float; <0 rejected | --factor arg | per-run | operational |
| N_f | carried balance | T(B×f) clamped ≥0 | int ≥0 | ₹ | ≥0 | CALC-005 | written to balance | operational |
| T(x) | truncate toward zero | Python int(x) semantics | int | — | — | language runtime | n/a | function |
| E_row | display earning | row quantity × current rate | int | ₹ | ≥0 | CALC-008 | derived at render | live |

No symbol is reused with two meanings. "Instant t" emphasizes that R and B are read fresh at each evaluation (live), while stored rows keep their capture-time values.

# 3. Number Representation — CURRENT VERIFIED SEMANTICS

1. **Integers everywhere except one operation.** Quantities, rates, balances, capacities, and all money outputs are integers (Python `int`, arbitrary precision). Currency is whole rupees (₹); no paise anywhere. CONFIRMED (V/S field usage; PositiveIntegerField models M).
2. **No division exists** in any business calculation. CONFIRMED by source sweep this session: zero `/` arithmetic operators in views/services business paths (only URLs/strings matched).
3. **NULL handling:** SQL `SUM` over an empty set yields NULL; every consumer maps it via `… ["count__sum"] or 0` (V:121,608,675,739; S:112) and `int(x or 0)` for scalar fields (S:55,79,113,115,278; V:123-124,609-610,676-678,740,829). Empty ⇒ ZERO, never NULL, never exception. CONFIRMED.
4. **Float appears ONLY in CALC-005**: CLI `--factor` parses to Python float; product `prev * float(f)` is IEEE-754 double; result passed through `int()` → **truncation toward zero** (py-verify: int(7.9)=7, int(−7.9)=−7, int(0.5)=0, int(−0.5)=0). On the reachable domain (prev≥0, f≥0 enforced before compute) truncation coincides with floor.
5. **Float artifacts are real and confirmed** (py-verify this session):
   - upward artifact: `3×0.1 = 0.30000000000000004`, `435×0.01 = 4.3500000000000005` → int() still floors correctly;
   - **downward steal**: `100×0.29 = 28.999999999999996` → `int()` gives **28**, though exact decimal arithmetic gives **29**. This is verified semantic behavior of the current implementation class.
6. **Multiplication behavior:** integer multiplication exact (no overflow in practice: Python bigint). Float multiplication subject to binary representation error as above.
7. **Rounding/truncation summary:** NO rounding anywhere; single truncation point in CALC-005 only (§14).
8. **Currency representation:** signed integer fields in the ledger (`IntegerField`) deliberately allow negatives; source fields are non-negative (`PositiveIntegerField`). CONFIRMED (M).

## FUTURE IMPLEMENTATION RECOMMENDATION (separated — NOT observed behavior)

Management-V1 should implement money math in exact integer or decimal arithmetic and perform carry scaling as `(B * f_num) // f_den` or Decimal quantize-with-ROUNDDOWN, eliminating the binary-float artifact (BR6.3 CALC-005 IMPROVE note; Phase 5 R-06 mandates ONE shared implementation). The OBSERVED contract below remains the compatibility reference until the business decides otherwise.

---

# 4. Calculation Dependency Graph

```text
                 ┌─────────────────────────────┐
                 │ CALC-001  week bounds (m,s) │◀── d* or explicit --date
                 └──────────────┬──────────────┘
              ┌─────────────────┼──────────────────────────┐
              ▼                 ▼                          ▼
   weekly aggregates     payment settlement            archive execution
   Q_w(W) ──────────▶ CALC-002  P = G − A ◀── A (=B_w, CALC-006) ◀── B_w mutated by
              │             │      │                       give(+)/clear(→0)/CALC-005(×f)
              │             │      └────────────▶ payment CREATE-path snapshot
              │             ▼                   (row quantities frozen at click)
              │        CALC-009 parity across live consumers
              │        (dashboard · detail card · grid row · slip*)
              ▼
         CALC-007  archive: freeze {Q,R,G,A,P} per worker ∀w  ⟶ SalaryHistory
              │                                       (create-or-refresh)
              └──────────────▶ REP-002/REP-006 ledger consumers (stored values)

   Production stream (q_i, dates) ──▶ CALC-003 M_a(window [σ_a , ε_a or d*])
                                              └──▶ CALC-004 Rem_a = max(0, C−M)

   Stored production rows + CURRENT R_w(now) ──▶ CALC-008 display/export earnings
```

| Calc | Inputs | Consumes | Consumed by | Live/Stored | Authority |
| ---- | ------ | -------- | ----------- | ----------- | --------- |
| 001 | d or d* | — | 002-context, 007, all weekly surfaces | computed | authoritative |
| 002 | Q_w(W), R_w(t), A_w=B_w(t) | 001, 006 | 007, 009, payment create-path, slip/grid/dashboard | live (frozen copies via 007/snapshot) | authoritative formula |
| 003 | q_i set, σ_a, ε_a/d* | production stream | 004, progress UIs | live | authoritative |
| 004 | C_a, M_a | 003 | progress UIs | live/display | derived |
| 005 | B_w ∀w, f | balance state | next CALC-002 evaluations | operational write | authoritative (balance writer) |
| 006 | B_w | — | 002 | definitional | authoritative |
| 007 | ∀w: Q_w(W),R_w(t),B_w(t) via 001+002 | 001,002,006 | ledger, exports REP-002/006 | stored output | THE quantity authority |
| 008 | q_i (any date), R_w(now) | stored rows | employee history page, admin detail rows, XLSX saree sheet | live at render | derived (basis → D-08) |
| 009 | all CALC-002 consumers | 001,002,006 | QA/regression contract | invariant | requirement |

Workflow/report consumers: WF-005 (grid/dashboard→002/009), WF-006 (give/clear mutate B), WF-007 (snapshot path), WF-008 (007), WF-009 (005), WF-010/011 (003/004), WF-013 (008 + ledger reads), REP-001..REP-006 per BR6.3 §19.

---

# 5. CALC-001 — Week Bounds

**Formula (CONFIRMED, S:31-39):**

```text
offset(d) ∈ {Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6}   # Python weekday()
m(d) = d − offset(d)·(1 day)
s(d) = m(d) + 6·(1 day)
W(d) = [m(d), s(d)]                        # CLOSED interval, inclusive both ends
d defaults to d* = localdate()            # TIME_ZONE=Asia/Kolkata, USE_TZ=True
```

- Single source of truth: every caller uses `get_week_bounds` (S). No independent week arithmetic exists elsewhere. CONFIRMED by grep.
- Explicit parameter: archive `--date YYYY-MM-DD` parsed STRICTLY (`strptime %Y-%m-%d`); invalid format aborts command pre-write (CR:19-21).
- Timezone: all "today" values are Asia/Kolkata local dates (settings.py:114-116; runtime rollover proofs R45).

Verified boundary cases (py-verify this session, same algorithm):

| Reference date d | offset | m(d) | s(d) | Note |
| ---------------- | ------ | ---- | ---- | ---- |
| 2026-08-24 (Mon) | 0 | 2026-08-24 | 2026-08-30 | identity |
| 2026-08-25 (Tue) | 1 | 2026-08-24 | 2026-08-30 | midweek |
| 2026-08-30 (Sun) | 6 | 2026-08-24 | 2026-08-30 | week end |
| 2025-12-31 (Wed) | 2 | 2025-12-29 | 2026-01-04 | YEAR boundary spans years |
| 2026-01-01 (Thu) | 3 | 2025-12-29 | 2026-01-04 | same week, prior year start |
| 2024-02-29 (Thu) | 3 | 2024-02-26 | 2024-03-03 | LEAP year, month boundary |

Runtime evidence: Sat→Sun→Mon rollover observations across sessions (W62 §20); harness rollover incident independently re-proven correct (R45 §3b note).

---

# 6. CALC-002 — Weekly Payable (P0)

**Canonical formula (CONFIRMED, S:106-123; identical inline copies listed in §13/CALC-009):**

```text
Q_w(W)  = Σ q_i                for all i where w_i=w AND m ≤ date_i ≤ s ; empty set ≡ 0
R_w(t)  = int(salary_per_saree or 0)          # evaluated at instant t
A_w     = B_w(t)                              # ENTIRE balance — see CALC-006
G_w     = Q_w × R_w                           # integer multiply, exact
P_w     = G_w − A_w                           # integer subtract, MAY BE NEGATIVE
```

Properties:
- **Sign:** unbounded. Negative P is legal, displayed, stored, exported (pinned debt-recovery rule BR6.3 BR-013; TS:298 runtime).
- **Zero:** Q=0 ⇒ G=0 ⇒ P=−A. R=0 ⇒ G=0. A=0 ⇒ P=G. All-zero ⇒ P=0.
- **NO clamping, NO rounding, NO proration.**
- **Liveness:** every GET recomputes from current stream+rate+balance. Nothing persists P except (a) CALC-007 archive rows, (b) payment CREATE-path snapshots (§20).
- **Rate changes:** live surfaces re-price immediately with R(now) (BR6.3 BR-039).
- **Corrections:** delete/re-create alters the NEXT evaluation (Q changes); already-written snapshots do NOT change.
- **Archive interaction:** CALC-007 recomputes this exact formula at lock time and freezes results (create-or-refresh).
- **Payment interaction:** see §20 — two distinct paths.

Worked examples (formula-computed; ★ = also runtime-verified):

| Case | Q | R | A | G=Q×R | P=G−A | Status |
| ---- | - | - | - | ----- | ----- | ------ |
| positive final ★ | 15 | 25 | 0 | 375 | **375** | RUNTIME (Alpha archived 15/375, R45 §8) |
| zero final | 4 | 25 | 100 | 100 | **0** | COMPUTED-BY-SPEC |
| negative final ★ | 0 | 25 | 140 | 0 | **−140** | RUNTIME (Gamma preserved −140 compute+archive) |
| advance > gross ★ | 2 | 25 | 140 | 50 | **−90** | CLASS RUNTIME (Beta paid=True final=−40 archived) |
| zero sarees ★ | 0 | 25 | 0 | 0 | **0** | RUNTIME (zero-production archive rows) |
| zero rate | 10 | 0 | 0 | 0 | **0** | COMPUTED-BY-SPEC (rate default 0, BR6.3 BR-006) |
| zero advance | 15 | 25 | 0 | 375 | **375** | RUNTIME (same as case 1 — A=0 path) |

---

# 7. CALC-003 — Made Quantity

**Formula (CONFIRMED, M:95-105 pagdi / :137-145 warp — one shared implementation since BUG-19 fix):**

```text
bound_a = ε_a                    if assignment finished (end_date set)
bound_a = d*                     otherwise (open)
M_a     = Σ q_i                  for all i where employee_i = w_a
                                 AND σ_a ≤ date_i ≤ bound_a        # INCLUSIVE both ends
empty set ≡ 0
```

- **Qualifying set:** ALL of the worker's production rows whose date falls in the closed window. Work belongs to the WORKER, not to a material — two overlapping assignments share the same underlying stream (each sums it over its own window). CONFIRMED (model filter has no material linkage).
- **Open assignment:** upper bound = today (server-local), so future-dated entries beyond today are EXCLUDED (runtime-verified: CapacityFormulaTests future-exclusion; next-Monday exclusion probes).
- **Finished assignment:** upper bound FROZEN at end_date — later production does NOT retroactively enter a finished assignment's progress.
- **Past entries:** included whenever they fall inside the window (back-dating works).
- **Corrections/deletion:** rows are summed LIVE; deleting a qualifying row reduces M at next evaluation; adding one raises it. Already-displayed numbers have no memory.
- **Zero quantity:** contributes 0 but EXISTS as a row (zero ≠ missing).
- **Multiple entries same day:** impossible (BR6.3 BR-003 unique constraint); the sum semantics would simply add them if they existed.
- **Empty dataset:** M=0.

---

# 8. CALC-004 — Remaining Quantity

**Formula (CONFIRMED, M:107-110/:147-150):**

```text
Rem_a = max(0, C_a − M_a)
```

- **Clamp semantics:** purely presentational guard — consumers NEVER see a negative remaining.
- **Overshoot:** if M>C, Rem displays 0; the overshoot is NOT lost — M itself remains unclamped and visible, and the raw production rows persist. There is NO separate stored overshoot metric. (DISPLAYED REMAINING vs ACTUAL PRODUCTION distinction: actual = M_a, always exact.)
- Zero capacity ⇒ Rem=0 regardless of M. Zero made ⇒ Rem=C.
- Inputs cannot be negative (validation VAL-007/DATA-010); clamp is therefore defensive-only on the reachable domain.
- Corrections affect Rem exactly as they affect M (live derivative).
- **Effect of finishing:** freezing bound_a (ε_a=today) stops M growth; Rem becomes fixed at finish-day value forever.

---

# 9. CALC-005 — Carry-Forward (operational)

**Exact operation (CONFIRMED, CC + S:248-317):**

```text
Precondition: f ≥ 0 else abort entire run, rc≠0, NO writes      (S:270-271)
For EVERY worker w (locked, whole-run transaction):
    B ← int(balance_w or 0)
    if B = 0:
        write NO-OP CARRY audit (previous=0,new=0); processed++ ; continue
    x  = B × float(f)                 # IEEE-754 double multiply
    N  = T(x)                         # int(): TRUNCATION TOWARD ZERO
    if N < 0: N = 0                   # defensive clamp (unreachable: B≥0,f≥0 ⇒ x≥0)
    if N ≠ B: write new balance       # WRITE-IF-CHANGED
    write CARRY audit ALWAYS          # even when unchanged (e.g., f=1.0) or no-op
processed++ 
```

**Truncation is NOT "rounding":**
- T(x) = truncation toward zero: int(7.9)=7, int(−7.9)=−7, int(0.5)=0, int(−0.5)=0 (py-verify).
- On the reachable domain x≥0, T(x) = floor(x). Both statements documented because the defensive clamp implies the general contract would be truncation if negatives ever became reachable.
- Fractional results ALWAYS discard the fraction: 25×0.5=12.5 → 12; 35×0.1=3.5 → 3; 145×0.1=14.5 → 14 (py-verify).

Factor cases:

| f | Behavior | Example (B=100) |
| - | -------- | ----------------- |
| 0 | wipes balance to 0 | N=0, audit CARRY 100→0 |
| 1 | value-idempotent (N=B), audit still written | N=100, CARRY 100→100 |
| >1 | scales UP (allowed) | f=2 → 200 |
| 0<f<1 | scales down with fraction discarded | f=0.5 → 50 |
| <0 | REJECTED rc≠0 pre-processing | no writes |
| non-numeric | argparse type=float rejection, rc≠0 | INFERRED (standard library argparse behavior; mechanism CONFIRMED as typed arg) |
| B=0 | NO-OP CARRY audit row, balance untouched | processed++ |

**Repeat/compounding — CURRENT BEHAVIOR, deliberately documented, NOT made idempotent:**
- Repeating with the same f≠1 multiplies again. RUNTIME chain: 100 →(×0.5)→ 50 →(×0.5)→ 25 →(×0.5)→ **12** (25×0.5=12.5 truncated). K-series evidence (W62 §18) covers 100→50→25.
- Any scheduler double-fire compounds balances (hazard G-04; scheduling policy = open decision D-04; OPS6.3-004 contract).
- Float-artifact hazard CONFIRMED this session: B=100, f=0.29 → product 28.999999999999996 → **N=28** although exact decimal gives 29. Downward unit-steal is possible for specific (B,f) pairs.
- Dry-run (`--dry-run`) predicts processed count inside a rolled-back transaction; commits nothing (OPS6.3-002).

---

# 10. CALC-006 — Advance Term (full-balance-every-week)

**Rule (CONFIRMED):**

```text
A_w(week) = B_w(evaluation instant)        # the ENTIRE current balance, every week
```

- **No amortization schedule exists unless evidence proves otherwise — none was found.** Source sweep: balance is a single scalar field; no installment records, no per-week allocation tables, no deduction ledgers. The only writers of B are give (+amount), clear (→0), carry (×f). CONFIRMED.
- **Multi-week persistence:** B survives archive untouched (BR6.3 BR-017). Worker with B=140 owes 140 against EVERY week: week1 P=G₁−140, week2 P=G₂−140, … until B changes. There is no automatic reduction after any week.
- **Zero balance:** A=0; P=G exactly.
- **Clearing mid-stream:** subsequent computations see A=0 immediately; past snapshots unaffected.
- **New advance mid-week:** live surfaces reflect it instantly (A read at evaluation time); an existing current-week snapshot row keeps its captured A-copy until archive refresh.
- **Carry interaction:** carry rewrites B between weeks; the NEXT week's A is the scaled value. Truncation remainders are silently dropped from the obligation (documented consequence of CALC-005).
- **Negative-salary interaction:** when A>G the excess is effectively recoverable debt rolled forward implicitly — the SAME full balance keeps applying to later weeks (this is the mechanism behind pinned rule BR-013).

---

# 11. CALC-007 — Archive / Historical Authority (P0)

**Algorithm (CONFIRMED, S:126-192 + CR):**

```text
Input: target date d  (default d*, or strict --date)
(m,s) ← CALC-001(d)
BEGIN single transaction
  lock ALL employees (select_for_update, write-blocking snapshot)
  FOR EACH worker w (ALL workers — no activity filter):
      Q,R,G,A,P ← CALC-002(w, W=(m,s)) evaluated NOW (inside lock)
      IF ledger row (w,m,s) absent:
          CREATE row {sarees=Q, salary_rate=R, total_salary_before_advance=G,
                      advance_salary=A, final_salary=P,
                      paid_status=False, paid_date=NULL,
                      notes = --note or "Archived by scheduled reset on {d*}"}
          created++
      ELSE:
          REFRESH the FIVE quantity fields {sarees, salary_rate,
              total_salary_before_advance, advance_salary, final_salary} := above
          paid_status / paid_date / notes UNTOUCHED
          updated++
      IF legacy counter current_week_salary ≠ 0: set to 0        # vestigial, BR6.3 BR-034
COMMIT  (any failure ⇒ whole-run rollback; dry-run raises sentinel instead of commit)
Output: {created, refreshed}
```

What is FROZEN vs what stays LIVE:

| Value | After archive | Can change later? |
| ----- | ------------- | ----------------- |
| sarees, salary_rate, gross, advance-copy, final for that week | CANONICAL (frozen by refresh/create) | NOT through the app (only rerun recompute-before-more-work or out-of-app surgery) |
| paid_status / paid_date / settlement notes | exactly as settlement left them | only current-week flips (BR6.3 BR-021; D-03 open) |
| worker advance BALANCE B | untouched by archive | yes — give/clear/carry anytime |
| raw production rows | untouched by archive | editable/unaudited (drift risk → D-02) |
| material progress windows | unrelated to archive | per CALC-003 rules |

- **Worker population:** every worker including zero-production ones (rows created 0/0/0/B/B-negative) — CONFIRMED loop without filters.
- **Idempotency:** rerun same window ⇒ created=0, refreshed=N with IDENTICAL values (RUNTIME triple-run; TS:264). Safe retry contract.
- **Negatives:** P<0 stored verbatim (RUNTIME Gamma −140; Beta −40 paid=True).
- **Corrections timing:** production edits BEFORE the final archive of that week flow into canonical values; edits AFTER a week's last archive do NOT alter its ledger row unless the operator re-runs `--date` (which recomputes from surviving raw rows — the documented repair recipe) — and conversely, deleting raw rows post-archive creates LEDGER-vs-HISTORY DRIFT (Reconciliation C-02; policy open D-02).
- **Rate changes:** archive evaluates R(at archive instant). Post-archive rate changes never recalc archived rows (BR6.3 BR-039).
- **Audit:** the run itself writes NO dedicated audit events beyond resulting rows (console report only) — requirement AUD6.3-009 stands.

---

# 12. CALC-008 — Display / Export Earnings

**CURRENT VERIFIED BEHAVIOR (CONFIRMED, V:149-156 employee history; V:317-326 admin weekly rows; V:828-830 XLSX Saree sheet):**

```text
E_row = q_i × int(R_w(NOW))          # evaluated at RENDER / EXPORT instant
```

- Every historical production row is priced at the worker's rate at the moment someone views/exports it. After any rate change R1→R2, ALL historical rows reprice to R2 on next render.
- Zero-quantity rows display 0 regardless of rate. Deleted rows disappear entirely.
- The per-entry rate AT ENTRY TIME IS NOT STORED ANYWHERE in the external schema — `SareeCount` has no rate/snapshot column (M:54-67). Historical-rate pricing is therefore IMPOSSIBLE in the current system without a schema change. This is an evidence-based fact that constrains decision D-08's alternatives.
- The ledger sheet (REP-002/REP-006) shows STORED snapshot values and is unaffected by repricing — the two export sheets can disagree after a rate change; both behaviors are individually CONFIRMED.

**BUSINESS DECISION REQUIRED FOR FUTURE DESIGN:** D-08 (export pricing basis) remains OPEN exactly as registered in Phase 6.3. Options recorded there: (a) preserve current-rate pricing; (b) store entry-time rate and price historically (requires new persisted field); (c) dual columns. This specification does NOT resolve D-08.

---

# 13. CALC-009 — Live Parity Invariant

**Contract:**

```text
For every live consumer c ∈ {employee dashboard card, admin detail weekly card,
weekly grid row, PDF slip figure}:
    value_c(w, W) = P_w  as defined by CALC-002
given the SAME evaluation instant t (same Q read window, same R(t), same B(t)).
```

- Consumers (CONFIRMED locations): dashboard V:119-124; admin detail V:315-330; weekly grid V:604-623; slip V:739-740; canonical service S:106-123. Phase 3 catalogued ≥5 inline duplicates + service — all integer-identical semantics.
- Parity is RUNTIME-PROVEN across grid/dashboard/detail (R45 §8 M2.x parity checks).
- **Slip caveat:** PDF inner TEXT was never machine-parsed in any phase → parity for the slip is INFERRED from shared computation path, transport verified only (REP-003 NOT VERIFIED). Marked accordingly; not upgraded.
- Regression obligation: any Management-V1 implementation must compute ONCE (service-level) and feed all consumers; independent reimplementations violate this invariant by construction risk (Phase 5 R-06).

---

# 14. Rounding Specification

| Calc | Rounding performed? | Step | Numeric type | Fractional results |
| ---- | ------------------- | ---- | ------------ | ------------------ |
| CALC-001 | NO ROUNDING — date arithmetic | n/a | date | n/a |
| CALC-002 | NO ROUNDING — INTEGER ARITHMETIC (exact) | n/a | int | impossible |
| CALC-003 | NO ROUNDING — INTEGER ARITHMETIC | n/a | int | impossible |
| CALC-004 | NO ROUNDING — INTEGER ARITHMETIC (+max clamp) | clamp AFTER subtraction | int | impossible |
| CALC-005 | **TRUNCATION TOWARD ZERO via int(), AFTER float multiplication, BEFORE write/clamp** | see §9 | IEEE-754 double → int | fraction ALWAYS discarded (12.5→12); negative-fraction case unreachable on enforced domain but semantics = toward-zero (−0.5→0) |
| CALC-006 | none (definitional) | n/a | int | n/a |
| CALC-007 | inherits CALC-002 (none) | n/a | int | impossible |
| CALC-008 | NO ROUNDING — INTEGER ARITHMETIC | n/a | int | impossible |
| CALC-009 | inherits CALC-002 | n/a | int | impossible |

No step rounds to nearest; nothing uses banker's rounding; no ceiling anywhere. The ONLY truncation point in the entire system is CALC-005's `int(prev * float(f))`.

---

# 15. Zero-Value Specification

Terminology: **ZERO VALUE** = explicit stored 0 · **MISSING VALUE** = absent record where one could exist · **EMPTY SET** = query matches no rows (SQL SUM→NULL, mapped to 0 by `or 0` — CONFIRMED pattern) · **NULL** = nullable column unset (paid_date before payment).

| Calculation | Zero input | Result |
| ----------- | ---------- | ------ |
| CALC-001 | — (dates never zero) | — |
| CALC-002 Q=0 | zero quantity week | G=0; P=−A (worker "owes" balance) |
| CALC-002 R=0 | unpriced worker (default) | G=0; P=−A |
| CALC-002 A=0 | no advance | P=G exactly |
| CALC-002 all zero | idle worker | row of zeros; P=0; row still CREATED by archive |
| CALC-003 empty window | no qualifying rows | M=0 (never NULL/exception) |
| CALC-003 zero-count rows | attended-but-zero days | contribute 0, rows EXIST |
| CALC-004 C=0 | zero-capacity assignment | Rem=0 immediately |
| CALC-004 M=0 | fresh assignment | Rem=C |
| CALC-005 f=0 | wipe carry | N=0; audit written |
| CALC-005 B=0 | every worker audited w/ NO-OP CARRY | balance untouched |
| CALC-006 B=0 | no debt | A=0; P=G |
| CALC-007 zero-production worker | archive | CREATES full row of zeros/B-deduction (zero ≠ missing row) |
| CALC-008 q_i=0 | zero-count display row | E_row=0; row shown |
| Ledger context | week with NO row (missing ≠ zero): mark-unpaid silently no-ops with success flash (BR6.3 BR-032) | absence handled as no-op, not error |

---

# 16. Negative-Value Specification

**SOURCE INPUT VALIDATION (cannot be negative — rejected at entry, storage-enforced):**

| Input | Enforcement | Evidence |
| ----- | ----------- | -------- |
| production count q_i | view check `<0` reject + PositiveIntegerField CHECK | V:383,779; M:57; P4 §9 crash-history fixed |
| rate R | view check + validator | V:351-352; M:32 |
| capacity C | view check | V:463,544 |
| advance amount (delta) | service ValueError ≤0 | S:51-52 |
| advance balance B | PositiveIntegerField validator (all writers keep ≥0: give adds positive; clear→0; carry clamps) | M:33 |
| carry factor f | run abort if <0 | S:270 |

**CALCULATED RESULT SIGN (deliberately permitted):**

| Output | May be negative? | Handling |
| ------ | ---------------- | -------- |
| G = Q×R | NEVER (product of non-negatives) | — |
| P = G−A | YES — displayed, stored, exported, payable | pinned BR-013; never clamped |
| ledger stored final/gross/advance-copy | signed IntegerFields by design | preserved verbatim through refresh |
| Rem | NEVER (clamped ≥0) | overshoot hidden from Rem only |
| M | NEVER (sum of non-negatives) | true value, unclamped |
| carry N | NEVER post-clamp | defensive clamp |

Clamped: Rem, N. Rejected: all source inputs above. Preserved: P and ledger fields. Nothing normalizes negative P away.

---

# 17. Partial Periods

**NO PARTIAL-PERIOD PRORATION OBSERVED — NONE EXISTS ANYWHERE IN THE SYSTEM.**

| Scenario | Behavior |
| -------- | -------- |
| worker joins mid-week | joining date stamped, never consulted by any calculation; full-week window applies from day one |
| material starts mid-week | progress window simply starts at σ_a; payroll unaffected |
| material finishes mid-week | bound freezes at ε_a (= finish-day today); later work invisible to it |
| production starts/ends mid-week | irrelevant — pure daily rows summed over windows |
| current week incomplete | live P grows/shrinks as entries/balance/rate change until archive |
| archived complete week | frozen (CALC-007); new late-dated entries for that window do NOT update it (unless operator reruns --date) |
| future-dated production | stored now, EXCLUDED from every current-window aggregate until its week becomes current (verified both rollover directions) |
| past-dated correction inside current window | included immediately |
| first/last week of employment | no boundary logic exists; weeks are uniform |

---

# 18. Corrections

| Correction action | Live calc changes? | Historical ledger changes? | Payment state changes? | Snapshot changes? | Audit generated? | Reversible? |
| ----------------- | ------------------ | -------------------------- | ---------------------- | ----------------- | ---------------- | ----------- |
| add production | yes (next read) | no (until archive) | no | create-path rows: no | NO (gap AUD-006) | yes (delete) |
| delete production | yes | no (until archive) — post-archive delete ⇒ DRIFT (C-02/D-02) | no | no | NO (gap AUD-006) | NO (re-create manually) |
| correct quantity = delete+add | yes | via archive only | no | no | NO | manual |
| correct date = delete+add(other day) | yes (window membership may flip) | via archive | no | no | NO | manual |
| change worker | n/a — no edit path; delete+create under other worker | — | — | — | NO | manual |
| rate change R1→R2 | yes — live re-price instantly | archived rows NO; existing current-week snapshot keeps R1 until archive refresh | no | snapshot keeps capture rate | NO (req AUD-007) | yes (set back) |
| give advance | yes (A=B rises everywhere) | no | no | no | ADJUST ✓ | clear/carry |
| clear advance | yes (A=0 subsequently) | no; snapshots keep old A-copy | no | no | CLEAR ✓ incl. no-op | give again |
| mark paid | no (quantities untouched when row exists) | creates-or-flips CURRENT week row only | PAID | create-path stores click-time quantities | NO (req AUD-007) | mark unpaid |
| mark unpaid | no | flags only | UNPAID | quantities stay | NO | re-mark |
| archive rerun | no | created=0; refreshed numerically identical | PRESERVED | identical values | command console only (AUD-009 req) | inherently safe |
| carry repeat | next A scaled again | no | no | no | CARRY ✓ each run | only via corrective carry (lossy truncation) |

# 19. Historical Calculations — Authority Matrix

| Value | Live/Recomputed | Stored where | Historical authority | Can change later? |
| ----- | --------------- | ------------ | -------------------- | ----------------- |
| Current weekly salary P | recomputed per read (CALC-002/009) | — | the formula itself | continuously |
| SalaryHistory quantities {Q,R,G,A,P} | — | ledger row | ARCHIVE ONLY (CALC-007) | only via --date rerun recompute; else immutable in-app |
| Payment state (flags/date/note) | — | ledger row | mark paid/unpaid ONLY | current week flips; archived weeks immutable in-app (D-03) |
| Payment snapshot quantities (create-path) | — | ledger row | superseded by archive refresh at week close | refreshed by CALC-007 |
| Production row earnings (display) | recomputed at render (CALC-008) | none (rate not persisted per-row) | no stored authority — derived | every render |
| Advance balance B | scalar field | Employee.advance_salary | give/clear/CALC-005 events + audit chain | anytime |
| Material made/remaining | recomputed (CALC-003/004) | none (capacity/dates persisted) | formula over surviving raw rows | follows production stream until ε freeze |
| Export ledger sheet values | — | reads stored rows | same as ledger | mirrors row immutability |

The QUANTITY vs PAYMENT authority split (BR6.3 BR-014/BR-015) is preserved unchanged: archive owns quantities; settlement owns payment fields; neither touches the other's group.

# 20. Payment Snapshot Semantics

**CREATE PATH** (no row exists for current week — CONFIRMED V:682-691):
```text
row := { sarees=Q(now), salary_rate=R(now), gross=G(now), advance=A(now), final=P(now),
         paid_status=True, paid_date=today, notes = note or "Paid" }
```

**EXISTING PAYMENT ROW PATH** (row exists — CONFIRMED V:693-703):
```text
paid_status := True ; paid_date := today
IF note provided: notes := note        ELSE: prior notes preserved
ALL FIVE QUANTITY FIELDS UNTOUCHED     (may be stale until archive)
```

After marking:
- more production arrives → LIVE numbers move; snapshot row does NOT (temporary divergence by design; reconciled by archive refresh which PRESERVES the paid flag — runtime-proven pay→work→archive test).
- rate changes → snapshot keeps capture rate until archive.
- advance given/cleared afterwards → snapshot keeps captured A-copy until archive.
- reversal (mark unpaid) → flags cleared only; quantities remain whatever they were.
- repeats converge: get_or_create guarantees ONE row (unique constraint DATA-004 backstop).

The two paths MUST NOT be collapsed into one rule: create-path WRITES quantities; existing-path NEVER does.

# 21. Rate-Change Semantics (R1 → R2)

Timeline example (formula-traced; class runtime-verified):

| Surface/value | Before change (uses) | Instantly after R1→R2 | After archive (same week) |
| ------------- | -------------------- | ---------------------- | -------------------------- |
| dashboard/grid/detail/slip live P | R1 | **R2** (full open week re-priced retroactively) | n/a (week closed) |
| existing current-week ledger snapshot row (from earlier click at R1) | R1 stored | **stays R1** | REFRESHED to R_archive=R2 (archive evaluates current rate) |
| archived PREVIOUS weeks' rows | their archive-time rates | **unchanged forever** | unchanged |
| display/export earnings (CALC-008) | R_now | **R2 for ALL history** | R2 for all history |
| payment create-path snapshot taken after change | — | stores R2 | refreshed at archive |

Rules extracted: (1) rate is read at every evaluation instant — no rate memory exists except ledger snapshots and archive rows; (2) archive evaluates the rate AT ARCHIVE INSTANT; (3) nothing recalculates closed weeks. No conventional retrospective-payroll accounting is assumed or present.

# 22. Invariants (evidence-backed)

- INV-01 Rem ≥ 0 ∀a (M:107-110/:147-150).
- INV-02 q_i, R, C, B, f ≥ 0 at storage/validation layer (M validators; view checks; S:51,270).
- INV-03 P may be negative and is never clamped (TS:298; R45 §8).
- INV-04 Archive rerun creates NO duplicate ledger rows; created=0 on repeat (unique(employee,week_start,week_end); TS:264; CLI triple-run).
- INV-05 Archive preserves paid_status/paid_date/settlement notes byte-identically (update_fields exclusion; TS:243).
- INV-06 Archive never modifies B; B persists across weeks (S:146-148; R45 §8).
- INV-07 Payment flips never alter stored quantities of an existing row (V:693-703; TS ×4).
- INV-08 Live consumers are parity-consistent under equal inputs (R45 parity checks; CALC-009).
- INV-09 Exactly one ACTIVE assignment per type per worker under any race (5-way probes; atomic finish-then-create).
- INV-10 One production row per worker-day under any race (unique constraint + savepoint handling; parallel probes).
- INV-11 Balance equals last audit event's new_amount per worker (prev/new chains; R45 audit-chain exactness).
- INV-12 Empty aggregates yield 0, never NULL/exception (`or 0` pattern everywhere).
- INV-13 Week windows are CLOSED intervals [m,s] with s=m+6; single bounds implementation (S:31-39).
- INV-14 Carry writes balance only when changed, ALWAYS audits (incl. zeros/no-ops) (S:277-316).

# 23. Edge-Case Test Matrix

Full matrix (~45 scenarios, expected values computed from these contracts): companion file **`CALCULATION_TEST_MATRIX.md`**. Summary of representative rows:

| ID | Calc | Scenario | Expected (formula-derived) | Verified |
| -- | ---- | -------- | --------------------------- | -------- |
| E-01 | 002 | Alpha 15×25−0 | P=375 | RUNTIME ★ |
| E-02 | 002 | Gamma 0×25−140 | P=−140 | RUNTIME ★ |
| E-03 | 002 | constructed zero-final | Q=4,R=25,A=100 ⇒ P=0 | COMPUTED-BY-SPEC |
| E-04 | 002 | zero-rate worker | P=−A | COMPUTED-BY-SPEC (class runtime: rate defaults 0) |
| E-05 | 003 | finished-bound freeze | entries after ε excluded | RUNTIME (model tests) |
| E-06 | 004 | overshoot clamp | M=130,C=90 ⇒ Rem=0, M stays 130 | COMPUTED-BY-SPEC (clamp RUNTIME) |
| E-07 | 005 | chain ×0.5 | 100→50→25→12 | RUNTEME chain ★ (12 computed) |
| E-08 | 005 | f=0.29 artifact | 100→28 (not 29) | py-verify RUNTIME (semantic) |
| E-09 | 005 | f<0 | abort rc≠0, no writes | RUNTIME ★ |
| E-10 | 005 | B=0 audit | NO-OP CARRY row | RUNTIME ★ |
| E-11 | 007 | pay→work→archive | quantities refreshed, paid kept | RUNTIME ★ |
| E-12 | 007 | rerun | created=0, values identical | RUNTIME ★ |
| E-13 | 001 | year-boundary week | 2025-12-31 → [2025-12-29, 2026-01-04] | py-verify RUNTIME |
| E-14 | 001 | leap-year week | 2024-02-29 → [2024-02-26, 2024-03-03] | py-verify RUNTIME |
| E-15 | 002 | future-dated exclusion | next-Monday entry outside current P | RUNTIME ★ |
| E-16 | 008 | reprice after change | old row × new rate on next render | CODE-CONFIRMED (cell-exact exports R4) |
| E-17 | 020 | unpaid-no-row | success flash, zero change | CODE+M3-cycle CONFIRMED |
| E-18 | 007 | zero-worker archive | zeros row + B deduction | RUNTIME ★ (created==workforce) |

★ = direct runtime evidence in Phases 4/4.5 or this session. COMPUTED-BY-SPEC = expected derived strictly from the documented contract; scenario itself not separately executed.

# 24. Cross-Calculation Consistency

| Pair | Consistency statement | Status |
| ---- | --------------------- | ------ |
| 001→002 | 002 consumes W exclusively via 001; no rival week math exists | CONSISTENT (grep-confirmed single source) |
| 002→007 | 007 evaluates 002 verbatim at lock time; five fields map 1:1 | CONSISTENT (code identity) |
| 003→004 | 004 is pure derivative of 003; same window object | CONSISTENT |
| 005→advance state | 005 is one of exactly three balance writers; audit chain reconciles to balance | CONSISTENT (INV-11) |
| 006→002 | A ≡ B by definition inside 002; no amortization rival | CONSISTENT |
| 008→history/export | 008 (repriced) vs ledger sheet (stored) intentionally differ after rate changes; both exact | CONSISTENT-BUT-DIVERGENT (documented; D-08 open) |
| 009→live consumers | all four consumers share 002 semantics; slip text INFERRED-only | CONSISTENT (slip flagged) |
| Authority boundaries | quantities↔payment split; live↔frozen split; balance writers set {give,clear,carry} | PRESERVED unchanged |

No cross-calculation contradiction found. Divergences (C-02 drift, 008-vs-ledger) are documented behavioral consequences with open decisions, not inconsistencies.

# 25. Business Decisions That Must Remain Open

| Decision | Calculation affected | Current observed behavior | What is unknown | Why code cannot answer | Required human decision | Default from 6.3? |
| -------- | -------------------- | ------------------------- | --------------- | ---------------------- | ----------------------- | ------------------ |
| D-03 retro-payment | WHICH ledger rows' payment fields remain mutable (state machine scope) | current-week-only flips; archived weeks frozen in-app | desired retro-correction policy | policy intent, not mechanism | allow/deny archived-week flips (+audit) | none offered |
| D-08 export pricing basis | CALC-008 | count × CURRENT rate at render | desired basis (current/historical/dual) | business preference; schema lacks entry-rate so historical needs design choice | choose basis | none offered |
| D-09 notification intent | none (AlertEmail has zero computational role) | inert registry | purpose of registry | no sender/consumer exists | build/drop/repurpose | none offered |
| D-02 correction policy | whether post-archive raw edits may create ledger drift | drift possible today | allowed correction model | policy choice | audited-delete/reversal policy | recommended default EXISTS in 6.3 (b+c) |
| D-04 carry scheduling | whether CALC-005 may execute unattended | operator CLI only; non-idempotent | automation policy | policy choice | guard requirement if automated | recommended default EXISTS (operator-first + hook) |
| D-06 archive cadence | WHEN CALC-007 runs | manual ritual only | ownership/cadence | policy choice | owner+cadence+missed-week alert | recommended default EXISTS (b/c + detector) |
| D-12 DB environment | transactional guarantees around locked calculations | SQLite-proven; PG untested | PG locking behavior | environment absent | staging verification gate | recommended default EXISTS (verify pre-go-live) |

None of these are resolved by this specification; the formulas above describe behavior AS-IS for each branch.

# 26. Known Unverified Items (calculation-related)

1. **PDF slip inner figures (CALC-009 consumer)** — transport verified (magic bytes/filename/status); text values never parsed in any phase. Slip parity = INFERRED, not CONFIRMED. No extractor existed within investigation bounds.
2. **PostgreSQL execution of locked calculations (CALC-007 whole-workforce lock; CALC-005 row locks)** — arithmetic unaffected; transactional behavior under PG row-level locking never executed (no environment). Gate = D-12.
3. **Python 3.11 target runtime** — never executed locally (only 3.13). Arithmetic-semantics portability argument: IEEE-754 double + Python int semantics are language-version-stable for these operations; marked INFERRED, not VERIFIED.
4. **Float-artifact population** — the downward-steal case (§9, 100×0.29) is semantic-verified on this runtime; the complete set of (B,f) pairs exhibiting artifacts was not enumerated (mathematically large); treated as an inherent property of binary float multiply.

# 27. Implementation Contract

ONE BUSINESS CALCULATION → ONE MATHEMATICAL CONTRACT → ONE AUTHORITATIVE IMPLEMENTATION → MANY CONSUMERS. Each contract below is the single permitted implementation point; views/reports/commands MUST call it, never re-implement.

| Calc | Canonical formula | Inputs (canonical set) | Output | Numeric rules | Timing | Historical authority | Consumers | Test obligations |
| ---- | ----------------- | ---------------------- | ------ | ------------- | ------ | -------------------- | --------- | ---------------- |
| CALC-001 | m(d)=d−offset(d); s=m+6; W=[m,s] closed | d or clock d* (Asia/Kolkata) | (m,s) | dates only | per call | none (helper) | 002-hosts, 007, surfaces | Mon/Tue/Sun identity; year+leap boundaries (E-13/14) |
| CALC-002 | Q=Σq∈W; G=Q×R(t); P=G−A, A=B(t) | worker, W, stream, R(t), B(t) | {Q,R,G,A,P} | pure int; empty→0; NO rounding/clamp | per read | live; frozen copies via 007/snapshot | 007, 009 consumers, settlement create-path | E-01..E-04; sign matrix §16 |
| CALC-003 | M=Σq where σ≤date≤(ε or d*) | assignment, stream | M | pure int; inclusive bounds | per read | live until ε freeze | 004, progress UIs | open/finished/future-exclusion/deletion cases |
| CALC-004 | Rem=max(0,C−M) | C,M | Rem | int; clamp AFTER subtract | per read | display-only | progress UIs, lists | E-06; zero-capacity |
| CALC-005 | N=T(B×f), T=int() toward zero, clamp≥0; write-if-changed; audit always | ∀B, f≥0 | N per worker + audits | float multiply → truncate; artifact-aware | operator run; whole-tx | authoritative over B | next 002 evaluations | E-07..E-10; compounding chain; dry-run predicts count |
| CALC-006 | A=B(t) | B(t) | A | int | definitional | — | 002 | multi-week persistence test |
| CALC-007 | per worker: evaluate 002@lock; create-or-refresh 5 fields; preserve payment group; zero legacy counter; report counts | d (--date strict), workforce lock | ledger rows + {created,refreshed} | inherits 002 | operator run; single tx; idempotent rerun | THE quantity authority | ledger UIs, REP-002/006 exports | E-11/E-12/E-18; preservation + negatives + zero-worker rows |
| CALC-008 | E=q_i×R(now) | row, current rate | E | int | render/export instant | DERIVED (basis D-08 OPEN) | history page, detail rows, XLSX sheet | reprice-after-change; zero-row |
| CALC-009 | value_c ≡ 002 output ∀c | consumers list | parity | inherits 002 | continuous invariant | requirement | QA regression suite | cross-surface equality incl. slip (text UNVERIFIED flag) |

Implementation obligations: (1) single shared function per contract; (2) no inline rederivations; (3) exact integer arithmetic except contract-specified float in 005; (4) `empty→0` coalescing mandatory; (5) preserve sign semantics (never clamp P); (6) every mutation path writes its audit event atomically; (7) regression suite must cover every matrix row marked RUNTIME plus all COMPUTED-BY-SPEC rows before go-live.

# 28. No-Silent-Assumptions Audit

Language sweep performed on this document: terms "probably/should probably/normally/presumably/likely/expected to/conventional/standard payroll" — **zero occurrences** outside §21's explicit negation ("No conventional retrospective-payroll accounting is assumed"). Uncertainty is carried only by the controlled labels CONFIRMED / INFERRED / COMPUTED-BY-SPEC / NOT VERIFIED / BUSINESS DECISION REQUIRED / OPEN, each tied to evidence keys. Implementation recommendations appear solely in §3 (future block) and §27 obligations, explicitly separated from observed behavior.

# 29. Completeness Assessment

[x] CALC-001..009 documented mathematically · [x] every variable defined (§2) · [x] inputs sourced · [x] outputs have authority (§19) · [x] rounding explicit — none except CALC-005 truncation (§14) · [x] truncation distinguished floor/toward-zero/nearest (§9) · [x] zero behavior incl. NULL/missing/empty distinctions (§15) · [x] negative behavior input-vs-output separation (§16) · [x] partial periods — NO PRORATION stated (§17) · [x] corrections six-question table (§18) · [x] historical authority matrix (§19) · [x] payment snapshot two-path semantics (§20) · [x] rate-change timeline (§21) · [x] archive semantics frozen-vs-live (§11) · [x] carry semantics incl. compounding + artifacts (§9) · [x] idempotency classes (§11/§18/§22) · [x] dependency graph (§4) · [x] parity invariant (§13) · [x] edge matrix with honest verification labels (§23 + companion) · [x] decisions D-03/D-08/D-09 (+D-02/04/06/12) preserved OPEN (§25) · [x] unverified items carried (§26) · [x] implementation contract (§27) · [x] evidence traceability throughout · [x] observed-vs-recommended separation · [x] no invented formulas — every equation cites code lines/runtime proofs · [x] no business rule changed.

Gate condition: SATISFIED — all nine calculations have ambiguity-free mathematical contracts.

