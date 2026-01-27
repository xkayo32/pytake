"""
Conversation, Contact and Message models
"""
from django.db import models
from django.core.validators import MinValueValidator
from django.contrib.postgres.fields import ArrayField
from apps.core.models import BaseModel, UUIDModel, TimestampModel
import uuid


class Contact(BaseModel):
    """Contact model - CRM"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='contacts'
    )
    
    # WhatsApp Info
    whatsapp_id = models.CharField(max_length=20, db_index=True)
    whatsapp_name = models.CharField(max_length=255, null=True, blank=True)
    
    # Basic Info
    name = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    email = models.EmailField(null=True, blank=True, db_index=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    avatar_url = models.URLField(max_length=500, null=True, blank=True)
    
    # Additional
    company = models.CharField(max_length=255, null=True, blank=True)
    job_title = models.CharField(max_length=255, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    
    # Address
    address_street = models.CharField(max_length=255, null=True, blank=True)
    address_city = models.CharField(max_length=100, null=True, blank=True)
    address_state = models.CharField(max_length=100, null=True, blank=True)
    address_country = models.CharField(max_length=100, null=True, blank=True)
    address_zipcode = models.CharField(max_length=20, null=True, blank=True)
    
    # Custom Attributes
    attributes = models.JSONField(default=dict, blank=True)
    
    # Segmentation
    source = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    lead_score = models.IntegerField(default=0)
    lifecycle_stage = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    
    # Opt-in
    opt_in = models.BooleanField(default=True)
    opt_in_date = models.DateTimeField(null=True, blank=True)
    opt_out_date = models.DateTimeField(null=True, blank=True)
    
    # Blocking
    is_blocked = models.BooleanField(default=False)
    blocked_at = models.DateTimeField(null=True, blank=True)
    blocked_reason = models.TextField(null=True, blank=True)
    is_vip = models.BooleanField(default=False, db_index=True)
    
    # Activity
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)
    last_message_received_at = models.DateTimeField(null=True, blank=True)
    last_message_sent_at = models.DateTimeField(null=True, blank=True)
    
    total_messages_sent = models.IntegerField(default=0)
    total_messages_received = models.IntegerField(default=0)
    total_conversations = models.IntegerField(default=0)
    
    average_response_time_seconds = models.IntegerField(null=True, blank=True)
    last_engagement_score = models.IntegerField(default=0)
    
    # Assignments
    assigned_agent = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_contacts'
    )
    assigned_department = models.ForeignKey(
        'organizations.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contacts'
    )
    
    class Meta:
        db_table = 'contacts'
        ordering = ['-created_at']
        unique_together = [['organization', 'whatsapp_id']]
        indexes = [
            models.Index(fields=['organization', 'whatsapp_id']),
            models.Index(fields=['is_vip']),
        ]
    
    def __str__(self):
        return self.display_name
    
    @property
    def display_name(self):
        return self.name or self.whatsapp_name or self.whatsapp_id


class Conversation(BaseModel):
    """Conversation model - Chat thread"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    whatsapp_number = models.ForeignKey(
        'whatsapp.WhatsAppNumber',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations'
    )
    
    # Agent Assignment
    current_agent = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_conversations'
    )
    department = models.ForeignKey(
        'organizations.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations'
    )
    queue = models.ForeignKey(
        'queues.Queue',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations'
    )
    
    # Chatbot
    active_chatbot = models.ForeignKey(
        'chatbots.Chatbot',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='active_conversations'
    )
    
    # Status
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('pending', 'Pending'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open', db_index=True)
    
    # Timestamps
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)
    last_customer_message_at = models.DateTimeField(null=True, blank=True)
    last_agent_message_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    
    # Flags
    is_unread = models.BooleanField(default=True, db_index=True)
    is_priority = models.BooleanField(default=False, db_index=True)
    is_spam = models.BooleanField(default=False)
    
    # Metrics
    message_count = models.IntegerField(default=0)
    agent_message_count = models.IntegerField(default=0)
    customer_message_count = models.IntegerField(default=0)
    
    # Tags
    tags = ArrayField(
        models.CharField(max_length=100),
        default=list,
        blank=True
    )
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'conversations'
        ordering = ['-last_message_at']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['contact', '-last_message_at']),
            models.Index(fields=['current_agent', 'status']),
            models.Index(fields=['-last_message_at']),
        ]
    
    def __str__(self):
        return f"Conversation with {self.contact.display_name}"


class ConversationWindow(BaseModel):
    """24-hour conversation window tracking"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='conversation_windows'
    )
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='windows'
    )
    whatsapp_number = models.ForeignKey(
        'whatsapp.WhatsAppNumber',
        on_delete=models.CASCADE,
        related_name='conversation_windows'
    )
    
    opened_at = models.DateTimeField()
    expires_at = models.DateTimeField(db_index=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    
    messages_sent = models.IntegerField(default=0)
    last_message_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'conversation_windows'
        ordering = ['-opened_at']
        indexes = [
            models.Index(fields=['conversation', 'is_active']),
            models.Index(fields=['expires_at']),
        ]


class ConversationLog(UUIDModel, TimestampModel):
    """Audit log for conversation events"""
    
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='logs'
    )
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    event_type = models.CharField(max_length=50, db_index=True)
    event_data = models.JSONField(default=dict, blank=True)
    message = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'conversation_logs'
        ordering = ['-created_at']


class ConversationState(UUIDModel, TimestampModel):
    """Conversation state for flows/chatbots"""
    
    conversation = models.OneToOneField(
        Conversation,
        on_delete=models.CASCADE,
        related_name='state'
    )
    
    current_node_id = models.UUIDField(null=True, blank=True)
    variables = models.JSONField(default=dict, blank=True)
    context = models.JSONField(default=dict, blank=True)
    last_interaction_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'conversation_states'
