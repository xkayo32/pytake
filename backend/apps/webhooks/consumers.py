"""
Socket.IO compatibility consumer for Django Channels
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class SocketIOConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for Socket.IO compatibility
    Handles real-time communication with frontend
    """
    
    async def connect(self):
        """Handle new WebSocket connection"""
        try:
            # Send Socket.IO connection confirmation
            await self.send(text_data=json.dumps({
                "type": "connection",
                "data": {
                    "sid": str(self.channel_name),
                }
            }))
            logger.info(f"[Socket.IO] Client connected: {self.channel_name}")
        except Exception as e:
            logger.error(f"[Socket.IO] Connection error: {e}")
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        logger.info(f"[Socket.IO] Client disconnected: {close_code}")
    
    async def receive(self, text_data):
        """Handle incoming messages"""
        try:
            data = json.loads(text_data)
            event = data.get('event', 'unknown')
            logger.debug(f"[Socket.IO] Event received: {event}")
            
            # Echo the message back
            await self.send(text_data=json.dumps({
                "type": "message",
                "event": event,
                "status": "received"
            }))
        except json.JSONDecodeError as e:
            logger.error(f"[Socket.IO] Invalid JSON: {e}")
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Invalid JSON"
            }))
        except Exception as e:
            logger.error(f"[Socket.IO] Error processing message: {e}")
