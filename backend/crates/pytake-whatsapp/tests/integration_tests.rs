use pytake_whatsapp::{
    Media, Message, MessageContent, TemplateLanguage, TemplateMessage, 
    WebhookProcessor, WhatsAppClient, WhatsAppConfig
};

#[test]
fn test_message_creation() {
    // Test text message creation
    let text_msg = Message::text("1234567890", "Hello World!");
    match text_msg.content {
        MessageContent::Text(ref text) => {
            assert_eq!(text.body, "Hello World!");
        }
        _ => panic!("Expected text message"),
    }
    assert_eq!(text_msg.to, "1234567890");
    assert_eq!(text_msg.messaging_product, "whatsapp");

    // Test image message creation
    let media = Media::from_url("https://example.com/image.jpg").with_caption("Test image");
    let image_msg = Message::image("1234567890", media);
    match image_msg.content {
        MessageContent::Image(ref img) => {
            assert_eq!(img.media.link, Some("https://example.com/image.jpg".to_string()));
            assert_eq!(img.media.caption, Some("Test image".to_string()));
        }
        _ => panic!("Expected image message"),
    }

    // Test template message creation
    let template = TemplateMessage {
        name: "hello_world".to_string(),
        language: TemplateLanguage {
            code: "en_US".to_string(),
            policy: None,
        },
        components: None,
    };
    let template_msg = Message::template("1234567890", template);
    match template_msg.content {
        MessageContent::Template(ref tmpl) => {
            assert_eq!(tmpl.name, "hello_world");
            assert_eq!(tmpl.language.code, "en_US");
        }
        _ => panic!("Expected template message"),
    }

    // Test message with context (reply)
    let reply_msg = Message::text("1234567890", "This is a reply").with_context("msg_123".to_string());
    assert!(reply_msg.context.is_some());
    assert_eq!(reply_msg.context.unwrap().message_id, "msg_123");
}

#[test]
fn test_media_creation() {
    // Test media from URL
    let media_url = Media::from_url("https://example.com/document.pdf")
        .with_filename("document.pdf")
        .with_caption("Important document");
    
    assert_eq!(media_url.link, Some("https://example.com/document.pdf".to_string()));
    assert_eq!(media_url.filename, Some("document.pdf".to_string()));
    assert_eq!(media_url.caption, Some("Important document".to_string()));
    assert!(media_url.id.is_none());

    // Test media from ID
    let media_id = Media::from_id("media_123").with_caption("Uploaded media");
    
    assert_eq!(media_id.id, Some("media_123".to_string()));
    assert_eq!(media_id.caption, Some("Uploaded media".to_string()));
    assert!(media_id.link.is_none());
}

#[test]
fn test_phone_number_validation() {
    // Valid phone numbers
    assert!(WhatsAppClient::validate_phone_number("1234567890").is_ok());
    assert!(WhatsAppClient::validate_phone_number("+1234567890").is_ok());
    assert!(WhatsAppClient::validate_phone_number("123-456-7890").is_ok());
    assert!(WhatsAppClient::validate_phone_number("(123) 456-7890").is_ok());

    // Invalid phone numbers
    assert!(WhatsAppClient::validate_phone_number("123").is_err());
    assert!(WhatsAppClient::validate_phone_number("12345678901234567890").is_err());
    assert!(WhatsAppClient::validate_phone_number("abc123def456").is_err());
}

#[test]
fn test_url_validation() {
    // Valid URLs
    assert!(WhatsAppClient::validate_url("https://example.com/image.jpg").is_ok());
    assert!(WhatsAppClient::validate_url("http://example.com/document.pdf").is_ok());
    assert!(WhatsAppClient::validate_url("https://cdn.example.com/media/file.mp4").is_ok());

    // Invalid URLs
    assert!(WhatsAppClient::validate_url("ftp://example.com/file.txt").is_err());
    assert!(WhatsAppClient::validate_url("invalid-url").is_err());
    assert!(WhatsAppClient::validate_url("file:///local/path").is_err());
}

#[test]
fn test_webhook_processor() {
    let processor = WebhookProcessor::new("test_secret", "test_verify_token");

    // Test webhook challenge verification
    use pytake_whatsapp::WebhookChallenge;
    
    let valid_challenge = WebhookChallenge {
        mode: "subscribe".to_string(),
        verify_token: "test_verify_token".to_string(),
        challenge: "challenge_string".to_string(),
    };
    
    let result = processor.verify_challenge(&valid_challenge);
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "challenge_string");

    let invalid_challenge = WebhookChallenge {
        mode: "subscribe".to_string(),
        verify_token: "wrong_token".to_string(),
        challenge: "challenge_string".to_string(),
    };
    
    let result = processor.verify_challenge(&invalid_challenge);
    assert!(result.is_err());
}

#[test]
fn test_config_creation() {
    let config = WhatsAppConfig {
        access_token: "test_token".to_string(),
        phone_number_id: "123456789".to_string(),
        base_url: "https://graph.facebook.com/v18.0".to_string(),
        webhook_verify_token: "verify_token".to_string(),
        app_secret: "app_secret".to_string(),
    };

    assert_eq!(config.access_token, "test_token");
    assert_eq!(config.phone_number_id, "123456789");
    assert!(config.base_url.contains("graph.facebook.com"));

    // Test default config
    let default_config = WhatsAppConfig::default();
    assert_eq!(default_config.base_url, "https://graph.facebook.com/v18.0");
    assert!(default_config.access_token.is_empty());
}

#[tokio::test]
async fn test_client_creation() {
    let config = WhatsAppConfig {
        access_token: "test_token".to_string(),
        phone_number_id: "123456789".to_string(),
        ..Default::default()
    };

    let client = WhatsAppClient::new(config);
    assert!(client.is_ok());
}