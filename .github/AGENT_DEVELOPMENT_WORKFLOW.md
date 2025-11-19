# 🚀 Fluxo de Desenvolvimento - Agente

**Data:** 19 de Novembro de 2025  
**Autor:** Kayo Carvalho Fernandes  
**Versão:** 2.0 (Otimizado)

---

## ⚡ 5 Passos - Fluxo Rápido

### 1️⃣ ANTES DE COMEÇAR (5 min)

```bash
# Verificar CI/CD da última tarefa
git log --oneline -3

# Se falhou: ⚠️ ALERTAR usuário
# Se passou: ✅ Continuar

# Atualizar develop
git fetch origin && git pull origin develop

# Criar branch
git checkout -b feature/TICKET-xxx-description
```

### 2️⃣ IMPLEMENTAR (N min)

```bash
# Escrever código
# Sem console.log(), debugger, ou TODO pendentes
# Manter padrões do projeto
```

### 3️⃣ VALIDAR (5 min) ⭐ NOVO!

```bash
# Build frontend
npm run build

# Backend tests (se há)
pytest

# Containers OK?
podman compose ps
podman compose logs --tail=50 backend frontend

# Endpoints respondendo?
curl http://localhost:3002  # Frontend
curl http://localhost:8002/api/v1/docs  # Backend
```

**Se erro:**
- Diagnosticar + corrigir
- Re-validar
- Documentar em commit

**Se OK:**
- ✅ Avançar para próximo passo

### 4️⃣ COMMIT + PR (2 min)

```bash
git add .
git commit -m "type: description

- Mudança 1
- Mudança 2
Author: Kayo Carvalho Fernandes"

git push origin feature/TICKET-xxx

# Criar PR no GitHub (descrição clara)
```

**Não espere aprovação para continuar.**

### 5️⃣ PRÓXIMA TAREFA (5 min)

```bash
# Verificar CI/CD passou
# (build.yml ou test.yml)

# Se falhou: alertar usuário
# Se passou: proceder

# Confirmar se precisa merge de branch ativa
git fetch origin
git branch -v

# Se branch ativa: verificar com usuário
# Se não: criar nova branch
```

---

## 📊 Quando Criar Documentação

### ✅ CRIE (Apenas se necessário)

- ✅ Nova feature significativa (com arquitetura)
- ✅ Padrão novo a ser reutilizado
- ✅ API pública que outros times usarão
- ✅ Config complexa ou setup inicial

### ❌ NÃO CRIE

- ❌ Bug fix simples
- ❌ Refatoração de página/component
- ❌ Análise exploratória
- ❌ Guia de implementação (código é suficiente)

### 📝 SE CRIAR

- **Máximo 1-2 documentos por assunto**
- Consolidar informações (não fragmentar)
- Atualizar docs existentes (não criar novas)
- Usar comentários em código ao invés

---

## 🔧 Validação de Containers

### Checklist Pós-Mudança

```bash
# 1. Status dos containers
podman compose ps

# 2. Logs (últimas 50 linhas)
podman compose logs --tail=50 backend
podman compose logs --tail=50 frontend

# 3. Testar endpoints
curl http://localhost:3002/           # Frontend
curl http://localhost:8002/api/v1/docs  # Backend

# 4. Build & Tests
npm run build                         # Frontend
pytest                                # Backend (se há)
```

### Se Encontrar Erro

1. Coletar logs **completos** (não resumo)
2. Diagnosticar causa raiz
3. Implementar correção
4. Re-validar containers
5. Documentar em commit

### Se Tudo OK

✅ Proceder com commit + PR

---

## 🔄 Fluxo Completo

```
┌─────────────────────────────────────────────────┐
│  VERIFICAR CI/CD DA ÚLTIMA TAREFA               │
│  • build.yml passou?                            │
│  • test.yml passou?                             │
│  • Se não: alertar usuário                      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  PREPARAR BRANCH                                │
│  • git fetch origin && git pull develop         │
│  • git checkout -b feature/TICKET-xxx           │
│  • Confirmar: git branch (deve mostrar *)       │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  IMPLEMENTAR                                    │
│  • Escrever código                              │
│  • Seguir padrões                               │
│  • Sem console.log() ou debugger                │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  VALIDAR CONTAINERS ⭐ NOVO                     │
│  • npm run build (Frontend)                     │
│  • pytest (Backend, se há)                      │
│  • podman compose ps                            │
│  • podman compose logs --tail=50                │
│  • curl endpoints                               │
│                                                 │
│  Se erro: Diagnosticar → Corrigir →            │
│           Re-validar → Documentar               │
│                                                 │
│  Se OK: ✅ Avançar                             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  COMMIT + PUSH                                  │
│  • git add .                                    │
│  • git commit -m "type: description"            │
│  • Author: Kayo Carvalho Fernandes              │
│  • git push origin feature/TICKET-xxx           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  CRIAR PR                                       │
│  • Descrição clara (o que, por que, como)       │
│  • Link para issue/ticket                       │
│  • Como validar/testar                          │
│  • NÃO esperar aprovação                        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  NOVA TAREFA                                    │
│  • Verificar CI/CD da última (build.yml)        │
│  • Se falhou: alertar usuário                   │
│  • Se passou: proceder                          │
│  • Atualizar develop                            │
│  • Criar nova branch                            │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Checklist Rápido

### Antes de Começar
- [ ] CI/CD da última tarefa passou?
- [ ] Se falhou: alertei usuário?
- [ ] git fetch origin && git pull develop
- [ ] Nova branch criada?
- [ ] git branch mostra * feature/TICKET-xxx?

### Durante Desenvolvimento
- [ ] Código seguindo padrões
- [ ] Sem console.log() ou debugger
- [ ] Comentários onde necessário
- [ ] Testes se aplicável

### Antes de Commit
- [ ] npm run build (Frontend) ✅
- [ ] pytest (Backend, se há) ✅
- [ ] podman compose ps (tudo rodando?) ✅
- [ ] Endpoints respondendo? ✅
- [ ] git diff (revisar mudanças) ✅

### Commit + PR
- [ ] git add . && git commit ✅
- [ ] Author: Kayo Carvalho Fernandes ✅
- [ ] git push ✅
- [ ] PR criado com descrição ✅
- [ ] NÃO esperar aprovação ✅

### Próxima Tarefa
- [ ] Verificar CI/CD (build.yml passou?) ✅
- [ ] Se falhou: alertar usuário ✅
- [ ] Se passou: criar nova branch ✅
- [ ] git fetch && git pull develop ✅

---

## 📋 Matriz: O Que Fazer em Cada Situação

| Situação | Ação |
|----------|------|
| **Mudança simples** | Código + Commit + PR |
| **Containers quebram** | Diagnosticar → Corrigir → Re-validar |
| **Build falha** | Verificar erro → Corrigir → Re-build |
| **CI/CD falhou antes** | Alertar usuário ANTES de novo trabalho |
| **Precisa documentar** | 1-2 docs consolidados máximo |
| **Análise exploratória** | Adicionar ao README.md (não novo doc) |
| **Nova branch ativa** | Confirmar com usuário se continua nela |

---

## ⚠️ Regras Importantes

### Documentação
- ✅ 1-2 docs por assunto (consolidar)
- ✅ Atualizar existentes (não criar)
- ✅ Código + comentários é suficiente
- ❌ Não crie 8+ docs para 1 análise

### Containers
- ✅ SEMPRE validar após mudanças
- ✅ Logs completos se erro
- ✅ Diagnosticar + corrigir antes de commit
- ❌ Não faça commit se containers quebrem

### CI/CD
- ✅ Verificar antes de nova tarefa
- ✅ Alertar se falhou
- ✅ Sugerir merge se branch ativa
- ❌ Não ignorar falhas

### Git
- ✅ Commits pequenos
- ✅ Author: Kayo Carvalho Fernandes
- ✅ PR automático após validar
- ✅ Mensagens descritivas

---

## 🚀 Resumo

**Antes:** Documentação excessiva, sem validação containers  
**Depois:** Docs mínimas, validação obrigatória, fluxo automático

**Ganho:** 70% menos tempo em docs, 100% confiabilidade

---

**Versão:** 2.0  
**Status:** ✅ ATIVO  
**Implementado por:** Kayo Carvalho Fernandes
