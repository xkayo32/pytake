"""
Django management command to create an admin user with organization
"""
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify
from apps.authentication.models import User
from apps.organizations.models import Organization
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Create an admin user with associated organization"""

    help = 'Create an admin user with organization'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='User email')
        parser.add_argument('--password', type=str, required=True, help='User password')
        parser.add_argument('--org-name', type=str, required=True, help='Organization name')
        parser.add_argument('--role', type=str, default='super_admin', help='User role (default: super_admin)')
        parser.add_argument('--full-name', type=str, help='User full name')

    def handle(self, *args, **options):
        """Execute user creation"""
        try:
            email = options['email']
            password = options['password']
            org_name = options['org_name']
            role = options['role']
            full_name = options.get('full_name') or org_name

            # Check if user already exists
            if User.objects.filter(email=email).exists():
                raise CommandError(f'❌ User with email {email} already exists')

            # Create or get organization
            org_slug = slugify(org_name)
            org, created = Organization.objects.get_or_create(
                slug=org_slug,
                defaults={
                    'name': org_name,
                    'plan_type': 'enterprise',
                    'is_active': True,
                }
            )

            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Organization created: {org_name} (slug: {org_slug})')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'⚠️  Using existing organization: {org_name}')
                )

            # Create user
            user = User.objects.create_superuser(
                email=email,
                password=password,
                organization=org,
                full_name=full_name,
                role=role,
            )

            self.stdout.write(
                self.style.SUCCESS(f'✅ User created successfully!')
            )
            self.stdout.write(
                self.style.SUCCESS(f'   Email: {user.email}')
            )
            self.stdout.write(
                self.style.SUCCESS(f'   Organization: {org.name}')
            )
            self.stdout.write(
                self.style.SUCCESS(f'   Role: {user.role}')
            )
            self.stdout.write(
                self.style.SUCCESS(f'   User ID: {user.id}')
            )
            self.stdout.write(
                self.style.SUCCESS(f'   Org ID: {org.id}')
            )

        except CommandError as e:
            self.stdout.write(self.style.ERROR(str(e)))
            raise
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
            logger.exception('Error creating admin user')
            raise CommandError(f'Error creating admin user: {e}')
