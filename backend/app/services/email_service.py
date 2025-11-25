"""Email service with SMTP support and template rendering"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from jinja2 import Environment, FileSystemLoader, select_autoescape
import os
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Send emails via SMTP with Jinja2 templates"""

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from = settings.SMTP_FROM_EMAIL
        self.smtp_from_name = settings.SMTP_FROM_NAME
        self.use_tls = settings.SMTP_USE_TLS
        self.timeout = settings.SMTP_TIMEOUT

        template_dir = os.path.join(
            os.path.dirname(__file__),
            '../templates/emails'
        )
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send email via SMTP"""
        try:
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = f"{self.smtp_from_name} <{self.smtp_from}>"
            message['To'] = to_email

            if text_content:
                message.attach(MIMEText(text_content, 'plain'))
            message.attach(MIMEText(html_content, 'html'))

            with smtplib.SMTP(
                self.smtp_host,
                self.smtp_port,
                timeout=self.timeout
            ) as server:
                if self.use_tls:
                    server.starttls()

                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)

                server.send_message(message)

            logger.info(f"✅ Email enviado para {to_email}")
            return {"success": True, "message_id": message['Message-ID']}

        except Exception as e:
            logger.error(f"❌ Erro ao enviar email: {e}")
            return {"success": False, "error": str(e)}

    def render_template(
        self,
        template_name: str,
        context: Dict[str, Any]
    ) -> str:
        """Render email template"""
        template = self.jinja_env.get_template(template_name)
        return template.render(**context)
