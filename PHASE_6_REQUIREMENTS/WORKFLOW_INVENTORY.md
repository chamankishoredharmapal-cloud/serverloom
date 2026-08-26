# WORKFLOW INVENTORY (Phase 6.2)

Independent inventory built from the Phase 6.1 feature dependency graph, cross-checked against every route, service function, command, template action site, and prior runtime evidence (Phases 4/4.5/5 probes executed this session). Domains merged/split by genuine lifecycle independence — not by screen count.

| ID | Workflow | Domain | Actors | Trigger | Features | Primary entities | Dependencies | Priority | Status |
| -- | -------- | ------ | ------ | ------- | -------- | ---------------- | ------------ | -------- | ------ |
| WF-001 | Worker Onboarding & Activation | Identity | Visitor, Admin, Employee | Visitor submits registration form | F-01,F-04,F-02 | Account, Worker profile | — | CORE | FULLY RECONSTRUCTED |
| WF-002 | Session Access Control | Identity | All | Login/logout actions; any page request | F-02,F-03 | Session | WF-001 | CORE | FULLY RECONSTRUCTED |
| WF-003 | Compensation-Rate Configuration | Payroll setup | Admin | Rate form submit on worker detail | F-05 | Worker profile | WF-001 | IMPORTANT | FULLY RECONSTRUCTED |
| WF-004 | Daily Production Recording & Correction | Production | Admin | Entry form(s); delete action | F-15,F-16 | Production entry | WF-001(approved worker), WF-003(meaningful pay) | CORE | FULLY RECONSTRUCTED |
| WF-005 | Weekly Pay Review & Computation | Payroll | Admin, Employee | Opening grid/dashboard pages | F-21,F-06,F-12,F-13 | Live aggregates | WF-004 | CORE | FULLY RECONSTRUCTED |
| WF-006 | Advance Issuance & Clearing | Money | Admin | Give/Clear buttons | F-22,F-23 | Advance balance, ledger event | WF-001 | CORE | FULLY RECONSTRUCTED |
| WF-007 | Payment Settlement (mid-week capable) | Payroll state | Admin | Mark paid/unpaid buttons | F-24,F-25 | Weekly ledger row (payment fields) | WF-005 context | CORE | FULLY RECONSTRUCTED |
| WF-008 | Weekly Archive / Reset (quantity authority) | Payroll close-out | System(Operator CLI) | `reset_weekly_salary` run | F-30 | Weekly ledger rows (quantities), live counters | WF-004, WF-006 | CORE | FULLY RECONSTRUCTED |
| WF-009 | Advance Carry-Forward | Money period-close | System(Operator CLI) | `carry_advance` run | F-31 | Advance balances, ledger events | WF-006 balances | IMPORTANT | FULLY RECONSTRUCTED |
| WF-010 | Pagdi Material Lifecycle | Materials | Admin | Assign form; auto-finish on reassign | F-17,F-18,F-08 | Pagdi assignment, material change event | WF-001 | CORE | FULLY RECONSTRUCTED |
| WF-011 | Warp Material Lifecycle | Materials | Admin | Assign form; explicit POST finish | F-19,F-20,F-09 | Warp assignment, material change event | WF-001 | CORE | FULLY RECONSTRUCTED |
| WF-012 | History Consumption (personal + admin consoles) | Records | Employee, Admin | Opening history/list pages | F-07,F-10,F-11,F-14,F-29 | Read-only projections | downstream of WF-004..008 | IMPORTANT | FULLY RECONSTRUCTED |
| WF-013 | Reporting & Export Cycle | Reporting | Admin (staff-gated) | Slip link; download buttons | F-26,F-27,F-28 | Workbook/PDF artifacts | WF-008 ledger state; live aggregates for slip | IMPORTANT | FULLY RECONSTRUCTED* |
| WF-014 | Forensic Audit Lifecycle | Audit | System(writes), Super-admin(reads) | Any money/material mutation | F-33(+F-32 read surface) | Audit event tables | every mutating WF | IMPORTANT | PARTIAL (write-side complete; read surface limited to super-admin; several mutations unaudited → gaps G-02/G-07) |

\* WF-013 fully reconstructed except PDF inner-text content (never machine-parsed in any phase; stream validity proven) — noted in spec §14.

Coverage: 14 workflows; 13 fully reconstructed; 1 partially (WF-014, by design-gap not by investigation limit).
