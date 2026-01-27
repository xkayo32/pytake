"""
Organization and Department serializers
"""
from rest_framework import serializers
from .models import Organization, Department


class OrganizationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'logo_url', 'plan_type',
            'is_active', 'is_trial', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class OrganizationDetailSerializer(serializers.ModelSerializer):
    users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'description', 'logo_url',
            'plan_type', 'plan_starts_at', 'plan_expires_at',
            'max_chatbots', 'max_whatsapp_numbers', 'max_contacts',
            'max_agents', 'max_departments', 'monthly_message_limit',
            'current_chatbots_count', 'current_whatsapp_numbers_count',
            'current_contacts_count', 'current_agents_count',
            'current_month_messages_sent', 'current_month_messages_received',
            'is_active', 'is_trial', 'trial_ends_at',
            'stripe_customer_id', 'stripe_subscription_id',
            'settings', 'users_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_users_count(self, obj):
        return obj.users.filter(deleted_at__isnull=True).count()


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = [
            'id', 'organization', 'name', 'description',
            'is_active', 'settings', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
