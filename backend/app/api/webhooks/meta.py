"""
Meta Cloud API Webhook Handler

Receives and processes webhooks from Meta Cloud API for WhatsApp Business.
Handles message status updates (sent, delivered, read, failed).

Webhook Flow:
1. Verify signature (HMAC SHA256)
2. Parse event type
3. Process message_status events
4. Update campaign stats
5. Broadcast via WebSocket

Meta Webhook Events:
- messages: New incoming messages
- message_status: Status updates (sent, delivered, read, failed)
- message_template_status_update: Template approval status
"""

import logging
import hmac
import hashlib
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, Request, Response, HTTPException, Query, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.core.config import settings
from app.services.webhook_service import WebhookService

router = APIRouter()
logger = logging.getLogger(__name__)


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify Meta webhook signature using HMAC SHA256
    
    Args:
        payload: Raw request body
        signature: X-Hub-Signature-256 header value (format: "sha256=...")
        secret: App secret from Meta dashboard
        
    Returns:
        True if signature is valid
    """
    if not signature or not signature.startswith("sha256="):
        return False
    
    expected_signature = signature.split("sha256=")[1]
    
    # Calculate HMAC
    hmac_obj = hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha256
    )
    calculated_signature = hmac_obj.hexdigest()
    
    # Constant-time comparison
    return hmac.compare_digest(calculated_signature, expected_signature)


@router.get("/verify")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    """
    Webhook verification endpoint for Meta Cloud API
    
    Meta sends GET request with:
    - hub.mode=subscribe
    - hub.challenge=random_string
    - hub.verify_token=your_verify_token
    
    Response: Echo back hub.challenge if verify_token matches
    """
    logger.info(f"📥 Webhook verification request: mode={hub_mode}")
    
    # Verify token matches
    if hub_verify_token != settings.META_WEBHOOK_VERIFY_TOKEN:
        logger.error("❌ Invalid verify token")
        raise HTTPException(status_code=403, detail="Invalid verify token")
    
    # Verify mode is subscribe
    if hub_mode != "subscribe":
        logger.error(f"❌ Invalid mode: {hub_mode}")
        raise HTTPException(status_code=400, detail="Invalid mode")
    
    # Return challenge
    logger.info(f"✅ Webhook verified successfully")
    return Response(content=hub_challenge, media_type="text/plain")


@router.post("/")
async def receive_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
):
    """
    Receive webhook events from Meta Cloud API
    
    Events processed:
    - message_status: sent, delivered, read, failed
    - messages: incoming messages (future)
    
    Security:
    - Verifies HMAC SHA256 signature
    - Validates request structure
    """
    # Read raw body for signature verification
    body = await request.body()
    
    # Verify signature if configured
    if settings.META_WEBHOOK_SECRET:
        if not x_hub_signature_256:
            logger.error("❌ Missing X-Hub-Signature-256 header")
            raise HTTPException(status_code=401, detail="Missing signature")
        
        if not verify_webhook_signature(
            body,
            x_hub_signature_256,
            settings.META_WEBHOOK_SECRET
        ):
            logger.error("❌ Invalid webhook signature")
            raise HTTPException(status_code=403, detail="Invalid signature")
    
    # Parse JSON
    try:
        data = await request.json()
    except Exception as e:
        logger.error(f"❌ Invalid JSON payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    logger.info(f"📥 Webhook received: {data.get('object', 'unknown')}")
    
    # Validate object type
    if data.get("object") != "whatsapp_business_account":
        logger.warning(f"⚠️ Unexpected object type: {data.get('object')}")
        return {"status": "ignored"}
    
    # Process entries
    async with async_session() as db:
        webhook_service = WebhookService(db)
        
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                field = change.get("field")
                value = change.get("value", {})
                
                if field == "messages":
                    # Get metadata for identifying WhatsApp number
                    msg_metadata = value.get("metadata", {})
                    contacts_info = value.get("contacts", [])
                    
                    # Process message status updates
                    statuses = value.get("statuses", [])
                    for status in statuses:
                        try:
                            await webhook_service.process_message_status(status)
                        except Exception as e:
                            logger.error(f"❌ Error processing status: {e}")
                            # Continue processing other statuses
                    
                    # Process incoming messages
                    messages = value.get("messages", [])
                    for message in messages:
                        try:
                            await webhook_service.process_incoming_message(
                                message=message,
                                metadata=msg_metadata,
                                contacts=contacts_info,
                            )
                        except Exception as e:
                            logger.error(f"❌ Error processing incoming message: {e}")
                
                elif field == "message_template_status_update":
                    # Template status update (future)
                    logger.info(f"📋 Template status update: {value}")
                
                else:
                    logger.warning(f"⚠️ Unknown field: {field}")
    
    # Return 200 OK to acknowledge receipt
    return {"status": "ok"}


@router.post("/test")
async def test_webhook(payload: Dict[str, Any]):
    """
    Test endpoint for webhook processing without signature verification
    
    Usage:
    POST /webhooks/meta/test
    {
      "object": "whatsapp_business_account",
      "entry": [{
        "changes": [{
          "field": "messages",
          "value": {
            "statuses": [{
              "id": "wamid.xxx",
              "status": "delivered",
              "timestamp": "1234567890",
              "recipient_id": "5511999999999"
            }]
          }
        }]
      }]
    }
    """
    logger.info(f"🧪 Test webhook: {payload}")
    
    async with async_session() as db:
        webhook_service = WebhookService(db)
        
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                statuses = value.get("statuses", [])
                
                for status in statuses:
                    await webhook_service.process_message_status(status)
    
    return {"status": "processed"}
