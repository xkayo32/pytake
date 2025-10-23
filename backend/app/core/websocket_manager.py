"""
WebSocket Manager - Real-time communication with frontend

Provides:
- Connection management
- Room-based broadcasting (campaign rooms, organization rooms)
- Event-based messaging
- Automatic reconnection handling

Usage:
```python
from app.core.websocket_manager import websocket_manager

# Broadcast to all users in a campaign room
await websocket_manager.broadcast_to_room(
    room=f"campaign:{campaign_id}",
    message={"progress": 50, "stats": {...}},
    event="campaign:progress"
)

# Broadcast to all users in organization
await websocket_manager.broadcast_to_room(
    room=f"org:{org_id}",
    message={"notification": "New message"},
    event="notification"
)
```
"""

import logging
from typing import Dict, Set, Any, Optional
from collections import defaultdict
import json

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections and broadcasts
    
    Features:
    - Connection pooling
    - Room-based broadcasting
    - Event typing
    - Automatic cleanup on disconnect
    """
    
    def __init__(self):
        # Active connections: {connection_id: WebSocket}
        self.active_connections: Dict[str, WebSocket] = {}
        
        # Room subscriptions: {room_name: Set[connection_id]}
        self.rooms: Dict[str, Set[str]] = defaultdict(set)
        
        # Connection metadata: {connection_id: {user_id, org_id, ...}}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
    
    async def connect(
        self,
        websocket: WebSocket,
        connection_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Accept WebSocket connection and store metadata
        
        Args:
            websocket: FastAPI WebSocket instance
            connection_id: Unique connection ID (e.g., user_id + timestamp)
            metadata: Optional metadata (user_id, organization_id, etc.)
        """
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        
        if metadata:
            self.connection_metadata[connection_id] = metadata
        
        logger.info(
            f"✅ WebSocket connected: {connection_id} "
            f"(total: {len(self.active_connections)})"
        )
    
    def disconnect(self, connection_id: str) -> None:
        """
        Remove connection and clean up room subscriptions
        
        Args:
            connection_id: Connection ID to disconnect
        """
        # Remove from active connections
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        # Remove from all rooms
        for room_name, connections in self.rooms.items():
            connections.discard(connection_id)
        
        # Remove empty rooms
        self.rooms = {
            room: conns for room, conns in self.rooms.items() if conns
        }
        
        # Remove metadata
        if connection_id in self.connection_metadata:
            del self.connection_metadata[connection_id]
        
        logger.info(
            f"❌ WebSocket disconnected: {connection_id} "
            f"(remaining: {len(self.active_connections)})"
        )
    
    def join_room(self, connection_id: str, room: str) -> None:
        """
        Subscribe connection to a room
        
        Args:
            connection_id: Connection ID
            room: Room name (e.g., "campaign:uuid", "org:uuid")
        """
        self.rooms[room].add(connection_id)
        logger.info(f"📥 {connection_id} joined room: {room}")
    
    def leave_room(self, connection_id: str, room: str) -> None:
        """
        Unsubscribe connection from a room
        
        Args:
            connection_id: Connection ID
            room: Room name
        """
        if room in self.rooms:
            self.rooms[room].discard(connection_id)
        logger.info(f"📤 {connection_id} left room: {room}")
    
    async def send_personal_message(
        self,
        message: Any,
        connection_id: str,
        event: str = "message",
    ) -> None:
        """
        Send message to specific connection
        
        Args:
            message: Message payload (dict or str)
            connection_id: Target connection ID
            event: Event type (for frontend routing)
        """
        websocket = self.active_connections.get(connection_id)
        
        if websocket:
            try:
                payload = {
                    "event": event,
                    "data": message,
                }
                await websocket.send_json(payload)
                logger.debug(f"📨 Sent to {connection_id}: {event}")
            except Exception as e:
                logger.error(
                    f"❌ Error sending to {connection_id}: {e}"
                )
                self.disconnect(connection_id)
    
    async def broadcast_to_room(
        self,
        room: str,
        message: Any,
        event: str = "message",
        exclude: Optional[str] = None,
    ) -> None:
        """
        Broadcast message to all connections in a room
        
        Args:
            room: Room name
            message: Message payload
            event: Event type
            exclude: Optional connection_id to exclude from broadcast
        """
        connections = self.rooms.get(room, set())
        
        if not connections:
            logger.debug(f"📭 No connections in room: {room}")
            return
        
        payload = {
            "event": event,
            "data": message,
        }
        
        disconnected = []
        sent_count = 0
        
        for connection_id in connections:
            if exclude and connection_id == exclude:
                continue
            
            websocket = self.active_connections.get(connection_id)
            
            if websocket:
                try:
                    await websocket.send_json(payload)
                    sent_count += 1
                except Exception as e:
                    logger.error(
                        f"❌ Error sending to {connection_id}: {e}"
                    )
                    disconnected.append(connection_id)
        
        # Clean up disconnected connections
        for connection_id in disconnected:
            self.disconnect(connection_id)
        
        logger.info(
            f"📡 Broadcast to room '{room}': "
            f"{sent_count} recipients, event='{event}'"
        )
    
    async def broadcast_to_all(
        self,
        message: Any,
        event: str = "message",
    ) -> None:
        """
        Broadcast message to all active connections
        
        Args:
            message: Message payload
            event: Event type
        """
        payload = {
            "event": event,
            "data": message,
        }
        
        disconnected = []
        sent_count = 0
        
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(payload)
                sent_count += 1
            except Exception as e:
                logger.error(
                    f"❌ Error sending to {connection_id}: {e}"
                )
                disconnected.append(connection_id)
        
        # Clean up disconnected connections
        for connection_id in disconnected:
            self.disconnect(connection_id)
        
        logger.info(
            f"📡 Broadcast to all: {sent_count} recipients, event='{event}'"
        )
    
    def get_room_size(self, room: str) -> int:
        """
        Get number of connections in a room
        
        Args:
            room: Room name
            
        Returns:
            Number of active connections in room
        """
        return len(self.rooms.get(room, set()))
    
    def get_connection_rooms(self, connection_id: str) -> Set[str]:
        """
        Get all rooms a connection is subscribed to
        
        Args:
            connection_id: Connection ID
            
        Returns:
            Set of room names
        """
        return {
            room for room, connections in self.rooms.items()
            if connection_id in connections
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get WebSocket manager statistics
        
        Returns:
            Dict with stats (total connections, rooms, etc.)
        """
        return {
            "total_connections": len(self.active_connections),
            "total_rooms": len(self.rooms),
            "rooms": {
                room: len(connections)
                for room, connections in self.rooms.items()
            }
        }


# Global singleton instance
websocket_manager = WebSocketManager()
