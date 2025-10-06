# Evolution API Integration - QR Code WhatsApp Connection

## 📋 Overview

O PyTake agora suporta **dois tipos de conexão** WhatsApp:

### 1. **API Oficial (Meta Cloud API)** 🔵
- ✅ **Aprovada pelo WhatsApp Business**
- ✅ **Mais estável e confiável**
- ✅ **Suporte oficial do Meta**
- ❌ **Requer aprovação do Meta**
- ❌ **Pode ter custos**
- 📱 **Melhor para empresas grandes**

### 2. **QR Code (Evolution API)** 🟢
- ✅ **100% Gratuito**
- ✅ **Setup rápido (< 5 minutos)**
- ✅ **Sem aprovação necessária**
- ✅ **Baseado no WhatsApp Web (Baileys)**
- ❌ **Menos estável que API oficial**
- ❌ **Pode ter limitações do WhatsApp**
- 📱 **Ideal para pequenas e médias empresas**

---

## 🚀 Como Funciona

### Fluxo de Conexão via QR Code

```
1. Instalar Evolution API (servidor próprio)
   ↓
2. Configurar URL e API Key no PyTake
   ↓
3. PyTake cria instância na Evolution API
   ↓
4. Evolution gera QR Code
   ↓
5. Escanear com WhatsApp do celular
   ↓
6. Conectado! 🎉
```

---

## 📦 Instalação da Evolution API

### Opção 1: Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Configure as variáveis de ambiente
cp .env.example .env

# Edite o .env e configure:
# - SERVER_URL=https://evolution.seudominio.com
# - AUTHENTICATION_API_KEY=sua-chave-secreta-forte

# Inicie com Docker Compose
docker-compose up -d
```

A Evolution API estará rodando em: `http://localhost:8080`

### Opção 2: NPM/Node.js

```bash
# Instale as dependências
npm install

# Configure .env
cp .env.example .env

# Inicie o servidor
npm run start:prod
```

### Variáveis de Ambiente Importantes

```env
# URL pública da Evolution API
SERVER_URL=https://evolution.example.com

# API Key global (será usada no PyTake)
AUTHENTICATION_API_KEY=your-strong-api-key-here

# Configurações de instância
DEL_INSTANCE=false  # Não deletar instâncias automaticamente
QRCODE_COLOR=#198754  # Cor do QR Code
```

---

## ⚙️ Configuração no PyTake

### 1. Acessar Painel Admin

```
http://localhost:3001/admin/whatsapp
```

### 2. Clicar em "Adicionar Número" → "QR Code (Evolution API)"

### 3. Preencher o Formulário

- **País**: Selecione o país (default: Brasil 🇧🇷)
- **Número**: Digite apenas o número (sem código do país)
  - Exemplo: `11999999999`
- **Nome de Exibição**: Nome amigável (opcional)
  - Exemplo: `Atendimento - Principal`
- **Evolution API URL**: URL da sua Evolution API
  - Exemplo: `https://evolution.example.com`
- **Evolution API Key**: A chave configurada no `.env` da Evolution
  - Exemplo: `your-strong-api-key-here`

### 4. Clicar em "Adicionar e Gerar QR Code"

O sistema irá:
1. Criar uma instância única na Evolution API
2. Gerar QR Code
3. Exibir o QR Code para escane

### 5. Escanear QR Code

1. Abra o WhatsApp no celular
2. Vá em **Configurações** → **Aparelhos conectados**
3. Clique em **Conectar um aparelho**
4. Escaneie o QR Code exibido

✅ **Conectado!** O status mudará para "Conectado" automaticamente.

---

## 🔧 Arquitetura Técnica

### Backend

#### Novo Modelo de Dados

```python
class WhatsAppNumber(Base):
    # Tipo de conexão
    connection_type = Column(String(20))  # 'official' ou 'qrcode'

    # Campos Meta Cloud API (Official)
    phone_number_id = Column(String(255), nullable=True)
    whatsapp_business_account_id = Column(String(255), nullable=True)
    access_token = Column(Text, nullable=True)
    webhook_verify_token = Column(String(255), nullable=True)

    # Campos Evolution API (QR Code)
    evolution_instance_name = Column(String(255), unique=True, nullable=True)
    evolution_api_url = Column(Text, nullable=True)
    evolution_api_key = Column(Text, nullable=True)
```

#### Evolution API Client

```python
from app.integrations.evolution_api import EvolutionAPIClient

# Inicializar cliente
client = EvolutionAPIClient(
    api_url="https://evolution.example.com",
    api_key="your-api-key"
)

# Criar instância
await client.create_instance(
    instance_name="pytake_org123_num456",
    webhook_url="https://api.pytake.net/api/v1/whatsapp/webhook/evolution",
    webhook_events=[
        "QRCODE_UPDATED",
        "CONNECTION_UPDATE",
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
    ]
)

# Conectar e obter QR Code
await client.connect_instance("pytake_org123_num456")
qr_code = await client.get_qrcode("pytake_org123_num456")

# Verificar status
status = await client.get_instance_status("pytake_org123_num456")
if status["state"] == "open":
    print("Conectado!")

# Enviar mensagem
await client.send_text_message(
    instance_name="pytake_org123_num456",
    phone_number="5511999999999",
    message="Olá! Esta é uma mensagem de teste."
)
```

#### Novos Endpoints API

```
POST /api/v1/whatsapp/{number_id}/qrcode
  → Gera QR Code para conexão
  → Response: { qr_code: "base64...", status: "pending", message: "..." }

GET /api/v1/whatsapp/{number_id}/qrcode/status
  → Verifica status do QR Code (polling)
  → Response: { qr_code: "base64...", status: "connected|pending", message: "..." }

POST /api/v1/whatsapp/{number_id}/disconnect
  → Desconecta número (logout para QR Code, deactivate para Official)
  → Response: { status: "success", message: "Número desconectado" }
```

### Frontend

#### Componentes Criados

1. **`AddWhatsAppQRCodeModal.tsx`**
   - Modal específico para QR Code
   - Form com Evolution API URL e Key
   - Validações e feedback de erros

2. **Tags de Tipo de Conexão**
   ```tsx
   {number.connection_type === 'official' ? (
     <span className="badge-blue">
       <Shield /> API Oficial
     </span>
   ) : (
     <span className="badge-green">
       <QrCode /> QR Code
     </span>
   )}
   ```

3. **Dropdown de Adição**
   - Botão "Adicionar Número" com dropdown
   - Opção 1: API Oficial (Meta)
   - Opção 2: QR Code (Evolution API)

#### API Client

```typescript
// Tipos
export type ConnectionType = 'official' | 'qrcode';

export interface WhatsAppNumber {
  id: string;
  connection_type: ConnectionType;

  // Meta Cloud API fields
  phone_number_id: string | null;
  access_token: string | null;
  // ...

  // Evolution API fields
  evolution_instance_name: string | null;
  evolution_api_url: string | null;
  evolution_api_key: string | null;
  // ...
}

// Métodos
await whatsappAPI.generateQRCode(numberId);
await whatsappAPI.getQRCodeStatus(numberId);
await whatsappAPI.disconnect(numberId);
```

---

## 🔒 Segurança

### Configurações Padrão Evolution API

O PyTake configura automaticamente:

```javascript
{
  "webhook_base64": true,         // Receber mídia em base64
  "reject_call": false,           // Não rejeitar chamadas automaticamente
  "groups_ignore": true,          // Ignorar mensagens de grupos
  "always_online": false,         // Não mostrar sempre online
  "read_messages": false,         // Não marcar como lido automaticamente
  "read_status": false,           // Não marcar status como lido
  "sync_full_history": false,     // Não sincronizar histórico completo
}
```

### Webhook Configuration

O PyTake registra automaticamente webhook na Evolution API:

```
URL: https://api.pytake.net/api/v1/whatsapp/webhook/evolution
Eventos: QRCODE_UPDATED, CONNECTION_UPDATE, MESSAGES_UPSERT, MESSAGES_UPDATE
```

Mensagens recebidas serão processadas da mesma forma que a API oficial.

---

## 📊 Comparação Detalhada

| Feature | API Oficial (Meta) | QR Code (Evolution) |
|---------|-------------------|---------------------|
| **Custo** | Pago (após tier gratuito) | 100% Gratuito |
| **Aprovação** | Requer aprovação Meta | Não requer |
| **Setup** | ~7 dias (aprovação) | ~5 minutos |
| **Estabilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Suporte Oficial** | ✅ Sim | ❌ Não |
| **Limites de Envio** | Alto (conforme tier) | Moderado (WhatsApp Web) |
| **Webhooks** | Sim | Sim |
| **Templates** | Obrigatório fora 24h | Não obrigatório |
| **Múltiplas Sessões** | Sim | Limitado |
| **Business Verification** | Sim | Não |
| **Quality Rating** | Sim | Não |
| **Infraestrutura** | Cloud Meta | Servidor próprio |

---

## 🐛 Troubleshooting

### QR Code não aparece

**Causa**: Evolution API não está rodando ou URL/Key incorretas

**Solução**:
```bash
# Verificar se Evolution está rodando
curl -H "apikey: your-api-key" https://evolution.example.com/instance/fetchInstances

# Verificar logs
docker logs evolution-api
```

### "Instance already exists"

**Causa**: Instância já foi criada anteriormente

**Solução**:
1. Deletar número no PyTake
2. Ou deletar instância na Evolution:
```bash
curl -X DELETE \
  -H "apikey: your-api-key" \
  https://evolution.example.com/instance/delete/pytake_xxx
```

### QR Code expira antes de escanear

**Causa**: QR Code tem validade de ~60 segundos

**Solução**:
1. Recarregar a página
2. Clicar em "Gerar Novo QR Code"
3. Escanear rapidamente

### Desconexão frequente

**Causa**: WhatsApp detectou atividade suspeita ou múltiplas sessões

**Solução**:
1. Usar apenas um dispositivo conectado
2. Evitar enviar muitas mensagens muito rápido
3. Considerar migrar para API Oficial

---

## 📈 Próximos Passos

### Implementações Futuras

- [ ] **Modal de QR Code com Polling**
  - Auto-atualizar QR Code
  - Mostrar status de conexão em tempo real
  - Progress bar durante scanning

- [ ] **Health Check Automático**
  - Verificar status da Evolution API periodicamente
  - Notificar se instância desconectou
  - Auto-reconectar se possível

- [ ] **Backup de Sessão**
  - Salvar sessão da Evolution API
  - Restaurar após restart do servidor

- [ ] **Métricas Evolution API**
  - Uptime da instância
  - Mensagens enviadas/recebidas
  - Latência média

---

## 🔗 Links Úteis

- [Evolution API GitHub](https://github.com/EvolutionAPI/evolution-api)
- [Evolution API Docs](https://doc.evolution-api.com)
- [Postman Collection](https://evolution-api.com/postman)
- [Baileys (WhatsApp Web API)](https://github.com/WhiskeySockets/Baileys)
- [Meta Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)

---

## ✅ Conclusão

A integração com Evolution API permite que o PyTake ofereça uma solução **gratuita e rápida** para conectar WhatsApp, ideal para:

- 🏢 Pequenas e médias empresas
- 🚀 Startups testando o produto
- 💡 Desenvolvimentos e testes
- 💰 Orçamentos limitados

Para empresas que precisam de maior estabilidade e suporte oficial, recomendamos a **API Oficial (Meta)**.

**Ambas as opções funcionam perfeitamente no PyTake!** 🎉
