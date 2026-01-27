"""
Core serializers and base classes
"""
from rest_framework import serializers
from .models import AuditLog, Secret


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'organization', 'user', 'user_email', 'action',
            'resource_type', 'resource_id', 'changes', 'ip_address',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SecretSerializer(serializers.ModelSerializer):
    class Meta:
        model = Secret
        fields = [
            'id', 'organization', 'key', 'encrypted_value',
            'description', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
