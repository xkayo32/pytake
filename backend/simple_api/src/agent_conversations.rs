use actix_web::{web, HttpRequest, HttpResponse, Result, HttpMessage};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::sync::Mutex;
use chrono::{DateTime, Utc};
use tracing::info;
use uuid::Uuid;
use crate::auth::Claims;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub contact_name: String,
    pub contact_phone: String,
    pub last_message: String,
    pub last_message_time: String,
    pub status: ConversationStatus,
    pub assigned_to: Option<String>,
    pub platform: String,
    pub unread_count: u32,
    pub priority: Priority,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConversationStatus {
    Waiting,
    InProgress,
    Resolved,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Priority {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub content: String,
    pub timestamp: String,
    pub is_from_customer: bool,
    pub status: MessageStatus,
    pub media_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageStatus {
    Sent,
    Delivered,
    Read,
}

pub struct ConversationStorage {
    pub conversations: Mutex<Vec<Conversation>>,
    pub messages: Mutex<Vec<Message>>,
}

impl ConversationStorage {
    pub fn new() -> Self {
        // Create some mock data
        let conversations = vec![
            Conversation {
                id: Uuid::new_v4().to_string(),
                contact_name: "João Silva".to_string(),
                contact_phone: "+5511999887766".to_string(),
                last_message: "Olá, preciso de ajuda com meu pedido".to_string(),
                last_message_time: "10:30".to_string(),
                status: ConversationStatus::Waiting,
                assigned_to: None,
                platform: "whatsapp".to_string(),
                unread_count: 2,
                priority: Priority::High,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            Conversation {
                id: Uuid::new_v4().to_string(),
                contact_name: "Maria Santos".to_string(),
                contact_phone: "+5511888776655".to_string(),
                last_message: "Quando vocês abrem?".to_string(),
                last_message_time: "09:45".to_string(),
                status: ConversationStatus::Waiting,
                assigned_to: None,
                platform: "whatsapp".to_string(),
                unread_count: 1,
                priority: Priority::Medium,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
        ];
        
        let messages = vec![
            Message {
                id: Uuid::new_v4().to_string(),
                conversation_id: conversations[0].id.clone(),
                content: "Olá, preciso de ajuda com meu pedido".to_string(),
                timestamp: "10:30".to_string(),
                is_from_customer: true,
                status: MessageStatus::Read,
                media_url: None,
            },
            Message {
                id: Uuid::new_v4().to_string(),
                conversation_id: conversations[0].id.clone(),
                content: "O pedido #12345 está com status errado".to_string(),
                timestamp: "10:31".to_string(),
                is_from_customer: true,
                status: MessageStatus::Read,
                media_url: None,
            },
        ];
        
        Self {
            conversations: Mutex::new(conversations),
            messages: Mutex::new(messages),
        }
    }
}

// Get conversations for agent
pub async fn get_agent_conversations(
    req: HttpRequest,
    storage: web::Data<ConversationStorage>,
) -> Result<HttpResponse> {
    info!("Getting agent conversations");
    
    // Extract agent ID from JWT
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    let agent_id = &claims.sub;
    
    let conversations = storage.conversations.lock().unwrap();
    
    // Filter conversations based on agent's view
    // Agents can see: waiting conversations and their assigned conversations
    let agent_conversations: Vec<Conversation> = conversations
        .iter()
        .filter(|conv| {
            matches!(conv.status, ConversationStatus::Waiting) ||
            (conv.assigned_to.as_ref() == Some(agent_id))
        })
        .cloned()
        .collect();
    
    Ok(HttpResponse::Ok().json(agent_conversations))
}

// Get messages for a conversation
pub async fn get_conversation_messages(
    path: web::Path<String>,
    storage: web::Data<ConversationStorage>,
) -> Result<HttpResponse> {
    let conversation_id = path.into_inner();
    info!("Getting messages for conversation: {}", conversation_id);
    
    let messages = storage.messages.lock().unwrap();
    
    let conversation_messages: Vec<Message> = messages
        .iter()
        .filter(|msg| msg.conversation_id == conversation_id)
        .cloned()
        .collect();
    
    Ok(HttpResponse::Ok().json(conversation_messages))
}

// Assign conversation to agent
pub async fn assign_conversation(
    req: HttpRequest,
    path: web::Path<String>,
    storage: web::Data<ConversationStorage>,
) -> Result<HttpResponse> {
    let conversation_id = path.into_inner();
    info!("Assigning conversation: {}", conversation_id);
    
    // Extract agent ID from JWT
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    let agent_id = &claims.sub;
    
    let mut conversations = storage.conversations.lock().unwrap();
    
    // Find and update conversation
    if let Some(conv) = conversations.iter_mut().find(|c| c.id == conversation_id) {
        if matches!(conv.status, ConversationStatus::Waiting) {
            conv.assigned_to = Some(agent_id.clone());
            conv.status = ConversationStatus::InProgress;
            conv.updated_at = Utc::now();
            
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "message": "Conversation assigned successfully",
                "conversation_id": conversation_id,
                "agent_id": agent_id
            })))
        } else {
            Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "success": false,
                "error": "Conversation is already assigned"
            })))
        }
    } else {
        Ok(HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": "Conversation not found"
        })))
    }
}

// Resolve conversation
pub async fn resolve_conversation(
    req: HttpRequest,
    path: web::Path<String>,
    storage: web::Data<ConversationStorage>,
) -> Result<HttpResponse> {
    let conversation_id = path.into_inner();
    info!("Resolving conversation: {}", conversation_id);
    
    // Extract agent ID from JWT
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    let agent_id = &claims.sub;
    
    let mut conversations = storage.conversations.lock().unwrap();
    
    // Find and update conversation
    if let Some(conv) = conversations.iter_mut().find(|c| c.id == conversation_id) {
        if conv.assigned_to.as_ref() == Some(agent_id) {
            conv.status = ConversationStatus::Resolved;
            conv.updated_at = Utc::now();
            
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "message": "Conversation resolved successfully"
            })))
        } else {
            Ok(HttpResponse::Forbidden().json(serde_json::json!({
                "success": false,
                "error": "You can only resolve conversations assigned to you"
            })))
        }
    } else {
        Ok(HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": "Conversation not found"
        })))
    }
}

// Send message
#[derive(Deserialize)]
pub struct SendMessageRequest {
    pub content: String,
}

pub async fn send_message(
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<SendMessageRequest>,
    storage: web::Data<ConversationStorage>,
) -> Result<HttpResponse> {
    let conversation_id = path.into_inner();
    info!("Sending message to conversation: {}", conversation_id);
    
    // Extract agent ID from JWT
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    let agent_id = &claims.sub;
    
    let conversations = storage.conversations.lock().unwrap();
    
    // Check if agent is assigned to this conversation
    if let Some(conv) = conversations.iter().find(|c| c.id == conversation_id) {
        if conv.assigned_to.as_ref() != Some(agent_id) {
            return Ok(HttpResponse::Forbidden().json(serde_json::json!({
                "success": false,
                "error": "You can only send messages to conversations assigned to you"
            })));
        }
        
        // Create new message
        let new_message = Message {
            id: Uuid::new_v4().to_string(),
            conversation_id: conversation_id.clone(),
            content: body.content.clone(),
            timestamp: chrono::Local::now().format("%H:%M").to_string(),
            is_from_customer: false,
            status: MessageStatus::Sent,
            media_url: None,
        };
        
        let mut messages = storage.messages.lock().unwrap();
        messages.push(new_message.clone());
        
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": new_message
        })))
    } else {
        Ok(HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": "Conversation not found"
        })))
    }
}

// Configure routes
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/conversations")
            .route("/agent", web::get().to(get_agent_conversations))
            .route("/{id}/messages", web::get().to(get_conversation_messages))
            .route("/{id}/assign", web::post().to(assign_conversation))
            .route("/{id}/resolve", web::post().to(resolve_conversation))
            .route("/{id}/send", web::post().to(send_message))
    );
}