//! Usage examples for the pytake-whatsapp crate
//! 
//! These examples demonstrate common patterns for using the WhatsApp API client.

use pytake_whatsapp::{
    Media, Message, TemplateComponent, TemplateLanguage, TemplateMessage, TemplateParameter,
    WebhookProcessor, WhatsAppClient, WhatsAppConfig,
};

/// Example: Setting up the WhatsApp client
#[tokio::test]
async fn example_client_setup() {
    let config = WhatsAppConfig {
        access_token: "your_access_token_here".to_string(),
        phone_number_id: "your_phone_number_id_here".to_string(),
        base_url: "https://graph.facebook.com/v18.0".to_string(),
        webhook_verify_token: "your_webhook_verify_token".to_string(),
        app_secret: "your_app_secret".to_string(),
    };

    let client = WhatsAppClient::new(config).expect("Failed to create WhatsApp client");
    
    // Client is now ready to use
    assert!(true); // Placeholder assertion for test
}

/// Example: Sending different types of messages
#[tokio::test]
async fn example_message_types() {
    // This is a mock test since we don't have real API credentials
    
    // 1. Text Message
    let text_message = Message::text("1234567890", "Hello! Welcome to our service.");
    assert_eq!(text_message.to, "1234567890");
    
    // 2. Image Message with Caption
    let image_media = Media::from_url("https://example.com/welcome-image.jpg")
        .with_caption("Welcome to our service!");
    let image_message = Message::image("1234567890", image_media);
    
    // 3. Document Message
    let document_media = Media::from_url("https://example.com/brochure.pdf")
        .with_filename("company-brochure.pdf")
        .with_caption("Here's our company brochure");
    let document_message = Message::document("1234567890", document_media);
    
    // 4. Template Message
    let template = TemplateMessage {
        name: "welcome_template".to_string(),
        language: TemplateLanguage {
            code: "en_US".to_string(),
            policy: None,
        },
        components: Some(vec![
            TemplateComponent {
                component_type: "body".to_string(),
                sub_type: None,
                parameters: vec![
                    TemplateParameter {
                        param_type: "text".to_string(),
                        text: Some("John Doe".to_string()),
                        currency: None,
                        date_time: None,
                        image: None,
                        document: None,
                        video: None,
                    }
                ],
                index: None,
            }
        ]),
    };
    let template_message = Message::template("1234567890", template);
    
    // 5. Reply Message
    let reply_message = Message::text("1234567890", "Thanks for your message!")
        .with_context("previous_message_id".to_string());
    
    // All messages are created successfully
    assert!(true);
}

/// Example: Processing webhook notifications
#[test]
fn example_webhook_processing() {
    let processor = WebhookProcessor::new("your_app_secret", "your_verify_token");
    
    // Example webhook payload (simplified)
    let webhook_json = r#"{
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "your_whatsapp_business_account_id",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15551234567",
                                "phone_number_id": "your_phone_number_id"
                            },
                            "messages": [
                                {
                                    "from": "1234567890",
                                    "id": "wamid.unique_message_id",
                                    "timestamp": "1699123456",
                                    "text": {
                                        "body": "Hello, I need help with my order"
                                    },
                                    "type": "text"
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }"#;
    
    // Process the webhook (without signature verification for this example)
    let result = processor.process_payload(webhook_json, None);
    assert!(result.is_ok());
    
    let payload = result.unwrap();
    let messages = processor.extract_messages(&payload);
    
    // Should have one message
    assert_eq!(messages.len(), 1);
    assert_eq!(messages[0].from, "1234567890");
    assert_eq!(messages[0].get_text(), Some("Hello, I need help with my order"));
}

/// Example: Media handling patterns
#[test]
fn example_media_patterns() {
    // Pattern 1: Media from external URL
    let external_media = Media::from_url("https://cdn.example.com/image.jpg")
        .with_caption("Product showcase");
    
    // Pattern 2: Media from uploaded file (using media ID)
    let uploaded_media = Media::from_id("uploaded_media_id_123")
        .with_filename("product-catalog.pdf");
    
    // Pattern 3: Media with full metadata
    let detailed_media = Media::from_url("https://example.com/video.mp4")
        .with_caption("Product demonstration video")
        .with_filename("demo.mp4");
    
    assert!(external_media.link.is_some());
    assert!(uploaded_media.id.is_some());
    assert!(detailed_media.caption.is_some());
}

/// Example: Phone number validation patterns
#[test]
fn example_phone_validation() {
    // Various phone number formats that should be valid
    let valid_numbers = vec![
        "1234567890",           // US format without country code
        "+1234567890",          // With + prefix
        "123-456-7890",         // With dashes
        "(123) 456-7890",       // With parentheses and spaces
        "123.456.7890",         // With dots
    ];
    
    for number in valid_numbers {
        let result = WhatsAppClient::validate_phone_number(number);
        assert!(result.is_ok(), "Phone number {} should be valid", number);
    }
    
    // Invalid phone numbers
    let invalid_numbers = vec![
        "123",                  // Too short
        "12345678901234567890", // Too long
        "abc123def456",         // Contains letters
        "",                     // Empty
    ];
    
    for number in invalid_numbers {
        let result = WhatsAppClient::validate_phone_number(number);
        assert!(result.is_err(), "Phone number {} should be invalid", number);
    }
}

/// Example: Error handling patterns
#[tokio::test]
async fn example_error_handling() {
    // This demonstrates how you might handle errors in your application
    
    let config = WhatsAppConfig {
        access_token: "invalid_token".to_string(),
        phone_number_id: "invalid_id".to_string(),
        ..Default::default()
    };
    
    let client = WhatsAppClient::new(config).expect("Client creation should not fail");
    
    // This would fail with real API call, but we're just testing the pattern
    let message = Message::text("1234567890", "Test message");
    
    // In real usage, you would handle different error types:
    /*
    match client.send_message(message).await {
        Ok(response) => {
            println!("Message sent successfully: {:?}", response);
        }
        Err(WhatsAppError::HttpClient(err)) => {
            eprintln!("Network error: {}", err);
            // Retry logic or user notification
        }
        Err(WhatsAppError::ApiError(err)) => {
            eprintln!("WhatsApp API error: {}", err);
            // Handle specific API errors
        }
        Err(WhatsAppError::InvalidPhoneNumber(err)) => {
            eprintln!("Invalid phone number: {}", err);
            // Prompt user to correct phone number
        }
        Err(err) => {
            eprintln!("Other error: {}", err);
            // Generic error handling
        }
    }
    */
    
    assert!(true); // Placeholder for this example
}