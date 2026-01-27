"""
Queue and Agent Skills serializers
"""
from rest_framework import serializers
from .models import Queue, AgentSkill


class QueueListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Queue
        fields = [
            'id', 'name', 'is_active', 'priority', 'routing_strategy',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class QueueDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Queue
        fields = [
            'id', 'organization', 'department', 'department_name', 'name',
            'description', 'is_active', 'priority',
            'max_conversations_per_agent', 'auto_assign',
            'routing_strategy', 'settings', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AgentSkillSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = AgentSkill
        fields = [
            'id', 'user', 'user_name', 'name', 'level',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
