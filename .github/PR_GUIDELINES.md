# 📋 Guia de PR: Instruções vs CI/CD

## 🎯 Resposta Rápida

**SEMPRE faça os dois:**
1. ✅ Incluir instruções de teste no PR
2. ✅ Aguardar CI/CD passar
3. ✅ Fazer code review
4. ✅ Fazer merge

---

## 🔄 Fluxo Completo

```
┌─────────────────────────────────────────────────┐
│ 1. Desenvolver em feature/*                      │
│    └─ Commits com Conventional Commits          │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ 2. Criar PR COM Instruções de Teste             │
│    ✓ Descrição clara                            │
│    ✓ Mudanças listadas                          │
│    ✓ COMO TESTAR (seção obrigatória)           │
│    ✓ Checklist preenchida                       │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ 3. CI/CD Executa (GitHub Actions)               │
│    ✓ Lint                                       │
│    ✓ Testes                                     │
│    ✓ Build                                      │
│    ✓ Security scan                              │
│                                                 │
│    ❌ SE FALHAR: Corrigir e fazer push novamente│
│    ✅ SE PASSAR: Continuar                      │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ 4. Code Review                                   │
│    ✓ Reviewer lê instruções                     │
│    ✓ Valida código                              │
│    ✓ (Opcionalmente) testa localmente           │
│    ✓ Aprova PR                                  │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ 5. MERGE                                         │
│    ✓ Apenas após:                               │
│      • CI/CD estar ✅ VERDE                     │
│      • Mínimo 1 aprovação                       │
│      • Nenhum conflito                          │
└─────────────────────────────────────────────────┘
```

---

## 📝 Estrutura de PR Recomendada

```markdown
## 🔄 Descrição
O que essa mudança faz e por quê.

## ✨ Mudanças
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

## 🧪 Como Testar
Instruções CLARAS e PASSO-A-PASSO:

### Backend
```bash
cd backend
python -m pip install -r requirements.txt
pytest tests/ -v
```

### Frontend
```bash
cd frontend
npm ci
npm run build
npm run lint
```

### Docker
```bash
podman compose down
podman compose build
podman compose up -d
```

## ✔️ Checklist
- [x] CI/CD verde (aguardando)
- [x] Testado localmente
- [x] Nenhum console.log
- [x] Commits descritivos
```

---

## ⏱️ Timeline Típica

| Etapa | Tempo | Responsável |
|-------|-------|-------------|
| Criar PR | 5 min | Desenvolvedor |
| CI/CD executar | 10-30 min | GitHub Actions |
| Code Review | 30 min - 2h | Reviewer |
| Ajustes (se needed) | Variável | Desenvolvedor |
| **TOTAL** | **45 min - 3h** | **-** |

---

## 🚨 ERROS COMUNS

### ❌ Erro 1: Fazer merge sem CI/CD passar
**Nunca!** Isso quebra a main/develop
```
❌ "CI/CD está falhando mas vou fazer merge mesmo"
✅ "Vou corrigir os testes primeiro"
```

### ❌ Erro 2: PR sem instruções de teste
**Reviewer não sabe como validar**
```
❌ "Só a descrição basta"
✅ "Incluir seção 'Como Testar' detalhada"
```

### ❌ Erro 3: Não testar localmente antes de PR
**Aumenta falhas de CI/CD**
```
❌ "Vou confiar no CI/CD"
✅ "Testar localmente antes de fazer push"
```

---

## ✅ CHECKLIST: PR Bem Feito

- [ ] **Desenvolvedor:**
  - [ ] Testou localmente
  - [ ] Commits descritivos
  - [ ] Criou PR com instruções
  - [ ] Checklist preenchida

- [ ] **CI/CD:**
  - [ ] Lint passou
  - [ ] Testes passaram
  - [ ] Build passou
  - [ ] Security scan ok

- [ ] **Reviewer:**
  - [ ] Leu código
  - [ ] Testou seguindo instruções
  - [ ] Aprovaram

- [ ] **Merge:**
  - [ ] CI/CD ✅ verde
  - [ ] Aprovação ✅
  - [ ] Sem conflitos

---

## 💡 Resumo

| Aspecto | Instrução |
|--------|----------|
| **Incluir instruções?** | ✅ SIM, sempre |
| **Esperar CI/CD?** | ✅ SIM, obrigatório |
| **Fazer code review?** | ✅ SIM, manual |
| **Testar localmente?** | ✅ SIM, antes de PR |
| **Poder fazer merge sem CI/CD?** | ❌ NÃO, nunca |

**RESULTADO:** 3 camadas de qualidade = código confiável! 🚀
