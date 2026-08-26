# BACKUP_RECOVERY_PLAN.md (Phase 8.13)

Platform: Supabase PostgreSQL per DATABASE_DECISION. Principle honored: backup ≠ recovery — a restore DRILL is part of the plan, not an afterthought.

## Backup architecture

| Layer | Mechanism | Frequency | Retention | Scope |
| ----- | --------- | --------- | --------- | ----- |
| L1 provider snapshots | Supabase automated daily backups | daily | 7 days (Pro) | full DB |
| L2 PITR (OPTIONAL add-on) | WAL-based point-in-time | continuous | per add-on window | any second in window — adopt only if owner sets RPO < 24h (BUSINESS DECISION REQUIRED) |
| L3 operator logical dumps | scheduled `pg_dump` (GitHub Action/cron) to PRIVATE storage bucket + optional second region copy | weekly (and before every migration) | 8 weekly + 12 monthly | engine-independent escape hatch; doubles as provider-exit artifact |
| L4 pre-migration snapshot | manual dump + schema tag | every migration run | permanent for that version | rollback anchor |

Encryption: at rest by platform; dump artifacts encrypted at rest in bucket (bucket private, signed short-lived URLs only). Off-site: L3 second location satisfies it.

## RPO / RTO

| Scenario | RPO | RTO | Path |
| -------- | --- | --- | ---- |
| accidental row/data error today | ≤24h (L1) or seconds (L2 if adopted) | ≤1h | restore snapshot to shadow project → targeted export/reimport or full cutover |
| provider regional outage | ≤24h | hours–days (provider-dependent) | wait for provider OR promote L3 dump into alternate Postgres (Neon/Crunchy/self-VPS) + repoint DATABASE_URL |
| bad migration | 0 | minutes | L4 pre-migration dump; migrations staging-first gate |
| catastrophic account loss | ≤7 days | hours | L3 dumps in independent storage |

Formal RPO/RTO targets remain BUSINESS DECISION REQUIRED (Phase 6 NFR-BAK: nothing specified externally; nothing invented as requirement). Table above = engineering recommendation pending sign-off.

## Restore process (runbook obligations)

1. Freeze writes (maintenance note) → 2. create shadow project/DB → restore selected artifact → 3. run validation suite (row-count invariants: ledger uniqueness, balance ≥0 CHECK pass, audit append-only intact; sample payroll spot-checks vs last known grid) → 4. repoint app / re-import surgical slice → 5. unfreeze.

## Restore testing (mandatory)

Quarterly drill: restore latest L1 snapshot into disposable project, execute validation checklist, record evidence + timings in ops log. Annual drill: full L3-dump → alternate-provider Postgres promotion (validates the exit path, not just the backup). A drill without recorded evidence counts as NOT DONE.

## Failure scenarios covered

human error (PITR/snapshot), bad deploy (L4), provider loss (L3 cross-provider), storage corruption (platform durability + L3), ransom/account compromise (separate storage credentials for L3 bucket; service-role key rotation procedure).

## SQLite-comparison footnote

For completeness per prompt: had SQLite been chosen, this entire managed stack would reduce to file-copy rituals with WAL-checkpoint hazards and no PITR — one more reason it failed the recovery requirement (DATABASE_OPTIONS_COMPARISON Option D).
