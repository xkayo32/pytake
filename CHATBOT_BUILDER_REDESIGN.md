# 🚀 Chatbot Builder - Redesign e Expansão

## 📋 Visão Geral

Redesign completo do chatbot builder para transformá-lo em uma ferramenta profissional de automação com integrações externas, IA, banco de dados e muito mais.

---

## 🎯 Categorias de Componentes

### 1. 🎬 **Controle de Fluxo** (Flow Control)
Componentes básicos para estruturar o fluxo de conversa.

#### **1.1 Start (Início)**
- **Descrição**: Ponto de entrada do fluxo
- **Configurações**:
  - Trigger type: `whatsapp_message`, `scheduled`, `webhook`, `manual`
  - Condições de entrada (horário, tags do contato, etc.)
- **Ícone**: Play
- **Cor**: Verde (#10b981)

#### **1.2 End (Fim)**
- **Descrição**: Finaliza o fluxo
- **Configurações**:
  - Tipo de finalização: `success`, `error`, `timeout`
  - Ações pós-finalização (adicionar tag, atualizar campo, etc.)
- **Ícone**: StopCircle
- **Cor**: Vermelho (#ef4444)

#### **1.3 Condition (Condição)**
- **Descrição**: Tomada de decisão baseada em condições
- **Configurações**:
  - Tipo de comparação: `equals`, `contains`, `regex`, `greater_than`, `less_than`, `in_list`, `not_empty`
  - Variável a comparar
  - Valor esperado
  - Múltiplas saídas (true/false ou casos múltiplos)
- **Ícone**: GitBranch
- **Cor**: Laranja (#f97316)

#### **1.4 Jump (Pular para outro fluxo)**
- **Descrição**: Navega para outro fluxo/subfluxo
- **Configurações**:
  - Fluxo de destino (dropdown)
  - Passar variáveis (opcional)
  - Retornar ao fluxo original (boolean)
- **Ícone**: ArrowRight
- **Cor**: Cinza (#6b7280)

#### **1.5 Wait (Esperar)**
- **Descrição**: Pausa o fluxo por um período
- **Configurações**:
  - Tipo de espera: `fixed_time`, `user_input`, `external_event`
  - Duração (segundos/minutos/horas)
  - Timeout (o que fazer se expirar)
- **Ícone**: Clock
- **Cor**: Azul claro (#60a5fa)

#### **1.6 Loop (Repetir)**
- **Descrição**: Repete um conjunto de ações
- **Configurações**:
  - Tipo: `fixed_count`, `while_condition`, `for_each_item`
  - Lista de itens (para for_each)
  - Condição de parada
  - Limite máximo de iterações
- **Ícone**: Repeat
- **Cor**: Roxo (#a855f7)

---

### 2. 💬 **Mensagens** (Messaging)
Componentes para enviar e receber mensagens.

#### **2.1 Message (Enviar Mensagem)**
- **Descrição**: Envia mensagem de texto, com suporte a variáveis
- **Configurações**:
  - Texto da mensagem (com editor rico)
  - Suporte a variáveis: `{{contact.name}}`, `{{custom_var}}`
  - Preview da mensagem
  - Delay antes de enviar (opcional)
- **Ícone**: MessageSquare
- **Cor**: Azul (#3b82f6)

#### **2.2 Question (Fazer Pergunta)**
- **Descrição**: Faz uma pergunta e captura a resposta
- **Configurações**:
  - Texto da pergunta
  - Tipo de resposta esperada: `text`, `number`, `email`, `phone`, `date`, `file`, `location`
  - Validação automática
  - Mensagem de erro (se validação falhar)
  - Nome da variável para armazenar resposta
  - Timeout (quanto tempo esperar)
  - Tentativas máximas
- **Ícone**: HelpCircle
- **Cor**: Roxo (#8b5cf6)

#### **2.3 Media (Enviar Mídia)**
- **Descrição**: Envia imagem, vídeo, áudio ou documento
- **Configurações**:
  - Tipo: `image`, `video`, `audio`, `document`
  - URL da mídia ou upload
  - Caption (legenda)
  - Suporte a variáveis na URL
- **Ícone**: Image
- **Cor**: Verde-água (#14b8a6)

#### **2.4 Interactive (Mensagem Interativa)**
- **Descrição**: Botões, listas, menus do WhatsApp
- **Configurações**:
  - Tipo: `buttons` (até 3), `list` (até 10 seções)
  - Texto do header/body/footer
  - Opções (label + ID)
  - Variável para armazenar seleção
- **Ícone**: LayoutList
- **Cor**: Azul (#0ea5e9)

#### **2.5 Template (Enviar Template)**
- **Descrição**: Envia template aprovado pela Meta
- **Configurações**:
  - Selecionar template (dropdown dos templates cadastrados)
  - Preencher variáveis do template
  - Preview do template
- **Ícone**: FileText
- **Cor**: Amarelo (#eab308)

---

### 3. 🤖 **Inteligência Artificial** (AI & LLM)
Componentes para integração com modelos de IA.

#### **3.1 LLM Agent (Agente de IA)**
- **Descrição**: Conversa inteligente com LLM (GPT, Claude, Gemini, etc.)
- **Framework**: **LangChain** (mais estável e maduro)
- **Configurações**:
  - **Provider** (dropdown):
    - OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5 Turbo)
    - Anthropic (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku)
    - Google (Gemini 1.5 Pro, Gemini 1.5 Flash)
    - Azure OpenAI
    - Groq (Llama 3, Mixtral)
    - Outros (campo customizado)
  - **Model** (dropdown dinâmico baseado no provider):
    - Lista pré-definida por provider
    - Opção "Custom Model" com campo de texto
  - **API Key**: Dropdown de variáveis secretas + opção de adicionar nova
  - **System Prompt**: Instruções para o agente
    - Editor de texto com suporte a variáveis
    - Templates pré-definidos (atendimento, vendas, suporte, etc.)
  - **Contexto**:
    - Incluir histórico de conversa (últimas N mensagens)
    - Incluir dados do contato
    - Variáveis customizadas
  - **Parâmetros do Modelo**:
    - Temperature (0-2)
    - Max tokens
    - Top P
    - Frequency penalty
    - Presence penalty
  - **Resposta**:
    - Variável para armazenar resposta
    - Modo: `single_shot` ou `conversational` (múltiplas trocas)
  - **Fallback**: O que fazer se API falhar
- **Ícone**: Brain
- **Cor**: Rosa (#ec4899)

#### **3.2 Sentiment Analysis (Análise de Sentimento)**
- **Descrição**: Analisa o sentimento da mensagem do usuário
- **Configurações**:
  - Provider: OpenAI, Hugging Face, Azure, etc.
  - Texto a analisar (variável)
  - Variável para resultado: `positive`, `negative`, `neutral`
  - Score de confiança (0-1)
- **Ícone**: Smile/Frown
- **Cor**: Amarelo (#fbbf24)

#### **3.3 Entity Extraction (Extração de Entidades)**
- **Descrição**: Extrai informações estruturadas do texto
- **Configurações**:
  - Entidades a extrair: `name`, `email`, `phone`, `date`, `location`, `product`, `custom`
  - Provider: OpenAI, spaCy, Azure, etc.
  - Texto a analisar
  - Variáveis para armazenar cada entidade
- **Ícone**: Tags
- **Cor**: Roxo (#a78bfa)

#### **3.4 Text Classification (Classificação)**
- **Descrição**: Classifica o texto em categorias
- **Configurações**:
  - Categorias possíveis (lista definida pelo usuário)
  - Provider/modelo
  - Texto a classificar
  - Variável para resultado
- **Ícone**: FolderTree
- **Cor**: Índigo (#818cf8)

---

### 4. 🗄️ **Dados e Integrações** (Data & Integrations)

#### **4.1 Database Query (Consulta ao Banco)**
- **Descrição**: Executa queries SQL em banco de dados
- **Configurações**:
  - **Conexão** (dropdown de conexões salvas):
    - Nome da conexão
    - Tipo: PostgreSQL, MySQL, MongoDB, SQLite
    - Credentials: Via variáveis secretas
  - **Query**:
    - Editor SQL com syntax highlighting
    - Suporte a variáveis: `SELECT * FROM users WHERE phone = '{{contact.phone}}'`
    - Modo: `SELECT` (leitura) ou `INSERT/UPDATE/DELETE` (escrita)
  - **Resultado**:
    - Variável para armazenar resultado
    - Formato: `first_row`, `all_rows`, `count`, `raw`
    - Mapeamento de colunas para variáveis
  - **Segurança**:
    - Apenas queries permitidas (whitelist de comandos)
    - Timeout máximo
    - Limite de rows
- **Ícone**: Database
- **Cor**: Verde escuro (#059669)

#### **4.2 API Call (Chamada HTTP)**
- **Descrição**: Faz requisição HTTP para API externa
- **Configurações**:
  - **Método**: GET, POST, PUT, PATCH, DELETE
  - **URL**: Com suporte a variáveis
  - **Headers**: Lista de key-value (suporte a variáveis secretas para auth)
  - **Body** (para POST/PUT/PATCH):
    - JSON editor
    - Form data
    - Raw text
  - **Auth**:
    - None
    - Basic Auth
    - Bearer Token
    - API Key
    - OAuth 2.0
  - **Resposta**:
    - Variável para armazenar resposta completa
    - Mapeamento de campos (JSONPath)
    - Status code handling (success/error)
  - **Retry**: Configuração de tentativas
  - **Timeout**: Tempo máximo de espera
- **Ícone**: Globe
- **Cor**: Índigo (#6366f1)

#### **4.3 Webhook (Receber Webhook)**
- **Descrição**: Espera por webhook externo
- **Configurações**:
  - URL do webhook (gerada automaticamente)
  - Método esperado: GET, POST
  - Validação de assinatura (opcional)
  - Timeout
  - Variável para armazenar payload
- **Ícone**: Webhook
- **Cor**: Azul escuro (#1e40af)

#### **4.4 CRM Integration (Integração com CRM)**
- **Descrição**: Integração nativa com CRMs populares
- **Configurações**:
  - **Provider** (dropdown):
    - Salesforce
    - HubSpot
    - Pipedrive
    - RD Station
    - Zoho CRM
    - Custom (via API)
  - **Ação**:
    - Criar lead/contato
    - Atualizar contato
    - Criar oportunidade
    - Adicionar nota
  - **Credentials**: Via variáveis secretas
  - **Mapeamento de campos**: Contato → CRM
- **Ícone**: UserPlus
- **Cor**: Verde (#22c55e)

---

### 5. ⚙️ **Ações e Automação** (Actions & Automation)

#### **5.1 Set Variable (Definir Variável)**
- **Descrição**: Cria ou atualiza variável
- **Configurações**:
  - Nome da variável
  - Valor (fixo ou expressão)
  - Tipo: `string`, `number`, `boolean`, `json`, `array`
  - Operação: `set`, `append`, `increment`, `decrement`
- **Ícone**: Variable
- **Cor**: Cinza (#71717a)

#### **5.2 Update Contact (Atualizar Contato)**
- **Descrição**: Atualiza dados do contato no CRM interno
- **Configurações**:
  - Campos a atualizar (nome, email, telefone, tags, custom fields)
  - Valores (fixos ou variáveis)
- **Ícone**: UserCog
- **Cor**: Azul (#3b82f6)

#### **5.3 Add Tag (Adicionar Tag)**
- **Descrição**: Adiciona tag ao contato
- **Configurações**:
  - Tags a adicionar (seleção múltipla ou variável)
  - Modo: `add` ou `replace`
- **Ícone**: Tag
- **Cor**: Verde-limão (#84cc16)

#### **5.4 Send Email (Enviar Email)**
- **Descrição**: Envia email via SMTP/API
- **Configurações**:
  - Provider: SMTP, SendGrid, Mailgun, AWS SES
  - De/Para/Assunto/Corpo
  - Suporte a variáveis e templates
- **Ícone**: Mail
- **Cor**: Vermelho (#ef4444)

#### **5.5 Schedule Task (Agendar Tarefa)**
- **Descrição**: Agenda uma ação futura
- **Configurações**:
  - Data/hora (fixa ou relativa)
  - Ação a executar (enviar mensagem, chamar API, etc.)
  - Timezone
- **Ícone**: Calendar
- **Cor**: Roxo (#9333ea)

#### **5.6 Run JavaScript (Executar Código)**
- **Descrição**: Executa código JavaScript customizado (sandbox)
- **Configurações**:
  - Editor de código com syntax highlighting
  - Variáveis de entrada (disponíveis como `input`)
  - Variável de saída (retorno da função)
  - Timeout máximo
  - Bibliotecas disponíveis: lodash, moment, etc.
- **Ícone**: Code
- **Cor**: Amarelo (#f59e0b)

---

### 6. 👥 **Atendimento Humano** (Human Handoff)

#### **6.1 Handoff to Human (Transferir para Humano)**
- **Descrição**: Transfere conversa para atendente
- **Configurações**:
  - Departamento (dropdown)
  - Fila específica (opcional)
  - Prioridade: `low`, `medium`, `high`, `urgent`
  - Mensagem para o usuário
  - Mensagem para o atendente (resumo do contexto)
  - Tags a adicionar
- **Ícone**: Users
- **Cor**: Verde-água (#14b8a6)

#### **6.2 Check Agent Availability (Verificar Disponibilidade)**
- **Descrição**: Verifica se há atendentes disponíveis
- **Configurações**:
  - Departamento
  - Horário de atendimento
  - Saídas: `available` / `unavailable`
- **Ícone**: UserCheck
- **Cor**: Verde (#22c55e)

---

### 7. 📊 **Analytics e Tracking** (Analytics & Tracking)

#### **7.1 Track Event (Rastrear Evento)**
- **Descrição**: Registra evento para analytics
- **Configurações**:
  - Nome do evento
  - Propriedades (key-value)
  - Provider: Google Analytics, Mixpanel, Segment, etc.
- **Ícone**: Activity
- **Cor**: Azul (#3b82f6)

#### **7.2 Log to MongoDB (Registrar Log)**
- **Descrição**: Salva log estruturado no MongoDB
- **Configurações**:
  - Coleção
  - Documento (JSON)
  - TTL (tempo de vida)
- **Ícone**: FileText
- **Cor**: Verde (#10b981)

---

## 🔐 Sistema de Variáveis e Secrets

### Variáveis Built-in

```javascript
// Contato
{{contact.id}}
{{contact.name}}
{{contact.phone}}
{{contact.email}}
{{contact.tags}}
{{contact.custom_fields.any_field}}

// Conversa
{{conversation.id}}
{{conversation.created_at}}
{{conversation.last_message}}
{{conversation.status}}

// WhatsApp
{{whatsapp.number}}
{{whatsapp.business_name}}

// Sistema
{{system.date}}
{{system.time}}
{{system.datetime}}
{{system.random_number}}
{{system.random_uuid}}

// Variáveis customizadas
{{my_variable}}
{{api_response.data.name}}
```

### Secrets (Variáveis Protegidas)

Armazenadas de forma criptografada no banco. Interface:

1. **Criar Secret**:
   - Nome (ex: `openai_api_key`, `db_password`)
   - Valor (campo tipo password)
   - Escopo: `organization` (todas os bots) ou `chatbot` (apenas este bot)

2. **Usar Secret**:
   - Nos componentes, aparece um dropdown de secrets
   - Valor nunca é mostrado no frontend
   - Backend descriptografa ao executar

3. **Gerenciar Secrets**:
   - Página dedicada em Configurações
   - Listar, editar, deletar
   - Audit log de uso

---

## 🎨 Interface do Builder

### Painel Esquerdo (Componentes)

**Categorias colapsáveis:**
```
📂 Controle de Fluxo
  ├─ Início
  ├─ Fim
  ├─ Condição
  ├─ Pular
  ├─ Esperar
  └─ Repetir

📂 Mensagens
  ├─ Mensagem
  ├─ Pergunta
  ├─ Mídia
  ├─ Interativo
  └─ Template

📂 Inteligência Artificial
  ├─ Agente LLM
  ├─ Análise Sentimento
  ├─ Extração Entidades
  └─ Classificação

📂 Dados e Integrações
  ├─ Consulta BD
  ├─ Chamada API
  ├─ Webhook
  └─ Integração CRM

📂 Ações e Automação
  ├─ Definir Variável
  ├─ Atualizar Contato
  ├─ Adicionar Tag
  ├─ Enviar Email
  ├─ Agendar Tarefa
  └─ Executar Código

📂 Atendimento Humano
  ├─ Transferir
  └─ Verificar Disponibilidade

📂 Analytics
  ├─ Rastrear Evento
  └─ Registrar Log
```

### Painel Direito (Propriedades)

Formulário dinâmico baseado no tipo de nó:
- Campos específicos para cada componente
- Validação em tempo real
- Preview quando aplicável
- Ajuda contextual (tooltips)
- Exemplos de uso

### Melhorias no Canvas

1. **Validação Visual**: Nós com erro aparecem em vermelho
2. **Zoom e Pan**: Controles aprimorados
3. **Undo/Redo**: Histórico de ações
4. **Copy/Paste**: Duplicar nós e subfluxos
5. **Search**: Buscar nós no canvas
6. **Comments**: Adicionar notas aos nós
7. **Grupos**: Agrupar nós relacionados

---

## 🔧 Framework LLM Recomendado: **LangChain**

### Por que LangChain?

1. ✅ **Maturidade**: Projeto estável com ampla adoção
2. ✅ **Multi-provider**: Suporte nativo para OpenAI, Anthropic, Google, Groq, Azure, etc.
3. ✅ **Chains**: Composição de múltiplas chamadas LLM
4. ✅ **Memory**: Gerenciamento de contexto/histórico
5. ✅ **Agents**: Agentes autônomos com tools
6. ✅ **Document Loaders**: Integração com PDFs, CSVs, etc.
7. ✅ **Vector Stores**: Suporte a embeddings e busca semântica
8. ✅ **Python/JavaScript**: Bibliotecas em ambas linguagens

### Alternativas Consideradas

- **LlamaIndex**: Focado em indexação/busca, menos adequado
- **Haystack**: Mais focado em NLP/search pipelines
- **Semantic Kernel**: Muito novo, menos maduro

### Estrutura Backend (Python)

```python
# backend/app/integrations/llm/langchain_agent.py
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain

class LLMAgentExecutor:
    def __init__(self, config):
        self.provider = config['provider']
        self.model = config['model']
        self.api_key = self.decrypt_secret(config['api_key_secret'])
        self.llm = self._init_llm()

    def _init_llm(self):
        if self.provider == 'openai':
            return ChatOpenAI(
                model=self.model,
                api_key=self.api_key,
                temperature=self.config.get('temperature', 0.7)
            )
        elif self.provider == 'anthropic':
            return ChatAnthropic(
                model=self.model,
                api_key=self.api_key
            )
        # ... outros providers

    async def execute(self, user_input, context):
        chain = ConversationChain(
            llm=self.llm,
            memory=ConversationBufferMemory(),
            system_message=context['system_prompt']
        )
        response = await chain.ainvoke(user_input)
        return response
```

---

## 📦 Estrutura de Dados dos Nós

```typescript
// frontend/src/types/builder.ts

export interface NodeConfig {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface NodeData {
  label: string;
  nodeType: string;
  config: NodeSpecificConfig;
  variables?: Record<string, any>; // Variáveis de saída
}

// Exemplo: LLM Agent Node
export interface LLMAgentConfig extends NodeSpecificConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'azure' | 'custom';
  model: string; // Ex: "gpt-4-turbo", "claude-3-5-sonnet-20241022"
  apiKeySecret: string; // ID da secret
  systemPrompt: string;
  includeHistory: boolean;
  historyLength: number;
  temperature: number;
  maxTokens: number;
  outputVariable: string;
  fallbackMessage?: string;
}

// Exemplo: Database Query Node
export interface DatabaseQueryConfig extends NodeSpecificConfig {
  connectionId: string; // ID da conexão salva
  query: string; // SQL query
  parameters: Record<string, string>; // Parâmetros com variáveis
  outputVariable: string;
  outputFormat: 'first_row' | 'all_rows' | 'count';
  timeout: number;
}
```

---

## 🚀 Próximos Passos

### Fase 1: Estrutura Base (1-2 semanas)
1. ✅ Reorganizar categorias no builder
2. ✅ Implementar sistema de secrets (CRUD)
3. ✅ Atualizar painel de componentes com categorias
4. ✅ Criar tipos TypeScript para todos os nós

### Fase 2: Componentes Básicos (2-3 semanas)
1. ✅ Implementar propriedades editáveis para cada nó
2. ✅ Validação de configuração
3. ✅ Sistema de variáveis no backend
4. ✅ Execução de fluxos melhorada

### Fase 3: Integrações LLM (2 semanas)
1. ✅ Setup LangChain no backend
2. ✅ Componente LLM Agent completo
3. ✅ Gerenciamento de API keys
4. ✅ Testes com múltiplos providers

### Fase 4: Banco de Dados (1 semana)
1. ✅ Gerenciamento de conexões de BD
2. ✅ Componente Database Query
3. ✅ Validação e segurança de queries

### Fase 5: Outros Componentes (3-4 semanas)
1. ✅ Componentes de mensagem avançados
2. ✅ Integrações CRM
3. ✅ Webhooks e APIs
4. ✅ Analytics

### Fase 6: UI/UX (1-2 semanas)
1. ✅ Melhorar painel de propriedades
2. ✅ Preview de componentes
3. ✅ Validação visual
4. ✅ Undo/redo

---

## 💡 Exemplos de Uso

### Exemplo 1: Atendimento com IA + Fallback Humano

```
[Início]
  → [Mensagem: "Olá! Sou o assistente virtual"]
  → [LLM Agent: Conversa com GPT-4]
  → [Análise Sentimento: Detectar frustração]
  → [Condição: Se sentimento negativo]
      → [Transferir para Humano]
  → [Fim]
```

### Exemplo 2: Qualificação de Lead + CRM

```
[Início]
  → [Pergunta: "Qual seu email?"]
  → [Atualizar Contato: Salvar email]
  → [Pergunta: "Qual seu interesse?"]
  → [Consulta BD: Verificar se já é cliente]
  → [Condição: Se novo]
      → [CRM Integration: Criar lead no Salesforce]
  → [Mensagem: "Obrigado! Em breve entramos em contato"]
  → [Fim]
```

### Exemplo 3: Consulta Personalizada com BD

```
[Início]
  → [Pergunta: "Qual seu CPF?"]
  → [Database Query: SELECT * FROM pedidos WHERE cpf = {{answer}}]
  → [Condição: Se pedidos.length > 0]
      → [Mensagem: "Você tem {{pedidos.length}} pedidos ativos"]
      → [Loop: Para cada pedido]
          → [Mensagem: "Pedido #{{pedido.numero}} - {{pedido.status}}"]
  → [Fim]
```

---

## 📊 Roadmap Completo

- **Q1 2025**: Fase 1-3 (Base + LLM)
- **Q2 2025**: Fase 4-5 (BD + Integrações)
- **Q3 2025**: Fase 6 + Otimizações
- **Q4 2025**: Features avançadas (agents autônomos, vector stores, multi-LLM, etc.)

---

**Status**: 📝 Proposta - Aguardando aprovação e início da implementação

**Última atualização**: 2025-01-12
