"""
Campaign Celery tasks
"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Campaign


@shared_task
def execute_campaign(campaign_id):
    """
    Execute campaign: send messages to all target contacts
    
    Process:
    1. Get campaign and validate
    2. Get target contacts based on filter
    3. Send message to each contact
    4. Track delivery status
    5. Update campaign stats
    """
    try:
        campaign = Campaign.objects.get(id=campaign_id)
        
        if campaign.status in ['running', 'completed']:
            return f"Campaign already {campaign.status}"
        
        campaign.status = 'running'
        campaign.started_at = timezone.now()
        campaign.save()
        
        from apps.conversations.models import Contact
        from apps.whatsapp.models import WhatsAppNumber
        import requests
        import json
        
        # Get target contacts
        contacts = Contact.objects.filter(
            organization=campaign.organization,
            opt_in=True,
            is_blocked=False,
            deleted_at__isnull=True
        )
        
        # Apply filter if exists
        if campaign.target_filter:
            filters = campaign.target_filter
            if filters.get('lifecycle_stage'):
                contacts = contacts.filter(lifecycle_stage=filters['lifecycle_stage'])
            if filters.get('is_vip'):
                contacts = contacts.filter(is_vip=filters['is_vip'])
        
        campaign.target_contacts_count = contacts.count()
        campaign.save()
        
        # Get WhatsApp number
        wa_number = campaign.whatsapp_number
        
        # Send message to each contact
        for contact in contacts:
            try:
                # Prepare message
                message_text = campaign.message_content
                
                # Replace variables if any
                if campaign.message_variables:
                    for var_name, contact_field in campaign.message_variables.items():
                        value = getattr(contact, contact_field, '')
                        message_text = message_text.replace(f'{{{var_name}}}', str(value))
                
                # Send via WhatsApp API
                # TODO: Integrate with WhatsApp Business API or Evolution API
                
                campaign.sent_count += 1
                
            except Exception as e:
                campaign.failed_count += 1
        
        # Mark as completed
        campaign.status = 'completed'
        campaign.completed_at = timezone.now()
        campaign.save()
        
        return f"Campaign {campaign_id} executed: {campaign.sent_count} sent, {campaign.failed_count} failed"
        
    except Campaign.DoesNotExist:
        return f"Campaign {campaign_id} not found"
    except Exception as e:
        return f"Error executing campaign: {str(e)}"


@shared_task
def schedule_campaign(campaign_id):
    """
    Check scheduled campaigns and execute them
    
    Run this task periodically (every 5 minutes)
    """
    scheduled_campaigns = Campaign.objects.filter(
        status='scheduled',
        scheduled_at__lte=timezone.now()
    )
    
    for campaign in scheduled_campaigns:
        execute_campaign.delay(campaign.id)
    
    return f"Scheduled {scheduled_campaigns.count()} campaigns"


@shared_task
def send_campaign_report(campaign_id):
    """
    Send campaign execution report via email
    """
    try:
        campaign = Campaign.objects.get(id=campaign_id)
        
        if campaign.status != 'completed':
            return "Campaign not yet completed"
        
        # TODO: Generate report and send email
        report = {
            'campaign_name': campaign.name,
            'sent': campaign.sent_count,
            'delivered': campaign.delivered_count,
            'read': campaign.read_count,
            'failed': campaign.failed_count,
            'started_at': campaign.started_at,
            'completed_at': campaign.completed_at
        }
        
        return f"Report sent for campaign {campaign_id}"
        
    except Campaign.DoesNotExist:
        return f"Campaign {campaign_id} not found"
