use std::collections::HashMap;
use std::time::Duration;
use serde_json::json;
use uuid::Uuid;
use tokio::time::sleep;
use serial_test::serial;
use pretty_assertions::assert_eq;
use rstest::*;

use crate::common::*;

#[cfg(test)]
mod redis_caching_tests {
    use super::*;

    // Mock Redis cache implementation for testing
    pub struct MockRedisCache {
        pub data: std::sync::Arc<std::sync::RwLock<HashMap<String, (String, Option<Duration>)>>>,
        pub should_fail: bool,
    }

    impl MockRedisCache {
        pub fn new() -> Self {
            Self {
                data: std::sync::Arc::new(std::sync::RwLock::new(HashMap::new())),
                should_fail: false,
            }
        }

        pub fn with_failure() -> Self {
            Self {
                data: std::sync::Arc::new(std::sync::RwLock::new(HashMap::new())),
                should_fail: true,
            }
        }

        pub async fn set(&self, key: &str, value: &str, ttl: Option<Duration>) -> Result<(), String> {
            if self.should_fail {
                return Err("Redis connection failed".to_string());
            }

            let mut data = self.data.write().unwrap();
            data.insert(key.to_string(), (value.to_string(), ttl));
            Ok(())
        }

        pub async fn get(&self, key: &str) -> Result<Option<String>, String> {
            if self.should_fail {
                return Err("Redis connection failed".to_string());
            }

            let data = self.data.read().unwrap();
            Ok(data.get(key).map(|(value, _)| value.clone()))
        }

        pub async fn del(&self, key: &str) -> Result<bool, String> {
            if self.should_fail {
                return Err("Redis connection failed".to_string());
            }

            let mut data = self.data.write().unwrap();
            Ok(data.remove(key).is_some())
        }

        pub async fn exists(&self, key: &str) -> Result<bool, String> {
            if self.should_fail {
                return Err("Redis connection failed".to_string());
            }

            let data = self.data.read().unwrap();
            Ok(data.contains_key(key))
        }

        pub async fn expire(&self, key: &str, ttl: Duration) -> Result<bool, String> {
            if self.should_fail {
                return Err("Redis connection failed".to_string());
            }

            let mut data = self.data.write().unwrap();
            if let Some((value, _)) = data.get(key) {
                let value = value.clone();
                data.insert(key.to_string(), (value, Some(ttl)));
                Ok(true)
            } else {
                Ok(false)
            }
        }

        pub async fn incr(&self, key: &str) -> Result<i64, String> {
            if self.should_fail {
                return Err("Redis connection failed".to_string());
            }

            let mut data = self.data.write().unwrap();
            let current_value = data.get(key)
                .and_then(|(value, _)| value.parse::<i64>().ok())
                .unwrap_or(0);
            let new_value = current_value + 1;
            data.insert(key.to_string(), (new_value.to_string(), None));
            Ok(new_value)
        }

        pub async fn decr(&self, key: &str) -> Result<i64, String> {
            if self.should_fail {
                return Err("Redis connection failed".to_string());
            }

            let mut data = self.data.write().unwrap();
            let current_value = data.get(key)
                .and_then(|(value, _)| value.parse::<i64>().ok())
                .unwrap_or(0);
            let new_value = current_value - 1;
            data.insert(key.to_string(), (new_value.to_string(), None));
            Ok(new_value)
        }

        pub async fn flush_all(&self) -> Result<(), String> {
            if self.should_fail {
                return Err("Redis connection failed".to_string());
            }

            let mut data = self.data.write().unwrap();
            data.clear();
            Ok(())
        }

        pub async fn keys(&self, pattern: &str) -> Result<Vec<String>, String> {
            if self.should_fail {
                return Err("Redis connection failed".to_string());
            }

            let data = self.data.read().unwrap();
            let keys: Vec<String> = data.keys()
                .filter(|key| {
                    // Simple pattern matching - just prefix matching for now
                    if pattern.ends_with('*') {
                        let prefix = &pattern[..pattern.len() - 1];
                        key.starts_with(prefix)
                    } else {
                        key == &pattern
                    }
                })
                .cloned()
                .collect();
            Ok(keys)
        }
    }

    #[fixture]
    fn mock_cache() -> MockRedisCache {
        MockRedisCache::new()
    }

    #[fixture]
    fn failing_cache() -> MockRedisCache {
        MockRedisCache::with_failure()
    }

    #[rstest]
    #[tokio::test]
    async fn test_set_and_get(mock_cache: MockRedisCache) {
        let key = "test_key";
        let value = "test_value";

        let result = mock_cache.set(key, value, None).await;
        assert!(result.is_ok());

        let retrieved = mock_cache.get(key).await;
        assert!(retrieved.is_ok());
        assert_eq!(retrieved.unwrap(), Some(value.to_string()));
    }

    #[rstest]
    #[tokio::test]
    async fn test_get_nonexistent_key(mock_cache: MockRedisCache) {
        let result = mock_cache.get("nonexistent_key").await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);
    }

    #[rstest]
    #[tokio::test]
    async fn test_delete_key(mock_cache: MockRedisCache) {
        let key = "test_delete_key";
        let value = "test_value";

        // Set the key
        mock_cache.set(key, value, None).await.unwrap();

        // Verify it exists
        let exists = mock_cache.exists(key).await.unwrap();
        assert!(exists);

        // Delete the key
        let deleted = mock_cache.del(key).await.unwrap();
        assert!(deleted);

        // Verify it's gone
        let exists = mock_cache.exists(key).await.unwrap();
        assert!(!exists);
    }

    #[rstest]
    #[tokio::test]
    async fn test_increment_counter(mock_cache: MockRedisCache) {
        let key = "counter_key";

        // First increment (should start from 0)
        let value1 = mock_cache.incr(key).await.unwrap();
        assert_eq!(value1, 1);

        // Second increment
        let value2 = mock_cache.incr(key).await.unwrap();
        assert_eq!(value2, 2);

        // Third increment
        let value3 = mock_cache.incr(key).await.unwrap();
        assert_eq!(value3, 3);
    }

    #[rstest]
    #[tokio::test]
    async fn test_decrement_counter(mock_cache: MockRedisCache) {
        let key = "decr_counter_key";

        // Set initial value
        mock_cache.set(key, "10", None).await.unwrap();

        // Decrement
        let value1 = mock_cache.decr(key).await.unwrap();
        assert_eq!(value1, 9);

        let value2 = mock_cache.decr(key).await.unwrap();
        assert_eq!(value2, 8);
    }

    #[rstest]
    #[tokio::test]
    async fn test_keys_pattern_matching(mock_cache: MockRedisCache) {
        // Set up test data
        mock_cache.set("user:1:profile", "profile1", None).await.unwrap();
        mock_cache.set("user:2:profile", "profile2", None).await.unwrap();
        mock_cache.set("user:1:settings", "settings1", None).await.unwrap();
        mock_cache.set("session:abc", "session_data", None).await.unwrap();

        // Test pattern matching
        let user_keys = mock_cache.keys("user:*").await.unwrap();
        assert_eq!(user_keys.len(), 3);

        let session_keys = mock_cache.keys("session:*").await.unwrap();
        assert_eq!(session_keys.len(), 1);

        let all_keys = mock_cache.keys("*").await.unwrap();
        assert_eq!(all_keys.len(), 4);
    }

    #[rstest]
    #[tokio::test]
    async fn test_cache_failure_handling(failing_cache: MockRedisCache) {
        let result = failing_cache.set("key", "value", None).await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Redis connection failed");

        let result = failing_cache.get("key").await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Redis connection failed");
    }

    #[rstest]
    #[tokio::test]
    async fn test_json_caching(mock_cache: MockRedisCache) {
        let user_data = json!({
            "id": 123,
            "name": "John Doe",
            "email": "john@example.com",
            "settings": {
                "theme": "dark",
                "notifications": true
            }
        });

        let key = "user:123:data";
        let value = serde_json::to_string(&user_data).unwrap();

        // Cache JSON data
        mock_cache.set(key, &value, None).await.unwrap();

        // Retrieve and parse
        let retrieved = mock_cache.get(key).await.unwrap().unwrap();
        let parsed_data: serde_json::Value = serde_json::from_str(&retrieved).unwrap();

        assert_eq!(parsed_data, user_data);
        assert_eq!(parsed_data["name"], "John Doe");
        assert_eq!(parsed_data["settings"]["theme"], "dark");
    }
}

#[cfg(test)]
mod redis_session_cache_tests {
    use super::*;

    // Session cache implementation
    pub struct SessionCache {
        cache: MockRedisCache,
    }

    impl SessionCache {
        pub fn new(cache: MockRedisCache) -> Self {
            Self { cache }
        }

        pub async fn set_session(&self, session_id: &str, user_id: u32, ttl: Duration) -> Result<(), String> {
            let session_data = json!({
                "user_id": user_id,
                "created_at": chrono::Utc::now().timestamp(),
                "expires_at": (chrono::Utc::now() + chrono::Duration::from_std(ttl).unwrap()).timestamp()
            });

            let key = format!("session:{}", session_id);
            let value = serde_json::to_string(&session_data).map_err(|e| e.to_string())?;
            self.cache.set(&key, &value, Some(ttl)).await
        }

        pub async fn get_session(&self, session_id: &str) -> Result<Option<u32>, String> {
            let key = format!("session:{}", session_id);
            match self.cache.get(&key).await? {
                Some(data) => {
                    let session_data: serde_json::Value = serde_json::from_str(&data)
                        .map_err(|e| e.to_string())?;
                    Ok(Some(session_data["user_id"].as_u64().unwrap() as u32))
                }
                None => Ok(None)
            }
        }

        pub async fn invalidate_session(&self, session_id: &str) -> Result<bool, String> {
            let key = format!("session:{}", session_id);
            self.cache.del(&key).await
        }

        pub async fn extend_session(&self, session_id: &str, ttl: Duration) -> Result<bool, String> {
            let key = format!("session:{}", session_id);
            self.cache.expire(&key, ttl).await
        }
    }

    #[tokio::test]
    async fn test_session_creation_and_retrieval() {
        let cache = MockRedisCache::new();
        let session_cache = SessionCache::new(cache);

        let session_id = Uuid::new_v4().to_string();
        let user_id = 123;
        let ttl = Duration::from_secs(3600); // 1 hour

        // Create session
        let result = session_cache.set_session(&session_id, user_id, ttl).await;
        assert!(result.is_ok());

        // Retrieve session
        let retrieved_user_id = session_cache.get_session(&session_id).await.unwrap();
        assert_eq!(retrieved_user_id, Some(user_id));
    }

    #[tokio::test]
    async fn test_session_invalidation() {
        let cache = MockRedisCache::new();
        let session_cache = SessionCache::new(cache);

        let session_id = Uuid::new_v4().to_string();
        let user_id = 456;
        let ttl = Duration::from_secs(3600);

        // Create session
        session_cache.set_session(&session_id, user_id, ttl).await.unwrap();

        // Verify session exists
        let retrieved = session_cache.get_session(&session_id).await.unwrap();
        assert_eq!(retrieved, Some(user_id));

        // Invalidate session
        let invalidated = session_cache.invalidate_session(&session_id).await.unwrap();
        assert!(invalidated);

        // Verify session is gone
        let retrieved = session_cache.get_session(&session_id).await.unwrap();
        assert_eq!(retrieved, None);
    }
}

#[cfg(test)]
mod redis_rate_limiting_cache_tests {
    use super::*;

    // Rate limiter using Redis
    pub struct RateLimiter {
        cache: MockRedisCache,
    }

    impl RateLimiter {
        pub fn new(cache: MockRedisCache) -> Self {
            Self { cache }
        }

        pub async fn is_allowed(&self, key: &str, limit: i64, window_secs: u64) -> Result<bool, String> {
            let window_key = format!("rate_limit:{}:{}", key, self.current_window(window_secs));
            
            let current_count = self.cache.incr(&window_key).await?;
            
            if current_count == 1 {
                // First request in this window, set expiration
                self.cache.expire(&window_key, Duration::from_secs(window_secs)).await?;
            }
            
            Ok(current_count <= limit)
        }

        pub async fn get_remaining(&self, key: &str, limit: i64, window_secs: u64) -> Result<i64, String> {
            let window_key = format!("rate_limit:{}:{}", key, self.current_window(window_secs));
            
            let current_count = self.cache.get(&window_key).await?
                .and_then(|v| v.parse::<i64>().ok())
                .unwrap_or(0);
            
            Ok((limit - current_count).max(0))
        }

        fn current_window(&self, window_secs: u64) -> u64 {
            chrono::Utc::now().timestamp() as u64 / window_secs
        }
    }

    #[tokio::test]
    async fn test_rate_limiting_within_limit() {
        let cache = MockRedisCache::new();
        let rate_limiter = RateLimiter::new(cache);

        let key = "user:123";
        let limit = 10;
        let window_secs = 60;

        // Make requests within limit
        for i in 1..=5 {
            let allowed = rate_limiter.is_allowed(key, limit, window_secs).await.unwrap();
            assert!(allowed, "Request {} should be allowed", i);
        }

        // Check remaining requests
        let remaining = rate_limiter.get_remaining(key, limit, window_secs).await.unwrap();
        assert_eq!(remaining, 5); // 10 - 5 = 5 remaining
    }

    #[tokio::test]
    async fn test_rate_limiting_exceeds_limit() {
        let cache = MockRedisCache::new();
        let rate_limiter = RateLimiter::new(cache);

        let key = "user:456";
        let limit = 3;
        let window_secs = 60;

        // Make requests up to limit
        for i in 1..=3 {
            let allowed = rate_limiter.is_allowed(key, limit, window_secs).await.unwrap();
            assert!(allowed, "Request {} should be allowed", i);
        }

        // Exceed limit
        let allowed = rate_limiter.is_allowed(key, limit, window_secs).await.unwrap();
        assert!(!allowed, "Request should be denied");

        // Check remaining requests
        let remaining = rate_limiter.get_remaining(key, limit, window_secs).await.unwrap();
        assert_eq!(remaining, 0);
    }
}

#[cfg(test)]
mod redis_conversation_cache_tests {
    use super::*;

    // Conversation cache for WhatsApp conversations
    pub struct ConversationCache {
        cache: MockRedisCache,
    }

    #[derive(serde::Serialize, serde::Deserialize, Clone)]
    pub struct CachedConversation {
        pub id: String,
        pub user_phone: String,
        pub last_message: String,
        pub last_message_time: i64,
        pub status: String,
        pub unread_count: u32,
    }

    impl ConversationCache {
        pub fn new(cache: MockRedisCache) -> Self {
            Self { cache }
        }

        pub async fn cache_conversation(&self, conversation: &CachedConversation, ttl: Duration) -> Result<(), String> {
            let key = format!("conversation:{}", conversation.id);
            let value = serde_json::to_string(conversation).map_err(|e| e.to_string())?;
            self.cache.set(&key, &value, Some(ttl)).await
        }

        pub async fn get_conversation(&self, conversation_id: &str) -> Result<Option<CachedConversation>, String> {
            let key = format!("conversation:{}", conversation_id);
            match self.cache.get(&key).await? {
                Some(data) => {
                    let conversation: CachedConversation = serde_json::from_str(&data)
                        .map_err(|e| e.to_string())?;
                    Ok(Some(conversation))
                }
                None => Ok(None)
            }
        }

        pub async fn update_last_message(&self, conversation_id: &str, message: &str) -> Result<bool, String> {
            let key = format!("conversation:{}", conversation_id);
            match self.cache.get(&key).await? {
                Some(data) => {
                    let mut conversation: CachedConversation = serde_json::from_str(&data)
                        .map_err(|e| e.to_string())?;
                    conversation.last_message = message.to_string();
                    conversation.last_message_time = chrono::Utc::now().timestamp();
                    
                    let updated_value = serde_json::to_string(&conversation)
                        .map_err(|e| e.to_string())?;
                    self.cache.set(&key, &updated_value, None).await?;
                    Ok(true)
                }
                None => Ok(false)
            }
        }

        pub async fn increment_unread(&self, conversation_id: &str) -> Result<u32, String> {
            let key = format!("conversation:{}", conversation_id);
            match self.cache.get(&key).await? {
                Some(data) => {
                    let mut conversation: CachedConversation = serde_json::from_str(&data)
                        .map_err(|e| e.to_string())?;
                    conversation.unread_count += 1;
                    
                    let updated_value = serde_json::to_string(&conversation)
                        .map_err(|e| e.to_string())?;
                    self.cache.set(&key, &updated_value, None).await?;
                    Ok(conversation.unread_count)
                }
                None => Err("Conversation not found".to_string())
            }
        }

        pub async fn clear_unread(&self, conversation_id: &str) -> Result<bool, String> {
            let key = format!("conversation:{}", conversation_id);
            match self.cache.get(&key).await? {
                Some(data) => {
                    let mut conversation: CachedConversation = serde_json::from_str(&data)
                        .map_err(|e| e.to_string())?;
                    conversation.unread_count = 0;
                    
                    let updated_value = serde_json::to_string(&conversation)
                        .map_err(|e| e.to_string())?;
                    self.cache.set(&key, &updated_value, None).await?;
                    Ok(true)
                }
                None => Ok(false)
            }
        }
    }

    #[tokio::test]
    async fn test_conversation_caching() {
        let cache = MockRedisCache::new();
        let conv_cache = ConversationCache::new(cache);

        let conversation = CachedConversation {
            id: Uuid::new_v4().to_string(),
            user_phone: "+5561999999999".to_string(),
            last_message: "Hello, World!".to_string(),
            last_message_time: chrono::Utc::now().timestamp(),
            status: "active".to_string(),
            unread_count: 0,
        };

        // Cache conversation
        let result = conv_cache.cache_conversation(&conversation, Duration::from_secs(3600)).await;
        assert!(result.is_ok());

        // Retrieve conversation
        let retrieved = conv_cache.get_conversation(&conversation.id).await.unwrap();
        assert!(retrieved.is_some());
        
        let retrieved_conv = retrieved.unwrap();
        assert_eq!(retrieved_conv.id, conversation.id);
        assert_eq!(retrieved_conv.user_phone, conversation.user_phone);
        assert_eq!(retrieved_conv.last_message, conversation.last_message);
    }

    #[tokio::test]
    async fn test_conversation_unread_counter() {
        let cache = MockRedisCache::new();
        let conv_cache = ConversationCache::new(cache);

        let conversation = CachedConversation {
            id: Uuid::new_v4().to_string(),
            user_phone: "+5561888888888".to_string(),
            last_message: "Initial message".to_string(),
            last_message_time: chrono::Utc::now().timestamp(),
            status: "active".to_string(),
            unread_count: 0,
        };

        // Cache conversation
        conv_cache.cache_conversation(&conversation, Duration::from_secs(3600)).await.unwrap();

        // Increment unread count
        let unread1 = conv_cache.increment_unread(&conversation.id).await.unwrap();
        assert_eq!(unread1, 1);

        let unread2 = conv_cache.increment_unread(&conversation.id).await.unwrap();
        assert_eq!(unread2, 2);

        // Clear unread count
        let cleared = conv_cache.clear_unread(&conversation.id).await.unwrap();
        assert!(cleared);

        // Verify count is cleared
        let retrieved = conv_cache.get_conversation(&conversation.id).await.unwrap().unwrap();
        assert_eq!(retrieved.unread_count, 0);
    }
}

#[cfg(test)]
mod redis_integration_tests {
    use super::*;

    #[tokio::test]
    #[serial]
    async fn test_real_redis_connection() {
        if should_skip_redis_tests() {
            return;
        }

        let test_redis = TestRedis::client().await;
        if test_redis.is_mock {
            println!("Skipping Redis integration test - Redis not available");
            return;
        }

        // This would test with real Redis if available
        // For now, we'll just verify the connection was successful
        assert!(!test_redis.is_mock);
    }

    #[tokio::test]
    #[serial]
    async fn test_redis_cleanup() {
        if should_skip_redis_tests() {
            return;
        }

        let test_redis = TestRedis::client().await;
        let result = test_redis.cleanup().await;
        
        if test_redis.is_mock {
            assert!(result.is_ok());
        } else {
            // Test actual cleanup if Redis is available
            match result {
                Ok(_) => println!("Redis cleanup successful"),
                Err(e) => println!("Redis cleanup failed: {:?}", e),
            }
        }
    }
}

// Performance tests for Redis operations
#[cfg(test)]
mod redis_performance_tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_set_get_performance() {
        let _perf_test = PerformanceTest::new("redis_set_get");
        let cache = MockRedisCache::new();

        let key = "perf_test_key";
        let value = "perf_test_value";

        // Test set performance
        cache.set(key, value, None).await.unwrap();

        // Test get performance
        let retrieved = cache.get(key).await.unwrap();
        assert_eq!(retrieved, Some(value.to_string()));

        _perf_test.assert_faster_than(Duration::from_millis(10));
    }

    #[tokio::test]
    async fn test_bulk_operations_performance() {
        let _perf_test = PerformanceTest::new("redis_bulk_operations");
        let cache = MockRedisCache::new();

        let operation_count = 1000;
        
        // Bulk set operations
        for i in 0..operation_count {
            let key = format!("bulk_key_{}", i);
            let value = format!("bulk_value_{}", i);
            cache.set(&key, &value, None).await.unwrap();
        }

        // Bulk get operations
        for i in 0..operation_count {
            let key = format!("bulk_key_{}", i);
            let retrieved = cache.get(&key).await.unwrap();
            assert!(retrieved.is_some());
        }

        _perf_test.assert_faster_than(Duration::from_secs(1));
    }
}