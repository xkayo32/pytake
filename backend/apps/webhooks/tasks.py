"""
Webhook processing tasks (Celery)
"""
from celery import shared_task
from django.utils import timezone
from .models import WebhookEvent


@shared_task
def process_webhook_event(event_id):
    """
    Process webhook event from queue
    
    Handles:
    - Message received (save to ConversationLog)
    - Message status updates (update Conversation)
    - Contact changes (update Contact)
    - Template updates (update WhatsAppTemplate)
    """
    try:
        event = WebhookEvent.objects.get(id=event_id)
        
        if event.status == 'completed':
            return  # Already processed
        
        event.status = 'processing'
        event.save()
        
        # Process based on event type
        if event.event_type == 'message_received':
            handle_message_received(event)
        
        elif event.event_type == 'message_status_update':
            handle_message_status_update(event)
        
        elif event.event_type == 'contact_changed':
            handle_contact_changed(event)
        
        elif event.event_type == 'template_status_update':
            handle_template_status_update(event)
        
        # Mark as completed
        event.status = 'completed'
        event.processed_at = timezone.now()
        event.save()
        
    except Exception as e:
        # Handle retry logic
        if event.retry_count < event.max_retries:
            event.status = 'retry'
            event.retry_count += 1
            event.next_retry_at = timezone.now() + timezone.timedelta(minutes=5)
            event.error_message = str(e)
            event.save()
            
            # Retry after delay
            from celery import shared_task as task
            process_webhook_event.apply_async(
                args=[event_id],
                countdown=300  # 5 minutes
            )
        else:
            event.status = 'failed'
            event.error_message = str(e)
            event.save()


@shared_task
def deliver_webhook_to_endpoints(event_id):
    """
    Deliver webhook event to registered endpoints
    """
    try:
        event = WebhookEvent.objects.get(id=event_id)
        from .models import WebhookEndpoint
        import requests
        import json
        import hmac
        import hashlib
        
        # Get relevant endpoints
        endpoints = WebhookEndpoint.objects.filter(
            organization=event.organization,
            is_active=True
        )
        
        # Check if endpoint is subscribed to this event type
        endpoints = endpoints.filter(
            events__contains=event.event_type
        )
        
        for endpoint in endpoints:
            try:
                # Prepare payload
                payload = {
                    'event_type': event.event_type,
                    'source': event.source,
                    'data': event.event_data,
                    'timestamp': event.created_at.isoformat()
                }
                
                # Generate signature
                signature = hmac.new(
                    endpoint.secret_key.encode(),
                    json.dumps(payload).encode(),
                    hashlib.sha256
                ).hexdigest()
                
                # Send to endpoint
                response = requests.post(
                    endpoint.url,
                    json=payload,
                    headers={
                        'X-Webhook-Signature': signature,
                        'Content-Type': 'application/json'
                    },
                    timeout=30
                )
                
                # Update stats
                if response.status_code == 200:
                    endpoint.successful_deliveries += 1
                else:
                    endpoint.failed_deliveries += 1
                
                endpoint.total_deliveries += 1
                endpoint.last_delivery_at = timezone.now()
                endpoint.save()
                
            except Exception as e:
                endpoint.failed_deliveries += 1
                endpoint.total_deliveries += 1
                endpoint.save()
    
    except WebhookEvent.DoesNotExist:
        pass


def handle_message_received(event):
    """Handle incoming message from WhatsApp"""
    from apps.conversations.models import Conversation, ConversationLog
    
    data = event.event_data
    # TODO: Parse message data and save to database


def handle_message_status_update(event):
    """Handle message status update"""
    from apps.conversations.models import ConversationLog
    
    # TODO: Update message status (delivered, read, failed)


def handle_contact_changed(event):
    """Handle contact information change"""
    from apps.conversations.models import Contact
    
    # TODO: Update contact info


def handle_template_status_update(event):
    """Handle template status update from Meta"""
    from apps.whatsapp.models import WhatsAppTemplate
    
    # TODO: Update template status and quality score
