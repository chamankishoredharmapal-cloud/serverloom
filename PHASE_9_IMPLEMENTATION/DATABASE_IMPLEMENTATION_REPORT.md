# DATABASE_IMPLEMENTATION_REPORT.md (Phase 9.1)

Authority: PHASE_8_DATABASE/FINAL_SCHEMA.md + CONSTRAINT_SPECIFICATION + INDEX_STRATEGY.

## Implemented (db/migrations/)

| Migration | Contents |
| --------- | -------- |
| 0001_schema.sql | profiles(role/status enums, rate/balance CHECKs) · production_entries(+soft-delete reserve columns) · material_assignments(unified PAGDI/WARP) · weekly_ledger(quantity/payment groups + canonical + source) · audit_events(unified append-only) · archive_runs · updated_at triggers · conditional auth.users FK attachments · ALL indexes IX-01..13 incl. partial unique one-ACTIVE |
| 0002_rls.sql | client-role parity stubs (anon/authenticated/service_role NOLOGIN on vanilla PG) · conditional current_profile_id() identity bridge · RLS enabled on all domain tables · worker own-row SELECT policies · staff read-all · audit superadmin-read-only · hard revokes of INSERT/UPDATE/DELETE from client roles; audit UPDATE/DELETE revoked even from service_role usage |
| 0003_functions.sql | authoritative RPCs: approve_worker · set_worker_status · set_rate · give_advance · clear_advance · carry_advances(exact rational truncation) · assign_material(lock+auto-finish+eligibility) · finish_material(in-lock recheck) · create_production_entry(dup arbitration) · remove_production_entry(before-image audit) · mark_paid(two-path upsert) · mark_unpaid(benign no-op) · archive_week(advisory lock + column-group discipline + run record) · _emit_audit/_caller/_require_staff internals |
| 0004_dev_auth_bridge.sql | NON-PRODUCTION app_credentials table for local-mode auth until Supabase Auth wired |

## Verification — RUNTIME-VERIFIED on real PostgreSQL 18.4 (embedded, disposable)

Harness `scripts/verify-db.mjs`: migrations applied twice cleanly (repeatability) then **32/32 behavioral assertions PASS**, covering:

- approval idempotency + single APPROVE event · status enum discipline
- negative rate rejection · duplicate worker-day friendly rejection (incl. **3-way parallel race**: 1 row, 2 typed rejects) · zero-count legal
- parallel gives serialize to exact sum (140) with both ADJUST events
- carry edges: 140×½→70 · 40×29/100→**11** (float-artifact class eliminated) · B=1 f=½→**0** wipe edge · zero-balance CLEAR audited no-op
- WARP start forced today · reassign auto-finish → exactly ONE ACTIVE · explicit re-finish strict no-op w/ NO duplicate FINISH event · **3-way parallel assigns → ONE ACTIVE** · PENDING worker ineligible
- settlement two-path: create-path snapshot(source SETTLEMENT) vs flags-only re-pay preserving quantities · unpaid flags-only convergence
- archive: created/refreshed report · canonical freeze · **payment state preserved through archive** · signed final_pay unclamped · rerun created=0 refreshed=N · dry-run writes nothing · parallel archives serialize via advisory lock
- audit trail populated (38 events in scenario) and UPDATE/DELETE provably revoked from client roles

## Deviations from FINAL_SCHEMA

None structural. Additions beyond schema doc: `_migrations` bookkeeping table, `archive_runs` promoted from implicit to explicit (documented in FINAL_SCHEMA §classification), `app_credentials` bridge clearly labeled non-production.
