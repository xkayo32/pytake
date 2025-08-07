use actix_web::{web, HttpResponse, HttpRequest};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    #[serde(rename = "contactName")]
    pub contact_name: String,
    #[serde(rename = "contactPhone")]
    pub contact_phone: String,
    #[serde(rename = "lastMessage")]
    pub last_message: String,
    #[serde(rename = "lastMessageTime")]
    pub last_message_time: String,
    pub status: String,
    #[serde(rename = "assignedTo")]
    pub assigned_to: Option<String>,
    pub platform: String,
    #[serde(rename = "unreadCount")]
    pub unread_count: u32,
    pub priority: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    #[serde(rename = "conversationId")]
    pub conversation_id: String,
    pub content: String,
    pub timestamp: String,
    #[serde(rename = "isFromCustomer")]
    pub is_from_customer: bool,
    pub status: String,
    #[serde(rename = "mediaUrl")]
    pub media_url: Option<String>,
}

pub struct ConversationStorage {
    conversations: Mutex<Vec<Conversation>>,
    messages: Mutex<Vec<Message>>,
}

impl ConversationStorage {
    pub fn new() -> Self {
        Self {
            conversations: Mutex::new(vec![]),
            messages: Mutex::new(vec![]),
        }
    }
}

pub async fn get_agent_conversations(
    _req: HttpRequest,
    storage: web::Data<std::sync::Arc<ConversationStorage>>,
) -> Result<HttpResponse, actix_web::Error> {
    let conversations = storage.conversations.lock().unwrap();
    Ok(HttpResponse::Ok().json(&*conversations))
}

pub async fn get_conversation_messages(
    path: web::Path<String>,
    storage: web::Data<std::sync::Arc<ConversationStorage>>,
) -> Result<HttpResponse, actix_web::Error> {
    let conversation_id = path.into_inner();
    let messages = storage.messages.lock().unwrap();
    
    let conversation_messages: Vec<&Message> = messages
        .iter()
        .filter(|m| m.conversation_id == conversation_id)
        .collect();
    
    Ok(HttpResponse::Ok().json(&conversation_messages))
}

pub async fn assign_conversation(
    path: web::Path<String>,
    _req: HttpRequest,
    storage: web::Data<std::sync::Arc<ConversationStorage>>,
) -> Result<HttpResponse, actix_web::Error> {
    let conversation_id = path.into_inner();
    let mut conversations = storage.conversations.lock().unwrap();
    
    if let Some(conversation) = conversations.iter_mut().find(|c| c.id == conversation_id) {
        conversation.status = "in_progress".to_string();
        conversation.assigned_to = Some("current_agent_id".to_string()); // TODO: Get from JWT
        Ok(HttpResponse::Ok().json(&serde_json::json!({
            "success": true,
            "message": "Conversation assigned successfully"
        })))
    } else {
        Ok(HttpResponse::NotFound().json(&serde_json::json!({
            "error": "Conversation not found"
        })))
    }
}

pub async fn resolve_conversation(
    path: web::Path<String>,
    _req: HttpRequest,
    storage: web::Data<std::sync::Arc<ConversationStorage>>,
) -> Result<HttpResponse, actix_web::Error> {
    let conversation_id = path.into_inner();
    let mut conversations = storage.conversations.lock().unwrap();
    
    if let Some(conversation) = conversations.iter_mut().find(|c| c.id == conversation_id) {
        conversation.status = "resolved".to_string();
        Ok(HttpResponse::Ok().json(&serde_json::json!({
            "success": true,
            "message": "Conversation resolved successfully"
        })))
    } else {
        Ok(HttpResponse::NotFound().json(&serde_json::json!({
            "error": "Conversation not found"
        })))
    }
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg
        .route("/conversations/agent", web::get().to(get_agent_conversations))
        .route("/conversations/{id}/messages", web::get().to(get_conversation_messages))
        .route("/conversations/{id}/assign", web::post().to(assign_conversation))
        .route("/conversations/{id}/resolve", web::post().to(resolve_conversation));
}