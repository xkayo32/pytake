# 🎯 Especificação de Funcionalidades - PyTake

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Módulos do Sistema](#módulos-do-sistema)
- [Funcionalidades Detalhadas](#funcionalidades-detalhadas)
- [User Stories](#user-stories)
- [Fluxos de Usuário](#fluxos-de-usuário)
- [Regras de Negócio](#regras-de-negócio)
- [Integrações](#integrações)

---

## 🎯 Visão Geral

O PyTake é uma plataforma completa de automação e atendimento via WhatsApp que combina:
- 🤖 **Chatbot Builder**: Criação visual de fluxos conversacionais
- 💬 **Live Chat**: Atendimento humano em tempo real
- 📊 **CRM**: Gerenciamento completo de contatos
- 📢 **Campanhas**: Envio em massa e segmentado
- 📈 **Analytics**: Relatórios e dashboards detalhados
- 🔌 **Integrações**: APIs e webhooks para conectar sistemas

---

## 🧩 Módulos do Sistema

### 1. 🔐 **Autenticação e Gestão de Usuários**
### 2. 🤖 **Chatbot Builder**
### 3. 💬 **Inbox (Atendimento Humano)**
### 4. 👥 **CRM e Gerenciamento de Contatos**
### 5. 📢 **Campanhas de Mensagens**
### 6. 📊 **Analytics e Relatórios**
### 7. 🔌 **Integrações e API**
### 8. ⚙️ **Configurações e Administração**

---

## 🔐 1. Autenticação e Gestão de Usuários

### Funcionalidades

#### 1.1 Registro de Organização
- **Descrição**: Processo de cadastro de nova organização
- **Campos obrigatórios**:
  - Nome da empresa
  - Email do administrador
  - Senha forte (8+ caracteres, maiúscula, número, símbolo)
  - Telefone para contato
- **Validações**:
  - Email único no sistema
  - Validação de força de senha
  - Confirmação por email
- **Plano inicial**: Free Trial (14 dias)

#### 1.2 Login e Autenticação
- **Métodos de login**:
  - Email + Senha
  - Social Login (Google - futuro)
  - 2FA via email (opcional)
- **Tokens**:
  - Access Token: 15 minutos (JWT)
  - Refresh Token: 7 dias
- **Segurança**:
  - Rate limiting: 5 tentativas/minuto
  - Bloqueio após 5 tentativas falhas (15 minutos)
  - Logs de acesso (IP, user-agent, timestamp)

#### 1.3 Recuperação de Senha
- Link enviado por email (válido por 1 hora)
- Token único de uso único
- Redirecionamento para página de reset

#### 1.4 Gerenciamento de Equipe
- **Roles disponíveis**:
  - **Super Admin**: Acesso total ao sistema
  - **Org Admin**: Gerenciar organização, usuários, chatbots
  - **Agent**: Atender conversas, ver contatos
  - **Viewer**: Apenas visualização de relatórios
- **Permissões granulares**:
  - Por módulo (chatbots, contatos, campanhas)
  - Por ação (criar, editar, deletar, visualizar)
- **Convite de membros**:
  - Email de convite com link único
  - Definição de role no convite
  - Aceite e criação de senha

#### 1.5 Perfil de Usuário
- Upload de avatar
- Nome completo, email, telefone
- Preferências:
  - Idioma (pt-BR, en-US, es-ES)
  - Timezone
  - Notificações (email, in-app)
- Alterar senha
- Sessões ativas (listar e revogar)

---

## 🤖 2. Chatbot Builder

### Funcionalidades

#### 2.1 Criação de Chatbot
- **Wizard de criação**:
  - Step 1: Nome, descrição, avatar
  - Step 2: Mensagem de boas-vindas
  - Step 3: Fluxo inicial ou template
- **Templates prontos**:
  - Atendimento comercial
  - Suporte técnico
  - Agendamento
  - FAQ
  - E-commerce
  - Lead qualification

#### 2.2 Editor Visual de Fluxos (Drag & Drop)

##### Tipos de Nós

**1. Start (Início)**
- Ponto de entrada do fluxo
- Apenas 1 por fluxo
- Configurações:
  - Trigger: keyword, evento, agendamento

**2. Message (Mensagem)**
- Envia mensagem para o usuário
- Tipos suportados:
  - Texto simples
  - Texto com variáveis `{{nome}}`
  - Imagem + caption
  - Vídeo + caption
  - Documento (PDF, etc)
  - Áudio
- Botões (até 3):
  - Quick Reply buttons
  - Cada botão leva a um nó diferente
- Lista (até 10 itens):
  - Título da seção
  - Itens com título e descrição

**3. Question (Pergunta)**
- Aguarda resposta do usuário
- Salva em variável
- Tipos de validação:
  - Texto livre
  - Número
  - Email
  - Telefone
  - CPF/CNPJ
  - Data
  - Horário
  - Sim/Não
- Mensagem de erro customizável
- Máximo de tentativas (padrão: 3)

**4. Condition (Condição)**
- Lógica condicional (if/else)
- Operadores:
  - Igual (==)
  - Diferente (!=)
  - Maior (>), Menor (<)
  - Contém texto
  - Regex match
  - Está vazio
  - Está preenchido
- Múltiplas condições (AND/OR)
- Até 5 ramificações

**5. Action (Ação)**
- Adicionar tag ao contato
- Remover tag do contato
- Atualizar atributo do contato
- Marcar conversa como resolvida
- Transferir para agente (handoff)
- Enviar notificação interna

**6. API Call (Chamada de API)**
- Método: GET, POST, PUT, DELETE
- URL com variáveis
- Headers customizáveis
- Body (JSON) com variáveis
- Autenticação:
  - Bearer Token
  - API Key
  - Basic Auth
- Salvar resposta em variável
- Timeout: 10s
- Retry: até 2 vezes

**7. AI Prompt (IA Conversacional)**
- Integração com LLMs:
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude)
  - Google (Gemini)
- System prompt customizável
- Contexto:
  - Histórico de mensagens
  - Variáveis do fluxo
  - Dados do contato
- Temperature: 0.0 - 1.0
- Max tokens: configurável
- Salvar resposta em variável

**8. Jump (Pular para outro fluxo)**
- Redirecionar para outro fluxo
- Passar variáveis entre fluxos
- Retornar ao fluxo original (opcional)

**9. End (Fim)**
- Finaliza o fluxo
- Opções:
  - Encerrar conversa
  - Aguardar nova mensagem
  - Transferir para agente

**10. Handoff (Transferência Humana)**
- Transfer imediato para agente
- Departamento/equipe específica
- Prioridade (baixa, normal, alta, urgente)
- Mensagem para o agente (contexto)
- Mensagem para o usuário

#### 2.3 Variáveis do Sistema

**Variáveis de Contato:**
- `{{contact.name}}` - Nome do contato
- `{{contact.phone}}` - Telefone
- `{{contact.email}}` - Email
- `{{contact.tags}}` - Tags
- `{{contact.custom.CAMPO}}` - Campos customizados

**Variáveis de Contexto:**
- `{{conversation.id}}` - ID da conversa
- `{{message.text}}` - Última mensagem
- `{{date.now}}` - Data atual
- `{{time.now}}` - Hora atual
- `{{day.name}}` - Dia da semana

**Variáveis Customizadas:**
- Criar variáveis no fluxo
- Escopo: conversa atual
- Tipos: string, number, boolean, array, object

#### 2.4 Testador de Fluxo
- Modo de teste integrado no editor
- Simula conversa completa
- Visualiza valores das variáveis
- Debug de condições
- Logs de execução
- Reset do teste

#### 2.5 Configurações do Chatbot

**Comportamento:**
- Ativar/Desativar bot
- Mensagem de boas-vindas
- Mensagem de ausência (fora do horário)
- Mensagem de fallback (não entendeu)
- Timeout de inatividade (padrão: 30min)

**Horário de Funcionamento:**
- Dias da semana (seg-dom)
- Horário início e fim
- Fuso horário
- Feriados (desabilitar)

**Handoff Automático:**
- Keywords de transferência (ex: "falar com atendente")
- Transferir após N tentativas sem entender
- Transferir em horário específico
- Fila de espera

**IA Conversacional:**
- Habilitar NLU (Natural Language Understanding)
- Threshold de confiança (0.0 - 1.0)
- Fallback se confiança baixa
- Training data (frases de exemplo)

#### 2.6 Versionamento
- Histórico de versões do fluxo
- Comparação visual entre versões
- Restaurar versão anterior
- Publicar nova versão (ambiente prod)

#### 2.7 Analytics do Bot
- Total de execuções
- Taxa de conclusão (%)
- Tempo médio de conclusão
- Drop-off por nó (onde usuários abandonam)
- Caminhos mais usados
- Taxa de handoff

#### 2.8 AI Flow Assistant (Geração Automática de Fluxos)

**Rota:** `/admin/chatbots/[id]/builder` (painel lateral direito)

**Visão Geral:**
- Assistente AI que gera fluxos de chatbot automaticamente baseado em descrições em linguagem natural
- Usa modelos de linguagem (LLMs) para entender requisitos e criar estruturas de fluxo completas
- Suporta conversação multi-round para clarificação de requisitos
- Integrado diretamente no builder de fluxos

**Funcionalidades Principais:**

**1. Geração de Fluxos por Descrição:**
- Input em linguagem natural (português)
- Exemplos:
  - "Crie um fluxo de atendimento para vendas de imóveis"
  - "Quero um chatbot que qualifica leads e agenda reuniões"
  - "Preciso de um fluxo de suporte técnico com FAQ"
- AI analisa descrição e gera estrutura completa de nós e conexões

**2. Detecção Inteligente de Contexto:**
- Detecta automaticamente o tipo de número WhatsApp conectado (oficial ou QR Code)
- Ajusta sugestões de componentes baseado no tipo de conexão:
  - WhatsApp Oficial: sugere templates, botões interativos, listas
  - QR Code (Evolution API): foca em mensagens de texto e perguntas
- Considera setor/indústria da organização (se configurado)

**3. Clarificação de Requisitos:**
- Se descrição for vaga, AI faz perguntas de clarificação
- Tipos de perguntas:
  - Múltipla escolha (radio buttons)
  - Texto livre (inputs)
- Exemplos de clarificação:
  - "Qual o objetivo principal do fluxo?"
  - "Quantas opções você quer no menu principal?"
  - "Deseja transferir para atendimento humano ao final?"
- Após respostas, AI gera fluxo refinado

**4. Preview Visual do Fluxo Gerado:**
- Card de preview com informações do fluxo:
  - Nome do fluxo
  - Descrição
  - Estatísticas (quantidade de nós e conexões)
  - Tags dos tipos de nós usados
- Toggle "Ver Preview Visual":
  - Abre canvas interativo (200px altura)
  - Visualização read-only com React Flow
  - Mostra estrutura completa do grafo
  - Permite validar antes de importar
- Opção de renomear fluxo (clique no nome)
- Botão "Tentar novamente" para regenerar

**5. Importação para Builder:**
- Botão "Importar Flow" adiciona nós e conexões ao canvas
- Preserva posições e estrutura do fluxo gerado
- Fluxo pode ser editado normalmente após importação
- Auto-save automático após importação

**6. Chat Interface:**
- Interface de chat conversacional (similar ChatGPT)
- Mensagens do usuário (bolhas azuis, lado direito)
- Mensagens do assistente (bolhas cinzas, lado esquerdo, com Markdown)
- Avatares:
  - Usuário: ícone User
  - AI: ícone Sparkles (✨)
- Timestamps em formato local
- Auto-scroll para nova mensagem
- Histórico completo da conversa

**7. Suporte Markdown nas Respostas:**
- Respostas da AI com formatação rica:
  - **Negrito** e *itálico*
  - Listas numeradas e com marcadores
  - `Código inline`
  - Blocos de código
  - Quebras de linha
- Componentes customizados com Tailwind
- Estilo consistente com o tema roxo do assistente

**Configurações Disponíveis:**

**Seleção de Modelo:**
- GPT-4 (OpenAI)
- GPT-3.5-turbo (OpenAI)
- Claude 3 Opus (Anthropic)
- Claude 3 Sonnet (Anthropic)
- Gemini Pro (Google)

**Parâmetros do Modelo:**
- Temperatura (0.0 - 1.0)
  - Baixa (0.2): Respostas mais consistentes
  - Média (0.7): Balanceado
  - Alta (1.0): Mais criativo
- Configurável por organização

**Contexto Enviado à AI:**
- Descrição do usuário
- Tipo de conexão WhatsApp
- Setor da organização
- Templates disponíveis (se WhatsApp oficial)
- Respostas de clarificação (se houver)

**Estados de Interação:**

**1. Idle (Ocioso):**
- Campo de input disponível
- Botão "Gerar Flow" habilitado
- Placeholder: "Descreva o fluxo que você deseja criar..."

**2. Gerando:**
- Loading spinner
- Botão desabilitado
- Texto: "Gerando flow..."

**3. Clarificação:**
- Formulário com perguntas da AI
- Inputs/radio buttons
- Botão "Enviar Respostas"
- Validação: todas perguntas devem ser respondidas

**4. Fluxo Gerado:**
- Card de preview do fluxo
- Botões de ação disponíveis:
  - "Importar Flow" (primário)
  - "Tentar novamente" (secundário)

**5. Erro:**
- Mensagem de erro em texto
- Opção de tentar novamente
- Erros comuns:
  - "Falha na conexão com AI"
  - "Modelo não disponível"
  - "Requisição inválida"

**Estrutura do Fluxo Gerado:**

**Formato JSON:**
```json
{
  "name": "Nome do Fluxo",
  "description": "Descrição detalhada",
  "canvas_data": {
    "nodes": [
      {
        "id": "node-uuid",
        "type": "customNode",
        "position": { "x": 100, "y": 100 },
        "data": {
          "nodeType": "start",
          "label": "Início",
          "config": { /* configurações específicas */ }
        }
      }
      // ... mais nós
    ],
    "edges": [
      {
        "id": "edge-uuid",
        "source": "node-uuid-1",
        "target": "node-uuid-2",
        "type": "smoothstep"
      }
      // ... mais conexões
    ]
  }
}
```

**Tipos de Nós Gerados:**
- Start (sempre presente)
- Message (mensagens de texto)
- Question (captura de dados)
- Condition (ramificações lógicas)
- Action (ações como salvar contato)
- Handoff (transferência para humano)
- End (finalização)
- WhatsApp Template (se conexão oficial)
- Interactive Buttons (se conexão oficial)
- Interactive List (se conexão oficial)

**Posicionamento Automático:**
- Layout hierárquico (top-down)
- Espaçamento horizontal: 250px
- Espaçamento vertical: 150px
- Centralização automática

**Exemplos de Uso:**

**Exemplo 1 - Fluxo de Vendas Simples:**
```
Usuário: "Crie um fluxo para vender cursos online"

AI: "Vou criar um fluxo de vendas. Preciso saber:
1. Quantos cursos você oferece?
2. Deseja capturar email do lead?
3. Após apresentar os cursos, o que fazer?"

Usuário: [Responde formulário]
- 3 cursos
- Sim, capturar email
- Transferir para vendedor

AI: [Gera fluxo com]:
- Start
- Message: Boas-vindas
- Interactive List: Selecionar curso
- Question: Capturar email
- Message: Confirmar interesse
- Handoff: Transferir para vendedor
- End
```

**Exemplo 2 - Fluxo de Suporte:**
```
Usuário: "Preciso de um chatbot de suporte técnico com FAQ"

AI: [Gera fluxo com]:
- Start
- Message: Boas-vindas
- Interactive Buttons: "Problema técnico" ou "Falar com atendente"
- Condition: Verifica escolha
  - Se "Problema técnico":
    - Interactive List: Tipos de problema
    - Message: Solução do FAQ
    - Question: "Resolveu seu problema?"
    - Condition: Se "Não" → Handoff
  - Se "Falar com atendente":
    - Handoff direto
- End
```

**Melhorias e Otimizações:**

**✅ Implementado:**
- Interface de chat conversacional (commit `cc56648`)
- Clarificação com formulários interativos (ClarificationForm)
- Preview visual com React Flow (FlowPreview)
- Suporte Markdown nas mensagens (ChatMessage)
- Detecção de tipo de conexão WhatsApp
- Importação direta para canvas
- Renomeação de fluxos antes de importar
- Estados de loading e erro

**🔄 Futuro:**
- Histórico de fluxos gerados (salvos localmente)
- Exportar/importar conversas com AI
- Templates de prompts pré-definidos
- Sugestões baseadas em fluxos existentes
- Refinamento iterativo de fluxos
- Categorização automática de exemplos
- Analytics de uso do assistente

**Requisitos Técnicos:**

**Backend:**
- Endpoint: `POST /api/v1/ai-assistant/generate-flow`
- Serviço: `AIFlowAssistantService` (business logic)
- Integração: OpenAI, Anthropic, Google AI APIs
- Rate limiting: 10 requests/min por organização
- Timeout: 30s

**Frontend:**
- Componentes:
  - `AIFlowAssistant.tsx` - Container principal
  - `ChatMessage.tsx` - Mensagens individuais
  - `ClarificationForm.tsx` - Formulário de perguntas
  - `FlowPreview.tsx` - Preview do fluxo
- Dependências:
  - `react-markdown@9` - Renderização Markdown
  - `@xyflow/react` - Preview visual
  - `lucide-react` - Ícones

**Segurança:**
- API keys armazenadas criptografadas (AES-256)
- Rate limiting por organização
- Validação de entrada (max 2000 caracteres)
- Sanitização de JSON gerado
- Logs de uso para auditoria

**Performance:**
- Geração média: 5-10 segundos
- Cache de configurações (Redis)
- Retry automático (até 2 tentativas)
- Feedback visual durante geração

---

## 💬 3. Inbox (Atendimento Humano)

### Funcionalidades

#### 3.1 Fila de Atendimento (Tela para Agentes)

**Rota:** `/agent/queue`

**Visão Geral:**
- Tela dedicada para agentes visualizarem e "puxarem" conversas da fila
- Mostra apenas conversas do(s) departamento(s) do agente
- Atualização em tempo real via WebSocket

**Listagem de Conversas em Fila:**
- Cards de conversas aguardando atendimento
- Informações exibidas por card:
  - Nome do contato
  - Preview da última mensagem
  - Número WhatsApp
  - Tags
  - Tempo de espera (ex: "5 min", "1h 30min")
  - Prioridade (badge colorido)
  - Posição na fila (#1, #2, etc)
- Ordenação:
  - Por tempo de espera (mais antigo primeiro)
  - Por prioridade (urgente → normal)
  - FIFO (First In, First Out)

**Botão "Puxar Atendimento":**
- Cada card tem botão "Puxar" ou "Iniciar Atendimento"
- Ao clicar:
  1. Conversa sai da fila
  2. Status muda para `assigned`
  3. Atribuída ao agente
  4. **Saudação automática** é enviada (se configurada)
  5. Redireciona para tela de chat

**Filtros:**
- Por prioridade (urgente, alta, normal, baixa)
- Por tempo de espera (>5min, >15min, >1h)
- Por tags
- Por número WhatsApp (se múltiplos)

**Estatísticas no Header:**
- Total em fila: `12 conversas`
- Tempo médio de espera: `8 minutos`
- Mais antiga: `25 minutos`
- Badge piscando se > limite crítico

**Notificações:**
- Som de alerta quando nova conversa entra na fila
- Notificação desktop (se permitida)
- Badge no menu lateral com contador

**Atalhos de Teclado:**
- `P` - Puxar primeira da fila
- `R` - Refresh manual
- `F` - Abrir filtros

**Estados da Conversa:**
```
Bot respondendo → Handoff → waiting_in_queue → agent_pulled → assigned → resolved
```

#### 3.2 Interface de Chat

**Listagem de Conversas:**
- Filtros:
  - Status (abertas, pendentes, atribuídas, resolvidas)
  - Atribuição (minhas, sem atribuição, de equipe)
  - Tags
  - Data
  - Canal (WhatsApp, futuro: outros)
- Ordenação:
  - Mais recentes
  - Mais antigas
  - Prioridade
- Busca por:
  - Nome do contato
  - Telefone
  - Conteúdo da mensagem
- Badge de contador (novas mensagens)
- Paginação ou infinite scroll

**Janela de Conversa:**
- Timeline de mensagens
- Indicadores:
  - Enviada (✓)
  - Entregue (✓✓)
  - Lida (✓✓ azul)
  - Erro (⚠️)
- Agrupamento por data
- "Typing..." indicator
- Scroll automático para nova mensagem
- Visualização de mídia inline
- Download de arquivos

**Envio de Mensagens:**
- Input de texto com emojis
- Upload de mídia:
  - Imagem (JPEG, PNG) até 5MB
  - Vídeo (MP4) até 16MB
  - Documento (PDF, DOCX, etc) até 100MB
  - Áudio (MP3, OGG)
- Botões interativos (até 3)
- Lista de opções (até 10)
- Templates aprovados WhatsApp
- Prévia antes de enviar mídia

**Respostas Rápidas:**
- Atalhos: `/` + keyword
- Listagem com busca
- Categorização
- Inserção de variáveis
- Editar antes de enviar

**Notas Internas:**
- Anotações privadas na conversa
- Visível apenas para equipe
- @mencionar outros agentes
- Histórico de notas

#### 3.2 Painel Lateral do Contato

**Informações:**
- Avatar, nome, telefone
- Tags
- Atributos customizados
- Edição inline

**Histórico:**
- Total de conversas
- Última interação
- Tempo médio de resposta
- Satisfação média

**Atividades:**
- Timeline de eventos:
  - Conversas anteriores
  - Campanhas recebidas
  - Tags adicionadas/removidas
  - Mudanças de atributos

**Ações Rápidas:**
- Adicionar/remover tags
- Bloquear contato
- Exportar histórico
- Deletar contato

#### 3.3 Atribuição e Roteamento

**Atribuição Manual:**
- Atribuir a si mesmo
- Atribuir a outro agente
- Atribuir a equipe/departamento

**Atribuição Automática:**
- Round-robin (distribuir igualmente)
- Load-balancing (quem tem menos conversas)
- Por habilidade/departamento
- Por disponibilidade

**Fila de Espera:**
- Conversas aguardando atendimento
- Tempo de espera
- Priorização (FIFO, prioridade, VIP)

#### 3.4 Status da Conversa

**Fluxo de Status:**
```
Open → Pending → Assigned → Resolved → Closed
```

- **Open**: Nova conversa, aguardando atribuição
- **Pending**: Em espera (cliente ou agente)
- **Assigned**: Atribuída a um agente
- **Resolved**: Problema resolvido
- **Closed**: Conversa encerrada

**Ações:**
- Resolver conversa
- Reabrir conversa
- Arquivar conversa

#### 3.5 Notificações em Tempo Real

**Notificações in-app:**
- Nova mensagem recebida
- Conversa atribuída
- Menção em nota interna
- Satisfação recebida

**Notificações por Email:**
- Resumo diário de conversas
- Novas atribuições
- SLA próximo do limite

**Notificações Desktop:**
- Browser notifications (se permitido)
- Som de alerta customizável

#### 3.6 Colaboração em Equipe

**Chat Interno:**
- Mensagens entre agentes
- Compartilhar conversas
- Discussão sobre casos

**Transferência:**
- Transferir para outro agente
- Transferir para departamento
- Mensagem de contexto

**Supervisão:**
- Monitores podem visualizar todas conversas
- Intervir em conversas em andamento
- Enviar sugestões aos agentes

---

## 👥 4. CRM e Gerenciamento de Contatos

### Funcionalidades

#### 4.1 Listagem de Contatos

**Visualizações:**
- Lista (tabela)
- Cartões (cards)
- Kanban (por tags/status)

**Colunas da Tabela:**
- Avatar + Nome
- Telefone (WhatsApp)
- Email
- Tags
- Última interação
- Total de conversas
- Ações

**Filtros Avançados:**
- Tags (AND/OR)
- Atributos customizados
- Data de criação
- Data de última mensagem
- Opt-in/opt-out
- Bloqueados
- Conversas ativas

**Busca:**
- Por nome
- Por telefone
- Por email
- Por atributos

**Ações em Massa:**
- Adicionar tags
- Remover tags
- Exportar (CSV, Excel)
- Deletar (com confirmação)
- Adicionar a campanha

#### 4.2 Perfil do Contato

**Informações Básicas:**
- Nome completo
- Telefone (WhatsApp)
- Email
- Avatar (foto de perfil WhatsApp)
- Data de criação

**Tags:**
- Adicionar múltiplas tags
- Autocompletar tags existentes
- Criar nova tag inline
- Remover tags

**Atributos Customizados:**
- Campos dinâmicos criados pela organização
- Tipos suportados:
  - Texto curto
  - Texto longo
  - Número
  - Data
  - Dropdown (seleção única)
  - Multi-select
  - URL
  - Booleano (checkbox)
- Edição inline

**Histórico de Conversas:**
- Listagem de todas conversas
- Busca dentro do histórico
- Exportar histórico (PDF)

**Atividades:**
- Timeline de eventos
- Campanhas recebidas
- Tags adicionadas/removidas
- Notas criadas

**Notas:**
- Anotações sobre o contato
- Markdown suportado
- Criado por (agente)
- Data/hora

#### 4.3 Segmentação

**Criar Segmentos:**
- Nome do segmento
- Descrição
- Regras de filtro:
  - Tags (incluir/excluir)
  - Atributos (=, !=, >, <, contém)
  - Data de criação
  - Última interação
  - Total de conversas
  - Opt-in status
- Operadores lógicos (AND/OR)
- Preview de contatos (quantos)

**Segmentos Dinâmicos:**
- Atualização automática
- Contatos entram/saem baseado em regras

**Segmentos Estáticos:**
- Lista fixa de contatos
- Não atualiza automaticamente

**Usar Segmentos:**
- Criar campanha para segmento
- Exportar segmento
- Analytics por segmento

#### 4.4 Tags

**Gerenciamento:**
- Criar tag (nome + cor)
- Editar tag
- Deletar tag (move para contatos)
- Mesclar tags

**Uso:**
- Aplicar manualmente
- Aplicar via chatbot (ação)
- Aplicar via API
- Remover tags

**Tipos de Tags Sugeridas:**
- Status: `lead`, `cliente`, `inativo`
- Fonte: `site`, `indicação`, `campanha_x`
- Interesse: `produto_a`, `serviço_b`
- Prioridade: `vip`, `premium`

#### 4.5 Importação de Contatos

**Formatos Aceitos:**
- CSV
- Excel (XLSX)
- Google Sheets (URL)

**Mapeamento de Colunas:**
- Identificar colunas automaticamente
- Mapear para campos do sistema
- Criar novos atributos customizados

**Validações:**
- Telefone em formato internacional
- Email válido
- Duplicatas (atualizar ou pular)

**Preview:**
- Mostrar primeiras 10 linhas
- Validar antes de importar

**Processamento:**
- Assíncrono (via Celery)
- Notificação quando concluir
- Log de erros

#### 4.6 Exportação de Contatos

**Formatos:**
- CSV
- Excel (XLSX)
- JSON

**Campos:**
- Selecionar campos a exportar
- Incluir tags
- Incluir atributos customizados

**Filtros:**
- Exportar filtro atual
- Exportar segmento
- Exportar todos

---

## 📢 5. Campanhas de Mensagens

### Funcionalidades

#### 5.1 Criar Campanha

**Wizard de Criação:**

**Step 1: Informações Básicas**
- Nome da campanha
- Descrição
- Objetivo (informativo, promocional, transacional)

**Step 2: Audiência**
- Opções:
  - Todos os contatos
  - Segmento específico
  - Tags específicas
  - Upload de lista (CSV)
  - Filtro customizado
- Preview de total de destinatários
- Exclusões (contatos bloqueados, opt-out)

**Step 3: Mensagem**
- Usar template aprovado WhatsApp (obrigatório para primeira mensagem)
- Seletor de templates
- Variáveis do template
- Preview da mensagem

**Tipos de Templates:**
- Marketing: promoções, novidades
- Utility: atualizações de pedido, notificações
- Authentication: OTP, códigos de verificação

**Step 4: Agendamento**
- Enviar agora
- Agendar data/hora
- Envio recorrente:
  - Diário
  - Semanal
  - Mensal
  - Custom (cron)
- Fuso horário

**Step 5: Configurações**
- Rate limiting (msg/minuto)
  - Padrão: 100/min
  - Evitar bloqueios WhatsApp
- Intervalo entre mensagens
- Horário permitido (8h-22h)
- Não enviar em feriados

**Step 6: Revisão**
- Resumo completo
- Estimativa de custo (se aplicável)
- Tempo estimado de conclusão
- Confirmar e enviar

#### 5.2 Templates WhatsApp (Gestão Completa)

**Rota:** `/templates`

**Visão Geral:**
- Gerenciar templates de mensagens aprovados pela Meta
- Sincronização automática com WhatsApp Business API
- Cada template vinculado a um número WhatsApp específico

**Listagem de Templates:**
- Tabela ou cards
- Colunas/Informações:
  - Nome do template
  - Categoria (Marketing, Utility, Authentication)
  - Idioma (pt_BR, en_US, etc)
  - Status Meta (Pending, Approved, Rejected, Paused)
  - Status Sistema (Ativo/Inativo)
  - Habilitado em Fluxos (toggle)
  - Número WhatsApp vinculado
  - Última sincronização
  - Ações (editar, desativar, duplicar, deletar)

**Filtros:**
- Por status Meta
- Por categoria
- Por idioma
- Por número WhatsApp
- Ativos/Inativos
- Habilitados em fluxos

**Criar Novo Template:**

**Step 1: Informações Básicas**
- Número WhatsApp (selecionar qual número)
- Nome do template (lowercase, sem espaços, ex: `welcome_message`)
- Categoria:
  - **MARKETING**: Promoções, ofertas, novidades
  - **UTILITY**: Atualizações de pedido, lembretes, notificações
  - **AUTHENTICATION**: OTP, códigos de verificação
- Idioma (pt_BR, en_US, es_ES, etc)

**Step 2: Conteúdo**

**Header (Opcional):**
- Tipo: TEXT, IMAGE, VIDEO, DOCUMENT
- Conteúdo:
  - Se TEXT: texto do cabeçalho (máx 60 caracteres)
  - Se MEDIA: URL da mídia

**Body (Obrigatório):**
- Texto principal (máx 1024 caracteres)
- Variáveis: `{{1}}`, `{{2}}`, `{{3}}`, etc
- Exemplo de valores para cada variável
- Preview em tempo real

**Footer (Opcional):**
- Texto curto (máx 60 caracteres)
- Sem variáveis

**Buttons (Opcional):**
- Até 3 botões
- Tipos:
  - **Call to Action** (URL ou Phone)
  - **Quick Reply** (botões de resposta rápida)

**Step 3: Exemplos**
- Fornecer valores de exemplo para variáveis
- Preview completo da mensagem
- Necessário para aprovação Meta

**Step 4: Revisar e Enviar**
- Confirmar todos os dados
- Enviar para aprovação Meta via API
- Aguardar resposta (pode levar até 48h)

**Sincronização com Meta:**

**Automática:**
- Webhook recebe notificação quando template é aprovado/rejeitado
- Status atualizado automaticamente no sistema
- Notificação in-app para admin

**Manual:**
- Botão "Sincronizar com Meta" em cada template
- Atualiza status, quality score, etc
- Sincronização em lote (todos templates)

**Desativar Template:**
- Toggle "Ativo" no sistema
- Quando desativado:
  - Não aparece em seletores de fluxos
  - Não pode ser usado em campanhas
  - Continua existindo na Meta
- Reativar a qualquer momento

**Desabilitar em Fluxos:**
- Toggle "Habilitado em Fluxos"
- Quando desabilitado:
  - Não aparece no builder de fluxos
  - Ainda pode ser usado em campanhas
  - Útil para templates legados

**Editar Template:**
- Templates aprovados não podem ser editados
- Para editar: criar nova versão (novo template)
- Opção "Duplicar e Editar"
- Novo template passa por aprovação novamente

**Deletar Template:**
- Soft delete (mantém registro)
- Verificar se está sendo usado em:
  - Fluxos ativos
  - Campanhas agendadas
- Se em uso, avisar admin antes de deletar

**Status Possíveis:**

**Meta Status:**
- `PENDING`: Aguardando aprovação Meta (até 48h)
- `APPROVED`: Aprovado, pronto para uso
- `REJECTED`: Rejeitado pela Meta (ver motivo)
- `PAUSED`: Pausado pela Meta (quality baixo)
- `DISABLED`: Desabilitado pela Meta

**Sistema Status:**
- `ACTIVE`: Ativo no sistema
- `INACTIVE`: Desativado pelo admin
- `ENABLED_IN_FLOWS`: Habilitado nos fluxos
- `DISABLED_IN_FLOWS`: Desabilitado nos fluxos

**Motivos Comuns de Rejeição:**
- Conteúdo promocional em categoria Utility
- Informações enganosas
- Conteúdo violento ou explícito
- Marca registrada sem autorização
- Variáveis mal formatadas
- Exemplos insuficientes

**Uso de Templates em Mensagens:**
- Selecionar template aprovado (apenas ativos)
- Preencher variáveis dinamicamente
- Preview antes de enviar
- Usar em:
  - Campanhas de massa
  - Mensagens individuais (inbox)
  - Fluxos de chatbot
  - API externa

#### 5.3 Monitoramento de Campanha

**Dashboard da Campanha:**
- Status (rascunho, agendada, em execução, pausada, concluída)
- Progresso (barra de progresso)
- Métricas em tempo real:
  - Total de destinatários
  - Enviadas
  - Entregues
  - Lidas
  - Falhadas
  - Respondidas
- Taxa de entrega (%)
- Taxa de leitura (%)
- Taxa de resposta (%)

**Ações:**
- Pausar campanha
- Retomar campanha
- Cancelar campanha (não enviadas)
- Duplicar campanha
- Exportar resultados

**Logs:**
- Por destinatário:
  - Nome, telefone
  - Status
  - Timestamp de envio
  - Timestamp de entrega
  - Timestamp de leitura
  - Erro (se houver)
- Filtros por status
- Busca por contato
- Exportar logs (CSV)

#### 5.4 Campanhas Recorrentes

**Configurar Recorrência:**
- Frequência:
  - Diária (todo dia às X)
  - Semanal (dias da semana)
  - Mensal (dia X do mês)
  - Custom (cron expression)
- Data de início
- Data de término (opcional)
- Audiência dinâmica (atualiza a cada envio)

**Gerenciar:**
- Pausar recorrência
- Editar recorrência
- Ver histórico de envios

---

## 📊 6. Analytics e Relatórios

### Funcionalidades

#### 6.1 Dashboard Geral

**Métricas Principais (Cards):**
- Total de conversas (período)
  - Comparação com período anterior (↑/↓)
- Total de mensagens enviadas/recebidas
- Taxa de resposta média
- Tempo médio de primeira resposta
- Tempo médio de resolução
- Satisfação média (NPS/CSAT)
- Contatos ativos (período)
- Novos contatos (período)

**Gráficos:**
- Conversas ao longo do tempo (linha)
  - Filtro: última semana, mês, trimestre, ano
- Mensagens por dia (barra)
- Distribuição por canal (pizza - futuro)
- Conversas por status (barra horizontal)
- Taxa de resolução (gauge)

**Filtros Globais:**
- Período customizado
- Agente específico
- Chatbot específico
- Tags

#### 6.2 Analytics de Chatbots

**Por Chatbot:**
- Total de execuções
- Taxa de conclusão (%)
- Taxa de abandono (%)
- Tempo médio de execução
- Taxa de handoff (%)
- Nós mais acessados
- Drop-off points (onde usuários saem)

**Funil de Conversão:**
- Visualização de fluxo
- Percentual em cada nó
- Identificar gargalos

**Otimizações Sugeridas:**
- Nós com alta taxa de abandono
- Perguntas com muitas tentativas falhas
- Fluxos muito longos

#### 6.3 Analytics de Agentes

**Performance Individual:**
- Conversas atendidas
- Tempo médio de primeira resposta
- Tempo médio de resolução
- Taxa de resolução
- Satisfação média
- Mensagens enviadas

**Ranking de Agentes:**
- Top performers
- Comparação entre agentes
- Métricas lado a lado

**Disponibilidade:**
- Tempo online
- Tempo em atendimento
- Tempo ocioso

#### 6.4 Analytics de Contatos

**Engajamento:**
- Contatos ativos vs inativos
- Frequência de interação
- Canais preferidos
- Horários de maior atividade

**Crescimento:**
- Novos contatos por dia/semana/mês
- Taxa de crescimento (%)
- Fonte de contatos (campanha, orgânico, etc)

**Segmentação:**
- Distribuição por tags
- Distribuição por atributos
- Segmentos mais engajados

#### 6.5 Analytics de Campanhas

**Visão Geral:**
- Campanhas ativas
- Campanhas concluídas (período)
- Total de mensagens enviadas
- Taxa de entrega média
- Taxa de leitura média
- Taxa de resposta média

**Comparação de Campanhas:**
- Tabela comparativa
- Melhores performers
- Campanhas com baixo desempenho

**ROI (futuro):**
- Custo por mensagem
- Conversões geradas
- Receita atribuída

#### 6.6 Relatórios Customizados

**Report Builder:**
- Selecionar métricas
- Selecionar dimensões
- Filtros
- Agrupamento (por dia, semana, mês)
- Visualização (tabela, gráfico)

**Tipos de Relatórios:**
- Relatório de conversas
- Relatório de mensagens
- Relatório de agentes
- Relatório de campanhas
- Relatório de satisfação

**Exportação:**
- PDF
- Excel (XLSX)
- CSV
- Google Sheets (link)

**Agendamento:**
- Gerar automaticamente (diário, semanal, mensal)
- Enviar por email
- Destinatários

#### 6.7 Satisfação do Cliente

**CSAT (Customer Satisfaction Score):**
- Após resolução da conversa
- Escala 1-5 estrelas
- Comentário opcional

**NPS (Net Promoter Score):**
- Pergunta: "De 0 a 10, quanto recomendaria?"
- Cálculo: % Promoters - % Detractors
- Seguimento: "Por que você deu essa nota?"

**Análise de Sentimento (futuro):**
- IA para analisar mensagens
- Classificar: positivo, neutro, negativo
- Trending de sentimento

---

## 🔌 7. Integrações e API

### Funcionalidades

#### 7.1 API REST

**Autenticação:**
- API Keys (Bearer Token)
- Scopes/permissões
- Rate limiting por key

**Gerenciar API Keys:**
- Criar nova key
- Nome descritivo
- Permissões (read, write, delete)
- Expiração (opcional)
- Revogar key
- Listar keys ativas
- Ver uso (requests/dia)

**Endpoints Principais:**
```
# Contatos
GET    /api/v1/contacts
POST   /api/v1/contacts
GET    /api/v1/contacts/{id}
PATCH  /api/v1/contacts/{id}
DELETE /api/v1/contacts/{id}

# Mensagens
POST   /api/v1/messages
GET    /api/v1/messages/{id}

# Conversas
GET    /api/v1/conversations
GET    /api/v1/conversations/{id}

# Chatbots
GET    /api/v1/chatbots
POST   /api/v1/chatbots

# Campanhas
POST   /api/v1/campaigns
GET    /api/v1/campaigns/{id}
```

**Documentação:**
- OpenAPI/Swagger
- Exemplos de código (cURL, Python, JS, PHP)
- Playground interativo

#### 7.2 Webhooks

**Eventos Disponíveis:**
- `message.received` - Nova mensagem recebida
- `message.sent` - Mensagem enviada
- `message.delivered` - Mensagem entregue
- `message.read` - Mensagem lida
- `message.failed` - Erro no envio
- `conversation.created` - Nova conversa
- `conversation.assigned` - Conversa atribuída
- `conversation.resolved` - Conversa resolvida
- `contact.created` - Novo contato
- `contact.updated` - Contato atualizado
- `campaign.completed` - Campanha concluída

**Configurar Webhook:**
- Nome do webhook
- URL de destino (HTTPS obrigatório)
- Eventos a escutar (múltipla seleção)
- Secret para validação (HMAC)
- Headers customizados (opcional)
- Retry policy:
  - Máximo de tentativas (padrão: 3)
  - Intervalo entre tentativas

**Payload:**
```json
{
  "event": "message.received",
  "timestamp": "2025-10-03T14:32:00Z",
  "organization_id": "uuid",
  "data": {
    "message_id": "uuid",
    "conversation_id": "uuid",
    "contact": {...},
    "content": {...}
  }
}
```

**Validação:**
- Header `X-PyTake-Signature` com HMAC SHA256
- Validar timestamp (evitar replay attacks)

**Logs:**
- Histórico de entregas
- Status code
- Response body
- Tempo de resposta
- Retry attempts

**Teste:**
- Enviar evento de teste
- Ver payload
- Ver resposta

#### 7.3 Integrações Nativas

**Zapier:**
- Triggers:
  - Nova mensagem
  - Novo contato
  - Conversa resolvida
- Actions:
  - Enviar mensagem
  - Criar contato
  - Adicionar tag

**Make.com (Integromat):**
- Módulos similares ao Zapier

**Google Sheets:**
- Exportar contatos automaticamente
- Importar contatos de planilha
- Sincronização bidirecional

**Shopify / WooCommerce:**
- Notificações de pedido
- Atualização de status
- Carrinho abandonado
- Recuperar vendas

**CRMs:**
- HubSpot
- Salesforce
- RD Station
- Pipedrive

**Agendamento:**
- Google Calendar
- Calendly
- Integração para agendamentos

#### 7.4 Integrações Customizadas

**SDK/Bibliotecas:**
- Python SDK
- JavaScript SDK
- PHP SDK
- Exemplos e docs

**Middleware:**
- Express.js middleware para validar webhooks
- Flask/FastAPI decorators

---

## ⚙️ 8. Configurações e Administração

### Funcionalidades

#### 8.1 Configurações da Organização

**Informações Básicas:**
- Nome da empresa
- Logo
- Timezone
- Idioma padrão
- Moeda (futuro - billing)

**WhatsApp Business:**
- Configuração movida para seção "Números WhatsApp" (ver 8.2)

**Limites e Quota:**
- Mensagens enviadas (mês atual)
- Limite de mensagens (por plano)
- Números WhatsApp ativos
- Contatos ativos
- Chatbots criados
- Agentes permitidos
- Departamentos criados
- Storage usado

#### 8.2 Números WhatsApp (Múltiplos Números)

**Rota:** `/settings/whatsapp-numbers`

**Visão Geral:**
- Gerenciar múltiplos números WhatsApp oficiais por organização
- Cada número tem suas próprias credenciais Meta
- Fluxos e templates podem ser vinculados a números específicos

**Listagem de Números:**
- Tabela com números cadastrados
- Colunas:
  - Número (ex: +55 11 99999-9999)
  - Nome/Apelido
  - Status (verificado, pendente, erro)
  - Quality Rating (GREEN, YELLOW, RED)
  - Messaging Limit Tier
  - Padrão (badge)
  - Ações (editar, remover, teste)

**Adicionar Novo Número:**

Wizard de 3 etapas:

**Step 1: Informações Básicas**
- Phone Number (formato internacional)
- Display Name (nome exibido)
- WhatsApp Business Account ID

**Step 2: Credenciais Meta**
- Phone Number ID (da Meta)
- Access Token (System User Token)
- Criptografia automática ao salvar

**Step 3: Teste de Conexão**
- Validar credenciais
- Enviar mensagem de teste
- Verificar webhook
- Confirmar e ativar

**Configurações por Número:**
- Definir como padrão
- Ativar/Desativar
- Webhook verify token (único por número)
- Quality rating (atualizado automaticamente)
- Messaging limits (sincronizado com Meta)

**Sincronização com Meta:**
- Buscar informações atualizadas do número
- Atualizar quality rating
- Verificar status de verificação
- Sincronizar templates

**Departamentos por Número:**
- Vincular departamentos a números específicos
- Ex: Vendas → +55 11 99999-0001
- Ex: Suporte → +55 11 99999-0002

**Regras:**
- Mínimo 1 número ativo por organização
- Máximo definido pelo plano (1 no Free, 3 no Starter, ilimitado no Enterprise)
- Não pode deletar número padrão sem definir outro
- Ao deletar número, reatribuir fluxos/templates

#### 8.3 Departamentos/Setores

**Rota:** `/settings/departments`

**Visão Geral:**
- Organizar agentes em departamentos (Vendas, Suporte, Financeiro, etc)
- Cada departamento tem sua própria fila de atendimento
- Configurações de roteamento e auto-atribuição

**Listagem de Departamentos:**
- Cards ou tabela
- Informações:
  - Nome do departamento
  - Cor/ícone
  - Número WhatsApp vinculado (opcional)
  - Total de agentes
  - Conversas ativas
  - Conversas em fila
  - Status (ativo/inativo)

**Criar Departamento:**

**Informações Básicas:**
- Nome (ex: "Vendas", "Suporte Técnico")
- Descrição
- Cor (#hex)
- Ícone (opcional)

**Número WhatsApp:**
- Selecionar número específico (opcional)
- Se null, aceita de todos os números

**Configurações de Fila:**
- Auto-atribuição habilitada (sim/não)
- Estratégia de atribuição:
  - Round-robin (distribuir igualmente)
  - Load-balance (quem tem menos conversas)
  - Priority (por prioridade do agente)
- Tamanho máximo da fila (padrão: 100)

**Horário de Funcionamento:**
- Dias da semana
- Horário de atendimento
- Mensagem fora do horário
- Feriados

**Agentes do Departamento:**
- Adicionar/remover agentes
- Definir agente primário (recebe mais conversas)
- Configurações por agente:
  - Máximo de conversas simultâneas (padrão: 5)
  - Pode puxar da fila (sim/não)
  - Nível de prioridade (0-10)

**Métricas do Departamento:**
- Conversas atendidas (hoje/semana/mês)
- Tempo médio de espera na fila
- Tempo médio de resolução
- Taxa de satisfação
- Agentes ativos/inativos

#### 8.4 Saudação Automática dos Agentes

**Rota:** `/settings/profile` (seção do perfil do agente)

**Configuração:**
- Toggle: Enviar saudação automaticamente
- Editor de texto da saudação
- Preview em tempo real

**Variáveis Disponíveis:**
- `{{agent_name}}` - Nome do agente
- `{{agent_department}}` - Departamento do agente
- `{{contact_name}}` - Nome do contato
- `{{time}}` - Hora atual (ex: "14:30")
- `{{day}}` - Dia da semana (ex: "segunda-feira")
- `{{date}}` - Data (ex: "03/10/2025")

**Exemplo de Template:**
```
Olá {{contact_name}}! 👋

Meu nome é {{agent_name}} do departamento de {{agent_department}}.

Estou aqui para ajudar você. Como posso ser útil hoje?
```

**Quando é Enviada:**
- Agente "puxa" conversa da fila
- Conversa é atribuída ao agente (auto-assign)
- Primeira mensagem da conversa com agente

**Configurações:**
- Ativar/Desativar por agente
- Editar a qualquer momento
- Preview antes de salvar
- Histórico de versões

#### 8.5 Planos e Billing

**Planos Disponíveis:**

**Free Trial:**
- 14 dias grátis
- 1 chatbot
- 1000 mensagens/mês
- 3 agentes
- 1000 contatos

**Starter:**
- $49/mês
- 3 chatbots
- 5000 mensagens/mês
- 5 agentes
- 5000 contatos
- Suporte por email

**Professional:**
- $99/mês
- 10 chatbots
- 15000 mensagens/mês
- 15 agentes
- 25000 contatos
- Integrações
- IA conversacional
- Suporte prioritário

**Enterprise:**
- Custom pricing
- Chatbots ilimitados
- Mensagens ilimitadas
- Agentes ilimitados
- Contatos ilimitados
- White-label
- Suporte dedicado
- SLA garantido

**Billing:**
- Histórico de faturas
- Método de pagamento (cartão, boleto)
- Upgrade/downgrade de plano
- Cancelamento

#### 8.3 Equipes e Departamentos

**Criar Equipe:**
- Nome (ex: "Vendas", "Suporte")
- Descrição
- Membros (agentes)
- Líder da equipe

**Roteamento por Equipe:**
- Conversas específicas para equipe
- Balanceamento dentro da equipe

#### 8.4 Horário de Funcionamento

**Configurar:**
- Dias da semana
- Horário de abertura/fechamento
- Fuso horário
- Feriados (lista customizável)

**Mensagem Fora do Horário:**
- Texto customizado
- Opção de deixar mensagem
- Informar horário de retorno

#### 8.5 Personalização

**Aparência (Frontend):**
- Logo da empresa
- Cores primárias/secundárias
- Favicon

**White-label (Enterprise):**
- Domínio customizado
- Remover branding PyTake
- Email sender customizado

#### 8.6 Segurança

**2FA (Two-Factor Authentication):**
- Habilitar para organização
- Obrigatório para admins
- Métodos: email, app authenticator

**Políticas de Senha:**
- Comprimento mínimo
- Complexidade (maiúsculas, números, símbolos)
- Expiração (forçar mudança a cada X dias)
- Histórico (não reutilizar últimas N senhas)

**Sessões:**
- Timeout de inatividade
- Logout automático
- Revogar todas sessões

**Logs de Auditoria:**
- Acessar logs de atividades
- Filtrar por usuário, ação, data
- Exportar logs

**IP Whitelist (Enterprise):**
- Permitir acesso apenas de IPs específicos

---

## 📱 User Stories

### Administrador de Organização

**US-001:** Como admin, quero criar um chatbot para automatizar atendimento inicial
**US-002:** Como admin, quero convidar membros da equipe e definir suas permissões
**US-003:** Como admin, quero conectar minha conta WhatsApp Business ao sistema
**US-004:** Como admin, quero ver relatórios de performance da equipe
**US-005:** Como admin, quero configurar horário de funcionamento do atendimento
**US-006:** Como admin, quero criar templates de mensagem para campanhas
**US-007:** Como admin, quero gerenciar planos e billing da organização

### Agente de Atendimento

**US-101:** Como agente, quero ver lista de conversas abertas atribuídas a mim
**US-102:** Como agente, quero responder mensagens dos clientes em tempo real
**US-103:** Como agente, quero adicionar tags aos contatos durante atendimento
**US-104:** Como agente, quero usar respostas rápidas para agilizar atendimento
**US-105:** Como agente, quero transferir conversa para outro agente/departamento
**US-106:** Como agente, quero ver histórico completo de conversas do contato
**US-107:** Como agente, quero adicionar notas internas sobre o atendimento
**US-108:** Como agente, quero marcar conversa como resolvida

### Gerente de Marketing

**US-201:** Como gerente, quero criar campanha de mensagens para um segmento
**US-202:** Como gerente, quero agendar envio de campanha para data futura
**US-203:** Como gerente, quero ver métricas de entrega e leitura da campanha
**US-204:** Como gerente, quero importar lista de contatos de CSV
**US-205:** Como gerente, quero criar segmentos dinâmicos baseados em atributos
**US-206:** Como gerente, quero exportar relatório de performance de campanhas

### Designer de Chatbot

**US-301:** Como designer, quero criar fluxo conversacional com editor visual
**US-302:** Como designer, quero testar o chatbot antes de publicar
**US-303:** Como designer, quero usar inteligência artificial nas respostas
**US-304:** Como designer, quero configurar transferência para humano em casos específicos
**US-305:** Como designer, quero ver analytics de onde usuários abandonam o fluxo
**US-306:** Como designer, quero criar múltiplos fluxos e conectá-los

### Desenvolvedor (Integração)

**US-401:** Como dev, quero gerar API key para integrar sistemas externos
**US-402:** Como dev, quero configurar webhook para receber eventos
**US-403:** Como dev, quero enviar mensagens via API REST
**US-404:** Como dev, quero consultar contatos via API
**US-405:** Como dev, quero acessar documentação completa da API

---

## 🔄 Fluxos de Usuário

### Fluxo 1: Primeiro Acesso (Onboarding)

```
1. Registro da organização
   └─> Preencher formulário (nome, email, senha)
   └─> Confirmar email
   └─> Login inicial

2. Setup Wizard
   └─> Conectar WhatsApp Business
       └─> Inserir tokens/credenciais
       └─> Testar conexão
   └─> Criar primeiro chatbot
       └─> Usar template ou criar do zero
   └─> Convidar equipe (opcional)
   └─> Tour guiado pela plataforma

3. Dashboard inicial
   └─> Ver primeiras métricas
   └─> Próximos passos sugeridos
```

### Fluxo 2: Atender uma Conversa

```
1. Notificação de nova mensagem
   └─> In-app ou desktop notification

2. Abrir inbox
   └─> Ver conversa na lista (badge de nova)

3. Clicar na conversa
   └─> Carregar histórico completo
   └─> Ver informações do contato (sidebar)

4. Atribuir a si mesmo (se não atribuída)

5. Ler mensagem do cliente

6. Responder
   └─> Digitar resposta OU
   └─> Usar resposta rápida (/comando) OU
   └─> Enviar mídia

7. (Opcional) Adicionar tags ao contato

8. (Opcional) Adicionar nota interna

9. Resolver conversa
   └─> Marcar como resolvida
   └─> Solicitar avaliação ao cliente
```

### Fluxo 3: Criar e Publicar Chatbot

```
1. Acessar módulo de Chatbots

2. Clicar "Criar Chatbot"
   └─> Preencher nome, descrição
   └─> Upload de avatar (opcional)

3. Escolher template ou começar do zero

4. Editor visual de fluxo
   └─> Adicionar nó "Start"
   └─> Adicionar nó "Message" (boas-vindas)
   └─> Adicionar nó "Question" (capturar nome)
   └─> Adicionar mais nós conforme necessário
   └─> Conectar nós (arrastar)

5. Configurar cada nó
   └─> Definir conteúdo
   └─> Configurar variáveis
   └─> Definir condições

6. Testar o fluxo
   └─> Modo de teste
   └─> Simular conversa
   └─> Verificar variáveis
   └─> Ajustar se necessário

7. Configurações do bot
   └─> Horário de funcionamento
   └─> Mensagem de fallback
   └─> Handoff automático

8. Publicar
   └─> Revisar
   └─> Ativar chatbot
   └─> Pronto para uso!
```

### Fluxo 4: Criar e Enviar Campanha

```
1. Acessar módulo de Campanhas

2. Clicar "Nova Campanha"

3. Wizard - Step 1: Info básica
   └─> Nome, descrição

4. Step 2: Selecionar audiência
   └─> Escolher segmento OU
   └─> Criar filtro customizado OU
   └─> Upload de lista
   └─> Ver preview (quantidade)

5. Step 3: Escolher template
   └─> Selecionar template aprovado
   └─> Preencher variáveis
   └─> Preview da mensagem

6. Step 4: Agendamento
   └─> Enviar agora OU
   └─> Agendar data/hora
   └─> Configurar rate limiting

7. Step 5: Revisar
   └─> Checar todos os detalhes
   └─> Confirmar

8. Campanha iniciada
   └─> Ver dashboard de progresso
   └─> Acompanhar métricas em tempo real
```

---

## ⚖️ Regras de Negócio

### RN-001: Limites por Plano
- Cada plano tem limites de chatbots, mensagens, agentes e contatos
- Sistema deve bloquear ações que excedam o limite
- Mostrar aviso quando próximo do limite (80%)
- Sugerir upgrade quando limite atingido

### RN-002: Validação de Telefone WhatsApp
- Telefone deve estar em formato internacional (E.164)
- Ex: +5511999999999
- Validar no cadastro de contato
- API do WhatsApp rejeita formatos inválidos

### RN-003: Templates WhatsApp
- Primeira mensagem para contato (fora de janela 24h) DEVE usar template aprovado
- Templates devem ser aprovados pela Meta antes do uso
- Processo de aprovação pode levar até 48h
- Rejeições comuns: spam, conteúdo proibido, formatação incorreta

### RN-004: Janela de 24 Horas (WhatsApp Official Policy)

**Conceito:**
- WhatsApp permite mensagens "livres" (free-form) apenas dentro de 24h após última mensagem do cliente
- Fora da janela, empresa só pode enviar **templates aprovados**

**Implementação no Sistema:**

**Cálculo da Janela:**
```python
last_customer_message_at = conversation.last_customer_message_at
twenty_four_hour_window_expires_at = last_customer_message_at + timedelta(hours=24)

if datetime.now() < twenty_four_hour_window_expires_at:
    can_send_free_form = True
else:
    can_send_free_form = False  # Apenas templates
```

**Comportamento:**
1. Cliente envia mensagem → timer inicia (24h)
2. Empresa pode responder livremente durante 24h
3. A cada nova mensagem do cliente, timer **reseta** (mais 24h)
4. Após expirar:
   - Botão "Enviar mensagem livre" desabilitado
   - Apenas botão "Enviar Template" disponível
   - Indicador visual no inbox mostrando status da janela

**Indicadores Visuais no Inbox:**
- 🟢 **Dentro da janela** (0-20h): Badge verde "Mensagem livre disponível"
- 🟡 **Perto de expirar** (20-24h): Badge amarelo "Janela expira em Xh"
- 🔴 **Fora da janela** (>24h): Badge vermelho "Apenas templates"
- Timer countdown: "Expira em: 2h 15min"

**Envio de Template fora da Janela:**
1. Agente clica "Enviar Template"
2. Modal abre com seletor de templates aprovados
3. Preenche variáveis
4. Preview
5. Confirma envio
6. **Timer reseta** (inicia nova janela de 24h)

**Casos Especiais:**
- **Primeira mensagem para contato**: Sempre usar template (sem janela prévia)
- **Campanhas**: Sempre usam templates
- **Mensagens ativas** (empresa inicia): Sempre templates
- **Mensagens reativas** (cliente inicia): Dentro da janela = livre

**Atualização Automática:**
- WebSocket atualiza status em tempo real
- Quando janela expira, UI atualiza automaticamente
- Notificação para agente: "Janela de 24h expirou para [Contato]"

### RN-005: Rate Limiting
- Campanhas: máximo 100 msg/min (evitar bloqueio WhatsApp)
- API: 1000 requests/min por organização
- Webhooks: 3 tentativas com exponential backoff

### RN-006: Opt-in e Opt-out
- Respeitar opt-out (contato solicitou não receber mensagens)
- Não enviar campanhas para contatos com opt-out
- Manter registro de data/hora do opt-out
- LGPD compliance

### RN-007: Handoff (Bot → Humano)
- Bot deve transferir se:
  - Usuário solicitar (keywords: "atendente", "falar com humano")
  - Bot não entender após 3 tentativas
  - Configuração de horário (ex: fora do horário, apenas bot)
- Contexto deve ser passado para o agente
- Agente pode devolver para bot

### RN-008: Atribuição de Conversas
- Conversa só pode estar atribuída a 1 agente por vez
- Regras de auto-atribuição:
  - Round-robin: distribuir igualmente
  - Load-balancing: quem tem menos conversas abertas
  - Por habilidade/departamento
- Agente pode transferir para outro

### RN-009: Resolução de Conversas
- Conversa resolvida = problema do cliente foi solucionado
- Após resolver, solicitar avaliação (opcional)
- Conversa pode ser reaberta se cliente enviar nova mensagem
- Métricas de resolução para analytics

### RN-010: Duplicidade de Contatos
- Contato identificado por telefone WhatsApp (único por organização)
- Ao importar CSV, detectar duplicatas
- Opções: atualizar dados ou pular
- Não permitir 2 contatos com mesmo telefone

### RN-011: Segurança de Dados
- Senhas: hash com bcrypt (cost 12)
- Tokens API: criptografados
- WhatsApp tokens: criptografados em repouso
- HTTPS obrigatório para webhooks
- Logs de acesso a dados sensíveis

### RN-012: Multi-tenancy
- Isolamento completo entre organizações
- Queries sempre filtradas por `organization_id`
- Usuário não pode acessar dados de outra organização
- API keys têm escopo de organização

### RN-013: Soft Delete
- Deleções são soft (campo `deleted_at`)
- Dados não são removidos fisicamente (compliance)
- Queries filtram `deleted_at IS NULL`
- Hard delete apenas após período de retenção (ex: 1 ano)

### RN-014: Versionamento de Chatbots
- Cada publicação cria nova versão
- Versão anterior fica em histórico
- Possível restaurar versão anterior
- Mudanças não afetam conversas em andamento (usam versão atual até finalizar)

### RN-015: Webhooks
- Validação de assinatura obrigatória
- Timeout de 10s para resposta
- Retry em caso de falha (3x com backoff)
- Desativar webhook após 10 falhas consecutivas

---

## 🔗 Integrações Previstas

### Fase 1 (MVP)
- ✅ WhatsApp Cloud API (Meta)
- ✅ Webhooks genéricos
- ✅ API REST completa

### Fase 2
- 📧 Email (SMTP)
- 📊 Google Sheets
- 🔌 Zapier
- 🛍️ Shopify básico

### Fase 3
- 🛒 WooCommerce
- 📈 HubSpot CRM
- 💼 Salesforce
- 🗓️ Google Calendar / Calendly
- 🤖 Make.com (Integromat)

### Fase 4 (Futuro)
- 💬 Instagram Direct
- 💬 Facebook Messenger
- 💬 Telegram
- 💻 Slack
- 🎨 Canva (para criar imagens)
- 📊 Google Analytics
- 💳 Stripe/MercadoPago (pagamentos)

---

**Versão:** 1.0.0
**Última atualização:** 2025-10-03
**Próxima revisão:** Após feedback inicial
