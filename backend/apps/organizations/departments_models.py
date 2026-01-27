"""
Department model - will be added to organizations/models.py
"""
from django.db import models
from apps.core.models import BaseModel


class Department(BaseModel):
    """Department model for organizing teams"""
    
    organization = models.ForeignKey(
        'Organization',
        on_delete=models.CASCADE,
        related_name='departments'
    )
    
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Settings
    settings = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'departments'
        ordering = ['name']
        indexes = [
            models.Index(fields=['organization', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.organization.name})"
