"""
WhatsApp Service
"""

from typing import List, Dict, Any, Optional
from uuid import UUID
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.whatsapp_number import WhatsAppNumber
from app.repositories.whatsapp import WhatsAppNumberRepository
from app.schemas.whatsapp import WhatsAppNumberCreate, WhatsAppNumberUpdate, ConnectionType
from app.core.exceptions import ConflictException, NotFoundException
from app.integrations.evolution_api import EvolutionAPIClient, generate_instance_name, EvolutionAPIError

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Service for WhatsApp number management"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = WhatsAppNumberRepository(db)

    async def get_by_id(
        self, number_id: UUID, organization_id: UUID
    ) -> WhatsAppNumber:
        """Get WhatsApp number by ID"""
        number = await self.repo.get(number_id)
        if not number or number.organization_id != organization_id:
            raise NotFoundException("WhatsApp number not found")
        return number

    async def list_numbers(self, organization_id: UUID) -> List[WhatsAppNumber]:
        """List all WhatsApp numbers"""
        return await self.repo.get_by_organization(organization_id)

    async def create_number(
        self, data: WhatsAppNumberCreate, organization_id: UUID
    ) -> WhatsAppNumber:
        """Register a new WhatsApp number"""
        # Check if phone already exists
        existing = await self.repo.get_by_phone(data.phone_number, organization_id)
        if existing:
            raise ConflictException("Phone number already registered")

        number_data = data.model_dump()
        number_data["organization_id"] = organization_id
        number_data["status"] = "disconnected"
        number_data["is_active"] = True

        return await self.repo.create(number_data)

    async def update_number(
        self, number_id: UUID, data: WhatsAppNumberUpdate, organization_id: UUID
    ) -> WhatsAppNumber:
        """Update WhatsApp number"""
        number = await self.get_by_id(number_id, organization_id)
        update_data = data.model_dump(exclude_unset=True)
        return await self.repo.update(number_id, update_data)

    async def delete_number(
        self, number_id: UUID, organization_id: UUID
    ) -> bool:
        """Delete WhatsApp number"""
        number = await self.get_by_id(number_id, organization_id)
        return await self.repo.delete(number_id)

    # ============= Webhook Methods =============

    async def verify_webhook_token(self, token: str) -> bool:
        """
        Verify if the webhook token matches any WhatsApp number in database.
        Used during Meta webhook verification.
        """
        try:
            stmt = select(WhatsAppNumber).where(
                WhatsAppNumber.webhook_verify_token == token,
                WhatsAppNumber.is_deleted == False,
            )
            result = await self.db.execute(stmt)
            number = result.scalar_one_or_none()
            return number is not None
        except Exception as e:
            logger.error(f"Error verifying webhook token: {e}")
            return False

    async def process_webhook(self, payload: Dict[str, Any]) -> None:
        """
        Process incoming webhook from Meta Cloud API.

        Payload structure from Meta:
        {
          "object": "whatsapp_business_account",
          "entry": [{
            "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
            "changes": [{
              "value": {
                "messaging_product": "whatsapp",
                "metadata": {
                  "display_phone_number": "15550000000",
                  "phone_number_id": "123456789"
                },
                "messages": [...],  # Incoming messages
                "statuses": [...]   # Status updates
              },
              "field": "messages"
            }]
          }]
        }
        """
        try:
            logger.info(f"Processing webhook payload: {payload}")

            # Extract entries
            entries = payload.get("entry", [])

            for entry in entries:
                changes = entry.get("changes", [])

                for change in changes:
                    field = change.get("field")
                    value = change.get("value", {})

                    # Get phone number ID to identify which number received the message
                    metadata = value.get("metadata", {})
                    phone_number_id = metadata.get("phone_number_id")

                    if not phone_number_id:
                        logger.warning("No phone_number_id in webhook payload")
                        continue

                    # Get WhatsApp number from database
                    stmt = select(WhatsAppNumber).where(
                        WhatsAppNumber.phone_number_id == phone_number_id
                    )
                    result = await self.db.execute(stmt)
                    whatsapp_number = result.scalar_one_or_none()

                    if not whatsapp_number:
                        logger.warning(f"WhatsApp number not found for phone_number_id: {phone_number_id}")
                        continue

                    # Process messages
                    if field == "messages":
                        messages = value.get("messages", [])
                        for message in messages:
                            await self._process_incoming_message(message, whatsapp_number)

                        # Process statuses
                        statuses = value.get("statuses", [])
                        for status in statuses:
                            await self._process_message_status(status, whatsapp_number)

            await self.db.commit()

        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            await self.db.rollback()
            raise

    async def _process_incoming_message(
        self, message: Dict[str, Any], whatsapp_number: WhatsAppNumber
    ) -> None:
        """Process an incoming message"""
        # TODO: Implement message processing
        # - Create/get contact
        # - Create/get conversation
        # - Store message
        # - Trigger chatbot if configured
        # - Send to queue if needed
        logger.info(f"Processing incoming message: {message.get('id')} for number {whatsapp_number.phone_number}")
        pass

    async def _process_message_status(
        self, status: Dict[str, Any], whatsapp_number: WhatsAppNumber
    ) -> None:
        """Process message status update"""
        # TODO: Implement status update
        # - Update message status in database
        # - Send real-time update to frontend via WebSocket
        logger.info(f"Processing status update: {status.get('id')} - {status.get('status')}")
        pass

    # ============= Evolution API Methods =============

    async def generate_qrcode(self, whatsapp_number: WhatsAppNumber) -> Dict[str, Any]:
        """
        Generate QR Code for Evolution API connection

        Args:
            whatsapp_number: WhatsApp number instance (must be type 'qrcode')

        Returns:
            Dict with qr_code (base64) and status
        """
        if whatsapp_number.connection_type != "qrcode":
            raise ValueError("QR Code only available for Evolution API connections")

        if not whatsapp_number.evolution_api_url or not whatsapp_number.evolution_api_key:
            raise ValueError("Evolution API credentials not configured")

        # Initialize Evolution API client
        evolution = EvolutionAPIClient(
            api_url=whatsapp_number.evolution_api_url,
            api_key=whatsapp_number.evolution_api_key
        )

        # Generate instance name if not exists
        if not whatsapp_number.evolution_instance_name:
            instance_name = generate_instance_name(
                str(whatsapp_number.organization_id),
                whatsapp_number.phone_number
            )

            # Create instance in Evolution API
            webhook_url = whatsapp_number.webhook_url or f"{whatsapp_number.webhook_url}/api/v1/whatsapp/webhook/evolution"

            try:
                await evolution.create_instance(
                    instance_name=instance_name,
                    webhook_url=webhook_url,
                )

                # Update database with instance name
                await self.repo.update(
                    whatsapp_number.id,
                    {"evolution_instance_name": instance_name}
                )
                whatsapp_number.evolution_instance_name = instance_name

            except EvolutionAPIError as e:
                logger.error(f"Failed to create Evolution instance: {e}")
                raise

        # Connect and get QR Code
        try:
            await evolution.connect_instance(whatsapp_number.evolution_instance_name)

            # Get QR Code
            qr_code = await evolution.get_qrcode(whatsapp_number.evolution_instance_name)

            if not qr_code:
                # Check if already connected
                status_data = await evolution.get_instance_status(
                    whatsapp_number.evolution_instance_name
                )
                state = status_data.get("state", "")

                if state == "open":
                    # Already connected
                    await self.repo.update(
                        whatsapp_number.id,
                        {
                            "status": "connected",
                            "connected_at": "now()",
                        }
                    )

                    return {
                        "qr_code": None,
                        "status": "connected",
                        "message": "Número já conectado!"
                    }

                return {
                    "qr_code": None,
                    "status": "pending",
                    "message": "Aguardando QR Code..."
                }

            return {
                "qr_code": qr_code,
                "status": "pending",
                "message": "Escaneie o QR Code com seu WhatsApp"
            }

        except EvolutionAPIError as e:
            logger.error(f"Failed to generate QR Code: {e}")
            raise

    async def get_qrcode_status(self, whatsapp_number: WhatsAppNumber) -> Dict[str, Any]:
        """
        Check QR Code connection status

        Args:
            whatsapp_number: WhatsApp number instance

        Returns:
            Dict with current status and QR Code if available
        """
        if whatsapp_number.connection_type != "qrcode":
            raise ValueError("QR Code status only available for Evolution API connections")

        if not whatsapp_number.evolution_instance_name:
            return {
                "qr_code": None,
                "status": "not_created",
                "message": "Instância não criada. Gere o QR Code primeiro."
            }

        # Initialize Evolution API client
        evolution = EvolutionAPIClient(
            api_url=whatsapp_number.evolution_api_url,
            api_key=whatsapp_number.evolution_api_key
        )

        try:
            # Get instance status
            status_data = await evolution.get_instance_status(
                whatsapp_number.evolution_instance_name
            )

            state = status_data.get("state", "close")

            if state == "open":
                # Connected!
                await self.repo.update(
                    whatsapp_number.id,
                    {
                        "status": "connected",
                        "connected_at": "now()",
                    }
                )

                return {
                    "qr_code": None,
                    "status": "connected",
                    "message": "Conectado com sucesso!"
                }

            elif state == "close":
                # Get new QR Code
                qr_code = await evolution.get_qrcode(
                    whatsapp_number.evolution_instance_name
                )

                return {
                    "qr_code": qr_code,
                    "status": "pending",
                    "message": "Escaneie o QR Code com seu WhatsApp"
                }

            else:
                return {
                    "qr_code": None,
                    "status": "connecting",
                    "message": "Conectando..."
                }

        except EvolutionAPIError as e:
            logger.error(f"Failed to get QR Code status: {e}")
            return {
                "qr_code": None,
                "status": "error",
                "message": str(e)
            }

    async def disconnect_number(self, whatsapp_number: WhatsAppNumber) -> bool:
        """
        Disconnect WhatsApp number

        Args:
            whatsapp_number: WhatsApp number instance

        Returns:
            True if disconnected successfully
        """
        if whatsapp_number.connection_type == "qrcode":
            # Evolution API - logout instance
            if not whatsapp_number.evolution_instance_name:
                return True  # Nothing to disconnect

            evolution = EvolutionAPIClient(
                api_url=whatsapp_number.evolution_api_url,
                api_key=whatsapp_number.evolution_api_key
            )

            try:
                await evolution.logout_instance(whatsapp_number.evolution_instance_name)

                # Update database
                await self.repo.update(
                    whatsapp_number.id,
                    {
                        "status": "disconnected",
                        "connected_at": None,
                    }
                )

                return True

            except EvolutionAPIError as e:
                logger.error(f"Failed to disconnect Evolution instance: {e}")
                return False

        else:
            # Official API - just deactivate
            await self.repo.update(
                whatsapp_number.id,
                {
                    "is_active": False,
                    "status": "disconnected",
                }
            )

            return True
