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
    """List all WhatsApp numbers"""
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
    """Register a new WhatsApp number"""
    service = WhatsAppService(db)
    return await service.create_number(
        data=data,
        organization_id=current_user.organization_id,
    )


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
    Meta will send a GET request to verify the webhook.

    Query params:
    - hub.mode: should be "subscribe"
    - hub.verify_token: the token we provided in Meta dashboard
    - hub.challenge: random string to echo back

    NOTE: This endpoint is PUBLIC and does not require authentication
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

    This endpoint receives:
    - Incoming messages
    - Message status updates (sent, delivered, read, failed)
    - Customer information updates

    NOTE: This endpoint is PUBLIC and does not require authentication
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
                    metadata = changes[0].get("value", {}).get("metadata", {})
                    phone_number_id = metadata.get("phone_number_id")
        except Exception as e:
            logger.warning(f"Could not extract phone_number_id from payload: {e}")

        # Verify signature if we have phone_number_id
        if phone_number_id:
            from app.core.database import async_session

            async with async_session() as db:
                # Get WhatsApp number to retrieve app_secret
                stmt = select(WhatsAppNumber).where(
                    WhatsAppNumber.phone_number_id == phone_number_id
                )
                result = await db.execute(stmt)
                whatsapp_number = result.scalar_one_or_none()

                if whatsapp_number and whatsapp_number.app_secret:
                    if not signature:
                        logger.error("❌ Missing X-Hub-Signature-256 header")
                        raise HTTPException(
                            status_code=403,
                            detail="Missing X-Hub-Signature-256 header"
                        )

                    # Verify signature
                    is_valid = verify_whatsapp_signature(
                        payload=raw_body,
                        signature=signature,
                        app_secret=whatsapp_number.app_secret
                    )

                    if not is_valid:
                        logger.error(f"❌ Invalid webhook signature for {whatsapp_number.phone_number}")
                        raise HTTPException(
                            status_code=403,
                            detail="Invalid webhook signature"
                        )

                    logger.info(f"✅ Webhook signature verified for {whatsapp_number.phone_number}")
                elif whatsapp_number:
                    logger.warning(
                        f"⚠️ Webhook signature verification skipped for {whatsapp_number.phone_number} "
                        f"- no app_secret configured"
                    )

        # Process webhook manually (without dependency injection)
        from app.core.database import async_session

        async with async_session() as db:
            service = WhatsAppService(db)
            await service.process_webhook(body)

        # Always return 200 OK to Meta
        return {"status": "ok"}

    except HTTPException:
        # Re-raise HTTP exceptions (403 Forbidden)
        raise

    except Exception as e:
        # Log error but still return 200 to prevent Meta from retrying
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}


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
