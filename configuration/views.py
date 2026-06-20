from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Status, Priority, Urgency, WorkType, Announcement, AnnouncementAttachment, HomePageLayout
from .serializers import (
    StatusSerializer, StatusCreateUpdateSerializer,
    PrioritySerializer, PriorityCreateUpdateSerializer,
    UrgencySerializer, UrgencyCreateUpdateSerializer,
    WorkTypeSerializer, WorkTypeCreateUpdateSerializer,
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
        instance.is_active = False
        instance.save()


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


class PriorityDetailView(ConfigDetailView):
    queryset               = Priority.objects.all()
    serializer_class_read  = PrioritySerializer
    serializer_class_write = PriorityCreateUpdateSerializer


# ── URGENCY ───────────────────────────────────────────────────────────────────

class UrgencyListCreateView(ConfigListCreateView):
    queryset               = Urgency.objects.all().order_by('order', 'name')
    serializer_class_read  = UrgencySerializer
    serializer_class_write = UrgencyCreateUpdateSerializer


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
        if group_id:
            qs = qs.filter(groups__id=group_id)
        return qs


class WorkTypeDetailView(ConfigDetailView):
    queryset               = WorkType.objects.prefetch_related('groups').all()
    serializer_class_read  = WorkTypeSerializer
    serializer_class_write = WorkTypeCreateUpdateSerializer
    permission_class_write = IsManagerOrAbove
    parser_classes         = [MultiPartParser, FormParser, JSONParser]


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
        from django.db.models import Q
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
            from rest_framework.exceptions import PermissionDenied
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
            from rest_framework.exceptions import PermissionDenied
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