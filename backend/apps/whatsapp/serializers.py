"""
WhatsApp serializers
"""
from rest_framework import serializers
from .models import WhatsAppNumber, WhatsAppTemplate


class WhatsAppNumberListSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppNumber
        fields = [
            'id', 'phone_number', 'display_name', 'connection_type',
            'status', 'is_active', 'is_verified', 'quality_rating',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class WhatsAppNumberDetailSerializer(serializers.ModelSerializer):
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
            'settings', 'webhook_token', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'webhook_token', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'access_token': {'write_only': True},
            'app_secret': {'write_only': True},
            'evolution_api_key': {'write_only': True}
        }


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
