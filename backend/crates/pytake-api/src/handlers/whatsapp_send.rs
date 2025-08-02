//! WhatsApp message sending handlers
//! 
//! This module handles outbound message sending via WhatsApp Business API

use crate::{
    middleware::error_handler::{ApiError, ApiResult},
    state::AppState,
    services::whatsapp_integration::WhatsAppIntegrationService,
};
use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use tracing::{info, error};
use uuid::Uuid;

/// Send message request payload
#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub conversation_id: Uuid,
    pub content: String,
    pub message_type: Option<String>, // defaults to "text"
}

/// Send message response
#[derive(Debug, Serialize)]
pub struct SendMessageResponse {
    pub success: bool,
    pub message_id: String,
    pub whatsapp_message_id: String,
    pub status: String,
}

/// Send a message via WhatsApp
pub async fn send_message(
    req: web::Json<SendMessageRequest>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let request = req.into_inner();
    
    info!("Sending WhatsApp message to conversation {}: {}", 
          request.conversation_id, request.content);

    // Get WhatsApp client from app state
    let whatsapp_client = app_state.whatsapp_client()
        .ok_or_else(|| ApiError::internal("WhatsApp client not configured"))?;
    
    // Create integration service
    let integration_service = WhatsAppIntegrationService::new(
        app_state.clone().into_inner(),
        whatsapp_client.clone(),
    ).map_err(|e| ApiError::internal(&e.to_string()))?;
    
    // Send message
    let message_type = request.message_type.as_deref().unwrap_or("text");
    
    match integration_service.send_message(
        request.conversation_id,
        &request.content,
        message_type,
    ).await {
        Ok(response) => {
            info!("Message sent successfully via WhatsApp: {:?}", response);
            
            Ok(HttpResponse::Ok().json(SendMessageResponse {
                success: true,
                message_id: response.messages[0].id.clone(),
                whatsapp_message_id: response.messages[0].id.clone(),
                status: "sent".to_string(),
            }))
        }
        Err(e) => {
            error!("Failed to send WhatsApp message: {}", e);
            Err(ApiError::internal(&format!("Failed to send message: {}", e)))
        }
    }
}

/// Send message to phone number directly (for testing/admin use)
#[derive(Debug, Deserialize)]
pub struct SendDirectMessageRequest {
    pub phone_number: String,
    pub content: String,
    pub message_type: Option<String>,
}

/// Send a message directly to a phone number
pub async fn send_direct_message(
    req: web::Json<SendDirectMessageRequest>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let request = req.into_inner();
    
    info!("Sending direct WhatsApp message to {}: {}", 
          request.phone_number, request.content);

    // Get WhatsApp client from app state
    let whatsapp_client = app_state.whatsapp_client()
        .ok_or_else(|| ApiError::internal("WhatsApp client not configured"))?;
    
    // Send message directly via WhatsApp client
    let message_type = request.message_type.as_deref().unwrap_or("text");
    
    let response = match message_type {
        "text" => {
            whatsapp_client
                .send_text_message(&request.phone_number, &request.content)
                .await
                .map_err(|e| ApiError::internal(&format!("WhatsApp API error: {}", e)))?
        }
        _ => {
            return Err(ApiError::bad_request(&format!("Unsupported message type: {}", message_type)));
        }
    };

    info!("Direct message sent successfully: {:?}", response);
    
    Ok(HttpResponse::Ok().json(SendMessageResponse {
        success: true,
        message_id: response.messages[0].id.clone(),
        whatsapp_message_id: response.messages[0].id.clone(),
        status: "sent".to_string(),
    }))
}

/// Bulk send messages request
#[derive(Debug, Deserialize)]
pub struct BulkSendRequest {
    pub messages: Vec<BulkMessageItem>,
}

#[derive(Debug, Deserialize)]
pub struct BulkMessageItem {
    pub phone_number: String,
    pub content: String,
    pub message_type: Option<String>,
}

/// Bulk send response
#[derive(Debug, Serialize)]
pub struct BulkSendResponse {
    pub total_sent: usize,
    pub successful: Vec<BulkMessageResult>,
    pub failed: Vec<BulkMessageError>,
}

#[derive(Debug, Serialize)]
pub struct BulkMessageResult {
    pub phone_number: String,
    pub message_id: String,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct BulkMessageError {
    pub phone_number: String,
    pub error: String,
}

/// Send messages to multiple phone numbers
pub async fn bulk_send_messages(
    req: web::Json<BulkSendRequest>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let request = req.into_inner();
    
    info!("Bulk sending {} WhatsApp messages", request.messages.len());

    // Get WhatsApp client from app state
    let whatsapp_client = app_state.whatsapp_client()
        .ok_or_else(|| ApiError::internal("WhatsApp client not configured"))?;
    
    let mut successful = Vec::new();
    let mut failed = Vec::new();

    for message_item in request.messages {
        let message_type = message_item.message_type.as_deref().unwrap_or("text");
        
        match message_type {
            "text" => {
                match whatsapp_client
                    .send_text_message(&message_item.phone_number, &message_item.content)
                    .await
                {
                    Ok(response) => {
                        successful.push(BulkMessageResult {
                            phone_number: message_item.phone_number,
                            message_id: response.messages[0].id.clone(),
                            status: "sent".to_string(),
                        });
                    }
                    Err(e) => {
                        failed.push(BulkMessageError {
                            phone_number: message_item.phone_number,
                            error: e.to_string(),
                        });
                    }
                }
            }
            _ => {
                failed.push(BulkMessageError {
                    phone_number: message_item.phone_number,
                    error: format!("Unsupported message type: {}", message_type),
                });
            }
        }
    }

    info!("Bulk send completed: {} successful, {} failed", 
          successful.len(), failed.len());
    
    Ok(HttpResponse::Ok().json(BulkSendResponse {
        total_sent: successful.len(),
        successful,
        failed,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_send_message_request_deserialization() {
        let json = r#"{
            "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
            "content": "Hello World",
            "message_type": "text"
        }"#;
        
        let request: SendMessageRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.content, "Hello World");
        assert_eq!(request.message_type, Some("text".to_string()));
    }
    
    #[test]
    fn test_bulk_send_request_deserialization() {
        let json = r#"{
            "messages": [
                {
                    "phone_number": "1234567890",
                    "content": "Hello",
                    "message_type": "text"
                }
            ]
        }"#;
        
        let request: BulkSendRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.messages.len(), 1);
        assert_eq!(request.messages[0].phone_number, "1234567890");
    }
}