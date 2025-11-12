#!/bin/bash

# Script para monitorar status do CI/CD via GitHub CLI
# Uso: ./scripts/check-ci-status.sh [PR_NUMBER]

set -e

PR_NUMBER=${1:-16}
REPO="xkayo32/pytake"

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║           🔍 MONITORAMENTO DE CI/CD - PR #$PR_NUMBER"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Verifica se gh está instalado
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) não está instalado"
    echo "   Instale com: sudo apt-get install -y gh"
    exit 1
fi

# Exibe status dos checks
echo "📊 Status dos Checks:"
echo "═══════════════════════════════════════════════════════════════════"
gh pr checks $PR_NUMBER --repo $REPO 2>&1 || true

echo ""
echo "📋 Últimos Workflows:"
echo "═══════════════════════════════════════════════════════════════════"
gh run list --repo $REPO --limit 5

echo ""
echo "💡 Dicas:"
echo "═══════════════════════════════════════════════════════════════════"
echo "1. Ver logs detalhados de um workflow:"
echo "   gh run view <RUN_ID> --log-failed"
echo ""
echo "2. Re-rodar um workflow falhado:"
echo "   gh run rerun <RUN_ID>"
echo ""
echo "3. Ver logs específicos:"
echo "   gh run view <RUN_ID> --log"
echo ""
echo "4. Abrir PR no navegador:"
echo "   gh pr view $PR_NUMBER --web"
echo ""
