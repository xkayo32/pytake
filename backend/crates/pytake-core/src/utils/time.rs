//! Time utilities for consistent time handling

use crate::entities::common::Timestamp;
use chrono::{DateTime, Duration, Utc, TimeZone, Datelike, Timelike};
use std::time::{SystemTime, UNIX_EPOCH};

/// Get current UTC timestamp
pub fn now() -> Timestamp {
    Timestamp::now()
}

/// Get current UTC timestamp as DateTime<Utc>
pub fn now_datetime() -> DateTime<Utc> {
    Utc::now()
}

/// Convert Unix timestamp (seconds) to DateTime<Utc>
pub fn from_unix_timestamp(timestamp: i64) -> Option<DateTime<Utc>> {
    DateTime::from_timestamp(timestamp, 0)
}

/// Convert Unix timestamp (milliseconds) to DateTime<Utc>
pub fn from_unix_timestamp_millis(timestamp: i64) -> Option<DateTime<Utc>> {
    DateTime::from_timestamp_millis(timestamp)
}

/// Convert DateTime<Utc> to Unix timestamp (seconds)
pub fn to_unix_timestamp(datetime: &DateTime<Utc>) -> i64 {
    datetime.timestamp()
}

/// Convert DateTime<Utc> to Unix timestamp (milliseconds)
pub fn to_unix_timestamp_millis(datetime: &DateTime<Utc>) -> i64 {
    datetime.timestamp_millis()
}

/// Parse ISO 8601 string to DateTime<Utc>
pub fn parse_iso8601(iso_string: &str) -> Result<DateTime<Utc>, chrono::ParseError> {
    DateTime::parse_from_rfc3339(iso_string)
        .map(|dt| dt.with_timezone(&Utc))
}

/// Format DateTime<Utc> as ISO 8601 string
pub fn to_iso8601(datetime: &DateTime<Utc>) -> String {
    datetime.to_rfc3339()
}

/// Check if a timestamp is within a given duration from now
pub fn is_within_duration_from_now(timestamp: &DateTime<Utc>, duration: Duration) -> bool {
    let now = now_datetime();
    let diff = now.signed_duration_since(*timestamp);
    diff <= duration && diff >= Duration::zero()
}

/// Check if a timestamp is in the past
pub fn is_in_past(timestamp: &DateTime<Utc>) -> bool {
    *timestamp < now_datetime()
}

/// Check if a timestamp is in the future
pub fn is_in_future(timestamp: &DateTime<Utc>) -> bool {
    *timestamp > now_datetime()
}

/// Add duration to a timestamp
pub fn add_duration(timestamp: &DateTime<Utc>, duration: Duration) -> DateTime<Utc> {
    *timestamp + duration
}

/// Subtract duration from a timestamp
pub fn subtract_duration(timestamp: &DateTime<Utc>, duration: Duration) -> DateTime<Utc> {
    *timestamp - duration
}

/// Get the start of the day for a given timestamp
pub fn start_of_day(timestamp: &DateTime<Utc>) -> DateTime<Utc> {
    timestamp.date_naive().and_hms_opt(0, 0, 0)
        .map(|naive| Utc.from_utc_datetime(&naive))
        .unwrap_or(*timestamp)
}

/// Get the end of the day for a given timestamp
pub fn end_of_day(timestamp: &DateTime<Utc>) -> DateTime<Utc> {
    timestamp.date_naive().and_hms_opt(23, 59, 59)
        .map(|naive| Utc.from_utc_datetime(&naive))
        .unwrap_or(*timestamp)
}

/// Get the start of the week for a given timestamp (Monday)
pub fn start_of_week(timestamp: &DateTime<Utc>) -> DateTime<Utc> {
    let days_from_monday = timestamp.weekday().num_days_from_monday();
    let start_date = timestamp.date_naive() - Duration::days(days_from_monday as i64);
    start_date.and_hms_opt(0, 0, 0)
        .map(|naive| Utc.from_utc_datetime(&naive))
        .unwrap_or(*timestamp)
}

/// Get the start of the month for a given timestamp
pub fn start_of_month(timestamp: &DateTime<Utc>) -> DateTime<Utc> {
    let start_date = timestamp.date_naive().with_day(1).unwrap_or(timestamp.date_naive());
    start_date.and_hms_opt(0, 0, 0)
        .map(|naive| Utc.from_utc_datetime(&naive))
        .unwrap_or(*timestamp)
}

/// Calculate age in years from a birth date
pub fn calculate_age_years(birth_date: &DateTime<Utc>) -> i32 {
    let now = now_datetime();
    let mut age = now.year() - birth_date.year();
    
    // If birthday hasn't occurred this year yet, subtract 1
    if now.month() < birth_date.month() || 
       (now.month() == birth_date.month() && now.day() < birth_date.day()) {
        age -= 1;
    }
    
    age
}

/// Calculate the duration between two timestamps
pub fn duration_between(start: &DateTime<Utc>, end: &DateTime<Utc>) -> Duration {
    end.signed_duration_since(*start)
}

/// Format duration in human-readable format
pub fn format_duration(duration: Duration) -> String {
    if duration.num_days() > 0 {
        format!("{} days", duration.num_days())
    } else if duration.num_hours() > 0 {
        format!("{} hours", duration.num_hours())
    } else if duration.num_minutes() > 0 {
        format!("{} minutes", duration.num_minutes())
    } else {
        format!("{} seconds", duration.num_seconds())
    }
}

/// Create a duration from various time units
pub fn duration_from_seconds(seconds: i64) -> Duration {
    Duration::seconds(seconds)
}

pub fn duration_from_minutes(minutes: i64) -> Duration {
    Duration::minutes(minutes)
}

pub fn duration_from_hours(hours: i64) -> Duration {
    Duration::hours(hours)
}

pub fn duration_from_days(days: i64) -> Duration {
    Duration::days(days)
}

/// Time range struct for working with time intervals
#[derive(Debug, Clone, PartialEq)]
pub struct TimeRange {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

impl TimeRange {
    /// Create a new time range
    pub fn new(start: DateTime<Utc>, end: DateTime<Utc>) -> Self {
        Self { start, end }
    }

    /// Create a time range from now to a future point
    pub fn from_now_to_future(duration: Duration) -> Self {
        let now = now_datetime();
        Self {
            start: now,
            end: now + duration,
        }
    }

    /// Create a time range from a past point to now
    pub fn from_past_to_now(duration: Duration) -> Self {
        let now = now_datetime();
        Self {
            start: now - duration,
            end: now,
        }
    }

    /// Check if a timestamp is within this range
    pub fn contains(&self, timestamp: &DateTime<Utc>) -> bool {
        *timestamp >= self.start && *timestamp <= self.end
    }

    /// Get the duration of this time range
    pub fn duration(&self) -> Duration {
        self.end.signed_duration_since(self.start)
    }

    /// Check if this range overlaps with another range
    pub fn overlaps_with(&self, other: &TimeRange) -> bool {
        self.start <= other.end && self.end >= other.start
    }

    /// Get the intersection of this range with another range
    pub fn intersection(&self, other: &TimeRange) -> Option<TimeRange> {
        let start = self.start.max(other.start);
        let end = self.end.min(other.end);
        
        if start <= end {
            Some(TimeRange { start, end })
        } else {
            None
        }
    }
}

/// Convert SystemTime to DateTime<Utc>
pub fn system_time_to_datetime(system_time: SystemTime) -> Option<DateTime<Utc>> {
    system_time
        .duration_since(UNIX_EPOCH)
        .ok()
        .and_then(|duration| {
            DateTime::from_timestamp(duration.as_secs() as i64, duration.subsec_nanos())
        })
}

/// Convert DateTime<Utc> to SystemTime
pub fn datetime_to_system_time(datetime: &DateTime<Utc>) -> SystemTime {
    UNIX_EPOCH + std::time::Duration::from_secs(datetime.timestamp() as u64)
}

/// Sleep for a duration (async) - requires tokio feature
pub async fn sleep(duration: Duration) {
    if let Ok(std_duration) = duration.to_std() {
        tokio::time::sleep(std_duration).await;
    }
}

/// Timeout for async operations - requires tokio feature
pub async fn timeout<T>(
    duration: Duration,
    future: impl std::future::Future<Output = T>,
) -> Result<T, tokio::time::error::Elapsed> {
    if let Ok(std_duration) = duration.to_std() {
        tokio::time::timeout(std_duration, future).await
    } else {
        // If duration is negative or too large, run without timeout
        Ok(future.await)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timestamp_conversions() {
        let timestamp = 1609459200; // 2021-01-01 00:00:00 UTC
        let datetime = from_unix_timestamp(timestamp).unwrap();
        
        assert_eq!(datetime.year(), 2021);
        assert_eq!(datetime.month(), 1);
        assert_eq!(datetime.day(), 1);
        
        let converted_back = to_unix_timestamp(&datetime);
        assert_eq!(converted_back, timestamp);
    }

    #[test]
    fn test_iso8601_parsing() {
        let iso_string = "2021-01-01T00:00:00Z";
        let datetime = parse_iso8601(iso_string).unwrap();
        
        assert_eq!(datetime.year(), 2021);
        assert_eq!(datetime.month(), 1);
        assert_eq!(datetime.day(), 1);
        
        let formatted = to_iso8601(&datetime);
        assert_eq!(formatted, "2021-01-01T00:00:00+00:00");
    }

    #[test]
    fn test_duration_operations() {
        let base_time = from_unix_timestamp(1609459200).unwrap(); // 2021-01-01 00:00:00 UTC
        let one_hour = duration_from_hours(1);
        
        let future_time = add_duration(&base_time, one_hour);
        assert_eq!(future_time.hour(), 1);
        
        let past_time = subtract_duration(&base_time, one_hour);
        assert_eq!(past_time.hour(), 23);
        assert_eq!(past_time.day(), 31); // Previous day
    }

    #[test]
    fn test_time_boundaries() {
        let timestamp = from_unix_timestamp(1609459200 + 3661).unwrap(); // 2021-01-01 01:01:01 UTC
        
        let start_of_day = start_of_day(&timestamp);
        assert_eq!(start_of_day.hour(), 0);
        assert_eq!(start_of_day.minute(), 0);
        assert_eq!(start_of_day.second(), 0);
        
        let end_of_day = end_of_day(&timestamp);
        assert_eq!(end_of_day.hour(), 23);
        assert_eq!(end_of_day.minute(), 59);
        assert_eq!(end_of_day.second(), 59);
    }

    #[test]
    fn test_age_calculation() {
        let birth_date = from_unix_timestamp(946684800).unwrap(); // 2000-01-01 00:00:00 UTC
        let current_year = now_datetime().year();
        let expected_age = current_year - 2000;
        
        let age = calculate_age_years(&birth_date);
        
        // Age should be close to expected (might be off by 1 depending on current date)
        assert!((age - expected_age).abs() <= 1);
    }

    #[test]
    fn test_time_range() {
        let start = from_unix_timestamp(1609459200).unwrap(); // 2021-01-01 00:00:00 UTC
        let end = add_duration(&start, duration_from_hours(2));
        let range = TimeRange::new(start, end);
        
        // Test contains
        let middle = add_duration(&start, duration_from_hours(1));
        assert!(range.contains(&middle));
        
        let outside = add_duration(&start, duration_from_hours(3));
        assert!(!range.contains(&outside));
        
        // Test duration
        assert_eq!(range.duration(), duration_from_hours(2));
    }

    #[test]
    fn test_time_range_overlap() {
        let range1 = TimeRange::new(
            from_unix_timestamp(1609459200).unwrap(), // 2021-01-01 00:00:00 UTC
            from_unix_timestamp(1609459200 + 3600).unwrap(), // 2021-01-01 01:00:00 UTC
        );
        
        let range2 = TimeRange::new(
            from_unix_timestamp(1609459200 + 1800).unwrap(), // 2021-01-01 00:30:00 UTC
            from_unix_timestamp(1609459200 + 5400).unwrap(), // 2021-01-01 01:30:00 UTC
        );
        
        assert!(range1.overlaps_with(&range2));
        
        let intersection = range1.intersection(&range2).unwrap();
        assert_eq!(intersection.start, range2.start);
        assert_eq!(intersection.end, range1.end);
    }

    #[test]
    fn test_system_time_conversion() {
        let system_time = SystemTime::now();
        let datetime = system_time_to_datetime(system_time).unwrap();
        let converted_back = datetime_to_system_time(&datetime);
        
        // Should be very close (within a second due to precision)
        let diff = system_time.duration_since(converted_back)
            .or_else(|_| converted_back.duration_since(system_time))
            .unwrap();
        assert!(diff.as_secs() <= 1);
    }

    #[test]
    fn test_duration_formatting() {
        assert_eq!(format_duration(duration_from_days(2)), "2 days");
        assert_eq!(format_duration(duration_from_hours(3)), "3 hours");
        assert_eq!(format_duration(duration_from_minutes(45)), "45 minutes");
        assert_eq!(format_duration(duration_from_seconds(30)), "30 seconds");
    }

    #[test]
    fn test_time_checks() {
        let past = now_datetime() - duration_from_hours(1);
        let future = now_datetime() + duration_from_hours(1);
        
        assert!(is_in_past(&past));
        assert!(!is_in_past(&future));
        assert!(is_in_future(&future));
        assert!(!is_in_future(&past));
        
        assert!(is_within_duration_from_now(&past, duration_from_hours(2)));
        assert!(!is_within_duration_from_now(&past, duration_from_minutes(30)));
    }
}