"""
AI Assistant models
"""
from django.db import models
from apps.core.models import BaseModel


class AISettings(BaseModel):
    """AI Assistant Settings per Organization"""

    organization = models.OneToOneField(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='ai_settings',
        unique=True
    )

    # General Settings
    enabled = models.BooleanField(default=True)
    provider = models.CharField(max_length=50, default='openai')
    model = models.CharField(max_length=100, default='gpt-4')
    temperature = models.FloatField(default=0.7)
    max_tokens = models.IntegerField(default=1000)

    # API Keys (encrypted)
    openai_api_key = models.TextField(null=True, blank=True)
    anthropic_api_key = models.TextField(null=True, blank=True)
    gemini_api_key = models.TextField(null=True, blank=True)

    # Additional features
    enable_flow_generation = models.BooleanField(default=False)
    enable_improvements = models.BooleanField(default=False)

    class Meta:
        db_table = 'ai_settings'
        verbose_name = 'AI Setting'
        verbose_name_plural = 'AI Settings'

    def __str__(self):
        return f"AI Settings - {self.organization.name}"


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
