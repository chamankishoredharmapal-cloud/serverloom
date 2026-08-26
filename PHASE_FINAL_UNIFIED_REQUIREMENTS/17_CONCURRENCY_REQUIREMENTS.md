# 17_CONCURRENCY_REQUIREMENTS.md

Required invariant + mechanism per operation (all implemented and runtime-proven; Phase 10 re-verified):

| Operation | Invariant | Mechanism | Race test |
| --------- | --------- | --------- | --------- |
| Production create | ≤1 row per worker-day | UNIQUE(worker,day)+savepoint catch | 3-way parallel → 1 row ★ |
| Material assign | exactly ONE ACTIVE per worker/type | lock actives FOR UPDATE → auto-finish → insert, partial UNIQUE backstop | 3-way → ONE ★ |
| Explicit finish | terminal; no double event | in-lock active re-check → strict no-op | double-finish probe: 1 event ★(P10 shim run) |
| Give/clear/carry advance | serialized exact arithmetic; audit ALWAYS | SELECT FOR UPDATE + exact rational math | parallel gives exact-sum ★ |
| Settlement | one ledger row per worker-week; payment-only updates | UPSERT arbiter on unique key | parallel mark_paid → 1 row PAID ★ |
| Archive | single run per window; idempotent canon; payment preserved | advisory xact lock 'archive:week' + disjoint-column upsert | parallel archives serialize ★ |
| Approval | status transition once; single APPROVE event | conditional-update guard (**F-RACE01 fix REQUIRED** — currently flaky duplicate event under interleaving) | P10: both outcomes observed → finding stands |
| Corrections | audited removals, consistent state | per-entry tx + before-image | parallel removals clean ★ |

Idempotency classes: approve/settle-repeats/archive-rerun/dry-run/warp-refinish = safe; give=additive-by-design; carry f≠1 compounds (D-04 guard if automated). Deadlock policy: single-row locks ordered by worker id; batch ops take one advisory key. Isolation: READ COMMITTED sufficient given mechanisms above.
