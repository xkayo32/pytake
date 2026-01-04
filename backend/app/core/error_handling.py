"""
Error Handling & Recovery Module
- Graceful degradation for notification failures
- Retry logic with exponential backoff
- Circuit breaker pattern for external services
- Dead letter queue for failed notifications
- Comprehensive error logging & alerting
"""

import asyncio
import logging
import time
from typing import Optional, Callable, Awaitable, TypeVar, Any
from datetime import datetime, timedelta
from enum import Enum
import redis

logger = logging.getLogger(__name__)

T = TypeVar("T")


class ErrorType(str, Enum):
    """Error classification types."""
    EMAIL_SEND_FAILED = "email_send_failed"
    SLACK_SEND_FAILED = "slack_send_failed"
    WEBHOOK_TIMEOUT = "webhook_timeout"
    DATABASE_ERROR = "database_error"
    EXTERNAL_SERVICE_ERROR = "external_service_error"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    VALIDATION_ERROR = "validation_error"
    UNKNOWN = "unknown"


class CircuitBreakerState(str, Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Rejecting calls
    HALF_OPEN = "half_open"  # Testing recovery


class CircuitBreaker:
    """
    Circuit breaker pattern for external service calls.
    
    Prevents cascading failures:
    - CLOSED: Normal operation, all calls pass through
    - OPEN: Too many failures, immediately reject calls
    - HALF_OPEN: Testing if service recovered, allow limited calls
    
    Configuration:
    - failure_threshold: Failures before opening (default: 5)
    - recovery_timeout: Seconds before trying to recover (default: 60)
    - expected_exception: Exception types to count as failures
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception

        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.opened_at: Optional[datetime] = None

    def call(
        self, func: Callable[..., Awaitable[T]], *args, **kwargs
    ) -> Awaitable[Optional[T]]:
        """Call function through circuit breaker."""
        return self._call_async(func, *args, **kwargs)

    async def _call_async(
        self, func: Callable[..., Awaitable[T]], *args, **kwargs
    ) -> Optional[T]:
        """Async call with circuit breaker protection."""
        if self.state == CircuitBreakerState.OPEN:
            # Check if we should try recovery
            if self._should_attempt_recovery():
                self.state = CircuitBreakerState.HALF_OPEN
                logger.info(f"🔄 Circuit breaker '{self.name}' -> HALF_OPEN (testing recovery)")
            else:
                # Still open, reject call
                logger.warning(f"🔴 Circuit breaker '{self.name}' is OPEN, rejecting call")
                return None

        try:
            result = await func(*args, **kwargs)

            # Success
            if self.state == CircuitBreakerState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= 2:
                    # Recovered, close circuit
                    self._close()
                    logger.info(f"🟢 Circuit breaker '{self.name}' -> CLOSED (recovered)")
            else:
                self.failure_count = 0  # Reset on success in CLOSED state

            return result

        except self.expected_exception as e:
            self._handle_failure(e)
            return None

    def _handle_failure(self, exc: Exception):
        """Handle failure and update state."""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()

        logger.error(
            f"⚠️  Circuit breaker '{self.name}' failure #{self.failure_count}: {exc}"
        )

        if self.state == CircuitBreakerState.HALF_OPEN:
            # Failure in half-open state, revert to open
            self.state = CircuitBreakerState.OPEN
            self.opened_at = datetime.utcnow()
            self.success_count = 0
            logger.warning(f"🔴 Circuit breaker '{self.name}' -> OPEN (recovery failed)")

        elif self.failure_count >= self.failure_threshold:
            # Too many failures, open circuit
            self.state = CircuitBreakerState.OPEN
            self.opened_at = datetime.utcnow()
            logger.error(
                f"🔴 Circuit breaker '{self.name}' OPENED "
                f"({self.failure_count}/{self.failure_threshold} failures)"
            )

    def _should_attempt_recovery(self) -> bool:
        """Check if enough time has passed to attempt recovery."""
        if not self.opened_at:
            return False

        elapsed = (datetime.utcnow() - self.opened_at).total_seconds()
        should_recover = elapsed >= self.recovery_timeout

        if should_recover:
            logger.info(f"⏱️  Circuit breaker '{self.name}' recovery window reached")

        return should_recover

    def _close(self):
        """Close the circuit."""
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.opened_at = None

    def get_state(self) -> dict:
        """Get circuit breaker status."""
        return {
            'name': self.name,
            'state': self.state.value,
            'failure_count': self.failure_count,
            'success_count': self.success_count,
            'last_failure_time': self.last_failure_time.isoformat() if self.last_failure_time else None,
            'opened_at': self.opened_at.isoformat() if self.opened_at else None,
        }


class RetryPolicy:
    """
    Retry logic with exponential backoff.
    
    Configuration:
    - max_retries: Maximum number of retry attempts (default: 3)
    - base_delay: Initial delay in seconds (default: 1)
    - max_delay: Maximum delay between retries (default: 60)
    - backoff_multiplier: Delay multiplier per retry (default: 2)
    - jitter: Add random jitter to delay (default: True)
    """

    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        backoff_multiplier: float = 2.0,
        jitter: bool = True,
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.backoff_multiplier = backoff_multiplier
        self.jitter = jitter

    async def execute(
        self,
        func: Callable[..., Awaitable[T]],
        *args,
        **kwargs,
    ) -> Optional[T]:
        """Execute function with retry logic."""
        last_exception: Optional[Exception] = None

        for attempt in range(self.max_retries + 1):
            try:
                result = await func(*args, **kwargs)
                if attempt > 0:
                    logger.info(f"✅ Retry succeeded on attempt {attempt + 1}")
                return result

            except Exception as e:
                last_exception = e

                if attempt < self.max_retries:
                    delay = self._calculate_delay(attempt)
                    logger.warning(
                        f"⚠️  Attempt {attempt + 1} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"❌ All {self.max_retries + 1} attempts failed. "
                        f"Last error: {e}"
                    )

        return None

    def _calculate_delay(self, attempt: int) -> float:
        """Calculate delay with exponential backoff."""
        delay = self.base_delay * (self.backoff_multiplier ** attempt)
        delay = min(delay, self.max_delay)  # Cap at max_delay

        if self.jitter:
            # Add random jitter (±10% of delay)
            import random
            jitter_amount = delay * 0.1
            delay += random.uniform(-jitter_amount, jitter_amount)

        return max(0.0, delay)  # Ensure non-negative


class DeadLetterQueue:
    """
    Dead letter queue for failed notifications.
    
    Stores failed notifications for later retry/analysis.
    Uses Redis for persistence.
    """

    def __init__(self):
        self.redis = self._get_redis()

    def _get_redis(self) -> Optional[redis.Redis]:
        """Get Redis client for DLQ."""
        try:
            from app.core.config import settings
            client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB + 2,  # Use separate DB for DLQ
                decode_responses=True,
            )
            client.ping()
            logger.info("✅ Dead Letter Queue initialized")
            return client
        except Exception as e:
            logger.warning(f"⚠️  Dead Letter Queue unavailable: {e}")
            return None

    async def enqueue(
        self,
        error_type: ErrorType,
        alert_id: str,
        organization_id: str,
        details: dict,
        retry_count: int = 0,
    ) -> bool:
        """
        Enqueue a failed notification to DLQ.
        
        Args:
            error_type: Type of error
            alert_id: ID of alert that failed
            organization_id: Organization ID
            details: Error details (message, traceback, etc.)
            retry_count: Number of retry attempts
        
        Returns:
            True if successfully enqueued
        """
        if not self.redis:
            logger.warning("⚠️  Cannot enqueue to DLQ (Redis unavailable)")
            return False

        try:
            import json
            key = f"dlq:{organization_id}:{error_type.value}"

            message = {
                'timestamp': datetime.utcnow().isoformat(),
                'alert_id': alert_id,
                'error_type': error_type.value,
                'details': details,
                'retry_count': retry_count,
            }

            self.redis.lpush(key, json.dumps(message))
            # Set expiration (30 days)
            self.redis.expire(key, 30 * 24 * 3600)

            logger.warning(
                f"📪 Added to DLQ: {error_type.value} for alert {alert_id} "
                f"(retry #{retry_count})"
            )
            return True

        except Exception as e:
            logger.error(f"❌ Failed to enqueue to DLQ: {e}")
            return False

    async def get_queue(self, organization_id: str, error_type: ErrorType) -> list:
        """Get all messages in a DLQ."""
        if not self.redis:
            return []

        try:
            import json
            key = f"dlq:{organization_id}:{error_type.value}"
            messages_raw = self.redis.lrange(key, 0, -1)
            messages = [json.loads(m) for m in messages_raw]
            logger.info(f"📋 Retrieved {len(messages)} messages from DLQ")
            return messages

        except Exception as e:
            logger.error(f"❌ Failed to retrieve DLQ messages: {e}")
            return []

    async def clear_queue(self, organization_id: str, error_type: ErrorType) -> bool:
        """Clear a DLQ."""
        if not self.redis:
            return False

        try:
            key = f"dlq:{organization_id}:{error_type.value}"
            self.redis.delete(key)
            logger.info(f"🗑️  Cleared DLQ: {key}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to clear DLQ: {e}")
            return False


# Global instances
_circuit_breakers: dict[str, CircuitBreaker] = {}
_retry_policy = RetryPolicy()
_dlq = DeadLetterQueue()


def get_circuit_breaker(name: str) -> CircuitBreaker:
    """Get or create circuit breaker."""
    if name not in _circuit_breakers:
        _circuit_breakers[name] = CircuitBreaker(name)
    return _circuit_breakers[name]


def get_retry_policy() -> RetryPolicy:
    """Get retry policy."""
    return _retry_policy


def get_dead_letter_queue() -> DeadLetterQueue:
    """Get dead letter queue."""
    return _dlq


async def safe_call(
    func: Callable[..., Awaitable[T]],
    *args,
    circuit_breaker_name: str = "default",
    error_type: ErrorType = ErrorType.UNKNOWN,
    alert_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    **kwargs,
) -> Optional[T]:
    """
    Safe call with circuit breaker + retry logic.
    Failed calls are enqueued to DLQ.
    """
    cb = get_circuit_breaker(circuit_breaker_name)
    retry = get_retry_policy()

    # Try with circuit breaker + retries
    result = await cb.call(retry.execute, func, *args, **kwargs)

    # If failed, enqueue to DLQ
    if result is None and alert_id and organization_id:
        await _dlq.enqueue(
            error_type=error_type,
            alert_id=alert_id,
            organization_id=organization_id,
            details={
                'circuit_breaker': cb.get_state(),
                'function': func.__name__,
                'args': str(args),
                'kwargs': str(kwargs),
            },
            retry_count=retry.max_retries,
        )

    return result
