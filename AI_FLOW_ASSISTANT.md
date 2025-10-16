# AI Flow Assistant - Documentação de Implementação

## Visão Geral

O **AI Flow Assistant** é um assistente conversacional de IA integrado ao chatbot builder do PyTake que permite gerar flows completos automaticamente a partir de descrições em linguagem natural.

## Status: ✅ COMPLETO

Implementação finalizada em 16/10/2025.

**Commit:** `6e6a4f7` - feat: implementa AI Flow Assistant no chatbot builder

## Arquitetura

### Componentes Criados

```
frontend/src/components/admin/ai-assistant/
├── AIFlowAssistant.tsx       # Componente principal (545 linhas)
├── ChatMessage.tsx            # Mensagem individual do chat (52 linhas)
├── FlowPreview.tsx            # Preview do flow gerado (122 linhas)
├── IndustrySelect.tsx         # Autocomplete de indústrias (136 linhas)
└── ExamplesModal.tsx          # Modal com exemplos (110 linhas)
```

### API Client

**Arquivo:** `frontend/src/lib/api/chatbots.ts`

```typescript
export const aiFlowAssistantAPI = {
  // Gera flow a partir de descrição
  generateFlow: async (data: {
    description: string;
    industry?: string;
    language: string;
    chatbot_id?: string;
  }): Promise<GenerateFlowResponse>

  // Verifica se AI está configurado
  checkEnabled: async (): Promise<{
    enabled: boolean;
    configured: boolean;
    provider?: 'openai' | 'anthropic';
  }>
}
```

### Integração com Builder

**Arquivo:** `frontend/src/app/admin/chatbots/[id]/builder/page.tsx`

- Botão "✨ AI Assistant" na toolbar (com gradient roxo/indigo)
- Sidebar deslizante de 500px
- Função `handleAIFlowImport()` para importar flows gerados

## Funcionalidades

### 1. Interface de Chat

- Design moderno tipo ChatGPT/Claude
- Mensagens com avatares (User/Sparkles)
- Timestamps formatados (HH:MM)
- Auto-scroll para última mensagem
- Animação de typing dots durante geração

### 2. Entrada de Dados

**Campo de Descrição:**
- Textarea auto-resize (3-5 linhas, max 150px)
- Placeholder com dica de Ctrl+Enter
- Contador de caracteres (2000 max)
- Validação: mínimo 10 caracteres

**Seleção de Indústria (Opcional):**
- Autocomplete com 20 opções predefinidas:
  - Imobiliária, E-commerce, Saúde, Educação, Finanças
  - Varejo, Restaurante, Academia, Salão de Beleza
  - Consultoria, Tecnologia, Advocacia, Contabilidade
  - Marketing, Hotelaria, Turismo, Automotivo
  - Construção, Outros
- Opção de digitar valor customizado

### 3. Exemplos de Prompts

Modal com 4 exemplos pré-configurados:

1. **Qualificador de Leads - Imobiliária**
   - Qualifica leads perguntando nome, interesse e orçamento
   - Roteamento baseado em valor

2. **Catálogo de Produtos com Carrinho**
   - E-commerce completo com navegação e checkout

3. **Agendamento de Consultas Médicas**
   - Sistema de agendamento para clínicas

4. **FAQ Automatizado de Suporte**
   - Sistema inteligente de perguntas frequentes

### 4. Geração de Flow

**Request para API:**
```json
{
  "description": "Crie um chatbot para...",
  "industry": "Imobiliária",
  "language": "pt-BR",
  "chatbot_id": "uuid"
}
```

**Possíveis Respostas:**

**A) Sucesso:**
```json
{
  "status": "success",
  "flow_data": {
    "name": "Nome do Flow",
    "description": "Descrição detalhada",
    "canvas_data": {
      "nodes": [...],
      "edges": [...]
    }
  }
}
```

**B) Clarificação Necessária:**
```json
{
  "status": "needs_clarification",
  "clarification_questions": [
    {
      "question": "Qual o tom de voz desejado?",
      "options": ["Formal", "Casual", "Técnico"],
      "field": "tone"
    }
  ]
}
```

**C) Erro:**
```json
{
  "status": "error",
  "error_message": "Mensagem de erro detalhada"
}
```

### 5. Preview do Flow

**FlowPreview Component:**
- Nome do flow (clique para renomear)
- Descrição do flow
- Estatísticas (número de nós e conexões)
- Tags dos tipos de nós usados (max 5 visíveis)
- Botões:
  - "Importar Flow" (destaque)
  - "Tentar Novamente" (retry)

### 6. Importação

**Fluxo de Importação:**
1. Usuário clica "Importar Flow"
2. Pode renomear clicando no nome
3. Loading state durante importação
4. Cria novo flow via API
5. Atualiza lista de flows
6. Carrega flow no builder
7. Fecha AI Assistant
8. Toast de sucesso

### 7. Validações e Segurança

**Validações de Input:**
- Descrição: 10-2000 caracteres
- Rate limiting: 1 request a cada 3 segundos
- Loading states para evitar múltiplos requests

**Verificação de Configuração:**
- Checa se AI está habilitado ao montar componente
- Exibe warning se não configurado
- Link direto para `/admin/settings`
- Disable inputs se AI não disponível

### 8. Persistência

**LocalStorage:**
- Histórico de chat salvo por chatbot
- Key: `ai_chat_history_{chatbotId}`
- Auto-load ao abrir assistant
- Clear ao limpar chat

### 9. Keyboard Shortcuts

- **Ctrl+Enter / Cmd+Enter:** Enviar mensagem
- **Escape:** Fechar assistant
- **Enter (no input):** Nova linha

### 10. Estados e Feedback

**Loading States:**
- Botão "Gerar Flow" com spinner
- Typing dots animados (3 dots com bounce)
- Disable de inputs durante geração

**Error States:**
- Mensagem de erro no chat
- Toast de erro
- Botão de retry

**Success States:**
- Mensagem de confirmação
- Preview do flow
- Toast de sucesso na importação

## Design System

### Cores (Admin Theme)

```css
/* Primary */
Purple 600: #9333ea  /* Botões principais */
Indigo 600: #4f46e5  /* Botões secundários */

/* Gradient */
from-purple-600 to-indigo-600  /* AI Assistant button */

/* Backgrounds */
Gray 50: #f9fafb    /* Light mode */
Gray 800: #1f2937   /* Dark mode */
Gray 900: #111827   /* Dark mode secondary */

/* Messages */
Indigo 600: #4f46e5  /* User messages */
Purple 100: #f3e8ff  /* Assistant background */
```

### Ícones (Lucide React)

- **Sparkles:** AI Assistant, avatar da IA
- **User:** Avatar do usuário
- **Send:** Botão enviar
- **Lightbulb:** Exemplos
- **Trash2:** Limpar chat
- **X:** Fechar
- **Loader2:** Loading
- **AlertCircle:** Erros/avisos
- **Settings:** Link para configurações
- **Download:** Importar flow
- **RotateCcw:** Tentar novamente
- **Building2:** Indústria
- **ChevronDown:** Select dropdown
- **FileText:** Flow preview
- **Layers:** Estatísticas de nós

### Responsividade

- Desktop: Sidebar de 500px
- Mobile: Sidebar fullscreen (100vw)
- Breakpoint: `sm:w-[500px]`

### Animações

```css
/* Typing dots */
animate-bounce com delays (0ms, 150ms, 300ms)

/* Smooth scroll */
behavior: 'smooth' no messagesEndRef

/* Transitions */
transition-colors, transition-all nas interações
```

## Estrutura de Mensagens

```typescript
interface Message {
  id: string;           // Timestamp como string
  type: 'user' | 'assistant';
  content: string;      // Texto da mensagem
  timestamp: Date;      // Data/hora
}
```

## Flow de Uso (Happy Path)

1. Usuário abre chatbot builder
2. Clica no botão "✨ AI Assistant"
3. Sidebar desliza da direita
4. (Opcional) Seleciona indústria
5. (Opcional) Clica "Ver Exemplos" e seleciona um
6. Digita ou edita descrição do flow
7. Pressiona Ctrl+Enter ou clica botão enviar
8. Loading state (typing dots)
9. IA retorna flow gerado
10. Preview aparece com estatísticas
11. (Opcional) Clica no nome para renomear
12. Clica "Importar Flow"
13. Loading durante importação
14. Toast de sucesso
15. Flow carregado no builder
16. Assistant fecha automaticamente

## Tratamento de Erros

### Erros do Usuário

1. **Descrição muito curta:** Toast "mínimo 10 caracteres"
2. **Descrição muito longa:** Toast "máximo 2000 caracteres"
3. **Rate limit:** Toast "aguarde X segundos"
4. **AI não configurado:** Warning banner com link

### Erros da API

1. **Timeout:** Mensagem no chat + toast
2. **500 Server Error:** Mensagem no chat + toast
3. **Validation Error:** Exibe erro específico
4. **Network Error:** Mensagem genérica de erro

### Recovery

- Botão "Tentar Novamente" no preview
- Botão "Limpar Chat" para recomeçar
- Mensagens anteriores preservadas

## Melhorias Futuras (Roadmap)

### Curto Prazo

- [ ] Suporte a múltiplas rodadas de clarificação
- [ ] Quick replies para perguntas de clarificação
- [ ] Histórico de flows gerados (galeria)
- [ ] Compartilhamento de prompts entre usuários
- [ ] Feedback thumbs up/down nos flows gerados

### Médio Prazo

- [ ] Edição do flow antes de importar (mini preview)
- [ ] Sugestões de melhorias em flows existentes
- [ ] Templates baseados em flows gerados com sucesso
- [ ] Analytics de prompts mais usados
- [ ] Versioning de flows gerados

### Longo Prazo

- [ ] Multi-idioma (EN, ES)
- [ ] Integração com voice input
- [ ] Preview visual do grafo (thumbnail)
- [ ] Export de flows para outras plataformas
- [ ] Marketplace de prompts comunitários

## Métricas de Sucesso

### Performance

- **Tempo de resposta da IA:** < 10s (target)
- **Taxa de sucesso:** > 80% na primeira tentativa
- **Rate limiting:** Previne abuse (3s entre requests)

### UX

- **Claridade:** Mensagens e feedback claros
- **Feedback:** Loading states em todas operações
- **Acessibilidade:** Keyboard shortcuts, tooltips

### Adoção

- **Uso do AI Assistant:** % de flows criados via IA
- **Satisfação:** Feedback dos usuários
- **Conversão:** % de flows gerados que são importados

## Arquivos Modificados

### Novos Arquivos (5)

1. `frontend/src/components/admin/ai-assistant/AIFlowAssistant.tsx`
2. `frontend/src/components/admin/ai-assistant/ChatMessage.tsx`
3. `frontend/src/components/admin/ai-assistant/FlowPreview.tsx`
4. `frontend/src/components/admin/ai-assistant/IndustrySelect.tsx`
5. `frontend/src/components/admin/ai-assistant/ExamplesModal.tsx`

### Modificados (2)

1. `frontend/src/lib/api/chatbots.ts`
   - Adicionado `aiFlowAssistantAPI` com 2 métodos

2. `frontend/src/app/admin/chatbots/[id]/builder/page.tsx`
   - Adicionado import do componente
   - Adicionado state `showAIAssistant`
   - Adicionado botão na toolbar
   - Adicionado função `handleAIFlowImport`
   - Adicionado renderização condicional do componente

## Total de Linhas de Código

- **AIFlowAssistant:** 545 linhas
- **ChatMessage:** 52 linhas
- **FlowPreview:** 122 linhas
- **IndustrySelect:** 136 linhas
- **ExamplesModal:** 110 linhas
- **API Client:** +50 linhas
- **Builder Integration:** +30 linhas

**Total:** ~1.045 linhas de código

## Dependências

Todas as dependências já estão instaladas no projeto:

- `lucide-react` - Ícones
- `@xyflow/react` - React Flow (builder)
- `next` - Next.js 15
- `react` - React 19
- `axios` - HTTP client

## Testes Manuais Recomendados

### Teste 1: Geração Básica
1. Abrir builder
2. Clicar "AI Assistant"
3. Digitar: "Crie um chatbot de boas-vindas simples"
4. Verificar flow gerado
5. Importar

### Teste 2: Com Indústria
1. Selecionar "Imobiliária"
2. Digitar: "Qualificador de leads"
3. Verificar se contexto foi usado

### Teste 3: Exemplos
1. Clicar "Ver Exemplos"
2. Selecionar exemplo
3. Verificar se preenche textarea
4. Editar e enviar

### Teste 4: Validações
1. Tentar enviar vazio (deve bloquear)
2. Digitar <10 chars (deve dar erro)
3. Clicar enviar 2x rápido (rate limit)

### Teste 5: AI Não Configurado
1. Desabilitar AI Assistant no backend
2. Abrir componente
3. Verificar warning banner
4. Verificar inputs disabled

### Teste 6: Persistência
1. Iniciar conversa
2. Fechar assistant
3. Reabrir
4. Verificar histórico carregado

### Teste 7: Renomeação
1. Gerar flow
2. Clicar no nome no preview
3. Editar nome
4. Importar
5. Verificar nome customizado

### Teste 8: Erro Handling
1. Desconectar internet
2. Tentar gerar flow
3. Verificar mensagem de erro
4. Reconectar
5. Tentar novamente

### Teste 9: Keyboard Shortcuts
1. Ctrl+Enter para enviar
2. Escape para fechar
3. Enter para nova linha

### Teste 10: Responsividade
1. Testar em desktop (500px sidebar)
2. Testar em mobile (fullscreen)
3. Verificar scrolling
4. Verificar overlay

## Troubleshooting

### Problema: AI Assistant button não aparece

**Solução:**
- Verificar import do componente
- Verificar import do ícone Sparkles
- Verificar state `showAIAssistant`

### Problema: Erro ao gerar flow

**Possíveis Causas:**
1. AI não configurado no backend
2. API key inválida
3. Timeout da IA
4. Formato de resposta incorreto

**Debug:**
- Checar console do browser
- Checar logs do backend
- Testar endpoint `/api/v1/ai-assistant/settings`

### Problema: Flow não importa

**Possíveis Causas:**
1. canvas_data inválido
2. Permissões incorretas
3. chatbot_id não corresponde

**Debug:**
- Checar console para erros
- Verificar response da API
- Testar endpoint de criação de flow manualmente

### Problema: Chat não persiste

**Solução:**
- Verificar localStorage disponível
- Verificar key correta sendo usada
- Clear localStorage e tentar novamente

## Documentação Relacionada

- **Template Gallery:** `TEMPLATE_LIBRARY_IMPLEMENTATION.md`
- **Builder:** `BUILDER_STATUS_FINDINGS.md`
- **API:** `backend/API.md`
- **Frontend:** `CLAUDE.md`

## Suporte

Para dúvidas ou problemas:

1. Verificar esta documentação
2. Checar logs do console (F12)
3. Verificar configuração do AI Assistant
4. Consultar equipe de desenvolvimento

---

**Última Atualização:** 16/10/2025
**Versão:** 1.0.0
**Status:** ✅ Produção
