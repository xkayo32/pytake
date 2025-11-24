# 🗺️ Roadmap de Implementação Frontend - PyTake

**Documento:** Plano de ação para completar frontend  
**Status:** Em planejamento  
**Autor:** Kayo Carvalho Fernandes  
**Data:** 24 de Novembro de 2025

---

## 📋 Visão Geral

Este documento detalha como implementar as 12 páginas faltantes, em ordem de prioridade e impacto.

---

## 🎯 Fases de Implementação

### **FASE 1: Campanhas (Semana 1)**

**Objetivo:** Ativar funcionalidade core de envio em massa

#### 1.1 - Página de Listagem (`/campaigns`)

**Arquivo:** `frontend/src/pages/Campaigns.tsx`

**Estrutura esperada:**
```tsx
✅ Header com botão "Nova Campanha"
✅ Filtros: status (draft/scheduled/running/paused/completed), data, search
✅ Tabela com colunas:
   - Nome
   - Status (badge colorida)
   - Destinatários
   - Taxa de entrega
   - Ações (view, edit, start, pause, delete)
✅ Paginação
✅ Bulk actions
```

**API endpoints a usar:**
```
GET /api/v1/campaigns              # Listar
GET /api/v1/campaigns/{id}/stats   # Estatísticas
```

**Tipos a usar:**
```typescript
import { Campaign, CampaignStatus } from '@/types/campaign'
import { campaignsAPI } from '@/lib/api'
```

**Checklist:**
- [ ] Criar arquivo `src/pages/Campaigns.tsx`
- [ ] Implementar listagem com API
- [ ] Adicionar filtros
- [ ] Adicionar botão "Nova Campanha"
- [ ] Testar com Swagger backend
- [ ] Adicionar rota em `App.tsx`
- [ ] Estilizar com Tailwind
- [ ] Testar em container

**Tempo estimado:** 6-8 horas

---

#### 1.2 - Página de Criação (`/campaigns/create`)

**Arquivo:** `frontend/src/pages/campaigns/Create.tsx`

**Fluxo do wizard:**

```
Step 1: Informações Básicas
├─ Nome
├─ Descrição
└─ Tipo (immediate/scheduled/recurring)

Step 2: Seleção de Contatos
├─ Todos
├─ Por tags
├─ Por grupos
└─ Upload CSV

Step 3: Seleção de Template
├─ Listar templates disponíveis
├─ Preview
└─ Variáveis

Step 4: Agendamento
├─ Data/Hora (se scheduled)
├─ Timezone
└─ Recorrência (se recurring)

Step 5: Revisão & Confirmação
├─ Resumo
├─ Botão "Criar"
└─ Link para detail page
```

**API endpoints a usar:**
```
POST /api/v1/campaigns              # Criar
GET  /api/v1/contacts/              # Listar contatos para seleção
GET  /api/v1/whatsapp/.../templates # Listar templates
```

**Checklist:**
- [ ] Criar arquivo `src/pages/campaigns/Create.tsx`
- [ ] Implementar componente Wizard com 5 steps
- [ ] Integrar API de criação
- [ ] Validar inputs
- [ ] Testar fluxo completo
- [ ] Adicionar rota em `App.tsx`

**Tempo estimado:** 10-12 horas

---

#### 1.3 - Página de Detalhes (`/campaigns/[id]`)

**Arquivo:** `frontend/src/pages/campaigns/[id].tsx`

**Seções:**

```
┌─ Header
├─ Informações básicas (nome, status, criada em)
├─ Botões de ação (Start, Pause, Resume, Delete)
└─

┌─ Tabs
├─ Visão Geral
│  ├─ Progresso (enviados/entregues/lidos)
│  ├─ Gráficos de timeline
│  └─ Métricas principais
│
├─ Métricas Detalhadas
│  ├─ Taxa de entrega
│  ├─ Taxa de leitura
│  ├─ Taxa de resposta
│  └─ Cliques em links
│
└─ Contatos
   ├─ Listagem com status individual
   └─ Filtrar por delivery status
```

**API endpoints a usar:**
```
GET    /api/v1/campaigns/{id}       # Detalhes
GET    /api/v1/campaigns/{id}/stats # Estatísticas
POST   /api/v1/campaigns/{id}/start # Iniciar
POST   /api/v1/campaigns/{id}/pause # Pausar
POST   /api/v1/campaigns/{id}/resume # Retomar
DELETE /api/v1/campaigns/{id}       # Deletar
```

**Checklist:**
- [ ] Criar arquivo `src/pages/campaigns/[id].tsx`
- [ ] Implementar layout com tabs
- [ ] Carregar dados da API
- [ ] Implementar gráficos (usar recharts ou chart.js)
- [ ] Botões de controle (start, pause, delete)
- [ ] Auto-refresh de dados
- [ ] Adicionar rota dinâmica em `App.tsx`

**Tempo estimado:** 12-14 horas

---

### **FASE 2: Conversas (Semana 2)**

**Objetivo:** Ativar inbox completo com real-time

#### 2.1 - Página de Conversas (`/conversations`)

**Arquivo:** `frontend/src/pages/Conversations.tsx`

**Layout:**
```
┌─ Sidebar Esquerdo
├─ Filtros & Search
├─ Listagem de conversas
│  ├─ Avatar + Nome do contato
│  ├─ Preview da última mensagem
│  ├─ Hora
│  ├─ Unread badge
│  └─ Status (open/pending/closed)
└─

┌─ Main Area
├─ Detalhes do contato selecionado
├─ Histórico de mensagens
├─ Input para enviar mensagem
└─ Botões de ação (atribuir, transferir, fechar)
```

**API endpoints a usar:**
```
GET  /api/v1/conversations/         # Listar
GET  /api/v1/conversations/{id}     # Detalhes
POST /api/v1/conversations/{id}/read # Marcar como lida
```

**WebSocket:**
```
- Conectar ao WS quando página abrir
- Receber novas mensagens em tempo real
- Receber status de digitação
- Atualizar lista de conversas
```

**Checklist:**
- [ ] Criar arquivo `src/pages/Conversations.tsx`
- [ ] Layout com sidebar + main
- [ ] Listar conversas com API
- [ ] Implementar filtros
- [ ] Integrar WebSocket
- [ ] Atualizar lista em real-time
- [ ] Marcar como lida
- [ ] Adicionar rota em `App.tsx`

**Tempo estimado:** 12-14 horas

---

#### 2.2 - Página de Conversa Individual (`/conversations/[id]`)

**Arquivo:** `frontend/src/pages/conversations/[id].tsx`

**Componentes:**

```
┌─ Header com detalhes do contato
├─ Avatar, nome, status, tags
└─ Botões: atribuir, transferir, fechar, mais opções

┌─ Área de mensagens
├─ Histórico (scroll infinito)
├─ Mensagens do contato (esquerda)
├─ Mensagens nossas (direita)
└─ Status de entrega/leitura

┌─ Input area
├─ Text input
├─ Attach file button
├─ Send button
└─ Typing indicator
```

**API endpoints a usar:**
```
GET  /api/v1/conversations/{id}                # Detalhes
GET  /api/v1/conversations/{id}/messages       # Histórico
POST /api/v1/conversations/{id}/messages       # Enviar mensagem
POST /api/v1/conversations/{id}/assign         # Atribuir agente
POST /api/v1/conversations/{id}/transfer       # Transferir para outro agente
POST /api/v1/conversations/{id}/close          # Fechar conversa
```

**WebSocket para real-time:**
```
- Receber novas mensagens
- Typing indicator
- Status de entrega/leitura
```

**Checklist:**
- [ ] Criar arquivo `src/pages/conversations/[id].tsx`
- [ ] Layout com header + mensagens + input
- [ ] Carregar histórico com scroll infinito
- [ ] Integrar WebSocket para mensagens
- [ ] Implementar envio de mensagens
- [ ] Botões de ação (assign, transfer, close)
- [ ] Typing indicator
- [ ] Status de entrega/leitura
- [ ] Adicionar rota dinâmica em `App.tsx`

**Tempo estimado:** 14-16 horas

---

### **FASE 3: AI & Templates (Semana 3)**

**Objetivo:** Features complementares de alto valor

#### 3.1 - Página de AI Assistant (`/ai-assistant`)

**Arquivo:** `frontend/src/pages/AIAssistant.tsx`

**Interface:**

```
┌─ Header
├─ Título "Gerador de Flows com IA"
└─ Descrição

┌─ Main Area
├─ Text area para descrição do flow
│  └─ Counter de caracteres (max 2000)
├─ Seletor de industria (opcional)
├─ Botão "Gerar Flow"
└─

├─ Resultado (após enviar)
├─ Loading state
├─ Option A: Success - exibir flow preview
│  ├─ Visualizar nodes
│  ├─ Botão "Usar este flow"
│  └─ Botão "Editar"
│
└─ Option B: Needs clarification - exibir perguntas
   ├─ Listar perguntas da IA
   ├─ Inputs para responder
   └─ Botão "Refinar"
```

**API endpoints a usar:**
```
POST /api/v1/ai-assistant/generate-flow          # Gerar
POST /api/v1/ai-assistant/suggest-improvements   # Sugerir melhorias
GET  /api/v1/ai-assistant/templates              # Templates
```

**Checklist:**
- [ ] Criar arquivo `src/pages/AIAssistant.tsx`
- [ ] Form com text area e opções
- [ ] Integrar API de geração
- [ ] Componente para exibir resultado
- [ ] Componente para clarification form
- [ ] Salvar flow gerado
- [ ] Adicionar rota em `App.tsx`

**Tempo estimado:** 8-10 horas

---

#### 3.2 - Templates Create (`/templates/create`)

**Arquivo:** `frontend/src/pages/templates/Create.tsx`

**Formulário:**

```
├─ Nome do template
├─ Categoria
├─ Conteúdo (text area)
├─ Variáveis ({{1}}, {{2}}, etc)
├─ Preview em tempo real
└─ Botão "Criar"
```

**API endpoints a usar:**
```
POST /api/v1/whatsapp/{number_id}/templates  # Criar
GET  /api/v1/whatsapp/                       # Listar números
```

**Checklist:**
- [ ] Criar arquivo `src/pages/templates/Create.tsx`
- [ ] Formulário com campos
- [ ] Preview em tempo real
- [ ] Detecção de variáveis
- [ ] Integrar API
- [ ] Validação
- [ ] Adicionar rota em `App.tsx`

**Tempo estimado:** 6-8 horas

---

#### 3.3 - Templates Detail (`/templates/[id]`)

**Arquivo:** `frontend/src/pages/templates/[id].tsx`

**Funcionalidades:**

```
├─ Editar template
├─ Visualizar aprovação status (Meta)
├─ Histórico de revisões
├─ Testar template
└─ Deletar template
```

**API endpoints a usar:**
```
GET    /api/v1/whatsapp/{number_id}/templates/{template_id}  # Detalhes
PUT    /api/v1/whatsapp/{number_id}/templates/{template_id}  # Editar
DELETE /api/v1/whatsapp/{number_id}/templates/{template_id}  # Deletar
POST   /api/v1/whatsapp/{number_id}/templates/{template_id}/submit # Resubmeter
```

**Checklist:**
- [ ] Criar arquivo `src/pages/templates/[id].tsx`
- [ ] Carregar template da API
- [ ] Formulário de edição
- [ ] Status de aprovação
- [ ] Preview
- [ ] Botões de ação
- [ ] Adicionar rota dinâmica

**Tempo estimado:** 6-8 horas

---

### **FASE 4: Reports & Refinamento (Semana 4)**

#### 4.1 - Página de Relatórios (`/reports`)

**Arquivo:** `frontend/src/pages/Reports.tsx`

**Filtros:**
```
├─ Data range (date picker)
├─ Tipo de relatório (select)
└─ Botão "Gerar"
```

**Resultado:**
```
├─ Overview metrics
├─ Gráficos (conversation duration, delivery rates, etc)
├─ Tabela de dados
└─ Opções de exportação (CSV, PDF)
```

**API endpoints a usar:**
```
GET /api/v1/analytics/reports/full    # Relatório completo
GET /api/v1/analytics/overview        # Overview
GET /api/v1/analytics/conversations   # Conversas
GET /api/v1/analytics/campaigns       # Campanhas
```

**Checklist:**
- [ ] Criar arquivo `src/pages/Reports.tsx`
- [ ] Form de filtros
- [ ] Carregar dados da API
- [ ] Gráficos (usar recharts)
- [ ] Exportação CSV/PDF
- [ ] Loading states
- [ ] Adicionar rota em `App.tsx`

**Tempo estimado:** 8-10 horas

---

## 📊 Estimativa Geral

| Fase | Páginas | Tempo | Início | Fim |
|------|---------|-------|--------|-----|
| 1 | Campanhas (3) | 28-34h | Semana 1 | Semana 1 |
| 2 | Conversas (2) | 26-30h | Semana 2 | Semana 2 |
| 3 | AI & Templates (3) | 20-26h | Semana 3 | Semana 3 |
| 4 | Reports (1) | 8-10h | Semana 4 | Semana 4 |
| **TOTAL** | **9 páginas** | **82-100h** | **4 semanas** | **1 mês** |

---

## 🏗️ Estrutura de Pastas Recomendada

```
frontend/src/pages/
├── Campaigns.tsx              (semana 1)
├── campaigns/
│   ├── Create.tsx             (semana 1)
│   └── [id].tsx               (semana 1)
├── Conversations.tsx          (semana 2)
├── conversations/
│   └── [id].tsx               (semana 2)
├── AIAssistant.tsx            (semana 3)
├── templates/
│   ├── Create.tsx             (semana 3)
│   └── [id].tsx               (semana 3)
└── Reports.tsx                (semana 4)

frontend/src/components/
├── campaigns/
│   ├── CampaignCard.tsx
│   ├── CampaignForm.tsx
│   ├── CampaignStats.tsx
│   └── CampaignWizard.tsx
├── conversations/
│   ├── ConversationList.tsx
│   ├── ConversationThread.tsx
│   ├── MessageInput.tsx
│   └── MessageList.tsx
├── ai/
│   ├── AIForm.tsx
│   ├── FlowPreview.tsx
│   └── ClarificationForm.tsx
└── templates/
    ├── TemplateForm.tsx
    └── TemplatePreview.tsx
```

---

## 🔄 Padrão de Implementação

Cada página deve seguir este padrão:

```typescript
// ============================================
// 1. Imports
// ============================================
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { campaignsAPI } from '@/lib/api'
import { Campaign } from '@/types/campaign'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// ============================================
// 2. Component
// ============================================
export default function CampaignsPage() {
  const [data, setData] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // ============================================
  // 3. Effects
  // ============================================
  useEffect(() => {
    loadData()
  }, [])
  
  // ============================================
  // 4. API Calls
  // ============================================
  const loadData = async () => {
    try {
      setIsLoading(true)
      const response = await campaignsAPI.list()
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }
  
  // ============================================
  // 5. Render
  // ============================================
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBoundary error={error} />
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Campanhas</h1>
          <Button onClick={() => navigate('/campaigns/create')}>
            Nova Campanha
          </Button>
        </div>
      </header>
      
      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Your content here */}
      </main>
    </div>
  )
}
```

---

## ✅ Checklist de Qualidade

Para cada página implementada, verificar:

- [ ] TypeScript sem erros (`npx tsc --noEmit`)
- [ ] Responsiva em mobile, tablet, desktop
- [ ] Dark mode funciona
- [ ] Loading states implementados
- [ ] Error handling implementado
- [ ] Acessibilidade básica (ARIA labels, keyboard navigation)
- [ ] Testada em container Docker
- [ ] Rota adicionada em `App.tsx`
- [ ] Componentes reutilizáveis extraídos
- [ ] Performance OK (não bloqueia UI)

---

## 🚀 Como Iniciar

### 1. Preparar ambiente
```bash
cd /home/administrator/pytake
podman compose up -d
podman exec pytake-frontend-dev npm run dev
```

### 2. Criar branch
```bash
git fetch origin develop
git checkout -b feature/implement-campaigns develop
```

### 3. Implementar página
```bash
# Seguir padrão acima
# Testar frequentemente
# Commits pequenos e frequentes
```

### 4. Validar
```bash
# Testar no browser (http://localhost:3001)
# Testar endpoints no Swagger (http://localhost:8002/api/v1/docs)
# Verificar console.log para erros
```

### 5. Submeter PR
```bash
git push origin feature/implement-campaigns
# Abrir PR no GitHub
# Descrever o que foi implementado
# Pedir review
```

---

## 📝 Notas Finais

- **Todo o backend está pronto** - não há blockers técnicos
- **Tipos TypeScript definidos** - facilita implementação
- **API client setup** - basta usar `campaignsAPI.list()`, etc
- **UI components prontos** - reutilizar Button, Card, Input
- **Padrão consistente** - seguir layout das páginas existentes

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 24 de Novembro de 2025  
**Versão:** 1.0
