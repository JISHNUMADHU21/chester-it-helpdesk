from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Status, Priority, Urgency, WorkType, Announcement, HomePageLayout
from .serializers import (
    StatusSerializer, StatusCreateUpdateSerializer,
    PrioritySerializer, PriorityCreateUpdateSerializer,
    UrgencySerializer, UrgencyCreateUpdateSerializer,
    WorkTypeSerializer, WorkTypeCreateUpdateSerializer,
    AnnouncementSerializer, AnnouncementCreateUpdateSerializer,
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
        qs        = WorkType.objects.prefetch_related('groups').all().order_by('order', 'name')
        group_id  = self.request.query_params.get('group')
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

class AnnouncementListCreateView(ConfigListCreateView):
    serializer_class_read  = AnnouncementSerializer
    serializer_class_write = AnnouncementCreateUpdateSerializer
    permission_class_write = IsManagerOrAbove

    def get_queryset(self):
        user = self.request.user
        if user.role in ('manager', 'admin', 'superadmin'):
            return Announcement.objects.all()
        return Announcement.objects.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AnnouncementDetailView(ConfigDetailView):
    serializer_class_read  = AnnouncementSerializer
    serializer_class_write = AnnouncementCreateUpdateSerializer
    permission_class_write = IsManagerOrAbove

    def get_queryset(self):
        user = self.request.user
        if user.role in ('manager', 'admin', 'superadmin'):
            return Announcement.objects.all()
        return Announcement.objects.filter(is_active=True)

    def perform_destroy(self, instance):
        instance.delete()


# ── HOME PAGE LAYOUT ──────────────────────────────────────────────────────────

class HomePageLayoutView(APIView):
    """
    GET  /api/config/homepage-layout/  — Returns current layout (all authenticated users)
    PUT  /api/config/homepage-layout/  — Updates layout (superadmin only)
    """

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