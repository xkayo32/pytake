# Fluxo de Aprovação de Templates WhatsApp

## Status dos Templates

### 1. DRAFT (Rascunho)
- Template criado localmente
- Não existe no Meta
- Pode ser editado livremente

### 2. PENDING (Pendente)
- Enviado para aprovação do Meta
- Aguardando revisão
- Não pode ser editado

### 3. APPROVED (Aprovado)
- Aprovado pelo Meta
- Pode ser usado para enviar mensagens
- Não pode ser editado (precisa criar nova versão)

### 4. REJECTED (Rejeitado)
- Rejeitado pelo Meta
- Contém motivo da rejeição
- Pode ser editado e reenviado

## API para Enviar Template ao Meta

```javascript
// Endpoint a implementar no backend
POST /api/v1/whatsapp/templates/submit/{templateId}

// Chamada ao Meta API
const submitToMeta = async (template) => {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${WHATSAPP_BUSINESS_ID}/message_templates`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: template.name,
        category: template.category,
        language: template.language,
        components: [
          {
            type: "HEADER",
            format: "TEXT",
            text: template.header_text
          },
          {
            type: "BODY",
            text: template.body_text,
            example: {
              body_text: [["João"]] // Exemplo para {{1}}
            }
          },
          {
            type: "FOOTER",
            text: template.footer_text
          }
        ]
      })
    }
  );
  
  return response.json();
}
```

## Implementação Necessária

### 1. Backend (mock-api/server.js)
```javascript
// Submeter template para aprovação
server.post('/api/v1/whatsapp/templates/submit/:id', async (req, res) => {
  const { id } = req.params;
  
  // 1. Buscar template do banco
  const template = await db.getTemplate(id);
  
  // 2. Enviar para Meta API (simulado no mock)
  // Em produção, fazer chamada real ao Meta
  
  // 3. Atualizar status para PENDING
  await db.updateTemplateStatus(id, 'PENDING');
  
  res.json({ 
    message: 'Template enviado para aprovação',
    status: 'PENDING' 
  });
});
```

### 2. Frontend - Adicionar botão de envio
```typescript
// No componente de template card
{template.status === 'DRAFT' && (
  <Button
    size="sm"
    variant="default"
    onClick={() => submitTemplate(template.id)}
    className="gap-2"
  >
    <Send className="h-3 w-3" />
    Enviar para Aprovação
  </Button>
)}
```

## Requisitos do Meta para Aprovação

1. **Nome único** - Não pode existir outro template com mesmo nome
2. **Variáveis com exemplos** - Cada {{1}}, {{2}} precisa de exemplo
3. **Categoria correta** - UTILITY, MARKETING, ou AUTHENTICATION
4. **Conteúdo apropriado** - Sem spam, conteúdo adulto, etc.
5. **Idioma válido** - Código de idioma suportado

## Tempo de Aprovação

- Normalmente: 1-24 horas
- Pode demorar mais em períodos de alta demanda
- Rejeições vêm com motivo específico

## Webhook para Atualização de Status

Configure webhook para receber atualizações:
```javascript
// Webhook endpoint
POST /api/v1/whatsapp/webhook

// Payload do Meta quando template é aprovado/rejeitado
{
  "entry": [{
    "changes": [{
      "field": "message_template_status_update",
      "value": {
        "event": "APPROVED", // ou "REJECTED"
        "message_template_id": "123456",
        "message_template_name": "boas_vindas",
        "message_template_language": "pt_BR",
        "reason": null // ou motivo da rejeição
      }
    }]
  }]
}
```