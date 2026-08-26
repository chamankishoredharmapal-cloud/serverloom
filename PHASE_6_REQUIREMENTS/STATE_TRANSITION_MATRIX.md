# STATE_TRANSITION_MATRIX.md (Phase 6.5)

Consolidated transition matrix across the entire application. Columns: ID | Machine | From | Action | To | Actor | Preconditions | Reversible | Concurrency | Evidence. Verification markers: ★ = runtime/test-verified; ◆ = code-confirmed.

| ID | Machine | From | Action | To | Actor | Preconditions | Reversible? | Concurrency | Evidence |
| -- | ------- | ---- | ------ | -- | ----- | ------------- | ----------- | ----------- | -------- |
| TR-EMP-001 | SM-01 | PENDING | POST approve (dedicated endpoint) | APPROVED | Staff | valid id; CSRF | No | idempotent; parallel pair RUNTIME-VERIFIED benign ★ | V:796-810; TS ApprovalSecurityTests + CC-6 probe ★ |
| TR-EMP-002 | SM-01 | PENDING | detail POST action=approve | APPROVED | Staff | crafted POST (no UI) | No | as above | V:342-346 ◆ (inert path) |
| TR-EMP-003 | SM-01 | APPROVED | repeat approve | APPROVED | Staff | — | self-loop | benign | TS ★ idempotent test |
| TR-SES-001 | SM-02 | ANON | login (approved worker creds) | AUTH-EMPLOYEE | Visitor | approved account | logout | framework | V:65-83 ★ matrix |
| TR-SES-002 | SM-02 | ANON | login (staff creds) | AUTH-STAFF | Visitor | staff/superuser | logout | framework | V:85-88 ★ |
| TR-SES-003 | SM-02 | AUTH-* | logout | ANON | any authed | session exists | re-login | framework | V:95-97 ★ |
| TR-PRD-001 | SM-03 | ABSENT | create entry (either form) | EXISTS | Staff | ISO date; int ≥0; unique day | delete only | constraint+savepoint ★ | V:362-396,757-793; TS ×3 ★ |
| TR-PRD-002 | SM-03 | EXISTS | delete entry | DELETED | Staff | row exists for worker | NO | single-row | V:398-406 ◆★ |
| TR-PRD-003 | SM-03 | DELETED | repeat delete | DELETED (+error flash) | Staff | — | — | n/a | V:400-405 ★ |
| TR-LED-001 | SM-04/05 | ABSENT | mark-paid (create-path) | PRESENT[PAID] w/ click-time snapshot | Staff | current week; valid worker | flags-reversible later | get_or_create + unique ◆; parallel pair RUNTIME-VERIFIED ★ (CC-5: 1 row, paid=True) | V:671-707; TS ★ + probe ★ |
| TR-LED-002 | SM-04/05 | ABSENT | archive run | PRESENT[UNPAID] canonical | System/CLI (operator) | command execution | no | whole-workforce lock ◆ | S:126-192 ★ CLI runs |
| TR-PAY-001 | SM-05 | UNPAID | mark paid | PAID | Staff | row present (else creates) | yes (TR-PAY-002) | single-row saves ◆ | V:693-703 ★ |
| TR-PAY-002 | SM-05 | PAID | mark unpaid | UNPAID | Staff | current-week row | yes (cycle) | single-row saves ◆ | V:717-721 ★ |
| TR-PAY-003/004 | SM-05 | same | repeats | same | Staff | — | — | converge ★ | TS repeat-safe |
| TR-PAG-001 | SM-06 | ∅(none active) | assign pagdi | ACTIVE | Staff | capacity≥0; ISO start; worker resolves | finish-only | atomic locked ★ 5-way | V:449-509 ★ |
| TR-PAG-002 | SM-06 | ACTIVE | auto-finish on new assignment | FINISHED | Staff(implicit)/System-step | inside assignment tx | NO | locked in-set | S:223-245; audits ★ |
| TR-WRP-001 | SM-07 | ∅ | assign warp (start=today forced) | ACTIVE | Staff | capacity≥0; worker resolves | finish-only | atomic locked ★ | V:532-577 ★ |
| TR-WRP-002 | SM-07 | ACTIVE | auto-finish on reassign | FINISHED | implicit | in-tx | NO | locked | S:196-220 ◆ |
| TR-WRP-003 | SM-07 | ACTIVE | explicit POST finish | FINISHED | Staff | passes view is_active pre-check | NO (reopen absent) | SBG-01 TOCTOU caveat — double-finish probe on SQLite NOT REPRODUCED (1 audit row); PG window theoretical | V:582-593; S:196-220 ★ + probe |
| TR-WRP-004 | SM-07 | FINISHED | re-finish | FINISHED (info, no service call) | Staff | pre-check false | — | TOCTOU window (structural only) | V:588-592 ★ |
| TR-WKW-001 | SM-08 | OPEN | reset_weekly_salary [--date] | ARCHIVED | Operator CLI | command run | rerun-refresh only | workforce lock; stream-gap SBG-02 | S:126-192; CR ★ |
| TR-WKW-002 | SM-08 | ARCHIVED | rerun same window | ARCHIVED (identical values) | Operator CLI | — | — | idempotent ★ | triple-run; TS ★ |
| TR-ADV-001 | SM-09 | any | give amount>0 | POSITIVE | Staff | amount>0 else reject | clear/carry | row-lock serialized ★ | S:42-69 ★ [140 case] |
| TR-ADV-002 | SM-09 | POSITIVE | clear | ZERO | Staff | — | give again | locked | S:72-103 ★ |
| TR-ADV-003 | SM-09 | ZERO | clear | ZERO (+CLEAR audit no-op) | Staff | — | — | locked | S:79-91 ★ E-series |
| TR-ADV-004 | SM-09 | ZERO | carry | ZERO (+NO-OP CARRY audit) | Operator CLI | f≥0 | — | workforce locks ◆ | S:279-291 ★ K-series |
| TR-ADV-005 | SM-09 | POSITIVE | carry f≥0 (N≠0) | POSITIVE(N=T(B×f)) | Operator CLI | f≥0 | corrective carry only | locked ◆ | S:293-316 ★ 100→50→25 |
| TR-ADV-006 | SM-09 | POSITIVE(small) | carry with B×f<1 | **ZERO via truncation** | Operator CLI | e.g., B=1,f=0.5 → T(0.5)=0 | give again | locked ◆ | NEW: arithmetic py-verify this session |

Totals: 28 transitions across 10 machines. Every row cites file-level evidence; ★/~ distribution and residual NOT VERIFIED cells are enumerated in 05 §16/§24.
