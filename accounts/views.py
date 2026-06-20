from django.contrib.auth import get_user_model
from django.db import models
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
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AvatarUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = AvatarUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user, context={'request': request}).data)


class ChangePasswordView(APIView):
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


# ── PERMISSIONS ───────────────────────────────────────────────────────────────

class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               request.user.role in ('admin', 'superadmin')


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               request.user.role == 'superadmin'


class IsManagerOrAbove(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               request.user.role in ('manager', 'admin', 'superadmin')


# ── USER MANAGEMENT ───────────────────────────────────────────────────────────

class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrSuperAdmin]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        user = self.request.user
        qs   = User.objects.all().order_by('first_name', 'last_name')

        if user.role == 'manager':
            group_ids = user.helpdesk_groups.values_list('id', flat=True)
            qs = qs.filter(helpdesk_groups__id__in=group_ids).distinct()

        # Admin cannot see superadmin or other admin accounts
        if user.role == 'admin':
            qs = qs.exclude(role__in=['admin', 'superadmin'])

        return qs

    def perform_create(self, serializer):
        role = self.request.data.get('role', 'user')
        if role in ('admin', 'superadmin') and self.request.user.role != 'superadmin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only Super Admins can create Admin accounts.')
        serializer.save()


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrSuperAdmin]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        user = self.request.user

        # Superadmin can access all users
        if user.role == 'superadmin':
            return User.objects.all()

        # Admin can access all users except other admins and superadmins
        if user.role == 'admin':
            return User.objects.exclude(role__in=['admin', 'superadmin'])

        # Manager can only access users in their own groups
        if user.role == 'manager':
            group_ids = user.helpdesk_groups.values_list('id', flat=True)
            return User.objects.filter(
                helpdesk_groups__id__in=group_ids
            ).distinct()

        return User.objects.none()

    def perform_update(self, serializer):
        new_role = self.request.data.get('role')
        if new_role in ('admin', 'superadmin') and self.request.user.role != 'superadmin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only Super Admins can assign Admin roles.')
        serializer.save()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


# ── USER SEARCH ───────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_search(request):
    query = request.query_params.get('q', '').strip()
    if not query:
        return Response([])

    from django.db.models import Q
    users = User.objects.filter(
        is_active=True,
    ).filter(
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query)  |
        Q(email__icontains=query)
    ).order_by('first_name', 'last_name')[:20]

    return Response(UserMinimalSerializer(users, many=True).data)