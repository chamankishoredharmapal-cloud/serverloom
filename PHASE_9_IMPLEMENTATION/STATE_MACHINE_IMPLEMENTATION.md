# STATE_MACHINE_IMPLEMENTATION.md (Phase 9.8)

Transitions owned exclusively by their RPCs; no frontend can mutate state columns directly (client write grants are ZERO).

| Machine (SM) | States here | Transition owner(s) | Invalid-transition handling | Runtime evidence |
| ------------ | ----------- | -------------------- | --------------------------- | ---------------- |
| SM-01 account | PENDING → ACTIVE (+reserved INACTIVE/SUSPENDED for D-01) | approve_worker · set_worker_status (STAFF) | unknown id → NotFound; invalid enum → reject; CHECK enforces values | idempotent approve, single event ★ |
| SM-02 session | ANON ↔ WORKER/STAFF/SUPERADMIN | AuthService login/logout + layout gates | unapproved ⇒ refusal WITHOUT session (BR-022) | HTTP smoke anon-gates ★ |
| SM-03 production row | ABSENT ⇄ EXISTS ⇄ DELETED(hard default; soft reserved D-02) | create/remove_production_entry | duplicate day → typed DuplicateError even under races | 3-way race ★ |
| SM-06/07 materials | ACTIVE(fin NULL) ⇄ FINISHED(date) terminal-in-app | assign_material(auto-finish) · finish_material(explicit; strict ALREADY_FINISHED no-op under lock) | reopen path DOES NOT EXIST; eligibility gate for PENDING workers | auto-finish chain ★; re-finish no event ★; 3-way assign race ONE-ACTIVE ★ |
| SM-04 ledger birth | ABSENT → PRESENT[SETTLEMENT snapshot] or PRESENT[ARCHIVE canon] | mark_paid upsert · archive_week upsert | unique(worker,week) arbitrates concurrent creators | settlement+archive paths ★ |
| SM-05 payment flags | UNPAID ⇄ PAID (current-week scope) | mark_paid / mark_unpaid | absent-row unpaid = benign silent no-op (BR-032) | flags-only convergence ★ |
| SM-08 week | OPEN → ARCHIVED (canonical), rerun-safe | archive_week only | second simultaneous run serialized by advisory xact-lock | rerun idempotence ★; parallel archives ★ |
| SM-09 advance balance | ZERO ⇄ POSITIVE (never negative by CHECK) | give/clear/carry_advances | amount ≤0 / factor<0 rejected pre-write | edges incl. wipe-to-zero ★ |
| SM-10 audit log | append-only event stream | _emit_audit inside every mutating tx | UPDATE/DELETE revoked for ALL roles | grant probe ★ |

Concurrent-transition classes from Phase 6 CC-A..CC-I all have a designed mechanism and a passing runtime probe or an explicit documented trade-off (SBG-02 → rerun-repair contract).
