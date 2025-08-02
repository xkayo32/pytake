// Teste simulado do webhook do WhatsApp
const axios = require('axios');

async function testWebhook() {
  const baseUrl = 'http://localhost:8080/api/v1/whatsapp/webhook';
  
  console.log('🧪 Testando Webhook do WhatsApp...\n');
  
  // 1. Teste de verificação
  console.log('1️⃣ Testando verificação do webhook...');
  try {
    const verifyResponse = await axios.get(`${baseUrl}?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=verify_token_123`);
    console.log('✅ Verificação bem-sucedida:', verifyResponse.data);
  } catch (error) {
    console.log('❌ Erro na verificação:', error.message);
  }
  
  // 2. Teste de mensagem recebida
  console.log('\n2️⃣ Testando recebimento de mensagem...');
  const messagePayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15550559999",
                phone_number_id: "123456789"
              },
              messages: [
                {
                  from: "5511999999999",
                  id: "wamid.test123",
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: "text",
                  text: {
                    body: "Olá! Esta é uma mensagem de teste do webhook."
                  }
                }
              ]
            },
            field: "messages"
          }
        ]
      }
    ]
  };
  
  try {
    const messageResponse = await axios.post(baseUrl, messagePayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Mensagem processada:', messageResponse.data);
  } catch (error) {
    console.log('❌ Erro ao processar mensagem:', error.message);
  }
  
  // 3. Teste de status de entrega
  console.log('\n3️⃣ Testando status de entrega...');
  const statusPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15550559999",
                phone_number_id: "123456789"
              },
              statuses: [
                {
                  id: "wamid.test123",
                  recipient_id: "5511999999999",
                  status: "delivered",
                  timestamp: Math.floor(Date.now() / 1000).toString()
                }
              ]
            },
            field: "messages"
          }
        ]
      }
    ]
  };
  
  try {
    const statusResponse = await axios.post(baseUrl, statusPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Status processado:', statusResponse.data);
  } catch (error) {
    console.log('❌ Erro ao processar status:', error.message);
  }
  
  console.log('\n🎉 Teste concluído! Verifique os logs do servidor para ver as mensagens processadas.');
}

testWebhook().catch(console.error);