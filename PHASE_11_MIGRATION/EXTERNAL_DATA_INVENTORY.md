# EXTERNAL_DATA_INVENTORY.md (Phase 11.1)

Read-only inspection of the external application's actual data store. Method: Python `sqlite3` opened with `mode=ro` URI (no write handle), plus filesystem metadata and a repo-wide sweep for any alternative data artifact. Bounded single pass.

## Primary store

| Attribute | Value |
| --------- | ----- |
| Path | `serverloom-main/serverloom-main/db.sqlite3` |
| Type | SQLite (by filename convention) |
| Size | **0 bytes** |
| Modified | 2026-08-23 03:26 |
| Header bytes 0–15 | *(none — file is empty; not even the `SQLite format 3` magic exists)* |
| User tables | **0** |
| Row counts | **all zero — no schema has ever been written to this file** |

This proves the file was a never-initialized Django `DATABASES` placeholder: `migrate` was never run against it, and every Phase 4/5 verification exercised throwaway test databases created per-run, leaving no persistent store behind.

## Alternative stores sweep (bounded)

| Probe | Result |
| ----- | ------ |
| `*.sqlite3`, `*.db`, data-bearing `*.sql`, `*.json` under workspace (excluding node_modules/.next/lockfiles) | only config manifests (package.json/package-lock/tsconfig) — no data exports, fixtures, dumps, or backups exist |
| Repo memory from Phases 1–5 | all verification data lived in ephemeral test databases destroyed after each run (documented repeatedly in Phase 4/4.5 reports) |

## Inventory conclusion

Employees: **0** · production records: **0** · advances: **0** · salaries: **0** · materials: **0** · history/audit: **0** · duplicates/orphans/invalid records: **none possible** (no rows exist).

There is no business data — historical or current — anywhere in the external system.
