# POST_MIGRATION_VALIDATION.md (Phase 11.14)

Data-migration validation: NOT APPLICABLE now (no source rows). This document defines the GREENFIELD ACCEPTANCE VALIDATION that must be executed and evidenced at go-live (steps 5–7 of the runbook), plus the security re-checks carried from Phase 10.

## Go-live validation checklist (to be executed on the production project)

COUNTS: create 1 staff + N real workers; profiles count == expected roster.
FINANCIALS: enter known production for one worker; grid final == hand-computed pieces×rate−balance (independent arithmetic); settle week; ledger row matches; archive freezes identical values; rerun created=0.
STATE: material assign/finish produces ACTIVE→FINISHED with single-ACTIVE invariant; unpaid⇄paid flips converge; canonical flags set by archive only.
HISTORY: every action above produced its audit event with correct actor/kind.
SECURITY: worker A cannot read worker B (HTTP + direct-RPC attempt FORBIDDEN); anonymous blocked everywhere; ops endpoints secret-gated.
APPLICATION: weekly grid, dashboards, ledger page, audit viewer, both XLSX exports, slip PDF all render/download against live-entered data (XLSX parsed and compared to DB truth).

Each row must be recorded with actual values + evidence reference before PRIMARY status is granted. Any mismatch = ROLLBACK trigger per ROLLBACK_PLAN.
