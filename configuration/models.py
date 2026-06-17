from django.db import models
from django.contrib.auth import get_user_model

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
    # M2M — a work type can belong to multiple groups
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

    title      = models.CharField(max_length=200)
    body       = models.TextField()
    tag        = models.CharField(max_length=20, choices=TAG_CHOICES, default='info')
    is_active  = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, related_name='announcements',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table            = 'config_announcement'
        ordering            = ['-created_at']
        verbose_name        = 'Announcement'
        verbose_name_plural = 'Announcements'

    def __str__(self):
        return self.title


class HomePageLayout(models.Model):
    """
    Stores the homepage tile layout as an ordered list of group IDs.
    Always a single record — use HomePageLayout.get_or_create_default().
    8 slots total, some may be null (empty).
    """
    # JSON array of 8 items — each is a group ID (int) or null
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
        """
        Returns the single HomePageLayout record, creating it with
        the default 8-group layout if it doesn't exist yet.
        """
        instance = cls.objects.first()
        if not instance:
            from departments.models import Group
            # Default: first 8 active groups by order
            default_groups = list(
                Group.objects.filter(is_active=True)
                .order_by('order', 'name')
                .values_list('id', flat=True)[:8]
            )
            # Pad to 8 slots with None
            layout = default_groups + [None] * (8 - len(default_groups))
            instance = cls.objects.create(layout=layout)
        return instance