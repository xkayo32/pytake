"""
Email Sender Service
Handles email sending via SendGrid
"""
from typing import List, Optional, Dict
from django.core.mail import send_mail
from django.conf import settings
from apps.services.templates.models import EmailTemplate
from apps.services.database.mongodb_service import MongoDBService
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import (
    Mail,
    Email,
    To,
    Content,
    Attachment,
    FileContent,
    FileName,
    FileType,
    Disposition,
)
import base64
import mimetypes

logger = logging.getLogger(__name__)


class EmailSenderService:
    """
    High-level email sending service with SendGrid integration
    Supports templates, attachments, and bulk sending
    """

    def __init__(self, organization_id: str = None):
        """
        Initialize email sender service
        
        Args:
            organization_id: Organization UUID for multi-tenancy
        """
        self.organization_id = organization_id
        self.sendgrid_client = SendGridAPIClient(settings.SENDGRID_API_KEY)
        self.from_email = settings.DEFAULT_FROM_EMAIL
        self.mongo_service = MongoDBService(organization_id=organization_id)

    def send_simple(
        self,
        to_email: str,
        subject: str,
        content: str,
        is_html: bool = False,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Send a simple email

        Args:
            to_email: Recipient email
            subject: Email subject
            content: Email content (HTML or plain text)
            is_html: Whether content is HTML
            cc: CC recipients
            bcc: BCC recipients
            metadata: Additional metadata

        Returns:
            Email ID from SendGrid
        """
        try:
            message = Mail(
                from_email=self.from_email,
                to_emails=to_email,
                subject=subject,
                plain_text_content=content if not is_html else None,
                html_content=content if is_html else None,
            )

            if cc:
                for cc_email in cc:
                    message.add_cc(cc_email)

            if bcc:
                for bcc_email in bcc:
                    message.add_bcc(bcc_email)

            response = self.sendgrid_client.send(message)

            # Log email sending
            if self.organization_id:
                self.mongo_service.log_metric(
                    metric_type='emails_sent',
                    value=1,
                    tags={'type': 'simple', 'recipient_count': 1},
                    metadata=metadata or {},
                )

            logger.info(f"✉️ Email sent to {to_email} (ID: {response.status_code})")
            return response.status_code

        except Exception as e:
            logger.error(f"❌ Error sending email to {to_email}: {e}")
            if self.organization_id:
                self.mongo_service.log_metric(
                    metric_type='emails_failed',
                    value=1,
                    tags={'reason': 'send_error'},
                )
            raise

    def send_template(
        self,
        to_email: str,
        template_id: str,
        template_data: Dict,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
    ) -> str:
        """
        Send email using a saved template

        Args:
            to_email: Recipient email
            template_id: EmailTemplate ID
            template_data: Data to interpolate in template
            cc: CC recipients
            bcc: BCC recipients

        Returns:
            Email ID
        """
        try:
            # Get template from database
            template = EmailTemplate.objects.get(id=template_id)

            # Render template with data
            rendered_content = template.render(template_data)
            rendered_subject = template.render_subject(template_data)

            # Send email
            email_id = self.send_simple(
                to_email=to_email,
                subject=rendered_subject,
                content=rendered_content,
                is_html=template.is_html,
                cc=cc,
                bcc=bcc,
                metadata={
                    'template_id': str(template_id),
                    'template_name': template.name,
                },
            )

            if self.organization_id:
                self.mongo_service.log_action(
                    user_id='system',
                    action='send',
                    resource_type='email',
                    resource_id='email_send',
                    changes={
                        'template': template.name,
                        'recipient': to_email,
                    },
                )

            return email_id

        except EmailTemplate.DoesNotExist:
            logger.error(f"❌ Template not found: {template_id}")
            raise

    def send_bulk(
        self,
        recipients: List[Dict],
        subject: str,
        content: str,
        is_html: bool = False,
        personalization: bool = True,
    ) -> Dict:
        """
        Send bulk emails

        Args:
            recipients: List of dicts with 'email' and optional 'name', 'vars'
            subject: Email subject
            content: Email content
            is_html: Whether content is HTML
            personalization: Whether to personalize each email

        Returns:
            Dict with sent count and failed list
        """
        sent_count = 0
        failed_list = []

        try:
            for recipient in recipients:
                try:
                    email = recipient.get('email')
                    name = recipient.get('name', '')
                    variables = recipient.get('vars', {})

                    # Personalize if variables provided
                    personalized_content = content
                    personalized_subject = subject

                    if personalization and variables:
                        from django.template import Template, Context

                        template = Template(content)
                        personalized_content = template.render(Context(variables))

                        subject_template = Template(subject)
                        personalized_subject = subject_template.render(
                            Context(variables)
                        )

                    # Send individual email
                    self.send_simple(
                        to_email=email,
                        subject=personalized_subject,
                        content=personalized_content,
                        is_html=is_html,
                        metadata={
                            'bulk_send': True,
                            'recipient_name': name,
                        },
                    )
                    sent_count += 1

                except Exception as e:
                    logger.warning(f"⚠️ Failed to send to {recipient.get('email')}: {e}")
                    failed_list.append({
                        'email': recipient.get('email'),
                        'error': str(e),
                    })

            # Log bulk send
            if self.organization_id:
                self.mongo_service.log_metric(
                    metric_type='emails_sent',
                    value=sent_count,
                    tags={
                        'type': 'bulk',
                        'recipient_count': len(recipients),
                        'failed_count': len(failed_list),
                    },
                )

            logger.info(f"📧 Bulk send: {sent_count}/{len(recipients)} sent")

            return {
                'sent': sent_count,
                'failed': len(failed_list),
                'failed_list': failed_list,
                'total': len(recipients),
                'success': len(failed_list) == 0,
            }

        except Exception as e:
            logger.error(f"❌ Bulk send error: {e}")
            raise

    def send_with_attachment(
        self,
        to_email: str,
        subject: str,
        content: str,
        attachment_path: str,
        is_html: bool = False,
    ) -> str:
        """
        Send email with file attachment

        Args:
            to_email: Recipient email
            subject: Email subject
            content: Email content
            attachment_path: Path to file to attach
            is_html: Whether content is HTML

        Returns:
            Email ID
        """
        try:
            message = Mail(
                from_email=self.from_email,
                to_emails=to_email,
                subject=subject,
                plain_text_content=content if not is_html else None,
                html_content=content if is_html else None,
            )

            # Add attachment
            with open(attachment_path, 'rb') as attachment_file:
                file_content = base64.b64encode(
                    attachment_file.read()
                ).decode()

                filename = attachment_path.split('/')[-1]
                file_type = mimetypes.guess_type(attachment_path)[0]

                attachment = Attachment(
                    FileContent(file_content),
                    FileName(filename),
                    FileType(file_type),
                    Disposition('attachment'),
                )
                message.attachment = attachment

            response = self.sendgrid_client.send(message)

            if self.organization_id:
                self.mongo_service.log_metric(
                    metric_type='emails_sent',
                    value=1,
                    tags={'type': 'with_attachment'},
                )

            logger.info(f"📎 Email with attachment sent to {to_email}")
            return response.status_code

        except Exception as e:
            logger.error(f"❌ Error sending attachment email: {e}")
            raise

    def send_scheduled(
        self,
        to_email: str,
        subject: str,
        content: str,
        send_at: int,  # Unix timestamp
        is_html: bool = False,
    ) -> str:
        """
        Schedule email for later sending

        Args:
            to_email: Recipient email
            subject: Email subject
            content: Email content
            send_at: Unix timestamp for when to send
            is_html: Whether content is HTML

        Returns:
            Email ID
        """
        try:
            message = Mail(
                from_email=self.from_email,
                to_emails=to_email,
                subject=subject,
                plain_text_content=content if not is_html else None,
                html_content=content if is_html else None,
            )

            # Set send time
            message.send_at = send_at

            response = self.sendgrid_client.send(message)

            if self.organization_id:
                self.mongo_service.log_metric(
                    metric_type='emails_scheduled',
                    value=1,
                    tags={'send_at': str(send_at)},
                )

            logger.info(f"⏰ Email scheduled for {to_email}")
            return response.status_code

        except Exception as e:
            logger.error(f"❌ Error scheduling email: {e}")
            raise
