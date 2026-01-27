"""
Analytics and Dashboard views
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import timedelta

from apps.authentication.permissions import IsOrganizerUser


@extend_schema(exclude=True)
class AnalyticsViewSet(viewsets.ViewSet):
    """
    API endpoints for Analytics and Dashboard
    GET /api/v1/analytics/dashboard/ - Get dashboard metrics
    GET /api/v1/analytics/conversations/ - Conversation analytics
    GET /api/v1/analytics/campaigns/ - Campaign analytics
    GET /api/v1/analytics/agents/ - Agent performance
    GET /api/v1/analytics/whatsapp/ - WhatsApp metrics
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get dashboard overview metrics"""
        from apps.conversations.models import Conversation
        from apps.campaigns.models import Campaign
        from apps.authentication.models import User
        
        org = request.user.organization
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        conversations = Conversation.objects.filter(
            organization=org,
            deleted_at__isnull=True
        )
        
        campaigns = Campaign.objects.filter(
            organization=org,
            deleted_at__isnull=True
        )
        
        return Response({
            'conversations': {
                'total': conversations.count(),
                'unread': conversations.filter(is_unread=True).count(),
                'priority': conversations.filter(is_priority=True).count(),
                'this_week': conversations.filter(created_at__date__gte=week_ago).count()
            },
            'campaigns': {
                'total': campaigns.count(),
                'active': campaigns.filter(status='running').count(),
                'scheduled': campaigns.filter(status='scheduled').count(),
                'total_sent': campaigns.aggregate(Sum('sent_count'))['sent_count__sum'] or 0
            },
            'agents': {
                'total': User.objects.filter(
                    organization=org,
                    deleted_at__isnull=True,
                    agent_status__isnull=False
                ).count(),
                'online': User.objects.filter(
                    organization=org,
                    deleted_at__isnull=True,
                    is_online=True
                ).count()
            },
            'organization': {
                'plan': org.plan_type,
                'is_trial': org.is_trial,
                'contacts_limit': org.max_contacts,
                'contacts_used': org.current_contacts_count
            }
        })
    
    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """Get conversation analytics"""
        from apps.conversations.models import Conversation
        
        org = request.user.organization
        period = request.query_params.get('period', '7')  # days
        
        date_from = timezone.now().date() - timedelta(days=int(period))
        
        conversations = Conversation.objects.filter(
            organization=org,
            created_at__date__gte=date_from,
            deleted_at__isnull=True
        )
        
        return Response({
            'period_days': int(period),
            'total_conversations': conversations.count(),
            'avg_response_time': 0,  # TODO: Calculate from message timestamps
            'resolved': conversations.filter(status='resolved').count(),
            'by_status': {
                'active': conversations.filter(status='active').count(),
                'waiting': conversations.filter(status='waiting').count(),
                'resolved': conversations.filter(status='resolved').count(),
                'closed': conversations.filter(status='closed').count()
            }
        })
    
    @action(detail=False, methods=['get'])
    def campaigns(self, request):
        """Get campaign analytics"""
        from apps.campaigns.models import Campaign
        
        org = request.user.organization
        
        campaigns = Campaign.objects.filter(
            organization=org,
            deleted_at__isnull=True,
            status__in=['completed', 'running']
        )
        
        total_sent = campaigns.aggregate(Sum('sent_count'))['sent_count__sum'] or 0
        total_delivered = campaigns.aggregate(Sum('delivered_count'))['delivered_count__sum'] or 0
        total_read = campaigns.aggregate(Sum('read_count'))['read_count__sum'] or 0
        
        return Response({
            'total_campaigns': Campaign.objects.filter(
                organization=org,
                deleted_at__isnull=True
            ).count(),
            'completed_campaigns': campaigns.filter(status='completed').count(),
            'running_campaigns': campaigns.filter(status='running').count(),
            'messages': {
                'sent': total_sent,
                'delivered': total_delivered,
                'read': total_read,
                'delivery_rate': round((total_delivered / total_sent * 100), 2) if total_sent > 0 else 0,
                'read_rate': round((total_read / total_delivered * 100), 2) if total_delivered > 0 else 0
            }
        })
    
    @action(detail=False, methods=['get'])
    def agents(self, request):
        """Get agent performance metrics"""
        from apps.authentication.models import User
        from apps.conversations.models import Conversation
        
        org = request.user.organization
        
        agents = User.objects.filter(
            organization=org,
            deleted_at__isnull=True,
            agent_status__isnull=False
        )
        
        agent_stats = []
        for agent in agents:
            conversations = Conversation.objects.filter(
                current_agent=agent,
                deleted_at__isnull=True
            )
            
            agent_stats.append({
                'agent_id': agent.id,
                'agent_name': agent.full_name,
                'total_conversations': conversations.count(),
                'resolved': conversations.filter(status='resolved').count(),
                'avg_response_time': conversations.aggregate(
                    Avg('average_response_time_seconds')
                )['average_response_time_seconds__avg'] or 0,
                'status': agent.agent_status,
                'is_online': agent.is_online
            })
        
        return Response({
            'total_agents': len(agent_stats),
            'agents': agent_stats
        })
    
    @action(detail=False, methods=['get'])
    def whatsapp(self, request):
        """Get WhatsApp metrics"""
        from apps.whatsapp.models import WhatsAppNumber
        
        org = request.user.organization
        
        wa_numbers = WhatsAppNumber.objects.filter(
            organization=org,
            deleted_at__isnull=True
        )
        
        return Response({
            'total_connections': wa_numbers.count(),
            'active_connections': wa_numbers.filter(is_active=True).count(),
            'verified_connections': wa_numbers.filter(is_verified=True).count(),
            'connections': [{
                'id': num.id,
                'phone': num.phone_number,
                'status': num.status,
                'is_active': num.is_active,
                'quality_rating': num.quality_rating
            } for num in wa_numbers]
        })
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """GET /api/v1/analytics/overview/ - Get analytics overview"""
        from apps.conversations.models import Conversation
        
        org = request.user.organization
        today = timezone.now().date()
        
        conversations = Conversation.objects.filter(
            organization=org,
            deleted_at__isnull=True
        )
        
        return Response({
            'total_conversations': conversations.count(),
            'active_conversations': conversations.filter(status='active').count(),
            'resolved_conversations': conversations.filter(status='resolved').count(),
            'closed_conversations': conversations.filter(status='closed').count(),
        })
    
    @action(detail=False, methods=['get'])
    def hourly(self, request):
        """GET /api/v1/analytics/conversations/hourly - Get hourly conversation data"""
        from apps.conversations.models import Conversation
        from django.db.models.functions import ExtractHour
        
        org = request.user.organization
        granularity = request.query_params.get('granularity', 'hour')
        
        conversations = Conversation.objects.filter(
            organization=org,
            deleted_at__isnull=True,
            created_at__date=timezone.now().date()
        )
        
        # Group by hour
        hourly_data = []
        for hour in range(24):
            count = conversations.filter(created_at__hour=hour).count()
            hourly_data.append({
                'hour': hour,
                'count': count
            })
        
        return Response({
            'granularity': granularity,
            'date': timezone.now().date().isoformat(),
            'data': hourly_data
        })
    
    @action(detail=False, methods=['get'])
    def daily(self, request):
        """GET /api/v1/analytics/conversations/daily - Get daily conversation data"""
        from apps.conversations.models import Conversation
        from datetime import date
        
        org = request.user.organization
        days = int(request.query_params.get('days', 7))
        
        conversations = Conversation.objects.filter(
            organization=org,
            deleted_at__isnull=True
        )
        
        # Group by day (last N days)
        daily_data = []
        for i in range(days):
            day = timezone.now().date() - timedelta(days=i)
            count = conversations.filter(created_at__date=day).count()
            daily_data.append({
                'date': day.isoformat(),
                'count': count
            })
        
        # Reverse to ascending order
        daily_data.reverse()
        
        return Response({
            'granularity': 'day',
            'days': days,
            'data': daily_data
        })
