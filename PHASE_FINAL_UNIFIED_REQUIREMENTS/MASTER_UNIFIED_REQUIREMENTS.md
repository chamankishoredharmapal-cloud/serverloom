# MASTER_UNIFIED_REQUIREMENTS.md — FINAL AUTHORITY

## WHAT are we building?
**One application — Management-V1**: a single-workshop piecework payroll & operations platform (workers, production, Pagdi/Warp materials, advances, weekly settlement, archive, audit, reports/exports) delivered as Next.js + TypeScript over Supabase PostgreSQL, with RBAC+RLS and one append-only audit system. The external Django app is requirements-evidence only; nothing of its code, schema, auth, or debt is carried.

## WHO uses it?
WORKER (self-service read-only), STAFF (full operator), SUPERADMIN (staff + audit/promotion/policy), System/CLI (cron/operator secrets). Anonymous can only register/login.

## WHAT modules exist?
M1 Identity & Access · M2 Worker Management · M3 Production · M4 Materials · M5 Payroll & Settlement · M6 Advances · M7 Archive Operations · M8 Reporting & Exports · M9 Audit · M10 Administration & Settings.

## WHAT can each role do? → 06_ROLE_PERMISSION_MATRIX
Worker: OWN-ONLY reads. Staff: global operations via RPCs (no direct table writes). Superadmin: + audit read, promotions, policies. System: archive/carry execution via secret. All denials runtime-proven.

## WHAT workflows exist? → 07_WORKFLOW_SPECIFICATION
Onboard/approve · record production · correct (remove+recreate) · assign material (auto-finish) · finish material · give/clear/carry advance · settle week (two-path) · reverse payment · archive week (+dry-run, rerun, repair ritual) · history/report/export. Twelve end-to-end chains, each: UI→action→validate→authorize→tx→DB→audit→result.

## WHAT business rules exist? → 08_BUSINESS_RULES
BR-001..040 imported; enforcement owner per rule; five open-decision seams (D-01 lifecycle values, D-02 delete mode, D-03 flips policy, D-05 pagdi finish, D-08 pricing basis) each ship a safe default.

## WHAT calculations exist? → 09_CALCULATION_SPECIFICATION
CALC-001..009 with single owners (week.ts, PayrollService, materialService, AdvanceService exact-truncation, archive_week RPC, PricingStrategy seam); integer money; truncation-toward-zero carry; negative payable never clamped; parity mandated.

## WHAT data exists? / HOW protected? → 10_DATA_REQUIREMENTS · 11_DATABASE_REQUIREMENTS
profiles · production_entries · material_assignments · weekly_ledger(quantity/payment groups) · audit_events(append-only) · archive_runs (+dev bridge to remove). PostgreSQL enforces: uniqueness triples, partial-unique ONE-ACTIVE, positivity CHECKs, week-math CHECK, RLS isolation floor, privilege lockdown, RESTRICT defaults (D-13).

## HOW do modules interact? → 16_MODULE_INTEGRATION_REQUIREMENTS
Identity gates everything; production feeds payroll/material progress; advances feed settlement term; archive canonizes history; audit emits from every mutation in-tx; exports consume services only.

## HOW does authentication work? How does authorization work?
Supabase Auth issues JWTs bound to profiles.id (wiring = P0.1); three enforced layers: route guard → service assert → RLS/RPC re-check. Status≠ACTIVE ⇒ no session.

## WHAT reports/exports exist? → 14_REPORT_EXPORT_REQUIREMENTS
REP-001..007: worker dashboard, admin grid, ledgers (own/all), slip PDF, dashboards, global XLSX (4-sheet mixed authority), weekly XLSX, combined history — staff/self-scoped, streamed, single-source math.

## WHAT must be audited? → 15_AUDIT_HISTORY_REQUIREMENTS
Every mutation listed in the event catalog, actor/timestamp/before-after/note captured in-tx, immutable by privileges, surviving identity deletion.

## Errors? Concurrency? → 18_VALIDATION_EDGE_CASES · 17_CONCURRENCY_REQUIREMENTS
Typed domain errors → safe messages; full atomic rollback incl. audit; race classes closed by constraints/locks/upserts/advisory keys with recorded probes.

## WHAT already exists / must change?
Everything in 02_EXISTING_FEATURE_CATALOG exists and is verified (KEEP unless marked). Changes: EXTEND auth wiring, lifecycle UI, export date fix (F-EXP01), approval-race guard (F-RACE01), D-seam surfaces. REBUILD/REPLACE counts: **0**. REMOVE: dev-auth bridge at cutover. MUST NOT be carried forward: external architecture/schema/auth/debt/vestigial fields/inert branches/notifications-until-D-09.

## Build order? → 22_IMPLEMENTATION_PRIORITY
P0 provider+CI+backups-drill → P1 integrity fixes+lifecycle UI → P2 E2E+cron/guards → P3 enhancements → P4 cosmetic/future.

## Open human decisions (blocking only where noted)
D-13 FK policy (before first prod ledger migration; ships RESTRICT) · D-06 archive cadence/owner · D-04 automation · D-07 breadth · D-08 basis · D-11 content · D-14 TTL · RPO/RTO · granular roles · notifications. All others proceed on documented safe defaults.

---
**Traceability:** 23_REQUIREMENT_TRACEABILITY.md maps every U-* requirement to source→module→test. **No orphans. No inventions. Implementation may begin against this contract when P0 items are scheduled.**
