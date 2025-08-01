//! Platform definitions for multi-platform messaging

use serde::{Deserialize, Serialize};
use std::fmt;

/// Supported messaging platforms
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Platform {
    /// WhatsApp Business API
    WhatsApp,
    /// Instagram Direct Messages (Meta)
    Instagram,
    /// Facebook Messenger (Meta)
    FacebookMessenger,
    /// Telegram Bot API
    Telegram,
    /// Webchat integration (embedded in website)
    Webchat,
    /// SMS messaging
    Sms,
    /// Email communication
    Email,
    /// Google Business Messages
    GoogleBusiness,
    /// Slack integration (B2B)
    Slack,
    /// Discord integration
    Discord,
    /// Microsoft Teams
    MicrosoftTeams,
    /// WeChat (for Chinese market)
    WeChat,
}

impl Platform {
    /// Get platform display name
    pub fn display_name(&self) -> &'static str {
        match self {
            Platform::WhatsApp => "WhatsApp Business",
            Platform::Instagram => "Instagram Direct",
            Platform::FacebookMessenger => "Facebook Messenger",
            Platform::Telegram => "Telegram",
            Platform::Webchat => "Webchat",
            Platform::Sms => "SMS",
            Platform::Email => "Email",
            Platform::GoogleBusiness => "Google Business Messages",
            Platform::Slack => "Slack",
            Platform::Discord => "Discord",
            Platform::MicrosoftTeams => "Microsoft Teams",
            Platform::WeChat => "WeChat",
        }
    }

    /// Get platform short identifier
    pub fn identifier(&self) -> &'static str {
        match self {
            Platform::WhatsApp => "wa",
            Platform::Instagram => "ig",
            Platform::FacebookMessenger => "fb",
            Platform::Telegram => "tg",
            Platform::Webchat => "web",
            Platform::Sms => "sms",
            Platform::Email => "email",
            Platform::GoogleBusiness => "gbm",
            Platform::Slack => "slack",
            Platform::Discord => "discord",
            Platform::MicrosoftTeams => "teams",
            Platform::WeChat => "wechat",
        }
    }

    /// Check if platform supports rich media
    pub fn supports_media(&self) -> bool {
        match self {
            Platform::WhatsApp 
            | Platform::Instagram 
            | Platform::FacebookMessenger 
            | Platform::Telegram 
            | Platform::Webchat 
            | Platform::Slack 
            | Platform::Discord 
            | Platform::MicrosoftTeams 
            | Platform::WeChat => true,
            Platform::Sms | Platform::Email => false,
            Platform::GoogleBusiness => true,
        }
    }

    /// Check if platform supports read receipts
    pub fn supports_read_receipts(&self) -> bool {
        match self {
            Platform::WhatsApp 
            | Platform::FacebookMessenger 
            | Platform::Telegram 
            | Platform::Webchat 
            | Platform::Slack 
            | Platform::Discord 
            | Platform::MicrosoftTeams => true,
            Platform::Instagram 
            | Platform::Sms 
            | Platform::Email 
            | Platform::GoogleBusiness 
            | Platform::WeChat => false,
        }
    }

    /// Check if platform supports typing indicators
    pub fn supports_typing_indicators(&self) -> bool {
        match self {
            Platform::WhatsApp 
            | Platform::Instagram 
            | Platform::FacebookMessenger 
            | Platform::Telegram 
            | Platform::Webchat 
            | Platform::Slack 
            | Platform::Discord 
            | Platform::MicrosoftTeams => true,
            Platform::Sms 
            | Platform::Email 
            | Platform::GoogleBusiness 
            | Platform::WeChat => false,
        }
    }

    /// Get platform color for UI
    pub fn color(&self) -> &'static str {
        match self {
            Platform::WhatsApp => "#25D366",        // WhatsApp green
            Platform::Instagram => "#E4405F",       // Instagram pink
            Platform::FacebookMessenger => "#0084FF", // Messenger blue
            Platform::Telegram => "#0088CC",        // Telegram blue
            Platform::Webchat => "#6366F1",         // Indigo
            Platform::Sms => "#10B981",             // Emerald
            Platform::Email => "#EF4444",           // Red
            Platform::GoogleBusiness => "#4285F4",  // Google blue
            Platform::Slack => "#4A154B",           // Slack purple
            Platform::Discord => "#5865F2",         // Discord blurple
            Platform::MicrosoftTeams => "#6264A7",  // Teams purple
            Platform::WeChat => "#07C160",          // WeChat green
        }
    }

    /// Get platform priority (lower number = higher priority)
    pub fn priority(&self) -> u8 {
        match self {
            Platform::WhatsApp => 1,          // Highest priority in Brazil
            Platform::Instagram => 2,         // Very popular
            Platform::FacebookMessenger => 3, // Common
            Platform::Webchat => 4,          // Always available
            Platform::Telegram => 5,         // Growing
            Platform::Sms => 6,              // Reliable fallback
            Platform::Email => 7,            // Traditional
            Platform::GoogleBusiness => 8,   // Emerging
            Platform::Slack => 9,            // B2B specific
            Platform::Discord => 10,         // Niche
            Platform::MicrosoftTeams => 11,  // Enterprise
            Platform::WeChat => 12,          // Regional
        }
    }

    /// Check if platform is currently implemented
    pub fn is_implemented(&self) -> bool {
        match self {
            Platform::WhatsApp => true,
            _ => false, // TODO: Implement other platforms
        }
    }

    /// Get all implemented platforms
    pub fn implemented() -> Vec<Platform> {
        Platform::all()
            .into_iter()
            .filter(|p| p.is_implemented())
            .collect()
    }

    /// Get all available platforms
    pub fn all() -> Vec<Platform> {
        vec![
            Platform::WhatsApp,
            Platform::Instagram,
            Platform::FacebookMessenger,
            Platform::Telegram,
            Platform::Webchat,
            Platform::Sms,
            Platform::Email,
            Platform::GoogleBusiness,
            Platform::Slack,
            Platform::Discord,
            Platform::MicrosoftTeams,
            Platform::WeChat,
        ]
    }

    /// Get platforms by priority (highest first)
    pub fn by_priority() -> Vec<Platform> {
        let mut platforms = Platform::all();
        platforms.sort_by_key(|p| p.priority());
        platforms
    }
}

impl fmt::Display for Platform {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.display_name())
    }
}

impl From<&str> for Platform {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "whatsapp" | "wa" => Platform::WhatsApp,
            "instagram" | "ig" => Platform::Instagram,
            "facebook" | "messenger" | "fb" => Platform::FacebookMessenger,
            "telegram" | "tg" => Platform::Telegram,
            "webchat" | "web" => Platform::Webchat,
            "sms" => Platform::Sms,
            "email" => Platform::Email,
            "google" | "gbm" => Platform::GoogleBusiness,
            "slack" => Platform::Slack,
            "discord" => Platform::Discord,
            "teams" | "msteams" => Platform::MicrosoftTeams,
            "wechat" => Platform::WeChat,
            _ => Platform::WhatsApp, // Default fallback
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_platform_display_name() {
        assert_eq!(Platform::WhatsApp.display_name(), "WhatsApp Business");
        assert_eq!(Platform::Instagram.display_name(), "Instagram Direct");
        assert_eq!(Platform::Telegram.display_name(), "Telegram");
    }

    #[test]
    fn test_platform_identifier() {
        assert_eq!(Platform::WhatsApp.identifier(), "wa");
        assert_eq!(Platform::Instagram.identifier(), "ig");
        assert_eq!(Platform::FacebookMessenger.identifier(), "fb");
    }

    #[test]
    fn test_platform_features() {
        assert!(Platform::WhatsApp.supports_media());
        assert!(Platform::WhatsApp.supports_read_receipts());
        assert!(Platform::WhatsApp.supports_typing_indicators());
        
        assert!(!Platform::Sms.supports_media());
        assert!(!Platform::Email.supports_read_receipts());
    }

    #[test]
    fn test_platform_priority() {
        assert!(Platform::WhatsApp.priority() < Platform::Email.priority());
        assert!(Platform::Instagram.priority() < Platform::Telegram.priority());
    }

    #[test]
    fn test_platform_from_string() {
        assert_eq!(Platform::from("whatsapp"), Platform::WhatsApp);
        assert_eq!(Platform::from("wa"), Platform::WhatsApp);
        assert_eq!(Platform::from("instagram"), Platform::Instagram);
        assert_eq!(Platform::from("unknown"), Platform::WhatsApp); // fallback
    }

    #[test]
    fn test_platform_ordering() {
        let platforms = Platform::by_priority();
        assert_eq!(platforms[0], Platform::WhatsApp);
        assert!(platforms.len() > 1);
    }
}