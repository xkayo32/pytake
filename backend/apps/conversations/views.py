"""
Conversation and Contact views
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Contact, Conversation, ConversationLog
from .serializers import (
    ContactListSerializer, ContactDetailSerializer,
    ConversationListSerializer, ConversationDetailSerializer,
    ConversationLogSerializer
)
from apps.authentication.permissions import IsOrganizerUser


class ContactViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Contacts (CRM)
    GET /api/v1/contacts/ - List contacts
    POST /api/v1/contacts/ - Create contact
    GET /api/v1/contacts/{id}/ - Get contact details
    PUT /api/v1/contacts/{id}/ - Update contact
    DELETE /api/v1/contacts/{id}/ - Delete contact
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['lifecycle_stage', 'is_vip', 'is_blocked']
    search_fields = ['name', 'whatsapp_id', 'email', 'phone_number']
    ordering_fields = ['created_at', 'last_message_at']
    ordering = ['-last_message_at']
    
    def get_queryset(self):
        """Return only user's organization contacts"""
        return Contact.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ContactDetailSerializer
        return ContactListSerializer
    
    def perform_create(self, serializer):
        """Set organization when creating"""
        serializer.save(organization=self.request.user.organization)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search contacts by name, email, or phone"""
        query = request.query_params.get('q', '')
        if not query or len(query) < 2:
            return Response({'error': 'Query too short'}, status=status.HTTP_400_BAD_REQUEST)
        
        contacts = Contact.objects.filter(
            organization=request.user.organization,
            deleted_at__isnull=True
        ).filter(
            models.Q(name__icontains=query) |
            models.Q(email__icontains=query) |
            models.Q(phone_number__icontains=query) |
            models.Q(whatsapp_id__icontains=query)
        )[:20]
        
        serializer = ContactListSerializer(contacts, many=True)
        return Response(serializer.data)


class ConversationViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Conversations (Chat)
    GET /api/v1/conversations/ - List conversations
    GET /api/v1/conversations/{id}/ - Get conversation details
    PUT /api/v1/conversations/{id}/ - Update conversation
    POST /api/v1/conversations/{id}/send-message/ - Send message
    POST /api/v1/conversations/{id}/mark-read/ - Mark as read
    POST /api/v1/conversations/{id}/close/ - Close conversation
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'is_unread', 'is_priority']
    ordering_fields = ['last_message_at', 'created_at']
    ordering = ['-last_message_at']
    
    def get_queryset(self):
        """Return only user's organization conversations"""
        return Conversation.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ConversationDetailSerializer
        return ConversationListSerializer
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark conversation as read"""
        conversation = self.get_object()
        conversation.is_unread = False
        conversation.save()
        
        return Response({'status': 'marked as read'})
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close conversation"""
        conversation = self.get_object()
        
        if request.data.get('reason'):
            conversation.metadata = conversation.metadata or {}
            conversation.metadata['close_reason'] = request.data['reason']
        
        conversation.status = 'closed'
        conversation.closed_at = timezone.now()
        conversation.save()
        
        return Response(ConversationDetailSerializer(conversation).data)
    
    @action(detail=True, methods=['post'])
    def assign_agent(self, request, pk=None):
        """Assign agent to conversation"""
        conversation = self.get_object()
        agent_id = request.data.get('agent_id')
        
        if not agent_id:
            return Response(
                {'error': 'agent_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from apps.authentication.models import User
            agent = User.objects.get(id=agent_id, organization=request.user.organization)
            conversation.current_agent = agent
            conversation.assigned_at = timezone.now()
            conversation.status = 'assigned'
            conversation.save()
            
            return Response(ConversationDetailSerializer(conversation).data)
        except User.DoesNotExist:
            return Response(
                {'error': 'Agent not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ConversationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoints for Conversation Logs (History)
    GET /api/v1/conversations/{conversation_id}/logs/ - Get logs
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    serializer_class = ConversationLogSerializer
    
    def get_queryset(self):
        """Return logs for specific conversation"""
        conversation_id = self.kwargs.get('conversation_id')
        return ConversationLog.objects.filter(
            conversation__id=conversation_id,
            conversation__organization=self.request.user.organization
        )


from django.db import models
from django.utils import timezone
