# RETENTION_DELETION_POLICY.md (Phase 8.12)

Policies per major entity. Anything destructive is EXPLICIT; nothing inherits the external cascade-destruction incident class. Unresolved business calls stay flagged (D-items), never silently defaulted beyond the protective shipping default noted.

| Entity | Policy | History effect | Audit effect | Notes |
| ------ | ------ | -------------- | ------------ | ----- |
| profiles (worker identity) | **NEVER HARD-DELETE by default** — offboard = status transition (SM-01/D-01: INACTIVE/SUSPENDED when decided) | all history intact | lifecycle events recorded | FK RESTRICT shipped (D-13 gate): ledger/materials/production survive worker exit; hard delete requires conscious D-13=B flip + prior export; recommended long-term answer remains Option C soft-delete semantics via status |
| auth.users (identity) | provider-managed; deletion does NOT cascade to profile (FK RESTRICT) | intact; profile becomes identity-less locked account | LOGIN/AUTH anomalies visible | inverts external User→Employee CASCADE incident class |
| production_entries | correction model: remove+recreate (external verified semantics); **hard delete DEFAULT, soft-delete columns reserved** (D-02 decides mode) | aggregates react immediately pre-archive; archived snapshots unaffected unless rerun (drift risk documented = D-02 context) | ENTRY_REMOVED carries full before-image (gap AUD63-006 closed) | post-archive raw edits create ledger-vs-history drift until rerun — operational ritual documented (fix raw → rerun window) |
| material_assignments | NEVER DELETE in-app; terminal FINISHED state; reopen absent (C-15) | full lifecycle permanent | CREATE/FINISH chain permanent | out-of-band surgery forbidden by privileges in M-V1 (external super-admin unaudited nulling = REJECTED posture) |
| weekly_ledger | **NEVER DELETE / NEVER hard-edit**: quantity group written only by archive; payment group only by settlement | canonical payroll of record | flips/runs audited | retention indefinite; D-13 flip is the only sanctioned destruction vector and requires data-loss acknowledgement |
| audit_events | **NEVER DELETE / NEVER UPDATE** — permanent | IS the history | n/a | privileges enforce |
| archive_runs | append-only, never deleted | explains every canon state | itself an audit artifact | |
| alert_recipients | NOT CREATED (D-09) | — | — | build only on positive decision |

## Explicit resolution status of D-13

**BUSINESS DECISION REQUIRED — but architecture ships protective default:** RESTRICT on worker-linked FKs + status-based offboarding. Options remain open and reversible ONLY before real data accrues: (A) RESTRICT forever [current default], (B) CASCADE (external parity; destroys payroll history — requires signed acceptance), (C) soft-delete workers w/ anonymization pass. Recommended: keep A; adopt C wording when D-01 lifecycle lands.

## RPO/RTO linkage

Retention depth interacts with backup plan (BACKUP_RECOVERY_PLAN): PITR choice determines how far a mistaken destructive act can be undone. Since destructive acts are largely designed out above, standard daily-backup RPO is adequate; tighter RPO = optional add-on = BUSINESS DECISION REQUIRED.
