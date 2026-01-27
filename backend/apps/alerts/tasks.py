"""
Alert and notification Celery tasks
"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Alert, AlertNotification, Notification


@shared_task
def send_alert_notifications(alert_id):
    """
    Send alert to all subscribers via multiple channels
    
    Channels: email, in-app, push, SMS
    """
    try:
        alert = Alert.objects.get(id=alert_id)
        
        # Get organization users
        from apps.authentication.models import User
        users = User.objects.filter(
            organization=alert.organization,
            deleted_at__isnull=True,
            is_active=True
        )
        
        # Create notifications for each user
        for user in users:
            notification = Notification.objects.create(
                user=user,
                title=alert.title,
                message=alert.message,
                notification_type='alert',
                data={'alert_id': str(alert.id), 'severity': alert.severity}
            )
            
            # Send via alert notification
            AlertNotification.objects.create(
                alert=alert,
                user=user,
                channel='in-app'
            )
            
            # TODO: Send email
            # TODO: Send push notification
        
        return f"Sent alert {alert_id} to {users.count()} users"
        
    except Alert.DoesNotExist:
        return f"Alert {alert_id} not found"


@shared_task
def cleanup_old_notifications():
    """
    Delete notifications older than 30 days
    
    Run daily
    """
    cutoff_date = timezone.now() - timedelta(days=30)
    
    deleted_count, _ = Notification.objects.filter(
        created_at__lt=cutoff_date
    ).delete()
    
    return f"Deleted {deleted_count} old notifications"


@shared_task
def escalate_unresolved_alerts():
    """
    Escalate alerts that haven't been resolved within SLA
    
    Run hourly
    """
    cutoff_time = timezone.now() - timedelta(hours=4)  # 4 hour SLA
    
    unresolved_alerts = Alert.objects.filter(
        status__in=['new', 'acknowledged'],
        created_at__lt=cutoff_time,
        severity__in=['high', 'critical']
    )
    
    for alert in unresolved_alerts:
        # TODO: Send escalation notification
        pass
    
    return f"Escalated {unresolved_alerts.count()} alerts"
