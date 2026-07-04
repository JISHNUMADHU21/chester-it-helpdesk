"""
notifications/tasks.py

Celery tasks for the IT Helpdesk notification system.

Two task types:
1. send_ticket_creation_emails — fired immediately on ticket creation
   via .delay() so the HTTP response returns instantly.

2. process_pending_email_notifications — fired every minute by Celery
   Beat. Processes pending NotificationDelivery rows for non-creation
   events ONLY (status changes, comments, mentions, reassignments).
   NEVER processes 'assignment' event type — those are handled by
   send_ticket_creation_emails to avoid duplicate emails.
"""

import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# Event types handled by send_ticket_creation_emails.
# MUST be excluded from process_pending_email_notifications
# to prevent duplicate emails on ticket creation.
_CREATION_EVENT_TYPES = {'assignment'}


@shared_task(name='notifications.send_ticket_creation_emails')
def send_ticket_creation_emails(ticket_id):
    """
    Sends all three ticket creation emails asynchronously:
      1. Reporter confirmation (always)
      2. Assignee notification (if assigned_user is set)
      3. Group notification (if assigned_group has an email)

    Fetches the ticket fresh from the database by ID to guarantee
    correct ticket key and all related data.
    """
    from tickets.models import Ticket
    from notifications.email_service import (
        send_reporter_confirmation,
        send_assignee_notification,
        send_group_notification,
    )

    try:
        ticket = Ticket.objects.select_related(
            'reporter',
            'assigned_user',
            'assigned_group',
            'group',
        ).prefetch_related(
            'ticket_labels__label',
            'attachments',
        ).get(pk=ticket_id)
    except Ticket.DoesNotExist:
        logger.error('send_ticket_creation_emails: Ticket %s not found.', ticket_id)
        return

    logger.info(
        'Sending ticket creation emails for %s (id=%s)',
        ticket.key, ticket_id,
    )

    # Email 1 — Reporter confirmation (always sent)
    send_reporter_confirmation(ticket)

    # Email 2 — Assignee notification (only if specific user assigned)
    if ticket.assigned_user_id:
        send_assignee_notification(ticket)

    # Email 3 — Group notification (only if group has email configured)
    send_group_notification(ticket)

    logger.info('Ticket creation emails complete for %s', ticket.key)


@shared_task(name='notifications.process_pending_email_notifications')
def process_pending_email_notifications():
    """
    Pick up pending email NotificationDelivery rows for non-creation
    events and attempt to send each one.

    IMPORTANT: Excludes 'assignment' event type — those are handled
    by send_ticket_creation_emails to prevent duplicate emails.
    """
    from notifications.models import NotificationDelivery
    from notifications.email_service import send_notification_email

    pending = NotificationDelivery.objects.filter(
        channel='email',
        status='pending',
    ).exclude(
        # Never process creation-event deliveries here —
        # send_ticket_creation_emails handles those directly.
        notification__type__in=_CREATION_EVENT_TYPES,
    ).select_related(
        'notification',
        'notification__ticket',
        'notification__ticket__assigned_group',
        'notification__ticket__assigned_user',
        'notification__recipient',
    )

    if not pending.exists():
        return

    count      = pending.count()
    sent_count = 0
    fail_count = 0

    logger.info('Processing %d pending email notification(s)...', count)

    for delivery in pending:
        notification = delivery.notification
        ticket       = notification.ticket
        recipient    = notification.recipient

        # Build ticket key
        try:
            prefix     = ticket.assigned_group.prefix if ticket.assigned_group else 'TKT'
            ticket_key = f'{prefix}-{ticket.id:04d}'
        except Exception:
            ticket_key = f'TKT-{ticket.id:04d}'

        # Recipient display name
        recipient_name = (
            recipient.first_name.strip()
            if recipient and recipient.first_name
            else (recipient.email if recipient else '')
        )

        # Ticket metadata
        try:
            ticket_status   = str(ticket.status)   if ticket.status   else ''
            ticket_priority = str(ticket.priority) if ticket.priority else ''
        except Exception:
            ticket_status   = ''
            ticket_priority = ''

        # Assigned-to display string
        try:
            if ticket.assigned_user:
                assigned_to = (
                    f'{ticket.assigned_user.first_name} {ticket.assigned_user.last_name}'.strip()
                    or ticket.assigned_user.email
                )
            elif ticket.assigned_group:
                assigned_to = ticket.assigned_group.name
            else:
                assigned_to = ''
        except Exception:
            assigned_to = ''

        # Attempt the send
        error_msg = ''
        try:
            success = send_notification_email(
                recipient_email = recipient.email,
                recipient_name  = recipient_name,
                event_type      = notification.type,
                message         = notification.message,
                ticket_key      = ticket_key,
                ticket_id       = ticket.id,
                ticket_summary  = ticket.summary,
                ticket_status   = ticket_status,
                assigned_to     = assigned_to,
                ticket_priority = ticket_priority,
            )
        except Exception as exc:
            logger.error(
                'Unexpected error sending email for delivery %s: %s',
                delivery.id, exc, exc_info=True,
            )
            success   = False
            error_msg = str(exc)

        if success:
            delivery.status        = 'sent'
            delivery.sent_at       = timezone.now()
            delivery.error_message = ''
            delivery.save(update_fields=['status', 'sent_at', 'error_message'])
            sent_count += 1
        else:
            delivery.status        = 'failed'
            delivery.error_message = error_msg
            delivery.save(update_fields=['status', 'error_message'])
            fail_count += 1

    logger.info(
        'Email notification processing complete — sent: %d, failed: %d',
        sent_count, fail_count,
    )