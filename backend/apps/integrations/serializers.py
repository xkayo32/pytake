"""
Integration Serializers
"""
from rest_framework import serializers

from apps.integrations.models import (
    IntegrationProvider,
    IntegrationLog,
    WebhookDestination,
    WebhookDeliveryAttempt,
)


class IntegrationProviderListSerializer(serializers.ModelSerializer):
    """List serializer for integration providers (minimal data)"""

    provider_name = serializers.CharField(source="get_provider_display", read_only=True)

    class Meta:
        model = IntegrationProvider
        fields = [
            "id",
            "provider",
            "provider_name",
            "status",
            "requests_today",
            "requests_limit",
            "last_used_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class IntegrationProviderDetailSerializer(serializers.ModelSerializer):
    """Detail serializer for integration providers"""

    provider_name = serializers.CharField(source="get_provider_display", read_only=True)
    status_name = serializers.CharField(source="get_status_display", read_only=True)
    error_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = IntegrationProvider
        fields = [
            "id",
            "provider",
            "provider_name",
            "status",
            "status_name",
            "api_key",
            "config",
            "requests_today",
            "requests_limit",
            "last_used_at",
            "last_error",
            "error_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "api_key": {"write_only": True},
        }


class IntegrationLogListSerializer(serializers.ModelSerializer):
    """List serializer for integration logs"""

    provider_name = serializers.CharField(
        source="integration.get_provider_display",
        read_only=True,
    )

    class Meta:
        model = IntegrationLog
        fields = [
            "id",
            "provider_name",
            "action",
            "method",
            "status_code",
            "status",
            "response_time_ms",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class IntegrationLogDetailSerializer(serializers.ModelSerializer):
    """Detail serializer for integration logs"""

    provider_name = serializers.CharField(
        source="integration.get_provider_display",
        read_only=True,
    )

    class Meta:
        model = IntegrationLog
        fields = [
            "id",
            "provider_name",
            "action",
            "endpoint",
            "method",
            "status_code",
            "status",
            "response_time_ms",
            "request_body",
            "response_body",
            "error_message",
            "external_id",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class WebhookDestinationListSerializer(serializers.ModelSerializer):
    """List serializer for webhook destinations"""

    status_name = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = WebhookDestination
        fields = [
            "id",
            "name",
            "url",
            "status",
            "status_name",
            "total_delivered",
            "total_failed",
            "last_triggered_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class WebhookDestinationDetailSerializer(serializers.ModelSerializer):
    """Detail serializer for webhook destinations"""

    status_name = serializers.CharField(source="get_status_display", read_only=True)
    deliveries_count = serializers.SerializerMethodField()

    class Meta:
        model = WebhookDestination
        fields = [
            "id",
            "name",
            "url",
            "events",
            "status",
            "status_name",
            "secret_key",
            "headers",
            "max_retries",
            "retry_interval_seconds",
            "total_delivered",
            "total_failed",
            "last_triggered_at",
            "deliveries_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "secret_key", "created_at", "updated_at"]

    def get_deliveries_count(self, obj):
        return obj.delivery_attempts.count()


class WebhookDeliveryAttemptListSerializer(serializers.ModelSerializer):
    """List serializer for webhook delivery attempts"""

    destination_name = serializers.CharField(source="destination.name", read_only=True)
    status_name = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = WebhookDeliveryAttempt
        fields = [
            "id",
            "destination_name",
            "event_type",
            "status",
            "status_name",
            "attempt_count",
            "last_attempt_at",
            "next_retry_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class WebhookDeliveryAttemptDetailSerializer(serializers.ModelSerializer):
    """Detail serializer for webhook delivery attempts"""

    destination_name = serializers.CharField(source="destination.name", read_only=True)
    status_name = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = WebhookDeliveryAttempt
        fields = [
            "id",
            "destination_name",
            "event_type",
            "payload",
            "status",
            "status_name",
            "attempt_count",
            "last_attempt_at",
            "next_retry_at",
            "http_status_code",
            "response_body",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class IntegrationCreateUpdateSerializer(serializers.ModelSerializer):
    """Create/update serializer for integration providers"""

    class Meta:
        model = IntegrationProvider
        fields = [
            "provider",
            "api_key",
            "api_secret",
            "config",
            "requests_limit",
        ]

    def validate_provider(self, value):
        if self.instance is None:  # Create
            organization = self.context["request"].user.organization
            if IntegrationProvider.objects.filter(
                organization=organization,
                provider=value,
            ).exists():
                raise serializers.ValidationError(
                    f"Integration for {value} already exists."
                )
        return value
