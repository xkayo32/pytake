"""
Django Admin Interface for Integrations
"""
from django.contrib import admin
from django.utils.html import format_html
from apps.integrations.models import (
    IntegrationProvider,
    IntegrationLog,
    WebhookDestination,
    WebhookDeliveryAttempt,
)


@admin.register(IntegrationProvider)
class IntegrationProviderAdmin(admin.ModelAdmin):
    """Admin for integration providers"""

    list_display = (
        "provider",
        "organization",
        "status_badge",
        "requests_today",
        "error_count",
        "last_used_at",
        "created_at",
    )
    list_filter = ("provider", "status", "created_at")
    search_fields = ("organization__name", "api_key")
    readonly_fields = ("created_at", "updated_at", "last_used_at", "error_count")
    fieldsets = (
        ("Provider Info", {
            "fields": ("provider", "organization", "status"),
        }),
        ("Credentials", {
            "fields": ("api_key", "api_secret"),
            "classes": ("collapse",),
        }),
        ("Configuration", {
            "fields": ("config", "requests_limit", "requests_today"),
        }),
        ("Error Tracking", {
            "fields": ("error_count", "last_error"),
        }),
        ("Metadata", {
            "fields": ("created_at", "updated_at", "last_used_at"),
        }),
    )

    def status_badge(self, obj):
        colors = {
            "active": "green",
            "inactive": "gray",
            "error": "red",
            "expired": "orange",
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.status, "black"),
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(IntegrationLog)
class IntegrationLogAdmin(admin.ModelAdmin):
    """Admin for integration logs"""

    list_display = (
        "action",
        "integration_provider",
        "method",
        "status_badge",
        "response_time_ms",
        "created_at",
    )
    list_filter = ("status", "method", "created_at", "integration__provider")
    search_fields = ("action", "endpoint", "error_message")
    readonly_fields = (
        "integration",
        "action",
        "endpoint",
        "method",
        "status",
        "status_code",
        "response_time_ms",
        "request_body",
        "response_body",
        "error_message",
        "external_id",
        "created_at",
    )

    def integration_provider(self, obj):
        return obj.integration.get_provider_display()

    integration_provider.short_description = "Provider"

    def status_badge(self, obj):
        colors = {
            "success": "green",
            "error": "red",
            "pending": "blue",
            "rate_limited": "orange",
        }
        return format_html(
            '<span style="color: {};">{}</span>',
            colors.get(obj.status, "black"),
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(WebhookDestination)
class WebhookDestinationAdmin(admin.ModelAdmin):
    """Admin for webhook destinations"""

    list_display = (
        "name",
        "organization",
        "status_badge",
        "total_delivered",
        "total_failed",
        "last_triggered_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("name", "url", "organization__name")
    readonly_fields = (
        "secret_key",
        "created_at",
        "updated_at",
        "last_triggered_at",
        "total_delivered",
        "total_failed",
    )
    fieldsets = (
        ("Destination Info", {
            "fields": ("name", "organization", "status"),
        }),
        ("URL & Events", {
            "fields": ("url", "events"),
        }),
        ("Security", {
            "fields": ("secret_key", "headers"),
            "classes": ("collapse",),
        }),
        ("Retry Configuration", {
            "fields": ("max_retries", "retry_interval_seconds"),
        }),
        ("Statistics", {
            "fields": ("total_delivered", "total_failed", "last_triggered_at"),
        }),
        ("Metadata", {
            "fields": ("created_at", "updated_at"),
        }),
    )

    def status_badge(self, obj):
        colors = {
            "active": "green",
            "inactive": "gray",
            "failed": "red",
        }
        return format_html(
            '<span style="color: {};">{}</span>',
            colors.get(obj.status, "black"),
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(WebhookDeliveryAttempt)
class WebhookDeliveryAttemptAdmin(admin.ModelAdmin):
    """Admin for webhook delivery attempts"""

    list_display = (
        "event_type",
        "destination_name",
        "status_badge",
        "attempt_count",
        "last_attempt_at",
        "created_at",
    )
    list_filter = ("status", "event_type", "created_at")
    search_fields = ("event_type", "destination__name", "error_message")
    readonly_fields = (
        "destination",
        "event_type",
        "payload",
        "status",
        "attempt_count",
        "last_attempt_at",
        "next_retry_at",
        "http_status_code",
        "response_body",
        "error_message",
        "created_at",
        "updated_at",
    )

    def destination_name(self, obj):
        return obj.destination.name

    destination_name.short_description = "Destination"

    def status_badge(self, obj):
        colors = {
            "pending": "blue",
            "delivered": "green",
            "failed": "red",
            "cancelled": "gray",
        }
        return format_html(
            '<span style="color: {};">{}</span>',
            colors.get(obj.status, "black"),
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
