# WORKFLOW_RECONCILIATION.md (Phase 6.2 — Independent Second Pass)

Second-pass review comparing: Feature Catalog (6.1) vs Workflow Map (this phase) vs Business Rules/Calculations/States (Phase 6 requirement set IDs referenced in traceability) vs Phase 5 findings.

## Orphan checks

| Check | Result |
| ----- | ------ |
| Features appearing in NO workflow | NONE among verified (F-12/F-13/F-32/F-33 explicitly classified ADMINISTRATIVE/SUPPORTING/PARTIAL in traceability) |
| Workflow steps with no owning feature | NONE — every step cites a feature/route evidence |
| Calculations with no workflow | NONE — CALC-001..009 all consumed by WF-004..WF-013 |
| States with no transition | STATE-008 session states fully transitioned via WF-002; no orphan enums |
| Permissions with no workflow | CSRF/POST-only guards exercised inside WF-004/007/010/011 failure paths — mapped to SEC requirements |
| Data changes with no business action | Vestigial counter zeroing occurs ONLY inside archive — documented as accepted legacy behavior, not an orphan action |
| Business actions with no audit requirement | Identified as GAPS G-02/G-07 and converted INTO audit requirements (AUD-006..009) rather than ignored |

## Discrepancy explanations vs prior phases

1. **Phase 2 listed "employee finishes own pagdi" as a feature (#10)** → reconciled: inert branch; catalog F-08 carries it as OBSERVED INERT; workflow spec excludes from reachable flows. No contradiction — Phase 2 already flagged BACKEND_ONLY.
2. **Phase 2 #5 detail-approve BACKEND_ONLY** → same resolution under F-04 (inert alternate).
3. **Phase 3 "six formula implementations"** → preserved as engineering-debt finding R-06; workflow spec deliberately specifies ONE business calculation rule per quantity (CALC authority), explicitly refusing to replicate duplication.
4. **Phase 4 "archive skip-if-exists freezes rows"** → superseded by pinned refresh semantics (BUG-17 fix); workflows document the CURRENT verified authority model.
5. **Phase 5 P2 items** → carried into gaps G-04/G-06 and Master open questions so they survive into implementation planning.

## Blind developer test (workflow dimension)

Verdict: PASS for business-operation understanding. A developer holding only these Phase 6 documents can describe onboarding→production→pay→payment→archive→history→export end-to-end, both material lifecycles including their one verified asymmetry, advance/carry semantics incl. the non-idempotence hazard, all failure/recovery behaviors, idempotency classes, temporal rules (Mon–Sun, timezone, future-dating), and the authority model separating quantities from payment state.

Known content a developer would still lack (explicitly marked UNKNOWN elsewhere): notification intent (F-34), worker-offboarding policy (G-01), retro-payment policy (G-03) — all require human decisions, not more code investigation.
