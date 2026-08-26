# Phase 5 — Inventory / Resource Integrity Report (Independent Reconciliation)

Applicability: APPLICABLE — the application manages material assignments (Pagdi, Warp) and production quantities (SareeCount). Phase 4.5 fixes were independently re-tested, not assumed.

## 1. Invariants Independently Re-Verified (this session's fresh runtime + unit runs)

| Invariant | Mechanism | Independent evidence |
| --------- | --------- | -------------------- |
| ≤1 ACTIVE pagdi per employee | single transaction: `select_for_update` on employee + open pagdis → auto-finish old → create new (+CREATE/FINISH audits) | unit double-assign test PASS; **5-way parallel race** on live server ended with DB truth `active pagdis/emp = {3: 1}`, zero partial rows, audit chain CREATE→FINISH→CREATE consistent |
| ≤1 ACTIVE warp per employee | same pattern via `finish_warp` + `WarpChangeHistory` (new model/migration) | unit ×4 PASS; live double-assign → exactly 1 Active badge; invariant sweep `max_one_active_warp` PASS |
| Explicit completion path for warp | POST-only `/panel/warp/<id>/finish/`; GET→400; repeat-finish friendly no-op | runtime + prior W2.06/07 |
| Capacity math singularity | one implementation in model methods (`made_sarees` bounded by end_date/today; `remaining_sarees` clamped ≥0); views consume it | unit future-dated-exclusion + clamp tests PASS; Phase-4 divergence scenario (40 vs 31) structurally eliminated |
| Production integrity | UNIQUE(employee,date) + count≥0 | duplicate-day friendly rejection incl. 3-way parallel posts with no 500s; negative rejected |
| Historical quantities | archived weekly rows immutable post-week except same-week refresh by archive (quantities), payment flags independent | post-archive DB truth checks (paid flag preserved while sarees/final refreshed to full week; out-of-week entries excluded both sides) |

## 2. Residual Notes

| Note | Class |
| ---- | ----- |
| SQLite lock-timeout 500s possible under artificial same-row parallel writes — atomic failures, no corruption; PostgreSQL target reduces window | P3 ACCEPTABLE RISK |
| Pagdi has no explicit admin "finish" button (completion is implicit via reassignment; employee self-finish POST branch exists but has no form) | P4 OBSERVATION — matches original design; warp now has the explicit path |
| Employee self-service pagdi finish still BACKEND_ONLY (Phase 2 finding, never fixed — feature gap, not regression) | P4 |

## Verdict

INVENTORY/RESOURCE INTEGRITY: VERIFIED. The race-prone check-then-act defect (BUG-11) and incomplete warp lifecycle (BUG-10) are genuinely fixed at the transactional level, not merely masked.
