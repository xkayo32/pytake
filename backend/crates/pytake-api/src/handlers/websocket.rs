//! WebSocket handlers for real-time communication

use actix_web::{web, HttpRequest, HttpResponse, Result as ActixResult};
use pytake_core::websocket::{websocket_handler, ConnectionManager};
use tracing::info;

/// WebSocket endpoint handler
pub async fn ws_handler(
    req: HttpRequest,
    stream: web::Payload,
    connection_manager: web::Data<ConnectionManager>,
) -> ActixResult<HttpResponse> {
    info!("New WebSocket connection request from: {:?}", req.peer_addr());
    
    websocket_handler(req, stream, connection_manager).await
}

/// WebSocket stats endpoint
pub async fn ws_stats(
    connection_manager: web::Data<ConnectionManager>,
) -> ActixResult<HttpResponse> {
    let stats = serde_json::json!({
        "total_connections": connection_manager.get_connection_count().await,
        "timestamp": chrono::Utc::now()
    });
    
    Ok(HttpResponse::Ok().json(stats))
}