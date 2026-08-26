# WORKFLOW_DEPENDENCY_GRAPH.md (Phase 6.2)

Complete business dependency graph of the reference application (behavior level, implementation-free).

## Spine A — Money/Payroll (core)

```text
Visitor signs up (F-01)
   ↓ admin approval (F-04)          [gate: unapproved = locked out]
Approved Worker ──────────────┐
   ↓ rate configured (F-05)   │
Production entry recorded (F-15/F-16, repeat daily)
   ↓ aggregates per Mon–Sun week
Weekly live review grid/dashboards (F-21/F-06)
   ↓ admin decision
ADVANCE ISSUED?  ── yes → Give advance (F-22) ─→ balance ↑ (audited)
   │                    └─ Clear advance (F-23) ─→ balance 0 (audited)
   ↓
Settlement: Mark PAID (F-24)  ⇄  Mark UNPAID (F-25)     [payment authority only]
   ↓ week ends / operator runs command
WEEKLY ARCHIVE (F-30): quantities canonicalized for EVERY worker;
   paid flags PRESERVED; live counters zeroed; advances untouched
   ↓
Historical ledger (F-29/F-11/F-10/F-07) ── reads ──> Exports/Slip (F-26/F-27/F-28)

Period-close option:
Carry-forward command (F-31): balance ×= factor (NON-IDEMPOTENT, operator-gated)
```

Key authority boundaries on this spine:
- Quantities: only Archive writes final truth; settlement clicks never edit quantities of existing rows.
- Payment flags: only Mark Paid/Unpaid write them; Archive never touches them.
- Advances: independent of archive; deducted from every week until cleared/carry-scaled.

## Spine B — Pagdi materials

```text
Worker → Assign pagdi (F-17)
   [atomic: auto-FINISH every open pagdi + CREATE audit]
   ↓ ACTIVE
Production entries accrue within [start … min(today,end)]
   ↓ progress lists show made/remaining clamped ≥0 (F-18/F-08)
New assignment for same worker ⇒ old AUTO-FINISHES (terminal) + new ACTIVE
   ↓
Pagdi history (immutable after FINISH) — audits CREATE/FINISH retained forever
```

No explicit standalone finish control exists for pagdi (GAP G-05); deletion not offered in-app.

## Spine C — Warp materials

```text
Worker → Assign warp (F-19) [start = today; atomic auto-finish of open warps]
   ↓ ACTIVE
Progress identical to pagdi math
   ↓ completion via EITHER path:
   (a) new assignment auto-finishes      (b) explicit POST finish (F-20), GET refused
   ↓
Warp history + dedicated audit trail (CREATE/FINISH)
```

## Cross-spine coupling

- Production entries feed BOTH pay (Spine A) and material progress (B/C) — one data source, two consumers.
- Worker approval gates everything (no approved worker → no meaningful production/materials/pay).
- Audit layer (WF-014) wraps Spine-A money ops and both material spines; NOT wrapped: production add/delete, rate changes, approvals, payment flips (gap).

## Terminal states summary

| Entity | Terminal |
| ------ | -------- |
| Material assignment | FINISHED (end date set) |
| Week ledger row | none — immutable-ish post-archive (app offers no edits) |
| Advance balance | zero via CLEAR (balance itself persists as identity attribute) |
| Worker lifecycle | NO terminal state exists (no deactivate/delete flow in app) — G-01 |
