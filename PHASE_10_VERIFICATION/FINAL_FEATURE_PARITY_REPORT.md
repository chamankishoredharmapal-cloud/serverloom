# FINAL_FEATURE_PARITY_REPORT.md (Phase 10.17)

Independent verdict on: *"Did Management-V1 actually implement the requirements correctly?"*

**YES for every verified requirement — with three explicitly tracked defects/findings and clearly bounded provider-dependent gaps.**

## Requirement-level parity (rollup from FEATURE_VERIFICATION_MATRIX)

| Status | Count | Notes |
| ------ | ----- | ----- |
| PASS | 19 requirement groups (+44/44 harness checks, 20/20 unit tests re-baseline) | includes all money/state/isolation/concurrency-critical capabilities |
| PARTIAL | 3 | FR-002 login (Supabase JWT issuance NV), FR-026 slip (text content NV), FR-027/028 XLSX (F-EXP01 date-format defect; bytes otherwise verified) |
| FAIL | 0 | — |
| NOT VERIFIED | bounded set listed below | environment/provider constraints only |
| NOT APPLICABLE | 2 groups | notifications (D-09), vestigial externals |

## Findings register

| ID | Severity | Class | Description | Disposition |
| -- | -------- | ----- | ----------- | ----------- |
| F-RACE01 | P3 | REQUIRES FIX (later correction step) | Concurrent approvals can emit duplicate APPROVE audit events (state converges correctly). Nondeterministic: single-event observed on client-role run; double-event under superuser-bypass session. | Fix = conditional-update guard in approve_worker; deferred per no-fix-during-verification rule |
| F-EXP01 | P3 | REQUIRES FIX (formatter-only) | XLSX date cells render verbose English strings instead of ISO (values correct). | Deferred; isolated to export formatter |
| F-HARN-TZ | P4 | DOCUMENTATION ONLY | IST/local-midnight Date handling repeatedly misled test expectations (fixed in harness/domain code during build; documented to prevent recurrence) | closed |
| C-09 note | P4 | HARDENING NOTE | superuser owner-bypass escape in `_require_staff` should be narrowed to an explicit test flag | deferred |

Severity totals: **P0=0 · P1=0 · P2=0 · P3=2 · P4=2**

## Provider-dependent items — explicitly NOT VERIFIED

1. Supabase cloud Auth issuance ↔ `auth.uid()` end-to-end (contract-level equivalent verified locally).
2. Provider password policy / throttling (D-10).
3. PITR backup behavior & restore drill on live project.
4. Production-tier TLS/HSTS headers.
5. PDF text-content assertions (no extractor in env).
6. Browser-visual/responsive E2E (no automation installed).

## Gate checklist (Phase 10 PASS-gate)

1 features ✓ 2 workflows ✓ 3 rules ✓ 4 calculations independently matched ✓ 5 state machines enforced ✓ 6 roles ✓ 7 isolation (DB-proven) ✓ 8 constraints ✓ 9 transactions ✓ 10 concurrency ✓ 11 audit ✓ 12 history ✓ 13 reports ✓ 14 exports (values ✓; dates defect P3) ✓− 15 UI workflows ✓ (HTTP-body level) 16 error handling ✓ 17 regression n/a-greenfield ✓ 18 unresolved P0/P1: none ✓ 19 cross-domain contradictions: none ✓ 20 provider-dependent behavior: explicitly NOT VERIFIED → therefore overall gate = CONDITIONAL.
