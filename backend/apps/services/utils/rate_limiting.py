"""
Rate Limiting and Throttling Service
"""
from rest_framework.throttling import BaseThrottle
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta


class RateLimitService:
    """Service for rate limiting"""

    def __init__(self, cache_backend=None):
        self.cache = cache_backend or cache

    def is_allowed(
        self,
        identifier: str,
        limit: int,
        window: int = 3600,  # 1 hour
    ) -> bool:
        """Check if request is allowed"""
        key = f"ratelimit:{identifier}"
        current = self.cache.get(key, 0)
        
        if current >= limit:
            return False
        
        self.cache.set(key, current + 1, window)
        return True

    def get_remaining(
        self,
        identifier: str,
        limit: int,
    ) -> int:
        """Get remaining requests"""
        key = f"ratelimit:{identifier}"
        current = self.cache.get(key, 0)
        return max(0, limit - current)

    def reset(self, identifier: str):
        """Reset rate limit for identifier"""
        key = f"ratelimit:{identifier}"
        self.cache.delete(key)


class UserRateThrottle(BaseThrottle):
    """Rate throttle per authenticated user"""

    scope = "user"
    
    # 100 requests per hour per user
    THROTTLE_RATES = {
        "user": "100/hour",
    }

    def throttle_success(self):
        """Called when request is allowed"""
        self.history = cache.get(self.key, [])
        self.now = timezone.now()
        
        # Drop requests older than 1 hour
        while self.history and self.history[-1] <= self.now - timedelta(hours=1):
            self.history.pop()
        
        self.history.insert(0, self.now)
        cache.set(self.key, self.history, 3600)
        return True

    def throttle_failure(self):
        """Called when throttle limit exceeded"""
        return False

    def get_ident(self, request):
        """Get unique identifier for throttling"""
        if request.user and request.user.is_authenticated:
            return str(request.user.id)
        return self.get_ident_ip(request)

    @staticmethod
    def get_ident_ip(request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def allow_request(self, request, view):
        """Allow request if within rate limits"""
        self.key = f"throttle_{self.scope}_{self.get_ident(request)}"
        self.history = cache.get(self.key, [])
        self.now = timezone.now()

        # Drop requests from before the throttle window
        window_start = self.now - timedelta(hours=1)
        self.history = [t for t in self.history if t > window_start]

        if len(self.history) >= 100:  # 100 requests per hour
            return self.throttle_failure()

        self.history.insert(0, self.now)
        cache.set(self.key, self.history, 3600)
        return self.throttle_success()

    def throttle_classes(self):
        """Return throttle classes"""
        return [UserRateThrottle]


class OrganizationRateThrottle(BaseThrottle):
    """Rate throttle per organization"""

    scope = "org"
    
    # 10,000 requests per hour per organization
    THROTTLE_RATES = {
        "org": "10000/hour",
    }

    def allow_request(self, request, view):
        """Allow request if within org rate limits"""
        if not hasattr(request.user, 'organization'):
            return True
        
        org_id = str(request.user.organization.id)
        self.key = f"throttle_{self.scope}_{org_id}"
        self.now = timezone.now()
        
        self.history = cache.get(self.key, [])
        
        # Drop old requests
        window_start = self.now - timedelta(hours=1)
        self.history = [t for t in self.history if t > window_start]
        
        if len(self.history) >= 10000:
            return False
        
        self.history.insert(0, self.now)
        cache.set(self.key, self.history, 3600)
        return True


class EndpointRateThrottle(BaseThrottle):
    """Rate throttle per endpoint and user"""

    def allow_request(self, request, view):
        """Allow request based on endpoint-specific limits"""
        if not hasattr(request.user, 'organization'):
            return True
        
        # Different limits for different endpoints
        view_name = view.__class__.__name__
        user_id = str(request.user.id)
        
        # Get limit based on endpoint
        endpoint_limits = {
            'SendMessageViewSet': 100,  # 100/hour
            'ProcessCampaignViewSet': 10,  # 10/hour
            'AnalyticsViewSet': 1000,  # 1000/hour
        }
        
        limit = endpoint_limits.get(view_name, 100)
        
        self.key = f"throttle:{view_name}:{user_id}"
        self.now = timezone.now()
        
        self.history = cache.get(self.key, [])
        
        # Drop old requests (1 hour window)
        window_start = self.now - timedelta(hours=1)
        self.history = [t for t in self.history if t > window_start]
        
        if len(self.history) >= limit:
            return False
        
        self.history.insert(0, self.now)
        cache.set(self.key, self.history, 3600)
        return True


class RateLimitHeadersMixin:
    """Mixin to add rate limit headers to response"""

    def finalize_response(self, request, response, *args, **kwargs):
        """Add rate limit headers"""
        response = super().finalize_response(request, response, *args, **kwargs)
        
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_id = str(request.user.id)
            key = f"throttle:user:{user_id}"
            
            history = cache.get(key, [])
            now = timezone.now()
            
            # Count requests in last hour
            window_start = now - timedelta(hours=1)
            requests_used = len([t for t in history if t > window_start])
            requests_limit = 100
            requests_remaining = max(0, requests_limit - requests_used)
            
            response['X-RateLimit-Limit'] = str(requests_limit)
            response['X-RateLimit-Remaining'] = str(requests_remaining)
            response['X-RateLimit-Reset'] = str(int((now + timedelta(hours=1)).timestamp()))
        
        return response
