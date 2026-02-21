"""
Socket.IO integration for Django/Daphne
Provides WebSocket endpoints for real-time updates
"""
from aiohttp import web
import json
import logging

logger = logging.getLogger(__name__)


class SocketIOApp:
    """Simple Socket.IO compatible WebSocket handler"""
    
    def __init__(self):
        self.connections = {}
    
    async def handle_websocket(self, request):
        """Handle WebSocket connections"""
        query = request.rel_url.query
        transport = query.get('transport', 'websocket')
        
        # Socket.IO uses polling or websocket
        if transport == 'polling':
            return web.Response(status=426)  # Upgrade required
        
        # Accept WebSocket
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        
        logger.info(f"[Socket.IO] Client connected via {transport}")
        
        try:
            async for msg in ws:
                if msg.type == web.WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        await self.handle_message(ws, data)
                    except json.JSONDecodeError:
                        await ws.send_json({"error": "Invalid JSON"})
                elif msg.type == web.WSMsgType.ERROR:
                    logger.error(f"WebSocket error: {ws.exception()}")
        except Exception as e:
            logger.error(f"[Socket.IO] Connection error: {e}")
        finally:
            logger.info("[Socket.IO] Client disconnected")
        
        return ws
    
    async def handle_message(self, ws, data):
        """Handle incoming messages"""
        event = data.get('event', 'unknown')
        logger.debug(f"[Socket.IO] Event: {event}")
        
        # Just acknowledge for now
        await ws.send_json({
            "status": "ok",
            "event": event
        })


sio_app = SocketIOApp()
