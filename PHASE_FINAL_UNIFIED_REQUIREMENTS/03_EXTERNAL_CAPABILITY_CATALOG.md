# 03_EXTERNAL_CAPABILITY_CATALOG.md

All validated external capabilities (Phase 6 FR/BR/CALC/SM/REP authorities, verified Phase 10) and their disposition in unified Management-V1. Because Management-V1 was natively rebuilt from these same authorities, nearly every capability ALREADY EXISTS in MV1 — the catalog proves nothing was lost.

| External capability | Phase 6 ID(s) | Disposition |
| ------------------- | ------------- | ----------- |
| Worker lifecycle (register→approve→operate) | FR-001..005, SM-01 | ALREADY EXISTS IN MV1 (E1,E2,E4,E5) |
| Production entry/correction, uniqueness, zero/negative handling | FR-015/016, BR-002/003/024/027, SM-03 | ALREADY EXISTS (E15/E16) |
| Weekly pay calculation Mon–Sun, negative finals legal | CALC-001/002/006, BR-012/013/030 | ALREADY EXISTS (E7/E21 single-source) |
| Advances give/clear/carry w/ audits & edges | FR-022/023, BR-007/008/019/040, CALC-005/006, SM-09 | ALREADY EXISTS (E22/23/E31) |
| Settlement two-path + reversible flags | FR-024/025, BR-015/031/032, SM-04/05 | ALREADY EXISTS (E24/25) |
| Pagdi/Warp assignment, auto-finish, explicit finish, progress | FR-017..020, BR-009..011/028/029, CALC-003/004, SM-06/07 | ALREADY EXISTS (E17..E20) |
| Weekly archive canonicalization, idempotent rerun, dry-run | FR-030, BR-014/016..018/033/037, CALC-007, SM-08 | ALREADY EXISTS (E30) |
| Payment/settlement authority split | BR-014/015/016 | ALREADY EXISTS (column-group RPCs) |
| History surfaces (own + admin + audit) | FR-010/011/029, REP-002/007 | ALREADY EXISTS (E10/E11/E29/E32) |
| Reports/dashboards | REP-001..004 | ALREADY EXISTS |
| Exports XLSX/PDF | FR-026..028, REP-003/005/006 | ALREADY EXISTS — MODIFY (format fixes/seams) |
| Audit trail on money/material/lifecycle events | AUD63 series | ALREADY EXISTS (unified audit_events; breadth D-07) |
| Concurrency protections (races CC-A..I) | Phase 8 tx design | ALREADY EXISTS — runtime-proven |
| Notifications registry | AlertEmail/D-09 | NOT APPLICABLE until decided |
| Vestigial fields/inert branches | BR-034 etc. | NOT APPLICABLE (deliberately absent) |
| Worker lifecycle extension states | D-01/STATE-009 proposal | NEW FEATURE (backend ready; UI pending decision) |

Nothing validated was dropped; the two P3 defects (F-RACE01/F-EXP01) are refinements of existing features, tracked separately.
