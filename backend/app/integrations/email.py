"""
Email Service Integration
Async email sending with SMTP support, template rendering, and retry logic.
"""

import asyncio
import logging
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Environment, FileSystemLoader, TemplateNotFound

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailTemplate(str, Enum):
    """Available email templates"""
    ALERT_CREATED = "alert_created"
    ALERT_ESCALATED = "alert_escalated"
    ALERT_RESOLVED = "alert_resolved"
    STALE_ALERT = "stale_alert"
    CONVERSATION_TRANSFER = "conversation_transfer"
    CONVERSATION_ASSIGNED = "conversation_assigned"


@dataclass
class EmailMessage:
    """Email message structure"""
    to_email: str
    to_name: Optional[str] = None
    subject: str = ""
    html_content: str = ""
    text_content: Optional[str] = None
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    reply_to: Optional[str] = None
    headers: Optional[Dict[str, str]] = None

    @property
    def recipient(self) -> str:
        """Format recipient as 'Name <email@domain.com>'"""
        if self.to_name:
            return f"{self.to_name} <{self.to_email}>"
        return self.to_email


class EmailService:
    """
    Email service with async SMTP support
    - Template rendering (Jinja2)
    - Retry logic with exponential backoff
    - Error handling
    - Support for multiple email providers
    """

    def __init__(self):
        """Initialize email service"""
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
        self.use_tls = settings.SMTP_USE_TLS
        self.use_ssl = settings.SMTP_USE_SSL
        self.timeout = settings.SMTP_TIMEOUT_SECONDS
        self.enabled = settings.EMAIL_ENABLED

        # Initialize Jinja2 template loader
        templates_dir = Path(__file__).parent.parent / "templates" / "emails"
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(templates_dir)),
            autoescape=True,
            enable_async=False
        )

        self.max_retries = 3
        self.retry_delay_base = 1  # seconds (exponential backoff: 1s, 2s, 4s)

    def is_configured(self) -> bool:
        """Check if SMTP is properly configured"""
        return bool(
            self.enabled
            and self.smtp_host
            and self.smtp_user
            and self.smtp_password
        )

    def render_template(
        self,
        template: EmailTemplate,
        context: Dict = None
    ) -> tuple[str, str]:
        """
        Render email template with context variables.
        Returns (html_content, text_content) tuple.

        Args:
            template: EmailTemplate enum value
            context: Dict with template variables

        Returns:
            (html_content, text_content) tuple

        Raises:
            TemplateNotFound: If template file not found
        """
        context = context or {}

        try:
            # Load HTML template
            html_template = self.jinja_env.get_template(f"{template.value}.html")
            html_content = html_template.render(**context)

            # Load text template if available
            try:
                text_template = self.jinja_env.get_template(f"{template.value}.txt")
                text_content = text_template.render(**context)
            except TemplateNotFound:
                # Fall back to HTML-only
                text_content = f"Subject: {context.get('subject', template.value)}"

            return html_content, text_content

        except TemplateNotFound as e:
            logger.error(f"Email template not found: {template.value} | Error: {str(e)}")
            raise

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        to_name: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        reply_to: Optional[str] = None,
    ) -> bool:
        """
        Send email with retry logic and exponential backoff.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email body
            text_content: Plain text fallback
            to_name: Recipient display name
            cc: CC email addresses
            bcc: BCC email addresses
            reply_to: Reply-To email address

        Returns:
            True if sent successfully, False otherwise
        """
        if not self.is_configured():
            logger.warning("Email not configured - SMTP settings missing")
            return False

        message = EmailMessage(
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            cc=cc,
            bcc=bcc,
            reply_to=reply_to
        )

        for attempt in range(self.max_retries):
            try:
                await self._send_smtp(message)
                logger.info(f"Email sent successfully to {to_email} | Subject: {subject}")
                return True

            except asyncio.TimeoutError:
                logger.warning(f"Email send timeout (attempt {attempt + 1}/{self.max_retries})")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay_base ** (attempt + 1))

            except aiosmtplib.SMTPAuthenticationError as e:
                logger.error(f"SMTP authentication failed: {str(e)}")
                return False

            except aiosmtplib.SMTPException as e:
                logger.error(
                    f"SMTP error (attempt {attempt + 1}/{self.max_retries}): {str(e)}"
                )
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay_base ** (attempt + 1))

            except Exception as e:
                logger.error(f"Unexpected error sending email: {str(e)}")
                return False

        logger.error(f"Failed to send email to {to_email} after {self.max_retries} attempts")
        return False

    async def send_templated_email(
        self,
        to_email: str,
        template: EmailTemplate,
        subject: str,
        context: Dict = None,
        to_name: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        reply_to: Optional[str] = None,
    ) -> bool:
        """
        Send email using a template.

        Args:
            to_email: Recipient email address
            template: EmailTemplate enum value
            subject: Email subject
            context: Template context variables
            to_name: Recipient display name
            cc: CC email addresses
            bcc: BCC email addresses
            reply_to: Reply-To email address

        Returns:
            True if sent successfully, False otherwise
        """
        try:
            html_content, text_content = self.render_template(template, context)
            return await self.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                to_name=to_name,
                cc=cc,
                bcc=bcc,
                reply_to=reply_to,
            )
        except TemplateNotFound:
            return False
        except Exception as e:
            logger.error(f"Error sending templated email: {str(e)}")
            return False

    async def _send_smtp(self, message: EmailMessage) -> None:
        """
        Internal method to send email via SMTP with TLS/SSL support.

        Args:
            message: EmailMessage object

        Raises:
            aiosmtplib.SMTPException: On SMTP errors
            asyncio.TimeoutError: On connection timeout
        """
        # Create MIME message
        mime_message = MIMEMultipart("alternative")
        mime_message["From"] = f"{self.from_name} <{self.from_email}>"
        mime_message["To"] = message.recipient
        mime_message["Subject"] = message.subject

        if message.reply_to:
            mime_message["Reply-To"] = message.reply_to

        if message.cc:
            mime_message["Cc"] = ", ".join(message.cc)

        # Add custom headers
        if message.headers:
            for key, value in message.headers.items():
                mime_message[key] = value

        # Add message parts (text first, then HTML)
        if message.text_content:
            mime_message.attach(MIMEText(message.text_content, "plain", "utf-8"))

        mime_message.attach(MIMEText(message.html_content, "html", "utf-8"))

        # Prepare recipient list
        recipients = [message.to_email]
        if message.cc:
            recipients.extend(message.cc)
        if message.bcc:
            recipients.extend(message.bcc)

        # Connect and send via SMTP
        async with aiosmtplib.SMTP(
            hostname=self.smtp_host,
            port=self.smtp_port,
            timeout=self.timeout,
            use_tls=self.use_tls,
        ) as smtp:
            if self.use_ssl:
                await smtp.starttls()

            await smtp.login(self.smtp_user, self.smtp_password)
            await smtp.sendmail(self.from_email, recipients, mime_message.as_string())

    async def batch_send(
        self,
        recipients: List[tuple[str, Optional[str]]],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        delay_between_sends: float = 0.1,
    ) -> Dict[str, bool]:
        """
        Send same email to multiple recipients with delay between sends.

        Args:
            recipients: List of (email, name) tuples
            subject: Email subject
            html_content: HTML email body
            text_content: Plain text fallback
            delay_between_sends: Delay in seconds between sends

        Returns:
            Dict with email -> success_status mapping
        """
        results = {}

        for email, name in recipients:
            success = await self.send_email(
                to_email=email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                to_name=name,
            )
            results[email] = success

            # Add delay between sends to avoid rate limiting
            if delay_between_sends > 0:
                await asyncio.sleep(delay_between_sends)

        return results

    async def verify_smtp_connection(self) -> bool:
        """
        Verify SMTP connection is working.

        Returns:
            True if connection successful, False otherwise
        """
        if not self.is_configured():
            logger.warning("SMTP not configured")
            return False

        try:
            async with aiosmtplib.SMTP(
                hostname=self.smtp_host,
                port=self.smtp_port,
                timeout=self.timeout,
                use_tls=self.use_tls,
            ) as smtp:
                if self.use_ssl:
                    await smtp.starttls()

                await smtp.login(self.smtp_user, self.smtp_password)
                logger.info(f"✅ SMTP connection verified ({self.smtp_host}:{self.smtp_port})")
                return True

        except Exception as e:
            logger.error(f"❌ SMTP connection failed: {str(e)}")
            return False


# Global email service instance
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get or create email service instance"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
