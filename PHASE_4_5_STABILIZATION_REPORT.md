# Phase 4.5 — Stabilization Report (Recovery Session)

Companions: `AI_INTEGRATION_WORKFLOW.md` (control document), `PHASE_1_REPOSITORY_RECONNAISSANCE.md`, `PHASE_2_FEATURE_DISCOVERY.md`, `PHASE_3_BUSINESS_LOGIC_RECONSTRUCTION.md`, `PHASE_4_APPLICATION_VERIFICATION.md`.

Application root: `serverloom-main/` (nested project directory; all paths below relative to it).

---

## 1. Starting Phase 4 Verdict

`READY WITH REQUIRED FIXES` (`PHASE_4_APPLICATION_VERIFICATION.md` §32), with a defined blocker list (§31): BUG-14, BUG-17, BUG-12, BUG-10/11, BUG-01/06/07/09 (+08/13), BUG-15, BUG-03/04/05 — plus strongly-advised BUG-16, BUG-20, BUG-02.

Phase 4.5's mandate: implement and verify those required fixes without changing architecture or breaking verified behavior.

---

## 2. State Found at Recovery Start

Evidence used (no guessing):

- **No git repository** and **no commit history** exist → file timestamps + content inspection used instead.
- `PHASE_4_5_STABILIZATION_REPORT.md` did **not** exist → Phase 4.5 treated as incomplete.
- A previous stabilization session left byte-identical source in the repo and in the isolated QA workspace (`%TEMP%\opencode\serverloom-qa`; hash-compared: views.py, urls.py, services.py, models.py, settings.py, test_stabilization.py all IDENTICAL).
- Previous session's live-QA artifacts existed (`qa45_approve.txt`, `qa45_work.txt`, `qa45_auth.txt`, `qa45_money.txt`, `qa45_reports.txt`, `qa45_sec.txt`, warp diagnostics `tmp_warpdiag.py`/`tmp_warpcnt.py`/`tmp_invariant.py`/`tmp_truthcheck.py`).
- That session was interrupted (~4:08 AM Aug 23) after writing `qa45_sec.txt` but before resolving its five anomalous results (A2.01, W2.04, M3.03, R4.09, S1.02) and before running the Django test suite (its `db.sqlite3` was 0 bytes).

### Fixes found ALREADY IMPLEMENTED (preserved, not redone)

| Area | Files changed by previous session |
| ---- | --------------------------------- |
| Views | `accounts/views.py` — friendly input handling (BUG-01/06/07/08/09/13), atomic locked pagdi/warp assignment (BUG-10/11), POST-only approve (BUG-12), payment-state-only mark-paid (BUG-17), authoritative capacity via model methods (BUG-19), identity from `request.user` (BUG-24), new `admin_warp_finish` view |
| Services | `core/services.py` — archive refresh semantics (BUG-17), new `finish_warp()` with audit (BUG-10), name snapshots on audit writes (BUG-22) |
| Models | `core/models.py` — unified `made_sarees()/remaining_sarees()` clamped & end-date-bounded (BUG-19), SET_NULL audit FKs + `employee_name` denormalization, new `WarpChangeHistory` (BUG-22), vestigial field documented (BUG-21) |
| Migration | `core/migrations/0007_advancehistory_employee_name_and_more.py` (new) |
| Tests | `core/tests/__init__.py` (BUG-14 fix), `core/tests/test_stabilization.py` (27 new tests), updated `test_advance_and_reset.py` |
| Templates | dashboard quick-links → `{% url %}` (BUG-03); login/signup cross-links + `{% if messages %}` blocks (BUG-04/05); approve as POST form (BUG-12); rate form on employee detail (BUG-02); warp finish button |
| Settings | `loomserver/settings.py` — fail-fast SECRET_KEY when DEBUG=False, env-driven ALLOWED_HOSTS (BUG-20), LOGGING config (BUG-16), SQLite busy timeout |
| Deploy | `requirements.txt` Pillow==11.1.0 + interpreter aligned to 3.11 across `.python-version` / `runtime.txt` / `Dockerfile` (BUG-15) |
| Command | `reset_weekly_salary` dry-run reports created+refreshed counts |

---

## 3. Verification Performed

### 3a. Tests already verified by previous session (live HTTP against identical code)

- Approve security behavior (A2.02–A2.05): GET→400, no-CSRF→403, POST approves idempotently.
- Work batch (W1/W2/W3): duplicate-day friendly (no 500), negative count, invalid date, false-success removed, pagdi double-assign single-active, blank date/forged id friendly, non-numeric warp capacity friendly, GET finish blocked, explicit finish works, rate form present and validated.
- Auth re-checks (T1/T2): single active material per employee after repeated assignment.
- Money batch (M1/M2/M4): negative/zero advance friendly, grid/dashboard parity, next-week exclusion, carry f=1.0, negative factor rejected.
- Reports batch (R4.01–R4.08): PDF magic bytes valid, XLSX cell-matched vs DB (5/5 saree rows, 4/4 salary rows), employees blocked from exports.
- Security batch (S1.03/S2.x): parallel duplicate-day posts → no 500s, CSRF 403, disallowed host 400 (BUG-20), forged id 404.

### 3b. Tests newly verified during this recovery session

Environment: fresh venv (Python 3.13.15), fresh isolated copy of the repo (`%TEMP%\opencode\serverloom-verify`), fresh SQLite DB, server run at `DEBUG=False` with explicit SECRET_KEY on port 8779.

| Check | Result |
| ----- | ------ |
| Pinned requirements install on Python 3.13 (incl. Pillow 11.1.0) | PASS — all imports OK (**BUG-15**) |
| `manage.py check` / `makemigrations --check --dry-run` | PASS — no issues / no changes detected |
| `migrate` (0001→0007 incl. new 0007) | PASS — all applied |
| **`manage.py test`** | **PASS — "Found 30 test(s)", Ran 30 tests, OK** (**BUG-14** resolved; suite discovers AND passes) |
| SECRET_KEY fail-fast without env var at DEBUG=False | PASS — RuntimeError raised as designed (**BUG-20**) |
| collectstatic | PASS — 137 files |
| Server boot DEBUG=False + health 200 | PASS |
| BUG-03 quick-links live | PASS — pagdi/saree-count/warp cards all 200 (were 404) |
| BUG-04 cross-links live | PASS — login↔signup links resolve 200 |
| BUG-05 signup confirmation | PASS — "waiting for admin approval" visible after redirect |
| A2.01 anomaly (approve POST form rendering) | RESOLVED — form rendered=True (prior FAIL was a harness-string artifact) |
| W2.04 anomaly (warp auto-finish) | RESOLVED — double assign leaves exactly 1 Active |
| M3.03 anomaly (archive counts) | RESOLVED — dry-run predicted exactly "create 3, refresh 1" (Beta's mid-week row), real run matched, rerun idempotent (created=0). New refresh semantics work as designed |
| R4.09 anomaly (audit chains) | RESOLVED — clean-seed audit trail exact: ADJUST(gamma)=2 for two parallel gives summing exactly 140; Warp CREATE=2/FINISH=1; Pagdi CREATE=2/FINISH=1 with auto-finish note; `employee_name` snapshots populated |
| S1.02 anomaly (parallel pagdi race) | RESOLVED WITH NOTE — statuses [500,200×] under 5-way contention; DB truth: **exactly 1 ACTIVE pagdi**, zero partial state, audits consistent (see §7 Concurrency) |
| BUG-16 logging | VERIFIED AT RUNTIME — `ERROR django.request … Traceback … sqlite3.OperationalError` captured in server log under DEBUG=False (Phase 4 had zero tracebacks) |
| Payroll truth post-archive | PASS — Beta quantities refreshed to true full-week values (out-of-week entries excluded both sides), paid flag + paid_date preserved through archive; Alpha unpaid row exact (15/375); Gamma −140 preserved consistently (BUG-18 decision); `current_week_salary` zeroed everywhere |

Harness notes (honesty): four initial truth-check "FAIL"s were diagnosed as QA-script date-arithmetic errors caused by midnight/day rollover during the session (today = Monday), NOT application defects — confirmed by direct DB inspection before classification.

---

## 4. BUG-01 … BUG-24 Final Classification

Legend: FIXED+VERIFIED / FIXED+NOT VERIFIED / NOT FIXED / UNRESOLVED / NOT APPLICABLE.

| ID | Title (short) | Status | Evidence |
| -- | ------------- | ------ | -------- |
| BUG-01 | Duplicate-day entry 500 | **FIXED + VERIFIED** | Unit ×3; live dup friendly + single row; 3-way parallel posts no 500s (prior S1.03 + this session) |
| BUG-02 | No rate-setting UI | **FIXED + VERIFIED** | Form on detail template; unit RateSettingTests ×3 (staff set, invalid rejected, employee blocked); prior W3.01/02 live |
| BUG-03 | Dashboard quick-links 404 | **FIXED + VERIFIED** | `{% url %}` cards; live L3.01–03 all 200 |
| BUG-04 | Auth cross-links 404 | **FIXED + VERIFIED** | Live L4.01/L4.02 200 both directions |
| BUG-05 | Signup feedback invisible | **FIXED + VERIFIED** | messages blocks added; live L5.01 confirmation shown |
| BUG-06 | ≤0 advance 500 | **FIXED + VERIFIED** | Unit ×2; prior live M1.01/M1.02 friendly flash |
| BUG-07 | Blank pagdi date 500 | **FIXED + VERIFIED** | Unit invalid-inputs test; prior W2.02 flash |
| BUG-08 | Forged pagdi id 500 | **FIXED + VERIFIED** | Unit same test; prior W2.03 flash |
| BUG-09 | Non-numeric warp capacity 500 | **FIXED + VERIFIED** | Unit test; prior W2.05 flash |
| BUG-10 | Warp lifecycle cannot complete | **FIXED + VERIFIED** | Auto-finish + POST finish route + audit model; unit ×4; live single-active; invariant sweep PASS |
| BUG-11 | Pagdi assignment race → duplicate ACTIVE | **FIXED + VERIFIED** | Atomic tx + select_for_update; sequential unit test; 5-way live race ends with exactly 1 ACTIVE + clean rollbacks. Residual noted (§7) |
| BUG-12 | Approval via unprotected GET | **FIXED + VERIFIED** | View POST-only (400 on GET); unit ×4 incl. CSRF-enforced client; template POST form rendered (A2.01r) |
| BUG-13 | False success deleting missing entry | **FIXED + VERIFIED** | "Entry not found." unit-tested; prior W1.06 live |
| BUG-14 | Test suite unrunnable | **FIXED + VERIFIED** | `manage.py test`: Found 30 / Ran 30 / OK (this session) |
| BUG-15 | Pins uninstallable on modern Python | **FIXED + VERIFIED** | requirements install cleanly on 3.13 (Pillow 11.1.0); interpreter pins aligned 3.11 across runtime.txt/.python-version/Dockerfile (3.11 runtime itself untestable locally — see §9) |
| BUG-16 | No tracebacks when DEBUG=False | **FIXED + VERIFIED** | LOGGING config; runtime ERROR+traceback captured this session |
| BUG-17 | First-writer-wins frozen snapshots | **FIXED + VERIFIED** | Archive = quantity authority (refresh-if-exists), mark-paid = payment authority; unit ×4; CLI dry-run fidelity; post-archive truth checks (paid flag preserved while quantities refreshed to full week) |
| BUG-18 | Negative pay payable | **FIXED + VERIFIED (decision pinned)** | Product rule chosen: debt recovery preserved consistently, never clamped silently; unit-pinned; −140 stored consistently across compute/archive |
| BUG-19 | Capacity formulas disagree | **FIXED + VERIFIED** | Single model implementation, clamped ≥0, end-date bounded, future-dated excluded; unit ×2; views now call it |
| BUG-20 | Insecure secret/hosts defaults | **FIXED + VERIFIED** | Fail-fast RuntimeError observed twice this session; disallowed Host → 400 (prior S2.02); hosts env-driven |
| BUG-21 | Vestigial `current_week_salary` | **NOT APPLICABLE (documented)** | Decision: retained for archive-compat only, documented deprecated in models.py; nothing builds on it; zeroing verified |
| BUG-22 | Audits CASCADE-delete with employee | **FIXED + VERIFIED** | Migration 0007 SET_NULL + name snapshots; unit AuditSurvivalTests proves rows survive user.delete; snapshots populated live |
| BUG-23 | Cosmetic template debt | **NOT FIXED** | Mojibake/dual Tailwind/orphaned files intentionally untouched (cosmetic; out of stabilization scope) |
| BUG-24 | Session identity trusted w/o revalidation | **FIXED + VERIFIED (normal path)** | Both views resolve via `request.user.employee`; live employee pages 200 through real auth flow. Adversarial stale-session probe not separately executed (LOW risk per Phase 4; login binds session each time) |

Counts: 21 FIXED+VERIFIED · 1 FIXED+VERIFIED (normal-path caveat: BUG-24) · 1 NOT APPLICABLE-by-decision (BUG-21) · 1 NOT FIXED cosmetic (BUG-23) · 0 UNRESOLVED.

---

## 5. Regression Results (bounded batches)

1. **Automated**: 30/30 tests pass (`manage.py test`) — original 3 + 27 new stabilization tests covering every fixed behavior above.
2. **Live targeted batch** (fresh seed, DEBUG=False): 13/13 checks pass — nav links ×5, signup message, approve-form render, warp auto-finish, duplicate-day friendliness, parallel advances [200,200], exports (global XLSX 7081 B, weekly XLSX 5140 B, PDF `%PDF-`), plus race probe.
3. **CLI regression**: `reset_weekly_salary` dry-run prediction == real run == design (created 3 / refreshed 1; rerun created 0); idempotency intact.
4. **DB truth batch**: payroll snapshot semantics, week-boundary exclusion both sides, material single-active invariants, audit-chain exactness, name-snapshot population, cws zeroed — all PASS (after correcting harness date assumptions).
5. **Previously verified core money flows untouched**: give/clear/carry math, locks, audit prev/new chains, export cell-correctness (prior-session qa45 batches + unchanged service code paths re-exercised by unit tests).

No previously-working behavior regressed in any executed check.

---

## 6. Security Status

- CSRF enforced on every mutation; approval and warp-finish are POST-only (GET → 400); tokenless POST → 403.
- Fail-fast production SECRET_KEY (runtime-proven); ALLOWED_HOSTS env-driven, wildcard removed (disallowed host → 400).
- Role boundaries re-verified (staff_required surfaces bounce anonymous/employee; employee blocked from exports/slips).
- IDOR scoping unchanged from Phase 4 (still sound); ORM-only data access (no raw SQL).
- Logging added WITHOUT secret exposure (level/formatter reviewed).
- Residual LOW: BUG-24 adversarial stale-session path not separately probed (login rebinds identity; risk unchanged-LOW).

## 7. Database Status

- Migrations 0001–0007 apply cleanly on fresh DB; `makemigrations --check` clean (models/migrations consistent).
- Constraints held under every abuse this session: unique (employee,date) prevented duplicates even in 3-way races; FK integrity intact; race rollbacks left zero partial rows.
- Audit retention: SET_NULL + name snapshots proven by deletion test.
- SQLite busy timeout raised (20 s) for local concurrency.

## 8. Payroll Status

- Single formula across grid/dashboard/detail/slip/archive (re-confirmed by parity checks).
- Weekly record lifecycle now deterministic: archive owns quantities (creates OR refreshes to end-of-week truth), mark-paid/unpaid own payment state only; paid weeks never lose their flag; unpaid archives accurate; reruns idempotent.
- Negative finals preserved consistently (pinned product decision, BUG-18).
- Week boundaries honored (previous-week and next-week entries excluded — re-proven live).

### Concurrency status

- Advances: serialized by row lock; parallel +70/+70 → exactly 140, both audited.
- Materials: single-ACTIVE-per-employee invariant holds under 5-way pagdi and repeated warp assignment; violating attempts fail atomically.
- Known minor issue: on SQLite, heavy simultaneous writes to the SAME employee can surface as 500 (`database is locked`) after lock-timeout — honest atomic failures, no corruption; production target is PostgreSQL (Dockerfile/runtime.txt) where row-level locking makes this window far smaller. PostgreSQL behavior itself remains UNTESTED locally (as in Phase 4).

---

## 9. Remaining Bugs / Unresolved / Unable-to-Verify

| Item | Class | Impact |
| ---- | ----- | ------ |
| BUG-23 cosmetic debt (mojibake glyphs, dual Tailwind CDN loads, orphaned templates/files) | NOT FIXED | Cosmetic only; no business effect |
| BUG-21 vestigial field retained | Accepted decision | Documented deprecated; zeroed by archive |
| SQLite same-row write contention → occasional 500 under artificial parallel load | Known limitation | Operator-visible only under simultaneous duplicate actions; atomic + safe |
| Python 3.11 deploy-target runtime behavior | UNABLE TO VERIFY locally | Only 3.13 available; pins now consistent and 3.13-installable; Dockerfile static review OK |
| Production stack (Render/PostgreSQL/Cloudinary/gunicorn) | UNABLE TO VERIFY (unchanged from Phase 4 §29) | External services/credentials unavailable |
| PDF inner text values | UNABLE TO VERIFY (unchanged) | Stream valid; shares grid code path |
| Browser pixel/responsive rendering | UNABLE TO VERIFY (unchanged) | No browser toolchain |
| Scheduled execution of commands | Still nothing scheduled (design area for later phases) | Commands themselves verified runnable/idempotent |

---

## 10. Integration Blockers — Closure Check (Phase 4 §31)

| Phase 4 blocker | Status |
| --------------- | ------ |
| BUG-14 runnable tests | CLOSED (30/30 pass) |
| BUG-17 weekly-record semantics decided + implemented | CLOSED (archive-authoritative refresh; unit+live verified) |
| BUG-12 POST+CSRF approval | CLOSED |
| BUG-10/11 material lifecycle + assignment transaction | CLOSED |
| BUG-01/06/07/09 (+08/13) input-crash handling | CLOSED |
| BUG-15 dependency/interpreter alignment | CLOSED (3.13-proven; 3.11 files aligned) |
| BUG-03/04/05 navigation/feedback repairs | CLOSED |
| Advised: BUG-16 logging, BUG-20 secrets/hosts, BUG-02 rate UI | ALL CLOSED |

**No integration blockers remain open.**

---

## 11. Final Readiness Verdict

### READY WITH MINOR KNOWN ISSUES

Rationale: every Phase 4 required fix is implemented and now verified by an executable regression suite (30/30) plus fresh live-runtime checks against a DEBUG=False server; no regressions were observed; remaining items are explicitly enumerated, non-blocking, and either cosmetic (BUG-23), accepted decisions (BUG-18 clamp-policy, BUG-21), environment-bound verifications (PostgreSQL/deploy/3.11 runtime/browser), or narrow operational caveats (SQLite contention UX). Per workflow §10, all core criteria — critical workflows, calculation correctness, consistency, authorization, transactions, reports, operable commands, understood defects, cleared blockers — are satisfied.

Minor known issues carried forward into Phase 5 planning: BUG-23 cosmetic debt; SQLite contention note; deploy-target runtime verification pending a real environment.

---

*Recovery session evidence preserved in `%TEMP%\opencode\serverloom-verify\` (`qa45_final_live.txt`, `server45_err.log`, seed/live/truth scripts). Original repository received only this report; all pre-existing fixes were preserved.*
