# 00_EXECUTIVE_SUMMARY.md

## What we are building

**ONE application: Management-V1** — a single-workshop piecework payroll and operations system with one authentication domain, RBAC+RLS authorization, one PostgreSQL database (Supabase-managed), and one append-only audit system.

## Provenance truth (stated plainly)

Management-V1 was **built natively during Phases 9–10** directly from the validated external-application requirements (Phase 6) under the architecture (Phase 7) and database design (Phase 8), then independently verified (Phase 10: 44/44 runtime checks + 20/20 unit tests + build green). The external Django/SQLite code was never merged — it remains evidence-only. Consequently, the "existing MV1" inventory and the "external capability" inventory converge almost 1:1 in this package; every convergence is given an explicit single ownership decision anyway (04_UNIFIED_FEATURE_MATRIX).

## Current verified state

- HEAD `269e3af`, 37 source files, Next.js 15.5.24 / React 19 / TypeScript strict
- Migrations 0001–0004 (canonical schema + RLS + authoritative RPCs + dev-auth bridge)
- 16 routes · 10 domain services · shared pure domain core · exports (XLSX/PDF) · ops API
- Tests: unit 20/20 · DB integration+concurrency 32/32 · HTTP security smoke 8/8 · Phase 10 independent harness 44/44
- Provider gate OPEN (no Supabase project yet): Auth issuance/JWT↔RLS positive paths, PITR drill, password/throttle policies remain NOT VERIFIED

## This package

Documents 00–23 define the complete implementation-ready specification for the FINAL unified system: modules, roles, workflows, rules, calculations, data, database, security, UI, reports/exports, audit, integration, concurrency, edges, NFRs, operating model, conflict reconciliation, priority, and full traceability to Phase 6–11 IDs. No requirement is orphaned; nothing is invented; every open business decision (D-01…D-14, RPO/RTO) is carried as a marked seam with a shipped safe default.

## Implementation stance

Code changes required to reach final form are deliberately small: two P3 fixes (F-RACE01 audit guard, F-EXP01 export dates), Supabase Auth wiring behind the prepared seam, provider-gate execution, E2E pack. Everything else is configuration, evidence collection, and human sign-off.
