"""
MongoDB Integration for PyTake
Handles non-relational data (logs, analytics, events)
"""
from typing import Dict, List, Optional
from datetime import datetime
from django.conf import settings
import pymongo
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError, OperationFailure
import json
import logging

logger = logging.getLogger(__name__)


class MongoDBClient:
    """MongoDB connection and operations manager"""

    def __init__(self):
        """Initialize MongoDB connection"""
        self.client = None
        self.db = None
        self._connect()

    def _connect(self):
        """Establish MongoDB connection"""
        try:
            mongo_uri = settings.MONGODB_URI
            self.client = MongoClient(mongo_uri)
            self.db = self.client[settings.MONGODB_DB]
            # Verify connection
            self.client.admin.command('ping')
            logger.info("✅ MongoDB connected successfully")
        except Exception as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            raise

    def create_indexes(self):
        """Create indexes for optimal query performance"""
        try:
            # Message Logs indexes
            self.db['message_logs'].create_index([('organization_id', ASCENDING)])
            self.db['message_logs'].create_index([('created_at', DESCENDING)])
            self.db['message_logs'].create_index(
                [('organization_id', ASCENDING), ('created_at', DESCENDING)]
            )

            # Audit Logs indexes
            self.db['audit_logs'].create_index([('organization_id', ASCENDING)])
            self.db['audit_logs'].create_index([('user_id', ASCENDING)])
            self.db['audit_logs'].create_index([('created_at', DESCENDING)])
            self.db['audit_logs'].create_index(
                [('organization_id', ASCENDING), ('action', ASCENDING)]
            )

            # Analytics indexes
            self.db['analytics'].create_index([('organization_id', ASCENDING)])
            self.db['analytics'].create_index([('metric_type', ASCENDING)])
            self.db['analytics'].create_index([('date', DESCENDING)])
            self.db['analytics'].create_index(
                [('organization_id', ASCENDING), ('date', DESCENDING)]
            )

            # Events indexes
            self.db['events'].create_index([('organization_id', ASCENDING)])
            self.db['events'].create_index([('event_type', ASCENDING)])
            self.db['events'].create_index([('created_at', DESCENDING)])

            logger.info("✅ MongoDB indexes created successfully")
        except Exception as e:
            logger.warning(f"⚠️ Index creation warning: {e}")

    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")


# Global MongoDB client instance
_mongo_client: Optional[MongoDBClient] = None


def get_mongo_client() -> MongoDBClient:
    """Get or create MongoDB client (singleton pattern)"""
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoDBClient()
        _mongo_client.create_indexes()
    return _mongo_client


class MessageLogger:
    """Logs all WhatsApp messages to MongoDB"""

    def __init__(self):
        self.mongo = get_mongo_client()
        self.collection = self.mongo.db['message_logs']

    def log_message(
        self,
        organization_id: str,
        conversation_id: str,
        sender_id: str,
        receiver_id: str,
        message_content: str,
        message_type: str = 'text',
        media_url: Optional[str] = None,
        status: str = 'sent',
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Log a message

        Args:
            organization_id: Organization UUID
            conversation_id: Conversation UUID
            sender_id: User/Contact UUID
            receiver_id: Contact/User UUID
            message_content: Message text
            message_type: Type (text, image, document, etc)
            media_url: Media URL if applicable
            status: Message status (sent, delivered, read, failed)
            metadata: Additional metadata

        Returns:
            MongoDB document ID
        """
        doc = {
            'organization_id': str(organization_id),
            'conversation_id': str(conversation_id),
            'sender_id': str(sender_id),
            'receiver_id': str(receiver_id),
            'message_content': message_content,
            'message_type': message_type,
            'media_url': media_url,
            'status': status,
            'metadata': metadata or {},
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }

        result = self.collection.insert_one(doc)
        logger.info(f"📝 Message logged: {result.inserted_id}")
        return str(result.inserted_id)

    def update_status(self, message_id: str, status: str):
        """Update message status (delivered, read, etc)"""
        self.collection.update_one(
            {'_id': message_id},
            {
                '$set': {
                    'status': status,
                    'updated_at': datetime.utcnow(),
                }
            },
        )
        logger.info(f"✅ Message {message_id} status updated to: {status}")

    def get_conversation_history(
        self, organization_id: str, conversation_id: str, limit: int = 50
    ) -> List[Dict]:
        """Get message history for a conversation"""
        messages = list(
            self.collection.find(
                {
                    'organization_id': str(organization_id),
                    'conversation_id': str(conversation_id),
                }
            )
            .sort('created_at', DESCENDING)
            .limit(limit)
        )
        return messages

    def search_messages(
        self, organization_id: str, query: str, limit: int = 20
    ) -> List[Dict]:
        """Full-text search messages"""
        try:
            self.collection.create_index([('message_content', 'text')])
        except OperationFailure:
            pass  # Index already exists

        messages = list(
            self.collection.find(
                {
                    'organization_id': str(organization_id),
                    '$text': {'$search': query},
                }
            )
            .limit(limit)
        )
        return messages


class AuditLogger:
    """Logs all user actions for compliance and debugging"""

    def __init__(self):
        self.mongo = get_mongo_client()
        self.collection = self.mongo.db['audit_logs']

    def log_action(
        self,
        organization_id: str,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        changes: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> str:
        """
        Log an audit event

        Args:
            organization_id: Organization UUID
            user_id: User UUID
            action: Action performed (create, update, delete, etc)
            resource_type: Resource type (campaign, contact, conversation)
            resource_id: Resource UUID
            changes: Before/after changes
            ip_address: User IP address
            user_agent: Browser user agent

        Returns:
            MongoDB document ID
        """
        doc = {
            'organization_id': str(organization_id),
            'user_id': str(user_id),
            'action': action,
            'resource_type': resource_type,
            'resource_id': str(resource_id),
            'changes': changes or {},
            'ip_address': ip_address,
            'user_agent': user_agent,
            'created_at': datetime.utcnow(),
        }

        result = self.collection.insert_one(doc)
        logger.info(f"📋 Audit logged: {action} on {resource_type}")
        return str(result.inserted_id)

    def get_user_activity(
        self, organization_id: str, user_id: str, days: int = 7, limit: int = 100
    ) -> List[Dict]:
        """Get user's activity audit trail"""
        from datetime import timedelta

        start_date = datetime.utcnow() - timedelta(days=days)

        audits = list(
            self.collection.find(
                {
                    'organization_id': str(organization_id),
                    'user_id': str(user_id),
                    'created_at': {'$gte': start_date},
                }
            )
            .sort('created_at', DESCENDING)
            .limit(limit)
        )
        return audits

    def get_resource_history(
        self, organization_id: str, resource_id: str, limit: int = 50
    ) -> List[Dict]:
        """Get audit trail for a specific resource"""
        audits = list(
            self.collection.find(
                {
                    'organization_id': str(organization_id),
                    'resource_id': str(resource_id),
                }
            )
            .sort('created_at', DESCENDING)
            .limit(limit)
        )
        return audits


class AnalyticsLogger:
    """Logs analytics data for dashboards and reports"""

    def __init__(self):
        self.mongo = get_mongo_client()
        self.collection = self.mongo.db['analytics']

    def log_metric(
        self,
        organization_id: str,
        metric_type: str,
        value: float,
        tags: Optional[Dict] = None,
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Log an analytics metric

        Args:
            organization_id: Organization UUID
            metric_type: Type (messages_sent, campaigns_executed, etc)
            value: Metric value
            tags: Tags for grouping (campaign_id, agent_id, etc)
            metadata: Additional data

        Returns:
            MongoDB document ID
        """
        doc = {
            'organization_id': str(organization_id),
            'metric_type': metric_type,
            'value': value,
            'tags': tags or {},
            'metadata': metadata or {},
            'date': datetime.utcnow().date().isoformat(),
            'timestamp': datetime.utcnow(),
        }

        result = self.collection.insert_one(doc)
        return str(result.inserted_id)

    def aggregate_daily(
        self, organization_id: str, metric_type: str, days: int = 30
    ) -> List[Dict]:
        """Aggregate metrics by day"""
        from datetime import timedelta

        start_date = (datetime.utcnow() - timedelta(days=days)).date().isoformat()

        pipeline = [
            {
                '$match': {
                    'organization_id': str(organization_id),
                    'metric_type': metric_type,
                    'date': {'$gte': start_date},
                }
            },
            {
                '$group': {
                    '_id': '$date',
                    'total': {'$sum': '$value'},
                    'count': {'$sum': 1},
                    'average': {'$avg': '$value'},
                }
            },
            {'$sort': {'_id': ASCENDING}},
        ]

        return list(self.collection.aggregate(pipeline))

    def get_hourly_stats(
        self, organization_id: str, metric_type: str, hours: int = 24
    ) -> List[Dict]:
        """Get metrics grouped by hour"""
        from datetime import timedelta

        start_time = datetime.utcnow() - timedelta(hours=hours)

        pipeline = [
            {
                '$match': {
                    'organization_id': str(organization_id),
                    'metric_type': metric_type,
                    'timestamp': {'$gte': start_time},
                }
            },
            {
                '$group': {
                    '_id': {
                        '$dateToString': {
                            'format': '%Y-%m-%d %H:00',
                            'date': '$timestamp',
                        }
                    },
                    'total': {'$sum': '$value'},
                }
            },
            {'$sort': {'_id': ASCENDING}},
        ]

        return list(self.collection.aggregate(pipeline))


class EventStore:
    """Event sourcing for system events"""

    def __init__(self):
        self.mongo = get_mongo_client()
        self.collection = self.mongo.db['events']

    def store_event(
        self,
        organization_id: str,
        event_type: str,
        event_data: Dict,
        aggregate_id: Optional[str] = None,
        aggregate_type: Optional[str] = None,
    ) -> str:
        """
        Store an event

        Args:
            organization_id: Organization UUID
            event_type: Type of event (MessageSent, CampaignExecuted, etc)
            event_data: Event payload
            aggregate_id: Related resource ID
            aggregate_type: Related resource type

        Returns:
            MongoDB document ID
        """
        doc = {
            'organization_id': str(organization_id),
            'event_type': event_type,
            'event_data': event_data,
            'aggregate_id': aggregate_id,
            'aggregate_type': aggregate_type,
            'created_at': datetime.utcnow(),
            'version': 1,
        }

        result = self.collection.insert_one(doc)
        logger.info(f"📡 Event stored: {event_type}")
        return str(result.inserted_id)

    def get_events_by_aggregate(
        self, aggregate_id: str, aggregate_type: str, limit: int = 100
    ) -> List[Dict]:
        """Get all events for an aggregate"""
        events = list(
            self.collection.find(
                {
                    'aggregate_id': str(aggregate_id),
                    'aggregate_type': aggregate_type,
                }
            )
            .sort('created_at', ASCENDING)
            .limit(limit)
        )
        return events

    def get_events_by_type(
        self, organization_id: str, event_type: str, limit: int = 100
    ) -> List[Dict]:
        """Get events by type"""
        events = list(
            self.collection.find(
                {
                    'organization_id': str(organization_id),
                    'event_type': event_type,
                }
            )
            .sort('created_at', DESCENDING)
            .limit(limit)
        )
        return events
