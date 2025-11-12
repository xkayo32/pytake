"""
Webhook Service - Business logic for webhook processing

Handles:
- Message status updates from Meta Cloud API
- Campaign stats updates
- WebSocket broadcasts
- Message tracking
"""

import logging
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Message
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.tasks.campaign_retry import CampaignRetryManager

logger = logging.getLogger(__name__)


class WebhookService:
    """Service for processing webhook events"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def process_message_status(self, status: Dict[str, Any]) -> None:
        """
        Process message status update from Meta webhook
        
        Status format:
        {
          "id": "wamid.xxx",
          "status": "delivered",  # sent, delivered, read, failed
          "timestamp": "1234567890",
          "recipient_id": "5511999999999",
          "errors": [...]  # if status == failed
        }
        
        Args:
            status: Status object from webhook
        """
        message_id = status.get("id")
        status_value = status.get("status")
        timestamp = status.get("timestamp")
        recipient_id = status.get("recipient_id")
        errors = status.get("errors", [])
        
        logger.info(
            f"📝 Processing status update: "
            f"message_id={message_id}, status={status_value}"
        )
        
        # Find message by WhatsApp message ID
        message = await self._find_message_by_whatsapp_id(message_id)
        
        if not message:
            logger.warning(
                f"⚠️ Message not found: {message_id}. "
                f"Possibly not a campaign message or already deleted."
            )
            return
        
        # Update message status
        old_status = message.status
        message.status = status_value
        message.metadata = message.metadata or {}
        message.metadata["status_history"] = message.metadata.get("status_history", [])
        message.metadata["status_history"].append({
            "status": status_value,
            "timestamp": timestamp,
            "updated_at": datetime.utcnow().isoformat(),
        })
        
        await self.db.commit()
        
        logger.info(
            f"✅ Updated message {message_id}: {old_status} -> {status_value}"
        )
        
        # If message is part of a campaign, update campaign stats
        campaign_id = message.metadata.get("campaign_id")
        
        if campaign_id:
            await self._update_campaign_stats(
                campaign_id=UUID(campaign_id),
                contact_id=message.contact_id,
                message_id=message_id,
                status=status_value,
                errors=errors,
            )
    
    async def _find_message_by_whatsapp_id(
        self,
        whatsapp_message_id: str
    ) -> Optional[Message]:
        """
        Find message by WhatsApp message ID
        
        Args:
            whatsapp_message_id: WhatsApp message ID (wamid.xxx)
            
        Returns:
            Message or None if not found
        """
        stmt = select(Message).where(
            Message.whatsapp_message_id == whatsapp_message_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def _update_campaign_stats(
        self,
        campaign_id: UUID,
        contact_id: UUID,
        message_id: str,
        status: str,
        errors: list,
    ) -> None:
        """
        Update campaign statistics based on message status
        
        Status transitions:
        - sent -> delivered: increment messages_delivered
        - delivered -> read: increment messages_read
        - any -> failed: increment messages_failed
        
        Args:
            campaign_id: Campaign UUID
            contact_id: Contact UUID
            message_id: WhatsApp message ID
            status: New status (sent, delivered, read, failed)
            errors: List of error objects (if status == failed)
        """
        # Load campaign
        stmt = select(Campaign).where(Campaign.id == campaign_id)
        result = await self.db.execute(stmt)
        campaign = result.scalar_one_or_none()
        
        if not campaign:
            logger.warning(f"⚠️ Campaign not found: {campaign_id}")
            return
        
        logger.info(
            f"📊 Updating campaign {campaign_id} stats: "
            f"status={status}, contact={contact_id}"
        )
        
        # Initialize retry manager to update message_statuses
        retry_manager = CampaignRetryManager(campaign, self.db)
        
        # Update message_statuses JSONB
        await retry_manager.update_message_status(
            contact_id=contact_id,
            new_status=status,
            message_id=message_id,
        )
        
        # Update campaign counters based on status
        if status == "delivered":
            # Only increment if not already counted
            # (prevents double counting if webhook sent twice)
            contact_status = retry_manager.get_contact_status(contact_id)
            
            if contact_status and contact_status.get("status") != "delivered":
                campaign.messages_delivered += 1
                logger.info(
                    f"✅ Campaign {campaign_id}: messages_delivered "
                    f"now {campaign.messages_delivered}"
                )
        
        elif status == "read":
            # Increment read count
            contact_status = retry_manager.get_contact_status(contact_id)
            
            if contact_status and contact_status.get("status") != "read":
                campaign.messages_read += 1
                
                # Also ensure delivered is counted
                if campaign.messages_delivered < campaign.messages_read:
                    campaign.messages_delivered = campaign.messages_read
                
                logger.info(
                    f"✅ Campaign {campaign_id}: messages_read "
                    f"now {campaign.messages_read}"
                )
        
        elif status == "failed":
            # Increment failed count
            campaign.messages_failed += 1
            
            # Record error details
            if errors:
                error_detail = errors[0] if errors else {}
                error_message = (
                    f"Code: {error_detail.get('code')}, "
                    f"Title: {error_detail.get('title')}"
                )
                campaign.last_error_message = error_message
            
            logger.error(
                f"❌ Campaign {campaign_id}: message failed. "
                f"Total failed: {campaign.messages_failed}"
            )
        
        # Recalculate rates
        if campaign.messages_sent > 0:
            campaign.delivery_rate = (
                campaign.messages_delivered / campaign.messages_sent * 100
            )
            campaign.read_rate = (
                campaign.messages_read / campaign.messages_sent * 100
            )
        
        await self.db.commit()
        
        # Broadcast progress via WebSocket
        await self._broadcast_campaign_progress(campaign)
    
    async def _broadcast_campaign_progress(self, campaign: Campaign) -> None:
        """
        Broadcast campaign progress via WebSocket
        
        Args:
            campaign: Campaign model
        """
        try:
            from app.core.websocket_manager import websocket_manager
            
            # Calculate progress
            progress_percentage = campaign.progress_percentage
            
            # Prepare payload
            payload = {
                "campaign_id": str(campaign.id),
                "campaign_name": campaign.name,
                "status": campaign.status,
                "progress": progress_percentage,
                "stats": {
                    "total_recipients": campaign.total_recipients,
                    "messages_sent": campaign.messages_sent,
                    "messages_delivered": campaign.messages_delivered,
                    "messages_read": campaign.messages_read,
                    "messages_failed": campaign.messages_failed,
                    "messages_pending": campaign.messages_pending,
                    "delivery_rate": campaign.delivery_rate,
                    "read_rate": campaign.read_rate,
                },
                "timestamp": datetime.utcnow().isoformat(),
            }
            
            # Broadcast to campaign room
            await websocket_manager.broadcast_to_room(
                room=f"campaign:{campaign.id}",
                message=payload,
                event="campaign:progress",
            )
            
            logger.info(
                f"📡 Broadcasted progress for campaign {campaign.id}: "
                f"{progress_percentage:.1f}%"
            )
            
        except ImportError:
            logger.warning(
                "⚠️ WebSocket manager not available, skipping broadcast"
            )
        except Exception as e:
            logger.error(f"❌ Error broadcasting progress: {e}")
