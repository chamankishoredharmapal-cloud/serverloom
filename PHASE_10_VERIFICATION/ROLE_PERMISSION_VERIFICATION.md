# ROLE_PERMISSION_VERIFICATION.md (Phase 10.7)

Tested at THREE layers per sensitive feature: HTTP surface, DB policy (RLS), and RPC claim re-check. Claims-based runs used a dedicated NON-SUPERUSER connection (`appclient` + `SET ROLE authenticated` + JWT-claims GUCs) replicating the Supabase runtime contract — the earlier superuser-bypass discovery is documented in EXECUTION_CHECKPOINT.

| Capability | Anonymous | Worker (A/B) | Staff | Superadmin | Evidence |
| ---------- | --------- | ------------ | ----- | ---------- | -------- |
| Read own production/ledger/materials | redirect ★ | ALLOW own-only ★ (RLS-01..03: B's rows invisible to A) | ALLOW all ★ (RLS-04) | same as staff | harness |
| Mutate any domain data directly (SQL) | DENY (no grant) | DENY ★ (SEC-01 permission-denied) | DENY (client grants zero) | via owner only | grant probe |
| approve/lifecycle/rate/advance/settle/material RPCs | n/a (no route) | DENY ★ (SEC-03 FORBIDDEN) | ALLOW ★ | ALLOW | harness |
| audit_events read | DENY | INVISIBLE (0 rows via policy) ★ | policy-hidden (staff≠SUPERADMIN) | VISIBLE ★ (SEC-02 probe rn=SUPERADMIN) | harness |
| archive/carry ops endpoints | 401 ★ | n/a (HTTP 401 first) | n/a (secret-gated, not session) | secret holder | smoke ★ |
| Exports (XLSX/PDF) | redirect ★ | redirect (non-staff) ★ | 200 + content ★ | 200 | EXP/SEC set |
| Admin UI surfaces | redirect ★ | redirect ★ (ROLE-01) | 200 ★ (ROLE-02) | 200 | UI checks |

Staff≡Admin equivalence preserved exactly as Phase 6 observed (single STAFF/SUPERADMIN distinction only for audit read + reserved surfaces).

NOT VERIFIED (provider-dependent): Supabase-issued JWT acceptance end-to-end (anon/authenticated key flows), provider-side password/throttle policies.
