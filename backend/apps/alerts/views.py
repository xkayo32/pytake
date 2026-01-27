"""
Alert and Notification views
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Alert, AlertNotification, Notification
from .serializers import (
    AlertListSerializer, AlertDetailSerializer,
    AlertNotificationSerializer, NotificationListSerializer, NotificationDetailSerializer
)
from apps.authentication.permissions import IsOrganizerUser


class AlertViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoints for Alerts (System Alerts)
    GET /api/v1/alerts/ - List alerts
    GET /api/v1/alerts/{id}/ - Get alert details
    POST /api/v1/alerts/{id}/acknowledge/ - Acknowledge alert
    POST /api/v1/alerts/{id}/resolve/ - Resolve alert
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['severity', 'status', 'alert_type']
    ordering_fields = ['created_at', 'severity']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Return only user's organization alerts"""
        if getattr(self, 'swagger_fake_view', False):
            return Alert.objects.none()
        return Alert.objects.filter(
            organization=self.request.user.organization
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AlertDetailSerializer
        return AlertListSerializer
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge alert"""
        alert = self.get_object()
        alert.status = 'acknowledged'
        alert.acknowledged_at = timezone.now()
        alert.save()
        
        return Response(AlertDetailSerializer(alert).data)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve alert"""
        alert = self.get_object()
        alert.status = 'resolved'
        alert.resolved_at = timezone.now()
        alert.save()
        
        return Response(AlertDetailSerializer(alert).data)


class NotificationViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Notifications (User Notifications)
    GET /api/v1/notifications/ - List user's notifications
    GET /api/v1/notifications/{id}/ - Get notification details
    PUT /api/v1/notifications/{id}/ - Mark as read
    POST /api/v1/notifications/mark-all-read/ - Mark all as read
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return only current user notifications"""
        return Notification.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return NotificationDetailSerializer
        return NotificationListSerializer
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        notifications = self.get_queryset().filter(is_read=False)
        updated = notifications.update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'updated_count': updated,
            'message': 'All notifications marked as read'
        })
    
    def partial_update(self, request, *args, **kwargs):
        """Mark notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        
        return Response(NotificationDetailSerializer(notification).data)


class AlertNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoints for Alert Notifications (Alert Recipients)
    GET /api/v1/alert-notifications/ - List alert notifications
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AlertNotificationSerializer
    
    def get_queryset(self):
        """Return only current user alert notifications"""
        return AlertNotification.objects.filter(user=self.request.user)


from django.utils import timezone
