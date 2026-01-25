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

    async def process_template_status_update(
        self,
        waba_id: str,
        webhook_data: Dict[str, Any]
    ) -> None:
        """
        Process template status update from Meta webhook.
        
        This is called when Meta sends message_template_status_update events
        for quality score changes, approval/rejection, pause/disable notifications.
        
        Webhook format:
        {
            "waba_id": "123456789",
            "message_template_name": "template_name",
            "language": "pt_BR",
            "event": "APPROVED|REJECTED|PENDING|DISABLED|PAUSED|QUALITY_CHANGE",
            "quality_score": "GREEN|YELLOW|RED|UNKNOWN",
            "reason": "reason_code",
            "timestamp": "1234567890"
        }
        
        Args:
            waba_id: WhatsApp Business Account ID
            webhook_data: Template status update data
        """
        from app.services.template_status_service import TemplateStatusService
        
        try:
            template_name = webhook_data.get("message_template_name")
            event = webhook_data.get("event")
            language = webhook_data.get("language", "pt_BR")
            
            logger.info(
                f"📋 Processing template status update: "
                f"waba={waba_id}, template={template_name}, event={event}"
            )
            
            # For now, we need to find the organization by WABA ID
            # This is a limitation - Meta doesn't send org_id in webhook
            # We'll need to find it from WhatsAppNumber table
            
            from app.models.whatsapp_number import WhatsAppNumber
            from sqlalchemy import select
            
            # Find organization by WABA ID
            query = select(WhatsAppNumber).where(
                WhatsAppNumber.whatsapp_business_account_id == waba_id
            )
            result = await self.db.execute(query)
            whatsapp_number = result.scalar_one_or_none()
            
            if not whatsapp_number:
                logger.warning(
                    f"⚠️ WhatsApp number not found for WABA: {waba_id}. "
                    f"Cannot process template status update."
                )
                return
            
            # Now process with organization context
            template_status_service = TemplateStatusService(self.db)
            template = await template_status_service.process_template_status_update(
                waba_id=waba_id,
                template_name=template_name,
                organization_id=whatsapp_number.organization_id,
                webhook_data=webhook_data
            )
            
            if template:
                logger.info(
                    f"✅ Template status processed: {template_name} "
                    f"(status={template.status}, quality={template.quality_score})"
                )
            
        except Exception as e:
            logger.error(
                f"❌ Error processing template status update: {e}",
                exc_info=True
            )
    
    async def process_customer_message_for_window(
        self, message: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Process incoming customer message - creates conversation if needed and triggers default flow
        
        When a customer sends a message:
        1. Extract phone_number_id from metadata to find WhatsAppNumber
        2. Get or create Contact by whatsapp_id (phone number)
        3. Get or create Conversation for this contact
        4. Save inbound message to database
        5. Trigger default flow if conversation is new or has no active flow
        6. Reset 24-hour conversation window
        
        Message format from Meta webhook:
        {
          "from": "5511999999999",
          "id": "wamid.xxx",
          "timestamp": "1234567890",
          "type": "text|interactive|media|etc",
          "text": {"body": "..."} or "interactive": {...}
        }
        
        Metadata format:
        {
          "phone_number_id": "574293335763643",
          "display_phone_number": "+556181277787"
        }
        
        Args:
            message: Incoming message object from webhook
            metadata: Metadata from webhook containing phone_number_id
        """
        try:
            from app.repositories.conversation import ConversationRepository, MessageRepository
            from app.repositories.contact import ContactRepository
            from app.repositories.whatsapp import WhatsAppNumberRepository
            from app.services.window_validation_service import WindowValidationService
            from app.services.whatsapp_service import WhatsAppService
            from datetime import datetime
            
            # Extract message data
            message_id = message.get("id")
            from_number = message.get("from")
            timestamp = message.get("timestamp")
            message_type = message.get("type", "text")
            
            # Extract text content
            text_content = ""
            if message_type == "text":
                text_content = message.get("text", {}).get("body", "")
            elif message_type == "interactive":
                # Handle button/list responses
                interactive = message.get("interactive", {})
                if interactive.get("type") == "button_reply":
                    text_content = interactive.get("button_reply", {}).get("title", "")
                elif interactive.get("type") == "list_reply":
                    text_content = interactive.get("list_reply", {}).get("title", "")
            
            if not from_number:
                logger.warning(f"⚠️ Missing 'from' number in message: {message_id}")
                return
            
            # Extract phone_number_id from metadata
            phone_number_id = metadata.get("phone_number_id") if metadata else None
            if not phone_number_id:
                logger.error(f"❌ Missing phone_number_id in metadata for message {message_id}")
                return
            
            logger.info(
                f"📞 Customer message received: {message_id} from {from_number} "
                f"to phone_number_id {phone_number_id}"
            )
            
            # 1. Get WhatsAppNumber by phone_number_id to determine organization
            whatsapp_repo = WhatsAppNumberRepository(self.db)
            whatsapp_number = await whatsapp_repo.get_by_phone_number_id(phone_number_id)
            
            if not whatsapp_number:
                logger.error(
                    f"❌ WhatsAppNumber not found for phone_number_id: {phone_number_id}. "
                    f"Cannot process message."
                )
                return
            
            organization_id = whatsapp_number.organization_id
            whatsapp_number_id = whatsapp_number.id
            default_flow_id = whatsapp_number.default_flow_id
            default_chatbot_id = whatsapp_number.default_chatbot_id
            
            logger.info(f"📋 Organization ID: {organization_id}")
            logger.info(f"📱 WhatsAppNumber ID: {whatsapp_number_id}")
            logger.info(f"🔄 Default Flow ID: {default_flow_id}")
            
            # 2. Get or create Contact by whatsapp_id
            contact_repo = ContactRepository(self.db)
            whatsapp_name = message.get("profile", {}).get("name")
            contact = await contact_repo.get_or_create_by_whatsapp_id(
                whatsapp_id=from_number,
                organization_id=organization_id,
                whatsapp_name=whatsapp_name
            )
            logger.info(f"👤 Contact: {contact.id} ({contact.name or contact.whatsapp_id})")
            
            # 3. Get or create Conversation
            conv_repo = ConversationRepository(self.db)
            conversation = await conv_repo.get_by_contact_phone(from_number, organization_id)
            
            is_new_conversation = False
            
            # If conversation exists but is closed, create a new one (new session)
            if conversation and conversation.status == "closed":
                logger.info(f"🔒 Previous conversation {conversation.id} is closed, creating new conversation")
                conversation = None  # Force creation of new conversation
            
            if not conversation:
                # Create new conversation
                is_new_conversation = True
                conversation_data = {
                    "organization_id": organization_id,
                    "contact_id": contact.id,
                    "whatsapp_number_id": whatsapp_number_id,
                    "status": "open",
                    "channel": "whatsapp",
                    "is_bot_active": True,
                    "total_messages": 0,
                    "messages_from_contact": 0,
                    "messages_from_agent": 0,
                    "messages_from_bot": 0,
                }
                
                conversation = await conv_repo.create(conversation_data)
                await self.db.commit()
                logger.info(f"✨ New conversation created: {conversation.id}")
            else:
                logger.info(f"💬 Existing conversation found: {conversation.id}")
            
            # 4. Save inbound message to database (check if not already processed)
            message_repo = MessageRepository(self.db)
            
            # Check if message already exists to avoid duplicates
            from sqlalchemy import select
            from app.models.conversation import Message
            
            existing_message = await self.db.execute(
                select(Message).where(
                    Message.whatsapp_message_id == message_id,
                    Message.organization_id == organization_id
                )
            )
            if existing_message.scalar_one_or_none():
                logger.info(f"⚠️ Message {message_id} already processed, skipping")
                return
            
            message_data = {
                "organization_id": organization_id,
                "conversation_id": conversation.id,
                "whatsapp_message_id": message_id,
                "direction": "inbound",
                "sender_type": "contact",
                "content": {"text": text_content} if text_content else {},
                "message_type": message_type,
                "status": "received",
                "extra_data": message,
            }
            
            saved_message = await message_repo.create(message_data)
            await self.db.commit()
            logger.info(f"💾 Message saved: {saved_message.id}")
            
            # 5. Update conversation last_message_at and message counts
            await conv_repo.update(conversation.id, {
                "last_message_at": datetime.utcnow(),
                "last_message_from_contact_at": datetime.utcnow(),
                "total_messages": conversation.total_messages + 1,
                "messages_from_contact": conversation.messages_from_contact + 1,
            })
            await self.db.commit()
            
            # 6. Trigger default flow if needed
            should_trigger_flow = (
                is_new_conversation or 
                (conversation.active_flow_id is None and default_flow_id is not None)
            )
            
            if should_trigger_flow and default_flow_id:
                logger.info(
                    f"🔥 Triggering default flow: {default_flow_id} "
                    f"for conversation {conversation.id}"
                )
                
                # Use WhatsAppService to trigger flow
                whatsapp_service = WhatsAppService(self.db)
                await whatsapp_service._trigger_flow_simple(
                    conversation_id=conversation.id,
                    organization_id=organization_id,
                    active_flow_id=default_flow_id,
                    active_chatbot_id=default_chatbot_id,
                    whatsapp_number_id=whatsapp_number_id,
                )
            elif conversation.active_flow_id:
                # Flow already active - user is responding to a question
                logger.info(f"💬 Flow already active, user responding to question")
                
                # Use WhatsAppService to continue flow execution
                whatsapp_service = WhatsAppService(self.db)
                await whatsapp_service._trigger_flow_simple(
                    conversation_id=conversation.id,
                    organization_id=organization_id,
                    active_flow_id=conversation.active_flow_id,
                    active_chatbot_id=conversation.active_chatbot_id,
                    whatsapp_number_id=whatsapp_number_id,
                )
            else:
                logger.info(f"ℹ️ No default flow configured for WhatsAppNumber {whatsapp_number_id}")
            
            # 7. Update 24-hour conversation window
            window_service = WindowValidationService(self.db)
            updated_window = await window_service.reset_window_on_customer_message(
                conversation_id=conversation.id,
                organization_id=organization_id
            )
            
            if updated_window:
                logger.info(
                    f"✅ Window reset for conversation {conversation.id}: "
                    f"expires_at={updated_window.ends_at}"
                )
            
        except Exception as e:
            logger.error(
                f"❌ Error processing customer message: {e}",
                exc_info=True
            )


