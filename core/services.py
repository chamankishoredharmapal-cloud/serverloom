# core/services.py
from django.db import transaction
from django.db.models import Sum, F
from django.utils import timezone
from datetime import timedelta, date
from typing import Optional, Tuple
from django.contrib.auth.models import User

from .models import (
    Employee,
    AdvanceHistory,
    SalaryHistory,
    SareeCount,
    PagdiHistory,
    PagdiChangeHistory,
    WarpHistory,
)

"""
Services module
- Contains transactional business logic for advances, pagdi finishing,
  weekly archival/reset, and carrying advances to next period.

Design notes:
- All mutating functions that affect money/advance fields use select_for_update()
  and transaction.atomic() to prevent race conditions when multiple admins
  operate concurrently.
- Archive/reset is idempotent by checking existing SalaryHistory rows for the week.
"""

def get_week_bounds(for_date: Optional[date] = None) -> Tuple[date, date]:
    """
    Return (monday, sunday) for the week containing for_date (server local date).
    """
    if for_date is None:
        for_date = timezone.localdate()
    monday = for_date - timedelta(days=for_date.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


@transaction.atomic
def give_advance(employee_id: int, amount: int, admin_user: Optional[User] = None, note: str = "") -> AdvanceHistory:
    """
    Adds advance amount to employee.advance_salary (additive).
    Creates AdvanceHistory record. Returns the history record.

    Raises:
      ValueError on invalid amount, Employee.DoesNotExist if employee missing.
    """
    if amount <= 0:
        raise ValueError("amount must be a positive integer")

    emp = Employee.objects.select_for_update().get(id=employee_id)
    previous = int(emp.advance_salary or 0)
    new_amount = previous + int(amount)
    emp.advance_salary = new_amount
    emp.save(update_fields=["advance_salary", "updated_at"])

    ah = AdvanceHistory.objects.create(
        employee=emp,
        admin_user=admin_user,
        action_type="ADJUST",
        previous_amount=previous,
        new_amount=new_amount,
        note=note or f"Advance given: {amount}"
    )
    return ah


@transaction.atomic
def clear_advance_for_employee(employee_id: int, admin_user: Optional[User] = None, note: str = "") -> AdvanceHistory:
    """
    Clear advance (set to 0) for employee but **only** when intended.
    Always create an AdvanceHistory record capturing previous and new values.
    """
    emp = Employee.objects.select_for_update().get(id=employee_id)
    prev = int(emp.advance_salary or 0)
    if prev == 0:
        # still record the attempt for audit purposes (no-op clear)
        ah = AdvanceHistory.objects.create(
            employee=emp,
            admin_user=admin_user,
            action_type="CLEAR",
            previous_amount=prev,
            new_amount=0,
            note=f"No-op clear: {note}"
        )
        return ah

    emp.advance_salary = 0
    emp.save(update_fields=["advance_salary", "updated_at"])
    ah = AdvanceHistory.objects.create(
        employee=emp,
        admin_user=admin_user,
        action_type="CLEAR",
        previous_amount=prev,
        new_amount=0,
        note=note or "Cleared by admin"
    )
    return ah


def compute_salary_for_employee_for_week(employee: Employee, week_start: date, week_end: date) -> dict:
    """
    Compute weekly salary numbers for an employee deterministically.
    Returns a dict with keys:
      sarees, salary_rate, total_before_advance, advance_applied, final_salary
    """
    sarees = SareeCount.objects.filter(employee=employee, date__gte=week_start, date__lte=week_end).aggregate(Sum("count"))["count__sum"] or 0
    salary_rate = int(employee.salary_per_saree or 0)
    total_before_advance = int(sarees) * salary_rate
    advance_applied = int(employee.advance_salary or 0)
    final = total_before_advance - advance_applied
    return {
        "sarees": int(sarees),
        "salary_rate": salary_rate,
        "total_before_advance": total_before_advance,
        "advance_applied": advance_applied,
        "final_salary": final,
    }


@transaction.atomic
def archive_and_reset_weekly_salaries(for_date: Optional[date] = None, admin_user: Optional[User] = None, notes: str = "") -> int:
    """
    Archive this week's salaries into SalaryHistory and zero 'current_week_salary' per-employee.
    Idempotent: skips employees for whom a SalaryHistory record for the same week already exists.
    Returns number of SalaryHistory rows created.

    Important behavior:
    - This function **does not** modify employee.advance_salary. Advances are carried by default;
      clearing advances should be an explicit admin action and will be recorded in AdvanceHistory.
    """
    monday, sunday = (get_week_bounds(for_date) if for_date else get_week_bounds())
    created = 0

    # Lock employees to prevent concurrent changes to advance_salary/current_week_salary during archiving.
    employees = Employee.objects.select_for_update().all()

    for emp in employees:
        # Skip if already archived for this week (idempotent)
        exists = SalaryHistory.objects.filter(employee=emp, week_start=monday, week_end=sunday).exists()
        if exists:
            # ensure live field is zeroed if leftover
            if emp.current_week_salary != 0:
                emp.current_week_salary = 0
                emp.save(update_fields=["current_week_salary", "updated_at"])
            continue

        numbers = compute_salary_for_employee_for_week(emp, monday, sunday)
        SalaryHistory.objects.create(
            employee=emp,
            week_start=monday,
            week_end=sunday,
            sarees=numbers["sarees"],
            salary_rate=numbers["salary_rate"],
            total_salary_before_advance=numbers["total_before_advance"],
            advance_salary=numbers["advance_applied"],
            final_salary=numbers["final_salary"],
            paid_status=False,
            paid_date=None,
            notes=notes or f"Archived by scheduled reset on {timezone.localdate()}",
        )
        # zero the live running aggregate
        emp.current_week_salary = 0
        emp.save(update_fields=["current_week_salary", "updated_at"])
        created += 1

    return created


@transaction.atomic
def finish_pagdi(pagdi_id: int, admin_user: Optional[User] = None, note: str = "") -> PagdiHistory:
    """
    Finish a PagdiHistory (set end_date to today) and create a PagdiChangeHistory row.
    Uses select_for_update on the PagdiHistory record.
    """
    p = PagdiHistory.objects.select_for_update().get(id=pagdi_id)
    prev_end = p.end_date
    p.end_date = timezone.localdate()
    p.save(update_fields=["end_date"])
    PagdiChangeHistory.objects.create(
        pagdi=p,
        employee=p.employee,
        admin_user=admin_user,
        action="FINISH",
        previous_capacity=p.capacity_sarees,
        new_capacity=p.capacity_sarees,
        previous_end_date=prev_end,
        new_end_date=p.end_date,
        note=note or "Finished via admin/service"
    )
    return p


@transaction.atomic
def carry_advances_to_next_week(carry_factor: float = 1.0, admin_user: Optional[User] = None, note: str = "") -> int:
    """
    Carry outstanding advances to next week.

    carry_factor: fraction of outstanding advance to carry (1.0 => carry full amount, 0.0 => zero out).
                  Values between 0 and 1 will reduce the advance accordingly.
                  Values >1 will increase the advance (rare but allowed).

    Behavior:
    - For each employee with advance_salary != 0, lock the row, compute new_amount = int(prev * carry_factor).
    - Save new_amount back to employee.advance_salary.
    - Create an AdvanceHistory record with action_type="CARRY".
    - Returns the number of processed employees (rows changed or recorded as no-op when factor == 1.0).

    Idempotency note:
    - If carried with same factor repeatedly, the new_amount will keep changing (as intended).
    - The function always creates an audit row for each employee processed so admins have a clear trail.

    Raises:
      ValueError if carry_factor is negative.
    """
    if carry_factor < 0:
        raise ValueError("carry_factor must be non-negative")

    processed = 0

    # Lock employees to avoid races with give/clear operations.
    qs = Employee.objects.select_for_update().all()
    for emp in qs:
        prev = int(emp.advance_salary or 0)
        # We will still record a history entry even if prev == 0 (no-op) so audits show an attempted carry.
        if prev == 0:
            AdvanceHistory.objects.create(
                employee=emp,
                admin_user=admin_user,
                action_type="CARRY",
                previous_amount=0,
                new_amount=0,
                note=f"No-op carry: {note}" if note else "No outstanding advance to carry"
            )
            processed += 1
            continue

        # compute new carried amount (rounding -> int)
        new_amount = int(prev * float(carry_factor))
        # Enforce non-negative (sanity)
        if new_amount < 0:
            new_amount = 0

        # Avoid unnecessary writes if identical
        if new_amount != prev:
            emp.advance_salary = new_amount
            emp.save(update_fields=["advance_salary", "updated_at"])
        else:
            # if unchanged, still proceed to create audit entry
            pass

        AdvanceHistory.objects.create(
            employee=emp,
            admin_user=admin_user,
            action_type="CARRY",
            previous_amount=prev,
            new_amount=new_amount,
            note=note or f"Carried with factor {carry_factor}"
        )
        processed += 1

    return processed
