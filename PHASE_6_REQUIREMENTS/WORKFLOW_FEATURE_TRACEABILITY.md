# WORKFLOW_FEATURE_TRACEABILITY.md (Phase 6.2)

Rule: every Phase 6.1 verified feature maps to ≥1 workflow OR is explicitly classified SUPPORTING / ADMINISTRATIVE / TECHNICAL / NOT-A-WORKFLOW. BR/CALC/STATE references use the IDs defined in the Phase 6 requirement set (03_/04_/05_ files).

| Workflow | Feature IDs | Business Rules | Calculations | States | Data | Reports | Audit |
| -------- | ----------- | -------------- | ------------ | ------ | ---- | ------- | ----- |
| WF-001 Onboarding & Activation | F-01, F-04, F-02 | BR-004, BR-022, SEC-002 | — | STATE-001, STATE-008 | DATA-001, DATA-002 | — | AUD-008 (gap→requirement) |
| WF-002 Session Access Control | F-02, F-03 | SEC-001..004 | — | STATE-008 | DATA-001 | — | — |
| WF-003 Rate Configuration | F-05 | BR-006 | CALC-002 dependency | — | DATA-002 | grid reflects rate | AUD-007 (gap→req) |
| WF-004 Production Recording & Correction | F-15, F-16 | BR-001..BR-003, BR-024-note | CALC-001 inputs | STATE-003 | DATA-003 | weekly aggregates feed REP-001/REP-004 | AUD-006 (deletion gap) |
| WF-005 Weekly Pay Review | F-21, F-06, F-12*, F-13* | BR-012, BR-013 | CALC-001, CALC-002, CALC-009 | — | live aggregates | REP-001, REP-004 | — |
| WF-006 Advance Issuance & Clearing | F-22, F-23 | BR-007, BR-008 | CALC-002 (advance term), CALC-005 input | STATE-007 | DATA-005 | advance column in REP-001 | ADJUST/CLEAR events ✓ |
| WF-007 Payment Settlement | F-24, F-25 | BR-013, BR-015, BR-021 | CALC-002 snapshot at click-if-create | STATE-006 | DATA-004 (payment fields) | paid badge REP-001/002 | none currently (AUD-007 gap) |
| WF-008 Weekly Archive | F-30 | BR-012, BR-014, BR-016, BR-017, BR-018 | CALC-004 refresh authority | STATE-006 transition | DATA-004 canonicalization | enables REP-002/005/006 historical accuracy | ledger rows are the record; command-level audit absent (AUD-009) |
| WF-009 Carry-Forward | F-31 | BR-019, BR-020 | CALC-005 | STATE-007 transitions | DATA-005 | — | CARRY events ✓ incl. zeros/no-ops |
| WF-010 Pagdi Lifecycle | F-17, F-18, F-08 | BR-009, BR-010, BR-011, BR-005 | CALC-003, CALC-004-material | STATE-004 | DATA-006, DATA-008 | progress lists; XLSX pagdi sheet (REP-005) | CREATE/FINISH ✓ |
| WF-011 Warp Lifecycle | F-19, F-20, F-09 | BR-009..BR-011 (+explicit finish variant) | CALC-003, CALC-004-material | STATE-005 | DATA-007, DATA-008 | warp lists; XLSX warp sheet | CREATE/FINISH ✓ |
| WF-012 History Consumption | F-07, F-10, F-11, F-14, F-29 | SEC-005 isolation | per-row display calc (CALC-008 display form) | read-only | projections of DATA-003..005 | REP-002, REP-004, REP-007 | — |
| WF-013 Reporting & Export | F-26, F-27, F-28 | BR-023 (current-rate pricing rule) | CALC-008 | artifact-only | full-domain reads | REP-003, REP-005, REP-006 | — |
| WF-014 Forensic Audit | F-33, F-32* | BR-020 (NULL actor CLI rule) | — | append-only | DATA-008, DATA-009 | super-admin tables (partial → AUD-009 UI requirement) | itself |

\* = classified role: F-12 stats dashboard → ADMINISTRATIVE summary inside WF-005 context; F-13 search → SUPPORTING within WF-012 admin console; F-32 super-admin CRUD → ADMINISTRATIVE/TECHNICAL platform capability; F-33 → partial (read surface).

**Coverage:** 31/31 verified features mapped (28 into workflows; 3 explicitly classified above). Inert/unknown features (F-34/F-36 + branches) deliberately excluded from workflows as non-behaviors. Zero orphaned verified requirements.
