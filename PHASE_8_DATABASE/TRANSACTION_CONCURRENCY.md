# TRANSACTION_CONCURRENCY.md (Phase 8.10)

Isolation baseline: PostgreSQL READ COMMITTED (default) + explicit row locks where money/state machines demand serialization + unique/partial-unique constraints as final arbiters. Advisory locks for batch mutual exclusion. Every mutation = ONE transaction including its audit event(s). No concurrency claim below lacks a named mechanism.

## Production (create / remove)

```text
BEGIN
  INSERT production_entry            → unique(worker,day) arbitrates duplicates
  ON CONFLICT → catch → DuplicateError (friendly BR-003; no 500 class)
  INSERT audit_event ENTRY_CREATED   same tx
COMMIT
remove: UPDATE … SET deleted_* (if D-02 soft) or DELETE; NotFound if 0 rows;
        audit ENTRY_REMOVED with before-image — SAME tx
```
Races: duplicate-day concurrent inserts → exactly one winner (constraint), loser gets typed error. Retry-safe.

## Advance (give / clear / carry)

```text
BEGIN
  SELECT balance FROM profiles WHERE id=$1 FOR UPDATE      -- row lock serializes per worker
  compute new (give: b+a>0 check ; clear: 0 incl. no-op branch ;
               carry: N = exact_trunc(b×f) toward-zero)
  UPDATE profiles.advance_balance IF changed
  INSERT audit_event ADJUST/CLEAR/CARRY (ALWAYS, incl. zero-delta)
COMMIT
```
Mechanism: FOR UPDATE ⇒ concurrent gives serialize to exact sums (Phase 6 CC-B evidence pattern). Carry∥give safe by same lock. Deadlock risk nil (single-row lock ordering by worker id convention if multi-row ever needed).

## Material assign (the critical one)

```text
BEGIN
  SELECT … FROM material_assignments
    WHERE worker_id=$1 AND material_type=$2 AND finished_on IS NULL
    FOR UPDATE                                              -- lock live set
  UPDATE each locked row SET finished_on=today              -- auto-finish (BR-010)
         + FINISH audit event per row (in-tx)
  INSERT new ACTIVE assignment                              -- partial unique index backstops
         + CREATE audit event
COMMIT
```
ONE-ACTIVE under ANY interleaving: even two racing RPCs serialize on the FOR UPDATE gap/index-locks; the partial unique index makes double-ACTIVE physically impossible (X-05). Explicit finish path: re-check `finished_on IS NULL` AFTER lock INSIDE the tx → repeat-finish is a strict no-op (SBG-01 designed out at DB-supported layer).

## Settlement (markPaid / markUnpaid)

```text
BEGIN
  bounds := week.ts(today)                       -- current-week scope (BR-021)
  INSERT INTO weekly_ledger (…quantity snapshot defaults…, paid=true, source='SETTLEMENT')
    ON CONFLICT (worker_id, week_start, week_end)
    DO UPDATE SET paid=true, paid_on=… , settlement_note=COALESCE($note, kept)
       -- quantity columns ABSENT from DO UPDATE ⇒ flags-only semantics (BR-015/032)
  INSERT audit_event PAYMENT_MARKED/REVERSED
COMMIT
```
Concurrent double mark-paid (CC-J scenario): both hit the same UPSERT arbiter → exactly one row, convergent state, both audited. markUnpaid on absent row = benign no-op with success semantics preserved (BR-032) — implemented as rowcount check inside tx.

## Archive (freezeWeek)

```text
BEGIN
  pg_advisory_xact_lock(hashtext('archive:'||week_key))     -- only ONE run per window at a time
  roster := SELECT id FROM profiles WHERE status='ACTIVE'    -- D-01 interplay flagged in mapping
  FOR EACH worker:
     q,r,g,a,p := compute via shared SQL executor (CALC-007 math)
     INSERT … ON CONFLICT (worker,week) DO UPDATE SET
        pieces/rate/gross/advance_applied/final_pay/canonical=true
        -- payment group columns NOT in SET list (C-07/08)
  INSERT archive_runs row {created, refreshed}
COMMIT
```
Idempotent rerun: second run reports created=0, refreshed=N identical values (BR-018). Concurrent archive+settlement: settlement's upsert and freeze's upsert touch DISJOINT column groups of the same row — PG row-versioning serializes them harmlessly; last-writer per group preserves the other group byte-identically (authority split holds without triggers; ADR-007(b) optional guard can hard-enforce). SBG-02 stream window: archive reads production rows in-window mid-tx; a production insert committing after the scan misses THIS run — accepted contract = rerun-repair (`--date` equivalent parameter) documented operationally; hard serialization option recorded but rejected for now (over-engineering for seconds-wide window at this scale; revisit if ops ever see drift).

## Deletion / correction

Soft/hard delete decision D-02; either form is single-row tx + audit before-image. Worker deletion BLOCKED by RESTRICT default while history exists (see RETENTION doc).

## Failure behavior

Any error ⇒ whole tx rolls back including audit rows (atomicity INV C64 DATA-011 parity). No partial states possible. Retry-after-failure is always safe (idempotent or constraint-arbitrated).

## Isolation notes

Default READ COMMITTED suffices: every multi-step invariant uses explicit locking or unique arbitration rather than relying on higher isolation. SERIALIZABLE not required (avoids retry storms); documented should a future rule need snapshot consistency across aggregates.
