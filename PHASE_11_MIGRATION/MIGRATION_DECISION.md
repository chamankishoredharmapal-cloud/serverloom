# MIGRATION_DECISION.md (Phase 11.2)

## Decision

**E. NO MIGRATION REQUIRED — GREENFIELD CUTOVER / DEPLOYMENT READINESS.**

## Basis (evidence-driven, per the "do not invent migration work" rule)

`EXTERNAL_DATA_INVENTORY.md` proves, by direct read-only inspection:

1. The external store is a **0-byte file** with no SQLite header and zero user tables.
2. No alternative data artifact exists anywhere in the repository (sweep results recorded).
3. Therefore there is **no business data** — no employees, production, advances, salaries, materials, or history — to extract, transform, validate, or import.

Options A–D are all factually unavailable: they presuppose source rows that do not exist.

## Consequences

- EXTRACT/TRANSFORM/IMPORT/ACCEPTANCE execution stages: **NOT APPLICABLE**.
- Phase 11 completes along the **GREENFIELD CUTOVER / DEPLOYMENT READINESS** path: provider verification → environment bring-up → seed-free first-run → business acceptance on live-entered data → primary-status flip.
- The conditional future-import path (if real external data ever materializes from another source) remains fully specified in `PHASE_8_DATABASE/MIGRATION_PLAN.md §B` and is referenced — not duplicated — by DATA_MAPPING/TRANSFORMATION docs in this phase.

## What still gates production primary-status (unchanged by this decision)

Provider verification runbook (Supabase project, Auth issuance, JWT↔RLS positive paths, A/B isolation, password/throttle policy) · PITR enable + restore drill · F-RACE01/F-EXP01 fixed-or-signed-off · TLS at host · business acceptance sign-off on live-entered data.
