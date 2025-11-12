#!/bin/bash

# Script para sincronizar .copilot-instructions em todas as branches
# Uso: ./scripts/sync-copilot-instructions.sh
# Ou automaticamente em git hooks

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
INSTRUCTIONS_FILE="$REPO_ROOT/.copilot-instructions"

echo "🔄 Sincronizando .copilot-instructions em todas as branches..."
echo "═══════════════════════════════════════════════════════════════════"

# Verificar se o arquivo existe
if [ ! -f "$INSTRUCTIONS_FILE" ]; then
    echo "❌ Arquivo $INSTRUCTIONS_FILE não encontrado!"
    exit 1
fi

# Obter branch atual
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Listar todas as branches locais
BRANCHES=$(git branch --format='%(refname:short)' | grep -v "^$")

# Para cada branch
for branch in $BRANCHES; do
    echo "Processando: $branch"
    
    # Ignorar branches que não devem ter as instruções
    if [[ "$branch" == "HEAD" ]]; then
        continue
    fi
    
    # Checkout na branch
    git checkout "$branch" --quiet 2>/dev/null || continue
    
    # Copiar o arquivo
    if [ -f "$INSTRUCTIONS_FILE" ]; then
        echo "  ✅ $INSTRUCTIONS_FILE já existe"
    else
        # Se não existir, copiar de develop
        git show develop:.copilot-instructions > "$INSTRUCTIONS_FILE" 2>/dev/null || echo "  ⚠️  Não foi possível copiar de develop"
        git add "$INSTRUCTIONS_FILE"
        git commit -m "chore: sincronizar .copilot-instructions" --allow-empty-message -m "" 2>/dev/null || true
        echo "  ✅ .copilot-instructions adicionado"
    fi
done

# Voltar para branch original
git checkout "$CURRENT_BRANCH" --quiet

echo "═══════════════════════════════════════════════════════════════════"
echo "✅ Sincronização concluída!"
echo ""
echo "💡 Para manter sincronizado automaticamente, adicione a:"
echo "   .git/hooks/post-checkout"
