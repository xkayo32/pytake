"""
Management command to create default system roles
"""
from django.core.management.base import BaseCommand
from apps.rbac.models import Role


class Command(BaseCommand):
    help = 'Create default system roles'

    def handle(self, *args, **options):
        roles_data = [
            {
                'name': 'Super Admin',
                'slug': 'super-admin',
                'description': 'Full system access',
                'permissions': ['*'],
                'is_system_role': True,
                'is_default': False,
            },
            {
                'name': 'Admin',
                'slug': 'admin',
                'description': 'Organization admin',
                'permissions': [
                    'conversations:view', 'conversations:manage', 'conversations:supervise',
                    'contacts:view', 'contacts:manage',
                    'agents:view', 'agents:manage',
                    'analytics:view',
                    'settings:view', 'settings:manage',
                    'templates:view', 'templates:manage',
                    'campaigns:view', 'campaigns:manage',
                ],
                'is_system_role': True,
                'is_default': True,
            },
            {
                'name': 'Agente',
                'slug': 'agent',
                'description': 'Agent/operator',
                'permissions': [
                    'conversations:view', 'conversations:manage',
                    'contacts:view', 'contacts:manage',
                    'analytics:view',
                ],
                'is_system_role': True,
                'is_default': False,
            },
            {
                'name': 'Visualizador',
                'slug': 'viewer',
                'description': 'Read-only viewer',
                'permissions': [
                    'conversations:view',
                    'contacts:view',
                    'analytics:view',
                ],
                'is_system_role': True,
                'is_default': False,
            },
        ]

        for role_data in roles_data:
            role, created = Role.objects.get_or_create(
                slug=role_data['slug'],
                organization=None,  # System role
                defaults=role_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created role: {role.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Role already exists: {role.name}')
                )
        
        self.stdout.write(self.style.SUCCESS('System roles initialized'))
