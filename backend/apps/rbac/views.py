"""
RBAC (Role-Based Access Control) views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Role
from .serializers import RoleSerializer


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Role management viewset (read-only for now)
    
    GET /api/v1/roles/ - List all roles for organization
    GET /api/v1/roles/{id}/ - Get role details
    """
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return roles for current user's organization"""
        org = self.request.user.organization
        return Role.objects.filter(organization=org).order_by('name')
    
    @action(detail=False, methods=['get'])
    def system_roles(self, request):
        """GET /api/v1/roles/system_roles/ - Get system roles"""
        roles = Role.objects.filter(is_system_role=True).order_by('name')
        serializer = self.get_serializer(roles, many=True)
        return Response(serializer.data)

