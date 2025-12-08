"""
WhatsApp Number Endpoints
"""

from typing import List, Dict, Any, Optional
from uuid import UUID

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

        # Get signature header
        signature = request.headers.get("X-Hub-Signature-256")

        # Parse JSON body from raw bytes
        import json
        body = json.loads(raw_body.decode('utf-8'))

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
            logger.error("Could not extract phone_number_id from webhook")
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
                logger.error(f"WhatsApp number not found for phone_number_id: {phone_number_id}")
                return {"status": "ok"}

            # Verify signature if token is set
            if number.webhook_verify_token:
                if not signature:
                    logger.error("Missing X-Hub-Signature-256 header")
                    raise HTTPException(status_code=403, detail="Forbidden")

                if not verify_whatsapp_signature(
                    signature=signature,
                    body=raw_body,
                    verify_token=number.webhook_verify_token
                ):
                    logger.error("Invalid webhook signature")
                    raise HTTPException(status_code=403, detail="Forbidden")

            # Process webhook
            from app.services.whatsapp_service import WhatsAppService
            service = WhatsAppService(db)
            await service.process_webhook(body, number.id, number.organization_id)

        # Always return 200 OK to Meta
        return {"status": "ok"}

    except HTTPException:
        # Re-raise HTTP exceptions (403 Forbidden)
        raise

    except Exception as e:
        # Log error but still return 200 to prevent Meta from retrying
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}


# ============= WhatsApp Number Endpoints =============


@router.get("/{number_id}", response_model=WhatsAppNumber)
async def get_whatsapp_number(
    number_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get WhatsApp number by ID"""
    service = WhatsAppService(db)
    return await service.get_by_id(
        number_id=number_id,
        organization_id=current_user.organization_id,
    )


@router.put("/{number_id}", response_model=WhatsAppNumber)
async def update_whatsapp_number(
    number_id: UUID,
    data: WhatsAppNumberUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update WhatsApp number"""
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
    Test WhatsApp connection status.
    
    Returns:
    - For Official API: Tests Meta API connection
    - For Evolution API: Tests Evolution connection and retrieves connection status
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
    """Delete WhatsApp number"""
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
    Generate QR Code for WhatsApp connection via Evolution API.
    Only works for numbers with connection_type='qrcode'.
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
    Check QR Code status and get updated QR Code if still pending.
    Used for polling during connection process.
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
    List message templates from Meta for a WhatsApp number.
    Only works for Official API (connection_type='official').

    Query params:
    - status: Filter by status (APPROVED, PENDING, REJECTED). Default: APPROVED
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
    Create a new WhatsApp template

    Args:
        number_id: WhatsApp number ID
        data: Template data (name, language, category, components)
        submit: Whether to submit to Meta immediately (default: True)

    Returns:
        Created template with status DRAFT or PENDING

    Notes:
        - Template names must be lowercase with underscores
        - If submit=True, template is sent to Meta for approval
        - Meta takes 24-48h to review templates
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
    List templates from local database

    Query params:
        - status: Filter by status (DRAFT, PENDING, APPROVED, REJECTED)
        - skip: Number of records to skip
        - limit: Number of records to return
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
    """Get template by ID"""
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
    Delete template

    Query params:
        - delete_from_meta: If true, also deletes from Meta (irreversible)
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
