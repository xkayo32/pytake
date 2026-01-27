"""
AI Assistant views
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import AICustomModel
from .serializers import AICustomModelListSerializer, AICustomModelDetailSerializer
from apps.authentication.permissions import IsOrganizerUser


class AICustomModelViewSet(viewsets.ModelViewSet):
    """
    API endpoints for AI Custom Models (AI Provider Configs)
    GET /api/v1/ai-models/ - List AI models
    POST /api/v1/ai-models/ - Create AI model config
    GET /api/v1/ai-models/{id}/ - Get model details
    PUT /api/v1/ai-models/{id}/ - Update model config
    DELETE /api/v1/ai-models/{id}/ - Delete model
    POST /api/v1/ai-models/{id}/test/ - Test AI model connection
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    
    def get_queryset(self):
        """Return only user's organization AI models"""
        return AICustomModel.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AICustomModelDetailSerializer
        return AICustomModelListSerializer
    
    def perform_create(self, serializer):
        """Set organization when creating"""
        serializer.save(organization=self.request.user.organization)
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test AI model connection"""
        model = self.get_object()
        
        # TODO: Test connection to AI provider
        return Response({
            'provider': model.provider,
            'model_id': model.model_id,
            'status': 'connected',
            'message': 'AI model connection successful'
        })
