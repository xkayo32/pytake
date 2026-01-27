"""
URLs for Services API
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter
from apps.services.api.views import (
    AuditLogViewSet,
    AnalyticsViewSet,
    MessageHistoryViewSet,
)

router = SimpleRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')
router.register(r'analytics', AnalyticsViewSet, basename='analytics')
router.register(r'message-history', MessageHistoryViewSet, basename='message-history')

urlpatterns = [
    path('', include(router.urls)),
]
