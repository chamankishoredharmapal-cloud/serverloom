# Phase 5 — Customer / User Identity & Data Isolation Report

## Applicability Determination

The application contains **no customers, organizations, tenants, or account hierarchies** — by design it manages workshop **employees** (piece-rate workers) and their **admin/staff** operators. A customer/account model would be invented, not discovered.

- CUSTOMER/ORG/TENANT model: **NOT APPLICABLE**
- Equivalent applicable concept: **user-owned employee data + role-scoped staff surfaces** → APPLICABLE and audited below.

## Identity Model (current source)

| Actor | Identity path | Data scope |
| ----- | ------------- | ---------- |
| Employee | `User`(username=phone) ↔ `Employee` OneToOne; approval gate at login | Own production/materials/salary only |
| Staff/Admin | `is_staff/is_superuser`; panel under `/accounts/panel/` | Whole workforce (by design — single-workshop tool) |
| Anonymous | none | login/signup only |

## Independent Isolation Verification (runtime this phase)

| Probe | Result |
| ----- | ------ |
| Employee B (fresh signup→approved) with ZERO data requests own salary history while DB holds other employees' paid rows | **200 + "No salary history yet"** — query-level scoping proven positively (no rows of others rendered) |
| Employee A sees own weekly total (75 = 3×25) on own pages | PASS |
| Employee → any `/panel/*` page (RAW status, no redirect-following ambiguity) | **302 → login** |
| Employee POST to staff mutations (`mark-paid/<other>`, `approve/`) | **403 CSRF / 302 bounce — BLOCKED** |
| Employee → exports/slips | 302 blocked |
| URL id-forgery by employees | impossible on employee routes (routes take no ids); staff detail routes return 404 for forged ids (prior I02) |
| Session manipulation vector | `employee_id` session key no longer trusted for identity (BUG-24 fixed: both consumers resolve via `request.user.employee`) |

Marker-contamination note: substring probes ('75'/'90') initially suggested cross-row leakage; traced to CSS class `bg-slate-900` (`base_employee.html:35`). Positive empty-state test is decisive; zero leakage confirmed.

## Verdict

USER ISOLATION: VERIFIED. Customer/tenant isolation: NOT APPLICABLE (no such concept exists in the application).
