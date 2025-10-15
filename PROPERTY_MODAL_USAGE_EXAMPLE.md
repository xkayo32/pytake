# PropertyModal - Guia de Uso

O componente `PropertyModal` é um modal fullscreen genérico que pode ser usado em **qualquer** component de propriedades (API Call, Database Query, WhatsApp Template, etc.)

## Como Usar em Seus Componentes

### 1. Importar os Componentes

```tsx
import PropertyModal, { PropertyModalTrigger } from './PropertyModal';
```

### 2. Adicionar Estado para Controlar o Modal

```tsx
const [isModalOpen, setIsModalOpen] = useState(false);
```

### 3. Criar um Componente Reutilizável para o Editor

Crie um componente interno que recebe `isFullscreen` como prop:

```tsx
const YourEditor = ({ isFullscreen = false }: { isFullscreen?: boolean }) => (
  <div className="space-y-4">
    {/* Seus campos aqui */}
    <textarea
      rows={isFullscreen ? 25 : 12}  // Mais linhas no fullscreen
      // ... outros props
    />
  </div>
);
```

### 4. Adicionar o Botão "Expandir"

Use o componente `PropertyModalTrigger`:

```tsx
<div className="flex items-center justify-between mb-2">
  <label>Seu Campo</label>
  <div className="flex items-center gap-2">
    {!isFullscreen && (
      <PropertyModalTrigger onClick={() => setIsModalOpen(true)} />
    )}
    {/* Outros botões como "Testar", etc. */}
  </div>
</div>
```

### 5. Renderizar o Modal

```tsx
return (
  <>
    <PropertyTabs tabs={tabs} defaultTab="main" />

    {/* Fullscreen Modal */}
    <PropertyModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title="Título do Seu Editor"
      subtitle="Descrição opcional"
    >
      <YourEditor isFullscreen />
    </PropertyModal>
  </>
);
```

## Exemplo Completo: APICallProperties com Modal

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import PropertyModal, { PropertyModalTrigger } from './PropertyModal';
import { Globe, Settings } from 'lucide-react';

export default function APICallProperties({ nodeId, data, onChange }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [url, setUrl] = useState(data?.url || '');
  const [method, setMethod] = useState(data?.method || 'GET');
  const [headers, setHeaders] = useState(data?.headers || '');
  const [body, setBody] = useState(data?.body || '');

  // API Call Editor (reutilizável no modal e inline)
  const APICallEditor = ({ isFullscreen = false }: { isFullscreen?: boolean }) => (
    <div className="space-y-4">
      {/* URL */}
      <div>
        <label>URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.exemplo.com/endpoint"
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      {/* Method */}
      <div>
        <label>Método HTTP</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {/* Headers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label>Headers (JSON)</label>
          <div className="flex items-center gap-2">
            {!isFullscreen && (
              <PropertyModalTrigger onClick={() => setIsModalOpen(true)} />
            )}
          </div>
        </div>
        <textarea
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
          rows={isFullscreen ? 10 : 5}
          placeholder='{"Authorization": "Bearer token"}'
          className="w-full px-3 py-2 border rounded-lg font-mono"
        />
      </div>

      {/* Body */}
      {(method === 'POST' || method === 'PUT') && (
        <div>
          <label>Body (JSON)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={isFullscreen ? 15 : 8}
            placeholder='{"key": "value"}'
            className="w-full px-3 py-2 border rounded-lg font-mono"
          />
        </div>
      )}
    </div>
  );

  const tabs = [
    {
      id: 'api',
      label: 'API Call',
      icon: Globe,
      content: <APICallEditor />,
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      content: <div>Configurações adicionais...</div>,
    },
  ];

  return (
    <>
      <PropertyTabs tabs={tabs} defaultTab="api" />

      {/* Fullscreen Modal */}
      <PropertyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Editor de API Call"
        subtitle={url || 'Configure sua chamada de API'}
      >
        <APICallEditor isFullscreen />
      </PropertyModal>
    </>
  );
}
```

## Benefícios

### ✅ **Consistência Visual**
- Todos os modals têm o mesmo design e comportamento
- Header com título, subtitle e botão fechar
- Backdrop escurecido com blur

### ✅ **Reutilização de Código**
- Mesmo componente editor funciona inline e fullscreen
- Basta passar `isFullscreen={true}` para ajustar o layout

### ✅ **Flexibilidade**
- `rows={isFullscreen ? 25 : 12}` - Mais linhas no fullscreen
- Pode esconder/mostrar campos diferentes em cada modo
- Customização total do conteúdo

### ✅ **UX Melhorada**
- Usuário pode expandir quando precisar de mais espaço
- Especialmente útil para JSON, SQL, código, etc.
- Não perde o contexto - volta para o painel normal ao fechar

## Componentes que Podem Usar

Todos os componentes de propriedades podem se beneficiar do modal fullscreen:

1. ✅ **ScriptProperties** (já implementado)
2. 🔄 **APICallProperties** - Para editar headers e body JSON
3. 🔄 **DatabaseQueryProperties** - Para SQL queries longas
4. 🔄 **WhatsAppTemplateProperties** - Para mensagens longas
5. 🔄 **AIPromptProperties** - Para prompts complexos
6. 🔄 **ConditionProperties** - Para muitas condições
7. 🔄 **ActionProperties** - Para configurações webhook

## Estilo do Modal

O modal já vem estilizado com:
- **Tamanho**: 95vw x 95vh (ocupa quase toda a tela)
- **Header**: Gradiente indigo/purple com ícone Maximize2
- **Conteúdo**: Scrollável com padding adequado
- **Dark Mode**: Suporte completo
- **z-index**: 9999 (sempre no topo)
- **Backdrop**: Preto com 80% opacidade + blur

## Props do PropertyModal

```tsx
interface PropertyModalProps {
  isOpen: boolean;          // Controla visibilidade
  onClose: () => void;      // Callback ao fechar
  title: string;            // Título do modal
  subtitle?: string;        // Subtitle opcional
  children: ReactNode;      // Conteúdo do modal
}
```

## Props do PropertyModalTrigger

```tsx
interface PropertyModalTriggerProps {
  onClick: () => void;      // Callback ao clicar
  label?: string;           // Label do botão (padrão: "Expandir")
}
```

---

**Próximos Passos:**
1. Implemente o modal em APICallProperties
2. Adicione em DatabaseQueryProperties
3. Teste em dispositivos de diferentes tamanhos
4. Considere adicionar atalhos de teclado (ESC para fechar, F11 para toggle)
