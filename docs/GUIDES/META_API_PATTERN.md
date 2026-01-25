# Padrão de Uso da Meta Cloud API

## 📋 Visão Geral

A integração com WhatsApp Business API é centralizada na classe `MetaCloudAPI` (`app/integrations/meta_api.py`). **Todas as chamadas à Meta API DEVEM usar esta classe.**

## ✅ Padrão Obrigatório

### Importação

```python
from app.integrations.meta_api import MetaCloudAPI, MetaAPIError
from app.core.security import decrypt_token
```

### Inicialização

```python
# Obter o número WhatsApp (geralmente do banco de dados)
whatsapp_number = ...  # WhatsAppNumber model

# Decriptar o token armazenado
decrypted_token = decrypt_token(whatsapp_number.access_token)

# Criar instância do cliente Meta
meta_api = MetaCloudAPI(
    phone_number_id=whatsapp_number.phone_number_id,
    access_token=decrypted_token
)
```

### Envio de Mensagens

#### 1. Mensagem de Texto

```python
try:
    response = await meta_api.send_text_message(
        to=contact_whatsapp_id,  # E.g., "5511999999999"
        text="Olá! Como posso ajudá-lo?",
        preview_url=False  # Set True to preview URLs in message
    )
    message_id = response["messages"][0]["id"]
    logger.info(f"Mensagem enviada com ID: {message_id}")
except MetaAPIError as e:
    logger.error(f"Erro ao enviar mensagem: {e.message} (código: {e.error_code})")
```

#### 2. Mensagem com Imagem

```python
try:
    response = await meta_api.send_image_message(
        to=contact_whatsapp_id,
        image_url="https://example.com/image.jpg",
        caption="Descrição opcional da imagem"
    )
    logger.info(f"Imagem enviada: {response['messages'][0]['id']}")
except MetaAPIError as e:
    logger.error(f"Erro ao enviar imagem: {e.message}")
```

#### 3. Mensagem com Documento

```python
try:
    response = await meta_api.send_document_message(
        to=contact_whatsapp_id,
        document_url="https://example.com/doc.pdf",
        filename="documento.pdf",
        caption="Veja o documento anexo"
    )
    logger.info(f"Documento enviado: {response['messages'][0]['id']}")
except MetaAPIError as e:
    logger.error(f"Erro ao enviar documento: {e.message}")
```

#### 4. Mensagem com Template

```python
try:
    response = await meta_api.send_template_message(
        to=contact_whatsapp_id,
        template_name="hello_world",
        language_code="pt_BR",
        components=[
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "João"},
                    {"type": "text", "text": "12345"}
                ]
            }
        ]
    )
    logger.info(f"Template enviado: {response['messages'][0]['id']}")
except MetaAPIError as e:
    logger.error(f"Erro ao enviar template: {e.message}")
```

#### 5. Mensagem com Botões Interativos

```python
try:
    response = await meta_api.send_interactive_buttons(
        to=contact_whatsapp_id,
        body_text="Escolha uma opção:",
        buttons=[
            {"id": "btn1", "title": "Opção 1"},
            {"id": "btn2", "title": "Opção 2"},
            {"id": "btn3", "title": "Opção 3"}
        ]
    )
    logger.info(f"Botões enviados: {response['messages'][0]['id']}")
except MetaAPIError as e:
    logger.error(f"Erro ao enviar botões: {e.message}")
```

#### 6. Mensagem com Lista/Menu

```python
try:
    response = await meta_api.send_interactive_list(
        to=contact_whatsapp_id,
        body_text="Selecione uma opção:",
        button_text="Ver opções",
        sections=[
            {
                "title": "Produtos",
                "rows": [
                    {"id": "prod1", "title": "Produto 1", "description": "Descrição 1"},
                    {"id": "prod2", "title": "Produto 2", "description": "Descrição 2"}
                ]
            }
        ]
    )
    logger.info(f"Lista enviada: {response['messages'][0]['id']}")
except MetaAPIError as e:
    logger.error(f"Erro ao enviar lista: {e.message}")
```

### Gerenciamento de Templates

#### Listar Templates

```python
try:
    templates = await meta_api.list_templates(
        waba_id=waba_id,
        status="APPROVED",
        limit=100
    )
    for template in templates:
        print(f"Template: {template['name']} ({template['status']})")
except MetaAPIError as e:
    logger.error(f"Erro ao listar templates: {e.message}")
```

#### Criar Template

```python
try:
    response = await meta_api.create_template(
        waba_id=waba_id,
        name="hello_world",
        language="pt_BR",
        category="UTILITY",
        components=[
            {
                "type": "BODY",
                "text": "Olá {{1}}, você recebeu o código {{2}}"
            }
        ]
    )
    template_id = response.get("id")
    logger.info(f"Template criado: {template_id}")
except MetaAPIError as e:
    logger.error(f"Erro ao criar template: {e.message}")
```

#### Deletar Template

```python
try:
    success = await meta_api.delete_template(
        waba_id=waba_id,
        template_name="hello_world"
    )
    if success:
        logger.info("Template deletado com sucesso")
except MetaAPIError as e:
    logger.error(f"Erro ao deletar template: {e.message}")
```

## 🔐 Tratamento de Erros

```python
from app.integrations.meta_api import MetaAPIError

try:
    response = await meta_api.send_text_message(...)
except MetaAPIError as e:
    logger.error(f"Meta error: {e.message} (code: {e.error_code})")
    if e.status_code == 429:
        await asyncio.sleep(5)  # Rate limit
    elif e.status_code == 500:
        pass  # Server error
```

## ❌ O Que NÃO Fazer

```python
# ❌ NUNCA use httpx direto para Meta API
async with httpx.AsyncClient() as client:
    response = await client.post(
        f"https://graph.facebook.com/v18.0/{phone_id}/messages",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
```

## 🎯 Checklist para Novos Desenvolvimentos

- [ ] Usar `MetaCloudAPI` para todas as chamadas à Meta
- [ ] Importar `MetaCloudAPI` e `MetaAPIError` corretamente
- [ ] Decriptar tokens via `decrypt_token()`
- [ ] Envolver em try/except capturando `MetaAPIError`
- [ ] Adicionar logging adequado
- [ ] Testar com webhook real de WhatsApp

## 📚 Referências

- **Classe**: `backend/app/integrations/meta_api.py`
- **Uso**: `backend/app/services/whatsapp_service.py`
- **Meta API Docs**: https://developers.facebook.com/docs/whatsapp/cloud-api

---

**Autor**: Kayo Carvalho Fernandes  
**Última atualização**: 2026-01-25
