"""
MongoDB configuration for logging and analytics
"""

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

from app.core.config import settings


class MongoDBClient:
    """MongoDB async client wrapper"""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None

    async def connect(self):
        """Initialize MongoDB connection"""
        self.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            maxPoolSize=50,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000,
        )
        self.db = self.client[settings.MONGODB_DB]

        # Create indexes on startup
        await self._create_indexes()

    async def disconnect(self):
        """Close MongoDB connections"""
        if self.client:
            self.client.close()

    async def _create_indexes(self):
        """Create necessary indexes for collections"""
        if self.db is None:
            return

        # Message logs indexes
        await self.db.message_logs.create_index([("conversation_id", ASCENDING)])
        await self.db.message_logs.create_index([("contact_id", ASCENDING)])
        await self.db.message_logs.create_index([("organization_id", ASCENDING)])
        await self.db.message_logs.create_index([("created_at", DESCENDING)])
        await self.db.message_logs.create_index([
            ("organization_id", ASCENDING),
            ("created_at", DESCENDING),
        ])

        # Webhook logs indexes
        await self.db.webhook_logs.create_index([("organization_id", ASCENDING)])
        await self.db.webhook_logs.create_index([("event_type", ASCENDING)])
        await self.db.webhook_logs.create_index([("created_at", DESCENDING)])
        await self.db.webhook_logs.create_index([("status", ASCENDING)])

        # Audit logs indexes
        await self.db.audit_logs.create_index([("organization_id", ASCENDING)])
        await self.db.audit_logs.create_index([("user_id", ASCENDING)])
        await self.db.audit_logs.create_index([("action", ASCENDING)])
        await self.db.audit_logs.create_index([("created_at", DESCENDING)])
        await self.db.audit_logs.create_index([
            ("organization_id", ASCENDING),
            ("created_at", DESCENDING),
        ])

        # Analytics logs indexes
        await self.db.analytics_events.create_index([("organization_id", ASCENDING)])
        await self.db.analytics_events.create_index([("event_type", ASCENDING)])
        await self.db.analytics_events.create_index([("timestamp", DESCENDING)])
        await self.db.analytics_events.create_index([
            ("organization_id", ASCENDING),
            ("timestamp", DESCENDING),
        ])

        # API logs indexes
        await self.db.api_logs.create_index([("organization_id", ASCENDING)])
        await self.db.api_logs.create_index([("user_id", ASCENDING)])
        await self.db.api_logs.create_index([("endpoint", ASCENDING)])
        await self.db.api_logs.create_index([("status_code", ASCENDING)])
        await self.db.api_logs.create_index([("created_at", DESCENDING)])

        # Error logs indexes
        await self.db.error_logs.create_index([("organization_id", ASCENDING)])
        await self.db.error_logs.create_index([("error_type", ASCENDING)])
        await self.db.error_logs.create_index([("severity", ASCENDING)])
        await self.db.error_logs.create_index([("created_at", DESCENDING)])

        # Conversation metrics indexes
        await self.db.conversation_metrics.create_index([("conversation_id", ASCENDING)])
        await self.db.conversation_metrics.create_index([("organization_id", ASCENDING)])
        await self.db.conversation_metrics.create_index([("created_at", DESCENDING)])

        # Agent performance indexes
        await self.db.agent_performance.create_index([("user_id", ASCENDING)])
        await self.db.agent_performance.create_index([("organization_id", ASCENDING)])
        await self.db.agent_performance.create_index([("date", DESCENDING)])
        await self.db.agent_performance.create_index([
            ("organization_id", ASCENDING),
            ("date", DESCENDING),
        ])


# Global MongoDB client instance
mongodb_client = MongoDBClient()


async def get_mongodb() -> AsyncIOMotorDatabase:
    """
    Dependency for getting MongoDB database
    Usage in FastAPI:
        @app.get("/logs/")
        async def get_logs(db: AsyncIOMotorDatabase = Depends(get_mongodb)):
            ...
    """
    if mongodb_client.db is None:
        raise RuntimeError("MongoDB client not initialized. Call mongodb_client.connect() first")
    return mongodb_client.db


# Helper functions for common log operations
async def log_message(
    organization_id: str,
    conversation_id: str,
    contact_id: str,
    message_data: dict,
):
    """Log WhatsApp message to MongoDB"""
    if mongodb_client.db is None:
        raise RuntimeError("MongoDB client not initialized")

    await mongodb_client.db.message_logs.insert_one({
        "organization_id": organization_id,
        "conversation_id": conversation_id,
        "contact_id": contact_id,
        "created_at": message_data.get("timestamp"),
        **message_data,
    })


async def log_webhook(
    organization_id: str,
    event_type: str,
    payload: dict,
    status: str = "received",
):
    """Log webhook event to MongoDB"""
    if mongodb_client.db is None:
        raise RuntimeError("MongoDB client not initialized")

    from datetime import datetime

    await mongodb_client.db.webhook_logs.insert_one({
        "organization_id": organization_id,
        "event_type": event_type,
        "payload": payload,
        "status": status,
        "created_at": datetime.utcnow(),
    })


async def log_audit(
    organization_id: str,
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str,
    changes: Optional[dict] = None,
    metadata: Optional[dict] = None,
):
    """Log audit trail to MongoDB"""
    if mongodb_client.db is None:
        raise RuntimeError("MongoDB client not initialized")

    from datetime import datetime

    await mongodb_client.db.audit_logs.insert_one({
        "organization_id": organization_id,
        "user_id": user_id,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "changes": changes or {},
        "metadata": metadata or {},
        "created_at": datetime.utcnow(),
    })


async def log_analytics_event(
    organization_id: str,
    event_type: str,
    event_data: dict,
):
    """Log analytics event to MongoDB"""
    if mongodb_client.db is None:
        raise RuntimeError("MongoDB client not initialized")

    from datetime import datetime

    await mongodb_client.db.analytics_events.insert_one({
        "organization_id": organization_id,
        "event_type": event_type,
        "timestamp": datetime.utcnow(),
        **event_data,
    })


async def log_api_request(
    organization_id: Optional[str],
    user_id: Optional[str],
    method: str,
    endpoint: str,
    status_code: int,
    response_time_ms: float,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
):
    """Log API request to MongoDB"""
    if mongodb_client.db is None:
        raise RuntimeError("MongoDB client not initialized")

    from datetime import datetime

    await mongodb_client.db.api_logs.insert_one({
        "organization_id": organization_id,
        "user_id": user_id,
        "method": method,
        "endpoint": endpoint,
        "status_code": status_code,
        "response_time_ms": response_time_ms,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "created_at": datetime.utcnow(),
    })


async def log_error(
    organization_id: Optional[str],
    error_type: str,
    error_message: str,
    severity: str = "error",
    stack_trace: Optional[str] = None,
    context: Optional[dict] = None,
):
    """Log error to MongoDB"""
    if mongodb_client.db is None:
        raise RuntimeError("MongoDB client not initialized")

    from datetime import datetime

    await mongodb_client.db.error_logs.insert_one({
        "organization_id": organization_id,
        "error_type": error_type,
        "error_message": error_message,
        "severity": severity,
        "stack_trace": stack_trace,
        "context": context or {},
        "created_at": datetime.utcnow(),
    })


async def save_conversation_metrics(
    conversation_id: str,
    organization_id: str,
    metrics: dict,
):
    """Save conversation metrics to MongoDB"""
    if mongodb_client.db is None:
        raise RuntimeError("MongoDB client not initialized")

    from datetime import datetime

    await mongodb_client.db.conversation_metrics.insert_one({
        "conversation_id": conversation_id,
        "organization_id": organization_id,
        "created_at": datetime.utcnow(),
        **metrics,
    })


async def save_agent_performance(
    user_id: str,
    organization_id: str,
    date: str,
    metrics: dict,
):
    """Save agent daily performance metrics to MongoDB"""
    if mongodb_client.db is None:
        raise RuntimeError("MongoDB client not initialized")

    # Upsert daily metrics
    await mongodb_client.db.agent_performance.update_one(
        {
            "user_id": user_id,
            "organization_id": organization_id,
            "date": date,
        },
        {
            "$set": metrics,
        },
        upsert=True,
    )


# Query helpers
async def get_message_logs(
    organization_id: str,
    conversation_id: Optional[str] = None,
    contact_id: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
):
    """Get message logs with filters"""
    if mongodb_client.db is None:
        raise RuntimeError("MongoDB client not initialized")

    query = {"organization_id": organization_id}

    if conversation_id:
        query["conversation_id"] = conversation_id

    if contact_id:
        query["contact_id"] = contact_id

    cursor = mongodb_client.db.message_logs.find(query).sort(
        "created_at", DESCENDING
    ).skip(skip).limit(limit)

    return await cursor.to_list(length=limit)


async def get_audit_logs(
    organization_id: str,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
):
    """Get audit logs with filters"""
    if mongodb_client.db is None:
        raise RuntimeError("MongoDB client not initialized")

    query = {"organization_id": organization_id}

    if user_id:
        query["user_id"] = user_id

    if action:
        query["action"] = action

    if resource_type:
        query["resource_type"] = resource_type

    cursor = mongodb_client.db.audit_logs.find(query).sort(
        "created_at", DESCENDING
    ).skip(skip).limit(limit)

    return await cursor.to_list(length=limit)


async def get_analytics_events(
    organization_id: str,
    event_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 1000,
):
    """Get analytics events with filters"""
    if mongodb_client.db is None:
        raise RuntimeError("MongoDB client not initialized")

    from datetime import datetime

    query = {"organization_id": organization_id}

    if event_type:
        query["event_type"] = event_type

    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = datetime.fromisoformat(start_date)
        if end_date:
            query["timestamp"]["$lte"] = datetime.fromisoformat(end_date)

    cursor = mongodb_client.db.analytics_events.find(query).sort(
        "timestamp", DESCENDING
    ).limit(limit)

    return await cursor.to_list(length=limit)
