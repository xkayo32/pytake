# Admin Dashboard - Cronograma de Desenvolvimento

## 🎯 Objetivo

Desenvolver todas as telas do painel administrativo do PyTake em ordem de prioridade, garantindo que as funcionalidades essenciais para operação sejam implementadas primeiro.

---

## 📊 Design System Status

### ✅ **Componentes Criados** (2025-10-10)
**Localização:** `frontend/src/components/admin/`

1. **PageHeader.tsx** - Header com gradiente indigo/purple e badges
2. **StatsCard.tsx** - Cards de estatísticas com trends e loading
3. **EmptyState.tsx** - Estados vazios consistentes
4. **ActionButton.tsx** - Botões de ação (5 variantes)
5. **DataTable.tsx** - Tabela de dados responsiva

**Tema:** Indigo/Purple gradients
**Dark Mode:** ✅ Suportado em todos componentes
**Documentação:** `ADMIN_DESIGN_SYSTEM.md`

### ✅ **Páginas Refatoradas** (2025-10-10)

1. **Dashboard** (`/admin/page.tsx`)
   - ✅ PageHeader com badge "Ao Vivo"
   - ✅ StatsCards (4 métricas principais)
   - ✅ Seção de métricas secundárias
   - ✅ Quick Actions com hover animations

2. **Conversas** (`/admin/conversations/page.tsx`)
   - ✅ PageHeader com badge "Tempo Real"
   - ✅ Empty state com gradiente e dicas
   - ✅ Banner de notificação

3. **WhatsApp** (`/admin/whatsapp/page.tsx`)
   - ✅ PageHeader com badge dinâmico
   - ✅ EmptyState component
   - ✅ Cards com hover lift animation
   - ✅ Dropdown menu com gradientes

---

## 📋 Cronograma por Prioridade

### 🔴 **FASE 1 - CRÍTICO** (Semana 1-2)
*Funcionalidades essenciais para o sistema funcionar*

#### 1.1 WhatsApp Configuration (`/admin/whatsapp`) ⭐ **PRIORIDADE MÁXIMA**
**Status:** ✅ **100% CONCLUÍDO** (com Evolution API + Design System)
**Prazo:** ~~3-4 dias~~ → Concluído
**Complexidade:** ⭐⭐⭐⭐ (expandido com Evolution API)
**Design:** ✅ Design System aplicado (2025-10-10)

**Por que é prioridade:**
- Sem número WhatsApp configurado, o sistema não funciona
- Integração com Meta Cloud API é a base de tudo
- Precisa de validação de webhook e token

**Funcionalidades Implementadas:**
- ✅ Listar números WhatsApp conectados
- ✅ **Dois tipos de conexão:**
  - ✅ **API Oficial (Meta Cloud API)** - Para empresas
  - ✅ **QR Code (Evolution API)** - Gratuito via WhatsApp Web
- ✅ Adicionar número via API Oficial:
  - ✅ Seletor de país com bandeiras (15 países)
  - ✅ Phone Number ID, Business Account ID, Access Token
  - ✅ Webhook URL pré-configurada
  - ✅ Verify Token auto-gerado (seguro)
- ✅ Adicionar número via QR Code:
  - ✅ Evolution API URL e API Key
  - ✅ Geração automática de instância
  - ✅ QR Code para escaneamento
- ✅ Tags visuais de tipo:
  - ✅ Badge "API Oficial" (azul)
  - ✅ Badge "QR Code" (verde)
- ✅ Editar configurações do número
- ✅ Ativar/Desativar número
- ✅ Deletar número (com confirmação)
- ✅ Status de conexão em tempo real

**Backend Implementado:**
- ✅ `POST /api/v1/whatsapp` - Criar número
- ✅ `GET /api/v1/whatsapp` - Listar números
- ✅ `GET /api/v1/whatsapp/{id}` - Buscar por ID
- ✅ `PUT /api/v1/whatsapp/{id}` - Atualizar
- ✅ `DELETE /api/v1/whatsapp/{id}` - Deletar
- ✅ `GET /api/v1/whatsapp/webhook` - Webhook verification (Meta)
- ✅ `POST /api/v1/whatsapp/webhook` - Receber mensagens (Meta)
- ✅ `POST /api/v1/whatsapp/{id}/qrcode` - Gerar QR Code (Evolution)
- ✅ `GET /api/v1/whatsapp/{id}/qrcode/status` - Status QR Code (Evolution)
- ✅ `POST /api/v1/whatsapp/{id}/disconnect` - Desconectar número

**Integrações:**
- ✅ Evolution API Client completo (`app/integrations/evolution_api.py`)
- ✅ Webhook handling para Meta Cloud API
- ✅ Configurações padrão seguras para Evolution

**Documentação:**
- ✅ `WHATSAPP_SETUP_COMPLETE.md` - Guia API Oficial
- ✅ `EVOLUTION_API_INTEGRATION.md` - Guia Evolution API completo

**Design:**
```
┌─────────────────────────────────────────┐
│ Números WhatsApp                        │
│                                         │
│ [+ Adicionar Número]                    │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ 🟢 +55 11 99999-9999                ││
│ │ Business Account: 123456789         ││
│ │ Status: Conectado                   ││
│ │ Webhook: ✅ Configurado              ││
│ │                                     ││
│ │ [Editar] [Testar] [Desativar]      ││
│ └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

---

#### 1.2 User Management (`/admin/users`) ⭐
**Status:** 🔴 Não iniciado
**Prazo:** 2-3 dias
**Complexidade:** ⭐⭐

**Por que é prioridade:**
- Administradores precisam criar agentes
- Gerenciamento de equipe é essencial
- Controle de acesso e permissões

**Funcionalidades:**
- [ ] Listar usuários/agentes
  - [ ] Filtro por role (Admin, Agent, Viewer)
  - [ ] Filtro por status (Ativo, Inativo)
  - [ ] Busca por nome/email
- [ ] Adicionar novo usuário
  - [ ] Email
  - [ ] Nome completo
  - [ ] Role (org_admin, agent, viewer)
  - [ ] Departamentos (para agents)
  - [ ] Enviar convite por email
- [ ] Editar usuário
  - [ ] Alterar role
  - [ ] Alterar departamentos
  - [ ] Resetar senha
  - [ ] Ativar/Desativar
- [ ] Visualizar detalhes do usuário
  - [ ] Última atividade
  - [ ] Conversas atendidas
  - [ ] Métricas de performance
- [ ] Deletar usuário (com confirmação)

**Backend necessário:**
- `GET /api/v1/users` - Listar usuários
- `POST /api/v1/users` - Criar usuário
- `PUT /api/v1/users/{id}` - Atualizar
- `DELETE /api/v1/users/{id}` - Deletar
- `POST /api/v1/users/{id}/reset-password` - Reset senha

---

#### 1.3 Queue Management (`/admin/queues`) ⭐
**Status:** 🔴 Não iniciado
**Prazo:** 2 dias
**Complexidade:** ⭐⭐

**Por que é prioridade:**
- Filas organizam o atendimento
- Agentes precisam de filas para trabalhar
- Permite distribuição de conversas

**Funcionalidades:**
- [ ] Listar filas
- [ ] Criar nova fila
  - [ ] Nome da fila
  - [ ] Descrição
  - [ ] Agentes associados (seleção múltipla)
  - [ ] Prioridade
  - [ ] Horário de funcionamento
- [ ] Editar fila
- [ ] Visualizar estatísticas da fila
  - [ ] Conversas aguardando
  - [ ] Tempo médio de espera
  - [ ] Agentes disponíveis
- [ ] Deletar fila

**Backend necessário:**
- `GET /api/v1/queues` - Listar filas
- `POST /api/v1/queues` - Criar fila
- `PUT /api/v1/queues/{id}` - Atualizar
- `DELETE /api/v1/queues/{id}` - Deletar
- `GET /api/v1/queues/{id}/stats` - Estatísticas

---

### 🟡 **FASE 2 - IMPORTANTE** (Semana 3-4)
*Funcionalidades operacionais importantes*

#### 2.1 Conversations (`/admin/conversations`)
**Status:** ✅ **CONCLUÍDO** (Design System aplicado)
**Prazo:** ~~3 dias~~ → Concluído
**Complexidade:** ⭐⭐⭐
**Design:** ✅ Design System aplicado (2025-10-10)

**Funcionalidades:**
- [x] Listar todas as conversas
  - [x] Filtro por status (Ativa, Encerrada, Aguardando)
  - [x] Filtro por agente
  - [ ] Filtro por fila
  - [ ] Filtro por data
  - [x] Busca por nome/telefone do contato
- [x] Visualizar detalhes da conversa
  - [x] Histórico completo de mensagens
  - [x] Informações do contato
  - [x] Agente responsável
  - [ ] Tempo de atendimento
  - [ ] Tags e notas
- [x] Intervir em conversa ativa
- [ ] Transferir conversa para outro agente
- [x] Encerrar conversa (via status)
- [ ] Exportar histórico

---

#### 2.2 Contacts (`/admin/contacts`)
**Status:** 🔴 Não iniciado
**Prazo:** 2-3 dias
**Complexidade:** ⭐⭐

**Funcionalidades:**
- [ ] Listar contatos
  - [ ] Busca por nome/telefone
  - [ ] Filtro por tags
  - [ ] Filtro por grupo
- [ ] Adicionar contato manual
  - [ ] Nome
  - [ ] Telefone (WhatsApp)
  - [ ] Email (opcional)
  - [ ] Tags
  - [ ] Campos customizados
- [ ] Editar contato
- [ ] Visualizar histórico de conversas
- [ ] Criar grupos de contatos
- [ ] Importar contatos (CSV/Excel)
- [ ] Exportar contatos
- [ ] Deletar contato

---

### 🟢 **FASE 3 - FEATURES** (Semana 5-7)
*Funcionalidades avançadas*

#### 3.1 Chatbots (`/admin/chatbots`)
**Status:** ✅ **COMPLETO** (com Script Node + PropertyModal)
**Prazo:** ~~5-7 dias~~ → Concluído (Janeiro 2025)
**Complexidade:** ⭐⭐⭐⭐⭐
**Documentação:** `CHATBOT_BUILDER_COMPLETE.md`

**Funcionalidades Implementadas:**
- [x] Listar chatbots/fluxos
- [x] Criar novo chatbot
- [x] **Editor de fluxo (Flow Builder)** - React Flow + TypeScript
  - [x] Drag and drop de nodes
  - [x] **Tipos de nodes (15 tipos):**
    - [x] **Core:** Start, Message, Question, Condition, End
    - [x] **Advanced:** Action, API Call, AI Prompt, **Script** ⭐, Database Query, Jump, Handoff, Delay, Set Variable
    - [x] **WhatsApp:** WhatsApp Template, Interactive Buttons, Interactive List
  - [x] Conexões entre nodes (edges)
  - [x] Validação de fluxo
  - [x] Sistema de variáveis `{{variable_name}}`
  - [x] **PropertyModal** - Modal fullscreen genérico para todos os editores
- [x] **Testar chatbot (FlowSimulator)**
  - [x] Execução em tempo real
  - [x] Suporte a JavaScript e Python
  - [x] Panel de debug com variáveis
  - [x] Histórico de execução
- [x] Ativar/Desativar chatbot
- [x] Vincular chatbot a número WhatsApp
- [x] **Estatísticas de uso** (dashboard)
- [x] Duplicar chatbot
- [ ] Exportar/Importar fluxo (planejado)

### 🌟 **Script Node - Destaque**

**Implementado em Janeiro 2025**

O Script Node permite executar código JavaScript ou Python para transformação e processamento de dados.

**Recursos:**
- ✅ **Duas linguagens:**
  - **JavaScript** - Execução nativa (~0ms load)
  - **Python** - Via Pyodide/WebAssembly (~10MB initial)

- ✅ **Bibliotecas Python disponíveis:**
  - pandas (~15MB) - Análise de dados
  - numpy (~8MB) - Computação numérica
  - scipy (~30MB) - Computação científica
  - scikit-learn (~35MB) - Machine Learning
  - matplotlib (~20MB) - Visualização
  - regex (~1MB) - Expressões regulares
  - pytz (~500KB) - Fusos horários

- ✅ **Editor de código:**
  - Fullscreen modal (95vw x 95vh)
  - Syntax highlighting
  - Teste de execução inline
  - Feedback detalhado de loading
  - Seleção de bibliotecas via UI

- ✅ **Exemplos de uso:**
```python
# Análise com Pandas
import pandas as pd
df = pd.DataFrame(database_result)
df['preco'].sum()

# Machine Learning
from sklearn.linear_model import LinearRegression
import numpy as np
# ... treinar modelo
```

```javascript
// Transformação de dados
return database_result.map(item =>
  `${item.name}: R$ ${item.preco}`
).join('\n');
```

### 🎨 **PropertyModal Component**

**Implementado em Janeiro 2025**

Componente genérico reutilizável para abrir qualquer editor em fullscreen.

**Características:**
- ✅ Modal 95vw x 95vh
- ✅ Header com gradiente indigo/purple
- ✅ Dark mode completo
- ✅ Backdrop com blur
- ✅ z-index 9999

**Componentes usando:**
- ✅ ScriptProperties (implementado)
- 🔄 APICallProperties (recomendado)
- 🔄 DatabaseQueryProperties (recomendado)
- 🔄 WhatsAppTemplateProperties (recomendado)

**Guia:** `PROPERTY_MODAL_USAGE_EXAMPLE.md`

**Nota:** Flow Builder totalmente funcional usando React Flow + PropertyModal pattern.

---

#### 3.2 Campaigns (`/admin/campaigns`)
**Status:** 🔴 Não iniciado
**Prazo:** 3-4 dias
**Complexidade:** ⭐⭐⭐

**Funcionalidades:**
- [ ] Listar campanhas
  - [ ] Filtro por status (Rascunho, Agendada, Enviando, Concluída)
- [ ] Criar nova campanha
  - [ ] Nome da campanha
  - [ ] Selecionar template WhatsApp
  - [ ] Selecionar contatos/grupos
  - [ ] Agendar envio
  - [ ] Configurar throttling (taxa de envio)
- [ ] Visualizar estatísticas da campanha
  - [ ] Total de contatos
  - [ ] Mensagens enviadas
  - [ ] Mensagens entregues
  - [ ] Mensagens lidas
  - [ ] Erros
  - [ ] Taxa de resposta
- [ ] Pausar/Retomar campanha
- [ ] Cancelar campanha
- [ ] Duplicar campanha

---

#### 3.3 Analytics (`/admin/analytics`)
**Status:** 🔴 Não iniciado
**Prazo:** 4-5 dias
**Complexidade:** ⭐⭐⭐⭐

**Funcionalidades:**
- [ ] Dashboard de métricas gerais
- [ ] Gráficos de conversas ao longo do tempo
- [ ] Gráficos de mensagens (enviadas/recebidas)
- [ ] Performance de agentes
  - [ ] Ranking de atendimentos
  - [ ] Tempo médio de resposta
  - [ ] Avaliações de satisfação
- [ ] Performance de chatbots
  - [ ] Taxa de conclusão
  - [ ] Pontos de abandono
- [ ] Performance de campanhas
  - [ ] ROI
  - [ ] Engajamento
- [ ] Relatórios customizados
- [ ] Exportar relatórios (PDF/Excel)
- [ ] Seletor de período

---

### 🔵 **FASE 4 - MELHORIAS** (Semana 8+)
*Configurações e refinamentos*

#### 4.1 Settings (`/admin/settings`)
**Status:** 🔴 Não iniciado
**Prazo:** 2-3 dias
**Complexidade:** ⭐⭐

**Funcionalidades:**
- [ ] Configurações da organização
  - [ ] Nome
  - [ ] Logo
  - [ ] Fuso horário
  - [ ] Idioma padrão
- [ ] Configurações de atendimento
  - [ ] Horário comercial
  - [ ] Mensagem automática fora do horário
  - [ ] Tempo máximo de atendimento
  - [ ] Mensagem de ausência
- [ ] Configurações de notificações
  - [ ] Email
  - [ ] Push
  - [ ] WhatsApp para admins
- [ ] Integrações
  - [ ] CRM (Salesforce, HubSpot, etc)
  - [ ] Planilhas (Google Sheets)
  - [ ] Webhooks customizados
- [ ] Plano e faturamento
  - [ ] Plano atual
  - [ ] Uso (mensagens/mês)
  - [ ] Histórico de faturas
  - [ ] Atualizar plano

---

## 🏗️ Stack Técnico

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** Radix UI + Tailwind CSS
- **Forms:** React Hook Form + Zod
- **State:** Zustand (global) + useState (local)
- **HTTP:** Axios (já configurado)
- **Charts:** Recharts ou Chart.js
- **Flow Builder:** React Flow (para chatbots)

### Backend (Já implementado)
- FastAPI + SQLAlchemy
- PostgreSQL (dados transacionais)
- Redis (cache, queues)
- MongoDB (logs, analytics)

---

## 📊 Estimativas de Tempo

| Fase | Telas | Dias Úteis | Semanas |
|------|-------|------------|---------|
| Fase 1 | WhatsApp, Users, Queues | 7-9 dias | 1.5-2 semanas |
| Fase 2 | Conversations, Contacts | 5-6 dias | 1-1.5 semanas |
| Fase 3 | Chatbots, Campaigns, Analytics | 12-16 dias | 2.5-3.5 semanas |
| Fase 4 | Settings | 2-3 dias | 0.5-1 semana |
| **TOTAL** | **9 telas** | **26-34 dias** | **5.5-8 semanas** |

---

## 🎯 Próximos Passos Imediatos

### 1️⃣ Hoje/Amanhã: WhatsApp Configuration
Começar pela tela mais crítica:
1. ✅ Criar página `/admin/whatsapp/page.tsx`
2. ✅ Criar formulário de adicionar número
3. ✅ Integrar com backend (verificar endpoints existentes)
4. ✅ Implementar validação de token Meta
5. ✅ Implementar teste de conexão
6. ✅ Mostrar status em tempo real

### 2️⃣ Depois: User Management
Após WhatsApp funcionando:
1. Criar CRUD completo de usuários
2. Sistema de convites por email
3. Gestão de roles e permissões

### 3️⃣ Depois: Queue Management
Essencial para agentes trabalharem:
1. CRUD de filas
2. Associação agentes <-> filas
3. Estatísticas básicas

---

## 🔍 Verificações Necessárias

### Backend Existente
Verificar quais endpoints já existem:
- [ ] `GET /api/v1/whatsapp/numbers`
- [ ] `POST /api/v1/whatsapp/numbers`
- [ ] `GET /api/v1/users`
- [ ] `POST /api/v1/users`
- [ ] `GET /api/v1/queues`
- [ ] Outros endpoints...

### Schemas Backend
Verificar modelos no banco:
- [ ] `whatsapp_numbers` table
- [ ] `users` table
- [ ] `queues` table
- [ ] Relacionamentos

---

## 📝 Notas Importantes

### Sobre WhatsApp API
- **Meta Cloud API:** Usar Phone Number ID, não número de telefone
- **Webhook:** Precisa ser HTTPS e validado pela Meta
- **Token:** Usar token permanente (não expira)
- **Templates:** Só pode enviar templates aprovados pela Meta fora da janela de 24h

### Sobre Segurança
- Sempre validar `organization_id` no backend
- Verificar role do usuário (só org_admin pode acessar)
- Sanitizar inputs
- Rate limiting em ações críticas

### Sobre UX
- Loading states em todas as ações
- Mensagens de erro claras
- Confirmação antes de deletar
- Feedback visual de sucesso

---

## 🎨 Padrões de Design

### Cores por Tipo de Ação
- 🟢 Verde: Ações positivas (criar, ativar, conectar)
- 🔴 Vermelho: Ações destrutivas (deletar, desativar)
- 🔵 Azul: Ações neutras (editar, visualizar)
- 🟡 Amarelo: Avisos e atenção

### Layout Padrão
```tsx
<div className="space-y-6">
  {/* Header com título e ação primária */}
  <div className="flex justify-between items-center">
    <div>
      <h1>Título da Página</h1>
      <p>Descrição</p>
    </div>
    <button>Ação Primária</button>
  </div>

  {/* Filtros e busca */}
  <div className="flex gap-4">
    <input type="search" />
    <select>Filtros</select>
  </div>

  {/* Conteúdo principal */}
  <div className="grid gap-4">
    {/* Cards ou tabela */}
  </div>
</div>
```

---

## 📊 Status Atual do Projeto

**Última atualização:** Janeiro 2025

### ✅ Concluído
- ✅ **Design System:** 5 componentes reutilizáveis + PropertyModal
- ✅ **List Pages:** 9/9 completas
  - ✅ Dashboard
  - ✅ Conversations (com Live Chat)
  - ✅ WhatsApp (API Oficial + Evolution API)
  - ✅ Contacts
  - ✅ Users
  - ✅ Campaigns
  - ✅ Analytics (MVP)
  - ✅ Queues (MVP + Queue Pull System)
  - ✅ **Chatbots (COMPLETO)** ⭐
- ✅ **Detail Pages:** 3/3 completas
  - ✅ Contact Detail (`/admin/contacts/[id]`)
  - ✅ User Detail (`/admin/users/[id]`)
  - ✅ Campaign Detail (`/admin/campaigns/[id]`)
- ✅ **Chatbot Builder (Advanced):**
  - ✅ React Flow editor com 15 tipos de nós
  - ✅ **Script Node** com JavaScript + Python
  - ✅ Bibliotecas Python (pandas, numpy, scikit-learn, etc.)
  - ✅ FlowSimulator com debug panel
  - ✅ PropertyModal genérico reutilizável
  - ✅ Sistema completo de variáveis

### 🚧 Próximos Passos (Backend)
1. **Implementar endpoints de detalhes:**
   - `GET /api/v1/contacts/{id}` + `GET /api/v1/contacts/{id}/stats`
   - `GET /api/v1/users/{id}` + `GET /api/v1/users/{id}/stats`
   - `GET /api/v1/campaigns/{id}` + `GET /api/v1/campaigns/{id}/stats`
2. **Implementar funcionalidades de edição:**
   - Modals/formulários de edit para Contacts, Users, Campaigns
3. **Features avançadas:**
   - ✅ Chatbot visual flow builder (React Flow) → **COMPLETO**
   - Analytics com gráficos (Recharts)
   - Queue management completo
4. **Melhorias no Builder:**
   - Monaco Editor (substituir textarea)
   - Autocomplete de variáveis
   - Breakpoints no FlowSimulator
   - Export/Import de fluxos

**Progresso Geral:** 100% das telas admin frontend | Chatbot Builder avançado completo | Backend 65% completo

---

**Continue o desenvolvimento! 🚀**
