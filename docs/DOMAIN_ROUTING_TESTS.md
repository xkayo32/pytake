# 🔗 Domain Routing Tests - Guia Completo

**Autor:** Kayo Carvalho Fernandes  
**Data:** 2025-11-18  
**Versão:** 1.0

---

## 📋 Resumo

Sistema automatizado de testes para validar rotas de domínios em **produção, staging e desenvolvimento**.

✅ **6 domínios testados** (3 ambientes × 2 tipos: frontend + API)  
✅ **20+ endpoints críticos** verificados  
✅ **3 formatos de teste**: Shell script, Python/pytest, GitHub Actions  
✅ **Rodar localmente** ou via **CI/CD**

---

## 🚀 Começar Rápido

### Opção 1: Rodar Script Shell (Rápido)

```bash
# Rodar testes de domínio
bash scripts/test-domains-routing.sh

# Exemplo de output:
# ✅ 18/18 testes passaram (100%)
```

### Opção 2: Rodar Pytest (Completo)

```bash
# Instalar dependências
pip install httpx pytest pytest-asyncio

# Rodar todos os ambientes
pytest backend/tests/test_domain_routing.py -v

# Rodar apenas prod
pytest backend/tests/test_domain_routing.py -v -k prod

# Com relatório HTML
pytest backend/tests/test_domain_routing.py -v --html=report.html
```

### Opção 3: GitHub Actions (Automático)

Já configurado! Roda:
- ✅ **Diariamente** (a cada 6 horas)
- ✅ **Em cada push** para main/develop
- ✅ **Manualmente** (Actions → Test Domain Routing → Run workflow)

---

## 🧪 O Que é Testado?

### Frontend Routes (por ambiente)

| Rota | Teste | Esperado |
|------|-------|----------|
| `/login` | Acessibilidade | HTTP 200 |
| `/register` | Acessibilidade | HTTP 200 |
| `/admin` | Proteção | 301/302 ou 401 |
| `/agent` | Proteção | 301/302 ou 401 |
| `/` | Home | HTTP 200 |

**Ambientes:**
- `app.pytake.net` (prod)
- `app-staging.pytake.net` (staging)
- `app-dev.pytake.net` (dev)

### API Routes (por ambiente)

| Endpoint | Teste | Esperado |
|----------|-------|----------|
| `/api/v1/health` | Status | HTTP 200 + "ok" |
| `/api/v1/docs` | Swagger | HTTP 200 |
| `/api/v1/openapi.json` | Schema | HTTP 200 |
| `/api/v1/auth/login` | Responde | HTTP 422 |
| `/api/v1/nonexistent` | 404 | HTTP 404 |

**Ambientes:**
- `api.pytake.net` (prod)
- `api-staging.pytake.net` (staging)
- `api-dev.pytake.net` (dev)

### SSL/TLS & Security

✅ Certificados válidos em todos os domínios  
✅ HTTPS forçado  
✅ Headers de segurança (HSTS, CSP, etc)  
✅ CORS configurado  
✅ Content-Type correto

---

## 📊 Scripts Disponíveis

### 1. Shell Script (`scripts/test-domains-routing.sh`)

**O que faz:**
- Testa conectividade básica (ping, DNS)
- Valida 20+ endpoints
- Verifica certificados SSL
- Gera log detalhado

**Como usar:**

```bash
# Básico
bash scripts/test-domains-routing.sh

# Com output em arquivo
bash scripts/test-domains-routing.sh > results.txt 2>&1

# Em background
bash scripts/test-domains-routing.sh &
```

**Output esperado:**

```
╔════════════════════════════════════════════════════════════════╗
║  🔗 Domain Routing Tests - Multi-Environment                   ║
╚════════════════════════════════════════════════════════════════╝

━━ Pre-flight Checks ━━
  ► Checking internet connectivity...            ✓ PASS
  ► Checking DNS resolution...                   ✓ PASS

━━ Frontend Routes (prod) ━━
  ► Login page accessible                        ✓ PASS (HTTP 200)
  ► Register page                                ✓ PASS (HTTP 200)
  ...

📊 Test Summary
  Total Tests: 60
  Passed: 58
  Failed: 2
  Pass Rate: 96%
```

### 2. Python/Pytest (`backend/tests/test_domain_routing.py`)

**Recursos:**
- Parametrização de ambientes
- Fixtures reutilizáveis
- Tipos de teste: status code, conteúdo, headers
- Relatórios JSON e HTML

**Como usar:**

```bash
# Todos os testes
pytest backend/tests/test_domain_routing.py -v

# Ambiente específico
pytest backend/tests/test_domain_routing.py -v -k "prod"
pytest backend/tests/test_domain_routing.py -v -k "staging"
pytest backend/tests/test_domain_routing.py -v -k "dev"

# Classe específica
pytest backend/tests/test_domain_routing.py::TestFrontendRouting -v
pytest backend/tests/test_domain_routing.py::TestAPIRouting -v

# Com relatório
pytest backend/tests/test_domain_routing.py -v --html=report.html --self-contained-html

# Com timeout
pytest backend/tests/test_domain_routing.py -v --timeout=30

# Verbose com stack trace
pytest backend/tests/test_domain_routing.py -vv --tb=long
```

**Classes de Teste:**

```python
TestFrontendRouting       # Testa /login, /admin, /agent, etc
TestAPIRouting           # Testa /api/v1/health, /docs, etc
TestSSLCertificates      # Valida certificados HTTPS
TestResponseHeaders      # Verifica headers de segurança
TestEnvironmentConsistency # Compara ambientes
```

### 3. GitHub Actions (`.github/workflows/test-domain-routing.yml`)

**Triggers:**
- ⏰ Schedule: a cada 6 horas
- 📨 Push: em main/develop
- 🖱️ Manual: Actions → Run workflow
- 🔧 Customizável: escolher ambiente (prod/staging/dev)

**Features:**
- Roda em paralelo (prod, staging, dev)
- Uploa artifacts (relatórios)
- Comenta em PRs
- Notifica Slack (se erro)

---

## 🔧 Integração CI/CD

### GitHub Actions - Configuração

Já está ativo em `.github/workflows/test-domain-routing.yml`

**Status no repo:**
```
✅ Workflow criado
✅ Agendado para rodar 4x por dia
✅ Roda em qualquer push para main/develop
✅ Suporta execução manual
```

**Ver resultados:**
1. Ir para: https://github.com/xkayo32/pytake/actions
2. Filtrar: "Domain Routing Tests"
3. Clicar no workflow para ver detalhes

### Notificações Slack (Opcional)

Se configurado (veja Secrets abaixo):
- ✅ Notifica em canal Slack se testes falharem
- ✅ Comenta em PRs com resultado dos testes

---

## 🔐 Configuração de Secrets (CI/CD)

Para notificações no Slack, adicione em GitHub Settings:

```bash
# Terminal (opcional, para adicionar via GitHub CLI)
gh secret set SLACK_WEBHOOK_URL -b "https://hooks.slack.com/services/..."
```

**Sem configurar:** Os testes rodam normalmente, apenas sem notificação Slack.

---

## 📈 Interpretar Resultados

### Status de Teste

| Status | Significado | Ação |
|--------|------------|------|
| ✅ PASS | Endpoint respondeu corretamente | Nenhuma |
| ❌ FAIL | Endpoint não respondeu esperado | Investigar |
| ⚠️ WARNING | Teste informativo (não crítico) | Verificar logs |

### Pass Rate

- **100% (18/18)**: Perfeito ✅
- **>90% (16+/18)**: Aceitável (monitorar)
- **<90%**: Crítico (investigar imediatamente)

### Exemplo de Falha

```
FAIL: API health endpoint (prod)
  URL: https://api.pytake.net/api/v1/health
  Expected: HTTP 200
  Got: HTTP 503 (Service Unavailable)
  
Action: Verificar saúde dos containers
  $ podman compose ps
  $ podman compose logs backend
```

---

## 🐛 Troubleshooting

### Problema: Testes falham com "Connection refused"

**Causa:** Containers ou domínios não acessíveis

**Solução:**
```bash
# Verificar DNS
nslookup app.pytake.net
nslookup api.pytake.net

# Verificar containers locais
podman ps | grep pytake

# Verificar logs
podman compose logs -f
```

### Problema: "SSL Certificate Verification Failed"

**Causa:** Certificado inválido ou expirado

**Solução:**
```bash
# Verificar certificado
openssl s_client -connect api.pytake.net:443 -servername api.pytake.net

# Renovar via Certbot
podman exec pytake-certbot certbot renew

# Ver status
certbot certificates
```

### Problema: Testes lentos ou timeout

**Causa:** Rede lenta ou servidor sobrecarregado

**Solução:**
```bash
# Aumentar timeout
bash scripts/test-domains-routing.sh  # Padrão: 10s
pytest backend/tests/test_domain_routing.py --timeout=60  # 60s
```

### Problema: GitHub Actions falha com "404 Not Found"

**Causa:** Workflow file incorreto ou branch protegida

**Solução:**
```bash
# Validar YAML
yamllint .github/workflows/test-domain-routing.yml

# Verificar permissões do workflow
# Settings → Actions → Workflow permissions → ✅ Read and write
```

---

## 📚 Exemplos de Uso

### Exemplo 1: Teste Manual Antes de Deploy

```bash
# Terminal local
bash scripts/test-domains-routing.sh

# Se tudo passar ✅
# → Seguro para fazer push para main

# Se algo falhar ❌
# → Investigar antes de merge
```

### Exemplo 2: Monitoramento Contínuo

```bash
# Cron job (executar a cada hora)
0 * * * * bash /home/administrator/pytake/scripts/test-domains-routing.sh >> /var/log/pytake-tests.log 2>&1
```

### Exemplo 3: Teste em Pull Request

```bash
# GitHub Actions executará automaticamente
# Resultado aparecerá como comentário no PR
# ✅ PASS / ❌ FAIL com detalhes
```

### Exemplo 4: Teste de Ambiente Específico

```bash
# Apenas produção
TEST_ENV=prod pytest backend/tests/test_domain_routing.py::TestAPIRouting::test_health_endpoint -v

# Apenas staging
pytest backend/tests/test_domain_routing.py -v -k staging
```

---

## 🎯 Próximos Passos (Roadmap)

### Fase 1: Agora ✅
- [x] Testes básicos de rota e health check
- [x] Validação SSL/TLS
- [x] Headers de segurança
- [x] CI/CD integration

### Fase 2: Próximas Semanas
- [ ] Testes de performance (response time)
- [ ] Alertas em Slack/Email se Pass Rate < 90%
- [ ] Dashboard de resultados históricos
- [ ] Testes de carga (load testing)

### Fase 3: Futuro
- [ ] Testes de funcionalidade completa (login, criar chatbot, etc)
- [ ] Teste de failover entre ambientes
- [ ] Teste de rate limiting
- [ ] Teste de autoscaling

---

## 📞 Suporte

Se um teste falhar:

1. **Verificar logs:** `cat /tmp/domain-routing-tests-*.log`
2. **Rerun manualmente:** `bash scripts/test-domains-routing.sh`
3. **Ver detalhes no GitHub:** Actions → workflow → logs
4. **Contatar:** Verificar status dos containers com `podman compose ps`

---

## 📋 Checklist de Implementação

- [x] Shell script criado (`scripts/test-domains-routing.sh`)
- [x] Python tests criados (`backend/tests/test_domain_routing.py`)
- [x] GitHub Actions workflow criado (`.github/workflows/test-domain-routing.yml`)
- [x] Documentação completa (este arquivo)
- [x] Exemplos de uso
- [x] Troubleshooting guide

---

**Status:** ✅ **Pronto para usar**

**Próximo:** Rodar testes e integrar no fluxo de desenvolvimento!

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 2025-11-18  
**Versão:** 1.0
