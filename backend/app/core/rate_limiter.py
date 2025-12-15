"""
Rate Limiting and Throttling Module
- Prevent DoS attacks on alert endpoints
- Throttle notifications to avoid spam
- Per-organization configurable limits
- Redis-backed distributed rate limiting
"""

import redis
import time
import logging
from typing import Optional, Callable, Awaitable
from functools import wraps
from fastapi import Request, HTTPException, status
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Redis connection pool (shared)
_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> redis.Redis:
    """Get or create Redis client."""
    global _redis_client
    if _redis_client is None:
        from app.core.config import settings
        _redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_keepalive=True,
            socket_keepalive_options={1: (9, 60)},  # TCP keep-alive
        )
        try:
            _redis_client.ping()
            logger.info("✅ Redis rate limiter connected")
        except Exception as e:
            logger.error(f"❌ Redis rate limiter connection failed: {e}")
            _redis_client = None
    return _redis_client


class RateLimiter:
    """
    Distributed rate limiter using Redis.
    
    Supports:
    - Per-organization limits
    - Per-user limits
    - Per-endpoint limits
    - Sliding window (more accurate than fixed window)
    """

    # Default configurations
    DEFAULT_ALERT_ENDPOINTS_LIMIT = 100  # requests per minute
    DEFAULT_EMAIL_NOTIFICATIONS_LIMIT = 50  # per hour
    DEFAULT_SLACK_NOTIFICATIONS_LIMIT = 50  # per hour
    DEFAULT_WEBHOOK_ENDPOINTS_LIMIT = 200  # requests per minute

    def __init__(self):
        self.redis_client = get_redis_client()

    def _get_key(
        self,
        identifier: str,  # org_id, user_id, etc.
        endpoint: str,
        window_seconds: int = 60,
    ) -> str:
        """Generate Redis key for rate limit tracking."""
        window_minutes = window_seconds // 60
        window_start = int(time.time() // window_seconds) * window_seconds
        return f"ratelimit:{identifier}:{endpoint}:{window_start}"

    def _get_sliding_window_key(self, identifier: str, endpoint: str) -> str:
        """Generate key for sliding window tracking (more accurate)."""
        return f"ratelimit:sliding:{identifier}:{endpoint}"

    async def is_allowed(
        self,
        identifier: str,
        endpoint: str,
        limit: int,
        window_seconds: int = 60,
    ) -> tuple[bool, dict]:
        """
        Check if request is allowed under rate limit.
        
        Args:
            identifier: Unique identifier (org_id, user_id, ip_address, etc.)
            endpoint: Endpoint name or pattern
            limit: Max requests allowed in window
            window_seconds: Time window in seconds (default 60)
        
        Returns:
            (is_allowed, metadata)
            metadata includes: {
                'remaining': int,
                'reset_at': datetime,
                'limit': int,
                'window_seconds': int,
            }
        """
        if not self.redis_client:
            logger.warning("⚠️  Redis not available, allowing request (rate limit disabled)")
            return True, {
                'remaining': limit,
                'reset_at': datetime.utcnow() + timedelta(seconds=window_seconds),
                'limit': limit,
                'window_seconds': window_seconds,
            }

        try:
            # Use sliding window approach (more accurate than fixed window)
            key = self._get_sliding_window_key(identifier, endpoint)
            now = time.time()
            window_start = now - window_seconds

            # Remove old entries outside the window
            self.redis_client.zremrangebyscore(key, '-inf', window_start)

            # Count requests in current window
            current_count = self.redis_client.zcard(key)

            if current_count < limit:
                # Add current request
                self.redis_client.zadd(key, {str(now): now})
                # Set expiration (window + 1 second buffer)
                self.redis_client.expire(key, window_seconds + 1)

                remaining = limit - current_count - 1
                reset_at = datetime.utcfromtimestamp(now + window_seconds)

                logger.debug(
                    f"✅ Rate limit OK: {identifier}/{endpoint} "
                    f"({current_count + 1}/{limit}, remaining: {remaining})"
                )

                return True, {
                    'remaining': remaining,
                    'reset_at': reset_at,
                    'limit': limit,
                    'window_seconds': window_seconds,
                }
            else:
                # Limit exceeded
                oldest_request = float(
                    list(self.redis_client.zrange(key, 0, 0, withscores=True))[0][1]
                )
                reset_at = datetime.utcfromtimestamp(oldest_request + window_seconds)

                logger.warning(
                    f"⚠️  Rate limit exceeded: {identifier}/{endpoint} "
                    f"({current_count}/{limit}, resets at {reset_at.isoformat()})"
                )

                return False, {
                    'remaining': 0,
                    'reset_at': reset_at,
                    'limit': limit,
                    'window_seconds': window_seconds,
                }

        except Exception as e:
            logger.error(f"❌ Rate limit check error: {e}", exc_info=True)
            # Fail open: allow request if Redis has issues
            return True, {'remaining': limit, 'reset_at': None, 'limit': limit}

    async def check_alert_endpoint_limit(
        self, organization_id: str, limit: Optional[int] = None
    ) -> tuple[bool, dict]:
        """Check rate limit for alert endpoints (100/min per org)."""
        limit = limit or self.DEFAULT_ALERT_ENDPOINTS_LIMIT
        return await self.is_allowed(
            identifier=f"org:{organization_id}",
            endpoint="alerts",
            limit=limit,
            window_seconds=60,
        )

    async def check_email_notification_limit(
        self, organization_id: str, limit: Optional[int] = None
    ) -> tuple[bool, dict]:
        """Check rate limit for email notifications (50/hour per org)."""
        limit = limit or self.DEFAULT_EMAIL_NOTIFICATIONS_LIMIT
        return await self.is_allowed(
            identifier=f"org:{organization_id}",
            endpoint="email_notification",
            limit=limit,
            window_seconds=3600,  # 1 hour
        )

    async def check_slack_notification_limit(
        self, organization_id: str, limit: Optional[int] = None
    ) -> tuple[bool, dict]:
        """Check rate limit for Slack notifications (50/hour per org)."""
        limit = limit or self.DEFAULT_SLACK_NOTIFICATIONS_LIMIT
        return await self.is_allowed(
            identifier=f"org:{organization_id}",
            endpoint="slack_notification",
            limit=limit,
            window_seconds=3600,  # 1 hour
        )

    async def check_webhook_limit(
        self, organization_id: str, limit: Optional[int] = None
    ) -> tuple[bool, dict]:
        """Check rate limit for webhook endpoints (200/min per org)."""
        limit = limit or self.DEFAULT_WEBHOOK_ENDPOINTS_LIMIT
        return await self.is_allowed(
            identifier=f"org:{organization_id}",
            endpoint="webhook",
            limit=limit,
            window_seconds=60,
        )

    def reset_limit(self, identifier: str, endpoint: str) -> bool:
        """Manually reset rate limit for testing/admin purposes."""
        if not self.redis_client:
            return False
        try:
            key = self._get_sliding_window_key(identifier, endpoint)
            self.redis_client.delete(key)
            logger.info(f"✅ Rate limit reset: {identifier}/{endpoint}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to reset rate limit: {e}")
            return False


# Global instance
_rate_limiter: Optional[RateLimiter] = None


def get_rate_limiter() -> RateLimiter:
    """Get or create rate limiter instance."""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    return _rate_limiter


# FastAPI middleware integration
async def rate_limit_middleware(
    request: Request,
    call_next,
    organization_id: str,
    limit: int = 100,
    window_seconds: int = 60,
):
    """
    Middleware for rate limiting.
    
    Example usage in endpoint:
        @app.get("/api/alerts")
        async def get_alerts(
            request: Request,
            organization_id: UUID = Depends(get_current_organization_id),
        ):
            limiter = get_rate_limiter()
            allowed, metadata = await limiter.is_allowed(
                identifier=str(organization_id),
                endpoint="alerts",
                limit=100,
                window_seconds=60,
            )
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded",
                    headers={
                        "Retry-After": str(int(metadata['reset_at'].timestamp() - time.time())),
                    },
                )
    """
    limiter = get_rate_limiter()
    allowed, metadata = await limiter.is_allowed(
        identifier=organization_id,
        endpoint=request.url.path,
        limit=limit,
        window_seconds=window_seconds,
    )

    if not allowed:
        reset_at = metadata.get('reset_at')
        retry_after = int((reset_at.timestamp() - time.time())) if reset_at else 60

        response = HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(max(1, retry_after))},
        )
        raise response

    response = await call_next(request)

    # Add rate limit headers to response
    response.headers["X-RateLimit-Limit"] = str(metadata['limit'])
    response.headers["X-RateLimit-Remaining"] = str(metadata['remaining'])
    if metadata.get('reset_at'):
        response.headers["X-RateLimit-Reset"] = str(
            int(metadata['reset_at'].timestamp())
        )

    return response


# Decorator for endpoint protection
def require_rate_limit(
    limit: int = 100,
    window_seconds: int = 60,
):
    """
    Decorator to apply rate limiting to async endpoints.
    
    Example:
        @app.get("/api/alerts")
        @require_rate_limit(limit=100, window_seconds=60)
        async def get_alerts(organization_id: UUID):
            ...
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, request: Request = None, **kwargs) -> Awaitable:
            # Extract organization_id from kwargs or request
            organization_id = kwargs.get('organization_id')
            if not organization_id and request:
                # Try to get from path or user context
                organization_id = request.headers.get('X-Organization-ID')

            if not organization_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing organization_id",
                )

            limiter = get_rate_limiter()
            allowed, metadata = await limiter.is_allowed(
                identifier=str(organization_id),
                endpoint=request.url.path if request else "unknown",
                limit=limit,
                window_seconds=window_seconds,
            )

            if not allowed:
                reset_at = metadata.get('reset_at')
                retry_after = int((reset_at.timestamp() - time.time())) if reset_at else 60
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {retry_after}s.",
                    headers={"Retry-After": str(max(1, retry_after))},
                )

            return await func(*args, **kwargs)

        return wrapper

    return decorator
