"""
Caching Strategy Module
- Cache dashboard statistics (1-5 minute TTL)
- Cache alert counts (30 second TTL)
- Redis-backed distributed caching
- Automatic cache invalidation on updates
- Type-safe cache decorators
"""

import json
import logging
import redis
from typing import Optional, Any, Callable, Awaitable, TypeVar, ParamSpec
from functools import wraps
from datetime import datetime, timedelta
import hashlib

logger = logging.getLogger(__name__)

T = TypeVar("T")
P = ParamSpec("P")

# Redis connection pool (shared)
_redis_client: Optional[redis.Redis] = None


def get_cache_redis() -> Optional[redis.Redis]:
    """Get or create Redis client for caching."""
    global _redis_client
    if _redis_client is None:
        try:
            from app.core.config import settings
            _redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB + 1,  # Use separate DB for cache
                decode_responses=True,
                socket_connect_timeout=5,
            )
            _redis_client.ping()
            logger.info("✅ Redis cache connected")
        except Exception as e:
            logger.warning(f"⚠️  Redis cache unavailable: {e}")
            _redis_client = None
    return _redis_client


class CacheManager:
    """
    Distributed cache manager with automatic TTL and invalidation.
    
    Key prefixes:
    - alerts:dashboard:{org_id}:overview - Dashboard overview stats
    - alerts:dashboard:{org_id}:severity - Severity distribution
    - alerts:dashboard:{org_id}:status - Status distribution
    - alerts:dashboard:{org_id}:trends - Trends data
    - alerts:count:{org_id} - Alert count summary
    - alerts:search:{org_id}:{hash} - Cached search results
    """

    # Default TTL configs (in seconds)
    STATS_OVERVIEW_TTL = 300  # 5 minutes
    DISTRIBUTION_TTL = 300  # 5 minutes
    TRENDS_TTL = 600  # 10 minutes
    ALERT_COUNT_TTL = 30  # 30 seconds (fast updates)
    SEARCH_RESULTS_TTL = 120  # 2 minutes
    ALERT_DETAILS_TTL = 60  # 1 minute

    def __init__(self):
        self.redis = get_cache_redis()

    def _serialize(self, obj: Any) -> str:
        """Serialize object to JSON."""
        try:
            return json.dumps(obj, default=str)  # default=str for datetime objects
        except Exception as e:
            logger.error(f"❌ Serialization error: {e}")
            return "{}"

    def _deserialize(self, data: str) -> Any:
        """Deserialize JSON string."""
        try:
            return json.loads(data)
        except Exception as e:
            logger.error(f"❌ Deserialization error: {e}")
            return None

    def _make_hash(self, *args) -> str:
        """Generate hash from arguments for cache key."""
        content = "|".join(str(arg) for arg in args)
        return hashlib.md5(content.encode()).hexdigest()[:8]

    # ========== DASHBOARD STATS CACHING ==========

    async def get_stats_overview(
        self, organization_id: str, fetch_func: Optional[Callable] = None
    ) -> Optional[dict]:
        """Get or fetch dashboard overview stats."""
        if not self.redis:
            return await fetch_func() if fetch_func else None

        key = f"alerts:dashboard:{organization_id}:overview"
        try:
            # Try cache first
            cached = self.redis.get(key)
            if cached:
                logger.debug(f"✅ Cache hit: {key}")
                return self._deserialize(cached)

            # Cache miss, fetch from database
            if fetch_func:
                result = await fetch_func()
                if result:
                    self.redis.setex(
                        key,
                        self.STATS_OVERVIEW_TTL,
                        self._serialize(result),
                    )
                    logger.info(f"💾 Cache set (5min): {key}")
                return result
            return None

        except Exception as e:
            logger.error(f"❌ Cache error: {e}")
            return await fetch_func() if fetch_func else None

    async def get_severity_distribution(
        self, organization_id: str, fetch_func: Optional[Callable] = None
    ) -> Optional[dict]:
        """Get or fetch severity distribution."""
        if not self.redis:
            return await fetch_func() if fetch_func else None

        key = f"alerts:dashboard:{organization_id}:severity_dist"
        try:
            cached = self.redis.get(key)
            if cached:
                logger.debug(f"✅ Cache hit: {key}")
                return self._deserialize(cached)

            if fetch_func:
                result = await fetch_func()
                if result:
                    self.redis.setex(key, self.DISTRIBUTION_TTL, self._serialize(result))
                    logger.info(f"💾 Cache set (5min): {key}")
                return result
            return None

        except Exception as e:
            logger.error(f"❌ Cache error: {e}")
            return await fetch_func() if fetch_func else None

    async def get_status_distribution(
        self, organization_id: str, fetch_func: Optional[Callable] = None
    ) -> Optional[dict]:
        """Get or fetch status distribution."""
        if not self.redis:
            return await fetch_func() if fetch_func else None

        key = f"alerts:dashboard:{organization_id}:status_dist"
        try:
            cached = self.redis.get(key)
            if cached:
                logger.debug(f"✅ Cache hit: {key}")
                return self._deserialize(cached)

            if fetch_func:
                result = await fetch_func()
                if result:
                    self.redis.setex(key, self.DISTRIBUTION_TTL, self._serialize(result))
                    logger.info(f"💾 Cache set (5min): {key}")
                return result
            return None

        except Exception as e:
            logger.error(f"❌ Cache error: {e}")
            return await fetch_func() if fetch_func else None

    async def get_trends(
        self, organization_id: str, days: int = 7, fetch_func: Optional[Callable] = None
    ) -> Optional[list]:
        """Get or fetch trends data."""
        if not self.redis:
            return await fetch_func() if fetch_func else None

        key = f"alerts:dashboard:{organization_id}:trends_{days}d"
        try:
            cached = self.redis.get(key)
            if cached:
                logger.debug(f"✅ Cache hit: {key}")
                return self._deserialize(cached)

            if fetch_func:
                result = await fetch_func()
                if result:
                    self.redis.setex(key, self.TRENDS_TTL, self._serialize(result))
                    logger.info(f"💾 Cache set (10min): {key}")
                return result
            return None

        except Exception as e:
            logger.error(f"❌ Cache error: {e}")
            return await fetch_func() if fetch_func else None

    # ========== ALERT COUNT CACHING ==========

    async def get_alert_count(
        self, organization_id: str, fetch_func: Optional[Callable] = None
    ) -> Optional[dict]:
        """Get or fetch alert count summary (fast updates)."""
        if not self.redis:
            return await fetch_func() if fetch_func else None

        key = f"alerts:count:{organization_id}"
        try:
            cached = self.redis.get(key)
            if cached:
                logger.debug(f"✅ Cache hit (count): {key}")
                return self._deserialize(cached)

            if fetch_func:
                result = await fetch_func()
                if result:
                    # Short TTL (30 seconds) for frequently updated data
                    self.redis.setex(key, self.ALERT_COUNT_TTL, self._serialize(result))
                    logger.info(f"💾 Cache set (30s): {key}")
                return result
            return None

        except Exception as e:
            logger.error(f"❌ Cache error: {e}")
            return await fetch_func() if fetch_func else None

    # ========== SEARCH CACHING ==========

    async def get_search_results(
        self,
        organization_id: str,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        alert_type: Optional[str] = None,
        template_id: Optional[str] = None,
        text_search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
        fetch_func: Optional[Callable] = None,
    ) -> Optional[dict]:
        """Get or fetch cached search results."""
        if not self.redis:
            return await fetch_func() if fetch_func else None

        # Create unique hash from all filter parameters
        hash_key = self._make_hash(
            organization_id, severity, status, alert_type, template_id, text_search, skip, limit
        )
        key = f"alerts:search:{organization_id}:{hash_key}"

        try:
            cached = self.redis.get(key)
            if cached:
                logger.debug(f"✅ Cache hit (search): {key}")
                return self._deserialize(cached)

            if fetch_func:
                result = await fetch_func()
                if result:
                    self.redis.setex(key, self.SEARCH_RESULTS_TTL, self._serialize(result))
                    logger.info(f"💾 Cache set (2min): {key}")
                return result
            return None

        except Exception as e:
            logger.error(f"❌ Cache error: {e}")
            return await fetch_func() if fetch_func else None

    # ========== CACHE INVALIDATION ==========

    def invalidate_organization_cache(self, organization_id: str) -> bool:
        """Invalidate all caches for an organization."""
        if not self.redis:
            return False

        try:
            # Get all keys matching pattern
            pattern = f"alerts:*:{organization_id}:*"
            keys = self.redis.keys(pattern)

            if keys:
                self.redis.delete(*keys)
                logger.info(f"✅ Invalidated {len(keys)} cache entries for org {organization_id}")
            else:
                logger.debug(f"ℹ️  No cache entries to invalidate for org {organization_id}")

            return True

        except Exception as e:
            logger.error(f"❌ Cache invalidation error: {e}")
            return False

    def invalidate_stats_cache(self, organization_id: str) -> bool:
        """Invalidate dashboard stats caches."""
        if not self.redis:
            return False

        try:
            keys_to_delete = [
                f"alerts:dashboard:{organization_id}:overview",
                f"alerts:dashboard:{organization_id}:severity_dist",
                f"alerts:dashboard:{organization_id}:status_dist",
                f"alerts:dashboard:{organization_id}:trends_7d",
                f"alerts:dashboard:{organization_id}:trends_30d",
            ]
            self.redis.delete(*keys_to_delete)
            logger.info(f"✅ Invalidated stats cache for org {organization_id}")
            return True

        except Exception as e:
            logger.error(f"❌ Cache invalidation error: {e}")
            return False

    def invalidate_count_cache(self, organization_id: str) -> bool:
        """Invalidate alert count cache."""
        if not self.redis:
            return False

        try:
            key = f"alerts:count:{organization_id}"
            self.redis.delete(key)
            logger.info(f"✅ Invalidated count cache for org {organization_id}")
            return True

        except Exception as e:
            logger.error(f"❌ Cache invalidation error: {e}")
            return False

    def invalidate_search_cache(self, organization_id: str) -> bool:
        """Invalidate all search caches for an organization."""
        if not self.redis:
            return False

        try:
            pattern = f"alerts:search:{organization_id}:*"
            keys = self.redis.keys(pattern)
            if keys:
                self.redis.delete(*keys)
                logger.info(f"✅ Invalidated {len(keys)} search cache entries for org {organization_id}")
            return True

        except Exception as e:
            logger.error(f"❌ Cache invalidation error: {e}")
            return False

    # ========== CACHE STATS ==========

    def get_cache_stats(self, organization_id: str) -> Optional[dict]:
        """Get cache statistics for an organization."""
        if not self.redis:
            return None

        try:
            info = {
                'organization_id': organization_id,
                'stats_cache_size': 0,
                'search_cache_entries': 0,
                'total_memory_bytes': 0,
            }

            # Count cache entries
            stats_keys = self.redis.keys(f"alerts:dashboard:{organization_id}:*")
            search_keys = self.redis.keys(f"alerts:search:{organization_id}:*")

            info['stats_cache_size'] = len(stats_keys)
            info['search_cache_entries'] = len(search_keys)

            # Get approximate memory usage (rough estimate)
            info['total_memory_bytes'] = sum(
                self.redis.memory_usage(key) or 0 for key in (stats_keys + search_keys)
            )

            return info

        except Exception as e:
            logger.error(f"❌ Cache stats error: {e}")
            return None


# Global instance
_cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> CacheManager:
    """Get or create cache manager instance."""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager()
    return _cache_manager


# Decorator for caching async functions
def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache async function results.
    
    Example:
        @cached(ttl=300, key_prefix="stats")
        async def get_stats(org_id: str) -> dict:
            # expensive computation
            return result
    """

    def decorator(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            # Build cache key from function name and arguments
            cache_key_parts = [key_prefix, func.__name__]
            cache_key_parts.extend(str(arg) for arg in args)
            cache_key_parts.extend(f"{k}={v}" for k, v in kwargs.items())
            cache_key = ":".join(cache_key_parts)

            redis_client = get_cache_redis()
            if redis_client:
                try:
                    cached_value = redis_client.get(cache_key)
                    if cached_value:
                        logger.debug(f"✅ Cache hit: {cache_key}")
                        return json.loads(cached_value)
                except Exception as e:
                    logger.warning(f"⚠️  Cache lookup failed: {e}")

            # Cache miss, call function
            result = await func(*args, **kwargs)

            # Store in cache
            if redis_client and result is not None:
                try:
                    redis_client.setex(
                        cache_key,
                        ttl,
                        json.dumps(result, default=str),
                    )
                    logger.debug(f"💾 Cache set ({ttl}s): {cache_key}")
                except Exception as e:
                    logger.warning(f"⚠️  Cache store failed: {e}")

            return result

        return wrapper

    return decorator
