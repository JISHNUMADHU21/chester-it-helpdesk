from django.contrib import admin
from .models import Group, GroupMembership


class GroupMembershipInline(admin.TabularInline):
    model           = GroupMembership
    extra           = 1
    fields          = ('user', 'added_by', 'joined_at')
    readonly_fields = ('joined_at',)


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display    = ('order', 'name', 'prefix', 'email', 'ticket_counter', 'is_active', 'created_at')
    list_display_links = ('name',)
    list_filter     = ('is_active',)
    search_fields   = ('name', 'prefix', 'email')
    ordering        = ('order', 'name')
    readonly_fields = ('ticket_counter', 'created_at', 'updated_at')
    inlines         = [GroupMembershipInline]
    fieldsets = (
        ('Group Details', {
            'fields': ('name', 'prefix', 'email', 'description', 'icon', 'order', 'is_active')
        }),
        ('Stats', {
            'fields': ('ticket_counter', 'created_at', 'updated_at')
        }),
    )


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display    = ('user', 'group', 'added_by', 'joined_at')
    list_filter     = ('group',)
    search_fields   = ('user__email', 'user__first_name', 'group__name')
    readonly_fields = ('joined_at',)