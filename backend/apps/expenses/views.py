from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class AlertsViewSet(viewsets.ViewSet):
    """Expenses alerts endpoints"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def check(self, request):
        """POST /api/v1/expenses/alerts/check - Check cost alerts"""
        return Response([], status=status.HTTP_200_OK)

