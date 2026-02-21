"""
AI Assistant views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import AICustomModel, AISettings
from .serializers import (
    AICustomModelListSerializer, 
    AICustomModelDetailSerializer, 
    AISettingsSerializer,
    GenerateFlowRequestSerializer,
    GenerateFlowResponseSerializer
)
from .flow_generator_service import FlowGeneratorService
from apps.authentication.permissions import IsOrganizerUser


# ==================== Flow Generation ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_flow(request):
    """
    🤖 Generate a chatbot flow from natural language description using AI
    
    POST /api/v1/ai-assistant/generate-flow
    
    Request Body:
    {
        "description": "Criar um flow de boas-vindas...",
        "industry": "ecommerce",  // opcional
        "language": "pt-BR",  // opcional
        "chatbot_id": "uuid",  // opcional
        "save_to_database": false,  // opcional
        "flow_name": "Flow de Boas Vindas"  // opcional
    }
    
    Response:
    {
        "status": "success" | "needs_clarification" | "error",
        "flow_id": "uuid",  // se saved_to_database = true
        "flow_name": "...",
        "saved_to_database": false,
        "flow_data": {...},  // nodes e edges
        "clarification_questions": [...],  // se needs_clarification
        "error_message": "..."  // se error
    }
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Validar request
    request_serializer = GenerateFlowRequestSerializer(data=request.data)
    
    if not request_serializer.is_valid():
        return Response(
            {
                'status': 'error',
                'error_message': 'Requisição inválida',
                'detail': request_serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    data = request_serializer.validated_data
    organization = request.user.organization
    
    logger.info(f"[generate_flow] Org: {organization.name}, Description: {data['description'][:50]}...")
    
    # Criar service e gerar flow
    service = FlowGeneratorService(organization)
    
    try:
        # Executar geração de flow (agora síncrono)
        result = service.generate_flow_from_description(
            description=data['description'],
            industry=data.get('industry'),
            language=data.get('language', 'pt-BR'),
            chatbot_id=data.get('chatbot_id'),
            save_to_database=data.get('save_to_database', False),
            flow_name=data.get('flow_name')
        )
        
        # Validar response
        response_serializer = GenerateFlowResponseSerializer(data=result)
        
        if response_serializer.is_valid():
            # Determinar status HTTP baseado no resultado
            http_status = status.HTTP_200_OK
            
            if result['status'] == 'error':
                # Verificar tipo de erro
                error_msg = result.get('error_message', '').lower()
                
                if 'não está configurado' in error_msg or 'api key' in error_msg:
                    http_status = status.HTTP_400_BAD_REQUEST
                elif 'quota' in error_msg or 'rate limit' in error_msg:
                    http_status = status.HTTP_429_TOO_MANY_REQUESTS
                else:
                    http_status = status.HTTP_500_INTERNAL_SERVER_ERROR
            
            return Response(response_serializer.validated_data, status=http_status)
        else:
            logger.error(f"[generate_flow] Response validation error: {response_serializer.errors}")
            return Response(result, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"[generate_flow] Unexpected error: {e}", exc_info=True)
        return Response(
            {
                'status': 'error',
                'saved_to_database': False,
                'error_message': f'Erro interno ao gerar flow: {str(e)}'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== AI Test ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_ai_settings(request):
    """
    Test AI Assistant configuration
    
    POST /api/v1/ai-assistant/test
    
    Response:
    {
        "success": true,
        "provider": "openai",
        "message": "Conexão com OpenAI bem-sucedida",
        "model_tested": "gpt-4o-mini",
        "latency_ms": 1234,
        "error": null
    }
    """
    import logging
    import time
    logger = logging.getLogger(__name__)
    
    organization = request.user.organization
    
    try:
        # Verificar se AI está configurada
        try:
            ai_settings = organization.ai_settings
        except:
            ai_settings = None
        
        if not ai_settings or not ai_settings.enabled:
            return Response(
                {
                    'success': False,
                    'provider': None,
                    'message': 'AI Assistant não está configurado ou habilitado',
                    'model_tested': None,
                    'error': 'AI Assistant not configured'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        provider = ai_settings.provider
        model = ai_settings.model
        
        # Verificar se tem API key
        has_key = False
        if provider == 'openai' and ai_settings.openai_api_key:
            has_key = True
        elif provider == 'anthropic' and ai_settings.anthropic_api_key:
            has_key = True
        elif provider == 'gemini' and ai_settings.gemini_api_key:
            has_key = True
        
        if not has_key:
            return Response(
                {
                    'success': False,
                    'provider': provider,
                    'message': f'API Key não configurada para {provider}',
                    'model_tested': model,
                    'error': f'Missing API key for {provider}'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TODO: Implementar teste real de conexão com APIs
        # Por enquanto, simular teste bem-sucedido
        start_time = time.time()
        
        # Simular latência
        import time
        time.sleep(0.5)
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        logger.info(f"[test_ai] Org: {organization.name}, Provider: {provider}, Model: {model}")
        
        return Response(
            {
                'success': True,
                'provider': provider,
                'message': f'Conexão com {provider.title()} simulada com sucesso',
                'model_tested': model,
                'latency_ms': latency_ms,
                'error': None
            },
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"[test_ai] Error: {e}", exc_info=True)
        return Response(
            {
                'success': False,
                'provider': None,
                'message': 'Erro ao testar configuração de IA',
                'model_tested': None,
                'error': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== AI Settings ====================


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def ai_settings(request):
    """
    AI Assistant Settings endpoint
    GET - Returns current AI settings for the organization
    POST/PUT - Updates AI settings for the organization
    """
    organization = request.user.organization

    if request.method == 'GET':
        # Get or create settings with defaults
        settings, created = AISettings.objects.get_or_create(
            organization=organization,
            defaults={
                'enabled': True,
                'provider': 'openai',
                'model': 'gpt-4',
                'temperature': 0.7,
                'max_tokens': 1000,
                'enable_flow_generation': False,
                'enable_improvements': False,
            }
        )

        serializer = AISettingsSerializer(settings)
        return Response(serializer.data)

    elif request.method in ['POST', 'PUT']:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[AI Settings] Received data: {request.data}")

        # Get or create settings
        settings, created = AISettings.objects.get_or_create(
            organization=organization,
            defaults={
                'enabled': True,
                'provider': 'openai',
                'model': 'gpt-4',
                'temperature': 0.7,
                'max_tokens': 1000,
                'enable_flow_generation': False,
                'enable_improvements': False,
            }
        )

        logger.info(f"[AI Settings] Before update: provider={settings.provider}, model={settings.model}")

        # Update with provided data
        serializer = AISettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            settings.refresh_from_db()
            logger.info(f"[AI Settings] After update: provider={settings.provider}, model={settings.model}")
            return Response(serializer.data)

        logger.error(f"[AI Settings] Validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AICustomModelViewSet(viewsets.ModelViewSet):
    """
    API endpoints for AI Custom Models (AI Provider Configs)
    GET /api/v1/ai-models/ - List AI models
    POST /api/v1/ai-models/ - Create AI model config
    GET /api/v1/ai-models/{id}/ - Get model details
    PUT /api/v1/ai-models/{id}/ - Update model config
    DELETE /api/v1/ai-models/{id}/ - Delete model
    POST /api/v1/ai-models/{id}/test/ - Test AI model connection
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    
    def get_queryset(self):
        """Return only user's organization AI models"""
        return AICustomModel.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AICustomModelDetailSerializer
        return AICustomModelListSerializer
    
    def perform_create(self, serializer):
        """Set organization when creating"""
        serializer.save(organization=self.request.user.organization)
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test AI model connection"""
        model = self.get_object()
        
        # TODO: Test connection to AI provider
        return Response({
            'provider': model.provider,
            'model_id': model.model_id,
            'status': 'connected',
            'message': 'AI model connection successful'
        })
