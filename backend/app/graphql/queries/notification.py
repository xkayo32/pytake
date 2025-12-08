"""
Notification Queries
"""

from typing import List, Optional

import strawberry
from strawberry.types import Info

from app.graphql.context import GraphQLContext
from app.graphql.permissions import require_auth
from app.graphql.types.notification import NotificationPreferenceType, NotificationLogType
from app.repositories.notification import NotificationPreferenceRepository


@strawberry.type
class NotificationQuery:
    """Notification-related queries"""

    @strawberry.field
    @require_auth
    async def notification_preferences(
        self,
        info: Info[GraphQLContext, None],
    ) -> Optional[NotificationPreferenceType]:
        """Get notification preferences for current user"""
        context: GraphQLContext = info.context

        repo = NotificationPreferenceRepository(context.db)
        prefs = await repo.get_or_create(
            context.user.id, context.organization_id
        )

        if not prefs:
            return None

        return NotificationPreferenceType(
            id=prefs.id,
            user_id=strawberry.ID(str(prefs.user_id)),
            organization_id=strawberry.ID(str(prefs.organization_id)),
            email_enabled=prefs.email_enabled,
            sms_enabled=prefs.sms_enabled,
            whatsapp_enabled=prefs.whatsapp_enabled,
            websocket_enabled=prefs.websocket_enabled,
            in_app_enabled=prefs.in_app_enabled,
            quiet_hours_start=prefs.quiet_hours_start,
            quiet_hours_end=prefs.quiet_hours_end,
            quiet_hours_enabled=prefs.quiet_hours_enabled,
            max_emails_per_hour=prefs.max_emails_per_hour,
            max_sms_per_hour=prefs.max_sms_per_hour,
            created_at=prefs.created_at,
            updated_at=prefs.updated_at,
        )

    @strawberry.field
    @require_auth
    async def notification_logs(
        self,
        info: Info[GraphQLContext, None],
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        channel: Optional[str] = None,
    ) -> List[NotificationLogType]:
        """List notification logs for current user"""
        context: GraphQLContext = info.context

        from app.repositories.notification import NotificationLogRepository
        repo = NotificationLogRepository(context.db)
        logs = await repo.get_by_org(
            org_id=context.organization_id,
            user_id=context.user.id,
            skip=skip,
            limit=limit,
            status=status,
            channel=channel,
        )

        return [
            NotificationLogType(
                id=log.id,
                organization_id=strawberry.ID(str(log.organization_id)),
                user_id=strawberry.ID(str(log.user_id)),
                notification_type=log.notification_type.value,
                channel=log.channel.value,
                subject=log.subject,
                message=log.message,
                recipient=log.recipient,
                status=log.status,
                error_message=log.error_message,
                sent_at=log.sent_at,
                created_at=log.created_at,
                updated_at=log.updated_at,
                notification_metadata=log.notification_metadata,
                retry_count=log.retry_count,
            )
            for log in logs
        ]
