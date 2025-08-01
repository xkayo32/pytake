//! Formatting utilities for consistent data presentation

use chrono::{DateTime, Utc};
use std::fmt;

/// Format a phone number for display
pub fn format_phone_number(phone: &str) -> String {
    if phone.is_empty() {
        return phone.to_string();
    }

    // Remove the + prefix for formatting
    let digits = if phone.starts_with('+') {
        &phone[1..]
    } else {
        phone
    };

    // Format based on length (simplified international formatting)
    match digits.len() {
        10 => {
            // US format: (XXX) XXX-XXXX
            if digits.len() >= 10 {
                format!("+{} ({}) {}-{}", 
                    &digits[0..1], 
                    &digits[1..4], 
                    &digits[4..7], 
                    &digits[7..10])
            } else {
                phone.to_string()
            }
        },
        11 => {
            // International format with country code: +X (XXX) XXX-XXXX
            format!("+{} ({}) {}-{}", 
                &digits[0..1], 
                &digits[1..4], 
                &digits[4..7], 
                &digits[7..11])
        },
        _ => {
            // Generic international format: +XX XXXX XXXX or similar
            if digits.len() > 10 {
                // Format like +XX XXXX XXXXXXX
                format!("+{} {} {}", 
                    &digits[0..2], 
                    &digits[2..6], 
                    &digits[6..])
            } else if digits.len() > 6 {
                let mid = digits.len() / 2;
                format!("+{} {} {}", 
                    &digits[0..2.min(digits.len())], 
                    &digits[2..mid.max(2)], 
                    &digits[mid..])
            } else {
                phone.to_string()
            }
        }
    }
}

/// Format a timestamp for display
pub fn format_timestamp(timestamp: &DateTime<Utc>) -> String {
    timestamp.format("%Y-%m-%d %H:%M:%S UTC").to_string()
}

/// Format a timestamp for display in local timezone (as string)
pub fn format_timestamp_local(timestamp: &DateTime<Utc>, timezone_offset_hours: i32) -> String {
    let offset_seconds = timezone_offset_hours * 3600;
    let local_time = timestamp.timestamp() + offset_seconds as i64;
    
    if let Some(local_dt) = DateTime::from_timestamp(local_time, 0) {
        format!("{} (UTC{:+})", 
            local_dt.format("%Y-%m-%d %H:%M:%S"), 
            timezone_offset_hours)
    } else {
        format_timestamp(timestamp)
    }
}

/// Format file size in human-readable format
pub fn format_file_size(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    const THRESHOLD: f64 = 1024.0;
    
    if bytes == 0 {
        return "0 B".to_string();
    }
    
    let mut size = bytes as f64;
    let mut unit_index = 0;
    
    while size >= THRESHOLD && unit_index < UNITS.len() - 1 {
        size /= THRESHOLD;
        unit_index += 1;
    }
    
    if unit_index == 0 {
        format!("{} {}", bytes, UNITS[unit_index])
    } else {
        format!("{:.1} {}", size, UNITS[unit_index])
    }
}

/// Format duration in human-readable format
pub fn format_duration_seconds(seconds: u64) -> String {
    if seconds == 0 {
        return "0 seconds".to_string();
    }
    
    let hours = seconds / 3600;
    let minutes = (seconds % 3600) / 60;
    let remaining_seconds = seconds % 60;
    
    let mut parts = Vec::new();
    
    if hours > 0 {
        parts.push(format!("{} hour{}", hours, if hours == 1 { "" } else { "s" }));
    }
    
    if minutes > 0 {
        parts.push(format!("{} minute{}", minutes, if minutes == 1 { "" } else { "s" }));
    }
    
    if remaining_seconds > 0 || parts.is_empty() {
        parts.push(format!("{} second{}", remaining_seconds, if remaining_seconds == 1 { "" } else { "s" }));
    }
    
    match parts.len() {
        1 => parts[0].clone(),
        2 => format!("{} and {}", parts[0], parts[1]),
        _ => {
            let last = parts.pop().unwrap();
            format!("{}, and {}", parts.join(", "), last)
        }
    }
}

/// Format a name with proper capitalization
pub fn format_name(name: &str) -> String {
    if name.is_empty() {
        return name.to_string();
    }
    
    name.split_whitespace()
        .map(|word| {
            let mut chars: Vec<char> = word.chars().collect();
            if !chars.is_empty() {
                chars[0] = chars[0].to_uppercase().next().unwrap_or(chars[0]);
                for i in 1..chars.len() {
                    chars[i] = chars[i].to_lowercase().next().unwrap_or(chars[i]);
                }
            }
            chars.into_iter().collect::<String>()
        })
        .collect::<Vec<String>>()
        .join(" ")
}

/// Format an email address for display (mask sensitive parts)
pub fn format_email_masked(email: &str) -> String {
    if email.is_empty() || !email.contains('@') {
        return email.to_string();
    }
    
    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return email.to_string();
    }
    
    let local_part = parts[0];
    let domain_part = parts[1];
    
    let masked_local = if local_part.len() <= 1 {
        "*".repeat(local_part.len())
    } else {
        format!("{}{}",
            &local_part[0..1],
            "*".repeat(local_part.len() - 1))
    };
    
    format!("{}@{}", masked_local, domain_part)
}

/// Format a phone number for display (mask sensitive parts)
pub fn format_phone_masked(phone: &str) -> String {
    if phone.len() < 4 {
        return "*".repeat(phone.len());
    }
    
    let visible_end = 4.min(phone.len());
    let masked_start = phone.len().saturating_sub(visible_end);
    
    format!("{}{}",
        "*".repeat(masked_start),
        &phone[masked_start..])
}

/// Truncate text with ellipsis
pub fn truncate_text(text: &str, max_length: usize) -> String {
    if text.len() <= max_length {
        text.to_string()
    } else if max_length <= 3 {
        "...".to_string()
    } else {
        format!("{}...", &text[0..max_length - 3])
    }
}

/// Format a list of items with proper grammar
pub fn format_list(items: &[String]) -> String {
    match items.len() {
        0 => String::new(),
        1 => items[0].clone(),
        2 => format!("{} and {}", items[0], items[1]),
        _ => {
            let last = &items[items.len() - 1];
            let others = &items[0..items.len() - 1];
            format!("{}, and {}", others.join(", "), last)
        }
    }
}

/// Format a percentage value
pub fn format_percentage(value: f64, decimal_places: usize) -> String {
    format!("{:.1$}%", value * 100.0, decimal_places)
}

/// Format currency amount (simplified, USD format)
pub fn format_currency(amount: f64) -> String {
    if amount < 0.0 {
        format!("-${:.2}", amount.abs())
    } else {
        format!("${:.2}", amount)
    }
}

/// Custom display wrapper for better formatting
pub struct DisplayWrapper<T>(pub T);

impl<T> fmt::Display for DisplayWrapper<T>
where
    T: fmt::Debug,
{
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_phone_number_formatting() {
        assert_eq!(format_phone_number("+11234567890"), "+1 (123) 456-7890");
        assert_eq!(format_phone_number("+5511999887766"), "+55 1199 9887766");
        assert_eq!(format_phone_number(""), "");
        assert_eq!(format_phone_number("+123"), "+123");
    }

    #[test]
    fn test_timestamp_formatting() {
        let timestamp = Utc.timestamp_opt(1609459200, 0).unwrap(); // 2021-01-01 00:00:00 UTC
        assert_eq!(format_timestamp(&timestamp), "2021-01-01 00:00:00 UTC");
        
        let local_formatted = format_timestamp_local(&timestamp, -5); // EST
        assert!(local_formatted.contains("2020-12-31 19:00:00")); // 5 hours behind
        assert!(local_formatted.contains("UTC-5"));
    }

    #[test]
    fn test_file_size_formatting() {
        assert_eq!(format_file_size(0), "0 B");
        assert_eq!(format_file_size(1024), "1.0 KB");
        assert_eq!(format_file_size(1536), "1.5 KB");
        assert_eq!(format_file_size(1048576), "1.0 MB");
        assert_eq!(format_file_size(1073741824), "1.0 GB");
    }

    #[test]
    fn test_duration_formatting() {
        assert_eq!(format_duration_seconds(0), "0 seconds");
        assert_eq!(format_duration_seconds(1), "1 second");
        assert_eq!(format_duration_seconds(60), "1 minute");
        assert_eq!(format_duration_seconds(61), "1 minute and 1 second");
        assert_eq!(format_duration_seconds(3661), "1 hour, 1 minute, and 1 second");
        assert_eq!(format_duration_seconds(7200), "2 hours");
    }

    #[test]
    fn test_name_formatting() {
        assert_eq!(format_name("john doe"), "John Doe");
        assert_eq!(format_name("MARY JANE"), "Mary Jane");
        assert_eq!(format_name("bob"), "Bob");
        assert_eq!(format_name(""), "");
        assert_eq!(format_name("jean-claude van damme"), "Jean-claude Van Damme");
    }

    #[test]
    fn test_email_masking() {
        assert_eq!(format_email_masked("test@example.com"), "t***@example.com");
        assert_eq!(format_email_masked("a@domain.com"), "*@domain.com");
        assert_eq!(format_email_masked("ab@domain.com"), "a*@domain.com");
        assert_eq!(format_email_masked(""), "");
        assert_eq!(format_email_masked("invalid"), "invalid");
    }

    #[test]
    fn test_phone_masking() {
        assert_eq!(format_phone_masked("+1234567890"), "*******7890");
        assert_eq!(format_phone_masked("123"), "***");
        assert_eq!(format_phone_masked(""), "");
    }

    #[test]
    fn test_text_truncation() {
        assert_eq!(truncate_text("Hello, World!", 13), "Hello, World!");
        assert_eq!(truncate_text("Hello, World!", 10), "Hello, ...");
        assert_eq!(truncate_text("Hi", 10), "Hi");
        assert_eq!(truncate_text("Hello", 3), "...");
        assert_eq!(truncate_text("Hello", 2), "...");
    }

    #[test]
    fn test_list_formatting() {
        assert_eq!(format_list(&[]), "");
        assert_eq!(format_list(&["apple".to_string()]), "apple");
        assert_eq!(format_list(&["apple".to_string(), "banana".to_string()]), "apple and banana");
        assert_eq!(
            format_list(&["apple".to_string(), "banana".to_string(), "cherry".to_string()]), 
            "apple, banana, and cherry"
        );
    }

    #[test]
    fn test_percentage_formatting() {
        assert_eq!(format_percentage(0.1234, 2), "12.34%");
        assert_eq!(format_percentage(0.5, 0), "50%");
        assert_eq!(format_percentage(1.0, 1), "100.0%");
    }

    #[test]
    fn test_currency_formatting() {
        assert_eq!(format_currency(123.45), "$123.45");
        assert_eq!(format_currency(-67.89), "-$67.89");
        assert_eq!(format_currency(0.0), "$0.00");
        assert_eq!(format_currency(1000.5), "$1000.50");
    }
}