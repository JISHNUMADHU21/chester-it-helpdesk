"""
notifications/email_service.py

Email sending service for the IT Helpdesk notification system.

Three distinct email types for ticket creation:
  1. send_reporter_confirmation  — confirmation to the reporter
  2. send_assignee_notification  — notification to the assigned user
  3. send_group_notification     — notification to the group inbox email

One generic function for all other events:
  4. send_notification_email     — status changes, comments, mentions etc.
     (called by process_pending_email_notifications Celery task)

Switching SMTP providers is purely a .env change — no code changes needed.

LOGO NOTE: Gmail and most email clients block data: URI embedded images
for security reasons. The logo is therefore served from a publicly
accessible URL. For production, update LOGO_URL below to point to the
hosted logo on the Chester Racecourse server once the system goes live.
"""

import logging
from datetime import datetime

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.safestring import mark_safe
from django.utils.timezone import localtime

logger = logging.getLogger(__name__)

# ── Logo URL ──────────────────────────────────────────────────────────────────
# Currently pointing to the Chester Racecourse logo hosted on wlgt.co.uk
# for testing. When the system goes live, update this to the production URL:
# e.g. 'https://helpdesk.chesterracecourse.co.uk/static/img/crc-logo.png'
LOGO_URL = 'https://wlgt.co.uk/wp-content/uploads/2023/03/NEW-RACECOURSE-LOGO-1024x640.png'

# ── Event labels (generic notifications) ─────────────────────────────────────
_EVENT_LABELS = {
    'assignment':     'Ticket Assigned',
    'reassignment':   'Ticket Reassigned',
    'status_change':  'Status Update',
    'comment':        'New Comment',
    'mention':        'You Were Mentioned',
    'ticket_created': 'New Ticket',
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _format_file_size(size_bytes):
    if not size_bytes:
        return '0 B'
    if size_bytes < 1024:
        return f'{size_bytes} B'
    elif size_bytes < 1024 * 1024:
        return f'{size_bytes / 1024:.1f} KB'
    return f'{size_bytes / (1024 * 1024):.1f} MB'


def _build_attachment_list(ticket):
    result = []
    try:
        for att in ticket.attachments.all():
            result.append({
                'original_name':     att.original_name,
                'file_size_display': _format_file_size(att.file_size),
            })
    except Exception:
        pass
    return result


def _fmt_dt(dt):
    """Format a datetime for display in emails."""
    if not dt:
        return '—'
    try:
        return localtime(dt).strftime('%d %b %Y, %H:%M')
    except Exception:
        return str(dt)


def _fmt_date(d):
    if not d:
        return '—'
    try:
        return d.strftime('%d %b %Y')
    except Exception:
        return str(d)


def _build_ticket_context(ticket):
    """
    Builds the shared ticket metadata context dict used by all email types.
    Ticket must be freshly fetched with select_related and prefetch_related.
    """
    frontend_base_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:5173')
    ticket_url        = f'{frontend_base_url}/tickets/{ticket.id}'

    # Reporter
    reporter_name     = ''
    reporter_initials = ''
    reporter_avatar   = ''
    if ticket.reporter:
        fn = ticket.reporter.first_name or ''
        ln = ticket.reporter.last_name  or ''
        reporter_name     = f'{fn} {ln}'.strip() or ticket.reporter.email
        reporter_initials = f'{fn[:1]}{ln[:1]}'.upper()
        if hasattr(ticket.reporter, 'avatar') and ticket.reporter.avatar:
            try:
                reporter_avatar = ticket.reporter.avatar.url
            except Exception:
                pass

    # Assignee
    assignee_name     = ''
    assignee_initials = ''
    assignee_avatar   = ''
    if ticket.assigned_user:
        fn = ticket.assigned_user.first_name or ''
        ln = ticket.assigned_user.last_name  or ''
        assignee_name     = f'{fn} {ln}'.strip() or ticket.assigned_user.email
        assignee_initials = f'{fn[:1]}{ln[:1]}'.upper()
        if hasattr(ticket.assigned_user, 'avatar') and ticket.assigned_user.avatar:
            try:
                assignee_avatar = ticket.assigned_user.avatar.url
            except Exception:
                pass

    # Group
    group_name  = ticket.assigned_group.name  if ticket.assigned_group else '—'
    group_email = ticket.assigned_group.email if ticket.assigned_group else ''

    # Labels
    try:
        labels_list = [tl.label.name for tl in ticket.ticket_labels.select_related('label').all()]
        labels      = ', '.join(labels_list) if labels_list else '—'
    except Exception:
        labels = '—'

    # Status badge colours
    status_value = ticket.status or 'open'
    status_colour_map = {
        'open':        ('#0052CC', '#DEEBFF'),
        'in_progress': ('#FF8B00', '#FFFAE6'),
        'on_hold':     ('#505F79', '#F4F5F7'),
        'resolved':    ('#006644', '#E3FCEF'),
        'closed':      ('#172B4D', '#DFE1E6'),
        'cancelled':   ('#BF2600', '#FFEBE6'),
    }
    status_text_colour, status_bg_colour = status_colour_map.get(
        status_value, ('#172B4D', '#F4F5F7')
    )
    status_label = status_value.replace('_', ' ').title()

    # Priority colours
    priority_map = {
        'highest': ('Highest', '#E2483D'),
        'high':    ('High',    '#E2483D'),
        'medium':  ('Medium',  '#E97F33'),
        'low':     ('Low',     '#4C9AFF'),
        'lowest':  ('Lowest',  '#4C9AFF'),
    }
    priority_label, priority_colour = priority_map.get(
        (ticket.priority or '').lower(), (ticket.priority or '—', '#5E6C84')
    )

    # Urgency
    urgency_value = ticket.urgency or ''
    urgency_label = urgency_value.replace('_', ' ').title() if urgency_value else '—'

    return {
        'ticket_key':               ticket.key,
        'ticket_summary':           ticket.summary,
        'ticket_description':       ticket.description or '',
        'ticket_status':            status_label,
        'ticket_status_value':      status_value,
        'ticket_status_colour':     status_text_colour,
        'ticket_status_bg':         status_bg_colour,
        'ticket_priority':          priority_label,
        'ticket_priority_colour':   priority_colour,
        'ticket_urgency':           urgency_label,
        'ticket_urgency_value':     urgency_value,
        'ticket_work_type':         ticket.work_type or '—',
        'ticket_components':        ticket.components or '—',
        'ticket_labels':            labels,
        'ticket_due_date':          _fmt_date(ticket.due_date),
        'ticket_created_at':        _fmt_dt(ticket.created_at),
        'ticket_updated_at':        _fmt_dt(ticket.updated_at),
        'ticket_attachments':       _build_attachment_list(ticket),
        'ticket_url':               ticket_url,
        'ticket_reporter':          reporter_name,
        'ticket_reporter_initials': reporter_initials,
        'ticket_reporter_avatar':   reporter_avatar,
        'ticket_assignee':          assignee_name or '—',
        'ticket_assignee_initials': assignee_initials,
        'ticket_assignee_avatar':   assignee_avatar,
        'ticket_group':             group_name,
        'ticket_group_email':       group_email,
        'frontend_base_url':        frontend_base_url,
        'logo_url':                 LOGO_URL,
        'current_year':             datetime.now().year,
    }


def _send_email(to_email, subject, context):
    """Renders both templates and sends a single email. Returns True/False."""
    try:
        text_body = render_to_string('notifications/notification_email.txt',  context)
        html_body = render_to_string('notifications/notification_email.html', context)

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        email.attach_alternative(html_body, 'text/html')
        email.send(fail_silently=False)

        logger.info('Email sent → %s | %s', to_email, subject)
        return True

    except Exception as exc:
        logger.error(
            'Failed to send email → %s | %s | %s',
            to_email, subject, exc, exc_info=True,
        )
        return False


# ── PUBLIC API — ticket creation ──────────────────────────────────────────────

def send_reporter_confirmation(ticket) -> bool:
    """
    Email 1 — Reporter confirmation.
    Subject: Your Ticket {KEY} has been raised successfully — Assigned to {X}
    """
    recipient = ticket.reporter
    if not recipient or not recipient.email:
        return False

    assignee_label = ''
    if ticket.assigned_user:
        fn = ticket.assigned_user.first_name or ''
        ln = ticket.assigned_user.last_name  or ''
        assignee_label = f'{fn} {ln}'.strip() or ticket.assigned_user.email
    elif ticket.assigned_group:
        assignee_label = ticket.assigned_group.name

    subject = f'Your Ticket {ticket.key} has been raised successfully'
    if assignee_label:
        subject += f' — Assigned to {assignee_label}'

    recipient_name = recipient.first_name.strip() if recipient.first_name else recipient.email

    context = _build_ticket_context(ticket)
    context.update({
        'subject':           subject,
        'recipient_name':    recipient_name,
        'email_type_label':  'Ticket Raised — Confirmation',
        'email_type_colour': '#006644',
        'email_type_bg':     '#E3FCEF',
        'message': mark_safe(
            f'Your ticket <strong>{ticket.key}</strong> has been raised successfully '
            f'and assigned to <strong>{assignee_label or "the helpdesk"}</strong>. '
            f'You can track its progress at any time using the link below.'
        ),
        'is_html_message': True,
    })

    return _send_email(recipient.email, subject, context)


def send_assignee_notification(ticket) -> bool:
    """
    Email 2 — Assignee notification.
    Only sent if ticket.assigned_user is set.
    """
    if not ticket.assigned_user or not ticket.assigned_user.email:
        return False

    recipient = ticket.assigned_user
    reporter_name = ''
    if ticket.reporter:
        fn = ticket.reporter.first_name or ''
        ln = ticket.reporter.last_name  or ''
        reporter_name = f'{fn} {ln}'.strip() or ticket.reporter.email

    group_name = ticket.assigned_group.name if ticket.assigned_group else ''

    if group_name:
        subject = f'{reporter_name} — {ticket.key} has been assigned to you in {group_name}'
    else:
        subject = f'{reporter_name} — {ticket.key} has been created and assigned to you'

    recipient_name = recipient.first_name.strip() if recipient.first_name else recipient.email

    context = _build_ticket_context(ticket)
    context.update({
        'subject':           subject,
        'recipient_name':    recipient_name,
        'email_type_label':  'New Ticket — Assigned to You',
        'email_type_colour': '#0052CC',
        'email_type_bg':     '#DEEBFF',
        'message': mark_safe(
            f'A new ticket <strong>{ticket.key}</strong> has been raised by '
            f'<strong>{reporter_name}</strong> and assigned to you. '
            f'Please review the details below and take appropriate action.'
        ),
        'is_html_message': True,
    })

    return _send_email(recipient.email, subject, context)


def send_group_notification(ticket) -> bool:
    """
    Email 3 — Group inbox notification.
    Sent to the group's configured email address as a single email.
    Only sent if assigned_group has an email address configured.
    """
    group = ticket.assigned_group
    if not group or not group.email:
        logger.info(
            'Group %s has no email configured — skipping group notification.',
            group,
        )
        return False

    reporter_name = ''
    if ticket.reporter:
        fn = ticket.reporter.first_name or ''
        ln = ticket.reporter.last_name  or ''
        reporter_name = f'{fn} {ln}'.strip() or ticket.reporter.email

    if ticket.assigned_user:
        fn = ticket.assigned_user.first_name or ''
        ln = ticket.assigned_user.last_name  or ''
        assignee_name = f'{fn} {ln}'.strip() or ticket.assigned_user.email
        message = mark_safe(
            f'A new ticket <strong>{ticket.key}</strong> has been raised by '
            f'<strong>{reporter_name}</strong> for <strong>{group.name}</strong> '
            f'and assigned to <strong>{assignee_name}</strong>.'
        )
        subject = f'New Ticket {ticket.key} raised for {group.name} — Assigned to {assignee_name}'
    else:
        message = mark_safe(
            f'A new ticket <strong>{ticket.key}</strong> has been raised by '
            f'<strong>{reporter_name}</strong> for <strong>{group.name}</strong>.'
        )
        subject = f'New Ticket {ticket.key} raised for {group.name}'

    context = _build_ticket_context(ticket)
    context.update({
        'subject':           subject,
        'recipient_name':    group.name,
        'email_type_label':  'New Ticket — Group Notification',
        'email_type_colour': '#403294',
        'email_type_bg':     '#EAE6FF',
        'message':           message,
        'is_html_message':   True,
    })

    return _send_email(group.email, subject, context)


# ── PUBLIC API — generic notifications ───────────────────────────────────────

def send_notification_email(
    *,
    recipient_email: str,
    recipient_name: str,
    event_type: str,
    message: str,
    ticket_key: str,
    ticket_id: int,
    ticket_summary: str,
    ticket_status: str = '',
    assigned_to: str = '',
    ticket_priority: str = '',
) -> bool:
    """
    Generic notification email for non-creation events
    (status changes, comments, mentions, reassignments).
    Called by the process_pending_email_notifications Celery task.
    """
    frontend_base_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:5173')
    ticket_url        = f'{frontend_base_url}/tickets/{ticket_id}'
    event_label       = _EVENT_LABELS.get(event_type, event_type.replace('_', ' ').title())
    subject           = f'[{ticket_key}] {event_label} — {ticket_summary}'

    context = {
        'subject':              subject,
        'recipient_name':       recipient_name or recipient_email,
        'email_type_label':     event_label,
        'email_type_colour':    '#0052CC',
        'email_type_bg':        '#DEEBFF',
        'message':              message,
        'is_html_message':      False,
        'ticket_key':           ticket_key,
        'ticket_summary':       ticket_summary,
        'ticket_description':   '',
        'ticket_status':        ticket_status.replace('_', ' ').title() if ticket_status else '—',
        'ticket_status_value':  ticket_status or '',
        'ticket_status_colour': '#172B4D',
        'ticket_status_bg':     '#F4F5F7',
        'ticket_priority':      ticket_priority or '—',
        'ticket_priority_colour': '#5E6C84',
        'ticket_urgency':       '—',
        'ticket_urgency_value': '',
        'ticket_work_type':     '—',
        'ticket_components':    '—',
        'ticket_labels':        '—',
        'ticket_reporter':      '—',
        'ticket_reporter_initials': '',
        'ticket_reporter_avatar':   '',
        'ticket_assignee':      assigned_to or '—',
        'ticket_assignee_initials': '',
        'ticket_assignee_avatar':   '',
        'ticket_group':         '—',
        'ticket_due_date':      '—',
        'ticket_created_at':    '—',
        'ticket_updated_at':    '—',
        'ticket_attachments':   [],
        'ticket_url':           ticket_url,
        'frontend_base_url':    frontend_base_url,
        'logo_url':             LOGO_URL,
        'current_year':         datetime.now().year,
    }

    return _send_email(recipient_email, subject, context)