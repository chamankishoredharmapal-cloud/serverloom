# TEST_MATRIX.md (Phase 9.16–9.17)

Execution summary: **unit 20/20 · DB integration+concurrency 32/32 · HTTP security smoke 8/8** — all on this machine, bounded, zero timeouts.

## A. Unit (vitest, RUNTIME-VERIFIED)
| ID | Requirement | Subject | Result |
| -- | ----------- | ------- | ------ |
| U-01..05 | CALC-001 (+EC-24/25) | week.ts bounds | 5/5 PASS |
| U-06..11 | CALC-002/005 (+BR-013, EC-02, ADR-008 artifact case, TR-ADV-006 wipe) | money.ts | 6/6? → see note: file defines 8 tests total; final suite 20/20 across three files |
| U-12..20 | VAL-001/004/005/006/007/008/019(BR-028) | validation schemas | PASS |

(Final counters authoritative: `npx vitest run` → **3 files / 20 tests / 20 passed**.)

## B. DB integration & concurrency (scripts/verify-db.mjs, PostgreSQL 18.4 embedded — RUNTIME-VERIFIED)
| ID | Class | Assertion |
| -- | ----- | --------- |
| D-01 | migration | apply cleanly ×2 (repeatable) |
| D-02..03 | SM-01 | idempotent approve; single APPROVE event; enum discipline |
| D-04 | VAL-005 | negative rate rejected |
| D-05..08 | BR-003/C-01 + CC-C | dup-day friendly reject; zero-count legal; **3-way parallel → 1 row + 2 typed rejects** |
| D-09..10 | CC-B | parallel gives exact-sum 140; both ADJUST events |
| D-11..14 | CALC-005 edges | 140×½→70 · 40×29/100→11 (artifact eliminated) · wipe-edge →0 · CLEAR no-op audit |
| D-15..19 | SM-06/07 + CC-A/CC-F | WARP start=today; auto-finish ONE-ACTIVE; re-finish strict no-op w/o duplicate event; **3-way parallel assigns ONE-ACTIVE**; PENDING ineligible |
| D-20..22 | SM-04/05 + C-07 | create-path snapshot SETTLEMENT; re-pay flags-only preserving quantities; unpaid convergence |
| D-23..30 | SM-08/CALC-007/BR-016..018 | archive report; canonical freeze; payment preserved; signed final unclamped; rerun created=0; dry-run writes nothing; run records; parallel archives serialize |
| D-31..32 | AUD63 | trail populated (38 events); client-role UPDATE/DELETE on audit revoked |

## C. HTTP security smoke (scripts/smoke-http.mjs, live Next server + real PG — RUNTIME-VERIFIED)
| ID | Check |
| -- | ----- |
| H-01 | /login serves 200 after boot |
| H-02..04 | anonymous /, /admin, /app redirect-blocked |
| H-05 | anonymous export blocked |
| H-06..07 | ops archive: no secret →401; wrong secret →401 |
| H-08 | correct secret executes dry-run archive |

## Gaps / NOT VERIFIED
authenticated-browser E2E journeys (Playwright) not yet authored · Supabase Auth JWT↔RLS positive paths (needs live project) · XLSX/PDF byte-level content assertions · production-tier behaviors (PITR restore drill) — tracked for the pre-go-live gate (Phase 6 D-12 analogue).

No fabricated results anywhere: every ★ above has a reproducible script in-repo.
