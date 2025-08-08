//! Exemplo de uso do sistema de webhooks avançado
//! 
//! Este exemplo demonstra como usar o WebhookManager para:
//! - Configurar webhooks para diferentes tenants
//! - Enviar eventos
//! - Gerenciar retries e dead letter queue
//! - Monitorar métricas

use simple_api::webhook_manager::{
    WebhookManager, WebhookConfig, WebhookEvent, RetryPolicy, EventSeverity, AuthConfig
};
use std::collections::HashMap;
use tokio::time::{sleep, Duration};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Inicializa tracing para logs
    tracing_subscriber::fmt::init();
    
    println!("🚀 Demonstração do Sistema de Webhooks Avançado");
    
    // Cria o manager de webhooks
    let webhook_manager = WebhookManager::new();
    
    // Exemplo 1: Configuração básica de webhook
    println!("\n📋 1. Configurando webhook básico...");
    
    let config = WebhookConfig::new(
        "empresa-123".to_string(),
        "https://api.empresa.com/webhooks".to_string(),
        "super-secret-key-123".to_string(),
    );
    
    webhook_manager.configure_tenant(config).await?;
    println!("✅ Webhook configurado para tenant: empresa-123");
    
    // Exemplo 2: Configuração avançada com política de retry customizada
    println!("\n⚙️ 2. Configurando webhook avançado...");
    
    let mut advanced_config = WebhookConfig::new(
        "startup-456".to_string(),
        "https://webhook.startup.io/events".to_string(),
        "startup-webhook-secret".to_string(),
    );
    
    // Política de retry personalizada
    advanced_config.retry_policy = RetryPolicy {
        max_retries: 3,
        initial_delay_seconds: 2,
        backoff_multiplier: 1.5,
        max_delay_seconds: 120,
        jitter: true,
    };
    
    // Headers personalizados
    advanced_config.default_headers.insert(
        "X-API-Version".to_string(), 
        "v2".to_string()
    );
    advanced_config.default_headers.insert(
        "User-Agent".to_string(), 
        "PyTake-Webhook/1.0".to_string()
    );
    
    // Autenticação Bearer Token
    advanced_config.auth_config = Some(AuthConfig {
        auth_type: "Bearer".to_string(),
        token: "sk_live_123456789".to_string(),
        header_name: None, // Usa "Authorization" como padrão
    });
    
    // Eventos específicos habilitados
    advanced_config.enabled_events = vec![
        "user.created".to_string(),
        "payment.*".to_string(), // Wildcards
        "order.completed".to_string(),
    ];
    
    webhook_manager.configure_tenant(advanced_config).await?;
    println!("✅ Webhook avançado configurado para tenant: startup-456");
    
    // Exemplo 3: Enviando eventos simples
    println!("\n📤 3. Enviando eventos de webhook...");
    
    // Evento simples de criação de usuário
    let user_event = WebhookEvent::new(
        "empresa-123".to_string(),
        "user.created".to_string(),
        json!({
            "user_id": "usr_12345",
            "email": "joao@empresa.com",
            "name": "João Silva",
            "created_at": "2024-01-15T10:30:00Z"
        }),
    );
    
    let event_id = webhook_manager.send_event(user_event).await?;
    println!("✅ Evento enviado: {}", event_id);
    
    // Evento com contexto e severidade alta
    let payment_event = WebhookEvent::new(
        "startup-456".to_string(),
        "payment.failed".to_string(),
        json!({
            "payment_id": "pay_98765",
            "user_id": "usr_54321",
            "amount": 299.99,
            "currency": "BRL",
            "error_code": "insufficient_funds",
            "error_message": "Cartão com saldo insuficiente"
        }),
    )
    .with_severity(EventSeverity::High)
    .with_context("transaction_id".to_string(), "txn_abc123".to_string())
    .with_context("payment_method".to_string(), "credit_card".to_string());
    
    let payment_event_id = webhook_manager.send_event(payment_event).await?;
    println!("✅ Evento de pagamento enviado: {}", payment_event_id);
    
    // Evento com URL específica
    let notification_event = WebhookEvent::new(
        "empresa-123".to_string(),
        "notification.sent".to_string(),
        json!({
            "notification_id": "notif_789",
            "recipient": "+5561994013828",
            "channel": "whatsapp",
            "message": "Sua compra foi confirmada!"
        }),
    ).with_target_url("https://notifications.empresa.com/webhooks".to_string());
    
    webhook_manager.send_event(notification_event).await?;
    println!("✅ Evento de notificação enviado");
    
    // Exemplo 4: Aguardar processamento e verificar métricas
    println!("\n📊 4. Aguardando processamento e verificando métricas...");
    
    sleep(Duration::from_secs(2)).await;
    
    // Verifica métricas da empresa-123
    if let Some(metrics) = webhook_manager.get_tenant_metrics("empresa-123").await {
        println!("📈 Métricas empresa-123:");
        println!("   - Total de eventos: {}", metrics.total_events);
        println!("   - Eventos bem-sucedidos: {}", metrics.successful_events);
        println!("   - Eventos falhados: {}", metrics.failed_events);
        println!("   - Retries pendentes: {}", metrics.pending_retries);
        println!("   - Dead letter queue: {}", metrics.dead_letter_count);
        println!("   - Tempo médio de resposta: {:.2}ms", metrics.avg_response_time_ms);
    }
    
    // Verifica métricas da startup-456
    if let Some(metrics) = webhook_manager.get_tenant_metrics("startup-456").await {
        println!("📈 Métricas startup-456:");
        println!("   - Total de eventos: {}", metrics.total_events);
        println!("   - Eventos bem-sucedidos: {}", metrics.successful_events);
        println!("   - Eventos falhados: {}", metrics.failed_events);
        println!("   - Retries pendentes: {}", metrics.pending_retries);
        println!("   - Dead letter queue: {}", metrics.dead_letter_count);
        println!("   - Tempo médio de resposta: {:.2}ms", metrics.avg_response_time_ms);
    }
    
    // Exemplo 5: Demonstrar assinatura HMAC
    println!("\n🔐 5. Demonstrando verificação de assinatura...");
    
    let payload = r#"{"event":"test","data":"example"}"#;
    let secret = "minha-chave-secreta";
    
    let signature = webhook_manager.calculate_signature(payload, secret)?;
    println!("📝 Payload: {}", payload);
    println!("🔑 Assinatura: {}", signature);
    
    let is_valid = webhook_manager.verify_signature(payload, &signature, secret);
    println!("✅ Verificação: {}", if is_valid { "VÁLIDA" } else { "INVÁLIDA" });
    
    // Teste com secret errado
    let is_invalid = webhook_manager.verify_signature(payload, &signature, "secret-errado");
    println!("❌ Verificação com secret errado: {}", if is_invalid { "VÁLIDA" } else { "INVÁLIDA" });
    
    // Exemplo 6: Listando tenants configurados
    println!("\n📋 6. Listando tenants configurados...");
    
    let tenants = webhook_manager.list_tenants().await;
    println!("🏢 Tenants ativos: {:?}", tenants);
    
    // Exemplo 7: Evento que vai falhar para demonstrar dead letter queue
    println!("\n💀 7. Demonstrando dead letter queue...");
    
    // Configura um tenant com URL inválida para simular falhas
    let failing_config = WebhookConfig::new(
        "test-fail".to_string(),
        "https://url-inexistente-12345.com/webhook".to_string(),
        "test-secret".to_string(),
    );
    
    webhook_manager.configure_tenant(failing_config).await?;
    
    let failing_event = WebhookEvent::new(
        "test-fail".to_string(),
        "test.failure".to_string(),
        json!({"test": "this will fail"}),
    );
    
    webhook_manager.send_event(failing_event).await?;
    println!("✅ Evento que vai falhar foi enviado");
    
    // Aguarda um tempo para ver algumas tentativas de retry
    println!("⏳ Aguardando tentativas de retry...");
    sleep(Duration::from_secs(10)).await;
    
    // Verifica dead letter queue
    let dead_letter_events = webhook_manager.list_dead_letter_events(Some("test-fail")).await;
    println!("💀 Eventos na dead letter queue: {}", dead_letter_events.len());
    
    for entry in &dead_letter_events {
        println!("   - Evento: {}", entry.event.id);
        println!("     Tentativas: {}", entry.attempts.len());
        println!("     Motivo: {}", entry.failure_reason);
        println!("     Pode tentar novamente: {}", entry.can_retry);
    }
    
    // Exemplo 8: Reprocessar evento da dead letter queue
    if let Some(first_failed) = dead_letter_events.first() {
        println!("\n🔄 8. Reprocessando evento da dead letter queue...");
        
        // Primeiro, vamos configurar uma URL válida para o tenant
        let fixed_config = WebhookConfig::new(
            "test-fail".to_string(),
            "https://httpbin.org/post".to_string(), // URL válida para testes
            "test-secret".to_string(),
        );
        
        webhook_manager.configure_tenant(fixed_config).await?;
        
        // Agora reprocessa o evento
        match webhook_manager.retry_dead_letter_event(&first_failed.event.id).await {
            Ok(new_event_id) => {
                println!("✅ Evento reprocessado com sucesso: {}", new_event_id);
            }
            Err(e) => {
                println!("❌ Erro ao reprocessar evento: {}", e);
            }
        }
    }
    
    println!("\n🎉 Demonstração completa!");
    println!("📝 O sistema de webhooks está funcionando com todas as funcionalidades:");
    println!("   ✅ Configuração por tenant");
    println!("   ✅ Retry automático com backoff exponencial");
    println!("   ✅ Assinatura HMAC-SHA256");
    println!("   ✅ Logging detalhado");
    println!("   ✅ Dead letter queue");
    println!("   ✅ Métricas em tempo real");
    println!("   ✅ Autenticação configurável");
    println!("   ✅ Headers personalizados");
    println!("   ✅ Filtros de evento com wildcards");
    
    // Para testes, mantém o programa rodando por mais um tempo
    // para que o worker de retry possa continuar processando
    println!("\n⏳ Mantendo programa ativo por mais 30 segundos para observar o retry worker...");
    sleep(Duration::from_secs(30)).await;
    
    Ok(())
}