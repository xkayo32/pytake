# Admin Dashboard - Cronograma de Desenvolvimento

## 🎯 Objetivo

Desenvolver todas as telas do painel administrativo do PyTake em ordem de prioridade, garantindo que as funcionalidades essenciais para operação sejam implementadas primeiro.

---

## 📋 Cronograma por Prioridade

### 🔴 **FASE 1 - CRÍTICO** (Semana 1-2)
*Funcionalidades essenciais para o sistema funcionar*

#### 1.1 WhatsApp Configuration (`/admin/whatsapp`) ⭐ **PRIORIDADE MÁXIMA**
**Status:** ✅ **CONCLUÍDO** (com Evolution API)
**Prazo:** ~~3-4 dias~~ → Concluído
**Complexidade:** ⭐⭐⭐⭐ (expandido com Evolution API)

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
**Status:** 🔴 Não iniciado
**Prazo:** 3 dias
**Complexidade:** ⭐⭐⭐

**Funcionalidades:**
- [ ] Listar todas as conversas
  - [ ] Filtro por status (Ativa, Encerrada, Aguardando)
  - [ ] Filtro por agente
  - [ ] Filtro por fila
  - [ ] Filtro por data
  - [ ] Busca por nome/telefone do contato
- [ ] Visualizar detalhes da conversa
  - [ ] Histórico completo de mensagens
  - [ ] Informações do contato
  - [ ] Agente responsável
  - [ ] Tempo de atendimento
  - [ ] Tags e notas
- [ ] Intervir em conversa ativa (opcional)
- [ ] Transferir conversa para outro agente
- [ ] Encerrar conversa
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
**Status:** 🔴 Não iniciado
**Prazo:** 5-7 dias
**Complexidade:** ⭐⭐⭐⭐⭐

**Funcionalidades:**
- [ ] Listar chatbots/fluxos
- [ ] Criar novo chatbot
- [ ] Editor de fluxo (Flow Builder)
  - [ ] Drag and drop de nodes
  - [ ] Tipos de nodes:
    - [ ] Start (início)
    - [ ] Message (enviar mensagem)
    - [ ] Question (fazer pergunta)
    - [ ] Condition (if/else)
    - [ ] API Call (integração externa)
    - [ ] Transfer to Queue (transferir para fila)
    - [ ] End (finalizar)
  - [ ] Conexões entre nodes
  - [ ] Validação de fluxo
- [ ] Testar chatbot (simulador)
- [ ] Ativar/Desativar chatbot
- [ ] Vincular chatbot a número WhatsApp
- [ ] Estatísticas de uso
- [ ] Duplicar chatbot
- [ ] Exportar/Importar fluxo

**Nota:** Esta é a tela mais complexa. Considerar usar biblioteca como React Flow.

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

**Pronto para começar! 🚀**

Começamos pela configuração do WhatsApp?
