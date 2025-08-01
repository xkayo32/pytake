# Requisitos Técnicos - PyTake

## Requisitos de Sistema

### Ambiente de Desenvolvimento
- **OS**: Linux, macOS ou Windows com WSL2
- **RAM**: Mínimo 8GB (16GB recomendado)
- **Disco**: 20GB livres
- **CPU**: 4 cores ou mais

### Ferramentas Necessárias
- **Rust**: 1.75+ (stable)
- **Node.js**: 20.x LTS
- **Docker**: 24.x+
- **Docker Compose**: 2.x+
- **PostgreSQL**: 15+
- **Redis**: 7+

## Dependências Backend (Rust)

### Cargo.toml Principal
```toml
[workspace]
members = [
    "crates/pytake-core",
    "crates/pytake-api",
    "crates/pytake-flow",
    "crates/pytake-whatsapp",
    "crates/pytake-modules",
    "crates/pytake-db",
]

[workspace.dependencies]
# Web Framework
actix-web = "4.5"
actix-ws = "0.2"
actix-cors = "0.7"

# Async Runtime
tokio = { version = "1.37", features = ["full"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Database
sea-orm = { version = "0.12", features = ["postgres", "runtime-tokio-native-tls"] }
redis = { version = "0.25", features = ["tokio-comp"] }

# Authentication
jsonwebtoken = "9.3"
argon2 = "0.5"

# HTTP Client
reqwest = { version = "0.12", features = ["json"] }

# Logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# Error Handling
thiserror = "1.0"
anyhow = "1.0"

# Validation
validator = { version = "0.18", features = ["derive"] }

# Time
chrono = { version = "0.4", features = ["serde"] }

# UUID
uuid = { version = "1.8", features = ["v4", "serde"] }

# Environment
dotenvy = "0.15"

# Testing
mockall = "0.12"
```

## Dependências Frontend (React)

### package.json
```json
{
  "name": "pytake-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives"
  },
  "dependencies": {
    // React Core
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",

    // State Management
    "zustand": "^4.5.0",
    "immer": "^10.0.0",

    // UI Components
    "@radix-ui/react-alert-dialog": "^1.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-toast": "^1.1.0",
    "lucide-react": "^0.364.0",

    // Forms & Validation
    "react-hook-form": "^7.51.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",

    // Flow Builder
    "reactflow": "^11.11.0",

    // Charts
    "recharts": "^2.12.0",

    // WebSocket
    "socket.io-client": "^4.7.0",

    // HTTP Client
    "axios": "^1.6.0",
    "ky": "^1.2.0",

    // Date Management
    "date-fns": "^3.6.0",

    // Utilities
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    // TypeScript
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.4.0",

    // Build Tools
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.2.0",

    // CSS
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",

    // Linting
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.34.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "@typescript-eslint/eslint-plugin": "^7.3.0",
    "@typescript-eslint/parser": "^7.3.0",

    // Testing
    "vitest": "^1.4.0",
    "@testing-library/react": "^14.2.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/user-event": "^14.5.0"
  }
}
```

## Requisitos da API WhatsApp

### WhatsApp Business Platform
1. **Conta Business**: Meta Business Manager configurado
2. **App ID**: Aplicativo registrado no Meta for Developers
3. **Phone Number ID**: Número de telefone verificado
4. **Access Token**: Token de acesso permanente
5. **Webhook URL**: HTTPS com certificado válido
6. **Webhook Token**: Token de verificação do webhook

### Limites e Cotas
- **Mensagens**: Respeitar limites de tier (1K, 10K, 100K, ilimitado)
- **Templates**: Aprovar templates antes do uso
- **Rate Limits**: 80 mensagens/segundo por número

## Segurança e Compliance

### Requisitos de Segurança
1. **HTTPS**: Obrigatório em produção
2. **Criptografia**: AES-256 para dados sensíveis
3. **Hashing**: Argon2id para senhas
4. **Tokens**: JWT com rotação automática
5. **Rate Limiting**: Por IP e por usuário
6. **CORS**: Configuração restritiva
7. **CSP**: Content Security Policy configurado

### LGPD Compliance
1. **Consentimento**: Registro de consentimento
2. **Portabilidade**: Exportação de dados
3. **Anonimização**: Remoção de dados pessoais
4. **Logs**: Auditoria de acessos
5. **Backup**: Política de retenção

## Infraestrutura

### Desenvolvimento Local
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pytake
      POSTGRES_USER: pytake
      POSTGRES_PASSWORD: pytake_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: ./backend
      dockerfile: ../docker/backend.Dockerfile
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://pytake:pytake_dev@postgres/pytake
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/frontend.Dockerfile
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:8080
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

### Produção (Kubernetes)
- **Cluster**: EKS, GKE ou AKS
- **Ingress**: NGINX com cert-manager
- **Secrets**: Kubernetes Secrets ou Vault
- **Monitoring**: Prometheus + Grafana
- **Logging**: Loki ou ELK Stack

## Performance

### Metas de Performance
- **Latência API**: < 100ms (p95)
- **Latência WebSocket**: < 50ms
- **Throughput**: 1000 req/s
- **Concurrent Users**: 10,000+
- **Message Processing**: < 500ms

### Otimizações Necessárias
1. **Database**: Índices apropriados e query optimization
2. **Caching**: Redis para sessões e dados frequentes
3. **CDN**: Assets estáticos via CloudFlare
4. **Compression**: Gzip/Brotli para responses
5. **Connection Pooling**: Database e Redis