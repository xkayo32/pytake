"""
Campaign views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters as rf_filters

from .models import Campaign
from .serializers import CampaignListSerializer, CampaignDetailSerializer
from apps.authentication.permissions import IsOrganizerUser


class CampaignViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Campaigns (Mass Messaging)
    GET /api/v1/campaigns/ - List campaigns
    POST /api/v1/campaigns/ - Create campaign
    GET /api/v1/campaigns/{id}/ - Get campaign details
    PUT /api/v1/campaigns/{id}/ - Update campaign
    DELETE /api/v1/campaigns/{id}/ - Delete campaign
    POST /api/v1/campaigns/{id}/schedule/ - Schedule campaign
    POST /api/v1/campaigns/{id}/execute/ - Execute campaign
    GET /api/v1/campaigns/{id}/statistics/ - Get statistics
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    filter_backends = [DjangoFilterBackend, rf_filters.OrderingFilter]
    filterset_fields = ['status']
    ordering_fields = ['created_at', 'scheduled_at', 'started_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Return only user's organization campaigns"""
        if getattr(self, 'swagger_fake_view', False):
            return Campaign.objects.none()
        return Campaign.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CampaignDetailSerializer
        return CampaignListSerializer
    
    def perform_create(self, serializer):
        """Set organization when creating"""
        serializer.save(organization=self.request.user.organization)
    
    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        """Schedule campaign execution"""
        campaign = self.get_object()
        scheduled_at = request.data.get('scheduled_at')
        
        if not scheduled_at:
            return Response(
                {'error': 'scheduled_at required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        campaign.scheduled_at = scheduled_at
        campaign.status = 'scheduled'
        campaign.save()
        
        return Response(
            CampaignDetailSerializer(campaign).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Execute campaign immediately"""
        campaign = self.get_object()
        
        if campaign.status in ['running', 'completed']:
            return Response(
                {'error': f'Cannot execute campaign with status {campaign.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TODO: Call Celery task to execute campaign
        # tasks.execute_campaign.delay(campaign.id)
        
        campaign.status = 'running'
        campaign.started_at = timezone.now()
        campaign.save()
        
        return Response(
            CampaignDetailSerializer(campaign).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get campaign statistics"""
        campaign = self.get_object()
        
        if campaign.sent_count == 0:
            delivery_rate = 0
        else:
            delivery_rate = round((campaign.delivered_count / campaign.sent_count) * 100, 2)
        
        if campaign.delivered_count == 0:
            read_rate = 0
        else:
            read_rate = round((campaign.read_count / campaign.delivered_count) * 100, 2)
        
        return Response({
            'campaign_id': campaign.id,
            'total_sent': campaign.sent_count,
            'delivered': campaign.delivered_count,
            'read': campaign.read_count,
            'failed': campaign.failed_count,
            'delivery_rate': delivery_rate,
            'read_rate': read_rate,
            'status': campaign.status,
            'started_at': campaign.started_at,
            'completed_at': campaign.completed_at,
            'duration_seconds': (
                (campaign.completed_at - campaign.started_at).total_seconds()
                if campaign.completed_at and campaign.started_at else None
            )
        })


from django.utils import timezone
