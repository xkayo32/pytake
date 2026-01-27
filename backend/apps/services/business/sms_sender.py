"""
SMS Sender Service
Handles SMS sending via Twilio
"""
from typing import List, Optional, Dict
from django.conf import settings
from apps.services.templates.models import SMSTemplate
from apps.services.database.mongodb_service import MongoDBService
import logging
from twilio.rest import Client

logger = logging.getLogger(__name__)


class SMSSenderService:
    """
    High-level SMS sending service with Twilio integration
    Supports templates, bulk sending, and delivery tracking
    """

    def __init__(self, organization_id: str = None):
        """
        Initialize SMS sender service

        Args:
            organization_id: Organization UUID for multi-tenancy
        """
        self.organization_id = organization_id
        self.twilio_client = Client(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN,
        )
        self.from_number = settings.TWILIO_PHONE_NUMBER
        self.mongo_service = MongoDBService(organization_id=organization_id)

    def send_simple(
        self,
        to_number: str,
        message: str,
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Send a simple SMS

        Args:
            to_number: Recipient phone number (E.164 format)
            message: SMS message (max 160 chars)
            metadata: Additional metadata

        Returns:
            Twilio Message SID
        """
        if len(message) > 160:
            logger.warning(f"⚠️ SMS message truncated from {len(message)} to 160 chars")
            message = message[:160]

        try:
            sms = self.twilio_client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number,
            )

            # Log SMS sending
            if self.organization_id:
                self.mongo_service.log_metric(
                    metric_type='sms_sent',
                    value=1,
                    tags={'type': 'simple', 'recipient_count': 1},
                    metadata=metadata or {},
                )

            logger.info(f"📱 SMS sent to {to_number} (SID: {sms.sid})")
            return sms.sid

        except Exception as e:
            logger.error(f"❌ Error sending SMS to {to_number}: {e}")
            if self.organization_id:
                self.mongo_service.log_metric(
                    metric_type='sms_failed',
                    value=1,
                    tags={'reason': 'send_error'},
                )
            raise

    def send_template(
        self,
        to_number: str,
        template_id: str,
        template_data: Dict,
    ) -> str:
        """
        Send SMS using a saved template

        Args:
            to_number: Recipient phone number
            template_id: SMSTemplate ID
            template_data: Data to interpolate in template

        Returns:
            Twilio Message SID
        """
        try:
            # Get template from database
            template = SMSTemplate.objects.get(id=template_id)

            # Render template with data
            rendered_message = template.render(template_data)

            # Ensure message is within SMS limit
            if len(rendered_message) > 160:
                logger.warning(
                    f"⚠️ Template rendered SMS too long: {len(rendered_message)}"
                )
                rendered_message = rendered_message[:160]

            # Send SMS
            sms_id = self.send_simple(
                to_number=to_number,
                message=rendered_message,
                metadata={
                    'template_id': str(template_id),
                    'template_name': template.name,
                },
            )

            if self.organization_id:
                self.mongo_service.log_action(
                    user_id='system',
                    action='send',
                    resource_type='sms',
                    resource_id='sms_send',
                    changes={
                        'template': template.name,
                        'recipient': to_number,
                    },
                )

            return sms_id

        except SMSTemplate.DoesNotExist:
            logger.error(f"❌ Template not found: {template_id}")
            raise

    def send_bulk(
        self,
        recipients: List[Dict],
        message: str,
        personalization: bool = True,
    ) -> Dict:
        """
        Send bulk SMS

        Args:
            recipients: List of dicts with 'phone' and optional 'vars'
            message: SMS message
            personalization: Whether to personalize each SMS

        Returns:
            Dict with sent count and failed list
        """
        sent_count = 0
        failed_list = []

        try:
            for recipient in recipients:
                try:
                    phone = recipient.get('phone')
                    variables = recipient.get('vars', {})

                    # Personalize if variables provided
                    personalized_message = message

                    if personalization and variables:
                        from django.template import Template, Context

                        template = Template(message)
                        personalized_message = template.render(
                            Context(variables)
                        )

                    # Truncate if necessary
                    if len(personalized_message) > 160:
                        personalized_message = personalized_message[:160]

                    # Send individual SMS
                    self.send_simple(
                        to_number=phone,
                        message=personalized_message,
                        metadata={
                            'bulk_send': True,
                        },
                    )
                    sent_count += 1

                except Exception as e:
                    logger.warning(f"⚠️ Failed to send to {recipient.get('phone')}: {e}")
                    failed_list.append({
                        'phone': recipient.get('phone'),
                        'error': str(e),
                    })

            # Log bulk send
            if self.organization_id:
                self.mongo_service.log_metric(
                    metric_type='sms_sent',
                    value=sent_count,
                    tags={
                        'type': 'bulk',
                        'recipient_count': len(recipients),
                        'failed_count': len(failed_list),
                    },
                )

            logger.info(f"📲 Bulk SMS send: {sent_count}/{len(recipients)} sent")

            return {
                'sent': sent_count,
                'failed': len(failed_list),
                'failed_list': failed_list,
                'total': len(recipients),
                'success': len(failed_list) == 0,
            }

        except Exception as e:
            logger.error(f"❌ Bulk SMS send error: {e}")
            raise

    def get_message_status(self, message_sid: str) -> Dict:
        """
        Get status of a sent SMS

        Args:
            message_sid: Twilio Message SID

        Returns:
            Dict with status info
        """
        try:
            message = self.twilio_client.messages(message_sid).fetch()

            status_info = {
                'sid': message.sid,
                'status': message.status,
                'to': message.to,
                'date_sent': message.date_sent,
                'price': message.price,
                'error_code': message.error_code,
                'error_message': message.error_message,
            }

            return status_info

        except Exception as e:
            logger.error(f"❌ Error getting SMS status: {e}")
            raise

    def send_with_media(
        self,
        to_number: str,
        message: str,
        media_url: str,
    ) -> str:
        """
        Send MMS (SMS with media)

        Args:
            to_number: Recipient phone number
            message: Message text
            media_url: URL to media file (image, video)

        Returns:
            Twilio Message SID
        """
        try:
            sms = self.twilio_client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number,
                media_url=media_url,
            )

            if self.organization_id:
                self.mongo_service.log_metric(
                    metric_type='mms_sent',
                    value=1,
                    tags={'media_url': media_url[:50]},
                )

            logger.info(f"📸 MMS sent to {to_number}")
            return sms.sid

        except Exception as e:
            logger.error(f"❌ Error sending MMS: {e}")
            raise

    def check_balance(self) -> Dict:
        """
        Get Twilio account balance and status

        Returns:
            Dict with account info
        """
        try:
            account = self.twilio_client.api.accounts(
                settings.TWILIO_ACCOUNT_SID
            ).fetch()

            return {
                'account_sid': account.sid,
                'status': account.status,
                'balance': account.balance,
                'type': account.type,
                'date_created': account.date_created,
                'date_updated': account.date_updated,
            }

        except Exception as e:
            logger.error(f"❌ Error checking Twilio balance: {e}")
            raise
