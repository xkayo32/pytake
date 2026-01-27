"""
Webhook URLs
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    WebhookEventViewSet,
    WebhookEndpointViewSet,
    whatsapp_webhook_receiver,
    whatsapp_webhook_verify
)

router = DefaultRouter()
router.register('webhook-events', WebhookEventViewSet, basename='webhook-event')
router.register('webhook-endpoints', WebhookEndpointViewSet, basename='webhook-endpoint')

urlpatterns = [
    # WhatsApp webhook receiver
    path('webhooks/whatsapp/<uuid:wa_number_id>/', whatsapp_webhook_receiver, name='whatsapp-webhook-receiver'),
    path('webhooks/whatsapp/<uuid:wa_number_id>/verify/', whatsapp_webhook_verify, name='whatsapp-webhook-verify'),
] + router.urls
