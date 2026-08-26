# EDGE_CASE_CATALOG.md (Phase 6.8)

Boundary/edge catalog consolidated from Phase 4 §10-12, Phase 4.5 truth batches, C64 test matrix, and this session's verifications. Labels: ★ RUNTIME/TEST, ◆ CODE, SPEC = formula-derived expectation.

## Zero-value edges
| ID | Case | Behavior | Label |
| -- | ---- | -------- | ----- |
| EC-01 | zero-count production entry | stored; contributes 0 everywhere | ◆ |
| EC-02 | zero-rate worker | work records fine; earnings 0; P=−A | ◆ |
| EC-03 | zero-capacity assignment | Rem=0 instantly | ◆ |
| EC-04 | zero-balance clear | audited NO-OP CLEAR row | ★ |
| EC-05 | zero-balance carry | audited NO-OP CARRY per worker | ★ |
| EC-06 | zero-production worker archive | full zeros ledger row created (0≠missing) | ★ |
| EC-07 | empty week aggregates | SUM NULL→0 via `or 0`; no exceptions | ◆ |
| EC-08 | empty histories UI | clean empty states (isolation-proven) | ★ |
| EC-09 | carry factor 1.0 on zero balance | no-op audit only | ★ |

## Negative edges
| EC-10 | negative count/rate/capacity/balance-input/factor | ALL rejected at validation/storage | ★ |
| EC-11 | final payable negative | displayed, stored, exported, payable — NEVER clamped (pinned) | ★ |
| EC-12 | advance > gross | P<0 persists through archive with paid flag coexisting | ★ |
| EC-13 | remaining overshoot | Rem clamps 0; true M stays exact | ★ |

## Magnitude / type edges
| EC-14 | extremely large counts/rates | Python bigint exact; no overflow path | ◆ |
| EC-15 | non-numeric numerics (count/capacity/amount/rate) | friendly rejects / clean 400 | ★ |
| EC-16 | float artifact carry: B=100,f=0.29 → 28 (not 29) | confirmed semantic of int(B×float f) | py-verify ★ |
| EC-17 | fraction discard: 25×0.5→12; 35×0.1→3; 145×0.1→14 | truncation toward zero ≡ floor on domain | py-verify ★ |
| EC-18 | truncation-to-zero wipe: B=1,f=0.5 → balance ZERO | new formalized edge TR-ADV-006 | ◆+py-verify |

## Date/time edges
| EC-19 | blank entry date | defaults to server-local today | ★ |
| EC-20 | malformed date strings | friendly reject, zero change | ★ |
| EC-21 | future-dated entries | stored; EXCLUDED until week current (both rollover directions) | ★ |
| EC-22 | past-dated back-fill inside window | included immediately | ★ |
| EC-23 | midnight/day rollover during session | bounds math correct; harness error ruled out | ★ |
| EC-24 | year-boundary week (2025-12-31) | [2025-12-29..2026-01-04] | py-verify ★ |
| EC-25 | leap-year week (2024-02-29) | [2024-02-26..2024-03-03] | py-verify ★ |
| EC-26 | archive --date arbitrary week | targeted freeze works | ★ CLI runs |

## Identity/state edges
| EC-27 | forged/nonexistent worker id (forms) | friendly rejection | ★ |
| EC-28 | forged id on detail/finish routes | clean 404 | ★ |
| EC-29 | login before approval | refusal WITHOUT session | ★ |
| EC-30 | repeat approve / repeat payment clicks | idempotent converge | ★ |
| EC-31 | mark-unpaid with ABSENT row | silent success no-op (benign asymmetry) | ◆★ |
| EC-32 | warp re-finish after FINISHED | info message; service skipped | ★ |
| EC-33 | assign while ACTIVE exists | auto-finish old + create new; single-ACTIVE under race | ★ |
| EC-34 | employee self-finish pagdi crafted POST | server-live branch executes ("Finished by employee") — INERT-BUT-LIVE surface (PG6.6-08) | ◆+★ KT-05 runtime |
| EC-35 | detail-page action=approve crafted POST | server accepts (inert branch) | ◆ |

## Correction/repeat/archive edges
| EC-36 | delete then recreate same day | allowed after delete (unique constraint interplay) | ★ batch |
| EC-37 | mid-week pay then more work | snapshot stale TEMPORARILY; archive refreshes preserving paid | ★ |
| EC-38 | archive rerun ×3 | created=0; values identical | ★ |
| EC-39 | dry-run predictions | exactly match real run (3c+1r case) | ★ |
| EC-40 | post-archive raw-row delete | ledger UNCHANGED → drift (D-02 open) | ◆ |
| EC-41 | rate change mid-open-week | live re-prices whole week instantly; snapshots unaffected till archive | ◆ |
| EC-42 | SQLite parallel same-row writes | occasional lock-timeout 500 AFTER clean rollback (atomic-safe) | ★ documented |
| EC-43 | first record ever / fresh DB boot | all surfaces render zeros/empty correctly | ★ boots |
| EC-44 | already-cleared advance cleared again | audited deliberate no-op | ★ |
| EC-45 | carry repeated compounding | 100→50→25→(12) multiplies again — NON-IDEMPOTENT hazard D-04 | ★ chain |
| EC-46 | forged/nonexistent worker id on give/clear advance (final session) | **HTTP 500** — uncaught DoesNotExist, zero mutation, server ISE logged; sibling routes 404 (KT-06/OBS-SM-01) | ★ runtime |

Coverage: 46 catalogued edge behaviors; every row evidence-labeled; none invented.
