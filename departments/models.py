from django.db import models
from django.conf import settings


class Group(models.Model):
    name           = models.CharField(max_length=200, unique=True)
    prefix         = models.CharField(max_length=10, unique=True)
    email          = models.EmailField(blank=True)
    description    = models.TextField(blank=True)
    icon           = models.CharField(max_length=10, blank=True, default='💬')
    icon_image     = models.ImageField(
        upload_to='group_icons/',
        blank=True,
        null=True,
        help_text='Upload a group icon image (PNG/SVG recommended, max 1MB)',
    )
    order          = models.PositiveIntegerField(default=0, help_text='Display order on home page')
    ticket_counter = models.PositiveIntegerField(default=0)
    is_active      = models.BooleanField(default=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='GroupMembership',
        through_fields=('group', 'user'),
        related_name='helpdesk_groups',
        blank=True,
    )

    class Meta:
        db_table = 'helpdesk_groups'
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['prefix']),
            models.Index(fields=['is_active']),
            models.Index(fields=['name']),
            models.Index(fields=['order']),
        ]

    def __str__(self):
        return f'{self.name} ({self.prefix})'

    def generate_ticket_key(self):
        from django.db import transaction
        with transaction.atomic():
            group = Group.objects.select_for_update().get(pk=self.pk)
            group.ticket_counter += 1
            group.save(update_fields=['ticket_counter'])
            return f'{group.prefix}-{group.ticket_counter:04d}'


class GroupMembership(models.Model):
    user      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='group_memberships',
    )
    group     = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    added_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='memberships_added',
    )

    class Meta:
        db_table        = 'group_memberships'
        unique_together = ('user', 'group')
        indexes = [
            models.Index(fields=['user', 'group']),
        ]

    def __str__(self):
        return f'{self.user} — {self.group.name}'