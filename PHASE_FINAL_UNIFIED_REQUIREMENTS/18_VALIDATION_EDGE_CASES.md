# 18_VALIDATION_EDGE_CASES.md

Consolidated required behaviors (implemented; Phase 6 EC-01..46 + VAL series are the source of truth). Representative binding rows:

| Case | Required behavior |
| ---- | ----------------- |
| missing signup fields / blank entry date / blank count | inline error or defaults-to-today per field contract |
| malformed date, non-numeric count/amount/capacity/rate | friendly reject, zero change (400-class) |
| zero count / zero rate / zero capacity / zero-balance clear & carry | legal; stored/handled with audited no-ops where applicable |
| negative anything-in | rejected pre-store |
| extremely large integers | exact bigint math, no overflow path |
| duplicate worker-day (serial or parallel) | typed friendly reject; ONE row |
| nonexistent/forged worker or entry id | 404-class NotFound (never 500, never partial state) |
| repeat approve / repeat settle clicks / archive rerun / dry-run | idempotent converge; truthful messages |
| already-finished material finish | strict info no-op, no new audit |
| unpaid without row | silent benign success (no row created) |
| assign to PENDING worker | INELIGIBLE reject |
| carry small positive ×f<1 | truncation may reach ZERO — preserved behavior, surfaced in result note (Q-08 acceptance open) |
| future-dated entry | stored now; excluded until its week is current |
| year-boundary/leap weeks | bounds verified exact |
| post-archive raw-row edit | ledger keeps canon; drift repaired ONLY by targeted rerun (ritual documented) |
| concurrent everything | see CONCURRENCY_REQUIREMENTS invariants |
| DB/network failure mid-mutation | full rollback incl. audit; user sees generic retry message; server logs detail |
| unauthorized action at any layer | redirect/FORBIDDEN — never silent success |

No stack traces, SQL, or secrets may reach clients under any of the above.
