# core/management/commands/carry_advance.py
from django.core.management.base import BaseCommand
from core import services
from django.db import transaction

class Command(BaseCommand):
    help = "Carry outstanding advances to next week (audit each change)."

    def add_arguments(self, parser):
        parser.add_argument("--factor", type=float, default=1.0, help="Carry factor: fraction of outstanding advance to carry (1.0 => full).")
        parser.add_argument("--dry-run", action="store_true", help="Don't write changes; just report how many would be processed.")
        parser.add_argument("--note", type=str, default="", help="Optional note to store in AdvanceHistory entries.")

    def handle(self, *args, **options):
        factor = options.get("factor", 1.0)
        dry = options.get("dry_run", False)
        note = options.get("note", "")

        if dry:
            # Safe dry-run: run inside a transaction and rollback at the end.
            self.stdout.write(self.style.NOTICE("DRY RUN: no DB writes will be performed. Performing simulated run..."))
            try:
                with transaction.atomic():
                    processed = services.carry_advances_to_next_week(carry_factor=factor, admin_user=None, note=note)
                    # Rollback by raising a controlled exception to undo writes.
                    raise RuntimeError("DRY_RUN_ROLLBACK")
            except RuntimeError as e:
                if str(e) == "DRY_RUN_ROLLBACK":
                    self.stdout.write(self.style.SUCCESS(f"DRY RUN: would process approximately {processed} employees. (No DB changes committed)"))
                    return
                raise
        else:
            processed = services.carry_advances_to_next_week(carry_factor=factor, admin_user=None, note=note)
            self.stdout.write(self.style.SUCCESS(f"Processed {processed} advances (carry_factor={factor})."))
