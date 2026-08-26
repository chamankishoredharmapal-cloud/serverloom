# 21_CONFLICT_RECONCILIATION.md

Conflicts discovered between CURRENT MV1, external requirements, and prior-phase decisions — each resolved with authority, none averaged.

| # | Conflict | Authority applied | Resolution |
| - | -------- | ----------------- | ---------- |
| K-01 | External "single flat staff" vs prompt's example granular manager roles (parcel/inventory/polish) | Phase 6 business reality: single workshop, one operator class; prompt marks examples as non-normative | KEEP flat STAFF model; granular roles = HUMAN DECISION REQUIRED additive path |
| K-02 | Prompt's module examples (Parcels, Inventory, Polish Sarees) vs derived modules | No Phase 6 evidence for parcels/inventory/polish domain | Modules derive from evidence only — those examples excluded (would be invention) |
| K-03 | Carry float truncation artifact (external observable 100×0.29→28) vs exact math (→29) | C64 §9 IMPROVE note + ADR-008 | Exact rational math adopted; artifact class rejected; observable toward-zero semantics preserved elsewhere |
| K-04 | External cascade deletion of worker history vs retention requirement | D-13 + Phase 6 gap classification | RESTRICT default shipped; CASCADE only via signed decision |
| K-05 | Unaudited external mutations vs audit requirement | AUD63-006..009 requirements | Audits mandatory in MV1 (implemented in-tx) |
| K-06 | Dual approval paths / inert self-finish branch externally | single-path principle | collapsed to single RPC; inert branches absent |
| K-07 | SQLite file-store vs networked multi-user target | Phase 8 requirement analysis | PostgreSQL via Supabase adopted |
| K-08 | F-RACE01/F-EXP01 defects vs "verification passed" | Phase 10 rules (no fix during verification) | Carried as P3 findings into this package's priority list — not silently fixed |
| K-09 | Local-mode dev auth bridge vs provider-only production auth | Phase 7 SECURITY | Bridge is REMOVE-at-cutover; production = Supabase Auth exclusively |
| K-10 | "Existing MV1" vs "external requirements" inventories could double-count features | derivation lineage (MV1 built FROM Phase 6/7/8) | Unified matrix assigns exactly ONE action per capability; convergence documented as provenance, not duplication |

Historical adjudications inherited (not reopened): P6 reconciliation RC-set · P7 X-01..15 · P8 R-set · P10 C-set. New conflicts requiring human input: **0** beyond the already-open D-register.
