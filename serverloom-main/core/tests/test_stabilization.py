# core/tests/test_stabilization.py
# Phase 4.5 regression coverage for the bugs fixed during stabilization.
# Each test verifies observable business behavior, not implementation details.
from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import TestCase, TransactionTestCase, Client
from django.urls import reverse
from django.utils import timezone

from core.models import (
    Employee, SareeCount, PagdiHistory, PagdiChangeHistory,
    WarpHistory, WarpChangeHistory, SalaryHistory, AdvanceHistory,
)
from core import services
from django.db import IntegrityError, transaction


class StabilizationBase(TestCase):
    """Common fixtures: one staff user and two approved employees."""

    @classmethod
    def setUpTestData(cls):
        cls.staff = User.objects.create_user(username="9000000000", password="staff-pass")
        cls.staff.is_staff = True
        cls.staff.is_superuser = True
        cls.staff.save()

        cls.alpha_user = User.objects.create_user(username="8000000011", password="alpha-pass")
        cls.alpha = Employee.objects.create(
            user=cls.alpha_user, name="Alpha Test", phone="8000000011",
            salary_per_saree=10, advance_salary=0, is_approved=True,
        )

        cls.beta_user = User.objects.create_user(username="8000000012", password="beta-pass")
        cls.beta = Employee.objects.create(
            user=cls.beta_user, name="Beta Test", phone="8000000012",
            salary_per_saree=10, advance_salary=0, is_approved=True,
        )

    def setUp(self):
        self.client = Client()
        self.client.login(username="9000000000", password="staff-pass")


class DuplicateSareeEntryTests(StabilizationBase):
    """BUG-01: duplicate same-day entries must never 500 nor duplicate rows."""

    def test_duplicate_day_rejected_by_db_constraint(self):
        today = timezone.localdate()
        SareeCount.objects.create(employee=self.alpha, date=today, count=4)
        # DB remains the final integrity barrier
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                SareeCount.objects.create(employee=self.alpha, date=today, count=9)

    def test_view_level_duplicate_is_friendly_and_single_row(self):
        today = timezone.localdate()
        resp = self.client.post(reverse("admin_saree_entry"), {
            "employee": str(self.alpha.id), "date": today.isoformat(), "count": "4",
        }, follow=True)
        self.assertContains(resp, "Saree entry added.")
        resp = self.client.post(reverse("admin_saree_entry"), {
            "employee": str(self.alpha.id), "date": today.isoformat(), "count": "7",
        }, follow=True)
        msgs = [str(m) for m in resp.context["messages"]]
        self.assertTrue(any("already exists" in m for m in msgs))
        self.assertEqual(SareeCount.objects.filter(employee=self.alpha, date=today).count(), 1)

    def test_negative_count_rejected_friendly(self):
        resp = self.client.post(reverse("admin_saree_entry"), {
            "employee": str(self.alpha.id),
            "date": timezone.localdate().isoformat(),
            "count": "-3",
        }, follow=True)
        msgs = [str(m) for m in resp.context["messages"]]
        self.assertTrue(any("negative" in m.lower() for m in msgs))
        self.assertEqual(SareeCount.objects.filter(count__lt=0).count(), 0)

    def test_invalid_date_rejected_friendly(self):
        resp = self.client.post(reverse("admin_saree_entry"), {
            "employee": str(self.alpha.id), "date": "not-a-date", "count": "3",
        }, follow=True)
        msgs = [str(m) for m in resp.context["messages"]]
        self.assertTrue(any("Invalid date" in m for m in msgs))

    def test_delete_nonexistent_entry_reports_failure(self):
        """BUG-13: no more false success on missing rows."""
        resp = self.client.post(
            reverse("admin_employee_detail", args=[self.alpha.id]),
            {"action": "delete_saree", "entry_id": "99999"}, follow=True,
        )
        self.assertContains(resp, "Entry not found")


class AdvanceInputSafetyTests(StabilizationBase):
    """BUG-06: invalid amounts must raise service errors, not corrupt data."""

    def test_zero_and_negative_amounts_raise_value_error(self):
        with self.assertRaises(ValueError):
            services.give_advance(self.alpha.id, 0)
        with self.assertRaises(ValueError):
            services.give_advance(self.alpha.id, -50)
        emp = Employee.objects.get(pk=self.alpha.pk)
        self.assertEqual(emp.advance_salary, 0)

    def test_valid_advance_still_audited_with_prev_new(self):
        ah = services.give_advance(self.alpha.id, 100, note="t")
        self.assertEqual(ah.previous_amount, 0)
        self.assertEqual(ah.new_amount, 100)


class ApprovalSecurityTests(StabilizationBase):
    """BUG-12: approval is POST-only, CSRF-protected, idempotent."""

    def setUp(self):
        super().setUp()
        # fresh pending employee per test
        u = User.objects.create_user(username="8000000013", password="pending-pass")
        self.pending = Employee.objects.create(user=u, name="Pending Test", phone="8000000013", is_approved=False)

    def test_get_must_not_approve(self):
        resp = self.client.get(reverse("admin_approve_employee", args=[self.pending.id]))
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Employee.objects.get(pk=self.pending.pk).is_approved)

    def test_post_without_csrf_token_fails(self):
        csrf_client = Client(enforce_csrf_checks=True)
        csrf_client.login(username="9000000000", password="staff-pass")
        resp = csrf_client.post(reverse("admin_approve_employee", args=[self.pending.id]), {})
        self.assertIn(resp.status_code, (403, 400))
        self.assertFalse(Employee.objects.get(pk=self.pending.pk).is_approved)

    def test_post_with_csrf_approves_and_is_idempotent(self):
        resp = self.client.post(reverse("admin_approve_employee", args=[self.pending.id]), {})
        self.assertEqual(resp.status_code, 302)
        self.assertTrue(Employee.objects.get(pk=self.pending.pk).is_approved)
        # repeat POST stays safe
        resp = self.client.post(reverse("admin_approve_employee", args=[self.pending.id]), {})
        self.assertEqual(resp.status_code, 302)
        self.assertTrue(Employee.objects.get(pk=self.pending.pk).is_approved)

    def test_anonymous_cannot_reach_approval(self):
        anon = Client()
        resp = anon.post(reverse("admin_approve_employee", args=[self.pending.id]), {})
        self.assertEqual(resp.status_code, 302)  # redirected to login


class PagdiLifecycleTests(StabilizationBase):
    """BUG-11 sequential invariant; concurrency covered separately."""

    def _assign(self, emp_id, capacity=100):
        return self.client.post(reverse("admin_pagdi_create"), {
            "employee": str(emp_id),
            "start_date": timezone.localdate().isoformat(),
            "capacity_sarees": str(capacity),
        })

    def test_double_assignment_leaves_single_active_with_audits(self):
        self._assign(self.alpha.id)
        self._assign(self.alpha.id, capacity=50)
        actives = PagdiHistory.objects.filter(employee=self.alpha, end_date__isnull=True)
        self.assertEqual(actives.count(), 1)
        self.assertEqual(actives.first().capacity_sarees, 50)
        self.assertEqual(PagdiChangeHistory.objects.filter(employee=self.alpha, action="CREATE").count(), 2)
        self.assertEqual(PagdiChangeHistory.objects.filter(employee=self.alpha, action="FINISH").count(), 1)

    def test_invalid_inputs_are_friendly_not_500(self):
        # BUG-07 blank date
        r1 = self.client.post(reverse("admin_pagdi_create"), {
            "employee": str(self.alpha.id), "start_date": "", "capacity_sarees": "10",
        }, follow=True)
        self.assertContains(r1, "Start date is required")
        # BUG-07 invalid date format
        r2 = self.client.post(reverse("admin_pagdi_create"), {
            "employee": str(self.alpha.id), "start_date": "31/31/2031", "capacity_sarees": "10",
        }, follow=True)
        self.assertContains(r2, "Invalid start date")
        # BUG-08 nonexistent employee
        r3 = self.client.post(reverse("admin_pagdi_create"), {
            "employee": "99999", "start_date": timezone.localdate().isoformat(), "capacity_sarees": "10",
        }, follow=True)
        self.assertContains(r3, "valid employee")
        self.assertEqual(PagdiHistory.objects.count(), 0)


class WarpLifecycleTests(StabilizationBase):
    """BUG-09/BUG-10: coherent warp lifecycle mirroring pagdi."""

    def _assign(self, emp_id, capacity=100):
        return self.client.post(reverse("admin_warp_create"), {
            "employee": str(emp_id), "capacity": str(capacity),
        })

    def test_assignment_auto_finishes_previous_warp(self):
        self._assign(self.alpha.id, capacity=40)
        self._assign(self.alpha.id, capacity=25)
        actives = WarpHistory.objects.filter(employee=self.alpha, end_date__isnull=True)
        self.assertEqual(actives.count(), 1)
        self.assertEqual(actives.first().capacity_sarees, 25)
        finished = WarpHistory.objects.filter(employee=self.alpha, end_date__isnull=False)
        self.assertEqual(finished.count(), 1)
        # audit parity with pagdi
        self.assertEqual(WarpChangeHistory.objects.filter(action="CREATE").count(), 2)
        self.assertEqual(WarpChangeHistory.objects.filter(action="FINISH").count(), 1)

    def test_explicit_finish_via_post_route(self):
        self._assign(self.beta.id, capacity=30)
        warp = WarpHistory.objects.get(employee=self.beta, end_date__isnull=True)
        resp = self.client.post(reverse("admin_warp_finish", args=[warp.id]))
        self.assertEqual(resp.status_code, 302)
        warp.refresh_from_db()
        self.assertIsNotNone(warp.end_date)
        # finishing again is a friendly no-op
        resp = self.client.post(reverse("admin_warp_finish", args=[warp.id]))
        self.assertEqual(resp.status_code, 302)

    def test_get_on_finish_route_rejected(self):
        self._assign(self.beta.id)
        warp = WarpHistory.objects.get(employee=self.beta, end_date__isnull=True)
        resp = self.client.get(reverse("admin_warp_finish", args=[warp.id]))
        self.assertEqual(resp.status_code, 400)

    def test_non_numeric_capacity_friendly(self):
        resp = self.client.post(reverse("admin_warp_create"), {
            "employee": str(self.alpha.id), "capacity": "abc",
        }, follow=True)
        self.assertEqual(resp.status_code, 200)
        msgs = [str(m) for m in resp.context["messages"]]
        self.assertTrue(any("Invalid capacity" in m for m in msgs))
        self.assertEqual(WarpHistory.objects.count(), 0)


class WeeklySnapshotSemanticsTests(StabilizationBase):
    """
    BUG-17: the archive command is the single authority for weekly QUANTITIES;
    mark-paid/unpaid own PAYMENT STATE. Paid history must never lose its paid flag.
    """

    def _mark_paid(self, emp_id, note=""):
        return self.client.post(reverse("mark_paid", args=[emp_id]), {"note": note})

    def test_pay_then_more_work_then_archive_refreshes_quantities_keeps_paid(self):
        monday, sunday = services.get_week_bounds(timezone.localdate())
        SareeCount.objects.create(employee=self.alpha, date=monday, count=2)   # 2×10=20

        self._mark_paid(self.alpha.id, "early settlement")
        sh = SalaryHistory.objects.get(employee=self.alpha)
        self.assertTrue(sh.paid_status)
        paid_date_at_click = sh.paid_date

        # more work after payment
        SareeCount.objects.create(employee=self.alpha, date=monday + timedelta(days=2), count=3)  # total 5×10=50

        result = services.archive_and_reset_weekly_salaries(notes="weekly reset")
        sh.refresh_from_db()
        self.assertEqual(result["created"], 1)          # alpha row exists -> refreshed; beta created
        self.assertEqual(sh.sarees, 5)                  # full-week truth
        self.assertEqual(sh.total_salary_before_advance, 50)
        self.assertEqual(sh.final_salary, 50)
        self.assertTrue(sh.paid_status)                 # payment state preserved
        self.assertEqual(sh.paid_date, paid_date_at_click)

    def test_archive_rerun_is_idempotent(self):
        monday, _ = services.get_week_bounds(timezone.localdate())
        SareeCount.objects.create(employee=self.alpha, date=monday, count=1)
        first = services.archive_and_reset_weekly_salaries()
        second = services.archive_and_reset_weekly_salaries()
        self.assertEqual(first["created"], 2)
        self.assertEqual(second["created"], 0)
        self.assertEqual(SalaryHistory.objects.filter(employee=self.alpha).count(), 1)
        sh = SalaryHistory.objects.get(employee=self.alpha)
        self.assertEqual((sh.sarees, sh.final_salary), (1, 10))

    def test_unpaid_week_archives_accurately_and_repeat_mark_paid_safe(self):
        monday, _ = services.get_week_bounds(timezone.localdate())
        SareeCount.objects.create(employee=self.beta, date=monday, count=4)
        result = services.archive_and_reset_weekly_salaries()
        self.assertEqual(result["created"], 2)
        sh = SalaryHistory.objects.get(employee=self.beta)
        self.assertFalse(sh.paid_status)
        self.assertEqual(sh.final_salary, 40)

        # repeated mark-paid on an ARCHIVED week keeps one row, paid state true
        self._mark_paid(self.beta.id)
        self._mark_paid(self.beta.id)
        self.assertEqual(SalaryHistory.objects.filter(employee=self.beta).count(), 1)
        self.assertTrue(SalaryHistory.objects.get(employee=self.beta).paid_status)

        # mark-unpaid flips flags only; quantities intact
        self.client.post(reverse("mark_unpaid", args=[self.beta.id]), {})
        sh = SalaryHistory.objects.get(employee=self.beta)
        self.assertFalse(sh.paid_status)
        self.assertIsNone(sh.paid_date)
        self.assertEqual(sh.sarees, 4)
        self.assertEqual(sh.final_salary, 40)

    def test_negative_final_is_consistent_debt_recovery(self):
        """BUG-18 decision pinned: advance recovery may exceed earnings; the negative
        result is preserved consistently by compute/archive rather than clamped."""
        services.give_advance(self.alpha.id, 100)
        monday, _ = services.get_week_bounds(timezone.localdate())
        SareeCount.objects.create(employee=self.alpha, date=monday, count=6)  # 6×10=60 −100 = −40
        services.archive_and_reset_weekly_salaries()
        sh = SalaryHistory.objects.get(employee=self.alpha)
        self.assertEqual(sh.final_salary, -40)
        numbers = services.compute_salary_for_employee_for_week(
            Employee.objects.get(pk=self.alpha.pk), monday, monday + timedelta(days=6)
        )
        self.assertEqual(numbers["final_salary"], -40)


class CapacityFormulaTests(StabilizationBase):
    """BUG-19: one authoritative calculation everywhere; future dates excluded."""

    def test_future_dated_entries_excluded_and_remaining_clamped(self):
        # Exact Phase 4 divergence scenario: pagdi started today, entry today plus
        # future-dated entry — both model methods and views must agree.
        pagdi = PagdiHistory.objects.create(
            employee=self.alpha, start_date=timezone.localdate(), capacity_sarees=100,
        )
        SareeCount.objects.create(employee=self.alpha, date=timezone.localdate(), count=10)
        SareeCount.objects.create(employee=self.alpha, date=timezone.localdate() + timedelta(days=7), count=9)

        self.assertEqual(pagdi.made_sarees(), 10)
        self.assertEqual(pagdi.remaining_sarees(), 90)

        # clamp case
        small = PagdiHistory.objects.create(
            employee=self.beta, start_date=timezone.localdate(), capacity_sarees=5,
        )
        SareeCount.objects.create(employee=self.beta, date=timezone.localdate(), count=12)
        self.assertEqual(small.remaining_sarees(), 0)

        # completed material counts only up to its end_date (the +7d entry is
        # beyond end_date and stays excluded)
        pagdi.end_date = timezone.localdate() + timedelta(days=1)
        pagdi.save()
        self.assertEqual(pagdi.made_sarees(), 10)

    def test_warp_same_semantics(self):
        warp = WarpHistory.objects.create(
            employee=self.alpha, start_date=timezone.localdate(), capacity_sarees=50,
        )
        SareeCount.objects.create(employee=self.alpha, date=timezone.localdate() + timedelta(days=3), count=7)
        self.assertEqual(warp.made_sarees(), 0)
        self.assertEqual(warp.remaining_sarees(), 50)


class RateSettingTests(StabilizationBase):
    """BUG-02: staff can set the rate from the panel; validation enforced."""

    def test_staff_updates_rate(self):
        resp = self.client.post(
            reverse("admin_employee_detail", args=[self.alpha.id]),
            {"action": "save_salary", "salary_per_saree": "42"},
        )
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Employee.objects.get(pk=self.alpha.pk).salary_per_saree, 42)

    def test_invalid_rate_values_rejected(self):
        for bad in ("abc", "-5", ""):
            self.client.post(
                reverse("admin_employee_detail", args=[self.alpha.id]),
                {"action": "save_salary", "salary_per_saree": bad},
            )
        self.assertEqual(Employee.objects.get(pk=self.alpha.pk).salary_per_saree, 10)

    def test_employee_cannot_set_own_rate(self):
        emp_client = Client()
        emp_client.login(username="8000000011", password="alpha-pass")
        resp = emp_client.post(
            reverse("admin_employee_detail", args=[self.alpha.id]),
            {"action": "save_salary", "salary_per_saree": "999"},
        )
        self.assertEqual(resp.status_code, 302)  # bounced to login
        self.assertEqual(Employee.objects.get(pk=self.alpha.pk).salary_per_saree, 10)


class AuditSurvivalTests(TransactionTestCase):
    """BUG-22: forensic trail survives employee/user deletion."""

    def test_audit_rows_survive_user_deletion_with_name_snapshot(self):
        u = User.objects.create_user(username="8777777777", password="x-pass")
        emp = Employee.objects.create(user=u, name="Doomed Worker", phone="8777777777", is_approved=True)
        services.give_advance(emp.id, 33, note="pre-delete")
        pagdi = PagdiHistory.objects.create(employee=emp, start_date=timezone.localdate(), capacity_sarees=9)
        services.finish_pagdi(pagdi.id, note="pre-delete finish")

        AdvanceHistory.objects.filter(employee=emp).update(employee_name="Doomed Worker")
        PagdiChangeHistory.objects.filter(employee=emp).update(employee_name="Doomed Worker")

        adv_count_before = AdvanceHistory.objects.count()
        pagdi_audit_before = PagdiChangeHistory.objects.count()

        u.delete()

        self.assertFalse(Employee.objects.filter(pk=emp.pk).exists())
        self.assertFalse(PagdiHistory.objects.filter(pk=pagdi.pk).exists())
        self.assertEqual(AdvanceHistory.objects.count(), adv_count_before)
        self.assertEqual(PagdiChangeHistory.objects.count(), pagdi_audit_before)
        self.assertTrue(AdvanceHistory.objects.filter(employee_name="Doomed Worker", employee=None).exists())

