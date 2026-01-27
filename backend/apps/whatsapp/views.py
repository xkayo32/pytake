"""
WhatsApp management views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import WhatsAppNumber, WhatsAppTemplate
from .serializers import (
    WhatsAppNumberDetailSerializer, WhatsAppNumberListSerializer,
    WhatsAppTemplateDetailSerializer, WhatsAppTemplateListSerializer
)
from apps.authentication.permissions import IsOrganizerUser


class WhatsAppNumberViewSet(viewsets.ModelViewSet):
    """
    API endpoints for WhatsApp Numbers (Connections)
    GET /api/v1/whatsapp-numbers/ - List connections
    POST /api/v1/whatsapp-numbers/ - Add connection
    GET /api/v1/whatsapp-numbers/{id}/ - Get connection details
    PUT /api/v1/whatsapp-numbers/{id}/ - Update connection
    DELETE /api/v1/whatsapp-numbers/{id}/ - Delete connection
    POST /api/v1/whatsapp-numbers/{id}/verify/ - Verify connection
    POST /api/v1/whatsapp-numbers/{id}/test-webhook/ - Test webhook
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    
    def get_queryset(self):
        """Return only user's organization numbers"""
        return WhatsAppNumber.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WhatsAppNumberDetailSerializer
        return WhatsAppNumberListSerializer
    
    def perform_create(self, serializer):
        """Set organization when creating"""
        serializer.save(organization=self.request.user.organization)
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify WhatsApp connection"""
        wa_number = self.get_object()
        
        # TODO: Call WhatsApp API to verify connection
        wa_number.is_verified = True
        wa_number.verified_at = timezone.now()
        wa_number.status = 'verified'
        wa_number.save()
        
        return Response({
            'status': 'verified',
            'message': 'WhatsApp number verified successfully'
        })
    
    @action(detail=True, methods=['post'])
    def test_webhook(self, request, pk=None):
        """Test webhook endpoint"""
        wa_number = self.get_object()
        
        return Response({
            'webhook_url': f'/api/v1/webhooks/whatsapp/{wa_number.id}/',
            'webhook_token': wa_number.webhook_token,
            'status': 'ready_to_receive_webhooks'
        })


class WhatsAppTemplateViewSet(viewsets.ModelViewSet):
    """
    API endpoints for WhatsApp Templates (Message Templates)
    GET /api/v1/whatsapp-templates/ - List templates
    POST /api/v1/whatsapp-templates/ - Create template
    GET /api/v1/whatsapp-templates/{id}/ - Get template details
    PUT /api/v1/whatsapp-templates/{id}/ - Update template
    DELETE /api/v1/whatsapp-templates/{id}/ - Delete template
    POST /api/v1/whatsapp-templates/{id}/submit-approval/ - Submit to Meta
    POST /api/v1/whatsapp-templates/{id}/analyze-ai/ - Analyze with AI
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    
    def get_queryset(self):
        """Return only user's organization templates"""
        return WhatsAppTemplate.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WhatsAppTemplateDetailSerializer
        return WhatsAppTemplateListSerializer
    
    def perform_create(self, serializer):
        """Set organization when creating"""
        serializer.save(organization=self.request.user.organization)
    
    @action(detail=True, methods=['post'])
    def submit_approval(self, request, pk=None):
        """Submit template to Meta for approval"""
        template = self.get_object()
        
        # TODO: Call Meta WhatsApp API to submit template
        template.status = 'pending_approval'
        template.save()
        
        return Response({
            'status': 'submitted',
            'message': 'Template submitted to Meta for approval',
            'current_status': template.status
        })
    
    @action(detail=True, methods=['post'])
    def analyze_ai(self, request, pk=None):
        """Analyze template with AI"""
        template = self.get_object()
        
        # TODO: Call AI service to analyze template
        template.ai_analysis_result = {
            'tone': 'professional',
            'compliance_score': 0.95,
            'suggestions': []
        }
        template.ai_analyzed_at = timezone.now()
        template.save()
        
        return Response({
            'analysis': template.ai_analysis_result,
            'quality_score': template.quality_score
        })


from django.utils import timezone
