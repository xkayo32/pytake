# 📋 Sincronização de .copilot-instructions

## ✅ Problema Resolvido

As instruções do Copilot estavam sendo perdidas ao trocar de branches. Agora são sincronizadas automaticamente em TODAS as branches.

---

## 🔄 Como Funciona

### 1. Arquivo Central (`.copilot-instructions`)
- Armazenado em **develop** como "source of truth"
- Sincronizado automaticamente em todas as branches
- Persiste ao trocar de branch

### 2. Git Hook (`post-checkout`)
- Executado automaticamente após `git checkout`
- Se `.copilot-instructions` não existir, restaura de `develop`
- Transparente para o usuário

### 3. Script Manual (`sync-copilot-instructions.sh`)
- Pode ser executado manualmente
- Sincroniza em TODAS as branches
- Útil se hook não rodar por algum motivo

---

## 📝 Estrutura

```
pytake/
├── .copilot-instructions              ← Instrações (em TODAS as branches)
├── .git/hooks/
│   └── post-checkout                  ← Git hook para auto-sincronizar
├── scripts/
│   └── sync-copilot-instructions.sh   ← Script manual de sincronização
└── .github/
    └── AGENT_INSTRUCTIONS.md           ← Documentação completa
```

---

## 🚀 Uso

### Automático (Recomendado)
Simplesmente trocar de branch:
```bash
git checkout main
git checkout feature/TICKET-123-desc

# .copilot-instructions será sincronizado automaticamente ✅
```

### Manual
Se precisar sincronizar manualmente:
```bash
./scripts/sync-copilot-instructions.sh
```

---

## ✨ Benefícios

✅ **Copilot sempre tem contexto** - Instruções persistem entre branches
✅ **Automático** - Git hook sincroniza sem ação do usuário
✅ **Backup** - Script manual como fallback
✅ **Centralizador** - Develop é source of truth
✅ **Zero Overhead** - Sincronização é transparente

---

## 🔍 Verificar Sincronização

```bash
# Ver se arquivo existe na branch atual
ls -la .copilot-instructions

# Ver conteúdo
cat .copilot-instructions | head -20

# Forçar sincronização manual
./scripts/sync-copilot-instructions.sh
```

---

## 📋 Fluxo Completo

```
git push (develop com .copilot-instructions)
    ↓
git checkout feature/TICKET-123        # Post-checkout hook roda
    ↓
.copilot-instructions automaticamente restaurado
    ↓
✅ Copilot tem instruções mesmo na feature branch!
    ↓
Trocar para outra branch
    ↓
✅ .copilot-instructions continua disponível
```

---

## 🛠️ Como Funciona Internamente

### Git Hook Post-Checkout
```bash
# Executado após: git checkout <branch>
# Se não encontrar .copilot-instructions:
#   → Busca em develop: git show develop:.copilot-instructions
#   → Restaura localmente
#   → Stage e commit (se necessário)
```

### Script de Sincronização
```bash
# Itera por TODAS as branches
# Para cada branch:
#   → git checkout <branch>
#   → Copia .copilot-instructions
#   → Commit se necessário
# Volta para branch original
```

---

## 📖 Referências

- `.copilot-instructions` - Instruções para Copilot/Agentes
- `.github/AGENT_INSTRUCTIONS.md` - Guia completo para agentes
- `.github/GIT_WORKFLOW.md` - Fluxo GitFlow
- `scripts/sync-copilot-instructions.sh` - Script de sincronização

---

## 💡 Dica

Se mudar as instruções em `.copilot-instructions`, basta fazer commit em develop e executar:

```bash
./scripts/sync-copilot-instructions.sh
```

Todas as branches terão o conteúdo atualizado! 🚀
