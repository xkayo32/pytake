"""
Queue URLs
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import QueueViewSet, AgentSkillViewSet

router = DefaultRouter()
router.register('queues', QueueViewSet, basename='queue')
router.register('agent-skills', AgentSkillViewSet, basename='agent-skill')

urlpatterns = [] + router.urls
