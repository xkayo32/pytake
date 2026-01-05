"""
Flow Generator Service - AI-powered flow generation and improvement suggestions

Uses OpenAI or Anthropic APIs to generate chatbot flows from natural language descriptions
and suggest improvements for existing flows.
"""

import json
import logging
import re
from typing import Dict, List, Optional, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.ai_assistant import (
    AIProvider,
    AIAssistantSettings,
    GenerateFlowResponse,
    ClarificationQuestion,
    FlowImprovement,
    SuggestImprovementsResponse
)
from app.repositories.chatbot import ChatbotRepository
from app.repositories.organization import OrganizationRepository
from app.models.chatbot import Chatbot
from app.models.organization import Organization
from app.utils.node_availability import NodeAvailability

logger = logging.getLogger(__name__)


class FlowGeneratorService:
    """
    Service for generating and improving chatbot flows using AI.

    Features:
    - Generate flows from natural language descriptions
    - Ask clarification questions for ambiguous requirements
    - Suggest improvements for existing flows
    - Auto-apply improvements
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.chatbot_repo = ChatbotRepository(db)
        self.org_repo = OrganizationRepository(db)

    async def get_ai_settings(self, organization_id: UUID) -> Optional[AIAssistantSettings]:
        """
        Get AI Assistant settings from organization.

        Args:
            organization_id: Organization UUID

        Returns:
            AIAssistantSettings if configured and enabled, None otherwise
        """
        org = await self.org_repo.get(organization_id)

        if not org:
            return None

        # Get settings from organization.settings['ai_assistant']
        ai_settings_dict = org.settings.get('ai_assistant')

        if not ai_settings_dict:
            return None

        try:
            ai_settings = AIAssistantSettings(**ai_settings_dict)

            if not ai_settings.enabled:
                return None

            return ai_settings

        except Exception as e:
            logger.error(f"Error parsing AI settings for org {organization_id}: {e}")
            return None

    async def generate_flow_from_description(
        self,
        organization_id: UUID,
        description: str,
        industry: Optional[str] = None,
        language: str = "pt-BR",
        clarifications: Optional[Dict[str, str]] = None,
        chatbot_id: Optional[UUID] = None,
        save_to_database: bool = False,
        flow_name: Optional[str] = None
    ) -> GenerateFlowResponse:
        """
        Generate a flow from natural language description.

        Args:
            organization_id: Organization UUID
            description: Natural language description of desired flow
            industry: Optional industry context
            language: Flow language (default: pt-BR)
            clarifications: Optional clarification answers from previous iteration
            chatbot_id: Optional chatbot UUID to associate flow with
            save_to_database: If True, saves the generated flow to database
            flow_name: Custom name for the flow (auto-generated if not provided)

        Returns:
            GenerateFlowResponse with flow data, clarification questions, or error
        """
        # Get AI settings
        ai_settings = await self.get_ai_settings(organization_id)

        if not ai_settings:
            return GenerateFlowResponse(
                status="error",
                error_message="AI Assistant não está configurado ou habilitado para esta organização"
            )

        # Detect WhatsApp type from chatbot
        whatsapp_type = None  # 'official' or 'qrcode'
        if chatbot_id:
            try:
                chatbot = await self.chatbot_repo.get(chatbot_id)
                if chatbot and chatbot.whatsapp_number_id:
                    # Fetch WhatsApp number to get connection_type
                    from app.repositories.whatsapp import WhatsAppNumberRepository
                    whatsapp_repo = WhatsAppNumberRepository(self.db)
                    whatsapp_number = await whatsapp_repo.get(chatbot.whatsapp_number_id)
                    if whatsapp_number:
                        whatsapp_type = whatsapp_number.connection_type
                        logger.info(f"Detected WhatsApp type: {whatsapp_type} for chatbot {chatbot_id}")
            except Exception as e:
                logger.warning(f"Could not detect WhatsApp type for chatbot {chatbot_id}: {e}")

        # Build prompt
        system_prompt = self._build_system_prompt(language, whatsapp_type)
        user_prompt = self._build_user_prompt(
            description=description,
            industry=industry,
            language=language,
            clarifications=clarifications
        )

        # Call AI API
        try:
            if ai_settings.default_provider == AIProvider.ANTHROPIC:
                ai_response = await self._call_anthropic(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=ai_settings.anthropic_api_key,
                    model=ai_settings.model,
                    max_tokens=ai_settings.max_tokens,
                    temperature=ai_settings.temperature
                )
            elif ai_settings.default_provider == AIProvider.OPENAI:
                ai_response = await self._call_openai(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=ai_settings.openai_api_key,
                    model=ai_settings.model,
                    max_tokens=ai_settings.max_tokens,
                    temperature=ai_settings.temperature
                )
            elif ai_settings.default_provider == AIProvider.GEMINI:
                ai_response = await self._call_gemini(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=ai_settings.gemini_api_key,
                    model=ai_settings.model,
                    max_tokens=ai_settings.max_tokens,
                    temperature=ai_settings.temperature
                )
            else:
                return GenerateFlowResponse(
                    status="error",
                    error_message=f"Provedor de IA não suportado: {ai_settings.default_provider}"
                )

        except Exception as e:
            logger.error(f"Error calling AI API: {e}")
            error_str = str(e)
            
            # Parse error type and provide helpful message
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
                return GenerateFlowResponse(
                    status="error",
                    error_message=f"429 - Quota da API excedida. {error_str}"
                )
            elif "401" in error_str or "authentication" in error_str.lower() or "unauthorized" in error_str.lower():
                return GenerateFlowResponse(
                    status="error",
                    error_message=f"401 - Erro de autenticação na API. Verifique a API key. {error_str}"
                )
            elif "403" in error_str or "permission" in error_str.lower():
                return GenerateFlowResponse(
                    status="error",
                    error_message=f"403 - Sem permissão para acessar a API. {error_str}"
                )
            elif "rate limit" in error_str.lower():
                return GenerateFlowResponse(
                    status="error",
                    error_message=f"429 - Limite de taxa excedido. Aguarde alguns segundos. {error_str}"
                )
            else:
                return GenerateFlowResponse(
                    status="error",
                    error_message=f"Erro ao chamar API de IA: {error_str}"
                )

        # Parse AI response
        try:
            parsed_response = self._parse_ai_response(ai_response)

            # Check if AI needs clarification
            if "clarification_questions" in parsed_response:
                questions = [
                    ClarificationQuestion(**q)
                    for q in parsed_response["clarification_questions"]
                ]
                return GenerateFlowResponse(
                    status="needs_clarification",
                    clarification_questions=questions
                )

            # Return generated flow
            response = GenerateFlowResponse(
                status="success",
                flow_data=parsed_response.get("flow")
            )

            # Save to database if requested
            if save_to_database and chatbot_id:
                try:
                    from app.models.chatbot import Flow, Chatbot
                    from app.schemas.flow import FlowCreate
                    
                    # Verify chatbot exists and belongs to organization
                    chatbot = await self.chatbot_repo.get(chatbot_id)
                    if not chatbot or chatbot.organization_id != organization_id:
                        logger.warning(f"Chatbot {chatbot_id} not found or doesn't belong to org {organization_id}")
                        return response  # Return flow data without saving
                    
                    # Generate flow name if not provided
                    if not flow_name:
                        flow_name = f"{parsed_response.get('flow', {}).get('name', 'Flow Gerado pela IA')} - {language}".title()
                    
                    # Create FlowCreate object
                    flow_create_data = FlowCreate(
                        chatbot_id=chatbot_id,
                        name=flow_name,
                        description=description[:500] if len(description) > 500 else description,
                        canvas_data=parsed_response.get("flow"),
                        is_main=False,
                        is_fallback=False,
                        is_active=True
                    )
                    
                    # Save flow using FlowService
                    from app.services.flow_service import FlowService
                    flow_service = FlowService(self.db)
                    saved_flow = await flow_service.create_flow(flow_create_data, organization_id)
                    
                    # Update response with saved flow info
                    response.flow_id = str(saved_flow.id)
                    response.flow_name = saved_flow.name
                    response.saved_to_database = True
                    
                    logger.info(f"✅ Flow generated by AI saved to database: {saved_flow.id} - {saved_flow.name}")
                
                except Exception as e:
                    logger.error(f"❌ Error saving generated flow to database: {e}")
                    # Don't fail the entire request, just log and return flow data
            
            elif save_to_database and not chatbot_id:
                logger.warning("Cannot save flow to database: chatbot_id is required")
            
            return response

        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
            return GenerateFlowResponse(
                status="error",
                error_message=f"Erro ao processar resposta da IA: {str(e)}"
            )

    async def suggest_improvements(
        self,
        organization_id: UUID,
        flow_id: UUID,
        focus_areas: Optional[List[str]] = None
    ) -> SuggestImprovementsResponse:
        """
        Analyze a flow and suggest improvements.

        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID to analyze
            focus_areas: Optional specific areas to focus on

        Returns:
            SuggestImprovementsResponse with improvement suggestions
        """
        # Get AI settings
        ai_settings = await self.get_ai_settings(organization_id)

        if not ai_settings:
            raise ValueError("AI Assistant não está configurado ou habilitado")

        # Get flow
        from app.repositories.chatbot import FlowRepository
        flow_repo = FlowRepository(self.db)
        flow = await flow_repo.get(flow_id)

        if not flow or flow.organization_id != organization_id:
            raise ValueError("Flow não encontrado ou sem permissão")

        # Build analysis prompt
        system_prompt = self._build_improvement_system_prompt()
        user_prompt = self._build_improvement_user_prompt(
            flow_data=flow.canvas_data,
            focus_areas=focus_areas
        )

        # Call AI API
        try:
            if ai_settings.default_provider == AIProvider.ANTHROPIC:
                ai_response = await self._call_anthropic(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=ai_settings.anthropic_api_key,
                    model=ai_settings.model,
                    max_tokens=ai_settings.max_tokens,
                    temperature=0.5  # Lower temperature for more consistent analysis
                )
            elif ai_settings.default_provider == AIProvider.OPENAI:
                ai_response = await self._call_openai(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=ai_settings.openai_api_key,
                    model=ai_settings.model,
                    max_tokens=ai_settings.max_tokens,
                    temperature=0.5
                )
            elif ai_settings.default_provider == AIProvider.GEMINI:
                ai_response = await self._call_gemini(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=ai_settings.gemini_api_key,
                    model=ai_settings.model,
                    max_tokens=ai_settings.max_tokens,
                    temperature=0.5
                )
            else:
                raise ValueError(f"Provedor de IA não suportado: {ai_settings.default_provider}")

        except Exception as e:
            logger.error(f"Error calling AI API for improvements: {e}")
            raise

        # Parse improvements
        try:
            parsed_response = self._parse_ai_response(ai_response)

            improvements = [
                FlowImprovement(**imp)
                for imp in parsed_response.get("improvements", [])
            ]

            return SuggestImprovementsResponse(
                flow_id=str(flow_id),
                improvements=improvements,
                analysis_summary=parsed_response.get("summary", "")
            )

        except Exception as e:
            logger.error(f"Error parsing improvement suggestions: {e}")
            raise

    # ==================== AI API Calls ====================

    async def _call_anthropic(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: str,
        model: str,
        max_tokens: int,
        temperature: float
    ) -> str:
        """Call Anthropic API (Claude)"""
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=api_key)

        message = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )

        # Extract text from response
        return message.content[0].text

    async def _call_openai(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: str,
        model: str,
        max_tokens: int,
        temperature: float
    ) -> str:
        """Call OpenAI API (GPT)"""
        import openai

        client = openai.AsyncOpenAI(api_key=api_key)

        completion = await client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )

        return completion.choices[0].message.content

    async def _call_gemini(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: str,
        model: str,
        max_tokens: int,
        temperature: float
    ) -> str:
        """
        Call Google Gemini API using the new unified SDK.

        Args:
            system_prompt: System prompt
            user_prompt: User prompt
            api_key: Google Gemini API key
            model: Model name (e.g., gemini-2.5-flash, gemini-2.5-pro)
            max_tokens: Maximum output tokens
            temperature: Temperature (0-1)

        Returns:
            AI response as string

        Raises:
            Exception: If API call fails
        """
        try:
            # Lazy import
            from google import genai
            from google.genai import types
        except ImportError:
            raise Exception("google-genai package not installed. Run: pip install google-genai")

        if not api_key:
            raise Exception("Google Gemini API key not configured")

        # Create client
        client = genai.Client(api_key=api_key)

        try:
            # Generate content with system instruction
            response = await client.aio.models.generate_content(
                model=model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                )
            )

            # Extract text from response
            if response.text:
                return response.text
            else:
                raise Exception("Empty response from Google Gemini API")

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Google Gemini API call failed: {error_msg}")
            
            # Extract useful error information
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                # Try to extract retry delay if available
                import re
                retry_match = re.search(r"retry in ([\d.]+)s", error_msg, re.IGNORECASE)
                retry_delay = retry_match.group(1) if retry_match else "alguns segundos"
                
                raise Exception(
                    f"429 RESOURCE_EXHAUSTED - Quota do Gemini excedida. "
                    f"Aguarde {retry_delay} ou mude para outro provedor (OpenAI/Anthropic). "
                    f"Detalhes: {error_msg[:300]}"
                )
            elif "401" in error_msg or "authentication" in error_msg.lower():
                raise Exception(f"401 - API key do Gemini inválida ou expirada: {error_msg[:200]}")
            else:
                raise Exception(f"Erro na API do Gemini: {error_msg[:300]}")

    # ==================== Prompt Building ====================

    def _build_system_prompt(self, language: str, whatsapp_type: Optional[str] = None) -> str:
        """Build system prompt for flow generation with dynamic node types"""
        
        # Get available nodes based on WhatsApp type
        if whatsapp_type:
            available_nodes = NodeAvailability.get_available_nodes(whatsapp_type)
        else:
            # If no WhatsApp type specified, use ALL nodes
            available_nodes = NodeAvailability.ALL_NODES
        
        # Get node descriptions
        from app.utils.node_availability import get_node_descriptions_for_ai
        node_descriptions = get_node_descriptions_for_ai()
        
        # Build node types documentation dynamically
        node_types_doc = []
        for idx, node_type in enumerate(available_nodes, start=1):
            description = node_descriptions.get(node_type, "Tipo de node disponível")
            
            # Highlight special nodes
            if node_type in NodeAvailability.OFFICIAL_ONLY_NODES:
                availability = " **(Apenas Official API)**"
            elif node_type in NodeAvailability.EXPERIMENTAL_NODES and whatsapp_type == "qrcode":
                availability = " **(Experimental em QR Code)**"
            else:
                availability = ""
            
            node_types_doc.append(f'{idx}. **{node_type}**: {description}{availability}')
        
        node_types_section = "\n".join(node_types_doc)

        # WhatsApp type-specific instructions
        whatsapp_instructions = ""
        if whatsapp_type == "official":
            whatsapp_instructions = """
**IMPORTANTE - WhatsApp Official API detectado:**
Para opções de escolha do usuário, SEMPRE use nodes interativos:
- **interactive_buttons**: Para até 3 opções (botões clicáveis)
  - data: {{"label": "Escolha", "nodeType": "interactive_buttons", "bodyText": "Pergunta?", "buttons": [{{"id": "1", "title": "Opção 1"}}, {{"id": "2", "title": "Opção 2"}}]}}
- **interactive_list**: Para 4+ opções (lista selecionável)
  - data: {{"label": "Escolha", "nodeType": "interactive_list", "bodyText": "Pergunta?", "buttonText": "Ver opções", "sections": [{{"title": "Categoria", "rows": [{{"id": "1", "title": "Opção 1"}}]}}]}}

NUNCA use mensagens de texto simples com opções numeradas quando o WhatsApp oficial está configurado.
"""
        elif whatsapp_type == "qrcode":
            whatsapp_instructions = """
**IMPORTANTE - WhatsApp QR Code (Evolution API) detectado:**
Para opções de escolha do usuário, use mensagens de texto com numeração:
- Use node **message** com texto formatado
  - Exemplo: "Escolha uma opção:\\n\\n1 - Cliente\\n2 - Quero ser cliente\\n3 - Suporte"
- Depois use node **question** para capturar a resposta numérica
- Use node **condition** para validar a opção escolhida

NÃO use interactive_buttons ou interactive_list (não disponíveis).
"""

        return f"""Você é um especialista em automação de WhatsApp e design de chatbots.

Sua tarefa é gerar flows de chatbots estruturados em formato JSON baseado em descrições em linguagem natural.

Um flow consiste em:
- **Nodes** (nós): Unidades de ação (message, question, condition, action, etc.)
- **Edges** (conexões): Links entre nodes
{whatsapp_instructions}
**ATENÇÃO: USE APENAS OS TIPOS DE NODES LISTADOS ABAIXO - NÃO INVENTE NODES QUE NÃO EXISTEM!**

Tipos de nodes disponíveis (sempre use type="default" e especifique nodeType em data):

{node_types_section}

Regras importantes:
- Todo flow DEVE começar com node type="start"
- IDs dos nodes devem ser únicos (use formato: "node_1", "node_2", etc)
- Edges conectam nodes via source e target IDs
- Use variáveis para armazenar dados do usuário (formato: {{{{variable_name}}}})
- Seja específico nos labels e mensagens
- Considere casos de erro e fallback
- **CRÍTICO**: Use APENAS os tipos de nodes listados acima - não crie tipos novos!

Idioma do flow: {language}

SEMPRE retorne APENAS JSON válido no seguinte formato:

IMPORTANTE: Todos os nodes devem ter type="default" e o tipo real (start, message, etc) vai em data.nodeType

```json
{{
  "flow": {{
    "name": "Nome do Flow",
    "description": "Descrição breve",
    "canvas_data": {{
      "nodes": [
        {{
          "id": "node_1",
          "type": "default",
          "position": {{"x": 250, "y": 50}},
          "data": {{
            "label": "Início",
            "nodeType": "start"
          }}
        }},
        {{
          "id": "node_2",
          "type": "default",
          "position": {{"x": 250, "y": 150}},
          "data": {{
            "label": "Mensagem de Boas-vindas",
            "nodeType": "message",
            "messageText": "Olá! Bem-vindo ao nosso atendimento."
          }}
        }},
        {{
          "id": "node_3",
          "type": "default",
          "position": {{"x": 250, "y": 250}},
          "data": {{
            "label": "Capturar Nome",
            "nodeType": "question",
            "questionText": "Qual é o seu nome?",
            "outputVariable": "user_name"
          }}
        }}
      ],
      "edges": [
        {{
          "id": "edge_1",
          "source": "node_1",
          "target": "node_2"
        }},
        {{
          "id": "edge_2",
          "source": "node_2",
          "target": "node_3"
        }}
      ]
    }}
  }}
}}
```

Se a descrição for ambígua ou faltar informações críticas, retorne:

```json
{{
  "clarification_questions": [
    {{
      "question": "Pergunta de clarificação?",
      "options": ["Opção 1", "Opção 2"],
      "field": "campo_sendo_clarificado"
    }}
  ]
}}
```
"""

    def _build_user_prompt(
        self,
        description: str,
        industry: Optional[str],
        language: str,
        clarifications: Optional[Dict[str, str]]
    ) -> str:
        """Build user prompt for flow generation"""
        prompt = f"Descrição do flow desejado:\n{description}\n\n"

        if industry:
            prompt += f"Indústria/Setor: {industry}\n\n"

        if clarifications:
            prompt += "Respostas às clarificações anteriores:\n"
            for field, answer in clarifications.items():
                prompt += f"- {field}: {answer}\n"
            prompt += "\n"

        prompt += f"Gere o flow completo em {language}."

        return prompt

    def _build_improvement_system_prompt(self) -> str:
        """Build system prompt for flow improvement suggestions"""
        return """Você é um especialista em otimização de chatbots e UX conversacional.

Analise o flow fornecido e sugira melhorias específicas nas seguintes áreas:
- **UX**: Experiência do usuário, clareza, tom
- **Conversion**: Otimização de conversão
- **Clarity**: Clareza das mensagens e perguntas
- **Error Handling**: Tratamento de erros e casos edge
- **Performance**: Performance e eficiência

Para cada melhoria, forneça:
1. **title**: Título conciso
2. **description**: Descrição detalhada
3. **category**: ux | conversion | clarity | error_handling | performance
4. **priority**: low | medium | high | critical
5. **affected_nodes**: IDs dos nodes afetados
6. **auto_fixable**: true se pode ser corrigido automaticamente
7. **patch**: JSON patch se auto_fixable=true

Retorne APENAS JSON válido:

```json
{
  "summary": "Resumo geral da análise...",
  "improvements": [
    {
      "title": "Adicionar mensagem de confirmação",
      "description": "Detalhes da melhoria...",
      "category": "ux",
      "priority": "medium",
      "affected_nodes": ["node_5"],
      "auto_fixable": true,
      "patch": {"node_id": "node_5", "changes": {...}}
    }
  ]
}
```
"""

    def _build_improvement_user_prompt(
        self,
        flow_data: Dict[str, Any],
        focus_areas: Optional[List[str]]
    ) -> str:
        """Build user prompt for flow improvement analysis"""
        prompt = f"Analise o seguinte flow e sugira melhorias:\n\n"
        prompt += f"```json\n{json.dumps(flow_data, indent=2, ensure_ascii=False)}\n```\n\n"

        if focus_areas:
            prompt += f"Foque especialmente em: {', '.join(focus_areas)}\n\n"

        return prompt

    # ==================== Response Parsing ====================

    def _parse_ai_response(self, ai_response: str) -> Dict[str, Any]:
        """
        Parse AI response and extract JSON.

        Args:
            ai_response: Raw AI response text

        Returns:
            Parsed JSON dict

        Raises:
            ValueError: If JSON is invalid or malformed
        """
        # Try to extract JSON from markdown code blocks
        json_match = re.search(r'```json\n(.*?)\n```', ai_response, re.DOTALL)

        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to parse entire response as JSON
            json_str = ai_response

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI JSON response: {e}\nResponse: {ai_response}")
            raise ValueError(f"IA retornou JSON inválido: {e}")

        return data
