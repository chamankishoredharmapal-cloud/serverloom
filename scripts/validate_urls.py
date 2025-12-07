
import os, sys
sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE","your_project.settings")  # <-- replace with your settings module
import django
django.setup()
from django.urls import reverse, NoReverseMatch
expected_names = [
 "admin_home","admin_employees","admin_pagdi_list","admin_warp_list","admin_saree_entry","admin_weekly_salary",
 "admin_salary_history","download_global_history","logout","employee_dashboard","saree_count","pagdi","warp",
 "employee_history","employee_salary_history","download_global_weekly_salary","admin_pagdi_create","admin_warp_create",
 "admin_employee_detail","admin_approve_employee","give_advance","clear_advance","mark_unpaid","mark_paid","salary_slip_pdf",
 "signup","login"
]
missing=[]
for name in expected_names:
    try:
        reverse(name)
    except NoReverseMatch:
        missing.append(name)
print("MISSING URL NAMES (need to add or fix):")
print("\\n".join(missing) or "None")

