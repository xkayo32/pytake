//! WebSocket connection management

use crate::websocket::{WebSocketMessage, ConnectionInfo, WebSocketEvent};
use crate::errors::{CoreError, CoreResult};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;
use chrono::Utc;
use tracing::{info, warn, debug};

/// WebSocket connection manager
#[derive(Clone)]
pub struct ConnectionManager {
    connections: Arc<RwLock<HashMap<String, ConnectionState>>>,
    user_connections: Arc<RwLock<HashMap<Uuid, Vec<String>>>>,
    conversation_subscribers: Arc<RwLock<HashMap<Uuid, Vec<String>>>>,
    event_sender: mpsc::UnboundedSender<WebSocketEvent>,
}

/// Connection state
#[derive(Debug)]
pub struct ConnectionState {
    pub info: ConnectionInfo,
    pub sender: mpsc::UnboundedSender<WebSocketMessage>,
}

impl ConnectionManager {
    /// Create a new connection manager
    pub fn new() -> (Self, mpsc::UnboundedReceiver<WebSocketEvent>) {
        let (event_sender, event_receiver) = mpsc::unbounded_channel();
        
        let manager = Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            user_connections: Arc::new(RwLock::new(HashMap::new())),
            conversation_subscribers: Arc::new(RwLock::new(HashMap::new())),
            event_sender,
        };
        
        (manager, event_receiver)
    }
    
    /// Add a new connection
    pub async fn add_connection(
        &self,
        connection_id: String,
        sender: mpsc::UnboundedSender<WebSocketMessage>,
    ) -> CoreResult<()> {
        let info = ConnectionInfo {
            connection_id: connection_id.clone(),
            user_id: None,
            subscriptions: Vec::new(),
            connected_at: Utc::now(),
            last_ping: Utc::now(),
        };
        
        let state = ConnectionState {
            info,
            sender,
        };
        
        {
            let mut connections = self.connections.write().await;
            connections.insert(connection_id.clone(), state);
        }
        
        info!("WebSocket connection added: {}", connection_id);
        
        // Send connect event
        self.send_event(WebSocketEvent::Connect {
            connection_id,
            user_id: None,
        }).await?;
        
        Ok(())
    }
    
    /// Remove a connection
    pub async fn remove_connection(&self, connection_id: &str) -> CoreResult<()> {
        let user_id = {
            let mut connections = self.connections.write().await;
            if let Some(state) = connections.remove(connection_id) {
                // Remove from conversation subscriptions
                for conversation_id in &state.info.subscriptions {
                    self.unsubscribe_from_conversation(connection_id, *conversation_id).await?;
                }
                
                state.info.user_id
            } else {
                return Ok(()); // Connection not found
            }
        };
        
        // Remove from user connections
        if let Some(user_id) = user_id {
            let mut user_connections = self.user_connections.write().await;
            if let Some(connections) = user_connections.get_mut(&user_id) {
                connections.retain(|id| id != connection_id);
                if connections.is_empty() {
                    user_connections.remove(&user_id);
                }
            }
        }
        
        info!("WebSocket connection removed: {}", connection_id);
        
        // Send disconnect event
        self.send_event(WebSocketEvent::Disconnect {
            connection_id: connection_id.to_string(),
            user_id,
        }).await?;
        
        Ok(())
    }
    
    /// Authenticate a connection with user ID
    pub async fn authenticate_connection(
        &self,
        connection_id: &str,
        user_id: Uuid,
    ) -> CoreResult<()> {
        {
            let mut connections = self.connections.write().await;
            if let Some(state) = connections.get_mut(connection_id) {
                state.info.user_id = Some(user_id);
            } else {
                return Err(CoreError::not_found("connection", connection_id));
            }
        }
        
        // Add to user connections
        {
            let mut user_connections = self.user_connections.write().await;
            user_connections
                .entry(user_id)
                .or_insert_with(Vec::new)
                .push(connection_id.to_string());
        }
        
        info!(
            "WebSocket connection authenticated: {} -> user {}",
            connection_id, user_id
        );
        
        Ok(())
    }
    
    /// Subscribe connection to conversation updates
    pub async fn subscribe_to_conversation(
        &self,
        connection_id: &str,
        conversation_id: Uuid,
    ) -> CoreResult<()> {
        {
            let mut connections = self.connections.write().await;
            if let Some(state) = connections.get_mut(connection_id) {
                if !state.info.subscriptions.contains(&conversation_id) {
                    state.info.subscriptions.push(conversation_id);
                }
            } else {
                return Err(CoreError::not_found("connection", connection_id));
            }
        }
        
        // Add to conversation subscribers
        {
            let mut conversation_subscribers = self.conversation_subscribers.write().await;
            conversation_subscribers
                .entry(conversation_id)
                .or_insert_with(Vec::new)
                .push(connection_id.to_string());
        }
        
        debug!(
            "Connection {} subscribed to conversation {}",
            connection_id, conversation_id
        );
        
        Ok(())
    }
    
    /// Unsubscribe connection from conversation updates
    pub async fn unsubscribe_from_conversation(
        &self,
        connection_id: &str,
        conversation_id: Uuid,
    ) -> CoreResult<()> {
        {
            let mut connections = self.connections.write().await;
            if let Some(state) = connections.get_mut(connection_id) {
                state.info.subscriptions.retain(|&id| id != conversation_id);
            }
        }
        
        // Remove from conversation subscribers
        {
            let mut conversation_subscribers = self.conversation_subscribers.write().await;
            if let Some(subscribers) = conversation_subscribers.get_mut(&conversation_id) {
                subscribers.retain(|id| id != connection_id);
                if subscribers.is_empty() {
                    conversation_subscribers.remove(&conversation_id);
                }
            }
        }
        
        debug!(
            "Connection {} unsubscribed from conversation {}",
            connection_id, conversation_id
        );
        
        Ok(())
    }
    
    /// Send message to specific connection
    pub async fn send_to_connection(
        &self,
        connection_id: &str,
        message: WebSocketMessage,
    ) -> CoreResult<()> {
        let connections = self.connections.read().await;
        if let Some(state) = connections.get(connection_id) {
            if let Err(_) = state.sender.send(message) {
                warn!("Failed to send message to connection: {}", connection_id);
                // Connection is likely closed, will be cleaned up later
            }
        } else {
            warn!("Connection not found: {}", connection_id);
        }
        
        Ok(())
    }
    
    /// Send message to all connections of a user
    pub async fn send_to_user(&self, user_id: Uuid, message: WebSocketMessage) -> CoreResult<()> {
        let user_connections = self.user_connections.read().await;
        if let Some(connection_ids) = user_connections.get(&user_id) {
            for connection_id in connection_ids {
                self.send_to_connection(connection_id, message.clone()).await?;
            }
        }
        
        Ok(())
    }
    
    /// Broadcast message to all subscribers of a conversation
    pub async fn broadcast_to_conversation(
        &self,
        conversation_id: Uuid,
        message: WebSocketMessage,
        exclude_connection: Option<&str>,
    ) -> CoreResult<()> {
        let conversation_subscribers = self.conversation_subscribers.read().await;
        if let Some(subscribers) = conversation_subscribers.get(&conversation_id) {
            for connection_id in subscribers {
                if let Some(exclude) = exclude_connection {
                    if connection_id == exclude {
                        continue;
                    }
                }
                
                self.send_to_connection(connection_id, message.clone()).await?;
            }
        }
        
        Ok(())
    }
    
    /// Update last ping time for connection
    pub async fn update_ping(&self, connection_id: &str) -> CoreResult<()> {
        let mut connections = self.connections.write().await;
        if let Some(state) = connections.get_mut(connection_id) {
            state.info.last_ping = Utc::now();
        }
        
        Ok(())
    }
    
    /// Get connection info
    pub async fn get_connection_info(&self, connection_id: &str) -> Option<ConnectionInfo> {
        let connections = self.connections.read().await;
        connections.get(connection_id).map(|state| state.info.clone())
    }
    
    /// Get all connections for a user
    pub async fn get_user_connections(&self, user_id: Uuid) -> Vec<String> {
        let user_connections = self.user_connections.read().await;
        user_connections
            .get(&user_id)
            .cloned()
            .unwrap_or_default()
    }
    
    /// Get subscriber count for conversation
    pub async fn get_subscriber_count(&self, conversation_id: Uuid) -> usize {
        let conversation_subscribers = self.conversation_subscribers.read().await;
        conversation_subscribers
            .get(&conversation_id)
            .map(|subscribers| subscribers.len())
            .unwrap_or(0)
    }
    
    /// Get total connection count
    pub async fn get_connection_count(&self) -> usize {
        let connections = self.connections.read().await;
        connections.len()
    }
    
    /// Send event to event handler
    async fn send_event(&self, event: WebSocketEvent) -> CoreResult<()> {
        self.event_sender.send(event).map_err(|_| {
            CoreError::internal("Failed to send WebSocket event".to_string())
        })?;
        
        Ok(())
    }
    
    /// Handle incoming message from connection
    pub async fn handle_connection_message(
        &self,
        connection_id: &str,
        message: WebSocketMessage,
    ) -> CoreResult<()> {
        self.send_event(WebSocketEvent::MessageReceived {
            connection_id: connection_id.to_string(),
            message,
        }).await?;
        
        Ok(())
    }
    
    /// Cleanup stale connections (connections that haven't pinged recently)
    pub async fn cleanup_stale_connections(&self, timeout_seconds: i64) -> CoreResult<Vec<String>> {
        let mut stale_connections = Vec::new();
        let cutoff_time = Utc::now() - chrono::Duration::seconds(timeout_seconds);
        
        {
            let connections = self.connections.read().await;
            for (connection_id, state) in connections.iter() {
                if state.info.last_ping < cutoff_time {
                    stale_connections.push(connection_id.clone());
                }
            }
        }
        
        // Remove stale connections
        for connection_id in &stale_connections {
            self.remove_connection(connection_id).await?;
        }
        
        if !stale_connections.is_empty() {
            info!("Cleaned up {} stale connections", stale_connections.len());
        }
        
        Ok(stale_connections)
    }
}

impl Default for ConnectionManager {
    fn default() -> Self {
        let (manager, _) = Self::new();
        manager
    }
}