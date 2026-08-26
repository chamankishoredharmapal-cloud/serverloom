# DATA_REQUIREMENTS.md (Phase 6.7)

Domain-data contract extracted from the external application (models/migrations/views/services + runtime evidence). This defines REQUIRED DOMAIN DATA for Management-V1 — NOT a schema copy; storage technology is irrelevant here. Labels: ◆ CODE-CONFIRMED, DB ◧ DATABASE-CONFIRMED, ★ RUNTIME/TEST-CONFIRMED.

## E-01 User (account principal)
- PURPOSE: authentication identity. OWNER: itself. CREATED BY: signup (workers) / createsuperuser (operators).
- LIFECYCLE: created → active (never toggled by app) → deletable only out-of-app.
| Field | Req | Type | Meaning | Default | Notes |
| --- | --- | ---- | ------- | ------- | ----- |
| username | ✔ | string ≤150 (=phone, BR63 BR-004) | login identity | — | unique ◧ |
| password | ✔ | hashed | credential | — | no validators configured (VAL63-013 gap) |
| is_staff / is_superuser | auto | bool | role flags | False | sole role mechanism (6.6 §1) |
- RETENTION: platform-managed.

## E-02 Employee (worker profile)
- PURPOSE: worker identity + payroll/material state holder. OWNER: the worker (self data); operated globally by staff.
- CREATED BY: signup (forced PENDING defaults). UPDATED BY: approve flip; rate form; advance services; archive (legacy counter only).
- LIFECYCLE: PENDING → APPROVED → (no in-app exit). Deletion: CASCADE via user deletion ONLY (out-of-app).
| Field | Req | Type | Meaning | Default | Validation |
| --- | --- | --- | --- | --- | --- |
| name | ✔ | str≤100 | display name | — | required at signup |
| phone | ✔ | str≤15 indexed | identity/login + contact | — | uniqueness via username; format UNVALIDATED (VAL63-012) |
| joining_date | auto | date | hire date | today | stamped once; NEVER used by logic (display-only) ◆ |
| salary_per_saree | ✔ | int ≥0 | per-piece rate ₹ | 0 | validator + view guard |
| advance_salary | ✔ | int ≥0 | outstanding balance ₹ | 0 | validator; writers: give/clear/carry |
| is_approved | ✔ | bool | SM-01 state | False | staff POST only |
| profile_picture | opt | image | media | null | inert in-app (super-admin upload only) |
| performance | opt | str≤20 | free label | "Average" | zero app consumers (vestigial) |
| pagdi_thread_1/2, warp_threads | opt | int | legacy counters | 0 | ZERO consumers (vestigial — do not port) |
| current_week_salary | opt | int | DEPRECATED live counter | 0 | only writer = archive zeroing (BR63 BR-034) |

## E-03 SareeCount (production entry)
- PURPOSE: daily piece output — sole earnings input + material progress source. CREATED BY: staff (two UI forms = one capability). DELETED BY: staff (hard, permanent, unaudited).
- LIFECYCLE: ABSENT→EXISTS→DELETED terminal (SM-03).
| Field | Req | Type | Meaning | Default | Validation |
| --- | --- | --- | --- | --- | --- |
| employee | ✔ | FK→Employee CASCADE | worker | — | must exist; picker=approved only (detail path exception BR63 BR-005) |
| date | ✔ | date indexed | business day | today if blank | ISO strict; past/future allowed (BR63 BR-024) |
| count | ✔ | int ≥0 | pieces | 0 | `<0` rejected; CHECK constraint ◧ |
| notes | opt | text | free note | null | — |
- UNIQUENESS: (employee,date) ◧ — one row per worker-day ★parallel-proven.

## E-04 PagdiHistory / E-05 WarpHistory (material assignments)
- PURPOSE: capacity assignment windows per material type. CREATED BY: staff assign (atomic auto-finish of predecessors). FINISHED BY: reassignment (both) + explicit warp route.
- LIFECYCLE: ACTIVE(end NULL)→FINISHED(date set) terminal in-app (SM-06/07).
| Field | Req | Type | Meaning | Default | Notes |
| --- | --- | --- | --- | --- | --- |
| employee | ✔ | FK CASCADE | assignee | — | approved-only pickers |
| start_date | ✔ pagdi / auto-today warp | date | window start σ | warp=today | ISO validated (pagdi) |
| end_date | opt | date nullable | finish ε | NULL=ACTIVE | set to finish-day; reopen absent in-app |
| capacity_sarees | ✔ | int ≥0 | target C | 0 legal | guarded parse |
| notes | opt | text | note | "" | — |
- INVARIANT: ≤1 ACTIVE per type per worker (race-proven ★).

## E-06 SalaryHistory (weekly ledger row)
- PURPOSE: canonical weekly payroll record + payment register (dual role). CREATED BY: settlement click (birth PAID w/ click-time quantities) OR archive (birth UNPAID canonical). UPDATED BY: payment flags (existing rows); archive refresh (quantity group). DELETION: none in-app; **FK CASCADE with Employee — worker deletion DESTROYS ledger history** ◧ (retention finding → decision D-13).
| Field group | Fields | Writer authority |
| --- | --- | --- |
| keys | employee FK CASCADE, week_start idx, week_end | creation; unique(employee,week_start,week_end) ◧ |
| quantity group (ARCHIVE-only after close) | sarees ≥0, salary_rate ≥0, total_salary_before_advance (signed), advance_salary copy (signed), final_salary (signed) | CALC-007 create-or-refresh |
| payment group (settlement-only) | paid_status bool(False), paid_date date|null, notes text(blank) | mark paid/unpaid; archive never touches |
- Snapshot semantics: C64 §20 two birth paths; §11 frozen-vs-live table.

## E-07..E-09 Audit event logs
AdvanceHistory (ADJUST/CLEAR/CARRY): prev/new amounts, actor (NULL=CLI), note, name snapshot. PagdiChangeHistory / WarpChangeHistory (CREATE/FINISH): capacities, prev/new end dates, actor, snapshot. APPEND-ONLY (no update/delete paths in-app). SURVIVAL: SET_NULL + denormalized names — survive worker/user deletion ★TEST-CONFIRMED (migration 0007).

## E-10 AlertEmail (notification registry)
Single unique email field; CRUD via /admin/; ZERO senders/consumers — INERT (D-09 open). Not required for M-V1 unless notifications become a requirement.

## E-11 Week (implicit entity)
NOT persisted as a row. Represented by ledger rows keyed (week_start,week_end) + CALC-001 derivation. Lifecycle OPEN→ARCHIVED is behavioral (SM-08), marked only by canon-existence + rerun idempotence. No CLOSED flag exists (D-06 open).

## Relationships

| Source→Target | Cardinality | Required | Delete behavior | History behavior |
| ------------- | ----------- | -------- | --------------- | ---------------- |
| User↔Employee | 1-1 | yes | CASCADE both directions effectively | none |
| Employee→SareeCount | 1-N | yes contextually | CASCADE — production history dies with worker ◧ | none survives |
| Employee→PagdiHistory/WarpHistory | 1-N | yes | CASCADE — assignments die | change-events survive (E-07..09) |
| Employee→SalaryHistory | 1-N | yes | **CASCADE — LEDGER DIES** ◧ | ⚠ retention gap D-13 |
| Employee→audit tables | 1-N | no | **SET_NULL + name snapshot preserved** ◧★ | full survival |
| PagdiHistory→PagdiChangeHistory / Warp→WarpChange | 1-N | no | SET_NULL on subject delete | events persist |

## Data lifecycle summary

CREATE→ACTIVE→(MODIFIED within authority groups)→COMPLETED/CANONICAL→no DELETE (ledger/materials) or hard-DELETE (production rows only). Archive never deletes; it freezes/refreshes. Retention: ledger+production intended indefinite BUT production & ledger are cascade-deletable via worker deletion (out-of-app act) — **NOT SPECIFIED policy → BUSINESS DECISION REQUIRED (new D-13: worker-deletion retention policy)**.

## Integrity constraints inventory

unique(username=phone) ◧ · unique(employee,date) ◧ · unique(employee,week_start,week_end) ◧ · AlertEmail.email unique ◧ · PositiveInteger+validators on rate/balance/count/capacity ◧ (CHECK observed crashing pre-fix P4§9) · signed IntegerFields deliberately allow negative ledger values (BR63 BR-013) · nullable: end_date, paid_date, notes, picture · transactional atomicity on every money/material mutation ◆★.

Calculated vs stored: made/remaining/live aggregates ALWAYS calculated (C64); stored values exist ONLY in ledger snapshots + audit events. Single-source formulas mandated for M-V1 (C64 §27).
