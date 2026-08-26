# 22_IMPLEMENTATION_PRIORITY.md

Remaining work to reach FINAL unified form (implementation exists; this is the completion backlog).

## P0 — Critical foundation/security (before ANY real use)
1. Wire Supabase Auth (env trio → conditional migrations activate) + remove app_credentials bridge at cutover.
2. Execute provider verification runbook (signup/login/JWT/claims/RLS A-B isolation/staff paths/logout/expiry/policies) on a NON-PRODUCTION project — record evidence.
3. Enable PITR/backups + FIRST restore drill with recorded evidence.
4. CI pipeline: typecheck+lint+unit+policy-test suite gate.

## P1 — Core workflow integrity
5. Fix F-RACE01 (conditional-update approval guard + emit-on-rowcount) with race re-test.
6. Fix F-EXP01 (ISO date cells in exports) with parsed-content re-test.
7. Lifecycle UI control (status select) exposing implemented D-01 backend.

## P2 — Operational completeness
8. Playwright E2E pack covering the seven core workflows end-to-end (authenticated).
9. Archive cron scheduling per D-06 decision (+missed-week alert).
10. Carry automation ONLY behind once-per-period guard if D-04=automate.

## P3 — Enhancements
11. Audit export button; saved filters. 12. Slip content breakdown (D-11). 13. Pricing strategy switch surface (D-08). 14. Responsive polish pass.

## P4 — Cosmetic/future
15. Notifications IF D-09 positive. 16. Granular roles IF business splits duties. 17. Pagination IF scale grows.

Dependency chain: P0.1→P0.2→P0.3→(any authenticated E2E) ; P1 fixes independent of each other; P2.9 depends on D-06; nothing else blocks.
