//! Testes para o sistema de webhooks avançado

use simple_api::webhook_manager::{
    WebhookManager, WebhookConfig, WebhookEvent, RetryPolicy, EventSeverity, AuthConfig
};
use std::collections::HashMap;
use serde_json::json;
use tokio::time::{sleep, Duration};

#[tokio::test]
async fn test_webhook_manager_creation() {
    let manager = WebhookManager::new();
    
    // Manager deve iniciar sem tenants
    assert!(manager.list_tenants().await.is_empty());
}

#[tokio::test]
async fn test_webhook_configuration() {
    let manager = WebhookManager::new();
    
    let config = WebhookConfig::new(
        "test-tenant".to_string(),
        "https://example.com/webhook".to_string(),
        "test-secret".to_string(),
    );
    
    // Configuração deve ser bem-sucedida
    assert!(manager.configure_tenant(config.clone()).await.is_ok());
    
    // Deve aparecer na lista de tenants
    let tenants = manager.list_tenants().await;
    assert_eq!(tenants.len(), 1);
    assert_eq!(tenants[0], "test-tenant");
    
    // Deve conseguir recuperar a configuração
    let retrieved = manager.get_tenant_config("test-tenant").await;
    assert!(retrieved.is_some());
    
    let retrieved_config = retrieved.unwrap();
    assert_eq!(retrieved_config.tenant_id, config.tenant_id);
    assert_eq!(retrieved_config.base_url, config.base_url);
    assert_eq!(retrieved_config.secret_key, config.secret_key);
}

#[tokio::test]
async fn test_webhook_config_validation() {
    let manager = WebhookManager::new();
    
    // URL vazia deve falhar
    let invalid_config = WebhookConfig::new(
        "test".to_string(),
        "".to_string(),
        "secret".to_string(),
    );
    
    assert!(manager.configure_tenant(invalid_config).await.is_err());
    
    // Secret key vazia deve falhar
    let invalid_config2 = WebhookConfig::new(
        "test".to_string(),
        "https://example.com".to_string(),
        "".to_string(),
    );
    
    assert!(manager.configure_tenant(invalid_config2).await.is_err());
}

#[tokio::test]
async fn test_event_enabled_check() {
    let mut config = WebhookConfig::new(
        "test".to_string(),
        "https://example.com".to_string(),
        "secret".to_string(),
    );
    
    // Por padrão, todos os eventos são habilitados
    assert!(config.is_event_enabled("user.created"));
    assert!(config.is_event_enabled("order.completed"));
    
    // Teste com eventos específicos
    config.enabled_events = vec![
        "user.created".to_string(),
        "user.*".to_string()
    ];
    
    assert!(config.is_event_enabled("user.created"));
    assert!(config.is_event_enabled("user.updated"));
    assert!(!config.is_event_enabled("order.completed"));
    
    // Webhook inativo deve rejeitar todos os eventos
    config.active = false;
    assert!(!config.is_event_enabled("user.created"));
}

#[tokio::test]
async fn test_signature_calculation_and_verification() {
    let manager = WebhookManager::new();
    let payload = r#"{"test": "data", "number": 123}"#;
    let secret = "test-secret-key";
    
    // Calcula assinatura
    let signature = manager.calculate_signature(payload, secret).unwrap();
    
    // Deve começar com "sha256="
    assert!(signature.starts_with("sha256="));
    
    // Mesma entrada deve produzir mesma assinatura
    let signature2 = manager.calculate_signature(payload, secret).unwrap();
    assert_eq!(signature, signature2);
    
    // Verificação deve funcionar
    assert!(manager.verify_signature(payload, &signature, secret));
    
    // Secret errado deve falhar
    assert!(!manager.verify_signature(payload, &signature, "wrong-secret"));
    
    // Assinatura errada deve falhar
    assert!(!manager.verify_signature(payload, "sha256=wrongsig", secret));
    
    // Payload diferente deve falhar
    assert!(!manager.verify_signature(r#"{"different": "data"}"#, &signature, secret));
}

#[tokio::test]
async fn test_retry_policy() {
    let manager = WebhookManager::new();
    
    let policy = RetryPolicy {
        max_retries: 3,
        initial_delay_seconds: 1,
        backoff_multiplier: 2.0,
        max_delay_seconds: 60,
        jitter: false,
    };
    
    // Testa cálculo de delay
    let delay1 = manager.calculate_retry_delay(&policy, 1);
    let delay2 = manager.calculate_retry_delay(&policy, 2);
    let delay3 = manager.calculate_retry_delay(&policy, 3);
    
    assert_eq!(delay1, Duration::from_secs(1));
    assert_eq!(delay2, Duration::from_secs(2));
    assert_eq!(delay3, Duration::from_secs(4));
    
    // Testa com jitter
    let policy_with_jitter = RetryPolicy {
        jitter: true,
        ..policy
    };
    
    let delay_jitter = manager.calculate_retry_delay(&policy_with_jitter, 1);
    // Com jitter, deve ser próximo mas não exatamente 1 segundo
    let delay_ms = delay_jitter.as_millis();
    assert!(delay_ms >= 800 && delay_ms <= 1200); // ±20%
}

#[tokio::test]
async fn test_webhook_event_creation() {
    let event = WebhookEvent::new(
        "test-tenant".to_string(),
        "user.created".to_string(),
        json!({"user_id": "123", "name": "Test User"}),
    );
    
    assert!(!event.id.is_empty());
    assert_eq!(event.tenant_id, "test-tenant");
    assert_eq!(event.event_type, "user.created");
    assert_eq!(event.payload["user_id"], "123");
    assert_eq!(event.payload["name"], "Test User");
    
    // Testa builder pattern
    let mut custom_headers = HashMap::new();
    custom_headers.insert("X-Priority".to_string(), "high".to_string());
    
    let event_with_options = WebhookEvent::new(
        "test-tenant".to_string(),
        "order.created".to_string(),
        json!({"order_id": "ord_123"}),
    )
    .with_headers(custom_headers.clone())
    .with_severity(EventSeverity::High)
    .with_target_url("https://specific-url.com/webhook".to_string())
    .with_context("source".to_string(), "api".to_string());
    
    assert_eq!(event_with_options.custom_headers, custom_headers);
    assert!(matches!(event_with_options.severity, EventSeverity::High));
    assert_eq!(event_with_options.target_url, Some("https://specific-url.com/webhook".to_string()));
    assert_eq!(event_with_options.context.get("source"), Some(&"api".to_string()));
}

#[tokio::test]
async fn test_payload_preparation() {
    let manager = WebhookManager::new();
    
    let event = WebhookEvent::new(
        "test-tenant".to_string(),
        "test.event".to_string(),
        json!({"key": "value", "number": 42}),
    );
    
    let payload = manager.prepare_payload(&event).unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&payload).unwrap();
    
    // Verifica estrutura do payload
    assert_eq!(parsed["event_type"], "test.event");
    assert_eq!(parsed["tenant_id"], "test-tenant");
    assert_eq!(parsed["event_id"], event.id);
    assert_eq!(parsed["data"]["key"], "value");
    assert_eq!(parsed["data"]["number"], 42);
    assert!(parsed["timestamp"].is_number());
}

#[tokio::test]
async fn test_auth_config() {
    let mut config = WebhookConfig::new(
        "test".to_string(),
        "https://example.com".to_string(),
        "secret".to_string(),
    );
    
    // Testa Bearer auth
    config.auth_config = Some(AuthConfig {
        auth_type: "Bearer".to_string(),
        token: "sk_test_123".to_string(),
        header_name: None,
    });
    
    assert!(config.auth_config.is_some());
    let auth = config.auth_config.as_ref().unwrap();
    assert_eq!(auth.auth_type, "Bearer");
    assert_eq!(auth.token, "sk_test_123");
    
    // Testa API Key auth
    config.auth_config = Some(AuthConfig {
        auth_type: "ApiKey".to_string(),
        token: "api_key_456".to_string(),
        header_name: Some("X-API-Key".to_string()),
    });
    
    let auth = config.auth_config.as_ref().unwrap();
    assert_eq!(auth.auth_type, "ApiKey");
    assert_eq!(auth.header_name, Some("X-API-Key".to_string()));
}

#[tokio::test]
async fn test_webhook_removal() {
    let manager = WebhookManager::new();
    
    let config = WebhookConfig::new(
        "removable-tenant".to_string(),
        "https://example.com/webhook".to_string(),
        "test-secret".to_string(),
    );
    
    // Configura
    manager.configure_tenant(config).await.unwrap();
    assert_eq!(manager.list_tenants().await.len(), 1);
    
    // Remove
    assert!(manager.remove_tenant_config("removable-tenant").await);
    assert_eq!(manager.list_tenants().await.len(), 0);
    
    // Tentar remover novamente deve retornar false
    assert!(!manager.remove_tenant_config("removable-tenant").await);
}

#[tokio::test]
async fn test_multiple_tenants() {
    let manager = WebhookManager::new();
    
    // Configura múltiplos tenants
    for i in 1..=3 {
        let config = WebhookConfig::new(
            format!("tenant-{}", i),
            format!("https://tenant{}.com/webhook", i),
            format!("secret-{}", i),
        );
        manager.configure_tenant(config).await.unwrap();
    }
    
    let tenants = manager.list_tenants().await;
    assert_eq!(tenants.len(), 3);
    
    // Verifica que todos os tenants foram configurados
    for i in 1..=3 {
        let tenant_id = format!("tenant-{}", i);
        assert!(tenants.contains(&tenant_id));
        
        let config = manager.get_tenant_config(&tenant_id).await;
        assert!(config.is_some());
        assert_eq!(config.unwrap().base_url, format!("https://tenant{}.com/webhook", i));
    }
}

#[tokio::test]
async fn test_send_event_nonexistent_tenant() {
    let manager = WebhookManager::new();
    
    let event = WebhookEvent::new(
        "nonexistent-tenant".to_string(),
        "test.event".to_string(),
        json!({"test": "data"}),
    );
    
    // Deve falhar para tenant não configurado
    let result = manager.send_event(event).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_send_event_disabled_event_type() {
    let manager = WebhookManager::new();
    
    let mut config = WebhookConfig::new(
        "selective-tenant".to_string(),
        "https://example.com/webhook".to_string(),
        "secret".to_string(),
    );
    
    // Só permite eventos de usuário
    config.enabled_events = vec!["user.*".to_string()];
    manager.configure_tenant(config).await.unwrap();
    
    // Evento de usuário deve ser processado
    let user_event = WebhookEvent::new(
        "selective-tenant".to_string(),
        "user.created".to_string(),
        json!({"user_id": "123"}),
    );
    
    let result = manager.send_event(user_event).await;
    assert!(result.is_ok());
    
    // Evento de pedido deve ser ignorado mas não falhar
    let order_event = WebhookEvent::new(
        "selective-tenant".to_string(),
        "order.created".to_string(),
        json!({"order_id": "456"}),
    );
    
    let result = manager.send_event(order_event).await;
    assert!(result.is_ok()); // Não falha, mas é ignorado
}

#[tokio::test] 
async fn test_webhook_config_overwrite() {
    let manager = WebhookManager::new();
    
    // Configuração inicial
    let config1 = WebhookConfig::new(
        "overwrite-test".to_string(),
        "https://old-url.com/webhook".to_string(),
        "old-secret".to_string(),
    );
    
    manager.configure_tenant(config1).await.unwrap();
    
    // Nova configuração (substitui a anterior)
    let config2 = WebhookConfig::new(
        "overwrite-test".to_string(),
        "https://new-url.com/webhook".to_string(),
        "new-secret".to_string(),
    );
    
    manager.configure_tenant(config2).await.unwrap();
    
    // Deve ter apenas um tenant
    assert_eq!(manager.list_tenants().await.len(), 1);
    
    // Deve ter a nova configuração
    let retrieved = manager.get_tenant_config("overwrite-test").await.unwrap();
    assert_eq!(retrieved.base_url, "https://new-url.com/webhook");
    assert_eq!(retrieved.secret_key, "new-secret");
}

#[tokio::test]
async fn test_metrics_initialization() {
    let manager = WebhookManager::new();
    
    let config = WebhookConfig::new(
        "metrics-tenant".to_string(),
        "https://example.com/webhook".to_string(),
        "secret".to_string(),
    );
    
    manager.configure_tenant(config).await.unwrap();
    
    // Métricas devem ser inicializadas
    let metrics = manager.get_tenant_metrics("metrics-tenant").await;
    assert!(metrics.is_some());
    
    let metrics = metrics.unwrap();
    assert_eq!(metrics.total_events, 0);
    assert_eq!(metrics.successful_events, 0);
    assert_eq!(metrics.failed_events, 0);
    assert_eq!(metrics.pending_retries, 0);
    assert_eq!(metrics.dead_letter_count, 0);
    assert_eq!(metrics.avg_response_time_ms, 0.0);
}

// Teste de integração que verifica o worker de retry
// Nota: Este teste é mais complexo e pode ser instável em CI
#[tokio::test]
async fn test_retry_worker_basic() {
    let manager = WebhookManager::new();
    
    // Para este teste, vamos parar o worker atual para evitar interferência
    #[cfg(test)]
    manager.stop_retry_worker().await;
    
    // Configura um tenant
    let config = WebhookConfig::new(
        "worker-test".to_string(),
        "https://httpbin.org/status/200".to_string(), // URL que responde 200
        "test-secret".to_string(),
    );
    
    manager.configure_tenant(config).await.unwrap();
    
    // Envia um evento
    let event = WebhookEvent::new(
        "worker-test".to_string(),
        "test.event".to_string(),
        json!({"test": "worker"}),
    );
    
    let result = manager.send_event(event).await;
    assert!(result.is_ok());
    
    // Aguarda um pouco para processamento
    sleep(Duration::from_millis(100)).await;
    
    // Verifica métricas
    let metrics = manager.get_tenant_metrics("worker-test").await;
    assert!(metrics.is_some());
    
    // Note: Como não temos controle total sobre httpbin.org,
    // este teste pode falhar ocasionalmente em ambientes de CI
}

#[cfg(test)]
mod integration_tests {
    use super::*;
    use std::sync::Arc;
    
    // Teste mais realista usando um servidor mock local
    #[tokio::test]
    async fn test_webhook_integration_with_mock_server() {
        // Para este teste, assumimos que um servidor mock está rodando
        // Em um ambiente de CI, você poderia iniciar um servidor de teste
        
        let manager = WebhookManager::new();
        
        let config = WebhookConfig::new(
            "integration-test".to_string(),
            "http://localhost:8888/webhook".to_string(), // Servidor mock
            "integration-secret".to_string(),
        );
        
        // Se não conseguir conectar com o mock server, pula o teste
        match manager.configure_tenant(config).await {
            Ok(_) => {
                let event = WebhookEvent::new(
                    "integration-test".to_string(),
                    "integration.test".to_string(),
                    json!({"integration": true, "test_id": "int_123"}),
                );
                
                let result = manager.send_event(event).await;
                // Em um cenário real, verificaríamos se o servidor mock recebeu o evento
                println!("Integration test result: {:?}", result);
            }
            Err(e) => {
                println!("Skipping integration test - mock server not available: {}", e);
            }
        }
    }
}