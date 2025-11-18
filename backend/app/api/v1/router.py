"""
API v1 Router
Combines all v1 endpoints
"""

from fastapi import APIRouter, Request, Query, HTTPException
from fastapi.responses import PlainTextResponse

# Lazy imports at the end of file to avoid circular dependencies
# Individual modules are imported directly by filename (not as package)
import importlib.util
import sys
from pathlib import Path

def _load_endpoint_module(module_name: str):
    """Load endpoint module dynamically to avoid circular imports"""
    endpoints_dir = Path(__file__).parent / "endpoints"
    module_path = endpoints_dir / f"{module_name}.py"
    
    spec = importlib.util.spec_from_file_location(f"app.api.v1.endpoints.{module_name}", module_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[f"app.api.v1.endpoints.{module_name}"] = module
    spec.loader.exec_module(module)
    return module

api_router = APIRouter()

# ============= PUBLIC WEBHOOKS (NO AUTH REQUIRED) =============
# These endpoints must be public for external services to call them

@api_router.get("/health", tags=["Health"])
async def health_check():
    """Simple health check endpoint returning 200 OK.
    Used by container healthcheck to avoid 400 responses on /docs.
    """
    return {"status": "ok"}

@api_router.get("/whatsapp/webhook", response_class=PlainTextResponse, include_in_schema=True)
async def whatsapp_webhook_verify(
    mode: str = Query(None, alias="hub.mode"),
    token: str = Query(None, alias="hub.verify_token"),
    challenge: str = Query(None, alias="hub.challenge"),
):
    """
    PUBLIC WEBHOOK: Meta WhatsApp verification endpoint
    """
    if not mode or not token or not challenge:
        raise HTTPException(status_code=400, detail="Missing parameters")

    if mode != "subscribe":
        raise HTTPException(status_code=403, detail="Invalid mode")

    # Verify token
    from app.core.database import async_session
    from sqlalchemy import select
    from app.models.whatsapp_number import WhatsAppNumber

    async with async_session() as db:
        stmt = select(WhatsAppNumber).where(
            WhatsAppNumber.webhook_verify_token == token,
            WhatsAppNumber.deleted_at.is_(None),
        )
        result = await db.execute(stmt)
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Invalid token")

    return challenge


@api_router.post("/whatsapp/webhook", include_in_schema=True)
async def whatsapp_webhook_receive(request: Request):
    """
    PUBLIC WEBHOOK: Meta WhatsApp message endpoint

    Security: Verifies X-Hub-Signature-256 header to ensure request is from Meta
    """
    from app.core.database import async_session
    from app.services.whatsapp_service import WhatsAppService
    from app.core.security import verify_whatsapp_signature
    from app.models.whatsapp_number import WhatsAppNumber
    import logging

    logger = logging.getLogger(__name__)

    # Get raw body for signature verification
    raw_body = await request.body()

    # Get signature from header
    signature = request.headers.get("X-Hub-Signature-256")

    if not signature:
        logger.warning("Webhook received without signature header")
        raise HTTPException(
            status_code=403,
            detail="Missing X-Hub-Signature-256 header"
        )

    # Parse JSON body
    try:
        body = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse webhook body: {e}")
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON payload"
        )

    # Extract phone_number_id to find which WhatsApp number this webhook is for
    phone_number_id = None
    try:
        entries = body.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                metadata = value.get("metadata", {})
                phone_number_id = metadata.get("phone_number_id")
                if phone_number_id:
                    break
            if phone_number_id:
                break
    except Exception as e:
        logger.error(f"Failed to extract phone_number_id: {e}")

    if not phone_number_id:
        logger.warning("No phone_number_id found in webhook payload")
        raise HTTPException(
            status_code=400,
            detail="Invalid webhook payload: missing phone_number_id"
        )

    # Get WhatsApp number and app_secret from database
    async with async_session() as db:
        from sqlalchemy import select

        stmt = select(WhatsAppNumber).where(
            WhatsAppNumber.phone_number_id == phone_number_id
        )
        result = await db.execute(stmt)
        whatsapp_number = result.scalar_one_or_none()

        if not whatsapp_number:
            logger.warning(f"WhatsApp number not found for phone_number_id: {phone_number_id}")
            raise HTTPException(
                status_code=404,
                detail="WhatsApp number not found"
            )

        # Verify signature if app_secret is configured
        if whatsapp_number.app_secret:
            is_valid = verify_whatsapp_signature(
                payload=raw_body,
                signature=signature,
                app_secret=whatsapp_number.app_secret
            )

            if not is_valid:
                logger.error(f"Invalid webhook signature for phone_number_id: {phone_number_id}")
                raise HTTPException(
                    status_code=403,
                    detail="Invalid webhook signature"
                )

            logger.info(f"✅ Webhook signature verified for {whatsapp_number.phone_number}")
        else:
            logger.warning(
                f"⚠️ Webhook signature verification skipped - "
                f"no app_secret configured for {whatsapp_number.phone_number}"
            )

        # Process webhook
        service = WhatsAppService(db)
        await service.process_webhook(body)

    return {"status": "ok"}


# Include all endpoint routers using lazy loading
auth = _load_endpoint_module("auth")
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

organizations = _load_endpoint_module("organizations")
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])

users = _load_endpoint_module("users")
api_router.include_router(users.router, prefix="/users", tags=["Users"])

contacts = _load_endpoint_module("contacts")
api_router.include_router(contacts.router, prefix="/contacts", tags=["Contacts"])

conversations = _load_endpoint_module("conversations")
api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"])

queue = _load_endpoint_module("queue")
api_router.include_router(queue.router, prefix="/queue", tags=["Queue"])

queues = _load_endpoint_module("queues")
api_router.include_router(queues.router, prefix="/queues", tags=["Queues"])

departments = _load_endpoint_module("departments")
api_router.include_router(departments.router, prefix="/departments", tags=["Departments"])

whatsapp = _load_endpoint_module("whatsapp")
api_router.include_router(whatsapp.router, prefix="/whatsapp", tags=["WhatsApp"])

chatbots = _load_endpoint_module("chatbots")
api_router.include_router(chatbots.router, prefix="/chatbots", tags=["Chatbots"])

campaigns = _load_endpoint_module("campaigns")
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["Campaigns"])

analytics = _load_endpoint_module("analytics")
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

flow_automations = _load_endpoint_module("flow_automations")
api_router.include_router(flow_automations.router, prefix="/flow-automations", tags=["Flow Automations"])

secrets = _load_endpoint_module("secrets")
api_router.include_router(secrets.router, prefix="/secrets", tags=["Secrets"])

database = _load_endpoint_module("database")
api_router.include_router(database.router, prefix="/database", tags=["Database"])

ai_assistant = _load_endpoint_module("ai_assistant")
api_router.include_router(ai_assistant.router, prefix="/ai-assistant", tags=["AI Assistant"])

agent_skills = _load_endpoint_module("agent_skills")
api_router.include_router(agent_skills.router, tags=["Users", "Agent Skills"])

websocket = _load_endpoint_module("websocket")
api_router.include_router(websocket.router, tags=["WebSocket"])

debug = _load_endpoint_module("debug")
api_router.include_router(debug.router, prefix="/debug", tags=["Debug"])

# Webhooks (public endpoints)
from app.api.webhooks import meta as webhooks_meta
api_router.include_router(webhooks_meta.router, prefix="/webhooks/meta", tags=["Webhooks"])

# Future routers will be added here:
# api_router.include_router(chatbots.router, prefix="/chatbots", tags=["Chatbots"])
# api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"])
# api_router.include_router(contacts.router, prefix="/contacts", tags=["Contacts"])
# api_router.include_router(campaigns.router, prefix="/campaigns", tags=["Campaigns"])
# api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])
