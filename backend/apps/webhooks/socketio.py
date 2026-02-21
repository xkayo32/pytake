"""
Socket.IO server for real-time communication

Note: This requires python-socketio to be installed
Installation: pip install python-socketio
"""
import socketio
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Create a Socket.IO server
try:
    # Create Socket.IO server with ASGI support
    sio = socketio.AsyncServer(
        async_mode='asgi',
        cors_allowed_origins='*',  # In production, specify exact origins
        logger=True,
        engineio_logger=True,
        ping_timeout=60,
        ping_interval=25
    )

    # Create ASGI app for Socket.IO
    socketio_app = socketio.ASGIApp(
        sio,
        socketio_path='socket.io'
    )

    @sio.event
    async def connect(sid, environ):
        """Handle client connection"""
        logger.info(f"[Socket.IO] Client connected: {sid}")
        await sio.emit('connected', {'sid': sid}, room=sid)

    @sio.event
    async def disconnect(sid):
        """Handle client disconnection"""
        logger.info(f"[Socket.IO] Client disconnected: {sid}")

    @sio.event
    async def message(sid, data):
        """Handle incoming messages"""
        logger.info(f"[Socket.IO] Message from {sid}: {data}")
        await sio.emit('message', data, room=sid)

    @sio.event
    async def join_room(sid, data):
        """Join a specific room (e.g., conversation, organization)"""
        room = data.get('room')
        if room:
            sio.enter_room(sid, room)
            logger.info(f"[Socket.IO] Client {sid} joined room: {room}")
            await sio.emit('joined_room', {'room': room}, room=sid)

    @sio.event
    async def leave_room(sid, data):
        """Leave a specific room"""
        room = data.get('room')
        if room:
            sio.leave_room(sid, room)
            logger.info(f"[Socket.IO] Client {sid} left room: {room}")
            await sio.emit('left_room', {'room': room}, room=sid)

    logger.info("[Socket.IO] Socket.IO server initialized successfully")

except ImportError:
    logger.error("[Socket.IO] python-socketio not installed. Install with: pip install python-socketio")
    # Fallback to simple HTTP endpoint
    from django.http import HttpResponse
    from django.views.decorators.csrf import csrf_exempt
    import json

    @csrf_exempt
    def socketio_endpoint(request):
        """Fallback HTTP endpoint when python-socketio is not installed"""
        return HttpResponse(
            json.dumps({
                "error": "Socket.IO server not available",
                "message": "Install python-socketio: pip install python-socketio"
            }),
            content_type='application/json',
            status=503
        )

    socketio_app = None
    sio = None


# Django view fallback for regular HTTP requests
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
def socketio_endpoint(request):
    """
    HTTP fallback endpoint
    This is used when the request doesn't upgrade to WebSocket
    """
    if sio is None:
        return HttpResponse(
            json.dumps({
                "error": "Socket.IO server not available",
                "message": "Install python-socketio: pip install python-socketio"
            }),
            content_type='application/json',
            status=503
        )

    return HttpResponse(
        json.dumps({
            "status": "ok",
            "message": "Socket.IO server is running. Connect via WebSocket."
        }),
        content_type='application/json',
        status=200
    )
