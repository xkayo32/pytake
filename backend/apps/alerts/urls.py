"""
Alert URLs
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AlertViewSet, NotificationViewSet, AlertNotificationViewSet

router = DefaultRouter()
router.register('alerts', AlertViewSet, basename='alert')
router.register('notifications', NotificationViewSet, basename='notification')
router.register('alert-notifications', AlertNotificationViewSet, basename='alert-notification')

urlpatterns = [] + router.urls
