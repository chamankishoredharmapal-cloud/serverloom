# core/management/commands/reset_weekly_salary.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from core import services
from django.db import transaction

class Command(BaseCommand):
    help = "Archive this week's salaries into SalaryHistory and reset live running payroll fields (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--date", type=str, help="Date (YYYY-MM-DD) to use to compute the week. Defaults to today.")
        parser.add_argument("--note", type=str, help="Optional note to store in SalaryHistory notes", default="Weekly automated reset")
        parser.add_argument("--dry-run", action="store_true", help="Don't write any changes, just report counts")

    def handle(self, *args, **options):
        note = options.get("note", "")
        dry = options.get("dry_run", False)
        date_arg = options.get("date", None)
        if date_arg:
            from datetime import datetime
            use_date = datetime.strptime(date_arg, "%Y-%m-%d").date()
        else:
            use_date = None

        if dry:
            self.stdout.write(self.style.NOTICE("DRY RUN: no DB writes will be performed. Computing changes..."))
            try:
                with transaction.atomic():
                    created = services.archive_and_reset_weekly_salaries(for_date=use_date, admin_user=None, notes=note)
                    # rollback by raising a sentinel to avoid committing
                    raise RuntimeError("DRY_RUN_ROLLBACK")
            except RuntimeError as e:
                if str(e) == "DRY_RUN_ROLLBACK":
                    self.stdout.write(self.style.SUCCESS(f"DRY RUN: would create {created} SalaryHistory rows (no DB changes)."))
                    return
                raise
        else:
            created = services.archive_and_reset_weekly_salaries(for_date=use_date, admin_user=None, notes=note)
            self.stdout.write(self.style.SUCCESS(f"Archived and reset weekly salaries. SalaryHistory rows created: {created}"))
