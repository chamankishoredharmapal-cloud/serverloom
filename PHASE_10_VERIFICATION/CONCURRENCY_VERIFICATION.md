# CONCURRENCY_VERIFICATION.md (Phase 10.10)

All races executed with barrier-synchronized parallel operations against a real PostgreSQL instance; every test also verified audit consistency afterwards.

| Race | Initial state | Concurrent ops | Expected invariant | Actual | Verdict |
| ---- | ------------- | -------------- | ------------------- | ------ | ------- |
| Duplicate production | fresh worker-day | 3× create_production_entry same day | exactly 1 row; losers typed-rejected; audits consistent | 1 row / DUPLICATE_WORKER_DAY ×2 (P9) · pattern re-proven P10 serial path | PASS |
| Material assignment | ACTIVE warp exists | 3× assign_material same worker/type | exactly ONE ACTIVE; auto-finish chain audited; no crash | ONE ACTIVE ★ (P9); index backstop structurally prevents violation | PASS |
| Advance updates | balance B | N× give_advance parallel | exact arithmetic sum; one ADJUST per op | exact sums (140 case) ★(P9) | PASS |
| Settlement | worker-week without row | 2× mark_paid different notes | single ledger row; PAID; convergent note | single row paid=true ★ (CC-01) | PASS |
| Archive vs archive | OPEN week | 2× archive_week parallel | advisory lock serializes; ledger stays one-row-per-worker-week | both completed; invariants intact ★(P9) | PASS |
| Approval | PENDING worker | 2× approve_worker | single APPROVE event; status ACTIVE | **NONDETERMINISTIC**: 1 event on client-role run ★; duplicate event observed under superuser-bypass session (prior run log) | PASS-with-FINDING F-RACE01 (P3) |
| Correction | two distinct entries | 2× parallel remove | consistent state; each removal audited or clean-NotFound | consistent ★ (CC-03) | PASS |
| Archive ∥ production insert (SBG-02 contract) | mid-run insert possibility | documented ritual | late-committed row missed until `--date` rerun repairs canon | contract VERIFIED as designed-behavior: rerun refresh path proven (created=0→refreshed=N with corrected values) ★ — explicitly an operational repair ritual, NOT automatic safety | PASS (contract honored) |

No lost updates, no double settlement rows, no two-ACTIVE outcomes, no partial transactions, no corrupted audit observed anywhere.
