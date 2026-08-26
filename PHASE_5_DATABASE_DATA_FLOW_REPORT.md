# Phase 5 — Database / Data-Flow Report (Independent Reconciliation)

Independent checks run this phase on a fresh isolated DB (migrations, constraint behavior via ORM/runtime probes from the 4.5 verification environment re-validated against current source).

## 1. Schema & Constraints (current)

| Model | Key constraints | Evidence |
| ----- | --------------- | -------- |
| SareeCount | UNIQUE(employee,date); count PositiveIntegerField (≥0); index (employee,date) | models.py:53-67; runtime IntegrityError observed |
| SalaryHistory | UNIQUE(employee,week_start,week_end) — archive idempotency anchor | models.py:190-193; rerun created=0 runtime |
| PagdiHistory/WarpHistory | capacity ≥0; end_date nullable = ACTIVE marker | models.py |
| AdvanceHistory/PagdiChangeHistory/WarpChangeHistory | employee FK **SET_NULL** + `employee_name` snapshot; admin_user SET_NULL | migration 0007; unit AuditSurvivalTests PASS |
| Employee | user OneToOne CASCADE; phone indexed | models.py |

- `manage.py makemigrations --check --dry-run` → "No changes detected" (models ↔ migrations consistent).
- Fresh `migrate` applies 0001→0007 cleanly (runtime).

## 2. Source-of-Truth Map

| Quantity | Authoritative source | Derived/stale risk |
| -------- | -------------------- | ------------------ |
| Weekly production | `SareeCount` rows (raw) | none — always aggregated live |
| Weekly ledger quantities | `SalaryHistory` row per week, written/refreshed ONLY by archive command | eliminated stale-freeze defect (BUG-17): mark-paid now touches payment state only; archive refreshes quantities to full-week truth — RUNTIME VERIFIED (paid flag preserved while sarees/final refreshed) |
| Payment state | `SalaryHistory.paid_status/paid_date` | reversible flag by design; stale `notes` acceptable |
| Advance balance | `Employee.advance_salary` under row lock | fully audited ADJUST/CLEAR/CARRY incl. no-ops |
| Material progress | computed live from SareeCount bounded by start/end date | single implementation after BUG-19 fix (model methods), clamped ≥0 |

## 3. Flow Traces (verified)

```text
Saree entry:  POST → view validation → atomic savepoint INSERT → unique constraint guard → flash
Advance:      POST → service lock → balance update + audit row SAME TX → flash
Archive:      CLI → lock all employees → create-or-refresh weekly rows → zero cws → counts reported
Mark-paid:    POST → get_or_create → payment-state-only update → idempotent repeats
Deletion:     user.delete() → operational data CASCADE → audit rows SURVIVE (SET_NULL+name) [unit-proven]
```

## 4. Rollback / Recovery Behavior

| Operation | Atomic? | Failure evidence |
| --------- | ------- | ---------------- |
| Money mutations | YES (atomic+lock) | parallel gives serialized; audits exact |
| Pagdi/Warp assignment | YES (single tx: finish-old + create-new + audit) | 5-way race: lock-timeout requests rolled back leaving ZERO partial rows; exactly 1 ACTIVE survived |
| Archive command | YES (whole-run) | dry-run sentinel rollback pattern verified; real runs all-or-nothing |
| Duplicate-day insert | savepoint-scoped | friendly rejection; no partial state |
| Migrations | Django-managed | applied clean on fresh DB |

No path was found where a failure leaves mixed state. Recovery = retry (idempotent operations) or out-of-band Django admin.

## 5. Findings

| Finding | Class |
| ------- | ----- |
| Saree-entry deletion leaves no audit trail (design gap since Phase 3) | P3 ACCEPTABLE RISK — recommend extending audit when M-V1 touches production data |
| Approve / rate-change / paid-flag flips unaudited | P3 ACCEPTABLE RISK (same recommendation) |
| Exports price historical saree rows at CURRENT rate (Phase 3 rule, still true) | P4 DOCUMENTATION ONLY — business rule to preserve in integration |
| `current_week_salary` vestigial retained | P4 accepted decision (documented in model) |
| No DB-level CHECK preventing negative `final_salary` | P4 — BUG-18 pinned as intentional debt-recovery semantics |

**Verdict: DATABASE/DATA-FLOW SOUND for integration.** Constraint layer is the strongest integrity barrier; every abuse attempt this session left state consistent.
