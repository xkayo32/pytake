"""
Chatbot and Flow serializers
"""
from rest_framework import serializers
from .models import Chatbot, FlowAutomation


class ChatbotListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chatbot
        fields = [
            'id', 'name', 'is_active', 'is_published',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ChatbotDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chatbot
        fields = [
            'id', 'organization', 'name', 'description',
            'is_active', 'is_published', 'settings',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FlowAutomationSerializer(serializers.ModelSerializer):
    chatbot_name = serializers.CharField(source='chatbot.name', read_only=True)
    
    class Meta:
        model = FlowAutomation
        fields = [
            'id', 'organization', 'chatbot', 'chatbot_name',
            'name', 'trigger_type', 'trigger_config', 'actions',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
