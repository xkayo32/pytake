"""
Flow Automation Mutations
"""

from typing import Optional
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.permissions import require_auth, require_role
from app.graphql.types.flow_automation import (
    FlowAutomationType,
    FlowAutomationCreateInput,
    FlowAutomationUpdateInput,
    FlowAutomationExecutionType,
    FlowAutomationStartInput,
)
from app.graphql.types.common import SuccessResponse
from app.services.flow_automation_service import FlowAutomationService
from app.schemas.flow_automation import (
    FlowAutomationCreate,
    FlowAutomationUpdate,
    FlowAutomationStartRequest,
)


@strawberry.type
class FlowAutomationMutation:
    """Flow Automation-related mutations"""

    @strawberry.mutation
    @require_role("org_admin")
    async def create_flow_automation(
        self,
        info: Info[GraphQLContext, None],
        input: FlowAutomationCreateInput,
    ) -> FlowAutomationType:
        """Create new flow automation"""
        context: GraphQLContext = info.context

        service = FlowAutomationService(context.db)

        automation_data = FlowAutomationCreate(
            name=input.name,
            description=input.description,
            chatbot_id=UUID(input.chatbot_id),
            flow_id=UUID(input.flow_id),
            whatsapp_number_id=UUID(input.whatsapp_number_id),
            trigger_type=input.trigger_type,
            trigger_config=input.trigger_config,
            audience_type=input.audience_type,
            audience_config=input.audience_config,
            variable_mapping=input.variable_mapping,
            max_concurrent_executions=input.max_concurrent_executions,
            rate_limit_per_hour=input.rate_limit_per_hour,
            retry_failed=input.retry_failed,
            max_retries=input.max_retries,
            execution_window_start=input.execution_window_start,
            execution_window_end=input.execution_window_end,
            execution_timezone=input.execution_timezone,
        )

        automation = await service.create_automation(
            automation_data, context.organization_id, context.user.id
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

    @strawberry.mutation
    @require_role("org_admin")
    async def update_flow_automation(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
        input: FlowAutomationUpdateInput,
    ) -> FlowAutomationType:
        """Update flow automation"""
        context: GraphQLContext = info.context

        service = FlowAutomationService(context.db)

        update_data_dict = {}
        if input.name is not None:
            update_data_dict["name"] = input.name
        if input.description is not None:
            update_data_dict["description"] = input.description
        if input.chatbot_id is not None:
            update_data_dict["chatbot_id"] = UUID(input.chatbot_id)
        if input.flow_id is not None:
            update_data_dict["flow_id"] = UUID(input.flow_id)
        if input.whatsapp_number_id is not None:
            update_data_dict["whatsapp_number_id"] = UUID(input.whatsapp_number_id)
        if input.trigger_type is not None:
            update_data_dict["trigger_type"] = input.trigger_type
        if input.trigger_config is not None:
            update_data_dict["trigger_config"] = input.trigger_config
        if input.audience_type is not None:
            update_data_dict["audience_type"] = input.audience_type
        if input.audience_config is not None:
            update_data_dict["audience_config"] = input.audience_config
        if input.variable_mapping is not None:
            update_data_dict["variable_mapping"] = input.variable_mapping
        if input.status is not None:
            update_data_dict["status"] = input.status
        if input.is_active is not None:
            update_data_dict["is_active"] = input.is_active
        if input.max_concurrent_executions is not None:
            update_data_dict["max_concurrent_executions"] = input.max_concurrent_executions
        if input.rate_limit_per_hour is not None:
            update_data_dict["rate_limit_per_hour"] = input.rate_limit_per_hour
        if input.retry_failed is not None:
            update_data_dict["retry_failed"] = input.retry_failed
        if input.max_retries is not None:
            update_data_dict["max_retries"] = input.max_retries
        if input.execution_window_start is not None:
            update_data_dict["execution_window_start"] = input.execution_window_start
        if input.execution_window_end is not None:
            update_data_dict["execution_window_end"] = input.execution_window_end
        if input.execution_timezone is not None:
            update_data_dict["execution_timezone"] = input.execution_timezone

        update_data = FlowAutomationUpdate(**update_data_dict)

        automation = await service.update_automation(
            UUID(id), context.organization_id, update_data
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

    @strawberry.mutation
    @require_role("org_admin")
    async def delete_flow_automation(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> SuccessResponse:
        """Delete flow automation"""
        context: GraphQLContext = info.context

        service = FlowAutomationService(context.db)
        await service.delete_automation(UUID(id), context.organization_id)

        return SuccessResponse(
            success=True, message="Flow automation deleted successfully"
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def start_flow_automation(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
        input: Optional[FlowAutomationStartInput] = None,
    ) -> FlowAutomationExecutionType:
        """Start flow automation execution manually"""
        context: GraphQLContext = info.context

        service = FlowAutomationService(context.db)

        start_request = None
        if input:
            test_contact_ids = None
            if input.test_contact_ids:
                test_contact_ids = [UUID(cid) for cid in input.test_contact_ids]

            start_request = FlowAutomationStartRequest(
                test_mode=input.test_mode, test_contact_ids=test_contact_ids
            )

        execution = await service.start_automation(
            UUID(id), context.organization_id, context.user.id, start_request
        )

        return FlowAutomationExecutionType(
            id=strawberry.ID(str(execution.id)),
            automation_id=strawberry.ID(str(execution.automation_id)),
            organization_id=strawberry.ID(str(execution.organization_id)),
            execution_type=execution.execution_type,
            triggered_by_user_id=(
                strawberry.ID(str(execution.triggered_by_user_id))
                if execution.triggered_by_user_id
                else None
            ),
            triggered_by_event=execution.triggered_by_event,
            status=execution.status,
            total_recipients=execution.total_recipients,
            messages_sent=execution.messages_sent,
            messages_delivered=execution.messages_delivered,
            messages_read=execution.messages_read,
            messages_replied=execution.messages_replied,
            messages_completed=execution.messages_completed,
            messages_failed=execution.messages_failed,
            started_at=execution.started_at,
            completed_at=execution.completed_at,
            paused_at=execution.paused_at,
            cancelled_at=execution.cancelled_at,
            error_message=execution.error_message,
            errors=execution.errors,
            created_at=execution.created_at,
            updated_at=execution.updated_at,
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def activate_flow_automation(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> FlowAutomationType:
        """Activate flow automation"""
        context: GraphQLContext = info.context

        service = FlowAutomationService(context.db)

        update_data = FlowAutomationUpdate(is_active=True, status="active")
        automation = await service.update_automation(
            UUID(id), context.organization_id, update_data
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

    @strawberry.mutation
    @require_role("org_admin")
    async def deactivate_flow_automation(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> FlowAutomationType:
        """Deactivate flow automation"""
        context: GraphQLContext = info.context

        service = FlowAutomationService(context.db)

        update_data = FlowAutomationUpdate(is_active=False, status="paused")
        automation = await service.update_automation(
            UUID(id), context.organization_id, update_data
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
