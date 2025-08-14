#!/bin/bash

echo "========================================="
echo "Script para fazer push no GitHub"
echo "Repositório: https://github.com/xkayo32/pytake-backend"
echo "========================================="
echo ""

# Verificar status atual
echo "📊 Status atual do Git:"
git status --short
echo ""

echo "📝 Último commit:"
git log --oneline -1
echo ""

echo "🔗 Remote configurado:"
git remote -v
echo ""

echo "========================================="
echo "OPÇÕES DE PUSH:"
echo "========================================="
echo ""
echo "1) FAZER PUSH NORMAL (vai precisar de autenticação):"
echo "   git push origin main"
echo ""
echo "2) FAZER FORCE PUSH (substitui tudo no remoto):"
echo "   git push -f origin main"
echo ""
echo "3) CRIAR NOVO BRANCH COM A DOCUMENTAÇÃO:"
echo "   git push origin main:documentation-clean"
echo ""
echo "========================================="
echo "⚠️  IMPORTANTE:"
echo "========================================="
echo ""
echo "Se aparecer erro de autenticação, você precisa:"
echo ""
echo "OPÇÃO A - Usar GitHub CLI (recomendado):"
echo "  gh auth login"
echo "  git push origin main"
echo ""
echo "OPÇÃO B - Usar Personal Access Token:"
echo "  1. Vá em GitHub > Settings > Developer settings > Personal access tokens"
echo "  2. Crie um token com permissão 'repo'"
echo "  3. Use o comando:"
echo "     git push https://xkayo32:SEU_TOKEN@github.com/xkayo32/pytake-backend.git main"
echo ""
echo "OPÇÃO C - Configurar credenciais permanentemente:"
echo "  git config --global credential.helper store"
echo "  git push origin main"
echo "  (Digite usuário e token quando solicitado)"
echo ""
echo "========================================="

# Perguntar ao usuário
read -p "Deseja tentar fazer push agora? (s/n): " resposta

if [[ "$resposta" == "s" || "$resposta" == "S" ]]; then
    echo ""
    echo "Escolha uma opção:"
    echo "1) Push normal"
    echo "2) Force push (substitui tudo)"
    echo "3) Criar branch 'documentation-clean'"
    read -p "Opção (1/2/3): " opcao
    
    case $opcao in
        1)
            echo "Fazendo push normal..."
            git push origin main
            ;;
        2)
            echo "⚠️  AVISO: Isso vai substituir TODO o conteúdo remoto!"
            read -p "Tem certeza? (digite 'sim' para confirmar): " confirma
            if [[ "$confirma" == "sim" ]]; then
                echo "Fazendo force push..."
                git push -f origin main
            else
                echo "Operação cancelada."
            fi
            ;;
        3)
            echo "Criando branch 'documentation-clean'..."
            git push origin main:documentation-clean
            ;;
        *)
            echo "Opção inválida."
            ;;
    esac
else
    echo ""
    echo "Para fazer push manualmente, use um dos comandos acima."
fi

echo ""
echo "========================================="
echo "Fim do script"
echo "========================================="