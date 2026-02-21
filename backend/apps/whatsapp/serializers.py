"""
WhatsApp serializers
"""
from rest_framework import serializers
from .models import WhatsAppNumber, WhatsAppTemplate


class WhatsAppNumberListSerializer(serializers.ModelSerializer):
    webhook_url_full = serializers.SerializerMethodField()

    class Meta:
        model = WhatsAppNumber
        fields = [
            'id', 'phone_number', 'display_name', 'connection_type',
            'status', 'is_active', 'is_verified', 'quality_rating',
            'webhook_token', 'webhook_url_full', 'webhook_verify_token',
            'created_at'
        ]
        read_only_fields = ['id', 'webhook_token', 'webhook_url_full', 'created_at']

    def get_webhook_url_full(self, obj):
        """Generate FULL webhook URL with domain for Meta configuration"""
        if obj.webhook_token:
            request = self.context.get('request')
            if request:
                scheme = 'https' if request.is_secure() else 'http'
                host = request.get_host()
                return f"{scheme}://{host}/api/v1/webhooks/whatsapp/{obj.webhook_token}/"
            else:
                from django.conf import settings
                base_url = getattr(settings, 'BASE_URL', 'https://pytake.net')
                return f"{base_url}/api/v1/webhooks/whatsapp/{obj.webhook_token}/"
        return None


class WhatsAppNumberDetailSerializer(serializers.ModelSerializer):
    webhook_url = serializers.SerializerMethodField()
    webhook_url_full = serializers.SerializerMethodField()

    class Meta:
        model = WhatsAppNumber
        fields = [
            'id', 'organization', 'connection_type', 'phone_number',
            'display_name', 'about', 'profile_picture_url',
            'phone_number_id', 'whatsapp_business_account_id',
            'access_token', 'webhook_verify_token',
            'evolution_instance_name', 'evolution_api_url',
            'is_active', 'is_verified', 'verified_at',
            'status', 'connected_at', 'last_seen_at',
            'quality_rating', 'messaging_limit_tier',
            'default_chatbot', 'default_department',
            'business_hours', 'away_message', 'welcome_message',
            'settings', 'webhook_token', 'webhook_url', 'webhook_url_full',
            'webhook_id', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'webhook_token', 'webhook_url', 'webhook_url_full',
            'webhook_id', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'access_token': {'write_only': True},
            'app_secret': {'write_only': True},
            'evolution_api_key': {'write_only': True}
        }

    def get_webhook_url(self, obj):
        """Generate relative webhook URL using webhook_token"""
        if obj.webhook_token:
            return f"/api/v1/webhooks/whatsapp/{obj.webhook_token}/"
        return None

    def get_webhook_url_full(self, obj):
        """
        Generate FULL webhook URL with domain for Meta configuration
        Returns the complete URL that should be configured in Meta WhatsApp
        """
        if obj.webhook_token:
            # Get request from context
            request = self.context.get('request')

            if request:
                # Build absolute URL using request's scheme and host
                scheme = 'https' if request.is_secure() else 'http'
                host = request.get_host()
                return f"{scheme}://{host}/api/v1/webhooks/whatsapp/{obj.webhook_token}/"
            else:
                # Fallback: use environment-based URL
                from django.conf import settings
                base_url = getattr(settings, 'BASE_URL', 'https://pytake.net')
                return f"{base_url}/api/v1/webhooks/whatsapp/{obj.webhook_token}/"

        return None


class WhatsAppTemplateListSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppTemplate
        fields = [
            'id', 'name', 'language', 'category', 'status',
            'quality_score', 'sent_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class WhatsAppTemplateDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppTemplate
        fields = [
            'id', 'organization', 'whatsapp_number', 'name', 'language',
            'category', 'suggested_category', 'meta_template_id', 'status',
            'rejected_reason', 'approved_at', 'rejected_at',
            'ai_analysis_result', 'ai_analysis_score',
            'ai_suggested_category', 'ai_analyzed_at',
            'header_type', 'header_text', 'header_variables_count',
            'body_text', 'body_variables_count', 'footer_text',
            'buttons', 'variables', 'parameter_format', 'named_variables',
            'quality_score', 'paused_at', 'disabled_at', 'disabled_reason',
            'sent_count', 'delivered_count', 'read_count', 'failed_count',
            'is_system_template', 'is_enabled', 'can_be_used',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'meta_template_id', 'ai_analysis_result',
            'can_be_used', 'created_at', 'updated_at'
        ]
