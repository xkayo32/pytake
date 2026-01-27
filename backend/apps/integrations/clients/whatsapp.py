"""
WhatsApp Business API Client
Handles sending messages, uploading templates, and managing numbers
"""
import json
import logging
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class WhatsAppBusinessClient:
    """Client for WhatsApp Business API (Meta Cloud API)"""

    BASE_URL = "https://graph.instagram.com/v18.0"

    def __init__(self, phone_number_id: str, access_token: str):
        self.phone_number_id = phone_number_id
        self.access_token = access_token
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        })

    def _request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Make HTTP request to WhatsApp API"""
        url = urljoin(self.BASE_URL, endpoint)
        
        try:
            response = self.session.request(method, url, timeout=30, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"WhatsApp API error: {str(e)}")
            raise

    def send_text_message(
        self,
        recipient_phone: str,
        message_body: str,
        preview_url: bool = False
    ) -> Dict[str, Any]:
        """Send text message"""
        return self._request(
            "POST",
            f"{self.phone_number_id}/messages",
            json={
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": recipient_phone,
                "type": "text",
                "text": {
                    "preview_url": preview_url,
                    "body": message_body,
                },
            },
        )

    def send_template_message(
        self,
        recipient_phone: str,
        template_name: str,
        language_code: str = "pt_BR",
        parameters: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """Send template message (approved templates only)"""
        payload = {
            "messaging_product": "whatsapp",
            "to": recipient_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
            },
        }

        if parameters:
            payload["template"]["components"] = [
                {
                    "type": "body",
                    "parameters": parameters,
                }
            ]

        return self._request(
            "POST",
            f"{self.phone_number_id}/messages",
            json=payload,
        )

    def send_media_message(
        self,
        recipient_phone: str,
        media_type: str,  # image, document, audio, video
        media_url: str,
        caption: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send media message (image, document, audio, video)"""
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient_phone,
            "type": media_type,
            media_type: {
                "link": media_url,
            },
        }

        if caption and media_type in ("image", "document", "video"):
            payload[media_type]["caption"] = caption

        return self._request(
            "POST",
            f"{self.phone_number_id}/messages",
            json=payload,
        )

    def upload_media(self, file_path: str, file_type: str) -> str:
        """Upload media to WhatsApp for use in messages"""
        with open(file_path, "rb") as f:
            files = {
                "file": (file_path, f),
                "type": (None, file_type),
            }
            
            response = self.session.post(
                urljoin(self.BASE_URL, f"{self.phone_number_id}/media"),
                files=files,
                headers={"Authorization": f"Bearer {self.access_token}"},
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["id"]

    def create_template(
        self,
        name: str,
        category: str,  # MARKETING, UTILITY, AUTHENTICATION, OTP
        language: str,
        body: str,
        header: Optional[str] = None,
        footer: Optional[str] = None,
        buttons: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Create new message template"""
        payload = {
            "name": name,
            "category": category,
            "allow_category_change": True,
            "language": language,
            "components": [
                {
                    "type": "BODY",
                    "text": body,
                }
            ],
        }

        if header:
            payload["components"].insert(0, {
                "type": "HEADER",
                "format": "TEXT",
                "text": header,
            })

        if footer:
            payload["components"].append({
                "type": "FOOTER",
                "text": footer,
            })

        if buttons:
            payload["components"].append({
                "type": "BUTTONS",
                "buttons": buttons,
            })

        business_account_id = self._get_business_account_id()
        return self._request(
            "POST",
            f"{business_account_id}/message_templates",
            json=payload,
        )

    def get_templates(self) -> List[Dict[str, Any]]:
        """Get all approved templates for this phone number"""
        business_account_id = self._get_business_account_id()
        result = self._request("GET", f"{business_account_id}/message_templates")
        return result.get("data", [])

    def delete_template(self, template_name: str) -> Dict[str, Any]:
        """Delete a message template"""
        business_account_id = self._get_business_account_id()
        return self._request(
            "DELETE",
            f"{business_account_id}/message_templates",
            params={"name": template_name},
        )

    def get_phone_number_info(self) -> Dict[str, Any]:
        """Get phone number details"""
        return self._request("GET", self.phone_number_id)

    def get_message_status(self, message_id: str) -> Dict[str, Any]:
        """Get message delivery status"""
        return self._request("GET", message_id)

    def _get_business_account_id(self) -> str:
        """Extract business account ID from phone number info"""
        info = self.get_phone_number_info()
        return info.get("business_account_id", "")


class WhatsAppWebhookVerifier:
    """Verify WhatsApp webhook signatures"""

    @staticmethod
    def verify_signature(
        signature: str,
        body: str,
        app_secret: str,
    ) -> bool:
        """Verify X-Hub-Signature-256 header"""
        import hashlib
        import hmac

        expected_signature = (
            "sha256="
            + hmac.new(
                app_secret.encode(),
                body.encode(),
                hashlib.sha256,
            ).hexdigest()
        )

        return hmac.compare_digest(signature, expected_signature)
