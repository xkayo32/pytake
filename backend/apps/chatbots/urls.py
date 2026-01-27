"""
Chatbot URLs
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ChatbotViewSet, FlowAutomationViewSet

router = DefaultRouter()
router.register('chatbots', ChatbotViewSet, basename='chatbot')
router.register('flows', FlowAutomationViewSet, basename='flow')

urlpatterns = [] + router.urls
