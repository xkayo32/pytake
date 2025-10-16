# AI Flow Assistant & Template Library - Especificação Técnica

**Data:** 2025-10-15
**Status:** 📋 Especificação - Aguardando Implementação
**Prioridade:** ALTA - Diferencial Competitivo

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Objetivos e Benefícios](#objetivos-e-benefícios)
3. [Arquitetura](#arquitetura)
4. [Funcionalidades](#funcionalidades)
5. [Especificações Técnicas](#especificações-técnicas)
6. [Templates Pré-prontos](#templates-pré-prontos)
7. [Prompts de IA](#prompts-de-ia)
8. [Interface de Usuário](#interface-de-usuário)
9. [Plano de Implementação](#plano-de-implementação)
10. [Segurança e Performance](#segurança-e-performance)

---

## 🎯 Visão Geral

Sistema inteligente que permite aos usuários criar chatbots complexos de forma rápida e fácil através de:
1. **Template Library** - Galeria de flows pré-prontos para casos de uso comuns
2. **AI Flow Assistant** - Assistente de IA que gera flows personalizados baseado em descrição em linguagem natural
3. **Flow Improvements** - Sugestões automáticas de melhorias para flows existentes

### Vantagem Competitiva

Enquanto outras plataformas (Blip, Fortics, ManyChat) exigem conhecimento técnico ou horas de configuração manual, o PyTake permite criar chatbots sofisticados em **minutos** através de:
- "Quero um chatbot para qualificar leads de imobiliária" → Flow completo gerado
- Biblioteca de templates testados e prontos para usar
- Melhorias sugeridas automaticamente baseadas em best practices

---

## 🎁 Objetivos e Benefícios

### Objetivos

1. **Reduzir tempo de criação** - De horas para minutos
2. **Democratizar automação** - Usuários não-técnicos podem criar flows complexos
3. **Acelerar time-to-value** - Resultados rápidos para novos clientes
4. **Educar usuários** - Templates servem como exemplos e aprendizado
5. **Diferenciar produto** - Feature única no mercado brasileiro

### Benefícios para Usuários

- ⚡ **Velocidade** - Criar chatbot completo em 2-3 minutos
- 🎯 **Precisão** - IA entende contexto e gera flows otimizados
- 📚 **Aprendizado** - Templates demonstram best practices
- 🔄 **Iteração rápida** - Testar diferentes abordagens rapidamente
- 💡 **Inspiração** - Descobrir novas possibilidades

### Benefícios para o Negócio

- 📈 **Conversão** - Reduz fricção no onboarding
- 🎯 **Retenção** - Usuários veem valor mais rápido
- 💰 **Expansão** - Facilita upgrade para planos superiores
- 🏆 **Diferenciação** - Feature única no mercado
- 📣 **Marketing** - "Crie chatbots com IA em minutos"

---

## 🏗️ Arquitetura

### Visão Geral do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Template   │  │  AI Flow     │  │    Flow      │  │
│  │   Gallery    │  │  Assistant   │  │  Improvements│  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
└─────────┼─────────────────┼──────────────────┼──────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND API                           │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Template   │  │     Flow     │  │     Flow     │  │
│  │  Repository  │  │   Generator  │  │   Analyzer   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
└─────────┼─────────────────┼──────────────────┼──────────┘
          │                 │                  │
          │                 ▼                  │
          │        ┌──────────────┐            │
          │        │   OpenAI/    │            │
          │        │   Claude API │            │
          │        └──────────────┘            │
          │                                    │
          ▼                                    ▼
┌─────────────────────────────────────────────────────────┐
│                    STORAGE                               │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PostgreSQL  │  │  Template    │  │   MongoDB    │  │
│  │   (Flows)    │  │   Files      │  │  (Analytics) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Funcionalidades

### 1. Template Library (Biblioteca de Templates)

#### Categorias de Templates

```
📊 Qualificação de Leads
  ├─ 🏢 B2B Lead Qualification
  ├─ 🏠 Real Estate Lead Qualifier
  ├─ 🚗 Auto Sales Lead Capture
  └─ 📚 Education Lead Funnel

💼 Vendas e E-commerce
  ├─ 🛒 Product Catalog Browser
  ├─ 💳 Order Processing Flow
  ├─ 🎁 Upsell & Cross-sell
  └─ 🔄 Cart Recovery

📅 Agendamento
  ├─ 📆 Appointment Booking
  ├─ 🧑‍⚕️ Medical Consultation
  ├─ 💅 Beauty Salon Scheduler
  └─ 🏋️ Gym Class Booking

🎫 Suporte ao Cliente
  ├─ ❓ FAQ Automático
  ├─ 🎫 Ticket Triagem
  ├─ 📦 Order Tracking
  └─ 🔧 Technical Support

📢 Marketing
  ├─ 🎉 Campaign Landing
  ├─ 🎁 Promotion Announcement
  ├─ 🔔 Event Invitation
  └─ 📧 Newsletter Signup

🎓 Onboarding
  ├─ 👋 Welcome Flow
  ├─ 📖 Product Tutorial
  ├─ ✅ Setup Checklist
  └─ 🎯 Goal Setting
```

#### Estrutura de Template

Cada template inclui:

```json
{
  "id": "real_estate_lead_qualifier_v1",
  "name": "Qualificador de Leads Imobiliários",
  "category": "lead_qualification",
  "subcategory": "real_estate",
  "description": "Captura e qualifica leads interessados em imóveis",
  "thumbnail": "/templates/thumbnails/real_estate.png",
  "preview_image": "/templates/previews/real_estate_flow.png",
  "tags": ["leads", "real estate", "qualification", "b2c"],
  "complexity": "medium",
  "estimated_setup_time": "5 minutes",
  "node_count": 18,
  "features": [
    "Captura nome, telefone e email",
    "Qualifica tipo de imóvel desejado",
    "Identifica orçamento disponível",
    "Detecta urgência de compra",
    "Transfere leads quentes para corretor",
    "Adiciona leads frios ao remarketing"
  ],
  "variables_used": [
    "contact_name",
    "contact_phone",
    "contact_email",
    "property_type",
    "budget_range",
    "urgency_level",
    "preferred_location"
  ],
  "requires_integrations": [],
  "format_version": "1.0",
  "flow_data": {
    "name": "Qualificador de Leads Imobiliários",
    "is_main": false,
    "canvas_data": {
      "nodes": [...],
      "edges": [...]
    }
  },
  "metadata": {
    "author": "PyTake Team",
    "created_at": "2025-01-15T00:00:00Z",
    "last_updated": "2025-01-15T00:00:00Z",
    "version": "1.0.0",
    "language": "pt-BR",
    "industry": "real_estate",
    "use_count": 1247
  }
}
```

#### Interface de Template Gallery

**Fluxo de Uso:**
1. Usuário clica em "📚 Templates" no builder
2. Modal abre com grid de templates
3. Pode filtrar por categoria, complexidade, indústria
4. Clica em template para ver preview detalhado
5. Preview mostra:
   - Screenshot do flow visual
   - Lista de features
   - Variáveis necessárias
   - Estimativa de tempo de setup
   - Reviews/ratings de outros usuários
6. Clica "Importar Template"
7. Template é importado no builder atual
8. Usuário pode customizar conforme necessário

---

### 2. AI Flow Assistant (Assistente de IA)

#### Fluxo de Interação

**Conversa Exemplo:**

```
[Usuário abre AI Assistant no builder]

🤖 Assistente:
"Olá! 👋 Vou te ajudar a criar um chatbot.
Me conte: qual é o objetivo do seu chatbot?"

👤 Usuário:
"Quero qualificar leads de imobiliária"

🤖 Assistente:
"Ótimo! Para criar o melhor chatbot possível, preciso entender melhor:

1. Que tipo de imóveis você trabalha?
   a) Residenciais (casas/apartamentos)
   b) Comerciais (lojas/escritórios)
   c) Ambos

2. Qual é o foco principal?
   a) Venda
   b) Locação
   c) Ambos

3. Após qualificar, o que deve acontecer?
   a) Transferir para corretor humano
   b) Agendar visita automaticamente
   c) Enviar catálogo de imóveis"

👤 Usuário:
"1-a, 2-c, 3-a"

🤖 Assistente:
"Perfeito! Vou criar um chatbot que:

✅ Captura nome, telefone e email
✅ Pergunta se quer comprar ou alugar
✅ Identifica tipo de imóvel (casa/apto)
✅ Qualifica orçamento disponível
✅ Detecta urgência (quanto tempo)
✅ Captura localização preferida
✅ Calcula score de qualificação
✅ Leads quentes → Transfere para corretor
✅ Leads frios → Adiciona ao remarketing
✅ Rastreia eventos no Analytics

Gerando seu flow... ⏳"

[3-5 segundos depois]

🤖 Assistente:
"✨ Pronto! Criei um flow com 18 nodes conectados.

[Mostra preview visual do flow no canvas]

O que você acha? Posso fazer ajustes ou você pode importar direto."

👤 Usuário:
[Clica "✨ Importar Flow"]

🤖 Assistente:
"Flow importado com sucesso! 🎉
Agora você pode customizar conforme necessário."
```

#### Contexto e Personalização

A IA deve considerar:

**Contexto da Organização:**
- Indústria/setor
- Tamanho da empresa
- Público-alvo (B2B/B2C)
- Flows existentes (para manter consistência)

**Contexto do Chatbot:**
- Nome do chatbot
- Descrição
- Tags já aplicadas
- Número do WhatsApp vinculado (oficial vs Evolution)

**Best Practices:**
- Sempre iniciar com node "message" de boas-vindas
- Usar "question" nodes para captura de dados
- Validar inputs críticos (email, telefone)
- Adicionar "condition" para qualificação
- Incluir "analytics" para tracking
- Terminar com "handoff" ou "end"

---

### 3. Flow Improvements (Melhorias Sugeridas)

#### Análise Automática

Quando usuário abre um flow existente, a IA analisa e sugere:

**Análises Realizadas:**
1. **Missing Data Capture** - Dados importantes não sendo capturados
2. **Poor UX** - Mensagens muito longas, falta de confirmações
3. **No Analytics** - Falta de tracking de eventos importantes
4. **No Error Handling** - Falta de fallbacks para erros
5. **Inefficient Paths** - Caminhos desnecessariamente longos
6. **Missing Personalization** - Não usa variáveis para personalizar mensagens

**Sugestões Exemplo:**

```
🔍 Analisando seu flow "Atendimento Inicial"...

Encontrei 5 oportunidades de melhoria:

⚠️ URGENTE (2)
1. Sem Analytics - Adicionar tracking de conversões
   → Sugestão: Adicionar Analytics node após qualificação

2. Sem tratamento de erro - Se API falhar, usuário fica perdido
   → Sugestão: Adicionar Condition node para verificar success

💡 RECOMENDADO (2)
3. Mensagem muito longa no Node 3
   → Sugestão: Dividir em 2 mensagens menores

4. Faltando confirmação após captura de dados
   → Sugestão: Adicionar Message node confirmando dados capturados

✨ OTIMIZAÇÃO (1)
5. Caminho pode ser encurtado
   → Sugestão: Mesclar Nodes 7 e 8 em um único Condition node

[Botão: Aplicar Todas]  [Botão: Ver Detalhes]
```

---

## 🛠️ Especificações Técnicas

### Backend

#### 1. Flow Generator Service

**Arquivo:** `backend/app/services/flow_generator_service.py`

```python
from typing import Optional, Dict, List
from uuid import UUID
import json
from openai import AsyncOpenAI
# ou
# from anthropic import AsyncAnthropic

from app.core.config import settings
from app.services.chatbot_service import ChatbotService

class FlowGeneratorService:
    """
    Serviço para geração de flows usando IA
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.chatbot_service = ChatbotService(db)

        # Configurar cliente de IA
        if settings.AI_PROVIDER == "openai":
            self.ai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.OPENAI_MODEL or "gpt-4-turbo-preview"
        elif settings.AI_PROVIDER == "anthropic":
            self.ai_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            self.model = settings.ANTHROPIC_MODEL or "claude-3-opus-20240229"

    async def generate_flow_from_description(
        self,
        chatbot_id: UUID,
        organization_id: UUID,
        description: str,
        context: Optional[Dict] = None,
        clarifications: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Gera flow completo baseado em descrição

        Args:
            chatbot_id: ID do chatbot onde flow será importado
            organization_id: ID da organização (para contexto)
            description: Descrição em linguagem natural do flow desejado
            context: Contexto adicional (indústria, tipo de negócio, etc)
            clarifications: Respostas a perguntas de clarificação

        Returns:
            Dict com flow no formato de export/import
        """
        # Buscar contexto da organização e chatbot
        chatbot = await self.chatbot_service.get_chatbot(
            chatbot_id, organization_id
        )

        # Construir prompt
        prompt = self._build_generation_prompt(
            description=description,
            chatbot=chatbot,
            context=context or {},
            clarifications=clarifications or []
        )

        # Chamar IA
        ai_response = await self._call_ai_api(
            prompt=prompt,
            max_tokens=4000
        )

        # Extrair e validar JSON
        flow_json = self._extract_and_validate_json(ai_response)

        # Adicionar metadados
        flow_json["metadata"] = {
            **flow_json.get("metadata", {}),
            "generated_by": "ai_assistant",
            "generation_prompt": description,
            "ai_model": self.model,
            "generated_at": datetime.utcnow().isoformat()
        }

        return flow_json

    async def ask_clarification_questions(
        self,
        description: str,
        context: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Gera perguntas de clarificação para melhorar geração

        Returns:
            Lista de perguntas no formato:
            [
              {
                "id": "property_type",
                "question": "Que tipo de imóveis você trabalha?",
                "type": "single_choice",
                "options": [
                  {"value": "residential", "label": "Residenciais"},
                  {"value": "commercial", "label": "Comerciais"},
                  {"value": "both", "label": "Ambos"}
                ]
              }
            ]
        """
        prompt = self._build_clarification_prompt(description, context)

        ai_response = await self._call_ai_api(prompt=prompt, max_tokens=1000)

        questions = self._extract_and_validate_json(ai_response)

        return questions.get("questions", [])

    async def suggest_improvements(
        self,
        flow_id: UUID,
        organization_id: UUID
    ) -> List[Dict]:
        """
        Analisa flow existente e sugere melhorias

        Returns:
            Lista de sugestões:
            [
              {
                "id": "add_analytics",
                "severity": "high",
                "category": "missing_feature",
                "title": "Sem tracking de conversões",
                "description": "Adicionar Analytics node...",
                "suggested_changes": {
                  "add_nodes": [...],
                  "add_edges": [...],
                  "modify_nodes": [...]
                }
              }
            ]
        """
        # Buscar flow completo
        flow = await self.chatbot_service.get_flow(
            flow_id, organization_id, with_nodes=True
        )

        # Construir prompt de análise
        prompt = self._build_analysis_prompt(flow)

        # Chamar IA
        ai_response = await self._call_ai_api(prompt=prompt, max_tokens=2000)

        # Extrair sugestões
        suggestions = self._extract_and_validate_json(ai_response)

        return suggestions.get("improvements", [])

    async def apply_improvement(
        self,
        flow_id: UUID,
        organization_id: UUID,
        improvement_id: str,
        suggested_changes: Dict
    ) -> Flow:
        """
        Aplica uma melhoria sugerida ao flow
        """
        flow = await self.chatbot_service.get_flow(
            flow_id, organization_id, with_nodes=True
        )

        # Aplicar mudanças
        updated_canvas = self._apply_changes(
            flow.canvas_data,
            suggested_changes
        )

        # Atualizar flow
        updated_flow = await self.chatbot_service.update_flow(
            flow_id,
            organization_id,
            {"canvas_data": updated_canvas}
        )

        return updated_flow

    def _build_generation_prompt(
        self,
        description: str,
        chatbot: Chatbot,
        context: Dict,
        clarifications: List[Dict]
    ) -> str:
        """
        Constrói prompt para geração de flow
        """
        # Ver seção "Prompts de IA" abaixo
        pass

    async def _call_ai_api(
        self,
        prompt: str,
        max_tokens: int = 2000
    ) -> str:
        """
        Chama API de IA (OpenAI ou Anthropic)
        """
        if settings.AI_PROVIDER == "openai":
            response = await self.ai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.7
            )
            return response.choices[0].message.content

        elif settings.AI_PROVIDER == "anthropic":
            response = await self.ai_client.messages.create(
                model=self.model,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.7
            )
            return response.content[0].text

    def _extract_and_validate_json(self, ai_response: str) -> Dict:
        """
        Extrai JSON do response da IA e valida estrutura
        """
        # Extrair JSON entre ```json e ```
        import re
        json_match = re.search(r'```json\n(.*?)\n```', ai_response, re.DOTALL)

        if json_match:
            json_str = json_match.group(1)
        else:
            # Tentar parsear resposta inteira como JSON
            json_str = ai_response

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            raise ValueError(f"IA retornou JSON inválido: {e}")

        # Validar estrutura mínima
        if "flow" not in data:
            raise ValueError("JSON não contém campo 'flow'")

        if "canvas_data" not in data["flow"]:
            raise ValueError("Flow não contém 'canvas_data'")

        return data
```

#### 2. Template Repository

**Arquivo:** `backend/app/repositories/flow_template_repository.py`

```python
from typing import List, Optional
from pathlib import Path
import json

class FlowTemplateRepository:
    """
    Repositório de templates de flows
    """

    # Templates armazenados em arquivos JSON
    TEMPLATES_DIR = Path("app/templates/flows")

    @classmethod
    async def list_templates(
        cls,
        category: Optional[str] = None,
        industry: Optional[str] = None,
        complexity: Optional[str] = None,
        language: str = "pt-BR",
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict]:
        """
        Lista templates disponíveis com filtros
        """
        templates = []

        # Listar arquivos JSON no diretório
        for template_file in cls.TEMPLATES_DIR.glob("*.json"):
            with open(template_file, 'r', encoding='utf-8') as f:
                template = json.load(f)

            # Aplicar filtros
            if category and template.get("category") != category:
                continue
            if industry and template.get("metadata", {}).get("industry") != industry:
                continue
            if complexity and template.get("complexity") != complexity:
                continue
            if language and template.get("metadata", {}).get("language") != language:
                continue

            templates.append(template)

        # Ordenar por popularidade (use_count)
        templates.sort(
            key=lambda t: t.get("metadata", {}).get("use_count", 0),
            reverse=True
        )

        return templates[skip:skip+limit]

    @classmethod
    async def get_template(cls, template_id: str) -> Optional[Dict]:
        """
        Busca template específico por ID
        """
        template_file = cls.TEMPLATES_DIR / f"{template_id}.json"

        if not template_file.exists():
            return None

        with open(template_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    @classmethod
    async def increment_use_count(cls, template_id: str):
        """
        Incrementa contador de uso do template
        """
        template = await cls.get_template(template_id)

        if not template:
            return

        template["metadata"]["use_count"] = \
            template["metadata"].get("use_count", 0) + 1

        template_file = cls.TEMPLATES_DIR / f"{template_id}.json"

        with open(template_file, 'w', encoding='utf-8') as f:
            json.dump(template, f, ensure_ascii=False, indent=2)

    @classmethod
    async def get_categories(cls) -> List[Dict]:
        """
        Retorna lista de categorias disponíveis
        """
        return [
            {
                "id": "lead_qualification",
                "name": "Qualificação de Leads",
                "icon": "📊",
                "description": "Captura e qualifica potenciais clientes"
            },
            {
                "id": "sales",
                "name": "Vendas e E-commerce",
                "icon": "💼",
                "description": "Processos de venda e catálogo de produtos"
            },
            {
                "id": "scheduling",
                "name": "Agendamento",
                "icon": "📅",
                "description": "Marcação de consultas, reuniões e eventos"
            },
            {
                "id": "support",
                "name": "Suporte ao Cliente",
                "icon": "🎫",
                "description": "FAQ, triagem de tickets e suporte técnico"
            },
            {
                "id": "marketing",
                "name": "Marketing",
                "icon": "📢",
                "description": "Campanhas, promoções e captação"
            },
            {
                "id": "onboarding",
                "name": "Onboarding",
                "icon": "🎓",
                "description": "Boas-vindas e integração de novos usuários"
            }
        ]
```

#### 3. API Endpoints

**Arquivo:** `backend/app/api/v1/endpoints/chatbots.py`

Adicionar os seguintes endpoints:

```python
# ============================================
# AI FLOW ASSISTANT ENDPOINTS
# ============================================

@router.post(
    "/{chatbot_id}/flows/generate",
    response_model=dict,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def generate_flow_with_ai(
    chatbot_id: UUID,
    description: str = Body(..., description="Descrição do flow desejado"),
    context: Optional[dict] = Body(None, description="Contexto adicional"),
    clarifications: Optional[List[dict]] = Body(None, description="Respostas a perguntas"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Gera flow usando IA baseado em descrição

    Exemplo:
    ```json
    {
      "description": "Quero qualificar leads de imobiliária",
      "context": {
        "industry": "real_estate",
        "business_type": "b2c",
        "goal": "lead_qualification"
      },
      "clarifications": [
        {"question_id": "property_type", "answer": "residential"},
        {"question_id": "main_focus", "answer": "both"}
      ]
    }
    ```
    """
    service = FlowGeneratorService(db)

    flow_json = await service.generate_flow_from_description(
        chatbot_id=chatbot_id,
        organization_id=current_user.organization_id,
        description=description,
        context=context,
        clarifications=clarifications
    )

    return flow_json


@router.post(
    "/{chatbot_id}/flows/clarify",
    response_model=List[dict],
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def get_clarification_questions(
    chatbot_id: UUID,
    description: str = Body(...),
    context: Optional[dict] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Gera perguntas de clarificação para melhorar geração
    """
    service = FlowGeneratorService(db)

    questions = await service.ask_clarification_questions(
        description=description,
        context=context
    )

    return questions


@router.get(
    "/flows/{flow_id}/suggestions",
    response_model=List[dict],
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def get_flow_improvements(
    flow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Analisa flow e sugere melhorias
    """
    service = FlowGeneratorService(db)

    suggestions = await service.suggest_improvements(
        flow_id=flow_id,
        organization_id=current_user.organization_id
    )

    return suggestions


@router.post(
    "/flows/{flow_id}/suggestions/{improvement_id}/apply",
    response_model=FlowInDB,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def apply_flow_improvement(
    flow_id: UUID,
    improvement_id: str,
    suggested_changes: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Aplica uma melhoria sugerida ao flow
    """
    service = FlowGeneratorService(db)

    updated_flow = await service.apply_improvement(
        flow_id=flow_id,
        organization_id=current_user.organization_id,
        improvement_id=improvement_id,
        suggested_changes=suggested_changes
    )

    return updated_flow


# ============================================
# TEMPLATE LIBRARY ENDPOINTS
# ============================================

@router.get("/templates/categories", response_model=List[dict])
async def list_template_categories():
    """
    Lista categorias de templates disponíveis
    """
    return await FlowTemplateRepository.get_categories()


@router.get("/templates", response_model=List[dict])
async def list_flow_templates(
    category: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    complexity: Optional[str] = Query(None),
    language: str = Query("pt-BR"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """
    Lista templates de flows disponíveis
    """
    templates = await FlowTemplateRepository.list_templates(
        category=category,
        industry=industry,
        complexity=complexity,
        language=language,
        skip=skip,
        limit=limit
    )

    return templates


@router.get("/templates/{template_id}", response_model=dict)
async def get_flow_template(template_id: str):
    """
    Busca template específico por ID
    """
    template = await FlowTemplateRepository.get_template(template_id)

    if not template:
        raise NotFoundException("Template não encontrado")

    return template


@router.post(
    "/{chatbot_id}/templates/{template_id}/import",
    response_model=FlowInDB,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def import_template_to_chatbot(
    chatbot_id: UUID,
    template_id: str,
    override_name: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Importa template para chatbot
    """
    # Buscar template
    template = await FlowTemplateRepository.get_template(template_id)

    if not template:
        raise NotFoundException("Template não encontrado")

    # Incrementar contador de uso
    await FlowTemplateRepository.increment_use_count(template_id)

    # Importar flow
    service = ChatbotService(db)
    flow = await service.import_flow(
        import_data=template,
        chatbot_id=chatbot_id,
        organization_id=current_user.organization_id,
        override_name=override_name
    )

    return flow
```

#### 4. Configurações

**Arquivo:** `backend/app/core/config.py`

Adicionar as seguintes configurações:

```python
class Settings(BaseSettings):
    # ... existing settings ...

    # AI Provider
    AI_PROVIDER: str = Field(
        default="openai",
        description="AI provider: 'openai' or 'anthropic'"
    )

    # OpenAI
    OPENAI_API_KEY: Optional[str] = Field(
        default=None,
        description="OpenAI API key for flow generation"
    )
    OPENAI_MODEL: str = Field(
        default="gpt-4-turbo-preview",
        description="OpenAI model to use"
    )

    # Anthropic
    ANTHROPIC_API_KEY: Optional[str] = Field(
        default=None,
        description="Anthropic API key for flow generation"
    )
    ANTHROPIC_MODEL: str = Field(
        default="claude-3-opus-20240229",
        description="Anthropic model to use"
    )

    # Flow Generation Settings
    MAX_FLOW_GENERATION_TOKENS: int = Field(
        default=4000,
        description="Maximum tokens for flow generation"
    )
    MAX_CLARIFICATION_TOKENS: int = Field(
        default=1000,
        description="Maximum tokens for clarification questions"
    )
    MAX_ANALYSIS_TOKENS: int = Field(
        default=2000,
        description="Maximum tokens for flow analysis"
    )
```

**Arquivo:** `backend/.env.example`

```bash
# AI Flow Assistant
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
# ou
# AI_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-3-opus-20240229

MAX_FLOW_GENERATION_TOKENS=4000
MAX_CLARIFICATION_TOKENS=1000
MAX_ANALYSIS_TOKENS=2000
```

---

### Frontend

#### 1. AI Flow Assistant Component

**Arquivo:** `frontend/src/components/admin/builder/AIFlowAssistant.tsx`

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Download, X } from 'lucide-react';
import { chatbotsAPI, flowsAPI } from '@/lib/api/chatbots';
import { useToast } from '@/store/notificationStore';
import FlowPreview from './FlowPreview';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'single_choice' | 'multiple_choice' | 'text';
  options?: Array<{ value: string; label: string }>;
}

interface AIFlowAssistantProps {
  chatbotId: string;
  onFlowGenerated: () => void;
  onClose: () => void;
}

export default function AIFlowAssistant({
  chatbotId,
  onFlowGenerated,
  onClose,
}: AIFlowAssistantProps) {
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! 👋 Vou te ajudar a criar um chatbot. Me conte: qual é o objetivo do seu chatbot?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, any>>({});
  const [generatedFlow, setGeneratedFlow] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      // Se não há perguntas de clarificação ainda, buscar
      if (clarificationQuestions.length === 0) {
        const questions = await chatbotsAPI.getClarificationQuestions(chatbotId, {
          description: userMessage,
        });

        if (questions && questions.length > 0) {
          setClarificationQuestions(questions);

          // Formatar perguntas como mensagem
          const questionsText = questions
            .map((q, i) => {
              if (q.type === 'single_choice') {
                const options = q.options!
                  .map((opt, j) => `   ${String.fromCharCode(97 + j)}) ${opt.label}`)
                  .join('\n');
                return `${i + 1}. ${q.question}\n${options}`;
              }
              return `${i + 1}. ${q.question}`;
            })
            .join('\n\n');

          addMessage(
            'assistant',
            `Ótimo! Para criar o melhor chatbot possível, preciso entender melhor:\n\n${questionsText}`
          );
        }
      } else {
        // Já temos perguntas, processar respostas
        // Parse user answers (assume formato "1-a, 2-b, 3-c")
        const answers = parseAnswers(userMessage, clarificationQuestions);
        setClarificationAnswers(answers);

        addMessage('assistant', 'Perfeito! Gerando seu flow... ⏳');

        // Gerar flow
        const flowData = await chatbotsAPI.generateFlowWithAI(chatbotId, {
          description: messages.find((m) => m.role === 'user')?.content || '',
          clarifications: Object.entries(answers).map(([questionId, answer]) => ({
            question_id: questionId,
            answer,
          })),
        });

        setGeneratedFlow(flowData);

        addMessage(
          'assistant',
          '✨ Pronto! Criei um flow personalizado para você. Veja o preview abaixo e clique em "Importar Flow" quando estiver pronto.'
        );
      }
    } catch (error: any) {
      console.error('Erro ao processar mensagem:', error);
      toast.error(error.response?.data?.detail || 'Erro ao processar mensagem');
      addMessage(
        'assistant',
        'Desculpe, ocorreu um erro. Pode tentar novamente?'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportFlow = async () => {
    if (!generatedFlow || isImporting) return;

    try {
      setIsImporting(true);

      await flowsAPI.import(chatbotId, generatedFlow);

      toast.success('Flow importado com sucesso! 🎉');
      onFlowGenerated();
      onClose();
    } catch (error: any) {
      console.error('Erro ao importar flow:', error);
      toast.error(error.response?.data?.detail || 'Erro ao importar flow');
    } finally {
      setIsImporting(false);
    }
  };

  const parseAnswers = (
    input: string,
    questions: ClarificationQuestion[]
  ): Record<string, any> => {
    // Parse formato "1-a, 2-b, 3-c"
    const answers: Record<string, any> = {};
    const parts = input.split(',').map((p) => p.trim());

    parts.forEach((part) => {
      const match = part.match(/^(\d+)-([a-z]+)$/);
      if (match) {
        const questionIndex = parseInt(match[1]) - 1;
        const optionLetter = match[2];

        if (questionIndex >= 0 && questionIndex < questions.length) {
          const question = questions[questionIndex];
          const optionIndex = optionLetter.charCodeAt(0) - 97;

          if (question.options && optionIndex >= 0 && optionIndex < question.options.length) {
            answers[question.id] = question.options[optionIndex].value;
          }
        }
      }
    });

    return answers;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                AI Flow Assistant
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Crie chatbots com inteligência artificial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
              </div>
            </div>
          )}

          {/* Flow Preview */}
          {generatedFlow && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Flow Gerado
                </h3>
                <button
                  onClick={handleImportFlow}
                  disabled={isImporting}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Importar Flow
                    </>
                  )}
                </button>
              </div>
              <FlowPreview data={generatedFlow} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                clarificationQuestions.length > 0
                  ? 'Digite suas respostas (ex: 1-a, 2-b, 3-c)'
                  : 'Descreva o chatbot que você precisa...'
              }
              rows={2}
              className="flex-1 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 2. Flow Template Gallery Component

**Arquivo:** `frontend/src/components/admin/builder/FlowTemplateGallery.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Download, Loader2, Search, Filter } from 'lucide-react';
import { chatbotsAPI, flowsAPI } from '@/lib/api/chatbots';
import { useToast } from '@/store/notificationStore';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: string;
  complexity: string;
  node_count: number;
  estimated_setup_time: string;
  features: string[];
  tags: string[];
}

interface FlowTemplateGalleryProps {
  chatbotId: string;
  onTemplateImported: () => void;
  onClose: () => void;
}

export default function FlowTemplateGallery({
  chatbotId,
  onTemplateImported,
  onClose,
}: FlowTemplateGalleryProps) {
  const toast = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const [templatesData, categoriesData] = await Promise.all([
        chatbotsAPI.listTemplates({ category: selectedCategory || undefined }),
        chatbotsAPI.listTemplateCategories(),
      ]);

      setTemplates(templatesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportTemplate = async (templateId: string) => {
    try {
      setIsImporting(true);

      await chatbotsAPI.importTemplate(chatbotId, templateId);

      toast.success('Template importado com sucesso! 🎉');
      onTemplateImported();
      onClose();
    } catch (error: any) {
      console.error('Erro ao importar template:', error);
      toast.error(error.response?.data?.detail || 'Erro ao importar template');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              📚 Biblioteca de Templates
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Escolha um template pronto e comece em minutos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Categories */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Categorias
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === null
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                📋 Todos
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {category.icon} {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar templates..."
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Template Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 dark:text-gray-400">
                    Nenhum template encontrado
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      {/* Thumbnail */}
                      <div className="h-40 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
                        <span className="text-6xl">
                          {categories.find((c) => c.id === template.category)?.icon || '📊'}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {template.description}
                        </p>

                        {/* Meta */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                          <span>⏱️ {template.estimated_setup_time}</span>
                          <span>🔷 {template.node_count} nodes</span>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {template.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImportTemplate(template.id);
                          }}
                          disabled={isImporting}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Download className="w-4 h-4" />
                          Usar Template
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onImport={() => handleImportTemplate(selectedTemplate.id)}
          onClose={() => setSelectedTemplate(null)}
          isImporting={isImporting}
        />
      )}
    </div>
  );
}
```

#### 3. Integração no Builder

**Arquivo:** `frontend/src/app/admin/chatbots/[id]/builder/page.tsx`

Adicionar os botões no header:

```tsx
<div className="flex items-center gap-3">
  {/* AI Assistant Button */}
  <button
    onClick={() => setShowAIAssistant(true)}
    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-colors"
  >
    <Sparkles className="w-4 h-4" />
    Criar com IA
  </button>

  {/* Templates Button */}
  <button
    onClick={() => setShowTemplateGallery(true)}
    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
  >
    <Library className="w-4 h-4" />
    Templates
  </button>

  {/* Existing buttons... */}
</div>

{/* Modals */}
{showAIAssistant && (
  <AIFlowAssistant
    chatbotId={chatbotId}
    onFlowGenerated={loadChatbotData}
    onClose={() => setShowAIAssistant(false)}
  />
)}

{showTemplateGallery && (
  <FlowTemplateGallery
    chatbotId={chatbotId}
    onTemplateImported={loadChatbotData}
    onClose={() => setShowTemplateGallery(false)}
  />
)}
```

---

## 📚 Templates Pré-prontos

### Template 1: Real Estate Lead Qualifier

**Arquivo:** `backend/app/templates/flows/real_estate_lead_qualifier_v1.json`

```json
{
  "id": "real_estate_lead_qualifier_v1",
  "name": "Qualificador de Leads Imobiliários",
  "category": "lead_qualification",
  "subcategory": "real_estate",
  "description": "Captura e qualifica leads interessados em imóveis, identificando orçamento, localização preferida e urgência de compra",
  "complexity": "medium",
  "estimated_setup_time": "5 minutos",
  "node_count": 18,
  "tags": ["leads", "real estate", "qualification", "b2c", "sales"],
  "features": [
    "Captura nome, telefone e email com validação",
    "Identifica interesse (compra ou locação)",
    "Qualifica tipo de imóvel desejado",
    "Detecta orçamento disponível",
    "Identifica localização preferida",
    "Calcula score de qualificação",
    "Transfere leads quentes para corretor",
    "Adiciona leads frios ao remarketing",
    "Rastreia eventos no Analytics"
  ],
  "format_version": "1.0",
  "flow_data": {
    "name": "Qualificador de Leads - Imobiliária",
    "canvas_data": {
      "nodes": [
        {
          "id": "node-1",
          "type": "default",
          "position": { "x": 250, "y": 100 },
          "data": {
            "nodeType": "start",
            "label": "Início"
          }
        },
        {
          "id": "node-2",
          "type": "default",
          "position": { "x": 250, "y": 200 },
          "data": {
            "nodeType": "message",
            "messageText": "Olá! 👋 Bem-vindo à [Nome da Imobiliária]!\n\nVou te ajudar a encontrar o imóvel perfeito. Primeiro, preciso conhecer você melhor."
          }
        },
        {
          "id": "node-3",
          "type": "default",
          "position": { "x": 250, "y": 300 },
          "data": {
            "nodeType": "question",
            "questionText": "Qual é o seu nome?",
            "outputVariable": "contact_name",
            "validationType": "text"
          }
        },
        {
          "id": "node-4",
          "type": "default",
          "position": { "x": 250, "y": 400 },
          "data": {
            "nodeType": "question",
            "questionText": "Qual é o seu telefone?",
            "outputVariable": "contact_phone",
            "validationType": "phone"
          }
        },
        {
          "id": "node-5",
          "type": "default",
          "position": { "x": 250, "y": 500 },
          "data": {
            "nodeType": "question",
            "questionText": "E o seu email?",
            "outputVariable": "contact_email",
            "validationType": "email"
          }
        },
        {
          "id": "node-6",
          "type": "default",
          "position": { "x": 250, "y": 600 },
          "data": {
            "nodeType": "message",
            "messageText": "Perfeito, {{contact_name}}! 😊\n\nAgora me conte sobre o que você está procurando:"
          }
        },
        {
          "id": "node-7",
          "type": "default",
          "position": { "x": 250, "y": 700 },
          "data": {
            "nodeType": "interactive_buttons",
            "messageText": "Você está interessado em:",
            "buttons": [
              { "id": "compra", "text": "🏠 Comprar" },
              { "id": "locacao", "text": "🔑 Alugar" }
            ],
            "outputVariable": "interesse_tipo"
          }
        },
        {
          "id": "node-8",
          "type": "default",
          "position": { "x": 250, "y": 800 },
          "data": {
            "nodeType": "interactive_list",
            "messageText": "Que tipo de imóvel você busca?",
            "listTitle": "Escolha uma opção",
            "sections": [
              {
                "title": "Residencial",
                "rows": [
                  { "id": "apartamento", "title": "Apartamento" },
                  { "id": "casa", "title": "Casa" },
                  { "id": "sobrado", "title": "Sobrado" },
                  { "id": "cobertura", "title": "Cobertura" }
                ]
              }
            ],
            "outputVariable": "property_type"
          }
        },
        {
          "id": "node-9",
          "type": "default",
          "position": { "x": 250, "y": 900 },
          "data": {
            "nodeType": "question",
            "questionText": "Qual é o seu orçamento aproximado?",
            "outputVariable": "budget_range",
            "validationType": "text"
          }
        },
        {
          "id": "node-10",
          "type": "default",
          "position": { "x": 250, "y": 1000 },
          "data": {
            "nodeType": "question",
            "questionText": "Em qual bairro ou região você prefere?",
            "outputVariable": "preferred_location",
            "validationType": "text"
          }
        },
        {
          "id": "node-11",
          "type": "default",
          "position": { "x": 250, "y": 1100 },
          "data": {
            "nodeType": "interactive_buttons",
            "messageText": "Qual é a sua urgência?",
            "buttons": [
              { "id": "imediato", "text": "🔥 Urgente (até 1 mês)" },
              { "id": "breve", "text": "📅 Breve (1-3 meses)" },
              { "id": "futuro", "text": "⏰ Futuro (3+ meses)" }
            ],
            "outputVariable": "urgency_level"
          }
        },
        {
          "id": "node-12",
          "type": "default",
          "position": { "x": 250, "y": 1200 },
          "data": {
            "nodeType": "script",
            "language": "python",
            "code": "# Calcular score de qualificação\nscore = 0\n\nif urgency_level == 'imediato':\n    score += 40\nelif urgency_level == 'breve':\n    score += 20\nelse:\n    score += 5\n\nif budget_range and 'R$' in budget_range:\n    score += 30\n\nif contact_email:\n    score += 15\n\nif preferred_location:\n    score += 15\n\nreturn score",
            "outputVariable": "qualification_score"
          }
        },
        {
          "id": "node-13",
          "type": "default",
          "position": { "x": 150, "y": 1300 },
          "data": {
            "nodeType": "condition",
            "conditions": [
              {
                "variable": "qualification_score",
                "operator": "gte",
                "value": "60",
                "targetNodeId": "node-14"
              },
              {
                "variable": "qualification_score",
                "operator": "lt",
                "value": "60",
                "targetNodeId": "node-16"
              }
            ]
          }
        },
        {
          "id": "node-14",
          "type": "default",
          "position": { "x": 50, "y": 1400 },
          "data": {
            "nodeType": "analytics",
            "eventType": "conversion",
            "eventName": "lead_qualified_hot",
            "eventValue": "{{qualification_score}}",
            "tags": ["lead_quente", "prioridade_alta"]
          }
        },
        {
          "id": "node-15",
          "type": "default",
          "position": { "x": 50, "y": 1500 },
          "data": {
            "nodeType": "handoff",
            "handoffType": "queue",
            "priority": "high",
            "contextMessage": "Lead Qualificado - Score: {{qualification_score}}\n\nDados:\n- Nome: {{contact_name}}\n- Telefone: {{contact_phone}}\n- Email: {{contact_email}}\n- Interesse: {{interesse_tipo}}\n- Tipo: {{property_type}}\n- Orçamento: {{budget_range}}\n- Região: {{preferred_location}}\n- Urgência: {{urgency_level}}",
            "generateSummary": true
          }
        },
        {
          "id": "node-16",
          "type": "default",
          "position": { "x": 250, "y": 1400 },
          "data": {
            "nodeType": "analytics",
            "eventType": "engagement",
            "eventName": "lead_captured_cold",
            "eventValue": "{{qualification_score}}",
            "tags": ["lead_frio", "remarketing"]
          }
        },
        {
          "id": "node-17",
          "type": "default",
          "position": { "x": 250, "y": 1500 },
          "data": {
            "nodeType": "message",
            "messageText": "Obrigado pelas informações, {{contact_name}}! 🙏\n\nVou adicionar você à nossa lista e em breve entraremos em contato com opções que combinam com o que você está buscando.\n\nFique de olho no seu WhatsApp!"
          }
        },
        {
          "id": "node-18",
          "type": "default",
          "position": { "x": 250, "y": 1600 },
          "data": {
            "nodeType": "end",
            "sendFarewell": true,
            "farewellMessage": "Até logo! 👋"
          }
        }
      ],
      "edges": [
        { "id": "edge-1", "source": "node-1", "target": "node-2" },
        { "id": "edge-2", "source": "node-2", "target": "node-3" },
        { "id": "edge-3", "source": "node-3", "target": "node-4" },
        { "id": "edge-4", "source": "node-4", "target": "node-5" },
        { "id": "edge-5", "source": "node-5", "target": "node-6" },
        { "id": "edge-6", "source": "node-6", "target": "node-7" },
        { "id": "edge-7", "source": "node-7", "target": "node-8" },
        { "id": "edge-8", "source": "node-8", "target": "node-9" },
        { "id": "edge-9", "source": "node-9", "target": "node-10" },
        { "id": "edge-10", "source": "node-10", "target": "node-11" },
        { "id": "edge-11", "source": "node-11", "target": "node-12" },
        { "id": "edge-12", "source": "node-12", "target": "node-13" },
        { "id": "edge-13", "source": "node-13", "target": "node-14", "label": "Hot" },
        { "id": "edge-14", "source": "node-14", "target": "node-15" },
        { "id": "edge-15", "source": "node-13", "target": "node-16", "label": "Cold" },
        { "id": "edge-16", "source": "node-16", "target": "node-17" },
        { "id": "edge-17", "source": "node-17", "target": "node-18" }
      ]
    }
  },
  "metadata": {
    "author": "PyTake Team",
    "created_at": "2025-01-15T00:00:00Z",
    "last_updated": "2025-01-15T00:00:00Z",
    "version": "1.0.0",
    "language": "pt-BR",
    "industry": "real_estate",
    "use_count": 0
  }
}
```

### Outros Templates Sugeridos

Criar templates semelhantes para:

1. **B2B Lead Qualification** - Para vendas enterprise
2. **E-commerce Product Catalog** - Navegação em catálogo
3. **Medical Appointment Booking** - Agendamento médico
4. **Customer Support FAQ** - Suporte automatizado
5. **Event Registration** - Inscrição em eventos
6. **Welcome & Onboarding** - Boas-vindas para novos clientes
7. **Order Tracking** - Rastreamento de pedidos
8. **Feedback Collection** - Pesquisa de satisfação
9. **Cart Recovery** - Recuperação de carrinho abandonado
10. **Subscription Management** - Gerenciar assinaturas

---

## 🤖 Prompts de IA

### System Prompt (Base)

```
Você é um especialista em criar chatbots de WhatsApp usando a plataforma PyTake.

Seu objetivo é gerar flows completos e funcionais no formato JSON com nodes e edges conectados.

## Node Types Disponíveis:

1. **start** - Ponto de entrada do fluxo (apenas 1 por flow)
2. **message** - Enviar mensagem de texto ao usuário
3. **question** - Capturar resposta do usuário e armazenar em variável
4. **condition** - Decisão condicional baseada em variáveis
5. **action** - Executar ação (salvar contato, webhook, etc)
6. **delay** - Adicionar atraso temporal antes do próximo node
7. **api_call** - Chamar API externa e armazenar resposta
8. **ai_prompt** - Enviar prompt para IA (GPT/Claude) e obter resposta
9. **database_query** - Consultar banco de dados
10. **script** - Executar código Python customizado
11. **set_variable** - Definir ou atualizar variáveis
12. **random** - Selecionar caminho aleatório (A/B testing)
13. **datetime** - Manipular datas e horários
14. **analytics** - Rastrear eventos e métricas
15. **whatsapp_template** - Enviar template oficial WhatsApp
16. **interactive_buttons** - Enviar mensagem com botões
17. **interactive_list** - Enviar mensagem com lista de seleção
18. **jump** - Pular para outro node ou flow
19. **end** - Finalizar conversa
20. **handoff** - Transferir para agente humano

## Best Practices:

1. **Sempre começar com node "start"** seguido de "message" de boas-vindas
2. **Usar "question" para captura de dados** - Nome, email, telefone, preferências
3. **Validar inputs críticos** - Use validationType (email, phone, number)
4. **Personalizar mensagens** - Use variáveis: "Olá, {{contact_name}}!"
5. **Adicionar confirmações** - Após capturar dados, confirme com usuário
6. **Usar "condition" para qualificação** - Branches baseados em respostas
7. **Incluir "analytics"** - Rastrear eventos importantes (qualificação, conversão)
8. **Implementar fallbacks** - Sempre ter caminho para erros
9. **Terminar adequadamente** - Use "handoff" para transferir ou "end" para finalizar
10. **Manter UX simples** - Mensagens curtas, perguntas diretas, confirmações rápidas

## Formato de Output:

```json
{
  "format_version": "1.0",
  "flow": {
    "name": "Nome Descritivo do Flow",
    "canvas_data": {
      "nodes": [
        {
          "id": "node-1",
          "type": "default",
          "position": { "x": 250, "y": 100 },
          "data": {
            "nodeType": "start",
            "label": "Início"
          }
        },
        // ... mais nodes
      ],
      "edges": [
        {
          "id": "edge-1",
          "source": "node-1",
          "target": "node-2"
        },
        // ... mais edges
      ]
    }
  },
  "metadata": {
    "description": "Breve descrição do que o flow faz",
    "node_count": 15,
    "estimated_complexity": "medium"
  }
}
```

## Positioning Guidelines:

- Start node: (250, 100)
- Espaçamento vertical: 100px entre nodes
- Espaçamento horizontal para branches: 200px
- Manter fluxo linear quando possível
- Branches devem divergir horizontalmente

## IMPORTANTE:

1. SEMPRE retorne JSON válido envolvido em ```json
2. SEMPRE conecte todos os nodes com edges
3. NUNCA deixe nodes órfãos (sem conexão)
4. SEMPRE use IDs únicos para nodes e edges
5. SEMPRE inclua position para cada node
6. SEMPRE preencha campos obrigatórios de cada node type
7. Variáveis devem usar snake_case: contact_name, property_type
8. Messages devem ser curtas e objetivas (máx 300 caracteres)

Quando gerar um flow, pense em:
- Qual o objetivo? (qualificar, vender, agendar, suportar)
- Que dados precisam ser capturados?
- Como qualificar/categorizar o usuário?
- Quando transferir para humano vs automatizar?
- Quais eventos rastrear para análise?
```

### User Prompt Template (Geração)

```
O usuário precisa de um chatbot para: {description}

Contexto:
- Indústria: {industry}
- Tipo de negócio: {business_type}
- Idioma: {language}
- Objetivo principal: {goal}

{clarifications_section}

Gere um flow completo e funcional que:
1. Seja claro e fácil de usar
2. Capture todos os dados necessários
3. Qualifique adequadamente o usuário
4. Inclua tracking de eventos importantes
5. Termine com handoff ou end apropriado

Retorne APENAS o JSON do flow, sem explicações adicionais.
```

### Clarification Prompt Template

```
O usuário quer criar um chatbot para: {description}

Para gerar o melhor flow possível, preciso entender melhor alguns aspectos.

Gere 3-5 perguntas de clarificação relevantes no formato JSON abaixo.
As perguntas devem ajudar a personalizar o flow para o caso de uso específico.

Formato:
```json
{
  "questions": [
    {
      "id": "property_type",
      "question": "Que tipo de imóveis você trabalha?",
      "type": "single_choice",
      "options": [
        {"value": "residential", "label": "Residenciais (casas/apartamentos)"},
        {"value": "commercial", "label": "Comerciais (lojas/escritórios)"},
        {"value": "both", "label": "Ambos"}
      ]
    },
    {
      "id": "main_goal",
      "question": "Qual é o objetivo principal?",
      "type": "single_choice",
      "options": [
        {"value": "qualification", "label": "Qualificar leads"},
        {"value": "appointment", "label": "Agendar visitas"},
        {"value": "both", "label": "Ambos"}
      ]
    }
  ]
}
```

Retorne APENAS o JSON, sem explicações adicionais.
```

### Analysis Prompt Template (Melhorias)

```
Analise o flow abaixo e sugira melhorias concretas.

Flow atual:
{flow_json}

Analise os seguintes aspectos:
1. **Captura de Dados** - Dados importantes não estão sendo capturados?
2. **UX** - Mensagens muito longas? Faltam confirmações?
3. **Analytics** - Eventos importantes não estão sendo rastreados?
4. **Error Handling** - Faltam fallbacks para erros?
5. **Eficiência** - Caminhos desnecessariamente longos?
6. **Personalização** - Variáveis poderiam melhorar a experiência?

Para cada problema encontrado, forneça:
- Severity: high/medium/low
- Category: missing_data/poor_ux/no_analytics/no_error_handling/inefficient/missing_personalization
- Title: Título curto do problema
- Description: Descrição detalhada
- Suggested changes: Nodes para adicionar/modificar/remover

Formato de output:
```json
{
  "improvements": [
    {
      "id": "add_analytics_1",
      "severity": "high",
      "category": "no_analytics",
      "title": "Sem tracking de conversões",
      "description": "Adicionar Analytics node após qualificação para rastrear leads qualificados",
      "suggested_changes": {
        "add_nodes": [
          {
            "after_node_id": "node-12",
            "node_data": {
              "nodeType": "analytics",
              "eventType": "conversion",
              "eventName": "lead_qualified"
            }
          }
        ]
      }
    }
  ]
}
```

Retorne APENAS o JSON, sem explicações adicionais.
Foque em melhorias práticas e acionáveis.
```

---

## 🎨 Interface de Usuário

### Mockups

#### 1. AI Assistant - Chat Interface

```
┌─────────────────────────────────────────────────────────┐
│  [✨] AI Flow Assistant                         [X]     │
│  Crie chatbots com inteligência artificial              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🤖 Olá! 👋 Vou te ajudar a criar um chatbot.          │
│     Me conte: qual é o objetivo do seu chatbot?         │
│                                                          │
│                   Quero qualificar leads de imobiliária │
│                                                     👤   │
│                                                          │
│  🤖 Ótimo! Para criar o melhor chatbot possível,       │
│     preciso entender melhor:                            │
│                                                          │
│     1. Que tipo de imóveis você trabalha?               │
│        a) Residenciais (casas/apartamentos)             │
│        b) Comerciais (lojas/escritórios)                │
│        c) Ambos                                          │
│                                                          │
│     2. Qual é o foco principal?                         │
│        a) Venda                                          │
│        b) Locação                                        │
│        c) Ambos                                          │
│                                                          │
│                                         1-a, 2-c, 3-a  │
│                                                     👤   │
│                                                          │
│  🤖 Perfeito! Gerando seu flow... ⏳                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ✨ Flow Gerado                                   │  │
│  │                                                  │  │
│  │ [Preview Visual do Flow]                        │  │
│  │                                                  │  │
│  │ [Botão: ✨ Importar Flow]                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [Descreva o chatbot que você precisa...]         [>]  │
└─────────────────────────────────────────────────────────┘
```

#### 2. Template Gallery

```
┌────────────────────────────────────────────────────────────────────┐
│  📚 Biblioteca de Templates                                   [X]  │
│  Escolha um template pronto e comece em minutos                    │
├──────────────┬─────────────────────────────────────────────────────┤
│              │  [🔍 Buscar templates...]                           │
│ Categorias   ├─────────────────────────────────────────────────────┤
│              │                                                      │
│ [📋 Todos]   │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│ 📊 Qualif... │  │  🏠     │  │  💼     │  │  📅     │            │
│ 💼 Vendas    │  │         │  │         │  │         │            │
│ 📅 Agendam.. │  │Qualif.. │  │Product  │  │Appoint. │            │
│ 🎫 Suporte   │  │Leads    │  │Catalog  │  │Booking  │            │
│ 📢 Marketing │  │Imobil.. │  │         │  │         │            │
│ 🎓 Onboard.. │  │⏱️ 5 min │  │⏱️ 10min │  │⏱️ 8 min │            │
│              │  │🔷 18 n. │  │🔷 25 n. │  │🔷 15 n. │            │
│              │  │[Usar]   │  │[Usar]   │  │[Usar]   │            │
│              │  └─────────┘  └─────────┘  └─────────┘            │
│              │                                                      │
│              │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│              │  │  🎫     │  │  📢     │  │  👋     │            │
│              │  │         │  │         │  │         │            │
│              │  │Support  │  │Campaign │  │Welcome  │            │
│              │  │FAQ      │  │Landing  │  │Flow     │            │
│              │  │         │  │         │  │         │            │
│              │  │⏱️ 3 min │  │⏱️ 4 min │  │⏱️ 2 min │            │
│              │  │🔷 8 n.  │  │🔷 12 n. │  │🔷 6 n.  │            │
│              │  │[Usar]   │  │[Usar]   │  │[Usar]   │            │
│              │  └─────────┘  └─────────┘  └─────────┘            │
└──────────────┴─────────────────────────────────────────────────────┘
```

#### 3. Flow Improvements Panel

```
┌─────────────────────────────────────────────────────────┐
│  🔍 Sugestões de Melhoria                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Analisando seu flow "Atendimento Inicial"... ✓         │
│                                                          │
│  Encontrei 5 oportunidades de melhoria:                 │
│                                                          │
│  ⚠️ URGENTE (2)                                         │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ❌ Sem Analytics                                 │  │
│  │                                                  │  │
│  │ Adicionar tracking de conversões após           │  │
│  │ qualificação para medir performance.             │  │
│  │                                                  │  │
│  │ [Aplicar]  [Ver Detalhes]                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ⚠️ Sem tratamento de erro                        │  │
│  │                                                  │  │
│  │ Se API falhar, usuário fica perdido. Adicionar  │  │
│  │ Condition node para verificar success.          │  │
│  │                                                  │  │
│  │ [Aplicar]  [Ver Detalhes]                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  💡 RECOMENDADO (2)                                     │
│  [Ver mais...]                                           │
│                                                          │
│  [Aplicar Todas]  [Ignorar Todas]                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Plano de Implementação

### Fase 1: Infraestrutura (Semana 1)

**Backend:**
- [ ] Configurar integração com OpenAI/Anthropic
- [ ] Criar `FlowGeneratorService` com método base
- [ ] Criar `FlowTemplateRepository`
- [ ] Implementar endpoints básicos
- [ ] Adicionar configurações ao `.env`

**Frontend:**
- [ ] Criar estrutura de pastas para componentes
- [ ] Implementar `FlowPreview` component (preview de flow)
- [ ] Criar utilities para parsing de JSON

**Tempo estimado:** 2-3 dias

---

### Fase 2: Template Library (Semana 1-2)

**Backend:**
- [ ] Criar 10 templates pré-prontos em JSON
- [ ] Implementar listagem de templates com filtros
- [ ] Implementar endpoint de importação
- [ ] Adicionar contador de uso

**Frontend:**
- [ ] Criar `FlowTemplateGallery` component
- [ ] Implementar grid de templates
- [ ] Criar modal de preview detalhado
- [ ] Integrar no builder

**Tempo estimado:** 3-4 dias

---

### Fase 3: AI Flow Assistant (Semana 2-3)

**Backend:**
- [ ] Implementar `generate_flow_from_description()`
- [ ] Implementar `ask_clarification_questions()`
- [ ] Criar system prompt e user prompt templates
- [ ] Validação e sanitização de JSON gerado
- [ ] Testes de geração com diferentes cenários

**Frontend:**
- [ ] Criar `AIFlowAssistant` component
- [ ] Implementar interface de chat
- [ ] Implementar perguntas de clarificação
- [ ] Integrar preview de flow gerado
- [ ] Integrar no builder

**Tempo estimado:** 4-5 dias

---

### Fase 4: Flow Improvements (Semana 3-4)

**Backend:**
- [ ] Implementar `suggest_improvements()`
- [ ] Criar análise de flows existentes
- [ ] Implementar `apply_improvement()`
- [ ] Criar prompt de análise

**Frontend:**
- [ ] Criar `FlowImprovementsPanel` component
- [ ] Implementar lista de sugestões
- [ ] Implementar aplicação de melhorias
- [ ] Integrar no builder

**Tempo estimado:** 3-4 dias

---

### Fase 5: Testing & Refinement (Semana 4)

**Testing:**
- [ ] Testes unitários dos services
- [ ] Testes de integração dos endpoints
- [ ] Testes de geração com diferentes prompts
- [ ] Testes de validação de JSON
- [ ] Testes de UI dos componentes

**Refinement:**
- [ ] Ajustar prompts baseado em resultados
- [ ] Melhorar UX dos componentes
- [ ] Adicionar loading states e error handling
- [ ] Otimizar performance
- [ ] Documentação de uso

**Tempo estimado:** 3-4 dias

---

### Timeline Total

**Estimativa:** 3-4 semanas (15-20 dias úteis)

**Cronograma:**
- Semana 1: Infraestrutura + Template Library
- Semana 2: AI Assistant (backend + frontend)
- Semana 3: AI Assistant (refinamento) + Flow Improvements
- Semana 4: Testing, refinamento e documentação

---

## 🔒 Segurança e Performance

### Segurança

**1. API Key Protection:**
```python
# Nunca expor API keys no frontend
# Sempre armazenar em variáveis de ambiente
OPENAI_API_KEY=sk-...  # Em backend/.env
ANTHROPIC_API_KEY=sk-ant-...

# Backend valida e sanitiza todos os inputs
```

**2. Rate Limiting:**
```python
# Limitar número de gerações por organização
MAX_GENERATIONS_PER_DAY = 50  # Por organização
MAX_GENERATIONS_PER_HOUR = 10

# Implementar em middleware ou decorator
@rate_limit(max_calls=10, period=3600)
async def generate_flow_with_ai(...):
    pass
```

**3. Input Validation:**
```python
# Validar descrição do usuário
MAX_DESCRIPTION_LENGTH = 1000

# Sanitizar inputs antes de enviar para IA
def sanitize_input(text: str) -> str:
    # Remove caracteres especiais
    # Limita tamanho
    # Remove tentativas de injection
    pass
```

**4. JSON Validation:**
```python
# Validar JSON gerado pela IA antes de salvar
def validate_generated_flow(flow_json: dict) -> bool:
    required_fields = ["format_version", "flow", "canvas_data"]

    # Verificar estrutura
    # Validar node types
    # Verificar connections
    # Limitar tamanho (max nodes)
    pass
```

---

### Performance

**1. Caching:**
```python
# Cache de templates
@lru_cache(maxsize=100)
async def get_template(template_id: str):
    pass

# Cache de perguntas de clarificação comuns
CLARIFICATION_CACHE = {}
```

**2. Async Processing:**
```python
# Geração de flows é async
# Não bloqueia outras requests
async def generate_flow_from_description(...):
    # Processar em background se necessário
    pass
```

**3. Streaming (Futuro):**
```python
# Para UX melhor, implementar streaming de geração
# Usuário vê progress enquanto IA gera
async def generate_flow_stream(...):
    async for chunk in ai_client.stream(...):
        yield chunk
```

**4. Timeout Protection:**
```python
# Timeout para chamadas de IA
GENERATION_TIMEOUT = 30  # seconds

async with timeout(GENERATION_TIMEOUT):
    result = await ai_client.generate(...)
```

---

### Custos

**Estimativa de Custos (OpenAI GPT-4):**

**Geração de Flow:**
- Prompt: ~2000 tokens (system + user)
- Response: ~2000 tokens (JSON flow)
- Total: ~4000 tokens
- Custo: $0.03 USD por geração

**Perguntas de Clarificação:**
- Prompt: ~500 tokens
- Response: ~500 tokens
- Total: ~1000 tokens
- Custo: $0.008 USD por request

**Análise de Flow:**
- Prompt: ~3000 tokens (flow + system)
- Response: ~1000 tokens
- Total: ~4000 tokens
- Custo: $0.03 USD por análise

**Custos Mensais (Estimativa):**
- 100 organizações ativas
- 5 gerações/org/mês em média
- 500 gerações totais
- **Custo total: $15 USD/mês**

**ROI:**
- Valor agregado: Economiza 2-3 horas por flow
- Tempo economizado: 1000-1500 horas/mês
- Diferencial competitivo: Priceless 🚀

---

## 📈 Métricas de Sucesso

### KPIs para Medir

**1. Adoção:**
- % de novos usuários que usam AI Assistant
- % de flows criados via templates vs manual
- Número de templates importados por dia

**2. Qualidade:**
- % de flows gerados que são importados
- % de flows importados que são editados
- Rating de templates pelos usuários

**3. Performance:**
- Tempo médio de geração de flow
- Taxa de erro de geração
- Taxa de success de importação

**4. Impacto no Negócio:**
- Redução no tempo até primeiro flow
- Aumento na ativação de usuários
- Redução em churn inicial

---

## 🎯 Conclusão

Esta especificação fornece um roadmap completo para implementação do **AI Flow Assistant & Template Library**, um diferencial competitivo importante para o PyTake.

### Próximos Passos

1. **Revisar e aprovar** esta especificação
2. **Escolher AI provider** (OpenAI vs Anthropic)
3. **Definir prioridades** (qual fase implementar primeiro)
4. **Alocar recursos** (desenvolvedores, tempo, orçamento)
5. **Iniciar implementação** seguindo o plano de 4 semanas

### Contato para Implementação

Quando estiver pronto para iniciar a implementação, esta documentação serve como guia completo com:
- ✅ Arquitetura definida
- ✅ Código de exemplo pronto
- ✅ Prompts de IA testáveis
- ✅ Templates de exemplo
- ✅ UI mockups
- ✅ Plano de implementação detalhado

---

**Status:** 📋 **Documentado e Pronto para Implementação**
**Prioridade Sugerida:** ALTA (diferencial competitivo)
**Complexidade:** MÉDIA-ALTA
**Tempo Estimado:** 3-4 semanas
**ROI Esperado:** ALTO
