# Phase 5 — Security Report (Independent Reconciliation)

All runtime probes executed fresh this phase against `DEBUG=False` server on an isolated DB. Safe verification only; no exploitation beyond proof of control.

## 1. Controls Verified (runtime unless noted)

| Control | Result | Evidence |
| ------- | ------ | -------- |
| CSRF enforcement | PASS | tokenless staff POST → **403** (two independent sessions); forms embed `{% csrf_token %}` |
| Method guards on mutations | PASS | 14 `POST-only` guards; GET approve → **400**; GET warp-finish → 400 |
| AuthN gates | PASS | anonymous → 302 login (`?next=`); unapproved account refused |
| AuthZ role separation | PASS | employee → panel page RAW status **302**; employee POST to staff mutation → **403/302 blocked**; export/slip → 302 |
| Object-level isolation | PASS | employee B (no data) sees empty state while other employees hold paid rows; view code filters `employee=request.user`; unit `test_employee_cannot_set_own_rate` PASS |
| Host validation (BUG-20) | PASS | forged `Host: evil.example.com` → **400 DisallowedHost** |
| Secret management (BUG-20) | PASS | boot without `SECRET_KEY` at DEBUG=False → **RuntimeError** (observed twice) |
| DEBUG exposure | PASS | DEBUG defaults False; 404 page generic, no traceback/config strings |
| Error logging w/o leaks (BUG-16) | PASS | full tracebacks captured to stderr (`django.request ERROR`), no secret material in formatter |
| SQL injection surface | PASS (static) | zero `raw(`/`execute(`/`eval(`/`pickle`/`mark_safe` matches across app code — ORM-only |
| Session cookie flags | PASS (config authority) | settings unset → framework defaults verified in Django `global_settings.py`: `SESSION_COOKIE_HTTPONLY=True`, `SESSION_COOKIE_SAMESITE="Lax"`; runtime header capture was harness-unreliable (multi-header collapse), Phase 4 observed SameSite=Lax live |

## 2. Contradictions Reconciled During Audit

Initial probe batch reported apparent authorization failures (employee reaching panel with 200). Instrumented retest proved these were **harness artifacts** (redirect-following masked the 302 login bounce; empty-history pages contain no name markers). Raw-status retest confirmed all bounces. Additionally, suspected "data leaks" ('75'/'90' substrings on wrong pages) were traced to marker contamination: '90' matches the Tailwind class `bg-slate-900` in `base_employee.html:35`. Final: isolation and boundaries HOLD.

## 3. Findings / Gaps

| Finding | Priority | Action |
| ------- | -------- |--------|
| No TLS/session hardening settings: `SECURE_HSTS_SECONDS=0` (default), no `SECURE_SSL_REDIRECT`, no `SESSION_COOKIE_SECURE`/`CSRF_COOKIE_SECURE`, no `SECURE_PROXY_SSL_HEADER` | **P2** | REQUIRES FIX before public production deployment (fine behind trusted TLS proxy for internal use; configure at deploy time via env) |
| Dependency CVE triage not performed (pins current-ish: Django 5.2.8, Pillow 11.1.0) | P3 | NOT VERIFIED — run `pip-audit` pre-production |
| Login/signup rate-limiting absent (Django default) | P4 | ACCEPTABLE RISK for internal workshop tool; revisit if exposed publicly |
| Cloudinary media storage configured unconditionally; upload path never exercisable in app UI | P4 | NOT VERIFIED (no credentials; no upload surface) |

## Verdict

SECURITY: VERIFIED ADEQUATE FOR INTEGRATION (internal/trusted deployment context). One P2 hardening item is deploy-time configuration, not an application defect; it does not block starting integration work but MUST be closed before real-world rollout.
