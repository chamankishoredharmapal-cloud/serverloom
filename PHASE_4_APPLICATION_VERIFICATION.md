# Phase 4 — Application Verification / QA Audit

Per `AI_INTEGRATION_WORKFLOW.md` §Phase 4. Companions: `PHASE_1_REPOSITORY_RECONNAISSANCE.md`, `PHASE_2_FEATURE_DISCOVERY.md`, `PHASE_3_BUSINESS_LOGIC_RECONSTRUCTION.md`.

**Verdict (§32): `READY WITH REQUIRED FIXES`**

---

## 1. Executive Summary

The application was **executed**, not just read: dependencies installed, migrations applied, dev server started, and ~90 runtime checks executed over live HTTP against an isolated database, plus ORM-level integrity probes, both management commands (real + dry-run), file-export validation, concurrency threads, and the shipped test suite.

**What actually works (runtime-proven):** the money-critical core is sound — advances (locked, additive, perfectly audited before/after incl. deliberate no-ops), weekly payroll math (grid/dashboard/snapshot agree exactly; week boundaries respected), mark paid/unpaid cycle, idempotent weekly archive with correct skip/zero/preserve semantics, carry-forward math and audit, cell-correct XLSX exports, valid PDF slips, working auth gates and role separation, enforced CSRF/POST-only guards, and DB constraints that prevented data corruption even when views crashed.

**What fails:** a band of **unhandled-exception HTTP 500s on plausible inputs** (duplicate-day entry, negative/zero advance, blank pagdi date, non-numeric warp capacity, forged ids), **broken navigation** (all three employee dashboard quick-links and both auth cross-links 404 due to route mount prefix `/accounts/` vs hardcoded paths), **invisible signup confirmation**, an **unprotected GET state-change** (approve), a **pagdi assignment race** producing two ACTIVE assignments, a **warp lifecycle that cannot complete**, **first-writer-wins weekly snapshots** that permanently freeze mid-week numbers, an **unrunnable test suite** (missing package `__init__.py`; `manage.py test` finds 0 tests), and **dependency pins that do not install** on modern Python.

No data corruption was produced by any failure; every 500 left state consistent. The system is a functioning workshop payroll tool whose rough edges are operational hazards rather than structural rot.

---

## 2. Environment Tested

| Item | Value |
| ---- | ----- |
| Host | Windows (win32), PowerShell 5.1 |
| Python available | 3.13.15 (`py` launcher); `python` alias = Store stub |
| Test isolation | Full project copied to `C:\Users\siddh\AppData\Local\Temp\opencode\serverloom-qa` — **original repository untouched by testing** |
| Database | Fresh SQLite created inside the isolated copy (original repo contained none — no real data existed or was at risk) |
| Server | Django `runserver 127.0.0.1:8777 --noreload`, `DEBUG=False` (env unset → production-like defaults) |
| Dependency deviation | Pinned `Pillow==10.2.0` fails to install on Python 3.13 (BUG-15); identical stack installed with Pillow 12.3.0 via pip override — `requirements.txt` NOT modified |
| Seeded test data | Staff user `9999999999`; employees Alpha(rate 25)/Beta(rate 10)/Gamma(rate 0) ids 1–3; Epsilon/Delta/Dup created via real HTTP signup tests |
| Date context | Audit crossed midnight Sat Aug 22 → Sun Aug 23, 2026 (Asia/Kolkata); week window Mon 2026-08-17 → Sun 2026-08-23 |
| Evidence artifacts | `qa_http_results.txt` (full check log), `server_err.log` (request/status log), DB-dump outputs from `qa_dbcheck.py` stages — preserved in the QA temp directory |

---

## 3. Test Methodology

Four evidence classes are distinguished throughout:

| Class | Meaning | Used for |
| ----- | ------- | -------- |
| RUNTIME VERIFICATION | Real HTTP requests to the running server; status codes, redirects, rendered HTML, cookies asserted programmatically | Auth, workflows, validation, exports, security |
| AUTOMATED TEST VERIFICATION | Repo's own test suite executed | §5 |
| STATIC ANALYSIS | Code/template reading (Phases 1–3, re-checked where needed) | Likely causes, unreachable features |
| ORM PROBE | Direct database operations against the live test DB | Constraints, cascade, audit chains |

HTTP client: Python stdlib (urllib + cookie jar) mirroring browser redirect/CSRF behavior; a no-redirect mode asserted exact 302 targets. Concurrency tests used parallel authenticated sessions on separate threads. Harness limitations encountered (route-prefix discovery, cp1252 console encoding on the rupee glyph, date rollover mid-audit) were treated as **QA HARNESS LIMITATIONS**, corrected surgically, and did not contaminate results; affected assertions were re-run (IDs suffixed `-f/-g/-h` in the log).

Not performed: pixel-level browser automation (no browser toolchain available); production-environment testing (see §29).

---

## 4. Build & Startup Verification

| Check | Result | Evidence |
| ----- | ------ | -------- |
| Dependency install (pinned set) | **FAIL on Python 3.13** — Pillow 10.2.0 build aborts (`KeyError: '__version__'`) | pip output → BUG-15 |
| Dependency install (substituted Pillow) | PASS — Django 5.2.8, gunicorn 21.2.0, dj-database-url 1.2.0, whitenoise 6.6.0, cloudinary 1.36.0, django-cloudinary-storage 0.3.0, reportlab 4.1.0, openpyxl 3.1.2, Pillow 12.3.0 | `pip list` |
| `manage.py check` | PASS — "System check identified no issues (0 silenced)" | runtime |
| Migration/model consistency | PASS — `makemigrations --check --dry-run`: "No changes detected" | runtime |
| `migrate` | PASS — all migrations apply incl. `core.0001…0006` | runtime |
| `collectstatic` | PASS — 137 files (WhiteNoise manifest OK) | runtime |
| Static-render risk | NONE — zero `{% static %}` usages in templates (only dead `{% load static %}`), so missing manifest entries cannot break page rendering | grep |
| Server startup | PASS — health `GET /` → 200 "Server Loom backend is running!"; login page 200 | runtime + server_err.log |
| **Route mount discovery** | All app routes live under **`/accounts/`** (`loomserver/urls.py:7`). Phase 1's route map omitted this prefix. Hardcoded absolute links break (BUG-03/04) | URLconf + runtime 404s |

---

## 5. Automated Test Results

**Result: the shipped test suite is UNRUNNABLE — effectively zero automated coverage executes.**

| Command | Outcome |
| ------- | ------- |
| `manage.py test` (documented method) | `Found 0 test(s)` — discovery skips `core/tests/` (no `__init__.py`; path existence checked = False) |
| `manage.py test core.tests.test_advance_and_reset` | `NO TESTS RAN` + `AttributeError: module 'core.tests' has no attribute 'test_advance_and_reset'` |
| `python -m unittest core.tests.test_advance_and_reset -v` | `ERROR … unittest.loader._FailedTest … AttributeError` |

The 3 unit tests (clear-advance audit, carry factor 1.0, archive idempotency) exist and their logic matches observed runtime behavior, but **no standard command executes them** → BUG-14. Every "working" claim below rests on Phase 4 runtime checks, not CI automation.

---

## 6. Authentication Verification

All RUNTIME VERIFIED unless noted:

| Scenario | Expected | Actual / ID |
| -------- | -------- | ----------- |
| Login page renders w/ phone+password+CSRF | 200 + form | PASS (A02) |
| Signup missing fields | inline error | PASS — "All fields are required." (A03) |
| Signup valid | pending account + redirect | PASS redirect (A04a); confirmation message INVISIBLE (A04b) → BUG-05 |
| Duplicate phone signup | rejection | PASS — "Phone already registered" (A05f) |
| Wrong password | inline error | PASS (A06) |
| Unapproved login attempt | blocked, no session | PASS — "Account not approved yet." (A07f) |
| Approved employee login | lands dashboard | PASS (A13) |
| Staff login | lands `/accounts/panel/` | PASS (A10) |
| Logout | session destroyed | PASS — protected access after logout → 302 login (A15) |
| Anonymous → protected routes | 302 `/accounts/login/?next=…` | PASS employee + panel (A08/A09) |

Note: auth pages render errors inline but contain **no `{% if messages %}` block**, so framework flashes sent there are silently swallowed (template + runtime evidence).

---

## 7. Authorization & Access-Control Verification

| Scenario | Expected | Actual / ID |
| -------- | -------- | ----------- |
| Employee → `/accounts/panel/weekly-salary/` | blocked | PASS — 302 login (A14) |
| Employee → admin detail of another employee | blocked | PASS — 302 login (IDOR2f; earlier "200" was followed-login-page artifact) |
| Employee → PDF slip / XLSX endpoints | blocked | PASS — 302 login (H02f/H05f/H04f) |
| Employee pages show only own data | scoped | PASS — Beta's pages contain no Alpha rows (IDOR1) |
| Forged detail id as staff | 404 | PASS (I02) |
| Approve mutation | POST+CSRF expected | **FAIL — plain GET link flips state, no token** → BUG-12 (A12f) |
| CSRF-less POST to give-advance | 403 | PASS (I01) |
| GET on POST-only endpoint (mark-paid) | 400 | PASS (G05) |

Role boundaries hold end-to-end otherwise. Object-level exposure on employee routes is sound; panel trusts staff globally (acceptable to its design).

---

## 8. Core Workflow Verification

Every Phase 2/3 workflow was executed live (full log: `qa_http_results.txt`). Highlights:

| Workflow | Result | Key runtime proof |
| -------- | ------ | ------------------ |
| Onboarding→approval→login | WORKS (approval itself via GET — BUG-12) | approve link 302; DB `approved=True` |
| Production entry | WORKS happy-path; crashes on duplicates/negatives (§9) | C01/C02 PASS; C03 500 |
| Pagdi assign + auto-finish | WORKS with complete CREATE/FINISH audit | D01/D02; audit rows w/ prev/new end dates + actors |
| Warp assign | ASSIGNS, lifecycle broken: second active allowed, no completion path; DB shows 2 ACTIVE warps | D06 → BUG-10 |
| Advance give/clear | WORKS flawlessly incl. double-give accumulation and audited no-op clear | E01–E07; audit chain `0→100→200→0→0(no-op)` actor-correct |
| Payroll grid math | CORRECT — Alpha `[375, 0, 375]` = 15×25−0; next-week entry excluded; Beta `[0,100,-100]` negative rendered | F01f/F02f vs DB rows |
| Employee dashboard parity | Matches grid exactly (375 / −100) | F03f/F04f |
| Mark paid ⇄ unpaid | WORKS; repeat-click converges | G01–G04 |
| Weekly archive | WORKS — dry-run predicted 3 rows, real run created exactly 3, rerun 0; skipped Alpha/Beta pre-paid rows (first-writer-wins → BUG-17); zeros counters; advances untouched | G06–G08 + postarchive dump |
| Carry command | WORKS — f=1.0 audits all incl. zeros unchanged; f=0.5 halves exactly (100→50→25; 140→70→35); repeats multiply again (non-idempotency CONFIRMED); f=−1 rejected rc≠0 | K01–K04 + final dump |
| Exports | WORKS, cell-level correct (§17) | H-series |
| Rate setting | **IMPOSSIBLE via app UI** (handler exists, nothing posts it) — rates had to be seeded via ORM | static + runtime absence → BUG-02 |

---

## 9. Input Validation

| Input | Path | Result | Data corrupted? |
| ----- | ---- | ------ | ---------------- |
| Saree count `abc` | saree-entry | Graceful flash "Invalid count" (C04) | – |
| Saree count `-3` | saree-entry | **500** — DB `CHECK constraint failed: count`; no row stored (ORM probe reproduced) | No → BUG-01 family |
| Saree count `0` | saree-entry | Accepted, stored (C06) | n/a |
| Duplicate `(employee,date)` | saree-entry | **500** raw "Server Error (500)" page; unique constraint held (ORM dup rejected) | No → BUG-01 |
| Advance amount `abc` | give-advance | 400 Bad Request (E02) | – |
| Advance amount `-50` / `0` | give-advance | **500** — service ValueError uncaught (E03/E04) | No → BUG-06 |
| Pagdi `start_date=""` | pagdi/create | **500** (D03) | No → BUG-07 |
| Pagdi `employee=99999` | pagdi/create | **500** FK IntegrityError (D04) | No → BUG-08 |
| Warp capacity `abc` | warp/create | **500** unguarded int() (D07) | No → BUG-09 |
| Nonexistent saree delete id | detail delete_saree | **False success flash** while nothing deleted (C09) | Silent no-op → BUG-13 |
| Unknown route | any | clean 404 (I03) | – |

Pattern: **the database is the strongest validator** (constraints always prevented bad data), but views convert constraint/business rejections into raw 500s instead of messages on six input classes.

---

## 10. Boundary & Edge Cases

| Case | Result |
| ---- | ------ |
| Zero-production employee archived | Snapshot row with zeros, note "Weekly automated reset", paid=False — VERIFIED (Gamma/Eps/Dup) |
| Entry dated next Monday | Correctly EXCLUDED from current-week totals (F01f: 375, not 450+) |
| Future-dated entry within week | Included in weekly totals (Sunday=today case) |
| Negative final salary | Rendered everywhere AND payable: Beta archived `paid=True, final=-40` → business-rule gap BUG-18 |
| Already-paid week re-marked | Upsert converges, single row (G02) |
| Already-zero advance cleared again | Audited no-op CLEAR recorded (E07/final dump) |
| Re-finish of finished pagdi | Service tolerates; audit honest (prevend=newend=today seen under race) |
| Empty histories (fresh employee) | All employee pages render 200 empty (D08–D10) |
| Week-boundary rollover | Server consistently recomputed bounds via localdate() across midnight |

---

## 11. Duplicate / Repeatability Testing

| Action repeated | Outcome | Classification |
| --------------- | ------- | -------------- |
| Give advance ×2 (+100,+100) | Additive, both audited; sum exact (also parallel: 140) | DUPLICATE-PRODUCING by design (money) — safe under locks |
| Clear advance ×2 | Second = audited no-op | IDEMPOTENT-ish (safe) |
| Mark paid ×2 | Single row updated | IDEMPOTENT |
| Mark unpaid ×2 | Benign flag writes | IDEMPOTENT |
| Archive ×2 | 3 rows then 0 rows | IDEMPOTENT (unit-test intent runtime-CONFIRMED) |
| Carry f=0.5 ×2 | 100→50→25 (multiplies each run) | NON-IDEMPOTENT (documented; dangerous if scheduler double-fires) |
| Approve ×2 | Harmless boolean flip | IDEMPOTENT |
| Duplicate-day entry (serial + 3× parallel) | Every violating insert → 500; zero dup rows ever created | ERROR-PRODUCING crash UX — BUG-01 |
| Signup duplicate phone | Clean rejection | SAFE |

---

## 12. Reversal & Correction Testing

| Correction | Runtime result |
| ---------- | -------------- |
| Mark unpaid after paid | Flags revert (`paid_date=None`); stale `final_salary` retained (postarchive: Alpha row keeps note 'second click', final 375) — VERIFIED |
| Clear advance after give | Balance 0; ADJUST+CLEAR trail intact — VERIFIED |
| Delete wrong saree entry | Row removed; **no audit trace of removal** (audit-table counts unchanged) — VERIFIED gap |
| Reassign pagdi (implicit correction) | Old finished w/ FINISH audit; original remains visible — VERIFIED |
| Reverse approval / edit archived week / restore deleted entry | Not possible in app (matches Phase 3); Django `/admin/` only — out-of-band surgery not exercised |
| Dry-run rehearsal of commands | Accurate prediction (predicted 3 == actual 3) — VERIFIED |

---

## 13. Database Integrity

Runtime-verified on the live DB:

- **Unique constraints enforce**: dup `(employee,date)` rejected at ORM level; `(employee,week_start,week_end)` backs archive idempotency.
- **CHECK constraint** on `count ≥ 0` fired on negative insert (`IntegrityError CHECK constraint failed: count`).
- **FK integrity**: forged pagdi employee id → IntegrityError (orphans impossible).
- **Cascade behavior** (throwaway probe): user.delete() removed Employee + SareeCount + PagdiHistory **and PagdiChangeHistory audit** (Employee FK CASCADE) — audit-retention gap → BUG-22. (Audit survives *pagdi* deletion only.)
- **No orphans**: sweep found zero employees-without-user, zero non-staff users-without-employee.
- **Vestigial field**: `current_week_salary` stayed 0 for all employees through heavy activity — only writer is archive zeroing → BUG-21.

---

## 14. Transaction & Rollback Testing

| Operation | Atomicity evidence |
| --------- | ------------------ |
| Give/clear advance (incl. parallel) | Balance+audit always consistent; row lock serialized writers (J01: 70+70=140, two ADJUST rows, no lost update) |
| Archive whole run | All-or-nothing; left cws=0 for all employees and exactly expected rows |
| Carry run | All-or-nothing; 15 CARRY rows across 5 employees × 3 runs; balances exact |
| Assign pagdi sequence | **NOT atomic — proven**: 5-thread race → 4 pagdis, 3 FINISH audits, 1 request crashed, **2 leftover ACTIVE** → BUG-11 |
| Dry-run commands | Full rollback despite "processed" counts — rollback mechanism VERIFIED |
| Mark paid | get_or_create upsert behaved; rare race window not triggered |

---

## 15. Concurrency Testing

| Scenario | Setup | Outcome |
| -------- | ----- | ------- |
| Parallel advance updates | 2 sessions simultaneously +70 Gamma | Both applied → 140 total, both audited, serialized by select_for_update. **Lock discipline VERIFIED** |
| Parallel duplicate-day entries | 3 sessions same (emp,day) | [500,500,500]; exactly one row exists. Constraint held under contention |
| Parallel pagdi assignments | 5 sessions assigning to one employee | [200,200,500,200,200]; DB: **2 ACTIVE pagdis remain** → check-then-act race REAL → BUG-11 |
| Archive vs live mutations | Sequential interleave (G-phase) | Archive's table-wide FOR UPDATE blocks writers; post-archive advance changes land next week (Beta 100 survived archive untouched) |

Caveat: executed on SQLite (writer-serialized). Production PostgreSQL provides true row locking — direction favorable, PG-specific behavior UNTESTED (§29).

---

## 16. Audit & History Verification

Runtime dumps matched action-for-action expectations:

| Mutation | Audit written | Actor | Prev/New correct | Transactional |
| -------- | ------------- | ----- | ---------------- | ------------- |
| Give advance (incl. parallel) | ADJUST each | staff user ✓ | 0→100, 100→200, 0→70, 70→140 ✓ | Yes |
| Clear advance (real + no-op) | CLEAR ×2 incl. "No-op clear" note | staff user ✓ | 200→0, 0→0 ✓ | Yes |
| Carry ×3 runs | CARRY ×15 (every employee every run) | **NULL (CLI)** ✓ | 100→100, 140→140, 100→50, 140→70, 50→25, 70→35 ✓ | Yes |
| Pagdi create/finish | CREATE/FINISH w/ capacities + end dates | acting user ✓ | ✓ (race produced FINISH w/ prevend=newend=today oddity) | Finish yes; CREATE separate tx |
| Saree add/delete | NOTHING | – | – | deletion unaudited → gap |
| Approve / mark paid/unpaid / rate | NOTHING | – | – | gap |

Audit tables have **zero app-facing UI** — reachable only via Django admin (code-confirmed).

---

## 17. Reporting & Export Verification

| Artifact | Result |
| -------- | ------ |
| PDF slip | 200, `%PDF-` magic, proper attachment filename, ~1.6 KB — VERIFIED transport-level; inner text values not parsed (no extractor available); values share the grid's code path |
| XLSX Global History | Valid workbook: sheets exactly [Saree History, Pagdi History, Warp History, Salary History]; **cell-by-cell match vs DB** — Saree sheet 5/5 rows w/ salary=count×rate; Salary sheet 5/5 finals/paid flags exact — VERIFIED |
| XLSX Weekly Salary | Single sheet, 5/5 rows matching SalaryHistory — VERIFIED |
| Export permissions | Employees blocked (302) on all three endpoints — VERIFIED |
| Known caveat | Historical saree rows priced at CURRENT rate in exports (Phase 3 rule) — design, not data bug |

---

## 18. UI & Navigation Verification

| Check | Result |
| ----- | ------ |
| Base nav bars (both roles, `{% url %}` based) | All resolve correctly under `/accounts/` mount — VERIFIED via extraction + fetch |
| Employee dashboard quick-link cards | **ALL THREE 404**: `/employee/pagdi/`, `/employee/saree-count/`, `/employee/warp-history/` → BUG-03 |
| login↔signup cross-links | Both 404 → users stranded between auth pages → BUG-04 |
| Flash visibility | Panel/employee pages render toast messages (strings captured); **auth pages never render them** → BUG-05 |
| Empty states | Render correctly — VERIFIED |
| 404 / 500 pages | Generic DEBUG=False pages; no detail leak; 500s unlogged (BUG-16) |
| Responsive/mobile | NOT VERIFIED (no browser rendering); Tailwind classes present statically |

---

## 19. Error Handling Verification

- Friendly errors exist for: signup/login validation, invalid saree count, invalid pagdi capacity.
- Raw-crash 500s for: duplicate-day entry, negative count, negative/zero advance, blank pagdi date, forged pagdi id, non-numeric warp capacity. All leave data intact but present operators a dead page.
- `DEBUG=False` + **no LOGGING config** → exceptions invisible server-side: `server_err.log` shows status lines only, zero tracebacks → BUG-16.
- POST-only guards return 400; CSRF failures return 403 — both verified.

---

## 20. CLI / Management Command Verification

Both commands executed for real against the isolated DB:

- `reset_weekly_salary [--dry-run] [--date] [--note]`: args OK; dry-run accurate (predicted 3 == actual 3); real run correct; rerun idempotent (0 rows).
- `carry_advance [--factor]`: f=1.0/0.5/−1 behaviors per design; per-row auditing incl. zeros; CLI runs record NULL actor; exit codes 0 success / ≠0 on ValueError with message in stderr.

---

## 21. Scheduling & Automation Verification

```text
Implemented:        YES  (both commands + services)
Configured:         NO   (no cron/Celery/clock/render.yaml anywhere)
Actually scheduled: NO   (nothing invokes them automatically)
Actually verified:  YES  (manual execution this phase)
```

Operational consequence (runtime-demonstrated): without an operator, weeks stay live forever and history surfaces stay empty. Double-fired carry with factor≠1 compounds balances — an unsupervised retrying scheduler would corrupt advances. This asymmetry must constrain any future scheduling.

---

## 22. Configuration & Deployment Verification

| Item | Finding |
| ---- | ------- |
| requirements installability | FAILS on Python ≥3.12/3.13 (Pillow pin) → BUG-15; pinned python-3.11 deploy target unverifiable here (interpreter unavailable) |
| Interpreter drift | `.python-version`=3.12.4 vs runtime.txt/Dockerfile=3.11 — unresolved |
| SECRET_KEY fallback `"dev-secret-key"` | present (`settings.py:7`) → BUG-20 |
| ALLOWED_HOSTS=["*"] | present (`settings.py:10`) → BUG-20 |
| DEBUG default False | good; generic 500 pages confirmed live |
| Cloudinary unconditional storage | UNABLE TO VERIFY (no credentials; app UI has no upload surface anyway) |
| Procfile/Dockerfile steps | statically consistent with observed migrate/collectstatic behavior; live deploy NOT VERIFIED |
| WhiteNoise | pipeline verified via collectstatic; manifest-safe rendering (no `{% static %}` usage) |

---

## 23. Security Verification

| Control | Result |
| ------- | ------ |
| CSRF middleware | ENFORCED — tokenless POST → 403 (I01); forms carry tokens |
| Session cookie | SameSite=Lax, Path=/ (runtime); HttpOnly per Django defaults (sessionid capture partial) |
| Session invalidation | Immediate on logout — VERIFIED |
| Auth bypass attempts | None succeeded anywhere (anon/employee → staff surfaces always redirected) |
| IDOR | Employee routes strictly scoped — VERIFIED |
| GET-based state change | Approve mutates via bare GET → CSRFable against logged-in admin → BUG-12 |
| Secrets/hosts | BUG-20 |
| SQL injection | ORM-only; no raw SQL (static CONFIRMED) |
| Debug leakage | Off in tested configuration |
| File handling | Only profile pictures via admin+Cloudinary; no arbitrary upload paths in app |

---

## 24. Performance / Scalability Observations

Reasonably testable items only (small-data probes):

- Page responses comfortably fast at test scale (~20 KB grids, sub-second).
- Structural limits confirmed by code during traces (not load-tested): N+1 aggregates per row on pagdi/warp lists; no pagination on any list/export; whole-workforce `SELECT … FOR UPDATE` in both commands; full-memory XLSX generation. Tolerable at workshop scale (tens of workers); degrades at thousands.
- SQLite writer serialization masked deeper lock contention; PostgreSQL behavior UNTESTED.

---

## 25. Cross-Workflow Consistency

- Grid ↔ dashboard ↔ detail ↔ slip compute the identical formula — values matched everywhere checked (375 / −100 / −40 cases).
- Archive ↔ Mark-Paid interplay behaves per Phase 3's predicted first-writer-wins — now **runtime-proven**: Alpha's permanent row froze at click-time totals (375, paid=False, note 'second click') while Beta froze `final=-40, paid=True`; archive skipped both → BUG-17.
- Advances survive archive untouched — VERIFIED (Beta 100 before/after).
- Carry operates cleanly on post-archive balances.
- Material progress consumes the same production stream as payroll; model-method vs view capacity formulas measured concretely divergent on the SAME object: remaining 40 vs 31 (pagdi#2) → BUG-19.
- Route-mount inconsistency systemic: URLConf correct, base navs correct, hardcoded cards/cross-links wrong.

---

## 26. Confirmed Bugs

| ID | Severity | Area | Title |
| -- | -------- | ---- | ----- |
| BUG-01 | HIGH | Production entry | Duplicate same-day entry → raw HTTP 500 (IntegrityError unhandled) |
| BUG-02 | HIGH | Workforce/Payroll | Salary-per-saree rate has NO setter anywhere in app UI — workers earn ₹0 until DB/admin surgery |
| BUG-03 | HIGH | Navigation | All 3 employee dashboard quick-links 404 (hardcoded paths ignore `/accounts/` mount) |
| BUG-04 | MEDIUM | Navigation/Auth | login↔signup cross-links 404 |
| BUG-05 | MEDIUM | Auth UX | Signup success confirmation never displayed |
| BUG-06 | MEDIUM | Advances | Negative/zero advance amount → HTTP 500 (ValueError uncaught) |
| BUG-07 | MEDIUM | Materials | Pagdi blank start_date → HTTP 500 |
| BUG-08 | LOW | Materials | Pagdi nonexistent employee id → HTTP 500 |
| BUG-09 | MEDIUM | Materials | Warp non-numeric capacity → HTTP 500 |
| BUG-10 | HIGH | Materials/Warp | Warp lifecycle incomplete: no completion path; stacked ACTIVE warps accumulate |
| BUG-11 | MEDIUM | Materials/Pagdi | Assignment race: parallel assigns → 2 ACTIVE pagdis + 1 crashed request |
| BUG-12 | MEDIUM (SEC) | Authorization | Approval state change via plain GET (no POST/CSRF) — CSRFable against logged-in admin |
| BUG-13 | LOW | Production | Deleting nonexistent saree reports false success |
| BUG-14 | HIGH | Quality infra | Test suite unrunnable — `manage.py test` finds 0 tests; zero executable coverage ships |
| BUG-15 | MEDIUM | Deployment | Pillow pin uninstallable on Python ≥3.12; interpreter drift across runtime files |
| BUG-16 | LOW/MEDIUM | Operations | No LOGGING config — DEBUG=False 500s leave zero tracebacks |
| BUG-17 | HIGH | Payroll | First-writer-wins weekly record: mid-week Mark-Paid permanently freezes possibly-stale totals |
| BUG-18 | MEDIUM | Payroll rules | Negative weekly pay representable AND payable (`final=-40, paid=True` persisted) |
| BUG-19 | LOW | Materials | Remaining-capacity formulas disagree (measured 40 vs 31 same object) |
| BUG-20 | MEDIUM (SEC) | Config | Hardcoded SECRET_KEY fallback + ALLOWED_HOSTS=["*"] |
| BUG-21 | LOW | Data model | `current_week_salary` vestigial (always 0) |
| BUG-22 | LOW | Audit | Audit trails CASCADE-delete with employee |
| BUG-23 | COSMETIC | Templates | Mojibake, dual Tailwind loads, orphaned files (Phase 2 carry-over) |
| BUG-24 | LOW | Identity | Two views trust session["employee_id"] without revalidation |

Severity counts: HIGH 5 (01,02,03,10,14,17 = 6 incl. 17), MEDIUM 9, LOW 6, COSMETIC 1.

---

## 27. Risk Classification

Legend: BLOCKER / CRITICAL / HIGH / MEDIUM / LOW / COSMETIC / VERIFIED / UNKNOWN

| Risk | Rating | Rationale |
| ---- | ------ | --------- |
| Money-mutation correctness (advances/archive/carry) | VERIFIED-SOUND | Locks + audits + idempotency behaved under stress |
| Payroll calculation correctness | VERIFIED | Exact matches across all surfaces incl. boundary dates |
| Data-corruption risk from observed failures | LOW | Every crash left constraint-intact state |
| Payroll record permanence semantics | CRITICAL-aware (BUG-17) | Silent frozen understates become immutable history |
| Authorization posture | VERIFIED with one hole (BUG-12) | Otherwise complete role separation |
| Operational robustness (inputs/logging) | MEDIUM | Six crash-inputs + silent logs will hit operators |
| Automation readiness | HIGH RISK | Commands safe alone; scheduling policy undefined; nothing scheduled |
| Regression safety net | ABSENT (BUG-14) | Tests exist but cannot run |
| Install/deploy reproducibility | MEDIUM (BUG-15) | Pins broken on modern Python; 3.11 target untested here |

No finding meets BLOCKER (nothing destroys data or blocks startup), and none is UNKNOWN-critical (all critical behaviors were resolved by testing).

---

## 28. Detailed Bug Reports

Evidence abbreviations: QHR = `qa_http_results.txt`; SEL = `server_err.log` (QA temp dir).

### BUG-01 — Duplicate same-day production entry crashes with HTTP 500
**Severity:** HIGH **Status:** CONFIRMED (runtime)
**Area:** Production entry
**Precondition:** Entry already exists for (employee, date).
**Steps:** 1. Submit saree entry emp1/today/count10 → success. 2. Repeat identical submission.
**Expected:** Friendly duplicate rejection.
**Actual:** HTTP 500 "Server Error (500)" (QHR C03; SEL `POST …/saree-entry/ … 500`). ORM probe: `IntegrityError: UNIQUE constraint failed: core_sareecount.employee_id, core_sareecount.date`.
**Impact:** Daily-operation landmine; no hint a duplicate exists.
**Likely cause:** bare `SareeCount.objects.create()` w/o IntegrityError handling (`views.py:367`, `views.py:637`).
**Fix recommendation:** catch IntegrityError → flash "entry exists for this date".

### BUG-02 — No UI to set salary-per-saree rate
**Severity:** HIGH **Status:** CONFIRMED (runtime absence + static)
**Area:** Workforce/Payroll
**Precondition:** New employee (signup default rate=0).
**Steps:** Search all panel templates for a poster of `action=save_salary`.
**Expected:** Owner sets worker rate in panel.
**Actual:** Handler `views.py:343-355` exists; NO template posts it. Rates required ORM seeding this audit; unseeded employees showed ₹0 finals.
**Impact:** Core payroll parameter unmanageable through the product.
**Fix recommendation:** surface validated rate form (POST/staff) on employee detail.

### BUG-03 — Employee dashboard quick-links all 404
**Severity:** HIGH **Status:** CONFIRMED (runtime)
**Area:** Employee navigation
**Steps:** open dashboard; follow extracted hrefs.
**Actual:** `/employee/pagdi/`, `/employee/saree-count/`, `/employee/warp-history/` each 404 (QHR D11). Sidebar ({% url %}) nav works.
**Cause:** hardcoded absolute hrefs ignore the `/accounts/` mount (`dashboard.html:41-53`); warp-history route does not exist at all.
**Fix recommendation:** `{% url %}` tags; drop phantom warp-history card.

### BUG-04 — login↔signup cross-links 404
**Severity:** MEDIUM **Status:** CONFIRMED (runtime D12/D13)
**Area:** Auth navigation. `login.html:45` → `/signup/`; `signup.html:52` → `/login/`; both 404.
**Fix recommendation:** named-URL tags.

### BUG-05 — Signup success feedback never shown
**Severity:** MEDIUM **Status:** CONFIRMED (template + runtime A04b)
**Actual:** redirect to login with no visible message; auth templates lack any `{% if messages %}` block.
**Fix recommendation:** add messages block to auth templates.

### BUG-06 — Advance amounts ≤ 0 crash with HTTP 500
**Severity:** MEDIUM **Status:** CONFIRMED (runtime E03/E04)
**Actual:** amount `-50` and `0` → 500 (uncaught `ValueError("amount must be a positive integer")` from `services.py:51-52`); `abc` → proper 400.
**Fix recommendation:** view try/except ValueError → flash.

### BUG-07 — Blank pagdi start_date → 500
**Severity:** MEDIUM **Status:** CONFIRMED (runtime D03). Cause: invalid date string into create(). Fix: validate required fields.

### BUG-08 — Forged pagdi employee id → 500
**Severity:** LOW **Status:** CONFIRMED (runtime D04). FK IntegrityError; staff-only so robustness only. Fix: validate existence/approval.

### BUG-09 — Non-numeric warp capacity → 500
**Severity:** MEDIUM **Status:** CONFIRMED (runtime D07). Unguarded int() at `views.py:468`. Fix: guarded parse like pagdi form.

### BUG-10 — Warp lifecycle cannot complete; stacked ACTIVE warps
**Severity:** HIGH **Status:** CONFIRMED (runtime D06 + postarchive dump)
**Actual:** second warp assigned while first ACTIVE → BOTH remain `end_date NULL`; no app mechanism can complete a warp.
**Impact:** capacity tracking meaningless when stacked; employee page shows arbitrary `.first()` active.
**Fix recommendation:** mirror pagdi auto-finish or add explicit finish; define one-open invariant.

### BUG-11 — Pagdi assignment race creates duplicate ACTIVE assignments
**Severity:** MEDIUM **Status:** CONFIRMED (runtime J03, 5 threads)
**Actual:** [200,200,500,200,200]; DB: 4 pagdis, 3 FINISH audits, 2 still ACTIVE; one request crashed mid-sequence. Finish+create spans three autocommits without spanning lock.
**Fix recommendation:** single atomic transaction + employee-row lock (or partial unique index on open pagdi).

### BUG-12 — Approval state change via unprotected GET
**Severity:** MEDIUM (security) **Status:** CONFIRMED (runtime A12f)
**Actual:** GET `/accounts/panel/employees/{id}/approve/` → 302, DB flip confirmed. No token/confirm.
**Impact:** CSRFable against logged-in admin via third-party page/link prefetch.
**Fix recommendation:** POST form + CSRF; preserve idempotency.

### BUG-13 — Silent false success deleting nonexistent saree
**Severity:** LOW **Status:** CONFIRMED (runtime C09)
**Actual:** delete entry_id=99999 → flash "Entry deleted." though nothing deleted.
**Fix recommendation:** check delete count; warn on 0.

### BUG-14 — Shipped test suite cannot run
**Severity:** HIGH **Status:** CONFIRMED (runtime)
**Actual:** `manage.py test` → Found 0 tests; explicit/unittest invocations → AttributeError (missing `core/tests/__init__.py`). Zero executable coverage ships.
**Fix recommendation:** add empty `__init__.py` so discovery finds the existing 3 tests.

### BUG-15 — Dependency pins fail on modern Python
**Severity:** MEDIUM **Status:** CONFIRMED (this environment)
**Actual:** pinned install aborts building Pillow==10.2.0 on Python 3.13 (`KeyError '__version__'`); audit proceeded with documented Pillow 12.3.0 substitution.
**Fix recommendation:** bump pillow pin; align interpreter pins (runtime.txt vs .python-version vs Dockerfile).

### BUG-16 — Server exceptions invisible when DEBUG=False
**Severity:** LOW/MEDIUM **Status:** CONFIRMED (runtime)
**Actual:** multiple 500s; server log contains status lines only — zero tracebacks (no LOGGING settings).
**Fix recommendation:** minimal console logging for django.request.

### BUG-17 — Mid-week Mark-Paid permanently freezes the weekly record
**Severity:** HIGH (business correctness) **Status:** CONFIRMED (runtime G-series + postarchive dump)
**Actual:** Alpha mark-paid at 15 sarees/375 then unpaid; further work done; archive SKIPPED him (row existed) → permanent row frozen at 375/paid=False/note 'second click'. Beta frozen `final=-40, paid=True`. Live grid meanwhile shows different numbers.
**Likely cause:** skip-if-exists archive (`services.py:143-149`) + mid-week row creation in mark_paid (`views.py:555`).
**Impact:** understated pays/history become immutable truth whenever payment precedes week-end.
**Fix recommendation:** PRODUCT DECISION REQUIRED: refresh unsettled rows at archive / restrict Mark-Paid to archived weeks / stop pre-creating snapshots. (Decision phase, not this audit.)

### BUG-18 — Negative weekly pay payable
**Severity:** MEDIUM **Status:** CONFIRMED (runtime)
**Actual:** archived snapshot `advance=100 > total=60 → final=-40` persisted with `paid_status=True` + paid_date.
**Fix recommendation:** explicit business rule + UI indicator (or clamp policy).

### BUG-19 — Remaining-capacity formulas disagree
**Severity:** LOW **Status:** CONFIRMED (runtime measurement)
**Actual:** same pagdi object: model method 40 vs view formula 31 (model caps at today & unclamped; view unbounded upper date & clamped).
**Fix recommendation:** one shared implementation; decide bounds/clamp.

### BUG-20 — Insecure default secrets/hosts
**Severity:** MEDIUM (SEC/config) **Status:** CONFIRMED (static settings inspection)
**Actual:** SECRET_KEY literal fallback (`settings.py:7`); ALLOWED_HOSTS=["*"] (`settings.py:10`).
**Fix recommendation:** fail-fast secret in prod; explicit host list.

### BUG-21 — Vestigial `current_week_salary`
**Severity:** LOW **Status:** CONFIRMED (runtime: stayed 0 throughout). Decision deferred.

### BUG-22 — Audit history dies with employee deletion
**Severity:** LOW **Status:** CONFIRMED (ORM cascade probe)
**Actual:** user.delete() removed employee + counts + pagdi **and PagdiChangeHistory** (Employee FK CASCADE); AdvanceHistory likewise would die.
**Fix recommendation:** SET_NULL/denormalization decision deferred.

### BUG-23 — Cosmetic template debt
**Severity:** COSMETIC **Status:** CONFIRMED (static carry-over from Phase 2): mojibake glyphs, dual Tailwind versions, orphaned files/templates/models.

### BUG-24 — Session identity trusted without revalidation (2 views)
**Severity:** LOW **Status:** CONFIRMED (static; login-time binding mitigates; no exploit demonstrated)
`views.py:108-113` (dashboard), `views.py:195-196` (warp) use session emp_id; others use request.user.

---

## 29. Unverified / Unable-to-Test Areas

Explicitly UNABLE TO VERIFY / UNKNOWN:

| Area | Why |
| ---- | --- |
| Browser pixel rendering, CSS behavior, responsiveness | No browser automation available; HTML/status-level checks only |
| Production deployment (Render + PostgreSQL + Cloudinary + gunicorn) | External services/credentials unavailable |
| PostgreSQL-specific locking/migration behavior | Runtime used SQLite (writer-serialized); select_for_update semantics differ on PG |
| Cloudinary media upload | No credentials; app UI has no upload surface anyway |
| Scheduled execution of commands in production | Nothing schedules them |
| Email/alerting | Feature does not exist |
| PDF slip inner text/values | Stream verified valid; no text extractor; shares grid code path |
| Session-expiry timing / concurrent-session policy | Django defaults assumed; not time-tested |
| Load/performance at scale | Small probes only; structural limits noted from code |
| Python 3.11 deploy-target compatibility | Only 3.13 available locally |
| mark_paid rare get_or_create race | Window too narrow to trigger reliably; documented from code |

---

## 30. Overall Application Health

**Works (runtime-proven):**
- Complete auth lifecycle: signup gate → approval → role-routed login/logout; clean separation throughout
- Advance money-handling end-to-end: locked, additive, clearable, exhaustively and accurately audited (incl. deliberate no-op records), concurrency-safe under parallel load
- Payroll computation exact on every surface; week boundaries honored; next-week exclusion proven
- Payment toggle cycle; POST/CSRF enforcement; staff-only exports
- Weekly archive: dry-run fidelity, true idempotency, skip semantics, counter reset, advance preservation
- Carry command: precise math, total auditability, negative-factor rejection
- XLSX exports cell-correct vs DB; PDF generation valid; DB constraints held under every abuse attempted

**Does not work / hurts operations:**
- Six input classes crash to raw 500s; deleting missing rows lies; dashboard quick-link cards and both auth cross-links 404; signup gives no feedback; salary rates unmanageable in-app; warps never complete and stack; pagdi assignment races; the test suite cannot run; installs break on modern Python; production errors are silent

**Risky by design (product decisions needed):**
- First-writer-wins weekly snapshots (BUG-17); payable negative wages (BUG-18); full-balance-every-week advance recovery; GET-based approval (BUG-12); audit survival vs employee deletion (BUG-22)

**Unknown:** production-stack behavior, browser visuals, scale performance (§29)

---

## 31. Integration Blockers

Must be resolved before Management-V1 implementation begins:

1. **BUG-14** — make the test suite runnable (prerequisite for regression-verified integration work).
2. **BUG-17** — decide and implement weekly-record semantics (Mark-Paid vs Archive precedence); integrating over ambiguous payroll permanence risks compounding corruption.
3. **BUG-12** — move approval mutations behind POST+CSRF.
4. **BUG-10 / BUG-11** — material lifecycle invariant + assignment transaction fix (new features will interact with materials).
5. **BUG-01 / BUG-06 / BUG-07 / BUG-09** (+ cheaply 08/13) — input-crash handling on daily operator paths.
6. **BUG-15** — dependency/interpreter alignment for reproducible builds.
7. **BUG-03 / BUG-04 / BUG-05** — navigation/feedback repairs (low effort, high operator impact).

Strongly advised early but not gating: BUG-16 (logging), BUG-20 (secrets/hosts), BUG-02 (rate UI — urgent the moment real workers onboard).

---

## 32. Final Readiness Verdict

### READY WITH REQUIRED FIXES

**Justification from evidence:**

- The application runs, serves, computes, persists, exports, and audits correctly across every critical workflow exercised normally (§6–§8, §16–§17). The money core (advances/archive/carry) demonstrated genuine transactional discipline under concurrent stress.
- No observed failure corrupted data — constraints and transactions held under normal, invalid-input, boundary, repeat, and adversarial concurrency probing (§9–§15).
- Authorization holds at every tested boundary except the narrow GET-approval hole (BUG-12).
- The defect set nevertheless includes HIGH-severity operational/business items (daily-path crashes, unrunnable tests, frozen-snapshot semantics, broken primary navigation, broken pins) that preclude an unconditional READY verdict while remaining fully enumerable and fixable — none is structural rot, unknown-critical, or data-destructive.

Per workflow doc §10 ("working perfectly"), all core criteria are met except "integration blockers resolved" — which §31 defines as the required-fix list above. Once those land and are re-verified, the base application is fit to receive Management-V1 capabilities.

---

**Phase 4 completion condition satisfied:** readiness verdict delivered (`READY WITH REQUIRED FIXES`). Per instructions, Phase 5 does NOT start automatically — awaiting explicit go-ahead. No application source code was modified during this audit (testing performed entirely in an isolated temp copy; original repository received only this report).
