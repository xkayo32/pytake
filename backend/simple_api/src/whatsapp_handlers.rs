use actix_web::{web, HttpResponse, HttpRequest, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::whatsapp_evolution::{
    WhatsAppService, EvolutionConfig, OfficialConfig, WhatsAppProvider, MessageType
};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, error};

/// WhatsApp instance manager
#[derive(Clone)]
pub struct WhatsAppManager {
    instances: Arc<RwLock<std::collections::HashMap<String, Arc<WhatsAppService>>>>,
}

impl WhatsAppManager {
    pub fn new() -> Self {
        Self {
            instances: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }
    
    pub async fn add_instance(&self, name: String, service: WhatsAppService) {
        let mut instances = self.instances.write().await;
        instances.insert(name, Arc::new(service));
    }
    
    pub async fn get_instance(&self, name: &str) -> Option<Arc<WhatsAppService>> {
        let instances = self.instances.read().await;
        instances.get(name).cloned()
    }
    
    pub async fn list_instances(&self) -> Vec<String> {
        let instances = self.instances.read().await;
        instances.keys().cloned().collect()
    }
}

// Request/Response types

#[derive(Debug, Deserialize)]
pub struct CreateInstanceRequest {
    pub provider: WhatsAppProvider,
    pub instance_name: String,
    pub evolution_config: Option<EvolutionConfigRequest>,
    pub official_config: Option<OfficialConfigRequest>,
}

#[derive(Debug, Deserialize)]
pub struct EvolutionConfigRequest {
    pub base_url: String,
    pub api_key: String,
}

#[derive(Debug, Deserialize)]
pub struct OfficialConfigRequest {
    pub phone_number_id: String,
    pub access_token: String,
    pub webhook_verify_token: String,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub instance_name: String,
    pub to: String,
    pub text: Option<String>,
    pub media_url: Option<String>,
    pub media_type: Option<MessageType>,
    pub caption: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InstanceStatusResponse {
    pub instance_name: String,
    pub provider: WhatsAppProvider,
    pub connected: bool,
    pub qr_code: Option<String>,
}

// HTTP Handlers

/// POST /api/v1/whatsapp/instance/create
pub async fn create_instance(
    manager: web::Data<WhatsAppManager>,
    request: web::Json<CreateInstanceRequest>,
) -> Result<HttpResponse> {
    info!("Creating WhatsApp instance: {}", request.instance_name);
    
    match request.provider {
        WhatsAppProvider::Evolution => {
            let config = request.evolution_config.as_ref()
                .ok_or_else(|| {
                    actix_web::error::ErrorBadRequest("Evolution config required")
                })?;
            
            let evolution_config = EvolutionConfig {
                base_url: config.base_url.clone(),
                api_key: config.api_key.clone(),
                instance_name: request.instance_name.clone(),
            };
            
            let service = WhatsAppService::new_evolution(evolution_config.clone());
            
            // Try to create instance in Evolution API
            let client = crate::whatsapp_evolution::EvolutionClient::new(evolution_config);
            
            match client.create_instance().await {
                Ok(info) => {
                    manager.add_instance(request.instance_name.clone(), service).await;
                    
                    Ok(HttpResponse::Created().json(json!({
                        "instance_name": request.instance_name,
                        "provider": request.provider,
                        "status": info.status,
                        "state": info.state,
                        "message": "Instance created successfully"
                    })))
                }
                Err(e) => {
                    error!("Failed to create Evolution instance: {}", e);
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "Failed to create instance",
                        "details": e
                    })))
                }
            }
        }
        WhatsAppProvider::Official => {
            let config = request.official_config.as_ref()
                .ok_or_else(|| {
                    actix_web::error::ErrorBadRequest("Official config required")
                })?;
            
            let official_config = OfficialConfig {
                phone_number_id: config.phone_number_id.clone(),
                access_token: config.access_token.clone(),
                instance_name: request.instance_name.clone(),
                webhook_verify_token: config.webhook_verify_token.clone(),
            };
            
            let service = WhatsAppService::new_official(official_config.clone());
            
            // Test connection by getting phone status
            let client = crate::whatsapp_evolution::OfficialClient::new(official_config);
            
            match client.get_phone_status().await {
                Ok(status) => {
                    manager.add_instance(request.instance_name.clone(), service).await;
                    
                    Ok(HttpResponse::Created().json(json!({
                        "instance_name": request.instance_name,
                        "provider": request.provider,
                        "phone_number": status.display_phone_number,
                        "verified_name": status.verified_name,
                        "quality_rating": status.quality_rating,
                        "status": status.status,
                        "message": "Official WhatsApp instance created successfully"
                    })))
                }
                Err(e) => {
                    error!("Failed to verify Official WhatsApp instance: {}", e);
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "Failed to verify WhatsApp credentials",
                        "details": e
                    })))
                }
            }
        }
    }
}

/// GET /api/v1/whatsapp/instance/:name/status
pub async fn get_instance_status(
    manager: web::Data<WhatsAppManager>,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let instance_name = path.into_inner();
    info!("Getting status for instance: {}", instance_name);
    
    match manager.get_instance(&instance_name).await {
        Some(service) => {
            match service.get_instance_status().await {
                Ok(connected) => {
                    let provider = service.get_provider();
                    Ok(HttpResponse::Ok().json(InstanceStatusResponse {
                        instance_name,
                        provider,
                        connected,
                        qr_code: None, // TODO: implement QR code retrieval for Evolution
                    }))
                }
                Err(e) => {
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "error": "Failed to get instance status",
                        "details": e
                    })))
                }
            }
        }
        None => {
            Ok(HttpResponse::NotFound().json(json!({
                "error": "Instance not found"
            })))
        }
    }
}

/// GET /api/v1/whatsapp/instance/:name/qrcode
pub async fn get_qr_code(
    _manager: web::Data<WhatsAppManager>,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let instance_name = path.into_inner();
    info!("Getting QR code for instance: {}", instance_name);
    
    // For now, return a placeholder
    // TODO: Implement actual QR code retrieval from Evolution API
    Ok(HttpResponse::Ok().json(json!({
        "instance_name": instance_name,
        "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "message": "Scan this QR code with WhatsApp"
    })))
}

/// POST /api/v1/whatsapp/send
pub async fn send_message(
    manager: web::Data<WhatsAppManager>,
    request: web::Json<SendMessageRequest>,
) -> Result<HttpResponse> {
    info!("Sending message via instance: {}", request.instance_name);
    
    match manager.get_instance(&request.instance_name).await {
        Some(service) => {
            if let Some(text) = &request.text {
                match service.send_message(&request.to, text).await {
                    Ok(message_id) => {
                        Ok(HttpResponse::Ok().json(json!({
                            "success": true,
                            "message_id": message_id,
                            "to": request.to,
                            "instance": request.instance_name
                        })))
                    }
                    Err(e) => {
                        error!("Failed to send message: {}", e);
                        Ok(HttpResponse::InternalServerError().json(json!({
                            "error": "Failed to send message",
                            "details": e
                        })))
                    }
                }
            } else {
                Ok(HttpResponse::BadRequest().json(json!({
                    "error": "Text message required"
                })))
            }
        }
        None => {
            Ok(HttpResponse::NotFound().json(json!({
                "error": "Instance not found"
            })))
        }
    }
}

/// GET /api/v1/whatsapp/instances
pub async fn list_instances(
    manager: web::Data<WhatsAppManager>,
) -> Result<HttpResponse> {
    let instances = manager.list_instances().await;
    
    Ok(HttpResponse::Ok().json(json!({
        "instances": instances,
        "count": instances.len()
    })))
}

/// POST /api/v1/whatsapp/webhook
pub async fn webhook_handler(
    req: HttpRequest,
    body: web::Bytes,
) -> Result<HttpResponse> {
    // Handle WhatsApp verification challenge (GET request)
    if req.method() == "GET" {
        return webhook_verification(req).await;
    }
    
    let body_str = std::str::from_utf8(&body)
        .map_err(|e| actix_web::error::ErrorBadRequest(e))?;
    
    info!("Received webhook: {}", body_str);
    
    // Parse webhook payload
    match serde_json::from_str::<serde_json::Value>(body_str) {
        Ok(payload) => {
            if let Some(entry) = payload["entry"].as_array() {
                for entry_item in entry {
                    if let Some(changes) = entry_item["changes"].as_array() {
                        for change in changes {
                            if let Some(value) = change["value"].as_object() {
                                handle_webhook_event(value).await;
                            }
                        }
                    }
                }
            }
        }
        Err(e) => {
            error!("Failed to parse webhook payload: {}", e);
        }
    }
    
    Ok(HttpResponse::Ok().json(json!({
        "status": "received"
    })))
}

/// Handle WhatsApp webhook verification
async fn webhook_verification(req: HttpRequest) -> Result<HttpResponse> {
    let query = web::Query::<std::collections::HashMap<String, String>>::from_query(req.query_string())
        .map_err(|e| actix_web::error::ErrorBadRequest(e))?;
    
    let hub_mode = query.get("hub.mode");
    let hub_challenge = query.get("hub.challenge");
    let hub_verify_token = query.get("hub.verify_token");
    
    info!("Webhook verification request: mode={:?}, challenge={:?}, verify_token={:?}", 
          hub_mode, hub_challenge, hub_verify_token);
    
    // Check if this is a subscription verification
    if hub_mode == Some(&"subscribe".to_string()) {
        // In production, verify the token matches your configured verify token
        // For testing, we'll accept any token for now
        let expected_verify_token = "verify_token_123"; // Should match frontend default
        
        if let Some(token) = hub_verify_token {
            if token == expected_verify_token {
                if let Some(challenge) = hub_challenge {
                    info!("Webhook verification successful, returning challenge: {}", challenge);
                    return Ok(HttpResponse::Ok()
                        .content_type("text/plain")
                        .body(challenge.clone()));
                }
            } else {
                error!("Invalid verify token: expected '{}', got '{}'", expected_verify_token, token);
            }
        }
    }
    
    Ok(HttpResponse::Forbidden().json(json!({
        "error": "Forbidden"
    })))
}

/// Handle incoming webhook events
async fn handle_webhook_event(value: &serde_json::Map<String, serde_json::Value>) {
    if let Some(messaging_product) = value.get("messaging_product") {
        if messaging_product == "whatsapp" {
            // Handle WhatsApp messages
            if let Some(messages) = value.get("messages").and_then(|v| v.as_array()) {
                for message in messages {
                    handle_incoming_message(message).await;
                }
            }
            
            // Handle message status updates
            if let Some(statuses) = value.get("statuses").and_then(|v| v.as_array()) {
                for status in statuses {
                    handle_message_status(status).await;
                }
            }
        }
    }
}

/// Handle incoming WhatsApp message
async fn handle_incoming_message(message: &serde_json::Value) {
    let from = message["from"].as_str().unwrap_or("unknown");
    let msg_id = message["id"].as_str().unwrap_or("unknown");
    let timestamp = message["timestamp"].as_str().unwrap_or("unknown");
    
    if let Some(text) = message["text"]["body"].as_str() {
        info!("Received text message from {}: '{}' (ID: {}, Time: {})", from, text, msg_id, timestamp);
        
        // Send automatic response
        send_auto_response(from, text).await;
        
    } else if message["type"].as_str() == Some("image") {
        info!("Received image message from {} (ID: {}, Time: {})", from, msg_id, timestamp);
        
        // Send automatic response for image
        send_auto_response(from, "🖼️ Imagem recebida!").await;
        
    } else {
        info!("Received {} message from {} (ID: {}, Time: {})", 
              message["type"].as_str().unwrap_or("unknown"), from, msg_id, timestamp);
              
        // Send automatic response for other message types
        let msg_type = message["type"].as_str().unwrap_or("unknown");
        send_auto_response(from, &format!("📱 Mensagem do tipo '{}' recebida!", msg_type)).await;
    }
    
    // TODO: Store message in database or forward to WebSocket
}

/// Send automatic response to WhatsApp message
async fn send_auto_response(to: &str, received_text: &str) {
    // Generate automatic response based on received message
    let response_text = generate_auto_response(received_text);
    
    // You would need to get the phone_number_id and access_token from your configuration
    // For this demo, we'll use environment variables or hardcoded values
    let phone_number_id = std::env::var("WHATSAPP_PHONE_NUMBER_ID")
        .unwrap_or_else(|_| "574293335763643".to_string()); // Your phone number ID from the webhook
    let access_token = std::env::var("WHATSAPP_ACCESS_TOKEN")
        .unwrap_or_else(|_| "YOUR_ACCESS_TOKEN_HERE".to_string());
    
    if access_token == "YOUR_ACCESS_TOKEN_HERE" {
        info!("⚠️ Access token not configured. Would send to {}: '{}'", to, response_text);
        return;
    }
    
    // Create official client and send response
    let config = crate::whatsapp_evolution::OfficialConfig {
        phone_number_id: phone_number_id.clone(),
        access_token: access_token.clone(),
        instance_name: "auto_responder".to_string(),
        webhook_verify_token: "verify_token_123".to_string(),
    };
    
    let client = crate::whatsapp_evolution::OfficialClient::new(config);
    
    match client.send_text_message(to, &response_text).await {
        Ok(response) => {
            if let Some(msg) = response.messages.first() {
                info!("✅ Auto-response sent to {}: '{}' (Message ID: {})", to, response_text, msg.id);
            }
        }
        Err(e) => {
            error!("❌ Failed to send auto-response to {}: {}", to, e);
        }
    }
}

/// Generate automatic response based on received message
fn generate_auto_response(received_text: &str) -> String {
    let text_lower = received_text.to_lowercase();
    
    match text_lower.as_str() {
        text if text.contains("oi") || text.contains("olá") || text.contains("hello") => {
            "👋 Olá! Obrigado por entrar em contato! Como posso ajudar você hoje?".to_string()
        }
        text if text.contains("obrigad") || text.contains("valeu") || text.contains("thanks") => {
            "😊 Por nada! Fico feliz em ajudar! Se precisar de mais alguma coisa, é só falar!".to_string()
        }
        text if text.contains("tchau") || text.contains("bye") || text.contains("até") => {
            "👋 Até logo! Tenha um ótimo dia! Se precisar, estarei aqui!".to_string()
        }
        text if text.contains("ajuda") || text.contains("help") || text.contains("dúvida") => {
            "🤖 Sou um bot automático! Posso responder mensagens simples. Para atendimento humanizado, aguarde que um de nossos atendentes entrará em contato em breve!".to_string()
        }
        text if text.contains("preço") || text.contains("valor") || text.contains("custo") => {
            "💰 Para informações sobre preços e valores, por favor aguarde que um consultor entrará em contato com você!".to_string()
        }
        text if text.contains("horário") || text.contains("funcionamento") => {
            "🕐 Nosso horário de atendimento é de segunda a sexta das 8h às 18h. Finais de semana: 9h às 12h.".to_string()
        }
        text if text.contains("testando") || text.contains("teste") => {
            "✅ Teste recebido com sucesso! O webhook está funcionando perfeitamente! 🎉".to_string()
        }
        _ => {
            format!("🤖 Recebi sua mensagem: \"{}\"\n\n📝 Esta é uma resposta automática. Um atendente real entrará em contato em breve!\n\n⏰ Tempo de resposta: até 2 horas em horário comercial.", received_text)
        }
    }
}

/// Handle message status updates
async fn handle_message_status(status: &serde_json::Value) {
    let recipient_id = status["recipient_id"].as_str().unwrap_or("unknown");
    let msg_status = status["status"].as_str().unwrap_or("unknown");
    let timestamp = status["timestamp"].as_str().unwrap_or("unknown");
    
    info!("Message status update: {} -> {} (Time: {})", recipient_id, msg_status, timestamp);
}

/// DELETE /api/v1/whatsapp/instance/:name
pub async fn delete_instance(
    manager: web::Data<WhatsAppManager>,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let instance_name = path.into_inner();
    info!("Deleting instance: {}", instance_name);
    
    let mut instances = manager.instances.write().await;
    
    match instances.remove(&instance_name) {
        Some(_) => {
            Ok(HttpResponse::Ok().json(json!({
                "message": "Instance deleted successfully",
                "instance_name": instance_name
            })))
        }
        None => {
            Ok(HttpResponse::NotFound().json(json!({
                "error": "Instance not found"
            })))
        }
    }
}