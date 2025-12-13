"""
MessageSenderService - Sends messages to WhatsApp via Meta Cloud API.

Responsibilities:
- Format messages for WhatsApp API (text, buttons, media)
- Send messages via Meta Cloud API
- Track message delivery status
- Implement rate limiting
- Handle retries for failed sends

Author: Kayo Carvalho Fernandes
"""

import logging
import asyncio
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger(__name__)


class MessageSenderService:
    """Handles message sending to WhatsApp through Meta Cloud API."""

    # Rate limiting: 5 messages per minute per organization
    RATE_LIMIT_MESSAGES = 5
    RATE_LIMIT_WINDOW = 60  # seconds

    # Retry configuration
    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds (exponential backoff: 2s, 4s, 8s)

    def __init__(self, db: AsyncSession):
        """Initialize message sender.
        
        Args:
            db: SQLAlchemy AsyncSession
        """
        self.db = db
        self.rate_limit_cache = {}  # {org_id: [timestamp, timestamp, ...]}

    async def send_text_message(
        self,
        organization_id: UUID,
        phone_number_id: str,
        recipient_phone: str,
        text: str,
        access_token: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Send text message via WhatsApp Cloud API.
        
        Args:
            organization_id: Organization UUID
            phone_number_id: WhatsApp Business Phone Number ID
            recipient_phone: Recipient WhatsApp phone number
            text: Message text (max 4096 chars)
            access_token: Meta access token
            metadata: Additional context to track
            
        Returns:
            Dict with keys:
            - success: bool
            - message_id: str (if successful)
            - error: str (if failed)
            - timestamp: datetime
        """
        # 1. Check rate limit
        if not await self._check_rate_limit(organization_id):
            return {
                "success": False,
                "error": "Rate limit exceeded (5 msgs/min)",
                "timestamp": datetime.utcnow(),
            }

        # 2. Format message payload
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient_phone,
            "type": "text",
            "text": {"body": text},
        }

        # 3. Send with retries
        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                result = await self._send_via_api(
                    phone_number_id=phone_number_id,
                    payload=payload,
                    access_token=access_token,
                )

                if result["success"]:
                    logger.info(
                        f"Message sent to {recipient_phone}: {result['message_id']}"
                    )
                    return {
                        "success": True,
                        "message_id": result["message_id"],
                        "timestamp": datetime.utcnow(),
                    }
                else:
                    logger.warning(
                        f"API error (attempt {attempt}/{self.MAX_RETRIES}): {result['error']}"
                    )

                    if attempt < self.MAX_RETRIES:
                        wait_time = self.RETRY_DELAY ** attempt
                        await asyncio.sleep(wait_time)

            except Exception as e:
                logger.error(f"Send error (attempt {attempt}/{self.MAX_RETRIES}): {e}")

                if attempt < self.MAX_RETRIES:
                    wait_time = self.RETRY_DELAY ** attempt
                    await asyncio.sleep(wait_time)

        # All retries failed
        return {
            "success": False,
            "error": "Failed to send after 3 retries",
            "timestamp": datetime.utcnow(),
        }

    async def send_message_with_buttons(
        self,
        organization_id: UUID,
        phone_number_id: str,
        recipient_phone: str,
        text: str,
        buttons: List[Dict[str, str]],
        access_token: str,
    ) -> Dict[str, Any]:
        """Send message with interactive buttons.
        
        Args:
            organization_id: Organization UUID
            phone_number_id: WhatsApp Business Phone Number ID
            recipient_phone: Recipient phone
            text: Message text
            buttons: List of buttons (max 3)
                [{
                    "type": "reply",
                    "reply": {
                        "id": "btn_1",
                        "title": "Opção 1"
                    }
                }]
            access_token: Meta access token
            
        Returns:
            Send result dict
        """
        if len(buttons) > 3:
            return {
                "success": False,
                "error": "Maximum 3 buttons allowed",
                "timestamp": datetime.utcnow(),
            }

        # Check rate limit
        if not await self._check_rate_limit(organization_id):
            return {
                "success": False,
                "error": "Rate limit exceeded",
                "timestamp": datetime.utcnow(),
            }

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient_phone,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": text},
                "action": {"buttons": buttons},
            },
        }

        result = await self._send_via_api(
            phone_number_id=phone_number_id,
            payload=payload,
            access_token=access_token,
        )

        if result["success"]:
            logger.info(f"Interactive message sent to {recipient_phone}")

        return result

    async def send_template_message(
        self,
        organization_id: UUID,
        phone_number_id: str,
        recipient_phone: str,
        template_name: str,
        template_language: str = "pt_BR",
        parameters: Optional[List[Dict[str, str]]] = None,
        access_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send pre-approved WhatsApp template message.
        
        Args:
            organization_id: Organization UUID
            phone_number_id: WhatsApp Business Phone Number ID
            recipient_phone: Recipient phone
            template_name: Template name (e.g., "order_confirmation")
            template_language: Template language code
            parameters: Template variables
            access_token: Meta access token
            
        Returns:
            Send result dict
        """
        if not await self._check_rate_limit(organization_id):
            return {
                "success": False,
                "error": "Rate limit exceeded",
                "timestamp": datetime.utcnow(),
            }

        payload = {
            "messaging_product": "whatsapp",
            "to": recipient_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": template_language},
            },
        }

        if parameters:
            payload["template"]["components"] = [
                {
                    "type": "body",
                    "parameters": parameters,
                }
            ]

        result = await self._send_via_api(
            phone_number_id=phone_number_id,
            payload=payload,
            access_token=access_token,
        )

        return result

    # ============= Internal Methods =============

    async def _send_via_api(
        self,
        phone_number_id: str,
        payload: Dict[str, Any],
        access_token: str,
    ) -> Dict[str, Any]:
        """Send message via Meta Cloud API.
        
        Args:
            phone_number_id: WhatsApp Business Phone Number ID
            payload: Message payload
            access_token: Meta access token
            
        Returns:
            Dict with success bool and message_id or error
        """
        import aiohttp

        url = f"https://graph.instagram.com/v18.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url, json=payload, headers=headers, timeout=10
                ) as response:
                    data = await response.json()

                    if response.status == 200:
                        return {
                            "success": True,
                            "message_id": data.get("messages", [{}])[0].get("id"),
                        }
                    else:
                        error_msg = data.get("error", {}).get("message", "Unknown error")
                        return {
                            "success": False,
                            "error": error_msg,
                        }

        except Exception as e:
            logger.error(f"API request error: {e}")
            return {
                "success": False,
                "error": str(e),
            }

    async def _check_rate_limit(self, organization_id: UUID) -> bool:
        """Check if organization is within rate limit.
        
        Args:
            organization_id: Organization UUID
            
        Returns:
            True if can send, False if rate limited
        """
        org_id_str = str(organization_id)
        now = datetime.utcnow()

        if org_id_str not in self.rate_limit_cache:
            self.rate_limit_cache[org_id_str] = []

        # Remove old entries (older than 1 minute)
        cutoff = now - timedelta(seconds=self.RATE_LIMIT_WINDOW)
        self.rate_limit_cache[org_id_str] = [
            ts for ts in self.rate_limit_cache[org_id_str] if ts > cutoff
        ]

        # Check if within limit
        if len(self.rate_limit_cache[org_id_str]) < self.RATE_LIMIT_MESSAGES:
            self.rate_limit_cache[org_id_str].append(now)
            return True

        return False

    def get_rate_limit_status(self, organization_id: UUID) -> Dict[str, int]:
        """Get current rate limit status.
        
        Args:
            organization_id: Organization UUID
            
        Returns:
            Dict with keys:
            - remaining: int (messages remaining in window)
            - limit: int (total limit per window)
            - reset_in: int (seconds until window resets)
        """
        org_id_str = str(organization_id)
        cache = self.rate_limit_cache.get(org_id_str, [])

        if not cache:
            return {
                "remaining": self.RATE_LIMIT_MESSAGES,
                "limit": self.RATE_LIMIT_MESSAGES,
                "reset_in": 0,
            }

        oldest = min(cache)
        reset_time = oldest + timedelta(seconds=self.RATE_LIMIT_WINDOW)
        reset_in = max(0, int((reset_time - datetime.utcnow()).total_seconds()))

        return {
            "remaining": self.RATE_LIMIT_MESSAGES - len(cache),
            "limit": self.RATE_LIMIT_MESSAGES,
            "reset_in": reset_in,
        }
