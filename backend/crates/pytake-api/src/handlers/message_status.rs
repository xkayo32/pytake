//! Message status tracking handlers

use crate::error::ApiResult;
use crate::state::AppState;
use crate::auth::UserId;
use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use pytake_db::repositories::message::{MessageRepository, MessageStatus as DbMessageStatus};
use pytake_core::services::message_status::{DeliveryReport, DeliveryMetrics};
use tracing::{info, error};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Deserialize)]
pub struct GetStatusQuery {
    pub include_history: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct MessageStatusResponse {
    pub message_id: Uuid,
    pub conversation_id: Uuid,
    pub status: String,
    pub sent_at: Option<DateTime<Utc>>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub read_at: Option<DateTime<Utc>>,
    pub failed_at: Option<DateTime<Utc>>,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub history: Vec<StatusHistoryItem>,
}

#[derive(Debug, Serialize)]
pub struct StatusHistoryItem {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct RetryMessageRequest {
    pub message_ids: Vec<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct RetryMessageResponse {
    pub retried: Vec<Uuid>,
    pub failed: Vec<RetryFailure>,
}

#[derive(Debug, Serialize)]
pub struct RetryFailure {
    pub message_id: Uuid,
    pub reason: String,
}

/// Get message status
pub async fn get_message_status(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
    query: web::Query<GetStatusQuery>,
    _user_id: UserId,
) -> ApiResult<HttpResponse> {
    let message_id = path.into_inner();
    let include_history = query.include_history.unwrap_or(false);
    
    let msg_repo = MessageRepository::new(&app_state.db);
    
    match msg_repo.find_by_id(message_id).await? {
        Some(message) => {
            let mut history = vec![];
            
            if include_history {
                // Get status history from database
                let status_history = msg_repo.get_status_history(message_id).await?;
                history = status_history.into_iter()
                    .map(|h| StatusHistoryItem {
                        status: h.status,
                        timestamp: h.created_at,
                        details: h.details,
                    })
                    .collect();
            }
            
            let response = MessageStatusResponse {
                message_id: message.id,
                conversation_id: message.conversation_id,
                status: message.status.unwrap_or_else(|| "unknown".to_string()),
                sent_at: message.sent_at,
                delivered_at: message.delivered_at,
                read_at: message.read_at,
                failed_at: message.failed_at,
                error_code: message.error_code,
                error_message: message.error_message,
                history,
            };
            
            Ok(HttpResponse::Ok().json(response))
        }
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Message not found"
        }))),
    }
}

/// Get conversation message statuses
pub async fn get_conversation_statuses(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
    _user_id: UserId,
) -> ApiResult<HttpResponse> {
    let conversation_id = path.into_inner();
    
    let msg_repo = MessageRepository::new(&app_state.db);
    let messages = msg_repo.get_by_conversation(conversation_id, 100, 0).await?;
    
    let statuses: Vec<MessageStatusResponse> = messages.into_iter()
        .map(|msg| MessageStatusResponse {
            message_id: msg.id,
            conversation_id: msg.conversation_id,
            status: msg.status.unwrap_or_else(|| "unknown".to_string()),
            sent_at: msg.sent_at,
            delivered_at: msg.delivered_at,
            read_at: msg.read_at,
            failed_at: msg.failed_at,
            error_code: msg.error_code,
            error_message: msg.error_message,
            history: vec![],
        })
        .collect();
    
    Ok(HttpResponse::Ok().json(statuses))
}

/// Retry failed messages
pub async fn retry_failed_messages(
    app_state: web::Data<AppState>,
    data: web::Json<RetryMessageRequest>,
    _user_id: UserId,
) -> ApiResult<HttpResponse> {
    let request = data.into_inner();
    let msg_repo = MessageRepository::new(&app_state.db);
    
    let mut retried = vec![];
    let mut failed = vec![];
    
    for message_id in request.message_ids {
        match msg_repo.find_by_id(message_id).await? {
            Some(message) => {
                // Check if message is in failed state
                if message.status == Some("failed".to_string()) {
                    // Check if retryable
                    if message.retry_count.unwrap_or(0) < 3 {
                        // Queue retry
                        use pytake_core::queue::{JobType, MessageContent, QueueJob, Priority};
                        
                        let content = match serde_json::from_value::<MessageContent>(message.content.clone()) {
                            Ok(c) => c,
                            Err(_) => {
                                failed.push(RetryFailure {
                                    message_id,
                                    reason: "Invalid message content".to_string(),
                                });
                                continue;
                            }
                        };
                        
                        let job = QueueJob::new(JobType::SendMessage {
                            to: message.to_phone_number,
                            content,
                            retry_count: message.retry_count.unwrap_or(0) as u32 + 1,
                        })
                        .with_priority(Priority::High);
                        
                        if let Some(queue) = app_state.queue() {
                            match queue.enqueue(job).await {
                                Ok(_) => {
                                    // Update retry count
                                    msg_repo.increment_retry_count(message_id).await?;
                                    retried.push(message_id);
                                }
                                Err(e) => {
                                    failed.push(RetryFailure {
                                        message_id,
                                        reason: format!("Failed to queue: {}", e),
                                    });
                                }
                            }
                        } else {
                            failed.push(RetryFailure {
                                message_id,
                                reason: "Queue not available".to_string(),
                            });
                        }
                    } else {
                        failed.push(RetryFailure {
                            message_id,
                            reason: "Max retries exceeded".to_string(),
                        });
                    }
                } else {
                    failed.push(RetryFailure {
                        message_id,
                        reason: "Message not in failed state".to_string(),
                    });
                }
            }
            None => {
                failed.push(RetryFailure {
                    message_id,
                    reason: "Message not found".to_string(),
                });
            }
        }
    }
    
    Ok(HttpResponse::Ok().json(RetryMessageResponse {
        retried,
        failed,
    }))
}

/// Get delivery metrics
pub async fn get_delivery_metrics(
    app_state: web::Data<AppState>,
    _user_id: UserId,
) -> ApiResult<HttpResponse> {
    let msg_repo = MessageRepository::new(&app_state.db);
    
    // Get metrics for last 24 hours
    let since = Utc::now() - chrono::Duration::hours(24);
    
    let total_sent = msg_repo.count_by_status_since("sent", since).await?;
    let total_delivered = msg_repo.count_by_status_since("delivered", since).await?;
    let total_read = msg_repo.count_by_status_since("read", since).await?;
    let total_failed = msg_repo.count_by_status_since("failed", since).await?;
    
    let total = total_sent + total_delivered + total_read + total_failed;
    
    let metrics = DeliveryMetrics {
        total_sent,
        total_delivered,
        total_read,
        total_failed,
        delivery_rate: if total > 0 { 
            ((total_delivered + total_read) as f64 / total as f64) * 100.0 
        } else { 
            0.0 
        },
        read_rate: if total_delivered > 0 { 
            (total_read as f64 / total_delivered as f64) * 100.0 
        } else { 
            0.0 
        },
        average_delivery_time_seconds: msg_repo.get_avg_delivery_time_seconds(since).await?.unwrap_or(0),
        average_read_time_seconds: msg_repo.get_avg_read_time_seconds(since).await?.unwrap_or(0),
    };
    
    Ok(HttpResponse::Ok().json(metrics))
}

/// Get failed messages
pub async fn get_failed_messages(
    app_state: web::Data<AppState>,
    _user_id: UserId,
) -> ApiResult<HttpResponse> {
    let msg_repo = MessageRepository::new(&app_state.db);
    
    let failed_messages = msg_repo.get_failed_messages(100, 0).await?;
    
    let response: Vec<serde_json::Value> = failed_messages.into_iter()
        .map(|msg| serde_json::json!({
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "to": msg.to_phone_number,
            "type": msg.message_type,
            "failed_at": msg.failed_at,
            "error_code": msg.error_code,
            "error_message": msg.error_message,
            "retry_count": msg.retry_count,
            "can_retry": msg.retry_count.unwrap_or(0) < 3,
        }))
        .collect();
    
    Ok(HttpResponse::Ok().json(response))
}