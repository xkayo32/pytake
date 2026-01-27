"""
Chatbot and Flow models
"""
from django.db import models
from apps.core.models import BaseModel


class Chatbot(BaseModel):
    """Chatbot model"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='chatbots'
    )
    
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)
    
    # Configuration
    settings = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'chatbots'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class FlowAutomation(BaseModel):
    """Flow automation for chatbots"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='flow_automations'
    )
    chatbot = models.ForeignKey(
        Chatbot,
        on_delete=models.CASCADE,
        related_name='automations'
    )
    
    name = models.CharField(max_length=255)
    trigger_type = models.CharField(max_length=50)
    trigger_config = models.JSONField(default=dict, blank=True)
    actions = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'flow_automations'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.chatbot.name}"
