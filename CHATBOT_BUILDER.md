# Chatbot Builder - Documentação Técnica

**Última atualização**: 2025-10-12
**Status**: 90% Implementado
**Versão**: 1.0.0

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Tipos de Nodes](#tipos-de-nodes)
4. [Configuração de Nodes](#configuração-de-nodes)
5. [Flow Management](#flow-management)
6. [Validação e Testes](#validação-e-testes)
7. [Execução do Chatbot](#execução-do-chatbot)

---

## 🎯 Visão Geral

O **Chatbot Builder** é um editor visual drag-and-drop que permite criar fluxos conversacionais para WhatsApp sem programação.

### Features Implementadas ✅

- ✅ Editor fullscreen com React Flow
- ✅ 10 tipos de nodes distintos
- ✅ Drag & drop de nodes
- ✅ Sistema de conexões (edges)
- ✅ Save/load de canvas state
- ✅ Keyboard shortcuts (Ctrl+S, Del, Ctrl+B, Ctrl+P)
- ✅ Mini-toolbar flutuante
- ✅ Dark mode completo

### Features Planejadas ⏱️

- ⏱️ Configuração avançada de nodes
- ⏱️ Seleção de número WhatsApp
- ⏱️ Validação de fluxo
- ⏱️ Preview de chatbot
- ⏱️ Execução de chatbot
- ⏱️ Analytics de chatbot

---

## 🏗️ Arquitetura

### Stack Técnico

**Frontend**:
- React 19 + Next.js 15
- React Flow (@xyflow/react)
- TypeScript
- Tailwind CSS

**Backend**:
- FastAPI
- PostgreSQL (flows, nodes, chatbots)
- SQLAlchemy async

### Estrutura de Dados

```typescript
// Chatbot
interface Chatbot {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_published: boolean;
  whatsapp_number_id?: string; // 🎯 Link para número WhatsApp
  global_variables: Record<string, any>;
  settings: {
    welcome_message?: string;
    fallback_message?: string;
    handoff_message?: string;
  };
}

// Flow
interface Flow {
  id: string;
  chatbot_id: string;
  name: string;
  description?: string;
  is_main: boolean;           // Fluxo principal
  is_fallback: boolean;        // Fluxo de fallback
  canvas_data: {
    nodes: ReactFlowNode[];
    edges: ReactFlowEdge[];
    viewport?: { x: number; y: number; zoom: number };
  };
  variables: Record<string, any>;
  is_active: boolean;
}

// Node (Database)
interface Node {
  id: string;
  flow_id: string;
  node_id: string;            // ID do React Flow node
  node_type: NodeType;
  label?: string;
  position_x: number;
  position_y: number;
  data: NodeConfiguration;    // 🎯 Configuração específica
  order?: number;
}
```

---

## 🧩 Tipos de Nodes

### 1. **Start Node** (Verde) 🟢
**Propósito**: Ponto de entrada do fluxo conversacional

**Configuração**:
```typescript
{
  type: 'start',
  config: {
    trigger: 'keyword' | 'any_message' | 'welcome',
    keywords?: string[];        // Se trigger = 'keyword'
    case_sensitive?: boolean;   // Para keywords
  }
}
```

**Comportamento**:
- Deve haver apenas 1 start node por fluxo
- Executa quando:
  - Usuário inicia conversa (welcome)
  - Usuário envia qualquer mensagem (any_message)
  - Usuário envia keyword específica (keyword)

**Validações**:
- ❌ Não pode ter nós de entrada
- ✅ Deve ter pelo menos 1 saída

---

### 2. **Message Node** (Azul) 🔵
**Propósito**: Enviar uma mensagem para o usuário

**Configuração**:
```typescript
{
  type: 'message',
  config: {
    message_type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'template',

    // Para type = 'text'
    text?: string;              // Suporta variáveis {{nome}}

    // Para type = 'image' | 'video' | 'document' | 'audio'
    media_url?: string;
    caption?: string;

    // Para type = 'template'
    template_name?: string;
    template_language?: string;
    template_variables?: Record<string, string>;

    // Delay opcional antes de enviar
    delay_seconds?: number;
  }
}
```

**Variáveis Disponíveis**:
- `{{contact.name}}` - Nome do contato
- `{{contact.phone}}` - Telefone
- `{{user.name}}` - Nome do agente atribuído
- `{{flow.variavel}}` - Variável salva no fluxo
- `{{global.variavel}}` - Variável global do chatbot

**Validações**:
- ✅ Deve ter texto OU media_url OU template_name
- ✅ Template deve existir e estar aprovado
- ✅ Variáveis devem existir

---

### 3. **Question Node** (Roxo) 🟣
**Propósito**: Capturar resposta do usuário e salvar em variável

**Configuração**:
```typescript
{
  type: 'question',
  config: {
    question_text: string;      // Pergunta a fazer
    variable_name: string;      // Nome da variável para salvar

    // Validação da resposta
    validation?: {
      type: 'text' | 'number' | 'email' | 'phone' | 'cpf' | 'date' | 'regex',
      regex_pattern?: string;   // Se type = 'regex'
      min_length?: number;
      max_length?: number;
      min_value?: number;       // Se type = 'number'
      max_value?: number;
    };

    // Mensagem se validação falhar
    error_message?: string;

    // Máximo de tentativas antes de desistir
    max_retries?: number;       // Default: 3

    // Timeout aguardando resposta (segundos)
    timeout_seconds?: number;   // Default: 300 (5 min)
  }
}
```

**Comportamento**:
- Envia `question_text` como mensagem
- Aguarda resposta do usuário
- Valida resposta segundo regras
- Se inválida: envia `error_message` e pergunta novamente
- Se válida: salva em `flow.variables[variable_name]`
- Continua para próximo node

**Validações**:
- ✅ `variable_name` deve ser único no fluxo
- ✅ Deve ter exatamente 1 saída

---

### 4. **Condition Node** (Laranja) 🟠
**Propósito**: Decisão condicional (if/else)

**Configuração**:
```typescript
{
  type: 'condition',
  config: {
    conditions: [
      {
        id: string;
        label: string;          // Ex: "Cliente VIP"
        operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith' | 'regex',
        left_operand: string;   // Variável ou valor
        right_operand: string;  // Valor para comparar
        logic?: 'AND' | 'OR';   // Para múltiplas condições
      }
    ],
    default_branch: boolean;    // Se nenhuma condição atender
  }
}
```

**Exemplos**:
```typescript
// Cliente VIP
{
  operator: '==',
  left_operand: '{{flow.tipo_cliente}}',
  right_operand: 'vip'
}

// Idade maior que 18
{
  operator: '>',
  left_operand: '{{flow.idade}}',
  right_operand: '18'
}

// Email contém @empresa.com
{
  operator: 'contains',
  left_operand: '{{flow.email}}',
  right_operand: '@empresa.com'
}
```

**Comportamento**:
- Avalia condições em ordem
- Primeira condição TRUE → segue edge correspondente
- Nenhuma TRUE → segue edge de default

**Validações**:
- ✅ Deve ter pelo menos 2 saídas (true + false/default)
- ✅ Cada condição deve ter edge correspondente
- ✅ Variáveis devem existir

---

### 5. **Action Node** (Amarelo) 🟡
**Propósito**: Executar ação interna

**Configuração**:
```typescript
{
  type: 'action',
  config: {
    action_type: 'set_variable' | 'clear_variable' | 'add_tag' | 'remove_tag' | 'assign_agent' | 'assign_department' | 'send_email' | 'webhook',

    // Para set_variable
    variable_name?: string;
    variable_value?: string | number | boolean;

    // Para add_tag / remove_tag
    tag_name?: string;

    // Para assign_agent
    agent_id?: string;

    // Para assign_department
    department_id?: string;

    // Para send_email
    email_to?: string;
    email_subject?: string;
    email_body?: string;

    // Para webhook
    webhook_url?: string;
    webhook_method?: 'GET' | 'POST' | 'PUT';
    webhook_headers?: Record<string, string>;
    webhook_body?: Record<string, any>;
  }
}
```

**Ações Disponíveis**:
1. **set_variable**: Definir/atualizar variável
2. **clear_variable**: Limpar variável
3. **add_tag**: Adicionar tag ao contato
4. **remove_tag**: Remover tag
5. **assign_agent**: Atribuir conversa a agente
6. **assign_department**: Atribuir a departamento
7. **send_email**: Enviar email (notificação)
8. **webhook**: Chamar webhook externo

**Validações**:
- ✅ Campos obrigatórios por action_type
- ✅ Deve ter exatamente 1 saída

---

### 6. **API Call Node** (Índigo) 🔵
**Propósito**: Chamar API externa e processar resposta

**Configuração**:
```typescript
{
  type: 'api_call',
  config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: Record<string, any> | string;

    // Timeout da requisição (ms)
    timeout_ms?: number;        // Default: 10000

    // Salvar resposta em variável
    save_response_to?: string;  // Nome da variável

    // Extrair campos específicos da resposta
    extract_fields?: {
      [variable_name: string]: string; // JSONPath ou dot notation
    };

    // Tratamento de erro
    on_error: 'continue' | 'retry' | 'stop';
    retry_attempts?: number;    // Se on_error = 'retry'
    retry_delay_ms?: number;
  }
}
```

**Exemplos**:
```typescript
// Buscar CEP
{
  url: 'https://viacep.com.br/ws/{{flow.cep}}/json/',
  method: 'GET',
  extract_fields: {
    'endereco': 'logradouro',
    'bairro': 'bairro',
    'cidade': 'localidade'
  }
}

// Criar lead no CRM
{
  url: 'https://api.crm.com/leads',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer {{global.crm_token}}'
  },
  body: {
    name: '{{contact.name}}',
    phone: '{{contact.phone}}',
    email: '{{flow.email}}'
  },
  save_response_to: 'lead_id'
}
```

**Validações**:
- ✅ URL deve ser válida
- ✅ Headers/Body devem ser JSON válidos
- ✅ Variáveis devem existir

---

### 7. **AI Prompt Node** (Rosa) 🩷
**Propósito**: Processar com IA (GPT-4) para respostas inteligentes

**Configuração**:
```typescript
{
  type: 'ai_prompt',
  config: {
    provider: 'openai' | 'anthropic';
    model: string;              // Ex: 'gpt-4', 'claude-3-sonnet'

    // System prompt (contexto)
    system_prompt?: string;

    // User prompt (dinâmico)
    user_prompt: string;        // Suporta variáveis

    // Temperatura (criatividade)
    temperature?: number;       // 0.0 a 1.0, default: 0.7

    // Máximo de tokens
    max_tokens?: number;        // Default: 1000

    // Salvar resposta em variável
    save_response_to: string;

    // Fallback se API falhar
    fallback_message?: string;
  }
}
```

**Exemplos**:
```typescript
// Suporte técnico
{
  provider: 'openai',
  model: 'gpt-4',
  system_prompt: 'Você é um assistente de suporte técnico amigável e paciente.',
  user_prompt: 'Cliente perguntou: {{flow.mensagem_usuario}}',
  save_response_to: 'resposta_ia',
  temperature: 0.5
}

// Resumir conversa
{
  provider: 'anthropic',
  model: 'claude-3-sonnet',
  system_prompt: 'Resuma a conversa em 2-3 sentenças.',
  user_prompt: 'Conversa: {{conversation.history}}',
  save_response_to: 'resumo'
}
```

**Validações**:
- ✅ API key configurada no backend
- ✅ Modelo disponível
- ✅ Variável de destino única

---

### 8. **Jump Node** (Cinza) ⚪
**Propósito**: Pular para outro fluxo

**Configuração**:
```typescript
{
  type: 'jump',
  config: {
    target_flow_id: string;     // ID do fluxo destino
    pass_variables?: boolean;   // Passar variáveis atuais
  }
}
```

**Comportamento**:
- Interrompe fluxo atual
- Inicia fluxo de destino
- Se `pass_variables = true`: variáveis são copiadas

**Uso**:
- Modularizar fluxos complexos
- Reutilizar sub-fluxos
- Organizar melhor a lógica

**Validações**:
- ✅ `target_flow_id` deve existir
- ✅ Não pode criar loops infinitos
- ❌ Não pode ter saídas (termina fluxo atual)

---

### 9. **End Node** (Vermelho) 🔴
**Propósito**: Finalizar fluxo conversacional

**Configuração**:
```typescript
{
  type: 'end',
  config: {
    end_type: 'success' | 'cancelled' | 'timeout' | 'error',

    // Mensagem final opcional
    final_message?: string;

    // Ação pós-término
    post_action?: {
      type: 'close_conversation' | 'assign_agent' | 'add_tag' | 'send_notification',
      // Configuração da ação
    };
  }
}
```

**Tipos de Término**:
1. **success**: Fluxo completo com sucesso
2. **cancelled**: Usuário cancelou
3. **timeout**: Timeout aguardando resposta
4. **error**: Erro não tratado

**Validações**:
- ❌ Não pode ter saídas
- ✅ Deve ser alcançável

---

### 10. **Handoff Node** (Teal) 🩵
**Propósito**: Transferir conversa para atendimento humano

**Configuração**:
```typescript
{
  type: 'handoff',
  config: {
    // Mensagem antes de transferir
    handoff_message?: string;   // Default: do chatbot.settings

    // Para onde transferir
    assign_to?: {
      type: 'agent' | 'department' | 'queue';
      agent_id?: string;
      department_id?: string;
      queue_id?: string;
    };

    // Prioridade da conversa
    priority?: 'low' | 'normal' | 'high' | 'urgent';

    // Contexto para o agente
    context_summary?: string;   // Resumo da conversa

    // Continuar chatbot se nenhum agente disponível?
    fallback_to_bot?: boolean;
    fallback_timeout_seconds?: number;
  }
}
```

**Comportamento**:
- Envia `handoff_message`
- Muda status da conversa para `active`
- Atribui conforme `assign_to`
- Se `fallback_to_bot = true` e nenhum agente disponível:
  - Aguarda `fallback_timeout_seconds`
  - Se ninguém pegar, volta para chatbot

**Validações**:
- ✅ Agent/Department/Queue deve existir
- ❌ Não pode ter saídas (termina fluxo)

---

## ⚙️ Configuração de Nodes

### Painel de Propriedades

Ao selecionar um node no builder, o painel direito deve exibir:

```typescript
interface NodePropertiesPanel {
  // Informações básicas
  id: string;
  type: NodeType;
  label?: string;

  // Configuração específica do tipo
  config: NodeConfiguration;

  // Ações
  actions: [
    'Duplicar Node',
    'Deletar Node',
    'Testar Node'  // Preview
  ];
}
```

### Validação de Configuração

Cada node deve validar:
- ✅ Campos obrigatórios preenchidos
- ✅ Formatos válidos (URLs, emails, regex, etc)
- ✅ Variáveis referenciadas existem
- ✅ IDs de recursos (agents, departments, flows) existem
- ✅ Lógica de conexões válida

---

## 🔀 Flow Management

### Criar Novo Fluxo

**Pré-requisitos**:
- Chatbot criado
- Número WhatsApp ativo selecionado

**Modal de Criação**:
```typescript
interface CreateFlowModal {
  chatbot_id: string;
  whatsapp_number_id: string;  // 🎯 Obrigatório
  name: string;
  description?: string;
  is_main: boolean;            // Apenas 1 por chatbot
  is_fallback: boolean;        // Quando nenhum outro fluxo matched
}
```

**Fluxo de Criação**:
1. Admin clica em "Criar Chatbot"
2. Preenche nome, descrição
3. **Seleciona número WhatsApp ativo** ⬅️ CRUCIAL
4. Clica em "Criar e Editar Fluxos"
5. Abre builder com fluxo principal vazio

### Trocar entre Fluxos

No toolbar do builder:
```typescript
<FlowSelector
  currentFlow={selectedFlow}
  flows={flows}
  onChange={(flow) => loadFlowCanvas(flow)}
/>
```

### Validação de Fluxo

Antes de ativar chatbot, validar:
- ✅ Tem pelo menos 1 Start node
- ✅ Todos nodes têm configuração válida
- ✅ Não há nodes órfãos (sem conexões)
- ✅ Não há loops infinitos
- ✅ Cada Condition tem todas saídas conectadas
- ✅ Variáveis usadas estão definidas

---

## 🧪 Validação e Testes

### Validação em Tempo Real

Durante edição:
- ⚠️ Warnings para configurações incompletas
- ❌ Erros para configurações inválidas
- 💡 Sugestões de melhorias

### Preview de Chatbot

Simular conversa com chatbot:
```typescript
interface ChatbotSimulator {
  // Estado da simulação
  current_node: Node;
  variables: Record<string, any>;
  messages: SimulatedMessage[];

  // Ações
  sendMessage(text: string): void;
  reset(): void;
}
```

### Logs de Execução

Registrar cada execução:
```typescript
interface ChatbotExecutionLog {
  id: string;
  chatbot_id: string;
  conversation_id: string;
  flow_id: string;

  // Timeline de execução
  steps: {
    node_id: string;
    node_type: NodeType;
    timestamp: Date;
    input: any;
    output: any;
    duration_ms: number;
    success: boolean;
    error?: string;
  }[];

  // Resultado final
  status: 'completed' | 'failed' | 'timeout' | 'handoff';
  total_duration_ms: number;
}
```

---

## 🚀 Execução do Chatbot

### Trigger de Execução

Chatbot executa quando:
1. **Webhook recebe mensagem** do WhatsApp
2. **Conversa não tem agente atribuído**
3. **Chatbot está ativo** (`is_active = true`)
4. **Número WhatsApp tem chatbot vinculado**

### Engine de Execução

```python
# backend/app/services/chatbot_engine.py

class ChatbotEngine:
    async def execute_flow(
        self,
        flow_id: str,
        conversation_id: str,
        user_message: str
    ) -> ExecutionResult:
        """
        Executa um fluxo de chatbot para uma conversa
        """

        # 1. Carregar fluxo e nodes
        flow = await self.get_flow(flow_id)
        nodes = await self.get_flow_nodes(flow_id)
        edges = flow.canvas_data['edges']

        # 2. Inicializar estado
        state = ExecutionState(
            flow_id=flow_id,
            conversation_id=conversation_id,
            variables=flow.variables.copy(),
            current_node=self.find_start_node(nodes)
        )

        # 3. Executar nodes sequencialmente
        while state.current_node:
            result = await self.execute_node(
                state.current_node,
                state,
                user_message
            )

            if result.is_terminal:
                break

            # Ir para próximo node
            state.current_node = self.get_next_node(
                state.current_node,
                edges,
                result.output
            )

        return ExecutionResult(
            success=True,
            final_state=state
        )

    async def execute_node(
        self,
        node: Node,
        state: ExecutionState,
        user_input: str
    ) -> NodeExecutionResult:
        """
        Executa um node específico
        """
        handler = self.get_node_handler(node.node_type)
        return await handler.execute(node, state, user_input)
```

### Handlers por Tipo

Cada tipo de node tem seu handler:

```python
# backend/app/services/chatbot_handlers/message_handler.py

class MessageNodeHandler(NodeHandler):
    async def execute(self, node, state, user_input):
        config = node.data['config']

        # Substituir variáveis
        text = self.replace_variables(
            config['text'],
            state.variables
        )

        # Enviar mensagem via WhatsApp
        await whatsapp_service.send_message(
            conversation_id=state.conversation_id,
            text=text
        )

        return NodeExecutionResult(
            success=True,
            is_terminal=False,
            output=None
        )
```

---

## 📊 Analytics

### Métricas por Chatbot

- Total de execuções
- Taxa de conclusão (chegou ao End node)
- Taxa de handoff (transferiu para humano)
- Tempo médio de execução
- Taxa de erro
- Nodes mais usados
- Branches mais seguidos (Condition nodes)

### Otimizações

Identificar gargalos:
- Nodes com alta taxa de erro
- Timeout frequente em Question nodes
- API calls lentas
- Fluxos com muitos handoffs (precisa melhorar)

---

## 🎯 Próximos Passos

### Fase 1: Configuração Avançada (Esta Sprint)
- [ ] Implementar painel de configuração por tipo de node
- [ ] Seleção de número WhatsApp ao criar chatbot
- [ ] Modal de criar novo fluxo
- [ ] Validação em tempo real

### Fase 2: Execução (Próxima Sprint)
- [ ] Engine de execução backend
- [ ] Handlers para cada tipo de node
- [ ] Logs de execução
- [ ] Tratamento de erros

### Fase 3: Testes & Preview (Sprint Seguinte)
- [ ] Simulador de chatbot
- [ ] Preview de nodes
- [ ] Testes automatizados
- [ ] Validação de fluxo

### Fase 4: Analytics (Futuro)
- [ ] Dashboard de métricas
- [ ] Relatórios de execução
- [ ] Otimizações sugeridas
- [ ] A/B testing de fluxos

---

**Última atualização**: 2025-10-12
**Autor**: Claude Code
