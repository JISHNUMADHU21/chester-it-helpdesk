from rest_framework import serializers
from .models import Status, Priority, Urgency, WorkType, Announcement, HomePageLayout
from departments.models import Group


# ── STATUS ────────────────────────────────────────────────────────────────────

class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Status
        fields = [
            'id', 'name', 'slug', 'colour_hex', 'text_colour',
            'description', 'order', 'is_default', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StatusCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Status
        fields = [
            'name', 'slug', 'colour_hex', 'text_colour',
            'description', 'order', 'is_default', 'is_active',
        ]

    def validate_slug(self, value):
        qs = Status.objects.filter(slug=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A status with this slug already exists.')
        return value


# ── PRIORITY ──────────────────────────────────────────────────────────────────

class PrioritySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Priority
        fields = [
            'id', 'name', 'slug', 'colour_hex', 'icon',
            'level', 'is_default', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PriorityCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Priority
        fields = [
            'name', 'slug', 'colour_hex', 'icon',
            'level', 'is_default', 'is_active',
        ]

    def validate_slug(self, value):
        qs = Priority.objects.filter(slug=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A priority with this slug already exists.')
        return value


# ── URGENCY ───────────────────────────────────────────────────────────────────

class UrgencySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Urgency
        fields = [
            'id', 'name', 'slug', 'colour_hex', 'text_colour',
            'border_hex', 'description', 'order', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UrgencyCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Urgency
        fields = [
            'name', 'slug', 'colour_hex', 'text_colour',
            'border_hex', 'description', 'order', 'is_active',
        ]

    def validate_slug(self, value):
        qs = Urgency.objects.filter(slug=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('An urgency with this slug already exists.')
        return value


# ── WORK TYPE ─────────────────────────────────────────────────────────────────

class WorkTypeGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Group
        fields = ['id', 'name', 'icon', 'prefix']


class WorkTypeSerializer(serializers.ModelSerializer):
    groups     = WorkTypeGroupSerializer(many=True, read_only=True)
    icon_image = serializers.SerializerMethodField()

    class Meta:
        model  = WorkType
        fields = [
            'id', 'name', 'slug', 'icon', 'icon_image', 'description',
            'order', 'is_default', 'is_active', 'groups',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_icon_image(self, obj):
        if obj.icon_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.icon_image.url)
            return obj.icon_image.url
        return None


class WorkTypeCreateUpdateSerializer(serializers.ModelSerializer):
    group_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )

    class Meta:
        model  = WorkType
        fields = [
            'name', 'slug', 'icon', 'icon_image', 'description',
            'order', 'is_default', 'is_active', 'group_ids',
        ]

    def validate_slug(self, value):
        qs = WorkType.objects.filter(slug=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A work type with this slug already exists.')
        return value

    def create(self, validated_data):
        group_ids = validated_data.pop('group_ids', [])
        instance  = super().create(validated_data)
        if group_ids:
            instance.groups.set(Group.objects.filter(id__in=group_ids))
        return instance

    def update(self, instance, validated_data):
        group_ids = validated_data.pop('group_ids', None)
        instance  = super().update(instance, validated_data)
        if group_ids is not None:
            instance.groups.set(Group.objects.filter(id__in=group_ids))
        return instance


# ── ANNOUNCEMENT ──────────────────────────────────────────────────────────────

class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    tag_display     = serializers.SerializerMethodField()

    class Meta:
        model  = Announcement
        fields = [
            'id', 'title', 'body', 'tag', 'tag_display',
            'is_active', 'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else None

    def get_tag_display(self, obj):
        return obj.get_tag_display()


class AnnouncementCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Announcement
        fields = ['title', 'body', 'tag', 'is_active']


# ── HOME PAGE LAYOUT ──────────────────────────────────────────────────────────

class HomePageGroupSerializer(serializers.ModelSerializer):
    """Minimal group info for homepage tiles."""
    icon_image_url = serializers.SerializerMethodField()

    class Meta:
        model  = Group
        fields = ['id', 'name', 'icon', 'icon_image_url', 'prefix', 'description']

    def get_icon_image_url(self, obj):
        if hasattr(obj, 'icon_image') and obj.icon_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.icon_image.url)
            return obj.icon_image.url
        return None


class HomePageLayoutSerializer(serializers.ModelSerializer):
    """
    Returns the layout as an array of 8 items.
    Each item is either a full group object or null (empty slot).
    """
    tiles      = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = HomePageLayout
        fields = ['id', 'layout', 'tiles', 'updated_by_name', 'updated_at']
        read_only_fields = ['id', 'updated_at']

    def get_tiles(self, obj):
        """
        Resolve each group ID in layout to full group data.
        Null slots remain null.
        """
        request = self.context.get('request')
        result  = []
        for item in obj.layout:
            if item is None:
                result.append(None)
            else:
                try:
                    group = Group.objects.get(pk=item, is_active=True)
                    result.append(HomePageGroupSerializer(
                        group, context={'request': request}
                    ).data)
                except Group.DoesNotExist:
                    result.append(None)
        return result

    def get_updated_by_name(self, obj):
        return obj.updated_by.full_name if obj.updated_by else None


class HomePageLayoutUpdateSerializer(serializers.Serializer):
    """
    Accepts layout as a list of 8 items — each is a group ID (int) or null.
    """
    layout = serializers.ListField(
        child=serializers.IntegerField(allow_null=True, min_value=1),
        min_length=8,
        max_length=8,
    )

    def validate_layout(self, value):
        # Check no duplicate group IDs (nulls are allowed multiple times)
        non_null = [v for v in value if v is not None]
        if len(non_null) != len(set(non_null)):
            raise serializers.ValidationError(
                'Duplicate group IDs are not allowed in the layout.'
            )
        # Check all non-null IDs are valid active groups
        valid_ids = set(
            Group.objects.filter(
                id__in=non_null, is_active=True
            ).values_list('id', flat=True)
        )
        invalid = [v for v in non_null if v not in valid_ids]
        if invalid:
            raise serializers.ValidationError(
                f'Invalid or inactive group IDs: {invalid}'
            )
        return value