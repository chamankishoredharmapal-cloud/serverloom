# SECURITY_IMPLEMENTATION.md (Phase 9.10–9.15 hardening review)

## Implemented & verified

| Control | Where | Evidence |
| ------- | ----- | -------- |
| Approval gate before any session | authService.login (status≠ACTIVE ⇒ AuthzError, no cookie issued) | code ★ path; BR-022 parity |
| Generic credential failures | single message both branches | code ✓ |
| Anonymous gating all surfaces | layouts + root redirect + export route | HTTP smoke 4 checks ★ |
| Ops secret gate | /api/ops/* requires x-ops-secret == env | smoke: none/wrong/right trio ★ |
| Server-side role checks | requireStaff() in every admin action BEFORE validation | code ✓ |
| DB write-lockdown | client roles hold zero INSERT/UPDATE/DELETE on domain tables; writes only via security-definer RPCs that re-check claims | migration + grant probe ★ |
| Audit append-only | UPDATE/DELETE revoked from anon/authenticated/service_role | grant probe ★ |
| One-ACTIVE / worker-day / worker-week invariants | partial unique indexes | race probes ★ |
| Money safety | integer policy; exact carry truncation; negative payable unclamped by design | unit+runtime ★ |
| Secrets hygiene | .env.example contract; OPS_SECRET required for ops (absent ⇒ deny); no secrets in client bundle (server actions/route handlers only) | config ✓ |
| SQL-injection resistance | parameterized pg queries exclusively; pinned search_path in RPCs | code ✓ |
| Safe failures | domain error taxonomy; generic 500 message; server-side logging only | code ✓ |

## Known gaps (honest)

1. **Supabase Auth not wired** — JWT↔RLS claims path designed (conditional migrations ready) but NOT RUNTIME-VERIFIED; local bridge is dev-only.
2. **Rate limiting / password policy** — provider-config items pending live project (D-10 defaults recommended).
3. **CSRF posture** — Next.js server-action origin protections apply; formal CSRF test suite NOT VERIFIED.
4. **XSS** — React auto-escaping everywhere; no dangerouslySetInnerHTML present (grep-clean); dedicated XSS suite NOT VERIFIED.
5. **RLS positive-path tests** (authenticated-role reads) require Supabase or role-emulation harness — policies exist, fail-closed stub verified, positive flows PARTIALLY VERIFIED.
6. **IDOR surface** — structurally minimal (no id-bearing worker routes for self data; staff are global by design per PG6.6-01 classification).

None of the external app's weaknesses were ported: throttling/password-policy/TLS remain IMPROVE items tracked to deployment stage rather than silently dropped.
