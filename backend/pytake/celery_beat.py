"""
Celery Beat schedule for periodic tasks
"""
Celery Beat Schedule Configuration
Periodic tasks executed by Celery Beat scheduler
"""
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Campaign scheduling
    'schedule-campaigns': {
        'task': 'apps.campaigns.tasks.schedule_campaign',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    
    # Conversation cleanup
    'close-inactive-conversations': {
        'task': 'apps.conversations.tasks.auto_close_inactive_conversations',
        'schedule': crontab(hour=0, minute=0),  # Daily at midnight
    },
    
    # Alert escalation
    'escalate-unresolved-alerts': {
        'task': 'apps.alerts.tasks.escalate_unresolved_alerts',
        'schedule': crontab(minute=0),  # Every hour
    },
    
    # Cleanup old notifications
    'cleanup-notifications': {
        'task': 'apps.alerts.tasks.cleanup_old_notifications',
        'schedule': crontab(hour=1, minute=0),  # Daily at 1 AM
    },
    
    # Cleanup old audit logs
    'cleanup-audit-logs': {
        'task': 'apps.core.tasks.cleanup_old_audit_logs',
        'schedule': crontab(day_of_week=0, hour=2, minute=0),  # Weekly on Sunday at 2 AM
    },
    
    # Daily sync
    'sync-contacts-daily': {
        'task': 'apps.core.tasks.sync_contacts_daily',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
    },
    
    # Integration health checks
    'check-integration-health': {
        'task': 'apps.integrations.tasks.check_integration_health',
        'schedule': crontab(minute=0),  # Every hour
    },
    
    # Cleanup old integration logs
    'cleanup-integration-logs': {
        'task': 'apps.integrations.tasks.cleanup_old_integration_logs',
        'schedule': crontab(hour=4, minute=0),  # Daily at 4 AM
    },
    
    # Services - Email delivery status
    'check-email-delivery-status': {
        'task': 'apps.services.tasks.check_email_delivery_status',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
    },
    
    # Services - SMS delivery status
    'check-sms-delivery-status': {
        'task': 'apps.services.tasks.check_sms_delivery_status',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
    },
    
    # Services - Cleanup old reports
    'cleanup-old-reports': {
        'task': 'apps.services.tasks.cleanup_old_reports',
        'schedule': crontab(hour=5, minute=0),  # Daily at 5 AM
    },
    
    # Services - Sync Stripe events
    'sync-stripe-events': {
        'task': 'apps.services.tasks.sync_stripe_events',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
    },
}
