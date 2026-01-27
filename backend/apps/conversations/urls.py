"""
Conversation URLs
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ContactViewSet, ConversationViewSet, ConversationLogViewSet

router = DefaultRouter()
router.register('contacts', ContactViewSet, basename='contact')
router.register('conversations', ConversationViewSet, basename='conversation')

urlpatterns = [] + router.urls
