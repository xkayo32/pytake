# Guia para Obter Token de Acesso do WhatsApp Business API

## Problema Atual
O teste de conectividade está falhando com o erro:
```
"The access token could not be decrypted"
```

Isso indica que o token de acesso está inválido, expirado ou corrompido.

## Como Obter um Novo Token

### Método 1: Via Facebook Developers (Recomendado)

1. Acesse https://developers.facebook.com
2. Vá para seu App do WhatsApp Business
3. No menu lateral, clique em "WhatsApp" > "Configuração da API"
4. Na seção "Token de acesso temporário", clique em "Gerar token"
5. Copie o token gerado (começa com "EAA...")

### Método 2: Via Graph API Explorer

1. Acesse https://developers.facebook.com/tools/explorer/
2. Selecione seu App do WhatsApp Business
3. Adicione as permissões necessárias:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
4. Clique em "Generate Access Token"
5. Copie o token gerado

### Método 3: Token Permanente (Produção)

Para produção, você deve usar um token de sistema permanente:

1. No Facebook Developers, vá para "Configurações" > "Avançado"
2. Em "Tokens de acesso do sistema", clique em "Gerar token"
3. Selecione as permissões necessárias
4. Este token não expira, mas deve ser mantido seguro

## Atualizando o Token no PyTake

1. Acesse as configurações do WhatsApp no sistema
2. Clique em "Editar" na configuração existente
3. Cole o novo token no campo "Access Token"
4. Salve as alterações
5. Teste a conexão novamente

## Informações Importantes

### Formato do Token
- Deve começar com "EAA"
- Geralmente tem entre 100-200 caracteres
- Não deve conter espaços ou quebras de linha

### Validade
- Tokens temporários: 24 horas ou 60 dias
- Tokens de sistema: Não expiram
- Tokens de usuário: Dependem da configuração

### Permissões Necessárias
- `whatsapp_business_management`
- `whatsapp_business_messaging`
- `business_management` (opcional)

### Dados Necessários
Para configurar corretamente, você precisa:
1. **Phone Number ID**: ID do número do WhatsApp (ex: 574293335763643)
2. **Business Account ID**: ID da conta business (ex: 574293335763643)
3. **Access Token**: Token de acesso válido
4. **Webhook Verify Token**: Token personalizado para webhook (opcional)

## Verificando o Token

Você pode testar o token manualmente com curl:

```bash
curl -X GET "https://graph.facebook.com/v21.0/YOUR_PHONE_NUMBER_ID?fields=display_phone_number" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Se retornar o número, o token está funcionando.

## Troubleshooting

### Erro: "The access token could not be decrypted"
- Token está corrompido ou mal formatado
- Verifique se não há caracteres extras ou espaços

### Erro: "Invalid OAuth access token"
- Token expirou
- Gere um novo token

### Erro: "Insufficient permission to access this resource"
- Token não tem as permissões necessárias
- Regenere com as permissões corretas

## Links Úteis

- [WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp)
- [Token de Acesso](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#access-tokens)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)