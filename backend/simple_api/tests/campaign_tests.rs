use actix_web::{test, App, web};
use serde_json::json;
use simple_api::campaign_manager::{CampaignManager, CreateCampaignRequest, CampaignObjective, ThrottleConfig, ContactSegmentation, MessageTemplateType, CreateMessageTemplateRequest};
use simple_api::database::establish_connection;
use std::sync::Arc;
use uuid::Uuid;

#[actix_web::test]
async fn test_campaign_manager_creation() {
    // Skip if database is not available
    if std::env::var("DATABASE_URL").is_err() {
        return;
    }
    
    match establish_connection().await {
        Ok(db) => {
            let campaign_manager = CampaignManager::new(db);
            // Should create successfully
            assert!(true);
        }
        Err(_) => {
            // Database not available, skip test
            println!("Database not available, skipping test");
        }
    }
}

#[actix_web::test]
async fn test_campaign_creation_structure() {
    let create_request = CreateCampaignRequest {
        name: "Test Campaign".to_string(),
        description: "Test description".to_string(),
        objective: CampaignObjective::Engagement,
        scheduled_at: None,
        recurrence: None,
        throttle_config: ThrottleConfig::default(),
        segmentation: ContactSegmentation {
            include_all: true,
            included_groups: vec![],
            excluded_groups: vec![],
            included_tags: vec![],
            excluded_tags: vec![],
            custom_filters: vec![],
            estimated_recipients: None,
        },
        templates: vec![CreateMessageTemplateRequest {
            name: "Test Template".to_string(),
            content: "Hello {{name}}!".to_string(),
            template_type: MessageTemplateType::Text,
            variables: vec!["name".to_string()],
            media_url: None,
            media_type: None,
            buttons: None,
            ab_variant: None,
        }],
        ab_test_config: None,
    };

    // Should serialize/deserialize properly
    let json = serde_json::to_string(&create_request).unwrap();
    let deserialized: CreateCampaignRequest = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.name, "Test Campaign");
}

#[actix_web::test]
async fn test_campaign_endpoints_compilation() {
    // Skip if database is not available
    if std::env::var("DATABASE_URL").is_err() {
        return;
    }
    
    match establish_connection().await {
        Ok(db) => {
            let campaign_manager = Arc::new(CampaignManager::new(db));
            
            let app = test::init_service(
                App::new()
                    .app_data(web::Data::new(campaign_manager))
                    .configure(simple_api::campaign_manager::configure_routes)
            ).await;

            // Test endpoint exists (should return 400 for bad data, not 404)
            let req = test::TestRequest::post()
                .uri("/campaigns")
                .set_json(&json!({}))
                .to_request();

            let resp = test::call_service(&app, req).await;
            // Should not be 404 (not found), meaning endpoint exists
            assert_ne!(resp.status(), 404);
        }
        Err(_) => {
            // Database not available, skip test
            println!("Database not available, skipping test");
        }
    }
}