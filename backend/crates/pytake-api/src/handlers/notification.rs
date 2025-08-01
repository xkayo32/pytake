//! Notification handlers for API endpoints

use actix_web::{web, HttpResponse, Result as ActixResult};
use pytake_core::services::notification::{
    NotificationService, NotificationType, NotificationPriority, NotificationChannel,
    NotificationContext,
};
use pytake_core::websocket::NotificationLevel;
use pytake_db::repositories::user::UserId;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use tracing::{info, error};

/// Create notification request
#[derive(Debug, Deserialize)]
pub struct CreateNotificationRequest {
    pub notification_type: NotificationType,
    pub title: String,
    pub message: String,
    pub recipient_id: Uuid,
    pub priority: Option<NotificationPriority>,
    pub channels: Option<Vec<NotificationChannel>>,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
    pub scheduled_for: Option<chrono::DateTime<chrono::Utc>>,
}

/// Create notification from template request
#[derive(Debug, Deserialize)]
pub struct CreateFromTemplateRequest {
    pub template_id: String,
    pub recipient_id: Uuid,
    pub context: NotificationContext,
    pub scheduled_for: Option<chrono::DateTime<chrono::Utc>>,
}

/// Mark as read request
#[derive(Debug, Deserialize)]
pub struct MarkAsReadRequest {
    pub notification_ids: Vec<Uuid>,
}

/// Get notifications query parameters
#[derive(Debug, Deserialize)]
pub struct GetNotificationsQuery {
    pub unread_only: Option<bool>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
    pub notification_type: Option<NotificationType>,
}

/// Notification response
#[derive(Debug, Serialize)]
pub struct NotificationResponse {
    pub id: Uuid,
    pub notification_type: NotificationType,
    pub priority: NotificationPriority,
    pub title: String,
    pub message: String,
    pub recipient_id: Uuid,
    pub sender_id: Option<Uuid>,
    pub channels: Vec<NotificationChannel>,
    pub metadata: HashMap<String, serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub scheduled_for: Option<chrono::DateTime<chrono::Utc>>,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
    pub is_read: bool,
    pub read_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Create a new notification
pub async fn create_notification(
    notification_service: web::Data<NotificationService>,
    payload: web::Json<CreateNotificationRequest>,
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    info!("Creating notification for user {}", payload.recipient_id);
    
    let request = payload.into_inner();
    
    let notification = match notification_service.create_notification(
        request.notification_type,
        request.title,
        request.message,
        request.recipient_id,
        None, // sender_id from auth context
        request.priority.unwrap_or_default(),
        request.channels.unwrap_or_else(|| vec![NotificationChannel::InApp]),
    ).await {
        Ok(notification) => notification,
        Err(e) => {
            error!("Failed to create notification: {}", e);
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create notification",
                "details": e.to_string()
            })));
        }
    };
    
    // Schedule if requested
    let final_notification = if let Some(scheduled_for) = request.scheduled_for {
        match notification_service.schedule_notification(notification, scheduled_for).await {
            Ok(scheduled) => scheduled,
            Err(e) => {
                error!("Failed to schedule notification: {}", e);
                return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Failed to schedule notification",
                    "details": e.to_string()
                })));
            }
        }
    } else {
        // Send immediately
        if let Err(e) = notification_service.send_notification(&notification).await {
            error!("Failed to send notification: {}", e);
        }
        notification
    };
    
    let response = NotificationResponse {
        id: final_notification.id,
        notification_type: final_notification.notification_type,
        priority: final_notification.priority,
        title: final_notification.title,
        message: final_notification.message,
        recipient_id: final_notification.recipient_id,
        sender_id: final_notification.sender_id,
        channels: final_notification.channels,
        metadata: final_notification.metadata,
        created_at: final_notification.created_at,
        scheduled_for: final_notification.scheduled_for,
        expires_at: final_notification.expires_at,
        is_read: final_notification.is_read,
        read_at: final_notification.read_at,
    };
    
    Ok(HttpResponse::Created().json(serde_json::json!({
        "notification": response,
        "message": "Notification created successfully"
    })))
}

/// Create notification from template
pub async fn create_from_template(
    notification_service: web::Data<NotificationService>,
    payload: web::Json<CreateFromTemplateRequest>,
    user_id: UserId,
) -> ActixResult<HttpResponse> {
    info!("Creating notification from template {} for user {}", 
          payload.template_id, payload.recipient_id);
    
    let request = payload.into_inner();
    
    let notification = match notification_service.create_from_template(
        &request.template_id,
        request.recipient_id,
        Some(user_id.0),
        request.context,
    ).await {
        Ok(notification) => notification,
        Err(e) => {
            error!("Failed to create notification from template: {}", e);
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Failed to create notification from template",
                "details": e.to_string()
            })));
        }
    };
    
    // Schedule if requested
    let final_notification = if let Some(scheduled_for) = request.scheduled_for {
        match notification_service.schedule_notification(notification, scheduled_for).await {
            Ok(scheduled) => scheduled,
            Err(e) => {
                error!("Failed to schedule notification: {}", e);
                return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Failed to schedule notification",
                    "details": e.to_string()
                })));
            }
        }
    } else {
        // Send immediately
        if let Err(e) = notification_service.send_notification(&notification).await {
            error!("Failed to send notification: {}", e);
        }
        notification
    };
    
    let response = NotificationResponse {
        id: final_notification.id,
        notification_type: final_notification.notification_type,
        priority: final_notification.priority,
        title: final_notification.title,
        message: final_notification.message,
        recipient_id: final_notification.recipient_id,
        sender_id: final_notification.sender_id,
        channels: final_notification.channels,
        metadata: final_notification.metadata,
        created_at: final_notification.created_at,
        scheduled_for: final_notification.scheduled_for,
        expires_at: final_notification.expires_at,
        is_read: final_notification.is_read,
        read_at: final_notification.read_at,
    };
    
    Ok(HttpResponse::Created().json(serde_json::json!({
        "notification": response,
        "message": "Notification created from template successfully"
    })))
}

/// Get user notifications
pub async fn get_notifications(
    notification_service: web::Data<NotificationService>,
    query: web::Query<GetNotificationsQuery>,
    user_id: UserId,
) -> ActixResult<HttpResponse> {
    let query = query.into_inner();
    
    info!("Getting notifications for user {}", user_id.0);
    
    let notifications = match notification_service.get_user_notifications(
        user_id.0,
        query.unread_only.unwrap_or(false),
        query.limit.unwrap_or(20),
        query.offset.unwrap_or(0),
    ).await {
        Ok(notifications) => notifications,
        Err(e) => {
            error!("Failed to get user notifications: {}", e);
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get notifications",
                "details": e.to_string()
            })));
        }
    };
    
    let responses: Vec<NotificationResponse> = notifications.into_iter().map(|n| {
        NotificationResponse {
            id: n.id,
            notification_type: n.notification_type,
            priority: n.priority,
            title: n.title,
            message: n.message,
            recipient_id: n.recipient_id,
            sender_id: n.sender_id,
            channels: n.channels,
            metadata: n.metadata,
            created_at: n.created_at,
            scheduled_for: n.scheduled_for,
            expires_at: n.expires_at,
            is_read: n.is_read,
            read_at: n.read_at,
        }
    }).collect();
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "notifications": responses,
        "count": responses.len()
    })))
}

/// Get unread notification count
pub async fn get_unread_count(
    notification_service: web::Data<NotificationService>,
    user_id: UserId,
) -> ActixResult<HttpResponse> {
    info!("Getting unread notification count for user {}", user_id.0);
    
    let count = match notification_service.get_unread_count(user_id.0).await {
        Ok(count) => count,
        Err(e) => {
            error!("Failed to get unread count: {}", e);
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get unread count",
                "details": e.to_string()
            })));
        }
    };
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "unread_count": count
    })))
}

/// Mark notifications as read
pub async fn mark_as_read(
    notification_service: web::Data<NotificationService>,
    payload: web::Json<MarkAsReadRequest>,
    user_id: UserId,
) -> ActixResult<HttpResponse> {
    let request = payload.into_inner();
    
    info!("Marking {} notifications as read for user {}", 
          request.notification_ids.len(), user_id.0);
    
    for notification_id in request.notification_ids {
        if let Err(e) = notification_service.mark_as_read(notification_id, user_id.0).await {
            error!("Failed to mark notification {} as read: {}", notification_id, e);
        }
    }
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Notifications marked as read"
    })))
}

/// Send test notification (development endpoint)
#[cfg(debug_assertions)]
pub async fn send_test_notification(
    notification_service: web::Data<NotificationService>,
    user_id: UserId,
) -> ActixResult<HttpResponse> {
    info!("Sending test notification to user {}", user_id.0);
    
    let notification = match notification_service.create_notification(
        NotificationType::Custom("test".to_string()),
        "Test Notification".to_string(),
        "This is a test notification from the PyTake system".to_string(),
        user_id.0,
        Some(user_id.0),
        NotificationPriority::Normal,
        vec![NotificationChannel::WebSocket, NotificationChannel::InApp],
    ).await {
        Ok(notification) => notification,
        Err(e) => {
            error!("Failed to create test notification: {}", e);
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create test notification",
                "details": e.to_string()
            })));
        }
    };
    
    // Send the notification
    if let Err(e) = notification_service.send_notification(&notification).await {
        error!("Failed to send test notification: {}", e);
    }
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Test notification sent",
        "notification_id": notification.id
    })))
}

/// Get notification templates
pub async fn get_templates(
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    let templates = vec![
        serde_json::json!({
            "id": "new_message",
            "name": "Nova Mensagem",
            "description": "Notificação para novas mensagens recebidas",
            "variables": ["sender_name", "message_preview"]
        }),
        serde_json::json!({
            "id": "message_status",
            "name": "Status da Mensagem",
            "description": "Notificação para mudanças de status de mensagem",
            "variables": ["status"]
        }),
        serde_json::json!({
            "id": "contact_sync",
            "name": "Sincronização de Contatos",
            "description": "Notificação para conclusão de sincronização",
            "variables": ["count"]
        }),
        serde_json::json!({
            "id": "system_alert",
            "name": "Alerta do Sistema",
            "description": "Notificação para alertas importantes do sistema",
            "variables": ["alert_message"]
        }),
    ];
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "templates": templates
    })))
}

/// Quick notification helpers
pub async fn quick_new_message_notification(
    notification_service: web::Data<NotificationService>,
    recipient_id: Uuid,
    sender_name: &str,
    message_preview: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let notification = notification_service.notify_new_message(
        recipient_id,
        sender_name,
        message_preview,
    ).await?;
    
    notification_service.send_notification(&notification).await?;
    Ok(())
}

pub async fn quick_status_notification(
    notification_service: web::Data<NotificationService>,
    recipient_id: Uuid,
    status: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let notification = notification_service.notify_message_status(
        recipient_id,
        status,
    ).await?;
    
    notification_service.send_notification(&notification).await?;
    Ok(())
}