# core/tests/test_advance_and_reset.py
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date, timedelta

from core.models import Employee, SareeCount, SalaryHistory, AdvanceHistory
from core import services

class AdvanceAndResetTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username="emp1", password="pw")
        self.emp = Employee.objects.create(user=self.user, name="E1", phone="9999", salary_per_saree=10, advance_salary=50, is_approved=True)

    def test_clear_advance_creates_history_and_sets_zero(self):
        self.assertEqual(self.emp.advance_salary, 50)
        ah = services.clear_advance_for_employee(self.emp.id, admin_user=None, note="test clear")
        self.emp.refresh_from_db()
        self.assertEqual(self.emp.advance_salary, 0)
        self.assertIsInstance(ah, AdvanceHistory)
        self.assertEqual(ah.previous_amount, 50)
        self.assertEqual(ah.new_amount, 0)

    def test_carry_advance_does_not_zero_incorrectly(self):
        # create second employee with some advance
        user2 = User.objects.create_user(username="emp2", password="pw")
        emp2 = Employee.objects.create(user=user2, name="E2", phone="8888", salary_per_saree=20, advance_salary=30, is_approved=True)
        processed = services.carry_advances_to_next_week(carry_factor=1.0, admin_user=None, note="carry test")
        self.assertGreaterEqual(processed, 1)
        emp2.refresh_from_db()
        # carry factor 1.0 should leave amount unchanged
        self.assertEqual(emp2.advance_salary, 30)
        # also AdvanceHistory entry exists
        self.assertTrue(emp2.advance_history.exists())

    def test_reset_weekly_salary_is_idempotent_and_creates_history(self):
        # create some saree counts for this week
        today = timezone.localdate()
        monday, sunday = services.get_week_bounds(today)
        SareeCount.objects.create(employee=self.emp, date=monday, count=3)
        SareeCount.objects.create(employee=self.emp, date=monday + timedelta(days=1), count=2)

        created_first = services.archive_and_reset_weekly_salaries(for_date=today, admin_user=None, notes="test reset")
        self.assertEqual(created_first, 1)
        self.assertTrue(SalaryHistory.objects.filter(employee=self.emp, week_start=monday, week_end=sunday).exists())
        # calling again should not create duplicate rows, due to unique_together check
        created_second = services.archive_and_reset_weekly_salaries(for_date=today, admin_user=None, notes="test reset")
        self.assertEqual(created_second, 0)  # idempotent
