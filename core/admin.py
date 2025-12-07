# core/admin.py
from django.contrib import admin
from .models import (
    Employee,
    SareeCount,
    WarpHistory,
    PagdiHistory,
    AlertEmail,
    SalaryHistory,
    AdvanceHistory,
    PagdiChangeHistory,
)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "phone",
        "is_approved",
        "salary_per_saree",
        "advance_salary",
        "joining_date",
        "performance",
    )
    list_filter = ("is_approved", "performance")
    search_fields = ("name", "phone", "user__email")
    readonly_fields = ("joining_date", "created_at", "updated_at")


@admin.register(SareeCount)
class SareeCountAdmin(admin.ModelAdmin):
    list_display = ("employee", "date", "count", "salary_earned")
    list_filter = ("date", "employee")
    search_fields = ("employee__name",)
    ordering = ("-date",)


@admin.register(WarpHistory)
class WarpHistoryAdmin(admin.ModelAdmin):
    list_display = ("employee", "start_date", "end_date", "capacity_sarees", "remaining_display", "is_active_display")
    list_filter = ("start_date", "end_date")
    search_fields = ("employee__name",)

    def remaining_display(self, obj):
        return obj.remaining_sarees()
    remaining_display.short_description = "Remaining Sarees"

    def is_active_display(self, obj):
        return obj.is_active()
    is_active_display.boolean = True
    is_active_display.short_description = "Active"


@admin.register(PagdiHistory)
class PagdiHistoryAdmin(admin.ModelAdmin):
    list_display = ("employee", "start_date", "end_date", "capacity_sarees", "remaining_display", "is_active_display")
    list_filter = ("start_date", "end_date")
    search_fields = ("employee__name",)

    def remaining_display(self, obj):
        return obj.remaining_sarees()
    remaining_display.short_description = "Remaining Sarees"

    def is_active_display(self, obj):
        return obj.is_active()
    is_active_display.boolean = True
    is_active_display.short_description = "Active"


@admin.register(SalaryHistory)
class SalaryHistoryAdmin(admin.ModelAdmin):
    list_display = ("employee", "week_start", "week_end", "sarees", "salary_rate", "advance_salary", "final_salary", "paid_status", "paid_date")
    list_filter = ("paid_status", "week_start")
    search_fields = ("employee__name",)
    date_hierarchy = "week_end"


@admin.register(AdvanceHistory)
class AdvanceHistoryAdmin(admin.ModelAdmin):
    list_display = ("employee", "action_type", "previous_amount", "new_amount", "admin_user", "created_at")
    list_filter = ("action_type",)
    search_fields = ("employee__name", "admin_user__username")


@admin.register(PagdiChangeHistory)
class PagdiChangeHistoryAdmin(admin.ModelAdmin):
    list_display = ("employee", "action", "previous_capacity", "new_capacity", "admin_user", "created_at")
    list_filter = ("action",)
    search_fields = ("employee__name", "admin_user__username")


@admin.register(AlertEmail)
class AlertEmailAdmin(admin.ModelAdmin):
    list_display = ("email",)
