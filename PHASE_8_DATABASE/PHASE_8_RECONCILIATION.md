# PHASE_8_RECONCILIATION.md (Phase 8.18)

Independent self-challenge of the database decision and schema against Phase 6 + Phase 7 authority. Method: attack each load-bearing claim; hunt for the contradiction classes listed in the prompt. Never averaged conflicting findings.

| # | Potential contradiction | Analysis | Determination |
| - | ----------------------- | -------- | ------------- |
| R-1 | Prompt expected "actual MV1 repo available" → none found | Three-session evidence-of-absence register (CURRENT_DATABASE_AUDIT); user directive to resume interpreted as: audit performed ⇒ result = verified greenfield | RESOLVED — decision issued as first-adoption, current-state cells uniformly NOT FOUND, never fabricated |
| R-2 | Phase 6 requires DB-enforced employee isolation → does chosen platform provide it? | Supabase RLS with auth.uid() claims is the native mechanism (SECURITY doc §RLS floor); policy-test obligation attached | CONSISTENT |
| R-3 | ONE-ACTIVE invariant vs concurrent assign RPCs | Partial unique index makes violation physically impossible regardless of interleaving; assign RPC ordering prevents index-as-first-rejector UX issues | RESOLVED — stronger than external app-lock mechanism |
| R-4 | Archive idempotency vs two simultaneous archive runs | Advisory xact-lock per week key serializes runs; ledger UPSERT gives created=0 reruns (BR-018) | RESOLVED |
| R-5 | Payment preservation: freeze could overwrite paid flags? | Freeze UPDATE column-list excludes payment group by construction; ADR-007(b) trigger guard documented as opt-in hard enforcement | RESOLVED (+belt option pending D-07) |
| R-6 | Audit durability vs any deletion path | Append-only privileges revoke UPDATE/DELETE for ALL roles; only FK is actor SET NULL; subject refs nullable | RESOLVED — destruction of history structurally impossible via supported paths |
| R-7 | "SQLite rejected" smells like inherited prejudice (RULE 5) | Rejection rests on three named requirement failures (networked topology, server-enforced isolation, managed recovery), NOT on external-app incidents; its genuine wins (cost/ops/capacity) are recorded | FAIR — requirement-based |
| R-8 | Self-hosted cheapest infra yet rejected — cost-rule violation? | RULE 4 forbids cost-alone decisions in EITHER direction; TCO includes operator hours + recovery risk; break-even math shown | CONSISTENT — requirements-first, cost-honest |
| R-9 | D-13 unresolved but FK default shipped | Protective RESTRICT default explicitly labeled reversible-only-pre-data; flip requires signed business acceptance; no silent resolution | FLAGGED CORRECTLY |
| R-10 | Schema diverges from external SQLite schema | Intentional (RULE 1): divergence items enumerated as rejections (vestigial fields, weeks table, alert registry, boolean approval→enum) each traceable to Phase 6 classifications | CONSISTENT by design |
| R-11 | Phase 7 provisional schema vs FINAL_SCHEMA drift? | Column-name unification pass applied (`finished_on`, `advance_balance`, unified audit_events, archive_runs made explicit); all Phase 7 constraint intents preserved or strengthened | RECONCILED |
| R-12 | Negative payable vs CHECK constraints | CHECKs cover inputs only; ledger money columns deliberately signed/unchecked; review rule bans clamping | RESOLVED (BR-013 pinned) |
| R-13 | Managed provider dependency vs exit safety | Data layer 100% vanilla Postgres (dump/restore to any PG); Auth identified as the one coupled component; fallback options pre-documented | RESOLVED — bounded lock-in |
| R-14 | Pricing claims could be stale/fabricated? | All headline numbers carry Jul–Aug 2026 verification against official/aggregator sources; PITR add-on price explicitly NOT VERIFIED this pass; quarterly re-check committed | HONEST GAPS MARKED |
| R-15 | SBG-02 stream window left unserialized — contradicts "concurrency designed, not assumed"? | Mechanism CHOSEN and documented: advisory lock prevents run∥run; insert-window accepted with rerun-repair contract + revisit trigger; over-engineering rejection reasoned at scale | DOCUMENTED TRADE-OFF, not oversight |

Contradictions remaining: **0**. Assumption risks carried forward: pricing drift (quarterly check), D-13 timing, PITR tier price at enablement.
