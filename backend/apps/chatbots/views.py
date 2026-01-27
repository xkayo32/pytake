"""
Chatbot and Flow Automation views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Chatbot, FlowAutomation
from .serializers import ChatbotDetailSerializer, ChatbotListSerializer, FlowAutomationSerializer
from apps.authentication.permissions import IsOrganizerUser


class ChatbotViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Chatbots (Visual Flow Builder)
    GET /api/v1/chatbots/ - List chatbots
    POST /api/v1/chatbots/ - Create chatbot
    GET /api/v1/chatbots/{id}/ - Get chatbot details
    PUT /api/v1/chatbots/{id}/ - Update chatbot
    DELETE /api/v1/chatbots/{id}/ - Delete chatbot
    POST /api/v1/chatbots/{id}/publish/ - Publish chatbot
    POST /api/v1/chatbots/{id}/unpublish/ - Unpublish chatbot
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    
    def get_queryset(self):
        """Return only user's organization chatbots"""
        return Chatbot.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ChatbotDetailSerializer
        return ChatbotListSerializer
    
    def perform_create(self, serializer):
        """Set organization when creating"""
        serializer.save(organization=self.request.user.organization)
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish chatbot"""
        chatbot = self.get_object()
        chatbot.is_published = True
        chatbot.save()
        return Response(
            ChatbotDetailSerializer(chatbot).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        """Unpublish chatbot"""
        chatbot = self.get_object()
        chatbot.is_published = False
        chatbot.save()
        return Response(
            ChatbotDetailSerializer(chatbot).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Get chatbot preview data"""
        chatbot = self.get_object()
        return Response({
            'id': chatbot.id,
            'name': chatbot.name,
            'description': chatbot.description,
            'is_published': chatbot.is_published,
            'flow': chatbot.settings.get('flow', {}) if chatbot.settings else {}
        })


class FlowAutomationViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Flow Automations (Triggers and Actions)
    GET /api/v1/flows/ - List flow automations
    POST /api/v1/flows/ - Create flow automation
    GET /api/v1/flows/{id}/ - Get flow details
    PUT /api/v1/flows/{id}/ - Update flow
    DELETE /api/v1/flows/{id}/ - Delete flow
    POST /api/v1/flows/{id}/enable/ - Enable flow
    POST /api/v1/flows/{id}/disable/ - Disable flow
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    serializer_class = FlowAutomationSerializer
    
    def get_queryset(self):
        """Return only user's organization flows"""
        return FlowAutomation.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True
        )
    
    def perform_create(self, serializer):
        """Set organization when creating"""
        serializer.save(organization=self.request.user.organization)
    
    @action(detail=True, methods=['post'])
    def enable(self, request, pk=None):
        """Enable flow automation"""
        flow = self.get_object()
        flow.is_active = True
        flow.save()
        return Response(FlowAutomationSerializer(flow).data)
    
    @action(detail=True, methods=['post'])
    def disable(self, request, pk=None):
        """Disable flow automation"""
        flow = self.get_object()
        flow.is_active = False
        flow.save()
        return Response(FlowAutomationSerializer(flow).data)
