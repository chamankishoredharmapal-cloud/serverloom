# MIGRATION_PLAN.md (Phase 8.14 + 8.15)

## A. Existing Management-V1 data migration

**NO EXISTING DATA MIGRATION REQUIRED** — verified greenfield (CURRENT_DATABASE_AUDIT): no MV1 database, zero rows, zero schema exists anywhere. First deployment creates schema from versioned SQL migrations directly; there is nothing to convert, map, or validate against.

## B. External application data import

**NOT REQUIRED by any Phase 6/7 requirement** (MASTER_REQUIREMENTS §18: external data NOT assumed to migrate; Phase 7 §18 same). Import path documented ONLY as a future option so the decision is informed, never silently taken:

| Aspect | If ever requested |
| ------ | ----------------- |
| Source | `serverloom-main/serverloom-main/db.sqlite3` (read-only attach) |
| Mapping | Django models → FINAL_SCHEMA tables: Employee→profiles (is_approved=True→status ACTIVE else PENDING; salary_per_saree→salary_rate; advance_salary→advance_balance) · SareeCount→production_entries · PagdiHistory/WarpHistory→material_assignments(material_type) · SalaryHistory→weekly_ledger(quantity+payment groups; canonical=true for archived windows) · three audit tables→audit_events (typed rows, actor NULL→SYSTEM/kind mapping by admin_user nullity) · AlertEmail/current_week_salary/thread counters → dropped (N/A register) |
| Transformation notes | week math recomputed via CALC-001 rather than trusted; phone normalization policy (D-10) applied once; negative finals preserved verbatim (BR-013); carry float history preserved as historical fact (no re-math of past events) |
| Precondition | D-08 must be decided FIRST if import includes rate-sensitive display expectations (entry-rate column may need adding) |

## Migration validation strategy (8.15) — applies to ANY future load/import

REPEATABLE: scripted loader (idempotent upserts keyed on natural keys) — never hand-run SQL.
VALIDATABLE, checked post-load:
1. row counts per table == source extract manifest
2. FK integrity: zero orphans (worker_id/entity refs)
3. UNIQUE constraints hold (worker-day, worker-week, partial active-material count == expected ACTIVE set)
4. CHECK sweep: zero violations (non-negativity, week math, enums)
5. money totals reconciliation: Σ final_pay per archived week == source totals; Σ advance_balance == source sum; production Σcount per worker-week parity spot checks
6. material state check: exactly-one-ACTIVE per worker/type after load
7. audit continuity: event chains present for balances/materials incl. SYSTEM actor mapping
8. date-range edges: min/max work_date & week_start match source
9. checksums on exported slices where applicable
ROLLBACK-AWARE: imports run inside a transaction per source-table batch against a FRESH shadow project; cutover only after checklist passes; failure ⇒ drop shadow, retry corrected script — production untouched throughout.
Success declaration forbidden until checklist output attached to the migration record (mirrors Phase 6 "do not claim runtime success without evidence" discipline).
