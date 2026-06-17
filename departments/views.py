from django.db.models import Q
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Group, GroupMembership
from .serializers import (
    GroupSerializer,
    GroupCreateUpdateSerializer,
    GroupMinimalSerializer,
    GroupMembershipSerializer,
    AddMemberSerializer,
)
from accounts.serializers import UserMinimalSerializer

User = get_user_model()


# ── PERMISSIONS ───────────────────────────────────────────────────────────────

class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'superadmin')


class IsManagerOrAbove(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('manager', 'admin', 'superadmin')


# ── GROUP LIST & CREATE ───────────────────────────────────────────────────────

class GroupListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/groups/  — List all active groups (all authenticated users)
    POST /api/groups/  — Create a new group (admin+ only)
    """
    queryset       = Group.objects.filter(is_active=True).order_by('order', 'name')
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrSuperAdmin()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return GroupCreateUpdateSerializer
        return GroupSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


# ── GROUP DETAIL ──────────────────────────────────────────────────────────────

class GroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/groups/{id}/  — Get group detail
    PATCH  /api/groups/{id}/  — Update group (admin+ only)
    DELETE /api/groups/{id}/  — Deactivate group (admin+ only)
    """
    queryset       = Group.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdminOrSuperAdmin()]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return GroupCreateUpdateSerializer
        return GroupSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


# ── GROUP MEMBERS ─────────────────────────────────────────────────────────────

class GroupMemberListView(generics.ListAPIView):
    """
    GET /api/groups/{id}/members/  — List all members of a group
    """
    serializer_class   = GroupMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return GroupMembership.objects.filter(
            group_id=self.kwargs['pk']
        ).select_related('user', 'added_by').order_by('user__first_name')


class AddRemoveMemberView(APIView):
    """
    POST   /api/groups/{id}/members/add-remove/  — Add a user to a group
    DELETE /api/groups/{id}/members/add-remove/  — Remove a user from a group
    """
    permission_classes = [IsAdminOrSuperAdmin]

    def post(self, request, pk):
        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            group = Group.objects.get(pk=pk, is_active=True)
        except Group.DoesNotExist:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)

        user_id    = serializer.validated_data['user_id']
        user       = User.objects.get(pk=user_id)

        membership, created = GroupMembership.objects.get_or_create(
            user=user,
            group=group,
            defaults={'added_by': request.user},
        )

        if not created:
            return Response(
                {'detail': f'{user.full_name} is already a member of {group.name}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            GroupMembershipSerializer(membership).data,
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, pk):
        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)

        user_id = serializer.validated_data['user_id']

        deleted, _ = GroupMembership.objects.filter(
            user_id=user_id,
            group=group,
        ).delete()

        if not deleted:
            return Response(
                {'detail': 'Membership not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({'detail': 'Member removed successfully.'})


# ── ASSIGNEE SEARCH ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def assignee_search(request):
    """
    GET /api/groups/search/?q=<query>
    Searches both groups AND users simultaneously.
    """
    query   = request.query_params.get('q', '').strip()
    results = []

    # Search groups
    group_qs = Group.objects.filter(is_active=True)
    if query:
        group_qs = group_qs.filter(
            Q(name__icontains=query) | Q(prefix__icontains=query)
        )
    group_qs = group_qs.order_by('order', 'name')[:10]

    for group in group_qs:
        icon_image_url = None
        if group.icon_image:
            icon_image_url = request.build_absolute_uri(group.icon_image.url)
        results.append({
            'type':          'group',
            'id':            group.id,
            'name':          group.name,
            'email':         group.email,
            'icon':          group.icon,
            'icon_image_url': icon_image_url,
            'prefix':        group.prefix,
            'description':   group.description,
        })

    # Search users
    user_qs = User.objects.filter(is_active=True)
    if query:
        user_qs = user_qs.filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)  |
            Q(email__icontains=query)
        )
    user_qs = user_qs.prefetch_related('helpdesk_groups').order_by('first_name', 'last_name')[:10]

    for user in user_qs:
        user_groups = GroupMinimalSerializer(
            user.helpdesk_groups.filter(is_active=True),
            many=True,
            context={'request': request},
        ).data
        results.append({
            'type':        'user',
            'id':          user.id,
            'name':        user.full_name,
            'email':       user.email,
            'avatar':      request.build_absolute_uri(user.avatar.url) if user.avatar else None,
            'designation': user.designation,
            'groups':      user_groups,
        })

    return Response(results)


# ── USER'S GROUPS ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_groups(request):
    """
    GET /api/groups/mine/
    Returns all groups the current logged-in user belongs to.
    """
    groups = request.user.helpdesk_groups.filter(is_active=True).order_by('order', 'name')
    return Response(GroupSerializer(groups, many=True, context={'request': request}).data)