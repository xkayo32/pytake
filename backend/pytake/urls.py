"""
Main URL configuration for PyTake Django backend
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

# API Router
router = routers.DefaultRouter()

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API Routes
    path('api/v1/auth/', include('apps.authentication.urls')),
    
    # Future: Add other app URLs here
    # path('api/v1/organizations/', include('apps.organizations.urls')),
    # path('api/v1/conversations/', include('apps.conversations.urls')),
    # path('api/v1/campaigns/', include('apps.campaigns.urls')),
    # ... etc
]
