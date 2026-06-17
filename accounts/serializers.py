from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info — used inside tickets, comments, notifications."""
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model  = User
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name', 'avatar', 'role', 'designation')
        read_only_fields = fields


class GroupMinimalInUserSerializer(serializers.Serializer):
    """Minimal group info nested inside UserSerializer."""
    id   = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    icon = serializers.CharField(read_only=True)
    prefix = serializers.CharField(read_only=True)


class UserSerializer(serializers.ModelSerializer):
    """Full user profile — used for profile page and user management."""
    full_name = serializers.CharField(read_only=True)
    groups    = GroupMinimalInUserSerializer(
        source='helpdesk_groups', many=True, read_only=True,
    )

    class Meta:
        model  = User
        fields = (
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'designation', 'avatar', 'is_active',
            'date_joined', 'updated_at', 'groups',
        )
        read_only_fields = ('id', 'email', 'role', 'date_joined', 'updated_at', 'groups')


class UserCreateSerializer(serializers.ModelSerializer):
    """Used by admins to create new user accounts."""
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    group_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False, default=list,
    )

    class Meta:
        model  = User
        fields = (
            'id', 'email', 'first_name', 'last_name',
            'role', 'designation', 'password', 'group_ids',
        )

    def create(self, validated_data):
        group_ids = validated_data.pop('group_ids', [])
        password  = validated_data.pop('password')
        user      = User(**validated_data)
        user.set_password(password)
        user.save()

        # Assign to departments
        if group_ids:
            from departments.models import Group, GroupMembership
            for gid in group_ids:
                try:
                    group = Group.objects.get(pk=gid, is_active=True)
                    GroupMembership.objects.get_or_create(
                        user=user, group=group,
                        defaults={'added_by': self.context['request'].user},
                    )
                except Group.DoesNotExist:
                    pass

        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Used by admins to update user details."""
    group_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False,
    )

    class Meta:
        model  = User
        fields = ('first_name', 'last_name', 'designation', 'role', 'is_active', 'group_ids')

    def update(self, instance, validated_data):
        group_ids = validated_data.pop('group_ids', None)
        instance  = super().update(instance, validated_data)

        # Update group memberships if provided
        if group_ids is not None:
            from departments.models import Group, GroupMembership
            # Remove all existing memberships
            GroupMembership.objects.filter(user=instance).delete()
            # Add new ones
            for gid in group_ids:
                try:
                    group = Group.objects.get(pk=gid, is_active=True)
                    GroupMembership.objects.get_or_create(
                        user=instance, group=group,
                        defaults={'added_by': self.context['request'].user},
                    )
                except Group.DoesNotExist:
                    pass

        return instance


class AvatarUpdateSerializer(serializers.ModelSerializer):
    """Used by the user themselves to update their avatar."""

    class Meta:
        model  = User
        fields = ('avatar',)

    def validate_avatar(self, value):
        max_size = 5 * 1024 * 1024  # 5MB
        if value.size > max_size:
            raise serializers.ValidationError('Avatar file size must not exceed 5MB.')
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError('Only JPEG, PNG, GIF and WebP images are allowed.')
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """Used by the user to change their own password."""
    current_password = serializers.CharField(write_only=True)
    new_password     = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return data

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


class LoginSerializer(serializers.Serializer):
    """Used for the login endpoint."""
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)