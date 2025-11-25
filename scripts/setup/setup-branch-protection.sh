#!/bin/bash

# Script para configurar proteção de branches no GitHub
# Pré-requisito: gh cli instalado (https://cli.github.com/)
# Uso: bash setup-branch-protection.sh <owner> <repo>

set -e

OWNER=${1}
REPO=${2}

if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
  echo "❌ Uso: $0 <owner> <repo>"
  echo "   Exemplo: $0 xkayo32 pytake"
  exit 1
fi

REPO_FULL="${OWNER}/${REPO}"

echo "🔐 Configurando proteção de branches para: $REPO_FULL"
echo ""

# Verificar se gh está instalado
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI não está instalado."
  echo "📥 Instale em: https://cli.github.com/"
  exit 1
fi

# Verificar autenticação
if ! gh auth status &>/dev/null; then
  echo "❌ Não autenticado no GitHub CLI"
  echo "🔑 Execute: gh auth login"
  exit 1
fi

echo "🔍 Verificando se branches existem..."
gh repo view "$REPO_FULL" > /dev/null || {
  echo "❌ Repositório não encontrado: $REPO_FULL"
  exit 1
}

# Configurar proteção para main
echo ""
echo "📌 Configurando proteção para branch: main"
gh api repos/$OWNER/$REPO/branches/main/protection \
  -X PUT \
  -f required_status_checks='{"strict":true,"contexts":["lint","test","build"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"required_approving_review_count":1}' \
  -f dismiss_stale_reviews=true \
  -f require_code_owner_reviews=false \
  -f required_approving_review_count=1 \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f auto_delete_head_branch=true \
  2>/dev/null && echo "✅ main protegido" || echo "⚠️  Erro ao proteger main"

# Configurar proteção para develop
echo "📌 Configurando proteção para branch: develop"
gh api repos/$OWNER/$REPO/branches/develop/protection \
  -X PUT \
  -f required_status_checks='{"strict":true,"contexts":["lint","test","build"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"required_approving_review_count":1}' \
  -f dismiss_stale_reviews=true \
  -f require_code_owner_reviews=false \
  -f required_approving_review_count=1 \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f auto_delete_head_branch=true \
  2>/dev/null && echo "✅ develop protegido" || echo "⚠️  Erro ao proteger develop"

# Setando develop como default branch
echo ""
echo "📌 Setando develop como default branch..."
gh api repos/$OWNER/$REPO \
  -X PATCH \
  -f default_branch=develop \
  2>/dev/null && echo "✅ develop é agora o default branch" || echo "⚠️  Erro ao setar default branch"

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "📋 Resumo:"
echo "  • main: Protegido (requer 1 aprovação + CI/CD passar)"
echo "  • develop: Protegido (requer 1 aprovação + CI/CD passar)"
echo "  • Default branch: develop"
echo ""
echo "🚀 Próximos passos:"
echo "  1. Criar feature branches a partir de develop"
echo "  2. Abrir PRs para develop (ou main para releases)"
echo "  3. Aguardar CI/CD passar e aprovação"
echo ""
