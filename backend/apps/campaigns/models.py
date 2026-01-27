"""
Campaign models for mass messaging
"""
from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import BaseModel


class Campaign(BaseModel):
    """Campaign model for mass messaging"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='campaigns'
    )
    whatsapp_number = models.ForeignKey(
        'whatsapp.WhatsAppNumber',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='campaigns'
    )
    
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    
    # Status
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('running', 'Running'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        db_index=True
    )
    
    # Schedule
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Target
    target_contacts_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    target_filter = models.JSONField(default=dict, blank=True)
    
    # Message
    message_template_id = models.UUIDField(null=True, blank=True)
    message_content = models.TextField()
    message_variables = models.JSONField(default=dict, blank=True)
    
    # Stats
    sent_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    delivered_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    read_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    failed_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    
    # Settings
    settings = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'campaigns'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['scheduled_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.status})"
