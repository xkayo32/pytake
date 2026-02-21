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
from .socketio import socketio_endpoint

router = DefaultRouter()
router.register('webhook-events', WebhookEventViewSet, basename='webhook-event')
router.register('webhook-endpoints', WebhookEndpointViewSet, basename='webhook-endpoint')

urlpatterns = [
    # Socket.IO endpoint for real-time communication
    path('socket.io/', socketio_endpoint, name='socketio'),
    # WhatsApp webhook receiver (handles both GET verification and POST message events)
    path('webhooks/whatsapp/<uuid:wa_number_id>/', whatsapp_webhook_receiver, name='whatsapp-webhook-receiver'),
    # Deprecated: kept for backwards compatibility, redirects to main endpoint
    path('webhooks/whatsapp/<uuid:wa_number_id>/verify/', whatsapp_webhook_verify, name='whatsapp-webhook-verify'),
] + router.urls
