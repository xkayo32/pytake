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
        clarifications: Optional[Dict[str, str]] = None
    ) -> GenerateFlowResponse:
        """
        Generate a flow from natural language description.

        Args:
            organization_id: Organization UUID
            description: Natural language description of desired flow
            industry: Optional industry context
            language: Flow language (default: pt-BR)
            clarifications: Optional clarification answers from previous iteration

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

        # Build prompt
        system_prompt = self._build_system_prompt(language)
        user_prompt = self._build_user_prompt(
            description=description,
            industry=industry,
            language=language,
            clarifications=clarifications
        )

        # Call AI API
        try:
            if ai_settings.provider == AIProvider.ANTHROPIC:
                ai_response = await self._call_anthropic(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=ai_settings.api_key,
                    model=ai_settings.model,
                    max_tokens=ai_settings.max_tokens,
                    temperature=ai_settings.temperature
                )
            elif ai_settings.provider == AIProvider.OPENAI:
                ai_response = await self._call_openai(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=ai_settings.api_key,
                    model=ai_settings.model,
                    max_tokens=ai_settings.max_tokens,
                    temperature=ai_settings.temperature
                )
            else:
                return GenerateFlowResponse(
                    status="error",
                    error_message=f"Provedor de IA não suportado: {ai_settings.provider}"
                )

        except Exception as e:
            logger.error(f"Error calling AI API: {e}")
            return GenerateFlowResponse(
                status="error",
                error_message=f"Erro ao chamar API de IA: {str(e)}"
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
            return GenerateFlowResponse(
                status="success",
                flow_data=parsed_response.get("flow")
            )

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
            if ai_settings.provider == AIProvider.ANTHROPIC:
                ai_response = await self._call_anthropic(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=ai_settings.api_key,
                    model=ai_settings.model,
                    max_tokens=ai_settings.max_tokens,
                    temperature=0.5  # Lower temperature for more consistent analysis
                )
            else:
                ai_response = await self._call_openai(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=ai_settings.api_key,
                    model=ai_settings.model,
                    max_tokens=ai_settings.max_tokens,
                    temperature=0.5
                )

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

    # ==================== Prompt Building ====================

    def _build_system_prompt(self, language: str) -> str:
        """Build system prompt for flow generation"""
        return f"""Você é um especialista em automação de WhatsApp e design de chatbots.

Sua tarefa é gerar flows de chatbots estruturados em formato JSON baseado em descrições em linguagem natural.

Um flow consiste em:
- **Nodes** (nós): Unidades de ação (message, question, condition, action, api_call, ai_prompt, jump, handoff, end)
- **Edges** (conexões): Links entre nodes

Tipos de nodes disponíveis:
1. **start**: Início do flow
2. **message**: Envia mensagem ao usuário
3. **question**: Faz pergunta e armazena resposta em variável
4. **condition**: Ramificação baseada em condições
5. **action**: Executa ações (salvar contato, enviar email, webhook)
6. **api_call**: Chama APIs externas
7. **ai_prompt**: Usa IA para processar informações
8. **jump**: Navega para outro node/flow
9. **handoff**: Transfere para atendente humano
10. **end**: Finaliza flow

Regras importantes:
- Todo flow DEVE começar com node type="start"
- IDs dos nodes devem ser únicos (use formato: "node_1", "node_2", etc)
- Edges conectam nodes via source e target IDs
- Use variáveis para armazenar dados do usuário (formato: {{variable_name}})
- Seja específico nos labels e mensagens
- Considere casos de erro e fallback

Idioma do flow: {language}

SEMPRE retorne APENAS JSON válido no seguinte formato:

```json
{{
  "flow": {{
    "name": "Nome do Flow",
    "description": "Descrição breve",
    "canvas_data": {{
      "nodes": [
        {{
          "id": "node_1",
          "type": "start",
          "position": {{"x": 250, "y": 50}},
          "data": {{"label": "Início"}}
        }},
        {{
          "id": "node_2",
          "type": "message",
          "position": {{"x": 250, "y": 150}},
          "data": {{
            "label": "Mensagem de Boas-vindas",
            "content": {{
              "text": "Olá! Bem-vindo ao nosso atendimento."
            }}
          }}
        }}
      ],
      "edges": [
        {{
          "id": "edge_1",
          "source": "node_1",
          "target": "node_2"
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
