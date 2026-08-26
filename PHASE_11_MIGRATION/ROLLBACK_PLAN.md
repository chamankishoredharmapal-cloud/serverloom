# ROLLBACK_PLAN.md (Phase 11.13)

## Greenfield rollback (primary flip reversal)

Since no legacy traffic/data exists, rollback = **revert to pre-flip state**:

1. Point DNS/domain back (or keep unlaunched — nothing to revert if flip hasn't happened).
2. Preserve evidence: export current Supabase data snapshot + ops logs.
3. Optionally drop/retain the production project per owner instruction (data entered post-launch is business data — never destroyed without approval).
4. Analyze failure; correct; re-run provider/acceptance gates.

## Legacy-data rollback (future, IF an import ever happens)

Triggers → STOP CUTOVER immediately: row-count mismatch · financial total mismatch · missing employee/history · permission breakage · invalid material state · wrong salary · auth failure · integrity violation. Then preserve evidence, restore target from L4 pre-migration anchor, old system remains primary, analyze, correct, retry. Encoded in MIGRATION_PLAN §validation.

## Trigger thresholds

Any single trigger occurrence = rollback; two or more warnings in one category = hold + human review. Never continue past a critical validation failure.
