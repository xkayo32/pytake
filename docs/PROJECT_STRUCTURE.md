# Estrutura de Diretórios - PyTake

## Estrutura Completa do Projeto

```
pytake/
├── backend/                      # Backend Rust
│   ├── Cargo.toml               # Workspace configuration
│   ├── crates/                  # Múltiplos crates para modularidade
│   │   ├── pytake-core/         # Core business logic
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       ├── entities/    # Domain entities
│   │   │       ├── services/    # Business services
│   │   │       └── lib.rs
│   │   ├── pytake-api/          # REST API & WebSocket
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       ├── handlers/    # Route handlers
│   │   │       ├── middleware/  # Auth, logging, etc
│   │   │       ├── websocket/   # WebSocket handlers
│   │   │       └── main.rs
│   │   ├── pytake-flow/         # Flow engine
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       ├── engine/      # Flow execution
│   │   │       ├── nodes/       # Flow node types
│   │   │       └── lib.rs
│   │   ├── pytake-whatsapp/     # WhatsApp integration
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       ├── client/      # WhatsApp API client
│   │   │       ├── webhooks/    # Webhook handlers
│   │   │       └── lib.rs
│   │   ├── pytake-modules/      # Module system
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       ├── loader/      # Module loader
│   │   │       ├── registry/    # Module registry
│   │   │       └── lib.rs
│   │   └── pytake-db/           # Database layer
│   │       ├── Cargo.toml
│   │       └── src/
│   │           ├── migrations/  # SQL migrations
│   │           ├── models/      # ORM models
│   │           └── lib.rs
│   ├── modules/                 # Plugin modules
│   │   ├── boleto/
│   │   ├── crm/
│   │   └── webhook/
│   └── tests/                   # Integration tests
│       └── integration/
├── frontend/                    # Frontend React
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── public/
│   └── src/
│       ├── components/          # Componentes reutilizáveis
│       │   ├── ui/             # Componentes base (buttons, inputs)
│       │   ├── chat/           # Componentes de chat
│       │   ├── flow/           # Componentes do flow builder
│       │   └── dashboard/      # Componentes do dashboard
│       ├── pages/              # Páginas/rotas
│       │   ├── Dashboard/
│       │   ├── FlowBuilder/
│       │   ├── Conversations/
│       │   ├── Settings/
│       │   └── Login/
│       ├── services/           # API clients e serviços
│       │   ├── api/
│       │   ├── websocket/
│       │   └── auth/
│       ├── stores/             # Estado global (Zustand)
│       │   ├── auth.store.ts
│       │   ├── chat.store.ts
│       │   └── flow.store.ts
│       ├── hooks/              # Custom React hooks
│       ├── utils/              # Funções utilitárias
│       ├── types/              # TypeScript types
│       ├── App.tsx
│       └── main.tsx
├── docker/                     # Docker configurations
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── docker-compose.yml
├── kubernetes/                 # K8s manifests
│   ├── backend/
│   ├── frontend/
│   ├── database/
│   └── redis/
├── scripts/                    # Scripts de desenvolvimento
│   ├── setup.sh
│   ├── migrate.sh
│   └── deploy.sh
├── docs/                       # Documentação
│   ├── ARCHITECTURE.md
│   ├── PROJECT_STRUCTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── MODULES.md
├── .github/                    # GitHub Actions
│   └── workflows/
│       ├── backend.yml
│       ├── frontend.yml
│       └── release.yml
├── .env.example               # Variáveis de ambiente exemplo
├── README.md                  # Documentação principal
└── LICENSE                    # Licença do projeto
```

## Descrição dos Diretórios

### Backend (Rust)

- **crates/**: Separação em múltiplos crates para melhor modularidade
  - **pytake-core**: Lógica de negócio central, independente de framework
  - **pytake-api**: Handlers HTTP e WebSocket usando Actix-web
  - **pytake-flow**: Motor de execução de fluxos conversacionais
  - **pytake-whatsapp**: Cliente e integração com WhatsApp Cloud API
  - **pytake-modules**: Sistema de plugins para extensibilidade
  - **pytake-db**: Camada de dados com migrations e models

- **modules/**: Módulos externos que implementam a trait Module
- **tests/**: Testes de integração end-to-end

### Frontend (React)

- **components/**: Componentes organizados por domínio
- **pages/**: Componentes de página correspondendo às rotas
- **services/**: Lógica de comunicação com backend
- **stores/**: Estado global usando Zustand
- **hooks/**: Custom hooks para lógica reutilizável
- **types/**: Definições TypeScript compartilhadas

### Infraestrutura

- **docker/**: Configurações para desenvolvimento local
- **kubernetes/**: Manifests para deploy em produção
- **scripts/**: Automação de tarefas comuns

## Convenções

### Rust
- Use `cargo fmt` e `cargo clippy` antes de commits
- Testes unitários junto ao código (`#[cfg(test)]`)
- Documentação com `///` para itens públicos

### React
- Componentes em PascalCase
- Hooks customizados prefixados com `use`
- Arquivos TypeScript com extensão `.tsx` para componentes
- CSS modules ou Tailwind para estilos

### Git
- Branch `main` protegida
- Feature branches: `feature/nome-da-feature`
- Commits convencionais: `feat:`, `fix:`, `docs:`, etc.