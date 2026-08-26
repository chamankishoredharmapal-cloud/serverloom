# 13_UI_REQUIREMENTS.md

One application, two role-scoped shells, zero duplicated logic.

## Shell & navigation
- `/login`, `/signup` (public): forms with inline validation messages; signup states "waiting for approval"; login shows generic credential error and distinct unapproved message (no enumeration).
- Worker shell (`/app/*`): Dashboard · Production · Pagdi · Warp · History · Salary ledger · Logout.
- Admin shell (`/admin/*`): Home(stats+archive console) · Workers · Weekly salary · Pagdi · Warp · Ledger · Audit(superadmin) · Export links.

## Per-module requirements
| Module | Pages | Forms | Tables | States |
| ------ | ----- | ----- | ------ | ------ |
| M1 | login/signup | validated inputs, submit pending state | — | error/pending banners |
| M2 | workers list(+search), detail | rate form(neg blocked), entry form(date/count/note), lifecycle select(D-01) | roster table w/ status + approve buttons on PENDING rows | 404 page for bad id; flash errors |
| M3 | inside detail + own history | add-entry form | week entries w/ delete buttons (confirm not required—correction model explicit) | empty state text |
| M4 | /app/[type] progress card(bar %, made/remaining)+history; admin create/list/finish | assign form (worker select ACTIVE-only, date for pagdi, capacity) | list w/ Finish button only on ACTIVE rows | empty states |
| M5 | weekly grid | inline give-amount + clear/mark buttons per row | precomputed values, negative finals amber-highlighted | paid badge ✓ |
| M6 | grid actions + worker trail list | amount input min=1 | prev→new trail | no-op clears show audited note |
| M7 | home console | note + dry-run checkbox | recent runs table {created,refreshed} | none-run state |
| M8 | dashboards/cards; export links | — | sheet-exact downloads stream | header-only files valid |
| M9 | audit viewer | entity filter | 200 latest, before→after JSON | empty ok |

## Global UI rules
Loading: server-streamed defaults. Errors: flash classes from domain taxonomy (never stack traces). Success: truthful messages incl. idempotent cases ("already finished"). Responsive: single-column collapse under 640px for grids/forms (verify at implementation). No modals required by any verified workflow. All numbers rendered from service outputs — no arithmetic in components.
