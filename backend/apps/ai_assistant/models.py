"""
AI Assistant models
"""
from django.db import models
from apps.core.models import BaseModel


class AICustomModel(BaseModel):
    """Custom AI model configuration"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='ai_models'
    )
    
    name = models.CharField(max_length=255)
    provider = models.CharField(max_length=50)  # openai, anthropic, google
    model_id = models.CharField(max_length=255)
    
    # Configuration
    config = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'ai_custom_models'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.provider})"
