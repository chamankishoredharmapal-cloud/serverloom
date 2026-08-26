# TRANSFORMATION_SPECIFICATION.md (Phase 11.6)

Status: **CONDITIONAL — N/A for execution** (no source rows). The transformation contract is the one already validated during Phase 8 planning and restated in DATA_MAPPING.md; it is binding for any future import.

Core rules recap (binding):

| Transformation | Rule |
| -------------- | ---- |
| Approval → status | boolean is_approved ⇒ status ACTIVE/PENDING (enum extensible per D-01) |
| Money fields | integers verbatim; signed ledger values never clamped (BR-013) |
| Dates | ISO verbatim; week windows recomputed via CALC-001, never trusted from source strings |
| Material state | NULL end_date ⇒ ACTIVE row; partial-unique index will reject any source violating one-ACTIVE — such rows are HUMAN DECISION items, not auto-repaired |
| Audit actors | admin_user NULL ⇒ actor_kind SYSTEM + name snapshot carried forward |
| Credentials | excluded by definition |

Validation at load time follows MIGRATION_PLAN §Post-transformation validation (counts, FK integrity, constraint sweep, financial reconciliation, material-state check, audit continuity, date-range edges, checksums).
