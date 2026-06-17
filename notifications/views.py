from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationListSerializer, NotificationSerializer


class NotificationListView(APIView):
    """
    GET /api/notifications/
    Returns all notifications for the logged-in user.
    Supports ?unread=true to return only unread notifications.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(
            recipient=request.user
        ).select_related('ticket').order_by('-created_at')

        unread_only = request.query_params.get('unread', '').lower() == 'true'
        if unread_only:
            qs = qs.filter(read=False)

        # Limit to last 50 notifications
        qs = qs[:50]

        serializer = NotificationListSerializer(qs, many=True)
        return Response(serializer.data)


class NotificationUnreadCountView(APIView):
    """
    GET /api/notifications/unread-count/
    Returns the count of unread notifications for the bell icon badge.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            read=False,
        ).count()
        return Response({'unread_count': count})


class NotificationMarkReadView(APIView):
    """
    POST /api/notifications/{id}/read/
    Marks a single notification as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(
                pk=pk,
                recipient=request.user,
            )
        except Notification.DoesNotExist:
            return Response(
                {'detail': 'Notification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        notification.read = True
        notification.save(update_fields=['read'])
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(APIView):
    """
    POST /api/notifications/mark-all-read/
    Marks all notifications for the logged-in user as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(
            recipient=request.user,
            read=False,
        ).update(read=True)
        return Response({'detail': f'{updated} notification(s) marked as read.'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def notification_detail(request, pk):
    """
    GET /api/notifications/{id}/
    Returns full detail of a single notification.
    """
    try:
        notification = Notification.objects.get(
            pk=pk,
            recipient=request.user,
        )
    except Notification.DoesNotExist:
        return Response(
            {'detail': 'Notification not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(NotificationSerializer(notification).data)