"""
Celery Application Configuration

Configures Celery for background tasks and periodic scheduling
"""

from celery import Celery
from celery.schedules import crontab
from app.core.config import get_settings

settings = get_settings()

# Create Celery app
celery_app = Celery(
    "pytake",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

# Celery Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,

    # Task execution settings
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes

    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour

    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,

    # Task routes
    task_routes={
        "sync_templates_from_meta": {"queue": "templates"},
        "sync_single_number_templates": {"queue": "templates"},
        "execute_campaign": {"queue": "campaigns"},
        "process_batch": {"queue": "campaigns"},
        "finalize_campaign": {"queue": "campaigns"},
        "process_scheduled_campaigns": {"queue": "campaigns"},
        "process_webhook": {"queue": "webhooks"},
    },
)

# Celery Beat Schedule - Periodic Tasks
celery_app.conf.beat_schedule = {
    # Template Synchronization - Every hour
    "sync-templates-hourly": {
        "task": "sync_templates_from_meta",
        "schedule": crontab(minute=0),  # Every hour at minute 0
        "options": {
            "queue": "templates",
            "expires": 3600,  # Task expires after 1 hour
        },
    },

    # Example: Campaign processing - Every 5 minutes
    "process-scheduled-campaigns": {
        "task": "process_scheduled_campaigns",
        "schedule": crontab(minute="*/5"),
        "options": {
            "queue": "campaigns",
            "expires": 300,  # Task expires after 5 minutes
        },
    },

    # Conversation Inactivity Check - Configurable interval (default: every 5 minutes)
    "check-conversation-inactivity": {
        "task": "check_conversation_inactivity",
        "schedule": crontab(minute=f"*/{settings.CONVERSATION_INACTIVITY_CHECK_INTERVAL_MINUTES}"),
        "options": {
            "queue": "default",
            "expires": settings.CONVERSATION_INACTIVITY_CHECK_INTERVAL_MINUTES * 60,
        },
    },

    # Example: Cleanup old data - Every day at 3 AM
    # "cleanup-old-data": {
    #     "task": "cleanup_old_messages",
    #     "schedule": crontab(hour=3, minute=0),
    #     "options": {"queue": "maintenance"},
    # },
}

# Auto-discover tasks
celery_app.autodiscover_tasks(
    [
        "app.tasks.template_sync",
        "app.tasks.campaign_tasks",
        "app.tasks.flow_automation_tasks",
        "app.tasks.conversation_timeout_tasks",
        # Add other task modules here as needed
        # "app.tasks.webhook_tasks",
    ]
)


@celery_app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery configuration"""
    print(f"Request: {self.request!r}")
