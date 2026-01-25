"""
SQLAlchemy Models
Import all models here for Alembic to detect them
"""

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.organization import Organization
from app.models.user import RefreshToken, User
from app.models.role import Role, Permission, RolePermission
from app.models.whatsapp_number import WhatsAppNumber, WhatsAppTemplate
from app.models.chatbot import Chatbot, Flow, Node
from app.models.contact import Contact, Tag
from app.models.conversation import Conversation, Message
from app.models.department import Department
from app.models.queue import Queue
from app.models.campaign import Campaign
from app.models.ai_custom_model import AICustomModel
from app.models.agent_skill import AgentSkill
from app.models.flow_automation import (
    FlowAutomation,
    FlowAutomationExecution,
    FlowAutomationRecipient,
    FlowAutomationSchedule,
    FlowAutomationScheduleException,
)
from app.models.conversation_state import ConversationState
from app.models.conversation_log import ConversationLog
from app.models.conversation_window import ConversationWindow
from app.models.alert import Alert
from app.models.alert_notification import AlertNotification
from app.models.oauth_sso import OAuthProvider, UserIdentity, SSOAuditLog
from app.models.mfa import MFAMethod, MFAChallenge, MFABackupCode
from app.models.passkey import PasskeyCredential, PasskeyChallenge

__all__ = [
    "Base",
    "TimestampMixin",
    "SoftDeleteMixin",
    "Organization",
    "User",
    "RefreshToken",
    "Role",
    "Permission",
    "RolePermission",
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
    "AgentSkill",
    "FlowAutomation",
    "FlowAutomationExecution",
    "FlowAutomationRecipient",
    "FlowAutomationSchedule",
    "FlowAutomationScheduleException",
    "ConversationState",
    "ConversationLog",
    "ConversationWindow",
    "Alert",
    "AlertNotification",
    "OAuthProvider",
    "UserIdentity",
    "SSOAuditLog",
    "MFAMethod",
    "MFAChallenge",
    "MFABackupCode",
    "PasskeyCredential",
    "PasskeyChallenge",
]
