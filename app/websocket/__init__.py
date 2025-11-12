"""
WebSocket module for real-time communication
"""

from .manager import sio, get_sio_app

__all__ = ["sio", "get_sio_app"]
