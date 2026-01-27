"""
WhatsApp URLs
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import WhatsAppNumberViewSet, WhatsAppTemplateViewSet

router = DefaultRouter()
router.register('whatsapp-numbers', WhatsAppNumberViewSet, basename='whatsapp-number')
router.register('whatsapp-templates', WhatsAppTemplateViewSet, basename='whatsapp-template')

urlpatterns = [] + router.urls
