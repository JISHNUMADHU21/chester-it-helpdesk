from rest_framework import serializers
from .models import Group, GroupMembership
from accounts.serializers import UserMinimalSerializer


class GroupMinimalSerializer(serializers.ModelSerializer):
    """Minimal group info — used inside tickets and dropdowns."""
    icon_image_url = serializers.SerializerMethodField()

    class Meta:
        model  = Group
        fields = ('id', 'name', 'prefix', 'email', 'icon', 'icon_image_url', 'order')
        read_only_fields = fields

    def get_icon_image_url(self, obj):
        if obj.icon_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.icon_image.url)
            return obj.icon_image.url
        return None


class GroupSerializer(serializers.ModelSerializer):
    """Full group detail — used in group management pages."""
    member_count   = serializers.SerializerMethodField()
    icon_image_url = serializers.SerializerMethodField()

    class Meta:
        model  = Group
        fields = (
            'id', 'name', 'prefix', 'email', 'description',
            'icon', 'icon_image', 'icon_image_url',
            'order', 'ticket_counter', 'is_active',
            'member_count', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'ticket_counter', 'created_at', 'updated_at')

    def get_member_count(self, obj):
        return obj.members.count()

    def get_icon_image_url(self, obj):
        if obj.icon_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.icon_image.url)
            return obj.icon_image.url
        return None


class GroupCreateUpdateSerializer(serializers.ModelSerializer):
    """Used by admins to create or update groups."""

    class Meta:
        model  = Group
        fields = ('name', 'prefix', 'email', 'description', 'icon', 'icon_image', 'is_active')

    def validate_prefix(self, value):
        value = value.upper().strip()
        qs    = Group.objects.filter(prefix=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f'A group with prefix "{value}" already exists.')
        return value

    def validate_icon_image(self, value):
        if value:
            max_size = 1 * 1024 * 1024  # 1MB
            if hasattr(value, 'size') and value.size > max_size:
                raise serializers.ValidationError('Icon image must be under 1MB.')
            allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
            if hasattr(value, 'content_type') and value.content_type not in allowed:
                raise serializers.ValidationError('Only PNG, JPG, SVG or WebP images are allowed.')
        return value


class GroupMembershipSerializer(serializers.ModelSerializer):
    """Shows membership details including user info."""
    user     = UserMinimalSerializer(read_only=True)
    added_by = UserMinimalSerializer(read_only=True)

    class Meta:
        model  = GroupMembership
        fields = ('id', 'user', 'group', 'added_by', 'joined_at')
        read_only_fields = ('id', 'joined_at')


class AddMemberSerializer(serializers.Serializer):
    """Used to add a user to a group."""
    user_id = serializers.IntegerField()

    def validate_user_id(self, value):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if not User.objects.filter(pk=value, is_active=True).exists():
            raise serializers.ValidationError('User not found or inactive.')
        return value


class AssigneeSearchSerializer(serializers.Serializer):
    """
    Used by the assignee search dropdown on the Raise a Request form.
    Returns a combined list of groups and users matching the search query.
    """
    id          = serializers.IntegerField()
    type        = serializers.CharField()
    name        = serializers.CharField()
    email       = serializers.EmailField()
    icon        = serializers.CharField(required=False)
    avatar      = serializers.ImageField(required=False)
    prefix      = serializers.CharField(required=False)
    designation = serializers.CharField(required=False)
    groups      = GroupMinimalSerializer(many=True, required=False)