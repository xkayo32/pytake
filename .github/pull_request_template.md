name: "📋 Pull Request"
description: "Template padrão para Pull Requests no PyTake"
title: "[TIPO]: Descrição concisa"
labels: ["type: feature"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        ## 🔄 Descrição da Mudança
        Explique brevemente o que essa mudança faz e por quê.

  - type: textarea
    id: description
    attributes:
      label: "Descrição"
      placeholder: "Descreva a mudança aqui..."
      required: true

  - type: markdown
    attributes:
      value: |
        ## ✨ Mudanças Principais
        Liste os principais arquivos/funcionalidades alteradas.

  - type: textarea
    id: changes
    attributes:
      label: "Mudanças"
      placeholder: "- Item 1\n- Item 2\n- Item 3"
      required: true

  - type: markdown
    attributes:
      value: |
        ## 🧪 Como Testar (OBRIGATÓRIO)
        Instruções claras para reviewers testarem a mudança localmente.

  - type: textarea
    id: testing
    attributes:
      label: "Instruções de Teste"
      placeholder: |
        1. Clone a branch
        2. Execute: `comando aqui`
        3. Valide: `verificação aqui`
        
        Exemplos:
        ```bash
        # Backend
        cd backend && python -m pytest
        
        # Frontend
        cd frontend && npm run build
        ```
      required: true

  - type: markdown
    attributes:
      value: |
        ## 📋 Checklist Pré-Merge

  - type: checkboxes
    id: checklist
    attributes:
      label: "Validações"
      options:
        - label: "✅ Commits em Conventional Commits (feat:, fix:, etc)"
          required: true
        - label: "✅ Rebase com a branch base (develop ou main)"
          required: true
        - label: "✅ Testado localmente (sem erros)"
          required: true
        - label: "✅ Sem console.log, debugger ou código comentado"
          required: true
        - label: "✅ Nenhum .env ou secrets commitados"
          required: true
        - label: "✅ CHANGELOG.md atualizado (se relevante)"
          required: false
        - label: "✅ Pronto para CI/CD (aguardando tests)"
          required: true

  - type: markdown
    attributes:
      value: |
        ## ⏳ Processo de Merge
        
        1. ⏸️ **PR Criado**: Você inclui instruções de teste
        2. 🤖 **CI/CD Executa**: GitHub Actions testa automaticamente
        3. 👀 **Code Review**: Reviewer aprova e testa se necessário
        4. ✅ **Merge**: Apenas após CI/CD passar + aprovação
        
        **NÃO FAÇA MERGE SEM CI/CD VERDE! ❌**

  - type: markdown
    attributes:
      value: |
        ## 🚀 Dicas Rápidas
        
        - Mantenha PRs pequenos e focados
        - Uma funcionalidade por PR
        - Commits bem descritivos
        - Rebase em vez de merge commits
        
        Para mais informações: `.github/GIT_WORKFLOW.md`
