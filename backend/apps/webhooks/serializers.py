"""
Webhook serializers
"""
from rest_framework import serializers
from .models import WebhookEvent, WebhookEndpoint


class WebhookEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEvent
        fields = [
            'id', 'organization', 'event_type', 'status', 'source',
            'event_data', 'external_id', 'processed_at', 'error_message',
            'retry_count', 'created_at'
        ]
        read_only_fields = [
            'id', 'processed_at', 'retry_count', 'created_at'
        ]


class WebhookEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEndpoint
        fields = [
            'id', 'organization', 'name', 'url', 'is_active',
            'secret_key', 'ip_whitelist', 'events',
            'total_deliveries', 'successful_deliveries', 'failed_deliveries',
            'last_delivery_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'secret_key', 'total_deliveries', 'successful_deliveries',
            'failed_deliveries', 'last_delivery_at', 'created_at'
        ]
        extra_kwargs = {
            'secret_key': {'write_only': True}
        }
