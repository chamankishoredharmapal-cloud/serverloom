# Phase 5 — Evidence Register

Confidence: HIGH = directly executed/observed; MEDIUM = config/source-derived; LOW = inference (labeled).

| ID | Claim | Type | Location | Verification | Confidence |
| -- | ----- | ---- | -------- | ------------ | ---------- |
| E-01 | Pinned deps install on Python 3.13 incl. Pillow 11.1.0 | RUNTIME | `%TEMP%\opencode\serverloom-verify-venv` install session (this phase's predecessor run) + import check output | executed pip install + imports | HIGH |
| E-02 | Test suite discoverable & passing: 30/30 | AUTOMATED_TEST | `manage.py test -v 2` transcript (verify env) | executed | HIGH |
| E-03 | Migrations 0001–0007 apply clean; models↔migrations consistent | RUNTIME | migrate output; `makemigrations --check` output | executed | HIGH |
| E-04 | SECRET_KEY fail-fast at DEBUG=False | RUNTIME | RuntimeError observed twice (check w/o env) | executed | HIGH |
| E-05 | ALLOWED_HOSTS rejects forged Host | RUNTIME | probe5 P4.01 status 400 | executed | HIGH |
| E-06 | CSRF enforced (403 tokenless POST) | RUNTIME | probe5 P3.01; prior qa45 S2.01 | executed | HIGH |
| E-07 | Employee bounced from panel surfaces (302 RAW) | RUNTIME | probe5b P1.02r/P1.05r | executed | HIGH |
| E-08 | Employee POSTs to staff mutations blocked (403/302) | RUNTIME | probe5b P1.03r, probe5c P2.06r/P2.07r | executed | HIGH |
| E-09 | Employee data isolation (empty state for zero-data user while others hold rows) | RUNTIME | probe5c P2.04f + view filter code | executed + repository | HIGH |
| E-10 | '90' substring = Tailwind class, not data leak | REPOSITORY | `base_employee.html:35` (`bg-slate-900`) | static grep | HIGH |
| E-11 | Single-ACTIVE material invariant under race | RUNTIME+DATABASE | truth45 invariants after 5-way pagdi race; warp double-assign live | ORM truth queries | HIGH |
| E-12 | Archive refresh semantics: quantities refreshed, paid flag preserved | DATABASE | truth45 Beta/Alpha/Gamma rows post-archive; CLI dry-run==real | executed | HIGH |
| E-13 | Audit chains exact & actor-correct; name snapshots populated | DATABASE | truth45 audit counts; unit AuditSurvivalTests | executed | HIGH |
| E-14 | DEBUG=False errors now log full tracebacks | RUNTIME | `server45_err.log` django.request ERROR + traceback | observed log | HIGH |
| E-15 | Session cookie HttpOnly=True / SameSite=Lax defaults | CONFIG | Django `global_settings.py` lines; settings.py untouched | source review | MEDIUM (runtime capture inconclusive — harness header collapse) |
| E-16 | No TLS hardening settings present | CONFIG | settings.py grep (no SECURE_*/COOKIE_SECURE) | static | HIGH |
| E-17 | No raw SQL/eval/pickle/mark_safe in app code | REPOSITORY | grep across accounts/core py files → 0 matches | static | HIGH |
| E-18 | Formula duplication persists (≥5 inline sites vs service) | REPOSITORY | views.py:119/315/607/675/739 vs services.py:106 | static | HIGH |
| E-19 | SignupForm dead code | REPOSITORY | forms.py; zero references project-wide | static grep | HIGH |
| E-20 | WarpChangeHistory missing from admin registration | REPOSITORY | core/admin.py registers 8 models, excludes it | static | HIGH |
| E-21 | Prior-session live QA results (approve/work/auth/money/reports/sec) | DOCUMENTATION+RUNTIME(prior) | `%TEMP%\opencode\serverloom-qa\qa45_*.txt` against byte-identical source (hash-compared) | file review + hash check | MEDIUM-HIGH |
| E-22 | Scheduler absent for archive/carry | REPOSITORY | no cron/Celery/clock config anywhere (Phases 2/4/5 sweeps) | static | HIGH |
| E-23 | PostgreSQL/deploy-stack behavior unverified | INFERENCE | absence of environment (not absence of quality) | environmental limit | N/A (NOT VERIFIED by rule) |
| E-24 | Phase 4 crash-input classes now friendly | AUTOMATED_TEST+RUNTIME | stabilization units; qa45 W/M batches; this-session dup-entry probe | multiple sources | HIGH |
| E-25 | Health endpoint `/` returns 200 string | RUNTIME | every server start this phase | executed | HIGH |

No claim in the final report rests solely on LOW-confidence inference; E-23-class items are explicitly carried as NOT VERIFIED.
