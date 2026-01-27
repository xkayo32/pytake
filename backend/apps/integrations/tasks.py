"""
Integration Celery Tasks
Async operations for external integrations
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from apps.integrations.models import (
    IntegrationProvider,
    IntegrationLog,
    WebhookDeliveryAttempt,
)

logger = logging.getLogger(__name__)


@shared_task
def send_whatsapp_message(
    phone_number_id: str,
    recipient_phone: str,
    message_type: str,  # text, template, media
    message_content: dict,
    organization_id: str,
):
    """Send WhatsApp message via Business API"""
    from apps.integrations.clients.whatsapp import WhatsAppBusinessClient
    
    try:
        integration = IntegrationProvider.objects.get(
            organization_id=organization_id,
            provider="whatsapp",
        )
        
        client = WhatsAppBusinessClient(phone_number_id, integration.api_key)
        
        if message_type == "text":
            response = client.send_text_message(
                recipient_phone,
                message_content["body"],
            )
        elif message_type == "template":
            response = client.send_template_message(
                recipient_phone,
                message_content["template_name"],
                parameters=message_content.get("parameters"),
            )
        elif message_type == "media":
            response = client.send_media_message(
                recipient_phone,
                message_content["media_type"],
                message_content["media_url"],
                caption=message_content.get("caption"),
            )
        
        # Log success
        IntegrationLog.objects.create(
            integration=integration,
            action="send_message",
            destination=f"/messages",
            method="POST",
            status="success",
            response_body=response,
            external_id=response.get("messages", [{}])[0].get("id"),
        )
        
        return {
            "status": "sent",
            "message_id": response.get("messages", [{}])[0].get("id"),
        }
    except Exception as e:
        logger.error(f"WhatsApp send error: {str(e)}")
        raise


@shared_task
def process_ai_completion(
    text: str,
    provider: str,
    model: str,
    temperature: float,
    max_tokens: int,
    organization_id: str,
    callback_data: dict,
):
    """Generate AI completion asynchronously"""
    from apps.integrations.clients.ai import get_ai_client
    
    try:
        integration = IntegrationProvider.objects.get(
            organization_id=organization_id,
            provider=provider,
        )
        
        client = get_ai_client(provider, integration.api_key, model)
        response = client.complete(
            text,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        
        # Log
        IntegrationLog.objects.create(
            integration=integration,
            action="completion",
            destination="/completions",
            method="POST",
            status="success",
            response_body={"result": response},
        )
        
        return {
            "status": "success",
            "result": response,
            "callback_data": callback_data,
        }
    except Exception as e:
        logger.error(f"AI completion error: {str(e)}")
        raise


@shared_task
def send_email_via_sendgrid(
    to_email: str,
    subject: str,
    html_content: str,
    organization_id: str,
    from_email: str = "noreply@pytake.net",
):
    """Send email via SendGrid"""
    from apps.integrations.clients.communications import SendGridEmailClient
    
    try:
        integration = IntegrationProvider.objects.get(
            organization_id=organization_id,
            provider="sendgrid",
        )
        
        client = SendGridEmailClient(integration.api_key)
        response = client.send(
            to_email,
            subject,
            html_content,
            from_email=from_email,
        )
        
        # Log
        IntegrationLog.objects.create(
            integration=integration,
            action="send_email",
            destination="/mail/send",
            method="POST",
            status="success",
            response_body=response,
        )
        
        return {
            "status": "sent",
            "message_id": response.get("message_id"),
        }
    except Exception as e:
        logger.error(f"SendGrid error: {str(e)}")
        raise


@shared_task
def send_sms_via_twilio(
    to_phone: str,
    message: str,
    organization_id: str,
    from_number: str = None,
):
    """Send SMS via Twilio"""
    from apps.integrations.clients.communications import TwilioSMSClient
    
    try:
        integration = IntegrationProvider.objects.get(
            organization_id=organization_id,
            provider="twilio",
        )
        
        from_number = from_number or integration.config.get("phone_number")
        
        client = TwilioSMSClient(
            integration.api_key,
            integration.api_secret,
        )
        response = client.send(to_phone, message, from_number)
        
        # Log
        IntegrationLog.objects.create(
            integration=integration,
            action="send_sms",
            destination="/Messages",
            method="POST",
            status="success",
            response_body=response,
            external_id=response.get("message_id"),
        )
        
        return {
            "status": "sent",
            "message_id": response.get("message_id"),
        }
    except Exception as e:
        logger.error(f"Twilio error: {str(e)}")
        raise


@shared_task
def deliver_webhook(delivery_id: str):
    """Deliver webhook to external destination"""
    import json
    import hashlib
    import hmac
    import requests
    
    try:
        delivery = WebhookDeliveryAttempt.objects.get(id=delivery_id)
        destination = delivery.destination
        
        # Create signature
        signature = "sha256=" + hmac.new(
            destination.secret_key.encode(),
            json.dumps(delivery.payload).encode(),
            hashlib.sha256,
        ).hexdigest()
        
        headers = {
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": delivery.event_type,
            "Content-Type": "application/json",
            **(destination.headers or {}),
        }
        
        # Send
        response = requests.post(
            destination.url,
            json=delivery.payload,
            headers=headers,
            timeout=30,
        )
        
        # Update delivery
        delivery.attempt_count += 1
        delivery.last_attempt_at = timezone.now()
        delivery.http_status_code = response.status_code
        delivery.response_body = response.text
        
        if response.status_code in [200, 201, 202]:
            delivery.status = "delivered"
            destination.total_delivered += 1
            destination.last_triggered_at = timezone.now()
        else:
            if delivery.attempt_count < destination.max_retries:
                delivery.status = "pending"
                delivery.next_retry_at = timezone.now() + timedelta(
                    seconds=destination.retry_interval_seconds
                )
            else:
                delivery.status = "failed"
                destination.total_failed += 1
        
        delivery.save()
        destination.save()
        
        return {
            "status": delivery.status,
            "attempt": delivery.attempt_count,
        }
    except Exception as e:
        delivery = WebhookDeliveryAttempt.objects.get(id=delivery_id)
        delivery.error_message = str(e)
        
        if delivery.attempt_count < delivery.destination.max_retries:
            delivery.status = "pending"
            delivery.next_retry_at = timezone.now() + timedelta(
                seconds=delivery.destination.retry_interval_seconds
            )
        else:
            delivery.status = "failed"
        
        delivery.attempt_count += 1
        delivery.save()
        
        logger.error(f"Webhook delivery error: {str(e)}")
        raise


@shared_task
def retry_webhook_delivery(delivery_id: str):
    """Retry failed webhook delivery"""
    deliver_webhook.delay(delivery_id)


@shared_task
def cleanup_old_integration_logs():
    """Delete integration logs older than 30 days"""
    cutoff_date = timezone.now() - timedelta(days=30)
    deleted_count, _ = IntegrationLog.objects.filter(
        created_at__lt=cutoff_date,
    ).delete()
    logger.info(f"Deleted {deleted_count} old integration logs")


@shared_task
def check_integration_health():
    """Periodic health check for active integrations"""
    integrations = IntegrationProvider.objects.filter(status="active")
    
    for integration in integrations:
        try:
            if integration.provider == "whatsapp":
                from apps.integrations.clients.whatsapp import WhatsAppBusinessClient
                client = WhatsAppBusinessClient(
                    integration.config.get("phone_number_id"),
                    integration.api_key,
                )
                client.get_phone_number_info()
                integration.status = "active"
            else:
                # For other providers, we'd need specific health checks
                pass
            
            integration.error_count = 0
            integration.last_error = None
        except Exception as e:
            integration.error_count += 1
            integration.last_error = str(e)
            if integration.error_count > 5:
                integration.status = "error"
        
        integration.save()
