# AUDIT_HISTORY_VERIFICATION.md (Phase 10.11)

For every critical mutation the action→event pairing was verified inside the SAME transaction (an event cannot exist without its change and vice versa).

| Mutation | Event asserted | Actor/timestamp/before-after | Evidence |
| -------- | -------------- | ----------------------------- | -------- |
| approve | APPROVE ×1 only (idempotent repeat adds none) | staff actor id/name, occurred_at set | AUD-01 ★ + CC-02 |
| rate change | RATE_CHANGED old→new | staff | trail populated ★ (AUD-02 family) |
| advance give/clear/carry | ADJUST / CLEAR(incl No-op note) / CARRY incl zero-delta rows | prev/new balances captured | AUD-02 adv≥6 events across scenario ★ |
| material assign/auto-finish/explicit finish | CREATE / FINISH with prev-null→date | distinguishable by note | AUD-02 mat events ★ |
| production create/remove | ENTRY_CREATED / ENTRY_REMOVED with full before-image | staff | WF-02 chain ✓ |
| payment flip | PAYMENT_MARKED / PAYMENT_REVERSED | staff | SM-04/05 sequence ✓ |
| archive run | ARCHIVE_RUN event + archive_runs record {created,refreshed,dry_run} | OPERATOR/SYSTEM | runs=3 ★ |

Survival design verified structurally: actor FK SET NULL + name snapshots; NO cascade from domain subjects into audit; immutability via privilege revocation (grant probe ★). Retention: permanent by design; no purge path exists.

Reconstruction question ("who changed what when?"): answerable for EVERY mutation class that flows through services — the external application's gap list is closed here.
