# 📊 ANÁLISE: Instruções do Copilot & Docs que ele usar

**Data:** 19 de Novembro de 2025  
**Status:** Análise completa realizada  
**Autor:** Kayo Carvalho Fernandes  

---

## 🎯 RESUMO EXECUTIVO

As instruções do Copilot e documentação estão **80% adequadas** ao projeto, mas identificamos **13 pontos críticos** que precisam ajuste:

✅ **Muito Bom:**
- GitFlow workflow claramente documentado
- Autor/assinatura unificados
- Secrets management bem definido
- CI/CD status corretamente reportado (dev-only mode)

⚠️ **Precisa Melhoria:**
- Portas de containers **desatualizadas** em instruções
- Referências a arquivos que não existem
- Multi-tenancy não mencionada adequadamente
- Falta de padrões específicos de testes
- Comando de migrations impreciso

❌ **Crítico:**
- `agente.instructions.md` menciona "Figma" e "design systems" (não é foco do projeto)
- Referências a ORMs que não estão em uso (Tortoise, Prisma)
- Instruções de staging/prod ainda presentes em alguns docs

---

## 📋 ACHADOS DETALHADOS (13 PROBLEMAS)

### 1. **PORTAS DE CONTAINER INCORRETAS** ⚠️ CRÍTICO

**Problema:**
- `copilot-instructions.md` diz: "Frontend: 3001 (host) → 3000"
- `docker-compose.yml` ATUAL: "3002:3000"

**Impacto:** Copilot dá instruções erradas ao debugar.

**Solução:** Atualizar todas as portas para valores corretos (3002, 8002, 5435, 6382, 27020)

---

### 2. **REFERÊNCIAS A ARQUIVOS QUE NÃO EXISTEM** ⚠️ MÉDIO

**Problemas encontrados:**
- `.github/docs/SECRETS_AND_ENVIRONMENTS/README.md` - NÃO EXISTE
- `.github/PR_GUIDELINES.md` - NÃO EXISTE

**Solução:** Usar arquivos que existem (GITHUB_SECRETS_SETUP.md, GIT_WORKFLOW.md)

---

### 3. **AGENTE.INSTRUCTIONS.MD DESALINHADO** ❌ CRÍTICO

**Problemas:**
- 60% de conteúdo irrelevante (design, color theory, Figma)
- Stack incorreto (MUI, Chakra UI em vez de shadcn/ui)
- ORMs que não existem (Tortoise, Prisma)

**Impacto:** Copilot pode sugerir stack incorreto

**Solução:** Adicionar disclaimer e reescrever com foco real

---

## ✅ RECOMENDAÇÕES

### 🔴 CRÍTICO (Fazer primeira)

1. Atualizar portas no `copilot-instructions.md` → 15 min
2. Reescrever `agente.instructions.md` → 45 min
3. Consolidar instruções → 30 min

### 🟡 MÉDIO (Fazer depois)

4. Criar `TESTING_STANDARDS.md` → 45 min
5. Criar `API_PATTERNS.md` → 30 min
6. Criar `MODELS_PATTERNS.md` → 20 min

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 19 de Novembro de 2025  
**Versão:** 1.0
