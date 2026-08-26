# 23_REQUIREMENT_TRACEABILITY.md

Every unified requirement traces to source authority and forward to implementation/test. ID scheme reuses the program's established registers (no orphans; no unnamed features).

| Unified Req | Source phase/doc | Module | Entity | Roles | Workflow | Rule/Calc | DB | Security | Priority | Acceptance test |
| ----------- | ---------------- | ------ | ------ | ----- | -------- | --------- | -- | -------- | -------- | ------- |
| U-AUTH-01..04 (register/login/logout/session-gate) | P6 FR-001..003 · P7 M1 · P10 AT/H checks | M1 | profiles+auth identity | all | WF-A | BR-022/025 | 0002 policies | SEC layer1 ★ | P0.1/P0.2 | provider runbook |
| U-WORK-01..05 (roster/search/detail/approve/lifecycle) | P6 FR-004..005,SM-01 · P6.3 BR-036/D-01 | M2 | profiles | staff+/worker-self | WF-A | — | RPC approve/status | requireStaff ★ | P0/P1.7 | lifecycle UI E2E |
| U-PROD-01..04 (create/correct/list/dup-safety) | P6 FR-015/016,BR-002/003/024/026/027,SM-03 | M3 | production_entries | staff | WF-B/C | CALC inputs | UNIQUE+CHECK | POST-only ★ | P1 | race+E2E |
| U-MAT-01..05 (assign/auto-finish/finish/lists/progress) | P6 FR-017..020,BR-009..011/028/029,CALC-003/004,SM-06/07 | M4 | material_assignments | staff(+D-05 worker?) | WF-D/E | — | partial UNIQUE ★ | FORBIDDEN probes ★ | P1 | race+E2E |
| U-PAY-01..04 (grid/compute/settle/reverse) | P6 FR-021/024/025,BR-013/015/021/031/032,CALC-002/006,SM-04/05 | M5 | weekly_ledger | staff | WF-I | — | upsert arbiter ★ | current-week scope | P1 | snapshot parity test |
| U-ADV-01..03 (give/clear/carry) | P6 FR-022/023,BR-007/008/019/040,CALC-005/006,SM-09 | M6 | balance+events | staff/system | WF-F/G/H | — | FOR UPDATE ★ | locks ★ | P1 | truncation edges ★ |
| U-ARCH-01..03 (freeze/rerun/dry-run) | P6 FR-030,BR-014..018/033/037,CALC-007,SM-08 | M7 | ledger qty + archive_runs | operator/system | WF-J/K | — | advisory lock ★ | secret gate ★ | P2(cron)/P0(none) | idempotency ★ |
| U-RPT-01..07 (REP-001..007) | P6 REP series · D-08/D-11 seams | M8/M5 pages | reads | role-scoped | WF-L | CALC-008 strategy | views/queries | staff gate ★ | P3(fixes P2 F-EXP01) | parsed-content ★(XLSX) |
| U-AUD-01..02 (emit/immutability+viewer) | P6 AUD63 · P8 audit arch | M9+all | audit_events | superadmin read | every WF | — | privileges ★ | append-only ★ | P0 core done / breadth D-07 | grant probe ★ |
| U-DAT-* (schema/constraints/indexes) | P8 FINAL_SCHEMA | DB | all | n/a | n/a | invariants | migrations 0001 | RLS 0002 | P0 done | DIAG+probes ★ |
| U-OPS-01..02 (cron/secrets) | P6 OPS series · ADR-011 | ops routes | runs/events | system | runbook | D-04/D-06 hooks | env contract | OPS_SECRET ★ | P2 | smoke trio ★ |
| U-NFR-* | P6 NFR/P19 | cross | — | — | — | — | PITR config | TLS/throttle | P0.3 | drill evidence |

Coverage rule: any future requirement MUST enter this table with a source doc or it is out of scope.
