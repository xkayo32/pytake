"""
WhatsApp Number Endpoints

Provides complete management for WhatsApp Business integration:
- WhatsApp number registration (Official API and Evolution API)
- Webhook handling for Meta Cloud API
- QR Code connection for Evolution API
- Template management and synchronization
- Message sending capabilities

All endpoints require authentication except webhooks which are public.
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

router = APIRouter(tags=["WhatsApp"])


# ============= Request/Response Schemas =============

class QRCodeResponse(BaseModel):
    """QR Code response for Evolution API"""
    qr_code: Optional[str] = None
    status: str  # "pending", "connected", "disconnected"
    message: str


@router.get(
    "/",
    response_model=List[WhatsAppNumber],
    summary="List WhatsApp numbers",
    description="List all WhatsApp numbers registered for the organization",
    responses={
        200: {"description": "List of WhatsApp numbers"},
        401: {"description": "Not authenticated"},
    },
)
async def list_whatsapp_numbers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all WhatsApp numbers for the organization."""
    service = WhatsAppService(db)
    return await service.list_numbers(
        organization_id=current_user.organization_id
    )


@router.post(
    "/",
    response_model=WhatsAppNumber,
    status_code=status.HTTP_201_CREATED,
    summary="Register WhatsApp number",
    description="Register a new WhatsApp number (Official API or Evolution API)",
    responses={
        201: {"description": "WhatsApp number registered"},
        401: {"description": "Not authenticated"},
        403: {"description": "Requires admin role"},
        422: {"description": "Validation error"},
    },
)
async def create_whatsapp_number(
    data: WhatsAppNumberCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Register a new WhatsApp number."""
    service = WhatsAppService(db)
    return await service.create_number(
        data=data,
        organization_id=current_user.organization_id,
    )


# ============= Webhook Endpoints (Meta Cloud API) =============


@router.get(
    "/webhook",
    response_class=PlainTextResponse,
    dependencies=[],
    summary="Verify webhook (Meta)",
    description="PUBLIC endpoint for Meta Cloud API webhook verification. Returns hub.challenge on success.",
    responses={
        200: {"description": "Challenge echoed back"},
        400: {"description": "Missing parameters"},
        403: {"description": "Invalid verify token"},
    },
)
async def verify_webhook(
    request: Request,
    mode: str = Query(None, alias="hub.mode"),
    token: str = Query(None, alias="hub.verify_token"),
    challenge: str = Query(None, alias="hub.challenge"),
):
    """Webhook verification endpoint for Meta Cloud API (PUBLIC)."""
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


@router.post(
    "/webhook",
    dependencies=[],
    summary="Receive webhook (Meta)",
    description="PUBLIC endpoint for receiving WhatsApp events from Meta Cloud API",
    responses={
        200: {"description": "Webhook processed"},
        403: {"description": "Invalid signature"},
    },
)
async def receive_webhook(
    request: Request,
):
    """Webhook endpoint for receiving WhatsApp messages and events (PUBLIC)."""
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


@router.get(
    "/{number_id}",
    response_model=WhatsAppNumber,
    summary="Get WhatsApp number",
    description="Get a specific WhatsApp number by its ID",
    responses={
        200: {"description": "WhatsApp number details"},
        401: {"description": "Not authenticated"},
        404: {"description": "Number not found"},
    },
)
async def get_whatsapp_number(
    number_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get WhatsApp number by ID."""
    service = WhatsAppService(db)
    return await service.get_by_id(
        number_id=number_id,
        organization_id=current_user.organization_id,
    )


@router.put(
    "/{number_id}",
    response_model=WhatsAppNumber,
    summary="Update WhatsApp number",
    description="Update WhatsApp number configuration",
    responses={
        200: {"description": "Number updated"},
        401: {"description": "Not authenticated"},
        403: {"description": "Requires admin role"},
        404: {"description": "Number not found"},
    },
)
async def update_whatsapp_number(
    number_id: UUID,
    data: WhatsAppNumberUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update WhatsApp number."""
    service = WhatsAppService(db)
    return await service.update_number(
        number_id=number_id,
        data=data,
        organization_id=current_user.organization_id,
    )


@router.post(
    "/{number_id}/test",
    summary="Test connection",
    description="Test WhatsApp connection status for Official or Evolution API",
    responses={
        200: {"description": "Connection status"},
        401: {"description": "Not authenticated"},
        404: {"description": "Number not found"},
    },
)
async def test_whatsapp_connection(
    number_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Test WhatsApp connection status."""
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


@router.delete(
    "/{number_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete WhatsApp number",
    description="Soft delete a WhatsApp number",
    responses={
        204: {"description": "Number deleted"},
        401: {"description": "Not authenticated"},
        403: {"description": "Requires admin role"},
        404: {"description": "Number not found"},
    },
)
async def delete_whatsapp_number(
    number_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete WhatsApp number."""
    service = WhatsAppService(db)
    await service.delete_number(
        number_id=number_id,
        organization_id=current_user.organization_id,
    )
    return None


# ============= Evolution API Endpoints (QR Code) =============


@router.post(
    "/{number_id}/qrcode",
    response_model=QRCodeResponse,
    summary="Generate QR Code",
    description="Generate QR Code for Evolution API connection. Only for qrcode connection type.",
    responses={
        200: {"description": "QR Code generated"},
        400: {"description": "Invalid connection type"},
        401: {"description": "Not authenticated"},
        403: {"description": "Requires admin role"},
        404: {"description": "Number not found"},
    },
)
async def generate_qrcode(
    number_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Generate QR Code for WhatsApp connection via Evolution API."""
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


@router.get(
    "/{number_id}/qrcode/status",
    response_model=QRCodeResponse,
    summary="Check QR Code status",
    description="Check QR Code connection status. Use for polling during connection.",
    responses={
        200: {"description": "QR Code status"},
        400: {"description": "Invalid connection type"},
        401: {"description": "Not authenticated"},
        404: {"description": "Number not found"},
    },
)
async def get_qrcode_status(
    number_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check QR Code status for polling."""
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


@router.post(
    "/{number_id}/disconnect",
    summary="Disconnect number",
    description="Disconnect WhatsApp number. Logout from Evolution or deactivate Official API.",
    responses={
        200: {"description": "Disconnected successfully"},
        401: {"description": "Not authenticated"},
        403: {"description": "Requires admin role"},
        404: {"description": "Number not found"},
    },
)
async def disconnect_number(
    number_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect WhatsApp number."""
    service = WhatsAppService(db)

    # Get WhatsApp number
    number = await service.get_by_id(number_id, current_user.organization_id)

    # Disconnect based on type
    await service.disconnect_number(number)

    return {"status": "success", "message": "Número desconectado com sucesso"}


# ============= Template Endpoints =============


@router.get(
    "/{number_id}/templates",
    response_model=List[Dict[str, Any]],
    summary="List templates (Meta)",
    description="List message templates from Meta. Only for Official API connections.",
    responses={
        200: {"description": "List of templates"},
        400: {"description": "Invalid connection type"},
        401: {"description": "Not authenticated"},
        404: {"description": "Number not found"},
    },
)
async def list_templates(
    number_id: UUID,
    status_filter: Optional[str] = Query("APPROVED", alias="status", description="Filter: APPROVED, PENDING, REJECTED"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List message templates from Meta."""
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


@router.post(
    "/{number_id}/templates",
    response_model=TemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create template",
    description="Create a new WhatsApp message template. Optionally submit to Meta for approval.",
    responses={
        201: {"description": "Template created"},
        400: {"description": "Invalid connection type or missing WABA ID"},
        401: {"description": "Not authenticated"},
        403: {"description": "Requires admin role"},
        422: {"description": "Validation error"},
    },
)
async def create_template(
    number_id: UUID,
    data: TemplateCreateRequest,
    submit: bool = Query(True, description="Submit to Meta immediately"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new WhatsApp template."""
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


@router.get(
    "/{number_id}/templates/local",
    response_model=List[TemplateResponse],
    summary="List local templates",
    description="List templates stored in local database for a WhatsApp number",
    responses={
        200: {"description": "List of local templates"},
        401: {"description": "Not authenticated"},
        404: {"description": "Number not found"},
    },
)
async def list_local_templates(
    number_id: UUID,
    status_filter: Optional[str] = Query(None, alias="status", description="Filter: DRAFT, PENDING, APPROVED, REJECTED"),
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


@router.get(
    "/{number_id}/templates/{template_id}",
    response_model=TemplateResponse,
    summary="Get template",
    description="Get a specific template by ID",
    responses={
        200: {"description": "Template details"},
        401: {"description": "Not authenticated"},
        404: {"description": "Template not found"},
    },
)
async def get_template(
    number_id: UUID,
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get template by ID."""
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


@router.put(
    "/{number_id}/templates/{template_id}",
    response_model=TemplateResponse,
    summary="Update template",
    description="Update local template fields. Content cannot be edited after submission.",
    responses={
        200: {"description": "Template updated"},
        401: {"description": "Not authenticated"},
        403: {"description": "Requires admin role"},
        404: {"description": "Template not found"},
    },
)
async def update_template(
    number_id: UUID,
    template_id: UUID,
    data: TemplateUpdateRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update template (local fields only)."""
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


@router.delete(
    "/{number_id}/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete template",
    description="Delete template. Optionally delete from Meta as well (irreversible).",
    responses={
        204: {"description": "Template deleted"},
        401: {"description": "Not authenticated"},
        403: {"description": "Requires admin role"},
        404: {"description": "Template not found"},
    },
)
async def delete_template(
    number_id: UUID,
    template_id: UUID,
    delete_from_meta: bool = Query(False, description="Also delete from Meta (irreversible)"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete template."""
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


@router.post(
    "/{number_id}/templates/sync",
    response_model=TemplateSyncResponse,
    summary="Sync templates",
    description="Sync templates from Meta API. Creates new and updates existing templates.",
    responses={
        200: {"description": "Sync completed"},
        400: {"description": "Invalid connection type"},
        401: {"description": "Not authenticated"},
        403: {"description": "Requires admin role"},
    },
)
async def sync_templates(
    number_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Sync templates from Meta API."""
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

@router.get(
    "/{number_id}/rate-limit/usage",
    summary="Get rate limit usage",
    description="Get current rate limit usage counters (daily, hourly, minute)",
    responses={
        200: {"description": "Rate limit usage stats"},
        401: {"description": "Not authenticated"},
        404: {"description": "Number not found"},
    },
)
async def get_rate_limit_usage(
    number_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current rate limit usage."""
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


@router.post(
    "/{number_id}/rate-limit/reset",
    summary="Reset rate limit",
    description="Reset rate limit counters for WhatsApp number. Use with caution.",
    responses={
        200: {"description": "Rate limit reset"},
        401: {"description": "Not authenticated"},
        403: {"description": "Requires admin role"},
        404: {"description": "Number not found"},
    },
)
async def reset_rate_limit(
    number_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reset rate limit counters."""
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
