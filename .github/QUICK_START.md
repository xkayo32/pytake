# 🚀 QUICK START - GitFlow + CI/CD

**Leia isto em 5 minutos. Depois leia a documentação completa.**

---

## O Que Mudou

### Antes
```
❌ Commits diretos em main/develop
❌ Código quebrado em produção
❌ Sem testes automáticos
❌ Sem padrão de commits
```

### Depois
```
✅ Apenas PRs podem fazer merge
✅ Testes automáticos obrigatórios
✅ Lint obrigatório
✅ Código sempre funcionando
```

---

## Fluxo (5 passos)

### 1. Preparar
```bash
git fetch origin
git pull origin develop
```

### 2. Criar branch
```bash
git checkout -b feature/TICKET-123-descricao
```

### 3. Fazer mudanças
```bash
git commit -m "feat: descrição"
git commit -m "test: testes"
```

### 4. Enviar
```bash
git push origin feature/TICKET-123-descricao
```

### 5. Abrir PR
- GitHub → New Pull Request
- Base: `develop`
- Aguardar CI/CD passar (verde)
- Aguardar 1 aprovação
- Merge automático

---

## Regras de Ouro

✅ **SEMPRE**
- Criar branch de `develop` (ou `main` para hotfix)
- Fazer commits pequenos
- Usar formato: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`
- Rodar testes antes de push
- Abrir PR via GitHub

❌ **NUNCA**
- `git push origin main`
- `git push origin develop`
- `git push -f`
- Commitar `.env` ou secrets
- Fazer merge direto (sempre via GitHub UI)

---

## Commits (Formato Obrigatório)

```bash
# ✅ Correto
git commit -m "feat: add new search endpoint"
git commit -m "fix: resolve 500 error in transfer"
git commit -m "test: add unit tests for auth"
git commit -m "docs: update API documentation"
git commit -m "refactor: extract service logic"

# ❌ Errado
git commit -m "ajustes"
git commit -m "fixed"
git commit -m "Updated"
```

---

## O Que Agora É Automático

1. **Lint** - ESLint, Pylint, Type checking
2. **Tests** - Jest + pytest
3. **Build** - Docker, Next.js
4. **Release Tags** - Automático em releases
5. **Branch Cleanup** - Deletado após merge

---

## Cenários Rápidos

### Scenario: Nova Feature
```bash
git checkout -b feature/TICKET-456-awesome-feature
# [fazer mudanças]
git push origin feature/TICKET-456-awesome-feature
# GitHub → Open PR → Aguardar CI/CD + merge
```

### Scenario: Bug Crítico
```bash
git checkout main
git pull origin main
git checkout -b hotfix/TICKET-789-critical-bug
# [corrigir]
git push origin hotfix/TICKET-789-critical-bug
# GitHub → Open PR (destination: main) → Merge
# (Automático: merge em develop também)
```

### Scenario: Release
```bash
git checkout -b release/v1.2.0
# [editar versão em package.json, etc]
git commit -m "chore: bump version to 1.2.0"
git push origin release/v1.2.0
# GitHub → Open PR (destination: main) → Merge
# (Automático: tag criada)
```

---

## Documentação Completa

| Documento | Ler Quando |
|-----------|-----------|
| `.github/GIT_WORKFLOW.md` | Entender tudo sobre GitFlow |
| `.github/AGENT_INSTRUCTIONS.md` | Instruir agentes IA (Copilot) |
| `.github/SETUP_GITFLOW.md` | Fazer setup completo |
| `.github/VISUAL_GUIDE.md` | Ver exemplos visuais |
| `GITFLOW_SUMMARY.md` | Resumo executivo |

---

## Setup (Uma vez)

```bash
# 1. Instalar GitHub CLI
# https://cli.github.com/

# 2. Fazer login
gh auth login

# 3. Proteger branches
bash setup-branch-protection.sh xkayo32 pytake

# 4. Verificar workflows em
# https://github.com/xkayo32/pytake/actions
```

---

## Checklist Antes de Considerar Pronto

```
[ ] Branch começou com feature/ ou hotfix/?
[ ] Commits seguem formato (feat:, fix:, etc)?
[ ] Testes passam localmente (npm test / pytest)?
[ ] Lint OK (npm run lint)?
[ ] Sem console.log ou debugger?
[ ] Sem .env ou secrets?
[ ] git push fez upload?
[ ] PR aberto no GitHub (destination correta)?
```

---

## Se Algo Quebrar

| Erro | Solução |
|------|---------|
| "refusing to allow you to create or update refs" | Tentou fazer push em main/develop. Use feature branch |
| "failed to push some refs" | `git fetch` + `git merge origin/develop` + `git push` |
| "you are not currently on a branch" | `git checkout -b feature/seu-branch` |
| "CI/CD falhou" | Ver logs no GitHub Actions. Corrigir localmente. `git commit` + `git push` |

---

## Próximo Passo

👉 **Leia `.github/GIT_WORKFLOW.md` - tem tudo explicado em detalhe**

---

**Dúvidas?**
1. Consulte `.github/AGENT_INSTRUCTIONS.md` (para agentes IA)
2. Consulte `.github/GIT_WORKFLOW.md` → Troubleshooting
3. Consulte `.github/VISUAL_GUIDE.md` para exemplos

**Status:** ✅ Pronto para usar!
