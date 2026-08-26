# INDEX_STRATEGY.md (Phase 8.9)

Indexes exist to serve named query patterns (from Phase 6 REP/workflow specs + Phase 7 service contracts). No index created "because columns exist." Write overhead noted; SMALL workload makes all overheads trivial but redundancy still avoided.

| # | Table | Index | Uniqueness | Serves | Benefit | Overhead | Type |
| - | ----- | ----- | ---------- | ------ | ------- | -------- | ---- |
| IX-01 | profiles | UNIQUE (phone) | YES | FR-013 search `q` ILIKE phone; identity resolution BR-004 | point lookups + dup prevention | negligible | required |
| IX-02 | profiles | (status) [plain] | NO | admin pending-counters (F-12), roster filters, approval queue | tiny table — arguably freehand scan OK; kept for intent clarity | negligible | optional |
| IX-03 | production_entries | UNIQUE (worker_id, work_date) — or partial WHERE deleted_at IS NULL post-D-02 | YES | C-01 invariant + detail-page day lookup (FR-014) + duplicate rejection | constraint IS the index | minimal | required |
| IX-04 | production_entries | (worker_id, work_date DESC) included in IX-03 ordering | — covered by IX-03 | own-history page sort (FR-007/REP-007) | avoids separate index; B-tree already ordered by work_date within worker | none extra | covered |
| IX-05 | production_entries | (work_date) | NO | archive freezeWeek window scan `WHERE work_date BETWEEN` + weekly grid aggregation (CALC-002 Q) | range scan over day-slice instead of full table as table grows years-deep | small write cost | required |
| IX-06 | material_assignments | partial UNIQUE (worker_id, material_type) WHERE finished_on IS NULL | YES(partial) | C-03 ONE-ACTIVE + active-material counters (F-12) + my-active lookups (FR-008/009) | invariant enforcement itself | tiny (few live rows) | required |
| IX-07 | material_assignments | (worker_id, started_on DESC) | NO | progress/history lists (REP-007 sections, admin lists F-18/F-20) | ordered scans | negligible | required |
| IX-08 | weekly_ledger | UNIQUE (worker_id, week_start, week_end) | YES | C-05 invariant + markPaid UPSERT target lookup | constraint IS the index | negligible | required |
| IX-09 | weekly_ledger | (week_start) | NO | admin salary history sorted −week_start (REP-002a), archive window checks, missed-week detector | range/order scans | negligible | required |
| IX-10 | weekly_ledger | (paid) WHERE paid = false [partial] | NO(partial) | ops view "unsettled weeks" if ever needed | micro | negligible | optional (defer until a real screen needs it) |
| IX-11 | audit_events | (occurred_at DESC) | NO | audit viewer default ordering | list pagination | append-only table: cost acceptable, mandated by read contract | required |
| IX-12 | audit_events | (entity_type, entity_id) | NO | per-object forensic drill-down ("who touched this worker/ledger row") | filtered history | 2-col btree on dominant table — largest write overhead in system; justified by AUD63 read requirement | required |
| IX-13 | archive_runs | (week_start, week_end) | NO | rerun/dry-run history queries per window | small | negligible | optional |

## Anti-index decisions (documented restraint)

- No index on production_entries(note)/weekly_ledger(settlement_note): never queried.
- No trigram/GIN text index for search: `q` ILIKE over ≤ hundreds of names performs fine sequentially; revisit only if workforce grows ×100.
- No composite (worker_id) standalone indexes where a UNIQUE composite already leads with worker_id (IX-03/IX-08 cover).
- JSONB GIN on audit payload: deferred — queries target typed columns (entity/action/occurred_at), not arbitrary JSON paths.

## Migration-time verification

Each IX row maps to an EXPLAIN-plan assertion in the schema test suite (index used vs seq-scan threshold) so drift is caught when volume eventually grows.
