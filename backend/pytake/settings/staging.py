"""
PyTake - Django Settings (Staging)
"""
from .production import *

# Similar to production but with debugging enabled
DEBUG = False
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'staging.pytake.net,api-staging.pytake.net').split(',')

# Slightly relaxed CORS for testing
CORS_ALLOWED_ORIGINS += ['http://localhost:3000', 'http://localhost:5173']

# More verbose logging than production
LOGGING['root']['level'] = 'INFO'
LOGGING['loggers']['pytake']['level'] = 'DEBUG'

print("🔧 [Django] Staging settings loaded")
