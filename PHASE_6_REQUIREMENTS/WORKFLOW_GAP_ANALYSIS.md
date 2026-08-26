# WORKFLOW_GAP_ANALYSIS.md (Phase 6.2)

Business processes that are incomplete, contradictory, or undefined in the reference application. Each is a REQUIREMENTS/RISK finding for Management-V1 — none is silently accepted.

| ID | Workflow | Gap | Evidence available | Possible interpretations | Risk | Human clarification required |
| -- | -------- | --- | ------------------ | ------------------------ | ---- | ---------------------------- |
| G-01 | WF-001 lifecycle | Worker lifecycle is ONE-WAY: no deactivate/suspend/rehire/delete flow exists in-app; approval irreversible | full route/UI sweep; Phase 2 | (a) workforce assumed stable; (b) handled out-of-band via super-admin | departed workers keep appearing in pickers/grids/archive forever | YES — define worker states for Management-V1 |
| G-02 | WF-004 correction | Correction = delete+recreate only; deletion leaves NO audit trace | views.py delete branch; Phase 4 §16 | (a) trust-based workshop; (b) oversight | disputes about removed production unverifiable | YES — decide audit depth |
| G-03 | WF-007 boundary | Payment flags changeable only for CURRENT week; archived past weeks immutable through app | mark endpoints use today's week bounds | (a) intended finality; (b) missing back-correction UI | late corrections require super-admin surgery | YES — define retro-payment policy |
| G-04 | WF-009 | Carry NON-IDEMPOTENCE vs unattended execution: any scheduler double-fire with f≠1 compounds balances | K-series compounding runtime proof | (a) operator-only tool; (b) needs once-per-period guard in Management-V1 | data corruption under automation | YES — scheduling policy decision (Phase 5 P2) |
| G-05 | WF-010 vs WF-011 asymmetry | Pagdi lacks explicit finish control (warp has one); employee self-finish branch inert | template/route grep 6.1 C-01 | (a) implicit-completion-by-reassign is the intended pagdi model | operators cannot close a pagdi without assigning a new one | YES — unify or document material completion models |
| G-06 | WF-008 ownership | Nothing defines WHO/WHEN runs weekly archive; weeks stay open forever without an operator | no scheduler anywhere (Phases 2/4/5) | manual ritual / future cron / M-V1 built-in | history empty + stale live numbers if forgotten | YES — operational owner + cadence |
| G-07 | WF-014 coverage | No audit events for approvals, rate changes, payment flips, production add/delete; AlertEmail registry inert | Phase 4 §16; models sweep | partial build-out abandoned | accountability holes for sensitive flips | YES — target audit matrix (AUD requirements already drafted) |

Additional minor observations (no workflow risk): legacy session key written at login (unused); duplicate login route; alias dashboard route.

## Unverified (investigation-bounded, not gaps in evidence quality)

- PDF slip text-layer content — no extractor available in any phase.
- PostgreSQL-specific concurrency behavior — environment unavailable.
Both carried into Master spec §24.
