from celery import shared_task
from django.utils import timezone


@shared_task(name='configuration.tasks.process_announcement_visibility')
def process_announcement_visibility():
    """
    Runs every minute via Celery Beat.
    - No action needed for expiry — visibility is computed on-the-fly via
      is_currently_visible property based on visible_from/visible_till.
    - This task exists as a hook for future notifications (e.g. email alerts
      when an announcement goes live or expires).
    """
    from .models import Announcement
    now = timezone.now()

    # Find announcements that just became live (scheduled, now past visible_from)
    just_published = Announcement.objects.filter(
        is_active=True,
        visible_from__lte=now,
        visible_from__isnull=False,
    ).exclude(visible_from=None)

    # Find announcements that just expired
    just_expired = Announcement.objects.filter(
        is_active=True,
        visible_till__lt=now,
        visible_till__isnull=False,
    )

    return {
        'checked_at':      now.isoformat(),
        'live_count':      just_published.count(),
        'expired_count':   just_expired.count(),
    }