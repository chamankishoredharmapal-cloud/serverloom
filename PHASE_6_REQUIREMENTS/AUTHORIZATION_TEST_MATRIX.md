# AUTHORIZATION_TEST_MATRIX.md (Phase 6.6)

Every row: WHAT was checked / EXPECTED / ACTUAL / RESULT / EVIDENCE. Sources: Phase 4 §6-7 role matrix (live), Phase 4.5 batches, THIS session's 30/30 suite run (TEST-CONFIRMED), code traces (CODE-CONFIRMED).

## A. Authentication boundary

| ID | Check | Expected | Actual | Result | Evidence |
| -- | ----- | -------- | ------ | ------ | -------- |
| AT-01 | Signup creates PENDING, no session | pending + redirect to login | confirmed; visible "waiting for approval" message | PASS | V:37-60; L5.01 ★ |
| AT-02 | Duplicate phone signup | reject w/ message, no account | rejected | PASS | V:46-47; P4 §6 ★ |
| AT-03 | Login unapproved worker | refusal WITHOUT session | refused, no session issued | PASS | V:78-79; P4 §6 ★ |
| AT-04 | Login wrong password | generic error | single generic message | PASS | V:72-73 ★ |
| AT-05 | Non-staff non-employee user login | refusal | "Unauthorized account." | PASS | V:90 ◆ |
| AT-06 | Logout destroys session | protected page unreachable after | redirect-to-login | PASS | P4 A15 ★ |
| AT-07 | SECRET_KEY absent at DEBUG=False | refuse startup | RuntimeError raised (observed again this session during test-env setup) | PASS | settings.py:9-18 ★ this session |

## B. Role gating

| ID | Check | Expected | Actual | Result | Evidence |
| -- | ----- | -------- | ------ | ------ | -------- |
| BT-01 | Anonymous → any /panel/* | redirect login | 302 bounce | PASS | decorators ★ |
| BT-02 | Employee → /panel/* pages | DENY | redirected | PASS | P4 §7 ★ |
| BT-03 | Employee → exports/slips | DENY | redirected/blocked | PASS | R4 permission probes ★ |
| BT-04 | Employee → rate mutation | DENY | blocked | PASS | RateSettingTests employee-block — re-run this session |
| BT-05 | Employee → approve/mutations | DENY | 400/redirect paths | PASS | ApprovalSecurityTests anonymous+method rows — re-run this session |
| BT-06 | Staff → full operator surface | ALLOW | all panel features functioned across phases | PASS | entire Phase 4 workflow matrix ★ |
| BT-07 | Plain staff vs superuser on /panel/* | identical | `_is_staff` OR-check only | CONFIRMED | V:27-31 ◆ |
| BT-08 | Staff without model perms → /admin/ change view | platform 403 | Django default perm system | CONFIRMED (mechanism) | framework ◆ |

## C. Object-level / horizontal

| ID | Check | Expected | Actual | Result | Evidence |
| -- | ----- | -------- | ------ | ------ | -------- |
| CT-01 | Employee routes expose other workers' ids? | none exist | urls 15-20 carry NO identifiers | PASS (structural) | ◆ |
| CT-02 | Identity resolution source | authenticated user only | request.user everywhere; session-key trust removed | PASS | V:111,144,167,198,228,247 ◆ (BUG-24 fix) |
| CT-03 | Cross-worker data leak (empty-state isolation) | A sees only A's data | zero-data user empty while others populated | PASS | P4 isolation probes ★ |
| CT-04 | Forged id on staff detail route | clean 404 | 404, no partial state | PASS | S2.x probes ★ |
| CT-05 | Forged employee id in forms | friendly rejection | flash messages, no insert | PASS | W2.03 ★ |

## D. Vertical escalation

| ID | Path | Expected | Actual | Result |
| -- | ---- | -------- | ------ | ------ |
| DT-01 | Anonymous→protected | blocked | redirect | PASS ★ |
| DT-02 | Employee→staff mutations | blocked | decorator+POST guard double layer | PASS ★ |
| DT-03 | Employee→/admin/ | blocked | no staff flag → cannot login there | PASS (mechanism) ◆ |
| DT-04 | Staff→superuser-only app surface | none exists | /panel/* identical for both | CONFIRMED ◆ |
| DT-05 | Crafted direct URL to mutation with GET | blocked | 400 method guards on every action endpoint | PASS ★ |

## E. Method/CSRF contract

| ID | Endpoint family | GET result | Tokenless POST | Verified |
| -- | ---------------- | ---------- | -------------- | -------- |
| ET-01 | approve | 400 | 403 | TEST-CONFIRMED this session |
| ET-02 | warp finish | 400 | 403 (middleware) | TEST+CODE |
| ET-03 | advance/pay endpoints | 400 | 403 | CODE + prior live |
| ET-04 | all form posts | CSRF enforced globally | 403 | CODE (middleware stack) |

Summary: authorization tests executed/verified = **27**; object-level structural checks = 5; horizontal escalation paths = BLOCKED (structural); vertical escalation paths = ALL BLOCKED at tested boundaries; NOT VERIFIED items = session-expiry TTL, /admin/ fine-grained perm behavior with a provisioned plain-staff user (mechanism known, instance not exercised).

## K. Final-session bounded probes (disposable venv + file SQLite via DATABASE_URL; fixture deleted after run)

| ID | Check | Expected | Observed | HTTP / DATA result | Verification |
| -- | ----- | -------- | -------- | ------------------ | ------------ |
| KT-01 | Authenticated EMPLOYEE × 13 panel surfaces (3 pages, slip PDF, 2 XLSX exports, approve/mark-paid/mark-unpaid/give/clear/warp-finish/pagdi-create POSTs vs another worker) | all DENIED pre-logic | uniform 302 redirects | 302×13; ZERO mutations (no approval flip, no ledger row, advance 0, warp stayed ACTIVE, no pagdi created) | RUNTIME-VERIFIED |
| KT-02 | mark-paid method guard as Staff | GET rejected | 400 "POST only" | 400; 0 rows | RUNTIME-VERIFIED (was CODE+prior-live) |
| KT-03 | mark-paid tokenless POST as Staff, enforce_csrf_checks=True | CSRF block | 403 Forbidden (server log captured: "Forbidden (CSRF cookie not set.)") | 403; 0 rows | TEST-CONFIRMED (ET-03 upgraded) |
| KT-04 | Horizontal isolation Worker A vs B (distinct production + B-only ledger row) | A sees own only | dash/hist/ledger 200; A's count visible; B's count ABSENT from both page bodies | 200×3; no cross-worker leak | RUNTIME-VERIFIED |
| KT-05 | PG-08 inert-but-live surface: approved employee crafts POST to OWN pagdi page URL | per gap hypothesis: finishes own pagdi | CONFIRMED WORKS — end_date set, PagdiChangeHistory FINISH audit ("Finished by employee") written | 302; 1 FINISH audit | RUNTIME-VERIFIED (documenting, NOT fixing) |
| KT-06 | Forged employee id (99999) across action endpoints as Staff | consistent fail-closed | give-advance → **500** (`DoesNotExist` uncaught, server logged ISE); clear-advance → **500** (same); mark-paid → clean **404**; detail → clean **404**. Zero mutations in all four | 500/500/404/404 | RUNTIME-VERIFIED — resolves OBS-SM-01 vs INV-17 contradiction in favor of the draft's observation; INV-17 corrected to scoped form |

Probe-environment note: identical harness discipline to Phase 6.5 final session — bounded single run, no retries, fixtures deleted, disposable venv removed afterwards.
