"""
Conversation Inactivity Timeout Task

Background task that monitors conversations for inactivity and executes configured actions:
- Transfer to agent
- Close conversation
- Send reminder message
- Route to fallback flow
"""

import logging
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from uuid import UUID
from typing import Optional, Dict, Any

from celery import shared_task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.conversation import Conversation
from app.models.chatbot import Flow
from app.repositories.conversation import ConversationRepository
from app.repositories.chatbot import FlowRepository
from app.services.conversation_service import ConversationService
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)
settings = get_settings()

# Timezone de Brasília
BRAZIL_TZ = ZoneInfo("America/Sao_Paulo")

def now_brazil():
    """Retorna datetime atual no timezone de Brasília"""
    return datetime.now(BRAZIL_TZ)


def replace_message_variables(
    message: str,
    timeout_minutes: int,
    warning_at_minutes: Optional[int],
    inactive_minutes: float,
) -> str:
    """
    Replace template variables in message with actual values
    
    Available variables:
    - {{timeout_minutes}} - Total timeout configured
    - {{warning_at_minutes}} - When warning is sent
    - {{inactive_minutes}} - How long user has been inactive
    - {{remaining_minutes}} - Time remaining before timeout
    
    Args:
        message: Template message with {{variables}}
        timeout_minutes: Configured timeout in minutes
        warning_at_minutes: When warning is sent (optional)
        inactive_minutes: Current inactive time in minutes
        
    Returns:
        Message with variables replaced
    """
    if not message:
        return message
    
    # Calculate remaining minutes
    remaining_minutes = max(0, timeout_minutes - int(inactive_minutes))
    
    # Replace variables
    replacements = {
        "{{timeout_minutes}}": str(timeout_minutes),
        "{{warning_at_minutes}}": str(warning_at_minutes) if warning_at_minutes else "N/A",
        "{{inactive_minutes}}": str(int(inactive_minutes)),
        "{{remaining_minutes}}": str(remaining_minutes),
    }
    
    result = message
    for var, value in replacements.items():
        result = result.replace(var, value)
    
    return result


@shared_task(bind=True, name="check_conversation_inactivity")
def check_conversation_inactivity(self):
    """
    Celery task that monitors inactive conversations and executes configured actions.
    
    Runs every CONVERSATION_INACTIVITY_CHECK_INTERVAL_MINUTES (default: 5 minutes)
    
    For each conversation:
    1. Check if last_inbound_message_at > timeout_minutes ago
    2. Load flow's inactivity_settings
    3. Execute configured action (transfer, close, send_reminder, fallback_flow)
    """
    logger.info("🕐 Starting conversation inactivity check task...")
    
    try:
        # Use synchronous wrapper
        import asyncio
        
        # Try to get existing loop, or create new one if none exists
        try:
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(async_check_conversation_inactivity())
        logger.info("✅ Conversation inactivity check completed successfully")
        return {"status": "success", "timestamp": now_brazil().isoformat()}
                
    except Exception as e:
        logger.error(f"❌ Error in conversation inactivity check: {str(e)}", exc_info=True)
        return {"status": "error", "message": str(e), "timestamp": now_brazil().isoformat()}


async def async_check_conversation_inactivity():
    """
    Async implementation of conversation inactivity monitoring
    """
    from app.core.database import AsyncSessionLocal
    
    print("🔄 Starting inactivity check...")
    logger.info("🔄 Starting conversation inactivity check")
    
    # Use the async session from core.database
    async with AsyncSessionLocal() as session:
        # Import ConversationWindow model
        from app.models.conversation_window import ConversationWindow
        
        # Find all active conversations with valid window (within 24h)
        # NOTE: Don't filter by is_bot_active - monitor inactivity even if bot is not responding
        stmt = select(Conversation).join(
            ConversationWindow,
            Conversation.id == ConversationWindow.conversation_id
        ).where(
            Conversation.status.in_(["open", "active"]),
            Conversation.active_flow_id.is_not(None),
            Conversation.deleted_at.is_(None),
            ConversationWindow.ends_at > now_brazil(),  # Window still valid
            ConversationWindow.is_active == True,
        )
        
        result = await session.execute(stmt)
        conversations = result.scalars().all()
        
        print(f"✅ Found {len(conversations)} active conversations with valid window")
        logger.info(f"Found {len(conversations)} active conversations to check for inactivity")
        
        processed = 0
        actions_executed = 0
        
        # Check each conversation
        for conversation in conversations:
            try:
                # Get last inbound message timestamp
                if not conversation.last_inbound_message_at:
                    continue
                
                # Calculate inactivity duration
                now = now_brazil()
                time_since_last_message = now - conversation.last_inbound_message_at
                inactive_minutes = time_since_last_message.total_seconds() / 60
                
                logger.info(
                    f"🔍 Checking conversation {conversation.id}: "
                    f"inactive for {inactive_minutes:.1f} minutes"
                )
                
                # Load flow and its inactivity settings
                flow_repo = FlowRepository(session)
                flow = await flow_repo.get(conversation.active_flow_id)
                
                if not flow:
                    logger.warning(
                        f"Flow {conversation.active_flow_id} not found for conversation {conversation.id}"
                    )
                    continue
                
                # Get inactivity settings (flow override or use global defaults)
                settings_obj = get_settings()
                inactivity_config = {
                    "enabled": True,
                    "timeout_minutes": settings_obj.CONVERSATION_INACTIVITY_TIMEOUT_MINUTES,
                    "send_warning_at_minutes": 1,  # Default: warn at 1 minute for testing
                    "warning_message": None,
                    "action": settings_obj.CONVERSATION_INACTIVITY_DEFAULT_ACTION,
                    "fallback_flow_id": None,
                }
                
                # Override with flow-specific settings if available
                if flow.inactivity_settings:
                    inactivity_config.update(flow.inactivity_settings)
                
                # Skip if inactivity monitoring is disabled for this flow
                if not inactivity_config.get("enabled", True):
                    continue
                
                timeout_minutes = inactivity_config.get("timeout_minutes", 60)
                timeout_seconds = timeout_minutes * 60
                warning_minutes = inactivity_config.get("send_warning_at_minutes")
                
                logger.info(
                    f"📋 Config for conversation {conversation.id}: "
                    f"timeout={timeout_minutes}min, warning={warning_minutes}min, "
                    f"action={inactivity_config.get('action')}"
                )
                
                # Check if should send warning message FIRST (before timeout action)
                if inactivity_config.get("send_warning_at_minutes"):
                    warning_minutes = inactivity_config.get("send_warning_at_minutes")
                    warning_seconds = warning_minutes * 60
                    
                    if (
                        time_since_last_message.total_seconds() >= warning_seconds
                        and time_since_last_message.total_seconds() <= timeout_seconds
                    ):
                        # Check if warning was already sent
                        warning_key = f"_inactivity_warning_sent_{conversation.id}"
                        context_vars = conversation.context_variables or {}
                        
                        if not context_vars.get(warning_key):
                            logger.info(
                                f"⚠️ Sending inactivity warning to conversation {conversation.id}"
                            )
                            
                            # Send warning message with variable replacement
                            warning_msg_template = inactivity_config.get(
                                "warning_message",
                                "Estou aqui esperando sua resposta. Por favor, responda para continuarmos!"
                            )
                            
                            warning_msg = replace_message_variables(
                                warning_msg_template,
                                timeout_minutes=timeout_minutes,
                                warning_at_minutes=inactivity_config.get("send_warning_at_minutes"),
                                inactive_minutes=time_since_last_message.total_seconds() / 60
                            )
                            
                            logger.info(f"🔍 INICIANDO ENVIO DE AVISO para {conversation.id}")
                            
                            try:
                                # Send warning via MetaCloudAPI directly (same pattern as flow/close messages)
                                from app.repositories.whatsapp import WhatsAppNumberRepository
                                from app.repositories.contact import ContactRepository
                                
                                logger.info(f"🔍 [DEBUG 1] Fetching WhatsApp number ID: {conversation.whatsapp_number_id}")
                                
                                whatsapp_repo = WhatsAppNumberRepository(session)
                                whatsapp_number = await whatsapp_repo.get(conversation.whatsapp_number_id)
                                
                                logger.info(f"🔍 [DEBUG 2] WhatsApp number: {whatsapp_number}")
                                if whatsapp_number:
                                    logger.info(f"🔍 [DEBUG 2a] Connection type: {whatsapp_number.connection_type}")
                                    logger.info(f"🔍 [DEBUG 2b] Phone number ID: {whatsapp_number.phone_number_id}")
                                
                                if whatsapp_number and whatsapp_number.connection_type == "official":
                                    logger.info(f"🔍 [DEBUG 3] Fetching contact ID: {conversation.contact_id}")
                                    contact_repo = ContactRepository(session)
                                    contact = await contact_repo.get(conversation.contact_id)
                                    
                                    logger.info(f"🔍 [DEBUG 4] Contact: {contact}")
                                    if contact:
                                        logger.info(f"🔍 [DEBUG 4a] Contact phone: {contact.phone_number}")
                                        logger.info(f"🔍 [DEBUG 4b] Contact whatsapp_id: {contact.whatsapp_id}")
                                    
                                    # Use whatsapp_id if phone_number is not available
                                    phone = contact.phone_number or contact.whatsapp_id
                                    
                                    if contact and phone:
                                        phone = phone.replace("+", "")
                                        logger.info(f"🔍 [DEBUG 5] Phone ready: {phone}")
                                        logger.info(f"🔍 [DEBUG 6] Message text: {warning_msg}")
                                        
                                        # Use MetaCloudAPI directly (same as flow messages)
                                        from app.integrations.meta_api import MetaCloudAPI
                                        
                                        meta_api = MetaCloudAPI(
                                            phone_number_id=whatsapp_number.phone_number_id,
                                            access_token=whatsapp_number.access_token
                                        )
                                        logger.info(f"🔍 [DEBUG 7] MetaCloudAPI created")
                                        
                                        try:
                                            result = await meta_api.send_text_message(to=phone, text=warning_msg)
                                            logger.info(f"🔍 [DEBUG 8] Result from send_text_message: {result}")
                                        except Exception as send_err:
                                            logger.error(f"❌ [DEBUG 8] Error calling send_text_message: {str(send_err)}", exc_info=True)
                                            raise
                                    else:
                                        logger.warning(f"⚠️ [DEBUG] Contact not found or no phone for conversation {conversation.id}")
                                else:
                                    logger.warning(f"⚠️ [DEBUG] WhatsApp number not found or not official for conversation {conversation.id}")
                                
                                # Mark warning as sent
                                context_vars[warning_key] = now_brazil().isoformat()
                                conv_repo = ConversationRepository(session)
                                await conv_repo.update(
                                    conversation.id,
                                    {"context_variables": context_vars}
                                )
                                await session.commit()
                                
                                logger.info(f"✅ Warning message sent to conversation {conversation.id}")
                                actions_executed += 1
                            except Exception as e:
                                logger.error(
                                    f"❌ Failed to send warning message to {conversation.id}: {str(e)}"
                                )
                
                # Check if conversation has exceeded inactivity timeout
                if time_since_last_message.total_seconds() >= timeout_seconds:
                    logger.info(
                        f"⏰ Conversation {conversation.id} inactive for "
                        f"{time_since_last_message.total_seconds() / 60:.1f} minutes "
                        f"(timeout: {timeout_minutes} minutes)"
                    )
                    
                    # Execute configured action
                    action = inactivity_config.get("action", "transfer")
                    executed = await execute_inactivity_action(
                        session=session,
                        conversation=conversation,
                        action=action,
                        config=inactivity_config
                    )
                    
                    if executed:
                        actions_executed += 1
                
                processed += 1
                
            except Exception as e:
                logger.error(
                    f"❌ Error processing conversation {conversation.id}: {str(e)}",
                    exc_info=True
                )
                continue
        
        logger.info(
            f"📊 Inactivity check completed: {processed} conversations checked, "
            f"{actions_executed} actions executed"
        )


async def execute_inactivity_action(
    session: AsyncSession,
    conversation: Conversation,
    action: str,
    config: Dict[str, Any]
) -> bool:
    """
    Execute configured action for inactive conversation
    
    Args:
        session: Database session
        conversation: Conversation object
        action: Action type (transfer, close, send_reminder, fallback_flow)
        config: Inactivity configuration dict
    
    Returns:
        True if action was executed successfully, False otherwise
    """
    try:
        conv_repo = ConversationRepository(session)
        
        # Helper to send message
        async def send_inactivity_message(message_text: str):
            """Send message using WhatsApp service"""
            try:
                whatsapp_service = WhatsAppService(session)
                from app.repositories.whatsapp import WhatsAppNumberRepository
                from app.integrations.meta_api import MetaCloudAPI
                
                # Get WhatsApp number
                whatsapp_repo = WhatsAppNumberRepository(session)
                whatsapp_number = await whatsapp_repo.get(conversation.whatsapp_number_id)
                
                if not whatsapp_number:
                    logger.error(f"WhatsApp number not found for conversation {conversation.id}")
                    return
                
                # Get contact
                from app.repositories.contact import ContactRepository
                contact_repo = ContactRepository(session)
                contact = await contact_repo.get(conversation.contact_id)
                if not contact:
                    logger.error(f"Contact not found for conversation {conversation.id}")
                    return
                
                # Use phone_number or whatsapp_id
                phone = contact.phone_number or contact.whatsapp_id
                
                if not phone:
                    logger.error(f"Contact phone not found for conversation {conversation.id}")
                    return
                
                # Remove + from phone
                phone = phone.replace("+", "")
                
                # Send via Meta API
                if whatsapp_number.connection_type == "official":
                    meta_api = MetaCloudAPI(
                        phone_number_id=whatsapp_number.phone_number_id,
                        access_token=whatsapp_number.access_token
                    )
                    await meta_api.send_text_message(to=phone, text=message_text)
                    logger.info(f"✅ Message sent to conversation {conversation.id}")
                else:
                    logger.warning(f"Connection type {whatsapp_number.connection_type} not supported for inactivity messages")
                    
            except Exception as e:
                logger.error(f"Failed to send error message to conversation {conversation.id}: {e}")
        
        if action == "transfer":
            # Transfer to agent via queue assignment
            logger.info(f"↔️ Transferring conversation {conversation.id} to agent due to inactivity")
            
            # Get default queue for department
            if conversation.department_id:
                from app.repositories.queue import QueueRepository
                queue_repo = QueueRepository(session)
                
                queues = await queue_repo.get_multi_by_department(
                    conversation.department_id,
                    conversation.organization_id
                )
                
                if queues:
                    # Assign to first available queue
                    await conv_repo.update(
                        conversation.id,
                        {
                            "status": "queued",
                            "queue_id": queues[0].id,
                            "queued_at": now_brazil(),
                            "is_bot_active": False,
                        }
                    )
                    await session.commit()
                    
                    # Send notification message
                    await send_inactivity_message(
                        "Você será atendido por um agente em breve. Obrigado pela paciência!"
                    )
                    logger.info(f"✅ Conversation {conversation.id} assigned to queue")
                    return True
        
        elif action == "close":
            # Close conversation
            logger.info(f"🔒 Closing conversation {conversation.id} due to inactivity")
            
            # Calculate inactive time
            now = now_brazil()
            if conversation.last_inbound_message_at:
                inactive_minutes = (now - conversation.last_inbound_message_at).total_seconds() / 60
            else:
                inactive_minutes = config.get("timeout_minutes", 60)
            
            await conv_repo.update(
                conversation.id,
                {
                    "status": "closed",
                    "closed_at": now_brazil(),
                    "is_bot_active": False,
                }
            )
            await session.commit()
            
            # Send closing message with variable replacement
            closing_msg_template = config.get(
                "closing_message",
                "Sua conversa foi encerrada por inatividade. Entre em contato conosco novamente se precisar!"
            )
            
            closing_msg = replace_message_variables(
                closing_msg_template,
                timeout_minutes=config.get("timeout_minutes", 60),
                warning_at_minutes=config.get("send_warning_at_minutes"),
                inactive_minutes=inactive_minutes
            )
            
            await send_inactivity_message(closing_msg)
            logger.info(f"✅ Conversation {conversation.id} closed")
            return True
        
        elif action == "send_reminder":
            # Send reminder message
            logger.info(f"💬 Sending reminder to conversation {conversation.id}")
            
            # Calculate inactive time
            now = now_brazil()
            if conversation.last_inbound_message_at:
                inactive_minutes = (now - conversation.last_inbound_message_at).total_seconds() / 60
            else:
                inactive_minutes = 0
            
            reminder_msg_template = config.get(
                "warning_message",
                "Ainda estou aqui! Qual seria sua próxima pergunta?"
            )
            
            reminder_msg = replace_message_variables(
                reminder_msg_template,
                timeout_minutes=config.get("timeout_minutes", 60),
                warning_at_minutes=config.get("send_warning_at_minutes"),
                inactive_minutes=inactive_minutes
            )
            
            await send_inactivity_message(reminder_msg)
            logger.info(f"✅ Reminder sent to conversation {conversation.id}")
            return True
        
        elif action == "fallback_flow":
            # Route to fallback flow
            fallback_flow_id = config.get("fallback_flow_id")
            
            if not fallback_flow_id:
                logger.warning(
                    f"No fallback_flow_id configured for conversation {conversation.id}"
                )
                return False
            
            logger.info(
                f"🔄 Routing conversation {conversation.id} to fallback flow {fallback_flow_id}"
            )
            
            await conv_repo.update(
                conversation.id,
                {
                    "active_flow_id": fallback_flow_id,
                    "current_node_id": None,
                    "context_variables": {},
                }
            )
            await session.commit()
            
            logger.info(f"✅ Conversation {conversation.id} routed to fallback flow")
            return True
        
        else:
            logger.warning(f"Unknown inactivity action: {action}")
            return False
            
    except Exception as e:
        logger.error(
            f"❌ Failed to execute inactivity action '{action}' for conversation {conversation.id}: {str(e)}",
            exc_info=True
        )
        return False
