# Phase 6.6 — Role & Permission Specification

Question answered: WHO can do WHAT, TO WHICH data, UNDER WHICH conditions. Evidence: source trace + Phase 4/4.5 live probes + final-session bounded authorization probes (13-surface employee-denial sweep with zero-mutation assertion; method 400 / enforced-CSRF 403 on a payment endpoint with server-log capture; horizontal isolation body-level leak check; PG-08 self-finish capability proof) + test-suite re-runs (30/30 OK). Labels per §25 standard.

## 1. Actor Model (complete)

| Actor | Determination | Gate chain | Evidence |
| ----- | ------------- | ---------- | -------- |
| Anonymous | no session | none granted; protected access → redirect | decorators V:31,103… ★ |
| Employee | authenticated AND has Employee profile AND `is_approved=True` | login refused without approval, NO session issued (BR63 BR-022) | V:75-83 ★ |
| Staff/Admin | `user.is_staff or user.is_superuser` — **treated IDENTICALLY** by every panel surface (`_is_staff`, V:27-31) | session required; no further checks | CODE-CONFIRMED |
| Superuser | subset of Staff for the panel; additionally bypasses all model perms on /admin/ | platform-level | Django defaults |
| System/CLI | management commands run via shell; actor recorded as NULL in audits | shell access only; NO HTTP route exists for archive/carry | CR/CC ◆ |
| Out-of-app SuperAdmin | /admin/ surface (staff login + per-model permissions) | outside application boundary; can mutate anything incl. unaudited lifecycle edits | core/admin.py ◆ |

Role storage: **flags only** (`is_staff`, `is_superuser`, `is_approved`). Zero use of Django Groups/Permissions in app code (grep count = 0 this session). DATABASE-CONFIRMED.

Hierarchy (effective): Superuser ⊇ Staff ⊇ (nothing) ; Employee is a PARALLEL track, not below Staff — a staff user has no Employee profile and vice versa; a non-staff non-employee authenticated user is refused at login ("Unauthorized account.", V:90).

Approval dependency: Employee capabilities require ST-EMP-020 APPROVED (SM-01); pending workers cannot even hold a session.

## 2. Feature Permission Matrix

ALLOW / DENY / OWN-ONLY / CONDITIONAL / N-A. ★ = probe/test-verified.

| Feature (F-id) | Anonymous | Employee | Staff=Admin | Superuser | System/CLI |
| -------------- | --------- | -------- | ----------- | --------- | ---------- |
| F-01 signup | ALLOW ★ | n/a | n/a | n/a | n/a |
| F-02 login (+role route) | ALLOW ★ | ALLOW (approved only) | ALLOW | ALLOW | n/a |
| F-03 logout | ALLOW(authed) ★ | ALLOW | ALLOW | ALLOW | n/a |
| F-06 own dashboard | DENY ★ | OWN-ONLY ★ | n/a (no profile) | n/a | n/a |
| F-07..F-11 own history/progress/ledger pages | DENY ★ | OWN-ONLY ★ (identity from request.user only) | n/a | n/a | n/a |
| F-04 approve worker | DENY ★ | DENY ★ | ALLOW ★ | ALLOW | — |
| F-05 rate setting | DENY ★ | DENY ★ | ALLOW ★ | ALLOW | — |
| F-12 admin stats | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| F-13 employees list/search | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| F-14 worker detail console | DENY ★ | DENY ★ | ALLOW (any worker) | ALLOW | — |
| F-15 production entry (both forms) | DENY ★ | DENY ★ | ALLOW ★ | ALLOW | — |
| F-16 delete entry | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| F-17/F-18 pagdi create/list | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| F-19/F-20 warp create/list/finish | DENY ★ | DENY ★ | ALLOW ★ | ALLOW | — |
| F-21 weekly grid | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| F-22 give advance | DENY ★(400) | DENY ★ | ALLOW ★ | ALLOW | — |
| F-23 clear advance | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| F-24/F-25 mark paid/unpaid | DENY ★ | DENY ★ | ALLOW ★ | ALLOW | — |
| F-26 salary slip PDF | DENY ★ | DENY ★ | ALLOW (any worker) | ALLOW | — |
| F-27 global XLSX | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| F-28 weekly XLSX | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| F-29 salary ledger table | DENY ★ | DENY ★ | ALLOW | ALLOW | — |
| F-30 weekly archive | DENY (no route) | DENY (no route) | via shell only | via shell | **EXECUTOR** ★construction |
| F-31 carry command | DENY (CLI-only) | DENY | via shell | via shell | **EXECUTOR** |
| F-32/F-33 /admin/ CRUD + audit reads | DENY | DENY (staff flag absent) | CONDITIONAL (needs model perms) | ALLOW | — |
| Health root `/` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |

Staff≡Admin everywhere in the app surface; the ONLY differential is /admin/ model-permission gating (platform mechanism).

## 3. Object-Level Authorization

Structural fact: **employee-facing URLs contain NO object identifiers** (urls.py:15-20). Identity is ALWAYS derived from `request.user` (V:111,144,167,198,228,247 — BUG-24 fix removed session-key trust). Therefore an employee CANNOT even FORM a request for another worker's object through any existing route. Horizontal isolation is enforced by URL-shape + server-side identity resolution, not by per-object filters alone.

Forged-ID behavior on staff surfaces — TWO classes (final-session probe FG-PROBE, RUNTIME-VERIFIED):
- `get_object_or_404` routes (approve, mark paid/unpaid, worker detail, warp finish, slip) → clean 404, zero partial state.
- **EXCEPTION — give/clear advance**: raw id passed into services (`Employee.objects.select_for_update().get()`, V:650/V:662 via S:54/S:78) → uncaught `Employee.DoesNotExist` → **HTTP 500** (server logged Internal Server Error). Zero mutation occurs (failure precedes any write), but the failure mode is inconsistent with sibling routes. Legacy finding OBS-SM-01, now runtime-reproven; classified BUG-class LOW (cosmetic/consistency), Management-V1 must return 404.

Cross-worker data leak test (Phase 4 isolation probes): zero-data employee saw empty states while others held rows — RUNTIME-VERIFIED.

Employee A → Employee B salary/production/advances/pagdi/warp/history/payment/exports: **DENY (structurally impossible)** for A as Employee; ALL of it ALLOWED for any Staff member (staff are global operators by design — there is NO staff-vs-admin distinction in-app).

## 4. Privilege Escalation Analysis

Horizontal (Employee→Employee): BLOCKED structurally (§3) ★ probes.
Vertical:
- Anonymous→protected: redirect-to-login ★.
- Employee→panel mutations: every mutation endpoint carries `@staff_required` AND POST-only guard → DENY ★ (RateSettingTests employee-block TEST-CONFIRMED).
- Employee→Admin(/admin/): staff flag absent → login not accepted for admin surface.
- Staff→Superuser-only: /panel/* identical; /admin/ model perms apply (CONDITIONAL row above). No app surface requires superuser specifically.
- Normal user→privileged mutation: covered by both guards (authz + method/CSRF) ★.

Direct-URL attacks fail closed: authorization decorator runs before object fetch (SEC63-007).

## 5. Authorization × State Machine (cross-ref 6.5 §14)

Full transition-actor matrix exists in 05 §14; summary of initiators: approvals/rate/payments/material ops/deletes → Staff only; archive/carry → CLI executor only; signup → Anonymous (creation right); login/logout → self. No contradictions found between permission evidence and transition evidence.

## 6. CSRF / HTTP-Method Contract

| Mutation endpoint family | Method guard | CSRF | Verified |
| ------------------------ | ------------ | ---- | -------- |
| approve | POST-only (400) | middleware-enforced (403 tokenless) | ★ TS |
| warp finish | POST-only (400) | same | ★ TS |
| give/clear advance, mark paid/unpaid | POST-only (400) | same | ★ TS (final-session probe: GET 400 / tokenless 403 on mark-paid, server log captured) |
| pagdi/warp create, saree entry, detail actions (rate/add/delete), login/signup/logout | POST handling with CSRF | same | ★ |

GET is safe/read-only across the entire route table except health root. No JSON API exists; everything is session+CSRF form flow.

## 7. Security Findings Register (permission-relevant)

1. Staff/Admin equivalence: ANY staff user wields full operator power (no granular panel roles). OBSERVED DESIGN.
2. Dual approve code paths (dedicated + inert detail branch) — one capability, two server-live entries. INFORMATIONAL.
3. Permission events unaudited (approvals, rate writes, flips) — gap AUD63-006..008.
4. No login throttling / password validators / secure-cookie-TLS config — gaps VAL63-012/013, R-01 (recommendation tier).
5. WarpChangeHistory invisible even in /admin/ (unregistered) — read-surface gap DATA63-009.
6. Inert-but-live employee pagdi self-finish branch PROVEN reachable by crafted authenticated POST (final-session probe KT-05): a marginal employee WRITE capability contradicting the read-only posture; audited, but outside any designed workflow — see PERMISSION_GAPS PG-08.
7. Forged employee id on give/clear advance → uncaught DoesNotExist → HTTP 500 instead of 404 (probe FG-PROBE; OBS-SM-01 runtime-reproven). BUG-class LOW: zero data impact, failure-mode inconsistency only.
All seven are DOCUMENTED FINDINGS; none silently upgraded into requirements.

Contradictions found: 0.

Final-session probe cross-check vs Phase 6.5 §14 actor matrix: employee DENY cells now backed by a same-day 13-surface sweep including exports and every mutation family; no cell changed value; zero contradictions with STATE_TRANSITION_MATRIX.md.
