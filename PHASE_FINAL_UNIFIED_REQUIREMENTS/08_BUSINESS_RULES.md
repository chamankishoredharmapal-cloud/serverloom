# 08_BUSINESS_RULES.md

All 40 BR rules imported verbatim as requirements, each with enforcement owner. (Full text: Phase 6 BUSINESS_RULE_INVENTORY; disposition proven: Phase 10.)

| ID | Rule | Module/Owner | Enforced at | Invalid behavior |
| -- | ---- | ------------ | ----------- | ----------------- |
| BR-001 | staff-only production writes | M3 | RLS+RPC | FORBIDDEN |
| BR-002/027 | count int ≥0; zero legal | M3 | Zod+CHECK | friendly reject |
| BR-003 | one entry per worker-day | M3 | UNIQUE+catch | DuplicateError |
| BR-004 | phone unique identity | M1/M2 | UNIQUE | reject dup signup |
| BR-005 | ACTIVE-only eligibility on writes | M2..M6 RPCs | in-RPC check | INELIGIBLE_WORKER |
| BR-006 | rate ≥0 staff-set | M5 | CHECK+RPC | reject |
| BR-007..008 | give>0 additive / clear→0 audited no-op | M6 | locked RPC | ValueError path |
| BR-009/010/011 | ONE-ACTIVE + atomic auto-finish + capacity ≥0 | M4 | partial UNIQUE+tx | constraint/typed rejects |
| BR-012 | Mon–Sun week sole source | lib/domain/week.ts | import discipline | n/a |
| BR-013 | negative payable legal everywhere | ledger/UI/exports | signed columns; no clamp | n/a (invalid = clamping) |
| BR-014..018 | archive quantity authority/preserve payment/idempotent/--date/every-worker | M7 RPC | column-list upsert+advisory lock | trigger-guard option reserved |
| BR-019..020 | carry factor ≥0; SYSTEM audits incl zeros | M6 CLI/RPC | pre-check+always-audit | abort rc≠0 |
| BR-021 | settlement current-week only | M5 | bounds from today | archived flips blocked (D-03) |
| BR-022 | approval gates session | M1 | status≠ACTIVE ⇒ no cookie | refusal message |
| BR-023 | export pricing basis CURRENT default | M8 | PricingStrategy seam | D-08 open |
| BR-024 | any date accepted; window filters exclude future | M3 | storage free, query filtered | — |
| BR-026 | correction=remove+recreate explicit fail | M3 | delete+NotFound | silent-success forbidden |
| BR-028 | pagdi date required / warp forced today | M4 | service contract | START_REQUIRED / override |
| BR-029 | completion asymmetry (warp finish UI) | M4 | route exposure | D-05 may unify |
| BR-032 | unpaid flags-only benign no-op | M5 | rowcount guard | — |
| BR-034 | vestigial counter | — | NOT APPLICABLE (absent) | — |
| BR-036 | one-way lifecycle default | M2 | no revoke writer | D-01 extends |
| BR-037/038/039/040 | archive --date targeting · carry phase-independent · rate live/frozen semantics · carry non-idempotence hazard | M7/M6/M5/M6 | implemented | D-04 guard if automated |

Open-decision seams carried: D-01 values · D-02 soft-delete mode · D-03 flips policy · D-04 automation · D-05 symmetry · D-07 breadth · D-08 basis · D-09 notifications. Each ships a safe default; none silently resolved.
