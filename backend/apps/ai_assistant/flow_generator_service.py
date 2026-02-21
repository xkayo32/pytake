"""
Flow Generator Service - AI-powered flow generation
Adaptado do FastAPI para Django
Autor: Kayo Carvalho Fernandes
Data: 10/02/2026
"""

import logging
import json
from typing import Dict, List, Optional, Any
from uuid import UUID

from django.conf import settings

logger = logging.getLogger(__name__)


class FlowGeneratorService:
    """
    Service para geração de flows usando AI
    
    TODO: Implementar integração completa com OpenAI/Anthropic/Gemini
    Por enquanto, retorna erro informativo
    """
    
    def __init__(self, organization):
        self.organization = organization
    
    def generate_flow_from_description(
        self,
        description: str,
        industry: Optional[str] = None,
        language: str = "pt-BR",
        chatbot_id: Optional[UUID] = None,
        save_to_database: bool = False,
        flow_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Gera um flow a partir de descrição em linguagem natural
        
        Args:
            description: Descrição do flow desejado
            industry: Contexto da indústria (opcional)
            language: Idioma do flow (default: pt-BR)
            chatbot_id: ID do chatbot (opcional)
            save_to_database: Se True, salva no banco
            flow_name: Nome customizado do flow
        
        Returns:
            Dict com status, flow_data, ou error_message
        """
        # Verificar se AI está configurada
        try:
            try:
                ai_settings = self.organization.ai_settings
            except Exception:
                # Se não existe relacionamento ou erro ao acessar
                ai_settings = None
            
            if not ai_settings or not ai_settings.enabled:
                return {
                    'status': 'error',
                    'saved_to_database': False,
                    'error_message': 'AI Assistant não está configurado ou habilitado para esta organização. Por favor, configure em Configurações > Assistente de IA.'
                }
            
            # Verificar se tem API key configurada
            provider = ai_settings.provider
            has_key = False
            
            if provider == 'openai' and ai_settings.openai_api_key:
                has_key = True
            elif provider == 'anthropic' and ai_settings.anthropic_api_key:
                has_key = True
            elif provider == 'gemini' and ai_settings.gemini_api_key:
                has_key = True
            
            if not has_key:
                return {
                    'status': 'error',
                    'saved_to_database': False,
                    'error_message': f'API Key não configurada para o provider {provider}. Configure em Configurações > Assistente de IA.'
                }
            
            # TODO: Implementar chamada real para APIs de AI
            # Por enquanto, retorna erro informativo
            return {
                'status': 'error',
                'saved_to_database': False,
                'error_message': (
                    'Geração de flows com AI está temporariamente indisponível. '
                    'Esta funcionalidade está sendo migrada do FastAPI para Django. '
                    'Por favor, use o Flow Builder manual por enquanto.'
                )
            }
            
        except Exception as e:
            logger.error(f"[FlowGenerator] Erro: {e}", exc_info=True)
            return {
                'status': 'error',
                'saved_to_database': False,
                'error_message': f'Erro ao processar requisição: {str(e)}'
            }
