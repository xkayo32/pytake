"""
Socket.IO Manager - Real-time WebSocket communication
"""

import socketio
from typing import Optional
import logging
from jose import jwt, JWTError
from app.core.config import settings

logger = logging.getLogger(__name__)

# Create Socket.IO server with async mode
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',  # Configure properly for production
    logger=True,
    engineio_logger=False
)

# Create ASGI app
sio_app = socketio.ASGIApp(
    sio,
    socketio_path='socket.io'
)


def get_sio_app():
    """Get Socket.IO ASGI app"""
    return sio_app


async def verify_token(token: str) -> Optional[dict]:
    """
    Verify JWT token and return payload

    Args:
        token: JWT access token

    Returns:
        Token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as e:
        logger.error(f"JWT verification failed: {e}")
        return None


@sio.event
async def connect(sid, environ, auth):
    """
    Handle client connection

    Authentication via token in auth dict
    """
    logger.info(f"Client connecting: {sid}")

    # Get token from auth
    if not auth or 'token' not in auth:
        logger.warning(f"Client {sid} connection rejected: No token provided")
        return False

    token = auth['token']

    # Verify token
    payload = await verify_token(token)
    if not payload:
        logger.warning(f"Client {sid} connection rejected: Invalid token")
        return False

    # Store user info in session
    user_id = payload.get('sub')
    organization_id = payload.get('organization_id')
    role = payload.get('role')

    async with sio.session(sid) as session:
        session['user_id'] = user_id
        session['organization_id'] = organization_id
        session['role'] = role

    logger.info(f"Client {sid} connected successfully. User: {user_id}, Org: {organization_id}")

    # Join organization room to receive org-wide updates
    org_room = f"organization:{organization_id}"
    await sio.enter_room(sid, org_room)

    # Emit welcome message
    await sio.emit('connected', {
        'message': 'Connected to PyTake WebSocket',
        'user_id': user_id
    }, room=sid)

    # Broadcast user status to organization
    await sio.emit('user:status', {
        'user_id': user_id,
        'status': 'online'
    }, room=org_room, skip_sid=sid)

    return True


@sio.event
async def disconnect(sid):
    """Handle client disconnect"""
    logger.info(f"Client disconnected: {sid}")

    # Get user info before session is cleared
    async with sio.session(sid) as session:
        user_id = session.get('user_id')
        organization_id = session.get('organization_id')

    # Broadcast user status to organization if user was authenticated
    if user_id and organization_id:
        org_room = f"organization:{organization_id}"
        await sio.emit('user:status', {
            'user_id': user_id,
            'status': 'offline'
        }, room=org_room)

    # Leave all rooms
    rooms = sio.rooms(sid)
    for room in rooms:
        if room != sid:  # Don't leave own room
            await sio.leave_room(sid, room)
            logger.info(f"Client {sid} left room {room}")


async def emit_to_conversation(conversation_id: str, event: str, data: dict, exclude_sid: Optional[str] = None):
    """
    Emit event to all users in a conversation room

    Args:
        conversation_id: Conversation ID (room name)
        event: Event name
        data: Event data
        exclude_sid: Socket ID to exclude from emission (e.g., sender)
    """
    room = f"conversation:{conversation_id}"
    await sio.emit(event, data, room=room, skip_sid=exclude_sid)
    logger.info(f"Emitted {event} to room {room}")


async def emit_to_user(user_id: str, event: str, data: dict):
    """
    Emit event to a specific user

    Args:
        user_id: User ID
        event: Event name
        data: Event data
    """
    room = f"user:{user_id}"
    await sio.emit(event, data, room=room)
    logger.info(f"Emitted {event} to user {user_id}")


async def emit_to_organization(organization_id: str, event: str, data: dict):
    """
    Emit event to all users in an organization

    Args:
        organization_id: Organization ID
        event: Event name
        data: Event data
    """
    room = f"organization:{organization_id}"
    await sio.emit(event, data, room=room)
    logger.info(f"Emitted {event} to organization {organization_id}")


async def update_unread_count(conversation_id: str, user_id: str, unread_count: int):
    """
    Update unread count for a specific conversation

    Args:
        conversation_id: Conversation ID
        user_id: User ID to send update to
        unread_count: New unread count
    """
    await emit_to_user(user_id, 'conversation:unread_update', {
        'conversation_id': conversation_id,
        'unread_count': unread_count
    })
