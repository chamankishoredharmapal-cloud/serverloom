# AUDIT_IMPLEMENTATION.md (Phase 9.10)

Unified append-only `audit_events` (ADR-006). Every mutation emits INSIDE its transaction — audit and change are atomic; neither can exist without the other.

| Mutation | Event(s) emitted | Actor semantics |
| -------- | ---------------- | --------------- |
| register | REGISTER | self |
| approve / lifecycle set | APPROVE / LIFECYCLE_SET | staff |
| rate change | RATE_CHANGED (old→new) | staff |
| advance give/clear/carry | ADJUST / CLEAR (incl. deliberate no-op) / CARRY (incl. zero-delta) | USER or SYSTEM(cron) |
| material assign/finish | CREATE / FINISH (auto vs explicit distinguishable by note) | staff/system-step |
| production create/remove | ENTRY_CREATED / ENTRY_REMOVED (full before-image) | staff |
| payment flip | PAYMENT_MARKED / PAYMENT_REVERSED | staff |
| archive run | ARCHIVE_RUN (window, created, refreshed, dry-run flag) + archive_runs row | OPERATOR/SYSTEM |

Captured per event: occurred_at · actor_id (SET NULL on identity deletion) · actor_kind USER/SYSTEM · actor_name snapshot · entity_type/entity_id · before/after JSONB · note.

Survival: no CASCADE anywhere near history; immutability enforced by privilege revocation verified at runtime. Read surface: superadmin viewer with entity filter (/admin/audit) + exportable via standard tooling later.

External gaps closed: AUD63-006 (production add/delete) · 007 (rate changes + payment flips) · 008 (identity events) · 009 (command trails via ARCHIVE_RUN rows). Breadth sign-off remains D-07.
