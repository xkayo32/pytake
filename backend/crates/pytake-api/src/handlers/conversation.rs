//! Conversation management handlers

use crate::{
    middleware::error_handler::{ApiError, ApiResult},
    state::AppState,
};
use actix_web::{web, HttpResponse};
use pytake_db::repositories::{
    conversation::{ConversationRepository},
    message::{MessageRepository, CreateMessage},
    PaginationParams,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Get conversations list
#[derive(Debug, Deserialize)]
pub struct GetConversationsQuery {
    #[serde(default = "default_page")]
    pub page: u64,
    #[serde(default = "default_per_page")]
    pub per_page: u64,
    pub status: Option<String>,
    pub assigned_to: Option<Uuid>,
    pub search: Option<String>,
}

fn default_page() -> u64 { 1 }
fn default_per_page() -> u64 { 20 }

/// Get conversations list
pub async fn get_conversations(
    app_state: web::Data<AppState>,
    query: web::Query<GetConversationsQuery>,
) -> ApiResult<HttpResponse> {
    let db = app_state.db.as_ref();
    let repo = ConversationRepository::new(db);
    
    let pagination = PaginationParams::new(query.page, query.per_page);
    
    // Apply filters based on query parameters
    let conversations = if let Some(search) = &query.search {
        repo.search(search, pagination.limit(), pagination.offset()).await
    } else if let Some(user_id) = query.assigned_to {
        repo.get_by_user(user_id, pagination.limit(), pagination.offset()).await
    } else if query.status.as_deref() == Some("unassigned") {
        repo.get_unassigned(pagination.limit(), pagination.offset()).await
    } else {
        repo.get_active(pagination.limit(), pagination.offset()).await
    }
    .map_err(|e| ApiError::internal(&format!("Failed to fetch conversations: {}", e)))?;
    
    // Get total count
    let total = if query.status.as_deref() == Some("unassigned") {
        repo.count_unassigned().await
    } else {
        repo.count_active().await
    }
    .map_err(|e| ApiError::internal(&format!("Failed to count conversations: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "conversations": conversations,
        "pagination": {
            "page": query.page,
            "per_page": query.per_page,
            "total": total,
            "total_pages": (total + query.per_page - 1) / query.per_page,
        }
    })))
}

/// Get single conversation
pub async fn get_conversation(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> ApiResult<HttpResponse> {
    let conversation_id = path.into_inner();
    let db = app_state.db.as_ref();
    let repo = ConversationRepository::new(db);
    
    let conversation = repo.find_by_id(conversation_id).await
        .map_err(|e| ApiError::internal(&format!("Failed to fetch conversation: {}", e)))?
        .ok_or_else(|| ApiError::not_found("Conversation not found"))?;
    
    Ok(HttpResponse::Ok().json(conversation))
}

/// Update conversation
#[derive(Debug, Deserialize)]
pub struct UpdateConversationRequest {
    pub status: Option<String>,
    pub assigned_user_id: Option<Uuid>,
    pub tags: Option<Vec<String>>,
}

pub async fn update_conversation(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
    data: web::Json<UpdateConversationRequest>,
) -> ApiResult<HttpResponse> {
    let conversation_id = path.into_inner();
    let db = app_state.db.as_ref();
    let repo = ConversationRepository::new(db);
    
    // Update status if provided
    let mut conversation = if let Some(status) = &data.status {
        repo.update_status(conversation_id, status).await
            .map_err(|e| ApiError::internal(&format!("Failed to update status: {}", e)))?
    } else {
        repo.find_by_id(conversation_id).await
            .map_err(|e| ApiError::internal(&format!("Failed to fetch conversation: {}", e)))?
            .ok_or_else(|| ApiError::not_found("Conversation not found"))?
    };
    
    // Update assignment if provided
    if let Some(user_id) = data.assigned_user_id {
        conversation = repo.assign(conversation_id, user_id).await
            .map_err(|e| ApiError::internal(&format!("Failed to assign conversation: {}", e)))?;
    }
    
    Ok(HttpResponse::Ok().json(conversation))
}

/// Assign conversation to user
#[derive(Debug, Deserialize)]
pub struct AssignConversationRequest {
    pub user_id: Uuid,
}

pub async fn assign_conversation(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
    data: web::Json<AssignConversationRequest>,
) -> ApiResult<HttpResponse> {
    let conversation_id = path.into_inner();
    let db = app_state.db.as_ref();
    let repo = ConversationRepository::new(db);
    
    let conversation = repo.assign(conversation_id, data.user_id).await
        .map_err(|e| ApiError::internal(&format!("Failed to assign conversation: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(conversation))
}

/// Unassign conversation
pub async fn unassign_conversation(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> ApiResult<HttpResponse> {
    let conversation_id = path.into_inner();
    let db = app_state.db.as_ref();
    let repo = ConversationRepository::new(db);
    
    let conversation = repo.unassign(conversation_id).await
        .map_err(|e| ApiError::internal(&format!("Failed to unassign conversation: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(conversation))
}

/// Archive conversation
pub async fn archive_conversation(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> ApiResult<HttpResponse> {
    let conversation_id = path.into_inner();
    let db = app_state.db.as_ref();
    let repo = ConversationRepository::new(db);
    
    let conversation = repo.archive(conversation_id).await
        .map_err(|e| ApiError::internal(&format!("Failed to archive conversation: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(conversation))
}

/// Get conversation messages
#[derive(Debug, Deserialize)]
pub struct GetMessagesQuery {
    #[serde(default = "default_page")]
    pub page: u64,
    #[serde(default = "default_per_page")]
    pub per_page: u64,
}

pub async fn get_conversation_messages(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
    query: web::Query<GetMessagesQuery>,
) -> ApiResult<HttpResponse> {
    let conversation_id = path.into_inner();
    let db = app_state.db.as_ref();
    let message_repo = MessageRepository::new(db);
    
    let pagination = PaginationParams::new(query.page, query.per_page);
    
    let messages = message_repo
        .get_by_conversation(conversation_id, pagination.limit(), pagination.offset())
        .await
        .map_err(|e| ApiError::internal(&format!("Failed to fetch messages: {}", e)))?;
    
    let total = message_repo
        .count_by_conversation(conversation_id)
        .await
        .map_err(|e| ApiError::internal(&format!("Failed to count messages: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "messages": messages,
        "pagination": {
            "page": query.page,
            "per_page": query.per_page,
            "total": total,
            "total_pages": (total + query.per_page - 1) / query.per_page,
        }
    })))
}

/// Send message in conversation
#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub content: serde_json::Value,
    pub message_type: String,
    pub reply_to_message_id: Option<Uuid>,
}

pub async fn send_message(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
    data: web::Json<SendMessageRequest>,
) -> ApiResult<HttpResponse> {
    let conversation_id = path.into_inner();
    let db = app_state.db.as_ref();
    
    // Get conversation to get phone number
    let conv_repo = ConversationRepository::new(db);
    let conversation = conv_repo.find_by_id(conversation_id).await
        .map_err(|e| ApiError::internal(&format!("Failed to fetch conversation: {}", e)))?
        .ok_or_else(|| ApiError::not_found("Conversation not found"))?;
    
    // Get WhatsApp phone number from config
    let whatsapp_phone = app_state.config().whatsapp
        .as_ref()
        .and_then(|w| w.phone_number_id.as_ref())
        .ok_or_else(|| ApiError::internal("WhatsApp not configured"))?;
    
    // Create message record
    let message_repo = MessageRepository::new(db);
    let whatsapp_message_id = format!("wamid.{}", Uuid::new_v4()); // Temporary ID
    
    let message = message_repo.create(CreateMessage {
        whatsapp_message_id: whatsapp_message_id.clone(),
        conversation_id,
        direction: "outbound".to_string(),
        from_phone_number: whatsapp_phone.clone(),
        to_phone_number: conversation.contact_phone_number.clone(),
        message_type: data.message_type.clone(),
        content: data.content.clone(),
        status: Some("pending".to_string()),
        sent_at: None,
        reply_to_message_id: data.reply_to_message_id,
        media_id: None,
        media_url: None,
        media_mime_type: None,
        media_size: None,
        metadata: None,
    }).await
        .map_err(|e| ApiError::internal(&format!("Failed to create message: {}", e)))?;
    
    // Queue message for sending via WhatsApp
    use pytake_core::queue::{JobType, MessageContent as QueueMessageContent, QueueJob, Priority};
    
    let queue_content = match data.message_type.as_str() {
        "text" => QueueMessageContent::Text {
            body: data.content.get("body")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
        },
        _ => {
            return Err(ApiError::bad_request("Unsupported message type"));
        }
    };
    
    if let Some(queue) = app_state.queue() {
        let job = QueueJob::new(JobType::SendMessage {
            to: conversation.contact_phone_number,
            content: queue_content,
            retry_count: 0,
        })
        .with_priority(Priority::Normal)
        .with_metadata("message_id".to_string(), serde_json::json!(message.id.to_string()));
        
        queue.enqueue(job).await
            .map_err(|e| ApiError::internal(&format!("Failed to queue message: {}", e)))?;
    }
    
    // Update conversation last message
    conv_repo.update_last_message(conversation_id, whatsapp_phone).await
        .map_err(|e| ApiError::internal(&format!("Failed to update conversation: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(message))
}

/// Get conversation statistics
pub async fn get_conversation_stats(
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let db = app_state.db.as_ref();
    let repo = ConversationRepository::new(db);
    
    let active_count = repo.count_active().await
        .map_err(|e| ApiError::internal(&format!("Failed to count active conversations: {}", e)))?;
    
    let unassigned_count = repo.count_unassigned().await
        .map_err(|e| ApiError::internal(&format!("Failed to count unassigned conversations: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "stats": {
            "active": active_count,
            "unassigned": unassigned_count,
            "assigned": active_count - unassigned_count,
        }
    })))
}