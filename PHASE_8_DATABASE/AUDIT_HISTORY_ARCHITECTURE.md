# AUDIT_HISTORY_ARCHITECTURE.md (Phase 8.11)

## Storage

Single unified append-only table **audit_events** (ADR-006): one write path, survival columns built-in, typed columns for query + JSONB payload for family specifics. Split into per-family tables later ONLY if query patterns demand (non-breaking migration).

## Event catalog (breadth gated by D-07 sign-off; core money/material events ship first)

| action | entity | before/after payload | actor |
| ------ | ------ | -------------------- | ----- |
| REGISTER | PROFILE | — / defaults | self |
| APPROVE (+ future LIFECYCLE_*) | PROFILE | status transitions | staff (AUD63-008) |
| RATE_CHANGED | PROFILE | old→new rate | staff (AUD63-007 family) |
| ADJUST / CLEAR / CARRY | ADVANCE | prev→new balance (+factor/note) | USER or SYSTEM (AUD63-001..003) |
| ASSIGNMENT_CREATED / FINISHED | MATERIAL | capacities, prev/new end dates, auto vs explicit flag | staff/system-step (AUD63-004/005) |
| ENTRY_CREATED / ENTRY_REMOVED | PRODUCTION | full before-image on remove (AUD63-006) | staff |
| PAYMENT_MARKED / PAYMENT_REVERSED | LEDGER | paid flag/date/note transitions (AUD63-007) | staff |
| ARCHIVE_RUN | ARCHIVE | window, created/refreshed counts, dry-run flag (AUD63-009) | SYSTEM/operator |

Every event records: occurred_at (timestamptz default now()), actor_id (nullable FK→auth.users ON DELETE SET NULL), actor_kind ('USER'|'SYSTEM'), actor_name snapshot, entity_type/entity_id, action, before/after JSONB, note.

## Immutability & durability

- Privileges: INSERT allowed to service write-path only; SELECT superadmin-gated; **UPDATE/DELETE revoked from ALL roles** — immutability enforced by the database independent of application defects.
- Written INSIDE the mutating transaction (atomic visibility: an event never exists without its change, nor vice versa).
- No retention limit, no purge job, no TTL — permanent by design (payroll forensic record).

## Survival guarantees

| Lifecycle event | Effect on audit |
| --------------- | --------------- |
| auth user deleted | actor_id → NULL, actor_name string retained (migration-0007 lesson ported as design) |
| subject row deleted (where policy ever allows) | entity_id nullable/set-null; before-images already capture content |
| schema evolution | additive columns only; JSONB absorbs family-specific fields without breaking history |

Answer to the Phase 5/6 question "can we reconstruct who changed what and when?": **YES for every mutation that flows through services** — the external gaps (unaudited approvals/rate/payments/production/archive-runs) are closed by construction, pending only D-07 breadth confirmation.

## Read surface

Superadmin audit viewer (Phase 7 ownership map): filters entity_type/entity_id/actor/window; ordered IX-11; drill-down via IX-12. Export of audit trails permitted (staff-gated) — read-only, never mutates.

## Anti-cascade guarantee

No FK from audit_events to domain subjects uses CASCADE anywhere; the only FK (actor_id→auth.users) is SET NULL. Accurate destruction of history is impossible through any supported path.
