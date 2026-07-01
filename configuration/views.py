from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Status, Priority, Urgency, WorkType, Component, Announcement, AnnouncementAttachment, HomePageLayout
from .serializers import (
    StatusSerializer, StatusCreateUpdateSerializer,
    PrioritySerializer, PriorityCreateUpdateSerializer,
    UrgencySerializer, UrgencyCreateUpdateSerializer,
    WorkTypeSerializer, WorkTypeCreateUpdateSerializer,
    ComponentSerializer, ComponentCreateUpdateSerializer,
    AnnouncementSerializer, AnnouncementCreateUpdateSerializer,
    AnnouncementAttachmentSerializer,
    HomePageLayoutSerializer, HomePageLayoutUpdateSerializer,
)


# ── PERMISSIONS ───────────────────────────────────────────────────────────────

class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               request.user.role in ('admin', 'superadmin')


class IsManagerOrAbove(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               request.user.role in ('manager', 'admin', 'superadmin')


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               request.user.role == 'superadmin'


# ── GENERIC CRUD BASE ─────────────────────────────────────────────────────────
#
# NOTE on delete semantics: Delete is now a HARD delete across all config
# types (Status, Priority, Urgency, WorkType, Component) — the row is
# permanently removed and will no longer appear anywhere in the admin UI.
# "Inactive" is a SEPARATE, deliberate state set only via Edit -> Status,
# which keeps the record visible in admin list views (so it can be
# reactivated later) but excludes it from any user-facing selection list
# (e.g. the Create Ticket dropdowns), which filter on is_active=True.

class ConfigListCreateView(generics.ListCreateAPIView):
    permission_class_write = IsAdminOrSuperAdmin

    def get_permissions(self):
        if self.request.method == 'POST':
            return [self.permission_class_write()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return self.serializer_class_write
        return self.serializer_class_read

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save()


class ConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_class_write = IsAdminOrSuperAdmin

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [self.permission_class_write()]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return self.serializer_class_write
        return self.serializer_class_read

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_destroy(self, instance):
        instance.delete()


# ── STATUS ────────────────────────────────────────────────────────────────────

class StatusListCreateView(ConfigListCreateView):
    queryset               = Status.objects.all().order_by('order', 'name')
    serializer_class_read  = StatusSerializer
    serializer_class_write = StatusCreateUpdateSerializer


class StatusDetailView(ConfigDetailView):
    queryset               = Status.objects.all()
    serializer_class_read  = StatusSerializer
    serializer_class_write = StatusCreateUpdateSerializer


# ── PRIORITY ──────────────────────────────────────────────────────────────────

class PriorityListCreateView(ConfigListCreateView):
    queryset               = Priority.objects.all().order_by('level')
    serializer_class_read  = PrioritySerializer
    serializer_class_write = PriorityCreateUpdateSerializer

    def get_queryset(self):
        qs = Priority.objects.all().order_by('level')
        active_only = self.request.query_params.get('active_only')

        # Used by user-facing selection lists (e.g. Create Ticket dropdown)
        # to exclude anything the admin has marked inactive via Edit, while
        # the plain admin list view (no active_only param) still shows
        # inactive records so they can be reactivated later.
        if active_only:
            qs = qs.filter(is_active=True)

        return qs


class PriorityDetailView(ConfigDetailView):
    queryset               = Priority.objects.all()
    serializer_class_read  = PrioritySerializer
    serializer_class_write = PriorityCreateUpdateSerializer


# ── URGENCY ───────────────────────────────────────────────────────────────────

class UrgencyListCreateView(ConfigListCreateView):
    queryset               = Urgency.objects.all().order_by('order', 'name')
    serializer_class_read  = UrgencySerializer
    serializer_class_write = UrgencyCreateUpdateSerializer

    def get_queryset(self):
        qs = Urgency.objects.all().order_by('order', 'name')
        active_only = self.request.query_params.get('active_only')

        # Used by user-facing selection lists (e.g. Create Ticket dropdown)
        # to exclude anything the admin has marked inactive via Edit, while
        # the plain admin list view (no active_only param) still shows
        # inactive records so they can be reactivated later.
        if active_only:
            qs = qs.filter(is_active=True)

        return qs


class UrgencyDetailView(ConfigDetailView):
    queryset               = Urgency.objects.all()
    serializer_class_read  = UrgencySerializer
    serializer_class_write = UrgencyCreateUpdateSerializer


# ── WORK TYPE ─────────────────────────────────────────────────────────────────

class WorkTypeListCreateView(ConfigListCreateView):
    queryset               = WorkType.objects.prefetch_related('groups').all().order_by('order', 'name')
    serializer_class_read  = WorkTypeSerializer
    serializer_class_write = WorkTypeCreateUpdateSerializer
    permission_class_write = IsManagerOrAbove
    parser_classes         = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs       = WorkType.objects.prefetch_related('groups').all().order_by('order', 'name')
        group_id = self.request.query_params.get('group')
        active_only = self.request.query_params.get('active_only')

        if group_id:
            # "All Groups" work types (empty groups M2M) apply everywhere,
            # so they must be included alongside any work type explicitly
            # assigned to this specific group — same convention already
            # used correctly for Announcements visibility.
            qs = qs.filter(
                Q(groups__isnull=True) | Q(groups__id=group_id)
            ).distinct()

        # Used by user-facing selection lists (e.g. Create Ticket dropdown)
        # to exclude anything the admin has marked inactive via Edit, while
        # the plain admin list view (no active_only param) still shows
        # inactive records so they can be reactivated later.
        if active_only:
            qs = qs.filter(is_active=True)

        return qs


class WorkTypeDetailView(ConfigDetailView):
    queryset               = WorkType.objects.prefetch_related('groups').all()
    serializer_class_read  = WorkTypeSerializer
    serializer_class_write = WorkTypeCreateUpdateSerializer
    permission_class_write = IsManagerOrAbove
    parser_classes         = [MultiPartParser, FormParser, JSONParser]


# ── COMPONENT ─────────────────────────────────────────────────────────────────
#
# Superadmin/admin: full access to all components, any group(s), including
# "All Groups" (empty group_ids).
# Manager: can only create/edit/delete components scoped to group(s) they
# are themselves a member of. They cannot assign "All Groups" (empty
# group_ids), and cannot touch a component that includes any group outside
# their own membership. Enforced here on the backend, not just hidden in
# the UI.

class ComponentListCreateView(generics.ListCreateAPIView):
    serializer_class_read  = ComponentSerializer
    serializer_class_write = ComponentCreateUpdateSerializer
    parser_classes          = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrAbove()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return self.serializer_class_write
        return self.serializer_class_read

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        qs       = Component.objects.prefetch_related('groups').all().order_by('order', 'name')
        group_id = self.request.query_params.get('group')
        active_only = self.request.query_params.get('active_only')

        if group_id:
            # Same "All Groups" convention as WorkType/Announcements —
            # an empty groups M2M means the component applies everywhere.
            qs = qs.filter(
                Q(groups__isnull=True) | Q(groups__id=group_id)
            ).distinct()

        # Used by user-facing selection lists (e.g. Create Ticket dropdown)
        # to exclude anything the admin has marked inactive via Edit.
        if active_only:
            qs = qs.filter(is_active=True)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'manager':
            group_ids = serializer.validated_data.get('group_ids', [])
            my_group_ids = set(user.helpdesk_groups.values_list('id', flat=True))

            if not group_ids:
                raise PermissionDenied(
                    'Managers must assign a component to at least one of their own groups; '
                    '"All Groups" is reserved for admins and superadmins.'
                )
            if not set(group_ids).issubset(my_group_ids):
                raise PermissionDenied(
                    'You can only create components for groups you belong to.'
                )
        serializer.save()


class ComponentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset                = Component.objects.prefetch_related('groups').all()
    serializer_class_read   = ComponentSerializer
    serializer_class_write  = ComponentCreateUpdateSerializer
    parser_classes           = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsManagerOrAbove()]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return self.serializer_class_write
        return self.serializer_class_read

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def _check_manager_owns_component(self, user, instance):
        """
        A manager may only touch a component if EVERY group currently
        assigned to it is one of their own groups, AND the component is
        not an "All Groups" component (empty groups means open to admins
        only to manage).
        """
        if user.role != 'manager':
            return
        my_group_ids = set(user.helpdesk_groups.values_list('id', flat=True))
        component_group_ids = set(instance.groups.values_list('id', flat=True))

        if not component_group_ids:
            raise PermissionDenied(
                'Only admins and superadmins can manage "All Groups" components.'
            )
        if not component_group_ids.issubset(my_group_ids):
            raise PermissionDenied(
                'You can only manage components scoped entirely to your own groups.'
            )

    def perform_update(self, serializer):
        user     = self.request.user
        instance = self.get_object()
        self._check_manager_owns_component(user, instance)

        if user.role == 'manager':
            new_group_ids = serializer.validated_data.get('group_ids', None)
            if new_group_ids is not None:
                my_group_ids = set(user.helpdesk_groups.values_list('id', flat=True))
                if not new_group_ids:
                    raise PermissionDenied(
                        'Managers cannot set a component to "All Groups".'
                    )
                if not set(new_group_ids).issubset(my_group_ids):
                    raise PermissionDenied(
                        'You can only assign components to groups you belong to.'
                    )

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        self._check_manager_owns_component(user, instance)
        instance.delete()


# ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────

class AnnouncementListCreateView(generics.ListCreateAPIView):
    """
    GET  — filtered by user role and group membership + visibility window
    POST — manager+ only
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrAbove()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AnnouncementCreateUpdateSerializer
        return AnnouncementSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        user = self.request.user

        if user.role in ('manager', 'admin', 'superadmin'):
            return Announcement.objects.prefetch_related('groups', 'attachments').all()

        from django.utils import timezone
        now = timezone.now()

        qs = Announcement.objects.prefetch_related('groups', 'attachments').filter(
            is_active=True,
        ).filter(
            Q(visible_from__isnull=True) | Q(visible_from__lte=now)
        ).filter(
            Q(visible_till__isnull=True) | Q(visible_till__gt=now)
        )

        user_group_ids = user.helpdesk_groups.values_list('id', flat=True)
        qs = qs.filter(
            Q(groups__isnull=True) |
            Q(groups__id__in=user_group_ids) |
            Q(created_by=user)
        ).distinct()

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    — authenticated users (respects visibility)
    PATCH  — creator or manager+
    DELETE — creator or manager+
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsManagerOrAbove()]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AnnouncementCreateUpdateSerializer
        return AnnouncementSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        user = self.request.user
        if user.role in ('manager', 'admin', 'superadmin'):
            return Announcement.objects.prefetch_related('groups', 'attachments').all()
        return Announcement.objects.prefetch_related('groups', 'attachments').filter(
            created_by=user
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        user     = self.request.user
        if user.role not in ('manager', 'admin', 'superadmin') and \
           instance.created_by != user:
            raise PermissionDenied('You can only edit your own announcements.')
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()


# ── ANNOUNCEMENT ATTACHMENTS ──────────────────────────────────────────────────

class AnnouncementAttachmentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/config/announcements/{announcement_id}/attachments/
    POST /api/config/announcements/{announcement_id}/attachments/  (manager+)
    """
    serializer_class = AnnouncementAttachmentSerializer
    parser_classes    = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrAbove()]
        return [permissions.IsAuthenticated()]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        return AnnouncementAttachment.objects.filter(
            announcement_id=self.kwargs['announcement_id']
        ).order_by('order', 'created_at')

    def perform_create(self, serializer):
        announcement = Announcement.objects.get(pk=self.kwargs['announcement_id'])
        # Only creator or manager+ can add attachments
        user = self.request.user
        if user.role not in ('manager', 'admin', 'superadmin') and \
           announcement.created_by != user:
            raise PermissionDenied('You can only add attachments to your own announcements.')
        serializer.save(announcement=announcement)


class AnnouncementAttachmentDetailView(generics.DestroyAPIView):
    """
    DELETE /api/config/announcements/{announcement_id}/attachments/{id}/
    """
    serializer_class    = AnnouncementAttachmentSerializer
    permission_classes  = [IsManagerOrAbove]

    def get_queryset(self):
        return AnnouncementAttachment.objects.filter(
            announcement_id=self.kwargs['announcement_id']
        )


# ── HOME PAGE LAYOUT ──────────────────────────────────────────────────────────

class HomePageLayoutView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsSuperAdmin()]

    def get(self, request):
        instance   = HomePageLayout.get_or_create_default()
        serializer = HomePageLayoutSerializer(instance, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        serializer = HomePageLayoutUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        instance            = HomePageLayout.get_or_create_default()
        instance.layout     = serializer.validated_data['layout']
        instance.updated_by = request.user
        instance.save()

        return Response(
            HomePageLayoutSerializer(instance, context={'request': request}).data
        )