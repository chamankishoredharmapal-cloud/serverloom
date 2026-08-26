# DEPLOYMENT_ARCHITECTURE.md (Phase 7.8)

CURRENT state: **NOT FOUND** — no Management-V1 repository, hosting config, CI, or environment files exist in the accessible environment (baseline §1). Everything below is TARGET design with CURRENT/TARGET/OPTIONAL/NOT DECIDED labels. No changes made in this phase.

## Topology (TARGET)

| Concern | Target | Label |
| ------- | ------ | ----- |
| Web app (UI + server layer) | Vercel (Next.js). Preview envs per PR; staging project; production project | TARGET (primary option) |
| Database | Supabase Postgres (dedicated project per env: dev/stage/prod) | TARGET |
| Auth | Supabase Auth | TARGET |
| Storage | Supabase Storage PRIVATE bucket for generated exports/slips (signed URLs) | OPTIONAL (stream-only is valid v1) |
| Scheduled jobs | Vercel Cron → protected route w/ CRON_SECRET → ArchiveService.runWeek(today) | TARGET pending D-06 owner/cadence decision; MANUAL console is acceptable interim |
| Operator commands | Ops console page (superadmin) calling guarded server actions; CLI alternative via service-role script kept OUT of client | TARGET |
| Email/notifications | none until D-09 decided | NOT DECIDED |
| Logging | platform logs + structured app logs (no PII/secrets) | TARGET |
| Monitoring/alerts | uptime check on health route; error alerts to owner channel | OPTIONAL |
| Backups | Supabase PITR ON + weekly logical dump to private storage + quarterly restore drill | TARGET (recommendation) |
| Secrets | Vercel env vars (per env): DATABASE/SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY, CRON_SECRET; boot-time validation fail-fast | TARGET |
| CI/CD | GitHub Actions: typecheck+lint+unit on PR; migration dry-run check; deploy via Vercel integration; DB migrations applied via versioned SQL migrations tool with staging-first gate | TARGET |
| Local development | supabase local stack or branch DB; seed fixtures mirroring Phase-6 worked examples (Alpha/Gamma/Beta) | TARGET |

## Environments
dev (local) → staging (stage DB + cron disabled or sandboxed) → production. Promotion: PR → preview → manual promote; migrations NEVER auto-applied to prod without recorded run.

## Operational runbook obligations (from Phase 6)
Weekly archive procedure (owner D-06): dry-run first, then commit; missed-week detector alert (current week > last archived +7d ⇒ notify).
Carry: operator-gated; if ever automated → once-per-period guard table mandatory (D-04).

## Non-goals
No infra created in this phase; no secrets rotated; no DNS/domain actions.
