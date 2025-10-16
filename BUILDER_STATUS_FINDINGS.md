# Status do Chatbot Builder - Achados da Auditoria

**Data:** 2025-10-15
**Arquivo Base:** `frontend/src/app/admin/chatbots/[id]/builder/page.tsx`

---

## 📊 Resumo Executivo

**Backend:** ✅ 100% (19/19 nodes implementados)
**Frontend Node Palette:** ⚠️ 53% (10/19 nodes)
**Frontend Properties:** ✅ ~84% (16/19 components criados)
**Integração:** ⚠️ Parcial (3/16 properties integrados no builder)

---

## 🎨 Node Palette - Status Atual

### ✅ Nodes Presentes no Palette (10/19)

Localização: `page.tsx:50-61` - Array `NODE_TYPES_PALETTE`

1. ✅ **start** - Início (Play icon, green)
2. ✅ **message** - Mensagem (MessageSquare icon, blue)
3. ✅ **question** - Pergunta (HelpCircle icon, purple)
4. ✅ **condition** - Condição (GitBranch icon, orange)
5. ✅ **action** - Ação (Zap icon, yellow)
6. ✅ **api_call** - API (Globe icon, indigo)
7. ✅ **ai_prompt** - IA (Brain icon, pink)
8. ✅ **jump** - Pular (ArrowRight icon, gray)
9. ✅ **end** - Fim (StopCircle icon, red)
10. ✅ **handoff** - Transferir (Users icon, teal)

---

### ❌ Nodes FALTANDO no Palette (9/19)

Estes nodes estão implementados no backend mas NÃO aparecem no palette do builder:

#### 11. ❌ **delay** ⏱️
- **Backend:** ✅ Implementado
- **Properties:** ✅ `DelayProperties.tsx` existe
- **Palette:** ❌ Ausente
- **Sugestão:** Icon: Clock, Color: cyan
- **Label:** "Atraso" ou "Delay"

#### 12. ❌ **database_query** 💾
- **Backend:** ✅ Implementado
- **Properties:** ✅ `DatabaseQueryProperties.tsx` existe
- **Palette:** ❌ Ausente
- **Sugestão:** Icon: Database, Color: emerald
- **Label:** "Consulta BD" ou "Database"

#### 13. ❌ **script** 📜
- **Backend:** ✅ Implementado
- **Properties:** ✅ `ScriptProperties.tsx` existe
- **Palette:** ❌ Ausente
- **Sugestão:** Icon: Code, Color: slate
- **Label:** "Script" ou "Código"

#### 14. ❌ **set_variable** 🔧
- **Backend:** ✅ Implementado
- **Properties:** ✅ `SetVariableProperties.tsx` existe
- **Palette:** ❌ Ausente
- **Sugestão:** Icon: Variable ou Wrench, Color: violet
- **Label:** "Definir Variável"

#### 15. ❌ **random** 🎲
- **Backend:** ✅ Implementado
- **Properties:** ❌ NÃO existe (precisa criar)
- **Palette:** ❌ Ausente
- **Sugestão:** Icon: Shuffle ou Dices, Color: fuchsia
- **Label:** "Aleatório" ou "A/B Test"

#### 16. ❌ **datetime** 📅
- **Backend:** ✅ Implementado
- **Properties:** ❌ NÃO existe (precisa criar)
- **Palette:** ❌ Ausente
- **Sugestão:** Icon: Calendar ou Clock, Color: amber
- **Label:** "Data/Hora"

#### 17. ❌ **analytics** 📊
- **Backend:** ✅ Implementado
- **Properties:** ❌ NÃO existe (precisa criar)
- **Palette:** ❌ Ausente
- **Sugestão:** Icon: BarChart ou LineChart, Color: sky
- **Label:** "Analytics" ou "Métricas"

#### 18. ❌ **whatsapp_template** 📋
- **Backend:** ✅ Implementado (Official API only)
- **Properties:** ✅ `WhatsAppTemplateProperties.tsx` existe
- **Palette:** ❌ Ausente
- **Sugestão:** Icon: FileText ou MessageCircle, Color: lime
- **Label:** "Template WA"
- **Badge:** "Official Only"

#### 19. ❌ **interactive_buttons** 🔘
- **Backend:** ✅ Implementado (Experimental em Evolution)
- **Properties:** ✅ `InteractiveButtonsProperties.tsx` existe
- **Palette:** ❌ Ausente
- **Sugestão:** Icon: Square ou Grid, Color: rose
- **Label:** "Botões"
- **Badge:** "Experimental" (se Evolution API)

#### 20. ❌ **interactive_list** 📝
- **Backend:** ✅ Implementado (Experimental em Evolution)
- **Properties:** ✅ `InteractiveListProperties.tsx` existe
- **Palette:** ❌ Ausente
- **Sugestão:** Icon: List ou Menu, Color: teal
- **Label:** "Lista"
- **Badge:** "Experimental" (se Evolution API)

---

## 🎛️ Properties Components - Status

### ✅ Properties Components Criados (16/19)

Localização: `frontend/src/components/admin/builder/`

1. ✅ `ActionProperties.tsx`
2. ✅ `AIPromptProperties.tsx`
3. ✅ `APICallProperties.tsx`
4. ✅ `ConditionProperties.tsx`
5. ✅ `DatabaseQueryProperties.tsx`
6. ✅ `DelayProperties.tsx`
7. ✅ `EndProperties.tsx`
8. ✅ `HandoffProperties.tsx`
9. ✅ `InteractiveButtonsProperties.tsx`
10. ✅ `InteractiveListProperties.tsx`
11. ✅ `JumpProperties.tsx`
12. ✅ `MessageProperties.tsx`
13. ✅ `QuestionProperties.tsx`
14. ✅ `ScriptProperties.tsx`
15. ✅ `SetVariableProperties.tsx`
16. ✅ `WhatsAppTemplateProperties.tsx`

### ❌ Properties Components FALTANDO (3/19)

17. ❌ `RandomProperties.tsx` - **PRECISA CRIAR**
18. ❌ `DateTimeProperties.tsx` - **PRECISA CRIAR**
19. ❌ `AnalyticsProperties.tsx` - **PRECISA CRIAR**

**Nota:** Start node tipicamente não tem properties panel (apenas ponto de entrada).

---

## 🔌 Integração no Builder - Status

### ✅ Properties INTEGRADOS no Builder (3/16)

Localização: `page.tsx:443-472`

Apenas 3 properties components estão sendo renderizados:

1. ✅ `AIPromptProperties` (linha 443-452)
2. ✅ `APICallProperties` (linha 454-463)
3. ✅ `HandoffProperties` (linha 465-472)

### ❌ Properties NÃO INTEGRADOS (13/16)

Estes components existem mas NÃO estão sendo usados no builder:

1. ❌ `ActionProperties`
2. ❌ `ConditionProperties`
3. ❌ `DatabaseQueryProperties`
4. ❌ `DelayProperties`
5. ❌ `EndProperties`
6. ❌ `InteractiveButtonsProperties`
7. ❌ `InteractiveListProperties`
8. ❌ `JumpProperties`
9. ❌ `MessageProperties`
10. ❌ `QuestionProperties`
11. ❌ `ScriptProperties`
12. ❌ `SetVariableProperties`
13. ❌ `WhatsAppTemplateProperties`

**Código Atual (linha 475-504):**
```tsx
{!['ai_prompt', 'api_call', 'handoff'].includes(selectedNode.data?.nodeType) && (
  <div>
    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
      Propriedades do Nó
    </h3>
    <div className="space-y-4">
      {/* ... */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          💡 Editor de propriedades para este tipo de nó será implementado em breve
        </p>
      </div>
    </div>
  </div>
)}
```

---

## 📋 Plano de Ação - Prioridades

### Fase 1: Adicionar Nodes ao Palette (URGENTE)

**Objetivo:** Disponibilizar os 9 nodes faltantes no palette.

**Arquivo:** `frontend/src/app/admin/chatbots/[id]/builder/page.tsx`
**Linha:** 50-61 (array `NODE_TYPES_PALETTE`)

**Ação:**
```tsx
// Adicionar ao array NODE_TYPES_PALETTE:
{ type: 'delay', label: 'Atraso', icon: Clock, color: 'cyan', description: 'Adicionar delay no fluxo' },
{ type: 'database_query', label: 'Consulta BD', icon: Database, color: 'emerald', description: 'Consultar banco de dados' },
{ type: 'script', label: 'Script', icon: Code, color: 'slate', description: 'Executar código Python' },
{ type: 'set_variable', label: 'Variável', icon: Variable, color: 'violet', description: 'Definir/atualizar variável' },
{ type: 'random', label: 'Aleatório', icon: Shuffle, color: 'fuchsia', description: 'Seleção aleatória (A/B)' },
{ type: 'datetime', label: 'Data/Hora', icon: Calendar, color: 'amber', description: 'Manipular datas' },
{ type: 'analytics', label: 'Analytics', icon: BarChart, color: 'sky', description: 'Rastrear eventos' },
{ type: 'whatsapp_template', label: 'Template WA', icon: FileText, color: 'lime', description: 'Template oficial WhatsApp' },
{ type: 'interactive_buttons', label: 'Botões', icon: Square, color: 'rose', description: 'Botões interativos' },
{ type: 'interactive_list', label: 'Lista', icon: List, color: 'teal', description: 'Menu/lista interativa' },

// Adicionar cores ao COLOR_MAP (linha 63-74):
cyan: '#06b6d4',
emerald: '#10b981',
slate: '#64748b',
violet: '#8b5cf6',
fuchsia: '#d946ef',
amber: '#f59e0b',
sky: '#0ea5e9',
lime: '#84cc16',
rose: '#f43f5e',
```

**Imports necessários (linha 19-36):**
```tsx
import {
  // ... existing
  Clock,         // para delay
  Database,      // para database_query
  Code,          // para script
  Variable,      // para set_variable (já existe)
  Shuffle,       // para random
  Calendar,      // para datetime
  BarChart,      // para analytics
  FileText,      // para whatsapp_template
  Square,        // para interactive_buttons
  List,          // para interactive_list
} from 'lucide-react';
```

---

### Fase 2: Criar Properties Faltantes (MÉDIO)

**Objetivo:** Criar os 3 properties components que não existem.

#### 2.1. RandomProperties.tsx

```tsx
// frontend/src/components/admin/builder/RandomProperties.tsx
interface RandomPath {
  id: string;
  label: string;
  weight: number;
  targetNodeId: string;
}

// Campos:
- paths: Array<RandomPath>
- saveToVariable: string (opcional)
- seed: number (opcional)

// Features:
- Lista de paths (add/remove)
- Weight sliders (0-100%)
- Validação: soma = 100%
- Target node selector
```

#### 2.2. DateTimeProperties.tsx

```tsx
// frontend/src/components/admin/builder/DateTimeProperties.tsx

// Campos:
- operation: get_current | format | add | compare | parse
- timezone: select (America/Sao_Paulo, etc.)
- format: string (formato strftime)
- sourceVariable: string
- addAmount: number (se operation = add)
- addUnit: days | hours | minutes | months | years
- compareWith: string (se operation = compare)
- compareOperator: gt | lt | eq | gte | lte
- outputVariable: string

// Features:
- Operation selector com formulários dinâmicos
- Timezone selector
- Format helper (visual guide)
- Preview da data resultante
```

#### 2.3. AnalyticsProperties.tsx

```tsx
// frontend/src/components/admin/builder/AnalyticsProperties.tsx

// Campos:
- eventType: conversion | goal | custom
- eventName: string
- eventValue: number (opcional)
- eventValueVariable: string (opcional)
- eventProperties: Record<string, any>
- tags: string[]
- incrementCounter: string
- saveToVariable: string

// Features:
- Event type selector
- Event name input
- Value input ou variable selector
- Properties editor (key-value pairs)
- Tags multi-select
- Counter input
- Save to variable
```

---

### Fase 3: Integrar Properties no Builder (URGENTE)

**Objetivo:** Renderizar os 13 properties components que existem mas não estão sendo usados.

**Arquivo:** `frontend/src/app/admin/chatbots/[id]/builder/page.tsx`
**Linha:** 440-504 (seção de properties)

**Ação:** Substituir o bloco atual por:

```tsx
{selectedNode ? (
  <div>
    {/* AI Prompt */}
    {selectedNode.data?.nodeType === 'ai_prompt' && (
      <AIPromptProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
        chatbotId={chatbotId}
        nodes={nodes}
        edges={edges}
      />
    )}

    {/* API Call */}
    {selectedNode.data?.nodeType === 'api_call' && (
      <APICallProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
        chatbotId={chatbotId}
        nodes={nodes}
        edges={edges}
      />
    )}

    {/* Handoff */}
    {selectedNode.data?.nodeType === 'handoff' && (
      <HandoffProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
        chatbotId={chatbotId}
      />
    )}

    {/* Message */}
    {selectedNode.data?.nodeType === 'message' && (
      <MessageProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
      />
    )}

    {/* Question */}
    {selectedNode.data?.nodeType === 'question' && (
      <QuestionProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
      />
    )}

    {/* Condition */}
    {selectedNode.data?.nodeType === 'condition' && (
      <ConditionProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
        nodes={nodes}
        edges={edges}
      />
    )}

    {/* Action */}
    {selectedNode.data?.nodeType === 'action' && (
      <ActionProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
      />
    )}

    {/* Delay */}
    {selectedNode.data?.nodeType === 'delay' && (
      <DelayProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
      />
    )}

    {/* Jump */}
    {selectedNode.data?.nodeType === 'jump' && (
      <JumpProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
        nodes={nodes}
      />
    )}

    {/* End */}
    {selectedNode.data?.nodeType === 'end' && (
      <EndProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
      />
    )}

    {/* Database Query */}
    {selectedNode.data?.nodeType === 'database_query' && (
      <DatabaseQueryProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
      />
    )}

    {/* Script */}
    {selectedNode.data?.nodeType === 'script' && (
      <ScriptProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
      />
    )}

    {/* Set Variable */}
    {selectedNode.data?.nodeType === 'set_variable' && (
      <SetVariableProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
      />
    )}

    {/* WhatsApp Template */}
    {selectedNode.data?.nodeType === 'whatsapp_template' && (
      <WhatsAppTemplateProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
      />
    )}

    {/* Interactive Buttons */}
    {selectedNode.data?.nodeType === 'interactive_buttons' && (
      <InteractiveButtonsProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
      />
    )}

    {/* Interactive List */}
    {selectedNode.data?.nodeType === 'interactive_list' && (
      <InteractiveListProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
      />
    )}

    {/* Random (quando criar) */}
    {selectedNode.data?.nodeType === 'random' && (
      <RandomProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
        nodes={nodes}
      />
    )}

    {/* DateTime (quando criar) */}
    {selectedNode.data?.nodeType === 'datetime' && (
      <DateTimeProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
      />
    )}

    {/* Analytics (quando criar) */}
    {selectedNode.data?.nodeType === 'analytics' && (
      <AnalyticsProperties
        nodeId={selectedNode.id}
        data={selectedNode.data}
        onChange={handleNodeDataChange}
      />
    )}

    {/* Fallback para node sem properties */}
    {!['ai_prompt', 'api_call', 'handoff', 'message', 'question', 'condition',
        'action', 'delay', 'jump', 'end', 'database_query', 'script', 'set_variable',
        'whatsapp_template', 'interactive_buttons', 'interactive_list', 'random',
        'datetime', 'analytics', 'start'].includes(selectedNode.data?.nodeType) && (
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Propriedades do Nó
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-900 dark:text-white">
              {selectedNode.data?.nodeType || 'default'}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
) : (
  {/* ... mensagem de selecionar node ... */}
)}
```

**Imports necessários (adicionar ao topo):**
```tsx
import MessageProperties from '@/components/admin/builder/MessageProperties';
import QuestionProperties from '@/components/admin/builder/QuestionProperties';
import ConditionProperties from '@/components/admin/builder/ConditionProperties';
import ActionProperties from '@/components/admin/builder/ActionProperties';
import DelayProperties from '@/components/admin/builder/DelayProperties';
import JumpProperties from '@/components/admin/builder/JumpProperties';
import EndProperties from '@/components/admin/builder/EndProperties';
import DatabaseQueryProperties from '@/components/admin/builder/DatabaseQueryProperties';
import ScriptProperties from '@/components/admin/builder/ScriptProperties';
import SetVariableProperties from '@/components/admin/builder/SetVariableProperties';
import WhatsAppTemplateProperties from '@/components/admin/builder/WhatsAppTemplateProperties';
import InteractiveButtonsProperties from '@/components/admin/builder/InteractiveButtonsProperties';
import InteractiveListProperties from '@/components/admin/builder/InteractiveListProperties';
// import RandomProperties from '@/components/admin/builder/RandomProperties';          // quando criar
// import DateTimeProperties from '@/components/admin/builder/DateTimeProperties';      // quando criar
// import AnalyticsProperties from '@/components/admin/builder/AnalyticsProperties';    // quando criar
```

---

### Fase 4: Adicionar Node Status Badges (BAIXO)

**Objetivo:** Mostrar badges "Official Only" e "Experimental" nos nodes do palette.

**Implementação:**
```tsx
// Adicionar campo badge ao NODE_TYPES_PALETTE:
{
  type: 'whatsapp_template',
  label: 'Template WA',
  icon: FileText,
  color: 'lime',
  badge: 'official-only',   // <-- novo
  description: 'Template oficial WhatsApp (Meta API)'
},
{
  type: 'interactive_buttons',
  label: 'Botões',
  icon: Square,
  color: 'rose',
  badge: 'experimental',    // <-- novo
  description: 'Botões interativos (Experimental)'
},

// Renderizar badge no palette (linha 370-390):
<div className="flex-1 min-w-0">
  <div className="font-medium text-sm text-gray-900 dark:text-white flex items-center gap-2">
    {nodeType.label}
    {nodeType.badge === 'official-only' && (
      <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
        Official
      </span>
    )}
    {nodeType.badge === 'experimental' && (
      <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
        Experimental
      </span>
    )}
  </div>
  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
    {nodeType.description}
  </div>
</div>
```

---

## 🎯 Resumo das Ações

| Fase | Ação | Prioridade | Status | Arquivos |
|------|------|-----------|--------|----------|
| 1 | Adicionar 9 nodes ao palette | 🔴 URGENTE | ❌ Pendente | `page.tsx` |
| 2A | Criar RandomProperties | 🟡 MÉDIO | ❌ Pendente | Criar novo |
| 2B | Criar DateTimeProperties | 🟡 MÉDIO | ❌ Pendente | Criar novo |
| 2C | Criar AnalyticsProperties | 🟡 MÉDIO | ❌ Pendente | Criar novo |
| 3 | Integrar 13 properties | 🔴 URGENTE | ❌ Pendente | `page.tsx` |
| 4 | Adicionar badges | 🟢 BAIXO | ❌ Pendente | `page.tsx` |

---

## 📊 Métricas Atualizadas

**Backend:** ✅ 100% (19/19 nodes implementados)
**Frontend Palette:** ⚠️ 53% (10/19 visíveis)
**Frontend Properties:** ✅ 84% (16/19 criados)
**Integração Properties:** ⚠️ 19% (3/16 integrados)

**Próximo passo:** Implementar Fase 1 e Fase 3 (urgentes) para tornar o builder completo!

---

**Arquivo de Referência:**
- Builder principal: `frontend/src/app/admin/chatbots/[id]/builder/page.tsx`
- Properties folder: `frontend/src/components/admin/builder/`
