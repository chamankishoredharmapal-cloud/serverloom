from django.db import migrations


def backfill_notes(apps, schema_editor):
    SalaryHistory = apps.get_model('core', 'SalaryHistory')
    for row in SalaryHistory.objects.all():
        if not row.notes:
            row.notes = "Backfilled by migration"
            row.save(update_fields=['notes'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_create_audit_models'),
    ]

    operations = [
        migrations.RunPython(backfill_notes, reverse_code=migrations.RunPython.noop),
    ]
