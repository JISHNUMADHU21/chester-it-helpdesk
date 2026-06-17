from django.core.management.base import BaseCommand
from configuration.models import Status, Priority, Urgency, WorkType


class Command(BaseCommand):
    help = 'Seeds default Status, Priority, Urgency, and WorkType records'

    def handle(self, *args, **kwargs):

        # ── STATUSES ──────────────────────────────────────────────────────────
        statuses = [
            dict(name='Pending',     slug='pending',     colour_hex='#FFFAE6', text_colour='#974F0C', order=1, is_default=True),
            dict(name='In Progress', slug='in_progress', colour_hex='#DEEBFF', text_colour='#0747A6', order=2),
            dict(name='Escalated',   slug='escalated',   colour_hex='#FFF0E0', text_colour='#974F0C', order=3),
            dict(name='Resolved',    slug='resolved',    colour_hex='#E3FCEF', text_colour='#006644', order=4),
            dict(name='Cancelled',   slug='cancelled',   colour_hex='#FFEBE6', text_colour='#BF2600', order=5),
            dict(name='Reopened',    slug='reopened',    colour_hex='#F1F2F4', text_colour='#5E6C84', order=6),
        ]
        for s in statuses:
            obj, created = Status.objects.get_or_create(slug=s['slug'], defaults=s)
            self.stdout.write(f"  {'Created' if created else 'Exists '} Status: {obj.name}")

        # ── PRIORITIES ────────────────────────────────────────────────────────
        priorities = [
            dict(name='Highest', slug='highest', colour_hex='#E2483D', icon='⬆⬆', level=1),
            dict(name='High',    slug='high',    colour_hex='#E2483D', icon='⬆',  level=2),
            dict(name='Medium',  slug='medium',  colour_hex='#E97F33', icon='▶',  level=3, is_default=True),
            dict(name='Low',     slug='low',     colour_hex='#4C9AFF', icon='⬇',  level=4),
            dict(name='Lowest',  slug='lowest',  colour_hex='#4C9AFF', icon='⬇⬇', level=5),
        ]
        for p in priorities:
            obj, created = Priority.objects.get_or_create(slug=p['slug'], defaults=p)
            self.stdout.write(f"  {'Created' if created else 'Exists '} Priority: {obj.name}")

        # ── URGENCIES ─────────────────────────────────────────────────────────
        urgencies = [
            dict(name='Critical', slug='critical', colour_hex='#FFEBE6', text_colour='#BF2600', border_hex='#FF8F73', description='Operations at risk — immediate action required',  order=1),
            dict(name='High',     slug='high',     colour_hex='#FFF0E0', text_colour='#974F0C', border_hex='#FFB900', description='Major disruption — urgent attention needed',        order=2),
            dict(name='Medium',   slug='medium',   colour_hex='#FFFAE6', text_colour='#7A5200', border_hex='#FFD700', description='Partial disruption — address within the day',       order=3),
            dict(name='Low',      slug='low',      colour_hex='#E3FCEF', text_colour='#006644', border_hex='#ABF5D1', description='Minor inconvenience — address when possible',        order=4),
        ]
        for u in urgencies:
            obj, created = Urgency.objects.get_or_create(slug=u['slug'], defaults=u)
            self.stdout.write(f"  {'Created' if created else 'Exists '} Urgency: {obj.name}")

        # ── WORK TYPES ────────────────────────────────────────────────────────
        work_types = [
            dict(name='Service Request', slug='service_request', icon='☑',  description='A request for something new or a standard change.',         order=1, is_default=True),
            dict(name='Incident',        slug='incident',        icon='⚠️', description='An unplanned interruption or reduction in service quality.', order=2),
            dict(name='Problem',         slug='problem',         icon='🔴', description='The underlying cause of one or more incidents.',             order=3),
            dict(name='Change Request',  slug='change_request',  icon='🔄', description='A request to alter a service, system or process.',           order=4),
        ]
        for w in work_types:
            obj, created = WorkType.objects.get_or_create(slug=w['slug'], defaults=w)
            self.stdout.write(f"  {'Created' if created else 'Exists '} WorkType: {obj.name}")

        self.stdout.write(self.style.SUCCESS('\n✅ Configuration seeded successfully.'))