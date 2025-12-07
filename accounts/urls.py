# accounts/urls.py
# accounts/urls.py
from django.urls import path
from . import views

urlpatterns = [

    # AUTH
    path("signup/", views.signup_view, name="signup"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("accounts/login/", views.login_view),

    # EMPLOYEE SIDE
    path("employee/dashboard/", views.employee_dashboard, name="employee_dashboard"),
    path("employee/saree-count/", views.saree_count_view, name="saree_count"),
    path("employee/pagdi/", views.pagdi_view, name="pagdi"),
    path("employee/warp/", views.warp_view, name="warp"),
    path("employee/history/", views.employee_history_view, name="employee_history"),
    path("employee/salary-history/", views.employee_salary_history, name="employee_salary_history"),

    # ADMIN PANEL
    path("panel/", views.admin_home, name="admin_home"),
    path("panel/dashboard/", views.admin_dashboard, name="admin_dashboard"),

    # EMPLOYEES
    path("panel/employees/", views.admin_employees, name="admin_employees"),
    path("panel/employees/<int:emp_id>/", views.admin_employee_detail, name="admin_employee_detail"),
    path("panel/employees/<int:emp_id>/approve/", views.admin_approve_employee, name="admin_approve_employee"),

    # PAGDI
    path("panel/pagdi/", views.admin_pagdi_list, name="admin_pagdi_list"),
    path("panel/pagdi/create/", views.admin_pagdi_create, name="admin_pagdi_create"),

    # WARP (admin)
    path("panel/warp/", views.admin_warp_list, name="admin_warp_list"),
    path("panel/warp/create/", views.admin_warp_create, name="admin_warp_create"),

    # WEEKLY SALARY
    path("panel/weekly-salary/", views.admin_weekly_salary, name="admin_weekly_salary"),

    # SALARY ACTIONS
    path("panel/give-advance/<int:emp_id>/", views.give_advance_view, name="give_advance"),
    path("panel/clear-advance/<int:emp_id>/", views.clear_advance, name="clear_advance"),
    path("panel/mark-paid/<int:emp_id>/", views.mark_paid, name="mark_paid"),
    path("panel/mark-unpaid/<int:emp_id>/", views.mark_unpaid, name="mark_unpaid"),
    path("panel/salary-slip/<int:emp_id>/", views.salary_slip_pdf, name="salary_slip_pdf"),

    # SALARY HISTORY (ADMIN)
    path("panel/salary-history/", views.admin_salary_history, name="admin_salary_history"),

    # SAREE ENTRY (ADMIN)
    path("panel/saree-entry/", views.admin_saree_entry, name="admin_saree_entry"),

    # Download global history (XLSX)
    path("panel/download-history/", views.download_global_history, name="download_global_history"),
    
    path("panel/download-global-weekly-salary/", views.download_global_weekly_salary, name="download_global_weekly_salary"),


]
