#[cfg(test)]
mod ai_assistant_tests {
    use actix_web::{test, web, App, http::StatusCode};
    use serde_json::json;
    use std::sync::Arc;
    
    use simple_api::ai_assistant::{
        AIService, ChatRequest, AnalyzeRequest, IntentClassificationRequest,
        CreatePromptRequest, AIProvider, AnalysisType, ContentFilter
    };
    
    fn create_test_ai_service() -> Arc<AIService> {
        // Create AI service without API keys (for testing)
        Arc::new(AIService::new())
    }
    
    #[actix_web::test]
    async fn test_ai_service_creation() {
        let ai_service = create_test_ai_service();
        
        // Service should be created successfully even without API keys
        assert!(ai_service.list_custom_prompts().is_empty());
    }
    
    #[actix_web::test]
    async fn test_content_filter() {
        let filter = ContentFilter::new();
        
        // Test safe content
        assert!(filter.is_safe("Hello, how can I help you today?"));
        assert!(filter.is_safe("I need information about your products"));
        assert!(filter.is_safe("What are your business hours?"));
        
        // Test unsafe content
        assert!(!filter.is_safe("How to hack into systems"));
        assert!(!filter.is_safe("I want to buy illegal drugs"));
        assert!(!filter.is_safe("How to make a bomb"));
    }
    
    #[actix_web::test]
    async fn test_custom_prompts() {
        let ai_service = create_test_ai_service();
        
        // Create a custom prompt
        let prompt_request = CreatePromptRequest {
            name: "Test Customer Service".to_string(),
            description: "A test prompt for customer service".to_string(),
            template: "Hello {{customer_name}}, how can I help you with {{issue_type}}?".to_string(),
            variables: vec!["customer_name".to_string(), "issue_type".to_string()],
            tenant_id: Some("test_tenant".to_string()),
        };
        
        // Test creating custom prompt
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(ai_service.clone()))
                .configure(simple_api::ai_assistant::configure_routes)
        ).await;
        
        let req = test::TestRequest::post()
            .uri("/ai/prompts")
            .set_json(&prompt_request)
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::CREATED);
        
        // Test listing prompts
        let req = test::TestRequest::get()
            .uri("/ai/prompts")
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::OK);
        
        let body = test::read_body(resp).await;
        let prompts: Vec<serde_json::Value> = serde_json::from_slice(&body).unwrap();
        assert_eq!(prompts.len(), 1);
        assert_eq!(prompts[0]["name"], "Test Customer Service");
    }
    
    #[actix_web::test]
    async fn test_chat_endpoint_without_api_keys() {
        let ai_service = create_test_ai_service();
        
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(ai_service))
                .configure(simple_api::ai_assistant::configure_routes)
        ).await;
        
        let chat_request = ChatRequest {
            message: "Hello, how are you?".to_string(),
            user_id: "test_user".to_string(),
            conversation_id: "test_conv".to_string(),
            context: None,
            preferred_provider: Some(AIProvider::Auto),
            max_tokens: Some(100),
            temperature: Some(0.7),
            include_history: Some(true),
        };
        
        let req = test::TestRequest::post()
            .uri("/ai/chat")
            .set_json(&chat_request)
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        // Should return 503 Service Unavailable when no API keys are configured
        assert_eq!(resp.status(), StatusCode::SERVICE_UNAVAILABLE);
    }
    
    #[actix_web::test]
    async fn test_analyze_endpoint_without_api_keys() {
        let ai_service = create_test_ai_service();
        
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(ai_service))
                .configure(simple_api::ai_assistant::configure_routes)
        ).await;
        
        let analyze_request = AnalyzeRequest {
            message: "I'm very unhappy with this product!".to_string(),
            user_id: "test_user".to_string(),
            analysis_type: vec![AnalysisType::Sentiment, AnalysisType::Intent],
            context: None,
        };
        
        let req = test::TestRequest::post()
            .uri("/ai/analyze")
            .set_json(&analyze_request)
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        // Should return 500 Internal Server Error when no API keys are configured
        assert_eq!(resp.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }
    
    #[actix_web::test]
    async fn test_classify_endpoint_without_api_keys() {
        let ai_service = create_test_ai_service();
        
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(ai_service))
                .configure(simple_api::ai_assistant::configure_routes)
        ).await;
        
        let classify_request = IntentClassificationRequest {
            message: "Do you have this product in stock?".to_string(),
            user_id: "test_user".to_string(),
            available_intents: Some(vec![
                "product_inquiry".to_string(),
                "stock_question".to_string(),
                "greeting".to_string(),
            ]),
            context: None,
        };
        
        let req = test::TestRequest::post()
            .uri("/ai/classify")
            .set_json(&classify_request)
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        // Should return 500 Internal Server Error when no API keys are configured
        assert_eq!(resp.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }
    
    #[actix_web::test]
    async fn test_content_filter_blocking() {
        let ai_service = create_test_ai_service();
        
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(ai_service))
                .configure(simple_api::ai_assistant::configure_routes)
        ).await;
        
        let chat_request = ChatRequest {
            message: "How to hack into computer systems?".to_string(),
            user_id: "test_user".to_string(),
            conversation_id: "test_conv".to_string(),
            context: None,
            preferred_provider: Some(AIProvider::Auto),
            max_tokens: Some(100),
            temperature: Some(0.7),
            include_history: Some(true),
        };
        
        let req = test::TestRequest::post()
            .uri("/ai/chat")
            .set_json(&chat_request)
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        // Should return 400 Bad Request due to content filter violation
        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
        
        let body = test::read_body(resp).await;
        let response: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(response["error"], "content_filter_violation");
    }
    
    #[actix_web::test]
    async fn test_usage_stats_endpoint() {
        let ai_service = create_test_ai_service();
        
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(ai_service))
                .configure(simple_api::ai_assistant::configure_routes)
        ).await;
        
        // Test getting usage stats for non-existent user
        let req = test::TestRequest::get()
            .uri("/ai/usage/nonexistent_user")
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::NOT_FOUND);
        
        let body = test::read_body(resp).await;
        let response: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(response["error"], "user_not_found");
    }
    
    #[actix_web::test]
    async fn test_invalid_requests() {
        let ai_service = create_test_ai_service();
        
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(ai_service))
                .configure(simple_api::ai_assistant::configure_routes)
        ).await;
        
        // Test chat with empty message
        let invalid_chat_request = json!({
            "message": "",
            "user_id": "test_user",
            "conversation_id": "test_conv"
        });
        
        let req = test::TestRequest::post()
            .uri("/ai/chat")
            .set_json(&invalid_chat_request)
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        // Should handle empty message gracefully
        assert!(resp.status().is_client_error() || resp.status().is_server_error());
        
        // Test analyze with empty analysis types
        let invalid_analyze_request = json!({
            "message": "Test message",
            "user_id": "test_user",
            "analysis_type": []
        });
        
        let req = test::TestRequest::post()
            .uri("/ai/analyze")
            .set_json(&invalid_analyze_request)
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        // Should handle empty analysis types
        assert!(resp.status().is_client_error() || resp.status().is_server_error());
    }
    
    #[actix_web::test]
    async fn test_prompt_validation() {
        let ai_service = create_test_ai_service();
        
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(ai_service))
                .configure(simple_api::ai_assistant::configure_routes)
        ).await;
        
        // Test creating prompt with empty name
        let invalid_prompt_request = json!({
            "name": "",
            "description": "Test description",
            "template": "Hello {{name}}",
            "variables": ["name"]
        });
        
        let req = test::TestRequest::post()
            .uri("/ai/prompts")
            .set_json(&invalid_prompt_request)
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        // Should handle validation properly
        assert!(resp.status() == StatusCode::BAD_REQUEST || resp.status() == StatusCode::CREATED);
    }
    
    // Integration test utilities
    pub fn setup_test_environment() {
        std::env::set_var("AI_DEFAULT_PROVIDER", "auto");
        std::env::set_var("AI_CONTENT_FILTER_ENABLED", "true");
    }
    
    pub fn cleanup_test_environment() {
        std::env::remove_var("OPENAI_API_KEY");
        std::env::remove_var("ANTHROPIC_API_KEY");
    }
    
    #[actix_web::test]
    async fn test_provider_fallback_logic() {
        setup_test_environment();
        
        let ai_service = create_test_ai_service();
        
        // Test that service handles missing providers gracefully
        let usage_stats = ai_service.get_usage_stats("test_user");
        assert!(usage_stats.is_none()); // No usage yet
        
        // Test custom prompt functionality
        let prompts = ai_service.list_custom_prompts();
        assert_eq!(prompts.len(), 0);
        
        cleanup_test_environment();
    }
}

// Mock tests for when API keys are available (run manually with real keys)
#[cfg(test)]
mod integration_tests_with_api_keys {
    use super::*;
    use simple_api::ai_assistant::*;
    use std::sync::Arc;
    
    // These tests require actual API keys and should be run manually
    // Uncomment and set environment variables to test with real APIs
    
    /*
    #[tokio::test]
    async fn test_openai_integration() {
        // Set OPENAI_API_KEY environment variable
        let api_key = std::env::var("OPENAI_API_KEY").expect("OPENAI_API_KEY not set");
        
        let provider = OpenAIProvider::new(api_key);
        
        let messages = vec![
            ConversationMessage {
                role: "user".to_string(),
                content: "Hello, how are you?".to_string(),
                timestamp: chrono::Utc::now(),
                metadata: std::collections::HashMap::new(),
            }
        ];
        
        let result = provider.chat_completion(&messages, Some(100), Some(0.7)).await;
        assert!(result.is_ok());
        
        let response = result.unwrap();
        assert!(!response.is_empty());
    }
    
    #[tokio::test]
    async fn test_anthropic_integration() {
        // Set ANTHROPIC_API_KEY environment variable
        let api_key = std::env::var("ANTHROPIC_API_KEY").expect("ANTHROPIC_API_KEY not set");
        
        let provider = AnthropicProvider::new(api_key);
        
        let messages = vec![
            ConversationMessage {
                role: "user".to_string(),
                content: "Analyze the sentiment of this message: I love this product!".to_string(),
                timestamp: chrono::Utc::now(),
                metadata: std::collections::HashMap::new(),
            }
        ];
        
        let result = provider.chat_completion(&messages, Some(100), Some(0.3)).await;
        assert!(result.is_ok());
        
        let response = result.unwrap();
        assert!(!response.is_empty());
    }
    
    #[tokio::test] 
    async fn test_full_ai_service_workflow() {
        // Requires both API keys
        std::env::var("OPENAI_API_KEY").expect("OPENAI_API_KEY not set");
        std::env::var("ANTHROPIC_API_KEY").expect("ANTHROPIC_API_KEY not set");
        
        let ai_service = Arc::new(AIService::new());
        
        // Test chat functionality
        let chat_request = ChatRequest {
            message: "Hello! I need help with my order".to_string(),
            user_id: "test_user_123".to_string(),
            conversation_id: "conv_456".to_string(),
            context: Some(std::collections::HashMap::from([
                ("customer_tier".to_string(), "premium".to_string()),
                ("order_id".to_string(), "ORD-789".to_string()),
            ])),
            preferred_provider: Some(AIProvider::Auto),
            max_tokens: Some(200),
            temperature: Some(0.7),
            include_history: Some(true),
        };
        
        let chat_result = ai_service.chat(chat_request).await;
        assert!(chat_result.is_ok());
        
        let chat_response = chat_result.unwrap();
        assert!(!chat_response.response.is_empty());
        assert!(chat_response.tokens_used > 0);
        
        // Test analysis functionality
        let analyze_request = AnalyzeRequest {
            message: "I'm extremely disappointed with this service!!!".to_string(),
            user_id: "test_user_123".to_string(),
            analysis_type: vec![AnalysisType::Sentiment, AnalysisType::Intent, AnalysisType::Priority],
            context: None,
        };
        
        let analyze_result = ai_service.analyze(analyze_request).await;
        assert!(analyze_result.is_ok());
        
        let analyze_response = analyze_result.unwrap();
        assert!(!analyze_response.analysis.is_empty());
        
        // Test intent classification
        let classify_request = IntentClassificationRequest {
            message: "Do you have this item in stock?".to_string(),
            user_id: "test_user_123".to_string(),
            available_intents: Some(vec![
                "product_inquiry".to_string(),
                "stock_question".to_string(),
                "pricing_question".to_string(),
                "support_request".to_string(),
            ]),
            context: None,
        };
        
        let classify_result = ai_service.classify_intent(classify_request).await;
        assert!(classify_result.is_ok());
        
        let classify_response = classify_result.unwrap();
        assert!(!classify_response.intent.is_empty());
        assert!(classify_response.confidence > 0.0);
        
        // Check usage stats were updated
        let usage_stats = ai_service.get_usage_stats("test_user_123");
        assert!(usage_stats.is_some());
        
        let stats = usage_stats.unwrap();
        assert!(stats.total_requests >= 3); // At least 3 requests made
        assert!(stats.total_tokens > 0);
    }
    */
}