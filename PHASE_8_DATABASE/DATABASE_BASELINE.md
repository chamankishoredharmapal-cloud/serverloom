# DATABASE_BASELINE.md (Phase 8.0)

## Verdict

**Management-V1 database: DOES NOT EXIST (verified greenfield).**

Three independent discovery sweeps (Phase 7 session, Phase 8 blocker session, this session) found zero Management-V1 source, manifests, migrations, or database artifacts anywhere accessible:

| Probe | Result |
| ----- | ------ |
| Workspace root recursive inventory | external Django app (`serverloom-main/serverloom-main`) + PHASE_6/7/8 doc trees ONLY |
| `C:\Users\siddh\Downloads` recursive depth-4 | exactly one `package.json` — unrelated e-commerce HTML template |
| User-profile dirs matching manage/v1/loom/supabase/next | `Campus-Event-Manager` (different project) only |
| Desktop/Documents/Projects/dev/code + OneDrive dirs | AI-tool workspaces, webcam shortcuts; no web repos |
| `C:\Users\siddh\.supabase` | CLI telemetry traces only (2026-08-15..21) — CLI installed at some point, NO project config, NO `config.toml`, NO migrations dir |
| `.claude/projects`, kimi/codex/cline workspaces | no project records pointing to an MV1 codebase |

Labels: NOT FOUND × all current-state cells — evidence of absence is itself the audit finding (see CURRENT_DATABASE_AUDIT.md).

## What this baseline therefore records

| Item | Status |
| ---- | ------ |
| Database engine | NONE EXISTS → target selection is a GREENFIELD decision (Stage 8.4–8.5) |
| Provider | NONE |
| Environments | NONE (no dev/staging/prod separation exists yet) |
| Migrations / schema / tables / constraints / indexes / RLS / triggers / RPCs / views | ZERO — nothing to document beyond absence |
| Existing data | ZERO rows possible (no store) |
| Backups | NONE (nothing backed up) |
| Access layer / ORM | NONE |
| Secrets | NONE present (nothing leaked, nothing to rotate) |

## Adjacent evidence-only databases (NOT Management-V1)

| Store | Role | Reuse in decision? |
| ----- | ---- | ------------------ |
| `serverloom-main/serverloom-main/db.sqlite3` (external app, SQLite) | Phase 3–6 BEHAVIOR evidence only | Schema/concurrency/locking explicitly NOT inherited (Phase 8 RULE 1) |
| Disposable QA SQLite files under `%TEMP%\opencode` | Phases 4.5–6.6 test fixtures, deleted after use | none |

## Consequence for the phase

Stages 8.1+ proceed against the Phase 6 requirements authority and Phase 7 architecture authority with Current-MV1 = verified-absent. The platform decision (8.5) is a first-time adoption decision, not a retention/migration decision. Migration planning (8.14) resolves to "NO EXISTING DATA MIGRATION REQUIRED" with the external-app import path documented as optional and unjustified by any current requirement.

Secrets exposure check: this document contains no credentials because none exist. DATABASE URLs: none exist.
