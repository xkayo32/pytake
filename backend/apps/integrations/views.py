"""
Integration ViewSets
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.integrations.models import (
    IntegrationProvider,
    IntegrationLog,
    WebhookDestination,
    WebhookDeliveryAttempt,
)
from apps.integrations.serializers import (
    IntegrationProviderListSerializer,
    IntegrationProviderDetailSerializer,
    IntegrationLogListSerializer,
    IntegrationLogDetailSerializer,
    WebhookDestinationListSerializer,
    WebhookDestinationDetailSerializer,
    WebhookDeliveryAttemptListSerializer,
    WebhookDeliveryAttemptDetailSerializer,
    IntegrationCreateUpdateSerializer,
)
from apps.authentication.permissions import HasRBACPermission


class IntegrationProviderViewSet(viewsets.ModelViewSet):
    """CRUD for integration providers"""

    permission_classes = [HasRBACPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["provider", "status"]
    search_fields = ["provider"]
    ordering_fields = ["created_at", "last_used_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return IntegrationProvider.objects.none()
        return IntegrationProvider.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True,
        )

    def get_serializer_class(self):
        if self.action == "list":
            return IntegrationProviderListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return IntegrationCreateUpdateSerializer
        return IntegrationProviderDetailSerializer

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)

    @action(detail=True, methods=["post"])
    def test(self, request, pk=None):
        """Test integration connection"""
        integration = self.get_object()
        
        try:
            # Basic connection test
            if integration.provider == "whatsapp":
                from apps.integrations.clients.whatsapp import WhatsAppBusinessClient
                client = WhatsAppBusinessClient(
                    integration.config.get("phone_number_id"),
                    integration.api_key,
                )
                info = client.get_phone_number_info()
                return Response({
                    "status": "success",
                    "message": "WhatsApp connection successful",
                    "data": info,
                })
            elif integration.provider in ["openai", "anthropic", "google_gemini"]:
                from apps.integrations.clients.ai import get_ai_client
                client = get_ai_client(
                    integration.provider,
                    integration.api_key,
                )
                # Test with simple prompt
                response = client.complete("Say 'OK'")
                return Response({
                    "status": "success",
                    "message": "AI integration successful",
                    "response": response,
                })
            else:
                return Response({
                    "status": "pending",
                    "message": "Test not implemented for this provider",
                }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        """Deactivate integration"""
        integration = self.get_object()
        integration.status = "inactive"
        integration.save()
        return Response({"status": "deactivated"})

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        """Activate integration"""
        integration = self.get_object()
        integration.status = "active"
        integration.save()
        return Response({"status": "activated"})


class IntegrationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access to integration logs"""

    permission_classes = [HasRBACPermission]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["integration", "status", "method"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return IntegrationLog.objects.none()
        return IntegrationLog.objects.filter(
            integration__organization=self.request.user.organization,
            integration__deleted_at__isnull=True,
        )

    def get_serializer_class(self):
        if self.action == "list":
            return IntegrationLogListSerializer
        return IntegrationLogDetailSerializer


class WebhookDestinationViewSet(viewsets.ModelViewSet):
    """CRUD for webhook endpoints"""

    permission_classes = [HasRBACPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status"]
    search_fields = ["name", "url"]
    ordering_fields = ["created_at", "last_triggered_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return WebhookDestination.objects.none()
        return WebhookDestination.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True,
        )

    def get_serializer_class(self):
        if self.action == "list":
            return WebhookDestinationListSerializer
        return WebhookDestinationDetailSerializer

    def perform_create(self, serializer):
        import secrets
        serializer.save(
            organization=self.request.user.organization,
            secret_key=secrets.token_urlsafe(32),
        )

    @action(detail=True, methods=["post"])
    def test(self, request, pk=None):
        """Send test webhook"""
        import json
        import hashlib
        import hmac
        
        endpoint = self.get_object()
        payload = {
            "event": "test",
            "organization_id": str(endpoint.organization.id),
            "timestamp": str(endpoint.updated_at.isoformat()),
        }
        
        # Create signature
        signature = "sha256=" + hmac.new(
            endpoint.secret_key.encode(),
            json.dumps(payload).encode(),
            hashlib.sha256,
        ).hexdigest()
        
        headers = {
            "X-Webhook-Signature": signature,
            "Content-Type": "application/json",
            **(endpoint.headers or {}),
        }
        
        try:
            import requests
            response = requests.post(
                endpoint.url,
                json=payload,
                headers=headers,
                timeout=10,
            )
            return Response({
                "status": "success",
                "http_status": response.status_code,
                "message": "Test webhook sent",
            })
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def deliveries(self, request, pk=None):
        """Get webhook deliveries"""
        endpoint = self.get_object()
        deliveries = endpoint.deliveries.all()
        
        # Filter by status if provided
        status_param = request.query_params.get("status")
        if status_param:
            deliveries = deliveries.filter(status=status_param)
        
        serializer = WebhookDeliveryAttemptListSerializer(
            deliveries.order_by("-created_at")[:50],
            many=True,
        )
        return Response(serializer.data)


class WebhookDeliveryAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access to webhook deliveries"""

    permission_classes = [HasRBACPermission]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["destination", "status", "event_type"]
    ordering_fields = ["created_at", "last_attempt_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return WebhookDeliveryAttempt.objects.none()
        return WebhookDeliveryAttempt.objects.filter(
            destination__organization=self.request.user.organization,
            destination__deleted_at__isnull=True,
        )

    def get_serializer_class(self):
        if self.action == "list":
            return WebhookDeliveryAttemptListSerializer
        return WebhookDeliveryAttemptDetailSerializer

    @action(detail=True, methods=["post"])
    def retry(self, request, pk=None):
        """Retry webhook delivery"""
        from apps.integrations.tasks import retry_webhook_delivery
        
        delivery = self.get_object()
        retry_webhook_delivery.delay(delivery.id)
        
        return Response({
            "status": "retrying",
            "message": "Webhook delivery queued for retry",
        })
