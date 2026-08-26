# FINAL_SCHEMA.md (Phase 8.6)

Reconciliation of three inputs: Phase 6 DATA_REQUIREMENTS (E-01..E-11) + Phase 7 DATA_ARCHITECTURE (provisional target) + actual MV1 database (**none — greenfield**). Every object below is classified **NEW**. Dialect: PostgreSQL (Supabase). Conventions: `uuid` PKs (gen_random_uuid()), `timestamptz`, enum-as-CHECK text, snake_case.

## Table classification summary

| Table | Class | Source |
| ----- | ----- | ------ |
| profiles | NEW | E-01+E-02 merged per Phase 7 |
| production_entries | NEW | E-03 |
| material_assignments | NEW | E-04+E-05 unified |
| weekly_ledger | NEW | E-06 |
| audit_events | NEW | E-07..09 unified (ADR-006) |
| archive_runs | NEW | operational record backing BR-018/AUD63-009 (Phase 7 implied run-report; made explicit here) |
| alert_recipients | **REMOVE / DO NOT CREATE** | E-10 inert; only if D-09 ever resolves positive |
| weeks | **DO NOT CREATE** | implicit entity (E-11); instantiated by ledger rows |

Vestigial externals deliberately absent: thread counters, performance label, current_week_salary, profile_picture (Phase 6 NOT APPLICABLE set).

## profiles
| column | type | rules |
| ------ | ---- | ----- |
| id | uuid PK | = auth.users.id (1–1; FK ON DELETE RESTRICT by default — see retention) |
| full_name | text NOT NULL | |
| phone | text NOT NULL UNIQUE | identity display/search; format policy = VAL-012/D-10 at service edge |
| role | text NOT NULL DEFAULT 'WORKER' CHECK IN ('WORKER','STAFF','SUPERADMIN') | mirrors JWT app_metadata claim (SEC §1) |
| status | text NOT NULL DEFAULT 'PENDING' CHECK IN ('PENDING','ACTIVE','INACTIVE','SUSPENDED') | SM-01 machine; login gate = ACTIVE; value-set growth = D-01 |
| salary_rate | integer NOT NULL DEFAULT 0 CHECK (salary_rate >= 0) | BR-006 |
| advance_balance | integer NOT NULL DEFAULT 0 CHECK (advance_balance >= 0) | sole writers: advance RPCs |
| joined_on | date NOT NULL DEFAULT current_date | display-only parity |
| created_at / updated_at | timestamptz NOT NULL DEFAULT now() | |

## production_entries
| column | type | rules |
| ------ | ---- | ----- |
| id | uuid PK | |
| worker_id | uuid NOT NULL REFERENCES profiles(id) | delete behavior per retention matrix |
| work_date | date NOT NULL | any past/future date legal (BR-024) |
| count | integer NOT NULL CHECK (count >= 0) | zero legal (BR-027) |
| note | text NULL | |
| deleted_at / deleted_by / delete_reason | timestamptz / uuid / text, all NULL | soft-delete RESERVE (ADR-010): behavior OFF until D-02; live-row semantics default |
| created_at | timestamptz NOT NULL DEFAULT now() | |
CONSTRAINT: UNIQUE live (worker_id, work_date) — enforced via partial index while hard-delete default holds; switches to `WHERE deleted_at IS NULL` partial form if D-02 activates soft mode (non-breaking swap documented).

## material_assignments
| column | type | rules |
| ------ | ---- | ----- |
| id | uuid PK | |
| worker_id | uuid NOT NULL REFERENCES profiles(id) | |
| material_type | text NOT NULL CHECK IN ('PAGDI','WARP') | unifies E-04/E-05 |
| started_on | date NOT NULL | warp assign forces today at service edge (BR-028) |
| finished_on | date NULL | NULL ⇔ ACTIVE |
| capacity | integer NOT NULL CHECK (capacity >= 0) | |
| note | text NULL | |
| created_at / updated_at | timestamptz | |
CONSTRAINT: **partial UNIQUE INDEX (worker_id, material_type) WHERE finished_on IS NULL** — one-ACTIVE invariant, DATABASE-enforced.
CHECK (finished_on IS NULL OR finished_on >= started_on).

## weekly_ledger
| column | type | rules |
| ------ | ---- | ----- |
| id | uuid PK | |
| worker_id | uuid NOT NULL REFERENCES profiles(id) | FK behavior = **D-13 gate; ships RESTRICT-default** |
| week_start / week_end | date NOT NULL | CHECK (week_end = week_start + 6) |
| pieces | integer NOT NULL CHECK (>= 0) | quantity group ↓ archive-only writes |
| rate | integer NOT NULL CHECK (>= 0) | " |
| gross | integer NOT NULL CHECK (>= 0) | " |
| advance_applied | integer NOT NULL (signed legal) | " (BR-013 discipline) |
| final_pay | integer NOT NULL (signed legal) | " — negative payable NEVER clamped |
| paid | boolean NOT NULL DEFAULT false | payment group ↓ settlement-only writes |
| paid_on | date NULL | " |
| settlement_note | text NULL | " |
| canonical | boolean NOT NULL DEFAULT false | true once archive has frozen the window |
| source | text NOT NULL CHECK IN ('SETTLEMENT','ARCHIVE') | birth-path record (C64 §20 two paths) |
| created_at / updated_at | timestamptz | |
CONSTRAINT: UNIQUE (worker_id, week_start, week_end). Column-group write authority enforced via dedicated RPCs (ADR-003/007), not grants alone.

## audit_events (unified, append-only — ADR-006)
| column | type | rules |
| ------ | ---- | ----- |
| id | uuid PK | |
| occurred_at | timestamptz NOT NULL DEFAULT now() | |
| actor_id | uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL | survival requirement |
| actor_kind | text NOT NULL CHECK IN ('USER','SYSTEM') | SYSTEM = CLI/cron (NULL actor parity with external AUD63 model) |
| actor_name | text NOT NULL DEFAULT '' | denormalized snapshot survives deletion (migration-0007 lesson) |
| entity_type | text NOT NULL | 'PROFILE','PRODUCTION','MATERIAL','LEDGER','ADVANCE','ARCHIVE','AUTH' |
| entity_id | uuid NULL | SET NULL on subject deletion where FK applied |
| action | text NOT NULL | ADJUST/CLEAR/CARRY/CREATE/FINISH/ENTRY_CREATED/ENTRY_REMOVED/RATE_CHANGED/PAYMENT_MARKED/PAYMENT_REVERSED/APPROVE/REGISTER/ARCHIVE_RUN … breadth per D-07 |
| before / after | jsonb NULL | prev/new values incl. end-dates & capacities (AUD63-001..005 parity) |
| note | text NOT NULL DEFAULT '' | |
IMMUTABILITY: no UPDATE/DELETE grant to any role incl. service_role usage patterns; enforced by privileges (+ trigger guard option if ever violated). No UPDATE/DELETE code path exists in Phase 7 service contracts.

## archive_runs
| column | type | rules |
| ------ | ---- | ----- |
| id | uuid PK | |
| week_start / week_end | date NOT NULL | CHECK pair |
| triggered_by | text NOT NULL CHECK IN ('CRON','OPERATOR') | D-06 surface record |
| actor_id | uuid NULL | operator identity when manual |
| rows_created / rows_refreshed | integer NOT NULL DEFAULT 0 | {created, refreshed} report (BR-018) |
| dry_run | boolean NOT NULL DEFAULT false | dry-run ritual support (OPS) |
| note | text NOT NULL DEFAULT '' | |
UNIQUE (week_start, week_end, dry_run) would break rerun history → NO uniqueness: runs are append-only history; idempotency lives in ledger upsert, not run records.

## Explicitly rejected objects
alert_recipients (D-09 open; registry had zero senders externally) · weeks table · any counter column duplicating aggregates (current_week_salary class — Phase 6 BR-034 verdict: do not port).
