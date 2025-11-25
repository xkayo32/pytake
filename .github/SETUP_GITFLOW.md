# 🚀 Setup Inicial: GitFlow + CI/CD

## Passo 1: Preparar Repositório Local

```bash
cd /home/administrator/pytake

# Sincronizar branches
git fetch origin
git branch -a

# Checkout em develop se ainda não está
git checkout develop
git pull origin develop

# Verificar branch padrão
git remote set-head origin -a
```

**Output esperado:**
```
* main
  remotes/origin/HEAD -> origin/develop (✅ já está apontando para develop)
  remotes/origin/develop
  remotes/origin/main
```

---

## Passo 2: Proteger Branches no GitHub

### Opção A: Via Script (Recomendado)

```bash
# Instalar GitHub CLI se não tiver
# https://cli.github.com/

# Fazer login
gh auth login

# Rodar script de setup
bash setup-branch-protection.sh xkayo32 pytake
```

### Opção B: Manual via GitHub UI

Ir para: https://github.com/xkayo32/pytake/settings/branches

**Para main:**
- ✅ Require a pull request before merging (1 approval)
- ✅ Require status checks to pass before merging
  - Selecionar: `lint`, `test`, `build`
- ✅ Require branches to be up to date before merging
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Allow force pushes: ❌ NÃO
- ✅ Allow deletions: ❌ NÃO
- ✅ Auto delete head branches

**Para develop:**
- ✅ Require a pull request before merging (1 approval)
- ✅ Require status checks to pass before merging
  - Selecionar: `lint`, `test`, `build`
- ✅ Require branches to be up to date before merging
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Allow force pushes: ❌ NÃO
- ✅ Allow deletions: ❌ NÃO
- ✅ Auto delete head branches

---

## Passo 3: Ativar GitHub Actions

Ir para: https://github.com/xkayo32/pytake/actions

Clicar em "Enable Actions"

**Verificar workflows criados:**
- ✅ Lint & Type Check (`.github/workflows/lint.yml`)
- ✅ Tests (`.github/workflows/test.yml`)
- ✅ Build (`.github/workflows/build.yml`)
- ✅ Release (`.github/workflows/release.yml`)

---

## Passo 4: Testar CI/CD Pipelines

### Scenario: Testar Lint Workflow

```bash
# Criar branch de teste
git checkout develop
git pull origin develop
git checkout -b test/gitflow-setup

# Fazer alteração intencional (quebrar lint)
echo "console.log('test')" >> frontend/src/app/page.tsx

# Commit
git add .
git commit -m "test: quebrar lint propositalmente"

# Push
git push origin test/gitflow-setup

# Abrir PR no GitHub
# → ir para: https://github.com/xkayo32/pytake/pull/new/test/gitflow-setup
# → destination: develop
# → criar PR
```

**Esperado:**
- ❌ Lint falha (por causa do console.log)
- ❌ Botão de merge desativado
- ✅ Mensagem de erro clara no PR

```bash
# Corrigir o erro
git reset --soft HEAD~1
git restore frontend/src/app/page.tsx
git commit -m "test: fix lint errors"
git push --force-with-lease origin test/gitflow-setup

# PR atualiza automaticamente
# → Lint agora passa ✅
# → Botão de merge ativa
```

**Limpar branch de teste:**
```bash
git checkout develop
git branch -D test/gitflow-setup
git push origin --delete test/gitflow-setup
```

---

## Passo 5: Atualizar CHANGELOG

Criar versão inicial:

```bash
cat > CHANGELOG.md << 'EOF'
# Changelog

Todas as mudanças notáveis neste projeto estão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/),
e este projeto segue [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Implementação de GitFlow workflow
- CI/CD pipeline com GitHub Actions
- Proteção de branches main e develop

### Changed
- Repositório agora segue Conventional Commits

---

## [1.0.0] - 2025-11-12

### Added
- Setup inicial do projeto PyTake
- Backend FastAPI + SQLAlchemy
- Frontend Next.js com React
- Docker Compose orchestration

EOF
```

---

## Passo 6: Documentação no README

Adicionar ao `README.md`:

```markdown
## 🔀 Development Workflow (GitFlow)

Este projeto segue o padrão GitFlow. Consulte:

- [GIT_WORKFLOW.md](.github/GIT_WORKFLOW.md) - Workflow completo
- [AGENT_INSTRUCTIONS.md](.github/AGENT_INSTRUCTIONS.md) - Para agentes IA

### Quick Start

```bash
# Clonar
git clone https://github.com/xkayo32/pytake.git
cd pytake

# Setup inicial
cp .env.example .env
podman compose up -d
podman exec pytake-backend alembic upgrade head

# Criar feature branch
git checkout develop
git checkout -b feature/TICKET-XXX-description

# Fazer mudanças, commitar, push
git add .
git commit -m "feat: descrição da feature"
git push origin feature/TICKET-XXX-description

# Abrir PR no GitHub
```

## 📚 CI/CD Pipeline

Todos os workflows rodam automaticamente:

- **Lint**: ESLint, Pylint, Type checking
- **Tests**: Jest, pytest, coverage
- **Build**: Docker images, Next.js build
- **Release**: Criar tags e releases

Visualizar status em: https://github.com/xkayo32/pytake/actions
```

---

## Passo 7: Onboarding da Equipe

Compartilhar com a equipe:

1. Este guia (Setup Inicial)
2. `.github/GIT_WORKFLOW.md` - Workflow detalhado
3. `.github/AGENT_INSTRUCTIONS.md` - Para agentes IA
4. `.github/copilot-instructions.md` - Copilot específico

**Comunicado sugerido:**

```
🎉 Repositório PyTake agora segue GitFlow + CI/CD!

✅ Mudanças implementadas:
- Proteção de branches (main e develop)
- GitHub Actions CI/CD pipeline
- Conventional Commits obrigatório
- Documentação completa

📋 O que fazer agora:
1. Ler .github/GIT_WORKFLOW.md
2. Nunca commitar em main/develop
3. Sempre criar PRs para mudar código
4. Commits devem seguir: feat:, fix:, refactor:, etc

❌ PROIBIDO:
- git push origin main
- git push origin develop
- git push -f

✅ OBRIGATÓRIO:
- Criar feature branch
- Fazer PR
- Aguardar CI/CD passar
- 1+ aprovação antes de merge

Dúvidas? Consulte .github/AGENT_INSTRUCTIONS.md ou .github/GIT_WORKFLOW.md
```

---

## Passo 8: Configurar IDE (VS Code)

Adicionar ao `.vscode/settings.json`:

```json
{
  "git.ignoreLimitWarning": true,
  "git.branchProtection": ["main", "develop"],
  "editor.formatOnSave": true,
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "ms-python.python",
    "editor.codeActionsOnSave": {
      "source.fixAll.pylint": "explicit"
    }
  },
  "[typescript]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": "explicit"
    }
  },
  "git.postCommitCommand": "sync"
}
```

---

## ✅ Checklist Final

- [ ] Branches local sincronizados (`git fetch origin`)
- [ ] Branch default setado para develop no GitHub
- [ ] main protegido (requer 1 PR + CI/CD)
- [ ] develop protegido (requer 1 PR + CI/CD)
- [ ] GitHub Actions ativado
- [ ] Workflows criados e rodando
- [ ] CHANGELOG.md criado
- [ ] README.md atualizado
- [ ] Equipe notificada
- [ ] .github/GIT_WORKFLOW.md compartilhado

---

## 🆘 Troubleshooting

### Problema: "failed to push some refs to 'origin'"

**Solução:**
```bash
git fetch origin
git rebase origin/develop
git push origin feature/seu-branch
```

### Problema: "you are not currently on a branch"

**Solução:**
```bash
git status
git checkout -b feature/seu-branch origin/feature/seu-branch
```

### Problema: "branch protection: status checks failed"

**Solução:**
1. Abra a PR no GitHub
2. Veja em "Checks" o que falhou
3. Corrija localmente
4. Commit e push
5. PR atualiza automaticamente

### Problema: "refusing to allow you to create or update refs"

**Significa:** Você tentou fazer push para main ou develop

**Solução:**
```bash
git checkout feature/seu-branch
git push origin feature/seu-branch
# Depois abra PR no GitHub
```

---

**Status**: ✅ Setup Completo  
**Data**: 2025-11-12  
**Próximo passo**: Começar a usar GitFlow em novos trabalhos!
