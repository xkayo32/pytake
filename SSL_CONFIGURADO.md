# ✅ SSL/HTTPS Configurado com Sucesso

**Data:** 20/10/2025
**Certificados:** Let's Encrypt
**Validade:** 18/01/2026 (90 dias)
**Renovação:** Automática (a cada 12 horas)

---

## 🎉 Configuração Completa

### Certificados Obtidos

✅ **app.pytake.net**
- Certificado: `/etc/letsencrypt/live/app.pytake.net/fullchain.pem`
- Chave Privada: `/etc/letsencrypt/live/app.pytake.net/privkey.pem`
- Expira: 18/01/2026

✅ **api.pytake.net**
- Certificado: `/etc/letsencrypt/live/api.pytake.net/fullchain.pem`
- Chave Privada: `/etc/letsencrypt/live/api.pytake.net/privkey.pem`
- Expira: 18/01/2026

### Domínios HTTPS Funcionando

✅ **Frontend:** https://app.pytake.net
- Next.js 15 com App Router
- HTTP/2 ativo
- Redirect automático HTTP → HTTPS
- Security headers configurados

✅ **Backend API:** https://api.pytake.net
- FastAPI com async
- HTTP/2 ativo
- Redirect automático HTTP → HTTPS
- WebSocket support

✅ **Webhook WhatsApp:** https://app.pytake.net/api/v1/whatsapp/webhook
- HTTPS funcionando perfeitamente
- Testado com sucesso
- Token: `pytake_ee3e8ebd04df357b887aa4790b3930f5`
- Número: +5561981287787

---

## 🔐 Configurações de Segurança Aplicadas

### SSL/TLS
- **Protocolos:** TLSv1.2, TLSv1.3
- **Ciphers:** ECDHE-ECDSA-AES128-GCM-SHA256, ECDHE-RSA-AES128-GCM-SHA256, ECDHE-ECDSA-AES256-GCM-SHA384, ECDHE-RSA-AES256-GCM-SHA384
- **Session Cache:** Shared SSL (10m)
- **Session Timeout:** 10 minutos

### Security Headers
```nginx
Strict-Transport-Security: max-age=31536000
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
```

### Compressão
- Gzip ativado (nível 6)
- Tipos: text/plain, text/css, application/json, application/javascript, text/xml, application/xml

### HTTP/2
- Ativado em ambos os domínios
- Melhor performance e multiplexação

---

## 📋 Configurar Webhook no Meta

### Passo a Passo Completo

#### 1. Acessar Meta Developers
```
https://developers.facebook.com
```

#### 2. Selecionar seu App WhatsApp
- Localize o app que você criou para WhatsApp Business
- Clique para abrir

#### 3. Navegar até Configuração de Webhooks
- Menu lateral: **WhatsApp** > **Configuração**
- Role até a seção **Webhooks**
- Clique no botão **Configurar** ou **Editar**

#### 4. Preencher Dados do Webhook

**URL de retorno de chamada (Callback URL):**
```
https://app.pytake.net/api/v1/whatsapp/webhook
```

**Token de verificação (Verify Token):**
```
pytake_ee3e8ebd04df357b887aa4790b3930f5
```

**⚠️ IMPORTANTE:**
- Cole a URL exatamente como está acima
- Cole o token exatamente como está (case-sensitive)
- NÃO adicione espaços antes ou depois

#### 5. Verificar e Salvar
- Clique no botão **Verificar e Salvar**
- O Meta fará uma requisição GET para o webhook
- Se tudo estiver correto, verá: ✅ "Webhook verificado com sucesso"

#### 6. Assinar Eventos (Subscribe)

Após verificar, você precisa assinar os eventos que deseja receber:

**Eventos Obrigatórios:**
- ✅ `messages` - Mensagens recebidas dos usuários
- ✅ `message_status` - Status de entrega (enviado, entregue, lido)

**Eventos Opcionais (Recomendados):**
- ✅ `messaging_postbacks` - Respostas de botões interativos
- ✅ `messaging_optins` - Opt-ins de usuários
- ✅ `messaging_optouts` - Opt-outs de usuários

**Para Assinar:**
1. Na mesma página de Webhooks
2. Seção "Campos do webhook" (Webhook Fields)
3. Marque as caixas dos eventos desejados
4. Clique em **Salvar**

---

## ✅ Testar Webhook

### Teste 1: Verificação Manual

No terminal do servidor, execute:

```bash
curl "https://app.pytake.net/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=pytake_ee3e8ebd04df357b887aa4790b3930f5&hub.challenge=TESTE_MANUAL"
```

**Resultado Esperado:**
```
TESTE_MANUAL
```

Se retornar isso, o webhook está funcionando! ✅

### Teste 2: Enviar Mensagem de Teste

1. Abra o WhatsApp no seu celular
2. Envie uma mensagem para o número configurado: **+55 61 98128-7787**
3. No servidor, veja os logs:

```bash
# Ver logs do backend em tempo real
podman logs pytake-backend -f

# Filtrar apenas webhooks
podman logs pytake-backend --tail 100 | grep -i webhook
```

**Você deve ver algo como:**
```
INFO: Webhook recebido de +5561981287787
INFO: Mensagem: "Olá teste"
```

---

## 🔄 Renovação Automática de Certificados

### Status do Certbot

**Container:** pytake-certbot
**Status:** ✅ Rodando
**Frequência:** A cada 12 horas
**Próxima renovação:** Automática 30 dias antes da expiração

### Verificar Status

```bash
# Ver container Certbot
podman ps --filter name=certbot

# Ver logs de renovação
podman logs pytake-certbot --tail 50
```

### Forçar Renovação Manual (se necessário)

```bash
podman run --rm \
    -v ./certbot/www:/var/www/certbot:Z \
    -v ./certbot/conf:/etc/letsencrypt:Z \
    docker.io/certbot/certbot:latest \
    renew --force-renewal

# Reiniciar Nginx após renovação
podman restart pytake-nginx
```

---

## 🔍 Troubleshooting

### Erro: "Invalid verification token"

**Problema:** Token não confere com o banco de dados

**Solução:**
1. Verificar token no banco:
```bash
podman exec pytake-backend python -c "
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.whatsapp_number import WhatsAppNumber
from sqlalchemy import select

async def show_token():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(WhatsAppNumber).where(WhatsAppNumber.phone_number == '+5561981287787')
        )
        num = result.scalar_one_or_none()
        if num:
            print(f'Token correto: {num.webhook_verify_token}')
        else:
            print('Número não encontrado no banco')

asyncio.run(show_token())
"
```

2. Copiar o token exibido
3. Usar esse token no Meta

### Erro: "URL not reachable"

**Problema:** Meta não consegue acessar o webhook

**Soluções:**

1. **Verificar se HTTPS está funcionando:**
```bash
curl -I https://app.pytake.net/api/v1/whatsapp/webhook
```
Deve retornar HTTP/2 405 (método não permitido, mas URL acessível)

2. **Verificar Firewall:**
```bash
sudo firewall-cmd --list-all | grep 443
```
Porta 443 deve estar aberta

3. **Verificar DNS:**
```bash
nslookup app.pytake.net
```
Deve resolver para o IP público do servidor

4. **Testar de fora do servidor:**
Use um site como https://reqbin.com para fazer uma requisição GET:
```
https://app.pytake.net/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=pytake_ee3e8ebd04df357b887aa4790b3930f5&hub.challenge=TEST
```
Deve retornar: `TEST`

### Erro: SSL Certificate Invalid

**Problema:** Certificado não está sendo reconhecido

**Solução:**
```bash
# Verificar certificados
ls -la certbot/conf/live/app.pytake.net/

# Verificar configuração do Nginx
podman exec pytake-nginx nginx -t

# Ver logs do Nginx
podman logs pytake-nginx --tail 50
```

### Webhook não recebe mensagens

1. **Verificar eventos assinados no Meta**
   - Certifique-se de que `messages` está marcado

2. **Ver logs em tempo real**
```bash
podman logs pytake-backend -f
```

3. **Verificar se número está ativo**
```bash
podman exec pytake-backend python -c "
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.whatsapp_number import WhatsAppNumber
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(WhatsAppNumber))
        for num in result.scalars():
            print(f'Número: {num.phone_number}')
            print(f'Ativo: {num.is_active}')
            print(f'Tipo: {num.connection_type}')
            print('-' * 50)

asyncio.run(check())
"
```

---

## 📊 Status Final

| Item | Status | Detalhes |
|------|--------|----------|
| Certificado SSL app.pytake.net | ✅ Ativo | Válido até 18/01/2026 |
| Certificado SSL api.pytake.net | ✅ Ativo | Válido até 18/01/2026 |
| HTTPS app.pytake.net | ✅ Funcionando | HTTP/2 + Security Headers |
| HTTPS api.pytake.net | ✅ Funcionando | HTTP/2 + Security Headers |
| Webhook HTTPS | ✅ Testado | Retorna challenge corretamente |
| Redirect HTTP → HTTPS | ✅ Ativo | 301 Moved Permanently |
| Certbot Auto-Renewal | ✅ Rodando | A cada 12 horas |
| Nginx | ✅ Rodando | Configuração SSL aplicada |

---

## 🎯 Próximos Passos

### 1. Configurar Webhook no Meta (AGORA)
✅ Tudo pronto para configurar no Meta Developers
- URL: `https://app.pytake.net/api/v1/whatsapp/webhook`
- Token: `pytake_ee3e8ebd04df357b887aa4790b3930f5`

### 2. Testar Recebimento de Mensagens
- Enviar mensagem de teste via WhatsApp
- Verificar logs: `podman logs pytake-backend -f`

### 3. Atualizar Variáveis de Ambiente (Opcional)
Se necessário, atualize as URLs para HTTPS:

**Backend (.env.docker):**
```env
FRONTEND_URL=https://app.pytake.net
CORS_ORIGINS=https://app.pytake.net
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=https://api.pytake.net
```

### 4. Monitorar Renovação de Certificados
- Certificados expiram em 18/01/2026
- Certbot renovará automaticamente 30 dias antes
- Próxima renovação prevista: ~19/12/2025

---

## 📚 Documentos Relacionados

- `WEBHOOK_STATUS.md` - Status geral da configuração de webhooks
- `WEBHOOK_WHATSAPP.md` - Guia completo de configuração WhatsApp
- `nginx.conf` - Configuração do Nginx com SSL
- `compose.yaml` - Docker Compose com Certbot

---

## 🆘 Suporte

**Logs importantes:**
```bash
# Nginx
podman logs pytake-nginx -f

# Backend
podman logs pytake-backend -f

# Certbot
podman logs pytake-certbot -f

# Todos os serviços
podman-compose logs -f
```

**Reiniciar serviços:**
```bash
# Reiniciar Nginx
podman restart pytake-nginx

# Reiniciar Backend
podman restart pytake-backend

# Reiniciar todos
podman-compose restart
```

---

**✅ SSL/HTTPS Configurado com Sucesso!**
**📅 Atualizado em:** 20/10/2025 às 19:15 BRT
**🔐 Certificados válidos até:** 18/01/2026
