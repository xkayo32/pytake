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


@router.get("/webhook", response_class=PlainTextResponse)
async def verify_webhook(
    request: Request,
    mode: str = Query(None, alias="hub.mode"),
    token: str = Query(None, alias="hub.verify_token"),
    challenge: str = Query(None, alias="hub.challenge"),
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook verification endpoint for Meta Cloud API.
    Meta will send a GET request to verify the webhook.

    Query params:
    - hub.mode: should be "subscribe"
    - hub.verify_token: the token we provided in Meta dashboard
    - hub.challenge: random string to echo back
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

    # Verify token against database
    service = WhatsAppService(db)
    is_valid = await service.verify_webhook_token(token)

    if not is_valid:
        raise HTTPException(
            status_code=403,
            detail="Invalid verify token"
        )

    # Return challenge to complete verification
    return challenge


@router.post("/webhook")
async def receive_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook endpoint for receiving WhatsApp messages and events from Meta Cloud API.

    This endpoint receives:
    - Incoming messages
    - Message status updates (sent, delivered, read, failed)
    - Customer information updates
    """
    try:
        # Get request body
        body = await request.json()

        # TODO: Verify webhook signature (X-Hub-Signature-256 header)
        # signature = request.headers.get("X-Hub-Signature-256")

        # Process webhook
        service = WhatsAppService(db)
        await service.process_webhook(body)

        # Always return 200 OK to Meta
        return {"status": "ok"}

    except Exception as e:
        # Log error but still return 200 to prevent Meta from retrying
        # We'll implement proper error handling and logging later
        print(f"Webhook error: {e}")
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
