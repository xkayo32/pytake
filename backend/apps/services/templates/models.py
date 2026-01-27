"""
Template System for Email, SMS, and Messages
"""
from django.db import models
from django.template import Template, Context
from apps.core.models import BaseModel


class EmailTemplate(BaseModel):
    """Email message templates"""

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='email_templates',
    )
    
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    body = models.TextField()
    html_body = models.TextField(blank=True, null=True)
    
    # Variables that can be interpolated
    variables = models.JSONField(default=list)  # ['name', 'email', 'code']
    
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "services_email_template"
        verbose_name = "Email Template"

    def __str__(self):
        return f"{self.name} - {self.organization.name}"

    def render(self, context_data: dict) -> dict:
        """Render template with context"""
        try:
            subject_template = Template(self.subject)
            body_template = Template(self.body)
            html_template = Template(self.html_body) if self.html_body else None
            
            context = Context(context_data)
            
            return {
                'subject': subject_template.render(context),
                'body': body_template.render(context),
                'html_body': html_template.render(context) if html_template else None,
            }
        except Exception as e:
            raise ValueError(f"Error rendering template: {str(e)}")


class SMSTemplate(BaseModel):
    """SMS message templates"""

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='sms_templates',
    )
    
    name = models.CharField(max_length=255)
    body = models.CharField(max_length=160)  # SMS limit
    
    # Variables
    variables = models.JSONField(default=list)
    
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "services_sms_template"
        verbose_name = "SMS Template"

    def __str__(self):
        return f"{self.name} - {self.organization.name}"

    def render(self, context_data: dict) -> str:
        """Render template"""
        try:
            template = Template(self.body)
            context = Context(context_data)
            return template.render(context)
        except Exception as e:
            raise ValueError(f"Error rendering SMS: {str(e)}")


class MessageTemplate(BaseModel):
    """WhatsApp message templates"""

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='message_templates',
    )
    
    name = models.CharField(max_length=255)
    body = models.TextField()
    variables = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "services_message_template"
        verbose_name = "Message Template"

    def __str__(self):
        return f"{self.name} - {self.organization.name}"

    def render(self, context_data: dict) -> str:
        """Render template"""
        try:
            template = Template(self.body)
            context = Context(context_data)
            return template.render(context)
        except Exception as e:
            raise ValueError(f"Error rendering message: {str(e)}")


class TemplateService:
    """Service for rendering and managing templates"""

    @staticmethod
    def render_email(template: EmailTemplate, context: dict) -> dict:
        """Render email template"""
        return template.render(context)

    @staticmethod
    def render_sms(template: SMSTemplate, context: dict) -> str:
        """Render SMS template"""
        return template.render(context)

    @staticmethod
    def render_message(template: MessageTemplate, context: dict) -> str:
        """Render message template"""
        return template.render(context)

    @staticmethod
    def get_email_by_name(organization_id: str, name: str) -> EmailTemplate:
        """Get email template by name"""
        return EmailTemplate.objects.get(
            organization_id=organization_id,
            name=name,
            is_active=True,
        )

    @staticmethod
    def get_sms_by_name(organization_id: str, name: str) -> SMSTemplate:
        """Get SMS template by name"""
        return SMSTemplate.objects.get(
            organization_id=organization_id,
            name=name,
            is_active=True,
        )

    @staticmethod
    def get_message_by_name(organization_id: str, name: str) -> MessageTemplate:
        """Get message template by name"""
        return MessageTemplate.objects.get(
            organization_id=organization_id,
            name=name,
            is_active=True,
        )
