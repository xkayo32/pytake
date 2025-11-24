# PyTake Frontend - Vite

Frontend da plataforma PyTake construído com Vite + React + TypeScript + Tailwind CSS.

## Estrutura

```
src/
├── components/     # Componentes React reutilizáveis
│   ├── layout/     # Componentes de layout (Sidebar, Layout)
│   └── ui/         # Componentes UI (Button, Input, etc)
├── lib/            # Utilidades, hooks, tipos
│   ├── auth/       # Autenticação e contexto
│   └── hooks/      # Custom hooks
├── pages/          # Páginas/views da aplicação
├── types/          # Definições de tipos TypeScript
├── assets/         # Imagens e recursos estáticos
└── App.tsx         # Componente raiz com rotas
```

## Desenvolvimento

```bash
npm install
npm run dev
```

Acessar em http://localhost:3000

## Build

```bash
npm run build
npm run preview
```

## Rotas

- `/` - Home (pública)
- `/login` - Login (pública)
- `/register` - Registro (pública)
- `/dashboard` - Dashboard (protegida)
- `/flows` - Fluxos (protegida)
- `/templates` - Templates (protegida)
- `/contacts` - Contatos (protegida)
- `/automations` - Automações (protegida)
- `/analytics` - Analytics (protegida)
- `/settings` - Configurações (protegida)

---
**Implementado por:** Kayo Carvalho Fernandes
