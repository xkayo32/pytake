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

def _load_endpoint_module(module_name: str):
    """Load endpoint module dynamically to avoid circular imports"""
    import os
    
    # Get the directory of this file
    router_dir = os.path.dirname(os.path.abspath(__file__))
    endpoints_dir = os.path.join(router_dir, "endpoints")
    module_path = os.path.join(endpoints_dir, f"{module_name}.py")
    
    if not os.path.exists(module_path):
        raise FileNotFoundError(f"Endpoint module not found: {module_path}")
    
    spec = importlib.util.spec_from_file_location(f"app.api.v1.endpoints.{module_name}", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Failed to load spec for {module_name}")
    
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
            # Try to decrypt app_secret (it may be encrypted with Fernet)
            from app.core.security import decrypt_string
            try:
                decrypted_secret = decrypt_string(whatsapp_number.app_secret)
                logger.info("🔓 Using decrypted app_secret")
            except Exception:
                # If decryption fails, use as plain text
                decrypted_secret = whatsapp_number.app_secret
                logger.info("🔓 Using plain app_secret")
            
            is_valid = verify_whatsapp_signature(
                payload=raw_body,
                signature=signature,
                app_secret=decrypted_secret
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
        await service.process_webhook(body, whatsapp_number.id, whatsapp_number.organization_id)

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

whatsapp_analytics = _load_endpoint_module("whatsapp_analytics")
api_router.include_router(whatsapp_analytics.router, prefix="/whatsapp-analytics", tags=["WhatsApp Analytics"])

chatbots = _load_endpoint_module("chatbots")
api_router.include_router(chatbots.router, prefix="/chatbots", tags=["Chatbots"])

campaigns = _load_endpoint_module("campaigns")
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["Campaigns"])

analytics = _load_endpoint_module("analytics")
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

dashboard = _load_endpoint_module("dashboard")
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

flow_automations = _load_endpoint_module("flow_automations")
api_router.include_router(flow_automations.router, prefix="/flow-automations", tags=["Flow Automations"])

template_analytics = _load_endpoint_module("template_analytics")
api_router.include_router(template_analytics.router, prefix="/templates", tags=["Template Analytics"])

expenses = _load_endpoint_module("expenses")
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])

secrets = _load_endpoint_module("secrets")
api_router.include_router(secrets.router, prefix="/secrets", tags=["Secrets"])

saml = _load_endpoint_module("saml")
api_router.include_router(saml.router, prefix="", tags=["SAML"])

oidc = _load_endpoint_module("oidc")
api_router.include_router(oidc.router, prefix="", tags=["OIDC"])

mfa = _load_endpoint_module("mfa")
api_router.include_router(mfa.router, tags=["MFA"])

passkey = _load_endpoint_module("passkey")
api_router.include_router(passkey.router, tags=["Passwordless"])

social = _load_endpoint_module("social")
api_router.include_router(social.router, tags=["Social Login"])

database = _load_endpoint_module("database")
api_router.include_router(database.router, prefix="/database", tags=["Database"])

ai_assistant = _load_endpoint_module("ai_assistant")
api_router.include_router(ai_assistant.router, prefix="/ai-assistant", tags=["AI Assistant"])

agent_skills = _load_endpoint_module("agent_skills")
api_router.include_router(agent_skills.router, tags=["Users", "Agent Skills"])

alerts = _load_endpoint_module("alerts")
api_router.include_router(alerts.router, tags=["Alerts"])

alerts_dashboard = _load_endpoint_module("alerts_dashboard")
api_router.include_router(alerts_dashboard.router, tags=["Alerts Dashboard"])

alerts_search = _load_endpoint_module("alerts_search")
api_router.include_router(alerts_search.router, tags=["Alerts Search"])

conversation_windows = _load_endpoint_module("conversation_windows")
api_router.include_router(conversation_windows.router, tags=["Conversation Windows"])

websocket = _load_endpoint_module("websocket")
api_router.include_router(websocket.router, tags=["WebSocket"])

debug = _load_endpoint_module("debug")
api_router.include_router(debug.router, prefix="/debug", tags=["Debug"])

flows = _load_endpoint_module("flows")
api_router.include_router(flows.router, prefix="/flows", tags=["Flow Builder"])

rbac = _load_endpoint_module("rbac")
api_router.include_router(rbac.router, tags=["RBAC"])
api_router.include_router(rbac.permissions_router, tags=["RBAC"])

@api_router.get("/campaigns", tags=["Campaigns"])
async def list_campaigns(organization_id: str = Query(...)):
    """List campaigns for organization (mock data)"""
    return [
        {
            "id": "1",
            "name": "Welcome Campaign",
            "description": "Welcome new subscribers",
            "status": "active",
            "organization_id": organization_id,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }
    ]

# Webhooks (public endpoints)
from app.api.webhooks import meta as webhooks_meta
api_router.include_router(webhooks_meta.router, prefix="/webhooks/meta", tags=["Webhooks"])

# Auth endpoints (public - no auth required)
# auth = _load_endpoint_module("auth")
# api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Simple login endpoint for development
@api_router.post("/auth/login", tags=["Authentication"])
async def dev_login():
    """Development login endpoint"""
    return {
        "user": {
            "id": "12345678-1234-1234-1234-123456789012",
            "email": "test@example.com",
            "full_name": "Test User",
            "role": "org_admin",
            "organization_id": "5892e0e8-bf92-4e02-9bdc-0dabb3c8fc66",
            "is_active": True,
            "email_verified": True,
            "is_online": False,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        },
        "token": {
            "access_token": "mock_access_token_123",
            "refresh_token": "mock_refresh_token_456",
            "token_type": "bearer",
            "expires_in": 3600
        },
        "message": "Login successful (development)"
    }

# ============= DEVELOPMENT MOCK ENDPOINTS =============
# These are temporary mock endpoints for frontend development

@api_router.get("/dev/ai/conversations", tags=["AI Assistant"])
async def get_ai_conversations():
    """Mock endpoint to get AI conversations"""
    return [
        {
            "id": "1",
            "title": "Análise de Sentimento",
            "createdAt": "2024-01-20T10:00:00Z",
            "messages": 5,
        },
        {
            "id": "2",
            "title": "Classificação de Intenções",
            "createdAt": "2024-01-19T14:30:00Z",
            "messages": 3,
        }
    ]

@api_router.post("/dev/ai/chat", tags=["AI Assistant"])
async def chat_with_ai(message: dict):
    """Mock endpoint for AI chat"""
    return {
        "response": f"Recebi sua mensagem: '{message.get('content')}'. Como assistente IA, posso ajudar com análises, sugestões e muito mais.",
        "tokens": 45,
        "duration": 0.5
    }

@api_router.get("/dev/contacts", tags=["Contacts"])
async def get_contacts():
    """Mock endpoint to get contacts"""
    return [
        {
            "id": "1",
            "name": "João Silva",
            "email": "joao@example.com",
            "phone": "(11) 98765-4321",
            "whatsapp": "5511987654321",
            "groups": ["Leads", "VIP"],
            "tags": ["potencial", "ativo"],
            "createdAt": "2024-01-10T00:00:00Z",
            "lastInteraction": "2024-01-20T14:30:00Z",
            "messageCount": 45
        },
        {
            "id": "2",
            "name": "Maria Santos",
            "email": "maria@example.com",
            "phone": "(21) 99876-5432",
            "whatsapp": "5521998765432",
            "groups": ["Clientes"],
            "tags": ["cliente", "satisfeito"],
            "createdAt": "2023-12-15T00:00:00Z",
            "lastInteraction": "2024-01-19T10:15:00Z",
            "messageCount": 120
        }
    ]

@api_router.get("/dev/analytics/metrics", tags=["Analytics"])
async def get_analytics_metrics():
    """Mock endpoint to get analytics metrics"""
    return {
        "period": "7d",
        "conversations": {
            "total": 1243,
            "change": 12.5
        },
        "messages_sent": {
            "total": 12548,
            "change": 8.3
        },
        "active_contacts": {
            "total": 842,
            "change": -2.1
        },
        "avg_response_time": {
            "total": "2m 34s",
            "change": -15.2
        },
        "daily_activity": [
            {"day": "Seg", "conversations": 240},
            {"day": "Ter", "conversations": 420},
            {"day": "Qua", "conversations": 380},
            {"day": "Qui", "conversations": 520},
            {"day": "Sex", "conversations": 610},
            {"day": "Sab", "conversations": 480},
            {"day": "Dom", "conversations": 390}
        ],
        "status_overview": {
            "resolved": 723,
            "in_progress": 392,
            "pending": 128
        }
    }



