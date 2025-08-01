//! WebSocket handler for Actix-web integration

use crate::websocket::{WebSocketMessage, ConnectionManager};
use crate::errors::CoreResult;
use actix::{Actor, ActorContext, AsyncContext, Handler, Message, StreamHandler};
use actix_web::{web, HttpRequest, HttpResponse, Result as ActixResult};
use actix_web_actors::ws;
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use tracing::{info, warn, error, debug};
use uuid::Uuid;

/// How often heartbeat pings are sent
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);

/// How long before lack of client response causes a timeout
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

/// WebSocket connection actor
pub struct WebSocketActor {
    /// Unique connection ID
    connection_id: String,
    /// Last heartbeat
    hb: Instant,
    /// Connection manager
    connection_manager: ConnectionManager,
    /// Message sender
    message_sender: Option<mpsc::UnboundedSender<WebSocketMessage>>,
    /// Message receiver
    message_receiver: Option<mpsc::UnboundedReceiver<WebSocketMessage>>,
}

impl WebSocketActor {
    /// Create new WebSocket actor
    pub fn new(connection_manager: ConnectionManager) -> Self {
        let connection_id = Uuid::new_v4().to_string();
        let (message_sender, message_receiver) = mpsc::unbounded_channel();
        
        Self {
            connection_id,
            hb: Instant::now(),
            connection_manager,
            message_sender: Some(message_sender),
            message_receiver: Some(message_receiver),
        }
    }
    
    /// Start heartbeat process
    fn start_heartbeat(&self, ctx: &mut <Self as Actor>::Context) {
        ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
            // Check client heartbeats
            if Instant::now().duration_since(act.hb) > CLIENT_TIMEOUT {
                // Heartbeat timed out
                warn!("WebSocket client heartbeat failed, disconnecting");
                ctx.stop();
                return;
            }
            
            ctx.ping(b"");
        });
    }
    
    /// Start message processing loop
    fn start_message_loop(&mut self, ctx: &mut <Self as Actor>::Context) {
        if let Some(mut receiver) = self.message_receiver.take() {
            let addr = ctx.address();
            
            ctx.spawn(actix::fut::wrap_future(async move {
                while let Some(message) = receiver.recv().await {
                    if addr.send(SendMessage(message)).await.is_err() {
                        break;
                    }
                }
            }));
        }
    }
}

impl Actor for WebSocketActor {
    type Context = ws::WebsocketContext<Self>;
    
    /// Called when actor starts
    fn started(&mut self, ctx: &mut Self::Context) {
        self.start_heartbeat(ctx);
        self.start_message_loop(ctx);
        
        // Register connection with manager
        if let Some(sender) = self.message_sender.take() {
            let connection_manager = self.connection_manager.clone();
            let connection_id = self.connection_id.clone();
            
            ctx.spawn(actix::fut::wrap_future(async move {
                if let Err(e) = connection_manager.add_connection(connection_id, sender).await {
                    error!("Failed to register WebSocket connection: {}", e);
                }
            }));
        }
        
        info!("WebSocket connection started: {}", self.connection_id);
    }
    
    /// Called when actor stops
    fn stopped(&mut self, _ctx: &mut Self::Context) {
        let connection_manager = self.connection_manager.clone();
        let connection_id = self.connection_id.clone();
        
        // Remove connection from manager
        tokio::spawn(async move {
            if let Err(e) = connection_manager.remove_connection(&connection_id).await {
                error!("Failed to remove WebSocket connection: {}", e);
            }
        });
        
        info!("WebSocket connection stopped: {}", self.connection_id);
    }
}

/// Message to send to WebSocket client
#[derive(Message)]
#[rtype(result = "()")]
struct SendMessage(WebSocketMessage);

impl Handler<SendMessage> for WebSocketActor {
    type Result = ();
    
    fn handle(&mut self, msg: SendMessage, ctx: &mut Self::Context) {
        match serde_json::to_string(&msg.0) {
            Ok(json) => {
                ctx.text(json);
            }
            Err(e) => {
                error!("Failed to serialize WebSocket message: {}", e);
            }
        }
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WebSocketActor {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        let msg = match msg {
            Err(_) => {
                ctx.stop();
                return;
            }
            Ok(msg) => msg,
        };
        
        match msg {
            ws::Message::Ping(msg) => {
                self.hb = Instant::now();
                ctx.pong(&msg);
            }
            
            ws::Message::Pong(_) => {
                self.hb = Instant::now();
            }
            
            ws::Message::Text(text) => {
                self.hb = Instant::now();
                
                match serde_json::from_str::<WebSocketMessage>(&text) {
                    Ok(message) => {
                        let connection_manager = self.connection_manager.clone();
                        let connection_id = self.connection_id.clone();
                        
                        ctx.spawn(actix::fut::wrap_future(async move {
                            if let Err(e) = connection_manager
                                .handle_connection_message(&connection_id, message)
                                .await
                            {
                                error!("Error handling WebSocket message: {}", e);
                            }
                        }));
                    }
                    
                    Err(e) => {
                        warn!("Invalid WebSocket message format: {}", e);
                        
                        let error_message = WebSocketMessage::ack(
                            None,
                            false,
                            Some(format!("Invalid message format: {}", e)),
                        );
                        
                        if let Ok(json) = serde_json::to_string(&error_message) {
                            ctx.text(json);
                        }
                    }
                }
            }
            
            ws::Message::Binary(_) => {
                warn!("Binary WebSocket messages not supported");
            }
            
            ws::Message::Close(reason) => {
                debug!("WebSocket close: {:?}", reason);
                ctx.stop();
            }
            
            ws::Message::Continuation(_) => {
                ctx.stop();
            }
            
            ws::Message::Nop => (),
        }
    }
}

/// WebSocket handler function for Actix-web
pub async fn websocket_handler(
    req: HttpRequest,
    stream: web::Payload,
    connection_manager: web::Data<ConnectionManager>,
) -> ActixResult<HttpResponse> {
    let actor = WebSocketActor::new(connection_manager.get_ref().clone());
    
    ws::start(actor, &req, stream)
}

/// WebSocket integration trait for status updates
#[async_trait::async_trait]
pub trait WebSocketIntegration: Send + Sync {
    /// Broadcast message update
    async fn broadcast_message_update(
        &self,
        conversation_id: Uuid,
        message: crate::websocket::MessageData,
    ) -> CoreResult<()>;
    
    /// Broadcast status update
    async fn broadcast_status_update(
        &self,
        conversation_id: Uuid,
        message_id: Uuid,
        status: String,
        timestamp: chrono::DateTime<chrono::Utc>,
    ) -> CoreResult<()>;
    
    /// Send notification to user
    async fn send_notification_to_user(
        &self,
        user_id: Uuid,
        title: String,
        message: String,
        level: crate::websocket::NotificationLevel,
    ) -> CoreResult<()>;
}

/// WebSocket integration implementation
pub struct WebSocketIntegrationImpl {
    manager: crate::websocket::WebSocketManager,
}

impl WebSocketIntegrationImpl {
    pub fn new(manager: crate::websocket::WebSocketManager) -> Self {
        Self { manager }
    }
}

#[async_trait::async_trait]
impl WebSocketIntegration for WebSocketIntegrationImpl {
    async fn broadcast_message_update(
        &self,
        conversation_id: Uuid,
        message: crate::websocket::MessageData,
    ) -> CoreResult<()> {
        self.manager
            .broadcast_message_update(conversation_id, message)
            .await
    }
    
    async fn broadcast_status_update(
        &self,
        conversation_id: Uuid,
        message_id: Uuid,
        status: String,
        timestamp: chrono::DateTime<chrono::Utc>,
    ) -> CoreResult<()> {
        self.manager
            .broadcast_status_update(conversation_id, message_id, status, timestamp)
            .await
    }
    
    async fn send_notification_to_user(
        &self,
        user_id: Uuid,
        title: String,
        message: String,
        level: crate::websocket::NotificationLevel,
    ) -> CoreResult<()> {
        self.manager
            .send_notification_to_user(user_id, title, message, level)
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_websocket_actor_creation() {
        let (connection_manager, _) = ConnectionManager::new();
        let actor = WebSocketActor::new(connection_manager);
        
        assert!(!actor.connection_id.is_empty());
        assert!(actor.message_sender.is_some());
        assert!(actor.message_receiver.is_some());
    }
}