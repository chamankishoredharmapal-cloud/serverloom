# DATA_MAPPING.md (Phase 11.3)

Status: **CONDITIONAL SPECIFICATION — execution NOT APPLICABLE** (no source data exists; see MIGRATION_DECISION). This document preserves the validated mapping so that if real external data ever surfaces (another export, an actual deployed instance), transfer proceeds without re-analysis. Authority: PHASE_8_DATABASE/MIGRATION_PLAN.md §B (identical content, restated as the standing contract).

| Source entity | Target | Key transformations |
| ------------- | ------ | ------------------- |
| Employee | profiles | `is_approved=True→status ACTIVE else PENDING` · salary_per_saree→salary_rate · advance_salary→advance_balance · phone→phone(UNIQUE) · thread counters/performance/current_week_salary/picture → DROPPED (Phase 6 N/A register) |
| SareeCount | production_entries | date/count verbatim; notes→note; duplicates impossible (source unique) |
| PagdiHistory/WarpHistory | material_assignments(material_type) | start/end/capacity verbatim; NULL end ⇒ ACTIVE row |
| SalaryHistory | weekly_ledger | five quantity fields → quantity group (canonical=true for archived windows); paid_status/paid_date/notes → payment group; negative finals preserved verbatim (BR-013) |
| AdvanceHistory/PagdiChangeHistory/WarpChangeHistory | audit_events | typed action mapping; admin_user NULL ⇒ actor_kind SYSTEM; name snapshots retained |
| AlertEmail | *(none)* | dropped unless D-09 resolves positive |
| auth_user (Django) | Supabase auth.users | passwords NEVER migrated — fresh credential enrollment via invite/reset flow |

Field-level NULL/default/validation rules follow FINAL_SCHEMA column contracts; loss-of-information register: only the deliberately-dropped vestigial fields above.
