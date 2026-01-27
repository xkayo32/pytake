"""
Main URL configuration for PyTake Django backend
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

# API Router
router = routers.DefaultRouter()

# =============================================================================
# COMPATIBILITY VIEWSETS FOR FRONTEND ALIASES
# =============================================================================
class UserMeAliasViewSet(viewsets.ViewSet):
    """Compatibility endpoint for /auth/me/"""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """GET /auth/me/ - Get current user"""
        from apps.authentication.serializers import UserDetailSerializer
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)

class OrganizationMeAliasViewSet(viewsets.ViewSet):
    """Compatibility endpoint for /organizations/me/"""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """GET /organizations/me/ - Get current user's organization"""
        from apps.organizations.serializers import OrganizationDetailSerializer
        org = request.user.organization
        serializer = OrganizationDetailSerializer(org)
        return Response(serializer.data)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Health Check
    path('api/v1/health/', include('apps.core.urls')),
    
    # API Documentation
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # =============================================================================
    # FRONTEND COMPATIBILITY ALIASES (MUST BE BEFORE INCLUDES)
    # =============================================================================
    # Alias: /api/v1/auth/me/ -> returns current user (like /auth/users/me/)
    path('api/v1/auth/me/', UserMeAliasViewSet.as_view({'get': 'list'}), name='auth-me-alias'),
    
    # Alias: /api/v1/organizations/me/ -> returns current organization (like /organizations/current/)
    path('api/v1/organizations/me/', OrganizationMeAliasViewSet.as_view({'get': 'list'}), name='organizations-me-alias'),
    
    # API Routes - All v1 endpoints
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/', include('apps.organizations.urls')),
    path('api/v1/', include('apps.conversations.urls')),
    path('api/v1/', include('apps.campaigns.urls')),
    path('api/v1/', include('apps.chatbots.urls')),
    path('api/v1/', include('apps.whatsapp.urls')),
    path('api/v1/', include('apps.queues.urls')),
    path('api/v1/', include('apps.alerts.urls')),
    path('api/v1/', include('apps.ai_assistant.urls')),
    path('api/v1/', include('apps.analytics.urls')),
    path('api/v1/', include('apps.webhooks.urls')),
    path('api/v1/integrations/', include('apps.integrations.urls')),
    path('api/v1/', include('apps.services.api.urls')),
]
