from django.core.management.base import BaseCommand
from departments.models import Group


class Command(BaseCommand):
    help = 'Seeds the 9 default Chester Racecourse groups into the database'

    def handle(self, *args, **options):
        groups = [
            {
                'name':        'Staffing',
                'prefix':      'SF',
                'email':       'staffing@chester-races.com',
                'description': 'Rota queries, HR requests, new starters, contract or leave issues.',
                'icon':        '👥',
                'order':       1,
            },
            {
                'name':        'IT & Networks',
                'prefix':      'IT',
                'email':       'it-networks@chester-races.com',
                'description': 'Wi-Fi issues, VPN access, network drives, internet connectivity.',
                'icon':        '🌐',
                'order':       2,
            },
            {
                'name':        'EPOS & IT',
                'prefix':      'EPOS',
                'email':       'epos@chester-races.com',
                'description': 'Till system issues, EPOS errors, payment terminal problems.',
                'icon':        '🖥️',
                'order':       3,
            },
            {
                'name':        'Stock',
                'prefix':      'ST',
                'email':       'stock@chester-races.com',
                'description': 'Stock queries, delivery discrepancies, inventory management.',
                'icon':        '📦',
                'order':       4,
            },
            {
                'name':        'Cellar',
                'prefix':      'CR',
                'email':       'cellar@chester-races.com',
                'description': 'Cellar equipment, beer line issues, temperature or storage problems.',
                'icon':        '🍺',
                'order':       5,
            },
            {
                'name':        'Finance',
                'prefix':      'FN',
                'email':       'finance@chester-races.com',
                'description': 'Invoices, expenses, payroll queries, financial reporting issues.',
                'icon':        '💰',
                'order':       6,
            },
            {
                'name':        'Operations',
                'prefix':      'OPS',
                'email':       'operations@chester-races.com',
                'description': 'General operations, facilities, maintenance and site-related issues.',
                'icon':        '⚙️',
                'order':       7,
            },
            {
                'name':        'General',
                'prefix':      'CRC',
                'email':       'general@chester-races.com',
                'description': 'Any other queries not covered by the above departments.',
                'icon':        '💬',
                'order':       8,
            },
            {
                'name':        'Culinary',
                'prefix':      'CL',
                'email':       'culinary@chester-races.com',
                'description': 'Kitchen, catering, food service and culinary-related issues.',
                'icon':        '🍽️',
                'order':       9,
            },
        ]

        created_count = 0
        updated_count = 0

        for group_data in groups:
            group, created = Group.objects.update_or_create(
                prefix=group_data['prefix'],
                defaults={
                    'name':        group_data['name'],
                    'email':       group_data['email'],
                    'description': group_data['description'],
                    'icon':        group_data['icon'],
                    'order':       group_data['order'],
                    'is_active':   True,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(
                    f'  ✓ Created: {group_data["order"]}. {group.name} ({group.prefix})'
                ))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(
                    f'  ~ Updated: {group_data["order"]}. {group.name} ({group.prefix})'
                ))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done. {created_count} created, {updated_count} updated.'
        ))