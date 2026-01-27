"""
RBAC (Role-Based Access Control) models
"""
from django.db import models
from apps.core.models import BaseModel


class Role(BaseModel):
    """Dynamic role model for RBAC system"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='roles',
        null=True,
        blank=True,
        help_text="Organization this role belongs to (null for system roles)"
    )
    
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, db_index=True)
    description = models.TextField(null=True, blank=True)
    permissions = models.JSONField(default=list, blank=True)
    is_system_role = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'roles'
        unique_together = [['organization', 'slug']]
        ordering = ['name']
        indexes = [
            models.Index(fields=['organization', 'slug']),
            models.Index(fields=['is_system_role']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.organization.name if self.organization else 'System'})"
