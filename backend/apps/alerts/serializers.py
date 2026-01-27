"""
Alert and Notification serializers
"""
from rest_framework import serializers
from .models import Alert, AlertNotification, Notification


class AlertListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = [
            'id', 'title', 'severity', 'status', 'alert_type',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AlertDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = [
            'id', 'organization', 'title', 'message', 'severity',
            'status', 'acknowledged_at', 'resolved_at', 'alert_type',
            'data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AlertNotificationSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = AlertNotification
        fields = [
            'id', 'alert', 'user', 'user_email', 'channel',
            'sent_at', 'read_at', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'sent_at', 'created_at']


class NotificationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'notification_type', 'is_read',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class NotificationDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'title', 'message', 'notification_type',
            'data', 'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
