# 📐 Decisões de Arquitetura - PyTake

## ADR-001: Migração para Arquitetura Multi-repositório

**Data:** 2025-11-12  
**Status:** ✅ Aprovado  
**Decisores:** Time de Engenharia  

---

### Contexto

O projeto PyTake atualmente está estruturado como um **monorepo** contendo:
- Backend: FastAPI (Python)
- Frontend: Next.js (TypeScript)
- Infraestrutura compartilhada (docker-compose, nginx, scripts)

Com o crescimento do projeto e adição de novas funcionalidades, identificamos os seguintes desafios:

1. **Deploys acoplados**: Mudanças no frontend forçam rebuild/redeploy do backend
2. **CI/CD monolítico**: Workflows executam testes de ambas stacks mesmo quando apenas uma mudou
3. **Conflitos em PRs**: Times de backend e frontend frequentemente conflitam em `.github/workflows`
4. **Versionamento único**: Impossível versionar backend e frontend independentemente
5. **Rollback difícil**: Problema no frontend reverte também mudanças no backend

---

### Decisão

**Migrar de monorepo para arquitetura multi-repositório:**

- **pytake-backend**: Repositório dedicado ao backend (FastAPI)
- **pytake-frontend**: Repositório dedicado ao frontend (Next.js)

**Manter:**
- API versionada em `v1` (sem breaking changes)
- GitFlow workflow (develop → staging, main → prod)
- CI/CD automático via GitHub Actions

---

### Alternativas Consideradas

#### Opção 1: Manter Monorepo (Descartada)
**Prós:**
- Setup simples (1 clone)
- API sempre sincronizada
- Histórico unificado

**Contras:**
- Deploys acoplados
- CI/CD lento (roda tudo sempre)
- Escalabilidade limitada de times
- Versionamento único

**Decisão:** ❌ Descartada - Não escala com crescimento do time

---

#### Opção 2: Multi-repo com Repos Dev/Prod Separados (Descartada)
**Estrutura proposta:**
```
pytake-backend-dev  → desenvolvimento
pytake-backend-prod → produção (read-only)
pytake-frontend-dev → desenvolvimento  
pytake-frontend-prod → produção (read-only)
```

**Prós:**
- Separação clara dev/prod

**Contras:**
- Sincronização manual entre repos dev/prod
- Histórico fragmentado
- Complexidade desnecessária (branches resolvem isso)
- GitFlow já resolve com `develop` e `main`

**Decisão:** ❌ Descartada - Branches são suficientes

---

#### Opção 3: Multi-repo com Branches (ESCOLHIDA) ✅
**Estrutura:**
```
pytake-backend/
  ├── develop → auto-deploy staging
  └── main → auto-deploy produção (via tags)

pytake-frontend/
  ├── develop → auto-deploy staging
  └── main → auto-deploy produção (via tags)
```

**Prós:**
- Deploys independentes
- CI/CD otimizado (caches, jobs específicos)
- Times escaláveis (sem conflitos)
- Versionamento independente (backend v2.0, frontend v1.5)
- Rollback cirúrgico
- Branches protegidas (develop, main)

**Contras:**
- Setup local mais complexo (2 clones)
- Sincronização de API requer coordenação
- Testes de integração mais complexos

**Mitigação dos Contras:**
- Script `dev.sh` para setup automatizado
- Contrato de API versionado (OpenAPI)
- Staging para validação de integração

**Decisão:** ✅ ESCOLHIDA

---

### Consequências

#### Positivas ✅
1. **Deploys Independentes**: Backend pode atualizar sem afetar frontend
2. **CI/CD 3x mais rápido**: Jobs paralelos, caches específicos
3. **Escalabilidade**: Times backend/frontend trabalham sem conflitos
4. **Versionamento**: Cada projeto segue semver independente
5. **Rollback Preciso**: Problema em um não afeta o outro

#### Negativas ⚠️
1. **Setup Inicial Complexo**: Devs precisam clonar 2 repos
2. **Coordenação de API**: Breaking changes exigem comunicação
3. **Testes E2E**: Requerem ambos repos em staging

#### Neutras 🔵
1. **Histórico Separado**: Pode dificultar rastreamento cross-stack
2. **Duplicação de Config**: `.env`, `Dockerfile` em ambos repos

---

### Implementação

#### Fase 1: Preparação (Semana 1) - ✅ Iniciada
- [x] Documentar contrato de API v1
- [x] Criar guia de migração
- [ ] Validar OpenAPI/Swagger completo
- [ ] Mapear todas as dependências backend ↔ frontend

#### Fase 2: Criação (Semana 2)
- [ ] Criar `pytake-backend` via git subtree split (mantém histórico)
- [ ] Criar `pytake-frontend` via git subtree split
- [ ] Adicionar CI básico (lint, test, build)
- [ ] Validar build local

#### Fase 3: Staging (Semana 3-4)
- [ ] Configurar CD auto-deploy (develop → staging)
- [ ] Validar integração em staging
- [ ] Monitorar por 1 semana

#### Fase 4: Produção (Mês 2)
- [ ] Configurar CD produção (tags v* → prod)
- [ ] Migrar produção gradualmente
- [ ] Descontinuar monorepo após 2 semanas de validação

---

### Estratégia de Versionamento de API

**API v1 (Atual):**
- Base URL: `/api/v1/`
- **Regra:** ZERO breaking changes
- Permitido: novos endpoints, campos opcionais
- Proibido: renomear/remover campos, mudar tipos

**Quando criar v2:**
- Necessidade de breaking changes
- Deprecar v1 com 3 meses de antecedência
- Manter v1 funcionando por período de transição

**Exemplo de mudança permitida em v1:**
```typescript
// ✅ Permitido (non-breaking)
interface Flow {
  id: string;
  name: string;
  display_name?: string; // Novo campo opcional
}
```

**Exemplo de mudança proibida em v1:**
```typescript
// ❌ Proibido (breaking - requer v2)
interface Flow {
  id: string;
  flowName: string; // Renomeou 'name'
}
```

---

### Plano de Rollback

Se a migração falhar ou causar problemas:

1. **Manter monorepo ativo** durante 1 mês após migração
2. **Reverter para monorepo** se necessário:
   ```bash
   # Reverter CI/CD para monorepo
   git checkout main
   git revert <commit-migration>
   
   # Pausar deploys de multi-repos
   gh workflow disable cd-staging.yml
   gh workflow disable cd-production.yml
   ```
3. **Comunicar time** com 24h de antecedência

---

### Métricas de Sucesso

**KPIs para validar decisão (após 1 mês):**
- ✅ Tempo de CI reduzido em 50%+
- ✅ Zero conflitos em PRs entre times back/front
- ✅ Deploy independente funcionando em staging
- ✅ Rollback testado e documentado
- ✅ Satisfação do time (survey)

---

### Referências

- [Guia de Migração](./MIGRATION_GUIDE.md)
- [Contrato de API v1](./API_CONTRACT.md)
- [GitFlow Workflow](./GIT_WORKFLOW.md)

---

### Aprovações

- [x] Time Backend
- [x] Time Frontend  
- [x] DevOps
- [x] Product Owner

---

## ADR-002: Versionamento de API em URL (v1, v2, ...)

**Data:** 2025-11-12  
**Status:** ✅ Aprovado  

### Contexto
Com a separação de repositórios, precisamos definir como versionar a API para evitar breaking changes.

### Decisão
**Usar versionamento na URL:** `/api/v1/`, `/api/v2/`, etc.

**Alternativas consideradas:**
- Header `Accept: application/vnd.pytake.v2+json` ❌ (complexo para frontend)
- Query param `?version=2` ❌ (cache issues)
- Subdomain `v2.api.pytake.net` ❌ (infra complexa)

**Escolhido:** URL path `/api/v1/` ✅
- Simples para frontend
- Cache-friendly
- Óbvio em logs/docs

### Regras
- v1: ZERO breaking changes
- v2: Criado apenas quando necessário
- Manter v1 + v2 em paralelo por 3+ meses

---

## ADR-003: Git Subtree Split para Manter Histórico

**Data:** 2025-11-12  
**Status:** ✅ Aprovado  

### Decisão
Usar **git subtree split** ao invés de clone simples para manter histórico de commits.

**Por quê:**
- Rastreabilidade: `git blame` funciona
- Histórico completo: vê evolução do código
- Debug: `git bisect` para encontrar bugs

**Comando:**
```bash
git subtree split --prefix=backend -b backend-only
```

**Alternativa descartada:**
- Clone + delete (perde histórico) ❌

---

## Próximas Decisões Pendentes

- [ ] **ADR-004**: Escolha de Docker Registry (ghcr.io vs Docker Hub vs privado)
- [ ] **ADR-005**: Estratégia de testes E2E cross-repo
- [ ] **ADR-006**: Secrets management (GitHub Secrets vs Vault)
- [ ] **ADR-007**: Monitoramento & Observability (logging, métricas, alerts)
