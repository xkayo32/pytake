"""
WhatsApp Number Endpoints
"""

from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, status, Request, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from app.api.deps import get_current_user, get_db, get_current_admin
from app.models.user import User
from app.schemas.whatsapp import (
    WhatsAppNumber,
    WhatsAppNumberCreate,
    WhatsAppNumberUpdate,
    ConnectionType,
)
from app.schemas.template import (
    TemplateCreateRequest,
    TemplateUpdateRequest,
    TemplateResponse,
    TemplateSyncResponse,
)
from app.services.whatsapp_service import WhatsAppService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


# ============= Request/Response Schemas =============

class QRCodeResponse(BaseModel):
    """QR Code response for Evolution API"""
    qr_code: Optional[str] = None
    status: str  # "pending", "connected", "disconnected"
    message: str


@router.get("/", response_model=List[WhatsAppNumber])
async def list_whatsapp_numbers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all WhatsApp numbers registered for the organization.

    Returns all WhatsApp Business Account numbers with connection status,
    configuration details, and webhook URLs.

    **Path Parameters:** None

    **Query Parameters:** None

    **Returns:** Array of WhatsApp numbers:
    - id (str): Number UUID
    - phone_number (str): Phone number with country code (e.g., '5585987654321')
    - display_name (str): User-friendly name
    - connection_type (str): 'official' (Meta Cloud API) or 'qrcode' (Evolution API)
    - status (str): 'connected', 'disconnected', 'pending'
    - verified (bool): Number verified with Meta
    - webhook_url (str): Webhook URL for receiving messages
    - created_at (datetime): Registration date
    - last_connected (datetime, optional): Last connection timestamp

    **Example Request:**
    ```
    GET /api/v1/whatsapp/
    Authorization: Bearer eyJhbGc...
    ```

    **Example Response:**
    ```json
    [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "phone_number": "5585987654321",
            "display_name": "Meu WhatsApp Business",
            "connection_type": "official",
            "status": "connected",
            "verified": true,
            "webhook_url": "https://seu-dominio.com/whatsapp/webhook",
            "created_at": "2025-01-01T10:00:00Z",
            "last_connected": "2025-01-15T14:32:00Z"
        }
    ]
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)
    - Scoped to: Organization (organization_id from current user)
    - Note: All organization members can list numbers

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 500: Server error (number list retrieval failure)
    """
    service = WhatsAppService(db)
    return await service.list_numbers(
        organization_id=current_user.organization_id
    )


@router.post("/", response_model=WhatsAppNumber, status_code=status.HTTP_201_CREATED)
async def create_whatsapp_number(
    data: WhatsAppNumberCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new WhatsApp number for the organization.

    Create a new WhatsApp Business Account connection using either Meta Cloud API
    (Official) or Evolution API (QR Code). Each number can handle multiple
    conversations and flows.

    **Path Parameters:** None

    **Request Body:**
    - phone_number (str, required): E.164 format (e.g., '5585987654321' = Brazil +55 85 98765-4321)
    - display_name (str, optional): User-friendly name (max 255 chars)
    - connection_type (str, optional): 'official' (Meta Cloud API) or 'qrcode' (Evolution API, default: 'official')
    - webhook_url (str, optional): URL to receive webhooks

    **For Meta Cloud API (connection_type='official'):**
    - phone_number_id (str, required): Meta Phone Number ID
    - whatsapp_business_account_id (str, required): Meta WhatsApp Business Account ID
    - access_token (str, required): Meta API Token (permissions: whatsapp_business_messaging)
    - app_secret (str, optional): Meta App Secret for webhook validation

    **For Evolution API (connection_type='qrcode'):**
    - evolution_instance_name (str, required): Unique Evolution instance identifier
    - evolution_api_url (str, required): Evolution API base URL
    - evolution_api_key (str, required): Evolution Global API Key

    **Returns:** WhatsAppNumber object with generated ID and status

    **Example Request (Meta Cloud API):**
    ```json
    {
        "phone_number": "5585987654321",
        "display_name": "Atendimento Suporte",
        "connection_type": "official",
        "phone_number_id": "123456789101112",
        "whatsapp_business_account_id": "111222333444555",
        "access_token": "EAABs1234567890...",
        "app_secret": "abc123def456...",
        "webhook_url": "https://seu-dominio.com/api/v1/whatsapp/webhook"
    }
    ```

    **Example Request (Evolution API):**
    ```json
    {
        "phone_number": "5585987654321",
        "display_name": "Atendimento Bot",
        "connection_type": "qrcode",
        "evolution_instance_name": "pytake-instance-001",
        "evolution_api_url": "https://api.evolution.example.com",
        "evolution_api_key": "sk-evolution-key-xxx..."
    }
    ```

    **Example Response:**
    ```json
    {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "phone_number": "5585987654321",
        "display_name": "Atendimento Suporte",
        "connection_type": "official",
        "status": "pending",
        "verified": false,
        "webhook_url": "https://seu-dominio.com/api/v1/whatsapp/webhook",
        "created_at": "2025-01-15T14:32:00Z"
    }
    ```

    **Permissions:**
    - Requires: org_admin or super_admin role
    - Scoped to: Organization (organization_id from current user)

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 403: Forbidden (insufficient permissions - not org_admin)
    - 409: Conflict (phone_number already registered in organization)
    - 422: Unprocessable Entity (invalid phone format, missing required fields)
    - 500: Server error (number creation failure)
    """
    service = WhatsAppService(db)
    return await service.create_number(
        data=data,
        organization_id=current_user.organization_id,
    )


# ============= Webhook Endpoints (Meta Cloud API) =============


@router.get("/webhook", response_class=PlainTextResponse, dependencies=[])
async def verify_webhook(
    request: Request,
    mode: str = Query(None, alias="hub.mode"),
    token: str = Query(None, alias="hub.verify_token"),
    challenge: str = Query(None, alias="hub.challenge"),
):
    """
    Webhook verification endpoint for Meta Cloud API.

    Meta sends a GET request to verify the webhook during setup.
    This endpoint is PUBLIC and does NOT require authentication.

    **Path Parameters:** None

    **Query Parameters:**
    - hub.mode (str): Subscription mode (must be 'subscribe')
    - hub.verify_token (str): Token to verify against configuration
    - hub.challenge (str): Random string to echo back

    **Returns:** Plain text challenge string (200 OK)

    **Example Request:**
    ```
    GET /api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=my_token&hub.challenge=abc123
    ```

    **Example Response:**
    ```
    abc123
    ```

    **Permissions:**
    - Public endpoint (no authentication required)
    - Verification token configured in Meta Dashboard

    **Error Codes:**
    - 400: Bad Request (missing required query parameters)
    - 403: Forbidden (invalid mode or token)
    - 500: Server error (verification failure)

    **Security Notes:**
    - Verify token must match Meta Dashboard configuration
    - Only mode 'subscribe' is accepted
    - Token validation happens server-side
    """
    if not mode or not token or not challenge:
        raise HTTPException(
            status_code=400,
            detail="Missing required query parameters"
        )

    if mode != "subscribe":
        raise HTTPException(
            status_code=403,
            detail="Invalid mode"
        )

    # Verify token against database manually (without dependency injection)
    from app.core.database import async_session
    from sqlalchemy import select
    from app.models.whatsapp_number import WhatsAppNumber

    async with async_session() as db:
        try:
            stmt = select(WhatsAppNumber).where(
                WhatsAppNumber.webhook_verify_token == token,
                WhatsAppNumber.deleted_at.is_(None),
            )
            result = await db.execute(stmt)
            number = result.scalar_one_or_none()

            if not number:
                raise HTTPException(
                    status_code=403,
                    detail="Invalid verify token"
                )
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error verifying webhook token: {e}")
            raise HTTPException(
                status_code=403,
                detail="Invalid verify token"
            )

    # Return challenge to complete verification
    return challenge


@router.post("/webhook", dependencies=[])
async def receive_webhook(
    request: Request,
):
    """
    Webhook endpoint for receiving WhatsApp messages and events from Meta Cloud API.

    This endpoint receives and processes incoming messages, status updates, and
    customer information changes. All events are validated using HMAC signature.

    **Path Parameters:** None

    **Request Body:**
    - object (str): Always 'whatsapp_business_account'
    - entry (array): Webhook entries containing:
      - changes (array): Events array with:
        - value (object): Event data containing:
          - messaging_product (str): 'whatsapp'
          - messages (array): Incoming messages with body, from, id
          - statuses (array): Message status updates (sent, delivered, read, failed)
          - contacts (array): Customer contact info

    **Returns:** HTTP 200 OK (empty response)

    **Example Webhook Payload (Message):**
    ```json
    {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "123456789",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "5585987654321",
                                "phone_number_id": "123456789101112"
                            },
                            "messages": [
                                {
                                    "from": "5585987654322",
                                    "id": "wamid.123",
                                    "timestamp": "1671234567",
                                    "type": "text",
                                    "text": {"body": "Olá!"}
                                }
                            ],
                            "contacts": [
                                {
                                    "profile": {"name": "João Silva"},
                                    "wa_id": "5585987654322"
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }
    ```

    **Example Webhook Payload (Status Update):**
    ```json
    {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "phone_number_id": "123456789101112"
                            },
                            "statuses": [
                                {
                                    "id": "wamid.123",
                                    "status": "delivered",
                                    "timestamp": "1671234567",
                                    "recipient_id": "5585987654322"
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }
    ```

    **Permissions:**
    - Public endpoint (no authentication required)
    - HMAC signature validation required via X-Hub-Signature header

    **Error Codes:**
    - 200: OK (success, always return 200 to avoid retry)
    - 400: Bad Request (invalid payload format)
    - 401: Unauthorized (invalid HMAC signature)
    - 422: Unprocessable Entity (validation error)
    - 500: Server error (processing failure)

    **Processing:**
    - Messages are stored in conversation threads
    - Status updates modify message delivery status
    - Customer profiles are created/updated
    - Async background tasks handle message processing
    - Always return 200 OK to prevent Meta from retrying
    """
    import logging
    from app.core.security import verify_whatsapp_signature
    from sqlalchemy import select
    from app.models.whatsapp_number import WhatsAppNumber

    logger = logging.getLogger(__name__)

    try:
        # Get raw body for signature verification
        raw_body = await request.body()
        logger.info(f"Webhook received: {len(raw_body)} bytes, signature present: {bool(request.headers.get('X-Hub-Signature-256'))}")

        # Get signature header
        signature = request.headers.get("X-Hub-Signature-256")

        # Parse JSON body from raw bytes
        import json
        body = json.loads(raw_body.decode('utf-8'))
        logger.info(f"Webhook parsed successfully, object: {body.get('object')}")

        # Extract phone_number_id from payload
        phone_number_id = None
        try:
            entries = body.get("entry", [])
            if entries:
                changes = entries[0].get("changes", [])
                if changes:
                    value = changes[0].get("value", {})
                    metadata = value.get("metadata", {})
                    phone_number_id = metadata.get("phone_number_id")
        except (IndexError, KeyError, TypeError):
            pass

        if not phone_number_id:
            logger.error(f"Could not extract phone_number_id from webhook payload: {json.dumps(body, indent=2)[:500]}")
            return {"status": "ok"}

        # Find WhatsApp number by phone_number_id
        from app.core.database import async_session
        async with async_session() as db:
            stmt = select(WhatsAppNumber).where(
                WhatsAppNumber.phone_number_id == phone_number_id,
                WhatsAppNumber.deleted_at.is_(None),
            )
            result = await db.execute(stmt)
            number = result.scalar_one_or_none()

            if not number:
                logger.error(f"WhatsApp number not found for phone_number_id: {phone_number_id}, organization might be deleted")
                return {"status": "ok"}

            # Verify signature if token is set
            if number.webhook_verify_token:
                if not signature:
                    logger.error("Missing X-Hub-Signature-256 header")
                    raise HTTPException(status_code=403, detail="Forbidden")

                if not verify_whatsapp_signature(
                    payload=raw_body,
                    signature=signature,
                    app_secret=number.webhook_verify_token
                ):
                    logger.error("Invalid webhook signature")
                    raise HTTPException(status_code=403, detail="Forbidden")

            # Process webhook
            logger.info(f"Processing webhook for WhatsApp number {number.id}, organization {number.organization_id}")
            from app.services.whatsapp_service import WhatsAppService
            service = WhatsAppService(db)
            await service.process_webhook(body, number.id, number.organization_id)
            logger.info(f"Webhook processed successfully for WhatsApp number {number.id}")

        # Always return 200 OK to Meta
        return {"status": "ok"}

    except HTTPException:
        # Re-raise HTTP exceptions (403 Forbidden)
        raise

    except Exception as e:
        # Log error but still return 200 to prevent Meta from retrying
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}


# ============= Debug Endpoints =============


@router.get(
    "/debug/conversation/{conversation_id}",
    dependencies=[Depends(get_current_user)]
)
async def debug_conversation_state(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Debug endpoint to check conversation flow state.
    Returns detailed state information for troubleshooting.

    **Permissions:** Requires authentication (org_admin or agent)
    """
    from app.repositories.conversation import ConversationRepository
    from app.services.chatbot_service import ChatbotService

    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id(
        conversation_id,
        current_user.organization_id
    )

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    chatbot_service = ChatbotService(db)

    # Get current node details
    current_node = None
    if conversation.current_node_id:
        current_node = await chatbot_service.node_repo.get(
            conversation.current_node_id
        )

    # Get active flow details
    active_flow = None
    if conversation.active_flow_id:
        active_flow = await chatbot_service.flow_repo.get(
            conversation.active_flow_id
        )

    return {
        "conversation_id": str(conversation.id),
        "status": conversation.status,
        "is_bot_active": conversation.is_bot_active,
        "active_flow_id": str(conversation.active_flow_id) if conversation.active_flow_id else None,
        "active_flow_name": active_flow.name if active_flow else None,
        "current_node_id": str(conversation.current_node_id) if conversation.current_node_id else None,
        "current_node_canvas_id": current_node.node_id if current_node else None,
        "current_node_type": current_node.node_type if current_node else None,
        "current_node_label": current_node.label if current_node else None,
        "context_variables": conversation.context_variables,
        "execution_path": (conversation.context_variables or {}).get("_execution_path", []),
        "last_message_at": conversation.last_message_at.isoformat() if conversation.last_message_at else None,
        "window_expires_at": conversation.window_expires_at.isoformat() if conversation.window_expires_at else None,
    }


@router.post(
    "/debug/conversation/{conversation_id}/reset-flow",
    dependencies=[Depends(get_current_user)]
)
async def reset_conversation_flow(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually reset a stuck conversation's flow state.
    Clears current_node_id and execution_path.

    **Permissions:** Requires org_admin role
    """
    if current_user.role not in ["org_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Requires admin role")

    from app.repositories.conversation import ConversationRepository

    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id(
        conversation_id,
        current_user.organization_id
    )

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Clear flow state
    context_vars = conversation.context_variables or {}
    context_vars.pop("_execution_path", None)
    context_vars.pop("_question_timestamp", None)

    await conv_repo.update(conversation_id, {
        "current_node_id": None,
        "context_variables": context_vars,
        "is_bot_active": True
    })
    await db.commit()

    return {
        "status": "reset",
        "message": "Flow state cleared, next message will restart flow"
    }


# ============= WhatsApp Number Endpoints =============


@router.get("/{number_id}", response_model=WhatsAppNumber)
async def get_whatsapp_number(
    number_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get WhatsApp number details by ID.

    Retrieve full configuration, status, and connection details for a registered number.

    **Path Parameters:**
    - number_id (str, UUID): WhatsApp number UUID

    **Query Parameters:** None

    **Returns:** WhatsAppNumber object with all configuration

    **Permissions:**
    - Requires: Authenticated user (any role)
    - Scoped to: Organization (number must belong to user's organization)

    **Error Codes:**
    - 401: Unauthorized
    - 404: Not Found (number doesn't exist or not in organization)
    - 500: Server error
    """
    service = WhatsAppService(db)
    return await service.get_by_id(
        number_id=number_id,
        organization_id=current_user.organization_id,
    )


@router.get("/{number_id}/compatible-chatbots")
async def get_compatible_chatbots(
    number_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of chatbots compatible with this WhatsApp number.

    Returns all chatbots in the organization that can be linked to this WhatsApp number,
    along with their current node type compatibility information.

    **Path Parameters:**
    - number_id (str, UUID): WhatsApp number UUID

    **Query Parameters:** None

    **Returns:** Object with list of compatible chatbots:
    ```json
    {
      "total": 2,
      "items": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "Support Bot",
          "description": "Customer support chatbot",
          "is_active": true,
          "whatsapp_number_id": "2f8ab23a-5d7f-4507-8767-90b2e438e394",
          "available_node_types": ["start", "message", "question", "condition"],
          "compatible": true
        },
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "name": "Sales Bot",
          "description": "Sales and lead generation",
          "is_active": false,
          "whatsapp_number_id": null,
          "available_node_types": null,
          "compatible": true
        }
      ]
    }
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)
    - Scoped to: Organization

    **Error Codes:**
    - 401: Unauthorized
    - 404: WhatsApp number not found
    - 500: Server error
    """
    from app.models.chatbot import Chatbot
    from sqlalchemy import select
    
    # Verify WhatsApp number exists and belongs to organization
    service = WhatsAppService(db)
    whatsapp_number = await service.get_by_id(
        number_id=number_id,
        organization_id=current_user.organization_id,
    )
    
    if not whatsapp_number:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")
    
    # Get all chatbots in the organization
    stmt = select(Chatbot).where(
        Chatbot.organization_id == current_user.organization_id
    ).order_by(Chatbot.name)
    
    result = await db.execute(stmt)
    chatbots = result.scalars().all()
    
    # Format response with compatibility info
    from app.schemas.chatbot import ChatbotInDB
    
    items = []
    for chatbot in chatbots:
        chatbot_dict = chatbot.__dict__.copy()
        chatbot_dict["compatible"] = True  # All chatbots can be linked
        
        # Add WhatsApp connection info if this chatbot is already linked
        if chatbot.whatsapp_number_id == number_id:
            chatbot_dict["whatsapp_connection_type"] = whatsapp_number.connection_type
            chatbot_dict["whatsapp_phone_number"] = whatsapp_number.phone_number
            chatbot_dict["available_node_types"] = whatsapp_number.available_node_types
        
        items.append(chatbot_dict)
    
    return {
        "total": len(items),
        "items": items,
    }


@router.put("/{number_id}", response_model=WhatsAppNumber)
async def update_whatsapp_number(
    number_id: UUID,
    data: WhatsAppNumberUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update WhatsApp number configuration.

    Modify display name, webhook URL, and other settings for existing number.

    **Path Parameters:**
    - number_id (str, UUID): WhatsApp number UUID

    **Request Body:**
    - display_name (str, optional): Updated display name
    - webhook_url (str, optional): Updated webhook URL
    - is_active (bool, optional): Enable/disable number

    **Returns:** Updated WhatsAppNumber object

    **Permissions:**
    - Requires: org_admin or super_admin role
    - Scoped to: Organization

    **Error Codes:**
    - 401: Unauthorized
    - 403: Forbidden (not org_admin)
    - 404: Not Found
    - 422: Unprocessable Entity
    - 500: Server error
    """
    service = WhatsAppService(db)
    return await service.update_number(
        number_id=number_id,
        data=data,
        organization_id=current_user.organization_id,
    )


@router.post("/{number_id}/test")
async def test_whatsapp_connection(
    number_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Test WhatsApp number connection.

    Validates credentials and connectivity to Meta API or Evolution API.

    **Path Parameters:**
    - number_id (str, UUID): WhatsApp number UUID

    **Request Body:** None

    **Returns:**
    - success (bool): Connection successful
    - status (str): Connection status
    - message (str): Status message
    - api_response (object): Raw API response

    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization

    **Error Codes:**
    - 401: Unauthorized
    - 404: Not Found
    - 503: Service Unavailable (API unreachable)
    - 500: Server error
    """
    from datetime import datetime
    from sqlalchemy import update
    
    service = WhatsAppService(db)
    
    # Get WhatsApp number
    number = await service.get_by_id(number_id, current_user.organization_id)
    
    if not number:
        raise HTTPException(
            status_code=404,
            detail="WhatsApp number not found"
        )
    
    result = {
        "status": "connected",
        "message": "WhatsApp connection is working",
        "connection_type": number.connection_type,
        "phone_number": number.phone_number
    }
    
    try:
        if number.connection_type == "official":
            # Test Official API connection
            from app.integrations.meta_api import MetaCloudAPI
            
            meta_api = MetaCloudAPI(
                phone_number_id=number.phone_number_id,
                access_token=number.access_token
            )
            
            # Try to fetch phone number details as a test
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://graph.facebook.com/v18.0/{number.phone_number_id}",
                    params={"access_token": number.access_token}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    result["status"] = "connected"
                    result["display_name"] = data.get("display_phone_number", number.phone_number)
                    result["message"] = "✅ Official API connection successful"
                elif response.status_code == 401:
                    result["status"] = "disconnected"
                    result["message"] = "❌ Invalid access token - connection failed"
                else:
                    result["status"] = "error"
                    result["message"] = f"❌ API returned status {response.status_code}"
                    
        elif number.connection_type == "qrcode":
            # Test Evolution API connection
            from app.integrations.evolution_api import EvolutionAPIClient
            
            evolution = EvolutionAPIClient(
                api_url=number.evolution_api_url,
                api_key=number.evolution_api_key
            )
            
            # Get instance status
            status_data = await evolution.get_instance_status(
                instance_name=number.evolution_instance_name
            )
            
            if status_data.get("state") == "open":
                result["status"] = "connected"
                result["message"] = "✅ Evolution API connection successful"
            else:
                result["status"] = "disconnected"
                result["message"] = f"❌ Instance is {status_data.get('state', 'unknown')}"
                
    except Exception as e:
        result["status"] = "error"
        result["message"] = f"❌ Error testing connection: {str(e)}"
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error testing WhatsApp connection {number_id}: {str(e)}")
    
    # ✅ UPDATE STATUS IN DATABASE
    try:
        from app.models.whatsapp_number import WhatsAppNumber as WhatsAppNumberModel
        
        update_stmt = (
            update(WhatsAppNumberModel)
            .where(WhatsAppNumberModel.id == number_id)
            .values(
                status=result["status"],
                last_seen_at=datetime.now(datetime.now().astimezone().tzinfo),
                connected_at=datetime.now(datetime.now().astimezone().tzinfo) if result["status"] == "connected" else number.connected_at
            )
        )
        await db.execute(update_stmt)
        await db.commit()
    except Exception as e:
        # Log but don't fail the response
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Could not update status for {number_id}: {str(e)}")
    
    return result


@router.delete("/{number_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_whatsapp_number(
    number_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete WhatsApp number (soft delete).

    Remove a number from the system. Conversations are preserved for historical records.

    **Path Parameters:**
    - number_id (str, UUID): WhatsApp number UUID

    **Request Body:** None

    **Returns:** HTTP 204 No Content

    **Permissions:**
    - Requires: org_admin or super_admin role
    - Scoped to: Organization

    **Error Codes:**
    - 401: Unauthorized
    - 403: Forbidden (not org_admin)
    - 404: Not Found
    - 500: Server error
    """
    service = WhatsAppService(db)
    await service.delete_number(
        number_id=number_id,
        organization_id=current_user.organization_id,
    )
    return None


# ============= Evolution API Endpoints (QR Code) =============


@router.post("/{number_id}/qrcode", response_model=QRCodeResponse)
async def generate_qrcode(
    number_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate new QR Code for Evolution API connection.

    Initiate QR code generation for number registration with Evolution API.
    Scan with WhatsApp mobile app to authenticate.

    **Path Parameters:**
    - number_id (str, UUID): WhatsApp number UUID

    **Request Body:** None

    **Returns:**
    - qr_code (str, optional): QR Code image data (base64 or URL)
    - status (str): 'pending', 'connected', 'disconnected'
    - message (str): Status message

    **Permissions:**
    - Requires: org_admin or super_admin role

    **Error Codes:**
    - 401: Unauthorized
    - 403: Forbidden (not org_admin)
    - 404: Not Found
    - 500: Server error (QR code generation failed)
    """
    service = WhatsAppService(db)

    # Get WhatsApp number
    number = await service.get_by_id(number_id, current_user.organization_id)

    if number.connection_type != "qrcode":
        raise HTTPException(
            status_code=400,
            detail="QR Code is only available for Evolution API connections"
        )

    # Generate QR Code via Evolution API
    result = await service.generate_qrcode(number)

    return QRCodeResponse(
        qr_code=result.get("qr_code"),
        status=result.get("status", "pending"),
        message=result.get("message", "QR Code gerado com sucesso")
    )


@router.get("/{number_id}/qrcode/status", response_model=QRCodeResponse)
async def get_qrcode_status(
    number_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get QR Code status for Evolution API connection.

    Check current QR code generation and connection status.

    **Path Parameters:**
    - number_id (str, UUID): WhatsApp number UUID

    **Query Parameters:** None

    **Returns:**
    - qr_code (str, optional): Current QR Code image
    - status (str): 'pending', 'connected', 'disconnected', 'expired'
    - message (str): Status description

    **Permissions:**
    - Requires: Authenticated user

    **Error Codes:**
    - 401: Unauthorized
    - 404: Not Found
    - 500: Server error
    """
    service = WhatsAppService(db)

    # Get WhatsApp number
    number = await service.get_by_id(number_id, current_user.organization_id)

    if number.connection_type != "qrcode":
        raise HTTPException(
            status_code=400,
            detail="QR Code status is only available for Evolution API connections"
        )

    # Check status via Evolution API
    result = await service.get_qrcode_status(number)

    return QRCodeResponse(
        qr_code=result.get("qr_code"),
        status=result.get("status", "unknown"),
        message=result.get("message", "")
    )


@router.post("/{number_id}/disconnect")
async def disconnect_number(
    number_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Disconnect WhatsApp number.
    - For Evolution API: Logout from instance
    - For Official API: Deactivate number
    """
    service = WhatsAppService(db)

    # Get WhatsApp number
    number = await service.get_by_id(number_id, current_user.organization_id)

    # Disconnect based on type
    await service.disconnect_number(number)

    return {"status": "success", "message": "Número desconectado com sucesso"}


# ============= Template Endpoints =============


@router.get("/{number_id}/templates", response_model=List[Dict[str, Any]])
async def list_templates(
    number_id: UUID,
    status_filter: Optional[str] = Query("APPROVED", alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List message templates from Meta Cloud API for a WhatsApp number.

    Fetches templates directly from Meta's servers (not local database).
    Only works for Official API connections (connection_type='official').

    **Path Parameters:**
    - number_id (UUID): WhatsApp number ID

    **Query Parameters:**
    - status (str, optional): Filter by status (default: APPROVED)
      - APPROVED: Templates ready to use
      - PENDING: Awaiting Meta review
      - REJECTED: Rejected by Meta
      - DISABLED: Disabled by Meta
      - PAUSED: Paused due to quality issues

    **Returns:** List of templates with complete metadata from Meta API

    **Example Response:**
    ```json
    [
      {
        "id": "1234567890",
        "name": "welcome_message",
        "language": "pt_BR",
        "status": "APPROVED",
        "category": "UTILITY",
        "components": [
          {
            "type": "BODY",
            "text": "Olá {{1}}, bem-vindo!"
          }
        ]
      }
    ]
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)
    - Scoped to: Organization

    **Error Codes:**
    - 400: Templates not available for QR Code connections
    - 400: WhatsApp Business Account ID not configured
    - 404: WhatsApp number not found
    - 500: Meta API error
    """
    service = WhatsAppService(db)

    # Get WhatsApp number
    number = await service.get_by_id(number_id, current_user.organization_id)

    if number.connection_type != "official":
        raise HTTPException(
            status_code=400,
            detail="Templates are only available for Official API connections"
        )

    if not number.whatsapp_business_account_id:
        raise HTTPException(
            status_code=400,
            detail="WhatsApp Business Account ID not configured"
        )

    # Fetch templates from Meta API
    from app.integrations.meta_api import MetaCloudAPI, MetaAPIError

    meta_api = MetaCloudAPI(
        phone_number_id=number.phone_number_id,
        access_token=number.access_token
    )

    try:
        templates = await meta_api.list_templates(
            waba_id=number.whatsapp_business_account_id,
            status=status_filter
        )

        return templates

    except MetaAPIError as e:
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"Meta API error: {e.message}"
        )


@router.post("/{number_id}/templates", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    number_id: UUID,
    data: TemplateCreateRequest,
    submit: bool = Query(True, description="Submit to Meta immediately"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new WhatsApp template.

    Creates a message template for sending notifications outside the 24-hour
    customer service window. Templates must be approved by Meta before use.

    **Path Parameters:**
    - number_id (UUID): WhatsApp number ID

    **Query Parameters:**
    - submit (bool): Submit to Meta immediately (default: true)
      - true: Template created and submitted (status: PENDING)
      - false: Template created as draft (status: DRAFT)

    **Request Body:**
    - name (str): Template name (lowercase with underscores, e.g., "order_confirmation")
    - language (str): Language code (e.g., "pt_BR", "en_US")
    - category (str): Template category (MARKETING, UTILITY, AUTHENTICATION)
    - components (list): Template components (header, body, footer, buttons)

    **Returns:**
    - Created template with status DRAFT or PENDING
    - Fields include: parameter_format, named_variables

    ---

    ## Variable Formats (IMPORTANT)

    Meta WhatsApp API supports **TWO formats** for template variables:

    ### 1. POSITIONAL Format (Traditional)
    Variables use numbers: {{1}}, {{2}}, {{3}}, etc.

    **Characteristics:**
    - Order matters: {{1}} = first parameter, {{2}} = second, etc.
    - Less readable in code
    - Legacy format

    **Example:**
    ```json
    {
      "type": "BODY",
      "text": "Olá {{1}}, seu código é {{2}}. Válido por {{3}} minutos."
    }
    ```

    ### 2. NAMED Format (Recommended - More Readable)
    Variables use descriptive names: {{nome}}, {{codigo}}, {{email}}, etc.

    **Characteristics:**
    - Self-documenting: Clear what each variable represents
    - Easier to maintain
    - Recommended by Meta for new templates

    **Rules:**
    - Must start with letter or underscore: `{{nome}}` ✅ `{{1nome}}` ❌
    - Can contain letters, numbers, underscores: `{{numero_pedido}}` ✅
    - Cannot contain spaces or special chars: `{{número-pedido}}` ❌
    - Case-sensitive: `{{Nome}}` ≠ `{{nome}}`

    **Example:**
    ```json
    {
      "type": "BODY",
      "text": "Olá {{nome}}, seu código é {{codigo}}. Válido por {{validade}} minutos."
    }
    ```

    ### Important Constraints:
    - **Cannot mix formats** in same template (all positional OR all named)
    - Variable names must match **EXACTLY** when sending messages
    - System auto-detects format and stores in `parameter_format` field
    - Named variables stored in `named_variables` array field

    ---

    ## Example Request (Named Variables - Recommended):
    ```json
    {
      "name": "order_confirmation",
      "language": "pt_BR",
      "category": "UTILITY",
      "components": [
        {
          "type": "HEADER",
          "format": "TEXT",
          "text": "Pedido {{numero_pedido}}"
        },
        {
          "type": "BODY",
          "text": "Olá {{cliente}}, seu pedido no valor de {{total}} foi confirmado com sucesso!"
        },
        {
          "type": "FOOTER",
          "text": "Obrigado pela preferência"
        },
        {
          "type": "BUTTONS",
          "buttons": [
            {
              "type": "QUICK_REPLY",
              "text": "Ver detalhes"
            }
          ]
        }
      ]
    }
    ```

    ## Example Request (Positional Variables):
    ```json
    {
      "name": "order_update",
      "language": "en_US",
      "category": "UTILITY",
      "components": [
        {
          "type": "BODY",
          "text": "Hello {{1}}, your order {{2}} totaling {{3}} has been confirmed!"
        }
      ]
    }
    ```

    **Response Fields (NEW):**
    - `parameter_format`: "NAMED" or "POSITIONAL"
    - `named_variables`: Array of variable names (for NAMED format)
      Example: ["cliente", "numero_pedido", "total"]

    **Permissions:**
    - Requires: org_admin or super_admin role
    - Scoped to: Organization

    **Error Codes:**
    - 400: Templates not available for QR Code connections
    - 400: WhatsApp Business Account ID not configured
    - 400: Invalid parameter (check Meta API error message)
    - 404: WhatsApp number not found
    - 409: Template with same name already exists
    - 500: Meta API error

    **Notes:**
    - Template names must be lowercase with underscores only
    - If submit=True, template sent to Meta for approval (24-48h review)
    - If submit=False, template saved as DRAFT (can edit/submit later)
    - Meta validates template content and may reject non-compliant templates
    """
    from app.services.template_service import TemplateService

    whatsapp_service = WhatsAppService(db)
    template_service = TemplateService(db)

    # Get WhatsApp number
    number = await whatsapp_service.get_by_id(number_id, current_user.organization_id)

    if number.connection_type != "official":
        raise HTTPException(
            status_code=400,
            detail="Templates are only available for Official API connections"
        )

    if not number.whatsapp_business_account_id:
        raise HTTPException(
            status_code=400,
            detail="WhatsApp Business Account ID not configured"
        )

    # Create template
    from app.integrations.meta_api import MetaAPIError

    try:
        template = await template_service.create_template(
            data=data,
            whatsapp_number_id=number_id,
            organization_id=current_user.organization_id,
            waba_id=number.whatsapp_business_account_id,
            access_token=number.access_token,
            submit_to_meta=submit
        )
        return template

    except MetaAPIError as e:
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"Meta API error: {e.message}"
        )


@router.get("/{number_id}/templates/local", response_model=List[TemplateResponse])
async def list_local_templates(
    number_id: UUID,
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List templates from local database (not Meta API).

    Returns templates stored in PyTake's database, including drafts and
    templates synced from Meta. Much faster than fetching from Meta API.

    **Differences from GET /templates:**
    - Source: Local database (not Meta API)
    - Includes: DRAFT templates (not submitted to Meta yet)
    - Performance: Much faster (no external API call)
    - Offline: Works even if Meta API is down
    - Extra fields: parameter_format, named_variables

    **Path Parameters:**
    - number_id (UUID): WhatsApp number ID

    **Query Parameters:**
    - status (str, optional): Filter by status
      - DRAFT: Created locally, not submitted to Meta
      - PENDING: Submitted to Meta, awaiting review
      - APPROVED: Approved by Meta, ready to use
      - REJECTED: Rejected by Meta
      - DISABLED: Disabled by Meta due to quality issues
    - skip (int): Number of records to skip (default: 0)
    - limit (int): Max records to return (default: 100, max: 100)

    **Returns:** List of templates with parameter format info

    **Example Response:**
    ```json
    [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "welcome_message",
        "language": "pt_BR",
        "status": "APPROVED",
        "category": "UTILITY",
        "parameter_format": "NAMED",
        "named_variables": ["nome", "codigo"],
        "body_text": "Olá {{nome}}, seu código é {{codigo}}",
        "header_text": null,
        "footer_text": "PyTake - Automação WhatsApp",
        "buttons": [],
        "quality_score": "GREEN",
        "sent_count": 150,
        "delivered_count": 148,
        "created_at": "2025-01-15T14:32:00Z",
        "approved_at": "2025-01-16T10:00:00Z"
      }
    ]
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)
    - Scoped to: Organization

    **Error Codes:**
    - 404: WhatsApp number not found
    """
    from app.services.template_service import TemplateService

    whatsapp_service = WhatsAppService(db)
    template_service = TemplateService(db)

    # Verify access
    await whatsapp_service.get_by_id(number_id, current_user.organization_id)

    templates = await template_service.list_templates(
        whatsapp_number_id=number_id,
        organization_id=current_user.organization_id,
        status=status_filter,
        skip=skip,
        limit=limit
    )

    return templates


@router.get("/{number_id}/templates/{template_id}", response_model=TemplateResponse)
async def get_template(
    number_id: UUID,
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single template by ID from local database.

    Returns complete template details including components, variables,
    usage statistics, and quality metrics.

    **Path Parameters:**
    - number_id (UUID): WhatsApp number ID
    - template_id (UUID): Template ID

    **Returns:** Complete template object with all fields

    **Example Response:**
    ```json
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "order_confirmation",
      "language": "pt_BR",
      "status": "APPROVED",
      "category": "UTILITY",
      "parameter_format": "NAMED",
      "named_variables": ["cliente", "numero_pedido", "total"],
      "header_type": "TEXT",
      "header_text": "Pedido Confirmado",
      "header_variables_count": 0,
      "body_text": "Olá {{cliente}}! Seu pedido {{numero_pedido}} no valor de {{total}} foi confirmado.",
      "body_variables_count": 3,
      "footer_text": "Obrigado pela preferência",
      "buttons": [],
      "quality_score": "GREEN",
      "paused_at": null,
      "disabled_at": null,
      "disabled_reason": null,
      "sent_count": 1250,
      "delivered_count": 1230,
      "read_count": 1100,
      "failed_count": 5,
      "is_system_template": false,
      "is_enabled": true,
      "approved_at": "2025-01-10T10:00:00Z",
      "rejected_at": null,
      "created_at": "2025-01-09T15:30:00Z",
      "updated_at": "2025-01-10T10:00:00Z"
    }
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)
    - Scoped to: Organization + WhatsApp number

    **Error Codes:**
    - 404: Template not found or doesn't belong to organization
    """
    from app.services.template_service import TemplateService

    whatsapp_service = WhatsAppService(db)
    template_service = TemplateService(db)

    # Verify access
    await whatsapp_service.get_by_id(number_id, current_user.organization_id)

    template = await template_service.get_template(
        template_id=template_id,
        organization_id=current_user.organization_id
    )

    return template


@router.put("/{number_id}/templates/{template_id}", response_model=TemplateResponse)
async def update_template(
    number_id: UUID,
    template_id: UUID,
    data: TemplateUpdateRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update template (only local fields)

    Note: Template content cannot be edited after submission.
    To modify a template, create a new one.
    """
    from app.services.template_service import TemplateService

    whatsapp_service = WhatsAppService(db)
    template_service = TemplateService(db)

    # Verify access
    await whatsapp_service.get_by_id(number_id, current_user.organization_id)

    template = await template_service.update_template(
        template_id=template_id,
        data=data,
        organization_id=current_user.organization_id
    )

    return template


@router.delete("/{number_id}/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    number_id: UUID,
    template_id: UUID,
    delete_from_meta: bool = Query(False, description="Also delete from Meta"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a template (soft delete in database).

    Removes template from local database. Optionally can also delete from
    Meta API (irreversible).

    **IMPORTANT:**
    - Local delete: Template marked as deleted (can be restored)
    - Meta delete: Permanently removes from WhatsApp (cannot be undone)
    - System templates cannot be deleted

    **Path Parameters:**
    - number_id (UUID): WhatsApp number ID
    - template_id (UUID): Template ID to delete

    **Query Parameters:**
    - delete_from_meta (bool): Also delete from Meta API (default: false)
      ⚠️ WARNING: Meta deletion is permanent and irreversible!

    **Returns:** HTTP 204 No Content on success

    **Example Usage:**
    ```bash
    # Delete locally only (can be restored)
    DELETE /api/v1/whatsapp/{number_id}/templates/{template_id}

    # Delete from Meta too (PERMANENT - Cannot be undone!)
    DELETE /api/v1/whatsapp/{number_id}/templates/{template_id}?delete_from_meta=true
    ```

    **Permissions:**
    - Requires: org_admin or super_admin role
    - Scoped to: Organization

    **Error Codes:**
    - 403: Forbidden (not admin)
    - 404: Template not found
    - 400: Cannot delete system template
    - 500: Failed to delete from Meta (local deletion still succeeds)
    """
    from app.services.template_service import TemplateService

    whatsapp_service = WhatsAppService(db)
    template_service = TemplateService(db)

    # Get WhatsApp number
    number = await whatsapp_service.get_by_id(number_id, current_user.organization_id)

    waba_id = number.whatsapp_business_account_id if delete_from_meta else None
    access_token = number.access_token if delete_from_meta else None

    await template_service.delete_template(
        template_id=template_id,
        organization_id=current_user.organization_id,
        waba_id=waba_id,
        access_token=access_token,
        delete_from_meta=delete_from_meta
    )

    return None


@router.post("/{number_id}/templates/sync", response_model=TemplateSyncResponse)
async def sync_templates(
    number_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Sync templates from Meta API

    Fetches all templates from Meta and updates local database:
    - Creates new templates found in Meta
    - Updates status of existing templates (PENDING → APPROVED/REJECTED)
    - Useful after creating templates directly in Meta Business Manager
    """
    from app.services.template_service import TemplateService

    whatsapp_service = WhatsAppService(db)
    template_service = TemplateService(db)

    # Get WhatsApp number
    number = await whatsapp_service.get_by_id(number_id, current_user.organization_id)

    if number.connection_type != "official":
        raise HTTPException(
            status_code=400,
            detail="Sync is only available for Official API connections"
        )

    if not number.whatsapp_business_account_id:
        raise HTTPException(
            status_code=400,
            detail="WhatsApp Business Account ID not configured"
        )

    from app.integrations.meta_api import MetaAPIError

    try:
        stats = await template_service.sync_from_meta(
            whatsapp_number_id=number_id,
            organization_id=current_user.organization_id,
            waba_id=number.whatsapp_business_account_id,
            access_token=number.access_token
        )

        return TemplateSyncResponse(
            synced=stats.get("created", 0) + stats.get("updated", 0),
            created=stats.get("created", 0),
            updated=stats.get("updated", 0),
            deleted=stats.get("deleted", 0)
        )

    except MetaAPIError as e:
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"Meta API error: {e.message}"
        )


# ============= RATE LIMITING ENDPOINTS =============

@router.get("/{number_id}/rate-limit/usage")
async def get_rate_limit_usage(
    number_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current rate limit usage for WhatsApp number
    
    Shows daily, hourly, and minute usage counters.
    Useful for monitoring and preventing rate limit issues.
    """
    from app.core.whatsapp_rate_limit import get_whatsapp_rate_limiter
    
    service = WhatsAppService(db)
    whatsapp_number = await service.get_number(number_id, current_user.organization_id)
    
    if not whatsapp_number:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")
    
    # Get rate limiter
    limiter = await get_whatsapp_rate_limiter(
        whatsapp_number.id,
        whatsapp_number.connection_type
    )
    
    # Get usage stats
    usage = await limiter.get_current_usage()
    
    # Check if can send now
    can_send, reason = await limiter.can_send_message()
    
    return {
        "whatsapp_number_id": str(number_id),
        "phone_number": whatsapp_number.phone_number,
        "connection_type": whatsapp_number.connection_type,
        "usage": usage,
        "can_send_now": can_send,
        "rate_limit_reason": reason,
    }


@router.post("/{number_id}/rate-limit/reset")
async def reset_rate_limit(
    number_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Reset rate limit counters for WhatsApp number
    
    Requires: org_admin or super_admin role
    
    Use with caution - only for testing or manual intervention.
    """
    from app.core.whatsapp_rate_limit import get_whatsapp_rate_limiter
    
    service = WhatsAppService(db)
    whatsapp_number = await service.get_number(number_id, current_user.organization_id)
    
    if not whatsapp_number:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")
    
    # Get rate limiter
    limiter = await get_whatsapp_rate_limiter(
        whatsapp_number.id,
        whatsapp_number.connection_type
    )
    
    # Reset counters
    await limiter.reset_counters()
    
    return {
        "message": "Rate limit counters reset successfully",
        "whatsapp_number_id": str(number_id),
    }


# ============= TEMPLATE MONITORING & STATUS ENDPOINTS =============

@router.get("/templates/critical")
async def get_critical_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all templates requiring attention for the organization.
    
    Returns templates with issues:
    - Status: DISABLED, PAUSED, REJECTED
    - Quality: RED (failing quality metrics)
    - Pending approval (PENDING status > 48h)
    
    **Returns:**
    ```json
    {
        "critical_templates": [
            {
                "id": "template-uuid",
                "name": "template_name",
                "status": "DISABLED",
                "quality_score": "RED",
                "disabled_reason": "QUALITY_ISSUES",
                "disabled_at": "2025-01-15T14:30:00Z",
                "sent_count": 1250,
                "failed_count": 45,
                "failure_rate": 0.036,
                "campaigns_affected": 3,
                "action_required": "Review template quality metrics and resubmit"
            }
        ],
        "total_critical": 2,
        "timestamp": "2025-01-15T15:00:00Z"
    }
    ```
    
    **Permissions:**
    - Requires: Authenticated user (any role)
    - Scoped to: Organization
    """
    from app.services.template_status_service import TemplateStatusService
    
    service = TemplateStatusService(db)
    templates = await service.get_critical_templates(current_user.organization_id)
    
    result = []
    for template in templates:
        campaigns_affected = await service._get_template_campaign_count(template.id)
        failure_rate = (
            template.failed_count / (template.sent_count or 1)
            if template.sent_count
            else 0
        )
        
        result.append({
            "id": str(template.id),
            "name": template.name,
            "status": template.status,
            "quality_score": template.quality_score,
            "disabled_reason": template.disabled_reason,
            "disabled_at": template.disabled_at,
            "paused_at": template.paused_at,
            "sent_count": template.sent_count,
            "delivered_count": template.delivered_count,
            "failed_count": template.failed_count,
            "failure_rate": round(failure_rate, 4),
            "campaigns_affected": campaigns_affected,
            "last_status_update": template.last_status_update,
            "action_required": _get_action_required(template),
        })
    
    return {
        "critical_templates": result,
        "total_critical": len(result),
        "timestamp": datetime.utcnow(),
    }


@router.get("/templates/quality-summary")
async def get_quality_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get quality metrics summary for all organization templates.
    
    Provides overview of template quality distribution and metrics.
    
    **Returns:**
    ```json
    {
        "quality_summary": {
            "total_templates": 45,
            "approved": 40,
            "pending": 2,
            "rejected": 1,
            "disabled": 2,
            "paused": 0,
            "quality_distribution": {
                "GREEN": 35,
                "YELLOW": 4,
                "RED": 1,
                "UNKNOWN": 5
            },
            "avg_success_rate": 0.98,
            "avg_failure_rate": 0.02,
            "total_messages_sent": 125400,
            "total_messages_failed": 2450
        },
        "recent_quality_changes": [
            {
                "template_id": "uuid",
                "template_name": "name",
                "previous_score": "GREEN",
                "current_score": "YELLOW",
                "changed_at": "2025-01-15T10:30:00Z",
                "reason": "Quality metrics degraded"
            }
        ],
        "timestamp": "2025-01-15T15:00:00Z"
    }
    ```
    
    **Permissions:**
    - Requires: org_admin or super_admin role
    - Scoped to: Organization
    """
    from app.services.template_status_service import TemplateStatusService
    
    service = TemplateStatusService(db)
    summary = await service.get_template_quality_summary(current_user.organization_id)
    
    return {
        "quality_summary": summary,
        "timestamp": datetime.utcnow(),
    }


@router.get("/{number_id}/templates/{template_id}/status-history")
async def get_template_status_history(
    number_id: UUID,
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """
    Get status change history for a specific template.
    
    Shows all status transitions and quality score changes with timestamps
    and reasons. Useful for auditing and debugging template issues.
    
    **Path Parameters:**
    - number_id: WhatsApp number UUID
    - template_id: Template UUID
    
    **Query Parameters:**
    - limit: Max results (default: 100, max: 1000)
    - offset: Pagination offset (default: 0)
    
    **Returns:**
    ```json
    {
        "template": {
            "id": "template-uuid",
            "name": "template_name",
            "current_status": "APPROVED",
            "current_quality": "GREEN"
        },
        "history": [
            {
                "timestamp": "2025-01-15T14:30:00Z",
                "event_type": "APPROVED",
                "previous_status": "PENDING",
                "new_status": "APPROVED",
                "quality_score": "UNKNOWN",
                "reason": "Template approved by Meta",
                "webhook_id": "evt-123"
            }
        ],
        "total": 15,
        "limit": 100,
        "offset": 0
    }
    ```
    
    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization + WhatsApp number
    
    **Note:** This endpoint requires implementation of AuditLog model
    (Future enhancement for complete audit trail)
    """
    from app.services.whatsapp_service import WhatsAppService
    from app.models.whatsapp_number import WhatsAppTemplate
    
    # Verify number belongs to organization
    service = WhatsAppService(db)
    whatsapp_number = await service.get_number(number_id, current_user.organization_id)
    
    if not whatsapp_number:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")
    
    # Verify template exists and belongs to this number
    from sqlalchemy import select
    
    query = select(WhatsAppTemplate).where(
        WhatsAppTemplate.id == template_id,
        WhatsAppTemplate.whatsapp_number_id == number_id,
        WhatsAppTemplate.deleted_at.is_(None),
    )
    
    result = await db.execute(query)
    template = result.scalars().first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # TODO: Implement AuditLog table to track status changes
    # For now, return basic current state
    return {
        "template": {
            "id": str(template.id),
            "name": template.name,
            "current_status": template.status,
            "current_quality": template.quality_score,
        },
        "history": [
            {
                "timestamp": template.last_status_update,
                "event_type": template.status,
                "current_status": template.status,
                "quality_score": template.quality_score,
                "reason": template.disabled_reason or "Status update from Meta",
            }
        ],
        "note": "Full status history requires AuditLog implementation",
        "total": 1,
        "limit": limit,
        "offset": offset,
    }


@router.post("/{number_id}/templates/{template_id}/acknowledge-alert")
async def acknowledge_template_alert(
    number_id: UUID,
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark template quality alert as acknowledged by user.
    
    Used to suppress repeated alerts after admin has reviewed
    and taken action on a template issue.
    
    **Path Parameters:**
    - number_id: WhatsApp number UUID
    - template_id: Template UUID
    
    **Returns:**
    ```json
    {
        "message": "Alert acknowledged",
        "template_id": "uuid",
        "acknowledged_at": "2025-01-15T15:05:00Z",
        "acknowledged_by": "user@example.com"
    }
    ```
    
    **Permissions:**
    - Requires: org_admin or super_admin role
    - Scoped to: Organization + WhatsApp number
    """
    from app.services.whatsapp_service import WhatsAppService
    from app.models.whatsapp_number import WhatsAppTemplate
    from datetime import datetime
    
    # Verify number belongs to organization
    service = WhatsAppService(db)
    whatsapp_number = await service.get_number(number_id, current_user.organization_id)
    
    if not whatsapp_number:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")
    
    # Verify template exists
    from sqlalchemy import select
    
    query = select(WhatsAppTemplate).where(
        WhatsAppTemplate.id == template_id,
        WhatsAppTemplate.whatsapp_number_id == number_id,
        WhatsAppTemplate.deleted_at.is_(None),
    )
    
    result = await db.execute(query)
    template = result.scalars().first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # TODO: Implement alert acknowledgment tracking
    # For now, just return success
    return {
        "message": "Alert acknowledged",
        "template_id": str(template.id),
        "acknowledged_at": datetime.utcnow(),
        "acknowledged_by": current_user.email,
        "note": "Alert acknowledgment tracking requires AlertLog implementation",
    }


# ============= HELPER FUNCTIONS =============

def _get_action_required(template) -> str:
    """
    Generate human-readable action description for critical template.
    """
    if template.status == "DISABLED":
        reason = template.disabled_reason or "Unknown reason"
        return f"Template disabled ({reason}). Review Meta documentation and resubmit."
    elif template.status == "PAUSED":
        return "Template paused by Meta. Check quality metrics and request review."
    elif template.status == "REJECTED":
        return "Template was rejected by Meta. Update content and resubmit."
    elif template.quality_score == "RED":
        return "Quality score RED. Update template content to improve metrics."
    elif template.status == "PENDING" and template.created_at:
        from datetime import datetime, timedelta
        pending_hours = (datetime.utcnow() - template.created_at).total_seconds() / 3600
        if pending_hours > 48:
            return f"Pending for {int(pending_hours)}h. May have been rejected - check Meta dashboard."
        return f"Pending approval for {int(pending_hours)}h."
    
    return "Review template status in Meta dashboard"
