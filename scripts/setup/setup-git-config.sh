#!/bin/bash

# 🔧 Setup Script - Configurar Git com instruções do Copilot
# Execute uma vez: bash setup-git-config.sh

set -e

echo "🔧 Configurando Git com instruções do Copilot..."
echo ""

# Configurar commit message template
echo "📝 Setando template de commit..."
git config commit.template .gitmessage
echo "✅ Template de commit configurado"

# Configurar para não alterar maiúsculas/minúsculas em nomes de arquivo (importante para case-sensitive paths)
echo "📁 Configurando manejo de case-sensitive paths..."
git config core.ignorecase false
echo "✅ Case-sensitive configurado"

# Fetch automático para manter branches atualizadas
echo "🔄 Configurando fetch automático..."
git config fetch.prune true
echo "✅ Fetch automático configurado"

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "✅ Git configurado com sucesso!"
echo ""
echo "📚 Próximas ações:"
echo "   1. Leia: .github/QUICK_START.md"
echo "   2. Leia: .github/AGENT_INSTRUCTIONS.md"
echo "   3. Comece a trabalhar: git checkout -b feature/TICKET-XXX"
echo ""
echo "💡 Dica: A partir de agora, cat .copilot-instructions mostra estas regras"
echo ""
