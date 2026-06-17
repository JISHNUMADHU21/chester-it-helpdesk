from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    LogoutView,
    MeView,
    AvatarUpdateView,
    ChangePasswordView,
    UserListCreateView,
    UserDetailView,
    user_search,
)

urlpatterns = [
    # Auth
    path('auth/login/',           LoginView.as_view(),         name='auth-login'),
    path('auth/logout/',          LogoutView.as_view(),         name='auth-logout'),
    path('auth/token/refresh/',   TokenRefreshView.as_view(),   name='auth-token-refresh'),

    # Current user profile
    path('auth/me/',              MeView.as_view(),             name='auth-me'),
    path('auth/me/avatar/',       AvatarUpdateView.as_view(),   name='auth-me-avatar'),
    path('auth/me/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),

    # User management
    path('users/',                UserListCreateView.as_view(), name='user-list-create'),
    path('users/search/',         user_search,                  name='user-search'),
    path('users/<int:pk>/',       UserDetailView.as_view(),     name='user-detail'),
]