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

from app.models.conversation import Message, Conversation
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

    async def process_incoming_message(
        self,
        message: Dict[str, Any],
        metadata: Dict[str, Any],
        contacts: list,
    ) -> Optional[Message]:
        """
        Process incoming message from Meta webhook
        
        Message structure from Meta:
        {
          "from": "5511999999999",
          "id": "wamid.xxx",
          "timestamp": "1234567890",
          "type": "text",
          "text": {"body": "Hello"}
        }
        
        Metadata structure:
        {
          "display_phone_number": "551199999999",
          "phone_number_id": "123456789"
        }
        
        Args:
            message: Message object from webhook
            metadata: Metadata object with phone_number_id
            contacts: Contact list with profile info
            
        Returns:
            Created Message or None if failed
        """
        from app.models.whatsapp_number import WhatsAppNumber
        from app.models.contact import Contact
        from app.models.conversation import Conversation, Message as MessageModel
        
        try:
            # Extract message data
            sender_phone = message.get("from")
            message_id = message.get("id")
            timestamp = message.get("timestamp")
            message_type = message.get("type", "text")
            
            # Get phone_number_id to find our WhatsAppNumber
            phone_number_id = metadata.get("phone_number_id")
            
            if not phone_number_id or not sender_phone:
                logger.error(
                    f"❌ Missing required fields: "
                    f"phone_number_id={phone_number_id}, from={sender_phone}"
                )
                return None
            
            logger.info(
                f"📨 Processing incoming message: "
                f"from={sender_phone}, type={message_type}, id={message_id}"
            )
            
            # 1. Find WhatsAppNumber by phone_number_id
            stmt = select(WhatsAppNumber).where(
                WhatsAppNumber.phone_number_id == phone_number_id
            )
            result = await self.db.execute(stmt)
            whatsapp_number = result.scalar_one_or_none()
            
            if not whatsapp_number:
                logger.error(
                    f"❌ WhatsApp number not found for phone_number_id: {phone_number_id}"
                )
                return None
            
            organization_id = whatsapp_number.organization_id
            
            # 2. Find or create Contact
            contact = await self._find_or_create_contact(
                organization_id=organization_id,
                whatsapp_id=sender_phone,
                contacts_info=contacts,
            )
            
            # 3. Find or create Conversation
            conversation = await self._find_or_create_conversation(
                organization_id=organization_id,
                contact_id=contact.id,
                whatsapp_number_id=whatsapp_number.id,
            )
            
            # 4. Extract content based on message type
            content = self._extract_message_content(message, message_type)
            
            # 5. Create Message
            new_message = MessageModel(
                organization_id=organization_id,
                conversation_id=conversation.id,
                whatsapp_number_id=whatsapp_number.id,
                direction="inbound",
                sender_type="contact",
                whatsapp_message_id=message_id,
                whatsapp_timestamp=int(timestamp) if timestamp else None,
                message_type=message_type,
                content=content,
                status="received",
            )
            
            # Handle media
            if message_type in ["image", "video", "audio", "document", "sticker"]:
                media_data = message.get(message_type, {})
                new_message.media_url = media_data.get("url")
                new_message.media_mime_type = media_data.get("mime_type")
                new_message.media_filename = media_data.get("filename")
            
            self.db.add(new_message)
            
            # 6. Update conversation
            conversation.last_message_at = datetime.utcnow()
            conversation.last_inbound_at = datetime.utcnow()
            conversation.total_messages = (conversation.total_messages or 0) + 1
            conversation.unread_count = (conversation.unread_count or 0) + 1
            
            # Reopen if closed
            if conversation.status == "closed":
                conversation.status = "open"
                conversation.closed_at = None
            
            # 7. Update contact stats
            contact.total_messages_received = (contact.total_messages_received or 0) + 1
            contact.last_message_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(new_message)
            
            logger.info(
                f"✅ Created message {new_message.id} in conversation {conversation.id}"
            )
            
            # 8. Broadcast via WebSocket
            await self._broadcast_new_message(
                message=new_message,
                conversation=conversation,
                contact=contact,
                organization_id=organization_id,
            )
            
            return new_message
            
        except Exception as e:
            logger.error(f"❌ Error processing incoming message: {e}")
            await self.db.rollback()
            return None

    async def _find_or_create_contact(
        self,
        organization_id: UUID,
        whatsapp_id: str,
        contacts_info: list,
    ) -> Contact:
        """Find existing contact or create new one"""
        from app.models.contact import Contact
        
        # Find existing
        stmt = select(Contact).where(
            and_(
                Contact.organization_id == organization_id,
                Contact.whatsapp_id == whatsapp_id,
                Contact.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        contact = result.scalar_one_or_none()
        
        if contact:
            # Update profile name if available
            if contacts_info:
                profile_name = contacts_info[0].get("profile", {}).get("name")
                if profile_name and profile_name != contact.whatsapp_name:
                    contact.whatsapp_name = profile_name
            return contact
        
        # Create new contact
        profile_name = None
        if contacts_info:
            profile_name = contacts_info[0].get("profile", {}).get("name")
        
        contact = Contact(
            organization_id=organization_id,
            whatsapp_id=whatsapp_id,
            whatsapp_name=profile_name,
            name=profile_name,
            source="whatsapp_inbound",
        )
        self.db.add(contact)
        await self.db.flush()
        
        logger.info(f"✅ Created new contact: {contact.id} ({whatsapp_id})")
        return contact

    async def _find_or_create_conversation(
        self,
        organization_id: UUID,
        contact_id: UUID,
        whatsapp_number_id: UUID,
    ) -> Conversation:
        """Find existing open conversation or create new one"""
        from app.models.conversation import Conversation
        
        # Find open conversation with this contact
        stmt = select(Conversation).where(
            and_(
                Conversation.organization_id == organization_id,
                Conversation.contact_id == contact_id,
                Conversation.whatsapp_number_id == whatsapp_number_id,
                Conversation.status.in_(["open", "pending"]),
                Conversation.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        conversation = result.scalar_one_or_none()
        
        if conversation:
            return conversation
        
        # Create new conversation
        conversation = Conversation(
            organization_id=organization_id,
            contact_id=contact_id,
            whatsapp_number_id=whatsapp_number_id,
            status="open",
            channel="whatsapp",
            priority="medium",
            total_messages=0,
            unread_count=0,
        )
        self.db.add(conversation)
        await self.db.flush()
        
        logger.info(f"✅ Created new conversation: {conversation.id}")
        return conversation

    def _extract_message_content(
        self,
        message: Dict[str, Any],
        message_type: str,
    ) -> Dict[str, Any]:
        """Extract content based on message type"""
        if message_type == "text":
            return {"text": message.get("text", {}).get("body", "")}
        
        elif message_type == "image":
            img = message.get("image", {})
            return {
                "image": {
                    "id": img.get("id"),
                    "caption": img.get("caption"),
                    "mime_type": img.get("mime_type"),
                }
            }
        
        elif message_type == "video":
            vid = message.get("video", {})
            return {
                "video": {
                    "id": vid.get("id"),
                    "caption": vid.get("caption"),
                    "mime_type": vid.get("mime_type"),
                }
            }
        
        elif message_type == "audio":
            aud = message.get("audio", {})
            return {
                "audio": {
                    "id": aud.get("id"),
                    "mime_type": aud.get("mime_type"),
                }
            }
        
        elif message_type == "document":
            doc = message.get("document", {})
            return {
                "document": {
                    "id": doc.get("id"),
                    "filename": doc.get("filename"),
                    "caption": doc.get("caption"),
                    "mime_type": doc.get("mime_type"),
                }
            }
        
        elif message_type == "location":
            loc = message.get("location", {})
            return {
                "location": {
                    "latitude": loc.get("latitude"),
                    "longitude": loc.get("longitude"),
                    "name": loc.get("name"),
                    "address": loc.get("address"),
                }
            }
        
        elif message_type == "contacts":
            return {"contacts": message.get("contacts", [])}
        
        elif message_type == "interactive":
            inter = message.get("interactive", {})
            return {
                "interactive": {
                    "type": inter.get("type"),
                    "button_reply": inter.get("button_reply"),
                    "list_reply": inter.get("list_reply"),
                }
            }
        
        elif message_type == "button":
            btn = message.get("button", {})
            return {
                "button": {
                    "text": btn.get("text"),
                    "payload": btn.get("payload"),
                }
            }
        
        elif message_type == "sticker":
            stk = message.get("sticker", {})
            return {
                "sticker": {
                    "id": stk.get("id"),
                    "animated": stk.get("animated"),
                }
            }
        
        else:
            # Unknown type - store raw
            return {"raw": message}

    async def _broadcast_new_message(
        self,
        message: Message,
        conversation: Any,
        contact: Any,
        organization_id: UUID,
    ) -> None:
        """Broadcast new message event via WebSocket"""
        try:
            from app.core.websocket_manager import websocket_manager
            
            payload = {
                "message_id": str(message.id),
                "conversation_id": str(conversation.id),
                "contact_id": str(contact.id),
                "contact_name": contact.name or contact.whatsapp_name or contact.whatsapp_id,
                "message_type": message.message_type,
                "content": message.content,
                "direction": message.direction,
                "timestamp": message.created_at.isoformat() if message.created_at else None,
            }
            
            # Broadcast to organization room
            await websocket_manager.broadcast_to_room(
                room=f"org:{organization_id}",
                message=payload,
                event="message:new",
            )
            
            # Broadcast to conversation room
            await websocket_manager.broadcast_to_room(
                room=f"conversation:{conversation.id}",
                message=payload,
                event="message:new",
            )
            
            logger.info(f"📡 Broadcasted new message to org:{organization_id}")
            
        except ImportError:
            logger.warning("⚠️ WebSocket manager not available")
        except Exception as e:
            logger.error(f"❌ Error broadcasting new message: {e}")
