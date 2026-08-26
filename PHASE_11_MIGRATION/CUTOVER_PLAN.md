# CUTOVER_PLAN.md (Phase 11.12) — GREENFIELD PRIMARY FLIP

```
NO LEGACY TRAFFIC (proven: external app never had data)
        ↓
PROVIDER VERIFICATION (runbook)
        ↓
F-RACE01/F-EXP01 fixed-or-signed-off
        ↓
PITR ENABLED + RESTORE DRILL EVIDENCED
        ↓
BUSINESS ACCEPTANCE ON LIVE-ENTERED DATA
        ↓
MANAGEMENT-V1 BECOMES PRIMARY
        ↓
EXTERNAL TREE ARCHIVED READ-ONLY (retention)
```

## Decision points — HUMAN DECISION REQUIRED (not invented here)

| Item | Owner must decide |
| ---- | ----------------- |
| Freeze/cutover date & window | business owner |
| Responsible person (executes runbook) | business owner |
| Validation window length | business owner |
| Rollback trigger thresholds | business owner (defaults proposed in ROLLBACK_PLAN) |
| Communication to workers | business owner |
| Old-system retention period | business owner (default proposal: keep archived tree indefinitely until explicit deletion approval) |

No timings are fabricated: none were ever specified by the business.
