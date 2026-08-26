# 04_UNIFIED_FEATURE_MATRIX.md

Single ownership decision per capability. Source codes: MV1 = existing Management-V1 feature (02); EXT = external validated requirement (03). Action vocabulary: KEEP / EXTEND / REBUILD / REPLACE / REMOVE / NOT APPLICABLE.

| Feature | Source | Existing MV1 | External Requirement | Final Behavior | Action |
| ------- | ------ | ------------ | -------------------- | -------------- | ------ |
| Auth: register/login/logout/session | MV1 E1–E3 + EXT FR-001..003 | local-mode bridge | provider JWT + status gate | Supabase Auth issuance; identical UX; bridge removed at cutover | EXTEND |
| Worker approval & lifecycle | MV1 E4/E5 + EXT SM-01/D-01 | RPC ready, UI partial | one-way + optional extension states | APPROVE button + lifecycle select (values per D-01) | EXTEND |
| Rate management | both | audited RPC | same | unchanged | KEEP |
| Worker dashboard/history pages | both | OWN-ONLY RLS | same semantics | unchanged | KEEP |
| Admin console (stats/list/search/detail) | both | complete | same | unchanged | KEEP |
| Production entries + corrections | both | dup-safe, audited | same | unchanged (soft-delete reserve dormant until D-02) | KEEP |
| Pagdi/Warp lifecycle | both | auto-finish + warp explicit finish | D-05 may unify pagdi finish | finish control exposed per D-05 decision | KEEP (+EXTEND if D-05=unify) |
| Weekly payroll grid | both | CALC-002/009 live | same | unchanged | KEEP |
| Advances | both | give/clear/carry exact math | same; D-04 automation guard hook | operator-gated now | KEEP |
| Settlement | both | two-path authority split | same; D-03 archived-flip policy flag | current-week-only default | KEEP |
| Archive ops | both | idempotent freeze + records | cron cadence D-06 | manual console now; cron seam ready | KEEP (+EXTEND when D-06 decided) |
| Exports XLSX/PDF | both | streaming routes | exact sheet/format contracts + ISO dates + strategy basis | fix F-EXP01; wire PricingStrategy value (D-08) | MODIFY |
| Audit trail + viewer | both | unified append-only + superadmin view | breadth sign-off D-07 | current event set ships | KEEP (+EXTEND per D-07) |
| Concurrency protections | both | constraints/locks/RPCs proven | same invariants | unchanged | KEEP |
| Notifications | — | absent | AlertEmail registry existed inert | DO NOT BUILD until D-09 | NOT APPLICABLE |
| Vestigial fields/inert branches | — | never ported | external debt | stay absent | NOT APPLICABLE |
| Granular manager roles (parcel/inventory/polish managers) | prompt examples only | absent | no Phase 6 basis | not created without business need | HUMAN DECISION REQUIRED (default: flat staff model) |
| Dev-auth bridge | MV1 only | dev table | forbidden in production | removed at production wiring | REMOVE (at cutover) |

Ownership conflicts: **zero** — each row has exactly one Action. REBUILD count 0 (nothing needs rewriting), REPLACE 0.
