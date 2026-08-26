# 05_MODULE_ARCHITECTURE.md

Final module set derived from CURRENT MV1 ∪ Phase 6 requirements (prompt's Parcels/Inventory/Polish-Sarees examples are explicitly NOT adopted — no business evidence).

```
MANAGEMENT-V1
├── M1 Identity & Access          (signup/login/logout/sessions/role claims)
├── M2 Worker Management          (roster, search, detail console, approval, lifecycle)
├── M3 Production                 (daily entries, corrections)
├── M4 Materials                  (Pagdi/Warp assign→auto-finish→finish, progress)
├── M5 Payroll & Settlement       (weekly grid, CALC-002, mark paid/unpaid, ledger)
├── M6 Advances                   (give/clear/carry + trail)
├── M7 Archive Operations         (freezeWeek console/cron, run records)
├── M8 Reporting & Exports        (dashboards, REP pages, XLSX/PDF streams)
├── M9 Audit                      (append-only events + superadmin viewer)
└── M10 Administration & Settings (roles promotion, policies, ops secrets) [thin]
```

| Module | Users | Permissions | Entities | Key workflows | Dependencies | Reports | Audit |
| ------ | ----- | ----------- | -------- | ------------- | ------------ | ------- | ----- |
| M1 | all | self only | profiles+auth identity | register/approve-gate/login/logout | none | — | REGISTER/LIFECYCLE |
| M2 | staff+ | global read/write via RPCs | profiles | approve/lifecycle/search/detail | M1 | roster export (future) | APPROVE/LIFECYCLE_SET |
| M3 | staff write · worker read-own | RPC-gated | production_entries | add/correct entries | M2 eligibility | REP-007 | ENTRY_CREATED/REMOVED |
| M4 | staff | RPC-gated | material_assignments | assign/auto-finish/finish/progress | M2 | progress columns | CREATE/FINISH |
| M5 | staff | payment-RPC only | weekly_ledger(payment group) | grid review/settle/reverse | M3,M6,M8-data | REP-001/002 | PAYMENT_* |
| M6 | staff | balance-RPC only | advance_balance + events | give/clear/carry | M2 | advance column feeds | ADJUST/CLEAR/CARRY |
| M7 | operator/system | exclusive quantity writer | weekly_ledger(qty)+archive_runs | dry-run→freeze→verify | M3,M5 data | enables history | ARCHIVE_RUN |
| M8 | staff | reads via services | all (read-only) | dashboards/exports | M2..M7 outputs | REP-001..007 | optional export log |
| M9 | superadmin | read-only trail | audit_events | forensic review | every module emits | audit export | itself |
| M10 | superadmin | promotion/policy | profiles.role/status | invite/promote/configure | M1 | — | promotions |

Boundary rules (unchanged): services are sole rule owners; UI renders precomputed values; database guards invariants; cross-module writes prohibited.
