"""
Meta Cloud API Integration for WhatsApp Business
Official API: https://developers.facebook.com/docs/whatsapp/cloud-api
"""

import logging
from typing import Dict, Any, Optional, List
import httpx

logger = logging.getLogger(__name__)


class MetaAPIError(Exception):
    """Exception raised for Meta API errors"""
    def __init__(self, message: str, error_code: Optional[str] = None, status_code: Optional[int] = None):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)


class MetaCloudAPI:
    """Client for Meta Cloud API (WhatsApp Business)"""

    def __init__(self, phone_number_id: str, access_token: str):
        """
        Initialize Meta Cloud API client

        Args:
            phone_number_id: WhatsApp phone number ID from Meta
            access_token: Access token for Meta Graph API
        """
        self.phone_number_id = phone_number_id
        self.access_token = access_token
        self.base_url = "https://graph.facebook.com/v18.0"
        self.timeout = 30.0

    async def send_text_message(
        self,
        to: str,
        text: str,
        preview_url: bool = False
    ) -> Dict[str, Any]:
        """
        Send a text message

        Args:
            to: Recipient WhatsApp ID (phone number with country code, no +)
            text: Message text
            preview_url: Enable URL preview

        Returns:
            Response from Meta API with message ID

        Raises:
            MetaAPIError: If API request fails
        """
        url = f"{self.base_url}/{self.phone_number_id}/messages"

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {
                "preview_url": preview_url,
                "body": text
            }
        }

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        logger.info(f"Sending text message to {to}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                response_data = response.json()

                if response.status_code != 200:
                    error_message = response_data.get("error", {}).get("message", "Unknown error")
                    error_code = response_data.get("error", {}).get("code")
                    logger.error(f"Meta API error: {error_message} (code: {error_code})")
                    raise MetaAPIError(
                        message=error_message,
                        error_code=str(error_code) if error_code else None,
                        status_code=response.status_code
                    )

                logger.info(f"✅ Message sent successfully: {response_data.get('messages', [{}])[0].get('id')}")
                return response_data

            except httpx.RequestError as e:
                logger.error(f"HTTP request failed: {e}")
                raise MetaAPIError(f"Network error: {str(e)}")

    async def send_image_message(
        self,
        to: str,
        image_url: str,
        caption: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send an image message

        Args:
            to: Recipient WhatsApp ID
            image_url: URL of the image (must be HTTPS)
            caption: Optional caption text

        Returns:
            Response from Meta API
        """
        url = f"{self.base_url}/{self.phone_number_id}/messages"

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "image",
            "image": {
                "link": image_url
            }
        }

        if caption:
            payload["image"]["caption"] = caption

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        logger.info(f"Sending image message to {to}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                response_data = response.json()

                if response.status_code != 200:
                    error_message = response_data.get("error", {}).get("message", "Unknown error")
                    error_code = response_data.get("error", {}).get("code")
                    raise MetaAPIError(
                        message=error_message,
                        error_code=str(error_code) if error_code else None,
                        status_code=response.status_code
                    )

                return response_data

            except httpx.RequestError as e:
                raise MetaAPIError(f"Network error: {str(e)}")

    async def send_template_message(
        self,
        to: str,
        template_name: str,
        language_code: str = "pt_BR",
        components: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Send a template message

        Args:
            to: Recipient WhatsApp ID
            template_name: Template name (slug)
            language_code: Language code (e.g., pt_BR, en_US)
            components: Template components with variable values

        Returns:
            Response from Meta API
        """
        url = f"{self.base_url}/{self.phone_number_id}/messages"

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": language_code
                }
            }
        }

        if components:
            payload["template"]["components"] = components

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        logger.info(f"Sending template '{template_name}' to {to}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                response_data = response.json()

                if response.status_code != 200:
                    error_message = response_data.get("error", {}).get("message", "Unknown error")
                    error_code = response_data.get("error", {}).get("code")
                    raise MetaAPIError(
                        message=error_message,
                        error_code=str(error_code) if error_code else None,
                        status_code=response.status_code
                    )

                return response_data

            except httpx.RequestError as e:
                raise MetaAPIError(f"Network error: {str(e)}")

    async def send_document_message(
        self,
        to: str,
        document_url: str,
        filename: Optional[str] = None,
        caption: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a document message

        Args:
            to: Recipient WhatsApp ID
            document_url: URL of the document (must be HTTPS)
            filename: Display filename
            caption: Optional caption

        Returns:
            Response from Meta API
        """
        url = f"{self.base_url}/{self.phone_number_id}/messages"

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "document",
            "document": {
                "link": document_url
            }
        }

        if filename:
            payload["document"]["filename"] = filename

        if caption:
            payload["document"]["caption"] = caption

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                response_data = response.json()

                if response.status_code != 200:
                    error_message = response_data.get("error", {}).get("message", "Unknown error")
                    error_code = response_data.get("error", {}).get("code")
                    raise MetaAPIError(
                        message=error_message,
                        error_code=str(error_code) if error_code else None,
                        status_code=response.status_code
                    )

                return response_data

            except httpx.RequestError as e:
                raise MetaAPIError(f"Network error: {str(e)}")

    async def mark_message_as_read(self, message_id: str) -> Dict[str, Any]:
        """
        Mark a message as read

        Args:
            message_id: WhatsApp message ID

        Returns:
            Response from Meta API
        """
        url = f"{self.base_url}/{self.phone_number_id}/messages"

        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id
        }

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                response_data = response.json()

                if response.status_code != 200:
                    error_message = response_data.get("error", {}).get("message", "Unknown error")
                    raise MetaAPIError(message=error_message)

                return response_data

            except httpx.RequestError as e:
                raise MetaAPIError(f"Network error: {str(e)}")

    async def list_templates(self, waba_id: str, status: str = "APPROVED", limit: int = 100) -> List[Dict[str, Any]]:
        """
        List message templates from WhatsApp Business Account

        Args:
            waba_id: WhatsApp Business Account ID
            status: Filter by status (APPROVED, PENDING, REJECTED). Default: APPROVED
            limit: Maximum number of templates to return (default: 100)

        Returns:
            List of template objects

        Raises:
            MetaAPIError: If API request fails
        """
        url = f"{self.base_url}/{waba_id}/message_templates"

        params = {
            "limit": limit
        }

        if status:
            params["status"] = status

        headers = {
            "Authorization": f"Bearer {self.access_token}",
        }

        logger.info(f"Fetching templates for WABA {waba_id} with status {status}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url, params=params, headers=headers)
                response_data = response.json()

                if response.status_code != 200:
                    error_message = response_data.get("error", {}).get("message", "Unknown error")
                    error_code = response_data.get("error", {}).get("code")
                    logger.error(f"Meta API error fetching templates: {error_message}")
                    raise MetaAPIError(
                        message=error_message,
                        error_code=str(error_code) if error_code else None,
                        status_code=response.status_code
                    )

                templates = response_data.get("data", [])
                logger.info(f"✅ Fetched {len(templates)} templates")
                return templates

            except httpx.RequestError as e:
                logger.error(f"HTTP request failed: {e}")
                raise MetaAPIError(f"Network error: {str(e)}")

    async def create_template(
        self,
        waba_id: str,
        name: str,
        language: str,
        category: str,
        components: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create a new message template

        Args:
            waba_id: WhatsApp Business Account ID
            name: Template name (lowercase with underscores, no spaces)
            language: Language code (e.g., pt_BR, en_US)
            category: Template category (MARKETING, UTILITY, AUTHENTICATION)
            components: List of template components

        Component Structure:
            [
                {
                    "type": "HEADER",
                    "format": "TEXT|IMAGE|VIDEO|DOCUMENT",
                    "text": "Header text"  # Only for format=TEXT
                },
                {
                    "type": "BODY",
                    "text": "Body with {{1}} and {{2}} variables"
                },
                {
                    "type": "FOOTER",
                    "text": "Footer text"
                },
                {
                    "type": "BUTTONS",
                    "buttons": [
                        {"type": "QUICK_REPLY", "text": "Button 1"},
                        {"type": "PHONE_NUMBER", "text": "Call", "phone_number": "+1234567890"},
                        {"type": "URL", "text": "Visit", "url": "https://example.com"}
                    ]
                }
            ]

        Returns:
            Response from Meta API with template ID and status

        Raises:
            MetaAPIError: If API request fails
        """
        url = f"{self.base_url}/{waba_id}/message_templates"

        payload = {
            "name": name,
            "language": language,
            "category": category,
            "components": components
        }

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        logger.info(f"Creating template '{name}' ({language}) for WABA {waba_id}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                response_data = response.json()

                if response.status_code != 200:
                    error_message = response_data.get("error", {}).get("message", "Unknown error")
                    error_code = response_data.get("error", {}).get("code")
                    logger.error(f"Meta API error creating template: {error_message}")
                    raise MetaAPIError(
                        message=error_message,
                        error_code=str(error_code) if error_code else None,
                        status_code=response.status_code
                    )

                logger.info(f"✅ Template '{name}' created successfully. ID: {response_data.get('id')}")
                return response_data

            except httpx.RequestError as e:
                logger.error(f"HTTP request failed: {e}")
                raise MetaAPIError(f"Network error: {str(e)}")

    async def delete_template(
        self,
        waba_id: str,
        template_name: str
    ) -> bool:
        """
        Delete a message template

        Args:
            waba_id: WhatsApp Business Account ID
            template_name: Name of the template to delete

        Returns:
            True if deleted successfully

        Raises:
            MetaAPIError: If API request fails
        """
        url = f"{self.base_url}/{waba_id}/message_templates"

        params = {
            "name": template_name
        }

        headers = {
            "Authorization": f"Bearer {self.access_token}",
        }

        logger.info(f"Deleting template '{template_name}' from WABA {waba_id}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.delete(url, params=params, headers=headers)
                response_data = response.json()

                if response.status_code != 200:
                    error_message = response_data.get("error", {}).get("message", "Unknown error")
                    error_code = response_data.get("error", {}).get("code")
                    logger.error(f"Meta API error deleting template: {error_message}")
                    raise MetaAPIError(
                        message=error_message,
                        error_code=str(error_code) if error_code else None,
                        status_code=response.status_code
                    )

                logger.info(f"✅ Template '{template_name}' deleted successfully")
                return response_data.get("success", False)

            except httpx.RequestError as e:
                logger.error(f"HTTP request failed: {e}")
                raise MetaAPIError(f"Network error: {str(e)}")

    async def send_interactive_buttons(
        self,
        to: str,
        body_text: str,
        buttons: List[Dict[str, str]],
        header_text: Optional[str] = None,
        footer_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send an interactive message with buttons

        Args:
            to: Recipient WhatsApp ID
            body_text: Main message body
            buttons: List of buttons (max 3) with format: [{"id": "btn1", "title": "Button 1"}]
            header_text: Optional header text
            footer_text: Optional footer text

        Returns:
            Response from Meta API

        Raises:
            MetaAPIError: If API request fails
        """
        if len(buttons) > 3:
            raise MetaAPIError("Maximum of 3 buttons allowed")

        url = f"{self.base_url}/{self.phone_number_id}/messages"

        # Formatar botões para o padrão da Meta API
        formatted_buttons = []
        for btn in buttons:
            formatted_buttons.append({
                "type": "reply",
                "reply": {
                    "id": btn.get("id", f"btn_{len(formatted_buttons)}"),
                    "title": btn.get("title", "")[:20]  # Max 20 chars
                }
            })

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {
                    "text": body_text
                },
                "action": {
                    "buttons": formatted_buttons
                }
            }
        }

        # Adicionar header se fornecido
        if header_text:
            payload["interactive"]["header"] = {
                "type": "text",
                "text": header_text[:60]  # Max 60 chars
            }

        # Adicionar footer se fornecido
        if footer_text:
            payload["interactive"]["footer"] = {
                "text": footer_text[:60]  # Max 60 chars
            }

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        logger.info(f"Sending interactive buttons to {to} ({len(buttons)} buttons)")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                response_data = response.json()

                if response.status_code != 200:
                    error_message = response_data.get("error", {}).get("message", "Unknown error")
                    error_code = response_data.get("error", {}).get("code")
                    raise MetaAPIError(
                        message=error_message,
                        error_code=str(error_code) if error_code else None,
                        status_code=response.status_code
                    )

                logger.info(f"✅ Interactive buttons sent successfully")
                return response_data

            except httpx.RequestError as e:
                raise MetaAPIError(f"Network error: {str(e)}")

    async def send_interactive_list(
        self,
        to: str,
        body_text: str,
        button_text: str,
        sections: List[Dict[str, Any]],
        header_text: Optional[str] = None,
        footer_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send an interactive message with list/menu

        Args:
            to: Recipient WhatsApp ID
            body_text: Main message body
            button_text: Text for the list button (e.g., "Ver opções")
            sections: List sections with format:
                [
                    {
                        "title": "Section 1",
                        "rows": [
                            {"id": "opt1", "title": "Option 1", "description": "Description"}
                        ]
                    }
                ]
            header_text: Optional header text
            footer_text: Optional footer text

        Returns:
            Response from Meta API

        Raises:
            MetaAPIError: If API request fails
        """
        # Validações
        if len(sections) > 10:
            raise MetaAPIError("Maximum of 10 sections allowed")

        total_rows = sum(len(section.get("rows", [])) for section in sections)
        if total_rows > 10:
            raise MetaAPIError("Maximum of 10 total rows allowed across all sections")

        url = f"{self.base_url}/{self.phone_number_id}/messages"

        # Formatar sections para o padrão da Meta API
        formatted_sections = []
        for section in sections:
            formatted_rows = []
            for row in section.get("rows", []):
                formatted_rows.append({
                    "id": row.get("id", f"row_{len(formatted_rows)}"),
                    "title": row.get("title", "")[:24],  # Max 24 chars
                    "description": row.get("description", "")[:72]  # Max 72 chars
                })

            formatted_sections.append({
                "title": section.get("title", "")[:24],  # Max 24 chars
                "rows": formatted_rows
            })

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "list",
                "body": {
                    "text": body_text
                },
                "action": {
                    "button": button_text[:20],  # Max 20 chars
                    "sections": formatted_sections
                }
            }
        }

        # Adicionar header se fornecido
        if header_text:
            payload["interactive"]["header"] = {
                "type": "text",
                "text": header_text[:60]  # Max 60 chars
            }

        # Adicionar footer se fornecido
        if footer_text:
            payload["interactive"]["footer"] = {
                "text": footer_text[:60]  # Max 60 chars
            }

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        logger.info(f"Sending interactive list to {to} ({len(sections)} sections, {total_rows} total rows)")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                response_data = response.json()

                if response.status_code != 200:
                    error_message = response_data.get("error", {}).get("message", "Unknown error")
                    error_code = response_data.get("error", {}).get("code")
                    raise MetaAPIError(
                        message=error_message,
                        error_code=str(error_code) if error_code else None,
                        status_code=response.status_code
                    )

                logger.info(f"✅ Interactive list sent successfully")
                return response_data

            except httpx.RequestError as e:
                raise MetaAPIError(f"Network error: {str(e)}")
