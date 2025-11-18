#!/bin/bash
# 🔐 Script para criar Environment Secrets após criar os ambientes no GitHub
# Execute APÓS criar os 3 ambientes (production, staging, development) manualmente
# https://github.com/xkayo32/pytake/settings/environments

echo "🔐 Criando Environment Secrets..."
echo ""

# Production
echo "⏳ Production secrets..."
gh secret set POSTGRES_PASSWORD -b "coWmQEybYooOr-KFA_g4Dd7HIAw70ChRm2gNhtkY35E" --env production
gh secret set REDIS_PASSWORD -b "UHabjEFsMwLXg198YEvfY15JNemMrBF27IHr4jZ-wNw" --env production
gh secret set DEBUG -b "false" --env production
echo "✅ Production secrets criados"
echo ""

# Staging
echo "⏳ Staging secrets..."
gh secret set POSTGRES_PASSWORD -b "LtLVHcRmas9_NaE5R9kqm4EmDFB10XFAOh0zoteiBe0" --env staging
gh secret set REDIS_PASSWORD -b "aOtO2_5WwjcEOZrVVj1ufWT1YSg7DM4yc1thmirELh8" --env staging
gh secret set DEBUG -b "true" --env staging
echo "✅ Staging secrets criados"
echo ""

# Development
echo "⏳ Development secrets..."
gh secret set POSTGRES_PASSWORD -b "dev-password-local-pytake" --env development
gh secret set REDIS_PASSWORD -b "dev-redis-password-local" --env development
gh secret set DEBUG -b "true" --env development
echo "✅ Development secrets criados"
echo ""

# Verificar
echo "📋 Verificando..."
echo ""
echo "Production secrets:"
gh secret list --env production
echo ""
echo "Staging secrets:"
gh secret list --env staging
echo ""
echo "Development secrets:"
gh secret list --env development
echo ""
echo "✅ Todos os secrets foram criados com sucesso!"
