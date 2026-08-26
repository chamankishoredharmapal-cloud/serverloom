# 10_DATA_REQUIREMENTS.md

FINAL unified data model = Phase 8 FINAL_SCHEMA (authoritative) as implemented in migrations 0001–0004, reconciled against current MV1 (identical — no drift).

| Entity | Purpose | Key fields | Relationships | Lifecycle | Retention | Audit |
| ------ | ------- | ---------- | ------------- | --------- | --------- | ----- |
| profiles | identity+worker state | id(=auth uid), full_name, phone UQ, role/status enums, salary_rate≥0, advance_balance≥0, joined_on | 1—1 auth user; 1—N children | PENDING→ACTIVE→(D-01 extensions) | never hard-delete default; status offboarding | REGISTER/APPROVE/LIFECYCLE/RATE_CHANGED |
| production_entries | daily output | worker FK, work_date, count≥0, note, soft-delete reserve | N—1 worker | create⇄remove(correct) | indefinite; corrections audited | ENTRY_CREATED/REMOVED |
| material_assignments | capacity windows | worker FK, type PAGDI/WARP, started_on, finished_on NULL=ACTIVE, capacity≥0 | N—1 worker | ACTIVE→FINISHED terminal | permanent | CREATE/FINISH |
| weekly_ledger | payroll canon + payment register | worker FK, week pair CHECK+6, quantity group(5), payment group(3), canonical, source | N—1 worker | birth SETTLEMENT or ARCHIVE → canon refresh | permanent, undeletable in-app | PAYMENT_* / ARCHIVE_RUN |
| audit_events | forensic trail | occurred_at, actor_id SET NULL + kind + name snapshot, entity_type/id, action, before/after JSONB, note | referenced by all | append-only forever | permanent | itself |
| archive_runs | run ledger | week pair, triggered_by, actor, created/refreshed, dry_run | per window | append-only | permanent | is audit |
| app_credentials | DEV-ONLY bridge | profile PK, scrypt hash | 1—1 profile | removed at Supabase wiring | none | n/a |

Deliberately absent: notifications registry (D-09), weeks table (implicit), vestigial counters/labels, any derived aggregate column.

Calculated-vs-stored: live figures ALWAYS computed (CALC-002..004/008); stored values exist only in ledger snapshots and audit events. No hand-maintained derived columns.
