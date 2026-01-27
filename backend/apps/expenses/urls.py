from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlertsViewSet

router = DefaultRouter()
router.register(r'alerts', AlertsViewSet, basename='alerts')

urlpatterns = [
    path('', include(router.urls)),
]
