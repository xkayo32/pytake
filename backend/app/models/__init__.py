"""
SQLAlchemy Models
Import all models here for Alembic to detect them
"""

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.organization import Organization
from app.models.user import RefreshToken, User
from app.models.whatsapp_number import WhatsAppNumber, WhatsAppTemplate
from app.models.chatbot import Chatbot, Flow, Node
from app.models.contact import Contact, Tag
from app.models.conversation import Conversation, Message
from app.models.department import Department
from app.models.queue import Queue
from app.models.campaign import Campaign
from app.models.ai_custom_model import AICustomModel
from app.models.flow_automation import (
    FlowAutomation,
    FlowAutomationExecution,
    FlowAutomationRecipient,
)

__all__ = [
    "Base",
    "TimestampMixin",
    "SoftDeleteMixin",
    "Organization",
    "User",
    "RefreshToken",
    "WhatsAppNumber",
    "WhatsAppTemplate",
    "Chatbot",
    "Flow",
    "Node",
    "Contact",
    "Tag",
    "Conversation",
    "Message",
    "Department",
    "Queue",
    "Campaign",
    "AICustomModel",
    "FlowAutomation",
    "FlowAutomationExecution",
    "FlowAutomationRecipient",
]
