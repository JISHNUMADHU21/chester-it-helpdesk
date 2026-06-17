from django.contrib import admin
from .models import Ticket, Comment, Attachment, TicketLink, Label, TicketLabel


class CommentInline(admin.TabularInline):
    model           = Comment
    extra           = 0
    readonly_fields = ('author', 'created_at', 'updated_at')
    fields          = ('author', 'body', 'created_at')


class AttachmentInline(admin.TabularInline):
    model           = Attachment
    extra           = 0
    readonly_fields = ('original_name', 'file_size', 'content_type', 'uploaded_by', 'uploaded_at')
    fields          = ('original_name', 'file', 'file_size', 'uploaded_by', 'uploaded_at')


class TicketLabelInline(admin.TabularInline):
    model = TicketLabel
    extra = 1


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display    = (
        'key', 'summary', 'group', 'assigned_group',
        'assigned_user', 'reporter', 'status', 'priority', 'is_locked', 'created_at',
    )
    list_filter     = ('status', 'priority', 'urgency', 'work_type', 'is_locked', 'group', 'assigned_group')
    search_fields   = ('key', 'summary', 'reporter__email', 'assigned_user__email')
    readonly_fields = ('key', 'group', 'reporter', 'created_at', 'updated_at')
    inlines         = [TicketLabelInline, CommentInline, AttachmentInline]
    fieldsets = (
        ('Identity', {
            'fields': ('key', 'group', 'summary', 'description', 'work_type', 'components', 'due_date')
        }),
        ('Assignment', {
            'fields': ('assigned_group', 'assigned_user', 'reporter', 'is_locked')
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority', 'urgency')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display    = ('ticket', 'author', 'created_at')
    list_filter     = ('ticket__group',)
    search_fields   = ('ticket__key', 'author__email', 'body')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display    = ('original_name', 'ticket', 'uploaded_by', 'file_size', 'uploaded_at')
    search_fields   = ('original_name', 'ticket__key')
    readonly_fields = ('uploaded_at',)


@admin.register(TicketLink)
class TicketLinkAdmin(admin.ModelAdmin):
    list_display    = ('source_ticket', 'relationship', 'target_ticket', 'created_by', 'created_at')
    search_fields   = ('source_ticket__key', 'target_ticket__key')
    readonly_fields = ('created_at',)


@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
    list_display    = ('name', 'colour_hex', 'created_by', 'is_active', 'created_at')
    list_filter     = ('is_active', 'groups')
    search_fields   = ('name',)
    filter_horizontal = ['groups']
    readonly_fields = ('created_at',)