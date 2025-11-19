# 🚀 CI/CD - Modo Development APENAS

**IMPORTANTE:** Este repositório está em MODO DEVELOPMENT. Staging e Production estão **COMPLETAMENTE DESATIVADOS** em todos os workflows.

## 📋 Status dos Workflows

### ✅ ATIVOS (Rodando automaticamente)

| Workflow | Trigger | Descrição |
|----------|---------|-----------|
| `test.yml` | Push em `main`/`develop` | Testes críticos (migrations, imports) |
| `build.yml` | Push em `main`/`develop` | Build backend/frontend, validação compose |
| `auto-merge.yml` | PR merge | Auto-merge de branches hotfix |

### ⏸️ DESATIVADOS (Comentados/Removidos)

| Workflow | Motivo | Reativar Quando |
|----------|--------|-----------------|
| `deploy.yml` | Staging/Prod desativados | Infra de produção disponível |
| `deploy-staging.yml` | Não há staging em dev | Ambiente staging criado |
| `deploy-production.yml` | Não há produção em dev | Fase de produção iniciada |
| `test-domain-routing.yml` | Routing não aplicável em dev | Testes de domínio necessários |

### 📝 PARCIALMENTE ATIVOS (workflow_dispatch manual)

- `deploy.yml` - Pode ser disparado manualmente (mas não faz nada sem secrets)
- `deploy-staging.yml` - Pode ser disparado manualmente (mantido como failsafe)
- `deploy-production.yml` - Pode ser disparado manualmente (ambiente 'disabled')
- `test-domain-routing.yml` - Pode ser disparado manualmente via Actions

---

## 🔧 Modificações Permanentes para Copilot

Quando trabalhar neste repositório, lembre-se:

### 1. **NUNCA reativar staging/prod sem autorização explícita**
```yaml
# ❌ ERRADO
on:
  push:
    branches: [staging, production]

# ✅ CORRETO
on:
  # ⚠️ COMENTADO: Staging/Production desativados em modo dev
  # push:
  #   branches: [staging, production]
```

### 2. **DEV ONLY = Produção nunca**
- Deploy local via `docker-compose.yml`
- Testes via Podman containers locais
- Sincronização com develop/main apenas

### 3. **Padrão de comentário para workflows desativados**
```yaml
name: 🚀 Deploy (DESATIVADO - DEV APENAS)

on:
  # ⚠️ COMENTADO: Push automático desativado em modo dev
  # push:
  #   branches: [...]
  
  # Usar workflow_dispatch para testes manuais emergenciais
  workflow_dispatch:
```

### 4. **Se precisar adicionar novo workflow:**
- Pergunte: "Este workflow envolve staging ou produção?"
- Se SIM: Comente triggers automáticos, deixe `workflow_dispatch`
- Se NÃO: Pode ativar normalmente em `develop`

---

## 🧪 Testando Mudanças em DEV

### Ciclo Local (SEM CI/CD)
```bash
# 1. Fazer mudanças
git checkout -b feature/TICKET-XXX-desc

# 2. Testar localmente
podman compose down
podman compose up -d
# ... validar manualmente

# 3. Commit
git add .
git commit -m "feat: descrição"

# 4. Push
git push -u origin feature/TICKET-XXX-desc

# 5. Criar PR → Merge quando CI/CD passar
```

### CI/CD Automático (SEM Deploy)
- ✅ Migrations testadas
- ✅ Imports verificados
- ✅ Frontend build validado
- ✅ Docker compose syntax checado
- ❌ Nada é deployado automaticamente

---

## 📦 Repositories/Branches Utilizados

- **Default Branch:** `develop` (base para features)
- **Release Branch:** `main` (apenas após merge aprovado)
- **Feature Branches:** `feature/TICKET-XXX-*`
- **Hotfix Branches:** `hotfix/TICKET-XXX-*` (desde main)

---

## ⚠️ Regras Críticas para Copilot

1. **NUNCA** mencione produção sem "DESATIVADO - DEV APENAS"
2. **NUNCA** reativar `push` triggers em staging/prod workflows
3. **SEMPRE** comentar triggers com `# ⚠️ COMENTADO`
4. **SEMPRE** manter `workflow_dispatch` para emergências
5. **SEMPRE** incluir "DEV APENAS" no nome dos workflows desativados

---

## 🔄 Quando Reativar Staging/Produção?

**Aguardar instrução explícita.** Será necessário:

1. ✅ Infra de staging criada e testada
2. ✅ Infra de produção criada e testada
3. ✅ Secrets configurados no GitHub
4. ✅ DNS/SSL/Routing validado
5. ✅ Backup/Recovery plan documentado

Até então: **MODO DEV, SEM STAGING/PROD**

---

**Última atualização:** 2025-11-19  
**Status:** ✅ ATIVO (Development Only)  
**Autor:** Kayo Carvalho Fernandes
