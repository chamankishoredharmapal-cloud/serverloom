# STATE_MACHINE_TEST_MATRIX.md (Phase 6.5)

Scenario matrix: valid transitions · invalid transitions · boundaries · reversals · concurrency · authorization · database integrity. Columns: ID | Entity | Initial state | Action | Actor | Expected state | Observed state | Evidence | Verification.

Verification values: RUNTIME-VERIFIED (prior live probes), TEST-CONFIRMED (this session's 30/30 suite run on fresh venv), CODE-CONFIRMED, DATABASE-CONFIRMED, NOT VERIFIED.

## A. Valid transitions

| ID | Entity | Initial | Action | Actor | Expected | Observed | Evidence | Verification |
| -- | ------ | ------- | ------ | ----- | -------- | -------- | -------- | ------------ |
| VT-01 | SM-01 | PENDING | POST approve w/ CSRF | Staff | APPROVED | APPROVED + flash | TS ApprovalSecurityTests | TEST-CONFIRMED |
| VT-02 | SM-01 | PENDING | repeat approve | Staff | stays APPROVED (idempotent) | same | TS ×1 | TEST-CONFIRMED |
| VT-03 | SM-02 | ANON | login approved worker | Visitor | AUTH-EMPLOYEE → dashboard | redirect dashboard | P4 §6 matrix | RUNTIME-VERIFIED |
| VT-04 | SM-02 | ANON | login staff | Visitor | AUTH-STAFF → panel | panel 200 | P4 §6 | RUNTIME-VERIFIED |
| VT-05 | SM-03 | ABSENT | create entry (valid) | Staff | EXISTS; aggregates shift | row + parity | TS DuplicateSaree family + R45 W1.x | TEST+RUNTIME |
| VT-06 | SM-06 | no ACTIVE | assign pagdi (valid) | Staff | ACTIVE + CREATE audit | 1 ACTIVE + audit chain | TS PagdiLifecycleTests | TEST-CONFIRMED |
| VT-07 | SM-06 | ACTIVE | assign again | Staff | old FINISHED + new ACTIVE | single ACTIVE, CREATE→FINISH→CREATE audits | TS ★ + prior race | TEST+RUNTIME |
| VT-08 | SM-07 | ACTIVE | POST explicit finish | Staff | FINISHED + FINISH audit | end_date=today | TS WarpLifecycleTests | TEST-CONFIRMED |
| VT-09 | SM-07 | no ACTIVE | assign warp | Staff | ACTIVE, start=today | start forced today | TS | TEST-CONFIRMED |
| VT-10 | SM-08 | OPEN | archive CLI | Operator | ARCHIVED; rows ∀ workers | created=N exact | CLI runs + TS | RUNTIME+TEST |
| VT-11 | SM-09 | ZERO | give 70 | Staff | POSITIVE(70) + ADJUST | balance+audit | TS advance tests | TEST-CONFIRMED |
| VT-12 | SM-09 | POSITIVE | clear | Staff | ZERO + CLEAR | zero+audit | TA clear test | TEST-CONFIRMED |
| VT-13 | SM-05 | UNPAID | mark paid (row exists) | Staff | PAID flags-only | flags changed; quantities intact | TS WeeklySnapshotSemantics | TEST-CONFIRMED |
| VT-14 | SM-05 | PAID | mark unpaid | Staff | UNPAID flags-only | reversed | TS/M3 | TEST+RUNTIME |

## B. Invalid transitions

| ID | Entity | Initial | Action | Actor | Expected | Observed | Evidence | Verification |
| -- | ------ | ------- | ------ | ----- | -------- | -------- | -------- | ------------ |
| IT-01 | SM-01 | any | GET approve URL | Staff | blocked | HTTP 400 "POST only" | TS | TEST-CONFIRMED |
| IT-02 | SM-01 | PENDING | tokenless POST | Staff | blocked | 403 CSRF | TS | TEST-CONFIRMED |
| IT-03 | SM-01 | any | anonymous approval | Anon | denied | redirect-to-login | TS | TEST-CONFIRMED |
| IT-04 | SM-02 | ANON | login unapproved creds | Visitor | refusal, NO session | "Account not approved yet." no session | P4 §6 | RUNTIME-VERIFIED |
| IT-05 | SM-02 | — | wrong password | Visitor | generic error | single generic message | V:72-73 | CODE+P4 |
| IT-06 | SM-03 | EXISTS(same day) | duplicate insert serial | Staff | reject friendly, single row | flash "already exists"; 1 row | TS ×2 | TEST-CONFIRMED |
| IT-07 | SM-03 | EXISTS | duplicate insert 3-way parallel | Staff×3 | one row, no 500s | [200,200,200], 1 row | S1.03 | RUNTIME-VERIFIED |
| IT-08 | SM-03 | EXISTS | negative count / bad date / non-numeric | Staff | friendly reject, zero change | flashes; DB unchanged | TS | TEST-CONFIRMED |
| IT-09 | SM-03 | DELETED | delete again | Staff | explicit failure | "Entry not found." | TS | TEST-CONFIRMED |
| IT-10 | SM-05 | ABSENT row | mark unpaid | Staff | benign no-op | success flash, zero mutation | V:717-723 + M3 | CODE+RUNTIME |
| IT-11 | SM-07 | FINISHED | re-finish POST | Staff | info no-op | "already finished"; service skipped | TS | TEST-CONFIRMED |
| IT-12 | SM-07 | any | GET finish route | Staff | blocked | 400 | TS | TEST-CONFIRMED |
| IT-13 | SM-09 | any | give amount ≤0 | Staff | friendly reject | ValueError caught → flash | TS AdvanceInputSafety | TEST-CONFIRMED |
| IT-14 | SM-09 | any | give unparseable | Staff | clean 400 | HTTP 400 "Invalid amount" | V:641-644 | CODE |
| IT-15 | SM-08 | — | carry f<0 | Operator | abort pre-write | rc≠0, no writes | K-series | RUNTIME-VERIFIED |

## C. Boundaries

| ID | Entity | Scenario | Expected | Observed | Verification |
| -- | ------ | -------- | -------- | -------- | ------------ |
| BC-01 | SM-03 | count=0 accepted | stored zero row | validation `<0` only | CODE (+batch consistency) |
| BC-02 | SM-03 | capacity=0 accepted | instant-complete assignment | permitted by checks | CODE |
| BC-03 | SM-04 | week with zero production worker | archive CREATES zeros row | created==workforce | RUNTIME-VERIFIED |
| BC-04 | SM-05 | negative final paid week | paid=True coexists with P<0 | Beta −40 paid archived | RUNTIME-VERIFIED |
| BC-05 | SM-08 | year-boundary --date archive | correct cross-year window | bounds math verified | py-verify this session |
| BC-06 | SM-09 | carry truncation edge B=1,f=0.5 | balance reaches ZERO via truncation | T(0.5)=0 | CODE + py-verify arithmetic |
| BC-07 | SM-06/07 | finish sets ε=today; later entries excluded from M | progress frozen | bound=ε logic + model tests | TEST-CONFIRMED |

## D. Reversal cases

| ID | Entity | Cycle | Restored | NOT restored | Audit | Verification |
| -- | ------ | ----- | -------- | ------------ | ----- | ------------ |
| RV-01 | SM-05 | PAID→UNPAID→PAID cycle | flags/date each flip | nothing else ever touched | none either way (gap) | TEST-CONFIRMED M3+TS |
| RV-02 | SM-09 | clear then re-give | balance value | event history preserved (append-only) | ADJUST+CLEAR chains | TEST-CONFIRMED |
| RV-03 | SM-03 | delete then recreate | equivalent row | new row id; unaudited gap | none | CODE |
| RV-04 | SM-06/07 | reopen FINISHED | IMPOSSIBLE in-app | — | super-admin unaudited only | CODE (no writer) |

## E. Concurrency cases

| ID | Race | Protection | Result | Verification |
| -- | ---- | ---------- | ------ | ------------ |
| CC-A | 5-way pagdi assign | tx+locks+auto-finish | exactly 1 ACTIVE, atomic rollbacks | RUNTIME-VERIFIED ★ |
| CC-B | parallel gives | select_for_update | sum exact 140, both audited | RUNTIME-VERIFIED ★ |
| CC-C | 3-way duplicate-day posts | unique+savepoint | single row, no 500 | RUNTIME-VERIFIED ★ |
| CC-D | parallel mark-paid pair | get_or_create+unique | convergence reasoned | DATABASE-CONFIRMED design; runtime pair NOT VERIFIED |
| CC-E | parallel approves | idempotent boolean | benign argument | NOT VERIFIED (benign) |
| CC-F | finish ∥ finish warp | view-guard outside lock | SBG-01 identified | CODE-CONFIRMED risk; race NOT VERIFIED |
| CC-G | archive ∥ payment flip | workforce lock vs single-row write; unique guard | both orders converge per authority model | CODE/DATABASE reasoning; pair NOT VERIFIED |
| CC-H | insert during archive scan | none on stream | SBG-02 window | CODE-CONFIRMED risk; NOT VERIFIED |
| CC-I | carry ∥ give | both lock employee rows | serialize by design | CODE-CONFIRMED; pair NOT VERIFIED |

### E2. Final-session barrier-synced pair probes (file-based SQLite via DATABASE_URL env; fixtures deleted after run)

| ID | Race | Method | Result | Verification |
| -- | ---- | ------ | ------ | ------------ |
| CC-J | mark-paid ×2 same worker, synced barrier | 2 threads, shared session cookie, file-SQLite | PASS — [302,302]; exactly **1** SalaryHistory row; paid=True, paid_date set | RUNTIME-VERIFIED (SQLite env caveat: PG unexercised) |
| CC-K | approve ×2 same pending employee | as above | PASS — [302,302]; is_approved=True; benign convergence confirmed (was argument-only) | RUNTIME-VERIFIED (same caveat) |
| CC-L | warp finish ×2 same ACTIVE warp | as above | RACE NOT REPRODUCED — exactly **1** FINISH audit row; second request's pre-check saw FINISHED after first commit. Structural SBG-01 window remains CODE-CONFIRMED for PostgreSQL | TEST-RUN OBSERVED / risk CODE-CONFIRMED |

Probe-environment note: first attempt ran on in-memory shared-cache SQLite and failed with `sqlite3.OperationalError: database table is locked: django_session` during per-thread login — an environment artifact of the test harness, not the application. Fixture rewritten once (login in main thread, shared cookie, file DB); recorded here honestly; no blind retries.

No test hung; no TIMEOUT occurred in any phase of this investigation.

## F. Authorization cases (spot matrix)

| ID | Surface | Actor | Expected | Observed | Verification |
| -- | ------- | ----- | -------- | -------- | ------------ |
| AZ-01 | any /panel/* page | Employee | bounce to login | redirect | RUNTIME-VERIFIED |
| AZ-02 | exports/slips | Employee | DENY | redirected | RUNTIME-VERIFIED |
| AZ-03 | staff detail, forged id | Staff | clean 404 | 404 | RUNTIME-VERIFIED |
| AZ-04 | rate form submit | Employee | DENY | blocked (RateSettingTests) | TEST-CONFIRMED |
| AZ-05 | commands via HTTP | any | impossible (no route) | no route exists | CODE |

## G. Database integrity cases

| ID | Check | Result | Verification |
| -- | ------ | ------ | ------------ |
| DB-01 | unique(employee,date) under abuse | held every probe incl. races | RUNTIME-VERIFIED |
| DB-02 | unique(employee,week_start,week_end) | get_or_create/rerun converge single row | DATABASE-CONFIRMED+tests |
| DB-03 | CHECK positivity q/rate/balance/capacity | historical 500-class crash proved constraint; now view-guarded | RUNTIME-VERIFIED history + CODE |
| DB-04 | audit FK SET_NULL + name snapshot survival after user.delete | rows survive, snapshots populated | TEST-CONFIRMED (AuditSurvivalTests) |
| DB-05 | rollback cleanliness under forced contention | zero partial state | RUNTIME-VERIFIED |
