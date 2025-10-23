"""
Campaign Retry Logic - Advanced retry tracking and exponential backoff

Provides sophisticated retry mechanisms for campaign message sending with:
- Detailed error tracking per contact
- Real-time status updates
- Configurable exponential backoff
- Retry history preservation
"""

import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.whatsapp_number import WhatsAppNumber
from app.models.conversation import Message
from app.integrations.meta_api import MetaCloudAPI, MetaAPIError
from app.integrations.evolution_api import EvolutionAPI

logger = logging.getLogger(__name__)


class CampaignRetryManager:
    """
    Manages retry logic and error tracking for campaign messages
    
    Features:
    - Exponential backoff with configurable parameters
    - Detailed error logging per contact
    - Message status tracking (pending -> sent -> delivered -> read)
    - Automatic retry based on campaign settings
    """
    
    def __init__(self, campaign: Campaign, db: AsyncSession):
        self.campaign = campaign
        self.db = db
        
        # Ensure JSONB fields are initialized
        if self.campaign.errors is None:
            self.campaign.errors = []
        if self.campaign.message_statuses is None:
            self.campaign.message_statuses = {}
    
    def calculate_retry_delay(self, attempt: int) -> float:
        """
        Calculate delay for retry attempt using exponential backoff
        
        Formula: delay = min(base_delay * (2 ** attempt), max_delay)
        
        Args:
            attempt: Current retry attempt (0-indexed)
            
        Returns:
            Delay in seconds
        """
        delay = self.campaign.retry_base_delay * (2 ** attempt)
        return min(delay, self.campaign.retry_max_delay)
    
    def get_contact_status(self, contact_id: UUID) -> Optional[Dict[str, Any]]:
        """
        Get current status for a contact
        
        Returns:
            Status dict or None if not found
        """
        contact_id_str = str(contact_id)
        return self.campaign.message_statuses.get(contact_id_str)
    
    def get_contact_attempts(self, contact_id: UUID) -> int:
        """
        Get number of attempts for a contact
        
        Returns:
            Number of attempts (0 if no attempts yet)
        """
        status = self.get_contact_status(contact_id)
        if status:
            return len(status.get("attempts", []))
        return 0
    
    def can_retry(self, contact_id: UUID) -> bool:
        """
        Check if contact can be retried
        
        Returns:
            True if retry is allowed, False otherwise
        """
        attempts = self.get_contact_attempts(contact_id)
        return attempts < self.campaign.retry_max_attempts
    
    async def record_attempt(
        self,
        contact: Contact,
        attempt: int,
        success: bool,
        error: Optional[str] = None,
        message_id: Optional[str] = None,
    ) -> None:
        """
        Record a message sending attempt
        
        Args:
            contact: Contact that was targeted
            attempt: Attempt number (0-indexed)
            success: Whether the attempt succeeded
            error: Error message if failed
            message_id: WhatsApp message ID if successful
        """
        contact_id_str = str(contact.id)
        timestamp = datetime.utcnow().isoformat()
        
        # Initialize status if not exists
        if contact_id_str not in self.campaign.message_statuses:
            self.campaign.message_statuses[contact_id_str] = {
                "contact_id": contact_id_str,
                "contact_name": contact.name,
                "contact_phone": contact.whatsapp_id,
                "status": "pending",
                "message_id": None,
                "attempts": [],
                "created_at": timestamp,
                "last_update": timestamp,
            }
        
        # Update status
        status = self.campaign.message_statuses[contact_id_str]
        
        # Add attempt to history
        attempt_record = {
            "attempt": attempt,
            "timestamp": timestamp,
            "success": success,
            "error": error,
            "message_id": message_id,
        }
        status["attempts"].append(attempt_record)
        status["last_update"] = timestamp
        
        if success:
            status["status"] = "sent"
            status["message_id"] = message_id
        else:
            status["status"] = "failed" if attempt >= self.campaign.retry_max_attempts - 1 else "retrying"
            
            # Also add to errors array for backward compatibility
            self.campaign.errors.append({
                "contact_id": contact_id_str,
                "contact_name": contact.name,
                "contact_phone": contact.whatsapp_id,
                "attempt": attempt,
                "error": error,
                "timestamp": timestamp,
            })
            
            # Update campaign error counters
            self.campaign.error_count += 1
            self.campaign.last_error_message = error
        
        # Mark as modified to trigger JSONB update
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(self.campaign, "message_statuses")
        flag_modified(self.campaign, "errors")
        
        await self.db.commit()
    
    async def send_message_with_retry(
        self,
        contact: Contact,
        whatsapp_number: WhatsAppNumber,
    ) -> Tuple[bool, Optional[str]]:
        """
        Send message with automatic retry logic
        
        Args:
            contact: Contact to send message to
            whatsapp_number: WhatsApp number to send from
            
        Returns:
            Tuple of (success, message_id)
        """
        attempts = self.get_contact_attempts(contact.id)
        
        while attempts < self.campaign.retry_max_attempts:
            try:
                # Send message
                success, message_id, error = await self._send_single_message(
                    contact=contact,
                    whatsapp_number=whatsapp_number,
                )
                
                # Record attempt
                await self.record_attempt(
                    contact=contact,
                    attempt=attempts,
                    success=success,
                    error=error,
                    message_id=message_id,
                )
                
                if success:
                    logger.info(
                        f"✅ Sent message to {contact.whatsapp_id} "
                        f"on attempt {attempts + 1}"
                    )
                    return True, message_id
                
                # Failed - check if we should retry
                attempts += 1
                
                if attempts < self.campaign.retry_max_attempts:
                    # Calculate delay and wait
                    delay = self.calculate_retry_delay(attempts)
                    logger.warning(
                        f"⚠️ Attempt {attempts} failed for {contact.whatsapp_id}. "
                        f"Retrying in {delay}s... (Error: {error})"
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"❌ All {attempts} attempts failed for {contact.whatsapp_id}"
                    )
                    return False, None
                    
            except Exception as e:
                error_msg = str(e)
                logger.error(
                    f"❌ Exception on attempt {attempts + 1} "
                    f"for {contact.whatsapp_id}: {error_msg}"
                )
                
                # Record failed attempt
                await self.record_attempt(
                    contact=contact,
                    attempt=attempts,
                    success=False,
                    error=error_msg,
                )
                
                attempts += 1
                
                if attempts < self.campaign.retry_max_attempts:
                    delay = self.calculate_retry_delay(attempts)
                    await asyncio.sleep(delay)
                else:
                    return False, None
        
        return False, None
    
    async def _send_single_message(
        self,
        contact: Contact,
        whatsapp_number: WhatsAppNumber,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Send a single message without retry
        
        Returns:
            Tuple of (success, message_id, error)
        """
        try:
            # Prepare message content
            if self.campaign.message_type == "text":
                message_text = self.campaign.message_content.get("text", "")
                
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
                    organization_id=self.campaign.organization_id,
                    contact_id=contact.id,
                    whatsapp_number_id=whatsapp_number.id,
                    direction="outbound",
                    content_type="text",
                    content={"text": message_text},
                    status="sent",
                    whatsapp_message_id=message_id,
                    metadata={
                        "campaign_id": str(self.campaign.id),
                        "campaign_name": self.campaign.name,
                    },
                )
                self.db.add(message)
                await self.db.commit()
                
                return True, message_id, None
                
            else:
                error = f"Unsupported message type: {self.campaign.message_type}"
                return False, None, error
                
        except MetaAPIError as e:
            error = f"Meta API error: {e.message} (code: {e.error_code})"
            return False, None, error
            
        except Exception as e:
            error = str(e)
            return False, None, error
    
    async def update_message_status(
        self,
        contact_id: UUID,
        new_status: str,
        message_id: Optional[str] = None,
    ) -> None:
        """
        Update message status (called by webhook handlers)
        
        Args:
            contact_id: Contact ID
            new_status: New status (sent, delivered, read, failed)
            message_id: WhatsApp message ID
        """
        contact_id_str = str(contact_id)
        
        if contact_id_str in self.campaign.message_statuses:
            status = self.campaign.message_statuses[contact_id_str]
            status["status"] = new_status
            status["last_update"] = datetime.utcnow().isoformat()
            
            if message_id:
                status["message_id"] = message_id
            
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(self.campaign, "message_statuses")
            
            await self.db.commit()
            
            logger.info(
                f"📝 Updated status for contact {contact_id_str}: {new_status}"
            )
    
    def get_retry_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about retries in this campaign
        
        Returns:
            Dict with retry statistics
        """
        total_contacts = len(self.campaign.message_statuses)
        
        statuses = {
            "pending": 0,
            "sent": 0,
            "delivered": 0,
            "read": 0,
            "retrying": 0,
            "failed": 0,
        }
        
        total_attempts = 0
        successful_on_first = 0
        required_retries = 0
        
        for contact_status in self.campaign.message_statuses.values():
            status = contact_status.get("status", "pending")
            statuses[status] = statuses.get(status, 0) + 1
            
            attempts = len(contact_status.get("attempts", []))
            total_attempts += attempts
            
            if status == "sent" and attempts == 1:
                successful_on_first += 1
            elif status == "sent" and attempts > 1:
                required_retries += 1
        
        avg_attempts = total_attempts / total_contacts if total_contacts > 0 else 0
        
        return {
            "total_contacts": total_contacts,
            "statuses": statuses,
            "total_attempts": total_attempts,
            "avg_attempts_per_contact": round(avg_attempts, 2),
            "successful_on_first_attempt": successful_on_first,
            "required_retries": required_retries,
            "retry_rate": round(required_retries / total_contacts * 100, 2) if total_contacts > 0 else 0,
        }
