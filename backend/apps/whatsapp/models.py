"""
WhatsApp models - Numbers and Templates
"""
from django.db import models
from django.core.validators import MinValueValidator
from django.contrib.postgres.fields import ArrayField
from apps.core.models import BaseModel
import uuid


class WhatsAppNumber(BaseModel):
    """WhatsApp Number - Organizations can have multiple numbers"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='whatsapp_numbers'
    )
    
    # Connection Type
    CONNECTION_TYPE_CHOICES = [
        ('official', 'Official Meta API'),
        ('qrcode', 'QR Code (Evolution API)'),
    ]
    connection_type = models.CharField(max_length=20, choices=CONNECTION_TYPE_CHOICES, default='official')
    
    # WhatsApp Info
    phone_number = models.CharField(max_length=20, db_index=True)
    display_name = models.CharField(max_length=255, null=True, blank=True)
    about = models.TextField(null=True, blank=True)
    profile_picture_url = models.URLField(max_length=500, null=True, blank=True)
    
    # Meta Cloud API Credentials
    phone_number_id = models.CharField(max_length=255, null=True, blank=True)
    whatsapp_business_account_id = models.CharField(max_length=255, null=True, blank=True)
    access_token = models.TextField(null=True, blank=True)
    app_secret = models.TextField(null=True, blank=True)
    webhook_verify_token = models.CharField(max_length=255, null=True, blank=True)
    webhook_id = models.UUIDField(null=True, blank=True, db_index=True, help_text="Unique webhook identifier for Meta verification")
    
    # Evolution API Credentials
    evolution_instance_name = models.CharField(max_length=255, null=True, blank=True, unique=True)
    evolution_api_url = models.URLField(max_length=500, null=True, blank=True)
    evolution_api_key = models.TextField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Connection Status
    STATUS_CHOICES = [
        ('connected', 'Connected'),
        ('disconnected', 'Disconnected'),
        ('error', 'Error'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='disconnected')
    connected_at = models.DateTimeField(null=True, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    
    # Meta Quality Rating
    quality_rating = models.CharField(max_length=50, null=True, blank=True)
    messaging_limit_tier = models.CharField(max_length=50, null=True, blank=True)
    
    # Default configurations
    default_chatbot = models.ForeignKey(
        'chatbots.Chatbot',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )
    default_department = models.ForeignKey(
        'organizations.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )
    
    # Business hours and messages
    business_hours = models.JSONField(default=dict, blank=True)
    away_message = models.TextField(null=True, blank=True)
    welcome_message = models.TextField(null=True, blank=True)
    settings = models.JSONField(default=dict, blank=True)
    
    # Webhooks
    webhook_url = models.URLField(max_length=500, null=True, blank=True)
    webhook_token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    
    class Meta:
        db_table = 'whatsapp_numbers'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'phone_number']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.phone_number} ({self.organization.name})"


class WhatsAppTemplate(BaseModel):
    """WhatsApp Message Templates"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='whatsapp_templates'
    )
    whatsapp_number = models.ForeignKey(
        WhatsAppNumber,
        on_delete=models.CASCADE,
        related_name='templates'
    )
    
    # Template Info
    name = models.CharField(max_length=255, db_index=True)
    language = models.CharField(max_length=10, default='pt_BR')
    CATEGORY_CHOICES = [
        ('MARKETING', 'Marketing'),
        ('UTILITY', 'Utility'),
        ('AUTHENTICATION', 'Authentication'),
    ]
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    suggested_category = models.CharField(max_length=50, null=True, blank=True)
    meta_template_id = models.CharField(max_length=255, null=True, blank=True)
    
    # Status
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('DISABLED', 'Disabled'),
        ('DELETED', 'Deleted'),
    ]
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='DRAFT', db_index=True)
    
    rejected_reason = models.TextField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    
    # AI Analysis
    ai_analysis_result = models.JSONField(null=True, blank=True)
    ai_analysis_score = models.FloatField(null=True, blank=True)
    ai_suggested_category = models.CharField(max_length=50, null=True, blank=True)
    ai_analyzed_at = models.DateTimeField(null=True, blank=True)
    
    # Template Content
    header_type = models.CharField(max_length=50, null=True, blank=True)
    header_text = models.TextField(null=True, blank=True)
    header_variables_count = models.IntegerField(default=0)
    body_text = models.TextField()
    body_variables_count = models.IntegerField(default=0)
    footer_text = models.TextField(null=True, blank=True)
    buttons = models.JSONField(default=list, blank=True)
    variables = models.JSONField(default=list, blank=True)
    
    # Parameter Format
    PARAMETER_FORMAT_CHOICES = [
        ('POSITIONAL', 'Positional'),
        ('NAMED', 'Named'),
    ]
    parameter_format = models.CharField(max_length=20, choices=PARAMETER_FORMAT_CHOICES, default='POSITIONAL')
    named_variables = models.JSONField(default=list, blank=True)
    
    # Quality & Status
    quality_score = models.CharField(max_length=20, null=True, blank=True)
    paused_at = models.DateTimeField(null=True, blank=True)
    disabled_at = models.DateTimeField(null=True, blank=True)
    disabled_reason = models.TextField(null=True, blank=True)
    last_status_update = models.DateTimeField(null=True, blank=True)
    
    # Usage tracking
    sent_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    delivered_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    read_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    failed_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    
    # Flags
    is_system_template = models.BooleanField(default=False)
    is_enabled = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'whatsapp_templates'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'name']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.status})"
    
    @property
    def is_approved(self):
        return self.status == 'APPROVED'
    
    @property
    def can_be_used(self):
        return self.is_approved and self.is_enabled and not self.is_deleted
