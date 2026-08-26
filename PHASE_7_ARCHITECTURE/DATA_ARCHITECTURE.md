# DATA_ARCHITECTURE.md (Phase 7.6)

Management-V1 domain model derived from Phase 6 DATA_REQUIREMENTS (E-01..E-11) — a REQUIREMENTS-driven design, not a schema copy. Storage: PostgreSQL (Supabase-managed presumed — ADR-001). Types: `timestamptz`, `date`, `bigint`/`integer`, `numeric` where exactness demanded, `text`, `boolean`, `enum`s as CHECK-constrained text (migration-friendly). Labels: constraint ◧-equivalent = DATABASE-ENFORCED in target.

## Tables

### profiles (E-01/E-02 merged identity+worker)
| column | type | rules |
| ------ | ---- | ----- |
| id | uuid PK | = auth user id (1-1) |
| full_name | text NOT NULL | |
| phone | text NOT NULL UNIQUE | identity display + search; format validation at service layer (VAL-012 policy D-10) |
| status | text NOT NULL DEFAULT 'PENDING' CHECK IN ('PENDING','ACTIVE','INACTIVE','SUSPENDED') | SM-01 extensible machine (D-1-ready; boolean replaced) |
| salary_rate | integer NOT NULL DEFAULT 0 CHECK ≥0 | BR-006 |
| advance_balance | integer NOT NULL DEFAULT 0 CHECK ≥0 | sole writers: AdvanceService |
| joined_on | date NOT NULL DEFAULT today | display-only (parity with external semantics) |
| created_at/updated_at | timestamptz | |
- Retained-by-design omissions: thread counters, performance label, current_week_salary, profile_picture (all vestigial/inert per Phase 6) — NOT APPLICABLE.

### production_entries (E-03)
id uuid PK · worker_id FK→profiles · work_date date NOT NULL · count integer NOT NULL CHECK≥0 · note text NULL · **deleted_at timestamptz NULL, deleted_by uuid NULL, delete_reason text NULL** (D-02 soft-delete reserve — behavior pending decision; default contract treats rows as live unless decision activates soft mode) · created_at.
CONSTRAINTS: UNIQUE(worker_id, work_date) ◧ (live-row uniqueness enforced via partial index WHERE deleted_at IS NULL if soft-delete activated — decision point recorded); INDEX (worker_id, work_date).

### material_assignments (E-04/E-05 unified)
id uuid PK · worker_id FK→profiles · material_type text CHECK IN ('PAGDI','WARP') · started_on date NOT NULL · finished_on date NULL · capacity integer NOT NULL CHECK≥0 · note text NULL · created_at/updated_at.
INVARIANT: **partial UNIQUE INDEX (worker_id, material_type) WHERE finished_on IS NULL** ◧ — one-ACTIVE invariant enforced by DATABASE regardless of caller (supersedes external app-lock-only approach; SBG-01-class races structurally impossible).
Difference preservation: warp assign forces started_on=today at service layer; pagdi requires explicit date.

### weekly_ledger (E-06)
id uuid PK · worker_id FK→profiles · week_start date NOT NULL · week_end date NOT NULL ·
quantity group: pieces integer ≥0 · rate integer ≥0 · gross integer ≥0 · advance_applied integer (signed) · final_pay integer (signed) ·
payment group: paid boolean NOT NULL DEFAULT false · paid_on date NULL · settlement_note text NULL ·
canonical boolean NOT NULL DEFAULT false · source text CHECK IN ('SETTLEMENT','ARCHIVE') · run_note text NULL · created_at/updated_at.
CONSTRAINTS: UNIQUE(worker_id, week_start, week_end) ◧ · CHECK week_end=week_start+6.
AUTHORITY SPLIT (mechanism): quantity columns updated ONLY inside ArchiveService RPC; payment columns ONLY inside SettlementService RPC; enforced by ownership + RLS/service-role separation + code review gate (DB cannot column-grant within a row to one role cleanly without triggers — ADR-007 documents trigger-based enforcement OPTION).
FK DELETE BEHAVIOR: worker deletion → **D-13 OPEN**: Option A RESTRICT (protect ledger; require offboard flow), Option B CASCADE (external parity; history loss), Option C soft-delete worker (recommended default per Phase 6 evidence of retention value). NOT silently chosen.

### advance_events / audit_events (E-07..09 unified approach — ADR-006)
Option A (chosen default): single append-only `audit_events`: id, occurred_at, actor_id NULL, actor_kind ('USER','SYSTEM'), actor_name snapshot, entity_type, entity_id NULL, action TEXT, before JSONB NULL, after JSONB NULL, note text. UPDATE/DELETE denied by RLS/privileges ◧. Worker/user deletion → actor_id SET NULL, actor_name retained (survival requirement).
Money/material families may later be split into typed tables; the single-table start satisfies all AUD contracts with one write path.

### alert_recipients (E-10) — DO NOT CREATE until D-09 resolved.

### Weeks — NO table (implicit, parity with external). Derived via CALC-001; ledger rows instantiate weeks.

## Relationship & lifecycle map
profiles 1—N production_entries / material_assignments / weekly_ledger / audit_events(actor) · material_assignments self-history via rows (no reopen path in-app; D-05 adjacent) · weeks implicit.

## Calculated vs stored
Stored: ledger snapshots (quantity group at freeze/settlement-create), balances, rates, capacities/dates. ALWAYS calculated live: current-week figures (CALC-002/009), made/remaining (CALC-003/004), export repricing (CALC-008 per strategy). No derived column is hand-maintained outside its owning service.

## Transactional boundaries (documented obligations)
give/clear/carry: row-lock (SELECT … FOR UPDATE) + balance write + event insert — ONE tx.
assign: lock candidate actives + finish-updates + insert new + events — ONE tx (unique index backstops).
settlement markPaid: UPSERT ledger + event — ONE tx.
archive freezeWeek: whole-roster tx; advisory lock key 'archive:<week>' to prevent concurrent archive runs; production-insert window handled per SBG-02 obligation (serialize stream or document rerun-repair).

## Retention & deletion matrix
production_entries: deletable per correction model (D-02 depth). weekly_ledger: never deleted in-app; FK behavior per D-13. audit_events: permanent. material_assignments: permanent history. profiles: deactivation (status) preferred over deletion; hard delete BLOCKED while dependents exist unless D-13=CASCADE chosen explicitly.

## Index plan
profiles(phone) unique · production_entries(worker,date) unique-partial · material_assignments partial-active unique + (worker,start) · weekly_ledger(worker,week_start) unique + (week_start) for ops scans · audit_events(occurred_at DESC),(entity_type,entity_id).

## Open-decision hooks (not silently resolved)
D-01 status enum values beyond ACTIVE/PENDING · D-02 soft vs hard production delete (columns reserved) · D-03 archived-week payment flips (service guard flag) · D-08 pricing strategy storage (entry-rate column IF historical basis chosen — schema change documented, not applied) · D-13 FK behavior (RESTRICT/CASCADE/soft-worker) · D-14 session TTL (auth config, not schema).
