"""
Authentication URLs
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginViewSet, RegisterViewSet, UserViewSet, TokenBlacklistViewSet
from .mfa_views import MFAViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('mfa', MFAViewSet, basename='mfa')

urlpatterns = [
    # Token endpoints
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Custom auth endpoints
    path('login/', LoginViewSet.as_view({'post': 'create'}), name='login'),
    path('register/', RegisterViewSet.as_view({'post': 'create'}), name='register'),
    path('logout/', TokenBlacklistViewSet.as_view({'post': 'create'}), name='logout'),
] + router.urls
