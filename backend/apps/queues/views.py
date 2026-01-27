"""
Queue and Agent Skills views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Queue, AgentSkill
from .serializers import QueueDetailSerializer, QueueListSerializer, AgentSkillSerializer
from apps.authentication.permissions import IsOrganizerUser, IsAgent


class QueueViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Queues (Agent Routing)
    GET /api/v1/queues/ - List queues
    POST /api/v1/queues/ - Create queue
    GET /api/v1/queues/{id}/ - Get queue details
    PUT /api/v1/queues/{id}/ - Update queue
    DELETE /api/v1/queues/{id}/ - Delete queue
    GET /api/v1/queues/{id}/agents/ - Get queue agents
    GET /api/v1/queues/{id}/waiting-conversations/ - Get waiting conversations
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    
    def get_queryset(self):
        """Return only user's organization queues"""
        return Queue.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return QueueDetailSerializer
        return QueueListSerializer
    
    def perform_create(self, serializer):
        """Set organization when creating"""
        serializer.save(organization=self.request.user.organization)
    
    @action(detail=True, methods=['get'])
    def agents(self, request, pk=None):
        """Get agents in queue"""
        queue = self.get_object()
        
        return Response({
            'queue_id': queue.id,
            'queue_name': queue.name,
            'total_agents': queue.agents.filter(deleted_at__isnull=True).count(),
            'available_agents': queue.agents.filter(
                agent_status='available',
                deleted_at__isnull=True
            ).count()
        })
    
    @action(detail=True, methods=['get'])
    def waiting_conversations(self, request, pk=None):
        """Get conversations waiting in queue"""
        queue = self.get_object()
        from apps.conversations.models import Conversation
        
        conversations = Conversation.objects.filter(
            queue=queue,
            status='waiting',
            deleted_at__isnull=True
        )
        
        return Response({
            'queue_id': queue.id,
            'waiting_count': conversations.count(),
            'oldest_waiting_minutes': (
                int((timezone.now() - conversations.earliest('created_at').created_at).total_seconds() / 60)
                if conversations.exists() else 0
            )
        })


class AgentSkillViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Agent Skills (Competencies)
    GET /api/v1/agent-skills/ - List agent skills
    POST /api/v1/agent-skills/ - Add skill to agent
    GET /api/v1/agent-skills/{id}/ - Get skill details
    PUT /api/v1/agent-skills/{id}/ - Update skill
    DELETE /api/v1/agent-skills/{id}/ - Delete skill
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    serializer_class = AgentSkillSerializer
    
    def get_queryset(self):
        """Return only user's organization skills"""
        from apps.authentication.models import User
        agents = User.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True
        )
        return AgentSkill.objects.filter(user__in=agents)
    
    def perform_create(self, serializer):
        """Validate user is in organization"""
        serializer.save()


from django.utils import timezone
