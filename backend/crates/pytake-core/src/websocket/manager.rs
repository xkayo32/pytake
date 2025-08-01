//! WebSocket manager for handling events and business logic

use crate::websocket::{ConnectionManager, WebSocketMessage, WebSocketEvent};
use crate::auth::token::TokenValidator;
use crate::errors::{CoreError, CoreResult};
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{info, warn, error, debug};
use uuid::Uuid;

/// WebSocket manager that handles business logic and events
pub struct WebSocketManager {
    connection_manager: ConnectionManager,
    token_validator: Arc<TokenValidator>,
    event_receiver: Option<mpsc::UnboundedReceiver<WebSocketEvent>>,
}

impl WebSocketManager {
    /// Create a new WebSocket manager
    pub fn new(token_validator: Arc<TokenValidator>) -> Self {
        let (connection_manager, event_receiver) = ConnectionManager::new();
        
        Self {
            connection_manager,
            token_validator,
            event_receiver: Some(event_receiver),
        }
    }
    
    /// Get the connection manager
    pub fn connection_manager(&self) -> &ConnectionManager {
        &self.connection_manager
    }
    
    /// Start the event processing loop
    pub async fn start_event_loop(&mut self) -> CoreResult<()> {
        let mut event_receiver = self.event_receiver
            .take()
            .ok_or_else(|| CoreError::internal("Event receiver already taken".to_string()))?;
            
        info!("Starting WebSocket event loop");
        
        // Start cleanup task
        let connection_manager = self.connection_manager.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
            loop {
                interval.tick().await;
                if let Err(e) = connection_manager.cleanup_stale_connections(60).await {
                    error!("Error cleaning up stale connections: {}", e);
                }
            }
        });
        
        // Process events
        while let Some(event) = event_receiver.recv().await {
            if let Err(e) = self.handle_event(event).await {
                error!("Error handling WebSocket event: {}", e);
            }
        }
        
        warn!("WebSocket event loop ended");
        Ok(())
    }
    
    /// Handle WebSocket events
    async fn handle_event(&self, event: WebSocketEvent) -> CoreResult<()> {
        match event {
            WebSocketEvent::Connect { connection_id, user_id } => {
                self.handle_connect(connection_id, user_id).await?;
            }
            
            WebSocketEvent::Disconnect { connection_id, user_id } => {
                self.handle_disconnect(connection_id, user_id).await?;
            }
            
            WebSocketEvent::MessageReceived { connection_id, message } => {
                self.handle_message_received(connection_id, message).await?;
            }
            
            WebSocketEvent::Broadcast { conversation_id, message, exclude_connection } => {
                self.connection_manager
                    .broadcast_to_conversation(
                        conversation_id,
                        message,
                        exclude_connection.as_deref(),
                    )
                    .await?;
            }
            
            WebSocketEvent::SendToConnection { connection_id, message } => {
                self.connection_manager
                    .send_to_connection(&connection_id, message)
                    .await?;
            }
            
            WebSocketEvent::SendToUser { user_id, message } => {
                self.connection_manager
                    .send_to_user(user_id, message)
                    .await?;
            }
        }
        
        Ok(())
    }
    
    /// Handle new connection
    async fn handle_connect(&self, connection_id: String, _user_id: Option<Uuid>) -> CoreResult<()> {
        debug!("New WebSocket connection: {}", connection_id);
        
        // Send welcome message
        let welcome = WebSocketMessage::notification(
            "Connected".to_string(),
            "WebSocket connection established".to_string(),
            crate::websocket::NotificationLevel::Info,
        );
        
        self.connection_manager
            .send_to_connection(&connection_id, welcome)
            .await?;
            
        Ok(())
    }
    
    /// Handle connection disconnect
    async fn handle_disconnect(&self, connection_id: String, user_id: Option<Uuid>) -> CoreResult<()> {
        debug!("WebSocket connection disconnected: {}", connection_id);
        
        if let Some(user_id) = user_id {
            // Update user presence to offline if this was their last connection
            let remaining_connections = self.connection_manager
                .get_user_connections(user_id)
                .await;
                
            if remaining_connections.is_empty() {
                // User is now offline, could broadcast presence update here
                debug!("User {} is now offline", user_id);
            }
        }
        
        Ok(())
    }
    
    /// Handle message received from client
    async fn handle_message_received(
        &self,
        connection_id: String,
        message: WebSocketMessage,
    ) -> CoreResult<()> {
        match message {
            WebSocketMessage::Auth { token } => {
                self.handle_auth(&connection_id, token).await?;
            }
            
            WebSocketMessage::Subscribe { conversation_id } => {
                self.handle_subscribe(&connection_id, conversation_id).await?;
            }
            
            WebSocketMessage::Unsubscribe { conversation_id } => {
                self.handle_unsubscribe(&connection_id, conversation_id).await?;
            }
            
            WebSocketMessage::Typing { conversation_id, user_id, is_typing } => {
                self.handle_typing(connection_id, conversation_id, user_id, is_typing).await?;
            }
            
            WebSocketMessage::Ping { .. } => {
                self.handle_ping(&connection_id).await?;
            }
            
            _ => {
                warn!("Unhandled message type from connection: {}", connection_id);
            }
        }
        
        Ok(())
    }
    
    /// Handle authentication
    async fn handle_auth(&self, connection_id: &str, token: String) -> CoreResult<()> {
        match self.token_validator.validate_token(&token) {
            Ok(claims) => {
                let user_id = claims.sub.parse::<Uuid>()
                    .map_err(|_| CoreError::validation("Invalid user ID format"))?;
                
                self.connection_manager
                    .authenticate_connection(connection_id, user_id)
                    .await?;
                
                let ack = WebSocketMessage::ack(
                    None,
                    true,
                    None,
                );
                
                self.connection_manager
                    .send_to_connection(connection_id, ack)
                    .await?;
                
                // Send presence update to user's contacts
                let presence = WebSocketMessage::PresenceUpdate {
                    user_id,
                    status: crate::websocket::PresenceStatus::Online,
                    last_seen: None,
                };
                
                // Could broadcast to user's conversation participants here
                debug!("User {} authenticated on connection {}", user_id, connection_id);
            }
            
            Err(e) => {
                let ack = WebSocketMessage::ack(
                    None,
                    false,
                    Some(format!("Authentication failed: {}", e)),
                );
                
                self.connection_manager
                    .send_to_connection(connection_id, ack)
                    .await?;
            }
        }
        
        Ok(())
    }
    
    /// Handle conversation subscription
    async fn handle_subscribe(&self, connection_id: &str, conversation_id: Uuid) -> CoreResult<()> {
        // Verify connection is authenticated
        let connection_info = self.connection_manager
            .get_connection_info(connection_id)
            .await
            .ok_or_else(|| CoreError::not_found("connection", connection_id))?;
            
        if connection_info.user_id.is_none() {
            let ack = WebSocketMessage::ack(
                None,
                false,
                Some("Authentication required".to_string()),
            );
            
            self.connection_manager
                .send_to_connection(connection_id, ack)
                .await?;
                
            return Ok(());
        }
        
        // TODO: Verify user has access to this conversation
        
        self.connection_manager
            .subscribe_to_conversation(connection_id, conversation_id)
            .await?;
            
        let ack = WebSocketMessage::ack(None, true, None);
        self.connection_manager
            .send_to_connection(connection_id, ack)
            .await?;
            
        Ok(())
    }
    
    /// Handle conversation unsubscription
    async fn handle_unsubscribe(&self, connection_id: &str, conversation_id: Uuid) -> CoreResult<()> {
        self.connection_manager
            .unsubscribe_from_conversation(connection_id, conversation_id)
            .await?;
            
        let ack = WebSocketMessage::ack(None, true, None);
        self.connection_manager
            .send_to_connection(connection_id, ack)
            .await?;
            
        Ok(())
    }
    
    /// Handle typing indicator
    async fn handle_typing(
        &self,
        connection_id: String,
        conversation_id: Uuid,
        user_id: Option<Uuid>,
        is_typing: bool,
    ) -> CoreResult<()> {
        let typing_message = WebSocketMessage::typing(conversation_id, user_id, is_typing);
        
        self.connection_manager
            .broadcast_to_conversation(
                conversation_id,
                typing_message,
                Some(&connection_id),
            )
            .await?;
            
        Ok(())
    }
    
    /// Handle ping message
    async fn handle_ping(&self, connection_id: &str) -> CoreResult<()> {
        self.connection_manager
            .update_ping(connection_id)
            .await?;
            
        let pong = WebSocketMessage::pong();
        self.connection_manager
            .send_to_connection(connection_id, pong)
            .await?;
            
        Ok(())
    }
    
    /// Broadcast message update to conversation subscribers
    pub async fn broadcast_message_update(
        &self,
        conversation_id: Uuid,
        message: crate::websocket::MessageData,
    ) -> CoreResult<()> {
        let ws_message = WebSocketMessage::message_update(conversation_id, message);
        
        self.connection_manager
            .broadcast_to_conversation(conversation_id, ws_message, None)
            .await?;
            
        Ok(())
    }
    
    /// Broadcast status update to conversation subscribers
    pub async fn broadcast_status_update(
        &self,
        conversation_id: Uuid,
        message_id: Uuid,
        status: String,
        timestamp: chrono::DateTime<chrono::Utc>,
    ) -> CoreResult<()> {
        let ws_message = WebSocketMessage::status_update(
            conversation_id,
            message_id,
            status,
            timestamp,
        );
        
        self.connection_manager
            .broadcast_to_conversation(conversation_id, ws_message, None)
            .await?;
            
        Ok(())
    }
    
    /// Send notification to user
    pub async fn send_notification_to_user(
        &self,
        user_id: Uuid,
        title: String,
        message: String,
        level: crate::websocket::NotificationLevel,
    ) -> CoreResult<()> {
        let notification = WebSocketMessage::notification(title, message, level);
        
        self.connection_manager
            .send_to_user(user_id, notification)
            .await?;
            
        Ok(())
    }
    
    /// Get connection statistics
    pub async fn get_stats(&self) -> WebSocketStats {
        let total_connections = self.connection_manager.get_connection_count().await;
        
        WebSocketStats {
            total_connections,
            authenticated_connections: 0, // TODO: implement
            active_conversations: 0,      // TODO: implement
        }
    }
}

/// WebSocket statistics
#[derive(Debug, Clone)]
pub struct WebSocketStats {
    pub total_connections: usize,
    pub authenticated_connections: usize,
    pub active_conversations: usize,
}