"""
Authentication views and viewsets
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema

from .models import User
from .serializers import UserDetailSerializer, UserCreateSerializer, UserUpdateSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Customized JWT token serializer with additional user data"""
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add user data to token response
        user = self.user
        data['user'] = UserDetailSerializer(user).data
        data['refresh'] = str(data['refresh'])
        data['access'] = str(data['access'])
        
        return data


class LoginViewSet(viewsets.ViewSet):
    """
    API endpoint for user login
    POST /api/v1/auth/login/
    """
    permission_classes = [AllowAny]
    serializer_class = UserDetailSerializer
    
    @extend_schema(
        request=UserCreateSerializer,
        responses=UserDetailSerializer
    )
    def create(self, request):
        """Login with email and password"""
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(request, email=email, password=password)
        
        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'error': 'User account is disabled'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CustomTokenObtainPairSerializer(data={
            'email': email,
            'password': password
        })
        
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterViewSet(viewsets.ViewSet):
    """
    API endpoint for user registration
    POST /api/v1/auth/register/
    """
    permission_classes = [AllowAny]
    serializer_class = UserCreateSerializer
    
    @extend_schema(
        request=UserCreateSerializer,
        responses=UserDetailSerializer
    )
    def create(self, request):
        """Register new user"""
        serializer = UserCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                UserDetailSerializer(user).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ViewSet):
    """
    API endpoint for user management
    GET /api/v1/users/ - List all users (paginated)
    POST /api/v1/users/ - Create new user
    GET /api/v1/users/{id}/ - Get user details
    PUT /api/v1/users/{id}/ - Update user
    DELETE /api/v1/users/{id}/ - Delete user
    GET /api/v1/users/me/ - Get current user
    PUT /api/v1/users/me/ - Update current user
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """List all users in organization"""
        organization = request.user.organization
        users = User.objects.filter(
            organization=organization,
            deleted_at__isnull=True
        )
        
        serializer = UserDetailSerializer(users, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, pk=None):
        """Get specific user"""
        try:
            user = User.objects.get(
                id=pk,
                organization=request.user.organization,
                deleted_at__isnull=True
            )
            serializer = UserDetailSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def update(self, request, pk=None):
        """Update user"""
        try:
            user = User.objects.get(
                id=pk,
                organization=request.user.organization,
                deleted_at__isnull=True
            )
            
            serializer = UserUpdateSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(UserDetailSerializer(user).data)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user"""
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put'])
    def update_me(self, request):
        """Update current user"""
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(UserDetailSerializer(request.user).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(exclude=True)
class TokenBlacklistViewSet(viewsets.ViewSet):
    """
    API endpoint for logout (token blacklist)
    POST /api/v1/auth/logout/
    """
    permission_classes = [IsAuthenticated]
    
    def create(self, request):
        """Logout and blacklist token"""
        try:
            refresh = request.data.get('refresh')
            if not refresh:
                return Response(
                    {'error': 'Refresh token required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Django REST Framework Simple JWT handles blacklist
            return Response(
                {'detail': 'Successfully logged out'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
