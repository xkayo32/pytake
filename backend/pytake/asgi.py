"""
ASGI config for pytake project.
Supports both HTTP and WebSocket connections via Django Channels.
"""

import os
from django.core.asgi import get_asgi_application

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pytake.settings')

# Initialize Django ASGI application early
django_asgi_app = get_asgi_application()

# Import ProtocolTypeRouter and routing after Django setup
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# Import routing configuration
from pytake.asgi_routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
