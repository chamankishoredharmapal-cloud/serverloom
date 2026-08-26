# STATE_MACHINE_VERIFICATION.md (Phase 10.6)

| SM | Valid transition | Invalid/repeat/terminal | Unauthorized | Concurrent | Verdict |
| -- | ---------------- | ------------------------ | ------------ | ---------- | ------- |
| SM-01 account | PENDING→ACTIVE via staff RPC (WF-01 ★) | invalid enum → CHECK reject | worker attempt → FORBIDDEN ★ (SEC-03, real client role) | approval race: single event on client-role run; FLAKY duplicate event under superuser-bypass sessions → F-RACE01 P3 | PASS w/ finding |
| SM-02 session | role-routed lands | — | anonymous blocked all surfaces ★ (H-set) | n/a | PASS |
| SM-03 production row | create→EXISTS (CALC seeds) | duplicate-day reject ★; forged-id remove NotFound ★ | client INSERT grant-denied ★ (SEC-01) | parallel dup race single-row ★(P9) | PASS |
| SM-06/07 materials | assign→ACTIVE; reassign auto-finish; explicit finish | re-finish = ALREADY_FINISHED strict no-op, NO extra event ★ | PENDING ineligible ★; worker RPC FORBIDDEN ★ | 3-way assigns ONE-ACTIVE ★(P9); index makes violation impossible | PASS |
| SM-04 ledger birth | SETTLEMENT snapshot path; ARCHIVE canon path | unique(worker,week) arbitrates creators | writes only via two RPCs | settlement race single-row PAID ★ (CC-01) | PASS |
| SM-05 payment flags | paid↔unpaid flips | repeats converge; absent-row benign no-op | non-staff denied by RPC gate | parallel mark-paid single-row ★ | PASS |
| SM-08 week | OPEN→ARCHIVED canonical; rerun refresh | dry-run writes nothing ★ | non-operator FORBIDDEN unless SYSTEM/owner | parallel archives serialize (advisory lock) ★ | PASS |
| SM-09 balance | give/clear/carry edges incl. wipe-to-zero | negative/factor-invalid rejected pre-write | staff-only RPCs | FOR UPDATE serialization exact-sum ★(P9) | PASS |
| SM-10 audit stream | append-only growth with every mutation | UPDATE/DELETE revoked (grant probe) | worker SELECT invisible / superadmin visible ★ (SEC-02) | in-tx emission keeps pairing under races (CC set) | PASS |

State-forging attempts: direct table writes by client roles are grant-blocked before RLS even evaluates (SEC-01) — forging is structurally unavailable.
