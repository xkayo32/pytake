"""
Rate Limiting for WhatsApp Messages

Handles rate limiting per WhatsApp number with different strategies:
- Meta Cloud API: 500 messages/day (enforced by Meta)
- Evolution API (QR Code): Unlimited with 500ms delay between messages

Tracks usage in Redis for distributed rate limiting.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple
from uuid import UUID

from app.core.redis import redis_client

logger = logging.getLogger(__name__)


class WhatsAppRateLimiter:
    """Rate limiter for WhatsApp messages"""
    
    # Meta Cloud API limits (conservative)
    META_DAILY_LIMIT = 500  # 500 messages per day
    META_HOURLY_LIMIT = 100  # 100 messages per hour
    META_MINUTE_LIMIT = 20   # 20 messages per minute
    
    # Evolution API delays (to avoid spam detection)
    EVOLUTION_MIN_DELAY = 0.5  # 500ms between messages
    EVOLUTION_HOURLY_LIMIT = 1000  # Soft limit to avoid suspicion
    
    def __init__(self, whatsapp_number_id: str, connection_type: str):
        """
        Initialize rate limiter
        
        Args:
            whatsapp_number_id: UUID of WhatsApp number
            connection_type: 'official' or 'qr_code'
        """
        self.whatsapp_number_id = whatsapp_number_id
        self.connection_type = connection_type
        self.is_official = connection_type == "official"
        
        # Redis keys
        self.daily_key = f"whatsapp:ratelimit:{whatsapp_number_id}:daily"
        self.hourly_key = f"whatsapp:ratelimit:{whatsapp_number_id}:hourly"
        self.minute_key = f"whatsapp:ratelimit:{whatsapp_number_id}:minute"
        self.last_message_key = f"whatsapp:ratelimit:{whatsapp_number_id}:last"
    
    async def can_send_message(self) -> Tuple[bool, Optional[str]]:
        """
        Check if we can send a message now
        
        Returns:
            Tuple of (can_send, reason_if_not)
        """
        try:
            if self.is_official:
                # Check Meta Cloud API limits
                return await self._check_meta_limits()
            else:
                # Check Evolution API limits (more lenient)
                return await self._check_evolution_limits()
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            # On error, allow sending (fail open)
            return True, None
    
    async def _check_meta_limits(self) -> Tuple[bool, Optional[str]]:
        """Check Meta Cloud API rate limits"""
        
        # Check daily limit
        daily_count = await self._get_counter(self.daily_key)
        if daily_count >= self.META_DAILY_LIMIT:
            return False, f"Daily limit reached ({self.META_DAILY_LIMIT}/day)"
        
        # Check hourly limit
        hourly_count = await self._get_counter(self.hourly_key)
        if hourly_count >= self.META_HOURLY_LIMIT:
            return False, f"Hourly limit reached ({self.META_HOURLY_LIMIT}/hour)"
        
        # Check minute limit
        minute_count = await self._get_counter(self.minute_key)
        if minute_count >= self.META_MINUTE_LIMIT:
            return False, f"Minute limit reached ({self.META_MINUTE_LIMIT}/min)"
        
        return True, None
    
    async def _check_evolution_limits(self) -> Tuple[bool, Optional[str]]:
        """Check Evolution API rate limits (soft limits)"""
        
        # Check hourly soft limit
        hourly_count = await self._get_counter(self.hourly_key)
        if hourly_count >= self.EVOLUTION_HOURLY_LIMIT:
            return False, f"Hourly soft limit reached ({self.EVOLUTION_HOURLY_LIMIT}/hour)"
        
        # Check minimum delay between messages
        last_send_time = await redis_client.get(self.last_message_key)
        if last_send_time:
            last_send = float(last_send_time)
            time_since_last = datetime.now().timestamp() - last_send
            if time_since_last < self.EVOLUTION_MIN_DELAY:
                return False, f"Min delay not met ({self.EVOLUTION_MIN_DELAY}s)"
        
        return True, None
    
    async def record_message_sent(self):
        """Record that a message was sent (increment counters)"""
        try:
            # Increment counters
            await self._increment_counter(self.daily_key, ttl=86400)  # 24 hours
            await self._increment_counter(self.hourly_key, ttl=3600)  # 1 hour
            await self._increment_counter(self.minute_key, ttl=60)    # 1 minute
            
            # Record timestamp of last message
            await redis_client.set(
                self.last_message_key,
                str(datetime.now().timestamp()),
                ex=60  # Expire after 1 minute
            )
            
            logger.debug(f"Recorded message sent for {self.whatsapp_number_id}")
            
        except Exception as e:
            logger.error(f"Error recording message: {e}")
    
    async def get_current_usage(self) -> dict:
        """Get current usage statistics"""
        try:
            daily_count = await self._get_counter(self.daily_key)
            hourly_count = await self._get_counter(self.hourly_key)
            minute_count = await self._get_counter(self.minute_key)
            
            if self.is_official:
                return {
                    "connection_type": "official",
                    "daily": {
                        "used": daily_count,
                        "limit": self.META_DAILY_LIMIT,
                        "remaining": max(0, self.META_DAILY_LIMIT - daily_count),
                        "percentage": (daily_count / self.META_DAILY_LIMIT) * 100,
                    },
                    "hourly": {
                        "used": hourly_count,
                        "limit": self.META_HOURLY_LIMIT,
                        "remaining": max(0, self.META_HOURLY_LIMIT - hourly_count),
                    },
                    "minute": {
                        "used": minute_count,
                        "limit": self.META_MINUTE_LIMIT,
                        "remaining": max(0, self.META_MINUTE_LIMIT - minute_count),
                    },
                }
            else:
                return {
                    "connection_type": "qr_code",
                    "hourly": {
                        "used": hourly_count,
                        "limit": self.EVOLUTION_HOURLY_LIMIT,
                        "remaining": max(0, self.EVOLUTION_HOURLY_LIMIT - hourly_count),
                    },
                    "min_delay_seconds": self.EVOLUTION_MIN_DELAY,
                }
        except Exception as e:
            logger.error(f"Error getting usage: {e}")
            return {}
    
    async def reset_counters(self):
        """Reset all counters (for testing or manual reset)"""
        try:
            await redis_client.delete(self.daily_key)
            await redis_client.delete(self.hourly_key)
            await redis_client.delete(self.minute_key)
            await redis_client.delete(self.last_message_key)
            logger.info(f"Reset counters for {self.whatsapp_number_id}")
        except Exception as e:
            logger.error(f"Error resetting counters: {e}")
    
    async def _get_counter(self, key: str) -> int:
        """Get counter value from Redis"""
        try:
            value = await redis_client.get(key)
            return int(value) if value else 0
        except Exception as e:
            logger.error(f"Error getting counter {key}: {e}")
            return 0
    
    async def _increment_counter(self, key: str, ttl: int):
        """Increment counter in Redis with TTL"""
        try:
            # Increment counter
            await redis_client.incr(key)
            # Set TTL only if key is new (NX = Not eXists)
            await redis_client.expire(key, ttl)
        except Exception as e:
            logger.error(f"Error incrementing counter {key}: {e}")
    
    async def wait_if_needed(self) -> float:
        """
        Calculate how long to wait before next message
        
        Returns:
            Wait time in seconds (0 if can send immediately)
        """
        can_send, reason = await self.can_send_message()
        
        if can_send:
            return 0.0
        
        # Calculate wait time based on reason
        if "Minute limit" in reason:
            return 60.0  # Wait 1 minute
        elif "Hourly limit" in reason:
            return 3600.0  # Wait 1 hour
        elif "Daily limit" in reason:
            return 86400.0  # Wait 24 hours
        elif "Min delay" in reason:
            # Wait for minimum delay
            last_send_time = await redis_client.get(self.last_message_key)
            if last_send_time:
                last_send = float(last_send_time)
                elapsed = datetime.now().timestamp() - last_send
                return max(0, self.EVOLUTION_MIN_DELAY - elapsed)
            return self.EVOLUTION_MIN_DELAY
        
        return 60.0  # Default wait 1 minute


async def get_whatsapp_rate_limiter(
    whatsapp_number_id: UUID,
    connection_type: str
) -> WhatsAppRateLimiter:
    """
    Factory function to create rate limiter
    
    Args:
        whatsapp_number_id: UUID of WhatsApp number
        connection_type: 'official' or 'qr_code'
        
    Returns:
        WhatsAppRateLimiter instance
    """
    return WhatsAppRateLimiter(str(whatsapp_number_id), connection_type)


async def check_and_wait_for_rate_limit(
    whatsapp_number_id: UUID,
    connection_type: str
) -> Tuple[bool, Optional[str]]:
    """
    Convenience function to check rate limit and wait if needed
    
    Args:
        whatsapp_number_id: UUID of WhatsApp number
        connection_type: 'official' or 'qr_code'
        
    Returns:
        Tuple of (can_proceed, error_message)
    """
    limiter = await get_whatsapp_rate_limiter(whatsapp_number_id, connection_type)
    
    # Check if we can send
    can_send, reason = await limiter.can_send_message()
    
    if not can_send:
        # Calculate wait time
        wait_time = await limiter.wait_if_needed()
        
        if wait_time > 300:  # More than 5 minutes
            # Don't wait, return error
            return False, f"Rate limit exceeded: {reason}. Wait {wait_time/60:.1f} minutes."
        else:
            # Wait and try again
            import asyncio
            logger.info(f"Rate limit hit, waiting {wait_time}s: {reason}")
            await asyncio.sleep(wait_time)
            return True, None
    
    return True, None
