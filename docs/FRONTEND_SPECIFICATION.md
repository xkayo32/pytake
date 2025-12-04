# PYTAKE - Documento de Especificacao Frontend

## VISAO GERAL DO PROJETO

| Item | Descricao |
|------|-----------|
| **Nome** | PyTake |
| **Nicho** | SaaS de Automacao de WhatsApp Business |
| **Publico-alvo** | Empresas que usam WhatsApp para atendimento e marketing |
| **Modelo** | Multi-tenant (varias empresas na mesma plataforma) |

### O que e o PyTake?
Uma plataforma completa de automacao de WhatsApp Business que permite:
- Gerenciar multiplos numeros de WhatsApp
- Criar chatbots visuais com fluxos de conversa
- Realizar campanhas de mensagens em massa
- Atender clientes em tempo real com multiplos agentes
- Analisar metricas e desempenho

---

## TIPOS DE USUARIO (Roles)

| Role | Permissoes |
|------|------------|
| **super_admin** | Acesso total, gerencia todas as organizacoes |
| **org_admin** | Administrador da organizacao, gerencia usuarios e configuracoes |
| **agent** | Atendente, responde conversas e gerencia contatos |
| **viewer** | Somente visualizacao, nao pode editar |

---

## ESTRUTURA DE PAGINAS

### 1. AUTENTICACAO (`/auth/*`)

#### 1.1 Login (`/auth/login`)
```
Elementos:
- Logo PyTake
- Input: Email
- Input: Senha
- Checkbox: "Lembrar de mim"
- Botao: "Entrar"
- Link: "Esqueci minha senha"
- Link: "Criar conta"
- Divisor: "ou"
- Botoes OAuth (opcional futuro)

Validacoes:
- Email valido
- Senha minimo 8 caracteres
- Rate limit: 5 tentativas/minuto (mostrar erro)

Fluxo:
POST /auth/login -> JWT tokens -> Redirect /dashboard
```

#### 1.2 Registro (`/auth/register`)
```
Elementos:
- Input: Nome completo
- Input: Email corporativo
- Input: Senha
- Input: Confirmar senha
- Input: Nome da empresa/organizacao
- Input: Telefone (opcional)
- Checkbox: "Aceito os termos de uso"
- Botao: "Criar conta"
- Link: "Ja tenho conta"

Validacoes:
- Email unico
- Senha: 8+ chars, 1 maiuscula, 1 numero
- Nome da organizacao unico
- Rate limit: 3 registros/hora

Fluxo:
POST /auth/register -> Criar org + user -> Login automatico
```

#### 1.3 Recuperar Senha (`/auth/forgot-password`)
```
Elementos:
- Input: Email
- Botao: "Enviar link de recuperacao"
- Mensagem de sucesso
```

#### 1.4 Redefinir Senha (`/auth/reset-password/:token`)
```
Elementos:
- Input: Nova senha
- Input: Confirmar senha
- Botao: "Redefinir senha"
```

---

### 2. DASHBOARD (`/dashboard`)

```
Layout Principal:
+----------------------------------------------------------+
| Header: Logo | Busca Global | Notificacoes | Perfil      |
+--------+-----------------------------------------------------+
|        |                                                    |
| Sidebar|              Conteudo Principal                    |
|  Menu  |                                                    |
|        |                                                    |
+--------+-----------------------------------------------------+
```

#### Sidebar Menu:
```
Dashboard
Conversas
Contatos
Chatbots
Campanhas
Automacoes
Analytics
Configuracoes
  - Numeros WhatsApp
  - Equipe
  - Departamentos
  - Filas
  - Integracoes
  - Segredos
```

#### Cards do Dashboard:
```
ROW 1: KPIs Principais
+------------+ +------------+ +------------+ +------------+
| Conversas  | | Mensagens  | | Contatos   | | Agentes    |
|  Ativas    | |   Hoje     | |  Novos     | |  Online    |
|   127      | |  1,842     | |   45       | |   8/12     |
|  +12%      | |  +23%      | |  +5%       | |            |
+------------+ +------------+ +------------+ +------------+

ROW 2: Graficos
+---------------------------+ +---------------------------+
|  Mensagens por Hora       | |  Status Conversas         |
|  [Line Chart]             | |  [Pie Chart]              |
|                           | |  - Abertas: 45%           |
|                           | |  - Pendentes: 30%         |
|                           | |  - Resolvidas: 25%        |
+---------------------------+ +---------------------------+

ROW 3: Atividade Recente
+----------------------------------------------------------+
|  Ultimas Conversas        | Performance Agentes          |
|  - Joao - 2min atras      | - Maria: 45 atendimentos     |
|  - Maria - 5min atras     | - Joao: 38 atendimentos      |
+----------------------------------------------------------+

API:
GET /analytics/overview
GET /analytics/time-series/messages
GET /conversations?status=open&limit=5
GET /users?role=agent
```

---

### 3. CONVERSAS (`/conversations`)

#### 3.1 Lista de Conversas (Layout WhatsApp-like)
```
+----------------------------------------------------------+
| +-------------+------------------------------------------+
| |  LISTA      |         CHAT ATIVO                       |
| |             |                                          |
| | [Filtros]   |  +-----------------------------------+   |
| | [ ] Abertas |  | Header: Nome | Status | Acoes     |   |
| | [ ] Pendentes| +-----------------------------------+   |
| | [ ] Minhas  |  |                                   |   |
| |             |  |     Area de Mensagens             |   |
| | +---------+ |  |     (scroll infinito)             |   |
| | | Avatar  | |  |                                   |   |
| | | Nome    | |  |  [Msg entrada]                    |   |
| | | Preview | |  |            [Msg saida]            |   |
| | | Horario | |  |  [Msg entrada]                    |   |
| | +---------+ |  |                                   |   |
| | +---------+ |  +-----------------------------------+   |
| | | ...     | |  | Input: Digite sua mensagem...    |   |
| | +---------+ |  | [Anexo] [Emoji] [Enviar]         |   |
| |             |  +-----------------------------------+   |
| +-------------+------------------------------------------+
|                                                          |
| PAINEL LATERAL DIREITO (toggle):                         |
| +------------------------------------------------------+ |
| | Informacoes do Contato                               | |
| | - Nome, Telefone, Email                              | |
| | - Tags                                               | |
| | - Propriedades customizadas                          | |
| | - Historico de conversas anteriores                  | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+

Funcionalidades:
- Busca por nome/telefone/mensagem
- Filtros: status, departamento, fila, agente
- Ordenacao: recentes, nao lidas, aguardando
- Badge de mensagens nao lidas
- Indicador de typing em tempo real
- Status de entrega (enviado, entregue, lido)

Acoes do Chat:
- Atribuir para mim
- Transferir para outro agente
- Transferir para departamento
- Fechar conversa
- Reabrir conversa
- Adicionar nota interna
- Enviar arquivo/midia

APIs:
GET /conversations
GET /conversations/{id}
GET /conversations/{id}/messages
POST /conversations/{id}/send-message
POST /conversations/{id}/assign
POST /conversations/{id}/transfer
POST /conversations/{id}/close
WebSocket: atualizacoes em tempo real
```

---

### 4. CONTATOS (`/contacts`)

#### 4.1 Lista de Contatos
```
+----------------------------------------------------------+
| Header: "Contatos" | [+ Novo Contato] [Importar] [Export] |
+----------------------------------------------------------+
| Filtros: [Busca...] [Tags] [Origem] [Data]               |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | [ ] | Avatar | Nome        | Telefone    | Tags  | : | |
| +-----+--------+-------------+-------------+-------+---+ |
| | [ ] |   U    | Joao Silva  | +5511999... | VIP   | : | |
| | [ ] |   U    | Maria Santos| +5521988... | Lead  | : | |
| +------------------------------------------------------+ |
|                                                          |
| Paginacao: < 1 2 3 ... 50 >                              |
+----------------------------------------------------------+

Acoes em massa:
- Adicionar tags
- Remover tags
- Exportar selecionados
- Adicionar a campanha
- Deletar

APIs:
GET /contacts
GET /contacts/stats
POST /contacts
PUT /contacts/{id}
DELETE /contacts/{id}
```

#### 4.2 Detalhe do Contato (`/contacts/:id`)
```
+----------------------------------------------------------+
| +---------------------+ +-------------------------------+ |
| |                     | | Tabs:                         | |
| |   AVATAR            | | [Informacoes] [Conversas]     | |
| |   Joao Silva        | | [Atividade] [Notas]           | |
| |   +55 11 99999-9999 | |                               | |
| |                     | | +---------------------------+ | |
| |   Tags:             | | | Campo      | Valor        | | |
| |   [VIP] [Lead]      | | | Email      | joao@...     | | |
| |                     | | | Empresa    | Acme Inc     | | |
| |   [Iniciar Chat]    | | | Cargo      | Gerente      | | |
| |   [Editar]          | | | Criado em  | 01/01/2024   | | |
| |                     | | +---------------------------+ | |
| +---------------------+ +-------------------------------+ |
+----------------------------------------------------------+
```

---

### 5. CHATBOTS (`/chatbots`)

#### 5.1 Lista de Chatbots
```
+----------------------------------------------------------+
| Header: "Chatbots" | [+ Novo Chatbot]                     |
+----------------------------------------------------------+
| +-------------------+ +-------------------+               |
| | Atendimento       | | Vendas            |               |
| |                   | |                   |               |
| | Status: Ativo     | | Status: Inativo   |               |
| | Fluxos: 5         | | Fluxos: 3         |               |
| | Execucoes: 1,234  | | Execucoes: 567    |               |
| |                   | |                   |               |
| | [Editar] [Stats]  | | [Editar] [Stats]  |               |
| +-------------------+ +-------------------+               |
+----------------------------------------------------------+

APIs:
GET /chatbots
POST /chatbots
GET /chatbots/{id}/stats
POST /chatbots/{id}/publish
POST /chatbots/{id}/unpublish
```

#### 5.2 Editor de Fluxos (`/chatbots/:id/flows/:flowId`) - PAGINA MAIS COMPLEXA

```
+----------------------------------------------------------+
| Toolbar:                                                  |
| [Voltar] [Salvar] [Publicar] [Testar] [Gerar IA]         |
+--------+-------------------------------------------------+
|        |                                                  |
| NODES  |           CANVAS (React Flow / XY Flow)         |
| PANEL  |                                                  |
|        |    +-----+                                       |
| Arraste|    |Start|                                       |
| para   |    +--+--+                                       |
| canvas |       |                                          |
|        |       v                                          |
| +-----+|  +---------+      +---------+                   |
| | Msg ||  |Mensagem |------|Condicao |                   |
| +-----+|  |"Ola!"   |      |se X > 5 |                   |
| +-----+|  +---------+      +----+----+                   |
| |Cond ||                    Sim | Nao                    |
| +-----+|                        |   |                    |
| +-----+|                   +----+---+                    |
| |Acao ||                   v        v                    |
| +-----+|              +--------+ +--------+              |
| +-----+|              | Acao A | | Acao B |              |
| |Var  ||              +--------+ +--------+              |
| +-----+|                                                  |
+--------+-------------------------------------------------+
| PAINEL DE PROPRIEDADES (ao selecionar no):               |
| +------------------------------------------------------+ |
| | Tipo: Mensagem                                       | |
| | Conteudo: [                                    ]     | |
| | Variaveis: {{nome}}, {{telefone}}                    | |
| | Delay: [2] segundos                                  | |
| | [Deletar No]                                         | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+

Tipos de Nos:
- Mensagem: Envia texto/midia
- Condicao: Ramifica baseado em logica
- Acao: Executa acao (API, atribuir, tag, etc)
- Variavel: Define/modifica variavel
- Delay: Aguarda tempo
- Input: Aguarda resposta do usuario
- Fim: Finaliza fluxo

Funcionalidade IA:
[Gerar com IA]
+------------------------------------------+
| Descreva o fluxo que voce quer criar:    |
| +--------------------------------------+ |
| | "Crie um fluxo de atendimento que    | |
| |  pergunta o nome, o problema, e      | |
| |  direciona para o departamento       | |
| |  correto"                            | |
| +--------------------------------------+ |
| [Gerar Fluxo]                            |
+------------------------------------------+

APIs:
GET /chatbots/{id}/flows
POST /chatbots/{id}/flows
GET /chatbots/flows/{id}/full
PUT /chatbots/flows/{id}
POST /chatbots/{id}/nodes
PUT /chatbots/nodes/{id}
DELETE /chatbots/nodes/{id}
POST /ai-assistant/generate-flow
POST /ai-assistant/suggest-improvements
```

---

### 6. CAMPANHAS (`/campaigns`)

#### 6.1 Lista de Campanhas
```
+----------------------------------------------------------+
| Header: "Campanhas" | [+ Nova Campanha]                   |
+----------------------------------------------------------+
| Tabs: [Todas] [Rascunho] [Agendadas] [Em execucao] [Finalizadas]
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | Nome           | Status    | Enviadas | Abertura | : | |
| +----------------+-----------+----------+----------+---+ |
| | Black Friday   | Ativa     | 1,500    | 45%      | : | |
| | Natal 2024     | Agendada  | -        | -        | : | |
| | Reengajamento  | Concluida | 3,200    | 38%      | : | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+

APIs:
GET /campaigns
POST /campaigns
GET /campaigns/{id}/stats
GET /campaigns/{id}/progress
```

#### 6.2 Criar/Editar Campanha (`/campaigns/new` ou `/campaigns/:id/edit`)
```
Wizard em Steps:

STEP 1 - Configuracao Basica
+----------------------------------------------------------+
| Nome da Campanha: [________________________]              |
| Descricao: [_____________________________________]       |
| Numero WhatsApp: [Selecionar]                            |
+----------------------------------------------------------+

STEP 2 - Audiencia
+----------------------------------------------------------+
| Selecionar Contatos:                                      |
| ( ) Todos os contatos                                     |
| ( ) Por tags: [Tag 1] [Tag 2]                            |
| ( ) Por filtro avancado                                   |
| ( ) Importar lista (CSV)                                  |
|                                                          |
| Preview: 1,234 contatos selecionados                     |
| [Ver preview da audiencia]                                |
+----------------------------------------------------------+

STEP 3 - Mensagem
+----------------------------------------------------------+
| Tipo: ( ) Template aprovado  ( ) Mensagem personalizada  |
|                                                          |
| Template: [Selecionar template]                          |
|                                                          |
| Preview:                                                  |
| +------------------------------------------------------+ |
| | Ola {{nome}}!                                        | |
| |                                                      | |
| | Temos uma oferta especial para voce...               | |
| +------------------------------------------------------+ |
|                                                          |
| Variaveis disponiveis: {{nome}}, {{telefone}}, {{email}} |
+----------------------------------------------------------+

STEP 4 - Agendamento
+----------------------------------------------------------+
| Quando enviar:                                            |
| ( ) Agora                                                 |
| ( ) Agendar para: [Data] [Hora]                          |
|                                                          |
| Velocidade de envio: [100] mensagens por minuto          |
+----------------------------------------------------------+

STEP 5 - Revisao
+----------------------------------------------------------+
| Resumo da Campanha:                                       |
| - Nome: Black Friday 2024                                 |
| - Audiencia: 1,234 contatos                              |
| - Agendamento: 25/11/2024 as 09:00                       |
| - Custo estimado: R$ XX,XX                               |
|                                                          |
| [Salvar Rascunho] [Agendar Campanha]                     |
+----------------------------------------------------------+

APIs:
POST /campaigns
PUT /campaigns/{id}
GET /campaigns/{id}/audience/preview
POST /campaigns/{id}/schedule
POST /campaigns/{id}/start
```

#### 6.3 Detalhes da Campanha (`/campaigns/:id`)
```
+----------------------------------------------------------+
| "Black Friday 2024"                     [Pausar] [Menu]  |
+----------------------------------------------------------+
| Status: Em execucao                                       |
| Progresso: [============........] 65% (845/1,300)        |
+----------------------------------------------------------+
| +---------+ +---------+ +---------+ +---------+          |
| |Enviadas | |Entregues| | Lidas   | | Erros   |          |
| |  845    | |   812   | |   456   | |   33    |          |
| +---------+ +---------+ +---------+ +---------+          |
+----------------------------------------------------------+
| Grafico de envio ao longo do tempo                        |
| [Line Chart - mensagens por hora]                         |
+----------------------------------------------------------+
```

---

### 7. AUTOMACOES DE FLUXO (`/automations`)

```
+----------------------------------------------------------+
| Header: "Automacoes" | [+ Nova Automacao]                 |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | Nome              | Gatilho      | Status  | Acoes   | |
| +-------------------+--------------+---------+---------+ |
| | Boas-vindas       | Novo contato | Ativo   |   :     | |
| | Follow-up 24h     | Agendado     | Ativo   |   :     | |
| | Aniversario       | Data especial| Parado  |   :     | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+

Criar Automacao:
+----------------------------------------------------------+
| Nome: [_____________________]                             |
|                                                          |
| Gatilho:                                                  |
| ( ) Novo contato criado                                   |
| ( ) Tag adicionada: [Selecionar tag]                     |
| ( ) Agendamento recorrente: [Cron expression]            |
| ( ) Data do contato (aniversario, etc)                   |
|                                                          |
| Fluxo a executar: [Selecionar chatbot/fluxo]             |
|                                                          |
| Audiencia: [Configurar filtros...]                        |
+----------------------------------------------------------+

APIs:
GET /flow-automations
POST /flow-automations
PUT /flow-automations/{id}
POST /flow-automations/{id}/activate
POST /flow-automations/{id}/deactivate
POST /flow-automations/{id}/schedule
```

---

### 8. ANALYTICS (`/analytics`)

```
+----------------------------------------------------------+
| Periodo: [Ultimos 7 dias] [01/01 - 07/01]                |
+----------------------------------------------------------+
| Tabs: [Visao Geral] [Conversas] [Agentes] [Campanhas] [Chatbots]
+----------------------------------------------------------+
|                                                          |
| VISAO GERAL:                                              |
| +---------+ +---------+ +---------+ +---------+          |
| |Total    | |Mensagens| |Tempo    | |Satisfacao|         |
| |Conversas| |Trocadas | |Medio    | |(CSAT)   |          |
| |  2,345  | | 45,678  | | 4.5min  | |  4.2/5  |          |
| |  +15%   | |  +23%   | |  -10%   | |  +0.3   |          |
| +---------+ +---------+ +---------+ +---------+          |
|                                                          |
| +------------------------------------------------------+ |
| | Grafico: Conversas por dia                           | |
| | [Area Chart com linhas comparativas]                 | |
| +------------------------------------------------------+ |
|                                                          |
| +--------------------+ +----------------------------+    |
| | Por Departamento   | | Por Status                 |    |
| | [Bar Chart]        | | [Donut Chart]              |    |
| +--------------------+ +----------------------------+    |
|                                                          |
| PERFORMANCE DOS AGENTES:                                  |
| +------------------------------------------------------+ |
| | Agente    | Atendimentos | Tempo Medio | Satisfacao | |
| | Maria     |     145      |    3.2min   |   4.5      | |
| | Joao      |     132      |    4.1min   |   4.3      | |
| | Pedro     |     98       |    5.0min   |   4.0      | |
| +------------------------------------------------------+ |
|                                                          |
| [Exportar Relatorio]                                      |
+----------------------------------------------------------+

APIs:
GET /analytics/overview
GET /analytics/conversations
GET /analytics/agents
GET /analytics/campaigns
GET /analytics/chatbots
GET /analytics/messages
GET /analytics/time-series/messages
GET /analytics/reports/full
```

---

### 9. CONFIGURACOES (`/settings/*`)

#### 9.1 Numeros WhatsApp (`/settings/whatsapp`)
```
+----------------------------------------------------------+
| "Numeros WhatsApp" | [+ Adicionar Numero]                 |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | +55 11 99999-9999                                    | |
| | Status: Conectado                                    | |
| | Tipo: Meta Business API                              | |
| | Mensagens hoje: 234                                  | |
| | [Configurar] [Templates] [Desconectar]               | |
| +------------------------------------------------------+ |
| +------------------------------------------------------+ |
| | +55 21 88888-8888                                    | |
| | Status: Desconectado                                 | |
| | [Reconectar via QR Code]                             | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+

Modal: Conectar via QR Code
+----------------------------------------------------------+
| Escaneie o QR Code com seu WhatsApp                       |
|                                                          |
|         +------------------+                              |
|         |                  |                              |
|         |    QR CODE       |                              |
|         |                  |                              |
|         +------------------+                              |
|                                                          |
| Aguardando conexao...                                     |
+----------------------------------------------------------+

APIs:
GET /whatsapp
POST /whatsapp
GET /whatsapp/{id}/qr
PUT /whatsapp/{id}
DELETE /whatsapp/{id}
GET /whatsapp/{id}/templates
POST /whatsapp/{id}/sync-templates
```

#### 9.2 Equipe/Usuarios (`/settings/team`)
```
+----------------------------------------------------------+
| "Equipe" | [+ Convidar Membro]                            |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | [ ] | Avatar | Nome        | Email       | Role | :  | |
| +-----+--------+-------------+-------------+------+----+ |
| |     |   U    | Admin       | admin@...   |Admin | :  | |
| | [ ] |   U    | Maria       | maria@...   |Agent | :  | |
| | [ ] |   U    | Joao        | joao@...    |Agent | :  | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+

Modal: Convidar Membro
+----------------------------------------------------------+
| Email: [_________________________]                        |
| Nome: [_________________________]                         |
| Role: [Agent]                                             |
| Departamento: [Selecionar]                                |
| Skills: [ ] Vendas  [ ] Suporte  [ ] Financeiro          |
|                                                          |
| [Cancelar] [Enviar Convite]                               |
+----------------------------------------------------------+

APIs:
GET /users
POST /users
PUT /users/{id}
DELETE /users/{id}
POST /users/{id}/activate
POST /users/{id}/deactivate
GET /users/{id}/skills
POST /users/{id}/skills
```

#### 9.3 Departamentos (`/settings/departments`)
```
+----------------------------------------------------------+
| "Departamentos" | [+ Novo Departamento]                   |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | Vendas                                               | |
| | Agentes: 5 | Filas: 2 | Conversas ativas: 23         | |
| | [Editar] [Gerenciar Filas]                           | |
| +------------------------------------------------------+ |
| | Suporte                                              | |
| | Agentes: 8 | Filas: 3 | Conversas ativas: 45         | |
| | [Editar] [Gerenciar Filas]                           | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+

APIs:
GET /departments
POST /departments
PUT /departments/{id}
DELETE /departments/{id}
GET /departments/stats
```

#### 9.4 Filas (`/settings/queues`)
```
Similar a departamentos, com gerenciamento de:
- Prioridade da fila
- Agentes atribuidos
- Regras de distribuicao
- SLA/tempo maximo

APIs:
GET /queues
POST /queues
PUT /queues/{id}
POST /queues/{id}/assign
DELETE /queues/{id}/agents/{agent_id}
```

#### 9.5 Integracoes/Segredos (`/settings/integrations`)
```
+----------------------------------------------------------+
| "Integracoes & API Keys"                                  |
+----------------------------------------------------------+
| Meta/WhatsApp Business:                                   |
| +------------------------------------------------------+ |
| | Access Token: **************** [Ver] [Editar]        | |
| | Phone Number ID: 123456789                           | |
| | Business Account ID: 987654321                       | |
| +------------------------------------------------------+ |
|                                                          |
| OpenAI (para IA):                                         |
| +------------------------------------------------------+ |
| | API Key: **************** [Configurar]               | |
| +------------------------------------------------------+ |
|                                                          |
| [+ Adicionar Integracao]                                  |
+----------------------------------------------------------+

APIs:
GET /secrets
POST /secrets
PUT /secrets/{id}
DELETE /secrets/{id}
GET /ai-assistant/settings
POST /ai-assistant/settings
```

#### 9.6 Minha Organizacao (`/settings/organization`)
```
+----------------------------------------------------------+
| "Configuracoes da Organizacao"                            |
+----------------------------------------------------------+
| Logo: [Upload]                                            |
| Nome: [Minha Empresa_______________]                      |
| Slug: [minha-empresa_______________]                      |
|                                                          |
| Plano Atual: Premium                                      |
| Limites:                                                  |
| - Usuarios: 10/15                                         |
| - Numeros WhatsApp: 2/5                                   |
| - Mensagens/mes: 8,500/10,000                            |
|                                                          |
| [Salvar Alteracoes]                                       |
+----------------------------------------------------------+

APIs:
GET /organizations/me
PUT /organizations/me
PUT /organizations/me/settings
```

#### 9.7 Meu Perfil (`/settings/profile`)
```
+----------------------------------------------------------+
| "Meu Perfil"                                              |
+----------------------------------------------------------+
| Avatar: [Foto]                                            |
| Nome: [Joao Silva_______________]                         |
| Email: joao@empresa.com (nao editavel)                    |
| Telefone: [+55 11 99999-9999____]                         |
|                                                          |
| Alterar Senha:                                            |
| Senha atual: [_______________]                            |
| Nova senha: [_______________]                             |
| Confirmar: [_______________]                              |
|                                                          |
| [Salvar Alteracoes]                                       |
+----------------------------------------------------------+

APIs:
GET /auth/me
PUT /users/me
```

---

### 10. TEMPLATES DE MENSAGEM (`/settings/templates`)

```
+----------------------------------------------------------+
| "Templates de Mensagem" | [+ Criar Template] [Sync]       |
+----------------------------------------------------------+
| Filtros: [Todos] [Aprovados] [Categoria]                 |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | boas_vindas                     Status: Aprovado     | |
| | Categoria: MARKETING                                 | |
| | "Ola {{1}}! Bem-vindo a nossa loja..."               | |
| | [Editar] [Usar em Campanha] [Deletar]                | |
| +------------------------------------------------------+ |
| | confirmacao_pedido              Status: Pendente     | |
| | Categoria: TRANSACTIONAL                             | |
| | "Seu pedido #{{1}} foi confirmado..."                | |
| | [Editar] [Deletar]                                   | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+

APIs:
GET /whatsapp/{id}/templates
POST /whatsapp/{id}/templates
PUT /whatsapp/{id}/templates/{template_id}
DELETE /whatsapp/{id}/templates/{template_id}
POST /whatsapp/{id}/sync-templates
```

---

## COMPONENTES REUTILIZAVEIS

```
Componentes Base:
- Button (primary, secondary, danger, ghost)
- Input (text, password, email, phone, textarea)
- Select (single, multi, searchable)
- Modal (sizes: sm, md, lg, xl, fullscreen)
- Dropdown (menu, actions)
- Table (sortable, selectable, pagination)
- Card
- Badge (status, count)
- Avatar (with status indicator)
- Tabs
- Tooltip
- Toast/Notification
- Loading/Spinner
- Empty State
- Breadcrumb
- Pagination

Componentes Especificos:
- ConversationList
- ChatWindow
- MessageBubble (in/out, status, media)
- ContactCard
- FlowCanvas (React Flow)
- FlowNode (tipos diferentes)
- CampaignWizard
- AnalyticsChart
- KPICard
- DateRangePicker
- PhoneInput (com mascara internacional)
- TagInput
- FileUpload
- QRCodeDisplay
- StatusBadge (online/offline/away)
- TemplatePreview
```

---

## INTERACOES EM TEMPO REAL (WebSocket)

```typescript
// Eventos que o frontend deve escutar:

// Conversas
socket.on('conversation:new', (data) => {})
socket.on('conversation:updated', (data) => {})
socket.on('conversation:assigned', (data) => {})

// Mensagens
socket.on('message:new', (data) => {})
socket.on('message:status', (data) => {}) // sent, delivered, read

// Presenca
socket.on('agent:online', (data) => {})
socket.on('agent:offline', (data) => {})
socket.on('agent:typing', (data) => {})

// Notificacoes
socket.on('notification:new', (data) => {})

// Campanhas
socket.on('campaign:progress', (data) => {})
socket.on('campaign:completed', (data) => {})
```

---

## RESPONSIVIDADE

```
Breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

Mobile-specific:
- Menu hamburguer para sidebar
- Chat em tela cheia
- Tabs em vez de sidebar para navegacao
- Botoes maiores para touch
- Swipe para acoes em listas
```

---

## STACK RECOMENDADA

```
Framework:      Next.js 14+ (App Router)
Linguagem:      TypeScript
UI Library:     shadcn/ui + Tailwind CSS
Estado:         Zustand ou TanStack Query
Graficos:       Recharts ou Chart.js
Flow Builder:   React Flow (xyflow)
Forms:          React Hook Form + Zod
HTTP:           Axios ou fetch nativo
WebSocket:      Socket.io-client
Data Tables:    TanStack Table
Datas:          date-fns
Internac.:      next-intl (PT-BR + EN)
```

---

## RESUMO DE PAGINAS

| # | Pagina | Rota | Prioridade |
|---|--------|------|------------|
| 1 | Login | `/auth/login` | Alta |
| 2 | Registro | `/auth/register` | Alta |
| 3 | Dashboard | `/dashboard` | Alta |
| 4 | Conversas | `/conversations` | Alta |
| 5 | Contatos | `/contacts` | Alta |
| 6 | Lista Chatbots | `/chatbots` | Alta |
| 7 | Editor de Fluxos | `/chatbots/:id/flows/:flowId` | Alta |
| 8 | Campanhas | `/campaigns` | Media |
| 9 | Nova Campanha | `/campaigns/new` | Media |
| 10 | Automacoes | `/automations` | Media |
| 11 | Analytics | `/analytics` | Media |
| 12 | Config: WhatsApp | `/settings/whatsapp` | Alta |
| 13 | Config: Equipe | `/settings/team` | Media |
| 14 | Config: Departamentos | `/settings/departments` | Baixa |
| 15 | Config: Filas | `/settings/queues` | Baixa |
| 16 | Config: Integracoes | `/settings/integrations` | Media |
| 17 | Config: Organizacao | `/settings/organization` | Baixa |
| 18 | Config: Perfil | `/settings/profile` | Baixa |
| 19 | Templates | `/settings/templates` | Media |

---

## ENDPOINTS DA API (RESUMO)

### Autenticacao
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
GET    /auth/verify-token
```

### Usuarios
```
GET    /users/
POST   /users/
GET    /users/me
PUT    /users/me
GET    /users/{user_id}
PUT    /users/{user_id}
DELETE /users/{user_id}
POST   /users/{user_id}/activate
POST   /users/{user_id}/deactivate
GET    /users/{user_id}/skills
POST   /users/{user_id}/skills
```

### Organizacoes
```
GET    /organizations/me
PUT    /organizations/me
PUT    /organizations/me/settings
GET    /organizations/{org_id}
PUT    /organizations/{org_id}
```

### Contatos
```
GET    /contacts/
POST   /contacts/
GET    /contacts/stats
GET    /contacts/{contact_id}
PUT    /contacts/{contact_id}
DELETE /contacts/{contact_id}
```

### Conversas
```
GET    /conversations/
POST   /conversations/
GET    /conversations/metrics
GET    /conversations/{conv_id}
PUT    /conversations/{conv_id}
POST   /conversations/{conv_id}/assign
POST   /conversations/{conv_id}/transfer
POST   /conversations/{conv_id}/close
POST   /conversations/{conv_id}/reopen
POST   /conversations/{conv_id}/send-message
GET    /conversations/{conv_id}/messages
```

### WhatsApp
```
GET    /whatsapp/
POST   /whatsapp/
GET    /whatsapp/{number_id}
PUT    /whatsapp/{number_id}
DELETE /whatsapp/{number_id}
GET    /whatsapp/{number_id}/qr
GET    /whatsapp/{number_id}/templates
POST   /whatsapp/{number_id}/templates
POST   /whatsapp/{number_id}/sync-templates
```

### Chatbots
```
GET    /chatbots/
POST   /chatbots/
GET    /chatbots/{bot_id}
GET    /chatbots/{bot_id}/full
GET    /chatbots/{bot_id}/stats
PUT    /chatbots/{bot_id}
DELETE /chatbots/{bot_id}
POST   /chatbots/{bot_id}/publish
POST   /chatbots/{bot_id}/unpublish
GET    /chatbots/{bot_id}/flows
POST   /chatbots/{bot_id}/flows
GET    /chatbots/flows/{flow_id}
PUT    /chatbots/flows/{flow_id}
DELETE /chatbots/flows/{flow_id}
POST   /chatbots/{bot_id}/nodes
PUT    /chatbots/nodes/{node_id}
DELETE /chatbots/nodes/{node_id}
```

### Campanhas
```
GET    /campaigns/
POST   /campaigns/
GET    /campaigns/{campaign_id}
GET    /campaigns/{campaign_id}/stats
GET    /campaigns/{campaign_id}/progress
PUT    /campaigns/{campaign_id}
DELETE /campaigns/{campaign_id}
POST   /campaigns/{campaign_id}/start
POST   /campaigns/{campaign_id}/pause
POST   /campaigns/{campaign_id}/resume
POST   /campaigns/{campaign_id}/schedule
GET    /campaigns/{campaign_id}/audience/preview
```

### Automacoes
```
GET    /flow-automations/
POST   /flow-automations/
GET    /flow-automations/{auto_id}
GET    /flow-automations/{auto_id}/stats
PUT    /flow-automations/{auto_id}
DELETE /flow-automations/{auto_id}
POST   /flow-automations/{auto_id}/activate
POST   /flow-automations/{auto_id}/deactivate
POST   /flow-automations/{auto_id}/start
POST   /flow-automations/{auto_id}/schedule
```

### Analytics
```
GET    /analytics/overview
GET    /analytics/conversations
GET    /analytics/agents
GET    /analytics/campaigns
GET    /analytics/chatbots
GET    /analytics/messages
GET    /analytics/time-series/messages
GET    /analytics/reports/full
```

### Departamentos e Filas
```
GET    /departments/
POST   /departments/
GET    /departments/{dept_id}
PUT    /departments/{dept_id}
DELETE /departments/{dept_id}
GET    /departments/stats

GET    /queues/
POST   /queues/
GET    /queues/{queue_id}
PUT    /queues/{queue_id}
DELETE /queues/{queue_id}
POST   /queues/{queue_id}/assign
```

### Segredos
```
GET    /secrets/
POST   /secrets/
GET    /secrets/{secret_id}
PUT    /secrets/{secret_id}
DELETE /secrets/{secret_id}
```

### AI Assistant
```
GET    /ai-assistant/models
POST   /ai-assistant/settings
POST   /ai-assistant/generate-flow
POST   /ai-assistant/suggest-improvements
GET    /ai-assistant/templates
```
