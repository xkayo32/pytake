"""
Notification Mutations
"""

import strawberry
from strawberry.types import Info

from app.graphql.context import GraphQLContext
from app.graphql.permissions import require_auth
from app.graphql.types.notification import (
    NotificationPreferenceType,
    NotificationPreferenceUpdateInput,
)
from app.repositories.notification import NotificationRepository
from app.schemas.notification import NotificationPreferenceUpdate


@strawberry.type
class NotificationMutation:
    """Notification-related mutations"""

    @strawberry.mutation
    @require_auth
    async def update_notification_preferences(
        self,
        info: Info[GraphQLContext, None],
        input: NotificationPreferenceUpdateInput,
    ) -> NotificationPreferenceType:
        """Update notification preferences for current user"""
        context: GraphQLContext = info.context

        repo = NotificationRepository(context.db)

        # Create update data
        update_data = NotificationPreferenceUpdate(
            email_enabled=input.email_enabled,
            sms_enabled=input.sms_enabled,
            whatsapp_enabled=input.whatsapp_enabled,
            websocket_enabled=input.websocket_enabled,
            in_app_enabled=input.in_app_enabled,
            quiet_hours_start=input.quiet_hours_start,
            quiet_hours_end=input.quiet_hours_end,
            quiet_hours_enabled=input.quiet_hours_enabled,
            max_emails_per_hour=input.max_emails_per_hour,
            max_sms_per_hour=input.max_sms_per_hour,
        )

        prefs = await repo.update_preferences(
            context.user.id, context.organization_id, update_data
        )

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
