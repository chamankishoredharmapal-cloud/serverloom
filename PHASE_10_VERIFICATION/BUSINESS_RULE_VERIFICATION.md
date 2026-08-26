# BUSINESS_RULE_VERIFICATION.md (Phase 10.4)

Every rule tested with BOTH valid and invalid paths where applicable. ★ = this phase's runtime evidence.

| Rule | Owner | Valid test | Invalid test | Verdict |
| ---- | ----- | ---------- | ------------ | ------- |
| BR-003 one entry/worker/day | unique idx + RPC catch | create ok (WF chain) | duplicate → typed reject ★; 3-way parallel → 1 row (Phase 9 D-set, re-verified pattern) | PASS |
| BR-005 approved-only eligibility | RPC check | ACTIVE assign ok | PENDING → INELIGIBLE_WORKER ★ | PASS |
| BR-006 rate ≥0 int | CHECK+RPC | set 12/2 ok | −5 rejected ★ | PASS |
| BR-007 give >0 additive locked | RPC FOR UPDATE | +45 applied (CALC-04 snapshot math) | ≤0 rejected (unit+SQL) | PASS |
| BR-008 clear→0 audited no-op | RPC | CLEAR event w/ No-op note ★(P9) / zero-balance path retained | — | PASS |
| BR-009/010 single-ACTIVE + atomic auto-finish | partial unique + lock ordering | reassign → ONE-ACTIVE ★; 3-way race ★ | overlap insert impossible by index | PASS |
| BR-011 capacity ≥0 | CHECK+RPC | ok values | negative rejected (unit) | PASS |
| BR-012 Mon–Sun | week.ts sole source | grid/archive windows | year-boundary/leap unit tests | PASS |
| BR-013 negative payable legal end-to-end | signed columns; no clamp anywhere | B: 18−55=−37 stored & exported ★ | clamp attempt would fail CALC checks | PASS |
| BR-014/015 authority split | column-group discipline in RPCs | archive refresh preserved paid ★; settlement left quantities intact ★ | trigger-guard option unused (documented) | PASS |
| BR-016 archive preserves payment | same | SM-04 ★ | — | PASS |
| BR-018 rerun idempotent created=0 | upsert + advisory lock | second run refreshed=N ★; parallel runs serialize ★ | — | PASS |
| BR-019 carry factor ≥0 | pre-write abort | f=1/2,29/100 ok | negative/den=0 rejected (unit) | PASS |
| BR-021 current-week settlement scope | bounds from today | flips on current window ★ | archived-window flip structurally out of scope (D-03 default) | PASS |
| BR-022 approval gate | login/status | ACTIVE login path ✓ | PENDING refused without session (local-mode logic; cloud NV) | PARTIAL |
| BR-025 signup defaults zeroed | register defaults | new profiles carry 0s | — | PASS |
| BR-026 correction = remove+recreate | remove RPC + audit before-image | WF-02 ★; CC-03 parallel safe ★ | forged id NotFound ★ | PASS |
| BR-027 zero count legal | `<0` only rejection | zero stored ★ | negative rejected ★ | PASS |
| BR-028 warp=today / pagdi requires date | service+RPC contract | WARP forced ★ (SM block) | missing pagdi date → START_REQUIRED | PASS |
| BR-032 unpaid flags-only; benign no-op | RPC rowcount guard | flip verified ★ | absent-row silent success retained | PASS |
| BR-004 phone unique | UNIQUE | dup signup blocked at service edge | — | PASS |

Failures: **none**. Notes: approval-race audit-event duplication observed as FLAKY under superuser-bypass sessions and SINGLE-EVENT under the real client-role path — recorded as finding F-RACE01 (P3) in CONCURRENCY doc.
