from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display    = ('recipient', 'type', 'ticket', 'read', 'created_at')
    list_filter     = ('type', 'read')
    search_fields   = ('recipient__email', 'ticket__key', 'message')
    readonly_fields = ('created_at',)
    actions         = ['mark_as_read']

    def mark_as_read(self, request, queryset):
        queryset.update(read=True)
        self.message_user(request, f'{queryset.count()} notification(s) marked as read.')
    mark_as_read.short_description = 'Mark selected notifications as read'