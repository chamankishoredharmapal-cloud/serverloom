# DATABASE_REQUIREMENTS.md (Phase 8.1)

Derived strictly from Phase 6 authority + Phase 7 architecture. Every requirement carries its source ID. Estimates are labeled ESTIMATE; unresolvables are BUSINESS DECISION REQUIRED.

## 1. Data volume (all figures ESTIMATE — no measured data exists)

Single workshop; workforce in tens (Phase 6 NFR-SCAL evidence class).

| Entity | Steady-state size | Yearly growth |
| ------ | ----------------- | ------------- |
| workers (profiles) | 10–100 | low single digits/yr |
| production_entries | ≤100/day peak × ~300 workdays ≈ ≤30k/yr | ~30k rows/yr worst case |
| material_assignments | ≤2 per worker per week ≈ ≤10k/yr | slow |
| weekly_ledger | workers × 52 ≈ ≤5k rows/yr | linear, permanent |
| audit_events | dominant table ≈ ≤100k/yr upper bound | permanent (append-only) |

Total DB size after 5 years: « 1 GB (integer payloads, no blobs; exports/PDFs streamed not stored). Comfortably inside even free-tier limits; 8 GB Supabase Pro allocation is years of headroom.

## 2. Concurrency (from Phase 6 CC evidence + workflow reality)

- Simultaneous users: 1–10 staff/operators + up to ~100 workers reading own pages. ESTIMATE per workshop scale.
- True write contention points (must be SAFE BY CONSTRUCTION):
  - concurrent mark-paid on same worker-week (CC-J proven need: exactly-one-row)
  - concurrent advance give/clear/carry on same worker (serialized exact sums)
  - concurrent material assign → ONE ACTIVE invariant (CC-1/CC-2)
  - concurrent archive runs (idempotency BR-018)
  - duplicate worker-day inserts (unique backstop)
- Read concurrency: trivial (weekly aggregates over tens of rows).
→ Requirement: real transactional engine with row-level locking + constraint-based conflict resolution. Multi-process network access required (staff desktop + worker mobile browsers ≠ single-host file access).

## 3. Transactions (atomicity obligations)

| Operation | Atomic unit | Source |
| --------- | ----------- | ------ |
| give/clear/carry | balance read-lock → write → audit event | BR-007/008, AUD63-001..003 |
| material assign | lock actives → finish-updates → insert new → CREATE/FINISH events | BR-009/010 |
| explicit finish | active re-check UNDER LOCK → end-date write → FINISH event | SBG-01 lesson |
| settlement markPaid | ledger UPSERT (create-path snapshot vs flags-only) → payment event | C64 §20, AUD63-007 |
| archive freezeWeek | whole-roster quantity refresh + run record, payment columns excluded | BR-014..018 |
| production create/remove | entry write (+audit) with unique-violation catch | BR-003, AUD63-006 |
| registration | auth identity + profile row together | FR-001/BR-025 |

## 4. Integrity (database-enforceable set)

- UNIQUE(worker_id, work_date) live rows — BR-003
- UNIQUE(worker_id, week_start, week_end) — BR-018/C64
- PARTIAL UNIQUE(worker_id, material_type) WHERE finished_on IS NULL — BR-009 one-ACTIVE
- CHECK ≥0 on count/rate/capacity/balance/factor-inputs; signed ledger money fields legal — BR-002/006/011/013
- CHECK week_end = week_start + 6; status enum CHECK — CALC-001 discipline, SM-01/D-01
- FK integrity w/ deliberate delete behaviors — D-13 policy
- Append-only audit tables (no UPDATE/DELETE path) — AUD63 series
- phone UNIQUE identity — BR-004

## 5. Security

- Auth-linked row identity (worker sees OWN rows only) enforced AT DATABASE level — BR-035, SEC63 series, Phase 7 X-02
- Role-differentiated access (worker SELECT-only; staff operational writes via controlled paths; superadmin reads audit) — ROLE_PERMISSION_SPECIFICATION
- No service-role/secret material client-side — Phase 7 SECURITY_ARCHITECTURE §6
- TLS in transit + encryption at rest — Phase 7 IMPROVE items
- Audit immutability enforced independent of application bugs — Phase 7 X-01

## 6. History

Permanent, queryable: weekly_ledger snapshots (quantity group frozen by archive; payment group by settlement), material_assignments full lifecycle, audit_events forever, production corrections trail (AUD63-006), rate-change history via events (BR-039 semantics: live reprice vs frozen snapshots — D-08 strategy seam).

## 7. Reporting

Aggregations: SUM(count) per worker-window (CALC-002/003 inputs), per-worker-per-week joins, all-time exports ordered per sheet spec (REP-005/006), single search filter `q` ILIKE name/phone (FR-013). All trivially index-servable at this scale. No OLAP, no full-text, no vectors.

## 8. Recovery

- RPO/RTO: **BUSINESS DECISION REQUIRED** (Phase 6 NFR-BAK explicitly NOT SPECIFIED). Working targets used for comparison only: RPO ≤ 24h minimum / ≤ 5min desirable (PITR); RTO ≤ 4h. Not requirements until owner signs.
- Mandatory capability: automated scheduled backups + tested restore path (Phase 7 DEPLOYMENT_ARCHITECTURE; Phase 6 principle "backup ≠ recovery").

## 9. Non-functional envelope

PostgreSQL-native features REQUIRED by design: partial unique indexes, CHECK constraints, row-level security, security-definer functions/RPCs, advisory locks, `timestamptz`. Managed availability preferred (solo operator). Vendor exit = plain Postgres dump/load.
