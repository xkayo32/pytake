"""
Rate Limiting Configuration
Uses slowapi with Redis backend for distributed rate limiting
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import logging

from app.core.redis import redis_client

logger = logging.getLogger(__name__)


def get_user_identifier(request: Request) -> str:
    """
    Get user identifier for rate limiting.
    
    Priority:
    1. User ID from auth token (if authenticated)
    2. Organization ID (for org-level limits)
    3. IP address (fallback)
    """
    # Try to get user from request state (set by auth dependency)
    if hasattr(request.state, "user"):
        user = request.state.user
        # Use org_id for organization-level limits
        if hasattr(user, "organization_id") and user.organization_id:
            return f"org:{user.organization_id}"
        # Fallback to user_id
        if hasattr(user, "id") and user.id:
            return f"user:{user.id}"
    
    # Fallback to IP address for unauthenticated requests
    return get_remote_address(request)


def custom_key_func(request: Request) -> str:
    """
    Custom key function that combines endpoint and identifier.
    
    This allows different limits per endpoint per user/org.
    """
    identifier = get_user_identifier(request)
    path = request.url.path
    return f"{path}:{identifier}"


# Initialize limiter with Redis storage
limiter = Limiter(
    key_func=custom_key_func,
    storage_uri=None,  # Will be set dynamically from redis_client
    default_limits=["1000/minute"],  # Global default
    headers_enabled=True,  # Add X-RateLimit-* headers
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for rate limit exceeded.
    
    Returns JSON response with rate limit details.
    """
    logger.warning(
        f"Rate limit exceeded for {get_user_identifier(request)} on {request.url.path}"
    )
    
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please try again later.",
            "retry_after": exc.detail.split("Retry after ")[1] if "Retry after" in exc.detail else "60 seconds",
        },
        headers={
            "Retry-After": "60",
            "X-RateLimit-Limit": str(getattr(exc, "limit", "unknown")),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": str(getattr(exc, "reset", "unknown")),
        }
    )


# Rate limit configurations for specific endpoints
RATE_LIMITS = {
    # Authentication endpoints
    "auth_login": "5/minute",  # 5 login attempts per minute
    "auth_register": "3/hour",  # 3 registrations per hour per IP
    "auth_refresh": "10/minute",  # 10 refresh requests per minute
    
    # WhatsApp endpoints
    "whatsapp_send_message": "100/minute",  # 100 messages per minute per org
    "whatsapp_send_media": "50/minute",  # 50 media messages per minute per org
    "whatsapp_bulk_send": "10/minute",  # 10 bulk operations per minute per org
    
    # Campaign endpoints
    "campaign_start": "5/minute",  # 5 campaign starts per minute per org
    "campaign_create": "20/minute",  # 20 campaign creations per minute per org
    
    # Chatbot endpoints
    "chatbot_execute": "50/minute",  # 50 bot executions per minute per org
    "chatbot_create": "10/minute",  # 10 bot creations per minute per org
    
    # API Query endpoints
    "database_query": "30/minute",  # 30 database queries per minute per org
    "api_request": "100/minute",  # 100 API requests per minute per org
    
    # AI Assistant endpoints
    "ai_generate": "20/minute",  # 20 AI generations per minute per org
    "ai_test": "10/minute",  # 10 AI test requests per minute per org
    
    # Public endpoints
    "webhook_receive": "1000/minute",  # 1000 webhook receives per minute (from Meta)
    
    # Global API limit (fallback)
    "api_global": "1000/minute",  # 1000 requests per minute per org
}


def get_rate_limit(endpoint_name: str) -> str:
    """Get rate limit string for endpoint."""
    return RATE_LIMITS.get(endpoint_name, RATE_LIMITS["api_global"])


def create_rate_limit_response(request: Request, limit: int, remaining: int, reset: int) -> Response:
    """
    Create response with rate limit headers.
    
    Args:
        request: FastAPI request
        limit: Total number of requests allowed
        remaining: Number of requests remaining
        reset: Unix timestamp when the limit resets
    """
    headers = {
        "X-RateLimit-Limit": str(limit),
        "X-RateLimit-Remaining": str(remaining),
        "X-RateLimit-Reset": str(reset),
    }
    
    return Response(headers=headers)


# Decorator for custom rate limits
def custom_rate_limit(limit: str):
    """
    Decorator to apply custom rate limit to endpoint.
    
    Usage:
        @router.post("/endpoint")
        @custom_rate_limit("10/minute")
        async def endpoint():
            ...
    """
    def decorator(func):
        func.__rate_limit__ = limit
        return func
    return decorator
