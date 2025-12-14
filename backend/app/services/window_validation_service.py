"""
WindowValidationService - Business logic for WhatsApp 24-hour message window validation.

This service enforces WhatsApp's 24-hour message window rule:
- Free-form messages can only be sent within 24 hours of the last customer message
- Outside the 24-hour window, a template message must be used
- Customer messages reset/extend the window
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.conversation_window import ConversationWindowRepository
from app.repositories.conversation import ConversationRepository
from app.models.conversation import Conversation
from app.models.conversation_window import ConversationWindow


class WindowStatus(str, Enum):
    """Status of a conversation's message window."""

    ACTIVE = "active"  # Within 24h window, free messages allowed
    EXPIRED = "expired"  # Outside 24h window, template required
    UNKNOWN = "unknown"  # No window data


class MessageValidationResult:
    """Result of message validation against 24h window."""

    def __init__(
        self,
        is_valid: bool,
        reason: str,
        window_status: WindowStatus,
        hours_remaining: float = 0,
        template_required: bool = False,
    ):
        self.is_valid = is_valid
        self.reason = reason
        self.window_status = window_status
        self.hours_remaining = hours_remaining
        self.template_required = template_required

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "is_valid": self.is_valid,
            "reason": self.reason,
            "window_status": self.window_status.value,
            "hours_remaining": self.hours_remaining,
            "template_required": self.template_required,
        }


class WindowValidationService:
    """Service for validating WhatsApp message windows."""

    def __init__(self, db: AsyncSession):
        """Initialize with database session."""
        self.db = db
        self.window_repo = ConversationWindowRepository(db)
        self.conversation_repo = ConversationRepository(db)

    async def get_window_status(
        self, conversation_id: UUID, organization_id: UUID
    ) -> tuple[WindowStatus, ConversationWindow]:
        """
        Get the status of a conversation's 24-hour window.
        
        Args:
            conversation_id: ID of the conversation
            organization_id: ID of the organization (multi-tenancy)
        
        Returns:
            Tuple of (WindowStatus, ConversationWindow)
        """
        window = await self.window_repo.get_by_conversation_id(
            conversation_id, organization_id
        )
        
        if not window:
            return WindowStatus.UNKNOWN, None

        if window.is_within_window:
            return WindowStatus.ACTIVE, window
        else:
            return WindowStatus.EXPIRED, window

    async def can_send_free_message(
        self, conversation_id: UUID, organization_id: UUID
    ) -> bool:
        """
        Check if a free-form message can be sent.
        
        Free messages are allowed only within the 24-hour window.
        
        Args:
            conversation_id: ID of the conversation
            organization_id: ID of the organization (multi-tenancy)
        
        Returns:
            True if free message can be sent, False if template required
        """
        status, window = await self.get_window_status(conversation_id, organization_id)
        return status == WindowStatus.ACTIVE

    async def can_send_template_message(
        self, conversation_id: UUID, organization_id: UUID, template: Optional[dict] = None
    ) -> bool:
        """
        Check if a template message can be sent.
        
        Template messages can be sent anytime, but the template must be approved.
        
        Args:
            conversation_id: ID of the conversation
            organization_id: ID of the organization (multi-tenancy)
            template: Optional template dict to validate (must have 'status' key)
        
        Returns:
            True if template message can be sent, False otherwise
        """
        # Template messages can be sent anytime if template is provided and approved
        if template and template.get("status") == "approved":
            return True
        
        # Can send template message anytime if within window
        status, _ = await self.get_window_status(conversation_id, organization_id)
        return status == WindowStatus.ACTIVE

    async def validate_message_before_send(
        self,
        conversation_id: UUID,
        organization_id: UUID,
        is_template_message: bool = False,
        template: Optional[dict] = None,
    ) -> MessageValidationResult:
        """
        Validate a message before sending.
        
        Rules:
        - Free messages: Must be within 24h window
        - Template messages: Can be sent anytime if template is approved
        
        Args:
            conversation_id: ID of the conversation
            organization_id: ID of the organization (multi-tenancy)
            is_template_message: Whether this is a template message
            template: Template dict (if template message, must have 'status' key)
        
        Returns:
            MessageValidationResult with validation status
        """
        status, window = await self.get_window_status(conversation_id, organization_id)

        # No window data found
        if status == WindowStatus.UNKNOWN:
            return MessageValidationResult(
                is_valid=False,
                reason="No conversation window found",
                window_status=WindowStatus.UNKNOWN,
                template_required=True,
            )

        # Template message
        if is_template_message:
            if template and template.get("status") == "approved":
                return MessageValidationResult(
                    is_valid=True,
                    reason="Template message with approved template",
                    window_status=status,
                    hours_remaining=window.hours_remaining if window else 0,
                )
            else:
                return MessageValidationResult(
                    is_valid=False,
                    reason="Template message requires approved template",
                    window_status=status,
                    template_required=True,
                )

        # Free message
        if status == WindowStatus.ACTIVE:
            return MessageValidationResult(
                is_valid=True,
                reason="Message within 24-hour window",
                window_status=status,
                hours_remaining=window.hours_remaining if window else 0,
            )
        else:
            return MessageValidationResult(
                is_valid=False,
                reason="Message outside 24-hour window - template required",
                window_status=status,
                hours_remaining=0,
                template_required=True,
            )

    async def reset_window_on_customer_message(
        self, conversation_id: UUID, organization_id: UUID
    ) -> ConversationWindow:
        """
        Reset/extend the 24-hour window when customer sends a message.
        
        This is called from the webhook when an incoming customer message is received.
        
        Args:
            conversation_id: ID of the conversation
            organization_id: ID of the organization (multi-tenancy)
        
        Returns:
            Updated ConversationWindow
        """
        # Get or create window
        window = await self.window_repo.get_by_conversation_id(
            conversation_id, organization_id
        )
        
        if not window:
            # Create new window if it doesn't exist
            window = await self.window_repo.create(
                conversation_id=conversation_id,
                organization_id=organization_id,
            )
        else:
            # Reset existing window
            window = await self.window_repo.reset_window(window.id, organization_id)

        # Also update the conversation's last_user_message_at timestamp
        conversation = await self.conversation_repo.get_by_id(conversation_id)
        if conversation and conversation.organization_id == organization_id:
            conversation.update_user_message_window()

        return window

    async def check_and_close_expired_windows(
        self, organization_id: UUID
    ) -> int:
        """
        Check and close all expired windows for an organization.
        
        This can be called periodically by a background job.
        
        Args:
            organization_id: ID of the organization
        
        Returns:
            Number of windows closed
        """
        return await self.window_repo.close_expired_windows(organization_id)

    async def extend_window_manually(
        self, conversation_id: UUID, organization_id: UUID, hours: int = 24
    ) -> MessageValidationResult:
        """
        Manually extend a conversation's window (admin override).
        
        Args:
            conversation_id: ID of the conversation
            organization_id: ID of the organization (multi-tenancy)
            hours: Number of hours to extend
        
        Returns:
            MessageValidationResult with new window status
        """
        window = await self.window_repo.get_by_conversation_id(
            conversation_id, organization_id
        )
        
        if not window:
            return MessageValidationResult(
                is_valid=False,
                reason="No conversation window found",
                window_status=WindowStatus.UNKNOWN,
            )

        updated_window = await self.window_repo.extend_window(
            window.id, organization_id, hours
        )

        return MessageValidationResult(
            is_valid=True,
            reason=f"Window manually extended by {hours} hours",
            window_status=WindowStatus.ACTIVE,
            hours_remaining=updated_window.hours_remaining if updated_window else 0,
        )

    async def get_window_info(
        self, conversation_id: UUID, organization_id: UUID
    ) -> dict:
        """
        Get detailed window information for a conversation.
        
        Args:
            conversation_id: ID of the conversation
            organization_id: ID of the organization (multi-tenancy)
        
        Returns:
            Dictionary with window information
        """
        status, window = await self.get_window_status(conversation_id, organization_id)

        if not window:
            return {
                "window_status": status.value,
                "is_within_window": False,
                "hours_remaining": 0,
                "minutes_remaining": 0,
                "error": "No window found",
            }

        return {
            "window_status": status.value,
            "is_within_window": window.is_within_window,
            "started_at": window.started_at.isoformat() if window.started_at else None,
            "ends_at": window.ends_at.isoformat() if window.ends_at else None,
            "hours_remaining": window.hours_remaining,
            "minutes_remaining": window.minutes_remaining,
            "time_until_expiry": window.time_until_expiry,
            "window_id": str(window.id),
        }
