# VALIDATION_RULES.md (Phase 6.8)

Complete defensive-behavior contract. Consolidates VAL63-001..013 with full input/expected/actual/evidence detail. Labels: ★ runtime/test-verified; ◆ code-confirmed.

## 1. Input validation rules

| ID | Input | Missing/blank | Malformed/wrong type | Out-of-range | Valid behavior | Evidence |
| -- | ----- | ------------- | -------------------- | ------------ | -------------- | -------- |
| VAL-001 | signup name/phone/password | inline error "All fields are required."; zero state change | n/a | phone >15 chars → DB error path (unvalidated format — VAL-012) | creates PENDING pair | V:43-44 ★ |
| VAL-002 | phone uniqueness | — | — | duplicate → "Phone already registered." | account created | V:46-47 ★ |
| VAL-003 | entry date | blank → today | non-ISO → "Invalid date format. Use YYYY-MM-DD." zero change | any past/future ACCEPTED | stored | V:369-375,768-776 ★ |
| VAL-004 | production count | int() fail → "Invalid count/saree entry." | same | negative → "Count cannot be negative."; ZERO ALLOWED (BR63 BR-027) | stored | V:377-385 ★ TS |
| VAL-005 | rate | int() fail → "Invalid salary value.", unchanged | same | negative rejected; NO upper bound | saved instantly | V:348-355 ★ TS |
| VAL-006 | advance amount | unparseable → HTTP 400 "Invalid amount" | same | ≤0 → friendly flash, no change | additive save + audit | V:641-653 ★ TS |
| VAL-007 | material capacity | pagdi: int fail → "Invalid capacity value." / warp defaults `or 0` then guards | same | negative → "Capacity cannot be negative." | assignment created | V:457-465,538-546 ★ TS |
| VAL-008 | pagdi start_date | blank REQUIRED-error "Start date is required." | malformed ISO → friendly reject | any date accepted (past/future) | window σ set | V:469-478 ★ |
| VAL-009 | worker reference pickers/forms | missing id → "Please choose a valid employee." | non-digit → same | nonexistent → DoesNotExist caught → same message / 404 on detail routes | assignment/entry created | V:480-482,504-506 ★ |
| VAL-010 | carry factor | argparse float parse failure → rc≠0 (INFERRED stdlib) | same | f<0 → ValueError abort rc≠0 pre-write ★ | scaled run | CC; S:270 ★ |
| VAL-011 | archive --date | absent → today | wrong format → strptime raises, abort pre-write | any date accepted | targeted freeze | CR:19-21 ◆ |
| VAL-012 | phone format | unconstrained beyond ≤15 chars | accepted as-is | — | username=phone | OBSERVED GAP → D-10 |
| VAL-013 | password strength | no validators configured | weak passwords accepted | — | stored hashed | OBSERVED GAP → D-10 |

## 2. Duplicate scenarios

| Scenario | Behavior | Class |
| -------- | -------- | ----- |
| same worker+day entry | REJECT friendly ("already exists") + constraint backstop; parallel-safe ★ | REJECT |
| same worker+week ledger row | IDEMPOTENT convergence (get_or_create / archive refresh); unique constraint ★ | IDEMPOTENT |
| repeat approval | IDEMPOTENT success ★ | IDEMPOTENT |
| duplicate material assignment | CONVERGES to one ACTIVE (auto-finish old) ★ | UPDATE-converge |
| duplicate payment click | IDEMPOTENT flags converge ★ | IDEMPOTENT |
| duplicate archive run | IDEMPOTENT created=0 ★ | IDEMPOTENT |
| duplicate advance give | INTENTIONALLY ACCUMULATES (money additivity) ★ | DUPLICATE-BY-DESIGN |
| duplicate AlertEmail address | unique field reject | REJECT |

## 3. Zero/negative behavior (summary — full matrices in C64 §15/§16)

Zero count/rate/capacity/balance/factor-1.0-carry: ALL legal and handled. Negative inputs: universally rejected at validation/storage. Negative OUTPUT final payable: deliberately permitted end-to-end (pinned BR63 BR-013) — never clamp. Carry truncation can produce ZERO from small positives (C64 TR-ADV-006 note).

## 4. Nonexistent/forged IDs

Detail/finish routes: get_object_or_404 → clean 404 ★. Form-submitted ids: digit-guard + DoesNotExist catch → friendly flash ★. Delete of missing entry id: explicit "Entry not found." failure ★. No case mutates partial state.
**EXCEPTION (runtime-proven KT-06, OBS-SM-01):** give/clear advance pass raw ids into services (`select_for_update().get()`) → uncaught `Employee.DoesNotExist` → HTTP 500 with zero mutation and server ISE log. Failure-mode inconsistency only; Management-V1 must return uniform 404.

## 5. Repeated actions classification

IDEMPOTENT: approve · clear(→0 incl. audited no-op) · mark-paid/unpaid repeats · archive rerun · carry f=1.0 (value-wise) · warp re-finish (info no-op) · logout/login.
ERROR-PRODUCING BY DESIGN: duplicate-day insert · delete-deleted entry.
NON-IDEMPOTENT (intentional): give advance (accumulates) · carry f≠1 (COMPOUNDS — hazard D-04).
Retry-after-failure: transactional ops leave zero partial state; safe to retry (archive/carry whole-run rollback ★; request-scoped atomicity elsewhere).

## 6. Reversals

Single reversible cycle: PAID⇄UNPAID flags-only (current week). All other mutations compensated only by NEW forward events (clear after give; corrective carry; assign-over; delete+recreate). Cross-ref SM §18.

## 7. Deletion inventory

Hard-delete capable: production entries (staff, unaudited) · workers via user cascade (OUT-OF-APP; destroys SareeCount+materials+LEDGER, preserves audit events via SET_NULL+snapshots) · Pagdi/WarpHistory rows (super-admin). No soft-delete anywhere. Restore capability: NONE.

## 8. Archive behavior (cross-ref C64 §11 / SM §10)

Trigger: operator CLI only. Authority: sole writer of weekly quantity canon. Source: live stream at lock time. Snapshot: five quantity fields ∀ workers. Rerun: created=0 identical refresh. Correction: fix raw rows → rerun --date recomputes; post-archive raw edits otherwise cause DRIFT (D-02 open). Concurrent mutation: payment flips preserved by design; production-insert window gap SBG-02 documented.

## 9. Concurrency classification (no new tests run — prior evidence reused)

RUNTIME VERIFIED: parallel assigns (single-ACTIVE) · parallel gives (exact 140) · parallel duplicate-day posts (one row) · forced-contention rollbacks (zero corruption) · parallel mark-paid ×2 (exactly one row PAID — barrier-synced probe CC-J) · parallel approves ×2 (benign convergence — CC-K).
CODE/DATABASE CONFIRMED: lock coverage (give/clear/carry/archive), get_or_create+unique convergence.
NOT VERIFIED pairs: finish∥finish execution on PostgreSQL (SBG-01 structural risk; SQLite barrier probe NOT REPRODUCED — 1 FINISH audit row, CC-L) · archive∥payment runtime pair · archive∥insert (SBG-02) · carry∥give pair.
