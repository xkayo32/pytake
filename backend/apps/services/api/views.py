"""
REST API Views for MongoDB Data (Audit Logs, Analytics, Message History)
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.authentication.permissions import HasRBACPermission
from apps.services.database.mongodb_service import MongoDBService
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class AuditLogViewSet(viewsets.ViewSet):
    """
    REST API for accessing audit logs from MongoDB
    
    GET /api/v1/audit-logs/ - List audit logs
    GET /api/v1/audit-logs/user-activity/ - Get user activity
    GET /api/v1/audit-logs/resource-history/ - Get resource history
    """

    permission_classes = [IsAuthenticated, HasRBACPermission]

    def get_mongo_service(self, request):
        """Get MongoDB service with organization context"""
        return MongoDBService(organization_id=str(request.user.organization_id))

    def list(self, request):
        """List recent audit logs"""
        mongo = self.get_mongo_service(request)
        
        limit = int(request.query_params.get('limit', 100))
        user_id = request.query_params.get('user_id')
        action_filter = request.query_params.get('action')

        try:
            # Get from MongoDB
            collection = mongo.audit_logger.collection
            query = {'organization_id': str(request.user.organization_id)}

            if user_id:
                query['user_id'] = str(user_id)
            if action_filter:
                query['action'] = action_filter

            logs = list(
                collection.find(query)
                .sort('created_at', -1)
                .limit(limit)
            )

            # Convert ObjectId to string
            for log in logs:
                log['_id'] = str(log['_id'])
                log['created_at'] = log['created_at'].isoformat()

            return Response({
                'success': True,
                'count': len(logs),
                'data': logs,
            })
        except Exception as e:
            logger.error(f"Error fetching audit logs: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'])
    def user_activity(self, request):
        """Get user's activity audit trail"""
        user_id = request.query_params.get('user_id', str(request.user.id))
        days = int(request.query_params.get('days', 7))
        limit = int(request.query_params.get('limit', 100))

        try:
            mongo = self.get_mongo_service(request)
            activity = mongo.get_user_activity(
                user_id=user_id,
                days=days,
                limit=limit,
            )

            # Convert ObjectId to string
            for log in activity:
                log['_id'] = str(log['_id'])
                log['created_at'] = log['created_at'].isoformat()

            return Response({
                'success': True,
                'user_id': user_id,
                'days': days,
                'count': len(activity),
                'data': activity,
            })
        except Exception as e:
            logger.error(f"Error fetching user activity: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'])
    def resource_history(self, request):
        """Get audit trail for a specific resource"""
        resource_id = request.query_params.get('resource_id')
        limit = int(request.query_params.get('limit', 50))

        if not resource_id:
            return Response(
                {'success': False, 'message': 'resource_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            mongo = self.get_mongo_service(request)
            history = mongo.get_resource_history(
                resource_id=resource_id,
                limit=limit,
            )

            # Convert ObjectId to string
            for log in history:
                log['_id'] = str(log['_id'])
                log['created_at'] = log['created_at'].isoformat()

            return Response({
                'success': True,
                'resource_id': resource_id,
                'count': len(history),
                'data': history,
            })
        except Exception as e:
            logger.error(f"Error fetching resource history: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AnalyticsViewSet(viewsets.ViewSet):
    """
    REST API for accessing analytics data from MongoDB
    
    GET /api/v1/analytics/daily/ - Get daily stats
    GET /api/v1/analytics/hourly/ - Get hourly stats
    GET /api/v1/analytics/metrics/ - Get available metrics
    """

    permission_classes = [IsAuthenticated, HasRBACPermission]

    def get_mongo_service(self, request):
        """Get MongoDB service with organization context"""
        return MongoDBService(organization_id=str(request.user.organization_id))

    @action(detail=False, methods=['get'])
    def daily(self, request):
        """Get daily aggregated metrics"""
        metric_type = request.query_params.get('metric_type', 'messages_sent')
        days = int(request.query_params.get('days', 30))

        try:
            mongo = self.get_mongo_service(request)
            stats = mongo.get_daily_stats(
                metric_type=metric_type,
                days=days,
            )

            # Convert to response format
            data = []
            for stat in stats:
                data.append({
                    'date': stat['_id'],
                    'total': stat['total'],
                    'count': stat['count'],
                    'average': round(stat['average'], 2),
                })

            return Response({
                'success': True,
                'metric_type': metric_type,
                'period': f'last_{days}_days',
                'count': len(data),
                'data': data,
            })
        except Exception as e:
            logger.error(f"Error fetching daily stats: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'])
    def hourly(self, request):
        """Get hourly aggregated metrics"""
        metric_type = request.query_params.get('metric_type', 'campaigns_executed')
        hours = int(request.query_params.get('hours', 24))

        try:
            mongo = self.get_mongo_service(request)
            stats = mongo.get_hourly_stats(
                metric_type=metric_type,
                hours=hours,
            )

            # Convert to response format
            data = []
            for stat in stats:
                data.append({
                    'hour': stat['_id'],
                    'total': stat['total'],
                })

            return Response({
                'success': True,
                'metric_type': metric_type,
                'period': f'last_{hours}_hours',
                'count': len(data),
                'data': data,
            })
        except Exception as e:
            logger.error(f"Error fetching hourly stats: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """Get available metrics"""
        available_metrics = [
            {
                'id': 'messages_sent',
                'label': 'Messages Sent',
                'description': 'Total WhatsApp messages sent',
                'type': 'counter',
            },
            {
                'id': 'campaigns_executed',
                'label': 'Campaigns Executed',
                'description': 'Total campaigns executed',
                'type': 'counter',
            },
            {
                'id': 'conversations_closed',
                'label': 'Conversations Closed',
                'description': 'Total conversations closed',
                'type': 'gauge',
            },
            {
                'id': 'contacts_created',
                'label': 'Contacts Created',
                'description': 'Total new contacts created',
                'type': 'counter',
            },
            {
                'id': 'agents_online',
                'label': 'Agents Online',
                'description': 'Number of online agents',
                'type': 'gauge',
            },
        ]

        return Response({
            'success': True,
            'count': len(available_metrics),
            'data': available_metrics,
        })


class MessageHistoryViewSet(viewsets.ViewSet):
    """
    REST API for message history from MongoDB
    
    GET /api/v1/message-history/conversation/ - Get conversation history
    GET /api/v1/message-history/search/ - Search messages
    """

    permission_classes = [IsAuthenticated, HasRBACPermission]

    def get_mongo_service(self, request):
        """Get MongoDB service with organization context"""
        return MongoDBService(organization_id=str(request.user.organization_id))

    @action(detail=False, methods=['get'])
    def conversation(self, request):
        """Get message history for a conversation"""
        conversation_id = request.query_params.get('conversation_id')
        limit = int(request.query_params.get('limit', 50))

        if not conversation_id:
            return Response(
                {'success': False, 'message': 'conversation_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            mongo = self.get_mongo_service(request)
            messages = mongo.get_conversation_history(
                conversation_id=conversation_id,
                limit=limit,
            )

            # Convert to response format
            data = []
            for msg in messages:
                data.append({
                    'id': str(msg['_id']),
                    'sender_id': msg['sender_id'],
                    'receiver_id': msg['receiver_id'],
                    'content': msg['message_content'],
                    'type': msg['message_type'],
                    'status': msg['status'],
                    'media_url': msg.get('media_url'),
                    'created_at': msg['created_at'].isoformat(),
                })

            return Response({
                'success': True,
                'conversation_id': conversation_id,
                'count': len(data),
                'data': data,
            })
        except Exception as e:
            logger.error(f"Error fetching conversation history: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search messages by content"""
        query = request.query_params.get('q')
        limit = int(request.query_params.get('limit', 20))

        if not query:
            return Response(
                {'success': False, 'message': 'q (query) is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            mongo = self.get_mongo_service(request)
            results = mongo.search_messages(
                query=query,
                limit=limit,
            )

            # Convert to response format
            data = []
            for msg in results:
                data.append({
                    'id': str(msg['_id']),
                    'conversation_id': msg['conversation_id'],
                    'content': msg['message_content'],
                    'type': msg['message_type'],
                    'created_at': msg['created_at'].isoformat(),
                    'score': msg.get('score', 0),
                })

            return Response({
                'success': True,
                'query': query,
                'count': len(data),
                'data': data,
            })
        except Exception as e:
            logger.error(f"Error searching messages: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
