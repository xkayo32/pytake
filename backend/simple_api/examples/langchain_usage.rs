use reqwest;
use serde_json::json;
use std::collections::HashMap;

/// Exemplo de uso completo do sistema LangChain AI
/// 
/// Este exemplo demonstra como usar todas as funcionalidades do novo sistema de IA:
/// - Chat com chains
/// - RAG (Retrieval Augmented Generation)
/// - Agents autônomos
/// - Function calling para ERPs
/// - Upload de documentos para knowledge base

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let base_url = "http://localhost:8080/api/v1/ai-v2";

    println!("🚀 Testando Sistema LangChain AI v2");
    println!("====================================");

    // 1. Teste de chat básico
    println!("\n1️⃣ Chat Básico com Chain de Conversação");
    let chat_response = client
        .post(&format!("{}/chat", base_url))
        .json(&json!({
            "message": "Olá! Como você pode me ajudar?",
            "chain_type": "Conversation",
            "use_rag": false
        }))
        .send()
        .await?;

    if chat_response.status().is_success() {
        let response: serde_json::Value = chat_response.json().await?;
        println!("✅ Resposta: {}", response["response"]);
        println!("📊 Tokens usados: {}", response["tokens_used"]);
        println!("⏱️ Tempo de resposta: {}ms", response["response_time_ms"]);
    } else {
        println!("❌ Erro no chat: {}", chat_response.status());
    }

    // 2. Teste de RAG Query
    println!("\n2️⃣ Consulta RAG (Retrieval Augmented Generation)");
    let rag_response = client
        .post(&format!("{}/rag/query", base_url))
        .json(&json!({
            "query": "Como funciona a integração com ERPs?",
            "top_k": 5,
            "similarity_threshold": 0.8
        }))
        .send()
        .await?;

    if rag_response.status().is_success() {
        let response: serde_json::Value = rag_response.json().await?;
        println!("✅ Resposta RAG: {}", response["answer"]);
        println!("📚 Confiança: {}", response["confidence_score"]);
        println!("📖 Fontes encontradas: {}", response["sources"].as_array().unwrap().len());
    }

    // 3. Teste de Agent Execution
    println!("\n3️⃣ Execução de Agent Autônomo");
    let agent_response = client
        .post(&format!("{}/agents/run", base_url))
        .json(&json!({
            "task": "Buscar informações do cliente com CPF 12345678901 e verificar faturas em aberto",
            "agent_type": "Reasoning",
            "tools": ["get_customer_data", "get_customer_invoices"],
            "max_iterations": 5
        }))
        .send()
        .await?;

    if agent_response.status().is_success() {
        let response: serde_json::Value = agent_response.json().await?;
        println!("✅ Resultado do Agent: {}", response["result"]);
        println!("🔧 Ferramentas usadas: {:?}", response["tools_used"]);
        println!("🔄 Iterações: {}", response["iterations"]);
        println!("✅ Sucesso: {}", response["success"]);
        
        // Mostrar passos do agente
        if let Some(steps) = response["steps"].as_array() {
            for (i, step) in steps.iter().enumerate() {
                println!("  Step {}: {}", i + 1, step["thought"]);
                println!("    Ação: {}", step["action"]);
                println!("    Resultado: {}", step["observation"]);
            }
        }
    }

    // 4. Teste de Function Calling
    println!("\n4️⃣ Function Calling - Integração ERP");
    
    // Buscar dados do cliente
    let function_response = client
        .post(&format!("{}/functions/call", base_url))
        .json(&json!({
            "name": "get_customer_data",
            "arguments": {
                "cpf": "12345678901"
            }
        }))
        .send()
        .await?;

    if function_response.status().is_success() {
        let response: serde_json::Value = function_response.json().await?;
        println!("✅ Dados do cliente: {}", response["result"]);
        println!("⏱️ Tempo de execução: {}ms", response["execution_time_ms"]);
    }

    // Criar ticket de suporte
    let ticket_response = client
        .post(&format!("{}/functions/call", base_url))
        .json(&json!({
            "name": "create_support_ticket",
            "arguments": {
                "description": "Cliente relatando instabilidade na conexão"
            }
        }))
        .send()
        .await?;

    if ticket_response.status().is_success() {
        let response: serde_json::Value = ticket_response.json().await?;
        println!("🎫 Ticket criado: {}", response["result"]);
    }

    // Agendar visita técnica
    let schedule_response = client
        .post(&format!("{}/functions/call", base_url))
        .json(&json!({
            "name": "schedule_technician_visit",
            "arguments": {
                "date": "2025-08-10",
                "time": "14:00"
            }
        }))
        .send()
        .await?;

    if schedule_response.status().is_success() {
        let response: serde_json::Value = schedule_response.json().await?;
        println!("📅 Visita agendada: {}", response["result"]);
    }

    // 5. Listar chains disponíveis
    println!("\n5️⃣ Chains Disponíveis");
    let chains_response = client
        .get(&format!("{}/chains/available", base_url))
        .send()
        .await?;

    if chains_response.status().is_success() {
        let chains: serde_json::Value = chains_response.json().await?;
        if let Some(chain_array) = chains.as_array() {
            for chain in chain_array {
                println!("🔗 Chain: {}", chain["name"]);
                println!("   Descrição: {}", chain["description"]);
                println!("   Passos: {}", chain["steps"].as_array().unwrap().len());
            }
        }
    }

    // 6. Chat com RAG habilitado
    println!("\n6️⃣ Chat com RAG Habilitado");
    let rag_chat_response = client
        .post(&format!("{}/chat", base_url))
        .json(&json!({
            "message": "Como posso integrar meu ERP HubSoft com o sistema?",
            "use_rag": true,
            "context": {
                "user_type": "customer",
                "erp_provider": "hubsoft"
            }
        }))
        .send()
        .await?;

    if rag_chat_response.status().is_success() {
        let response: serde_json::Value = rag_chat_response.json().await?;
        println!("✅ Resposta com RAG: {}", response["response"]);
        if let Some(sources) = response["sources"].as_array() {
            println!("📚 {} fontes consultadas", sources.len());
        }
    }

    // 7. Exemplo de workflow complexo
    println!("\n7️⃣ Workflow Complexo: Atendimento ao Cliente");
    
    // Primeiro, identificar o cliente via chat
    let identify_response = client
        .post(&format!("{}/chat", base_url))
        .json(&json!({
            "message": "Meu CPF é 12345678901 e estou com problemas na minha internet",
            "chain_type": "Custom",
            "context": {
                "workflow": "customer-support"
            }
        }))
        .send()
        .await?;

    if identify_response.status().is_success() {
        let response: serde_json::Value = identify_response.json().await?;
        let conversation_id = &response["conversation_id"];
        
        // Executar agent para resolver o problema
        let resolution_response = client
            .post(&format!("{}/agents/run", base_url))
            .json(&json!({
                "task": format!("Resolver problema de internet do cliente CPF 12345678901 da conversa {}", conversation_id),
                "agent_type": "ConversationalReAct",
                "tools": ["get_customer_data", "get_service_status", "create_support_ticket", "schedule_technician_visit"],
                "context": {
                    "conversation_id": conversation_id,
                    "priority": "high"
                }
            }))
            .send()
            .await?;

        if resolution_response.status().is_success() {
            let response: serde_json::Value = resolution_response.json().await?;
            println!("🔧 Resolução automática: {}", response["result"]);
            println!("📋 Ações executadas:");
            for tool in response["tools_used"].as_array().unwrap() {
                println!("   - {}", tool);
            }
        }
    }

    println!("\n✅ Testes do Sistema LangChain AI v2 Concluídos!");
    println!("🎯 Funcionalidades testadas:");
    println!("   - Chat com múltiplas chains");
    println!("   - RAG para consulta de conhecimento");
    println!("   - Agents autônomos para tarefas complexas");
    println!("   - Function calling para integração ERP");
    println!("   - Workflows automatizados de atendimento");

    Ok(())
}

/// Exemplo de upload de documento para knowledge base
/// 
/// Este exemplo mostra como fazer upload de documentos para a knowledge base
/// para serem usados nas consultas RAG
pub async fn upload_document_example() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let base_url = "http://localhost:8080/api/v1/ai-v2";

    // Simular conteúdo de um manual de integração ERP
    let document_content = r#"
# Manual de Integração ERP HubSoft

## Configuração Inicial

Para integrar o HubSoft com o PyTake, siga os seguintes passos:

1. Obtenha suas credenciais de API no painel administrativo do HubSoft
2. Configure a URL base: https://api.hubsoft.com.br/v1
3. Teste a conexão usando o endpoint /health

## Endpoints Disponíveis

### Clientes
- GET /customers/{cpf} - Buscar cliente por CPF
- POST /customers - Criar novo cliente
- PUT /customers/{id} - Atualizar cliente

### Faturas  
- GET /customers/{id}/invoices - Listar faturas do cliente
- GET /invoices/{id}/pdf - Gerar PDF da fatura

### Suporte
- POST /tickets - Criar ticket de suporte
- GET /tickets/{id} - Consultar status do ticket

## Exemplos de Uso

```bash
curl -X GET "https://api.hubsoft.com.br/v1/customers/12345678901" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Códigos de Erro

- 401: Token inválido ou expirado
- 404: Cliente não encontrado
- 429: Rate limit excedido
- 500: Erro interno do servidor
"#;

    let upload_response = client
        .post(&format!("{}/knowledge/upload", base_url))
        .header("content-type", "text/plain")
        .body(document_content)
        .send()
        .await?;

    if upload_response.status().is_success() {
        let response: serde_json::Value = upload_response.json().await?;
        println!("✅ Documento enviado com sucesso!");
        println!("📄 ID: {}", response["id"]);
        println!("📊 Chunks criados: {}", response["chunks_count"]);
        println!("📅 Enviado em: {}", response["uploaded_at"]);
    }

    Ok(())
}