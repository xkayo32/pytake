from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for container orchestration"""
    return Response({
        'status': 'healthy',
        'service': 'pytake-backend',
        'version': '1.0.0'
    }, status=status.HTTP_200_OK)


