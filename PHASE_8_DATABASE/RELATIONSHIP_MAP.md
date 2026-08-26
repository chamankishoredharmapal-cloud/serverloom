# RELATIONSHIP_MAP.md (Phase 8.7)

All relationships NEW (greenfield). FK targets assume Supabase `auth.users` for identity.

```mermaid
erDiagram
    auth_users ||--|| profiles : "id = auth user id (1-1)"
    profiles ||--o{ production_entries : worker_id
    profiles ||--o{ material_assignments : worker_id
    profiles ||--o{ weekly_ledger : worker_id
    profiles ||--o{ archive_runs_actor : "optional operator"
    auth_users ||--o{ audit_events : actor_id (SET NULL)
    profiles ||..o{ audit_events : "via entity_id/name snapshot (no hard FK)"

    profiles {
        uuid id PK
        text phone UK
        text role
        text status
        int salary_rate
        int advance_balance
    }
    production_entries {
        uuid id PK
        uuid worker_id FK
        date work_date
        int count
        timestamptz deleted_at "soft-reserve"
    }
    material_assignments {
        uuid id PK
        uuid worker_id FK
        text material_type
        date started_on
        date finished_on "NULL=ACTIVE"
        int capacity
    }
    weekly_ledger {
        uuid id PK
        uuid worker_id FK
        date week_start
        date week_end
        int final_pay "signed"
        bool paid
        bool canonical
        text source
    }
    audit_events {
        uuid id PK
        uuid actor_id "SET NULL"
        text actor_name
        text entity_type
        uuid entity_id
        text action
        jsonb before
        jsonb after
    }
    archive_runs {
        uuid id PK
        date week_start
        date week_end
        text triggered_by
        int rows_created
        int rows_refreshed
    }
```

## Relationship register

| Source → Target | Cardinality | Required | ON DELETE | History consequence |
| --------------- | ----------- | -------- | --------- | ------------------- |
| auth.users → profiles | 1—1 | yes | RESTRICT (default; flip = D-13 explicit choice) | profile is the anchor of all payroll history |
| profiles → production_entries | 1—N | contextual | **RESTRICT default** (external CASCADE destruction = REJECTED posture; D-13 decision may soften for offboarding via status instead) | corrections trail kept in audit_events regardless |
| profiles → material_assignments | 1—N | contextual | RESTRICT default | full assignment lifecycle permanent |
| profiles → weekly_ledger | 1—N | yes (payroll of record) | **RESTRICT shipped** — protects ledger; CASCADE available only as conscious D-13=B flip pre-data | snapshots are the historical authority |
| auth.users → audit_events.actor_id | 1—N | no | SET NULL + actor_name retained | audit SURVIVES identity deletion (AUD contract) |
| profiles ⇢ audit_events | indirect | no | entity_id nullable + name snapshots | forensic chain intact after any deletion |
| weekly_ledger ⇢ archive_runs | logical (week window match) | no | none | run records explain every canon state |

## Lifecycle dependencies

- Deletion of a WORKER is blocked at DB level while payroll/material history exists (RESTRICT default) ⇒ offboarding is a STATUS transition (SM-01/D-01), not a row delete. Hard delete requires explicit D-13 policy change + prior archival export.
- Deletion of an AUTH USER (identity loss, e.g., provider admin action) does NOT cascade into domain tables under default config — profile remains, flagged by missing identity link (application treats as locked account). This inverts the external app's cascade-destruction incident class permanently.
- Ledger rows are never deleted by any workflow; archive refreshes quantity columns only (payment group byte-preserved).

## Many-to-many

None exists in this domain (verified against Phase 6 E-register — no join entities required).
