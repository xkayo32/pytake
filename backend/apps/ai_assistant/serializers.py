"""
AI Assistant serializers
"""
from rest_framework import serializers
from .models import AICustomModel


class AICustomModelListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AICustomModel
        fields = [
            'id', 'name', 'provider', 'model_id', 'is_active',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AICustomModelDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = AICustomModel
        fields = [
            'id', 'organization', 'name', 'provider', 'model_id',
            'config', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
