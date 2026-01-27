"""
Campaign serializers
"""
from rest_framework import serializers
from .models import Campaign


class CampaignListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = [
            'id', 'name', 'status', 'scheduled_at', 'started_at',
            'target_contacts_count', 'sent_count', 'delivered_count',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CampaignDetailSerializer(serializers.ModelSerializer):
    delivery_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = Campaign
        fields = [
            'id', 'organization', 'whatsapp_number', 'name', 'description',
            'status', 'scheduled_at', 'started_at', 'completed_at',
            'target_contacts_count', 'target_filter', 'message_template_id',
            'message_content', 'message_variables', 'sent_count',
            'delivered_count', 'read_count', 'failed_count', 'delivery_rate',
            'settings', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sent_count', 'delivered_count', 'read_count',
            'failed_count', 'delivery_rate', 'created_at', 'updated_at'
        ]
    
    def get_delivery_rate(self, obj):
        if obj.sent_count == 0:
            return 0
        return round((obj.delivered_count / obj.sent_count) * 100, 2)
