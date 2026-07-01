"""
Notification dispatch engine.

This module is the single entry point for creating notifications and
deciding which channels should fire for each recipient, based on the
NotificationRule admin override matrix.

Usage from other apps (e.g. tickets/views.py) will look like:

    from notifications.services import dispatch_notification

    dispatch_notification(
        ticket=ticket,
        event_type='status_change',
        actor=request.user,
        from_status=old_status,   # Status instance or None
        to_status=new_status,     # Status instance or None
        message='Ticket EPOS-0001 status changed to Resolved',
    )

Phase scope (current): in-app channel only. Email/push are modelled in the
schema (NotificationDelivery.CHANNEL_CHOICES) but not yet dispatched — that
is wired in a later step once the rule-resolution logic here is proven.
"""

from django.db import transaction

from .models import Notification, NotificationDelivery, TicketInterestedParty, NotificationRule


# ── INTERESTED PARTY TRACKING ───────────────────────────────────────────────────

def add_interested_party(ticket, user, reason):
    """
    Records that `user` is interested in `ticket` for the given `reason`.
    Idempotent — calling this multiple times with the same (ticket, user,
    reason) is a no-op after the first call, thanks to the unique_together
    constraint on TicketInterestedParty.
    """
    if user is None:
        return
    TicketInterestedParty.objects.get_or_create(
        ticket=ticket,
        user=user,
        reason=reason,
    )


def get_interested_parties(ticket):
    """
    Returns a queryset of distinct User objects currently interested in
    this ticket (reporter, current/past assignees, anyone who reassigned,
    commented, or was mentioned).
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    user_ids = TicketInterestedParty.objects.filter(
        ticket=ticket
    ).values_list('user_id', flat=True).distinct()

    return User.objects.filter(id__in=user_ids)


def get_group_members(group):
    """
    Returns a queryset of active Users belonging to the given Group.
    """
    if group is None:
        return []
    return group.members.filter(is_active=True)


# ── RULE RESOLUTION ──────────────────────────────────────────────────────────────

def _rule_lookup(rules, **filters):
    """
    Helper — finds the most specific matching rule from a pre-fetched
    queryset of rules, given a dict of filter kwargs. Returns None if no
    rule matches exactly these filters.
    """
    for rule in rules:
        match = True
        for key, value in filters.items():
            if getattr(rule, key) != value:
                match = False
                break
        if match:
            return rule
    return None


def is_channel_enabled(user, channel, event_type, from_status=None, to_status=None):
    """
    Resolves whether `channel` should fire for `user` for the given
    `event_type` (and optional status transition), by checking the
    NotificationRule matrix in order of specificity:

      1. User + specific transition
      2. User + specific event_type (no transition)
      3. User, fully global
      4. Group + specific transition (for any of the user's groups)
      5. Group + specific event_type (no transition)
      6. Group, fully global
      7. No rule found → default to enabled (True)

    The first matching rule at the most specific level wins; we do not
    keep searching less-specific levels once a match is found at a more
    specific level, even if that match's `is_enabled` is False.
    """
    # 1-3: user-scoped rules for this channel
    user_rules = NotificationRule.objects.filter(
        scope='user',
        user=user,
        channel=channel,
    )

    rule = _rule_lookup(user_rules, event_type=event_type, from_status=from_status, to_status=to_status)
    if rule:
        return rule.is_enabled

    rule = _rule_lookup(user_rules, event_type=event_type, from_status=None, to_status=None)
    if rule:
        return rule.is_enabled

    rule = _rule_lookup(user_rules, event_type=None, from_status=None, to_status=None)
    if rule:
        return rule.is_enabled

    # 4-6: group-scoped rules — check every group the user belongs to
    user_group_ids = list(user.helpdesk_groups.values_list('id', flat=True))
    if user_group_ids:
        group_rules = NotificationRule.objects.filter(
            scope='group',
            group_id__in=user_group_ids,
            channel=channel,
        )

        rule = _rule_lookup(group_rules, event_type=event_type, from_status=from_status, to_status=to_status)
        if rule:
            return rule.is_enabled

        rule = _rule_lookup(group_rules, event_type=event_type, from_status=None, to_status=None)
        if rule:
            return rule.is_enabled

        rule = _rule_lookup(group_rules, event_type=None, from_status=None, to_status=None)
        if rule:
            return rule.is_enabled

    # 7: no rule anywhere — default to enabled
    return True


# ── DISPATCH ──────────────────────────────────────────────────────────────────

@transaction.atomic
def dispatch_notification(ticket, event_type, message, recipients=None,
                           from_status=None, to_status=None, exclude_user=None):
    """
    Creates Notification rows for the given recipients (or, if `recipients`
    is None, for all current interested parties on the ticket), and creates
    a NotificationDelivery row for each channel that resolves as enabled
    for that recipient.

    Args:
        ticket:        Ticket instance this notification relates to.
        event_type:    One of Notification.TYPE_CHOICES values.
        message:       Human-readable notification text.
        recipients:    Optional iterable of User instances. If omitted,
                        defaults to get_interested_parties(ticket).
        from_status:   Optional Status instance (for status_change events).
        to_status:      Optional Status instance (for status_change events).
        exclude_user:  Optional User to skip (e.g. don't notify the actor
                        about their own action).

    Returns:
        List of created Notification instances.
    """
    if recipients is None:
        recipients = get_interested_parties(ticket)

    created_notifications = []

    for user in recipients:
        if exclude_user is not None and user.pk == exclude_user.pk:
            continue

        notification = Notification.objects.create(
            recipient=user,
            type=event_type,
            ticket=ticket,
            message=message,
        )
        created_notifications.append(notification)

        # In-app channel — always create the delivery row immediately and
        # mark as sent, since the Notification row itself IS the in-app
        # delivery (the bell dropdown reads Notification directly).
        if is_channel_enabled(user, 'in_app', event_type, from_status, to_status):
            NotificationDelivery.objects.create(
                notification=notification,
                channel='in_app',
                status='sent',
            )

        # Email channel — schema/resolution logic is wired now, but actual
        # sending is implemented in a later step. For now we record a
        # 'pending' delivery row only when the channel resolves as enabled,
        # so we have an accurate backlog to process once email sending is
        # implemented (no behavioural change to the in-app experience).
        if is_channel_enabled(user, 'email', event_type, from_status, to_status):
            NotificationDelivery.objects.create(
                notification=notification,
                channel='email',
                status='pending',
            )

        # Push channel — not yet wired to a real provider. We still record
        # the resolution outcome for forward-compatibility, but as 'skipped'
        # since there is no delivery mechanism to attempt yet.
        if is_channel_enabled(user, 'push', event_type, from_status, to_status):
            NotificationDelivery.objects.create(
                notification=notification,
                channel='push',
                status='skipped',
            )

    return created_notifications