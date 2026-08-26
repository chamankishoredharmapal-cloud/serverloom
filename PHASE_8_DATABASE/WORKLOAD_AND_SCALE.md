# WORKLOAD_AND_SCALE.md (Phase 8.3)

## Measured vs estimated

Measured production data: NONE exists (greenfield). All figures below are ESTIMATEs derived from Phase 6 domain facts (single workshop, tens of workers, weekly cadence) and labeled as such. No infrastructure will be justified by invented scale.

## Projected workload

### Write profile (the demanding dimension)

| Operation | Frequency | Rows/statement | Contention |
| --------- | --------- | -------------- | ---------- |
| production entry insert | ≤ ~100/day peak (staff batch entry), typically 10–50 | 1 (+audit row) | worker-day uniqueness only |
| advance give/clear/carry | a few/day | 1 balance + 1 event | same-worker serialization required |
| material assign/finish | few/week | 1–3 rows + events | same-worker ONE-ACTIVE invariant |
| settlement markPaid/Unpaid | weekly burst: ≤ workers × 2 over a day | 1 upsert + event | same-worker-week single-row |
| archive freezeWeek | weekly (or manual catch-up) | ≤ workers × 1 upsert in ONE tx + run record | whole-run advisory lock |
| auth/session writes | continuous but tiny | provider-managed | provider concern |

Peak realistic concurrent writers: 1–3 staff members clicking in the same minute. Peak tx size: archive over ≤100 workers × 6 column updates — microseconds each, trivially fast.

### Read profile

Worker self-pages (own rows, indexed), staff grid (≤100 aggregate rows), history pages (paged-by-week naturally small), exports (full-table scans over « 1 GB, streamed, occasional). Zero read pressure at scale.

### Growth

Dominant table = audit_events ≈ ≤100k rows/yr ESTIMATE. Five-year total DB « 1 GB. No blob storage in DB (exports streamed).

## Classification

**WORKLOAD: SMALL** — justified by: single-workshop domain (Phase 6 NFR-SCAL), integer payloads, weekly cadence, tens of actors, five-year volume under 1 GB. Nothing here approaches engine limits of any candidate platform; the decision therefore hinges on integrity/concurrency FEATURES, security enforcement, managed recovery, and TCO — not raw capacity.

## Infrastructure implications

| Candidate need | Verdict | Reason |
| -------------- | ------- | ------ |
| PostgreSQL-class features | REQUIRED | partial unique index, RLS, RPC transactions, CHECK discipline (DATABASE_REQUIREMENTS §4–5) |
| SQLite | VIABLE on raw capacity alone (« 1 GB, low concurrency) | fails networked multi-user access, server-enforced row isolation (no RLS), managed backups, and Phase 7 security layering — see comparison 8.4 for the fair full treatment |
| Caching layer | NOT JUSTIFIED | reads are trivial aggregates; Phase 7 TD-10 REJECT stands |
| Read replicas | NOT JUSTIFIED | read load negligible |
| Queues / background workers beyond cron-archive | NOT JUSTIFIED | one scheduled job candidate (archive, D-06) + manual ops |
| Connection pooling | NICE-TO-HAVE | provider-supplied pooling suffices (Supabase/Neon include it) |

## Capacity headroom statement

If the business later multiplies workshops (multi-tenancy is an explicit Phase 7 non-goal), the SAME Postgres schema scales orders of magnitude before any re-architecture; exit path is standard pg_dump → any Postgres (see DATABASE_DECISION.md §exit).
