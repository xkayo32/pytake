//! Session management
//!
//! This module provides session management functionality for tracking
//! user sessions and maintaining session state.

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// Session information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    /// Unique session ID
    pub id: String,
    
    /// User ID associated with this session
    pub user_id: String,
    
    /// Session creation time
    pub created_at: DateTime<Utc>,
    
    /// Last activity time
    pub last_activity: DateTime<Utc>,
    
    /// Session expiration time
    pub expires_at: DateTime<Utc>,
    
    /// IP address of the session
    pub ip_address: Option<String>,
    
    /// User agent string
    pub user_agent: Option<String>,
    
    /// Device information
    pub device_info: Option<DeviceInfo>,
    
    /// Session metadata
    pub metadata: HashMap<String, serde_json::Value>,
    
    /// Is session active
    pub is_active: bool,
}

/// Device information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub device_type: DeviceType,
    pub os: Option<String>,
    pub browser: Option<String>,
    pub is_mobile: bool,
}

/// Device type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeviceType {
    Desktop,
    Mobile,
    Tablet,
    Unknown,
}

impl Session {
    /// Create a new session
    pub fn new(
        user_id: String,
        duration: Duration,
        ip_address: Option<String>,
        user_agent: Option<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            user_id,
            created_at: now,
            last_activity: now,
            expires_at: now + duration,
            ip_address,
            user_agent: user_agent.clone(),
            device_info: user_agent.as_ref().map(|ua| parse_device_info(ua)),
            metadata: HashMap::new(),
            is_active: true,
        }
    }
    
    /// Check if session is expired
    pub fn is_expired(&self) -> bool {
        Utc::now() > self.expires_at
    }
    
    /// Update last activity time
    pub fn update_activity(&mut self) {
        self.last_activity = Utc::now();
    }
    
    /// Extend session expiration
    pub fn extend(&mut self, duration: Duration) {
        self.expires_at = Utc::now() + duration;
        self.update_activity();
    }
    
    /// Invalidate session
    pub fn invalidate(&mut self) {
        self.is_active = false;
        self.expires_at = Utc::now();
    }
    
    /// Add metadata to session
    pub fn add_metadata(&mut self, key: String, value: serde_json::Value) {
        self.metadata.insert(key, value);
    }
}

/// Session manager trait
#[async_trait::async_trait]
pub trait SessionManager: Send + Sync {
    /// Create a new session
    async fn create_session(
        &self,
        user_id: &str,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
    ) -> Result<Session, SessionError>;
    
    /// Get a session by ID
    async fn get_session(&self, session_id: &str) -> Result<Option<Session>, SessionError>;
    
    /// Update a session
    async fn update_session(&self, session: &Session) -> Result<(), SessionError>;
    
    /// Delete a session
    async fn delete_session(&self, session_id: &str) -> Result<(), SessionError>;
    
    /// Get all sessions for a user
    async fn get_user_sessions(&self, user_id: &str) -> Result<Vec<Session>, SessionError>;
    
    /// Delete all sessions for a user
    async fn delete_user_sessions(&self, user_id: &str) -> Result<(), SessionError>;
    
    /// Clean up expired sessions
    async fn cleanup_expired_sessions(&self) -> Result<usize, SessionError>;
}

/// In-memory session manager (for development/testing)
pub struct InMemorySessionManager {
    sessions: tokio::sync::RwLock<HashMap<String, Session>>,
    session_duration: Duration,
}

impl InMemorySessionManager {
    /// Create a new in-memory session manager
    pub fn new(session_duration: Duration) -> Self {
        Self {
            sessions: tokio::sync::RwLock::new(HashMap::new()),
            session_duration,
        }
    }
}

#[async_trait::async_trait]
impl SessionManager for InMemorySessionManager {
    async fn create_session(
        &self,
        user_id: &str,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
    ) -> Result<Session, SessionError> {
        let session = Session::new(
            user_id.to_string(),
            self.session_duration,
            ip_address.map(|s| s.to_string()),
            user_agent.map(|s| s.to_string()),
        );
        
        let mut sessions = self.sessions.write().await;
        sessions.insert(session.id.clone(), session.clone());
        
        Ok(session)
    }
    
    async fn get_session(&self, session_id: &str) -> Result<Option<Session>, SessionError> {
        let sessions = self.sessions.read().await;
        Ok(sessions.get(session_id).cloned())
    }
    
    async fn update_session(&self, session: &Session) -> Result<(), SessionError> {
        let mut sessions = self.sessions.write().await;
        sessions.insert(session.id.clone(), session.clone());
        Ok(())
    }
    
    async fn delete_session(&self, session_id: &str) -> Result<(), SessionError> {
        let mut sessions = self.sessions.write().await;
        sessions.remove(session_id);
        Ok(())
    }
    
    async fn get_user_sessions(&self, user_id: &str) -> Result<Vec<Session>, SessionError> {
        let sessions = self.sessions.read().await;
        let user_sessions: Vec<Session> = sessions
            .values()
            .filter(|s| s.user_id == user_id && s.is_active)
            .cloned()
            .collect();
        Ok(user_sessions)
    }
    
    async fn delete_user_sessions(&self, user_id: &str) -> Result<(), SessionError> {
        let mut sessions = self.sessions.write().await;
        sessions.retain(|_, session| session.user_id != user_id);
        Ok(())
    }
    
    async fn cleanup_expired_sessions(&self) -> Result<usize, SessionError> {
        let mut sessions = self.sessions.write().await;
        let initial_count = sessions.len();
        sessions.retain(|_, session| !session.is_expired() && session.is_active);
        Ok(initial_count - sessions.len())
    }
}

/// Session-related errors
#[derive(Debug, thiserror::Error)]
pub enum SessionError {
    #[error("Session not found")]
    NotFound,
    
    #[error("Session expired")]
    Expired,
    
    #[error("Session already exists")]
    AlreadyExists,
    
    #[error("Invalid session data")]
    InvalidData,
    
    #[error("Storage error: {0}")]
    StorageError(String),
}

/// Parse device information from user agent
fn parse_device_info(user_agent: &str) -> DeviceInfo {
    let ua_lower = user_agent.to_lowercase();
    
    let is_mobile = ua_lower.contains("mobile") 
        || ua_lower.contains("android") 
        || ua_lower.contains("iphone");
    
    let is_tablet = ua_lower.contains("tablet") || ua_lower.contains("ipad");
    
    let device_type = if is_tablet {
        DeviceType::Tablet
    } else if is_mobile {
        DeviceType::Mobile
    } else if ua_lower.contains("windows") || ua_lower.contains("mac") || ua_lower.contains("linux") {
        DeviceType::Desktop
    } else {
        DeviceType::Unknown
    };
    
    let os = if ua_lower.contains("windows") {
        Some("Windows".to_string())
    } else if ua_lower.contains("mac") {
        Some("macOS".to_string())
    } else if ua_lower.contains("linux") {
        Some("Linux".to_string())
    } else if ua_lower.contains("android") {
        Some("Android".to_string())
    } else if ua_lower.contains("ios") || ua_lower.contains("iphone") || ua_lower.contains("ipad") {
        Some("iOS".to_string())
    } else {
        None
    };
    
    let browser = if ua_lower.contains("chrome") {
        Some("Chrome".to_string())
    } else if ua_lower.contains("firefox") {
        Some("Firefox".to_string())
    } else if ua_lower.contains("safari") && !ua_lower.contains("chrome") {
        Some("Safari".to_string())
    } else if ua_lower.contains("edge") {
        Some("Edge".to_string())
    } else {
        None
    };
    
    DeviceInfo {
        device_type,
        os,
        browser,
        is_mobile: is_mobile || is_tablet,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_session_creation() {
        let session = Session::new(
            "user123".to_string(),
            Duration::hours(1),
            Some("192.168.1.1".to_string()),
            Some("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0".to_string()),
        );
        
        assert_eq!(session.user_id, "user123");
        assert!(!session.is_expired());
        assert!(session.is_active);
        assert_eq!(session.ip_address, Some("192.168.1.1".to_string()));
    }
    
    #[test]
    fn test_session_expiration() {
        let mut session = Session::new(
            "user123".to_string(),
            Duration::seconds(-1), // Already expired
            None,
            None,
        );
        
        assert!(session.is_expired());
        
        // Extend session
        session.extend(Duration::hours(1));
        assert!(!session.is_expired());
    }
    
    #[test]
    fn test_device_info_parsing() {
        let mobile_ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)";
        let device_info = parse_device_info(mobile_ua);
        assert!(matches!(device_info.device_type, DeviceType::Mobile));
        assert_eq!(device_info.os, Some("iOS".to_string()));
        assert!(device_info.is_mobile);
        
        let desktop_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0";
        let device_info = parse_device_info(desktop_ua);
        assert!(matches!(device_info.device_type, DeviceType::Desktop));
        assert_eq!(device_info.os, Some("Windows".to_string()));
        assert!(!device_info.is_mobile);
    }
    
    #[tokio::test]
    async fn test_in_memory_session_manager() {
        let manager = InMemorySessionManager::new(Duration::hours(1));
        
        // Create session
        let session = manager
            .create_session("user123", Some("192.168.1.1"), None)
            .await
            .unwrap();
        
        // Get session
        let retrieved = manager.get_session(&session.id).await.unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().user_id, "user123");
        
        // Get user sessions
        let user_sessions = manager.get_user_sessions("user123").await.unwrap();
        assert_eq!(user_sessions.len(), 1);
        
        // Delete session
        manager.delete_session(&session.id).await.unwrap();
        let retrieved = manager.get_session(&session.id).await.unwrap();
        assert!(retrieved.is_none());
    }
}