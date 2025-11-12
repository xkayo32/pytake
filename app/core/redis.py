"""
Redis configuration for caching and queue management
"""

from typing import Optional

import redis.asyncio as aioredis
from redis.asyncio import Redis
from redis.asyncio.connection import ConnectionPool

from app.core.config import settings


class RedisClient:
    """Redis async client wrapper"""

    def __init__(self):
        self.pool: Optional[ConnectionPool] = None
        self.client: Optional[Redis] = None

    async def connect(self):
        """Initialize Redis connection pool"""
        self.pool = ConnectionPool.from_url(
            str(settings.REDIS_URL),
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
        )
        self.client = Redis(connection_pool=self.pool)

    async def disconnect(self):
        """Close Redis connections"""
        if self.client:
            await self.client.close()
        if self.pool:
            await self.pool.disconnect()

    async def get(self, key: str) -> Optional[str]:
        """Get value by key"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.get(key)

    async def set(
        self,
        key: str,
        value: str,
        expire: Optional[int] = None,
    ) -> bool:
        """Set key-value with optional expiration (seconds)"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.set(key, value, ex=expire)

    async def delete(self, key: str) -> int:
        """Delete key"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.delete(key)

    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.exists(key) > 0

    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on key"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.expire(key, seconds)

    async def incr(self, key: str) -> int:
        """Increment key value"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.incr(key)

    async def decr(self, key: str) -> int:
        """Decrement key value"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.decr(key)

    async def hget(self, name: str, key: str) -> Optional[str]:
        """Get value from hash"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.hget(name, key)

    async def hset(self, name: str, key: str, value: str) -> int:
        """Set value in hash"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.hset(name, key, value)

    async def hgetall(self, name: str) -> dict:
        """Get all values from hash"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.hgetall(name)

    async def hdel(self, name: str, *keys: str) -> int:
        """Delete keys from hash"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.hdel(name, *keys)

    async def lpush(self, name: str, *values: str) -> int:
        """Push values to list (left)"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.lpush(name, *values)

    async def rpush(self, name: str, *values: str) -> int:
        """Push values to list (right)"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.rpush(name, *values)

    async def lpop(self, name: str) -> Optional[str]:
        """Pop value from list (left)"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.lpop(name)

    async def rpop(self, name: str) -> Optional[str]:
        """Pop value from list (right)"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.rpop(name)

    async def lrange(self, name: str, start: int, end: int) -> list:
        """Get range from list"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.lrange(name, start, end)

    async def llen(self, name: str) -> int:
        """Get list length"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.llen(name)

    async def sadd(self, name: str, *values: str) -> int:
        """Add values to set"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.sadd(name, *values)

    async def srem(self, name: str, *values: str) -> int:
        """Remove values from set"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.srem(name, *values)

    async def smembers(self, name: str) -> set:
        """Get all members of set"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.smembers(name)

    async def sismember(self, name: str, value: str) -> bool:
        """Check if value is member of set"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return await self.client.sismember(name, value)


# Global Redis client instance
redis_client = RedisClient()


async def get_redis() -> Redis:
    """
    Dependency for getting Redis client
    Usage in FastAPI:
        @app.get("/items/")
        async def read_items(redis: Redis = Depends(get_redis)):
            ...
    """
    if not redis_client.client:
        raise RuntimeError("Redis client not initialized. Call redis_client.connect() first")
    return redis_client.client


# Cache helper functions
async def cache_set(key: str, value: str, expire: int = 3600) -> bool:
    """Set cache with default 1 hour expiration"""
    return await redis_client.set(key, value, expire=expire)


async def cache_get(key: str) -> Optional[str]:
    """Get cached value"""
    return await redis_client.get(key)


async def cache_delete(key: str) -> int:
    """Delete cached value"""
    return await redis_client.delete(key)


async def cache_invalidate_pattern(pattern: str) -> int:
    """Delete all keys matching pattern"""
    if not redis_client.client:
        raise RuntimeError("Redis client not initialized")

    keys = []
    async for key in redis_client.client.scan_iter(match=pattern):
        keys.append(key)

    if keys:
        return await redis_client.client.delete(*keys)
    return 0


# Rate limiting helpers
async def rate_limit_check(key: str, max_requests: int, window_seconds: int) -> bool:
    """
    Check if rate limit is exceeded
    Returns True if allowed, False if exceeded
    """
    current = await redis_client.incr(key)

    if current == 1:
        # First request, set expiration
        await redis_client.expire(key, window_seconds)

    return current <= max_requests


# Session management helpers
async def create_session(session_id: str, user_data: dict, expire: int = 3600) -> bool:
    """Create user session"""
    import json
    return await redis_client.set(
        f"session:{session_id}",
        json.dumps(user_data),
        expire=expire,
    )


async def get_session(session_id: str) -> Optional[dict]:
    """Get user session data"""
    import json
    data = await redis_client.get(f"session:{session_id}")
    if data:
        return json.loads(data)
    return None


async def delete_session(session_id: str) -> int:
    """Delete user session"""
    return await redis_client.delete(f"session:{session_id}")


# Queue management helpers for conversation queue
async def enqueue_conversation(department_id: str, conversation_id: str) -> int:
    """Add conversation to department queue"""
    return await redis_client.rpush(
        f"queue:department:{department_id}",
        conversation_id,
    )


async def dequeue_conversation(department_id: str) -> Optional[str]:
    """Remove and return next conversation from department queue"""
    return await redis_client.lpop(f"queue:department:{department_id}")


async def get_queue_length(department_id: str) -> int:
    """Get current queue length for department"""
    return await redis_client.llen(f"queue:department:{department_id}")


async def get_queue_position(department_id: str, conversation_id: str) -> int:
    """
    Get position of conversation in queue (0-indexed)
    Returns -1 if not found
    """
    queue = await redis_client.lrange(
        f"queue:department:{department_id}",
        0,
        -1,
    )
    try:
        return queue.index(conversation_id)
    except ValueError:
        return -1


async def remove_from_queue(department_id: str, conversation_id: str) -> bool:
    """Remove specific conversation from queue"""
    if not redis_client.client:
        return False

    # lrem: remove all occurrences of value from list
    removed = await redis_client.client.lrem(
        f"queue:department:{department_id}",
        0,
        conversation_id,
    )
    return removed > 0
