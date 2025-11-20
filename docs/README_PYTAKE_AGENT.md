# 🤖 PyTake Copilot Agent - Complete Documentation Index

## 📌 Quick Links

- �� **[Quick Start Guide](./PYTAKE_AGENT_QUICKSTART.md)** - Como usar o agente com exemplos
- 🏗️ **[Architecture & Design](./PYTAKE_AGENT_ARCHITECTURE.md)** - Design completo e fluxos
- 📍 **[Agent File Location](#-arquivo-do-agente)** - Onde está instalado

---

## 🎯 O que é o PyTake Agent?

Um **agente especializado** do GitHub Copilot Chat criado para o projeto PyTake que:

✅ Pesquisa contexto automaticamente  
✅ Valida contra 10 regras críticas do projeto  
✅ Cria planos detalhados antes de implementar  
✅ Implementa código seguindo arquitetura e convenções  
✅ Enforça boas práticas (multi-tenancy, RBAC, git workflow, etc)

---

## 🚀 Como Usar

### Passo 1: Abrir Copilot Chat
```
Windows/Linux: Ctrl + Shift + I
Mac: Cmd + Shift + I
```

### Passo 2: Chamar o Agente
```
@PyTake [sua tarefa aqui]
```

### Exemplos
```
@PyTake Adicionar endpoint GET /flows para listar fluxos da organização
@PyTake Criar modal para editar configurações de webhook do WhatsApp
@PyTake Corrigir erro CORS na integração de pagamentos
```

---

## 📁 Arquivo do Agente

**Localização:**
```
/home/administrator/.vscode-server/extensions/github.copilot-chat-0.33.2/assets/agents/PyTake.agent.md
```

**Tamanho:** 210 linhas  
**Formato:** YAML + Markdown  
**Status:** ✅ Ativo e pronto para uso

---

## 🚫 Regras que o Agente Enforça

O agente **PARARÁ** se você tentar:

| Regra | Proibido ❌ | Correto ✅ |
|-------|----------|---------|
| **Git Workflow** | Commit em `main` ou `develop` | Branch `feature/TICKET-XXX-*` |
| **Multi-Tenancy** | Esquecer `organization_id` em queries | SEMPRE filtrar por org |
| **API Client** | URLs relativas no frontend | `getApiUrl()` + `getAuthHeaders()` |
| **Secrets** | Armazenar em código | GitHub secrets obrigatórios |
| **Migrations** | Editar migrations aplicadas | Criar nova migration |
| **Staging/Prod** | Ativar workflows staging/prod | DEV-only CI/CD |
| **Role Guards** | Rotas sem role guards | RBAC enforcement obrigatório |
| **Author** | Referências de IA | "Kayo Carvalho Fernandes" |
| **Containers** | Instalar serviços localmente | Podman obrigatório |
| **Config** | Hard-code ports | `.env.podman` configuration |

---

## 📚 Documentação

### 1. PYTAKE_AGENT_QUICKSTART.md (214 linhas)
Guia prático com:
- ✅ Como usar o agente com exemplos
- ✅ Regras que ele enforça
- ✅ Handoffs (Create Plan / Implement / Open Editor)
- ✅ Comandos frequentes (Podman, Git)
- ✅ Arquivos-chave do projeto
- ✅ Dicas importantes
- ✅ Troubleshooting

**Ler quando:** Quer começar a usar o agente AGORA

### 2. PYTAKE_AGENT_ARCHITECTURE.md (~300 linhas)
Documentação técnica com:
- ✅ Overview da arquitetura
- ✅ Comparação Plan Agent vs PyTake Agent
- ✅ Modelo mental do agente
- ✅ Explicação de cada regra
- ✅ Fluxos de pesquisa e planejamento
- ✅ Template de plano
- ✅ Responsabilidades do agente
- ✅ Evolução futura

**Ler quando:** Quer entender COMO o agente funciona

---

## 🔧 Ferramentas Disponíveis

O agente tem acesso a 11 ferramentas:

```
✅ search                   - Busca semântica em código
✅ fetch                    - Buscar URLs/documentação
✅ githubRepo              - Pesquisar repositórios GitHub
✅ github/get_issue        - Obter issues do projeto
✅ github/get_issue_comments - Comentários de issues
✅ usages                  - Encontrar uso de símbolos no código
✅ problems                - Detectar problemas no código
✅ changes                 - Ver mudanças no repositório
✅ testFailure             - Analisar falhas de teste
✅ runSubagent             - Delegar pesquisa autônoma
✅ vscode-pr-tools         - Integração com pull requests
```

---

## 🎯 Handoffs (Próximos Passos)

Após pesquisar, o agente oferece 3 caminhos:

### 1. Create Plan
```
Cria um plano detalhado para revisar antes de implementar
Ideal para: features complexas, refatorações, investigações
```

### 2. Start Implementation
```
Começa implementação direto no código
Ideal para: bugs simples, hotfixes, mudanças pequenas
```

### 3. Open Plan in Editor
```
Abre plano em arquivo untitled para refinamento colaborativo
Ideal para: feedback intermediário, iteração com time
```

---

## 🎓 O que o Agente Sabe

### Stack PyTake
- **Backend:** FastAPI + SQLAlchemy + Alembic + PostgreSQL
- **Frontend:** Next.js 15.5.6 + React + TypeScript + Tailwind CSS
- **Infra:** Podman/Docker + Nginx + Redis + MongoDB

### Arquitetura
- Multi-tenancy por `organization_id`
- RBAC com roles: `super_admin`, `org_admin`, `agent`, `viewer`
- Backend layering: Routes → Services → Repositories
- Protected routes com role guards
- API client com interceptors de autenticação

### Configurações
- Portas: Frontend 3001→3000, Backend 8000, Nginx 8080, MongoDB 27018
- Environment: `backend/.env.podman`
- Git: `feature/TICKET-*` branches
- CI/CD: dev-only (staging/prod desativados)

---

## ⚡ Exemplos de Uso Avançado

### Feature Backend Completa
```
@PyTake Adicionar novo endpoint POST /api/v1/flows para criar fluxos,
com validação de dados, error handling e testes unitários
```

**O agente irá:**
1. Pesquisar endpoints existentes em `backend/app/api/v1/endpoints/`
2. Entender padrão de repository → service → route
3. Planejar com scoping de `organization_id`
4. Criar endpoint, service, repository + testes
5. Gerar migration se necessário
6. Commit com author attribution

### Feature Frontend com Segurança
```
@PyTake Criar página para gerenciar permissões de usuários
com proteção por RBAC (apenas org_admin pode acessar)
```

**O agente irá:**
1. Pesquisar padrões de role guards
2. Validar que apenas `org_admin` acessa
3. Planejar components com dark mode
4. Integrar com API client
5. Gerar com estrutura correcta

### Bug de Integração
```
@PyTake Investigar e corrigir erro de CORS na integração
de pagamentos no checkout
```

**O agente irá:**
1. Analisar erro de CORS
2. Verificar nginx config
3. Conferir FastAPI CORSMiddleware
4. Planejar fix seguindo CI/CD dev-only
5. Implementar e validar com curl

---

## 🔐 Segurança e Compliance

O agente garante:

✅ **Sem vazamento de secrets** - Força GitHub secrets  
✅ **Git workflow seguro** - Impede commit em main/develop  
✅ **Multi-tenancy safe** - Valida organization_id sempre  
✅ **RBAC compliant** - Enforça role guards  
✅ **Container-first** - Avoid local service installation  
✅ **Dev-only CI/CD** - Staging/prod desativados  
✅ **Author attribution** - Rastreabilidade de mudanças  

---

## 📞 Troubleshooting

### "Agente não aparece no Copilot Chat"
1. Reinicie VSCode
2. Verifique localização do arquivo
3. Limpe cache: `Ctrl+Shift+P` → "Clear Copilot Cache"

### "Agente ignora as regras"
1. Use `@PyTake` (case-sensitive)
2. Forneça contexto claro e específico
3. Mencione: "Verificar regras em `.github/copilot-instructions.md`"

### "Preciso de agente genérico"
Use `@Plan` para planejamento genérico (não PyTake-específico)

---

## 🤝 Contributing to Agent

Se encontrar bug ou quiser melhorar o agente:

1. Edite `/home/administrator/.vscode-server/extensions/github.copilot-chat-0.33.2/assets/agents/PyTake.agent.md`
2. Teste localmente com `@PyTake`
3. Documente mudanças em:
   - `PYTAKE_AGENT_QUICKSTART.md`
   - `PYTAKE_AGENT_ARCHITECTURE.md`

---

## 📊 Agente Stats

```
📝 Total de linhas:        210
🚫 Regras críticas:        10
🔧 Ferramentas:            11
🔗 Handoffs:               3
📚 Seções principais:       8
📋 Arquivos-chave ref:     25+
🌍 Linguagem:              Portuguese (Brasil)
✅ Status:                 Production Ready
```

---

## 📖 Referências

**Instruções do Projeto:**
- `.github/copilot-instructions.md` - Regras gerais
- `.github/instructions/instrucoes.instructions.md` - Regras específicas
- `.github/instructions/agente.instructions.md` - Design system
- `.github/CI_CD_DEV_ONLY.md` - Regras de CI/CD

**Documentação do Agente:**
- `docs/PYTAKE_AGENT_QUICKSTART.md` - Como usar
- `docs/PYTAKE_AGENT_ARCHITECTURE.md` - Design completo
- `docs/README_PYTAKE_AGENT.md` - Este arquivo

---

## 🎊 Conclusão

O **PyTake Agent** é seu assistente especializado para desenvolvimen
to no projeto PyTake. Ele garante que todas as mudanças seguem as regras, convenções e arquitetura do projeto.

**Próximos Passos:**
1. Restart VSCode
2. Abra Copilot Chat (Ctrl+Shift+I)
3. Digite: `@PyTake [sua tarefa]`
4. Leia `PYTAKE_AGENT_QUICKSTART.md` para exemplos

---

**Versão:** 1.0  
**Criado em:** November 20, 2025  
**Autor:** Kayo Carvalho Fernandes  
**Status:** ✅ Production Ready

