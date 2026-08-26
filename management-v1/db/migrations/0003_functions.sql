-- ============================================================
-- MANAGEMENT-V1 migration 0003 -- authoritative mutation RPCs
-- (Phase 8 CONSTRAINT_SPECIFICATION C-06..C-20 / TRANSACTION_CONCURRENCY recipes)
--
-- Contract: ALL domain mutations flow through these SECURITY DEFINER functions.
-- Each: validates input -> verifies role -> locks -> mutates -> emits audit INSIDE tx.
-- search_path pinned; explicit type casts; no dynamic SQL.
-- ============================================================

-- ---------- internal audit emitter ----------
create or replace function public._emit_audit(
  p_actor_id   uuid,
  p_kind       text,
  p_name       text,
  p_entity_type text,
  p_entity_id  uuid,
  p_action     text,
  p_before     jsonb default null,
  p_after      jsonb default null,
  p_note       text default ''
) returns void
language sql security definer set search_path = public as $$
  insert into public.audit_events
    (actor_id, actor_kind, actor_name, entity_type, entity_id, action, before, after, note)
  values (p_actor_id, p_kind, coalesce(p_name,''), p_entity_type, p_entity_id, p_action, p_before, p_after, coalesce(p_note,''));
$$;

-- ---------- caller resolution ----------
create or replace function public._caller() returns public.profiles
language sql stable security definer set search_path = public as $$
  select * from public.profiles where id = public.current_profile_id()
$$;

create or replace function public._require_staff() returns public.profiles
language plpgsql security definer set search_path = public as $$
declare c public.profiles;
begin
  select * into c from public._caller();
  if c is null or c.role not in ('STAFF','SUPERADMIN') then
    -- Local/integration-test escape hatch ONLY: the DB owner (e.g. postgres
    -- superuser used by embedded test instances) may act without JWT claims.
    -- Supabase client roles (anon/authenticated/service_role) can NEVER match this,
    -- so production authorization behavior is unchanged.
    if not coalesce((select rolsuper from pg_roles where rolname = session_user), false) then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    return null;
  end if;
  return c;
end $$;

-- ---------- worker lifecycle ----------
create or replace function public.approve_worker(p_worker_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare staffp public.profiles; t public.profiles;
begin
  staffp := public._require_staff();
  select * into t from public.profiles where id = p_worker_id;
  if t is null then raise exception 'NOT_FOUND:worker' using errcode = 'P0002'; end if;
  if t.status <> 'ACTIVE' then
    update public.profiles set status='ACTIVE' where id=p_worker_id;
    perform public._emit_audit(staffp.id,'USER',staffp.full_name,'PROFILE',p_worker_id,'APPROVE',
      jsonb_build_object('status',t.status), jsonb_build_object('status','ACTIVE'), '');
  end if;
end $$;

create or replace function public.set_worker_status(p_worker_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
declare staffp public.profiles; t public.profiles;
begin
  staffp := public._require_staff();
  if p_status not in ('PENDING','ACTIVE','INACTIVE','SUSPENDED') then
    raise exception 'INVALID_STATUS';
  end if;
  select * into t from public.profiles where id=p_worker_id;
  if t is null then raise exception 'NOT_FOUND:worker' using errcode='P0002'; end if;
  update public.profiles set status=p_status where id=p_worker_id;
  perform public._emit_audit(staffp.id,'USER',staffp.full_name,'PROFILE',p_worker_id,'LIFECYCLE_SET',
    jsonb_build_object('status',t.status), jsonb_build_object('status',p_status), 'D-01 lifecycle');
end $$;

-- ---------- rate ----------
create or replace function public.set_rate(p_worker_id uuid, p_rate integer)
returns void
language plpgsql security definer set search_path = public as $$
declare staffp public.profiles; prev integer := 0;
begin
  staffp := public._require_staff();
  if p_rate is null or p_rate < 0 then raise exception 'INVALID_RATE'; end if;
  select salary_rate into prev from public.profiles where id=p_worker_id;
  if not found then raise exception 'NOT_FOUND:worker' using errcode='P0002'; end if;
  update public.profiles set salary_rate=p_rate where id=p_worker_id;
  perform public._emit_audit(staffp.id,'USER',staffp.full_name,'PROFILE',p_worker_id,'RATE_CHANGED',
    jsonb_build_object('salary_rate',prev), jsonb_build_object('salary_rate',p_rate), '');
end $$;

-- ---------- advances ----------
create or replace function public.give_advance(p_worker_id uuid, p_amount integer, p_note text default '')
returns void
language plpgsql security definer set search_path = public as $$
declare staffp public.profiles; prev integer; bal integer;
begin
  staffp := public._require_staff();
  if p_amount is null or p_amount <= 0 then raise exception 'AMOUNT_MUST_BE_POSITIVE'; end if;
  select advance_balance into bal from public.profiles where id=p_worker_id for update;
  if not found then raise exception 'NOT_FOUND:worker' using errcode='P0002'; end if;
  prev := bal;
  update public.profiles set advance_balance = bal + p_amount where id=p_worker_id;
  perform public._emit_audit(staffp.id,'USER',staffp.full_name,'ADVANCE',p_worker_id,'ADJUST',
    jsonb_build_object('balance',prev), jsonb_build_object('balance',bal+p_amount),
    coalesce(nullif(p_note,''), 'Advance given: '||p_amount));
end $$;

create or replace function public.clear_advance(p_worker_id uuid, p_note text default '')
returns void
language plpgsql security definer set search_path = public as $$
declare staffp public.profiles; prev integer;
begin
  staffp := public._require_staff();
  select advance_balance into prev from public.profiles where id=p_worker_id for update;
  if not found then raise exception 'NOT_FOUND:worker' using errcode='P0002'; end if;
  if prev = 0 then
    perform public._emit_audit(staffp.id,'USER',staffp.full_name,'ADVANCE',p_worker_id,'CLEAR',
      jsonb_build_object('balance',0), jsonb_build_object('balance',0),
      'No-op clear: '||coalesce(p_note,''));
    return;
  end if;
  update public.profiles set advance_balance=0 where id=p_worker_id;
  perform public._emit_audit(staffp.id,'USER',staffp.full_name,'ADVANCE',p_worker_id,'CLEAR',
    jsonb_build_object('balance',prev), jsonb_build_object('balance',0),
    coalesce(nullif(p_note,''),'Cleared by admin'));
end $$;

create or replace function public.carry_advances(
  p_factor_num integer default 1, p_factor_den integer default 1,
  p_note text default '', p_dry_run boolean default false,
  p_triggered_by text default 'OPERATOR'
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  staffp public.profiles; sysactor uuid; kind text; nm text;
  r record; prev integer; newv integer; processed integer := 0;
begin
  -- operator (staff) or SYSTEM (cron/service path); DB-owner escape for integration tests
  staffp := public._caller();
  if staffp is null or staffp.role not in ('STAFF','SUPERADMIN') then
    if p_triggered_by <> 'SYSTEM'
       and not coalesce((select rolsuper from pg_roles where rolname = session_user), false) then
      raise exception 'FORBIDDEN' using errcode='42501';
    end if;
    kind := 'SYSTEM'; nm := 'system'; sysactor := null;
  else
    kind := 'USER'; nm := staffp.full_name; sysactor := staffp.id;
  end if;
  if p_factor_num < 0 or p_factor_den <= 0 then raise exception 'FACTOR_INVALID'; end if;

  for r in select id, full_name, advance_balance from public.profiles order by id for update loop
    prev := r.advance_balance;
    newv := trunc((prev::numeric * p_factor_num) / p_factor_den); -- exact toward-zero
    if newv < 0 then newv := 0; end if;
    if not p_dry_run then
      if newv <> prev then
        update public.profiles set advance_balance=newv where id=r.id;
      end if;
      perform public._emit_audit(sysactor,kind,nm,'ADVANCE',r.id,'CARRY',
        jsonb_build_object('balance',prev),
        jsonb_build_object('balance',newv),
        coalesce(nullif(p_note,''), format('Carried %s/%s', p_factor_num, p_factor_den)));
    end if;
    processed := processed + 1;
  end loop;
  return processed;
end $$;

-- ---------- materials ----------
create or replace function public.assign_material(
  p_worker_id uuid, p_material_type text,
  p_started_on date default null, p_capacity integer default 0,
  p_note text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  staffp public.profiles; started date; newid uuid;
  w record; cnt integer := 0;
begin
  staffp := public._require_staff();
  if p_material_type not in ('PAGDI','WARP') then raise exception 'INVALID_TYPE'; end if;
  if p_capacity is null or p_capacity < 0 then raise exception 'CAPACITY_INVALID'; end if;
  select id, status into w from public.profiles where id=p_worker_id;
  if w is null or w.status <> 'ACTIVE' then raise exception 'INELIGIBLE_WORKER'; end if; -- BR-005 hard
  if p_material_type = 'WARP' then
    started := current_date;                       -- BR-028 warp start forced today
  else
    started := p_started_on;
    if started is null then raise exception 'START_REQUIRED'; end if;
  end if;

  -- lock live set; auto-finish each (BR-010 atomic sequence)
  for w in select id from public.material_assignments
           where worker_id=p_worker_id and material_type=p_material_type and finished_on is null
           for update loop
    update public.material_assignments set finished_on=current_date where id=w.id;
    perform public._emit_audit(staffp.id,'USER',staffp.full_name,'MATERIAL',w.id,'FINISH',
      jsonb_build_object('finished_on',null), jsonb_build_object('finished_on',current_date),
      'Auto-finish due to new assignment');
    cnt := cnt + 1;
  end loop;

  insert into public.material_assignments (worker_id, material_type, started_on, capacity, note)
    values (p_worker_id, p_material_type, started, p_capacity, coalesce(p_note,''))
    returning id into newid;
  perform public._emit_audit(staffp.id,'USER',staffp.full_name,'MATERIAL',newid,'CREATE',
    null, jsonb_build_object('material_type',p_material_type,'started_on',started,'capacity',p_capacity),
    coalesce(p_note,''));
  return newid;
end $$;

create or replace function public.finish_material(p_assignment_id uuid, p_note text default '')
returns text
language plpgsql security definer set search_path = public as $$
declare staffp public.profiles; t record;
begin
  staffp := public._require_staff();
  select * into t from public.material_assignments where id=p_assignment_id for update;
  if t is null then raise exception 'NOT_FOUND:assignment' using errcode='P0002'; end if;
  if t.finished_on is not null then
    return 'ALREADY_FINISHED';                     -- strict no-op under lock (SBG-01 lesson)
  end if;
  update public.material_assignments set finished_on=current_date where id=p_assignment_id;
  perform public._emit_audit(staffp.id,'USER',staffp.full_name,'MATERIAL',p_assignment_id,'FINISH',
    jsonb_build_object('finished_on',null), jsonb_build_object('finished_on',current_date),
    coalesce(nullif(p_note,''),'Finished by admin'));
  return 'FINISHED';
end $$;

-- ---------- production ----------
create or replace function public.create_production_entry(
  p_worker_id uuid, p_work_date date default null,
  p_count integer default 0, p_note text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare staffp public.profiles; d date; newid uuid; w record;
begin
  staffp := public._require_staff();
  if p_count is null or p_count < 0 then raise exception 'COUNT_INVALID'; end if;
  select id,status into w from public.profiles where id=p_worker_id;
  if w is null or w.status <> 'ACTIVE' then raise exception 'INELIGIBLE_WORKER'; end if;
  d := coalesce(p_work_date, current_date);
  begin
    insert into public.production_entries (worker_id, work_date, count, note)
      values (p_worker_id, d, p_count, coalesce(p_note,''))
      returning id into newid;
  exception when unique_violation then
    raise exception 'DUPLICATE_WORKER_DAY' using errcode='23505';
  end;
  perform public._emit_audit(staffp.id,'USER',staffp.full_name,'PRODUCTION',newid,'ENTRY_CREATED',
    null, jsonb_build_object('worker_id',p_worker_id,'work_date',d,'count',p_count), coalesce(p_note,''));
  return newid;
end $$;

create or replace function public.remove_production_entry(p_entry_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare staffp public.profiles; t record;
begin
  staffp := public._require_staff();
  delete from public.production_entries where id=p_entry_id returning * into t;
  if t is null then raise exception 'NOT_FOUND:entry' using errcode='P0002'; end if;
  perform public._emit_audit(staffp.id,'USER',staffp.full_name,'PRODUCTION',p_entry_id,'ENTRY_REMOVED',
    jsonb_build_object('worker_id',t.worker_id,'work_date',t.work_date,'count',t.count), null,
    'Correction model: remove+recreate');
end $$;

-- ---------- settlement ----------
create or replace function public.mark_paid(p_worker_id uuid, p_note text default '')
returns void
language plpgsql security definer set search_path = public as $$
declare staffp public.profiles; mon date; sun date;
  pieces integer; crate integer; bal integer;
begin
  staffp := public._require_staff();
  mon := current_date - ((extract(isodow from current_date))::int - 1);
  sun := mon + 6;
  select coalesce(sum(count),0) into pieces
    from public.production_entries where worker_id=p_worker_id and work_date between mon and sun;
  select salary_rate, advance_balance into crate, bal from public.profiles where id=p_worker_id;
  if not found then raise exception 'NOT_FOUND:worker' using errcode='P0002'; end if;

  insert into public.weekly_ledger
    (worker_id, week_start, week_end, pieces, rate, gross, advance_applied, final_pay,
     paid, paid_on, settlement_note, canonical, source)
  values
    (p_worker_id, mon, sun, pieces, crate, pieces*crate, bal,
     (pieces*crate)-bal, true, current_date, coalesce(nullif(p_note,''),'Paid'),
     false, 'SETTLEMENT')
  on conflict (worker_id, week_start, week_end) do update
    set paid = true,
        paid_on = current_date,
        settlement_note = coalesce(nullif(p_note,''), weekly_ledger.settlement_note);
        -- quantity columns deliberately ABSENT: payment authority only (C-07)

  perform public._emit_audit(staffp.id,'USER',staffp.full_name,'LEDGER',p_worker_id,'PAYMENT_MARKED',
    null, jsonb_build_object('week_start',mon,'week_end',sun,'paid',true), coalesce(p_note,''));
end $$;

create or replace function public.mark_unpaid(p_worker_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare staffp public.profiles; mon date; sun date; changed int;
begin
  staffp := public._require_staff();
  mon := current_date - ((extract(isodow from current_date))::int - 1);
  sun := mon + 6;
  update public.weekly_ledger set paid=false, paid_on=null
    where worker_id=p_worker_id and week_start=mon and week_end=sun;
  get diagnostics changed = row_count;
  if changed > 0 then
    perform public._emit_audit(staffp.id,'USER',staffp.full_name,'LEDGER',p_worker_id,'PAYMENT_REVERSED',
      jsonb_build_object('paid',true), jsonb_build_object('paid',false), '');
  end if; -- absent-row -> benign silent no-op (BR-032)
end $$;

-- ---------- archive (CALC-007 authority) ----------
create or replace function public.archive_week(
  p_for_date date default current_date,
  p_dry_run boolean default false,
  p_triggered_by text default 'OPERATOR',
  p_note text default ''
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  staffp public.profiles; sysactor uuid; kind text; nm text;
  mon date; sun date; created int := 0; refreshed int := 0;
  r record; pieces integer; existed boolean := false;
begin
  staffp := public._caller();
  if staffp is null or staffp.role not in ('STAFF','SUPERADMIN') then
    if p_triggered_by <> 'SYSTEM'
       and not coalesce((select rolsuper from pg_roles where rolname = session_user), false) then
      raise exception 'FORBIDDEN' using errcode='42501';
    end if;
    kind:='SYSTEM'; nm:='system'; sysactor:=null;
  else
    kind:='USER'; nm:=staffp.full_name; sysactor:=staffp.id;
  end if;

  mon := p_for_date - ((extract(isodow from p_for_date))::int - 1);
  sun := mon + 6;
  perform pg_advisory_xact_lock(hashtext('archive:'||mon::text));  -- single run per window

  for r in select id, full_name, salary_rate, advance_balance
             from public.profiles where status='ACTIVE' order by id for update loop
    select coalesce(sum(count),0) into pieces from public.production_entries
      where worker_id=r.id and work_date between mon and sun;

    select true into existed from public.weekly_ledger
      where worker_id=r.id and week_start=mon and week_end=sun;

    insert into public.weekly_ledger
      (worker_id, week_start, week_end, pieces, rate, gross, advance_applied, final_pay,
       paid, paid_on, settlement_note, canonical, source)
    values
      (r.id, mon, sun, pieces, r.salary_rate, pieces*r.salary_rate, r.advance_balance,
       (pieces*r.salary_rate)-r.advance_balance, false, null, coalesce(nullif(p_note,''),
        'Archived by reset on '||current_date), true, 'ARCHIVE')
    on conflict (worker_id, week_start, week_end) do update set
      pieces          = excluded.pieces,
      rate            = excluded.rate,
      gross           = excluded.gross,
      advance_applied = excluded.advance_applied,
      final_pay       = excluded.final_pay,
      canonical       = true;
      -- payment group columns ABSENT -> preserved byte-identical (C-08)

    if existed then refreshed := refreshed + 1; else created := created + 1; end if;
  end loop;

  if not p_dry_run then
    insert into public.archive_runs (week_start, week_end, triggered_by, actor_id,
      rows_created, rows_refreshed, dry_run, note)
      values (mon, sun, p_triggered_by, sysactor, created, refreshed, false, coalesce(p_note,''));
    perform public._emit_audit(sysactor,kind,nm,'ARCHIVE',null,'ARCHIVE_RUN',
      null, jsonb_build_object('week_start',mon,'week_end',sun,'created',created,'refreshed',refreshed),
      coalesce(p_note,''));
  end if;
  return jsonb_build_object('created',created,'refreshed',refreshed,'week_start',mon,'week_end',sun);
end $$;
