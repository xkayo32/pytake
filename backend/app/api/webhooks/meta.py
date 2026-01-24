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
    - Verifies HMAC SHA256 signature using phone number's webhook_verify_token
    - Falls back to META_WEBHOOK_SECRET from .env if not found in database
    """
    # Read raw body for signature verification
    body = await request.body()
    
    # Parse JSON first to extract phone_number_id
    try:
        data = await request.json()
    except Exception as e:
        logger.error(f"❌ Invalid JSON payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    # Extract phone_number_id from webhook payload
    phone_number_id = None
    for entry in data.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            metadata = value.get("metadata", {})
            if metadata.get("phone_number_id"):
                phone_number_id = metadata.get("phone_number_id")
                break
        if phone_number_id:
            break
    
    # Verify signature using phone number's token or global secret
    webhook_secret = None
    
    if phone_number_id:
        # Try to get app_secret from database
        async with async_session() as db:
            from app.repositories.whatsapp import WhatsAppNumberRepository
            from app.core.security import decrypt_string
            whatsapp_repo = WhatsAppNumberRepository(db)
            whatsapp_number = await whatsapp_repo.get_by_phone_number_id(phone_number_id)
            
            if whatsapp_number and whatsapp_number.app_secret:
                # Decrypt app_secret if it's encrypted
                try:
                    webhook_secret = decrypt_string(whatsapp_number.app_secret)
                    logger.info(f"🔐 Using decrypted app_secret from database for phone {phone_number_id}")
                except:
                    # If decryption fails, use as plain text
                    webhook_secret = whatsapp_number.app_secret
                    logger.info(f"🔐 Using plain app_secret from database for phone {phone_number_id}")
    
    # Fallback to global secret from .env
    if not webhook_secret and settings.META_WEBHOOK_SECRET:
        webhook_secret = settings.META_WEBHOOK_SECRET
        logger.info("🔐 Using global META_WEBHOOK_SECRET from .env")
    
    # Verify signature if secret is configured
    if webhook_secret:
        if not x_hub_signature_256:
            logger.error("❌ Missing X-Hub-Signature-256 header")
            raise HTTPException(status_code=401, detail="Missing signature")
        
        if not verify_webhook_signature(body, x_hub_signature_256, webhook_secret):
            logger.error("❌ Invalid webhook signature")
            raise HTTPException(status_code=403, detail="Invalid signature")
        
        logger.info("✅ Webhook signature verified successfully")
    else:
        logger.warning("⚠️ No webhook secret configured - signature verification skipped")
    
    print(f"🔔 WEBHOOK RECEIVED: {data.get('object', 'unknown')}")
    logger.info(f"📥 Webhook received: {data.get('object', 'unknown')}")
    
    # Validate object type
    if data.get("object") != "whatsapp_business_account":
        print(f"❌ INVALID OBJECT TYPE: {data.get('object')}")
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
                    # Extract metadata for phone_number_id
                    metadata = value.get("metadata", {})
                    
                    # Process message status updates
                    statuses = value.get("statuses", [])
                    for status in statuses:
                        try:
                            await webhook_service.process_message_status(status)
                        except Exception as e:
                            logger.error(f"❌ Error processing status: {e}")
                            # Continue processing other statuses
                    
                    # Process incoming messages (create conversation and trigger flow)
                    messages = value.get("messages", [])
                    for message in messages:
                        try:
                            await webhook_service.process_customer_message_for_window(
                                message=message,
                                metadata=metadata
                            )
                        except Exception as e:
                            logger.error(f"❌ Error processing customer message: {e}")
                            # Continue processing other messages
                
                elif field == "message_template_status_update":
                    # Process template status updates (APPROVED, REJECTED, QUALITY_CHANGE, PAUSED, DISABLED)
                    templates = value.get("message_templates", [])
                    
                    for template_update in templates:
                        try:
                            # Extract WABA ID from entry if available, otherwise try to derive it
                            waba_id = entry.get("id") or value.get("waba_id")
                            
                            if not waba_id:
                                logger.warning(
                                    f"⚠️ Missing WABA ID in template status update: {template_update}"
                                )
                                continue
                            
                            await webhook_service.process_template_status_update(
                                waba_id=waba_id,
                                webhook_data=template_update
                            )
                        except Exception as e:
                            logger.error(
                                f"❌ Error processing template status: {e}",
                                exc_info=True
                            )
                            # Continue processing other templates
                
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
