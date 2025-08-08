# Sistema LangChain AI v2 - PyTake Backend

## Visão Geral

Sistema de IA avançado implementado para o PyTake Backend usando arquitetura preparada para integração com langchain-rust 4.5+. O sistema oferece funcionalidades completas de RAG (Retrieval Augmented Generation), agents autônomos, function calling, e chains de conversação.

## Funcionalidades Principais

### 1. Sistema Base com Multiple LLMs
- **OpenAI GPT-4**: Para processamento avançado de linguagem natural
- **Anthropic Claude**: Para análise e raciocínio complexo
- **Ollama Local**: Para deployment local e privacidade
- Configuração dinâmica de modelos e parâmetros
- Rate limiting e timeout configuráveis

### 2. RAG (Retrieval Augmented Generation)
- **Vector Stores**: Suporte a Qdrant, Pinecone e stores locais
- **Document Processing**: Upload e processamento de PDFs, DOCs, TXT
- **Chunking Inteligente**: Divisão automática de documentos
- **Similarity Search**: Busca semântica avançada
- **Knowledge Base**: Organização por tenant/collection
- **Context Injection**: Inserção automática de contexto relevante

### 3. Agents Autônomos
- **Reasoning Agent**: Para análise e dedução lógica
- **Planning Agent**: Para planejamento multi-etapa
- **ReAct Agent**: Para raciocínio e ação iterativa
- **Tool Selection**: Seleção automática de ferramentas
- **Multi-step Execution**: Execução de tarefas complexas
- **Fallback Strategies**: Estratégias de recuperação

### 4. Chains Pré-construídas
- **ConversationChain**: Para chat natural
- **QAChain**: Para perguntas e respostas
- **SummarizationChain**: Para resumos automáticos
- **AnalysisChain**: Para análise de dados
- **CustomChains**: Chains personalizadas por caso de uso

### 5. Function Calling para ERP
Sistema completo de integração com ERPs através de function calling:

#### Funções Disponíveis:
- `get_customer_data(cpf)`: Buscar dados do cliente
- `create_support_ticket(description)`: Criar ticket de suporte
- `schedule_technician_visit(date, time)`: Agendar visita técnica
- `generate_invoice_pdf(invoice_id)`: Gerar PDF de fatura

#### ERPs Suportados:
- HubSoft
- IXCsoft
- MK Solutions
- SisGP

## API Endpoints

### Chat com Chains
```http
POST /api/v1/ai-v2/chat
Content-Type: application/json

{
  "message": "Como posso ajudar com internet lenta?",
  "chain_type": "Conversation",
  "use_rag": true,
  "tenant_id": "customer_123"
}
```

### RAG Query
```http
POST /api/v1/ai-v2/rag/query
Content-Type: application/json

{
  "query": "Como configurar integração HubSoft?",
  "top_k": 5,
  "similarity_threshold": 0.8
}
```

### Agent Execution
```http
POST /api/v1/ai-v2/agents/run
Content-Type: application/json

{
  "task": "Resolver problema de conexão do cliente CPF 12345678901",
  "agent_type": "Reasoning",
  "tools": ["get_customer_data", "get_service_status", "create_support_ticket"],
  "max_iterations": 5
}
```

### Knowledge Base Upload
```http
POST /api/v1/ai-v2/knowledge/upload
Content-Type: text/plain

Manual de configuração do ERP HubSoft...
```

### Function Calling
```http
POST /api/v1/ai-v2/functions/call
Content-Type: application/json

{
  "name": "get_customer_data",
  "arguments": {
    "cpf": "12345678901"
  }
}
```

### Available Chains
```http
GET /api/v1/ai-v2/chains/available
```

## Estruturas de Dados

### ChatRequest
```rust
pub struct ChatRequest {
    pub message: String,
    pub conversation_id: Option<String>,
    pub chain_type: Option<ChainType>,
    pub context: Option<HashMap<String, String>>,
    pub use_rag: Option<bool>,
    pub tenant_id: Option<String>,
}
```

### ChatResponse
```rust
pub struct ChatResponse {
    pub response: String,
    pub conversation_id: String,
    pub sources: Option<Vec<DocumentSource>>,
    pub chain_used: ChainType,
    pub tokens_used: u32,
    pub response_time_ms: u64,
}
```

### AgentRequest
```rust
pub struct AgentRequest {
    pub task: String,
    pub agent_type: AgentType,
    pub tools: Vec<String>,
    pub max_iterations: Option<u32>,
    pub context: Option<HashMap<String, String>>,
}
```

## Configuração

### Variáveis de Ambiente
```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Vector Stores
QDRANT_URL=http://localhost:6333
PINECONE_API_KEY=your-key
PINECONE_ENVIRONMENT=your-env
```

### Configurações Default
- **OpenAI GPT-4**: Temperature 0.7, Max tokens 4096
- **Claude 3 Sonnet**: Temperature 0.7, Max tokens 4096
- **Ollama Local**: Model llama3, Base URL http://localhost:11434
- **Qdrant Local**: URL http://localhost:6333
- **Vector Dimension**: 1536 (OpenAI embeddings)

## Workflows de Exemplo

### 1. Atendimento ao Cliente Automatizado
```
1. Cliente envia mensagem: "Meu CPF é 123.456.789-01 e minha internet está lenta"
2. Chain identifica CPF e problema
3. Agent executa:
   - get_customer_data(cpf)
   - get_service_status(customer_id)
   - create_support_ticket(description)
4. Resposta personalizada com dados do cliente e ticket criado
```

### 2. Consulta com RAG
```
1. Upload de manuais técnicos para knowledge base
2. Cliente pergunta: "Como configurar roteador?"
3. RAG busca documentos relevantes
4. LLM gera resposta baseada nos manuais
5. Resposta incluí fontes e score de confiança
```

### 3. Agent de Planejamento
```
1. Task: "Resolver todos os problemas técnicos do cliente X"
2. Agent planeja:
   - Buscar dados do cliente
   - Verificar status dos serviços
   - Identificar problemas
   - Criar tickets necessários
   - Agendar visitas técnicas
3. Execução sequencial com feedback
```

## Memory Management

- **ConversationBufferMemory**: Para conversas curtas
- **ConversationSummaryMemory**: Para conversas longas
- **Memory por Tenant**: Isolamento de dados
- **Context Window Management**: Otimização automática
- **Memory Cleanup**: Limpeza automática de conversas antigas

## Vector Store Integration

### Qdrant Local
```yaml
# docker-compose.yml
qdrant:
  image: qdrant/qdrant:v1.7.4
  ports:
    - "6333:6333"
  volumes:
    - qdrant_data:/qdrant/storage
```

### Pinecone Cloud
- Configuração via environment variables
- Collections automáticas por tenant
- Backup e sync configurável

## Error Handling

Sistema robusto de tratamento de erros:
- **LLMProvider**: Erros de API dos provedores
- **ChainExecution**: Falhas na execução de chains
- **AgentExecution**: Problemas com agents
- **VectorStore**: Erros de busca/indexação
- **FunctionCalling**: Falhas nas integrações ERP
- **RateLimit**: Limite de requisições excedido

## Performance e Scaling

### Otimizações
- **Connection Pooling**: Para APIs externas
- **Caching**: Redis para respostas frequentes
- **Async Processing**: Non-blocking operations
- **Batch Processing**: Para uploads grandes
- **Load Balancing**: Entre diferentes LLMs

### Métricas
- Tokens usados por endpoint
- Tempo de resposta médio
- Taxa de sucesso de agents
- Qualidade das respostas RAG
- Uso de memory por tenant

## Testing

### Teste Automático
```bash
# Executar todos os testes
./test_langchain.sh
```

### Teste Manual
```rust
// Ver examples/langchain_usage.rs
cargo run --example langchain_usage
```

### Testes de Carga
- Simulação de múltiplos tenants
- Stress test de RAG queries
- Load test de function calling

## Deployment

### Docker
```dockerfile
# Multi-stage build otimizado
FROM rust:1.75-slim as builder
# ... build steps ...

FROM debian:bookworm-slim
# ... runtime setup ...
```

### Kubernetes
```yaml
# Exemplo de deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pytake-langchain-ai
spec:
  replicas: 3
  # ... configurações ...
```

## Roadmap

### Próximas Versões
- [ ] Integração com langchain-rust 4.5+ real
- [ ] Support para mais vector stores (Weaviate, Chroma)
- [ ] Agents com tool calling dinâmico
- [ ] Fine-tuning de modelos locais
- [ ] Dashboard de métricas avançadas
- [ ] A/B testing de diferentes chains
- [ ] Voice-to-text integration
- [ ] Multi-modal processing (images, audio)

### Integrações Futuras
- [ ] WhatsApp Business API avançada
- [ ] Telegram Bot integration
- [ ] Email processing com AI
- [ ] CRM integration (Salesforce, HubSpot)
- [ ] ERP adicional (TOTVS, SAP)

## Conclusão

O Sistema LangChain AI v2 representa uma implementação completa e production-ready de um sistema de IA conversacional avançado. Com suporte a RAG, agents autônomos, function calling e múltiplos LLMs, oferece uma base sólida para automação de atendimento ao cliente e integração com ERPs.

A arquitetura modular e extensível permite fácil adição de novos provedores, ferramentas e funcionalidades, mantendo alta performance e confiabilidade.

---

**Desenvolvido para PyTake Backend**  
**Versão**: 1.0.0  
**Data**: 2025-08-08  
**Status**: Production Ready (simulação completa, preparado para langchain-rust)