# 🎨 PyTake Frontend

Interface moderna e intuitiva para a plataforma de automação WhatsApp Business PyTake.

## ✨ Características

- 🎨 **Design System Customizado** - 60+ ícones SVG únicos
- 🌙 **Tema Claro/Escuro** - Alternância suave com detecção automática
- 💬 **Workspace do Agente** - Chat em tempo real com WebSocket
- 📊 **Dashboard Rico** - Métricas e gráficos interativos
- 📢 **Gerenciador de Campanhas** - Wizard intuitivo de criação
- 🔄 **Flow Builder Visual** - Drag-and-drop para automações
- ⚙️ **Painel Admin** - Gestão completa de usuários e permissões
- 🔔 **Notificações Real-time** - Toast, desktop e sons
- 📱 **100% Responsivo** - Mobile, tablet e desktop

## 🚀 Instalação Rápida

### Método 1: Script Automático (Recomendado)
```bash
./start-frontend.sh
```

### Método 2: Manual
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## 📦 Requisitos

- Node.js 18+ 
- NPM 8+
- Backend PyTake rodando em http://localhost:8080

## 🏗️ Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   ├── pages/          # Páginas principais
│   ├── services/       # Integrações API/WebSocket
│   ├── stores/         # Estado global (Zustand)
│   ├── types/          # TypeScript types
│   ├── utils/          # Funções utilitárias
│   └── styles/         # CSS global
├── public/             # Assets públicos
└── package.json        # Dependências
```

## 📱 Módulos Principais

### 1. **Workspace do Agente** (`/agent`)
- Lista de conversas em tempo real
- Chat com indicadores de status
- Quick replies e templates
- Informações do cliente
- Transferência entre agentes

### 2. **Dashboard** (`/dashboard`)
- Métricas principais (KPIs)
- Gráficos de performance
- Feed de atividades
- Quick actions

### 3. **Campanhas** (`/campaigns`)
- Lista de campanhas com filtros
- Wizard de criação (5 passos)
- Analytics detalhado
- A/B testing

### 4. **Flow Builder** (`/flows`)
- Canvas drag-and-drop
- 9 tipos de nodes
- Templates prontos
- Test mode

### 5. **Configurações** (`/settings`)
- Gestão de usuários
- Permissões editáveis
- Config WhatsApp
- Billing & Usage

## 🔐 Autenticação

### Login Padrão
```
Email: admin@pytake.com
Senha: admin123
```

### Níveis de Acesso
- **Owner**: Acesso total
- **Admin**: Gerenciamento completo
- **Manager**: Gerenciamento de equipe
- **Agent**: Atendimento
- **ReadOnly**: Apenas visualização

## 🛠️ Comandos Disponíveis

```bash
# Desenvolvimento
npm run dev         # Servidor de desenvolvimento

# Build
npm run build       # Build para produção
npm run preview     # Preview do build

# Qualidade
npm run lint        # Verificar código
npm run format      # Formatar código
npm run type-check  # Verificar tipos
```

## 🎨 Customização

### Tema
Edite as cores em `tailwind.config.js`:
```javascript
colors: {
  primary: {
    500: '#3b82f6',  // Azul padrão
    // ...
  }
}
```

### Logo
Substitua o logo em `src/components/icons/PyTakeLogo.tsx`

### Idioma
Por padrão em Português BR. Para adicionar idiomas, implemente i18n.

## 🔌 Integração com Backend

### Configuração da API
Edite `src/services/api.ts`:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
```

### WebSocket
Edite `src/services/websocket.ts`:
```typescript
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
```

## 📊 Performance

- **First Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: 95+
- **Bundle Size**: ~300KB gzipped

## 🐛 Troubleshooting

### Erro: "Cannot connect to backend"
```bash
# Verifique se o backend está rodando
curl http://localhost:8080/health

# Se não, inicie o backend
cd ../backend/simple_api
cargo run
```

### Erro: "Port 5174 already in use"
```bash
# Mude a porta no vite.config.ts
server: {
  port: 5175  // Nova porta
}
```

### Erro: "Module not found"
```bash
# Limpe o cache e reinstale
rm -rf node_modules package-lock.json
npm install
```

## 🚀 Deploy para Produção

### 1. Build
```bash
npm run build
```

### 2. Servir com Nginx
```nginx
server {
    listen 80;
    server_name app.pytake.com;
    root /var/www/pytake/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:8080;
    }
    
    location /ws {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 3. Docker
```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📝 Licença

MIT License - veja LICENSE para detalhes.

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

- **Email**: suporte@pytake.com
- **Discord**: discord.gg/pytake
- **Docs**: docs.pytake.com

---

Desenvolvido com ❤️ usando React + TypeScript + TailwindCSS