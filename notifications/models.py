from django.db import models
from django.conf import settings
from tickets.models import Ticket
from departments.models import Group


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
    NotificationRule matrix below, no row is created here for that channel
    at all — it's simply skipped at dispatch time, not created-then-suppressed.

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


class TicketInterestedParty(models.Model):
    """
    Tracks which users are "interested" in a given ticket, and why.
    A user becomes interested the moment they report, get assigned to,
    reassign, comment on, or get @mentioned on a ticket. Once interested,
    they keep receiving status-change and comment notifications on that
    ticket regardless of current assignment.

    A user can become interested for multiple reasons over time — we keep
    one row per (ticket, user, reason) so the audit trail shows exactly
    how/why someone is following a ticket.
    """

    REASON_CHOICES = [
        ('reporter',   'Reporter'),
        ('assignee',   'Assignee'),
        ('reassigned', 'Reassigned the Ticket'),
        ('commented',  'Commented'),
        ('mentioned',  'Mentioned'),
    ]

    ticket     = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='interested_parties',
    )
    user       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='interested_tickets',
    )
    reason     = models.CharField(max_length=20, choices=REASON_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ticket_interested_parties'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['ticket', 'user']),
        ]
        unique_together = ('ticket', 'user', 'reason')

    def __str__(self):
        return f'{self.user} interested in {self.ticket} ({self.reason})'


class NotificationRule(models.Model):
    """
    Admin-configurable override matrix for notification delivery.

    Default behaviour (no matching rule): all channels enabled for all
    events for everyone — i.e. the system is "on" by default, and admins
    create rules here to SUPPRESS (or explicitly re-enable) specific
    channel/event/scope combinations.

    Specificity / precedence order when resolving whether a channel should
    fire for a given (user, event_type, from_status, to_status, channel):
      1. User + specific transition (from_status & to_status both set)
      2. User + specific event_type (transition fields null)
      3. User, fully global (event_type and transition fields null)
      4. Group + specific transition
      5. Group + specific event_type
      6. Group, fully global
      7. No rule found → default to enabled

    Exactly one of `user` / `group` should be set per rule (scope).
    """

    SCOPE_CHOICES = [
        ('user',  'Specific User'),
        ('group', 'Specific Group'),
    ]

    CHANNEL_CHOICES = NotificationDelivery.CHANNEL_CHOICES

    EVENT_TYPE_CHOICES = Notification.TYPE_CHOICES

    scope      = models.CharField(max_length=10, choices=SCOPE_CHOICES)

    user       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_rules',
        null=True,
        blank=True,
        help_text='Set when scope = user. Leave blank when scope = group.',
    )
    group      = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='notification_rules',
        null=True,
        blank=True,
        help_text='Set when scope = group. Leave blank when scope = user.',
    )

    channel    = models.CharField(max_length=10, choices=CHANNEL_CHOICES)

    # Null event_type = applies to ALL event types (fully global for this scope+channel)
    event_type = models.CharField(
        max_length=20,
        choices=EVENT_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text='Leave blank to apply to all event types.',
    )

    # Transition-pair granularity — only meaningful when event_type = 'status_change'
    # (or left blank to mean "any transition"). Both null = not transition-specific.
    from_status = models.ForeignKey(
        'configuration.Status',
        on_delete=models.CASCADE,
        related_name='notification_rules_from',
        null=True,
        blank=True,
        help_text='Optional. Only used for status_change rules targeting a specific transition.',
    )
    to_status   = models.ForeignKey(
        'configuration.Status',
        on_delete=models.CASCADE,
        related_name='notification_rules_to',
        null=True,
        blank=True,
        help_text='Optional. Only used for status_change rules targeting a specific transition.',
    )

    is_enabled = models.BooleanField(
        default=False,
        help_text='False = suppress this channel for this scope/event/transition. '
                   'True = explicitly re-enable (useful to override a broader suppressing rule).',
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='notification_rules_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_rules'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['scope', 'user']),
            models.Index(fields=['scope', 'group']),
            models.Index(fields=['channel', 'event_type']),
        ]

    def __str__(self):
        target = self.user if self.scope == 'user' else self.group
        scope_label  = f'{target}'
        event_label  = self.event_type or 'all events'
        transition   = ''
        if self.from_status_id or self.to_status_id:
            transition = f' [{self.from_status} → {self.to_status}]'
        state_label  = 'ON' if self.is_enabled else 'OFF'
        return f'{scope_label} · {self.channel} · {event_label}{transition} → {state_label}'