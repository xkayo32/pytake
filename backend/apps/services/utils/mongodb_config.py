"""
MongoDB Configuration for Django Settings

Add to settings.py:
    from apps.services.utils.mongodb_config import MONGODB_CONFIG
"""
import os
from django.conf import settings

# MongoDB Configuration
MONGODB_URI = os.getenv(
    'MONGODB_URI',
    'mongodb://localhost:27017'
)

MONGODB_DB = os.getenv('MONGODB_DB', 'pytake_logs')

MONGODB_CONFIG = {
    'URI': MONGODB_URI,
    'DB': MONGODB_DB,
    'TIMEOUT': 5000,  # Connection timeout in ms
    'MAX_POOL_SIZE': 50,
    'MIN_POOL_SIZE': 10,
}

# MongoDB Collections Configuration
MONGODB_COLLECTIONS = {
    'message_logs': {
        'description': 'All WhatsApp messages and communication logs',
        'ttl': 90,  # Days to keep data
        'indexes': [
            ('organization_id', 1),
            ('created_at', -1),
            ('conversation_id', 1),
        ],
    },
    'audit_logs': {
        'description': 'User actions and compliance logs',
        'ttl': 365,  # 1 year for compliance
        'indexes': [
            ('organization_id', 1),
            ('user_id', 1),
            ('created_at', -1),
            ('action', 1),
        ],
    },
    'analytics': {
        'description': 'Metrics and analytics data',
        'ttl': 180,  # 6 months
        'indexes': [
            ('organization_id', 1),
            ('metric_type', 1),
            ('date', -1),
        ],
    },
    'events': {
        'description': 'Event sourcing for audit trail',
        'ttl': 365,  # 1 year
        'indexes': [
            ('organization_id', 1),
            ('event_type', 1),
            ('created_at', -1),
        ],
    },
}
