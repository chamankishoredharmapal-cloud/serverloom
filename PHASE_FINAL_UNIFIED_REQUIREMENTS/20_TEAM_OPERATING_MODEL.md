# 20_TEAM_OPERATING_MODEL.md

Operational model for a multi-member team (derived from business reality; granular manager roles intentionally NOT created absent need):

```
Person → Supabase account → profiles.role → module permissions → record scope → allowed actions
```

## Standard day

| Person | Role | Modules | Records | Actions |
| ------ | ---- | ------- | ------- | ------- |
| Workshop administrator | STAFF | M2 Workers, M3 Production, M4 Materials, M5 Payroll/Settlement+Advances, M7 Archive console, M8 Reports/Exports | ALL workers' data | approve, rate, entries, assign/finish, give/clear advance, mark paid/unpaid, run archive dry-run/commit, export |
| Owner / auditor | SUPERADMIN | everything STAFF has + M9 Audit viewer + M10 promotion/policy + ops secrets | global incl. audit trail | promote roles, inspect trail, hold ops secret |
| Worker | WORKER | own Dashboard/Production/Pagdi/Warp/History/Salary | OWN rows ONLY (RLS) | read-only (+self signup before approval) |

## Segregation guarantees

- Only STAFF+ can touch money/materials/state; WORKER writes are grant-denied at DB level.
- Carry/archive cannot be triggered via web by staff without the operator console path; cron requires CRON_SECRET.
- SUPERADMIN is the only audit reader — separation from daily STAFF operations preserved.
- Adding a "Salary Manager"-style split later = additive enum value + policy scoping — explicitly out of scope until requested (**HUMAN DECISION REQUIRED**).

## Onboarding/offboarding

Onboard: invite in Supabase → signup/profile link → approve → assign role. Offboard: status transition (INACTIVE/SUSPENDED) — login denied, history intact (RESTRICT default protects ledger).
