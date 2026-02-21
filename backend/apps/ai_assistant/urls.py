"""
AI Assistant URLs
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AICustomModelViewSet, ai_settings, generate_flow, test_ai_settings

router = DefaultRouter()
router.register('ai-models', AICustomModelViewSet, basename='ai-model')

urlpatterns = [
    path('settings/', ai_settings, name='ai-settings'),
    path('test/', test_ai_settings, name='ai-test'),
    path('generate-flow/', generate_flow, name='ai-generate-flow'),
] + router.urls
