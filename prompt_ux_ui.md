# 🎨 PROMPT DE UX/UI - PYTAKE WHATSAPP AUTOMATION PLATFORM

## 📋 INSTRUÇÕES PARA IA GERADORA DE DESIGN

> **USE ESTE PROMPT PARA GERAR UM DESIGN SYSTEM COMPLETO E CONSISTENTE PARA TODAS AS PÁGINAS DO PYTAKE**

---

## 🎯 CONTEXTO DO PROJETO

Você é um designer UX/UI sênior especializado em plataformas SaaS B2B. Sua missão é criar um design system moderno, profissional e altamente funcional para o **PyTake**, uma plataforma de automação para WhatsApp Business API.

### Sobre o PyTake:
- **Tipo**: SaaS B2B de automação de atendimento
- **Público**: Gestores de atendimento, analistas de marketing, atendentes, desenvolvedores
- **Funcionalidades**: Editor visual de flows (drag-and-drop), dashboard de conversas, gestão de templates WhatsApp, analytics, multi-tenant
- **Stack Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn/ui, React Flow, Recharts

### Referências de Design (Inspirações):
- Linear (clean, minimalista, dark mode elegante)
- Notion (flexível, amigável, espaços em branco)
- Intercom (chat-focused, conversacional)
- Stripe Dashboard (dados claros, hierarquia visual)
- Figma (editor visual, canvas intuitivo)

---

## 🎨 DESIGN SYSTEM SPECIFICATIONS

### PALETA DE CORES

```
=== MODO CLARO (Light Mode) ===

Primary (Ação Principal):
- primary-50: #E8FAF0
- primary-100: #C6F3DC
- primary-200: #9EEBC5
- primary-300: #69DFAA
- primary-400: #3DD68F
- primary-500: #25D366 ← Principal (Verde WhatsApp)
- primary-600: #1FAF55
- primary-700: #188A43
- primary-800: #126832
- primary-900: #0B4521

Secondary (Ações Secundárias):
- secondary-50: #E6F4F1
- secondary-100: #C0E4DC
- secondary-200: #96D3C6
- secondary-300: #6CC2AF
- secondary-400: #4DB59E
- secondary-500: #128C7E ← Principal (Teal WhatsApp)
- secondary-600: #0F7A6E
- secondary-700: #0C655B
- secondary-800: #094F47
- secondary-900: #063A34

Neutral (Textos e Backgrounds):
- neutral-0: #FFFFFF
- neutral-50: #F8FAFC
- neutral-100: #F1F5F9
- neutral-200: #E2E8F0
- neutral-300: #CBD5E1
- neutral-400: #94A3B8
- neutral-500: #64748B
- neutral-600: #475569
- neutral-700: #334155
- neutral-800: #1E293B
- neutral-900: #0F172A
- neutral-950: #020617

Semânticas (Status):
- success: #10B981 (verde)
- warning: #F59E0B (amarelo)
- error: #EF4444 (vermelho)
- info: #3B82F6 (azul)

Backgrounds Específicos:
- bg-page: #F8FAFC
- bg-card: #FFFFFF
- bg-sidebar: #FFFFFF
- bg-input: #FFFFFF
- bg-hover: #F1F5F9
- bg-selected: #E8FAF0

=== MODO ESCURO (Dark Mode) ===

Primary:
- Mesma escala, mas com luminosidade ajustada
- primary-500 permanece #25D366

Neutral (Invertido):
- bg-page: #0F172A
- bg-card: #1E293B
- bg-sidebar: #1E293B
- bg-input: #334155
- bg-hover: #334155
- bg-selected: #1A3A2A

Textos:
- text-primary: #F8FAFC
- text-secondary: #94A3B8
- text-muted: #64748B
```

### TIPOGRAFIA

```
Font Family:
- Headings: "Inter", -apple-system, BlinkMacSystemFont, sans-serif
- Body: "Inter", -apple-system, BlinkMacSystemFont, sans-serif
- Monospace: "JetBrains Mono", "Fira Code", monospace

Escala Tipográfica:
- display-xl: 4rem (64px) / line-height: 1.1 / font-weight: 700
- display-lg: 3rem (48px) / line-height: 1.1 / font-weight: 700
- h1: 2.25rem (36px) / line-height: 1.2 / font-weight: 600
- h2: 1.875rem (30px) / line-height: 1.25 / font-weight: 600
- h3: 1.5rem (24px) / line-height: 1.3 / font-weight: 600
- h4: 1.25rem (20px) / line-height: 1.4 / font-weight: 500
- h5: 1.125rem (18px) / line-height: 1.4 / font-weight: 500
- body-lg: 1.125rem (18px) / line-height: 1.6 / font-weight: 400
- body: 1rem (16px) / line-height: 1.5 / font-weight: 400
- body-sm: 0.875rem (14px) / line-height: 1.5 / font-weight: 400
- caption: 0.75rem (12px) / line-height: 1.4 / font-weight: 400
- overline: 0.75rem (12px) / line-height: 1.4 / font-weight: 500 / uppercase / letter-spacing: 0.05em
```

### ESPAÇAMENTO

```
Escala de Spacing (múltiplos de 4px):
- spacing-0: 0
- spacing-1: 0.25rem (4px)
- spacing-2: 0.5rem (8px)
- spacing-3: 0.75rem (12px)
- spacing-4: 1rem (16px)
- spacing-5: 1.25rem (20px)
- spacing-6: 1.5rem (24px)
- spacing-8: 2rem (32px)
- spacing-10: 2.5rem (40px)
- spacing-12: 3rem (48px)
- spacing-16: 4rem (64px)
- spacing-20: 5rem (80px)
- spacing-24: 6rem (96px)

Padding de Componentes:
- button-sm: spacing-2 spacing-3 (8px 12px)
- button-md: spacing-2 spacing-4 (8px 16px)
- button-lg: spacing-3 spacing-6 (12px 24px)
- card: spacing-6 (24px)
- modal: spacing-6 (24px)
- input: spacing-2 spacing-3 (8px 12px)
```

### BORDER RADIUS

```
- radius-none: 0
- radius-sm: 0.25rem (4px)
- radius-md: 0.5rem (8px)
- radius-lg: 0.75rem (12px)
- radius-xl: 1rem (16px)
- radius-2xl: 1.5rem (24px)
- radius-full: 9999px (círculo)

Uso Padrão:
- Buttons: radius-lg (12px)
- Cards: radius-xl (16px)
- Inputs: radius-lg (12px)
- Modals: radius-2xl (24px)
- Avatars: radius-full
- Tags/Badges: radius-md (8px)
```

### SOMBRAS

```
- shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05)
- shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)
- shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)
- shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)
- shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)
- shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25)
- shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.06)

Uso:
- Cards em repouso: shadow-sm
- Cards em hover: shadow-md
- Modals: shadow-xl
- Dropdowns: shadow-lg
- Inputs focus: shadow-md com cor primary
```

### TRANSIÇÕES E ANIMAÇÕES

```
Durações:
- fast: 100ms
- normal: 200ms
- slow: 300ms
- slower: 500ms

Easing:
- ease-default: cubic-bezier(0.4, 0, 0.2, 1)
- ease-in: cubic-bezier(0.4, 0, 1, 1)
- ease-out: cubic-bezier(0, 0, 0.2, 1)
- ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)

Padrões de Transição:
- Hover em botões: all 200ms ease-default
- Modal entrada: opacity 300ms ease-out, transform 300ms ease-out
- Sidebar collapse: width 300ms ease-default
- Toast entrada: transform 300ms ease-bounce
```

---

## 📐 LAYOUT SYSTEM

### ESTRUTURA BASE

```
┌─────────────────────────────────────────────────────────────────┐
│                        TOP NAVIGATION BAR                        │
│  [Logo] [Search...........................] [Notif] [Avatar ▼]  │
│  Height: 64px | bg: white | border-bottom: 1px neutral-200      │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                   │
│   SIDEBAR    │              MAIN CONTENT AREA                   │
│              │                                                   │
│  Width:      │  Padding: 24px                                   │
│  - Expanded: │  Max-width: 1440px                               │
│    256px     │  Margin: 0 auto                                  │
│  - Collapsed:│                                                   │
│    72px      │  ┌─────────────────────────────────────────┐    │
│              │  │         PAGE HEADER                      │    │
│  [Dashboard] │  │  Title + Description + Actions          │    │
│  [Conversas] │  └─────────────────────────────────────────┘    │
│  [Flows]     │                                                   │
│  [Templates] │  ┌─────────────────────────────────────────┐    │
│  [Analytics] │  │                                         │    │
│  [Números]   │  │         CONTENT AREA                    │    │
│  ─────────── │  │                                         │    │
│  [Equipe]    │  │         (Cards, Tables, Forms, etc.)    │    │
│  [Config]    │  │                                         │    │
│              │  └─────────────────────────────────────────┘    │
│              │                                                   │
└──────────────┴──────────────────────────────────────────────────┘
```

### GRID SYSTEM

```
Container Widths:
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

Grid:
- Colunas: 12
- Gutter: 24px (spacing-6)
- Margin lateral: 24px (mobile) / 48px (desktop)

Breakpoints:
- mobile: < 640px
- tablet: 640px - 1024px
- desktop: > 1024px
```

---

## 🧩 COMPONENTES DETALHADOS

### 1. BOTÕES

```jsx
// Variantes
Primary: bg-primary-500, text-white, hover:bg-primary-600
Secondary: bg-neutral-100, text-neutral-700, hover:bg-neutral-200
Ghost: bg-transparent, text-neutral-700, hover:bg-neutral-100
Danger: bg-error, text-white, hover:bg-error-dark
Success: bg-success, text-white, hover:bg-success-dark

// Tamanhos
sm: h-8 px-3 text-sm radius-md
md: h-10 px-4 text-sm radius-lg
lg: h-12 px-6 text-base radius-lg

// Estados
disabled: opacity-50, cursor-not-allowed
loading: spinner + "Carregando..."

// Com ícone
icon-left: gap-2, icon 16px (sm), 20px (md/lg)
icon-only: aspect-square, padding igual

// Exemplo de código
<Button variant="primary" size="md" leftIcon={<PlusIcon />}>
  Novo Flow
</Button>
```

### 2. INPUTS

```jsx
// Base
height: 40px (md), 36px (sm), 48px (lg)
padding: 8px 12px
border: 1px solid neutral-300
radius: radius-lg (12px)
font-size: 14px

// Estados
default: border-neutral-300
hover: border-neutral-400
focus: border-primary-500, ring-2 ring-primary-100
error: border-error, ring-2 ring-error-100
disabled: bg-neutral-100, opacity-60

// Com Label
<FormField>
  <Label>Nome do Flow</Label>
  <Input placeholder="Ex: Atendimento inicial" />
  <HelperText>Máximo 50 caracteres</HelperText>
</FormField>

// Variantes
- Text Input
- Textarea (min-height: 100px, resize: vertical)
- Select (com ícone chevron)
- Search (com ícone lupa, clear button)
- Password (com toggle visibility)
- Number (com increment/decrement)
```

### 3. CARDS

```jsx
// Base Card
bg: white (light) / neutral-800 (dark)
border: 1px solid neutral-200
radius: radius-xl (16px)
padding: spacing-6 (24px)
shadow: shadow-sm
hover: shadow-md, transform: translateY(-2px)

// Conversation Card
┌────────────────────────────────────────────────┐
│ [Avatar] Nome do Contato              [Badge]  │
│          +55 11 99999-9999             12:34   │
│ ─────────────────────────────────────────────  │
│ Última mensagem do chat aparece aqui           │
│ truncada em 2 linhas máximo...                 │
│ ─────────────────────────────────────────────  │
│ [Tag: Suporte] [Tag: Urgente]         [•••]   │
└────────────────────────────────────────────────┘

// Flow Card
┌────────────────────────────────────────────────┐
│ [Icon] Nome do Flow                            │
│ ─────────────────────────────────────────────  │
│ Descrição curta do flow                        │
│                                                 │
│ [●] Ativo    │  1.234 execuções   │  ★ 4.8    │
│ ─────────────────────────────────────────────  │
│ Atualizado há 2 dias              [Editar →]  │
└────────────────────────────────────────────────┘

// Metric Card
┌────────────────────────────────────────────────┐
│ [Icon]  Conversas Ativas                       │
│                                                 │
│         1,234                      ↑ 12%       │
│         ─────                                   │
│         vs. semana anterior                    │
│                                                 │
│ [Mini sparkline chart ═══════════╗]            │
└────────────────────────────────────────────────┘
```

### 4. MODALS

```jsx
// Estrutura
Overlay: bg-black/50 (50% opacidade), blur opcional
Container: max-width por tamanho, centered
  - sm: 400px
  - md: 560px
  - lg: 720px
  - xl: 900px
  - full: 90vw

// Layout
┌─────────────────────────────────────────────────┐
│  [X]                                            │
│                                                 │
│  Modal Title                                    │
│  Descrição opcional do modal                    │
│  ──────────────────────────────────────────     │
│                                                 │
│  [Conteúdo do Modal]                           │
│                                                 │
│                                                 │
│  ──────────────────────────────────────────     │
│                    [Cancelar]  [Confirmar]     │
└─────────────────────────────────────────────────┘

// Animação
entrada: fade-in + scale from 95%
saída: fade-out + scale to 95%
duration: 200ms
```

### 5. SIDEBAR

```jsx
// Expanded (256px)
┌─────────────────────┐
│  [Logo PyTake]      │
│                     │
│  ▸ Dashboard        │
│  ▸ Conversas    ●   │ ← Notification badge
│  ▸ Flows            │
│  ▸ Templates        │
│  ▸ Analytics        │
│  ───────────────    │
│  ▸ Números          │
│  ▸ Integrações      │
│  ───────────────    │
│  ▸ Equipe           │
│  ▸ Configurações    │
│                     │
│  ───────────────    │
│  [👤 User Name   ▼] │
└─────────────────────┘

// Collapsed (72px)
┌──────┐
│ [Lg] │
│ [📊] │
│ [💬] │
│ [🔀] │
│ [📄] │
│ [📈] │
│ ───  │
│ [📱] │
│ [🔗] │
│ ───  │
│ [👥] │
│ [⚙️] │
│      │
│ [👤] │
└──────┘

// Item ativo
bg: primary-50 (light) / primary-900/20 (dark)
border-left: 3px solid primary-500
text: primary-700
font-weight: 500
```

### 6. TABLES

```jsx
// Header
bg: neutral-50
font-weight: 500
text: neutral-600
border-bottom: 1px solid neutral-200

// Rows
height: 56px
border-bottom: 1px solid neutral-100
hover: bg-neutral-50

// Cells
padding: 12px 16px
text-align: left (default)
vertical-align: middle

// Ações
Coluna de ações no final (width: fit-content)
Dropdown com opções ou icon buttons

// Exemplo
┌─────────────────────────────────────────────────────────────┐
│ Nome ▼          Status       Criado em      Ações          │
├─────────────────────────────────────────────────────────────┤
│ Flow Welcome    [● Ativo]    12 Nov 2025    [••• ▼]        │
│ Flow Suporte    [○ Inativo]  10 Nov 2025    [••• ▼]        │
│ Flow Vendas     [● Ativo]    08 Nov 2025    [••• ▼]        │
├─────────────────────────────────────────────────────────────┤
│ Mostrando 1-10 de 50          [← Anterior] [1] [2] [3] [→] │
└─────────────────────────────────────────────────────────────┘
```

### 7. CHAT / CONVERSA

```jsx
// Container
height: calc(100vh - header - footer)
display: flex
flex-direction: column

// Header da Conversa
┌─────────────────────────────────────────────────┐
│ [←] [Avatar] Nome do Contato                    │
│              Online agora    [📞] [📎] [•••]   │
└─────────────────────────────────────────────────┘

// Área de Mensagens
bg: neutral-50 (padrão WhatsApp-like)
overflow-y: auto
padding: 16px

// Balão de Mensagem (Recebida)
┌─────────────────────────────────┐
│ Olá, preciso de ajuda com       │
│ meu pedido #12345               │
│                          12:34 ✓│
└─────────────────────────────────┘
bg: white
border-radius: 0 16px 16px 16px (tail no canto superior esquerdo)
max-width: 70%
align: left

// Balão de Mensagem (Enviada)
                    ┌─────────────────────────────────┐
                    │ Claro! Vou verificar agora      │
                    │ mesmo. Um momento.              │
                    │✓✓ 12:35                         │
                    └─────────────────────────────────┘
bg: primary-100 (verde claro)
border-radius: 16px 0 16px 16px (tail no canto superior direito)
max-width: 70%
align: right

// Input Area
┌─────────────────────────────────────────────────┐
│ [😊] [📎]  Digite uma mensagem...    [🎤] [➤]  │
└─────────────────────────────────────────────────┘
bg: white
border-top: 1px solid neutral-200
padding: 12px 16px
```

### 8. FLOW EDITOR (CANVAS)

```jsx
// Canvas Area
bg: neutral-100 com grid dots
grid-size: 20px
dot-color: neutral-300

// Toolbar (Top)
┌─────────────────────────────────────────────────────────────┐
│ [←] Flow: Nome do Flow               [Salvar] [Testar] [▶]│
│ ──────────────────────────────────────────────────────────  │
│ [+] [Undo] [Redo] | [Zoom -] 100% [Zoom +] | [Grid] [Snap] │
└─────────────────────────────────────────────────────────────┘

// Node Types
┌─────────────────────┐
│ [🟢] START          │  ← Trigger node (verde)
│                     │
│ Webhook Received    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ [💬] MESSAGE        │  ← Message node (azul)
│                     │
│ "Olá! Como posso    │
│ ajudar você hoje?"  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ [❓] CONDITION      │  ← Condition node (amarelo)
│                     │
│ Se contém "preço"   │
├──────────┬──────────┤
│ [Sim]    │  [Não]   │
└──────────┴──────────┘

// Node Base Styles
min-width: 200px
padding: 16px
radius: 12px
border: 2px solid [cor-do-tipo]
bg: white
shadow: shadow-md

// Node Selected
border: 2px solid primary-500
shadow: shadow-lg
ring: 4px primary-100

// Conexões
stroke: neutral-400
stroke-width: 2px
animated: dash when selected
```

---

## 📱 PÁGINAS ESPECÍFICAS

### LOGIN PAGE

```
Layout: Centered, max-width 400px

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     [Logo PyTake]                          │
│                                                             │
│              ┌───────────────────────────┐                 │
│              │                           │                 │
│              │    Bem-vindo de volta     │                 │
│              │    Entre na sua conta     │                 │
│              │                           │                 │
│              │    Email                  │                 │
│              │    [________________]     │                 │
│              │                           │                 │
│              │    Senha                  │                 │
│              │    [________________]     │                 │
│              │                           │                 │
│              │    □ Lembrar de mim       │                 │
│              │                           │                 │
│              │    [    Entrar    ]       │                 │
│              │                           │                 │
│              │    ─── ou continue com ───│                 │
│              │                           │                 │
│              │    [G] [    Google    ]   │                 │
│              │                           │                 │
│              │    Não tem conta?         │                 │
│              │    Criar conta →          │                 │
│              │                           │                 │
│              └───────────────────────────┘                 │
│                                                             │
│  Background: Gradient sutil ou ilustração abstrata         │
└─────────────────────────────────────────────────────────────┘
```

### DASHBOARD HOME

```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard                                [Período: Últimos 7 dias ▼] │
│ Visão geral do seu negócio                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │Conversas │ │ Mensagens │ │  Taxa de │ │  Tempo   │            │
│ │  Ativas  │ │  Enviadas │ │ Resposta │ │  Médio   │            │
│ │          │ │           │ │          │ │          │            │
│ │  1,234   │ │  45,678   │ │   94%    │ │  2m 34s  │            │
│ │  ↑ 12%   │ │   ↑ 8%    │ │  ↑ 3%   │ │  ↓ 15%   │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│                                                                  │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│ │ Conversas por Hora          │ │ Conversas Recentes          ││
│ │ [Gráfico de área/linha]     │ │ ┌─────────────────────────┐ ││
│ │                             │ │ │ João Silva        2min  │ ││
│ │                             │ │ │ Maria Santos      5min  │ ││
│ │                             │ │ │ Pedro Lima       12min  │ ││
│ │                             │ │ │ Ana Costa        15min  │ ││
│ │                             │ │ │ [Ver todas →]           │ ││
│ │                             │ │ └─────────────────────────┘ ││
│ └─────────────────────────────┘ └─────────────────────────────┘│
│                                                                  │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│ │ Flows Mais Usados           │ │ Atividade da Equipe         ││
│ │ 1. Atendimento Inicial 45%  │ │ [Lista de atendentes]       ││
│ │ 2. Suporte Técnico     30%  │ │                             ││
│ │ 3. Vendas              25%  │ │                             ││
│ └─────────────────────────────┘ └─────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### CONVERSAS (INBOX)

```
┌───────────────────────────────────────────────────────────────────────┐
│ Conversas                                           [+ Nova conversa] │
│ ───────────────────────────────────────────────────────────────────── │
│ [🔍 Buscar...]  [Todos ▼] [Status ▼] [Tags ▼] [Atendente ▼]          │
├────────────────────────┬──────────────────────────────────────────────┤
│                        │                                              │
│ Lista de Conversas     │  Área do Chat                                │
│ ───────────────────    │  ────────────────────                        │
│                        │                                              │
│ ● João Silva      2m   │  [Avatar] João Silva                         │
│   Preciso de ajuda...  │          Online agora          [📞] [⋮]     │
│   [Suporte] [Urgente]  │  ─────────────────────────────────────────   │
│ ───────────────────    │                                              │
│ ○ Maria Santos    5m   │  [Histórico de mensagens do chat]            │
│   Obrigada pelo ate... │                                              │
│   [Vendas]             │                                              │
│ ───────────────────    │                                              │
│ ○ Pedro Lima     12m   │                                              │
│   Qual o prazo de...   │                                              │
│   [Logística]          │                                              │
│ ───────────────────    │                                              │
│ ○ Ana Costa      15m   │                                              │
│   Gostaria de saber... │  ─────────────────────────────────────────   │
│   [Comercial]          │  [😊] [📎] [Digite mensagem...] [🎤] [➤]    │
│                        │                                              │
└────────────────────────┴──────────────────────────────────────────────┘

Layout: Split view (30% lista | 70% chat)
Mobile: Stack view com navegação entre lista e chat
```

### EDITOR DE FLOWS

```
┌───────────────────────────────────────────────────────────────────────┐
│ [←] Flow: Atendimento Inicial            [Salvar] [Testar] [Publicar]│
│ ───────────────────────────────────────────────────────────────────── │
│ [+Nó] [↶] [↷] │ [-] 100% [+] │ [⊞] [🧲] │ [💾 Salvo há 2min]        │
├─────────────┬─────────────────────────────────────────────────────────┤
│             │                                                          │
│ Componentes │     ┌─────────┐                                         │
│ ─────────── │     │ START   │                                         │
│             │     │Webhook  │                                         │
│ [💬] Msg    │     └────┬────┘                                         │
│ [❓] Cond   │          │                                              │
│ [⏰] Delay  │          ▼                                              │
│ [🔀] Split  │     ┌─────────┐                                         │
│ [📞] API    │     │MESSAGE  │                                         │
│ [🏷️] Tag    │     │"Olá!"  │                                         │
│ [👤] Assign │     └────┬────┘                                         │
│ [🔚] End    │          │                                              │
│             │          ▼                                              │
│ ─────────── │     ┌─────────┐                                         │
│             │     │CONDITION│                                         │
│ Templates   │     │keyword? │                                         │
│ ─────────── │     └─┬────┬──┘                                         │
│ [Boas...]   │       │    │                                            │
│ [Suporte]   │       ▼    ▼                                            │
│ [Vendas]    │   [Yes]  [No]                                           │
│             │                                                          │
│             │  Propriedades                                            │
│             │  ─────────────────────────────────                       │
│             │  (Painel lateral quando nó selecionado)                  │
│             │                                                          │
└─────────────┴─────────────────────────────────────────────────────────┘

Canvas: Área interativa com zoom/pan
Sidebar esquerda: Componentes draggable
Sidebar direita: Propriedades do nó selecionado (colapsável)
```

---

## 🌙 DARK MODE

```
Todas as páginas devem suportar dark mode com:

Backgrounds:
- Page: #0F172A
- Card: #1E293B
- Sidebar: #1E293B
- Input: #334155
- Hover: #334155

Textos:
- Primary: #F8FAFC
- Secondary: #94A3B8
- Muted: #64748B

Borders:
- Default: #334155
- Subtle: #1E293B

Primary color permanece verde #25D366 (ajustar luminosidade se necessário)

Toggle: Ícone sol/lua no header, salvar preferência no localStorage
```

---

## 📲 RESPONSIVIDADE

```
Mobile (< 640px):
- Sidebar: Drawer/overlay (abre por hamburger menu)
- Conversas: Lista full-width, chat em tela separada
- Flow Editor: Aviso para usar desktop
- Tables: Cards empilhados ou scroll horizontal
- Modals: Full-screen

Tablet (640px - 1024px):
- Sidebar: Collapsed por padrão, expandível
- Conversas: Split view 40/60
- Flow Editor: Funcional mas limitado
- Navigation: Mantém estrutura desktop

Desktop (> 1024px):
- Experiência completa
- Sidebar expandida
- Todas features habilitadas
```

---

## ♿ ACESSIBILIDADE

```
Requisitos:
- Contraste mínimo: 4.5:1 para texto normal, 3:1 para texto grande
- Focus visible: ring de 2px com cor primária
- Aria labels em todos elementos interativos
- Keyboard navigation completa
- Skip links
- Reduced motion: respeitar prefers-reduced-motion
- Screen reader friendly: semantic HTML, alt texts, aria-live

Exemplos:
- Botões: aria-label quando icon-only
- Modals: aria-modal, focus trap, ESC para fechar
- Forms: labels associados, error announcements
- Loading: aria-busy, status announcements
```

---

## 🎯 MICRO-INTERAÇÕES

```
1. Hover em cards: 
   - translateY(-2px)
   - shadow aumenta
   - transition: 200ms

2. Click em botões:
   - scale(0.98) momentâneo
   - transition: 100ms

3. Toggle switches:
   - slide com bounce
   - cor muda suavemente

4. Loading states:
   - Skeleton screens (não spinners genéricos)
   - Shimmer effect

5. Success feedback:
   - Checkmark animado
   - Verde fade-in
   - Toast notification

6. Drag and drop (Flow editor):
   - Ghost do elemento sendo arrastado
   - Drop zones highlight
   - Snap com feedback visual

7. Notificações:
   - Badge com pulse quando novo
   - Toast slide-in from top-right
   - Auto-dismiss com progress bar
```

---

## 🔧 IMPLEMENTAÇÃO

### Tokens CSS (Tailwind Config)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E8FAF0',
          100: '#C6F3DC',
          // ... (toda a escala)
          500: '#25D366',
          900: '#0B4521',
        },
        // ... outras cores
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      // ... outros tokens
    },
  },
}
```

### Componentes Base (Shadcn/ui)

```
Utilizar Shadcn/ui como base e customizar:
- Button (todas variantes)
- Input, Textarea, Select
- Card
- Dialog (Modal)
- Sheet (Sidebar mobile)
- Table
- Dropdown Menu
- Tooltip
- Toast
- Tabs
- Badge
- Avatar
- Skeleton
```

---

## ✅ CHECKLIST DE ENTREGA

Para cada página, garantir:

- [ ] Layout responsivo (mobile, tablet, desktop)
- [ ] Dark mode funcional
- [ ] Estados de loading (skeletons)
- [ ] Estados vazios (empty states)
- [ ] Estados de erro
- [ ] Feedback visual em ações
- [ ] Acessibilidade (WCAG 2.1 AA)
- [ ] Animações suaves (respeitando reduced-motion)
- [ ] Consistência com design system
- [ ] Performance (lazy loading, otimização de imagens)

---

## 📝 NOTAS FINAIS

Este prompt define um design system completo e coeso para o PyTake. Ao gerar templates:

1. **Mantenha consistência** - Use sempre os mesmos tokens definidos
2. **Priorize usabilidade** - O sistema é usado por horas, precisa ser confortável
3. **Pense em escala** - Componentes devem funcionar com muito ou pouco conteúdo
4. **Mobile-first** - Comece pelo mobile e expanda para desktop
5. **Acessibilidade não é opcional** - Todos devem poder usar o sistema

**Gere código em React/Next.js com TypeScript e Tailwind CSS, utilizando Shadcn/ui como base de componentes.**

---

*Prompt versão 1.0 - Novembro 2025*
*Sistema: PyTake WhatsApp Business Automation Platform*