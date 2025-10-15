# Dropdown Portal Fix - Implementação Completa

## Problema Original

O dropdown de ações na página de contatos estava sendo renderizado DENTRO da estrutura da tabela, causando:
- Menu cortado visualmente
- Criação de scroll dentro da lista de contatos
- Apenas opções parciais visíveis (somente "Editar" e "Tags" apareciam)
- Comportamento incorreto com overflow da tabela

## Solução Implementada

### 1. Componente DropdownMenu Reutilizável

Criado `frontend/src/components/admin/DropdownMenu.tsx` - um componente dedicado que usa React Portal para renderizar o dropdown fora da hierarquia DOM da tabela.

**Características:**
- ✅ Renderização via `createPortal` direto no `document.body`
- ✅ Posicionamento `position: fixed` (não `absolute`)
- ✅ Cálculo dinâmico de posição usando `getBoundingClientRect()`
- ✅ Proteção contra renderização SSR com `isMounted` state
- ✅ Click outside detection para fechar automaticamente
- ✅ Alinhamento inteligente (não sai da tela)
- ✅ z-index apropriado (z-50)

**Código:**
```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerElement: HTMLElement | null;
  children: React.ReactNode;
}

export function DropdownMenu({ isOpen, onClose, triggerElement, children }: DropdownMenuProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Garante renderização apenas no client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calcula posição dinamicamente
  useEffect(() => {
    if (isOpen && triggerElement) {
      const rect = triggerElement.getBoundingClientRect();
      const dropdownWidth = 192; // w-48 = 12rem = 192px
      const padding = 10;

      let left = rect.right - dropdownWidth;

      if (left < padding) {
        left = padding;
      }

      const rightEdge = left + dropdownWidth;
      if (rightEdge > window.innerWidth - padding) {
        left = window.innerWidth - dropdownWidth - padding;
      }

      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: left,
      });
    }
  }, [isOpen, triggerElement]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerElement &&
        !triggerElement.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerElement]);

  if (!isMounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50"
    >
      {children}
    </div>,
    document.body
  );
}
```

### 2. Integração na Página de Contatos

Modificado `frontend/src/app/admin/contacts/page.tsx` para usar o novo componente.

**State simplificado:**
```typescript
// Antes: Estado complexo com posição e refs
const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
const [isMounted, setIsMounted] = useState(false);
const dropdownRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

// Depois: Estado simples apenas com trigger
const [dropdownTrigger, setDropdownTrigger] = useState<HTMLButtonElement | null>(null);
```

**Handlers simplificados:**
```typescript
const handleOpenDropdown = (contactId: string, buttonElement: HTMLButtonElement) => {
  if (openDropdown === contactId) {
    setOpenDropdown(null);
    setDropdownTrigger(null);
  } else {
    setOpenDropdown(contactId);
    setDropdownTrigger(buttonElement);
  }
};

const handleCloseDropdown = () => {
  setOpenDropdown(null);
  setDropdownTrigger(null);
};
```

**Renderização via componente:**
```typescript
<DropdownMenu
  isOpen={!!openDropdown}
  onClose={handleCloseDropdown}
  triggerElement={dropdownTrigger}
>
  {openDropdown && contacts.find(c => c.id === openDropdown) && (() => {
    const contact = contacts.find(c => c.id === openDropdown)!;
    return (
      <>
        <button onClick={...}>
          <Edit className="w-4 h-4" />
          Editar
        </button>
        {/* ... outros itens do menu ... */}
      </>
    );
  })()}
</DropdownMenu>
```

### 3. Build e Deploy

**Problema encontrado:** Cache do Next.js estava servindo build antigo

**Solução:**
```bash
# 1. Build sem cache
docker-compose build --no-cache frontend

# 2. Recriar container completamente
docker-compose stop frontend
docker-compose rm -f frontend
docker-compose up -d frontend
```

## Validação com Playwright

Testado e confirmado via browser automation:

```javascript
// Dropdown renderizado FORA da tabela
- generic [ref=e241]:  // ← No nível do body
  - button "Editar"
  - button "Tags"
  - separator
  - button "Bloquear"
  - button "Deletar"

// Célula da tabela contém APENAS o botão
- cell [ref=e199]:
  - button [ref=e201]:
    - img [ref=e202]
```

## Resultado Final

✅ **Dropdown renderizado fora da tabela** - Confirmado via Portal no `document.body`
✅ **Todas as opções visíveis** - Editar, Tags, Bloquear, Deletar aparecem completas
✅ **Sem scroll na tabela** - Problema eliminado
✅ **Posicionamento correto** - Alinha com botão e não sai da tela
✅ **Click outside funciona** - Fecha corretamente
✅ **Componente reutilizável** - Pode ser usado em outras páginas

## Arquivos Modificados

1. **Criado**: `frontend/src/components/admin/DropdownMenu.tsx` (85 linhas)
2. **Modificado**: `frontend/src/app/admin/contacts/page.tsx`
   - Removido código inline de Portal
   - Simplificado gerenciamento de estado
   - Integrado componente DropdownMenu

## Uso em Outras Páginas

Para usar o DropdownMenu em outras páginas:

```typescript
import { DropdownMenu } from '@/components/admin/DropdownMenu';

// Estado
const [dropdownTrigger, setDropdownTrigger] = useState<HTMLButtonElement | null>(null);
const [openDropdown, setOpenDropdown] = useState<string | null>(null);

// Handler
const handleOpenDropdown = (id: string, buttonElement: HTMLButtonElement) => {
  if (openDropdown === id) {
    setOpenDropdown(null);
    setDropdownTrigger(null);
  } else {
    setOpenDropdown(id);
    setDropdownTrigger(buttonElement);
  }
};

// Render
<button onClick={(e) => handleOpenDropdown(item.id, e.currentTarget)}>
  <MoreVertical />
</button>

<DropdownMenu
  isOpen={openDropdown === item.id}
  onClose={() => { setOpenDropdown(null); setDropdownTrigger(null); }}
  triggerElement={dropdownTrigger}
>
  {/* Menu items */}
</DropdownMenu>
```

## Lições Aprendidas

1. **React Portal é essencial** para menus/modals que precisam escapar do overflow de containers
2. **position: fixed + Portal** é melhor que `absolute` para dropdowns em tabelas
3. **Cache do Next.js** pode causar confusão - sempre fazer build --no-cache quando em dúvida
4. **isMounted pattern** é necessário para evitar erros de SSR com Portal
5. **Componentes reutilizáveis** economizam tempo e garantem consistência

## Referências

- React Portal: https://react.dev/reference/react-dom/createPortal
- Next.js Build Cache: https://nextjs.org/docs/app/api-reference/next-config-js
- Playwright Testing: https://playwright.dev/
