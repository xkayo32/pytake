//! WhatsApp webhook handlers
//!
//! This module handles incoming webhooks from the WhatsApp Business Platform,
//! including message reception and status updates.

use crate::{
    middleware::error_handler::{ApiError, ApiResult},
    state::AppState,
    services::whatsapp_integration::WhatsAppIntegrationService,
};
use actix_web::{web, HttpRequest, HttpResponse};
use pytake_whatsapp::{
    InboundMessage, MessageStatus, WebhookPayload, WebhookProcessor, WebhookVerification,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info, warn};

/// WhatsApp webhook verification query parameters
#[derive(Debug, Deserialize)]
pub struct WebhookVerifyQuery {
    #[serde(rename = "hub.mode")]
    pub hub_mode: String,
    #[serde(rename = "hub.verify_token")]
    pub hub_verify_token: String,
    #[serde(rename = "hub.challenge")]
    pub hub_challenge: String,
}

/// Verify WhatsApp webhook (GET request)
pub async fn verify_webhook(
    query: web::Query<WebhookVerifyQuery>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let config = &app_state.config();
    
    // Get expected verify token from config
    let expected_token = config
        .whatsapp
        .as_ref()
        .and_then(|w| w.webhook_verify_token.as_ref())
        .ok_or_else(|| ApiError::internal("WhatsApp webhook verify token not configured"))?;
    
    // Verify the webhook
    let verification = WebhookVerification {
        mode: query.hub_mode.clone(),
        token: query.hub_verify_token.clone(),
        challenge: query.hub_challenge.clone(),
    };
    
    match verification.verify(expected_token) {
        Ok(challenge) => {
            info!("WhatsApp webhook verified successfully");
            Ok(HttpResponse::Ok().body(challenge))
        }
        Err(e) => {
            warn!("WhatsApp webhook verification failed: {}", e);
            Err(ApiError::bad_request("Webhook verification failed"))
        }
    }
}

/// Process WhatsApp webhook (POST request)
pub async fn process_webhook(
    req: HttpRequest,
    body: web::Bytes,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    // Get WhatsApp client from app state
    let whatsapp_client = app_state.whatsapp_client()
        .ok_or_else(|| ApiError::internal("WhatsApp client not configured"))?;
    
    // Create integration service
    let integration_service = WhatsAppIntegrationService::new(
        app_state.clone().into_inner(),
        whatsapp_client.clone(),
    ).map_err(|e| ApiError::internal(&e.to_string()))?;
    
    // Get signature from headers
    let signature = req
        .headers()
        .get("x-hub-signature-256")
        .and_then(|h| h.to_str().ok());
    
    // Convert body to string
    let payload_str = std::str::from_utf8(&body)
        .map_err(|e| ApiError::bad_request(&format!("Invalid UTF-8 payload: {}", e)))?;
    
    // Process webhook payload
    match integration_service.process_webhook_payload(payload_str, signature).await {
        Ok(processed_messages) => {
            info!("Successfully processed {} messages from webhook", processed_messages.len());
            
            for processed in &processed_messages {
                info!("Processed message {} in conversation {} from {}", 
                      processed.message_id, 
                      processed.conversation_id, 
                      processed.contact_phone);
                
                if processed.is_new_conversation {
                    info!("Created new conversation for {}", processed.contact_phone);
                }
            }
            
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "status": "ok",
                "message": "Webhook processed successfully",
                "processed_messages": processed_messages.len()
            })))
        }
        Err(e) => {
            error!("Failed to process webhook: {}", e);
            Err(ApiError::internal(&format!("Webhook processing failed: {}", e)))
        }
    }
}

/// Process an inbound message
async fn process_inbound_message(
    message: InboundMessage,
    app_state: &web::Data<AppState>,
) -> ApiResult<()> {
    info!(
        "Processing inbound message {} from {}",
        message.id, message.from
    );
    
    // Log message type and content
    match &message.message_type {
        pytake_whatsapp::MessageType::Text { body, .. } => {
            info!("Text message: {}", body);
        }
        pytake_whatsapp::MessageType::Image { caption, .. } => {
            info!("Image message with caption: {:?}", caption);
        }
        pytake_whatsapp::MessageType::Document { filename, .. } => {
            info!("Document message: {:?}", filename);
        }
        _ => {
            info!("Message type: {:?}", message.message_type);
        }
    }
    
    // Queue message for processing
    use pytake_core::queue::{JobType, MessageContent as QueueMessageContent, QueueJob, Priority};
    
    // Convert WhatsApp message type to queue message content
    let queue_content = match &message.message_type {
        pytake_whatsapp::MessageType::Text { body, .. } => {
            QueueMessageContent::Text { body: body.clone() }
        }
        pytake_whatsapp::MessageType::Image { id, caption, .. } => {
            QueueMessageContent::Image {
                url: None, // Will be filled by media download job
                id: id.clone(),
                caption: caption.clone(),
            }
        }
        pytake_whatsapp::MessageType::Document { id, filename, caption, .. } => {
            QueueMessageContent::Document {
                url: None,
                id: id.clone(),
                filename: filename.clone(),
            }
        }
        pytake_whatsapp::MessageType::Audio { id, .. } => {
            QueueMessageContent::Audio {
                url: None,
                id: id.clone(),
            }
        }
        pytake_whatsapp::MessageType::Video { id, caption, .. } => {
            QueueMessageContent::Video {
                url: None,
                id: id.clone(),
                caption: caption.clone(),
            }
        }
        pytake_whatsapp::MessageType::Location { latitude, longitude, name, .. } => {
            QueueMessageContent::Location {
                latitude: *latitude,
                longitude: *longitude,
                name: name.clone(),
            }
        }
        _ => {
            warn!("Unsupported message type, skipping queue");
            return Ok(());
        }
    };
    
    // Create job for processing inbound message
    let job = QueueJob::new(JobType::ProcessInboundMessage {
        message_id: message.id.clone(),
        from: message.from.clone(),
        timestamp: message.timestamp,
        content: queue_content,
    })
    .with_priority(Priority::Normal);
    
    // Get queue from app state
    if let Some(queue) = app_state.queue() {
        match queue.enqueue(job).await {
            Ok(job_id) => {
                info!("Message {} queued for processing with job ID: {}", message.id, job_id);
            }
            Err(e) => {
                error!("Failed to queue message {}: {}", message.id, e);
                return Err(ApiError::internal("Failed to queue message for processing"));
            }
        }
    } else {
        warn!("Queue not configured, message {} not processed", message.id);
    }
    
    // TODO: Store message in database
    // TODO: Trigger flow engine if applicable
    // TODO: Notify agents if manual handling required
    
    Ok(())
}

/// Process a message status update
async fn process_message_status(
    status: pytake_whatsapp::MessageStatusUpdate,
    app_state: &web::Data<AppState>,
) -> ApiResult<()> {
    info!(
        "Processing status update for message {}: {:?}",
        status.id, status.status
    );
    
    // Queue status update for processing
    use pytake_core::queue::{JobType, QueueJob, Priority, MessageStatus as QueueMessageStatus};
    
    // Convert WhatsApp status to queue status
    let queue_status = match status.status {
        MessageStatus::Sent => QueueMessageStatus::Sent,
        MessageStatus::Delivered => QueueMessageStatus::Delivered,
        MessageStatus::Read => QueueMessageStatus::Read,
        MessageStatus::Failed => QueueMessageStatus::Failed,
    };
    
    // Create job for updating message status
    let job = QueueJob::new(JobType::UpdateMessageStatus {
        message_id: status.id.clone(),
        status: queue_status,
        timestamp: chrono::Utc::now(),
    })
    .with_priority(Priority::Low);
    
    // Get queue from app state
    if let Some(queue) = app_state.queue() {
        match queue.enqueue(job).await {
            Ok(job_id) => {
                info!("Status update for message {} queued with job ID: {}", status.id, job_id);
            }
            Err(e) => {
                error!("Failed to queue status update for message {}: {}", status.id, e);
            }
        }
    }
    
    // TODO: Update UI in real-time via WebSocket
    
    match status.status {
        MessageStatus::Sent => {
            info!("Message {} was sent", status.id);
        }
        MessageStatus::Delivered => {
            info!("Message {} was delivered", status.id);
        }
        MessageStatus::Read => {
            info!("Message {} was read", status.id);
        }
        MessageStatus::Failed => {
            error!("Message {} failed to send", status.id);
            // TODO: Implement retry logic
        }
    }
    
    Ok(())
}

/// Send a WhatsApp message
#[derive(Debug, Deserialize, Serialize)]
pub struct SendMessageRequest {
    /// Recipient phone number (with country code)
    pub to: String,
    
    /// Message type and content
    #[serde(flatten)]
    pub message: MessageContent,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum MessageContent {
    Text {
        body: String,
        preview_url: Option<bool>,
    },
    Image {
        #[serde(flatten)]
        media: MediaContent,
        caption: Option<String>,
    },
    Document {
        #[serde(flatten)]
        media: MediaContent,
        caption: Option<String>,
        filename: Option<String>,
    },
    Template {
        name: String,
        language_code: String,
        components: Option<Vec<serde_json::Value>>,
    },
}

#[derive(Debug, Deserialize, Serialize)]
pub struct MediaContent {
    /// Either URL or media ID must be provided
    pub url: Option<String>,
    pub id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SendMessageResponse {
    pub message_id: String,
    pub status: String,
}

/// Send a WhatsApp message
pub async fn send_message(
    app_state: web::Data<AppState>,
    data: web::Json<SendMessageRequest>,
) -> ApiResult<HttpResponse> {
    let request = data.into_inner();
    
    // Get WhatsApp client from app state
    let whatsapp_client = app_state
        .whatsapp_client()
        .ok_or_else(|| ApiError::internal("WhatsApp client not configured"))?;
    
    // Validate phone number
    if !pytake_whatsapp::is_valid_phone_number(&request.to) {
        return Err(ApiError::bad_request("Invalid phone number format"));
    }
    
    // Send message based on type
    let message_id = match request.message {
        MessageContent::Text { body, preview_url } => {
            let mut message = pytake_whatsapp::TextMessage::new(body);
            if let Some(preview) = preview_url {
                message = message.with_preview_url(preview);
            }
            
            whatsapp_client
                .send_text_message(&request.to, message)
                .await
                .map_err(|e| ApiError::internal(&format!("Failed to send message: {}", e)))?
        }
        MessageContent::Image { media, caption } => {
            let image = if let Some(url) = media.url {
                pytake_whatsapp::Media::from_url(url)
            } else if let Some(id) = media.id {
                pytake_whatsapp::Media::from_id(id)
            } else {
                return Err(ApiError::bad_request("Image URL or ID is required"));
            };
            
            let message = pytake_whatsapp::ImageMessage {
                image,
                caption,
            };
            
            whatsapp_client
                .send_image_message(&request.to, message)
                .await
                .map_err(|e| ApiError::internal(&format!("Failed to send image: {}", e)))?
        }
        MessageContent::Document { media, caption, filename } => {
            let document = if let Some(url) = media.url {
                pytake_whatsapp::Media::from_url(url)
            } else if let Some(id) = media.id {
                pytake_whatsapp::Media::from_id(id)
            } else {
                return Err(ApiError::bad_request("Document URL or ID is required"));
            };
            
            let message = pytake_whatsapp::DocumentMessage {
                document,
                caption,
                filename,
            };
            
            whatsapp_client
                .send_document_message(&request.to, message)
                .await
                .map_err(|e| ApiError::internal(&format!("Failed to send document: {}", e)))?
        }
        MessageContent::Template { name, language_code, components } => {
            let mut template = pytake_whatsapp::TemplateMessage::new(name, language_code);
            
            if let Some(components) = components {
                // TODO: Parse components properly
                // For now, we'll skip component handling
            }
            
            whatsapp_client
                .send_template_message(&request.to, template)
                .await
                .map_err(|e| ApiError::internal(&format!("Failed to send template: {}", e)))?
        }
    };
    
    // Queue message for tracking
    use pytake_core::queue::{JobType, MessageContent as QueueMessageContent, QueueJob, Priority};
    
    // Convert API message content to queue message content
    let queue_content = match request.message {
        MessageContent::Text { ref body, .. } => {
            QueueMessageContent::Text { body: body.clone() }
        }
        MessageContent::Image { ref media, ref caption } => {
            QueueMessageContent::Image {
                url: media.url.clone(),
                id: media.id.clone(),
                caption: caption.clone(),
            }
        }
        MessageContent::Document { ref media, ref caption, ref filename } => {
            QueueMessageContent::Document {
                url: media.url.clone(),
                id: media.id.clone(),
                filename: filename.clone(),
            }
        }
        MessageContent::Template { ref name, ref language_code, ref components } => {
            QueueMessageContent::Template {
                name: name.clone(),
                language: language_code.clone(),
                components: serde_json::json!(components),
            }
        }
    };
    
    // Store sent message info (no need to queue outbound messages that we just sent)
    info!("Message {} sent to {}", message_id, request.to);
    
    // TODO: Store message in database with sent status
    
    Ok(HttpResponse::Ok().json(SendMessageResponse {
        message_id,
        status: "sent".to_string(),
    }))
}

/// Upload media to WhatsApp
#[derive(Debug, Serialize)]
pub struct UploadMediaResponse {
    pub media_id: String,
}

/// Upload media endpoint
pub async fn upload_media(
    app_state: web::Data<AppState>,
    mut payload: actix_multipart::Multipart,
) -> ApiResult<HttpResponse> {
    use futures_util::StreamExt;
    
    // Get WhatsApp client
    let whatsapp_client = app_state
        .whatsapp_client()
        .ok_or_else(|| ApiError::internal("WhatsApp client not configured"))?;
    
    // Process multipart upload
    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|e| ApiError::bad_request(&format!("Invalid upload: {}", e)))?;
        
        // Get field name
        let content_disposition = field.content_disposition();
        let field_name = content_disposition
            .get_name()
            .ok_or_else(|| ApiError::bad_request("Missing field name"))?;
        
        if field_name == "file" {
            // Get filename
            let filename = content_disposition
                .get_filename()
                .ok_or_else(|| ApiError::bad_request("Missing filename"))?
                .to_string();
            
            // Collect file bytes
            let mut file_bytes = Vec::new();
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(|e| ApiError::bad_request(&format!("Upload error: {}", e)))?;
                file_bytes.extend_from_slice(&data);
            }
            
            // Upload to WhatsApp
            let media_id = whatsapp_client
                .upload_media_from_bytes(&file_bytes, &filename)
                .await
                .map_err(|e| ApiError::internal(&format!("Failed to upload media: {}", e)))?;
            
            return Ok(HttpResponse::Ok().json(UploadMediaResponse { media_id }));
        }
    }
    
    Err(ApiError::bad_request("No file uploaded"))
}