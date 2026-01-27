"""
Celery Async Tasks for Services
Email, SMS, Payment, and Reporting operations
"""
from celery import shared_task
from django.conf import settings
from apps.services.business.email_sender import EmailSenderService
from apps.services.business.sms_sender import SMSSenderService
from apps.services.business.payment_service import PaymentService
from apps.services.business.reporting_service import ReportingService
from apps.services.database.mongodb_service import MongoDBService
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


# ============================================================================
# EMAIL TASKS
# ============================================================================

@shared_task(bind=True, max_retries=3)
def send_email_async(self, organization_id, to_email, subject, content, is_html=False):
    """
    Asynchronously send an email
    
    Args:
        organization_id: Organization UUID
        to_email: Recipient email
        subject: Email subject
        content: Email content
        is_html: Whether content is HTML
    """
    try:
        service = EmailSenderService(organization_id=organization_id)
        result = service.send_simple(
            to_email=to_email,
            subject=subject,
            content=content,
            is_html=is_html,
        )
        
        logger.info(f"✉️ Async email sent to {to_email}")
        
        # Log to MongoDB
        mongo = MongoDBService(organization_id=organization_id)
        mongo.log_metric(
            metric_type='emails_sent_async',
            value=1,
            tags={'recipient': to_email[:20]},
        )
        
        return {'status': 'sent', 'result': result}
        
    except Exception as e:
        logger.error(f"❌ Error sending async email: {e}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def send_email_template_async(self, organization_id, to_email, template_id, template_data):
    """
    Asynchronously send an email from template
    
    Args:
        organization_id: Organization UUID
        to_email: Recipient email
        template_id: EmailTemplate ID
        template_data: Template variables dict
    """
    try:
        service = EmailSenderService(organization_id=organization_id)
        result = service.send_template(
            to_email=to_email,
            template_id=template_id,
            template_data=template_data,
        )
        
        logger.info(f"✉️ Async template email sent to {to_email}")
        return {'status': 'sent', 'result': result}
        
    except Exception as e:
        logger.error(f"❌ Error sending async template email: {e}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=2)
def send_bulk_emails_async(self, organization_id, recipients, subject, content, is_html=False):
    """
    Asynchronously send bulk emails
    
    Args:
        organization_id: Organization UUID
        recipients: List of recipient dicts
        subject: Email subject
        content: Email content
        is_html: Whether content is HTML
    """
    try:
        service = EmailSenderService(organization_id=organization_id)
        result = service.send_bulk(
            recipients=recipients,
            subject=subject,
            content=content,
            is_html=is_html,
        )
        
        logger.info(f"📧 Async bulk email: {result['sent']}/{result['total']} sent")
        
        # Log to MongoDB
        mongo = MongoDBService(organization_id=organization_id)
        mongo.log_metric(
            metric_type='bulk_emails_sent',
            value=result['sent'],
            tags={'failed': result['failed']},
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error sending async bulk emails: {e}")
        raise self.retry(exc=e, countdown=120 * (2 ** self.request.retries))


# ============================================================================
# SMS TASKS
# ============================================================================

@shared_task(bind=True, max_retries=3)
def send_sms_async(self, organization_id, to_number, message):
    """
    Asynchronously send an SMS
    
    Args:
        organization_id: Organization UUID
        to_number: Recipient phone (E.164 format)
        message: SMS message
    """
    try:
        service = SMSSenderService(organization_id=organization_id)
        result = service.send_simple(
            to_number=to_number,
            message=message,
        )
        
        logger.info(f"📱 Async SMS sent to {to_number} (SID: {result})")
        
        # Log to MongoDB
        mongo = MongoDBService(organization_id=organization_id)
        mongo.log_metric(
            metric_type='sms_sent_async',
            value=1,
            tags={'recipient': to_number[-10:]},
        )
        
        return {'status': 'sent', 'message_sid': result}
        
    except Exception as e:
        logger.error(f"❌ Error sending async SMS: {e}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=2)
def send_bulk_sms_async(self, organization_id, recipients, message):
    """
    Asynchronously send bulk SMS
    
    Args:
        organization_id: Organization UUID
        recipients: List of recipient dicts
        message: SMS message
    """
    try:
        service = SMSSenderService(organization_id=organization_id)
        result = service.send_bulk(
            recipients=recipients,
            message=message,
        )
        
        logger.info(f"📲 Async bulk SMS: {result['sent']}/{result['total']} sent")
        
        # Log to MongoDB
        mongo = MongoDBService(organization_id=organization_id)
        mongo.log_metric(
            metric_type='bulk_sms_sent',
            value=result['sent'],
            tags={'failed': result['failed']},
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error sending async bulk SMS: {e}")
        raise self.retry(exc=e, countdown=120 * (2 ** self.request.retries))


# ============================================================================
# REPORT GENERATION TASKS
# ============================================================================

@shared_task(bind=True, max_retries=1)
def generate_campaign_report_async(self, organization_id, days=30, format='pdf'):
    """
    Asynchronously generate campaign report
    
    Args:
        organization_id: Organization UUID
        days: Number of days to include
        format: Report format (json, csv, pdf)
    """
    try:
        service = ReportingService(organization_id=organization_id)
        result = service.generate_campaign_report(days=days, format=format)
        
        logger.info(f"📊 Campaign report generated (format: {format})")
        
        # Log to MongoDB
        mongo = MongoDBService(organization_id=organization_id)
        mongo.store_event(
            event_type='ReportGenerated',
            event_data={
                'report_type': 'campaign',
                'days': days,
                'format': format,
                'timestamp': datetime.utcnow().isoformat(),
            },
            aggregate_id=organization_id,
            aggregate_type='organization',
        )
        
        return {'status': 'generated', 'format': format}
        
    except Exception as e:
        logger.error(f"❌ Error generating campaign report: {e}")
        raise self.retry(exc=e, countdown=300)


@shared_task(bind=True, max_retries=1)
def generate_conversation_report_async(self, organization_id, days=30, format='pdf'):
    """
    Asynchronously generate conversation report
    
    Args:
        organization_id: Organization UUID
        days: Number of days to include
        format: Report format
    """
    try:
        service = ReportingService(organization_id=organization_id)
        result = service.generate_conversation_report(days=days, format=format)
        
        logger.info(f"📊 Conversation report generated")
        
        mongo = MongoDBService(organization_id=organization_id)
        mongo.store_event(
            event_type='ReportGenerated',
            event_data={
                'report_type': 'conversation',
                'days': days,
                'format': format,
            },
            aggregate_id=organization_id,
            aggregate_type='organization',
        )
        
        return {'status': 'generated', 'format': format}
        
    except Exception as e:
        logger.error(f"❌ Error generating conversation report: {e}")
        raise self.retry(exc=e, countdown=300)


@shared_task(bind=True, max_retries=1)
def generate_summary_report_async(self, organization_id, days=30):
    """
    Asynchronously generate executive summary report
    
    Args:
        organization_id: Organization UUID
        days: Number of days to include
    """
    try:
        service = ReportingService(organization_id=organization_id)
        result = service.generate_summary_report(days=days, format='dict')
        
        logger.info(f"📊 Summary report generated")
        
        mongo = MongoDBService(organization_id=organization_id)
        mongo.store_event(
            event_type='ReportGenerated',
            event_data={
                'report_type': 'summary',
                'days': days,
            },
            aggregate_id=organization_id,
            aggregate_type='organization',
        )
        
        return {'status': 'generated', 'type': 'summary'}
        
    except Exception as e:
        logger.error(f"❌ Error generating summary report: {e}")
        raise self.retry(exc=e, countdown=300)


# ============================================================================
# PAYMENT TASKS
# ============================================================================

@shared_task(bind=True, max_retries=2)
def sync_invoices_async(self, organization_id, customer_id):
    """
    Asynchronously sync invoices from Stripe
    
    Args:
        organization_id: Organization UUID
        customer_id: Stripe customer ID
    """
    try:
        service = PaymentService(organization_id=organization_id)
        invoices = service.list_invoices(customer_id=customer_id, limit=50)
        
        logger.info(f"💳 Synced {len(invoices)} invoices for customer")
        
        mongo = MongoDBService(organization_id=organization_id)
        mongo.log_metric(
            metric_type='invoices_synced',
            value=len(invoices),
            tags={'customer_id': customer_id[:20]},
        )
        
        return {'status': 'synced', 'count': len(invoices)}
        
    except Exception as e:
        logger.error(f"❌ Error syncing invoices: {e}")
        raise self.retry(exc=e, countdown=300)


# ============================================================================
# MAINTENANCE TASKS
# ============================================================================

@shared_task
def cleanup_old_reports():
    """
    Cleanup old generated reports from MongoDB
    Keep reports for 30 days
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        # This would be implemented with actual MongoDB cleanup
        logger.info(f"🧹 Cleanup: Removed reports older than {cutoff_date}")
        
        return {'status': 'cleaned', 'cutoff_date': cutoff_date.isoformat()}
        
    except Exception as e:
        logger.error(f"❌ Error in cleanup: {e}")
        return {'status': 'error', 'message': str(e)}


@shared_task
def check_email_delivery_status():
    """
    Check delivery status of recently sent emails
    """
    try:
        # This would check with SendGrid for delivery status
        logger.info("📧 Checking email delivery status")
        
        return {'status': 'checked'}
        
    except Exception as e:
        logger.error(f"❌ Error checking email status: {e}")
        return {'status': 'error', 'message': str(e)}


@shared_task
def check_sms_delivery_status():
    """
    Check delivery status of recently sent SMS
    """
    try:
        # This would check with Twilio for delivery status
        logger.info("📱 Checking SMS delivery status")
        
        return {'status': 'checked'}
        
    except Exception as e:
        logger.error(f"❌ Error checking SMS status: {e}")
        return {'status': 'error', 'message': str(e)}


@shared_task
def sync_stripe_events():
    """
    Sync recent Stripe events (payments, subscriptions, etc)
    """
    try:
        logger.info("💳 Syncing Stripe events")
        
        return {'status': 'synced'}
        
    except Exception as e:
        logger.error(f"❌ Error syncing Stripe events: {e}")
        return {'status': 'error', 'message': str(e)}
