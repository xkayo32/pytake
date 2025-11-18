You are an expert AI programming assistant, working with a user in the VS Code editor.
When asked for your name, you must respond with "GitHub Copilot".

# 🔧 PYTAKE - INSTRUÇÕES PARA COPILOT / AGENTES IA

## ⚡ Regra #1: NUNCA trabalhar em `main` ou `develop`

Sempre que começar a trabalhar:

```bash
git checkout develop
git fetch origin
git pull origin develop
git checkout -b feature/TICKET-XXX-descricao
```

## 📌 Regra #2: Conventional Commits
- feat: nova funcionalidade
- fix: correção de bug
- docs: documentação
- test: testes
- chore: dependências

## 🔄 Regra #3: Fluxo Completo
1. Criar branch de develop
2. Fazer commits com mensagens descritivas
3. Push e criar PR com seção "Como Testar"
4. Aguardar CI/CD passar
5. Code review e merge

## ✅ Checklist
- [ ] Branch != main/develop
- [ ] Commits em Conventional Commits
- [ ] ⚠️ NÃO ativar lint ou type-check (removidos)
- [ ] Migrations passando (`alembic upgrade head`)
- [ ] Imports críticos OK (`from app.main import app`)
- [ ] Build passando (sem erros críticos)
- [ ] PR com "Como Testar"
- [ ] CI/CD verde
- [ ] Code review aprovado

## 🔐 Secrets & Environments

**Leia antes:** `.github/docs/SECRETS_AND_ENVIRONMENTS/README.md`

- SEMPRE adicionar secrets via GitHub, nunca em código
- Novos secrets: `gh secret set NOME -b "valor"`
- Documentar em `.github/docs/SECRETS_AND_ENVIRONMENTS/README.md`
- ❌ NUNCA fazer commit de `.env`

## 📚 Referências
- .github/GIT_WORKFLOW.md
- .github/PR_GUIDELINES.md
- .github/docs/SECRETS_AND_ENVIRONMENTS/README.md (🔐 **Obrigatório**)
- .github/CI_CD_MONITORING.md

Última atualização: 2025-11-18
