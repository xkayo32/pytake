# 🏗️ PyTake Copilot Agent - Architecture & Design

## Overview

O **PyTake Agent** é um agente especializado do GitHub Copilot Chat construído para garantir que todas as mudanças no código seguem rigorosamente as regras, convenções e arquitetura do projeto PyTake.

## 📁 Estrutura de Arquivos

```
/home/administrator/.vscode-server/extensions/github.copilot-chat-0.33.2/assets/agents/
├── Plan.agent.md          # Agente genérico de planejamento (Copilot padrão)
└── PyTake.agent.md        # 🆕 Agente especializado para PyTake
```

## 🎯 Diferenças: Plan Agent vs PyTake Agent

| Aspecto | Plan Agent | PyTake Agent |
|---------|-----------|-------------|
| **Escopo** | Genérico - qualquer projeto | Específico - apenas PyTake |
| **Conhecimento** | Planejamento genérico | Arquitetura PyTake + 10 regras críticas |
| **Linguagem** | English | Portuguese (Brasil) |
| **Foco** | Planejamento (não implementa) | Pesquisa, planejamento E implementação |
| **Regras** | Nenhuma específica | 10 regras CRÍTICAS enforçadas |
| **Handoffs** | 2 (Plan + Implement) | 3 (Plan + Implement + Open in Editor) |

## 🧠 Modelo Mental do PyTake Agent

```
Entrada do Usuário
       ↓
┌─────────────────────────────────────┐
│ 1. PESQUISA & CONTEXTO              │ ← Usa runSubagent/tools
│    - Arquivos relacionados          │
│    - Padrões existentes             │
│    - Impacto de mudanças            │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│ 2. VALIDAR CONTRA 10 REGRAS         │ ← Enforçar compliance
│    - Container-first?               │
│    - Git workflow correto?          │
│    - Multi-tenancy scoping?         │
│    - RBAC validation?               │
│    - Author attribution?            │
│    ... (5 regras adicionais)        │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│ 3. PLANEJAR DETALHADO               │ ← Usando template PyTake
│    - Impacto arquitetural           │
│    - Database changes               │
│    - Frontend changes               │
│    - Testing strategy               │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│ 4. APRESENTAR HANDOFFS              │
│    - Create Plan (review first)     │
│    - Start Implementation (go now)  │
│    - Open Plan in Editor (iterate)  │
└─────────────────────────────────────┘
```

## 📋 Frontmatter YAML

```yaml
---
name: PyTake
description: Specialized agent for PyTake project - researches, plans and implements features following project rules
argument-hint: Describe the feature, bug fix, or task to work on
tools: [11 ferramentas disponíveis]
handoffs:
  - label: Create Plan
  - label: Start Implementation
  - label: Open Plan in Editor
---
```

**Explicação:**
- `name`: Como chamar no Copilot (`@PyTake`)
- `description`: Prompt do agente na UI
- `argument-hint`: Exemplo de como usar
- `tools`: 11 ferramentas disponíveis
- `handoffs`: 3 caminhos possíveis após pesquisa

## 🚫 As 10 Regras CRÍTICAS (Seção Principal)

O agente enforça 10 regras que cobrem:

### 1. Container-First Development
```
✅ SEMPRE usar Podman
❌ NUNCA sugerir instalar localmente (exceto se solicitado)
```

### 2. DEV MODE ONLY
```
✅ Staging/Prod DESATIVADOS em CI/CD
✅ Apenas test.yml + build.yml rodam
❌ NUNCA ativar staging/prod workflows
```

### 3. Git Workflow - STRICT
```
❌ NUNCA commit em main/develop
✅ feature/TICKET-XXX-description
✅ Conventional Commits com Author: Kayo Carvalho Fernandes
```

### 4. Multi-Tenancy & RBAC
```
✅ SEMPRE filtrar por organization_id
✅ Validar role guards
Roles: super_admin, org_admin, agent, viewer
```

### 5. API Client Standards
```
✅ getApiUrl() + getAuthHeaders() obrigatórios
❌ NUNCA URLs relativas
❌ Auth endpoints sem token refresh attempt
```

### 6. Backend Layering
```
Routes → Services → Repositories (camadas claras)
Migrations: alembic revision --autogenerate
❌ NUNCA editar migrations aplicadas
```

### 7. Author Attribution - MANDATORY
```
✅ SEMPRE: "Kayo Carvalho Fernandes"
❌ NUNCA: Referências de IA, Copilot, assistentes
```

### 8. Protected Route Patterns
```
✅ isLoading ANTES de isAuthenticated
✅ Usar authLoading hook
Location: frontend/src/lib/auth/roleGuard.tsx
```

### 9. Port & Configuration
```
Frontend: 3001 (host) → 3000 (container)
Backend: 8000 (Swagger em /api/v1/docs)
Nginx: 8080
MongoDB: 27018 (diferente do padrão!)
Config: backend/.env.podman
```

### 10. Secrets Management
```
✅ TODOS em GitHub secrets
✅ Documentar em .github/docs/SECRETS_AND_ENVIRONMENTS/README.md
❌ NUNCA em código ou .env
```

## 🔍 Seção de Pesquisa (Research Workflow)

O agente segue um fluxo estruturado:

```markdown
## 🔍 RESEARCH WORKFLOW

1. **Understand the task** - O que é necessário?
2. **Identify scope** - Backend, frontend, ou ambos?
3. **Research codebase:**
   - Rotas backend: backend/app/api/v1/router.py
   - Services: backend/app/services/
   - Repositories: backend/app/repositories/
   - Frontend pages: frontend/src/app/(admin|agent)/*
   - API client: frontend/src/lib/api.ts
4. **Check existing patterns** - Follow, don't reinvent
5. **Validate against rules** - Violates any rule?
```

## 📋 Template de Plano

O agente oferece um template estruturado:

```markdown
## Plan: {Task Name}

{TL;DR - problema, solução, integração com PyTake}

### Architecture
- **Backend Impact:** Rotas, services, migrations
- **Frontend Impact:** Pages/components, API calls
- **Database:** Novas tabelas? Schema changes?
- **Auth/Permissions:** Quais roles? Multi-tenancy?

### Implementation Steps
1. [Backend] {mudança específica com file path}
2. [Database] {detalhes de migration}
3. [Frontend] {mudança de componente}
4. [Testing] {como validar}

### Further Considerations
1. {Multi-tenancy concern?}
2. {RBAC question?}
```

**Diferenças do Plan Agent:**
- ✅ Seções specific: Architecture, Backend/Frontend Impact
- ✅ Multi-tenancy consideration obrigatória
- ✅ Sempre menciona database/migrations
- ✅ Auth/Permissions sempre incluído

## �� Responsabilidades Explícitas

```markdown
## 🎓 YOUR RESPONSIBILITIES

1. **Enforce Rules** - Stop se violar qualquer regra
2. **Research Context** - Entender padrões existentes
3. **Plan Thoroughly** - Planos detalhados e acionáveis
4. **Respect Architecture** - Separação de camadas
5. **Follow Conventions** - Match code style existente
6. **Attribute Work** - Credit Kayo Carvalho Fernandes
7. **Test Coverage** - Sugerir estratégias de testes
8. **Document Clearly** - "Por quê", não só "o quê"
```

## 🔗 Integração com Instruções do Projeto

O agente referencia:

- `.github/copilot-instructions.md` - Regras gerais
- `.github/instructions/instrucoes.instructions.md` - Regras específicas
- `.github/instructions/agente.instructions.md` - Design system
- `.github/CI_CD_DEV_ONLY.md` - Regras de CI/CD

## 📊 Estatísticas do Agente

```
📝 Total de linhas:        210
🚫 Regras críticas:         10
🔧 Ferramentas disponíveis: 11
🔗 Handoffs oferecidos:      3
📚 Seções principais:        8
📋 Arquivos-chave ref:      25+
```

## 🚀 Como o Agente é Ativado

1. VSCode carrega extensão Copilot Chat
2. Lê arquivo `PyTake.agent.md` em `/assets/agents/`
3. Registra agente como `@PyTake`
4. Usuário digita `@PyTake [tarefa]` em Copilot Chat
5. Agente segue workflow: Pesquisa → Valida → Planeja → Handoff

## 🔄 Fluxo Completo de Uso

```
Usuário: "@PyTake Adicionar endpoint para listar flows"
         ↓
Agente:  1. Pesquisa endpoint patterns existentes
         2. Validar se segue multi-tenancy
         3. Validar se segue layering
         4. Validar against 10 rules
         5. Criar plano detalhado
         ↓
Oferece: "Create Plan" / "Start Implementation" / "Open Plan in Editor"
         ↓
Usuário: Escolhe "Create Plan"
         ↓
Agente:  Exibe plano estruturado
         ↓
Usuário: "O plano não menciona testes, add testes"
         ↓
Agente:  Refina plano com testes
         ↓
Usuário: "Start Implementation"
         ↓
Agente:  Implementa seguindo plano + todas 10 regras
         ↓
Resultado: Código pronto com commit, PR, CI/CD verde
```

## 🎓 Inspiração & Referências

O agente foi desenhado combinando:

- **Arquitetura Plan Agent** - Fluxo de pesquisa iterativa
- **Regras PyTake** - Das instruções do projeto
- **Best Practices de Agents** - Handoffs, responsabilidades claras
- **Experiência do projeto** - Problemas resolvidos (CORS, multi-tenancy, etc)

## 📈 Evolução Futura

Possíveis melhorias:

1. ✅ Integração com GitHub Issues automaticamente
2. ✅ Sugerir codereviews automáticos
3. ✅ Validar CI/CD em tempo real
4. ✅ Auto-generate testes unitários
5. ✅ Database schema visualização
6. ✅ RBAC permission matrix generator

---

**Versão:** 1.0  
**Data de Criação:** November 20, 2025  
**Autor:** Kayo Carvalho Fernandes  
**Baseado em:** Plan.agent.md v1 + PyTake Architecture

