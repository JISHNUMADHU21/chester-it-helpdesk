from django.contrib import admin
from .models import Status, Priority, Urgency, WorkType, Announcement, HomePageLayout


@admin.register(Status)
class StatusAdmin(admin.ModelAdmin):
    list_display        = ['name', 'slug', 'colour_hex', 'order', 'is_default', 'is_active']
    list_editable       = ['order', 'is_default', 'is_active']
    prepopulated_fields = {'slug': ('name',)}
    ordering            = ['order', 'name']


@admin.register(Priority)
class PriorityAdmin(admin.ModelAdmin):
    list_display        = ['name', 'slug', 'colour_hex', 'icon', 'level', 'is_default', 'is_active']
    list_editable       = ['level', 'is_default', 'is_active']
    prepopulated_fields = {'slug': ('name',)}
    ordering            = ['level']


@admin.register(Urgency)
class UrgencyAdmin(admin.ModelAdmin):
    list_display        = ['name', 'slug', 'colour_hex', 'order', 'is_active']
    list_editable       = ['order', 'is_active']
    prepopulated_fields = {'slug': ('name',)}
    ordering            = ['order', 'name']


@admin.register(WorkType)
class WorkTypeAdmin(admin.ModelAdmin):
    list_display        = ['name', 'slug', 'icon', 'order', 'is_default', 'is_active']
    list_editable       = ['order', 'is_default', 'is_active']
    prepopulated_fields = {'slug': ('name',)}
    filter_horizontal   = ['groups']
    ordering            = ['order', 'name']


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display  = ['title', 'tag', 'is_active', 'created_by', 'created_at']
    list_editable = ['is_active']
    list_filter   = ['tag', 'is_active']
    ordering      = ['-created_at']


@admin.register(HomePageLayout)
class HomePageLayoutAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'updated_by', 'updated_at']
    readonly_fields = ['updated_at', 'updated_by']

    def has_add_permission(self, request):
        # Only one record allowed — prevent creating more via admin
        return not HomePageLayout.objects.exists()