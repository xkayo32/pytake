"""
Core Celery tasks (general utilities)
"""
from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from .models import AuditLog


@shared_task
def send_email_async(subject, message, from_email, recipient_list):
    """
    Send email asynchronously
    """
    try:
        send_mail(subject, message, from_email, recipient_list)
        return f"Email sent to {recipient_list}"
    except Exception as e:
        return f"Error sending email: {str(e)}"


@shared_task
def cleanup_old_audit_logs():
    """
    Delete audit logs older than 90 days
    
    Run weekly
    """
    cutoff_date = timezone.now() - timezone.timedelta(days=90)
    
    deleted_count, _ = AuditLog.objects.filter(
        created_at__lt=cutoff_date
    ).delete()
    
    return f"Deleted {deleted_count} old audit logs"


@shared_task
def generate_organization_report(organization_id):
    """
    Generate monthly report for organization
    
    Includes:
    - Messages sent/received
    - Conversations stats
    - Campaign performance
    - Agent performance
    """
    try:
        from apps.organizations.models import Organization
        
        org = Organization.objects.get(id=organization_id)
        
        # TODO: Generate report data
        # TODO: Send via email or save to database
        
        return f"Generated report for {org.name}"
        
    except Organization.DoesNotExist:
        return f"Organization {organization_id} not found"


@shared_task
def sync_contacts_daily():
    """
    Daily sync of contacts with WhatsApp
    
    Updates last seen time, profile pictures, etc
    """
    # TODO: Iterate through all contacts and sync
    return "Daily sync completed"
