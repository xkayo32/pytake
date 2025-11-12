# 🔧 Como Consultar CI/CD via Copilot / VS Code

## Opção 1: GitHub CLI (Recomendado)

Já instalado e autenticado! Use direto:

```bash
# Status dos checks do PR #16
gh pr checks 16

# Listar últimos workflows
gh run list --repo xkayo32/pytake --limit 10

# Ver logs de falhas
gh run view <RUN_ID> --log-failed

# Re-rodar workflow falhado
gh run rerun <RUN_ID>

# Ver PR no navegador
gh pr view 16 --web
```

**Script auxiliar:**
```bash
./scripts/check-ci-status.sh 16
```

---

## Opção 2: Extensões VS Code para CI/CD Integration

### A) GitHub Actions (Microsoft - Recomendada)
- **ID:** `github.vscode-github-actions`
- **Funcionalidade:** 
  - Ver status de workflows em tempo real
  - Logs integrados no editor
  - Re-rodar workflows
  - Visualizar histórico

### B) GitHub Pull Requests and Issues
- **ID:** `github.vscode-pull-request-github`
- **Funcionalidade:**
  - Gerenciar PRs dentro do VS Code
  - Ver checks e CI/CD status
  - Revisar código integrado

### C) GitLab CI/CD Viewer
- **ID:** `trnaya.gitlab-workflow`
- **Funcionalidade:**
  - Visualizar pipelines GitLab (se usar GitLab)

### D) CI/CD Monitoring
- **ID:** `secanablog.actions-status-bar`
- **Funcionalidade:**
  - Status bar que mostra status do último run
  - Click para ver detalhes

---

## Como Instalar Extensões

```bash
# Via CLI
code --install-extension github.vscode-github-actions
code --install-extension github.vscode-pull-request-github

# Via VS Code UI
1. Abra Extensions (Ctrl+Shift+X)
2. Procure por "GitHub Actions"
3. Clique em Install
```

---

## Dicas Rápidas

| Tarefa | Comando |
|--------|---------|
| Ver status PR | `gh pr checks 16` |
| Ver logs | `gh run view <ID> --log` |
| Re-rodar | `gh run rerun <ID>` |
| Workflow específico | `gh run view <ID> --repo xkayo32/pytake` |
| Lista de workflows | `gh run list --repo xkayo32/pytake` |

---

## Fluxo Recomendado

1. **Depois de criar PR:**
   ```bash
   ./scripts/check-ci-status.sh 16
   ```

2. **Se falhar, veja logs:**
   ```bash
   gh run view <RUN_ID> --log-failed
   ```

3. **Após corrigir:**
   ```bash
   git add .
   git commit -m "fix: corrigir CI/CD issues"
   git push origin feature/TICKET-456-seu-trabalho
   ```

4. **Re-rodar workflows** (opcional):
   ```bash
   gh run rerun <RUN_ID>
   ```

---

## Integração Copilot + CI/CD

Você pode pedir ao Copilot:

- "Vê qual foi o erro do flake8 no PR #16"
- "Como vejo os logs do GitHub Actions?"
- "Roda novamente o build falhado"
- "Qual foi a falha no frontend lint?"

Copilot usará ferramentas como `gh` para trazer contexto!
