# CALCULATION_TEST_MATRIX.md (Phase 6.4 companion)

Expected values are COMPUTED from the contracts in `04_CALCULATION_SPECIFICATION.md` - none are fabricated. Verification labels: **RUNTIME-STAR** = directly executed/proven in Phase 4/4.5 sessions or this session (py-verify); **CODE** = exact code path read and traced this session; **SPEC** = expected value derived strictly from the documented formula; scenario not separately executed; **INFERRED** = argued from shared mechanism (flagged).

Notation: Q quantity, R rate, A advance term, G gross, P final, C capacity, M made, Rem remaining, B balance, f factor, N carried result.

## CALC-001 Week bounds

| ID | Scenario | Inputs | Expected | Verified |
| -- | -------- | ------ | -------- | -------- |
| W-01 | Monday identity | d=2026-08-24 | m=2026-08-24 s=2026-08-30 | RUNTIME-STAR py-verify |
| W-02 | Tuesday midweek | d=2026-08-25 | m=2026-08-24 s=2026-08-30 | RUNTIME-STAR py-verify |
| W-03 | Sunday end | d=2026-08-30 | m=2026-08-24 s=2026-08-30 | RUNTIME-STAR py-verify |
| W-04 | Year boundary | d=2025-12-31 | [2025-12-29 .. 2026-01-04] | RUNTIME-STAR py-verify |
| W-05 | Jan-1 same week | d=2026-01-01 | [2025-12-29 .. 2026-01-04] | RUNTIME-STAR py-verify |
| W-06 | Leap year + month boundary | d=2024-02-29 | [2024-02-26 .. 2024-03-03] | RUNTIME-STAR py-verify |
| W-07 | Explicit archive date | --date 2025-12-31 | W-04 window used for freeze | CODE (strict strptime path) |
| W-08 | Invalid date format | --date 31-12-2025 | command aborts pre-write rc nonzero | CODE (strptime raises) |

## CALC-002 Weekly payable

| ID | Scenario | Inputs | Expected | Verified |
| -- | -------- | ------ | -------- | -------- |
| S-01 | Positive final | Q=15 R=25 A=0 | G=375 P=375 | RUNTIME-STAR Alpha archived 15/375 |
| S-02 | Negative final debt | Q=0 R=25 A=140 | G=0 P=-140 | RUNTIME-STAR Gamma preserved compute+archive |
| S-03 | Advance exceeds gross, paid | small Q, A large | P<0 stored WITH paid=True | RUNTIME-STAR Beta paid=True final=-40 archived |
| S-04 | Zero final exactly | Q=4 R=25 A=100 | G=100 P=0 | SPEC |
| S-05 | Zero quantity week | Q=0 R=25 A=0 | P=0; zero row still created by archive | RUNTIME-STAR zero-worker rows created |
| S-06 | Zero rate | Q=10 R=0 A=0 | G=0 P=0 | SPEC (rate default 0 CONFIRMED) |
| S-07 | Zero rate plus balance | Q=10 R=0 A=60 | G=0 P=-60 | SPEC |
| S-08 | Zero advance | Q=15 R=25 A=0 | P=G | RUNTIME-STAR (S-01 is the A=0 path) |
| S-09 | Empty week no rows | empty queryset | SQL SUM NULL mapped to 0; Q=0 | CODE (`or 0` pattern) |
| S-10 | Future-dated exclusion | entry next Monday vs current week | excluded from Q until its week is current | RUNTIME-STAR rollover probes both directions |
| S-11 | Rate change live re-price | R1 to R2 midweek | all live surfaces show Q*R2 instantly | CODE (R read per evaluation) |
| S-12 | Mid-week payment then work | click at t1 then more entries | snapshot keeps click-time Q; live grows | RUNTIME-STAR pay-work-archive test |

## CALC-003 / CALC-004 Material progress

| ID | Scenario | Inputs | Expected | Verified |
| -- | -------- | ------ | -------- | -------- |
| M-01 | Open assignment today bound | sigma=Mon, entries Mon-Fri, future-dated next-Tue exists | M excludes beyond-today entries incl. future | RUNTIME-STAR CapacityFormulaTests |
| M-02 | Finished-bound freeze | epsilon Wednesday; entries Thursday+ | Thursday+ excluded forever | CODE + model tests |
| M-03 | Exact fit | C=90 qualifying sum=90 | Rem=0 | SPEC |
| M-04 | Overshoot clamp | C=90 sum=130 | Rem=0 displayed; M stays 130 | SPEC expected (clamp RUNTIME-STAR) |
| M-05 | Zero capacity | C=0 any M | Rem=0 immediately | SPEC |
| M-06 | Fresh assignment | C=40 no production | M=0 Rem=40 | CODE (empty-set to 0) |
| M-07 | Deletion effect | delete one qualifying row q=10 | M drops by 10 at next read | CODE (live aggregate) |
| M-08 | Zero-count row | q_i=0 inside window | contributes 0; row exists | CODE (validation rejects only negatives) |
| M-09 | Shared stream overlap | worker has pagdi AND warp windows overlapping | both assignments sum the SAME production rows over their own windows | CODE (no material linkage in filter) |

## CALC-005 Carry-forward

| ID | Scenario | Inputs | Expected | Verified |
| -- | -------- | ------ | -------- | -------- |
| C-01 | Full carry | B=100 f=1.0 | N=100 unchanged; CARRY audit 100-to-100 written; no DB write to balance | RUNTIME-STAR K01 |
| C-02 | Fractional halving | B=100 f=0.5 | N=50 | RUNTIME-STAR |
| C-03 | Compounding repeat | repeat f=0.5 | 100 to 50 to 25 (RUNTIME-STAR chain); next would be int(12.5)=12 | RUNTIME-STAR chain start + SPEC for 12 |
| C-04 | Wipe factor | B=100 f=0 | N=0 audit written | SPEC (identical fractional path) |
| C-05 | Upscale allowed | B=10 f=2 | N=20 | SPEC |
| C-06 | Negative factor | f=-1 | run aborts rc nonzero, zero writes, no audits | RUNTIME-STAR K-series |
| C-07 | Zero balance worker | B=0 any valid f | NO-OP CARRY audit row; balance untouched; processed++ | RUNTIME-STAR audits-all proof |
| C-08 | Truncation of .5 fractions | B=25 f=0.5 / B=35 f=0.1 / B=145 f=0.1 | N=12 / N=3 / N=14 | RUNTIME-STAR py-verify semantics |
| C-09 | Float downward steal artifact | B=100 f=0.29 | product 28.999999999999996 so N=28 (exact decimal would be 29) | RUNTIME-STAR py-verify this session |
| C-10 | Float upward artifact harmless | B=435 f=0.01 | product 4.3500000000000005 so N=4 (= exact floor) | RUNTIME-STAR py-verify |
| C-11 | Dry-run | --dry-run any f | predicts affected count inside rolled-back tx; zero committed writes | RUNTIME-STAR sentinel machinery |

## CALC-006 Advance term

| ID | Scenario | Inputs | Expected | Verified |
| -- | -------- | ------ | -------- | -------- |
| A-01 | Multi-week persistence | B=140 across two weeks | week1 P=G1-140 AND week2 P=G2-140; B unchanged by archive | CODE + RUNTIME-STAR advance-preservation checks |
| A-02 | Clear mid-stream | clear then compute | subsequent P=G exactly; old snapshots keep captured A-copy | CODE (update_fields excludes payment+snapshot groups) |
| A-03 | Give mid-week | give +50 after snapshot row exists | live A rises instantly; snapshot keeps old copy until archive | CODE |

## CALC-007 Archive

| ID | Scenario | Inputs | Expected | Verified |
| -- | -------- | ------ | -------- | -------- |
| H-01 | Create-all | empty ledger, N workers | created=N rows incl. zeros/negatives | RUNTIME-STAR CLI runs |
| H-02 | Refresh preserving paid | existing paid row + more work | five quantity fields refreshed to full truth; paid flags/date/notes untouched | RUNTIME-STAR pay-work-archive test |
| H-03 | Rerun idempotent | same window twice | second run created=0 refreshed=N identical values | RUNTIME-STAR triple-run + unit test |
| H-04 | Negatives stored verbatim | Gamma-type week | final_salary=-140 stored and re-exported | RUNTIME-STAR |
| H-05 | Zero-production worker | idle worker in population | full row created with Q=0 G=0 P=-B | RUNTIME-STAR created==workforce count |
| H-06 | Note seeding | --note X with mixed create/refresh | created rows get X; refreshed rows keep prior notes | CODE (create defaults vs update_fields) |
| H-07 | Whole-run rollback | failure mid-run | entire transaction rolled back; zero partial state | RUNTIME-STAR dry-run sentinel proves rollback path |
| H-08 | Post-archive raw delete drift | delete raw entry of archived week | ledger row UNCHANGED; history diverges from ledger | CODE (no cross-write) - flagged D-02 |

## Payment snapshot paths

| ID | Scenario | Inputs | Expected | Verified |
| -- | -------- | ------ | -------- | -------- |
| PS-01 | Create path | first mark-paid click | row stores click-time Q,R,G,A,P plus paid=True date=today note-or-Paid | RUNTIME-STAR unit tests |
| PS-02 | Existing-row path | row already present | ONLY paid_status/paid_date/(note if given) change; quantities untouched | RUNTIME-STAR WeeklySnapshotSemanticsTests |
| PS-03 | Reversal | mark-unpaid on paid row | flags cleared only; quantities remain | RUNTIME-STAR M3 cycle |
| PS-04 | Unpaid with no row | no ledger row this week | success flash; zero changes anywhere | CODE + M3-cycle observation |
| PS-05 | Repeat convergence | double mark-paid | still exactly one row (unique constraint backstop) | RUNTIME-STAR |

## Rate-change matrix R1 to R2

| ID | Surface/value | Uses R2 when? | Evidence label |
| -- | ------------- | ------------- | -------------- |
| RC-01 | Live dashboard/grid/detail/slip open week | immediately at next read | CODE |
| RC-02 | Existing current-week snapshot row | NOT until archive refreshes it (archive evaluates archive-instant rate) | CODE |
| RC-03 | Archived previous weeks | never | CODE |
| RC-04 | Display/export earnings CALC-008 | immediately, ALL history repriced | RUNTIME-STAR cell-exact export checks |
| RC-05 | Payment create-path after change | stores R2 | CODE |

## Partial periods

| ID | Scenario | Expected | Verified |
| -- | -------- | -------- | -------- |
| PP-01 | Worker joins mid-week | NO proration: full-week window applies; joining_date never enters any formula | CODE (joining_date only displayed in admin listing) |
| PP-02 | Material starts/finishes mid-week | window bounds handle it; no payroll effect | CODE + model tests |
| PP-03 | Incomplete current week | live values grow until archive; grid equals dashboard equals detail | RUNTIME-STAR parity checks |

## Coverage summary

48 scenarios: RUNTIME-STAR 24 - CODE 17 - SPEC 7 - INFERRED 0. Every expected value derives from the section contracts; nothing fabricated. Rows labeled SPEC are mandatory implementation-test obligations (Phase 6.4 contract §27).

