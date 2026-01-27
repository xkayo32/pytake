"""
Integration URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.integrations.views import (
    IntegrationProviderViewSet,
    IntegrationLogViewSet,
    WebhookDestinationViewSet,
    WebhookDeliveryAttemptViewSet,
)

router = DefaultRouter()
router.register(r"providers", IntegrationProviderViewSet, basename="provider")
router.register(r"logs", IntegrationLogViewSet, basename="integration-log")
router.register(r"webhooks", WebhookDestinationViewSet, basename="webhook-destination")
router.register(r"deliveries", WebhookDeliveryAttemptViewSet, basename="webhook-delivery-attempt")

urlpatterns = [
    path("", include(router.urls)),
]
