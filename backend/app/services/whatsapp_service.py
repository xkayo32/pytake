
from typing import List, Dict, Any, Optional
from uuid import UUID
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.whatsapp_number import WhatsAppNumber
from app.models.conversation import Message
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

    async def _trigger_chatbot(self, conversation, new_message):
        """
        Inicia o fluxo principal do chatbot para o contato/conversa.
        Busca o main_flow do chatbot ativo, identifica o start_node e envia a primeira mensagem do fluxo.
        """
        from app.services.chatbot_service import ChatbotService
        from app.repositories.chatbot import FlowRepository, NodeRepository
        from app.models.chatbot import Flow, Node
        from app.repositories.conversation import MessageRepository
        from datetime import datetime

        if not conversation.active_chatbot_id:
            logger.warning("Nenhum chatbot ativo para a conversa.")
            return

        chatbot_service = ChatbotService(self.db)
        organization_id = conversation.organization_id
        chatbot_id = conversation.active_chatbot_id

        # Buscar o fluxo principal
        main_flow = await chatbot_service.flow_repo.get_main_flow(chatbot_id, organization_id)
        if not main_flow:
            logger.warning(f"Nenhum fluxo principal encontrado para chatbot {chatbot_id}")
            return

        # Buscar o nó inicial
        start_node = await chatbot_service.node_repo.get_start_node(main_flow.id, organization_id)
        if not start_node:
            logger.warning(f"Nenhum nó inicial encontrado para o fluxo principal {main_flow.id}")
            return

        # Enviar a primeira mensagem do fluxo (se houver conteúdo)
        node_data = start_node.data or {}
        content = node_data.get("content") or node_data.get("question") or node_data.get("text")
        if not content:
            logger.info(f"Nó inicial do fluxo não possui conteúdo para enviar.")
            return

        # Monta mensagem para o contato
        message_repo = MessageRepository(self.db)
        message_data = {
            "organization_id": organization_id,
            "conversation_id": conversation.id,
            "whatsapp_number_id": conversation.whatsapp_number_id,
            "direction": "outbound",
            "sender_type": "bot",
            "message_type": "text",
            "content": {"text": content},
            "status": "pending",
            "sent_at": datetime.utcnow(),
            # Não atribuir whatsapp_message_id para mensagens do bot
        }
        await message_repo.create(message_data)
        await self.db.commit()
        logger.info(f"Mensagem inicial do fluxo enviada para conversa {conversation.id}")

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
                WhatsAppNumber.deleted_at.is_(None),
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
        """
        Process an incoming message from WhatsApp

        Message structure from Meta:
        {
            "from": "5511999999999",  # Contact's WhatsApp ID
            "id": "wamid.xxx",         # WhatsApp message ID
            "timestamp": "1234567890",
            "type": "text",
            "text": {"body": "Hello!"}
        }
        """
        from app.repositories.contact import ContactRepository
        from app.repositories.conversation import ConversationRepository, MessageRepository
        from app.models.conversation import Conversation, Message
        from datetime import datetime, timedelta

        logger.info(f"Processing incoming message: {message.get('id')} for number {whatsapp_number.phone_number}")

        # Extract message data
        whatsapp_contact_id = message.get("from")
        whatsapp_message_id = message.get("id")
        message_type = message.get("type", "text")
        timestamp = message.get("timestamp")

        if not whatsapp_contact_id or not whatsapp_message_id:
            logger.warning("Missing required fields in message")
            return

        # 1. Get or Create Contact
        contact_repo = ContactRepository(self.db)
        contact = await contact_repo.get_by_whatsapp_id(
            whatsapp_id=whatsapp_contact_id,
            organization_id=whatsapp_number.organization_id
        )

        if not contact:
            # Create new contact
            contact_data = {
                "organization_id": whatsapp_number.organization_id,
                "whatsapp_id": whatsapp_contact_id,
                "whatsapp_name": message.get("profile", {}).get("name"),
                "source": "whatsapp",
                "lifecycle_stage": "lead",
                "last_message_received_at": datetime.utcnow(),
            }
            contact = await contact_repo.create(contact_data)
            logger.info(f"Created new contact: {contact.id} for WhatsApp ID: {whatsapp_contact_id}")
        else:
            # Update contact activity
            await contact_repo.update(contact.id, {
                "last_message_received_at": datetime.utcnow(),
                "last_message_at": datetime.utcnow(),
                "total_messages_received": contact.total_messages_received + 1,
            })

        # 2. Get or Create Conversation
        conversation_repo = ConversationRepository(self.db)
        conversations = await conversation_repo.get_by_contact(
            contact_id=contact.id,
            organization_id=whatsapp_number.organization_id,
            status="open"
        )

        if conversations:
            conversation = conversations[0]
        else:
            # Create new conversation
            now = datetime.utcnow()
            window_expires = now + timedelta(hours=24)

            conversation_data = {
                "organization_id": whatsapp_number.organization_id,
                "contact_id": contact.id,
                "whatsapp_number_id": whatsapp_number.id,
                "status": "open",
                "channel": "whatsapp",
                "first_message_at": now,
                "last_message_at": now,
                "last_inbound_message_at": now,
                "window_expires_at": window_expires,
                "is_bot_active": True if whatsapp_number.default_chatbot_id else False,
                "active_chatbot_id": whatsapp_number.default_chatbot_id,
            }
            conversation = await conversation_repo.create(conversation_data)
            logger.info(f"Created new conversation: {conversation.id}")

        # Update conversation
        now = datetime.utcnow()
        await conversation_repo.update(conversation.id, {
            "last_message_at": now,
            "last_message_from_contact_at": now,
            "last_inbound_message_at": now,
            "window_expires_at": now + timedelta(hours=24),
            "messages_from_contact": conversation.messages_from_contact + 1,
            "total_messages": conversation.total_messages + 1,
        })

        # 3. Store Message
        message_repo = MessageRepository(self.db)

        # Check if message already exists (WhatsApp may send duplicate webhooks)
        stmt = select(Message).where(
            Message.whatsapp_message_id == whatsapp_message_id,
            Message.organization_id == whatsapp_number.organization_id,
        )
        result = await self.db.execute(stmt)
        existing_message = result.scalar_one_or_none()

        if existing_message:
            logger.info(f"Message {whatsapp_message_id} already processed. Skipping duplicate.")
            return  # Idempotent - just return without error

        # Extract content based on message type
        content = {}
        if message_type == "text":
            content = {"text": message.get("text", {}).get("body", "")}
        elif message_type == "image":
            content = {"image": message.get("image", {})}
        elif message_type == "video":
            content = {"video": message.get("video", {})}
        elif message_type == "audio":
            content = {"audio": message.get("audio", {})}
        elif message_type == "document":
            content = {"document": message.get("document", {})}
        elif message_type == "location":
            content = {"location": message.get("location", {})}
        else:
            content = message.get(message_type, {})

        message_data = {
            "organization_id": whatsapp_number.organization_id,
            "conversation_id": conversation.id,
            "whatsapp_number_id": whatsapp_number.id,
            "direction": "inbound",
            "sender_type": "contact",
            "whatsapp_message_id": whatsapp_message_id,
            "whatsapp_timestamp": int(timestamp) if timestamp else None,
            "message_type": message_type,
            "content": content,
            "status": "received",
        }

        new_message = await message_repo.create(message_data)
        logger.info(f"Saved message: {new_message.id} (WhatsApp ID: {whatsapp_message_id})")

        # 4. Trigger chatbot se configurado
        if conversation.is_bot_active and conversation.active_chatbot_id:
            await self._trigger_chatbot(conversation, new_message)

        # 5. TODO: Send to queue if needed
        # if not conversation.is_bot_active and not conversation.current_agent_id:
        #     await conversation_repo.update(conversation.id, {"status": "queued"})

        await self.db.commit()

        # Emit WebSocket event for incoming message
        from app.websocket.manager import emit_to_conversation

        message_dict = {
            "id": str(new_message.id),
            "conversation_id": str(conversation.id),
            "direction": new_message.direction,
            "sender_type": new_message.sender_type,
            "message_type": new_message.message_type,
            "content": new_message.content,
            "status": new_message.status,
            "whatsapp_message_id": new_message.whatsapp_message_id,
            "created_at": new_message.created_at.isoformat() if new_message.created_at else None,
        }

        await emit_to_conversation(
            conversation_id=str(conversation.id),
            event="message:new",
            data=message_dict
        )

        logger.info(f"[WebSocket] Emitted message:new for incoming message {new_message.id}")
        logger.info(f"✅ Message processed successfully")

    async def _process_message_status(
        self, status: Dict[str, Any], whatsapp_number: WhatsAppNumber
    ) -> None:
        """
        Process message status update from WhatsApp

        Status structure from Meta:
        {
            "id": "wamid.xxx",         # WhatsApp message ID
            "status": "delivered",      # sent, delivered, read, failed
            "timestamp": "1234567890",
            "recipient_id": "5511999999999",
            "errors": [{               # Only if status is "failed"
                "code": 131047,
                "title": "Re-engagement message"
            }]
        }
        """
        from app.repositories.conversation import MessageRepository
        from datetime import datetime

        whatsapp_message_id = status.get("id")
        message_status = status.get("status")

        if not whatsapp_message_id or not message_status:
            logger.warning("Missing required fields in status update")
            return

        logger.info(f"Processing status update: {whatsapp_message_id} -> {message_status}")

        # Find message by WhatsApp message ID
        message_repo = MessageRepository(self.db)
        stmt = select(Message).where(
            Message.whatsapp_message_id == whatsapp_message_id,
            Message.organization_id == whatsapp_number.organization_id,
        )
        result = await self.db.execute(stmt)
        message = result.scalar_one_or_none()

        if not message:
            logger.warning(f"Message not found for WhatsApp ID: {whatsapp_message_id}")
            return

        # Update message status
        now = datetime.utcnow()
        update_data = {"status": message_status}

        if message_status == "sent":
            update_data["sent_at"] = now
            logger.info(f"✅ Message {message.id} marked as sent")

        elif message_status == "delivered":
            update_data["delivered_at"] = now
            logger.info(f"✅ Message {message.id} marked as delivered")

        elif message_status == "read":
            update_data["read_at"] = now
            logger.info(f"✅ Message {message.id} marked as read")

        elif message_status == "failed":
            update_data["failed_at"] = now

            # Extract error information
            errors = status.get("errors", [])
            if errors:
                error = errors[0]  # Get first error
                update_data["error_code"] = str(error.get("code", "unknown"))
                update_data["error_message"] = error.get("title") or error.get("message", "Unknown error")

            logger.error(
                f"❌ Message {message.id} failed: "
                f"{update_data.get('error_code')} - {update_data.get('error_message')}"
            )

        # Update in database
        await message_repo.update(message.id, update_data)

        # Emit WebSocket event for status update
        from app.websocket.manager import emit_to_conversation
        from datetime import timezone

        await emit_to_conversation(
            conversation_id=str(message.conversation_id),
            event="message:status",
            data={
                "message_id": str(message.id),
                "status": message_status,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

        logger.info(f"[WebSocket] Emitted message:status update for message {message.id}")

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

    # ============= Message Sending Methods =============

    async def send_message(
        self,
        conversation_id: UUID,
        organization_id: UUID,
        message_type: str,
        content: Dict[str, Any],
        sender_user_id: Optional[UUID] = None
    ) -> Message:
        """
        Send a message via WhatsApp

        Args:
            conversation_id: Conversation ID
            organization_id: Organization ID
            message_type: Message type (text, image, document, template)
            content: Message content (depends on type)
            sender_user_id: User ID of sender (agent/bot)

        Returns:
            Created message with whatsapp_message_id

        Raises:
            NotFoundException: If conversation not found
            ValueError: If 24h window expired and no template provided
            MetaAPIError: If API call fails
        """
        from app.repositories.conversation import ConversationRepository, MessageRepository
        from app.repositories.contact import ContactRepository
        from app.integrations.meta_api import MetaCloudAPI, MetaAPIError
        from datetime import datetime

        logger.info(f"Sending {message_type} message to conversation {conversation_id}")

        # 1. Get conversation and validate
        conversation_repo = ConversationRepository(self.db)
        conversation = await conversation_repo.get_with_contact(conversation_id, organization_id)

        if not conversation:
            raise NotFoundException("Conversation not found")

        # 2. Get WhatsApp number
        whatsapp_number = await self.repo.get(conversation.whatsapp_number_id)

        if not whatsapp_number or not whatsapp_number.is_active:
            raise ValueError("WhatsApp number not active")

        # 3. Check if connection is official API
        if whatsapp_number.connection_type != "official":
            raise ValueError("Send message only supported for Meta Cloud API")

        # 4. Validate 24-hour window for non-template messages
        from datetime import timezone
        now = datetime.now(timezone.utc)
        is_within_window = (
            conversation.window_expires_at and
            now < conversation.window_expires_at
        )

        if not is_within_window and message_type != "template":
            logger.warning(
                f"24-hour window expired for conversation {conversation_id}. "
                f"Template message required."
            )
            raise ValueError(
                "24-hour window expired. You must use a template message to re-engage."
            )

        # 5. Create message record with pending status
        message_repo = MessageRepository(self.db)

        # Determine sender type
        if sender_user_id:
            sender_type = "agent"
        else:
            sender_type = "bot" if conversation.is_bot_active else "system"

        message_data = {
            "organization_id": organization_id,
            "conversation_id": conversation_id,
            "whatsapp_number_id": whatsapp_number.id,
            "direction": "outbound",
            "sender_type": sender_type,
            "sender_user_id": sender_user_id,
            "message_type": message_type,
            "content": content,
            "status": "pending",
        }

        message = await message_repo.create(message_data)
        await self.db.commit()

        logger.info(f"Message {message.id} created with status 'pending'")

        # 6. Send via Meta Cloud API
        meta_api = MetaCloudAPI(
            phone_number_id=whatsapp_number.phone_number_id,
            access_token=whatsapp_number.access_token
        )

        try:
            # Get contact WhatsApp ID (remove + if present)
            contact = conversation.contact
            recipient = contact.whatsapp_id.replace("+", "")

            # Send based on message type
            if message_type == "text":
                response = await meta_api.send_text_message(
                    to=recipient,
                    text=content.get("text", ""),
                    preview_url=content.get("preview_url", False)
                )

            elif message_type == "image":
                response = await meta_api.send_image_message(
                    to=recipient,
                    image_url=content.get("url"),
                    caption=content.get("caption")
                )

            elif message_type == "document":
                response = await meta_api.send_document_message(
                    to=recipient,
                    document_url=content.get("url"),
                    filename=content.get("filename"),
                    caption=content.get("caption")
                )

            elif message_type == "template":
                response = await meta_api.send_template_message(
                    to=recipient,
                    template_name=content.get("name"),
                    language_code=content.get("language", "pt_BR"),
                    components=content.get("components")
                )

            else:
                raise ValueError(f"Unsupported message type: {message_type}")

            # 7. Update message with WhatsApp message ID
            whatsapp_message_id = response.get("messages", [{}])[0].get("id")

            if whatsapp_message_id:
                await message_repo.update(message.id, {
                    "whatsapp_message_id": whatsapp_message_id,
                    "status": "sent",
                    "sent_at": datetime.utcnow()
                })

                logger.info(f"✅ Message sent successfully. WhatsApp ID: {whatsapp_message_id}")
            else:
                logger.warning("No message ID returned from Meta API")

            # 8. Update conversation metrics
            await conversation_repo.update(conversation_id, {
                "last_message_at": datetime.utcnow(),
                "last_message_from_agent_at": datetime.utcnow() if sender_type == "agent" else None,
                "messages_from_agent": conversation.messages_from_agent + (1 if sender_type == "agent" else 0),
                "messages_from_bot": conversation.messages_from_bot + (1 if sender_type == "bot" else 0),
                "total_messages": conversation.total_messages + 1,
            })

            await self.db.commit()
            await self.db.refresh(message)

            # Emit WebSocket event for new message
            from app.websocket.manager import emit_to_conversation

            message_dict = {
                "id": str(message.id),
                "conversation_id": str(conversation_id),
                "direction": message.direction,
                "sender_type": message.sender_type,
                "message_type": message.message_type,
                "content": message.content,
                "status": message.status,
                "whatsapp_message_id": message.whatsapp_message_id,
                "created_at": message.created_at.isoformat() if message.created_at else None,
                "sent_at": message.sent_at.isoformat() if message.sent_at else None,
            }

            await emit_to_conversation(
                conversation_id=str(conversation_id),
                event="message:new",
                data=message_dict
            )

            logger.info(f"[WebSocket] Emitted message:new to conversation {conversation_id}")

            return message

        except MetaAPIError as e:
            # Mark message as failed
            await message_repo.update(message.id, {
                "status": "failed",
                "failed_at": datetime.utcnow(),
                "error_code": e.error_code,
                "error_message": e.message
            })
            await self.db.commit()

            logger.error(f"Failed to send message: {e.message}")
            raise

        except Exception as e:
            # Unexpected error
            await message_repo.update(message.id, {
                "status": "failed",
                "failed_at": datetime.utcnow(),
                "error_message": str(e)
            })
            await self.db.commit()

            logger.error(f"Unexpected error sending message: {e}")
            raise
