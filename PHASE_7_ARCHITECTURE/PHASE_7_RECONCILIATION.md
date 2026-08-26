# PHASE_7_RECONCILIATION.md (Phase 7.11)

Self-challenge of the proposed architecture against Phase 6 authority. Method: for each requirement cluster, ask "where exactly does it live, what enforces it, can my design violate it?" Contradictions found and resolved:

| # | Potential contradiction | Analysis | Determination |
| - | ----------------------- | -------- | ------------- |
| X-01 | Phase 6 requires audit (AUD-006..009) → does architecture have an owner? | AuditService.emit inside every mutating service tx; append-only table; UPDATE/DELETE denied | RESOLVED — owned; D-07 only gates event breadth |
| X-02 | Employee isolation required → is it enforceable? | 3 layers: no id-bearing worker routes; RLS own-row SELECT-only; server-layer scope asserts | RESOLVED — DB+server enforced, not UI-only |
| X-03 | Historical salary required → live-rate-only storage would break it | weekly_ledger stores rate/gross/final snapshots at freeze/create; live reads never rewrite | RESOLVED |
| X-04 | Weekly archive → who is authority? | ArchiveService sole quantity-writer via dedicated RPC; cron/manual triggers call ONLY it | RESOLVED |
| X-05 | One ACTIVE warp → could multiple rows exist? | partial unique index makes it DATABASE-impossible even under races | RESOLVED (stronger than external mechanism) |
| X-06 | Idempotent archive → strategy? | UNIQUE(worker,week)+UPSERT + counts report + advisory lock on week key | RESOLVED |
| X-07 | Payment preservation → archive overwriting payment? | freeze UPDATE column-list excludes payment group; ADR-007 optional trigger guard | RESOLVED (+belt-and-suspenders option) |
| X-08 | Audit survival vs deletion policy | audit_events actor SET NULL + name snapshot; no delete paths; ledger FK gated by D-13 with RESTRICT default | RESOLVED pending D-13 choice (documented) |
| X-09 | UI owning salary calc duplication risk | pages receive precomputed values; parity test suite mandated (CALC-009); review gate in ownership map | RESOLVED by construction mandate |
| X-10 | RLS vs application authorization disagreement possibility | RLS = invariant floor; services = workflow rules; conflicts impossible because writes route through security-definer RPCs that re-check claims | RESOLVED (layer contract documented) |
| X-11 | Two services authoritative for same rule? | ownership matrix assigns exclusive writers per column/table; cross-service write prohibition rule | RESOLVED |
| X-12 | BR-013 negative payable vs CHECK constraints | CHECKs apply to INPUT columns only; ledger final_pay signed by design | RESOLVED |
| X-13 | Carry exact-math (ADR-008) vs C64 truncation semantics | rational/Decimal ROUND_DOWN ≡ toward-zero on ≥0 outputs; artifact class removed without behavior change | RESOLVED — improvement preserves observable contract |
| X-14 | D-13 default RESTRICT vs external CASCADE parity claim | Phase 6 marks cascade destruction as gap (not requirement); default protects history; parity achievable by explicit flip | RESOLVED as recommendation, decision open |
| X-15 | No MV1 repo vs "REUSE" expectations | baseline documents absence; mapping uses NEW with re-run trigger | HONEST BLOCKER recorded — not papered over |

Contradictions remaining: **0**. Assumption risks: stack presumption (ADR-001) — flagged for confirmation.
