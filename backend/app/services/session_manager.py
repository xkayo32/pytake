"""
Session Management Service
Handles JWT token blacklisting for logout and session revocation.
"""

from datetime import timedelta
from typing import Optional
from uuid import UUID

from app.core.redis import redis_client


class SessionManager:
    """
    Manages user sessions using Redis.
    
    Handles:
    - Token blacklisting for logout
    - Session revocation
    - Token validation against blacklist
    """

    # Key prefixes
    BLACKLIST_PREFIX = "session:blacklist"
    SESSION_PREFIX = "session"

    @staticmethod
    async def blacklist_token(
        user_id: UUID,
        token: str,
        expires_in: int = 900,  # 15 minutes (default access token TTL)
    ) -> None:
        """
        Add token to blacklist (for logout).
        
        Args:
            user_id: User ID (for reference)
            token: JWT token to blacklist
            expires_in: Time in seconds until token naturally expires
                       (we use this for Redis TTL)
        """
        key = f"{SessionManager.BLACKLIST_PREFIX}:{user_id}:{token}"
        
        # Store in Redis with TTL equal to token expiration
        # If token is accessed before expiry, it will be in blacklist
        await redis_client.setex(key, expires_in, "1")

    @staticmethod
    async def is_token_blacklisted(
        user_id: UUID,
        token: str,
    ) -> bool:
        """
        Check if token is blacklisted (logged out).
        
        Args:
            user_id: User ID
            token: JWT token to check
            
        Returns:
            True if token is blacklisted, False if still valid
        """
        key = f"{SessionManager.BLACKLIST_PREFIX}:{user_id}:{token}"
        result = await redis_client.get(key)
        return result is not None

    @staticmethod
    async def invalidate_user_sessions(user_id: UUID) -> None:
        """
        Invalidate all sessions for a user (e.g., password change, manual logout).
        
        Args:
            user_id: User ID to invalidate sessions for
        """
        # Find all blacklist keys for this user
        pattern = f"{SessionManager.BLACKLIST_PREFIX}:{user_id}:*"
        keys = await redis_client.keys(pattern)
        
        if keys:
            await redis_client.delete(*keys)

    @staticmethod
    async def get_user_session_count(user_id: UUID) -> int:
        """
        Get number of active sessions for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            Count of active (non-blacklisted) sessions
        """
        pattern = f"{SessionManager.BLACKLIST_PREFIX}:{user_id}:*"
        keys = await redis_client.keys(pattern)
        return len(keys) if keys else 0
