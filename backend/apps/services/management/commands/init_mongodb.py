"""
Django management command to initialize MongoDB
"""
from django.core.management.base import BaseCommand
from apps.services.utils.mongodb import get_mongo_client
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Initialize MongoDB collections and indexes"""

    help = 'Initialize MongoDB collections and indexes'

    def handle(self, *args, **options):
        """Execute MongoDB initialization"""
        try:
            mongo = get_mongo_client()
            self.stdout.write(self.style.SUCCESS('✅ MongoDB connected successfully'))

            # Create indexes
            mongo.create_indexes()
            self.stdout.write(self.style.SUCCESS('✅ MongoDB indexes created'))

            # Check collections
            collections = mongo.db.list_collection_names()
            self.stdout.write(self.style.SUCCESS(f'✅ Collections: {", ".join(collections)}'))

            self.stdout.write(
                self.style.SUCCESS('✅ MongoDB initialization complete!')
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
