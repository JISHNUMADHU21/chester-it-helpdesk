from rest_framework import serializers
from .models import Notification
from accounts.serializers import UserMinimalSerializer


class NotificationSerializer(serializers.ModelSerializer):
    """Full notification detail."""
    recipient = UserMinimalSerializer(read_only=True)
    ticket_key = serializers.SerializerMethodField()
    ticket_summary = serializers.SerializerMethodField()

    class Meta:
        model  = Notification
        fields = (
            'id', 'recipient', 'type', 'message',
            'ticket', 'ticket_key', 'ticket_summary',
            'read', 'created_at',
        )
        read_only_fields = fields

    def get_ticket_key(self, obj):
        return obj.ticket.key if obj.ticket else None

    def get_ticket_summary(self, obj):
        return obj.ticket.summary if obj.ticket else None


class NotificationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for notification list and bell count."""
    ticket_key = serializers.SerializerMethodField()

    class Meta:
        model  = Notification
        fields = ('id', 'type', 'message', 'ticket', 'ticket_key', 'read', 'created_at')
        read_only_fields = fields

    def get_ticket_key(self, obj):
        return obj.ticket.key if obj.ticket else None