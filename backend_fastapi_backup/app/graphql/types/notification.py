"""
Notification GraphQL Types
"""

from datetime import datetime
from typing import Optional

import strawberry


# ============================================
# NOTIFICATION PREFERENCES
# ============================================

@strawberry.type
class NotificationPreferenceType:
    """Notification preferences for a user"""

    id: int
    user_id: strawberry.ID
    organization_id: strawberry.ID
    email_enabled: bool
    sms_enabled: bool
    whatsapp_enabled: bool
    websocket_enabled: bool
    in_app_enabled: bool
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    quiet_hours_enabled: bool
    max_emails_per_hour: int
    max_sms_per_hour: int
    created_at: datetime
    updated_at: datetime


@strawberry.input
class NotificationPreferenceUpdateInput:
    """Input for updating notification preferences"""

    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    websocket_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    quiet_hours_enabled: Optional[bool] = None
    max_emails_per_hour: Optional[int] = None
    max_sms_per_hour: Optional[int] = None


# ============================================
# NOTIFICATION LOGS
# ============================================

@strawberry.type
class NotificationLogType:
    """Notification log entry"""

    id: int
    organization_id: strawberry.ID
    user_id: strawberry.ID
    notification_type: str
    channel: str
    subject: Optional[str] = None
    message: str
    recipient: str
    status: str  # pending, sent, failed, bounced
    error_message: Optional[str] = None
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    notification_metadata: Optional[strawberry.scalars.JSON] = None
    retry_count: int
