# STATE_MACHINE_OPEN_QUESTIONS.md (Phase 6.5)

Genuinely unresolved state-machine decisions — repository and runtime evidence CANNOT answer these; each maps to a Phase 6.3 decision-register item where one exists. None is answered here by assumption.

Currency note (final verification session): the CC-D mark-paid pair and CC-E approve-pair races are now RUNTIME-VERIFIED convergent on file-based SQLite (see STATE_MACHINE_TEST_MATRIX §E2); SBG-01 was NOT REPRODUCED on SQLite and remains a structural code-level risk for PostgreSQL. Q-07 remains open regardless: observed convergence under SQLite does not decide the desired strictness policy for Management-V1.

| # | Question | Affected machine(s) | Why evidence cannot answer | Related prior decision | Status |
| - | -------- | ------------------- | -------------------------- | ----------------------- | ------ |
| Q-01 | Should APPROVED be reversible (suspend/deactivate/reactivate) in Management-V1? | SM-01 | external app has no such states at all (one-way lifecycle); intent undocumented | D-01 / G-01 | BUSINESS DECISION REQUIRED |
| Q-02 | Should payment flags on ARCHIVED weeks be reversible through the app? | SM-05 (+SM-08 boundary) | current-week-only scope is implemented, but nothing documents whether finality is intended policy or missing UI | D-03 / G-03 | BUSINESS DECISION REQUIRED |
| Q-03 | Should FINISHED material assignments be reopenable? | SM-06/SM-07 | reopen exists only as unaudited super-admin surgery; no designed path or rule | adjacent to D-05 | BUSINESS DECISION REQUIRED |
| Q-04 | Should pagdi gain an explicit finish transition to match warp? | SM-06 vs SM-07 asymmetry | asymmetry verified but no documented domain reason; both models function | D-05 / G-05 | BUSINESS DECISION REQUIRED |
| Q-05 | May raw production rows of ARCHIVED weeks still be deleted (creating ledger-vs-history drift), and who may approve corrections after archive? | SM-03 ∥ SM-08 | drift behavior confirmed; correction authority/cadence undefined | D-02 / G-02 | BUSINESS DECISION REQUIRED |
| Q-06 | Who owns emergency state correction when in-app paths are exhausted (e.g., mis-dated archive, wrong capacity)? | SM-08 + all terminals | out-of-app super-admin surgery exists but is undefined operationally | D-06 adjacent | BUSINESS DECISION REQUIRED |
| Q-07 | What SHOULD happen if two operators execute conflicting transitions simultaneously (archive vs settle, finish vs finish)? | CC-D..CC-H races | current behavior is convergent-by-design for most pairs, but the SBG-01/SBG-02 windows show unspecified edges; desired strictness (block vs last-writer-wins) is a policy choice | new this phase | BUSINESS DECISION REQUIRED |
| Q-08 | Is the truncation-to-zero carry edge (TR-ADV-006: small positive balance wiped by carry) acceptable business behavior? | SM-09 | arithmetic is CONFIRMED; whether silently zeroing a ₹1 obligation via carry is intended is unknowable from code | adjacent D-04 | BUSINESS DECISION REQUIRED |
| Q-09 | Should archive runs and payment flips write their own audit events (closing gaps AUD63-006..008)? | SM-01/03/04/05/08 audit layer | absence confirmed; requirement depth is a Management-V1 recommendation needing sign-off | D-07 / G-07 | BUSINESS DECISION REQUIRED |
| Q-10 | What session lifetime should Management-V1 enforce (external uses framework defaults, unverified)? | SM-02 | no explicit configuration exists to extract | new this phase | BUSINESS DECISION REQUIRED |

Explicitly NOT open (resolved by evidence): single-ACTIVE enforcement (race-proven), payment two-path semantics, flags-only reversal, week Mon–Sun, current-week settlement scope AS OBSERVED (policy question Q-02 concerns changing it), inert branches' unreachability.
