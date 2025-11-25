# 📋 Como Manter Instruções em Todas as Branches

Você perguntou: "como manter ela em todas as branch que criar?"

## ✅ SOLUÇÃO IMPLEMENTADA

As instruções agora estão **PERMANENTEMENTE** em todas as branches porque foram commitadas no Git.

---

## 🎯 O Que Foi Feito

### 1. **`.copilot-instructions`** (Raiz do Projeto)
```
pytake/
├── .copilot-instructions ← AQUI (em todas as branches)
├── .github/
└── [outros arquivos]
```

**Por quê?**
- Arquivo na raiz = visível em QUALQUER branch
- Commitado no Git = copiado para todas as branches
- Fácil de encontrar (não está em pasta profunda)

**Como usar:**
```bash
cat .copilot-instructions
# Mostra instruções do Copilot
```

### 2. **`.gitmessage`** (Template de Commits)
```
Contém template para padronizar mensagens de commit
Lembrete: feat:, fix:, test:, docs:, etc
```

### 3. **`setup-git-config.sh`** (Setup Automático)
```bash
bash setup-git-config.sh
# Configura Git localmente com:
# - Template de commit
# - Fetch automático
# - Case-sensitive paths
```

### 4. **`.github/instructions/.gitkeep`**
```
Garante que pasta .github/instructions sempre exista
(Git ignora pastas vazias, então o .gitkeep é necessário)
```

---

## 🔄 Como Funciona em Diferentes Branches

### Cenário 1: Você cria nova feature branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/TICKET-123-nova

# ✅ .copilot-instructions já está aqui!
cat .copilot-instructions  # ← Funciona
```

### Cenário 2: Você muda de branch

```bash
git checkout feature/TICKET-456

# ✅ .copilot-instructions já está aqui também!
cat .copilot-instructions  # ← Funciona
```

### Cenário 3: Um colega puxa seu trabalho

```bash
git pull origin feature/seu-branch

# ✅ .copilot-instructions vem junto!
cat .copilot-instructions  # ← Funciona
```

---

## 📚 Estrutura Completa de Instruções

```
Instruções em TODOS os lugares:

1. .copilot-instructions (raiz)
   └─ Rápido, sempre acessível
   └─ Em TODAS as branches

2. .github/QUICK_START.md
   └─ 5 minutos de leitura
   └─ Em TODAS as branches

3. .github/AGENT_INSTRUCTIONS.md
   └─ 15 minutos, detalhado
   └─ Em TODAS as branches

4. .github/GIT_WORKFLOW.md
   └─ Referência completa
   └─ Em TODAS as branches

5. .github/INDEX.md
   └─ Mapa de todos os documentos
   └─ Em TODAS as branches

6. README.md (atualizado)
   └─ Linques para GitFlow + CI/CD
   └─ Em TODAS as branches
```

---

## 🚀 Como Usar Agora

### Setup Inicial (Uma vez)

```bash
# 1. Configurar Git localmente
bash setup-git-config.sh

# 2. Ver instruções do Copilot
cat .copilot-instructions
```

### Para Cada Nova Branch

```bash
# 1. Criar branch
git checkout -b feature/TICKET-123

# 2. Verificar instruções (sempre disponíveis!)
cat .copilot-instructions

# 3. Começar trabalho
git commit -m "feat: ..."
```

---

## ✨ Garantias

### ✅ Você pode contar com:
- `.copilot-instructions` em TODAS as branches
- `.github/` documentação em TODAS as branches
- `.gitmessage` template em TODAS as branches
- README com links atualizados em TODAS as branches

### ❌ NÃO faria isto:
- Copiar arquivos manualmente (automático!)
- Atualizar em múltiplas branches (apenas em develop)
- Perder instruções ao trocar branch (commitadas no Git)

---

## 🤖 Para Agentes IA (Copilot)

**Toda vez que começar em uma nova branch:**

```bash
# 1. Verificar instruções
cat .copilot-instructions

# 2. Ler documentação
cat .github/QUICK_START.md
cat .github/AGENT_INSTRUCTIONS.md

# 3. Começar trabalho
git checkout -b feature/TICKET-XXX
# [fazer mudanças]
git commit -m "feat: ..."
```

---

## 💾 Como Manter Atualizado

Se precisar atualizar as instruções:

```bash
# 1. Editar em develop
git checkout develop
git pull origin develop
git checkout -b feature/update-instructions

# 2. Editar os arquivos
# - .copilot-instructions
# - .github/AGENT_INSTRUCTIONS.md
# - etc

# 3. Commit e PR
git add .
git commit -m "docs: update copilot instructions"
git push origin feature/update-instructions

# 4. Depois do merge em develop:
# ✅ Todas as novas branches terão versão atualizada
```

---

## 🎓 Resumo

| Arquivo | Localização | Branches | Propósito |
|---------|------------|----------|----------|
| `.copilot-instructions` | Raiz | TODAS | Instruções rápidas |
| `.github/QUICK_START.md` | .github/ | TODAS | 5 min read |
| `.github/AGENT_INSTRUCTIONS.md` | .github/ | TODAS | Regras detalhadas |
| `.gitmessage` | Raiz | TODAS | Template commits |
| `.github/INDEX.md` | .github/ | TODAS | Índice completo |
| `README.md` | Raiz | TODAS | Documentação project |

---

## 🚀 Próximo Passo

Você está em: `feature/TICKET-456-seu-trabalho`

✅ Instruções já estão aqui!

Comece a trabalhar:

```bash
# Ver instruções
cat .copilot-instructions

# Começar desenvolvimento
git commit -m "feat: ..."
```

---

**Status:** ✅ Instruções agora em TODAS as branches permanentemente!
