# 📱 Configuração do WhatsApp Business API

## ❌ Erro Atual
Você está recebendo o erro: **"Invalid OAuth access token - Cannot parse access token"**

Isso acontece porque você está usando credenciais de teste (`test_token`) ao invés de credenciais reais da Meta.

## ✅ Como Resolver

### Opção 1: Usar o Script de Atualização
```bash
cd /home/administrator/pytake-backend
./update-whatsapp-credentials.sh
```

### Opção 2: Atualizar pela Interface Web
1. Acesse http://localhost:3002
2. Faça login
3. Vá em **Configurações → WhatsApp**
4. Clique no botão **⚙️ Configurar** na sua configuração
5. Atualize os campos com as credenciais reais

### Opção 3: Atualizar Diretamente no Banco
```bash
docker exec -it pytake-postgres psql -U pytake_admin -d pytake_production

UPDATE whatsapp_configs 
SET 
    phone_number_id = 'SEU_PHONE_NUMBER_ID',
    access_token = 'SEU_ACCESS_TOKEN_REAL',
    business_account_id = 'SEU_BUSINESS_ACCOUNT_ID'
WHERE is_default = true;
```

## 🔑 Onde Obter as Credenciais

### 1. Acesse o Facebook Developer Console
- URL: https://developers.facebook.com
- Faça login com sua conta Business do Facebook

### 2. Crie um App WhatsApp (se ainda não tiver)
1. Clique em **"My Apps"** → **"Create App"**
2. Escolha **"Business"** como tipo
3. Dê um nome ao app (ex: "PyTake WhatsApp")
4. Adicione o produto **"WhatsApp"**

### 3. Obtenha as Credenciais
No painel do seu app:
1. Vá em **WhatsApp** → **API Setup** ou **Getting Started**
2. Você verá:
   - **Phone number ID**: `115873951399783` (exemplo)
   - **WhatsApp Business Account ID**: `123456789012345` (exemplo)
   - **Temporary access token**: `EAAPZBn5tF1L0BOZCkNEM...` (token longo)

### 4. Token Temporário vs Permanente

#### Token Temporário (24 horas) - Para Testes
- Disponível imediatamente no console
- Expira em 24 horas
- Bom para desenvolvimento e testes

#### Token Permanente - Para Produção
1. Vá em **Business Settings** → **System Users**
2. Crie um System User
3. Gere um token com permissões:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`

## 📋 Checklist de Configuração

- [ ] Conta Facebook Business verificada
- [ ] App criado no Facebook Developer
- [ ] Produto WhatsApp adicionado ao app
- [ ] Phone Number ID obtido
- [ ] Access Token obtido
- [ ] Webhook configurado (opcional para receber mensagens)

## 🧪 Testando a Configuração

Após atualizar as credenciais:

1. Na interface do PyTake, clique em **"Testar Conexão"**
2. Se tudo estiver correto, você verá: **"✅ Teste realizado com sucesso!"**
3. O sistema mostrará o número de telefone conectado

## 🚨 Problemas Comuns

### Erro: "Invalid OAuth access token"
- **Causa**: Token expirado ou inválido
- **Solução**: Gere um novo token no Facebook Developer Console

### Erro: "Unsupported get request"
- **Causa**: Phone Number ID incorreto
- **Solução**: Verifique se copiou o ID correto (não o número de telefone)

### Erro: "Permission denied"
- **Causa**: Token sem permissões adequadas
- **Solução**: Verifique as permissões do token ou use um System User

## 📞 Webhook (Para Receber Mensagens)

Para receber mensagens, configure o webhook:

1. No Facebook Developer Console
2. Vá em **WhatsApp** → **Configuration** → **Webhooks**
3. Configure:
   - **Callback URL**: `https://api.pytake.net/api/v1/whatsapp/webhook`
   - **Verify Token**: Use o token gerado pelo sistema
4. Inscreva-se nos campos:
   - `messages` - Para receber mensagens
   - `message_deliveries` - Para status de entrega
   - `message_reads` - Para confirmação de leitura

## 💡 Dicas

1. **Comece com o token temporário** para testar se tudo funciona
2. **Salve suas credenciais** em um local seguro
3. **Configure o webhook** apenas depois de testar o envio
4. **Use um System User** para produção (token não expira)

## 📚 Links Úteis

- [Facebook Developer Console](https://developers.facebook.com)
- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)
- [Criar Access Token Permanente](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#access-tokens)
- [Configurar Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)