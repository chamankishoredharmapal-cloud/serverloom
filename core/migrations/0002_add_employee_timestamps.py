from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='created_at',
            field=models.DateTimeField(default=timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='employee',
            name='updated_at',
            field=models.DateTimeField(default=timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='employee',
            name='current_week_salary',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='salaryhistory',
            name='notes',
            field=models.TextField(blank=True, default=""),
            preserve_default=False,
        ),
    ]
