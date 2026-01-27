"""
PyTake - Django Settings (Development)
"""
from .base import *

# Debug mode
DEBUG = True

# Security - relaxed for development
ALLOWED_HOSTS = ['*']

# CORS - allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True

# Database - use development database
DATABASES['default']['NAME'] = os.getenv('POSTGRES_DB', 'pytake_dev')

# Logging - more verbose in development
LOGGING['root']['level'] = 'DEBUG'
LOGGING['loggers']['pytake']['level'] = 'DEBUG'

# Django Debug Toolbar (optional, install if needed)
# INSTALLED_APPS += ['debug_toolbar']
# MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
# INTERNAL_IPS = ['127.0.0.1']

print("🚀 [Django] Development settings loaded")
