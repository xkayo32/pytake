"""
Evolution API Integration

Integration with Evolution API (https://github.com/EvolutionAPI/evolution-api)
for WhatsApp connection via QR Code (Baileys library)
"""

import logging
from typing import Dict, Any, Optional
import httpx
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class EvolutionAPIError(Exception):
    """Evolution API specific exception"""
    pass


class EvolutionAPIClient:
    """
    Client for Evolution API integration

    Based on Evolution API v2 documentation:
    - Instance management
    - QR Code generation
    - Message sending/receiving
    - Webhook configuration
    """

    def __init__(self, api_url: str, api_key: str):
        """
        Initialize Evolution API client

        Args:
            api_url: Base URL of Evolution API (e.g., https://evolution.example.com)
            api_key: Global API key for authentication
        """
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            "apikey": api_key,
            "Content-Type": "application/json"
        }

    async def create_instance(
        self,
        instance_name: str,
        webhook_url: Optional[str] = None,
        webhook_events: Optional[list] = None,
    ) -> Dict[str, Any]:
        """
        Create a new WhatsApp instance

        Args:
            instance_name: Unique instance identifier (e.g., "pytake_org123_num1")
            webhook_url: URL to receive webhooks
            webhook_events: List of events to subscribe (default: all)

        Returns:
            Instance data with connection info
        """
        if not webhook_events:
            webhook_events = [
                "QRCODE_UPDATED",
                "CONNECTION_UPDATE",
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE",
                "SEND_MESSAGE",
            ]

        payload = {
            "instanceName": instance_name,
            "qrcode": True,  # Enable QR Code
            "integration": "WHATSAPP-BAILEYS",  # Use Baileys (WhatsApp Web)
        }

        # Webhook configuration
        if webhook_url:
            payload["webhook"] = {
                "url": webhook_url,
                "webhook_by_events": False,  # Single webhook URL for all events
                "webhook_base64": True,      # Send media as base64
                "events": webhook_events,
            }

        # Settings (defaults)
        payload["settings"] = {
            "reject_call": False,           # Don't auto-reject calls
            "msg_call": "",                 # No auto-reply to calls
            "groups_ignore": True,          # Ignore group messages
            "always_online": False,         # Don't show always online
            "read_messages": False,         # Don't auto-read messages
            "read_status": False,           # Don't auto-read statuses
            "sync_full_history": False,     # Don't sync full history
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_url}/instance/create",
                    json=payload,
                    headers=self.headers
                )
                response.raise_for_status()
                data = response.json()

                logger.info(f"Instance created: {instance_name}")
                return data

        except httpx.HTTPError as e:
            logger.error(f"Error creating instance: {e}")
            raise EvolutionAPIError(f"Failed to create instance: {str(e)}")

    async def connect_instance(self, instance_name: str) -> Dict[str, Any]:
        """
        Connect instance to WhatsApp (generates QR Code)

        Args:
            instance_name: Instance identifier

        Returns:
            Connection data with QR Code (base64)
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.api_url}/instance/connect/{instance_name}",
                    headers=self.headers
                )
                response.raise_for_status()
                data = response.json()

                logger.info(f"Connection initiated for instance: {instance_name}")
                return data

        except httpx.HTTPError as e:
            logger.error(f"Error connecting instance: {e}")
            raise EvolutionAPIError(f"Failed to connect instance: {str(e)}")

    async def get_qrcode(self, instance_name: str) -> Optional[str]:
        """
        Get current QR Code for instance

        Args:
            instance_name: Instance identifier

        Returns:
            QR Code as base64 string or None if not available
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.api_url}/instance/qrcode/{instance_name}",
                    headers=self.headers
                )

                if response.status_code == 404:
                    return None

                response.raise_for_status()
                data = response.json()

                # Evolution API returns: {"qrcode": {"base64": "...", "code": "..."}}
                qr_data = data.get("qrcode", {})
                return qr_data.get("base64")

        except httpx.HTTPError as e:
            logger.warning(f"QR Code not available for {instance_name}: {e}")
            return None

    async def get_instance_status(self, instance_name: str) -> Dict[str, Any]:
        """
        Get instance connection status

        Args:
            instance_name: Instance identifier

        Returns:
            Status data (connected, disconnected, etc)
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.api_url}/instance/connectionState/{instance_name}",
                    headers=self.headers
                )
                response.raise_for_status()
                data = response.json()

                return data

        except httpx.HTTPError as e:
            logger.error(f"Error getting instance status: {e}")
            raise EvolutionAPIError(f"Failed to get instance status: {str(e)}")

    async def delete_instance(self, instance_name: str) -> bool:
        """
        Delete instance

        Args:
            instance_name: Instance identifier

        Returns:
            True if deleted successfully
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{self.api_url}/instance/delete/{instance_name}",
                    headers=self.headers
                )
                response.raise_for_status()

                logger.info(f"Instance deleted: {instance_name}")
                return True

        except httpx.HTTPError as e:
            logger.error(f"Error deleting instance: {e}")
            return False

    async def send_text_message(
        self,
        instance_name: str,
        phone_number: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Send text message via Evolution API

        Args:
            instance_name: Instance identifier
            phone_number: Recipient phone number (with country code, no +)
            message: Text message to send

        Returns:
            Message send result with message ID
        """
        payload = {
            "number": phone_number,
            "text": message,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_url}/message/sendText/{instance_name}",
                    json=payload,
                    headers=self.headers
                )
                response.raise_for_status()
                data = response.json()

                logger.info(f"Message sent via Evolution API to {phone_number}")
                return data

        except httpx.HTTPError as e:
            logger.error(f"Error sending message: {e}")
            raise EvolutionAPIError(f"Failed to send message: {str(e)}")

    async def logout_instance(self, instance_name: str) -> bool:
        """
        Logout from WhatsApp (disconnect but keep instance)

        Args:
            instance_name: Instance identifier

        Returns:
            True if logged out successfully
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{self.api_url}/instance/logout/{instance_name}",
                    headers=self.headers
                )
                response.raise_for_status()

                logger.info(f"Instance logged out: {instance_name}")
                return True

        except httpx.HTTPError as e:
            logger.error(f"Error logging out instance: {e}")
            return False

    async def restart_instance(self, instance_name: str) -> bool:
        """
        Restart instance connection

        Args:
            instance_name: Instance identifier

        Returns:
            True if restarted successfully
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.put(
                    f"{self.api_url}/instance/restart/{instance_name}",
                    headers=self.headers
                )
                response.raise_for_status()

                logger.info(f"Instance restarted: {instance_name}")
                return True

        except httpx.HTTPError as e:
            logger.error(f"Error restarting instance: {e}")
            return False


def generate_instance_name(organization_id: str, phone_number: str) -> str:
    """
    Generate unique instance name for Evolution API

    Args:
        organization_id: Organization UUID
        phone_number: Phone number

    Returns:
        Unique instance name (e.g., "pytake_abc123_5511999999999")
    """
    # Remove special characters from phone
    clean_phone = ''.join(filter(str.isdigit, phone_number))

    # Use first 8 chars of org ID
    org_prefix = str(organization_id).replace('-', '')[:8]

    return f"pytake_{org_prefix}_{clean_phone}"
