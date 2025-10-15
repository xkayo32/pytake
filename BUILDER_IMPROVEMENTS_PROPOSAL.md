# Proposta de Melhorias do Builder

## Análise dos Problemas Identificados

### 1. ❌ Problema: Variáveis de Saída Fixas (Conflito de Nomes)

**Situação Atual:**
```typescript
// AIPromptProperties.tsx:218
<code>ai_response</code>
```

**Problema Real:**
- Se houver **2+ nós IA** no mesmo fluxo, ambos salvarão em `ai_response`
- O segundo nó **sobrescreverá** a saída do primeiro
- **Perda de dados** e comportamento imprevisível

**Exemplo do Problema:**
```
Fluxo:
┌─────────┐      ┌─────────────┐      ┌─────────────┐
│ Início  │─────▶│ IA Node 1   │─────▶│ IA Node 2   │
│         │      │ GPT-4       │      │ Claude      │
└─────────┘      │ out: ai_re..│      │ out: ai_re..│ ❌
                 └─────────────┘      └─────────────┘

Resultado: ai_response do Node 1 é perdida!
```

---

### 2. ⚠️ Problema: Propriedades Desorganizadas

**Situação Atual:**
- AIPromptProperties tem **8 campos** em lista vertical:
  1. Provider de IA
  2. Modelo
  3. API Key (Secret)
  4. Prompt do Sistema (textarea grande)
  5. Temperature (slider)
  6. Tokens Máximos
  7. Dica sobre variável
  8. Outros metadados

**Problema:**
- Scroll excessivo
- Campos avançados (temperature, tokens) ocupam mesmo espaço que configs básicas
- Dificulta encontrar configurações rapidamente
- Não escalável (ao adicionar mais opções, piora)

---

### 3. ⚠️ Problema: Entrada/Saída de Fluxo Não Visível

**Situação Atual:**
- React Flow mostra conexões visuais (edges)
- **MAS** não mostra:
  - Quais **variáveis** chegam de nós anteriores
  - Qual **variável** este nó produz
  - **Dependências** entre nós além de conexões visuais

**Exemplo:**
```
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Question │─────▶│ AI Node  │─────▶│ Message  │
│          │      │          │      │          │
└──────────┘      └──────────┘      └──────────┘

Invisível:
- Question produz: user_input
- AI usa: user_input (entrada)
- AI produz: ai_response (saída)
- Message usa: ai_response (entrada)
```

---

## 🎯 Soluções Propostas

### Solução 1: Variáveis de Saída Configuráveis

#### 1.1. Adicionar Campo "Output Variable Name"

**Backend (canvas_data):**
```typescript
// Flow canvas_data structure
{
  nodes: [
    {
      id: 'node-1',
      type: 'default',
      data: {
        nodeType: 'ai_prompt',
        provider: 'openai',
        model: 'gpt-4',
        secretId: 'xxx',
        prompt: '...',
        // ✅ NOVO: Nome da variável de saída
        outputVariable: 'gpt4_summary',  // customizável!
        temperature: 0.7,
        maxTokens: 1000
      }
    },
    {
      id: 'node-2',
      type: 'default',
      data: {
        nodeType: 'ai_prompt',
        provider: 'anthropic',
        model: 'claude-3-opus',
        secretId: 'yyy',
        prompt: '...',
        // ✅ Diferente do Node 1!
        outputVariable: 'claude_analysis',  // sem conflito!
        temperature: 0.5,
        maxTokens: 2000
      }
    }
  ]
}
```

**Frontend (AIPromptProperties.tsx):**
```tsx
// Adicionar estado
const [outputVariable, setOutputVariable] = useState(
  data?.outputVariable || `ai_response_${nodeId.slice(-4)}`  // default único
);

// Adicionar campo no formulário (antes da dica)
<div>
  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
    Nome da Variável de Saída
  </label>
  <input
    type="text"
    value={outputVariable}
    onChange={(e) => setOutputVariable(e.target.value)}
    placeholder="Ex: gpt4_summary, claude_response, ai_result"
    pattern="^[a-z][a-z0-9_]*$"  // snake_case
    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono focus:ring-2 focus:ring-pink-500 focus:border-transparent"
  />
  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
    A resposta da IA será salva nesta variável. Use snake_case (ex: gpt4_summary)
  </p>
</div>

// Atualizar dica final
<div className="p-3 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg">
  <p className="text-xs text-pink-700 dark:text-pink-300">
    💡 <strong>Dica:</strong> A resposta da IA será salva na variável{' '}
    <code className="px-1 py-0.5 bg-pink-100 dark:bg-pink-800 rounded font-mono">
      {outputVariable}
    </code>
  </p>
</div>
```

**Validação:**
- Não permitir variáveis duplicadas no mesmo fluxo
- Sugerir automaticamente nome único: `ai_response_1`, `ai_response_2`, etc.
- Validar formato snake_case

---

### Solução 2: Organizar Propriedades em Abas

#### 2.1. Estrutura de Abas Proposta

```
┌─────────────────────────────────────────────────┐
│  [Configuração] [Prompt] [Avançado] [Variáveis] │
├─────────────────────────────────────────────────┤
│                                                  │
│  (Conteúdo da aba selecionada)                   │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Aba 1: Configuração** (Essencial)
- Provider de IA
- Modelo
- API Key (Secret)

**Aba 2: Prompt** (Conteúdo)
- Prompt do Sistema (textarea grande)
- Variáveis disponíveis (lista)

**Aba 3: Avançado** (Opcional)
- Temperature (slider)
- Tokens Máximos
- Top P
- Frequency Penalty
- Presence Penalty

**Aba 4: Variáveis** (I/O)
- Nome da variável de saída
- Variáveis de entrada disponíveis
- Visualização de dependências

#### 2.2. Implementação do Componente de Abas

**Criar: `frontend/src/components/admin/builder/PropertyTabs.tsx`**
```tsx
'use client';

import { useState, ReactNode } from 'react';
import { Settings, FileText, Sliders, Variable } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  content: ReactNode;
}

interface PropertyTabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export default function PropertyTabs({ tabs, defaultTab }: PropertyTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="flex flex-col h-full">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${isActive
                  ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {currentTab?.content}
      </div>
    </div>
  );
}
```

**Atualizar: `AIPromptProperties.tsx`**
```tsx
import PropertyTabs from './PropertyTabs';

export default function AIPromptProperties({ ... }) {
  // ... estados existentes ...

  const tabs = [
    {
      id: 'config',
      label: 'Configuração',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Provider */}
          <div>...</div>
          {/* Model */}
          <div>...</div>
          {/* API Key */}
          <div>...</div>
        </div>
      )
    },
    {
      id: 'prompt',
      label: 'Prompt',
      icon: FileText,
      content: (
        <div className="space-y-4">
          {/* Prompt textarea */}
          <div>...</div>
          {/* Variables help */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
              <strong>Variáveis disponíveis:</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <code className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                {{user_input}}
              </code>
              <code className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                {{contact_name}}
              </code>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'advanced',
      label: 'Avançado',
      icon: Sliders,
      content: (
        <div className="space-y-4">
          {/* Temperature */}
          <div>...</div>
          {/* Max Tokens */}
          <div>...</div>
        </div>
      )
    },
    {
      id: 'variables',
      label: 'Variáveis',
      icon: Variable,
      content: (
        <div className="space-y-4">
          {/* Output Variable */}
          <div>...</div>
          {/* Input Variables (coming soon) */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Visualização de variáveis de entrada será implementada em breve
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        ...
      </div>

      {/* Tabs */}
      <PropertyTabs tabs={tabs} defaultTab="config" />
    </div>
  );
}
```

---

### Solução 3: Visualizar Entrada/Saída de Fluxo

#### 3.1. Adicionar Badge de Variáveis nos Nós

**No canvas do React Flow:**
```tsx
// No builder page.tsx, ao criar nó
const newNode: Node = {
  id: newNodeId,
  type: 'default',
  position: { ... },
  data: {
    label: (
      <div className="flex flex-col gap-1">
        {/* Node header */}
        <div className="flex items-center gap-2 px-3 py-2">
          <Icon className="w-4 h-4" style={{ color: COLOR_MAP[nodeType.color] }} />
          <span className="font-medium text-gray-900">{nodeType.label}</span>
        </div>

        {/* Variables badges (se configurado) */}
        {nodeType.type === 'ai_prompt' && data?.outputVariable && (
          <div className="px-3 pb-2 flex items-center gap-1">
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <code className="text-xs px-1.5 py-0.5 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded">
              {data.outputVariable}
            </code>
          </div>
        )}
      </div>
    ),
    nodeType: nodeType.type,
  },
  // ...
};
```

#### 3.2. Painel de Variáveis do Fluxo

**Adicionar sidebar esquerda com variáveis globais:**
```tsx
// No builder, adicionar painel lateral
<div className="w-64 bg-white dark:bg-gray-800 border-r">
  <div className="p-4">
    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
      <Variable className="w-4 h-4" />
      Variáveis do Fluxo
    </h3>

    {/* System variables */}
    <div className="mb-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        Sistema
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
          <code className="text-xs text-green-600 dark:text-green-400">
            contact_name
          </code>
          <span className="text-xs text-gray-400">string</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
          <code className="text-xs text-green-600 dark:text-green-400">
            contact_phone
          </code>
          <span className="text-xs text-gray-400">string</span>
        </div>
      </div>
    </div>

    {/* Output variables from nodes */}
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        Saídas de Nós
      </p>
      <div className="space-y-1">
        {nodes
          .filter(n => n.data?.outputVariable)
          .map(node => (
            <div
              key={node.id}
              className="flex items-center justify-between p-2 bg-pink-50 dark:bg-pink-900/20 rounded"
            >
              <code className="text-xs text-pink-600 dark:text-pink-400">
                {node.data.outputVariable}
              </code>
              <span className="text-xs text-gray-400">
                {node.data.nodeType}
              </span>
            </div>
          ))}
      </div>
    </div>
  </div>
</div>
```

#### 3.3. Validação de Variáveis

**Ao salvar o flow:**
```typescript
const validateFlow = (nodes: Node[], edges: Edge[]) => {
  const errors: string[] = [];
  const variables = new Set<string>();

  // Check for duplicate output variables
  nodes.forEach(node => {
    const outputVar = node.data?.outputVariable;
    if (outputVar) {
      if (variables.has(outputVar)) {
        errors.push(`Variável duplicada: ${outputVar} (nó ${node.id})`);
      }
      variables.add(outputVar);
    }
  });

  // Check for undefined input variables
  nodes.forEach(node => {
    const requiredVars = getRequiredVariables(node.data?.prompt || '');
    requiredVars.forEach(varName => {
      if (!variables.has(varName) && !SYSTEM_VARIABLES.includes(varName)) {
        errors.push(`Variável não definida: ${varName} (nó ${node.id})`);
      }
    });
  });

  return errors;
};

const getRequiredVariables = (text: string): string[] => {
  const matches = text.match(/\{\{([a-z_][a-z0-9_]*)\}\}/g) || [];
  return matches.map(m => m.slice(2, -2));  // remove {{ }}
};

const SYSTEM_VARIABLES = [
  'contact_name',
  'contact_phone',
  'contact_email',
  'user_input',
  'conversation_id',
];
```

---

## 📋 Checklist de Implementação

### Fase 1: Variáveis Configuráveis (Alta Prioridade)
- [ ] Adicionar campo `outputVariable` no estado do AIPromptProperties
- [ ] Criar input para nome da variável
- [ ] Implementar validação snake_case
- [ ] Gerar nome único por padrão (`ai_response_${nodeId.slice(-4)}`)
- [ ] Atualizar dica para mostrar nome da variável dinâmico
- [ ] Salvar `outputVariable` no `canvas_data.nodes[].data`

### Fase 2: Propriedades em Abas (Média Prioridade)
- [ ] Criar componente `PropertyTabs.tsx`
- [ ] Refatorar `AIPromptProperties.tsx` para usar abas
- [ ] Aba 1: Configuração (provider, model, secret)
- [ ] Aba 2: Prompt (textarea + variáveis disponíveis)
- [ ] Aba 3: Avançado (temperature, tokens)
- [ ] Aba 4: Variáveis (output variable + inputs)
- [ ] Aplicar mesmo padrão em `APICallProperties.tsx`

### Fase 3: Visualização de Variáveis (Baixa Prioridade)
- [ ] Adicionar badge de variável nos nós do canvas
- [ ] Criar painel lateral "Variáveis do Fluxo"
- [ ] Listar variáveis do sistema
- [ ] Listar variáveis de saída dos nós
- [ ] Implementar validação de variáveis ao salvar
- [ ] Highlight de variáveis não definidas
- [ ] Autocomplete de variáveis no textarea de prompt

### Fase 4: Melhorias Avançadas (Futuro)
- [ ] Drag & drop de variáveis do painel para o prompt
- [ ] Visualização de dependências entre nós
- [ ] Grafo de fluxo de variáveis
- [ ] Detecção de variáveis não utilizadas
- [ ] Sugestão de nomes de variáveis baseado no contexto
- [ ] Teste de fluxo com valores de variáveis mock

---

## 🎨 Mockup Visual

### Antes (Atual):
```
┌─────────────────────────────────┐
│ Propriedades do Nó              │
├─────────────────────────────────┤
│ Provider: [OpenAI ▼]            │
│ Modelo: [GPT-4 ▼]               │
│ API Key: [Select... ▼]          │
│ Prompt: [____________]          │
│         [____________]          │
│         [____________]          │
│ Temperature: [●────] 0.7        │
│ Tokens: [1000]                  │
│ 💡 Saída: ai_response           │ ❌ fixo!
└─────────────────────────────────┘
```

### Depois (Proposto):
```
┌─────────────────────────────────────┐
│ [Config] [Prompt] [Avançado] [Vars] │ ✅ abas!
├─────────────────────────────────────┤
│ Aba: Variáveis                      │
│                                     │
│ Nome da Variável de Saída:          │
│ [gpt4_summary________] ✅           │ ✅ editável!
│                                     │
│ Variáveis Disponíveis:              │
│ • contact_name (sistema)            │
│ • user_input (question_node)        │ ✅ rastreável!
│ • previous_ai (ai_node_1)           │
│                                     │
│ 💡 Resposta salva em: gpt4_summary  │
└─────────────────────────────────────┘
```

---

## 📊 Benefícios Esperados

### ✅ Variáveis Configuráveis
- **Sem conflitos**: Múltiplos nós IA no mesmo fluxo
- **Clareza**: Nomes descritivos (`gpt4_summary` > `ai_response`)
- **Manutenibilidade**: Fácil rastrear origem das variáveis
- **Escalabilidade**: Suporta fluxos complexos com muitos nós

### ✅ Abas de Propriedades
- **Menos scroll**: Cada aba tem 2-3 campos apenas
- **Organização**: Configs básicas separadas de avançadas
- **Aprendizado**: Usuários iniciantes focam em "Configuração"
- **Poder**: Usuários avançados acessam "Avançado" quando precisam

### ✅ Visualização de I/O
- **Debugging**: Ver facilmente fluxo de dados entre nós
- **Validação**: Detectar variáveis não definidas antes de salvar
- **Documentação**: Fluxo autodocumentado com variáveis visíveis
- **Autocomplete**: Sugestões de variáveis ao digitar `{{`

---

## 🚀 Próximos Passos

1. **Revisar proposta** com o time/usuário
2. **Priorizar fases** (sugestão: 1 → 2 → 3)
3. **Implementar Fase 1** (variáveis configuráveis) - mais crítico
4. **Testar com fluxos complexos** (5+ nós IA)
5. **Coletar feedback** antes de prosseguir para Fase 2
6. **Iterar** baseado no uso real

---

## 🤔 Questões em Aberto

1. **Backend**: Precisa validar variáveis ao executar o flow?
2. **Escopo**: Variáveis são globais no flow ou podem ter escopos?
3. **Tipos**: Adicionar tipos de variáveis (string, number, boolean, object)?
4. **Persistência**: Variáveis persistem entre conversas ou são por sessão?
5. **Debug**: Implementar modo de debug para ver valores de variáveis em runtime?
