# SOURCE_DATA_QUALITY.md (Phase 11.5)

## Audit scope

All source rows in the external application's store — of which there are **zero** (EXTERNAL_DATA_INVENTORY: 0-byte file, no tables).

## Findings

| Check | Result |
| ----- | ------ |
| duplicates / missing employees / invalid dates / negative values / invalid states / orphans / impossible quantities / inconsistent balances or salary totals / duplicate production or assignments / invalid historical data | **NONE POSSIBLE — no rows exist** |

Classification: every quality category is **NOT APPLICABLE (vacuously VALID)**.

## Standing rule preserved

When a real source with rows ever appears, SOURCE_DATA_QUALITY must be re-performed against that source, with ambiguous historical business data classified AMBIGUOUS/REQUIRES HUMAN DECISION and never silently repaired (Phase 8 MIGRATION_PLAN §validation already encodes the checklist).
