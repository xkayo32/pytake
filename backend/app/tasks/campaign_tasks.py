"""
Campaign Tasks - Celery tasks for campaign execution

Handles batch processing, message sending, retry logic, and progress tracking
for bulk messaging campaigns.
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID

from celery import Task, group, chord
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.tasks.celery_app import celery_app
from app.core.database import async_session
from app.core.whatsapp_rate_limit import get_whatsapp_rate_limiter
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.whatsapp_number import WhatsAppNumber
from app.models.conversation import Message
from app.services.whatsapp_service import WhatsAppService
from app.integrations.meta_api import MetaCloudAPI, MetaAPIError

logger = logging.getLogger(__name__)


class CampaignTask(Task):
    """Base task class with campaign-specific error handling"""
    
    autoretry_for = (Exception,)
    retry_kwargs = {'max_retries': 3}
    retry_backoff = True  # Exponential backoff: 1s, 4s, 16s
    retry_backoff_max = 600  # Max 10 minutes
    retry_jitter = True  # Add randomness to avoid thundering herd


@celery_app.task(
    base=CampaignTask,
    name="execute_campaign",
    bind=True,
    track_started=True,
)
def execute_campaign(self, campaign_id: str) -> Dict[str, Any]:
    """
    Main task to execute a campaign.
    
    Orchestrates the entire campaign execution:
    1. Validates campaign and prerequisites
    2. Fetches target contacts
    3. Divides contacts into batches
    4. Creates subtasks for batch processing
    5. Tracks overall progress
    
    Args:
        campaign_id: UUID of the campaign to execute
        
    Returns:
        Dict with execution results and statistics
    """
    logger.info(f"🚀 Starting campaign execution: {campaign_id}")
    
    try:
        # Run async operations in sync context
        result = asyncio.run(_execute_campaign_async(campaign_id, self.request.id))
        logger.info(f"✅ Campaign {campaign_id} execution completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Campaign {campaign_id} execution failed: {str(e)}")
        # Update campaign status to failed
        asyncio.run(_mark_campaign_failed(campaign_id, str(e)))
        raise


async def _execute_campaign_async(campaign_id: str, task_id: str) -> Dict[str, Any]:
    """Async implementation of campaign execution"""
    
    async with async_session() as db:
        # 1. Load campaign
        stmt = select(Campaign).where(Campaign.id == UUID(campaign_id))
        result = await db.execute(stmt)
        campaign = result.scalar_one_or_none()
        
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")
        
        if campaign.status not in ["draft", "scheduled"]:
            raise ValueError(f"Campaign {campaign_id} has invalid status: {campaign.status}")
        
        # 2. Validate WhatsApp number
        if not campaign.whatsapp_number_id:
            raise ValueError("Campaign requires a WhatsApp number")
        
        stmt = select(WhatsAppNumber).where(
            WhatsAppNumber.id == campaign.whatsapp_number_id
        )
        result = await db.execute(stmt)
        whatsapp_number = result.scalar_one_or_none()
        
        if not whatsapp_number or not whatsapp_number.is_active:
            raise ValueError("WhatsApp number is not active")
        
        # 3. Fetch target contacts
        contacts = await _get_campaign_contacts(db, campaign)
        
        if not contacts:
            raise ValueError("No contacts found for campaign")
        
        logger.info(f"📊 Campaign {campaign_id}: {len(contacts)} contacts to process")
        
        # 4. Update campaign status and stats
        campaign.status = "running"
        campaign.started_at = datetime.utcnow()
        campaign.total_recipients = len(contacts)
        campaign.messages_pending = len(contacts)
        await db.commit()
        
        # 5. Divide into batches (100 contacts per batch)
        batch_size = 100
        batches = [
            contacts[i:i + batch_size]
            for i in range(0, len(contacts), batch_size)
        ]
        
        logger.info(f"📦 Campaign {campaign_id}: {len(batches)} batches created")
        
        # 6. Create batch processing tasks
        batch_tasks = []
        for batch_index, contact_batch in enumerate(batches):
            contact_ids = [str(contact.id) for contact in contact_batch]
            
            # Create task for each batch
            task = process_batch.s(
                campaign_id=campaign_id,
                contact_ids=contact_ids,
                batch_index=batch_index,
            )
            batch_tasks.append(task)
        
        # 7. Execute batches in parallel with callback
        # Use chord to execute all batches and then call completion callback
        callback = finalize_campaign.s(campaign_id)
        job = chord(batch_tasks)(callback)
        
        return {
            "campaign_id": campaign_id,
            "task_id": task_id,
            "total_contacts": len(contacts),
            "total_batches": len(batches),
            "batch_size": batch_size,
            "status": "running",
            "started_at": campaign.started_at.isoformat(),
        }


async def _get_campaign_contacts(db: AsyncSession, campaign: Campaign) -> List[Contact]:
    """
    Fetch contacts based on campaign targeting configuration.
    
    Supports:
    - All contacts in organization
    - Specific contact IDs
    - Contacts with specific tags
    - Segment filters
    """
    
    # Base query
    query = select(Contact).where(
        and_(
            Contact.organization_id == campaign.organization_id,
            Contact.deleted_at.is_(None),
        )
    )
    
    # Apply audience targeting
    if campaign.audience_type == "all_contacts":
        # All contacts
        pass
    
    elif campaign.audience_type == "custom_list":
        # Specific contact IDs
        if campaign.target_contact_ids:
            query = query.where(Contact.id.in_(campaign.target_contact_ids))
        else:
            return []
    
    elif campaign.audience_type == "tags":
        # Contacts with specific tags
        if campaign.target_tag_ids:
            # Use PostgreSQL array overlap operator
            query = query.where(Contact.tags.overlap(campaign.target_tag_ids))
        else:
            return []
    
    # Apply additional filters
    if campaign.respect_opt_out:
        # Skip opted-out contacts
        query = query.where(or_(Contact.opted_out.is_(None), Contact.opted_out == False))
    
    # Only contacts with WhatsApp
    query = query.where(Contact.whatsapp_id.isnot(None))
    
    # Execute query
    result = await db.execute(query)
    contacts = result.scalars().all()
    
    return list(contacts)


@celery_app.task(
    base=CampaignTask,
    name="process_batch",
    bind=True,
    track_started=True,
)
def process_batch(
    self,
    campaign_id: str,
    contact_ids: List[str],
    batch_index: int,
) -> Dict[str, Any]:
    """
    Process a batch of contacts for a campaign.
    
    Args:
        campaign_id: UUID of the campaign
        contact_ids: List of contact UUIDs to process
        batch_index: Index of this batch (for logging)
        
    Returns:
        Dict with batch processing results
    """
    logger.info(
        f"📦 Processing batch {batch_index} for campaign {campaign_id}: "
        f"{len(contact_ids)} contacts"
    )
    
    try:
        result = asyncio.run(_process_batch_async(campaign_id, contact_ids, batch_index))
        logger.info(
            f"✅ Batch {batch_index} completed: "
            f"{result['sent']}/{result['total']} sent"
        )
        return result
        
    except Exception as e:
        logger.error(f"❌ Batch {batch_index} failed: {str(e)}")
        raise


async def _process_batch_async(
    campaign_id: str,
    contact_ids: List[str],
    batch_index: int,
) -> Dict[str, Any]:
    """Async implementation of batch processing"""
    
    async with async_session() as db:
        # Load campaign
        stmt = select(Campaign).where(Campaign.id == UUID(campaign_id))
        result = await db.execute(stmt)
        campaign = result.scalar_one_or_none()
        
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")
        
        # Check if campaign was paused or cancelled
        if campaign.status in ["paused", "cancelled", "completed"]:
            logger.warning(
                f"⚠️ Campaign {campaign_id} is {campaign.status}, "
                f"skipping batch {batch_index}"
            )
            return {
                "campaign_id": campaign_id,
                "batch_index": batch_index,
                "total": len(contact_ids),
                "sent": 0,
                "failed": 0,
                "skipped": len(contact_ids),
                "status": "skipped",
            }
        
        # Load WhatsApp number
        stmt = select(WhatsAppNumber).where(
            WhatsAppNumber.id == campaign.whatsapp_number_id
        )
        result = await db.execute(stmt)
        whatsapp_number = result.scalar_one_or_none()
        
        # Initialize rate limiter for this WhatsApp number
        rate_limiter = await get_whatsapp_rate_limiter(
            whatsapp_number.id,
            whatsapp_number.connection_type
        )
        
        # Check current usage
        usage = await rate_limiter.get_current_usage()
        logger.info(
            f"📊 WhatsApp {whatsapp_number.id} rate limit usage: {usage}"
        )
        
        # Load contacts
        stmt = select(Contact).where(
            Contact.id.in_([UUID(cid) for cid in contact_ids])
        )
        result = await db.execute(stmt)
        contacts = result.scalars().all()
        
        # Process each contact
        sent_count = 0
        failed_count = 0
        rate_limit_paused = False
        
        for contact in contacts:
            try:
                # Check rate limit before sending
                can_send, reason = await rate_limiter.can_send_message()
                
                if not can_send:
                    logger.warning(
                        f"⚠️ Rate limit hit for batch {batch_index}: {reason}"
                    )
                    
                    # Wait if needed
                    wait_time = await rate_limiter.wait_if_needed()
                    
                    if wait_time > 300:  # More than 5 minutes
                        # Pause campaign instead of waiting
                        logger.error(
                            f"❌ Rate limit exceeded, pausing campaign {campaign_id}"
                        )
                        campaign.pause()
                        campaign.last_error_message = (
                            f"Rate limit exceeded: {reason}. "
                            f"Campaign paused. Wait {wait_time/60:.1f} minutes."
                        )
                        await db.commit()
                        rate_limit_paused = True
                        break
                    else:
                        # Wait for shorter periods
                        logger.info(f"⏳ Waiting {wait_time}s for rate limit...")
                        await asyncio.sleep(wait_time)
                
                # Send message
                success = await _send_campaign_message(
                    db=db,
                    campaign=campaign,
                    contact=contact,
                    whatsapp_number=whatsapp_number,
                )
                
                if success:
                    sent_count += 1
                    # Update campaign stats
                    campaign.messages_sent += 1
                    campaign.messages_pending -= 1
                    
                    # Record in rate limiter
                    await rate_limiter.record_message_sent()
                else:
                    failed_count += 1
                    campaign.messages_failed += 1
                    campaign.messages_pending -= 1
                
                await db.commit()
                
                # Rate limiting: delay between messages
                if campaign.delay_between_messages_seconds > 0:
                    await asyncio.sleep(campaign.delay_between_messages_seconds)
                    
            except Exception as e:
                logger.error(
                    f"❌ Failed to send message to {contact.whatsapp_id}: {str(e)}"
                )
                failed_count += 1
                campaign.messages_failed += 1
                campaign.messages_pending -= 1
                campaign.error_count += 1
                campaign.last_error_message = str(e)
                await db.commit()
        
        # Return results
        status = "paused" if rate_limit_paused else "completed"
        
        return {
            "campaign_id": campaign_id,
            "batch_index": batch_index,
            "total": len(contact_ids),
            "sent": sent_count,
            "failed": failed_count,
            "skipped": len(contact_ids) - sent_count - failed_count,
            "status": status,
            "rate_limit_paused": rate_limit_paused,
        }


async def _send_campaign_message(
    db: AsyncSession,
    campaign: Campaign,
    contact: Contact,
    whatsapp_number: WhatsAppNumber,
) -> bool:
    """
    Send a single campaign message to a contact.
    
    Returns:
        True if sent successfully, False otherwise
    """
    
    try:
        # Prepare message content
        if campaign.message_type == "text":
            message_text = campaign.message_content.get("text", "")
            
            # Replace variables (basic implementation)
            message_text = message_text.replace("{{contact.name}}", contact.name or "")
            message_text = message_text.replace("{{contact.phone}}", contact.phone or "")
            
            # Send via WhatsApp
            if whatsapp_number.connection_type == "official":
                # Use Meta Cloud API
                api = MetaCloudAPI(
                    phone_number_id=whatsapp_number.phone_number_id,
                    access_token=whatsapp_number.access_token,
                )
                
                response = await api.send_text_message(
                    to=contact.whatsapp_id,
                    text=message_text,
                )
                
                message_id = response.get("messages", [{}])[0].get("id")
                
            else:
                # Use Evolution API (QR Code)
                from app.integrations.evolution_api import EvolutionAPI
                
                api = EvolutionAPI(
                    base_url=whatsapp_number.evolution_api_url,
                    api_key=whatsapp_number.evolution_api_key,
                )
                
                response = await api.send_text(
                    instance_name=whatsapp_number.instance_name,
                    number=contact.whatsapp_id,
                    text=message_text,
                )
                
                message_id = response.get("key", {}).get("id")
            
            # Save message to database
            message = Message(
                organization_id=campaign.organization_id,
                contact_id=contact.id,
                whatsapp_number_id=whatsapp_number.id,
                direction="outbound",
                content_type="text",
                content={"text": message_text},
                status="sent",
                whatsapp_message_id=message_id,
                metadata={
                    "campaign_id": str(campaign.id),
                    "campaign_name": campaign.name,
                },
            )
            db.add(message)
            
            logger.info(
                f"✅ Sent campaign message to {contact.whatsapp_id} "
                f"(message_id: {message_id})"
            )
            
            return True
            
        else:
            logger.warning(
                f"⚠️ Unsupported message type: {campaign.message_type}"
            )
            return False
            
    except MetaAPIError as e:
        logger.error(
            f"❌ Meta API error sending to {contact.whatsapp_id}: "
            f"{e.message} (code: {e.error_code})"
        )
        return False
        
    except Exception as e:
        logger.error(
            f"❌ Error sending to {contact.whatsapp_id}: {str(e)}"
        )
        return False


@celery_app.task(name="finalize_campaign")
def finalize_campaign(batch_results: List[Dict[str, Any]], campaign_id: str) -> Dict[str, Any]:
    """
    Finalize campaign after all batches are processed.
    
    This is called as a callback after all batch tasks complete.
    
    Args:
        batch_results: List of results from each batch
        campaign_id: UUID of the campaign
        
    Returns:
        Dict with final campaign statistics
    """
    logger.info(f"🏁 Finalizing campaign {campaign_id}")
    
    try:
        result = asyncio.run(_finalize_campaign_async(campaign_id, batch_results))
        logger.info(f"✅ Campaign {campaign_id} finalized: {result}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Failed to finalize campaign {campaign_id}: {str(e)}")
        raise


async def _finalize_campaign_async(
    campaign_id: str,
    batch_results: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Async implementation of campaign finalization"""
    
    async with async_session() as db:
        # Load campaign
        stmt = select(Campaign).where(Campaign.id == UUID(campaign_id))
        result = await db.execute(stmt)
        campaign = result.scalar_one_or_none()
        
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")
        
        # Mark as completed
        campaign.complete()
        
        # Calculate final statistics from batch results
        total_sent = sum(batch.get("sent", 0) for batch in batch_results)
        total_failed = sum(batch.get("failed", 0) for batch in batch_results)
        total_skipped = sum(batch.get("skipped", 0) for batch in batch_results)
        
        logger.info(
            f"📊 Campaign {campaign_id} final stats: "
            f"{total_sent} sent, {total_failed} failed, {total_skipped} skipped"
        )
        
        await db.commit()
        
        return {
            "campaign_id": campaign_id,
            "status": "completed",
            "total_recipients": campaign.total_recipients,
            "messages_sent": campaign.messages_sent,
            "messages_failed": campaign.messages_failed,
            "messages_delivered": campaign.messages_delivered,
            "completion_time": campaign.completed_at.isoformat() if campaign.completed_at else None,
            "delivery_rate": campaign.delivery_rate,
        }


async def _mark_campaign_failed(campaign_id: str, error_message: str):
    """Mark campaign as failed"""
    
    async with async_session() as db:
        stmt = select(Campaign).where(Campaign.id == UUID(campaign_id))
        result = await db.execute(stmt)
        campaign = result.scalar_one_or_none()
        
        if campaign:
            campaign.status = "failed"
            campaign.last_error_message = error_message
            campaign.error_count += 1
            await db.commit()
            logger.info(f"❌ Campaign {campaign_id} marked as failed: {error_message}")


# Periodic task to process scheduled campaigns
@celery_app.task(name="process_scheduled_campaigns")
def process_scheduled_campaigns() -> Dict[str, Any]:
    """
    Periodic task to check and start scheduled campaigns.
    
    Runs every 5 minutes to find campaigns that are scheduled
    to start and executes them.
    """
    logger.info("🔍 Checking for scheduled campaigns...")
    
    try:
        result = asyncio.run(_process_scheduled_campaigns_async())
        logger.info(f"✅ Scheduled campaigns processed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Failed to process scheduled campaigns: {str(e)}")
        raise


async def _process_scheduled_campaigns_async() -> Dict[str, Any]:
    """Async implementation of scheduled campaigns processing"""
    
    async with async_session() as db:
        # Find campaigns scheduled to start now or in the past
        now = datetime.utcnow()
        
        stmt = select(Campaign).where(
            and_(
                Campaign.status == "scheduled",
                Campaign.scheduled_at <= now,
                Campaign.deleted_at.is_(None),
            )
        )
        
        result = await db.execute(stmt)
        campaigns = result.scalars().all()
        
        if not campaigns:
            return {
                "campaigns_found": 0,
                "campaigns_started": 0,
            }
        
        logger.info(f"📋 Found {len(campaigns)} scheduled campaigns to start")
        
        # Start each campaign
        started_count = 0
        for campaign in campaigns:
            try:
                # Trigger campaign execution
                execute_campaign.delay(str(campaign.id))
                started_count += 1
                logger.info(f"🚀 Started campaign {campaign.id}: {campaign.name}")
                
            except Exception as e:
                logger.error(
                    f"❌ Failed to start campaign {campaign.id}: {str(e)}"
                )
        
        return {
            "campaigns_found": len(campaigns),
            "campaigns_started": started_count,
        }
