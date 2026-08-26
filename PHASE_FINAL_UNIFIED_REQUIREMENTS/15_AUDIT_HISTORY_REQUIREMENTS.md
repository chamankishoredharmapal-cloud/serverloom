# 15_AUDIT_HISTORY_REQUIREMENTS.md

Unified append-only `audit_events`; one emission path inside every mutating transaction.

## Required events (breadth ships; final breadth = D-07 sign-off)

REGISTER · APPROVE/LIFECYCLE_SET · RATE_CHANGED · ADJUST/CLEAR/CARRY · ASSIGNMENT_CREATE/FINISH(auto|explicit) · ENTRY_CREATED/REMOVED(before-image) · PAYMENT_MARKED/REVERSED · ARCHIVE_RUN(window,counts,dry_run).

## Per-event contract
actor_id (SET NULL on identity deletion) · actor_kind USER/SYSTEM · actor_name snapshot · entity_type/id · occurred_at · before/after JSONB where meaningful · note.

## Immutability & retention
UPDATE/DELETE revoked for ALL roles including service paths; retention permanent; no purge job exists or may be added without a new decision. Survival: identity deletion nulls actor_id but retains name; subject deletion never cascades into events.

## Reconstruction guarantee
"Who changed what, when, from what to what, why" is answerable for approvals, rate changes, advances, materials, production corrections, payment flips, and archive runs — the external app's silent gaps are closed requirements here (pending D-07 breadth confirmation which can only ADD events).

Read surface: superadmin viewer (+filters); exports may copy trail data read-only.
