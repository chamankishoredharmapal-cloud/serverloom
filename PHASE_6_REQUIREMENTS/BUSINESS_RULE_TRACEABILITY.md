# BUSINESS_RULE_TRACEABILITY.md (Phase 6.3)

Mapping: Rule → Feature → Workflow → Calculation → State → Data requirement → Security requirement → Audit requirement → Test evidence. Feature IDs per `01_FEATURE_CATALOG.md`; Workflow IDs per `WORKFLOW_INVENTORY.md`; FR/REP/AUD references per the Phase 6 requirement set. Every CORE workflow must show complete rule coverage — coverage assertions at the bottom.

Legend: ✓ = verified test/runtime evidence exists for that row's rule chain.

## 1. Rule → (Feature · Workflow · Calculation · State · Data · Security · Audit · Test)

| Rule | Feature(s) | Workflow | Calculation | State | Data | Security | Audit | Test evidence |
| ---- | ---------- | -------- | ----------- | ----- | ---- | -------- | ----- | ------------- |
| BR-001 | F-15, F-16, F-07 | WF-004 | CALC-002/008 inputs | STATE-003 | DATA-003 | SEC-003, BR-035 | AUD-006(req) | staff-only probes; employee read-only pages 200 ✓ |
| BR-002 | F-15 | WF-004 | CALC-001/002 input gate | STATE-003 | DATA-003/010 | — | — | NegativeCount/invalid friendly tests ✓; R45 W1.x live ✓ |
| BR-003 | F-15 | WF-004 | — | STATE-003 | DATA-003 (unique) | — | — | DuplicateSareeEntryTests ×3 ✓; S1.03 parallel ✓ |
| BR-004 | F-01, F-02 | WF-001/002 | — | STATE-001/008 | DATA-001 | SEC-002 | AUD-008(req) | duplicate-signup runtime P4§6 ✓ |
| BR-005 | F-15, F-17, F-19 | WF-004/010/011 | — | STATE-001 precondition | DATA-001 | SEC-003 | — | picker-filter code + forged-id rejection W2.03 ✓ |
| BR-006 | F-05 | WF-003 | CALC-002 rate source | — | DATA-002 | SEC-003 | AUD-007(req) | RateSettingTests ×3 ✓; W3.x live ✓ |
| BR-007 | F-22 | WF-006 | CALC-002 advance term / CALC-006 | STATE-007 | DATA-005 | SEC-004 | AUD-001 | AdvanceInputSafetyTests ✓; S1.01 [200,200]→140 ✓ |
| BR-008 | F-23 | WF-006 | CALC-006 reset path | STATE-007 | DATA-005 | SEC-004 | AUD-002 | clear-audit unit TA ✓; E-series no-op audit ✓ |
| BR-009 | F-17, F-19 | WF-010/011 | CALC-003 context | STATE-004/005 | DATA-006/007 | — | AUD-004/005 | 5-way race → 1 ACTIVE ✓; double-assign tests ✓ |
| BR-010 | F-17, F-19 | WF-010/011 | CALC-003 window reset | STATE-004/005 | DATA-006/007 | — | AUD-004/005 | auto-finish audits chain check R45 §3b ✓ |
| BR-011 | F-17, F-19 | WF-010/011 | CALC-004 capacity source | — | DATA-010 | — | — | non-numeric capacity tests ✓; W2.05 live ✓ |
| BR-012 | F-06, F-21, F-30 | WF-005/007/008 | CALC-001 | STATE-002 | DATA-004 week keys | — | — | midnight rollover observations ✓; truth45 exclusion ✓ |
| BR-013 | F-21, F-24 | WF-005/007 | CALC-002 sign behavior | STATE-006 | DATA-004 signed fields | — | — | negative-final consistency test TS:298 ✓ |
| BR-014 | F-30 | WF-008 | CALC-007 authority | STATE-002 | DATA-004 quantity group | — | AUD-009(req) | CLI dry-run==actual; rerun created=0 ✓; pay→work→archive test ✓ |
| BR-015 | F-24, F-25 | WF-007 | CALC-002 snapshot-if-create | STATE-006 | DATA-004 payment group | SEC-004 | AUD-007(req) | WeeklySnapshotSemanticsTests ×4 ✓; M3 cycle ✓ |
| BR-016 | F-30 | WF-008 | — | STATE-006 preservation | DATA-004 | — | — | paid-preservation through archive test ✓ |
| BR-017 | F-30 | WF-008 | CALC-006 independence | STATE-007 | DATA-005 | — | — | post-archive advance checks ✓ |
| BR-018 | F-30 | WF-008 | CALC-007 determinism | STATE-002 rerun | DATA-004 unique backstop | — | — | archive idempotency unit + CLI triple-run ✓ |
| BR-019 | F-31 | WF-009 | CALC-005 guard | STATE-007 | DATA-005 | — | AUD-003 | negative-factor rejection K-series ✓ |
| BR-020 | F-31 | WF-009/014 | CALC-005 audit side | STATE-007 | DATA-008 | — | AUD-003/009 | f=1.0 audits-all K01 ✓ |
| BR-021 | F-24, F-25 | WF-007 | bounds from today | STATE-006 boundary | DATA-004 | — | — | endpoint bounds code; G03 gap analysis |
| BR-022 | F-02 | WF-001/002 | — | STATE-001/008 | DATA-001 | SEC-002/006 | AUD-008(req) | auth matrix P4§6 all rows ✓ |
| BR-023 | F-27 | WF-013 | CALC-008 export pricing | read-only | — | SEC-003 | — | R4 cell-match proves current-rate arithmetic ✓ |
| BR-024 | F-15 | WF-004/008 temporal | CALC-001 filtering | — | DATA-003 date field | — | — | next-week exclusion + rollover both directions ✓ |
| BR-025 | F-01 | WF-001 | defaults feed CALC-002 | STATE-001 initial | DATA-002 | — | AUD-008(req) | signup runtime + L5.01 confirmation ✓ |
| BR-026 | F-16 | WF-004 correction | aggregates react | STATE-003 delete | DATA-003 | — | AUD-006(req) | delete/nonexistent tests ✓; W1.06 ✓ |
| BR-027 | F-15 | WF-004 | zero contributes 0 | STATE-003 | DATA-010 (`<0` only) | — | — | validation-boundary code; consistent batches |
| BR-028 | F-17, F-19 | WF-010/011 | CALC-003 start bound | STATE-004/005 create | DATA-006/007 | — | AUD-004/005 CREATE rows | pagdi blank-date reject vs warp today-stamp code+tests ✓ |
| BR-029 | F-08(inert), F-20 | WF-010 vs 011 | — | STATE-004 vs 005 | — | — | AUD-004/005 FINISH | warp finish route tests ✓; template grep zero pagdi posters ✓ |
| BR-030 | F-21..F-23, F-31 | WF-005/006/009 | CALC-006 | STATE-007 | DATA-005 | — | AUD-001/002/003 | formula identity across consumers; Gamma −140 case ✓ |
| BR-031 | F-24 | WF-007 | CALC-002 at click | STATE-006 create path | DATA-004 | — | AUD-007(req) | get_or_create branch tests ✓ |
| BR-032 | F-25 | WF-007 | quantities untouched | STATE-006 reverse | DATA-004 | — | AUD-007(req) | M3 reversal cycle ✓ |
| BR-033 | F-30 | WF-008 | CALC-007 all-worker loop | STATE-002 | DATA-004 completeness | — | AUD-009(req) | created==workforce count runs ✓ |
| BR-034 | F-30 legacy | WF-008 | counter zeroing | — | vestigial field | — | — | zeroing verified in post-archive dumps ✓ (NOT a ported requirement) |
| BR-035 | F-06..F-11 | WF-012 | display calcs only | read-only surfaces | projections | SEC-003/005 | — | employee write-attempts blocked matrix ✓ |
| BR-036 | absence (G-01) | WF-001 lifecycle | — | STATE-001 one-way / STATE-009 proposal | DATA-001 cascade risk | — | AUD-008(req) | route/template sweep; cascade probe P4§13 ✓ |
| BR-037 | F-30 | WF-008 ops | CALC-001 with d param | STATE-002 targeting | DATA-004 | — | AUD-009(req) | --date CLI runs ✓ |
| BR-038 | F-31 | WF-009 ops | CALC-005 phase-free | STATE-007 timing | DATA-005 | — | AUD-003 | command signature (no week arg) ✓ |
| BR-039 | F-05 + grid | WF-003→005 | live-vs-stored split | — | DATA-004 stored group | — | AUD-007(req) | current-rate reads at every consumer ✓ |
| BR-040 | F-31 hazard | WF-009 | CALC-005 compounding | STATE-007 drift | DATA-005 | — | AUD-003 trail exposes repeats | 100→50→25 chain ✓ |

## 2. VAL/CALC/STATE/SEC/DATA/AUD/OPS quick-mapping

- **VAL-001..011** map into WF-001 (VAL-001/002), WF-004 (003/004), WF-003 (005), WF-006 (006), WF-010/011 (007/008/009), WF-009 (010), WF-008 (011); **VAL-012/013** → identity hardening decision D-10.
- **CALC-001** → WF-005/007/008 windows; **CALC-002** → WF-005/007 core; **CALC-003/004** → WF-010/011 progress; **CALC-005** → WF-009; **CALC-006** → advance term everywhere; **CALC-007** → WF-008 authority; **CALC-008** → WF-012 displays/WF-013 exports; **CALC-009** → dashboards parity.
- **STATE-001..008** as §14 machine index; **STATE-009** = D-01 proposal.
- **SEC-001..008** wrap every mutating workflow (WF-002, 004, 006, 007, 010, 011 failure paths) and reporting access (WF-013).
- **DATA-001..011** underpin their workflow entities as listed in the Inventory.
- **AUD-001..005** attach to WF-006/009/010/011 mutations; **AUD-006..009** are Management-V1 requirements over WF-004/007/008 and the read surface.
- **OPS-001..010** govern command execution, dry-runs, rollback, scheduler contract, liveness, streaming, timezone, concurrency caveat, scale, deploy hardening.

## 3. Workflow-level rule coverage (CORE completeness proof)

| Workflow | Business rules | Validation | Calculations | States | Data | Security | Audit | Coverage verdict |
| -------- | -------------- | ---------- | ------------ | ------ | ---- | -------- | ----- | ---------------- |
| WF-001 Onboarding & Activation | BR-004, 022, 025, 036 | VAL-001/002 | — | STATE-001/008 | DATA-001/002 | SEC-002/006 | AUD-008(req) | COMPLETE |
| WF-002 Session Access Control | BR-022, 035 | — | — | STATE-008 | DATA-001 | SEC-001..007 | — | COMPLETE |
| WF-003 Rate Configuration | BR-006, 039 | VAL-005 | CALC-002 dependency | — | DATA-002 | SEC-003 | AUD-007(req) | COMPLETE |
| WF-004 Production Recording & Correction | BR-001, 002, 003, 005, 024, 026, 027 | VAL-003/004/009 | CALC-001 inputs | STATE-003 | DATA-003/010 | SEC-003/004 | AUD-006(req) | COMPLETE |
| WF-005 Weekly Pay Review | BR-012, 013, 030, 035 | — | CALC-002/009 | — | live aggregates | SEC-003 | — | COMPLETE |
| WF-006 Advance Issuance & Clearing | BR-007, 008, 030 | VAL-006 | CALC-002/006 | STATE-007 | DATA-005/011 | SEC-004 | AUD-001/002 | COMPLETE |
| WF-007 Payment Settlement | BR-013, 015, 021, 031, 032 | — | CALC-002 snapshot | STATE-006 | DATA-004 | SEC-004 | AUD-007(req) | COMPLETE |
| WF-008 Weekly Archive | BR-012, 014, 016, 017, 018, 033, 034, 037 | VAL-011 | CALC-007 | STATE-002 | DATA-004 | — | AUD-009(req) | COMPLETE |
| WF-009 Carry-Forward | BR-019, 020, 038, 040 | VAL-010 | CALC-005 | STATE-007 | DATA-005/011 | — | AUD-003 (+009 req) | COMPLETE |
| WF-010 Pagdi Lifecycle | BR-009, 010, 011, 028, 029 | VAL-007/008/009 | CALC-003/004 | STATE-004 | DATA-006/008 | SEC-004 | AUD-004 | COMPLETE |
| WF-011 Warp Lifecycle | BR-009, 010, 011, 028 | VAL-007/009 | CALC-003/004 | STATE-005 | DATA-007/008 | SEC-004 | AUD-005 | COMPLETE |
| WF-012 History Consumption | BR-035 | — | CALC-008/009 display | read-only | projections | SEC-003/005 | — | COMPLETE |
| WF-013 Reporting & Export | BR-023 (+SEC-003) | — | CALC-008 | artifact-only | full reads | SEC-003 | — | COMPLETE (REP-003 content NOT VERIFIED flagged) |
| WF-014 Forensic Audit | BR-020 | — | — | append-only | DATA-008/009 | super-admin surface | AUD-001..009 | PARTIAL BY DESIGN GAP (requirements raised, not silent) |

## 4. Feature → rule closure (all 31 verified features)

F-01(BR-004/025, VAL-001/002) · F-02(BR-022, SEC-002/006) · F-03(STATE-008) · F-04(STATE-001, SEC-004) · F-05(BR-006/039) · F-06(CALC-009, BR-012/013) · F-07(BR-001, CALC-008) · F-08(BR-029-inert note, CALC-003/004) · F-09(F-08 analog) · F-10(read projections) · F-11(REP-002, DATA-004) · F-12(REP-004) · F-13(search scope, no rule conflict — presentation) · F-14(console aggregation) · F-15(BR-001/002/003/024/027) · F-16(BR-026, AUD-006req) · F-17(BR-009/010/011/028) · F-18(list projection) · F-19(Warp set) · F-20(BR-029 warp side, SEC-004) · F-21(BR-012/013/030) · F-22(BR-007) · F-23(BR-008) · F-24(BR-015/031) · F-25(BR-032) · F-26(REP-003, NOT VERIFIED content flag) · F-27(BR-023, REP-005) · F-28(REP-006) · F-29(REP-002) · F-30(BR-014/016/017/018/033/037) · F-31(BR-019/020/038/040). Supporting/inert: F-32/F-33(DATA-009, AUD-009req) · F-34(D-09 UNKNOWN) · F-35(OPS-005) · F-36(not applicable) · F-37(OPS-009). Zero orphan features.

## 5. Orphan checks

- Rules mapping to NO feature/workflow: none (every rule cites ≥1 workflow above).
- Workflows lacking rules: none (table §3).
- Calculations without consuming rules: none.
- Security requirements without guarded workflows: none.
- Audit requirements without owning actions: none (AUD-006..009 each name their actions).

**Coverage verdict:** complete; CORE workflows fully covered; gaps converted to requirements or decision items, never dropped.
