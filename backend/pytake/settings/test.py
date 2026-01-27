"""
Django test settings
"""
import os
from pytake.settings.base import *  # noqa

# Use test database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Email service keys (mock for tests)
SENDGRID_API_KEY = 'test-sendgrid-key'
SENDGRID_FROM_EMAIL = 'test@example.com'

# SMS service keys (mock for tests)
TWILIO_ACCOUNT_SID = 'test-twilio-account'
TWILIO_AUTH_TOKEN = 'test-twilio-token'
TWILIO_FROM_PHONE = '+1234567890'

# Payment service keys (mock for tests)
STRIPE_SECRET_KEY = 'test-stripe-key'
STRIPE_PUBLISHABLE_KEY = 'test-stripe-pub'

# MongoDB (disabled for tests)
MONGODB_URI = None
MONGODB_NAME = 'pytake_test'

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-cache',
    }
}

# Disable migrations for speed
class DisableMigrations:
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None


MIGRATION_MODULES = DisableMigrations()
