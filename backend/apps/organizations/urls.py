"""
Organization URLs
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, DepartmentViewSet

router = DefaultRouter()
router.register('organizations', OrganizationViewSet, basename='organization')
router.register('departments', DepartmentViewSet, basename='department')

urlpatterns = [] + router.urls
