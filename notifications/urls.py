from django.urls import path

from .views import (
    NotificationListView,
    NotificationUnreadCountView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    notification_detail,
)

urlpatterns = [
    # Notifications
    path('notifications/',                      NotificationListView.as_view(),        name='notification-list'),
    path('notifications/unread-count/',         NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('notifications/mark-all-read/',        NotificationMarkAllReadView.as_view(), name='notification-mark-all-read'),
    path('notifications/<int:pk>/',             notification_detail,                   name='notification-detail'),
    path('notifications/<int:pk>/read/',        NotificationMarkReadView.as_view(),    name='notification-mark-read'),
]