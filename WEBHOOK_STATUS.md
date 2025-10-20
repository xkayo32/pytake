# Status da Configuração do Webhook WhatsApp

**Data:** 20/10/2025
**Última atualização:** Configuração do app.pytake.net para aceitar rotas /api

---

## ✅ Configurações Concluídas

### 1. Nginx Configurado para app.pytake.net e api.pytake.net

**Subdomínios Configurados:**
- **app.pytake.net** → Frontend + API (webhook)
- **api.pytake.net** → API apenas

**Rotas Configuradas em app.pytake.net:**
```
http://app.pytake.net/              → Frontend (Next.js)
http://app.pytake.net/api/v1/...    → Backend API (FastAPI)
```

### 2. Webhook Funcionando via HTTP

**URL do Webhook:** `http://app.pytake.net/api/v1/whatsapp/webhook`

**Token de Verificação:** `pytake_ee3e8ebd04df357b887aa4790b3930f5`

**Número WhatsApp:** +5561981287787

**Teste Local Realizado:**
```bash
curl "http://app.pytake.net/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=pytake_ee3e8ebd04df357b887aa4790b3930f5&hub.challenge=TEST"
# Resposta: TEST ✅
```

### 3. Usuários Criados

**Admin:**
- Email: admin@pytake.com
- Senha: Admin123
- Role: org_admin
- Acesso: http://app.pytake.net/admin

**Agente:**
- Email: agente@pytake.com
- Senha: Agente123
- Role: agent
- Acesso: http://app.pytake.net/agent

---

## ⚠️ Configurações Pendentes

### HTTPS / SSL

**Status:** ❌ NÃO CONFIGURADO

**Situação Atual:**
- Porta 443 exposta mas sem certificados SSL
- Nginx tem configuração HTTPS comentada
- Certbot instalado mas não inicializado

**Por que é importante:**
- Meta WhatsApp Cloud API **requer HTTPS** para webhooks em produção
- URL gerada pelo sistema: `https://app.pytake.net/api/v1/whatsapp/webhook`
- Conexões HTTP podem funcionar em testes mas não em produção

**Como Configurar SSL:**

#### Opção 1: Let's Encrypt (Recomendado - Grátis)

```bash
cd /home/administrator/pytake

# 1. Editar setup-ssl.sh e configurar domínios e email
nano setup-ssl.sh

# 2. Executar script de configuração SSL
chmod +x setup-ssl.sh
./setup-ssl.sh

# 3. Descomentar bloco HTTPS no nginx.conf
nano nginx.conf
# (Procure por "# HTTPS Server for pytake.net" e descomente)

# 4. Reiniciar Nginx
podman restart pytake-nginx
```

#### Opção 2: Cloudflare (SSL Termination na CDN)

Se você está usando Cloudflare (hcdn):
1. Ative SSL/TLS no painel Cloudflare
2. Configure SSL mode para "Full" ou "Full (strict)"
3. O Cloudflare fará terminação SSL
4. Webhook HTTPS funcionará automaticamente

**Verificar se Cloudflare está ativo:**
```bash
nslookup app.pytake.net
# Se retornar IP do Cloudflare/CDN, SSL pode já estar sendo tratado lá
```

---

## 📋 Configuração no Meta Developers

### URL do Webhook para Configurar

**Para Produção (HTTPS):**
```
https://app.pytake.net/api/v1/whatsapp/webhook
```

**Para Testes (HTTP - pode não funcionar):**
```
http://app.pytake.net/api/v1/whatsapp/webhook
```

### Token de Verificação
```
pytake_ee3e8ebd04df357b887aa4790b3930f5
```

### Passos no Meta

1. Acesse: https://developers.facebook.com
2. Selecione seu App WhatsApp
3. Menu: **WhatsApp** > **Configuração**
4. Seção **Webhooks** > Clique em **Configurar**
5. Preencha:
   - **URL de retorno de chamada:** `https://app.pytake.net/api/v1/whatsapp/webhook`
   - **Token de verificação:** `pytake_ee3e8ebd04df357b887aa4790b3930f5`
6. Clique em **Verificar e Salvar**

### Eventos para Assinar

Após verificar, marque estes eventos:
- ✅ `messages` - Mensagens recebidas
- ✅ `message_status` - Status de entrega
- ✅ `messaging_postbacks` - Respostas de botões

---

## 🔍 Troubleshooting

### Erro: "Não foi possível validar a URL de callback ou o token de verificação"

**Possíveis Causas:**

1. **SSL não configurado (mais provável)**
   - Meta exige HTTPS em produção
   - Solução: Configure SSL (veja seção acima)

2. **Token incorreto**
   - Verifique se copiou exatamente: `pytake_ee3e8ebd04df357b887aa4790b3930f5`
   - Token é case-sensitive

3. **Webhook não está acessível publicamente**
   - Teste de fora do servidor: `curl https://app.pytake.net/api/v1/whatsapp/webhook`
   - Verifique firewall/DNS

4. **Cloudflare/CDN bloqueando**
   - Verifique se WAF está bloqueando requisições do Meta
   - Whitelist IPs do Meta se necessário

### Verificar se HTTPS está funcionando

**Do servidor:**
```bash
curl -I https://app.pytake.net/api/v1/health
```

**De outro computador/rede:**
Acesse no navegador: https://app.pytake.net/api/v1/health

Se retornar erro de SSL, o certificado não está configurado.

### Logs do Nginx

```bash
# Ver logs em tempo real
podman logs pytake-nginx -f

# Ver últimas 50 linhas
podman logs pytake-nginx --tail 50

# Filtrar por webhook
podman logs pytake-nginx | grep webhook
```

### Logs do Backend

```bash
# Ver logs do FastAPI
podman logs pytake-backend -f

# Filtrar requisições do webhook
podman logs pytake-backend | grep -i "GET /api/v1/whatsapp/webhook"
```

---

## 📝 Próximos Passos

1. **[URGENTE] Configurar SSL/HTTPS**
   - Escolher entre Let's Encrypt ou Cloudflare
   - Obter certificado SSL
   - Ativar HTTPS no Nginx

2. **Testar Webhook com HTTPS**
   - Após SSL configurado, testar: `curl -I https://app.pytake.net/api/v1/whatsapp/webhook`
   - Deve retornar 200 OK

3. **Configurar no Meta**
   - Usar URL HTTPS no Meta Developers
   - Verificar e salvar webhook

4. **Testar Recebimento de Mensagens**
   - Enviar mensagem de teste pelo WhatsApp
   - Verificar logs: `podman logs pytake-backend -f`
   - Confirmar que mensagem foi recebida

---

## 📚 Documentação Relacionada

- `WEBHOOK_WHATSAPP.md` - Guia completo de configuração
- `SSL_SETUP.md` - Instruções detalhadas para SSL
- `setup-ssl.sh` - Script de configuração Let's Encrypt
- `nginx.conf` - Configuração do Nginx (descomentar bloco HTTPS)

---

**Atualizado em:** 20/10/2025 às 15:45 BRT
**Status Geral:** HTTP funcionando ✅ | HTTPS pendente ⚠️
