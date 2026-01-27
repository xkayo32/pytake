"""
Django Admin Interface for Services
"""
from django.contrib import admin
from apps.services.templates.models import EmailTemplate, SMSTemplate, MessageTemplate


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    """Admin interface for email templates"""

    list_display = (
        'name',
        'organization',
        'is_active',
        'created_at',
    )
    list_filter = ('is_active', 'created_at', 'organization')
    search_fields = ('name', 'subject', 'body')
    readonly_fields = ('id', 'created_at', 'updated_at')
    fieldsets = (
        ('Template Info', {
            'fields': ('id', 'name', 'organization', 'is_active'),
        }),
        ('Content', {
            'fields': ('subject', 'body', 'html_body'),
        }),
        ('Variables', {
            'fields': ('variables',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
        }),
    )

    def get_queryset(self, request):
        """Filter templates by user's organization"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(organization=request.user.organization)


@admin.register(SMSTemplate)
class SMSTemplateAdmin(admin.ModelAdmin):
    """Admin interface for SMS templates"""

    list_display = (
        'name',
        'organization',
        'char_count',
        'is_active',
        'created_at',
    )
    list_filter = ('is_active', 'created_at', 'organization')
    search_fields = ('name', 'content')
    readonly_fields = ('id', 'char_count', 'created_at', 'updated_at')
    fieldsets = (
        ('Template Info', {
            'fields': ('id', 'name', 'organization', 'is_active'),
        }),
        ('Content', {
            'fields': ('content', 'char_count'),
        }),
        ('Variables', {
            'fields': ('variables',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
        }),
    )

    def char_count(self, obj):
        """Display character count"""
        return f"{len(obj.content)}/160"

    char_count.short_description = 'Length'

    def get_queryset(self, request):
        """Filter templates by user's organization"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(organization=request.user.organization)


@admin.register(MessageTemplate)
class MessageTemplateAdmin(admin.ModelAdmin):
    """Admin interface for message templates"""

    list_display = (
        'name',
        'organization',
        'has_media',
        'is_active',
        'created_at',
    )
    list_filter = ('is_active', 'created_at', 'organization')
    search_fields = ('name', 'text')
    readonly_fields = ('id', 'created_at', 'updated_at')
    fieldsets = (
        ('Template Info', {
            'fields': ('id', 'name', 'organization', 'is_active'),
        }),
        ('Content', {
            'fields': ('text', 'media_url', 'has_media'),
        }),
        ('Variables', {
            'fields': ('variables',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
        }),
    )

    def has_media(self, obj):
        """Display if template has media"""
        return bool(obj.media_url)

    has_media.boolean = True
    has_media.short_description = 'Has Media'

    def get_queryset(self, request):
        """Filter templates by user's organization"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(organization=request.user.organization)
