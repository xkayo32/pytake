# 🤖 Instruções para GitHub Copilot / Agentes IA

Este documento estabelece regras rígidas que TODOS os agentes devem seguir ao trabalhar neste repositório.

## ⚡ Regra #1: NUNCA trabalhar em `main` ou `develop`

Sempre que começar a trabalhar:

```bash
# 1. Verificar branch atual
git branch

# ❌ Se estiver em main ou develop:
git checkout develop
git fetch origin
git pull origin develop
git checkout -b feature/TICKET-description
```

**Penalty**: Se você tentar fazer commit ou push em `main`/`develop`, o GitHub Actions bloqueará automaticamente.

---

## 📌 Regra #2: Estrutura de Commits

Cada commit DEVE seguir formato Conventional Commits:

```
feat: adicionar nova funcionalidade
fix: corrigir bug específico
refactor: reestruturar código sem mudança de comportamento
docs: atualizar documentação
test: adicionar ou atualizar testes
chore: atualizações de dependências, config
perf: melhorias de performance
style: formatação, sem mudança lógica
```

**Exemplo real:**
```bash
git commit -m "feat: implementar endpoint POST /conversations/{id}/reassign"
git commit -m "test: adicionar testes para endpoint reassign"
git commit -m "docs: atualizar README com novo endpoint"
```

❌ **NÃO FAZER:**
```bash
git commit -m "Ajustes vários"
git commit -m "Fixed"
git commit -m "Updated"
```

---

## 🔄 Regra #3: Fluxo Antes de Editar Arquivos

**SEMPRE fazer isso antes de começar:**

```bash
# 1. Estar em develop ou feature branch
git branch  # verificar

# 2. Se for fazer feature nova:
git checkout develop
git fetch origin
git pull origin develop
git checkout -b feature/TICKET-XXX-descricao

# 3. Se for fazer hotfix (correção crítica):
git checkout main
git fetch origin
git pull origin main
git checkout -b hotfix/TICKET-YYY-descricao

# 4. Para cada arquivo que editar:
git add <arquivo>
git commit -m "tipo: descrição concisa"

# 5. Verificar status:
git status  # não deve haver arquivos não commitados
git log --oneline -5  # ver últimos commits
```

---

## ✅ Regra #4: Checklist Antes de Considerar "Pronto"

Sempre que terminar de trabalhar em uma feature:

```
[ ] 1. git branch → NÃO é main ou develop
[ ] 2. Todos os commits seguem Conventional Commits
[ ] 3. Rodar testes locais (sem erros)
[ ] 4. Rodar lint (sem erros)
[ ] 5. Atualizar CHANGELOG.md (se relevante)
[ ] 6. Nenhum console.log, debugger, ou código comentado
[ ] 7. Nenhum arquivo .env ou secrets commitado
[ ] 8. git push origin feature/TICKET-XXX-descricao
[ ] 9. Abrir PR no GitHub com descrição clara
```

---

## 🚫 Regra #5: ABSOLUTAMENTE PROIBIDO

❌ **NUNCA fazer:**
- `git push origin main` (força ou não)
- `git push origin develop` (força ou não)
- `git push -f` em qualquer branch
- `git commit --amend && git push -f` (reescrever história)
- Commitar arquivos `.env`, `.env.local`, credentials, keys
- Fazer merge localmente (sempre via PR)
- Deletar branch remoto manualmente
- Commitar `node_modules/`, `__pycache__/`, `.next/`

Se cometer um erro:
1. ⛔ NÃO tente force push
2. ✅ Crie um novo commit revertendo as mudanças
3. ✅ Informe ao usuário o que aconteceu

---

## 🎯 Regra #6: Tipos de Trabalho e Branches

### Quando receber pedido para implementar feature:

```
User request: "Quero adicionar login com SMS"
├─ Seu fluxo:
├─ 1. Verificar if main/develop, senão checkout feature branch
├─ 2. Criar: feature/auth-sms-login
├─ 3. Implementar com commits pequenos:
│  ├─ feat: add SMS service integration
│  ├─ feat: add SMS login API endpoint
│  ├─ test: add tests for SMS login
│  └─ docs: document SMS login flow
├─ 4. Push e sugerir PR
```

### Quando receber pedido para corrigir bug crítico:

```
User request: "SQL injection crítico na busca"
├─ Seu fluxo:
├─ 1. git checkout main (NÃO develop!)
├─ 2. Criar: hotfix/sec-sql-injection-search
├─ 3. Implementar com commits:
│  ├─ fix: sanitize SQL queries in search
│  └─ test: add regression test for injection
├─ 4. Push e sugerir PR para main
├─ 5. Após merge em main → automático para develop
```

---

## 🔍 Regra #7: Comunicação com Usuário

**SEMPRE comunicar:**

```
"Iniciando refatoração da sidebar..."

Branch atual: main
Mudando para: feature/TICKET-123-sidebar-refactor

✅ Branch criado: feature/TICKET-123-sidebar-refactor
📝 Fazendo edits...

Commit 1: feat: replace overflow-y-auto with tabs
Commit 2: refactor: extract ConversationActions component
Commit 3: test: add sidebar interaction tests
Commit 4: docs: update sidebar UX documentation

✅ Trabalho concluído!

Sugestão de PR:
- Title: "feat: refactor conversation sidebar with tabs"
- Destination: develop
- Changes: 3 commits, XX files changed, +YYY -ZZZ

Próximo passo: 
1. git push origin feature/TICKET-123-sidebar-refactor
2. Abrir PR no GitHub
3. Aguardar CI/CD passar e review
```

---

## 🧪 Regra #8: Testes Locais

Antes de considerar pronto, SEMPRE rodar:

**Backend:**
```bash
cd backend
pytest tests/ -v  # testes passando?
pylint app/       # lint OK?
black app/        # formatação OK?
```

**Frontend:**
```bash
cd frontend
npm run lint      # ESLint OK?
npm run test      # Jest OK?
npm run build     # Build OK?
```

Se algum teste falhar:
1. Não faça push
2. Corrija localmente
3. Teste novamente
4. Só depois faça commit e push

---

## 📚 Regra #9: Referências de Branch

Quando sugerir uma PR, sempre incluir:

```markdown
### ✅ PR Ready

**Branch**: feature/TICKET-456-authentication-refactor
**Base**: develop
**Commits**: 3
**Files Changed**: 7

### 📝 Description
Refactored authentication service to support multiple OAuth providers.

### 🎯 Changes
- feat: add OAuth2 factory pattern
- feat: support Google and GitHub OAuth
- test: add 8 new integration tests
- docs: update auth documentation

### ✅ Checklist
- [x] Tests passing locally
- [x] Lint without errors
- [x] No console.logs or debuggers
- [x] CHANGELOG.md updated
- [x] No secrets committed

### 🔗 Issue
Closes #JIRA-456
```

---

## ⚙️ Regra #10: Quando Pedir Ajuda

Se algo dar errado:

```
❌ Erro: "fatal: You are not currently on a branch"

Resposta:
1. Descrever o erro completo
2. Mostrar output de: git status, git branch
3. Não fazer mais nada até receber instruções
4. NÃO tentar force push ou rebase sem ajuda
```

---

## 🎓 Resumo Executivo

| Ação | ✅ Permitido | ❌ Proibido |
|------|-----------|---------|
| Criar branch de feature | feature/* a partir de develop | Qualquer coisa a partir de main |
| Commitar direto em main | ❌ NUNCA | ✅ SEMPRE via PR |
| Commitar direto em develop | ❌ NUNCA | ✅ SEMPRE via PR |
| Usar force push | ❌ NUNCA | ✅ SEMPRE rebase --no-ff |
| Commitar secrets | ❌ NUNCA | ✅ Use .env.example |
| Reescrever história pública | ❌ NUNCA | ✅ Use revert commit |
| Fazer PR para develop | ✅ SIM | ❌ Se não passa CI/CD |
| Fazer PR para main (release) | ✅ SIM (tags) | ❌ Features direto em main |
| Squash commits antes de merge | ✅ SIM (GitHub button) | ❌ Localmente com force push |

---

## 📞 Checklist para Agente Antes de Fazer Push

```
Vou fazer push agora? Responder SIM para TODAS:

[ ] Estou em feature/*, hotfix/*, ou release/* branch?
[ ] git log mostra commits com Conventional Commits format?
[ ] Nenhum commit é em main ou develop?
[ ] Testes passam localmente (npm test / pytest)?
[ ] Lint passa sem erros (npm run lint / pylint)?
[ ] Sem console.log ou debugger no código?
[ ] Sem .env ou secrets nos commits?
[ ] CHANGELOG.md foi atualizado?
[ ] git status mostra "nothing to commit"?
[ ] Descrição de PR está clara?

Se ANY é [ ], STOP e corrija antes de fazer push!
```

---

**Versão**: 1.0  
**Última atualização**: 2025-11-12  
**Aplicável a**: Todos os agentes IA (Copilot, etc)
