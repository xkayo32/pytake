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
    path('api/v1/', include('apps.organizations.urls')),
    path('api/v1/', include('apps.conversations.urls')),
    path('api/v1/', include('apps.campaigns.urls')),
    
    # Future: Add other app URLs here
    # path('api/v1/chatbots/', include('apps.chatbots.urls')),
    # path('api/v1/whatsapp/', include('apps.whatsapp.urls')),
    # path('api/v1/queues/', include('apps.queues.urls')),
    # path('api/v1/alerts/', include('apps.alerts.urls')),
    # ... etc
]
