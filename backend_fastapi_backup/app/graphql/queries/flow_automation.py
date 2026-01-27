"""
Flow Automation Queries
"""

from typing import List, Optional
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.permissions import require_auth
from app.graphql.types.flow_automation import (
    FlowAutomationType,
    FlowAutomationExecutionType,
    FlowAutomationRecipientType,
    FlowAutomationStatsType,
)
from app.services.flow_automation_service import FlowAutomationService


@strawberry.type
class FlowAutomationQuery:
    """Flow Automation-related queries"""

    @strawberry.field
    @require_auth
    async def flow_automation(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> FlowAutomationType:
        """Get flow automation by ID"""
        context: GraphQLContext = info.context

        service = FlowAutomationService(context.db)
        automation = await service.get_automation(UUID(id), context.organization_id)

        if not automation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Flow automation not found",
            )

        return FlowAutomationType(
            id=strawberry.ID(str(automation.id)),
            organization_id=strawberry.ID(str(automation.organization_id)),
            name=automation.name,
            description=automation.description,
            chatbot_id=strawberry.ID(str(automation.chatbot_id)),
            flow_id=strawberry.ID(str(automation.flow_id)),
            whatsapp_number_id=strawberry.ID(str(automation.whatsapp_number_id)),
            trigger_type=automation.trigger_type,
            trigger_config=automation.trigger_config,
            audience_type=automation.audience_type,
            audience_config=automation.audience_config,
            variable_mapping=automation.variable_mapping,
            status=automation.status,
            is_active=automation.is_active,
            max_concurrent_executions=automation.max_concurrent_executions,
            rate_limit_per_hour=automation.rate_limit_per_hour,
            retry_failed=automation.retry_failed,
            max_retries=automation.max_retries,
            execution_window_start=automation.execution_window_start,
            execution_window_end=automation.execution_window_end,
            execution_timezone=automation.execution_timezone,
            total_executions=automation.total_executions,
            total_sent=automation.total_sent,
            total_delivered=automation.total_delivered,
            total_read=automation.total_read,
            total_replied=automation.total_replied,
            total_completed=automation.total_completed,
            total_failed=automation.total_failed,
            last_executed_at=automation.last_executed_at,
            next_scheduled_at=automation.next_scheduled_at,
            created_at=automation.created_at,
            updated_at=automation.updated_at,
        )

    @strawberry.field
    @require_auth
    async def flow_automations(
        self,
        info: Info[GraphQLContext, None],
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[FlowAutomationType]:
        """List flow automations"""
        context: GraphQLContext = info.context

        service = FlowAutomationService(context.db)
        automations, _ = await service.list_automations(
            organization_id=context.organization_id,
            skip=skip,
            limit=limit,
            status=status,
            is_active=is_active,
        )

        return [
            FlowAutomationType(
                id=strawberry.ID(str(a.id)),
                organization_id=strawberry.ID(str(a.organization_id)),
                name=a.name,
                description=a.description,
                chatbot_id=strawberry.ID(str(a.chatbot_id)),
                flow_id=strawberry.ID(str(a.flow_id)),
                whatsapp_number_id=strawberry.ID(str(a.whatsapp_number_id)),
                trigger_type=a.trigger_type,
                trigger_config=a.trigger_config,
                audience_type=a.audience_type,
                audience_config=a.audience_config,
                variable_mapping=a.variable_mapping,
                status=a.status,
                is_active=a.is_active,
                max_concurrent_executions=a.max_concurrent_executions,
                rate_limit_per_hour=a.rate_limit_per_hour,
                retry_failed=a.retry_failed,
                max_retries=a.max_retries,
                execution_window_start=a.execution_window_start,
                execution_window_end=a.execution_window_end,
                execution_timezone=a.execution_timezone,
                total_executions=a.total_executions,
                total_sent=a.total_sent,
                total_delivered=a.total_delivered,
                total_read=a.total_read,
                total_replied=a.total_replied,
                total_completed=a.total_completed,
                total_failed=a.total_failed,
                last_executed_at=a.last_executed_at,
                next_scheduled_at=a.next_scheduled_at,
                created_at=a.created_at,
                updated_at=a.updated_at,
            )
            for a in automations
        ]

    @strawberry.field
    @require_auth
    async def flow_automation_stats(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> FlowAutomationStatsType:
        """Get flow automation statistics"""
        context: GraphQLContext = info.context

        service = FlowAutomationService(context.db)
        automation = await service.get_automation(UUID(id), context.organization_id)

        if not automation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Flow automation not found",
            )

        # Calculate rates
        delivery_rate = None
        read_rate = None
        reply_rate = None
        completion_rate = None

        if automation.total_sent > 0:
            delivery_rate = automation.total_delivered / automation.total_sent
            reply_rate = automation.total_replied / automation.total_sent
            completion_rate = automation.total_completed / automation.total_sent

        if automation.total_delivered > 0:
            read_rate = automation.total_read / automation.total_delivered

        return FlowAutomationStatsType(
            total_executions=automation.total_executions,
            total_sent=automation.total_sent,
            total_delivered=automation.total_delivered,
            total_read=automation.total_read,
            total_replied=automation.total_replied,
            total_completed=automation.total_completed,
            total_failed=automation.total_failed,
            delivery_rate=delivery_rate,
            read_rate=read_rate,
            reply_rate=reply_rate,
            completion_rate=completion_rate,
            last_execution_id=None,  # Would need to query latest execution
            last_execution_status=None,
            last_executed_at=automation.last_executed_at,
            next_scheduled_at=automation.next_scheduled_at,
        )
