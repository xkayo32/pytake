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
from apps.services.api.business_views import (
    EmailViewSet,
    SMSViewSet,
    PaymentViewSet,
    ReportingViewSet,
)
from apps.services.api.webhooks import (
    StripeWebhookViewSet,
    SendGridWebhookViewSet,
    TwilioWebhookViewSet,
)

router = SimpleRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')
router.register(r'analytics', AnalyticsViewSet, basename='analytics')
router.register(r'message-history', MessageHistoryViewSet, basename='message-history')
router.register(r'email', EmailViewSet, basename='email')
router.register(r'sms', SMSViewSet, basename='sms')
router.register(r'payments', PaymentViewSet, basename='payments')
router.register(r'reports', ReportingViewSet, basename='reports')

# Webhooks (no authentication required)
webhook_patterns = [
    path('stripe/', StripeWebhookViewSet.as_view({'post': 'create'}), name='stripe-webhook'),
    path('sendgrid/', SendGridWebhookViewSet.as_view({'post': 'create'}), name='sendgrid-webhook'),
    path('twilio/', TwilioWebhookViewSet.as_view({'post': 'create'}), name='twilio-webhook'),
]

urlpatterns = [
    path('', include(router.urls)),
    path('webhooks/', include(webhook_patterns)),
]
