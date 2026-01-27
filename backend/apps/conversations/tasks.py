"""
Conversation and message Celery tasks
"""
from celery import shared_task
from django.utils import timezone
from .models import Conversation, ConversationLog, Contact


@shared_task
def update_conversation_metrics(conversation_id):
    """
    Update conversation metrics (response time, etc)
    
    Run periodically for active conversations
    """
    try:
        conversation = Conversation.objects.get(id=conversation_id)
        
        # Calculate average response time
        logs = ConversationLog.objects.filter(
            conversation=conversation,
            event_type='message_sent'
        )
        
        if logs.count() > 0:
            # TODO: Calculate average response time
            pass
        
        return f"Updated metrics for conversation {conversation_id}"
        
    except Conversation.DoesNotExist:
        return f"Conversation {conversation_id} not found"


@shared_task
def auto_close_inactive_conversations():
    """
    Automatically close conversations inactive for 24 hours
    
    Run daily
    """
    from django.utils import timezone
    from datetime import timedelta
    
    inactive_threshold = timezone.now() - timedelta(hours=24)
    
    inactive_conversations = Conversation.objects.filter(
        status__in=['active', 'waiting'],
        last_message_at__lt=inactive_threshold,
        deleted_at__isnull=True
    )
    
    count = 0
    for conv in inactive_conversations:
        conv.status = 'closed'
        conv.closed_at = timezone.now()
        conv.save()
        count += 1
    
    return f"Closed {count} inactive conversations"


@shared_task
def sync_contact_from_whatsapp(contact_id):
    """
    Sync contact data with WhatsApp
    
    Called after webhook contact_changed event
    """
    try:
        contact = Contact.objects.get(id=contact_id)
        
        # TODO: Call WhatsApp API to get latest contact info
        # Update: avatar_url, name, status, etc
        
        return f"Synced contact {contact_id}"
        
    except Contact.DoesNotExist:
        return f"Contact {contact_id} not found"
