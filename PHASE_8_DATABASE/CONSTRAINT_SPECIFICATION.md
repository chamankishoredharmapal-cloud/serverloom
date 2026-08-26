# CONSTRAINT_SPECIFICATION.md (Phase 8.8)

Every business invariant from Phase 6, with its enforcement home. Classification: DATABASE ENFORCED / SERVICE ENFORCED / BOTH / NOT DATABASE-SUITABLE. Principle: invariants that protect money/history live in the database; workflow sequencing lives in services.

| # | Invariant | Class | Mechanism |
| - | --------- | ----- | --------- |
| C-01 | one production entry per worker per day | **DATABASE** | UNIQUE (worker_id, work_date) [partial form if soft-delete activates]; service catches unique violation → DuplicateError (friendly BR-003 UX) |
| C-02 | count ≥ 0; rate ≥ 0; capacity ≥ 0; balance ≥ 0 | **DATABASE** | CHECK constraints on columns (input UX duplicated at Zod/service edge — validation applies to INPUTS only) |
| C-03 | ≤1 ACTIVE material per worker per type — even under races | **DATABASE** | partial UNIQUE INDEX (worker_id, material_type) WHERE finished_on IS NULL; assign RPC orders finish-updates before insert inside one tx so the index is never the first rejector |
| C-04 | week window well-formed (end = start + 6) | **DATABASE** | CHECK on weekly_ledger |
| C-05 | one ledger row per worker-week | **DATABASE** | UNIQUE (worker_id, week_start, week_end); settlement uses UPSERT → structural idempotency (BR-018) |
| C-06 | archive = sole writer of quantity columns | **SERVICE (+DB option)** | exclusive ArchiveService RPC owns those UPDATEs; optional trigger guard rejecting quantity writes outside archive context = ADR-007(b) defense-in-depth if review ever shows violation. Column-level grants alone are not clean in PG → classified SERVICE-primary |
| C-07 | settlement = sole writer of payment group | **SERVICE (+DB option)** | symmetric to C-06 (SettlementService RPC) |
| C-08 | archive preserves payment state; never touches balances | **DATABASE-SUITABLE OPTION + SERVICE** | column-list discipline in freeze RPC; trigger guard option compares OLD/NEW payment+balance cols and aborts on change when canonical=true — adopted if D-07 signs off belt-and-suspenders |
| C-09 | negative final_pay legal; NEVER clamped anywhere | **BOTH (by omission)** | signed columns deliberately UNCHECKED; code review rule forbids abs()/clamp in any consumer (BR-013 pinned) |
| C-10 | advance give > 0 only; clear/carry semantics incl. audited no-ops; truncation-toward-zero carry math | **SERVICE** | AdvanceService RPCs: input check, row lock (SELECT … FOR UPDATE), exact-math helper (ADR-008), unconditional audit rows incl. zero-delta cases |
| C-11 | login requires status ACTIVE | **SERVICE + claims** | AuthService refuses session for ≠ACTIVE (BR-022); RLS assumes role claims only exist post-login — pending workers hold no session at all |
| C-12 | worker sees ONLY own rows; worker role cannot mutate domain data | **DATABASE** | RLS: SELECT policies `worker_id = auth.uid()` (or profiles.id = auth.uid()); no INSERT/UPDATE/DELETE grants to worker claim on domain tables (BR-035) |
| C-13 | staff operational writes only via controlled paths | **DATABASE+SERVICE** | staff JWT role checked by middleware AND re-checked inside security-definer RPCs; broad table grants withheld from direct client roles |
| C-14 | audit tables append-only forever | **DATABASE** | privileges: INSERT to service path only; SELECT superadmin; UPDATE/DELETE denied to ALL (incl. service_role usage patterns); survival via SET NULL actor FK + name snapshot |
| C-15 | finished material never reopens through the app | **SERVICE (absence)** | no reopen RPC exists; DB permits end_date edit only via finish RPC which re-checks active state UNDER LOCK (SBG-01 lesson). Direct SQL edits = out-of-band, audit-visible via canonical flags absent |
| C-16 | settlement scope = current week only | **SERVICE** | bounds derived exclusively from lib/domain/week.ts(today); archived-window flips blocked pending D-03 policy flag |
| C-17 | archive run idempotency | **DATABASE+SERVICE** | C-05 upsert + advisory lock key 'archive:<week>' preventing concurrent runs + run-record report {created, refreshed} |
| C-18 | phone uniquely identifies a profile | **DATABASE** | UNIQUE(phone) |
| C-19 | valid status/role/enum values | **DATABASE** | CHECK IN lists (extensible via migration = D-01 process) |
| C-20 | forged/nonexistent ids fail closed | **DATABASE** | FK constraints; services map to NotFound (no 500-class OBS-SM-01 pattern ported) |

## Explicitly NOT database-suitable

Weekly-bounds derivation (pure function CALC-001), export pricing strategy (D-08 seam), slip/PDF content (D-11), cron cadence (D-06), carry automation guard policy (D-04) — all workflow/policy concerns owned by services/config.

## Enforcement test obligations

Every C-row marked DATABASE must appear in the migration-policy test suite: attempt violation via raw SQL under service credentials ⇒ expect constraint error; attempt via correct RPC ⇒ expect success. This converts Phase 6 EC matrix rows into executable policy tests.
