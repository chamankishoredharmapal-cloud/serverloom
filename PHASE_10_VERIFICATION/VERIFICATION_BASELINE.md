# VERIFICATION_BASELINE.md (Phase 10.0–10.1)

| Item | Value |
| ---- | ----- |
| Repository | `management-v1/` (created in Phase 9; greenfield) |
| Git HEAD at verification | `269e3af` (PHASE9-SECURITY) + docs commits; working tree contained only test-harness additions |
| Node | v24.18.0 · npm 11.18.0 · git 2.55.0 |
| Database | Embedded PostgreSQL 18.4 (disposable per-run clusters under %TEMP%; deleted after each) |
| Schema version | migrations 0001–0004 applied cleanly ×2 (repeatability re-proven) |
| App runtime | `next start` on localhost:4010 (HTTP checks) with DATABASE_URL + OPS_SECRET env |
| Auth config | Local-mode bridge active; Supabase cloud project ABSENT → JWT-issuance items remain NOT VERIFIED by environment constraint |
| Provider status | No Supabase project exists; RLS verified via Supabase-contract shim (auth schema + uid() from claims GUC + SET ROLE authenticated) inside disposable DB |

## Environment verdicts

| Check | Verdict |
| ----- | ------- |
| Install/build | PASS (`next build` exit 0; routes compiled) |
| Migrations | PASS (clean ×2) |
| DB connectivity / RPCs | PASS (44-check harness) |
| Server/frontend startup | PASS (/login 200 after boot poll) |
| Auth provider | PARTIAL — local-mode verified; Supabase cloud NOT VERIFIED |
| Browser E2E tooling | NOT VERIFIED (no Playwright installed; HTTP-body assertions used instead) |

Isolation: no production systems touched; every destructive-capable action ran against throwaway clusters removed post-run.
