# WORKFLOW_IMPLEMENTATION.md (Phase 9.5)

Every workflow implements the mandated chain: UI → server action → Zod validation → role check → RPC transaction → DB constraint/locks → audit (same tx) → result → flash/revalidate.

| Workflow | UI entry | Chain implementation | Runtime evidence |
| -------- | -------- | -------------------- | ---------------- |
| Registration → approval → first login | /signup → /login; admin Workers Approve | registerAction(PENDING) · approveWorkerAction → approve_worker RPC | DB harness: idempotent single-event approval ★ |
| Production recording + correction | admin worker detail forms | addEntry/removeEntry actions → create/remove_production_entry (unique arbitration, before-image audit) | 3-way duplicate race: 1 row + typed rejects ★ |
| Weekly accumulation & salary view | /app dashboard + admin weekly grid | weekGrid/currentWeekFor precompute (CALC-002 live) | build-green pages consuming service rows ✓ |
| Advance give/clear/carry | weekly grid ops; carry via ops API | giveAdvance/clearAdvance/carry → locked RPCs + unconditional audits | parallel gives exact-sum ★; truncation edges ★ |
| Material assignment/completion | /admin/materials/{pagdi,warp} | assignMaterial (WARP start=today) · Finish button → finish_material in-lock no-op guard | reassign auto-finish ONE-ACTIVE ★; 3-way race ★ |
| Payment settlement/reversal | weekly grid Mark paid/unpaid | markPaid two-path upsert · markUnpaid flags-only benign no-op | quantities preserved on re-pay ★ |
| Weekly archive (+dry-run ritual) | admin home console; POST /api/ops/archive | runWeek → archive_week (advisory lock, column-group discipline) | rerun created=0 ★; payment preserved ★; dry-run writes nothing ★; parallel archives serialize ★ |
| History surfaces | /app/history,/app/salary,/app/production; /admin/ledger; /admin/audit | read-only service queries over authoritative stores | build-green; data from verified stores ✓ |

Legend: ★ = RUNTIME-VERIFIED this phase (scripts/verify-db.mjs); ✓ = implemented + compile/build verified; end-to-end browser automation NOT yet run (see TEST_MATRIX gaps).
