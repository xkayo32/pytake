"""
Integration Models
Tracks API credentials and integration status for external services
"""
from django.db import models
from django.contrib.postgres.fields import ArrayField

from apps.core.models import BaseModel


class IntegrationProvider(BaseModel):
    """External service provider configuration"""

    PROVIDER_CHOICES = [
        ("whatsapp", "WhatsApp Business API"),
        ("openai", "OpenAI"),
        ("anthropic", "Anthropic (Claude)"),
        ("google_gemini", "Google Gemini"),
        ("sendgrid", "SendGrid Email"),
        ("twilio", "Twilio SMS"),
        ("stripe", "Stripe Payment"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("error", "Error"),
        ("expired", "Expired"),
    ]

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="integrations",
    )
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="inactive")
    
    # Encrypted credentials
    api_key = models.TextField()
    api_secret = models.TextField(blank=True, null=True)
    
    # Configuration metadata
    config = models.JSONField(default=dict, blank=True)
    
    # Usage metrics
    requests_today = models.IntegerField(default=0)
    requests_limit = models.IntegerField(default=10000)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    # Error tracking
    last_error = models.TextField(blank=True, null=True)
    error_count = models.IntegerField(default=0)
    
    class Meta:
        db_table = "integrations_provider"
        indexes = [
            models.Index(fields=["organization", "provider"]),
            models.Index(fields=["status"]),
        ]
        unique_together = ("organization", "provider")
        verbose_name = "Integration Provider"
        verbose_name_plural = "Integration Providers"

    def __str__(self):
        return f"{self.get_provider_display()} - {self.organization.name}"

    def is_active(self):
        return self.status == "active"


class IntegrationLog(BaseModel):
    """Log of integration API calls and responses"""

    STATUS_CHOICES = [
        ("success", "Success"),
        ("error", "Error"),
        ("pending", "Pending"),
        ("rate_limited", "Rate Limited"),
    ]

    integration = models.ForeignKey(
        IntegrationProvider,
        on_delete=models.CASCADE,
        related_name="logs",
    )
    
    # Request details
    action = models.CharField(max_length=50)
    endpoint = models.CharField(max_length=255)
    method = models.CharField(max_length=10)
    
    # Response details
    status_code = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    response_time_ms = models.IntegerField(default=0)
    
    # Data
    request_body = models.JSONField(default=dict, blank=True)
    response_body = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True, null=True)
    
    # Related objects
    external_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    
    class Meta:
        db_table = "integrations_log"
        indexes = [
            models.Index(fields=["integration", "created_at"]),
            models.Index(fields=["status"]),
            models.Index(fields=["external_id"]),
        ]
        verbose_name = "Integration Log"
        verbose_name_plural = "Integration Logs"

    def __str__(self):
        return f"{self.integration.get_provider_display()} - {self.action}"


class WebhookDestination(BaseModel):
    """Third-party webhook endpoints we deliver to"""

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("failed", "Failed"),
    ]

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="webhook_destinations",
    )
    
    name = models.CharField(max_length=255)
    url = models.URLField()
    events = ArrayField(models.CharField(max_length=50), default=list)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    
    # Security
    secret_key = models.CharField(max_length=255)
    headers = models.JSONField(default=dict, blank=True)
    
    # Retry configuration
    max_retries = models.IntegerField(default=5)
    retry_interval_seconds = models.IntegerField(default=300)
    
    # Stats
    total_delivered = models.IntegerField(default=0)
    total_failed = models.IntegerField(default=0)
    last_triggered_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = "integrations_webhook_destination"
        indexes = [
            models.Index(fields=["organization", "status"]),
        ]
        verbose_name = "Webhook Destination"
        verbose_name_plural = "Webhook Destinations"

    def __str__(self):
        return f"{self.name} - {self.url}"


class WebhookDeliveryAttempt(BaseModel):
    """Track webhook delivery attempts"""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("delivered", "Delivered"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    destination = models.ForeignKey(
        WebhookDestination,
        on_delete=models.CASCADE,
        related_name="delivery_attempts",
    )
    
    event_type = models.CharField(max_length=50)
    payload = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    
    # Delivery attempts
    attempt_count = models.IntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    
    # Response tracking
    http_status_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = "integrations_webhook_delivery_attempt"
        indexes = [
            models.Index(fields=["destination", "status"]),
            models.Index(fields=["next_retry_at"]),
        ]
        verbose_name = "Webhook Delivery Attempt"
        verbose_name_plural = "Webhook Delivery Attempts"

    def __str__(self):
        return f"{self.event_type} - {self.status}"
