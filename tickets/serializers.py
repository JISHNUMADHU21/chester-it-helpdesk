from rest_framework import serializers
from .models import Ticket, Comment, Attachment, TicketLink, Label, TicketLabel
from accounts.serializers import UserMinimalSerializer
from departments.serializers import GroupMinimalSerializer


class LabelGroupSerializer(serializers.ModelSerializer):
    class Meta:
        from departments.models import Group
        model  = Group
        fields = ('id', 'name', 'icon', 'prefix')


class LabelSerializer(serializers.ModelSerializer):
    created_by = UserMinimalSerializer(read_only=True)
    groups     = LabelGroupSerializer(many=True, read_only=True)

    class Meta:
        model  = Label
        fields = ('id', 'name', 'colour_hex', 'created_by', 'is_active', 'groups', 'created_at')
        read_only_fields = ('id', 'created_by', 'created_at')


class LabelCreateUpdateSerializer(serializers.ModelSerializer):
    group_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )

    class Meta:
        model  = Label
        fields = ('name', 'colour_hex', 'is_active', 'group_ids')

    def create(self, validated_data):
        group_ids = validated_data.pop('group_ids', [])
        instance  = super().create(validated_data)
        if group_ids:
            from departments.models import Group
            instance.groups.set(Group.objects.filter(id__in=group_ids))
        return instance

    def update(self, instance, validated_data):
        group_ids = validated_data.pop('group_ids', None)
        instance  = super().update(instance, validated_data)
        if group_ids is not None:
            from departments.models import Group
            instance.groups.set(Group.objects.filter(id__in=group_ids))
        return instance


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserMinimalSerializer(read_only=True)

    class Meta:
        model  = Attachment
        fields = ('id', 'file', 'original_name', 'file_size', 'content_type', 'uploaded_by', 'uploaded_at')
        read_only_fields = ('id', 'original_name', 'file_size', 'content_type', 'uploaded_by', 'uploaded_at')

    def validate_file(self, value):
        max_size = 5 * 1024 * 1024  # 5MB
        if value.size > max_size:
            raise serializers.ValidationError('File size must not exceed 5MB.')
        return value

    def create(self, validated_data):
        validated_data['original_name'] = validated_data['file'].name
        validated_data['file_size']     = validated_data['file'].size
        validated_data['content_type']  = validated_data['file'].content_type
        validated_data['uploaded_by']   = self.context['request'].user
        return super().create(validated_data)


class CommentSerializer(serializers.ModelSerializer):
    author   = UserMinimalSerializer(read_only=True)
    mentions = UserMinimalSerializer(many=True, read_only=True)

    class Meta:
        model  = Comment
        fields = ('id', 'ticket', 'author', 'body', 'mentions', 'created_at', 'updated_at')
        read_only_fields = ('id', 'ticket', 'author', 'mentions', 'created_at', 'updated_at')


class CommentCreateSerializer(serializers.ModelSerializer):
    mention_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )

    class Meta:
        model  = Comment
        fields = ('body', 'mention_ids')

    def create(self, validated_data):
        mention_ids = validated_data.pop('mention_ids', [])
        comment     = Comment.objects.create(**validated_data)
        if mention_ids:
            from django.contrib.auth import get_user_model
            User    = get_user_model()
            users   = User.objects.filter(pk__in=mention_ids, is_active=True)
            comment.mentions.set(users)
        return comment


class TicketLinkSerializer(serializers.ModelSerializer):
    source_ticket = serializers.StringRelatedField()
    target_ticket = serializers.StringRelatedField()
    created_by    = UserMinimalSerializer(read_only=True)

    class Meta:
        model  = TicketLink
        fields = ('id', 'source_ticket', 'target_ticket', 'relationship', 'created_by', 'created_at')
        read_only_fields = ('id', 'created_by', 'created_at')


class TicketLinkCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TicketLink
        fields = ('target_ticket', 'relationship')


class TicketListSerializer(serializers.ModelSerializer):
    reporter       = UserMinimalSerializer(read_only=True)
    assigned_user  = UserMinimalSerializer(read_only=True)
    assigned_group = GroupMinimalSerializer(read_only=True)
    group          = GroupMinimalSerializer(read_only=True)
    labels         = serializers.SerializerMethodField()

    class Meta:
        model  = Ticket
        fields = (
            'id', 'key', 'summary', 'status', 'priority', 'urgency',
            'work_type', 'group', 'assigned_group', 'assigned_user',
            'reporter', 'labels', 'is_locked', 'created_at', 'updated_at', 'due_date',
        )
        read_only_fields = fields

    def get_labels(self, obj):
        return LabelSerializer(
            [tl.label for tl in obj.ticket_labels.select_related('label').all()],
            many=True,
        ).data


class TicketDetailSerializer(serializers.ModelSerializer):
    reporter       = UserMinimalSerializer(read_only=True)
    assigned_user  = UserMinimalSerializer(read_only=True)
    assigned_group = GroupMinimalSerializer(read_only=True)
    group          = GroupMinimalSerializer(read_only=True)
    comments       = CommentSerializer(many=True, read_only=True)
    attachments    = AttachmentSerializer(many=True, read_only=True)
    labels         = serializers.SerializerMethodField()
    outbound_links = TicketLinkSerializer(many=True, read_only=True)
    inbound_links  = TicketLinkSerializer(many=True, read_only=True)

    class Meta:
        model  = Ticket
        fields = (
            'id', 'key', 'summary', 'description', 'status', 'priority',
            'urgency', 'work_type', 'components', 'due_date',
            'group', 'assigned_group', 'assigned_user', 'reporter',
            'labels', 'is_locked', 'created_at', 'updated_at',
            'comments', 'attachments', 'outbound_links', 'inbound_links',
        )
        read_only_fields = (
            'id', 'key', 'group', 'reporter',
            'is_locked', 'created_at', 'updated_at',
        )

    def get_labels(self, obj):
        return LabelSerializer(
            [tl.label for tl in obj.ticket_labels.select_related('label').all()],
            many=True,
        ).data


class TicketCreateSerializer(serializers.ModelSerializer):
    assigned_group_id = serializers.IntegerField(write_only=True)
    assigned_user_id  = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    label_ids         = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )

    class Meta:
        model  = Ticket
        fields = (
            'summary', 'description', 'work_type', 'components',
            'due_date', 'priority', 'urgency',
            'assigned_group_id', 'assigned_user_id', 'label_ids',
        )

    def validate_label_ids(self, value):
        # Enforced here on the backend as the source of truth — the
        # frontend also disables further selection past 3, but that is a
        # UX convenience only and must never be relied upon alone.
        if len(value) > 3:
            raise serializers.ValidationError('You can select a maximum of 3 labels per ticket.')
        return value

    def validate(self, data):
        from departments.models import Group as HelpGroup
        from django.contrib.auth import get_user_model
        User = get_user_model()

        group_id = data.get('assigned_group_id')
        try:
            group = HelpGroup.objects.get(pk=group_id, is_active=True)
        except HelpGroup.DoesNotExist:
            raise serializers.ValidationError({'assigned_group_id': 'Group not found or inactive.'})
        data['assigned_group'] = group

        user_id = data.get('assigned_user_id')
        if user_id:
            try:
                assigned_user = User.objects.get(pk=user_id, is_active=True)
            except User.DoesNotExist:
                raise serializers.ValidationError({'assigned_user_id': 'User not found or inactive.'})
            data['assigned_user'] = assigned_user
        else:
            data['assigned_user'] = None

        return data

    def create(self, validated_data):
        assigned_group = validated_data.pop('assigned_group')
        assigned_user  = validated_data.pop('assigned_user', None)
        label_ids      = validated_data.pop('label_ids', [])
        validated_data.pop('assigned_group_id', None)
        validated_data.pop('assigned_user_id', None)

        reporter = self.context['request'].user
        key      = assigned_group.generate_ticket_key()

        ticket = Ticket.objects.create(
            key            = key,
            group          = assigned_group,
            assigned_group = assigned_group,
            assigned_user  = assigned_user,
            reporter       = reporter,
            is_locked      = assigned_user is not None,
            **validated_data,
        )

        if label_ids:
            labels = Label.objects.filter(pk__in=label_ids, is_active=True)
            for label in labels:
                TicketLabel.objects.create(ticket=ticket, label=label)

        return ticket


class TicketUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Ticket
        fields = (
            'summary', 'description', 'work_type', 'components',
            'due_date', 'priority', 'urgency', 'status',
        )


class TicketAssignSerializer(serializers.Serializer):
    assigned_group_id = serializers.IntegerField()
    assigned_user_id  = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        from departments.models import Group as HelpGroup
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            group = HelpGroup.objects.get(pk=data['assigned_group_id'], is_active=True)
        except HelpGroup.DoesNotExist:
            raise serializers.ValidationError({'assigned_group_id': 'Group not found or inactive.'})
        data['assigned_group'] = group

        user_id = data.get('assigned_user_id')
        if user_id:
            try:
                user = User.objects.get(pk=user_id, is_active=True)
            except User.DoesNotExist:
                raise serializers.ValidationError({'assigned_user_id': 'User not found or inactive.'})
            data['assigned_user'] = user
        else:
            data['assigned_user'] = None

        return data


class TicketStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Ticket.STATUS_CHOICES)