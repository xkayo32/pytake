"""
Flow Automation Tasks - Celery tasks for proactive flow execution

Handles batch processing of flow automations, message sending, retry logic,
and progress tracking for flow dispatches to multiple recipients.
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID

from celery import Task, group, chord
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.tasks.celery_app import celery_app
from app.core.database import async_session
from app.models.flow_automation import (
    FlowAutomation,
    FlowAutomationExecution,
    FlowAutomationRecipient,
)
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.chatbot import Flow
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)


class FlowAutomationTask(Task):
    """Base task class with flow automation-specific error handling"""
    
    autoretry_for = (Exception,)
    retry_kwargs = {'max_retries': 3}
    retry_backoff = True  # Exponential backoff: 1s, 4s, 16s
    retry_backoff_max = 600  # Max 10 minutes
    retry_jitter = True  # Add randomness to avoid thundering herd


@celery_app.task(
    base=FlowAutomationTask,
    name="process_flow_automation_execution",
    bind=True,
    track_started=True,
)
def process_flow_automation_execution(self, execution_id: str) -> Dict[str, Any]:
    """
    Main task to process a flow automation execution.
    
    Orchestrates the flow execution for all recipients in an execution:
    1. Loads execution with recipients
    2. Creates individual tasks for each recipient
    3. Executes flows in parallel with rate limiting
    4. Tracks progress and status
    5. Finalizes execution
    
    Args:
        execution_id: UUID of the execution to process
        
    Returns:
        Dict with execution results and statistics
    """
    logger.info(f"🚀 Starting flow automation execution: {execution_id}")
    
    try:
        # Run async operations in sync context
        result = asyncio.run(_process_execution_async(execution_id, self.request.id))
        logger.info(f"✅ Execution {execution_id} completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Execution {execution_id} failed: {str(e)}")
        asyncio.run(_mark_execution_failed(execution_id, str(e)))
        raise


async def _process_execution_async(execution_id: str, task_id: str) -> Dict[str, Any]:
    """Async implementation of execution processing"""
    
    async with async_session() as db:
        # 1. Load execution with recipients
        stmt = (
            select(FlowAutomationExecution)
            .where(FlowAutomationExecution.id == UUID(execution_id))
            .options(
                # Eager load relationships if needed
            )
        )
        result = await db.execute(stmt)
        execution = result.scalar_one_or_none()
        
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")
        
        if execution.status != "queued":
            raise ValueError(f"Execution has invalid status: {execution.status}")
        
        # 2. Load automation for config
        automation = await _get_automation(db, execution.automation_id)
        if not automation:
            raise ValueError(f"Automation {execution.automation_id} not found")
        
        # 3. Load recipients
        recipients_stmt = select(FlowAutomationRecipient).where(
            FlowAutomationRecipient.execution_id == UUID(execution_id)
        )
        recipients_result = await db.execute(recipients_stmt)
        recipients = recipients_result.scalars().all()
        
        if not recipients:
            raise ValueError("No recipients found for execution")
        
        logger.info(f"📊 Processing {len(recipients)} recipients for execution {execution_id}")
        
        # 4. Update execution status to running
        execution.status = "running"
        execution.started_at = datetime.utcnow()
        await db.commit()
        
        # 5. Create individual tasks for each recipient
        recipient_tasks = []
        for batch_idx, recipient in enumerate(recipients):
            task = process_flow_recipient.s(
                execution_id=execution_id,
                recipient_id=str(recipient.id),
                batch_index=batch_idx,
            )
            recipient_tasks.append(task)
        
        # 6. Execute recipients in parallel with rate limiting
        # Use chord pattern: execute all tasks, then call finalize callback
        callback = finalize_flow_automation_execution.s(execution_id)
        job = chord(recipient_tasks)(callback)
        
        return {
            "status": "processing",
            "execution_id": execution_id,
            "task_id": task_id,
            "total_recipients": len(recipients),
            "job_id": job.id if hasattr(job, 'id') else None,
        }


@celery_app.task(
    base=FlowAutomationTask,
    name="process_flow_recipient",
    bind=True,
    track_started=True,
)
def process_flow_recipient(self, execution_id: str, recipient_id: str, batch_index: int) -> Dict[str, Any]:
    """
    Process flow execution for a single recipient.
    
    Steps:
    1. Load recipient with contact and automation details
    2. Create or update Conversation
    3. Inject resolved variables into context
    4. Execute flow (start from START node)
    5. Track status (sent, delivered, read, completed)
    6. Update recipient status
    7. Handle errors and retries
    
    Args:
        execution_id: UUID of the execution
        recipient_id: UUID of the recipient
        batch_index: Index in batch for rate limiting
        
    Returns:
        Dict with recipient results
    """
    logger.info(f"⚡ Processing recipient {recipient_id} (batch {batch_index})")
    
    try:
        result = asyncio.run(
            _process_recipient_async(execution_id, recipient_id, batch_index, self.request.id)
        )
        logger.info(f"✅ Recipient {recipient_id} processed: {result['status']}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Recipient {recipient_id} failed: {str(e)}")
        asyncio.run(_mark_recipient_failed(recipient_id, str(e)))
        raise


async def _process_recipient_async(
    execution_id: str,
    recipient_id: str,
    batch_index: int,
    task_id: str,
) -> Dict[str, Any]:
    """Async implementation of recipient processing"""
    
    async with async_session() as db:
        # 1. Load recipient with relationships
        recipient_stmt = select(FlowAutomationRecipient).where(
            FlowAutomationRecipient.id == UUID(recipient_id)
        )
        recipient_result = await db.execute(recipient_stmt)
        recipient = recipient_result.scalar_one_or_none()
        
        if not recipient:
            raise ValueError(f"Recipient {recipient_id} not found")
        
        # 2. Load execution and automation
        execution = await _get_execution(db, execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")
        
        automation = await _get_automation(db, execution.automation_id)
        if not automation:
            raise ValueError(f"Automation {automation.id} not found")
        
        # 3. Load contact
        contact = await _get_contact(db, recipient.contact_id)
        if not contact:
            raise ValueError(f"Contact {recipient.contact_id} not found")
        
        # 4. Load flow
        flow = await _get_flow(db, automation.flow_id)
        if not flow:
            raise ValueError(f"Flow {automation.flow_id} not found")
        
        # 5. Apply rate limiting (batch_index * delay)
        delay_seconds = batch_index * (automation.rate_limit_per_hour / 3600)
        if delay_seconds > 0:
            await asyncio.sleep(delay_seconds)
        
        # 6. Check execution window (horário comercial)
        if not _is_within_execution_window(automation):
            logger.info(f"⏸️ Outside execution window, queuing recipient {recipient_id}")
            recipient.status = "queued"
            await db.commit()
            return {
                "recipient_id": recipient_id,
                "status": "queued",
                "reason": "outside_execution_window",
            }
        
        # 7. Create or get conversation
        # Check if one already exists
        conv_stmt = select(Conversation).where(
            and_(
                Conversation.contact_id == contact.id,
                Conversation.flow_id == flow.id,
                Conversation.status.in_(["active", "pending"]),
            )
        )
        conv_result = await db.execute(conv_stmt)
        conversation = conv_result.scalar_one_or_none()
        
        if not conversation:
            # Create new conversation
            conversation = Conversation(
                organization_id = automation.organization_id,
                chatbot_id = automation.chatbot_id,
                flow_id = automation.flow_id,
                contact_id = contact.id,
                contact_whatsapp_id = contact.whatsapp_id or contact.phone_number,
                whatsapp_number_id = automation.whatsapp_number_id,
                status = "active",
                initiated_by = "automation",
            )
            db.add(conversation)
            await db.flush()
        
        # 8. Inject resolved variables into conversation context
        context_vars = recipient.variables or {}
        conversation.context_variables = context_vars
        
        # 9. Mark recipient as started
        recipient.status = "sent"
        recipient.started_at = datetime.utcnow()
        recipient.flow_execution_id = conversation.id
        
        await db.commit()
        
        # 10. Execute flow using WhatsAppService
        try:
            whatsapp_service = WhatsAppService(db)
            
            # Get start node
            start_node = await _get_start_node(db, flow.id)
            if not start_node:
                raise ValueError(f"No START node found in flow {flow.id}")
            
            # Execute flow
            await whatsapp_service.execute_flow(
                conversation=conversation,
                flow=flow,
                current_node=start_node,
                incoming_message=None,  # No incoming message, flow is proactive
            )
            
            # 11. Update recipient status based on conversation
            recipient.status = "completed"
            recipient.completed_at = datetime.utcnow()
            
        except Exception as e:
            logger.error(f"❌ Flow execution error for recipient {recipient_id}: {str(e)}")
            recipient.status = "failed"
            recipient.error_message = str(e)
            recipient.failed_at = datetime.utcnow()
            
            # Check retry count
            if recipient.retry_count < automation.max_retries:
                recipient.retry_count += 1
                recipient.last_retry_at = datetime.utcnow()
                
                # Schedule retry with exponential backoff
                base_delay = automation.retry_base_delay or 60  # seconds
                max_delay = automation.retry_max_delay or 3600   # seconds
                delay = min(base_delay * (2 ** (recipient.retry_count - 1)), max_delay)
                
                retry_task = retry_process_flow_recipient.apply_async(
                    args=[execution_id, recipient_id, batch_index],
                    countdown=delay,
                )
                logger.info(f"⏳ Scheduled retry for recipient {recipient_id} in {delay}s")
        
        await db.commit()
        
        return {
            "recipient_id": recipient_id,
            "contact_id": str(contact.id),
            "phone": recipient.phone_number,
            "status": recipient.status,
            "retry_count": recipient.retry_count,
        }


@celery_app.task(
    base=FlowAutomationTask,
    name="retry_process_flow_recipient",
)
def retry_process_flow_recipient(execution_id: str, recipient_id: str, batch_index: int):
    """Retry processing a failed recipient"""
    logger.info(f"🔄 Retrying recipient {recipient_id}")
    return process_flow_recipient(execution_id, recipient_id, batch_index)


@celery_app.task(name="finalize_flow_automation_execution")
def finalize_flow_automation_execution(results: List[Dict], execution_id: str) -> Dict[str, Any]:
    """
    Finalize execution after all recipients have been processed.
    
    Updates execution and automation statistics.
    """
    logger.info(f"🏁 Finalizing execution {execution_id}")
    
    try:
        final_result = asyncio.run(_finalize_execution_async(execution_id, results))
        logger.info(f"✅ Execution {execution_id} finalized")
        return final_result
        
    except Exception as e:
        logger.error(f"❌ Finalization failed: {str(e)}")
        raise


async def _finalize_execution_async(
    execution_id: str,
    results: List[Dict],
) -> Dict[str, Any]:
    """Async implementation of finalization"""
    
    async with async_session() as db:
        # Load execution
        execution = await _get_execution(db, execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")
        
        # Load automation
        automation = await _get_automation(db, execution.automation_id)
        if not automation:
            raise ValueError(f"Automation not found")
        
        # Load all recipients to calculate stats
        recipients_stmt = select(FlowAutomationRecipient).where(
            FlowAutomationRecipient.execution_id == UUID(execution_id)
        )
        recipients_result = await db.execute(recipients_stmt)
        recipients = recipients_result.scalars().all()
        
        # Calculate execution statistics
        total = len(recipients)
        sent = sum(1 for r in recipients if r.status in ["sent", "delivered", "read", "completed"])
        delivered = sum(1 for r in recipients if r.status in ["delivered", "read", "completed"])
        read = sum(1 for r in recipients if r.status in ["read", "completed"])
        completed = sum(1 for r in recipients if r.status == "completed")
        failed = sum(1 for r in recipients if r.status == "failed")
        
        # Update execution
        execution.status = "completed"
        execution.completed_at = datetime.utcnow()
        execution.messages_sent = sent
        execution.messages_delivered = delivered
        execution.messages_read = read
        execution.messages_completed = completed
        execution.messages_failed = failed
        
        # Update automation aggregated stats
        automation.total_executions += 1
        automation.total_sent += sent
        automation.total_delivered += delivered
        automation.total_read += read
        automation.total_completed += completed
        automation.total_failed += failed
        automation.last_executed_at = datetime.utcnow()
        
        await db.commit()
        
        # Calculate rates
        delivery_rate = (delivered / sent * 100) if sent > 0 else 0
        completion_rate = (completed / sent * 100) if sent > 0 else 0
        
        return {
            "execution_id": execution_id,
            "status": "completed",
            "total": total,
            "sent": sent,
            "delivered": delivered,
            "read": read,
            "completed": completed,
            "failed": failed,
            "delivery_rate": delivery_rate,
            "completion_rate": completion_rate,
        }


# ============================================
# HELPER FUNCTIONS
# ============================================

async def _get_execution(db: AsyncSession, execution_id: str):
    """Load execution by ID"""
    stmt = select(FlowAutomationExecution).where(
        FlowAutomationExecution.id == UUID(execution_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _get_automation(db: AsyncSession, automation_id: str):
    """Load automation by ID"""
    from app.models.flow_automation import FlowAutomation
    stmt = select(FlowAutomation).where(
        FlowAutomation.id == UUID(automation_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _get_contact(db: AsyncSession, contact_id: str):
    """Load contact by ID"""
    stmt = select(Contact).where(
        Contact.id == UUID(contact_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _get_flow(db: AsyncSession, flow_id: str):
    """Load flow by ID"""
    stmt = select(Flow).where(
        Flow.id == UUID(flow_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _get_start_node(db: AsyncSession, flow_id: str):
    """Get START node of flow"""
    from app.models.chatbot import FlowNode
    stmt = select(FlowNode).where(
        and_(
            FlowNode.flow_id == UUID(flow_id),
            FlowNode.node_type == "start",
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _mark_execution_failed(execution_id: str, error_message: str):
    """Mark execution as failed"""
    async with async_session() as db:
        execution = await _get_execution(db, execution_id)
        if execution:
            execution.status = "failed"
            execution.completed_at = datetime.utcnow()
            execution.error_message = error_message
            await db.commit()


async def _mark_recipient_failed(recipient_id: str, error_message: str):
    """Mark recipient as failed"""
    async with async_session() as db:
        stmt = select(FlowAutomationRecipient).where(
            FlowAutomationRecipient.id == UUID(recipient_id)
        )
        result = await db.execute(stmt)
        recipient = result.scalar_one_or_none()
        
        if recipient:
            recipient.status = "failed"
            recipient.error_message = error_message
            recipient.failed_at = datetime.utcnow()
            await db.commit()


def _is_within_execution_window(automation) -> bool:
    """Check if current time is within execution window"""
    if not automation.execution_window_start or not automation.execution_window_end:
        return True  # No window configured, always allow
    
    from datetime import time
    import pytz
    
    tz = pytz.timezone(automation.execution_timezone or "America/Sao_Paulo")
    now = datetime.now(tz).time()
    
    start = automation.execution_window_start
    end = automation.execution_window_end
    
    if start <= end:
        return start <= now <= end
    else:
        # Window spans midnight
        return now >= start or now <= end
