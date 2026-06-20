import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('chester_helpdesk')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# ── Periodic tasks ────────────────────────────────────────────────────────────
app.conf.beat_schedule = {
    # Every minute — publish scheduled announcements + expire old ones
    'process-announcements-every-minute': {
        'task':     'configuration.tasks.process_announcement_visibility',
        'schedule': crontab(minute='*'),
    },
}