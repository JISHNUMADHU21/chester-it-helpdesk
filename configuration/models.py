from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Status(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    slug        = models.SlugField(max_length=100, unique=True)
    colour_hex  = models.CharField(max_length=7, default='#DFE1E6')
    text_colour = models.CharField(max_length=7, default='#172B4D')
    description = models.TextField(blank=True)
    order       = models.PositiveIntegerField(default=0)
    is_default  = models.BooleanField(default=False)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table            = 'config_status'
        ordering            = ['order', 'name']
        verbose_name        = 'Status'
        verbose_name_plural = 'Statuses'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_default:
            Status.objects.exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class Priority(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    slug        = models.SlugField(max_length=100, unique=True)
    colour_hex  = models.CharField(max_length=7, default='#DFE1E6')
    icon        = models.CharField(max_length=10, blank=True)
    level       = models.PositiveIntegerField(default=0, help_text='Lower = higher priority')
    is_default  = models.BooleanField(default=False)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table            = 'config_priority'
        ordering            = ['level']
        verbose_name        = 'Priority'
        verbose_name_plural = 'Priorities'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_default:
            Priority.objects.exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class Urgency(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    slug        = models.SlugField(max_length=100, unique=True)
    colour_hex  = models.CharField(max_length=7, default='#DFE1E6')
    text_colour = models.CharField(max_length=7, default='#172B4D')
    border_hex  = models.CharField(max_length=7, default='#DFE1E6')
    description = models.TextField(blank=True)
    order       = models.PositiveIntegerField(default=0)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table            = 'config_urgency'
        ordering            = ['order', 'name']
        verbose_name        = 'Urgency'
        verbose_name_plural = 'Urgencies'

    def __str__(self):
        return self.name


class WorkType(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    slug        = models.SlugField(max_length=100, unique=True)
    icon        = models.CharField(max_length=10, blank=True)
    icon_image  = models.ImageField(
        upload_to='work_type_icons/', blank=True, null=True,
        help_text='Upload an icon image (PNG/SVG recommended, max 1MB)',
    )
    description = models.TextField(blank=True)
    order       = models.PositiveIntegerField(default=0)
    is_default  = models.BooleanField(default=False)
    is_active   = models.BooleanField(default=True)
    groups      = models.ManyToManyField(
        'departments.Group',
        blank=True,
        related_name='work_types',
        db_table='config_work_type_groups',
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table            = 'config_work_type'
        ordering            = ['order', 'name']
        verbose_name        = 'Work Type'
        verbose_name_plural = 'Work Types'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_default:
            WorkType.objects.exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class Announcement(models.Model):
    TAG_CHOICES = [
        ('maintenance', 'Maintenance'),
        ('new_feature', 'New Feature'),
        ('update',      'Update'),
        ('alert',       'Alert'),
        ('info',        'Info'),
    ]

    title        = models.CharField(max_length=200)
    body         = models.TextField()
    tag          = models.CharField(max_length=20, choices=TAG_CHOICES, default='info')

    # ── Group targeting ───────────────────────────────────────────────────────
    groups       = models.ManyToManyField(
        'departments.Group',
        blank=True,
        related_name='announcements',
        db_table='announcement_groups',
        help_text='Leave empty to show to all users. Select groups to target specific members.',
    )

    # ── Scheduling & visibility window ────────────────────────────────────────
    visible_from = models.DateTimeField(
        null=True, blank=True,
        help_text='When to start showing this announcement. Null = show immediately.',
    )
    visible_till = models.DateTimeField(
        null=True, blank=True,
        help_text='When to stop showing this announcement. Null = never expires.',
    )

    is_active    = models.BooleanField(default=True)
    created_by   = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, related_name='announcements',
    )
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table            = 'config_announcement'
        ordering            = ['-created_at']
        verbose_name        = 'Announcement'
        verbose_name_plural = 'Announcements'

    def __str__(self):
        return self.title

    # ── Computed status properties ────────────────────────────────────────────

    @property
    def is_scheduled(self):
        return bool(self.visible_from and self.visible_from > timezone.now())

    @property
    def is_expired(self):
        return bool(self.visible_till and self.visible_till < timezone.now())

    @property
    def is_currently_visible(self):
        if not self.is_active:
            return False
        now = timezone.now()
        if self.visible_from and self.visible_from > now:
            return False
        if self.visible_till and self.visible_till < now:
            return False
        return True

    def is_visible_to_user(self, user):
        if self.created_by_id == user.pk:
            return True
        if not self.is_currently_visible:
            return False
        target_groups = self.groups.values_list('id', flat=True)
        if not target_groups:
            return True
        user_groups = user.helpdesk_groups.values_list('id', flat=True)
        return bool(set(target_groups) & set(user_groups))


class AnnouncementAttachment(models.Model):
    """
    Attachments for an announcement — supports images, PDFs, videos, and
    external links. A single announcement can have multiple attachments
    of mixed types.
    """
    ATTACHMENT_TYPES = [
        ('image', 'Image'),
        ('pdf',   'PDF'),
        ('video', 'Video'),
        ('link',  'Link'),
    ]

    announcement = models.ForeignKey(
        Announcement,
        on_delete=models.CASCADE,
        related_name='attachments',
    )
    attachment_type = models.CharField(max_length=10, choices=ATTACHMENT_TYPES)

    # For image / pdf / video — the uploaded file
    file        = models.FileField(
        upload_to='announcement_attachments/%Y/%m/',
        blank=True, null=True,
    )
    # For link type — the URL
    url         = models.URLField(max_length=500, blank=True)
    # Optional display label (e.g. link text, or original filename)
    label       = models.CharField(max_length=255, blank=True)

    order       = models.PositiveIntegerField(default=0)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'announcement_attachments'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f'{self.get_attachment_type_display()} — {self.label or self.announcement.title}'


class HomePageLayout(models.Model):
    layout     = models.JSONField(
        default=list,
        help_text='Ordered list of 8 group IDs (null = empty slot)',
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='homepage_layouts',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table            = 'config_homepage_layout'
        verbose_name        = 'Home Page Layout'
        verbose_name_plural = 'Home Page Layouts'

    def __str__(self):
        return f'HomePage Layout (updated {self.updated_at})'

    @classmethod
    def get_or_create_default(cls):
        instance = cls.objects.first()
        if not instance:
            from departments.models import Group
            default_groups = list(
                Group.objects.filter(is_active=True)
                .order_by('order', 'name')
                .values_list('id', flat=True)[:8]
            )
            layout   = default_groups + [None] * (8 - len(default_groups))
            instance = cls.objects.create(layout=layout)
        return instance