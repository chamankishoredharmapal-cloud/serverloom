# 16_MODULE_INTEGRATION_REQUIREMENTS.md

Dependency graph (input→output; single shared entities; no duplicated truth):

```
M1 Identity ──▶ (role/status) ──▶ ALL modules' authorization context
M2 Workers ──▶ eligibility gate ──▶ M3/M4/M5/M6 write paths
M3 Production ──▶ pieces stream ──▶ M5 live grid · M4 progress · M7 canon
M6 Advances ──▶ balance term A ──▶ M5 CALC-002 · M7 snapshot
M4 finish ──▶ ε bound ──▶ M4 progress freeze
M7 Archive ──▶ canonical ledger ──▶ M8 historical reports/exports · M9 run events
M9 Audit ◀── emits from EVERY mutating module (same tx)
M8 Exports ◀── service outputs only (never raw re-implementations)
M10 Admin ──▶ role/status promotion ──▶ M1 claims
```

| Integration | Shared entity | Shared transaction? | Rule |
| ----------- | ------------- | -------------------- | ---- |
| Production→Payroll | production_entries (read) | no — reads see committed state; archive is the atomic writer | aggregates always via services |
| Advance→Settlement | advance_balance read inside mark-paid create-path snapshot | settlement tx reads current balance | authority split prevents writes crossing |
| Material→Progress | assignments + entries join | progress computed per request | bound = coalesce(end,today) |
| Settlement↔Archive | weekly_ledger row, disjoint column groups | separate txs; row versioning serializes | column-list discipline + optional trigger guard |
| Any mutation→Audit | audit_events insert in same tx | YES — atomic pairing mandatory | failure rolls back both |
| Ops(cron/console)→Archive/Carry | RPC invocation w/ secret | whole-run tx | SYSTEM actor recorded |

Prohibited: components importing tables directly for writes; any module re-deriving week bounds or money math; exports calling tables ad hoc.
