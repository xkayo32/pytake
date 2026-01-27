"""
Core models and mixins for Django
Base classes and utilities shared across all apps
"""
from django.db import models
from django.utils import timezone
import uuid


class UUIDModel(models.Model):
    """Base model with UUID primary key"""
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    class Meta:
        abstract = True


class TimestampModel(models.Model):
    """Mixin to add timestamp fields"""
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when record was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when record was last updated"
    )

    class Meta:
        abstract = True


class SoftDeleteModel(models.Model):
    """Mixin to add soft delete capability"""
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Timestamp when record was soft deleted"
    )

    class Meta:
        abstract = True

    @property
    def is_deleted(self):
        """Check if record is soft deleted"""
        return self.deleted_at is not None

    def soft_delete(self):
        """Soft delete the record"""
        self.deleted_at = timezone.now()
        self.save(update_fields=['deleted_at'])

    def restore(self):
        """Restore soft deleted record"""
        self.deleted_at = None
        self.save(update_fields=['deleted_at'])


class BaseModel(UUIDModel, TimestampModel, SoftDeleteModel):
    """
    Base model combining UUID, timestamps, and soft delete
    All PyTake models should inherit from this
    """
    class Meta:
        abstract = True


class AuditLog(UUIDModel, TimestampModel):
    """Audit log for tracking changes"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='audit_logs',
        null=True,
        blank=True
    )
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    
    action = models.CharField(max_length=50, db_index=True)
    resource_type = models.CharField(max_length=50, db_index=True)
    resource_id = models.UUIDField(null=True, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]


class Secret(BaseModel):
    """Encrypted secrets storage"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='secrets'
    )
    
    key = models.CharField(max_length=255, unique=True, db_index=True)
    encrypted_value = models.TextField()
    description = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'secrets'
        ordering = ['key']
    
    def __str__(self):
        return self.key
