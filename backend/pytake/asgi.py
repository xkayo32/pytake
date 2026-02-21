"""
ASGI config for pytake project.
Supports both HTTP, WebSocket (Django Channels), and Socket.IO connections.
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

# Try to import Socket.IO app
try:
    from apps.webhooks.socketio import socketio_app
    HAS_SOCKETIO = socketio_app is not None
except ImportError:
    HAS_SOCKETIO = False
    socketio_app = None


# Custom router to handle Socket.IO paths
class PathRouter:
    """
    Routes requests to different ASGI apps based on path prefix.
    Socket.IO requests go to socketio_app, others go to Django.
    """
    def __init__(self, socketio_app, django_app):
        self.socketio_app = socketio_app
        self.django_app = django_app

    async def __call__(self, scope, receive, send):
        # Check if this is a Socket.IO request
        if scope['type'] in ['http', 'websocket']:
            path = scope.get('path', '')
            if path.startswith('/socket.io/') and HAS_SOCKETIO:
                # Route to Socket.IO
                return await self.socketio_app(scope, receive, send)

        # Route to Django (includes Django Channels WebSocket)
        return await self.django_app(scope, receive, send)


# Create the main application router
if HAS_SOCKETIO:
    # Use PathRouter to handle both Socket.IO and Django
    django_channels_app = ProtocolTypeRouter({
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        ),
    })

    application = PathRouter(socketio_app, django_channels_app)
else:
    # Fallback to Django Channels only
    application = ProtocolTypeRouter({
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        ),
    })
