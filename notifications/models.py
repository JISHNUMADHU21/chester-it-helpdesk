from django.db import models
from django.conf import settings
from tickets.models import Ticket


class Notification(models.Model):

    TYPE_CHOICES = [
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