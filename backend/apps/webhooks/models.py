"""
Webhook models for event tracking and processing
"""
from django.db import models
from apps.core.models import BaseModel
from apps.organizations.models import Organization


class WebhookEvent(BaseModel):
    """Store webhook events for audit and replay"""
    
    EVENT_TYPES = [
        ('message_received', 'Mensagem Recebida'),
        ('message_sent', 'Mensagem Enviada'),
        ('message_delivered', 'Mensagem Entregue'),
        ('message_read', 'Mensagem Lida'),
        ('contact_changed', 'Contato Alterado'),
        ('template_status_update', 'Status do Template'),
        ('order_status_update', 'Status do Pedido'),
        ('template_quality_update', 'Qualidade do Template'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('processing', 'Processando'),
        ('completed', 'Concluído'),
        ('failed', 'Falhou'),
        ('retry', 'Tentando Novamente'),
    ]
    
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='webhook_events'
    )
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Event data
    source = models.CharField(max_length=50, default='whatsapp')  # whatsapp, stripe, etc
    event_data = models.JSONField()  # Raw event payload
    external_id = models.CharField(max_length=255, null=True, blank=True)  # WhatsApp event_id
    
    # Processing
    processed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=5)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'event_type']),
            models.Index(fields=['status', 'next_retry_at']),
            models.Index(fields=['external_id']),
        ]
    
    def __str__(self):
        return f"{self.source}:{self.event_type} - {self.status}"


class WebhookEndpoint(BaseModel):
    """Webhook endpoints for external services"""
    
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='webhook_endpoints'
    )
    
    name = models.CharField(max_length=255)
    url = models.URLField()
    is_active = models.BooleanField(default=True)
    
    # Security
    secret_key = models.CharField(max_length=255, unique=True)
    ip_whitelist = models.JSONField(default=list)  # List of allowed IPs
    
    # Event subscriptions
    events = models.JSONField(default=list)  # List of event types to receive
    
    # Stats
    total_deliveries = models.IntegerField(default=0)
    successful_deliveries = models.IntegerField(default=0)
    failed_deliveries = models.IntegerField(default=0)
    last_delivery_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.organization.name} - {self.name}"
