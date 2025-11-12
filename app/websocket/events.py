"""
WebSocket Event Handlers
"""

import logging
from typing import Optional
from uuid import UUID
from .manager import sio

logger = logging.getLogger(__name__)


@sio.event
async def join_conversation(sid, data):
    """
    Join a conversation room to receive real-time updates

    Args:
        data: {"conversation_id": "uuid"}
    """
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            await sio.emit('error', {
                'message': 'conversation_id is required'
            }, room=sid)
            return

        # Validate UUID
        try:
            UUID(conversation_id)
        except ValueError:
            await sio.emit('error', {
                'message': 'Invalid conversation_id format'
            }, room=sid)
            return

        # Get user info from session
        async with sio.session(sid) as session:
            user_id = session.get('user_id')
            organization_id = session.get('organization_id')

        if not user_id or not organization_id:
            await sio.emit('error', {
                'message': 'Not authenticated'
            }, room=sid)
            return

        # Join conversation room
        room = f"conversation:{conversation_id}"
        await sio.enter_room(sid, room)

        logger.info(f"Client {sid} (user {user_id}) joined room {room}")

        # Confirm join
        await sio.emit('joined_conversation', {
            'conversation_id': conversation_id,
            'message': f'Joined conversation {conversation_id}'
        }, room=sid)

    except Exception as e:
        logger.error(f"Error in join_conversation: {e}")
        await sio.emit('error', {
            'message': 'Failed to join conversation'
        }, room=sid)


@sio.event
async def leave_conversation(sid, data):
    """
    Leave a conversation room

    Args:
        data: {"conversation_id": "uuid"}
    """
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return

        room = f"conversation:{conversation_id}"
        await sio.leave_room(sid, room)

        logger.info(f"Client {sid} left room {room}")

        await sio.emit('left_conversation', {
            'conversation_id': conversation_id
        }, room=sid)

    except Exception as e:
        logger.error(f"Error in leave_conversation: {e}")


@sio.event
async def typing_start(sid, data):
    """
    User started typing in a conversation

    Args:
        data: {"conversation_id": "uuid"}
    """
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return

        # Get user info
        async with sio.session(sid) as session:
            user_id = session.get('user_id')

        if not user_id:
            return

        # Broadcast to conversation room (except sender)
        room = f"conversation:{conversation_id}"
        await sio.emit('user_typing', {
            'conversation_id': conversation_id,
            'user_id': user_id,
            'typing': True
        }, room=room, skip_sid=sid)

        logger.debug(f"User {user_id} started typing in {conversation_id}")

    except Exception as e:
        logger.error(f"Error in typing_start: {e}")


@sio.event
async def typing_stop(sid, data):
    """
    User stopped typing in a conversation

    Args:
        data: {"conversation_id": "uuid"}
    """
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return

        # Get user info
        async with sio.session(sid) as session:
            user_id = session.get('user_id')

        if not user_id:
            return

        # Broadcast to conversation room (except sender)
        room = f"conversation:{conversation_id}"
        await sio.emit('user_typing', {
            'conversation_id': conversation_id,
            'user_id': user_id,
            'typing': False
        }, room=room, skip_sid=sid)

        logger.debug(f"User {user_id} stopped typing in {conversation_id}")

    except Exception as e:
        logger.error(f"Error in typing_stop: {e}")


@sio.event
async def ping(sid):
    """Ping event for connection testing"""
    await sio.emit('pong', {'timestamp': 'now'}, room=sid)
