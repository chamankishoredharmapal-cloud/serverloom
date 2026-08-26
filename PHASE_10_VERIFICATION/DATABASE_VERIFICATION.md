# DATABASE_VERIFICATION.md (Phase 10.9)

Schema not merely inspected — exercised. Evidence: harness probes + Phase 9 grant/constraint checks re-run on fresh clusters.

| Check | Method | Result |
| ----- | ------ | ------ |
| Tables/columns match FINAL_SCHEMA | migration content + DIAG function/table inventory | PASS |
| FK integrity | all child rows reference existing profiles; invalid worker blocked (INELIGIBLE/NOT_FOUND paths) | PASS |
| UNIQUE(worker,work_date) | duplicate insert + 3-way race | held ★ |
| UNIQUE(worker,week) + CHECK week math | settlement/archive races; ledger single-row invariant after parallel archives | held ★ |
| PARTIAL UNIQUE one-ACTIVE | 3-way parallel assign race | exactly ONE ACTIVE ★ |
| CHECK positivity (count/rate/capacity/balance) | negative-input battery (unit+SQL) | rejected pre-store ★ |
| Signed ledger money (negative legal) | B final −37 stored/exported unclamped ★ | PASS |
| RLS enabled & effective | relrowsecurity=1 (DIAG); policy behavior via appclient claims sessions | PASS ★ |
| Client write-lockdown | has_table_privilege matrix: sel=false/ins=false/aud=false pre-policy; inserts denied | PASS ★ |
| Audit immutability | UPDATE/DELETE grants absent for anon/authenticated/service_role | PASS ★ |
| Triggers (updated_at) | touch_updated_at attached to three tables | present ✓ |
| RPCs authoritative | all mutations executed through 0003 functions during verification (no direct-table success path exists for clients) | PASS |
| Archive integrity | canon flags, created/refreshed accounting, run records | PASS ★ |
| Payment preservation under archive refresh | paid/paid_on survived quantity-only refresh ★ | PASS |
| Deletion policy | worker RESTRICT default (cascade-destruction class eliminated); production remove audited | PASS |

Anomaly register: none at database layer this phase. (EXP-03 date-format defect lives in the export formatter, not storage.)
