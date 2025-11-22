# 🔧 CORREÇÕES NECESSÁRIAS - Instruções do Copilot

**Data:** 19 de Novembro de 2025  
**Autor:** Kayo Carvalho Fernandes  
**Status:** Pronto para implementação

---

## 📌 CORREÇÃO #1: Portas de Container (CRÍTICO)

**Arquivo:** `.github/copilot-instructions.md`

**ANTES:**
```
- Frontend: exposto em 3001 (host) → container 3000
- Backend: 8000 (docs em /api/v1/docs)
- Nginx proxy: 8080
- MongoDB: mapeado em 27018
```

**DEPOIS:**
```
- Frontend: 3002 (host) → 3000 (container) | http://localhost:3002
- Backend: 8002 (host) → 8000 (container) | http://localhost:8002/api/v1/docs
- PostgreSQL: 5435 (host) → 5432 (container)
- Redis: 6382 (host) → 6379 (container)
- MongoDB: 27020 (host) → 27017 (container)
- Nginx: NÃO em desenvolvimento
```

---

## 📌 CORREÇÃO #2: Referências de Arquivos (MÉDIO)

**ANTES:**
```
- `.github/docs/SECRETS_AND_ENVIRONMENTS/README.md`
- `.github/PR_GUIDELINES.md`
```

**DEPOIS:**
```
- `.github/GITHUB_SECRETS_SETUP.md`
- `.github/GIT_WORKFLOW.md`
```

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 19 de Novembro de 2025  
**Versão:** 1.0
