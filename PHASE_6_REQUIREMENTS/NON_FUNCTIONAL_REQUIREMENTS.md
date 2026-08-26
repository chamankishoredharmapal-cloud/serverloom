# NON_FUNCTIONAL_REQUIREMENTS.md (Phase 6.10)

HOW the system must operate — extracted from evidence only. Every item separates CURRENT EXTERNAL BEHAVIOR (requirement-grade where verified) from MANAGEMENT-V1 RECOMMENDATION (never silently upgraded). Labels: ★ runtime/test, ◆ code, DB ◧, NV not verified, BDR business decision required.

## NFR-SEC Security
CURRENT VERIFIED: session authn w/ approval gate ★ · role decorators on every protected route ★ · structural employee object-isolation ★ · CSRF global + POST-only mutations ★ · fail-fast SECRET_KEY at DEBUG=False (observed live twice incl. this session) ★ · env-driven ALLOWED_HOSTS, disallowed host→400 ★ · ORM-only data access, no raw SQL ◆ · generic credential errors (no enumeration) ◆ · production logging without secret exposure ★.
GAPS/RECOMMENDATION-TIER: TLS/HSTS/secure-cookie flags unset (R-01) · no login throttle · no password validators (VAL63-013) · phone format free (VAL63-012) · staff≡admin trust model (PG6.6-01) → recommendations D-10/OPS63-010; NOT requirements until decided.

## NFR-PERF Performance
NO FORMAL SLA IDENTIFIED anywhere in repo/docs. Observed: single-workshop scale operates comfortably; known inefficiencies are ACCEPTED design: per-row aggregate queries in material lists and weekly grid loops (N+1 patterns ◆); exports build full workbooks in memory; NO pagination anywhere (scale limitation OPS63-009). SQLite dev DB busy-timeout 20s; PostgreSQL production target assumed better locking (NV — D-12). RECOMMENDATION: service-level shared computation (C64 §27) + pagination decision at scale.

## NFR-AVA Availability
Startup REQUIREMENTS: SECRET_KEY mandatory when DEBUG=False (fail-fast ★); DATABASE_URL or SQLite fallback ◧; Cloudinary creds configured for media storage (media inert in-app) ◆. Health endpoint `/` returns 200 liveness string ★. Scheduled jobs: NONE — archive/carry are manual operator commands (D-06 open). Failure behavior: unhandled errors → clean 500 page WITH server-side traceback logging (post-BUG-16 ★). No uptime target documented — none invented.

## NFR-BAK Backups / Recovery
NOT SPECIFIED — the repository contains NO backup procedure, restore runbook, or DR documentation (deploy guide covers hosting only). DOCUMENTED ABSENCE. Recovery capabilities that DO exist: idempotent archive rerun (--date reconstruct) ★; whole-run transaction rollback ★; audit event survival ★. RECOMMENDATION: define backup cadence before production use.

## NFR-AUD Auditability
AUDITED today: advance give/clear/carry events (actor, before/after, note, timestamp; CLI actor=NULL) ★; pagdi/warp CREATE/FINISH (capacities, end dates) ★; all transactional with their mutations ◆; survive worker deletion via SET_NULL+name snapshots ★TEST.
UNAUDITED (gaps → requirements AUD63-006..009): approvals, rate changes, payment flips, production add/delete, archive runs themselves (console output only). Read surface: super-admin only; WarpChangeHistory unregistered (inconsistency).
"Can we reconstruct who changed state and when?" — YES for balances/materials; NO for the gap list.

## NFR-SCAL Scalability
Operating assumptions evidenced: single workshop; workforce measured in tens; pure-weekly domain (no month/year logic); bigint integer money math (no overflow concern); single database; SQLite dev / Render-PostgreSQL prod per deploy docs ◆. No multi-tenancy, no horizontal scaling design, no caching layer. Do-not-extrapolate rule honored.

## NFR-USA Usability
Extracted behaviors: flash-message feedback on every mutation (success AND friendly error classes) ★; visible signup confirmation (BUG-05 fix) ★; role-routed landings ★; quick-link navigation repaired ({% url %} tags, BUG-03 fix) ★; login↔signup cross-links (BUG-04 fix) ★; empty states everywhere ★; idempotent-friendly repeats ("already finished", repeat approve) ★; explicit failure messages ("Entry not found.") ★. KNOWN DEBT: cosmetic mojibake glyphs, dual Tailwind CDN loads, orphaned templates (BUG-23 — deliberately unfixed, cosmetic).

## NFR-MNT Maintainability
30-test executable suite covering every stabilized behavior (30/30 PASS this session ★); migrations consistent (makemigrations --check clean R45); single-source week-bounds function ◆; KNOWN DEBT: weekly-salary formula duplicated inline across ≥5 views vs service (R-06 → C64 §27 mandate); dead SignupForm; vestigial fields (thread counters, performance, current_week_salary); duplicate login route/dashboard alias; interpreter pins aligned 3.11 across runtime files (3.13-proven installable ★; 3.11 runtime itself NV).

## NFR-REL Reliability
Atomic transactions wrap ALL money/material mutations (lock→mutate→audit) ★forced-contention-proven; constraint guardians as final backstop ◧; idempotency classes documented (archive/approve/payments idempotent; gives additive; carry f≠1 compounding HAZARD D-04); SQLite contention yields honest atomic 500s under artificial load ★.

## NFR-OBS Observability
LOGGING config: root WARNING console handler; django.request ERROR with tracebacks (restores diagnosability post-BUG-16 ★); django.server INFO. Server log files present in repo root (server5_err/out.log). No metrics/APM/alerting exists (AlertEmail registry INERT — D-09).

## NFR-DEP Deployment
Documented stack: Render web service + Render PostgreSQL + Cloudinary media + Whitenoise statics ◆ DOCUMENTED; Procfile release=migrate+collectstatic, web=gunicorn ◆; Dockerfile python:3.11-slim with libpq ◆; env contract: SECRET_KEY, DJANGO_ALLOWED_HOSTS, DATABASE_URL, CLOUDINARY_URL, DEBUG ◆. Runtime verification of the full production stack: NV (R-03/R-04/R-05 gates).
