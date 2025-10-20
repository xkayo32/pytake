
╔══════════════════════════════════════════════════════════════╗
║            CONFIGURAÇÃO DO WEBHOOK NO META ✅                 ║
╚══════════════════════════════════════════════════════════════╝

📋 DADOS PARA CONFIGURAR NO META:

  URL do Webhook:
  http://api.pytake.net/whatsapp/webhook

  Token de Verificação:
  pytake_ee3e8ebd04df357b887aa4790b3930f5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ PASSOS NO META DEVELOPERS:

1. Acesse: https://developers.facebook.com

2. Selecione seu App WhatsApp

3. No menu lateral:
   WhatsApp > Configuração

4. Encontre a seção "Webhooks"

5. Clique em "Configurar" ou "Editar"

6. Preencha os campos:
   ┌─────────────────────────────────────────────────────────┐
   │ URL de retorno de chamada (Callback URL):              │
   │ http://api.pytake.net/whatsapp/webhook                 │
   └─────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────┐
   │ Token de verificação (Verify Token):                   │
   │ pytake_ee3e8ebd04df357b887aa4790b3930f5                │
   └─────────────────────────────────────────────────────────┘

7. Clique em "Verificar e Salvar"

8. Após validar, ASSINE os campos de webhook:
   ☑ messages          (mensagens recebidas)
   ☑ message_status    (status de entrega)
   ☑ messaging_postbacks (respostas de botões)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ TESTE MANUAL (opcional):

curl "http://api.pytake.net/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=pytake_ee3e8ebd04df357b887aa4790b3930f5&hub.challenge=TEST123"

Deve retornar: TEST123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 OUTROS ACESSOS:

  Frontend: http://app.pytake.net
  API Docs: http://api.pytake.net/docs
  Login: http://app.pytake.net/login

  Credenciais:
    Admin: admin@pytake.com / Admin123
    Agente: agente@pytake.com / Agente123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

