# Auditoria de Nodes do Chatbot Builder

**Data:** 2025-10-15
**Objetivo:** Verificar se todos os nodes implementados no backend estão disponíveis no builder frontend e se seguem suas especificações.

---

## 📋 Status Geral

**Total de Nodes Implementados:** 19
**Backend Completo:** ✅ 19/19
**Frontend Builder UI:** ⚠️ A verificar
**Documentação:** ⚠️ A completar

---

## 🔍 Lista Completa de Nodes

### Categoria: Core Nodes (Básicos)

#### 1. **Start Node** 🚀
- **Tipo:** `start`
- **Backend:** ✅ Implementado (`whatsapp_service.py:144`)
- **Frontend UI:** ❓ A verificar
- **Função:** Ponto de entrada do fluxo
- **Configurações necessárias:**
  - Mensagem de boas-vindas (opcional)
  - Trigger conditions (opcional)
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel funcional
  - [ ] Apenas 1 Start node por flow (validação)
  - [ ] Conecta corretamente ao próximo node

---

#### 2. **Message Node** 💬
- **Tipo:** `message`
- **Backend:** ✅ Implementado (`whatsapp_service.py:266-275`)
- **Frontend UI:** ❓ A verificar
- **Função:** Enviar mensagem de texto ou mídia
- **Configurações necessárias:**
  - `messageText`: Texto da mensagem
  - `mediaType`: image, video, document, audio (opcional)
  - `mediaUrl`: URL da mídia (se mediaType presente)
  - `caption`: Legenda para mídia (opcional)
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com editor de texto
  - [ ] Suporte para variáveis `{{variable}}`
  - [ ] Opção de adicionar mídia
  - [ ] Preview da mensagem
  - [ ] Conecta ao próximo node

---

#### 3. **Question Node** ❓
- **Tipo:** `question`
- **Backend:** ✅ Implementado (`whatsapp_service.py:264`)
- **Frontend UI:** ❓ A verificar
- **Função:** Fazer pergunta e salvar resposta em variável
- **Configurações necessárias:**
  - `questionText`: Texto da pergunta
  - `variableName`: Nome da variável para salvar resposta
  - `validationType`: none, email, phone, number, cpf (opcional)
  - `errorMessage`: Mensagem se validação falhar (opcional)
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com editor de pergunta
  - [ ] Campo para nome da variável
  - [ ] Opções de validação
  - [ ] Mensagem de erro customizável
  - [ ] Conecta ao próximo node

---

#### 4. **Condition Node** 🔀
- **Tipo:** `condition`
- **Backend:** ✅ Implementado (`whatsapp_service.py:146-211`)
- **Frontend UI:** ❓ A verificar
- **Função:** Ramificar fluxo baseado em condições
- **Configurações necessárias:**
  - `conditions`: Array de condições
    - `variableName`: Variável a testar
    - `operator`: equals, contains, greater_than, less_than, etc.
    - `value`: Valor para comparar
    - `targetNodeId`: Node de destino se condição verdadeira
  - `defaultTargetNodeId`: Node padrão se nenhuma condição atender
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com lista de condições
  - [ ] Interface para adicionar/remover condições
  - [ ] Seletor de operadores
  - [ ] Múltiplas conexões de saída (uma por condição)
  - [ ] Destino padrão configurável

---

#### 5. **End Node** 🏁
- **Tipo:** `end`
- **Backend:** ✅ Implementado (`whatsapp_service.py:276-277`)
- **Frontend UI:** ❓ A verificar
- **Função:** Finalizar conversa
- **Configurações necessárias:**
  - `farewellMessage`: Mensagem de despedida (opcional)
  - `endReason`: completed, transferred, timeout, error
  - `tags`: Tags para adicionar à conversa (opcional)
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com mensagem de despedida
  - [ ] Seletor de motivo de finalização
  - [ ] Opção de adicionar tags
  - [ ] Sem conexões de saída (validação)

---

### Categoria: Ação e Controle

#### 6. **Handoff Node** 👤
- **Tipo:** `handoff`
- **Backend:** ✅ Implementado (`whatsapp_service.py:526-561`)
- **Frontend UI:** ❓ A verificar
- **Função:** Transferir para agente humano
- **Configurações necessárias:**
  - `transferMessage`: Mensagem antes de transferir
  - `sendTransferMessage`: Enviar mensagem? (boolean)
  - `departmentId`: Departamento de destino (opcional)
  - `priority`: low, medium, high, urgent
  - `note`: Nota para o agente (opcional)
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com mensagem de transferência
  - [ ] Seletor de departamento
  - [ ] Seletor de prioridade
  - [ ] Campo de nota
  - [ ] Preview da experiência do usuário

---

#### 7. **Delay Node** ⏱️
- **Tipo:** `delay`
- **Backend:** ✅ Implementado (`whatsapp_service.py:213-235`)
- **Frontend UI:** ❓ A verificar
- **Função:** Adicionar pausa no fluxo
- **Configurações necessárias:**
  - `delayAmount`: Quantidade de tempo
  - `delayUnit`: seconds, minutes, hours, days
  - `showTypingIndicator`: Mostrar indicador de digitação? (boolean)
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com input numérico
  - [ ] Seletor de unidade de tempo
  - [ ] Toggle para typing indicator
  - [ ] Preview do tempo total
  - [ ] Conecta ao próximo node

---

#### 8. **Jump Node** ➡️
- **Tipo:** `jump`
- **Backend:** ✅ Implementado (`whatsapp_service.py:237`)
- **Frontend UI:** ❓ A verificar
- **Função:** Pular para outro node ou flow
- **Configurações necessárias:**
  - `targetNodeId`: ID do node de destino
  - `targetFlowId`: ID do flow de destino (opcional, se pular entre flows)
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com seletor de node
  - [ ] Opção de pular para outro flow
  - [ ] Visual feedback da conexão
  - [ ] Prevenção de loops infinitos (aviso)

---

#### 9. **Action Node** ⚡
- **Tipo:** `action`
- **Backend:** ✅ Implementado (`whatsapp_service.py:563-624`)
- **Frontend UI:** ❓ A verificar
- **Função:** Executar ações diversas
- **Configurações necessárias:**
  - `actionType`: save_contact, send_email, webhook, update_crm, etc.
  - Campos específicos por tipo de ação
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com seletor de tipo de ação
  - [ ] Formulários dinâmicos por tipo
  - [ ] Validação de campos obrigatórios
  - [ ] Preview/teste da ação

---

### Categoria: Integrações

#### 10. **API Call Node** 🌐
- **Tipo:** `api_call`
- **Backend:** ✅ Implementado (`whatsapp_service.py:2296-2451`)
- **Frontend UI:** ❓ A verificar
- **Função:** Fazer chamadas HTTP para APIs externas
- **Configurações necessárias:**
  - `method`: GET, POST, PUT, PATCH, DELETE
  - `url`: URL da API
  - `headers`: Headers HTTP (dict)
  - `body`: Body da requisição (dict/JSON)
  - `timeout`: Timeout em segundos
  - `outputVariable`: Variável para salvar resposta
  - `onError`: continue, stop
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com seletor de método
  - [ ] Editor de URL com variáveis
  - [ ] Editor de headers (key-value pairs)
  - [ ] Editor de body (JSON)
  - [ ] Botão de teste da API
  - [ ] Campo para output variable
  - [ ] Opções de error handling

---

#### 11. **AI Prompt Node** 🤖
- **Tipo:** `ai_prompt`
- **Backend:** ✅ Implementado (`whatsapp_service.py:2453-2628`)
- **Frontend UI:** ❓ A verificar
- **Função:** Interagir com modelos de IA (GPT, Claude, etc.)
- **Configurações necessárias:**
  - `provider`: openai, anthropic, custom
  - `model`: gpt-4, claude-3-opus, etc.
  - `systemPrompt`: Prompt do sistema
  - `userPrompt`: Prompt do usuário (com variáveis)
  - `temperature`: 0.0 a 1.0
  - `maxTokens`: Limite de tokens
  - `outputVariable`: Variável para salvar resposta
  - `apiKey`: Chave da API (ou usar da org)
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com seletor de provider
  - [ ] Seletor de modelo
  - [ ] Editor de system prompt
  - [ ] Editor de user prompt (fullscreen)
  - [ ] Sliders para temperature e max tokens
  - [ ] Campo para output variable
  - [ ] Opção de usar API key da org ou customizada
  - [ ] Preview/teste do prompt

---

#### 12. **Database Query Node** 💾
- **Tipo:** `database_query`
- **Backend:** ✅ Implementado (`whatsapp_service.py:2077-2294`)
- **Frontend UI:** ❓ A verificar
- **Função:** Consultar bancos de dados
- **Configurações necessárias:**
  - `databaseType`: postgresql, mysql, mongodb, sqlite
  - `connectionString`: String de conexão
  - `query`: Query SQL/NoSQL
  - `parameters`: Parâmetros da query (dict)
  - `outputVariable`: Variável para salvar resultado
  - `limit`: Limite de resultados
  - `timeout`: Timeout em segundos
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com seletor de tipo de DB
  - [ ] Editor de connection string (seguro)
  - [ ] Editor de query (SQL/NoSQL syntax highlight)
  - [ ] Editor de parâmetros
  - [ ] Campo para output variable
  - [ ] Botão de teste da query
  - [ ] Preview dos resultados

---

#### 13. **Script Node** 📜
- **Tipo:** `script`
- **Backend:** ✅ Implementado (`whatsapp_service.py:2630-2847`)
- **Frontend UI:** ❓ A verificar
- **Função:** Executar código Python customizado
- **Configurações necessárias:**
  - `language`: python (futuro: javascript)
  - `code`: Código Python
  - `inputVariables`: Variáveis de input (array)
  - `outputVariable`: Variável para salvar resultado
  - `timeout`: Timeout em segundos (default: 5)
  - `errorHandling.onError`: continue, stop
  - `errorHandling.fallbackValue`: Valor se erro
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com editor de código
  - [ ] Editor fullscreen (PropertyModal)
  - [ ] Syntax highlighting Python
  - [ ] Lista de variáveis disponíveis
  - [ ] Campo para output variable
  - [ ] Configuração de timeout
  - [ ] Opções de error handling
  - [ ] Botão de teste com dados de exemplo

---

### Categoria: Gerenciamento de Dados

#### 14. **Set Variable Node** 🔧
- **Tipo:** `set_variable`
- **Backend:** ✅ Implementado (`whatsapp_service.py:2849-2956`)
- **Frontend UI:** ❓ A verificar
- **Função:** Definir/atualizar variáveis explicitamente
- **Configurações necessárias:**
  - `variables`: Array de variáveis
    - `name`: Nome da variável
    - `valueType`: static, variable, expression
    - `value`: Valor estático (se static)
    - `variableSource`: Nome da variável fonte (se variable)
    - `expression`: Expressão com `{{var}}` (se expression)
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com lista de variáveis
  - [ ] Botão adicionar/remover variável
  - [ ] Seletor de tipo de valor
  - [ ] Campos dinâmicos por tipo
  - [ ] Preview do valor resultante
  - [ ] Validação de nomes de variáveis

---

#### 15. **Random / A-B Testing Node** 🎲
- **Tipo:** `random`
- **Backend:** ✅ Implementado (`whatsapp_service.py:2958-3073`)
- **Frontend UI:** ❓ A verificar
- **Função:** Seleção aleatória de caminhos (testes A/B)
- **Configurações necessárias:**
  - `paths`: Array de caminhos
    - `id`: ID do caminho
    - `label`: Label do caminho
    - `weight`: Peso em % (0-100)
    - `targetNodeId`: Node de destino
  - `saveToVariable`: Variável para salvar variante (opcional)
  - `seed`: Seed para reproduzibilidade (opcional)
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com lista de paths
  - [ ] Botão adicionar/remover path
  - [ ] Input para peso (%)
  - [ ] Validação: soma de pesos = 100%
  - [ ] Múltiplas conexões de saída
  - [ ] Campo para save to variable
  - [ ] Preview da distribuição

---

#### 16. **Date/Time Node** 📅
- **Tipo:** `datetime`
- **Backend:** ✅ Implementado (`whatsapp_service.py:3075-3243`)
- **Frontend UI:** ❓ A verificar
- **Função:** Manipulação de datas e horários
- **Configurações necessárias:**
  - `operation`: get_current, format, add, compare, parse
  - `timezone`: America/Sao_Paulo, etc.
  - `format`: Formato de saída (strftime)
  - `inputFormat`: Formato de entrada (strftime)
  - `sourceVariable`: Variável com data fonte
  - `addAmount`: Quantidade a adicionar (se add)
  - `addUnit`: days, hours, minutes, months, years
  - `compareWith`: Data/variável para comparar (se compare)
  - `compareOperator`: gt, lt, eq, gte, lte
  - `outputVariable`: Variável para salvar resultado
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com seletor de operação
  - [ ] Formulários dinâmicos por operação
  - [ ] Seletor de timezone
  - [ ] Editor de formato (ajuda visual)
  - [ ] Campo para output variable
  - [ ] Preview da data resultante

---

### Categoria: Analytics e Tracking

#### 17. **Analytics Node** 📊
- **Tipo:** `analytics`
- **Backend:** ✅ Implementado (`whatsapp_service.py:3245-3371`)
- **Frontend UI:** ❓ A verificar
- **Função:** Rastrear eventos e métricas customizadas
- **Configurações necessárias:**
  - `eventType`: conversion, goal, custom
  - `eventName`: Nome do evento
  - `eventValue`: Valor numérico (opcional)
  - `eventValueVariable`: Variável com valor (opcional)
  - `eventProperties`: Propriedades adicionais (dict)
  - `tags`: Tags para adicionar (array)
  - `incrementCounter`: Contador para incrementar
  - `saveToVariable`: Variável para salvar event ID
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] Properties panel com seletor de tipo
  - [ ] Campo para nome do evento
  - [ ] Input de valor ou seletor de variável
  - [ ] Editor de propriedades (key-value)
  - [ ] Multi-select de tags
  - [ ] Campo para contador
  - [ ] Campo para save to variable
  - [ ] Preview do evento

---

### Categoria: WhatsApp Específico

#### 18. **WhatsApp Template Node** 📋
- **Tipo:** `whatsapp_template`
- **Backend:** ✅ Implementado (`whatsapp_service.py:2952-3075`)
- **Disponibilidade:** ❌ **Apenas Official API** (Meta Cloud)
- **Frontend UI:** ❓ A verificar
- **Função:** Enviar templates aprovados do WhatsApp
- **Configurações necessárias:**
  - `templateName`: Nome do template aprovado
  - `languageCode`: pt_BR, en_US, etc.
  - `components`: Array de componentes
    - `type`: header, body, footer, buttons
    - `parameters`: Parâmetros do componente
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] **Badge "Official Only"** visível
  - [ ] Desabilitado se Evolution API
  - [ ] Tooltip explicando restrição
  - [ ] Properties panel com lista de templates
  - [ ] Editor de parâmetros dinâmico
  - [ ] Preview do template
  - [ ] Validação de parâmetros obrigatórios

---

#### 19. **Interactive Buttons Node** 🔘
- **Tipo:** `interactive_buttons`
- **Backend:** ✅ Implementado (`whatsapp_service.py:3348-3468`)
- **Disponibilidade:** ✅ Ambos (⚠️ Experimental em Evolution)
- **Frontend UI:** ❓ A verificar
- **Função:** Enviar mensagem com botões de ação
- **Configurações necessárias:**
  - `bodyText`: Texto da mensagem
  - `footerText`: Texto do rodapé (opcional)
  - `buttons`: Array de botões (max 3)
    - `id`: ID único do botão
    - `title`: Texto do botão (max 20 chars)
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] **Badge "Experimental"** se Evolution API
  - [ ] Properties panel com editor de mensagem
  - [ ] Lista de botões (add/remove)
  - [ ] Validação: máximo 3 botões
  - [ ] Validação: título max 20 chars
  - [ ] Preview dos botões
  - [ ] Múltiplas conexões de saída (uma por botão)

---

#### 20. **Interactive List Node** 📝
- **Tipo:** `interactive_list`
- **Backend:** ✅ Implementado (`whatsapp_service.py:3470-3660`)
- **Disponibilidade:** ✅ Ambos (⚠️ Experimental em Evolution)
- **Frontend UI:** ❓ A verificar
- **Função:** Enviar menu/lista interativa
- **Configurações necessárias:**
  - `bodyText`: Texto da mensagem
  - `footerText`: Texto do rodapé (opcional)
  - `buttonText`: Texto do botão de abrir lista
  - `sections`: Array de seções
    - `title`: Título da seção
    - `rows`: Array de opções (max 10 por seção)
      - `id`: ID único
      - `title`: Título da opção (max 24 chars)
      - `description`: Descrição (max 72 chars)
- **Validação:**
  - [ ] Existe no Node Palette
  - [ ] **Badge "Experimental"** se Evolution API
  - [ ] Properties panel com editor de mensagem
  - [ ] Editor de seções e rows
  - [ ] Validação: max 10 rows por seção
  - [ ] Validação: limites de caracteres
  - [ ] Preview da lista
  - [ ] Conexões de saída por opção

---

## 🎨 Frontend Builder - Checklist Geral

### Node Palette (Painel Lateral)

- [ ] **Todos os 19 nodes aparecem no palette**
- [ ] **Categorias organizadas:**
  - [ ] Core (Start, Message, Question, Condition, End)
  - [ ] Actions (Handoff, Delay, Jump, Action)
  - [ ] Integrations (API Call, AI Prompt, Database, Script)
  - [ ] Data (Set Variable, Random, Date/Time)
  - [ ] Analytics (Analytics)
  - [ ] WhatsApp (Template, Buttons, List)
- [ ] **Ícones apropriados para cada node**
- [ ] **Badges de status (Official Only, Experimental)**
- [ ] **Tooltips explicativos**
- [ ] **Drag and drop funcional**

### React Flow Canvas

- [ ] **Nodes aparecem corretamente após arrastar**
- [ ] **Conexões funcionam (edges)**
- [ ] **Validação de conexões:**
  - [ ] Start node sem entrada
  - [ ] End node sem saída
  - [ ] Condition node com múltiplas saídas
  - [ ] Random node com múltiplas saídas
- [ ] **Delete node funcional**
- [ ] **Copy/paste nodes funcional**
- [ ] **Undo/redo funcional**
- [ ] **Auto-layout funcional**

### Properties Panel

- [ ] **Aparece ao clicar em um node**
- [ ] **Formulário dinâmico por tipo de node**
- [ ] **Todos os campos necessários presentes**
- [ ] **Validação de campos em tempo real**
- [ ] **Botão de salvar/cancelar**
- [ ] **PropertyModal para editores fullscreen** (Script, API Call, etc.)

### Simulador de Fluxo

- [ ] **Simular fluxo completo**
- [ ] **Visualizar variáveis em tempo real**
- [ ] **Testar condições**
- [ ] **Testar caminhos aleatórios**
- [ ] **Logs de execução**

---

## 🧪 Plano de Validação

### Fase 1: Inventário do Frontend (PRÓXIMO PASSO)

1. **Verificar Node Palette:**
   ```bash
   # Buscar arquivo do Node Palette
   find frontend/src -name "*NodePalette*" -o -name "*palette*"
   ```

2. **Verificar Properties Panels:**
   ```bash
   # Buscar arquivos de properties
   find frontend/src -name "*Properties*" -o -name "*NodeConfig*"
   ```

3. **Verificar componentes de nodes:**
   ```bash
   # Buscar custom nodes
   find frontend/src -name "*Node.tsx" -o -name "*CustomNode*"
   ```

### Fase 2: Verificação Node por Node

Para cada node, verificar:
1. ✅ Existe no palette?
2. ✅ Properties panel implementado?
3. ✅ Todos os campos presentes?
4. ✅ Validação funciona?
5. ✅ Preview/teste disponível?
6. ✅ Salva corretamente no canvas_data?
7. ✅ Backend processa corretamente?

### Fase 3: Testes de Integração

1. **Criar flow de teste com todos os nodes**
2. **Simular execução**
3. **Validar dados salvos no banco**
4. **Testar em WhatsApp real (Official e Evolution)**

---

## 📝 Template de Verificação Individual

```markdown
## Node: [NOME DO NODE]

**Tipo:** `[node_type]`

### ✅ Backend
- [x] Handler implementado
- [x] Lógica funcional
- [x] Logging adequado
- [x] Error handling

### ❓ Frontend - Node Palette
- [ ] Aparece no palette
- [ ] Ícone correto
- [ ] Categoria correta
- [ ] Badge de status (se aplicável)
- [ ] Tooltip descritivo

### ❓ Frontend - Properties Panel
- [ ] Properties panel existe
- [ ] Todos os campos presentes
- [ ] Validação funcional
- [ ] Preview/teste disponível
- [ ] Salva corretamente

### ❓ Frontend - Canvas
- [ ] Renderiza corretamente
- [ ] Conexões funcionam
- [ ] Delete funciona
- [ ] Copy/paste funciona

### ❓ Testes
- [ ] Simulador funciona
- [ ] Salva no DB corretamente
- [ ] Executa no WhatsApp corretamente

### 📋 Notas
[Observações específicas do node]
```

---

## 🎯 Ações Imediatas (Próximos Passos)

1. **Localizar arquivos do chatbot builder** no frontend
2. **Criar inventário** do que existe vs. o que falta
3. **Priorizar** nodes mais importantes para implementar UI
4. **Criar issues/tasks** para cada node faltante
5. **Implementar** UI node por node
6. **Testar** cada implementação
7. **Documentar** exemplos de uso

---

## 📊 Métricas de Progresso

**Backend:** ✅ 100% (19/19 nodes)
**Frontend Palette:** ❓ 0% verificado
**Frontend Properties:** ❓ 0% verificado
**Testes E2E:** ❓ 0% verificado
**Documentação:** ⚠️ 50% completo

---

**Próximo comando sugerido:**
```bash
# Localizar componentes do chatbot builder
find frontend/src -type f -name "*.tsx" | grep -i "chatbot\|node\|flow\|builder" | head -20
```

Isso nos dará uma visão clara do que já existe no frontend!
