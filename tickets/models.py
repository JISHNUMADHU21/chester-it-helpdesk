from django.db import models
from django.conf import settings
from departments.models import Group


class Ticket(models.Model):

    STATUS_CHOICES = [
        ('pending',     'Pending'),
        ('in_progress', 'In Progress'),
        ('escalated',   'Escalated'),
        ('resolved',    'Resolved'),
        ('cancelled',   'Cancelled'),
        ('reopened',    'Reopened'),
    ]

    PRIORITY_CHOICES = [
        ('lowest',  'Lowest'),
        ('low',     'Low'),
        ('medium',  'Medium'),
        ('high',    'High'),
        ('highest', 'Highest'),
    ]

    URGENCY_CHOICES = [
        ('critical', 'Critical'),
        ('high',     'High'),
        ('medium',   'Medium'),
        ('low',      'Low'),
    ]

    WORK_TYPE_CHOICES = [
        ('service_request', 'Service Request'),
        ('incident',        'Incident'),
        ('problem',         'Problem'),
        ('change_request',  'Change Request'),
    ]

    # ── Key & Ownership ───────────────────────────────────────────────────────
    key   = models.CharField(max_length=20, unique=True, db_index=True)

    # Original group — determines prefix. NEVER changes after creation.
    group = models.ForeignKey(
        Group,
        on_delete=models.PROTECT,
        related_name='originated_tickets',
        help_text='Original group. Determines ticket key prefix. Never changes.',
    )

    # Current responsible group — changes on reassignment.
    assigned_group = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets',
        help_text='Current group responsible. Changes on reassignment.',
    )

    # Individual assignee — null if assigned to group only.
    assigned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets',
        help_text='Individual assignee. Null if ticket assigned to group inbox.',
    )

    # Reporter — auto-populated, never changes.
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='reported_tickets',
    )

    # ── Core Fields ───────────────────────────────────────────────────────────
    summary     = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    work_type   = models.CharField(
        max_length=20,
        choices=WORK_TYPE_CHOICES,
        default='service_request',
    )
    components  = models.CharField(max_length=100, blank=True)
    due_date    = models.DateField(null=True, blank=True)

    # ── Status & Priority ─────────────────────────────────────────────────────
    status   = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True,
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium',
        db_index=True,
    )
    urgency  = models.CharField(
        max_length=10,
        choices=URGENCY_CHOICES,
        blank=True,
    )

    # ── Assignment Lock ───────────────────────────────────────────────────────
    is_locked = models.BooleanField(
        default=False,
        db_index=True,
        help_text='Locked once an agent claims the ticket. Only managers+ can override.',
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tickets'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['assigned_group']),
            models.Index(fields=['assigned_user']),
            models.Index(fields=['reporter']),
            models.Index(fields=['group']),
            models.Index(fields=['created_at']),
            models.Index(fields=['is_locked']),
            models.Index(fields=['priority']),
            models.Index(fields=['status', 'assigned_group']),
            models.Index(fields=['assigned_group', 'created_at']),
        ]

    def __str__(self):
        return f'{self.key} — {self.summary}'

    def save(self, *args, **kwargs):
        # On first save, assigned_group mirrors group (original)
        if not self.pk and not self.assigned_group_id:
            self.assigned_group = self.group
        super().save(*args, **kwargs)


class Comment(models.Model):
    ticket     = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    author     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='comments',
    )
    body       = models.TextField()
    mentions   = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='mentioned_in_comments',
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'comments'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['ticket', 'created_at']),
            models.Index(fields=['author']),
        ]

    def __str__(self):
        return f'Comment by {self.author} on {self.ticket.key}'


class Attachment(models.Model):
    ticket        = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='attachments',
    )
    file          = models.FileField(upload_to='attachments/%Y/%m/%d/')
    original_name = models.CharField(max_length=255)
    file_size     = models.PositiveIntegerField(help_text='File size in bytes')
    content_type  = models.CharField(max_length=100)
    uploaded_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='attachments',
    )
    uploaded_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'attachments'
        ordering = ['uploaded_at']
        indexes = [
            models.Index(fields=['ticket']),
        ]

    def __str__(self):
        return f'{self.original_name} ({self.ticket.key})'


class TicketLink(models.Model):

    RELATIONSHIP_CHOICES = [
        ('blocks',     'Blocks'),
        ('blocked_by', 'Is Blocked By'),
        ('relates_to', 'Relates To'),
        ('duplicates', 'Duplicates'),
        ('cloned_by',  'Is Cloned By'),
    ]

    source_ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='outbound_links',
    )
    target_ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='inbound_links',
    )
    relationship  = models.CharField(
        max_length=20,
        choices=RELATIONSHIP_CHOICES,
        default='relates_to',
    )
    created_by    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ticket_links',
    )
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'ticket_links'
        unique_together = ('source_ticket', 'target_ticket', 'relationship')
        indexes = [
            models.Index(fields=['source_ticket']),
            models.Index(fields=['target_ticket']),
        ]

    def __str__(self):
        return f'{self.source_ticket.key} {self.relationship} {self.target_ticket.key}'


class Label(models.Model):
    name       = models.CharField(max_length=50, unique=True)
    colour_hex = models.CharField(max_length=7, default='#0052CC')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_labels',
    )
    is_active  = models.BooleanField(default=True)
    # M2M — a label can belong to multiple groups
    groups     = models.ManyToManyField(
        Group,
        blank=True,
        related_name='labels',
        db_table='label_groups',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'labels'
        ordering = ['name']

    def __str__(self):
        return self.name


class TicketLabel(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='ticket_labels',
    )
    label  = models.ForeignKey(
        Label,
        on_delete=models.CASCADE,
        related_name='ticket_labels',
    )

    class Meta:
        db_table        = 'ticket_labels'
        unique_together = ('ticket', 'label')