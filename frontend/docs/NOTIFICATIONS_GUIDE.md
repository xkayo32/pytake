# 📱 Sistema de Notificações - Modals e Toasts

**Implementado em:** 25 de Novembro de 2025  
**Autor:** Kayo Carvalho Fernandes  
**Status:** ✅ Pronto para Uso

---

## 🎯 Visão Geral

Sistema completo de notificações com **Toasts** (pop-ups não-intrusivos) e **Modals** (caixas de diálogo interativas) para melhorar a experiência do usuário.

### Características Principais

✅ **Context API** para estado global  
✅ **Hooks customizados** fáceis de usar  
✅ **Animações suaves** e profissionais  
✅ **Dark mode** totalmente integrado  
✅ **TypeScript** com type safety completo  
✅ **Performance** otimizado  
✅ **Acessibilidade** keyboard-friendly  

---

## 📦 Estrutura de Arquivos

```
frontend/src/
├── contexts/
│   ├── ToastContext.tsx      # Provider de Toasts
│   └── ModalContext.tsx      # Provider de Modals
├── components/
│   ├── ui/
│   │   ├── toast.tsx         # Componente Toast visual
│   │   └── modal.tsx         # Componente Modal visual
│   └── NotificationProvider.tsx  # Provider unificado
├── hooks/
│   └── useNotification.ts    # Hooks customizados
└── pages/
    └── notification-demo.tsx # Página de demonstração
```

---

## 🚀 Uso Básico

### 1. Importar o Provider no App.tsx

```tsx
import { NotificationProvider } from '@components/NotificationProvider'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          {/* Seu conteúdo aqui */}
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

### 2. Usar Toasts (Notificações Pop-up)

```tsx
import { useNotifications } from '@hooks/useNotification'

export default function MyComponent() {
  const notifications = useNotifications()

  return (
    <button onClick={() => notifications.success('Salvo com sucesso!')}>
      Salvar
    </button>
  )
}
```

### 3. Usar Modals (Caixas de Diálogo)

```tsx
import { useDialog } from '@hooks/useNotification'

export default function MyComponent() {
  const dialog = useDialog()

  const handleDelete = () => {
    dialog.dangerous(
      'Deletar item?',
      'Esta ação não pode ser desfeita.',
      async () => {
        await api.delete('/items/1')
        notifications.success('Deletado!')
      }
    )
  }

  return (
    <button onClick={handleDelete}>
      Deletar
    </button>
  )
}
```

---

## 🎨 Toasts - Tipos e Exemplos

### Sucesso ✓

```tsx
notifications.success('Operação concluída com sucesso!')
notifications.success('Arquivo salvo!', 3000) // Duration em ms
```

**Estilo:** Verde com ícone CheckCircle

### Erro ✗

```tsx
notifications.error('Ocorreu um erro ao processar!')
notifications.error('Falha na conexão', 5000)
```

**Estilo:** Vermelho com ícone AlertCircle

### Info ℹ

```tsx
notifications.info('Nova mensagem recebida')
```

**Estilo:** Azul com ícone Info

### Aviso ⚠

```tsx
notifications.warning('Atenção: Verifique os dados')
```

**Estilo:** Amarelo com ícone AlertTriangle

### Com Ação 🎯

```tsx
notifications.action(
  'Arquivo baixado',
  'Abrir',
  () => window.open('/file.pdf'),
  5000
)
```

**Características:**
- Botão de ação clicável
- Auto-fecha após clique ou timeout
- Ícone específico por tipo

---

## 🔲 Modals - Tipos e Exemplos

### Alert (Informação)

```tsx
dialog.alert(
  'Informação',
  'Descrição da informação que deseja comunicar'
)
```

**Uso:** Notificações que requerem confirmação do usuário

### Confirm (Confirmação)

```tsx
dialog.confirm(
  'Confirmar Ação',
  'Tem certeza que deseja continuar?',
  async () => {
    // Código executado ao confirmar
    await api.post('/action')
  },
  {
    confirmText: 'Sim, continuar',
    cancelText: 'Cancelar'
  }
)
```

**Uso:** Pedir confirmação antes de ações

### Dangerous (Ação Perigosa)

```tsx
dialog.dangerous(
  'Deletar Usuário',
  'Esta ação não pode ser desfeita. Todos os dados serão perdidos.',
  async () => {
    await api.delete('/users/123')
  },
  {
    confirmText: 'Deletar',
    cancelText: 'Cancelar'
  }
)
```

**Características:**
- Botão vermelho de confirmação
- Header em vermelho
- Ícone de alerta

### Custom (Conteúdo Personalizado)

```tsx
const content = (
  <div className="space-y-4">
    <input type="email" placeholder="Email" />
    <textarea placeholder="Mensagem" />
  </div>
)

dialog.custom(
  'Enviar Feedback',
  content,
  {
    confirmText: 'Enviar',
    onConfirm: async () => {
      // Processar formulário
    }
  }
)
```

**Uso:** Formulários, conteúdo complexo, layouts customizados

---

## 🎭 Estados de Modal

### Loading

```tsx
const modalId = dialog.confirm('Processando...', '', async () => {
  // Enquanto em processamento, o modal mostra loading
})
```

O botão de confirmação exibe um spinner durante a execução da promise.

### Com Callback no Cancelamento

```tsx
dialog.confirm(
  'Descartar Alterações?',
  'Você tem alterações não salvas.',
  async () => {
    await api.post('/save')
  },
  {
    confirmText: 'Salvar e Sair',
    cancelText: 'Descartar'
  }
)
```

---

## 🎨 Personalizações

### Duração de Toast

```tsx
// Nunca desaparece (duration = 0)
notifications.success('Mensagem importante', 0)

// 2 segundos
notifications.success('Mensagem rápida', 2000)

// Padrão: 4000ms
notifications.success('Mensagem normal')
```

### Textos de Modal Customizados

```tsx
dialog.confirm(
  'Publicar Post?',
  'O post será visível para todos os usuários.',
  async () => {
    await api.post('/publish')
  },
  {
    confirmText: '✓ Publicar',
    cancelText: '✕ Cancelar'
  }
)
```

---

## 🎯 Casos de Uso Comuns

### 1. Salvamento de Formulário

```tsx
async function handleSave() {
  try {
    await api.put('/profile', formData)
    notifications.success('Perfil atualizado!')
  } catch (error) {
    notifications.error('Erro ao salvar: ' + error.message)
  }
}
```

### 2. Exclusão com Confirmação

```tsx
function handleDelete(id: string) {
  dialog.dangerous(
    'Deletar item?',
    'Esta ação não pode ser desfeita.',
    async () => {
      try {
        await api.delete(`/items/${id}`)
        notifications.success('Item deletado')
      } catch (error) {
        notifications.error('Erro ao deletar')
      }
    }
  )
}
```

### 3. Feedback de Ação

```tsx
function handleExport() {
  dialog.confirm(
    'Exportar Dados',
    'Você receberá um arquivo CSV por email',
    async () => {
      await api.post('/export')
    },
    {
      confirmText: 'Exportar',
      cancelText: 'Cancelar'
    }
  )
}
```

### 4. Alerta com Ação

```tsx
notifications.action(
  'Nova atualização disponível',
  'Baixar',
  () => {
    window.location.reload()
  },
  0 // Nunca desaparece até o usuário clicar
)
```

---

## 🌙 Dark Mode

Todos os componentes têm suporte completo a dark mode via `dark:` classes Tailwind.

```tsx
// Automático! Detecta preferência do sistema
// ou usa a classe 'dark' no elemento html
```

---

## 🎬 Animações Aplicadas

| Animação | Uso | Duração |
|----------|-----|---------|
| `fadeIn` | Entrada suave | 300ms |
| `slideUp` | Toasts (futura) | 400ms |
| `scaleIn` | Modals | 300ms |
| `pulse` | Loading states | 2s |
| `spin` | Spinners | 1s |

---

## 🚦 Performance

- **Bundle size:** ~8KB gzipped (contexts + components + hooks)
- **Re-renders:** Otimizado com `useCallback` e Context
- **Animações:** GPU-accelerated via CSS transforms
- **Acessibilidade:** Keyboard navigation (ESC para fechar modals)

---

## 🐛 Troubleshooting

### Toast não aparece

**Problema:** Toast é criado mas não aparece na tela

**Solução:** Verifique se `NotificationProvider` está envolvendo seu app em `App.tsx`

```tsx
<NotificationProvider>
  {/* Seu app */}
</NotificationProvider>
```

### Modal não fecha

**Problema:** Modal permanece aberto após clique

**Solução:** Se usando `async`, aguarde a promise ser resolvida

```tsx
// ✅ Correto
dialog.confirm('Confirmar?', 'Continue?', async () => {
  await api.post('/action') // Aguarda
  // Modal fecha automaticamente
})

// ❌ Errado
dialog.confirm('Confirmar?', 'Continue?', () => {
  api.post('/action') // Não aguarda
})
```

### TypeScript errors

**Problema:** Import de tipos causando erro

**Solução:** Importe tanto o hook quanto os tipos

```tsx
import { useNotifications } from '@hooks/useNotification'
import type { Toast } from '@contexts/ToastContext'
```

---

## 📚 Documentação Adicional

- [React Context API](https://react.dev/reference/react/useContext)
- [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Tailwind CSS Animations](https://tailwindcss.com/docs/animation)
- [ARIA Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialogmodal/)

---

## 📝 Próximas Melhorias

- [ ] Notificação persistente (localStorage)
- [ ] Stack de toasts com limite máximo
- [ ] Animação de exit customizável
- [ ] Integração com React Query para erros
- [ ] Testes unitários com Vitest
- [ ] Storybook stories

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 25 de Novembro de 2025  
**Status:** ✅ Pronto para Produção

---

## 🎓 Página de Demonstração

Visite `/notification-demo` para ver exemplos práticos de todos os componentes em ação!

```bash
# Acessar página de demo
http://localhost:3001/notification-demo
```

Esta página contém:
- 5 exemplos de Toasts diferentes
- 4 exemplos de Modals diferentes
- Code snippets prontos para copiar
- Documentação inline
