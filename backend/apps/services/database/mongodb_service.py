"""
Integrated MongoDB Services for PyTake
Provides high-level access to all MongoDB operations
"""
from typing import Dict, List, Optional
from apps.services.utils.mongodb import (
    MessageLogger,
    AuditLogger,
    AnalyticsLogger,
    EventStore,
)
import logging

logger = logging.getLogger(__name__)


class MongoDBService:
    """
    High-level MongoDB service that combines all logging operations
    Provides unified interface for all MongoDB-related operations
    """

    def __init__(self, organization_id: str = None):
        """
        Initialize MongoDB service with optional organization context

        Args:
            organization_id: Organization UUID for multi-tenancy
        """
        self.organization_id = organization_id
        self.message_logger = MessageLogger()
        self.audit_logger = AuditLogger()
        self.analytics_logger = AnalyticsLogger()
        self.event_store = EventStore()

    # ========================================
    # MESSAGE LOGGING OPERATIONS
    # ========================================

    def log_message(
        self,
        conversation_id: str,
        sender_id: str,
        receiver_id: str,
        message_content: str,
        message_type: str = 'text',
        media_url: Optional[str] = None,
        status: str = 'sent',
        metadata: Optional[Dict] = None,
    ) -> str:
        """Log a WhatsApp message"""
        if not self.organization_id:
            raise ValueError("Organization ID required for message logging")

        return self.message_logger.log_message(
            organization_id=self.organization_id,
            conversation_id=conversation_id,
            sender_id=sender_id,
            receiver_id=receiver_id,
            message_content=message_content,
            message_type=message_type,
            media_url=media_url,
            status=status,
            metadata=metadata,
        )

    def update_message_status(self, message_id: str, status: str):
        """Update message status (delivered, read, failed, etc)"""
        self.message_logger.update_status(message_id, status)

    def get_conversation_history(
        self, conversation_id: str, limit: int = 50
    ) -> List[Dict]:
        """Get message history for a conversation"""
        if not self.organization_id:
            raise ValueError("Organization ID required")

        return self.message_logger.get_conversation_history(
            organization_id=self.organization_id,
            conversation_id=conversation_id,
            limit=limit,
        )

    def search_messages(self, query: str, limit: int = 20) -> List[Dict]:
        """Full-text search in messages"""
        if not self.organization_id:
            raise ValueError("Organization ID required")

        return self.message_logger.search_messages(
            organization_id=self.organization_id,
            query=query,
            limit=limit,
        )

    # ========================================
    # AUDIT LOGGING OPERATIONS
    # ========================================

    def log_action(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        changes: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> str:
        """
        Log a user action for compliance and debugging

        Args:
            user_id: User UUID
            action: Action (create, update, delete, view, etc)
            resource_type: Resource type (campaign, contact, etc)
            resource_id: Resource UUID
            changes: Before/after changes
            ip_address: User IP
            user_agent: Browser user agent

        Returns:
            Audit log ID
        """
        if not self.organization_id:
            raise ValueError("Organization ID required for audit logging")

        return self.audit_logger.log_action(
            organization_id=self.organization_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def get_user_activity(
        self, user_id: str, days: int = 7, limit: int = 100
    ) -> List[Dict]:
        """Get user's activity audit trail"""
        if not self.organization_id:
            raise ValueError("Organization ID required")

        return self.audit_logger.get_user_activity(
            organization_id=self.organization_id,
            user_id=user_id,
            days=days,
            limit=limit,
        )

    def get_resource_history(self, resource_id: str, limit: int = 50) -> List[Dict]:
        """Get audit trail for a specific resource"""
        if not self.organization_id:
            raise ValueError("Organization ID required")

        return self.audit_logger.get_resource_history(
            organization_id=self.organization_id,
            resource_id=resource_id,
            limit=limit,
        )

    # ========================================
    # ANALYTICS OPERATIONS
    # ========================================

    def log_metric(
        self,
        metric_type: str,
        value: float,
        tags: Optional[Dict] = None,
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Log an analytics metric

        Args:
            metric_type: Type (messages_sent, campaigns_executed, etc)
            value: Metric value
            tags: Tags for grouping
            metadata: Additional data

        Returns:
            Metric ID
        """
        if not self.organization_id:
            raise ValueError("Organization ID required for analytics")

        return self.analytics_logger.log_metric(
            organization_id=self.organization_id,
            metric_type=metric_type,
            value=value,
            tags=tags,
            metadata=metadata,
        )

    def get_daily_stats(
        self, metric_type: str, days: int = 30
    ) -> List[Dict]:
        """Get daily aggregated metrics"""
        if not self.organization_id:
            raise ValueError("Organization ID required")

        return self.analytics_logger.aggregate_daily(
            organization_id=self.organization_id,
            metric_type=metric_type,
            days=days,
        )

    def get_hourly_stats(
        self, metric_type: str, hours: int = 24
    ) -> List[Dict]:
        """Get hourly aggregated metrics"""
        if not self.organization_id:
            raise ValueError("Organization ID required")

        return self.analytics_logger.get_hourly_stats(
            organization_id=self.organization_id,
            metric_type=metric_type,
            hours=hours,
        )

    # ========================================
    # EVENT SOURCING OPERATIONS
    # ========================================

    def store_event(
        self,
        event_type: str,
        event_data: Dict,
        aggregate_id: Optional[str] = None,
        aggregate_type: Optional[str] = None,
    ) -> str:
        """
        Store an event for event sourcing

        Args:
            event_type: Event type (MessageSent, CampaignExecuted, etc)
            event_data: Event payload
            aggregate_id: Related resource ID
            aggregate_type: Related resource type

        Returns:
            Event ID
        """
        if not self.organization_id:
            raise ValueError("Organization ID required for event sourcing")

        return self.event_store.store_event(
            organization_id=self.organization_id,
            event_type=event_type,
            event_data=event_data,
            aggregate_id=aggregate_id,
            aggregate_type=aggregate_type,
        )

    def get_aggregate_events(
        self, aggregate_id: str, aggregate_type: str, limit: int = 100
    ) -> List[Dict]:
        """Get all events for an aggregate"""
        return self.event_store.get_events_by_aggregate(
            aggregate_id=aggregate_id,
            aggregate_type=aggregate_type,
            limit=limit,
        )

    def get_events_by_type(
        self, event_type: str, limit: int = 100
    ) -> List[Dict]:
        """Get events by type"""
        if not self.organization_id:
            raise ValueError("Organization ID required")

        return self.event_store.get_events_by_type(
            organization_id=self.organization_id,
            event_type=event_type,
            limit=limit,
        )

    # ========================================
    # BATCH OPERATIONS
    # ========================================

    def log_campaign_execution(
        self,
        user_id: str,
        campaign_id: str,
        contacts_count: int,
        ip_address: Optional[str] = None,
    ) -> Dict:
        """Log a campaign execution with audit + analytics"""
        audit_id = self.log_action(
            user_id=user_id,
            action='execute',
            resource_type='campaign',
            resource_id=campaign_id,
            changes={'status': 'executed'},
            ip_address=ip_address,
        )

        metric_id = self.log_metric(
            metric_type='campaigns_executed',
            value=1,
            tags={'campaign_id': campaign_id, 'user_id': user_id},
        )

        event_id = self.store_event(
            event_type='CampaignExecuted',
            event_data={'campaign_id': campaign_id, 'contacts_count': contacts_count},
            aggregate_id=campaign_id,
            aggregate_type='campaign',
        )

        return {
            'audit_id': audit_id,
            'metric_id': metric_id,
            'event_id': event_id,
        }

    def log_conversation_closed(
        self,
        user_id: str,
        conversation_id: str,
        resolution_time_seconds: int,
        ip_address: Optional[str] = None,
    ) -> Dict:
        """Log a conversation closure with audit + analytics"""
        audit_id = self.log_action(
            user_id=user_id,
            action='close',
            resource_type='conversation',
            resource_id=conversation_id,
            ip_address=ip_address,
        )

        metric_id = self.log_metric(
            metric_type='conversations_closed',
            value=resolution_time_seconds,
            tags={'resolution_type': 'standard'},
        )

        event_id = self.store_event(
            event_type='ConversationClosed',
            event_data={'resolution_time': resolution_time_seconds},
            aggregate_id=conversation_id,
            aggregate_type='conversation',
        )

        return {
            'audit_id': audit_id,
            'metric_id': metric_id,
            'event_id': event_id,
        }
