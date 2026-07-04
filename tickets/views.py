import re

from django.db.models import Q
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Ticket, Comment, Attachment, TicketLink, Label
from .serializers import (
    TicketListSerializer,
    TicketDetailSerializer,
    TicketCreateSerializer,
    TicketUpdateSerializer,
    TicketAssignSerializer,
    TicketStatusSerializer,
    CommentSerializer,
    CommentCreateSerializer,
    AttachmentSerializer,
    TicketLinkSerializer,
    TicketLinkCreateSerializer,
    LabelSerializer,
    LabelCreateUpdateSerializer,
)
from notifications.services import add_interested_party, dispatch_notification

User = get_user_model()


# ── PERMISSIONS ───────────────────────────────────────────────────────────────

class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'superadmin')


class IsManagerOrAbove(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('manager', 'admin', 'superadmin')


# ── TICKET QUERYSET HELPER ────────────────────────────────────────────────────

def get_ticket_queryset_for_user(user):
    """
    Returns the correct ticket queryset based on the user's role.

    - superadmin / admin  : all tickets
    - manager             : tickets assigned to any of their groups
    - user                : tickets they reported OR assigned to their groups
                            OR assigned directly to them

    IMPORTANT: filters by assigned_group (current responsible group),
    NOT by group (original prefix group). This is how EPOS-0012
    appears in IT & Networks queue after reassignment.
    """
    if user.role in ('superadmin', 'admin'):
        return Ticket.objects.all()

    group_ids = user.helpdesk_groups.values_list('id', flat=True)

    if user.role == 'manager':
        return Ticket.objects.filter(
            assigned_group_id__in=group_ids
        )

    # Regular user
    return Ticket.objects.filter(
        Q(reporter=user) |
        Q(assigned_user=user) |
        Q(assigned_group_id__in=group_ids)
    ).distinct()


# ── NOTIFICATION HELPERS (internal to this module) ────────────────────────────

def _notify_group_members_or_assignee(ticket, event_type, message, actor=None,
                                       from_status=None, to_status=None):
    """
    Resolves recipients for a ticket-level event:
    - If the ticket has an assigned_user, notify all current interested
      parties on the ticket (reporter, assignee, anyone who commented/
      reassigned/was mentioned).
    - If the ticket has no assigned_user (group-only), notify all members
      of assigned_group, PLUS any existing interested parties.

    The acting user (the one who triggered the event) is excluded from
    their own notification.
    """
    from notifications.services import get_interested_parties, get_group_members

    recipients = {}

    interested = get_interested_parties(ticket)
    for u in interested:
        recipients[u.pk] = u

    if ticket.assigned_user_id is None and ticket.assigned_group_id is not None:
        for u in get_group_members(ticket.assigned_group):
            recipients[u.pk] = u

    dispatch_notification(
        ticket=ticket,
        event_type=event_type,
        message=message,
        recipients=list(recipients.values()),
        from_status=from_status,
        to_status=to_status,
        exclude_user=actor,
    )


def _parse_mentions(text):
    """
    Parses @mentions out of comment text. Expects the frontend to insert
    mentions in the form @[Full Name](user:<id>) or @[Group Name](group:<id>)
    when the user selects someone from the searchable @mention dropdown.
    Returns a tuple of (mentioned_user_ids, mentioned_group_ids).
    """
    if not text:
        return [], []

    user_ids  = [int(m) for m in re.findall(r'@\[[^\]]+\]\(user:(\d+)\)', text)]
    group_ids = [int(m) for m in re.findall(r'@\[[^\]]+\]\(group:(\d+)\)', text)]
    return user_ids, group_ids


# ── TICKET LIST & CREATE ──────────────────────────────────────────────────────

class TicketListCreateView(APIView):
    """
    GET  /api/tickets/  — List tickets (role-filtered)
    POST /api/tickets/  — Create a new ticket
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = get_ticket_queryset_for_user(request.user)

        # Optional filters from query params
        status_filter = request.query_params.get('status')
        group_filter  = request.query_params.get('group')
        priority      = request.query_params.get('priority')
        assigned_user = request.query_params.get('assigned_user')
        search        = request.query_params.get('q')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if group_filter:
            qs = qs.filter(assigned_group_id=group_filter)
        if priority:
            qs = qs.filter(priority=priority)
        if assigned_user:
            qs = qs.filter(assigned_user_id=assigned_user)
        if search:
            qs = qs.filter(
                Q(key__icontains=search) |
                Q(summary__icontains=search)
            )

        qs = qs.select_related(
            'reporter', 'assigned_user', 'assigned_group', 'group'
        ).prefetch_related('ticket_labels__label').order_by('-created_at')

        serializer = TicketListSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TicketCreateSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save()

        # ── Interested party tracking ──
        # Must happen before dispatch_notification so get_interested_parties
        # returns someone to notify via the in-app bell.
        add_interested_party(ticket, ticket.reporter, 'reporter')
        if ticket.assigned_user_id:
            add_interested_party(ticket, ticket.assigned_user, 'assignee')

        # ── In-app notifications (bell dropdown) ──
        # actor=None so nobody is excluded — reporter gets in-app too.
        _notify_group_members_or_assignee(
            ticket=ticket,
            event_type='assignment',
            message=f'New ticket {ticket.key} was raised: {ticket.summary}',
            actor=None,
        )

        # ── Emails — fired via Celery so the HTTP response returns
        # instantly. The task re-fetches the ticket fresh from the
        # database by ID to guarantee correct ticket key and all
        # related data (reporter, assignee, group, labels, attachments).
        from notifications.tasks import send_ticket_creation_emails
        send_ticket_creation_emails.delay(ticket.id)

        return Response(
            TicketDetailSerializer(ticket).data,
            status=status.HTTP_201_CREATED,
        )


# ── TICKET DETAIL ─────────────────────────────────────────────────────────────

class TicketDetailView(APIView):
    """
    GET   /api/tickets/{id}/  — Get full ticket detail
    PATCH /api/tickets/{id}/  — Update ticket fields
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        qs = get_ticket_queryset_for_user(user)
        try:
            return qs.select_related(
                'reporter', 'assigned_user', 'assigned_group', 'group'
            ).prefetch_related(
                'comments__author', 'comments__mentions',
                'attachments__uploaded_by',
                'ticket_labels__label',
                'outbound_links', 'inbound_links',
            ).get(pk=pk)
        except Ticket.DoesNotExist:
            return None

    def get(self, request, pk):
        ticket = self.get_object(pk, request.user)
        if not ticket:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(TicketDetailSerializer(ticket).data)

    def patch(self, request, pk):
        ticket = self.get_object(pk, request.user)
        if not ticket:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TicketUpdateSerializer(ticket, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TicketDetailSerializer(ticket).data)


# ── CLAIM TICKET ──────────────────────────────────────────────────────────────

class TicketClaimView(APIView):
    """
    POST /api/tickets/{id}/claim/
    Agent claims an unassigned ticket — assigns to self, locks it, sets status to in_progress.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        qs = get_ticket_queryset_for_user(request.user)
        try:
            ticket = qs.get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        if ticket.is_locked:
            return Response(
                {'detail': 'This ticket is already assigned and locked.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status_value = ticket.status

        ticket.assigned_user = request.user
        ticket.is_locked     = True
        ticket.status        = 'in_progress'
        ticket.save(update_fields=['assigned_user', 'is_locked', 'status', 'updated_at'])

        # ── Notification wiring ──
        add_interested_party(ticket, request.user, 'assignee')
        _notify_group_members_or_assignee(
            ticket=ticket,
            event_type='assignment',
            message=f'{request.user.full_name} claimed ticket {ticket.key}.',
            actor=request.user,
        )
        if old_status_value != ticket.status:
            _notify_group_members_or_assignee(
                ticket=ticket,
                event_type='status_change',
                message=f'Ticket {ticket.key} status changed to {ticket.status}.',
                actor=request.user,
            )

        return Response(TicketDetailSerializer(ticket).data)


# ── ASSIGN / REASSIGN TICKET ──────────────────────────────────────────────────

class TicketAssignView(APIView):
    """
    POST /api/tickets/{id}/assign/
    Assign or reassign a ticket to a group or individual.
    Managers and above only.

    CRITICAL: assigned_group changes on reassignment.
              group (original) and key NEVER change.
    """
    permission_classes = [IsManagerOrAbove]

    def post(self, request, pk):
        try:
            ticket = Ticket.objects.get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check manager can only assign tickets in their own groups
        if request.user.role == 'manager':
            group_ids = request.user.helpdesk_groups.values_list('id', flat=True)
            if ticket.assigned_group_id not in group_ids:
                return Response(
                    {'detail': 'You can only reassign tickets within your own groups.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = TicketAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assigned_group = serializer.validated_data['assigned_group']
        assigned_user  = serializer.validated_data.get('assigned_user')

        # assigned_group changes — group (original) stays the same
        ticket.assigned_group = assigned_group
        ticket.assigned_user  = assigned_user
        ticket.is_locked      = assigned_user is not None
        ticket.save(update_fields=['assigned_group', 'assigned_user', 'is_locked', 'updated_at'])

        # ── Notification wiring ──
        add_interested_party(ticket, request.user, 'reassigned')
        if assigned_user is not None:
            add_interested_party(ticket, assigned_user, 'assignee')

        if assigned_user is not None:
            message = f'Ticket {ticket.key} was assigned to {assigned_user.full_name}.'
        else:
            message = f'Ticket {ticket.key} was reassigned to {assigned_group.name}.'

        _notify_group_members_or_assignee(
            ticket=ticket,
            event_type='reassignment',
            message=message,
            actor=request.user,
        )

        return Response(TicketDetailSerializer(ticket).data)


# ── STATUS CHANGE ─────────────────────────────────────────────────────────────

class TicketStatusView(APIView):
    """
    POST /api/tickets/{id}/status/
    Change the status of a ticket.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        qs = get_ticket_queryset_for_user(request.user)
        try:
            ticket = qs.get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TicketStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status_value = ticket.status
        ticket.status = serializer.validated_data['status']
        ticket.save(update_fields=['status', 'updated_at'])

        # ── Notification wiring ──
        if old_status_value != ticket.status:
            _notify_group_members_or_assignee(
                ticket=ticket,
                event_type='status_change',
                message=f'Ticket {ticket.key} status changed from {old_status_value} to {ticket.status}.',
                actor=request.user,
            )

        return Response(TicketDetailSerializer(ticket).data)


# ── COMMENTS ──────────────────────────────────────────────────────────────────

class CommentListCreateView(APIView):
    """
    GET  /api/tickets/{id}/comments/  — List all comments on a ticket
    POST /api/tickets/{id}/comments/  — Add a comment
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_ticket(self, pk, user):
        qs = get_ticket_queryset_for_user(user)
        try:
            return qs.get(pk=pk)
        except Ticket.DoesNotExist:
            return None

    def get(self, request, pk):
        ticket = self.get_ticket(pk, request.user)
        if not ticket:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        comments = ticket.comments.select_related('author').prefetch_related('mentions').all()
        return Response(CommentSerializer(comments, many=True).data)

    def post(self, request, pk):
        ticket = self.get_ticket(pk, request.user)
        if not ticket:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(ticket=ticket, author=request.user)

        # ── Notification wiring ──
        add_interested_party(ticket, request.user, 'commented')

        mentioned_user_ids, mentioned_group_ids = _parse_mentions(
            getattr(comment, 'body', None) or getattr(comment, 'message', '') or ''
        )

        mentioned_users = {}
        if mentioned_user_ids:
            for u in User.objects.filter(id__in=mentioned_user_ids):
                mentioned_users[u.pk] = u
                add_interested_party(ticket, u, 'mentioned')

        if mentioned_group_ids:
            from departments.models import Group
            for group in Group.objects.filter(id__in=mentioned_group_ids):
                from notifications.services import get_group_members
                for u in get_group_members(group):
                    mentioned_users[u.pk] = u
                    add_interested_party(ticket, u, 'mentioned')

        # Notify everyone interested in the ticket about the new comment
        _notify_group_members_or_assignee(
            ticket=ticket,
            event_type='comment',
            message=f'{request.user.full_name} commented on ticket {ticket.key}.',
            actor=request.user,
        )

        # Additionally notify newly @mentioned users specifically
        if mentioned_users:
            dispatch_notification(
                ticket=ticket,
                event_type='mention',
                message=f'{request.user.full_name} mentioned you on ticket {ticket.key}.',
                recipients=list(mentioned_users.values()),
                exclude_user=request.user,
            )

        return Response(
            CommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )


# ── ATTACHMENTS ───────────────────────────────────────────────────────────────

class AttachmentListCreateView(APIView):
    """
    GET  /api/tickets/{id}/attachments/  — List attachments
    POST /api/tickets/{id}/attachments/  — Upload a file
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_ticket(self, pk, user):
        qs = get_ticket_queryset_for_user(user)
        try:
            return qs.get(pk=pk)
        except Ticket.DoesNotExist:
            return None

    def get(self, request, pk):
        ticket = self.get_ticket(pk, request.user)
        if not ticket:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        attachments = ticket.attachments.select_related('uploaded_by').all()
        return Response(AttachmentSerializer(attachments, many=True).data)

    def post(self, request, pk):
        ticket = self.get_ticket(pk, request.user)
        if not ticket:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AttachmentSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(ticket=ticket)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ── TICKET LINKS ──────────────────────────────────────────────────────────────

class TicketLinkCreateView(APIView):
    """
    POST /api/tickets/{id}/links/  — Link two tickets together
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            source_ticket = Ticket.objects.get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TicketLinkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        link = TicketLink.objects.create(
            source_ticket=source_ticket,
            created_by=request.user,
            **serializer.validated_data,
        )

        return Response(
            TicketLinkSerializer(link).data,
            status=status.HTTP_201_CREATED,
        )


# ── LABELS ────────────────────────────────────────────────────────────────────
#
# NOTE on delete semantics: Delete is now a HARD delete, matching the
# convention already applied to Status/Priority/Urgency/WorkType/Component
# in the configuration app — Inactive is a separate state set via Edit,
# which keeps the label visible in the admin list (for reactivation later)
# but excludes it from user-facing selection lists when active_only is set.

class LabelListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/labels/  — List labels (all by default; supports filtering)
    POST /api/labels/  — Create a label (manager+ only)

    Query params:
      group       — only labels assigned to this group, OR labels with no
                    groups at all ("All Groups" convention, same as
                    WorkType/Component).
      active_only — when truthy, excludes labels the admin has marked
                    inactive. Used by user-facing selection lists (e.g.
                    Create Ticket's Labels picker). The admin management
                    page omits this param so it can still see and
                    reactivate inactive labels.
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrAbove()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LabelCreateUpdateSerializer
        return LabelSerializer

    def get_queryset(self):
        qs = Label.objects.prefetch_related('groups').all().order_by('name')

        group_id = self.request.query_params.get('group')
        if group_id:
            qs = qs.filter(
                Q(groups__isnull=True) | Q(groups__id=group_id)
            ).distinct()

        active_only = self.request.query_params.get('active_only')
        if active_only:
            qs = qs.filter(is_active=True)

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class LabelDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/labels/{id}/  — Get label detail
    PATCH  /api/labels/{id}/  — Update label (manager+ only)
    DELETE /api/labels/{id}/  — Permanently delete label (manager+ only)
    """
    queryset = Label.objects.all()

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsManagerOrAbove()]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return LabelCreateUpdateSerializer
        return LabelSerializer

    def perform_destroy(self, instance):
        instance.delete()