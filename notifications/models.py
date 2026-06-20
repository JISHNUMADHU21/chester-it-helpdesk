from django.db import models
from django.conf import settings
from tickets.models import Ticket


class Notification(models.Model):

    TYPE_CHOICES = [
        ('ticket_created', 'Ticket Created'),  # Reserved for a future phase — not
                                                # currently triggered by any workflow.
        ('mention',        'Mention'),
        ('assignment',     'Assignment'),
        ('status_change',  'Status Change'),
        ('comment',        'Comment'),
        ('escalation',     'Escalation'),
        ('reassignment',   'Reassignment'),
        ('resolution',     'Resolution'),
        ('reopened',       'Reopened'),
    ]

    recipient  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True,
    )
    type       = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        db_index=True,
    )
    ticket     = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True,
    )
    message    = models.TextField()
    read       = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'read']),
            models.Index(fields=['recipient', 'created_at']),
        ]

    def __str__(self):
        return f'{self.type} → {self.recipient} ({self.ticket})'


class NotificationDelivery(models.Model):
    """
    One row per channel ACTUALLY ATTEMPTED for a given Notification.
    If a channel is disabled for the recipient/event/transition via the
    NotificationRule matrix (added in a later step), no row is created here
    for that channel at all — it's simply skipped at dispatch time, not
    created-then-suppressed.

    This table exists purely for delivery tracking/auditing (did the email
    actually send, did it fail, etc.) — it is NOT used to render the in-app
    bell dropdown, which queries Notification directly.
    """

    CHANNEL_CHOICES = [
        ('in_app', 'In-App'),
        ('email',  'Email'),
        ('push',   'Push'),  # Not yet wired to a real provider (Flutter/FCM/APNs
                              # integration is a later phase) — schema is ready.
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent',    'Sent'),
        ('failed',  'Failed'),
        ('skipped', 'Skipped'),  # e.g. push channel exists but no device token yet
    ]

    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name='deliveries',
    )
    channel       = models.CharField(max_length=10, choices=CHANNEL_CHOICES, db_index=True)
    status        = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending', db_index=True)
    error_message = models.TextField(blank=True)
    sent_at       = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notification_deliveries'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['notification', 'channel']),
        ]
        unique_together = ('notification', 'channel')

    def __str__(self):
        return f'{self.notification_id} · {self.channel} · {self.status}'