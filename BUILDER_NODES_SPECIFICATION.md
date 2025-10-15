# Chatbot Builder - Especificação Completa de Nós

## Análise de Nós Existentes e Novos

### Status Atual
- ✅ **AIPromptProperties** - Implementado com abas (Configuração, Prompt, Variáveis)
- ✅ **APICallProperties** - Implementado com abas (Configuração, Headers, Variáveis)
- ❌ **MessageProperties** - Faltando
- ❌ **QuestionProperties** - Faltando
- ❌ **ConditionProperties** - Faltando
- ❌ **ActionProperties** - Faltando
- ❌ **HandoffProperties** - Faltando
- ❌ **JumpProperties** - Faltando
- ❌ **EndProperties** - Faltando

---

## 1. START (Início) 🟢

**Tipo:** `start`
**Ícone:** Play
**Cor:** Verde
**Descrição:** Ponto de entrada do fluxo

### Propriedades:

#### Aba: ⚙️ Configuração
- **Nome do Fluxo** (text, read-only)
- **Descrição** (textarea)
- **Trigger Conditions** (multi-select)
  - Palavra-chave inicial
  - Horário de funcionamento
  - Primeiro contato

#### Aba: 📊 Variáveis Iniciais
- **Lista de variáveis** do contexto inicial disponíveis:
  - `{{contact_name}}` - Nome do contato
  - `{{contact_phone}}` - Telefone
  - `{{conversation_id}}` - ID da conversa
  - `{{timestamp}}` - Data/hora inicial

**Gera outputVariable?** ❌ Não

---

## 2. MESSAGE (Mensagem) 🔵

**Tipo:** `message`
**Ícone:** MessageSquare
**Cor:** Azul
**Descrição:** Enviar uma mensagem de texto/mídia ao usuário

### Propriedades:

#### Aba: 📝 Conteúdo
- **Tipo de Mensagem** (select)
  - Texto
  - Imagem
  - Vídeo
  - Áudio
  - Documento
  - Localização
- **Texto da Mensagem** (textarea com rich text)
  - Suporte a variáveis: `{{variable_name}}`
  - Contador de caracteres
  - Preview de formatação (bold, italic)
- **Arquivo de Mídia** (file upload) - se tipo != texto
  - URL ou upload
  - Preview

#### Aba: 🎨 Formatação
- **Markdown** (toggles)
  - **Negrito** (*texto*)
  - **Itálico** (_texto_)
  - **Código** (```código```)
- **Emojis** (emoji picker)

#### Aba: ⏱️ Comportamento
- **Delay antes de enviar** (number, segundos)
  - 0-60 segundos
  - "Simulando digitação..."
- **Continuar automaticamente** (toggle)
  - Se ON: vai para próximo nó sem esperar resposta
  - Se OFF: espera resposta do usuário

#### Aba: 📊 Variáveis
- **Variáveis disponíveis** (lista de referência)
  - Como usar: `{{variable_name}}`

**Gera outputVariable?** ❌ Não (mensagem é apenas saída)

---

## 3. QUESTION (Pergunta) 🟣

**Tipo:** `question`
**Ícone:** HelpCircle
**Cor:** Roxo
**Descrição:** Fazer uma pergunta e capturar resposta do usuário

### Propriedades:

#### Aba: 📝 Pergunta
- **Texto da Pergunta** (textarea)
  - Suporte a variáveis
- **Tipo de Resposta Esperada** (select)
  - Texto livre
  - Número
  - Email
  - Telefone
  - Data
  - Sim/Não
  - Opção Múltipla
  - Arquivo/Mídia

#### Aba: ✅ Validação
- **Validação Obrigatória** (toggle)
- **Mensagem de Erro** (text) - se validação falhar
- **Regras de Validação** (depende do tipo)
  - **Texto:** Min/Max caracteres, Regex
  - **Número:** Min/Max valor, Casas decimais
  - **Email:** Validação automática
  - **Telefone:** Formato (BR, internacional)
  - **Data:** Formato, Min/Max data
- **Tentativas Máximas** (number, 1-5)
  - Após N tentativas, o que fazer?
    - Ir para nó de erro
    - Transferir para humano
    - Finalizar

#### Aba: 🎯 Opções (se tipo = Opção Múltipla)
- **Lista de Opções** (dynamic list)
  - Texto da opção
  - Valor armazenado
  - Ícone/emoji (opcional)
- **Permitir resposta fora das opções** (toggle)

#### Aba: 📊 Variáveis
- **Nome da Variável de Saída** (text, snake_case)
  - Auto-gerado: `user_response_de1`
  - Editável com validação
- **💡 Saída deste nó:** `{{variable_name}}`
- **Tipo de dados:** (conforme tipo de resposta)

**Gera outputVariable?** ✅ Sim - `user_response_{nodeId}`

---

## 4. CONDITION (Condição) 🟠

**Tipo:** `condition`
**Ícone:** GitBranch
**Cor:** Laranja
**Descrição:** Tomar decisão baseada em condições (if/else)

### Propriedades:

#### Aba: 🔀 Condições
- **Lista de Condições** (dynamic list, múltiplas)
  - **Variável** (select) - escolher de variáveis disponíveis
  - **Operador** (select)
    - Igual a (`==`)
    - Diferente de (`!=`)
    - Maior que (`>`)
    - Menor que (`<`)
    - Maior ou igual (`>=`)
    - Menor ou igual (`<=`)
    - Contém (texto)
    - Não contém
    - Começa com
    - Termina com
    - Está vazio
    - Não está vazio
  - **Valor** (text/number/select)
  - **Label da Saída** (text) - nome da porta de saída
  - **Botão:** Adicionar Condição

#### Aba: ⚙️ Lógica
- **Operador Lógico** (se múltiplas condições)
  - AND (todas devem ser verdadeiras)
  - OR (pelo menos uma verdadeira)
- **Rota Padrão** (toggle)
  - Se nenhuma condição for verdadeira
  - Nome da porta: "Senão" / "Default"

#### Aba: 📊 Variáveis
- **Variáveis disponíveis** (lista de referência)
  - Para usar nas condições

**Gera outputVariable?** ❌ Não (apenas roteia)

**Saídas Especiais:** Múltiplas portas de saída (uma para cada condição + default)

---

## 5. ACTION (Ação) 🟡

**Tipo:** `action`
**Ícone:** Zap
**Cor:** Amarelo
**Descrição:** Executar uma ação interna (salvar dados, atualizar contato, etc.)

### Propriedades:

#### Aba: ⚙️ Configuração
- **Tipo de Ação** (select)
  - Salvar em Contato (atualizar campos do contato)
  - Adicionar Tag
  - Remover Tag
  - Atualizar Variável de Sessão
  - Enviar Email Interno
  - Criar Ticket/Task
  - Adicionar a Lista
  - Remover de Lista
  - Log Personalizado

#### Aba: 📝 Parâmetros (depende da ação)
**Se ação = "Salvar em Contato":**
- **Campo** (select): Nome, Email, Telefone, Custom Fields
- **Valor** (text com variáveis)

**Se ação = "Adicionar/Remover Tag":**
- **Tags** (multi-select ou text)

**Se ação = "Atualizar Variável":**
- **Nome da Variável** (select de variáveis existentes ou nova)
- **Valor** (text/number com suporte a variáveis e operações)
  - Ex: `{{counter}} + 1`

**Se ação = "Enviar Email Interno":**
- **Destinatário** (email)
- **Assunto** (text)
- **Mensagem** (textarea)

#### Aba: 📊 Resultado
- **Nome da Variável de Saída** (text, opcional)
  - `action_result_{nodeId}`
- **Contém:** Status da ação (success/error)

**Gera outputVariable?** ⚠️ Opcional - `action_result_{nodeId}`

---

## 6. API_CALL (Chamada API) 🔵

**Tipo:** `api_call`
**Ícone:** Globe
**Cor:** Índigo
**Descrição:** Chamar API externa

### Propriedades: ✅ **JÁ IMPLEMENTADO COM ABAS**

#### Aba: ⚙️ Configuração
- URL, Método (GET/POST/PUT/DELETE), Timeout
- Autenticação (None, Bearer Token, Basic Auth, API Key, OAuth2)

#### Aba: 📤 Headers
- Lista de headers customizados

#### Aba: 📊 Variáveis
- Nome da variável de saída: `get_response_{nodeId}`

**Gera outputVariable?** ✅ Sim - `{method}_response_{nodeId}`

---

## 7. AI_PROMPT (IA) 🩷

**Tipo:** `ai_prompt`
**Ícone:** Brain
**Cor:** Rosa
**Descrição:** Processar com IA (GPT-4, Claude, Gemini)

### Propriedades: ✅ **JÁ IMPLEMENTADO COM ABAS**

#### Aba: ⚙️ Configuração
- Provider (OpenAI, Anthropic, Google)
- Model, Temperature, Max Tokens
- Secret (API Key)

#### Aba: 💬 Prompt
- System Prompt
- User Prompt
- Suporte a variáveis

#### Aba: 📊 Variáveis
- Nome da variável de saída: `gpt_response_{nodeId}`

**Gera outputVariable?** ✅ Sim - `{provider}_response_{nodeId}`

---

## 8. JUMP (Pular) ⚪

**Tipo:** `jump`
**Ícone:** ArrowRight
**Cor:** Cinza
**Descrição:** Pular para outro fluxo ou nó

### Propriedades:

#### Aba: ⚙️ Configuração
- **Tipo de Salto** (select)
  - Pular para outro Fluxo
  - Pular para Nó neste Fluxo
  - Pular para Sub-fluxo (e retornar)

#### Aba: 🎯 Destino
**Se "Outro Fluxo":**
- **Fluxo de Destino** (select de flows do chatbot)
- **Levar variáveis** (toggle)
  - Quais variáveis passar?

**Se "Nó neste Fluxo":**
- **Nó de Destino** (select de nós)
- **Aviso:** Pode criar loop infinito!

**Se "Sub-fluxo":**
- **Sub-fluxo** (select)
- **Retornar após conclusão** (toggle)
- **Variáveis de retorno** (list)

#### Aba: 📊 Contexto
- **Preservar histórico** (toggle)
- **Preservar variáveis** (toggle)

**Gera outputVariable?** ❌ Não

---

## 9. END (Fim) 🔴

**Tipo:** `end`
**Ícone:** StopCircle
**Cor:** Vermelho
**Descrição:** Finalizar fluxo

### Propriedades:

#### Aba: ⚙️ Configuração
- **Tipo de Finalização** (select)
  - Finalizado com Sucesso
  - Finalizado com Erro
  - Timeout/Expirado
  - Usuário Abandonou

#### Aba: 📝 Mensagem Final
- **Enviar Mensagem de Despedida** (toggle)
- **Texto** (textarea)
  - Ex: "Obrigado por usar nosso atendimento!"

#### Aba: 🎯 Ações Finais
- **Salvar conversa** (toggle)
- **Adicionar Tag Final** (text)
- **Notificar Equipe** (toggle)
- **Criar Resumo com IA** (toggle)

#### Aba: 📊 Métricas
- **Marcar como** (select)
  - Resolvido
  - Não Resolvido
  - Requer Follow-up

**Gera outputVariable?** ❌ Não

---

## 10. HANDOFF (Transferir) 🔵

**Tipo:** `handoff`
**Ícone:** Users
**Cor:** Turquesa
**Descrição:** Transferir conversa para atendimento humano

### Propriedades:

#### Aba: ⚙️ Configuração
- **Tipo de Transferência** (select)
  - Fila Geral
  - Departamento Específico
  - Agente Específico

#### Aba: 🎯 Destino
**Se "Departamento":**
- **Departamento** (select de departments)

**Se "Agente Específico":**
- **Agente** (select de users com role=agent)

**Se "Fila Geral":**
- **Prioridade** (select)
  - Baixa, Normal, Alta, Urgente

#### Aba: 📝 Contexto para Agente
- **Mensagem para o Agente** (textarea)
  - Suporte a variáveis
  - Ex: "Cliente perguntou sobre: {{last_question}}"
- **Resumo Automático com IA** (toggle)
- **Anexar Histórico** (toggle)

#### Aba: 📊 Fallback
- **Se nenhum agente disponível** (select)
  - Colocar em fila e aguardar
  - Enviar mensagem de espera
  - Finalizar e pedir para retornar depois
  - Capturar email para follow-up

**Gera outputVariable?** ✅ Sim - `handoff_status_{nodeId}` (success/queued/failed)

---

## Novos Nós para Sistema WhatsApp

### 11. TEMPLATE (Template WhatsApp) 📱

**Tipo:** `whatsapp_template`
**Ícone:** FileText
**Cor:** Verde Escuro
**Descrição:** Enviar template aprovado do WhatsApp

#### Aba: 📋 Template
- **Template** (select de templates aprovados)
- **Preview** do template

#### Aba: 🔧 Parâmetros
- **Lista de parâmetros** (dynamic, conforme template)
  - Cada parâmetro do template
  - Suporte a variáveis

#### Aba: 📊 Variáveis
- Variáveis para substituir nos placeholders

**Gera outputVariable?** ✅ Sim - `template_sent_{nodeId}` (status)

---

### 12. DELAY (Atraso) ⏱️

**Tipo:** `delay`
**Ícone:** Clock
**Cor:** Azul Claro
**Descrição:** Adicionar delay/pausa antes da próxima ação

#### Aba: ⏱️ Configuração
- **Duração** (number + unit)
  - Segundos (1-60)
  - Minutos (1-30)
  - Horas (1-24)
  - Dias (1-30)
- **Mostrar "digitando..."** (toggle)

#### Aba: ⚙️ Comportamento
- **Cancelável** (toggle)
  - Se usuário enviar mensagem, cancela o delay
- **Continuar em horário de trabalho** (toggle)
  - Se delay cair fora do horário, pausa e retoma

**Gera outputVariable?** ❌ Não

---

### 13. SET_VARIABLE (Definir Variável) 📝

**Tipo:** `set_variable`
**Ícone:** Edit3
**Cor:** Amarelo Escuro
**Descrição:** Criar ou modificar variáveis do contexto

#### Aba: 📝 Variável
- **Nome da Variável** (text, snake_case)
- **Tipo** (select)
  - Texto
  - Número
  - Boolean
  - Array
  - Objeto JSON
- **Valor** (textarea)
  - Suporte a variáveis: `{{other_var}}`
  - Suporte a operações: `{{counter}} + 1`
  - Suporte a funções: `{{contact_name | uppercase}}`

#### Aba: 🔧 Operações (se tipo = Número)
- **Operação** (select)
  - Atribuir (=)
  - Somar (+=)
  - Subtrair (-=)
  - Multiplicar (*=)
  - Dividir (/=)
  - Incrementar (++)
  - Decrementar (--)

#### Aba: 🔀 Transformações (se tipo = Texto)
- **Transformação** (select)
  - Nenhuma
  - UPPERCASE
  - lowercase
  - Title Case
  - Remover espaços
  - Trim
  - Substituir texto

**Gera outputVariable?** ❌ Não (modifica variável existente)

---

### 14. INTERACTIVE_BUTTONS (Botões Interativos) 🔘

**Tipo:** `interactive_buttons`
**Ícone:** LayoutGrid
**Cor:** Roxo Escuro
**Descrição:** Enviar botões interativos do WhatsApp (máx 3)

#### Aba: 📝 Mensagem
- **Texto Principal** (textarea)
- **Rodapé** (text, opcional)

#### Aba: 🔘 Botões (máx 3)
- **Lista de Botões** (dynamic list, max 3)
  - **Texto do Botão** (max 20 chars)
  - **ID** (auto-gerado ou custom)
  - **Ir para Nó** (select) - quando clicado

#### Aba: 📊 Variáveis
- **Nome da Variável de Saída** (text)
  - `button_clicked_{nodeId}`
- **Contém:** ID do botão clicado

**Gera outputVariable?** ✅ Sim - `button_clicked_{nodeId}`

---

### 15. INTERACTIVE_LIST (Lista Interativa) 📋

**Tipo:** `interactive_list`
**Ícone:** List
**Cor:** Índigo Escuro
**Descrição:** Enviar lista interativa do WhatsApp (até 10 itens)

#### Aba: 📝 Mensagem
- **Texto Principal** (textarea)
- **Texto do Botão** (text) - ex: "Ver opções"
- **Rodapé** (text, opcional)

#### Aba: 📋 Seções e Itens
- **Seções** (dynamic list)
  - **Título da Seção** (text)
  - **Itens da Seção** (nested list, max 10 total)
    - **Título** (text)
    - **Descrição** (text, opcional)
    - **ID** (auto-gerado)
    - **Ir para Nó** (select)

#### Aba: 📊 Variáveis
- **Nome da Variável de Saída** (text)
  - `list_item_selected_{nodeId}`
- **Contém:** ID do item selecionado

**Gera outputVariable?** ✅ Sim - `list_item_selected_{nodeId}`

---

## Resumo de Implementação

### Prioridade 1 (Core)
1. ✅ **AI_PROMPT** - Já implementado
2. ✅ **API_CALL** - Já implementado
3. **MESSAGE** - Essencial
4. **QUESTION** - Essencial
5. **CONDITION** - Essencial
6. **HANDOFF** - Essencial

### Prioridade 2 (Importantes)
7. **ACTION** - Útil
8. **SET_VARIABLE** - Útil
9. **DELAY** - UX melhor
10. **END** - Controle

### Prioridade 3 (WhatsApp Específico)
11. **INTERACTIVE_BUTTONS** - Engajamento
12. **INTERACTIVE_LIST** - Engajamento
13. **TEMPLATE** - Templates aprovados
14. **JUMP** - Fluxos complexos

---

## Padrão de Implementação

### Estrutura de Arquivo (exemplo: MessageProperties.tsx)

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { Settings, FileText, Clock, BarChart3 } from 'lucide-react';

interface MessagePropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
}

export default function MessageProperties({
  nodeId, data, onChange, chatbotId,
}: MessagePropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [messageType, setMessageType] = useState(data?.messageType || 'text');
  const [messageText, setMessageText] = useState(data?.messageText || '');
  const [delay, setDelay] = useState(data?.delay || 0);
  const [autoAdvance, setAutoAdvance] = useState(data?.autoAdvance ?? true);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setMessageType(data?.messageType || 'text');
    setMessageText(data?.messageText || '');
    setDelay(data?.delay || 0);
    setAutoAdvance(data?.autoAdvance ?? true);
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      messageType, messageText, delay, autoAdvance,
      nodeType: data?.nodeType,
      label: data?.label,
    });
  }, [nodeId, messageType, messageText, delay, autoAdvance]);

  const tabs: Tab[] = [
    {
      id: 'content',
      label: 'Conteúdo',
      icon: FileText,
      content: (
        <div className="space-y-4">
          {/* Fields for content tab */}
        </div>
      ),
    },
    {
      id: 'formatting',
      label: 'Formatação',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Fields for formatting tab */}
        </div>
      ),
    },
    {
      id: 'behavior',
      label: 'Comportamento',
      icon: Clock,
      content: (
        <div className="space-y-4">
          {/* Fields for behavior tab */}
        </div>
      ),
    },
    {
      id: 'variables',
      label: 'Variáveis',
      icon: BarChart3,
      content: (
        <div className="space-y-4">
          {/* Variables reference list */}
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="content" />;
}
```

### Checklist para cada Properties component:

- [ ] Importar PropertyTabs
- [ ] Definir interface Props (nodeId, data, onChange, chatbotId)
- [ ] useState para cada campo
- [ ] useEffect para reinicializar quando nodeId muda
- [ ] useEffect para chamar onChange (com isFirstMount)
- [ ] Criar array de tabs com conteúdo
- [ ] Retornar `<PropertyTabs tabs={tabs} />`
- [ ] Adicionar validação (se necessário)
- [ ] Gerar outputVariable no handleAddNode (se aplicável)

---

## Próximos Passos

1. **Revisar e aprovar** esta especificação
2. **Adicionar nós novos** ao NODE_TYPES_PALETTE
3. **Implementar Properties components** um por um
4. **Atualizar handleAddNode** para gerar dados default + outputVariable
5. **Testar cada nó** no builder
6. **Documentar** padrões de uso
