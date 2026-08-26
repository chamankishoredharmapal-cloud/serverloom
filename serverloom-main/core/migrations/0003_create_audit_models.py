from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_add_employee_timestamps'),
    ]

    operations = [
        migrations.CreateModel(
            name='AdvanceHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action_type', models.CharField(max_length=10, choices=[('CLEAR', 'Clear'), ('CARRY', 'Carry'), ('ADJUST', 'Adjust')])),
                ('previous_amount', models.IntegerField()),
                ('new_amount', models.IntegerField()),
                ('note', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('admin_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='advance_history', to='core.employee')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),

        migrations.CreateModel(
            name='PagdiChangeHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=50)),
                ('previous_capacity', models.IntegerField(null=True, blank=True)),
                ('new_capacity', models.IntegerField(null=True, blank=True)),
                ('previous_end_date', models.DateField(null=True, blank=True)),
                ('new_end_date', models.DateField(null=True, blank=True)),
                ('note', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('admin_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pagdi_change_history', to='core.employee')),
                ('pagdi', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='change_history', to='core.pagdihistory')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
