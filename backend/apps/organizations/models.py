"""
Organization model - Multi-tenancy core
"""
from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import BaseModel


class Organization(BaseModel):
    """
    Organization model for multi-tenancy.
    Each organization is a separate tenant with isolated data.
    """
    # Basic Info
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    description = models.TextField(null=True, blank=True)
    logo_url = models.URLField(max_length=500, null=True, blank=True)

    # WhatsApp Business Info (DEPRECATED - use whatsapp_numbers table)
    whatsapp_business_id = models.CharField(max_length=255, null=True, blank=True)
    whatsapp_webhook_verify_token = models.CharField(max_length=255, null=True, blank=True)

    # Subscription & Plan
    PLAN_CHOICES = [
        ('free', 'Free'),
        ('starter', 'Starter'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]
    plan_type = models.CharField(
        max_length=50,
        choices=PLAN_CHOICES,
        default='free',
        db_index=True
    )
    plan_starts_at = models.DateTimeField(null=True, blank=True)
    plan_expires_at = models.DateTimeField(null=True, blank=True)

    # Plan Limits
    max_chatbots = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
    max_whatsapp_numbers = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
    max_contacts = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
    max_agents = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
    max_departments = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
    monthly_message_limit = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])

    # Usage Tracking
    current_chatbots_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    current_whatsapp_numbers_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    current_contacts_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    current_agents_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    current_month_messages_sent = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    current_month_messages_received = models.IntegerField(default=0, validators=[MinValueValidator(0)])

    # Settings
    settings = models.JSONField(default=dict, blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    is_trial = models.BooleanField(default=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)

    # Billing
    stripe_customer_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    stripe_subscription_id = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'organizations'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['plan_type']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.slug})"

    @property
    def is_plan_active(self):
        """Check if plan is currently active"""
        if not self.is_active:
            return False
        if self.plan_expires_at:
            from django.utils import timezone
            return timezone.now() < self.plan_expires_at
        return True

    def _get_plan_limits(self):
        """Get plan limits based on plan_type"""
        from django.conf import settings
        
        if self.plan_type == 'free':
            return {
                'chatbots': self.max_chatbots or getattr(settings, 'FREE_PLAN_CHATBOTS', 1),
                'whatsapp_numbers': self.max_whatsapp_numbers or getattr(settings, 'FREE_PLAN_WHATSAPP_NUMBERS', 1),
                'contacts': self.max_contacts or getattr(settings, 'FREE_PLAN_CONTACTS', 100),
                'agents': self.max_agents or getattr(settings, 'FREE_PLAN_AGENTS', 1),
                'departments': self.max_departments or getattr(settings, 'FREE_PLAN_DEPARTMENTS', 1),
                'monthly_messages': self.monthly_message_limit or getattr(settings, 'FREE_PLAN_MONTHLY_MESSAGES', 1000),
            }
        elif self.plan_type == 'starter':
            return {
                'chatbots': self.max_chatbots or getattr(settings, 'STARTER_PLAN_CHATBOTS', 5),
                'whatsapp_numbers': self.max_whatsapp_numbers or getattr(settings, 'STARTER_PLAN_WHATSAPP_NUMBERS', 2),
                'contacts': self.max_contacts or getattr(settings, 'STARTER_PLAN_CONTACTS', 1000),
                'agents': self.max_agents or getattr(settings, 'STARTER_PLAN_AGENTS', 5),
                'departments': self.max_departments or getattr(settings, 'STARTER_PLAN_DEPARTMENTS', 3),
                'monthly_messages': self.monthly_message_limit or getattr(settings, 'STARTER_PLAN_MONTHLY_MESSAGES', 10000),
            }
        else:  # professional, enterprise
            return {
                'chatbots': self.max_chatbots or 999999,
                'whatsapp_numbers': self.max_whatsapp_numbers or 999999,
                'contacts': self.max_contacts or 999999,
                'agents': self.max_agents or 999999,
                'departments': self.max_departments or 999999,
                'monthly_messages': self.monthly_message_limit or 999999,
            }

    def can_add_chatbot(self):
        limits = self._get_plan_limits()
        return self.current_chatbots_count < limits['chatbots']

    def can_add_whatsapp_number(self):
        limits = self._get_plan_limits()
        return self.current_whatsapp_numbers_count < limits['whatsapp_numbers']

    def can_add_contact(self):
        limits = self._get_plan_limits()
        return self.current_contacts_count < limits['contacts']

    def can_send_message(self):
        limits = self._get_plan_limits()
        return self.current_month_messages_sent < limits['monthly_messages']
