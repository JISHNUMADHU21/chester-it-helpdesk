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

    # Every minute — pick up pending email NotificationDelivery rows
    # and send them via the configured SMTP backend. Running every minute
    # means notifications are delivered within ~60 seconds of being created,
    # while keeping SMTP calls off the request/response cycle entirely.
    'process-pending-email-notifications-every-minute': {
        'task':     'notifications.process_pending_email_notifications',
        'schedule': crontab(minute='*'),
    },

}