# MASTER_REQUIREMENTS.md — Phase 6 Consolidated Functional Contract

Single entry document. Detail lives in the per-subphase files (listed §24); this master states the contract and points to authority. Perspective: Management-V1 rebuild contract for the external application's FUNCTIONAL behavior. Labels: CONFIRMED REQUIREMENT (CR) / OBSERVED BEHAVIOR (OB) / IMPLEMENTATION DETAIL (ID) / INFERRED / BUSINESS DECISION REQUIRED (BDR) / NOT VERIFIED (NV).

## 1. Executive Summary
The external application is a single-workshop piecework payroll system: workers self-register, admin approves and operates everything else; production entries drive weekly Monday–Sunday pay; advances deduct in full every week; materials track capacity progress; an operator command canonically freezes each week; exports report live and frozen data. Phase 6 extracted 109 rules + 9 calculation contracts + 10 state machines + 7 report specs across 10 subphases with zero unresolved contradictions.

## 2. System Purpose (CR)
Track worker output → compute weekly pay → manage wage advances → settle weeks → freeze history → report/export. Domains: Identity · Production · Payroll · Advances · Materials (Pagdi/Warp) · Archive · Reporting · Audit.

## 3. Actors (CR)
Anonymous · Employee (approved; OWN-ONLY) · Staff ≡ Admin (flag-based, global operators) · Superuser (panel-identical; /admin/ unrestricted) · System/CLI executor · Out-of-app super-admin boundary. Authority: `06_ROLE_PERMISSION_SPECIFICATION.md`.

## 4. Feature Catalog (CR: 31 verified features F-01…F-31; 6 observed/inert)
`01_FEATURE_CATALOG.md`. Entry-point merges: production ×2 forms, approval dual-path (one inert), dashboard alias.

## 5. Workflow Specification (CR: 14 workflows, 13 full + WF-014 partial-by-gap)
`02_WORKFLOW_SPECIFICATION.md` + inventory/dependency/traceability files.

## 6. Business Rules (CR/OB mix: BR-001…040 + VAL/CALC/STATE/SEC/DATA/AUD/OPS series = 109)
`03_BUSINESS_RULES.md`, `BUSINESS_RULE_INVENTORY.md` (P0=41, P1=48, P2=12, P3=5, P4=3). Cornerstones: phone identity · approval gate · one-entry-per-worker-day · Mon–Sun week · full-balance-every-week advance · negative payable PINNED · archive=quantity authority / settlement=payment authority · single-ACTIVE material · carry non-idempotence hazard · current-rate export pricing (D-08).

## 7. Calculation Rules (CR math: CALC-001…009)
`04_CALCULATION_SPECIFICATION.md`: integer arithmetic everywhere except carry float-multiply+truncation; empty→0 coalescing; NO rounding/clamping/proration; parity invariant across live consumers; worked examples runtime-proven (375 / −140 / paid-preserved refresh).

## 8. State Machines (CR: SM-01…SM-10, 20 states, 29 transitions)
`05_STATE_MACHINE_SPECIFICATION.md` (+ transition/test matrices, open questions). One reversible cycle only (PAID⇄UNPAID flags-only); terminals: DELETED-production, FINISHED-materials, ARCHIVED-week, out-of-app worker deletion; new micro-findings SBG-01/SBG-02 documented NOT fixed.

## 9. Role & Permission Matrix (CR)
`06_ROLE_PERMISSION_SPECIFICATION.md`, `ROLE_PERMISSION_MATRIX.md`, `AUTHORIZATION_TEST_MATRIX.md`, `PERMISSION_GAPS.md`. Structural employee isolation (runtime-proven); POST+CSRF on all mutations (GET 400 / tokenless 403 runtime-proven); forged ids fail closed EXCEPT give/clear advance → HTTP 500 zero-mutation (OBS-SM-01, runtime-reproven); staff≡admin; CLI shell-trust; ONE proven marginal employee write (crafted self-finish pagdi — PG-08/KT-05).

## 10. Data Requirements (CR domain data)
`DATA_REQUIREMENTS.md`: 11 entities (E-01..E-11 incl. implicit Week + inert AlertEmail); uniqueness triples; signed-vs-positive field discipline; snapshot groups with writer authorities; ⚠ ledger CASCADE-retention gap → D-13.

## 11. Validation Rules (CR: VAL-001…013 expanded)
`VALIDATION_RULES.md`.

## 12. Edge Cases (CR/OB: EC-01…EC-46)
`EDGE_CASE_CATALOG.md`.

## 13. Reports & Exports (CR: REP-001…007)
`REPORT_EXPORT_REQUIREMENTS.md`. Sole filter = employee search `?q=`; mixed pricing authority (D-08); slip content NV (D-11); streamed artifacts; no pagination.

## 14. Non-Functional Requirements
`NON_FUNCTIONAL_REQUIREMENTS.md`: security verified set + recommendation-tier gaps; NO SLA; availability gates (fail-fast secrets, health endpoint, manual jobs); backups NOT SPECIFIED; audit matrix; scale assumptions; usability feedback system; maintainability debts (formula duplication R-06); reliability atomicity classes; observability logging; deployment stack (Render/PG/Cloudinary/gunicorn/3.11).

## 15. Audit Requirements
Audited: ADJUST/CLEAR/CARRY + material CREATE/FINISH (actor incl. NULL-for-CLI, before/after, notes, survival). Required additions (M-V1): AUD63-006 production add/delete · AUD63-007 rate changes + payment flips · AUD63-008 identity events · AUD63-009 command trails + first-class read UI.

## 16. Historical Data Requirements
Archive canon (5 quantity fields ∀ workers) · payment group preservation · rerun idempotency · repair recipe (fix raw → rerun --date) · drift risk on post-archive raw edits (D-02) · retention policy open (D-13).

## 17. Concurrency Requirements
Proven: single-ACTIVE under races ★ · exact parallel give sums ★ · duplicate-day parallel safety ★ · atomic rollbacks ★ · parallel mark-paid pair → one row ★ · parallel approves benign ★. Documented untested edges: SBG-01 finish∥finish on PostgreSQL (SQLite probe NOT REPRODUCED) · SBG-02 archive∥insert window · archive∥payment pair · carry∥give pair. PG locking gate D-12.

## 18. Security Requirements
Verified set (authn/approval-gate/authz/CSRF/method/isolation/secrets/hosts/logging) = CR. Gaps routed as recommendations: TLS hardening OPS63-010, throttle/password policy D-10, granular roles optional.

## 19. Operational Requirements
Operator-run commands w/ strict dry-run-first ritual · scheduler ABSENT (ownership D-06) · carry guard mandatory if automated (D-04) · health endpoint · env-driven deploy config · timezone Asia/Kolkata pinned.

## 20. Known External-App Defects (NOT requirements)
Historical fixed: BUG-01..BUG-22 (per 4.5 closure), BUG-23 cosmetic debt OPEN, BUG-21 vestigial accepted. Open NEW (all LOW): SBG-01 finish∥finish TOCTOU (structural; not reproduced on SQLite), SBG-02 archive∥insert window, OBS-SM-01 forged-id 500s on give/clear advance (runtime-reproven). None may leak into M-V1 as behavior; fixes that defined required behavior are absorbed (e.g., BUG-17→authority split).

## 21. Unresolved Questions
`STATE_MACHINE_OPEN_QUESTIONS.md` Q-01..Q-10 + D-items below.

## 22. Business Decisions Required (14)
D-01 lifecycle · D-02 correction audit/archived edits · D-03 retro-payment · D-04 carry scheduling · D-05 material completion symmetry · D-06 archive ownership/cadence · D-07 audit matrix sign-off · D-08 export pricing basis · D-09 notification intent · D-10 credential/input hardening · D-11 PDF content spec · D-12 PostgreSQL verification gate · **D-13 worker-deletion retention (NEW)** · **D-14 session lifetime (NEW)**.

## 23. Evidence Classification Summary
Runtime-verified: 43+ scenario rows incl. 30/30 suite ×2 + fail-fast observations + arithmetic checks + concurrency pair probes (mark-paid/approve PASS, finish NOT REPRODUCED on SQLite) + authorization probes (13-surface employee denial sweep, method/CSRF 400/403 with logs, horizontal isolation leak check, PG-08 self-finish proof, forged-id failure modes) · Code-confirmed: ~60 claims · Database-confirmed: 6 constraint/design facts · TEST-CONFIRMED categories via suite · INFERRED: 5 flagged items (slip parity, argparse detail, session TTL default, 3.11 arithmetic portability, stdlib parse errors) · NV: PDF text, PG locking execution, deploy stack, large-scale export behavior, session TTL, remaining concurrency pairs · BDR: 14 decisions. Hierarchy respected throughout; no inference upgraded silently.

## 24. Document Map
01 feature catalog (+reconciliation) · 02 workflows (+4 companion docs) · 03 business rules + BUSINESS_RULE_INVENTORY/TRACEABILITY/DECISIONS_REQUIRED/RECONCILIATION · 04 calculations + CALCULATION_TEST_MATRIX · 05 state machines + STATE_TRANSITION_MATRIX/STATE_MACHINE_TEST_MATRIX/STATE_MACHINE_OPEN_QUESTIONS · 06 permissions + ROLE_PERMISSION_MATRIX/AUTHORIZATION_TEST_MATRIX/PERMISSION_GAPS · DATA_REQUIREMENTS · VALIDATION_RULES · EDGE_CASE_CATALOG · REPORT_EXPORT_REQUIREMENTS · NON_FUNCTIONAL_REQUIREMENTS · PHASE_6_RECONCILIATION · this file · PHASE_6_FINAL_STATUS.

## 25. Management-V1 Recommendations (SEPARATE — not extracted requirements)
1. Implement each C64 contract ONCE as shared services (kills R-06 duplication).
2. Exact decimal/integer carry math replacing float artifact class.
3. In-lock active re-check for FINISH (SBG-01) + stream serialization or documented rerun-repair for archive window (SBG-02).
4. Add audit events per AUD63-006..009; register/read UI for all trails.
5. Hard-enforce approved-only eligibility server-side on every write (BR-005 exception closure).
6. Collapse dual approval paths; remove/formalize inert self-finish branch (PG6.6-08).
7. Decide and implement D-01..D-14 policies before build where they touch schema (esp. D-13 retention → soft-delete/protect ledger FK).
8. Deploy-time TLS/cookie hardening + backup cadence + throttle/password policy (OPS63-010/D-10).
9. Pagination strategy when workforce grows (OPS63-009).
10. Keep: phone-as-identity, Mon–Sun week, authority split, idempotent archive, dry-run rituals, negative-payable semantics unless business amends.

## 26. Requirements Completeness Assessment
All ten subphases complete; every checklist item of the phase prompt satisfied (see PHASE_6_FINAL_STATUS.md); final question answered YES there. Final verification sessions additionally runtime-proved the thinnest remaining cells and resolved the single claim contradiction (RC-14).
