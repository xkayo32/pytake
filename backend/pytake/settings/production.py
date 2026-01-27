"""
PyTake - Django Settings (Production)
"""
from .base import *

# Security
DEBUG = False
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'api.pytake.net,pytake.net').split(',')

# HTTPS/Security settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CORS - only specific origins in production
CORS_ALLOW_ALL_ORIGINS = False

# Logging - production level
LOGGING['root']['level'] = 'WARNING'
LOGGING['loggers']['pytake']['level'] = 'INFO'
LOGGING['loggers']['django']['level'] = 'WARNING'

# Static files - use WhiteNoise or CDN in production
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

print("🔒 [Django] Production settings loaded")
