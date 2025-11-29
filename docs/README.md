# 📚 Documentação - PyTake

Índice de toda documentação do projeto.

## 🚀 Início Rápido

1. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Guia completo de deployment
   - Setup inicial dos ambientes
   - Iniciar/parar containers
   - Executar migrations
   - Verificar saúde dos ambientes

2. **[NGINX_CONFIGURATION_GUIDE.md](./NGINX_CONFIGURATION_GUIDE.md)** - Configuração do Nginx
   - Setup de SSL/TLS
   - Rotear domínios para portas
   - Monitoramento de logs
   - Troubleshooting

## 📋 Documentação de Projeto

### Análise & Planejamento
- **CI_CD_ANALYSIS.md** - Análise de CI/CD e workflows
- **FLOW_AUTOMATION_ANALYSIS.md** - Análise do sistema de Flow Automation
- **DOCUMENTATION_INDEX.md** - Índice anterior de documentação

### Implementação
- **FLOW_AUTOMATION_IMPLEMENTATION.md** - Detalhes de implementação
- **FLOW_AUTOMATION_COMPLETE.md** - Status de conclusão do Flow Automation
- **FLOW_AUTOMATION_QUICKSTART.md** - Guia rápido de Flow Automation
- **FRONTEND_COMPLETE.md** - Status de conclusão do Frontend
- **FRONTEND_STATUS.md** - Detalhes de status do Frontend
- **IMPLEMENTATION_SUMMARY.md** - Resumo geral de implementação

### Status & Checkpoints
- **PROJECT_COMPLETE.md** - Status geral do projeto
- **PHASE3_COMPLETE.md** - Conclusão da Fase 3
- **PRODUCTION_DEPLOYMENT.md** - Guia de deployment em produção
- **SYSTEM_STATUS.md** - Status do sistema
- **DEPLOYMENT_CHECKLIST.md** - Checklist de deployment

## 🔑 Arquivos de Configuração

### Ambientes (em `../environments/`)

```
environments/
├── production/
│   ├── docker-compose.yml  - Config produção (porta 8000)
│   ├── .env-example        - Template de variáveis
│   └── .env.production     - Valores de produção (não commitar)
├── staging/
│   ├── docker-compose.yml  - Config staging (porta 8001)
│   ├── .env-example        - Template de variáveis
│   └── .env.staging        - Valores de staging (não commitar)
└── development/
    ├── docker-compose.yml  - Config desenvolvimento (porta 8002)
    ├── .env-example        - Template de variáveis
    └── .env.development    - Valores de dev (não commitar)
```

### Nginx (em `../nginx/`)

```
nginx/
├── nginx.conf     - Configuração completa de routing
├── conf.d/        - Configurações adicionais (opcional)
└── ssl/           - Certificados SSL (gerenciado por Let's Encrypt)
```

## ⚙️ Estrutura de Ambientes

### Production
- Backend: `localhost:8000` (via Nginx: `https://api.pytake.net`)
- Frontend: `localhost:3000` (via Nginx: `https://pytake.net`)
- Database: `postgresql://localhost:5432/pytake_prod`
- Cache: `redis://localhost:6379/0`
- `DEBUG=false`

### Staging
- Backend: `localhost:8001` (via Nginx: `https://staging-api.pytake.net`)
- Frontend: `localhost:3001` (via Nginx: `https://staging.pytake.net`)
- Database: `postgresql://localhost:5433/pytake_staging`
- Cache: `redis://localhost:6380/0`
- `DEBUG=true`

### Development
- Backend: `localhost:8002`
- Frontend: `localhost:3002`
- Database: `postgresql://localhost:5434/pytake_dev`
- Cache: `redis://localhost:6381/0`
- `DEBUG=true`

## 🔐 Secrets & Environments

Veja `.github/docs/SECRETS_AND_ENVIRONMENTS/README.md` para:
- Como configurar GitHub Secrets
- Mapeamento de secrets por ambiente
- Variáveis críticas vs públicas
- Análise de segurança completa

## 🚀 Comandos Rápidos

```bash
# Setup inicial
mkdir -p /home/pytake/{production,staging,development}
cd /home/administrator/pytake

# Build imagens
podman build -t pytake_backend:latest backend/

# Subir production
cd environments/production
export $(cat .env.production | xargs)
podman-compose up -d

# Ver logs
podman-compose logs -f backend

# Parar tudo
for env in production staging development; do
  cd /home/administrator/pytake/environments/$env
  podman-compose down
done

# Nginx reload
sudo systemctl reload nginx
```

## 📊 Verificação de Saúde

```bash
# Production
curl https://api.pytake.net/api/v1/docs

# Staging
curl https://staging-api.pytake.net/api/v1/docs

# Development (local)
curl http://localhost:8002/api/v1/docs
```

## 🔄 CI/CD

GitHub Actions workflows (`.github/workflows/`):
- `test.yml` - Testes críticos (migrations, imports, build)
- `build.yml` - Build de imagens Docker
- Workflows removidos: `lint.yml`, `type-check.yml`

Deploy automático:
- `main` → Production (porta 8000)
- `develop` → Staging (porta 8001)
- `feature/*` → Development (porta 8002)

## 🆘 Troubleshooting

**Ver logs detalhados:** `./DEPLOYMENT_GUIDE.md#troubleshooting`
**Nginx issues:** `./NGINX_CONFIGURATION_GUIDE.md#troubleshooting`

---

**Última atualização:** 18/11/2025 | **Versão:** 1.0.0
