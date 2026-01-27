"""
Alert and Notification models
"""
from django.db import models
from apps.core.models import BaseModel, UUIDModel, TimestampModel


class Alert(BaseModel):
    """Alert model for system notifications"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='alerts'
    )
    
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Severity
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    ]
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info', db_index=True)
    
    # Status
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    
    # Timestamps
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    alert_type = models.CharField(max_length=50, db_index=True)
    data = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['severity', 'status']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.severity})"


class AlertNotification(UUIDModel, TimestampModel):
    """Alert notification delivery tracking"""
    
    alert = models.ForeignKey(
        Alert,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='alert_notifications'
    )
    
    channel = models.CharField(max_length=50)  # email, sms, push, slack
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'alert_notifications'
        ordering = ['-created_at']


class Notification(BaseModel):
    """General notification model"""
    
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, db_index=True)
    data = models.JSONField(default=dict, blank=True)
    
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
        ]
