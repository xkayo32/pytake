"""
Expense tracking models
"""
from django.db import models
from apps.core.models import BaseModel


class Expense(BaseModel):
    """Expense model for cost tracking"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='expenses'
    )
    
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='BRL')
    
    CATEGORY_CHOICES = [
        ('whatsapp', 'WhatsApp'),
        ('api', 'API'),
        ('storage', 'Storage'),
        ('other', 'Other'),
    ]
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    
    expense_date = models.DateField(db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'expenses'
        ordering = ['-expense_date']
        indexes = [
            models.Index(fields=['organization', 'expense_date']),
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return f"{self.description} - {self.amount} {self.currency}"
