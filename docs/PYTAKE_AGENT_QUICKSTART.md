# 🤖 PyTake Copilot Agent - Quick Start Guide

## O que é o PyTake Agent?

Um agente especializado do GitHub Copilot criado especificamente para o projeto PyTake. Ele entende toda a arquitetura, regras e convenções do projeto e ajuda você a:

- ✅ Pesquisar contexto automaticamente
- ✅ Planejar features/fixes seguindo regras PyTake
- ✅ Implementar código compliant com arquitetura
- ✅ Enforçar boas práticas (multi-tenancy, RBAC, git workflow, etc)

## 🚀 Como Usar

### Abrir Copilot Chat
```
Windows/Linux: Ctrl + Shift + I
Mac: Cmd + Shift + I
```

### Chamar o Agente PyTake
```
@PyTake [sua tarefa aqui]
```

## 📋 Exemplos de Uso

### Feature Backend
```
@PyTake Adicionar novo endpoint para listar flows por organização com filtros de status
```

O agente irá:
1. Pesquisar endpoints existentes em `backend/app/api/v1/endpoints/`
2. Entender padrão de repository → service → route
3. Planejar com scoping de `organization_id`
4. Criar implementação com testes

### Bug Fix
```
@PyTake Corrigir erro CORS na integração de pagamentos
```

O agente irá:
1. Investigar erro de CORS
2. Verificar nginx config e FastAPI CORS middleware
3. Planejar fix seguindo CI/CD dev-only
4. Implementar e validar

### Refatoração
```
@PyTake Reorganizar estrutura de permissões RBAC para suportar permissões granulares
```

O agente irá:
1. Analisar RBAC atual
2. Pesquisar impacto em todas as rotas
3. Planejar migrations
4. Implementar com testes

## 🎯 Regras que o Agente Enforça

O agente **irá parar e alertar** se você tentar:

- ❌ Commitar direto em `main` ou `develop` → ✅ Branch `feature/TICKET-XXX-*`
- ❌ Esquecer `organization_id` em queries → ✅ Multi-tenancy scoping
- ❌ URLs hardcoded → ✅ `getApiUrl()` + `getAuthHeaders()`
- ❌ Armazenar secrets em código → ✅ GitHub secrets
- ❌ Editar migrations aplicadas → ✅ Criar nova migration
- ❌ Ativar staging/prod workflows → ✅ Dev-only CI/CD
- ❌ Sem role guards em rotas protegidas → ✅ RBAC enforcement
- ❌ Sem author attribution → ✅ "Kayo Carvalho Fernandes"

## 📚 Handoffs (Próximos Passos)

Após pesquisar, o agente oferece 3 opções:

### 1. **Create Plan**
Cria um plano detalhado para revisar antes de implementar
```
Ideal para: features complexas, refatorações
```

### 2. **Start Implementation**
Começa implementação direto no código
```
Ideal para: bugs simples, hotfixes
```

### 3. **Open Plan in Editor**
Abre plano em arquivo untitled para refinamento
```
Ideal para: feedback intermediário, iteração
```

## 🔧 Comandos Frequentes (pelo agente)

```bash
# Inicio dev
podman compose up -d
podman exec pytake-backend alembic upgrade head

# Testes
podman exec pytake-backend pytest

# Git workflow
git checkout develop
git pull origin develop
git checkout -b feature/TICKET-XXX-description
git commit -m "feat: description | Author: Kayo Carvalho Fernandes"
git push origin feature/TICKET-XXX-description
gh pr create --base develop
```

## 📍 Arquivos-Chave que o Agente Conhece

**Backend:**
- `backend/app/main.py` - App FastAPI
- `backend/app/api/v1/router.py` - Router principal
- `backend/app/services/` - Business logic
- `backend/app/repositories/` - Data access
- `backend/alembic/versions/` - Migrations

**Config:**
- `.github/copilot-instructions.md` - Regras gerais
- `.github/instructions/agente.instructions.md` - Instruções detalhadas
- `.github/CI_CD_DEV_ONLY.md` - Regras de CI/CD
- `backend/.env.podman` - Config backend
- `docker-compose.yml` - Composição de serviços

## ⚠️ Dicas Importantes

### 1. Sempre Especificar Contexto
❌ Ruim:
```
@PyTake Adicionar endpoint
```

✅ Bom:
```
@PyTake Adicionar endpoint GET /flows para listar fluxos da organização com filtro de status
```

### 2. Mencionar Escopo de Mudança
❌ Ruim:
```
@PyTake Corrigir bug de login
```

✅ Bom:
```
@PyTake Corrigir bug de login onde token não está sendo renovado corretamente
```

### 3. Aproveitar Handoffs
Não tente fazer tudo em um prompt:
1. Primeiro ask para **Create Plan**
2. Revise o plano com o usuário
3. Ask para **Start Implementation**

### 4. Forneça Feedback
Se o plano não está bom:
```
O plano não considera os webhooks. Adicione step para validar integração de webhooks.
```

## 🐛 Troubleshooting

### "Agente não aparece"
- ✅ Reinicie VSCode
- ✅ Verifique se arquivo está em `/home/administrator/.vscode-server/extensions/github.copilot-chat-0.33.2/assets/agents/PyTake.agent.md`

### "Agente ignora regras PyTake"
- ✅ Use `@PyTake` (case-sensitive)
- ✅ Forneça contexto claro e específico
- ✅ Se agente não responder sobre regras, mencione: "Verificar regras em `.github/copilot-instructions.md`"

### "Preciso do agente Plan"
Use `@Plan` para criar plano genérico (não específico PyTake):
```
@Plan Arquitetar sistema de cache distribuído
```

## 📞 Suporte

Para problemas com o agente:
1. Verifique se arquivo está em pasta correta
2. Reinicie VSCode
3. Limpe cache: `Ctrl+Shift+P` → "Clear Copilot Cache"
4. Revise `.github/copilot-instructions.md` para regras

---

**Agente Version:** 1.0  
**Criado em:** November 20, 2025  
**Mantido por:** Kayo Carvalho Fernandes

