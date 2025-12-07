# core/models.py
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db.models import Sum
from django.utils import timezone
from datetime import date


# ============================================================
# EMPLOYEE MODEL
# ============================================================

class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="employee")
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, db_index=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)

    joining_date = models.DateField(auto_now_add=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Material tracking
    pagdi_thread_1 = models.IntegerField(default=0)
    pagdi_thread_2 = models.IntegerField(default=0)
    warp_threads = models.IntegerField(default=0)

    # Payroll
    salary_per_saree = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    advance_salary = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    current_week_salary = models.IntegerField(default=0)

    performance = models.CharField(max_length=20, default="Average")
    is_approved = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["phone"])]

    def __str__(self):
        return f"{self.name} ({self.phone})"


# ============================================================
# SAREE COUNT MODEL
# ============================================================

class SareeCount(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="saree_counts")
    date = models.DateField(db_index=True)
    count = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("employee", "date")
        ordering = ["-date"]
        indexes = [models.Index(fields=["employee", "date"])]

    def salary_earned(self):
        rate = self.employee.salary_per_saree or 0
        return self.count * rate

    def __str__(self):
        return f"{self.employee.name} - {self.date} - {self.count}"


# ============================================================
# WARP HISTORY
# ============================================================

class WarpHistory(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="warp_history")
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    capacity_sarees = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date"]

    def remaining_sarees(self):
        sarees_made = SareeCount.objects.filter(
            employee=self.employee,
            date__gte=self.start_date,
            date__lte=date.today()
        ).aggregate(Sum("count"))["count__sum"] or 0
        return self.capacity_sarees - sarees_made

    def is_active(self):
        return self.end_date is None

    def __str__(self):
        return f"Warp for {self.employee.name} ({self.capacity_sarees} sarees)"


# ============================================================
# PAGDI HISTORY
# ============================================================

class PagdiHistory(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="pagdi_history")
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    capacity_sarees = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date"]

    def remaining_sarees(self):
        sarees_made = SareeCount.objects.filter(
            employee=self.employee,
            date__gte=self.start_date,
            date__lte=date.today()
        ).aggregate(Sum("count"))["count__sum"] or 0
        return self.capacity_sarees - sarees_made

    def is_active(self):
        return self.end_date is None

    def __str__(self):
        return f"Pagdi for {self.employee.name} ({self.capacity_sarees} sarees)"


# ============================================================
# ALERT EMAIL (for notifications)
# ============================================================

class AlertEmail(models.Model):
    email = models.EmailField(unique=True)

    def __str__(self):
        return self.email


# ============================================================
# SALARY HISTORY (WEEKLY)
# ============================================================

class SalaryHistory(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="salary_history")
    week_start = models.DateField(db_index=True)
    week_end = models.DateField()
    sarees = models.PositiveIntegerField(default=0)
    salary_rate = models.PositiveIntegerField(default=0)
    total_salary_before_advance = models.IntegerField(default=0)
    advance_salary = models.IntegerField(default=0)
    final_salary = models.IntegerField(default=0)
    paid_status = models.BooleanField(default=False)
    paid_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-week_start"]
        unique_together = ("employee", "week_start", "week_end")
        indexes = [models.Index(fields=["employee", "week_start"])]

    def __str__(self):
        return f"{self.employee.name} – {self.week_start} to {self.week_end}"


# ============================================================
# ADVANCE HISTORY (AUDIT LOG)
# ============================================================

class AdvanceHistory(models.Model):
    ACTION_CHOICES = [
        ("CLEAR", "Clear"),
        ("CARRY", "Carry"),
        ("ADJUST", "Adjust"),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="advance_history")
    admin_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action_type = models.CharField(max_length=10, choices=ACTION_CHOICES)
    previous_amount = models.IntegerField()
    new_amount = models.IntegerField()
    note = models.TextField(blank=True)

    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["employee", "created_at"])]

    def __str__(self):
        return f"{self.employee.name} Advance {self.action_type} at {self.created_at}"


# ============================================================
# PAGDI CHANGE HISTORY (AUDIT LOG)
# ============================================================

class PagdiChangeHistory(models.Model):
    pagdi = models.ForeignKey(PagdiHistory, null=True, blank=True, on_delete=models.SET_NULL, related_name="change_history")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="pagdi_change_history")
    admin_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=50)
    previous_capacity = models.IntegerField(null=True, blank=True)
    new_capacity = models.IntegerField(null=True, blank=True)
    previous_end_date = models.DateField(null=True, blank=True)
    new_end_date = models.DateField(null=True, blank=True)
    note = models.TextField(blank=True)

    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["employee", "created_at"])]

    def __str__(self):
        return f"{self.employee.name} Pagdi {self.action} at {self.created_at}"
