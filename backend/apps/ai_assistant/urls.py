"""
AI Assistant URLs
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AICustomModelViewSet

router = DefaultRouter()
router.register('ai-models', AICustomModelViewSet, basename='ai-model')

urlpatterns = [] + router.urls
