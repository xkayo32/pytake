"""
WebSocket routing configuration
"""
from django.urls import re_path
from apps.conversations.consumers import ChatConsumer
from apps.webhooks.consumers import SocketIOConsumer

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<conversation_id>[0-9a-f-]+)/$', ChatConsumer.as_asgi()),
    # Socket.IO compatibility endpoint
    re_path(r'socket\.io/$', SocketIOConsumer.as_asgi()),
]
