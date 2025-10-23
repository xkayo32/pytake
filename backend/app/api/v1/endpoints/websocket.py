"""
WebSocket endpoints for real-time communication
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.websocket_manager import websocket_manager
from app.core.database import async_session
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """
    WebSocket endpoint for real-time updates
    
    Connection URL: ws://localhost:8000/api/v1/ws?token=JWT_TOKEN
    
    Authentication: JWT token in query parameter
    
    Client -> Server Messages:
    {
      "action": "join_room",
      "room": "campaign:uuid"
    }
    {
      "action": "leave_room",
      "room": "campaign:uuid"
    }
    {
      "action": "ping"
    }
    
    Server -> Client Messages:
    {
      "event": "campaign:progress",
      "data": {
        "campaign_id": "uuid",
        "progress": 50.5,
        "stats": {...}
      }
    }
    {
      "event": "notification",
      "data": {
        "message": "New message received"
      }
    }
    """
    
    # Authenticate user (simplified - use proper JWT validation in production)
    user_id = None
    org_id = None
    
    if token:
        try:
            # TODO: Implement proper JWT validation
            # For now, accept any token for development
            user_id = "authenticated_user"
            org_id = "user_org"
        except Exception as e:
            logger.error(f"❌ WebSocket auth failed: {e}")
            await websocket.close(code=1008, reason="Authentication failed")
            return
    
    # Generate connection ID
    import time
    connection_id = f"{user_id or 'anonymous'}_{int(time.time() * 1000)}"
    
    # Connect
    await websocket_manager.connect(
        websocket,
        connection_id,
        metadata={
            "user_id": user_id,
            "org_id": org_id,
        }
    )
    
    try:
        # Send welcome message
        await websocket_manager.send_personal_message(
            message={
                "connection_id": connection_id,
                "message": "Connected successfully",
            },
            connection_id=connection_id,
            event="connected",
        )
        
        # Message loop
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            action = data.get("action")
            
            if action == "join_room":
                room = data.get("room")
                if room:
                    websocket_manager.join_room(connection_id, room)
                    await websocket_manager.send_personal_message(
                        message={"room": room, "status": "joined"},
                        connection_id=connection_id,
                        event="room:joined",
                    )
            
            elif action == "leave_room":
                room = data.get("room")
                if room:
                    websocket_manager.leave_room(connection_id, room)
                    await websocket_manager.send_personal_message(
                        message={"room": room, "status": "left"},
                        connection_id=connection_id,
                        event="room:left",
                    )
            
            elif action == "ping":
                await websocket_manager.send_personal_message(
                    message={"timestamp": data.get("timestamp")},
                    connection_id=connection_id,
                    event="pong",
                )
            
            elif action == "get_stats":
                stats = websocket_manager.get_stats()
                await websocket_manager.send_personal_message(
                    message=stats,
                    connection_id=connection_id,
                    event="stats",
                )
            
            else:
                logger.warning(f"⚠️ Unknown action: {action}")
    
    except WebSocketDisconnect:
        logger.info(f"📡 WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
    finally:
        websocket_manager.disconnect(connection_id)


@router.get("/ws/stats")
async def get_websocket_stats():
    """
    Get WebSocket statistics
    
    Returns:
    {
      "total_connections": 5,
      "total_rooms": 3,
      "rooms": {
        "campaign:uuid1": 2,
        "campaign:uuid2": 3
      }
    }
    """
    return websocket_manager.get_stats()
