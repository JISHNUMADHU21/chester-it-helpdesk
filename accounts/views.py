from django.contrib.auth import get_user_model
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .serializers import (
    LoginSerializer,
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    AvatarUpdateSerializer,
    ChangePasswordSerializer,
    UserMinimalSerializer,
)

User = get_user_model()


# ── AUTHENTICATION ────────────────────────────────────────────────────────────

class LoginView(APIView):
    """
    POST /api/auth/login/
    Accepts email + password, returns access + refresh JWT tokens.
    No authentication required.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email    = serializer.validated_data['email']
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
            'user':    UserSerializer(user).data,
        })


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the refresh token to invalidate the session.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {'detail': 'Invalid or expired token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'detail': 'Successfully logged out.'})


# ── CURRENT USER PROFILE ──────────────────────────────────────────────────────

class MeView(APIView):
    """
    GET  /api/auth/me/  — Returns current user profile
    PATCH /api/auth/me/ — Updates designation only (name/email set by admin)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AvatarUpdateView(APIView):
    """
    PATCH /api/auth/me/avatar/
    Allows the logged-in user to upload or change their profile picture.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = AvatarUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    """
    POST /api/auth/me/change-password/
    Allows the logged-in user to change their own password.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password updated successfully.'})


# ── USER MANAGEMENT (Admin / Super Admin) ─────────────────────────────────────

class IsAdminOrSuperAdmin(permissions.BasePermission):
    """Allows access to admin and superadmin roles only."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'superadmin')


class IsSuperAdmin(permissions.BasePermission):
    """Allows access to superadmin role only."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'superadmin'


class IsManagerOrAbove(permissions.BasePermission):
    """Allows access to manager, admin and superadmin roles."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('manager', 'admin', 'superadmin')


class UserListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/users/  — List users (role-filtered)
    POST /api/users/  — Create user (admin+ only)
    """
    permission_classes = [IsAdminOrSuperAdmin]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        qs   = User.objects.all().order_by('first_name', 'last_name')

        # Managers can only see users in their own groups
        if user.role == 'manager':
            group_ids = user.helpdesk_groups.values_list('id', flat=True)
            qs = qs.filter(helpdesk_groups__id__in=group_ids).distinct()

        # Admins cannot see or list other admins (only superadmin can)
        if user.role == 'admin':
            qs = qs.exclude(role__in=['admin', 'superadmin'])

        return qs

    def perform_create(self, serializer):
        # Only superadmin can create admin accounts
        role = self.request.data.get('role', 'user')
        if role in ('admin', 'superadmin') and self.request.user.role != 'superadmin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only Super Admins can create Admin accounts.')
        serializer.save()


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/users/{id}/  — Get user detail
    PATCH  /api/users/{id}/  — Update user
    DELETE /api/users/{id}/  — Deactivate user (soft delete)
    """
    permission_classes = [IsAdminOrSuperAdmin]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        qs   = User.objects.all()

        # Managers can only manage users in their own groups
        if user.role == 'manager':
            group_ids = user.helpdesk_groups.values_list('id', flat=True)
            qs = qs.filter(helpdesk_groups__id__in=group_ids).distinct()

        # Admins cannot manage other admin accounts
        if user.role == 'admin':
            qs = qs.exclude(role__in=['admin', 'superadmin'])

        return qs

    def perform_update(self, serializer):
        target = self.get_object()
        # Prevent admin from changing another user's role to admin/superadmin
        new_role = self.request.data.get('role')
        if new_role in ('admin', 'superadmin') and self.request.user.role != 'superadmin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only Super Admins can assign Admin roles.')
        serializer.save()

    def perform_destroy(self, instance):
        # Soft delete — deactivate instead of deleting
        instance.is_active = False
        instance.save()


# ── USER SEARCH ───────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_search(request):
    """
    GET /api/users/search/?q=<query>
    Returns users matching the search query.
    Used by the @mention system and assignee dropdown.
    """
    query = request.query_params.get('q', '').strip()
    if not query:
        return Response([])

    users = User.objects.filter(
        is_active=True,
    ).filter(
        models.Q(first_name__icontains=query) |
        models.Q(last_name__icontains=query)  |
        models.Q(email__icontains=query)
    ).order_by('first_name', 'last_name')[:20]

    return Response(UserMinimalSerializer(users, many=True).data)