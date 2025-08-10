use redis::{AsyncCommands, Client, RedisResult, Connection};
use serde::{Serialize, Deserialize};
use std::time::Duration;
use tracing::{info, warn, error};

/// Redis service for caching operations
pub struct RedisService {
    client: Client,
}

impl RedisService {
    /// Create a new Redis service
    pub fn new() -> Result<Self, redis::RedisError> {
        let redis_url = std::env::var("REDIS_URL")
            .unwrap_or_else(|_| "redis://localhost:6379".to_string());
            
        info!("Connecting to Redis: {}", redis_url);
        let client = Client::open(redis_url)?;
        
        Ok(Self { client })
    }
    
    /// Get a Redis connection
    pub async fn get_connection(&self) -> RedisResult<redis::aio::Connection> {
        self.client.get_async_connection().await
    }
    
    /// Cache a serializable value with TTL in seconds
    pub async fn set<T>(&self, key: &str, value: &T, ttl_seconds: u64) -> RedisResult<()>
    where
        T: Serialize,
    {
        match self.get_connection().await {
            Ok(mut conn) => {
                let serialized = serde_json::to_string(value)
                    .map_err(|e| redis::RedisError::from((redis::ErrorKind::TypeError, "Serialization failed", e.to_string())))?;
                
                let result: RedisResult<()> = conn.set_ex(key, serialized, ttl_seconds).await;
                if let Err(ref e) = result {
                    warn!("Redis SET failed for key {}: {}", key, e);
                }
                result
            }
            Err(e) => {
                error!("Failed to get Redis connection for SET {}: {}", key, e);
                Err(e)
            }
        }
    }
    
    /// Get a cached value and deserialize it
    pub async fn get<T>(&self, key: &str) -> RedisResult<Option<T>>
    where
        T: for<'de> Deserialize<'de>,
    {
        match self.get_connection().await {
            Ok(mut conn) => {
                let result: RedisResult<Option<String>> = conn.get(key).await;
                match result {
                    Ok(Some(data)) => {
                        match serde_json::from_str(&data) {
                            Ok(value) => Ok(Some(value)),
                            Err(e) => {
                                warn!("Redis deserialization failed for key {}: {}", key, e);
                                // Delete invalid cached data
                                let _: RedisResult<()> = conn.del(key).await;
                                Ok(None)
                            }
                        }
                    }
                    Ok(None) => Ok(None),
                    Err(e) => {
                        warn!("Redis GET failed for key {}: {}", key, e);
                        Ok(None) // Return None instead of propagating Redis errors for cache misses
                    }
                }
            }
            Err(e) => {
                error!("Failed to get Redis connection for GET {}: {}", key, e);
                Ok(None) // Graceful degradation - return None if Redis is unavailable
            }
        }
    }
    
    /// Delete a cached value
    pub async fn delete(&self, key: &str) -> RedisResult<()> {
        match self.get_connection().await {
            Ok(mut conn) => {
                let result: RedisResult<()> = conn.del(key).await;
                if let Err(ref e) = result {
                    warn!("Redis DELETE failed for key {}: {}", key, e);
                }
                result
            }
            Err(e) => {
                error!("Failed to get Redis connection for DELETE {}: {}", key, e);
                Err(e)
            }
        }
    }
    
    /// Delete keys matching a pattern
    pub async fn delete_pattern(&self, pattern: &str) -> RedisResult<()> {
        match self.get_connection().await {
            Ok(mut conn) => {
                let keys: Vec<String> = conn.keys(pattern).await.unwrap_or_default();
                if !keys.is_empty() {
                    let result: RedisResult<()> = conn.del(keys).await;
                    if let Err(ref e) = result {
                        warn!("Redis DELETE pattern failed for pattern {}: {}", pattern, e);
                    }
                    result
                } else {
                    Ok(())
                }
            }
            Err(e) => {
                error!("Failed to get Redis connection for DELETE pattern {}: {}", pattern, e);
                Err(e)
            }
        }
    }
    
    /// Check if Redis is connected and healthy
    pub async fn health_check(&self) -> bool {
        match self.get_connection().await {
            Ok(mut conn) => {
                let result: RedisResult<String> = redis::cmd("PING").query_async(&mut conn).await;
                match result {
                    Ok(_) => true,
                    Err(e) => {
                        warn!("Redis health check failed: {}", e);
                        false
                    }
                }
            }
            Err(e) => {
                error!("Failed to get Redis connection for health check: {}", e);
                false
            }
        }
    }
    
    /// Increment a counter with optional TTL
    pub async fn increment_counter(&self, key: &str, ttl_seconds: Option<u64>) -> RedisResult<i64> {
        match self.get_connection().await {
            Ok(mut conn) => {
                let result: RedisResult<i64> = conn.incr(key, 1).await;
                if let (Ok(value), Some(ttl)) = (&result, ttl_seconds) {
                    // Set TTL only if this is the first increment (value == 1)
                    if *value == 1 {
                        let _: RedisResult<()> = conn.expire(key, ttl as i64).await;
                    }
                }
                result
            }
            Err(e) => {
                error!("Failed to get Redis connection for increment {}: {}", key, e);
                Err(e)
            }
        }
    }
}

/// Cache key prefixes for different data types
pub struct CacheKeys;

impl CacheKeys {
    /// WhatsApp config cache key
    pub fn whatsapp_config(id: &str) -> String {
        format!("whatsapp_config:{}", id)
    }
    
    /// WhatsApp default config cache key
    pub fn whatsapp_default_config() -> String {
        "whatsapp_config:default".to_string()
    }
    
    /// WhatsApp configs list cache key
    pub fn whatsapp_configs_list() -> String {
        "whatsapp_configs:list".to_string()
    }
    
    /// WhatsApp active configs cache key
    pub fn whatsapp_active_configs() -> String {
        "whatsapp_configs:active".to_string()
    }
    
    /// WhatsApp config by phone ID cache key
    pub fn whatsapp_config_by_phone(phone_id: &str) -> String {
        format!("whatsapp_config:phone:{}", phone_id)
    }
    
    /// WhatsApp config by instance cache key
    pub fn whatsapp_config_by_instance(instance_name: &str) -> String {
        format!("whatsapp_config:instance:{}", instance_name)
    }
    
    /// Rate limit key
    pub fn rate_limit(identifier: &str, endpoint: &str) -> String {
        format!("rate_limit:{}:{}", identifier, endpoint)
    }
}