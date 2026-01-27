"""
Organization and Department views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Organization, Department
from .serializers import OrganizationListSerializer, OrganizationDetailSerializer, DepartmentSerializer
from apps.authentication.permissions import IsOrganizerUser


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoints for Organizations
    GET /api/v1/organizations/ - List user's organization
    GET /api/v1/organizations/{id}/ - Get organization details
    """
    permission_classes = [IsAuthenticated]
    serializer_class = OrganizationDetailSerializer
    
    def get_queryset(self):
        """Return only user's organization"""
        return Organization.objects.filter(id=self.request.user.organization.id)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current user's organization"""
        org = request.user.organization
        serializer = OrganizationDetailSerializer(org)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get organization statistics"""
        org = self.get_object()
        
        return Response({
            'organization_id': org.id,
            'users_count': org.users.filter(deleted_at__isnull=True).count(),
            'chatbots_count': org.current_chatbots_count,
            'whatsapp_numbers_count': org.current_whatsapp_numbers_count,
            'contacts_count': org.current_contacts_count,
            'agents_count': org.current_agents_count,
            'monthly_messages': {
                'sent': org.current_month_messages_sent,
                'received': org.current_month_messages_received,
                'limit': org.monthly_message_limit
            },
            'plan': {
                'type': org.plan_type,
                'expires_at': org.plan_expires_at,
                'is_trial': org.is_trial,
                'trial_ends_at': org.trial_ends_at
            }
        })


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Departments
    GET /api/v1/departments/ - List departments
    POST /api/v1/departments/ - Create department
    GET /api/v1/departments/{id}/ - Get department details
    PUT /api/v1/departments/{id}/ - Update department
    DELETE /api/v1/departments/{id}/ - Delete department
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    serializer_class = DepartmentSerializer
    
    def get_queryset(self):
        """Return only user's organization departments"""
        return Department.objects.filter(organization=self.request.user.organization)
    
    def perform_create(self, serializer):
        """Set organization when creating"""
        serializer.save(organization=self.request.user.organization)
