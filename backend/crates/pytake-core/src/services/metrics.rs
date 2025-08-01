//! Metrics service for tracking system performance and business KPIs

use crate::errors::CoreResult;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{DateTime, Utc, Duration, Timelike};
use tracing::{info, debug};
use async_trait::async_trait;

/// Metrics service trait
#[async_trait]
pub trait MetricsService: Send + Sync {
    /// Record a metric value
    async fn record_metric(&self, metric_type: MetricType, value: MetricValue, metadata: Option<HashMap<String, serde_json::Value>>) -> CoreResult<()>;
    
    /// Get time series data for a metric
    async fn get_time_series(&self, metric_name: &str, time_range: TimeRange, aggregation: AggregationType) -> CoreResult<TimeSeries>;
    
    /// Calculate metric summary
    async fn get_metric_summary(&self, metric_name: &str, time_range: TimeRange) -> CoreResult<MetricSummary>;
    
    /// Get available metrics
    async fn get_available_metrics(&self) -> CoreResult<Vec<String>>;
    
    /// Get dashboard metrics
    async fn get_dashboard_metrics(&self) -> CoreResult<DashboardMetrics>;
}

/// Default metrics service implementation
pub struct DefaultMetricsService {
    // In a real implementation, this would have database or time-series DB connections
}

/// Metric type enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MetricType {
    Counter(String),
    Gauge(String),
    Histogram(String),
    Timer(String),
}

/// Metric value
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MetricValue {
    Count(u64),
    Value(f64),
    Duration(Duration),
}

/// Time range for metrics queries
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TimeRange {
    LastHour,
    Last24Hours,
    Last7Days,
    Last30Days,
    LastYear,
    Custom { start: DateTime<Utc>, end: DateTime<Utc> },
}

/// Metric data point
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricDataPoint {
    pub timestamp: DateTime<Utc>,
    pub value: f64,
    pub metadata: HashMap<String, serde_json::Value>,
}

/// Time series data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSeries {
    pub metric_name: String,
    pub data_points: Vec<MetricDataPoint>,
    pub total_count: usize,
    pub aggregation: AggregationType,
}

/// Aggregation types for metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AggregationType {
    Sum,
    Average,
    Count,
    Min,
    Max,
    Percentile(f64),
}

/// WhatsApp messaging metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessagingMetrics {
    pub total_messages: u64,
    pub inbound_messages: u64,
    pub outbound_messages: u64,
    pub delivery_rate: f64,
    pub read_rate: f64,
    pub failed_rate: f64,
    pub average_response_time_seconds: Option<f64>,
    pub peak_messages_per_hour: u64,
    pub active_conversations: u64,
}

/// Contact metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactMetrics {
    pub total_contacts: u64,
    pub whatsapp_contacts: u64,
    pub sync_success_rate: f64,
    pub last_sync_timestamp: Option<DateTime<Utc>>,
    pub contacts_added_today: u64,
    pub contact_verification_rate: f64,
}

/// System performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub api_requests_per_minute: f64,
    pub average_response_time_ms: f64,
    pub error_rate: f64,
    pub active_websocket_connections: u64,
    pub queue_size: HashMap<String, u64>,
    pub memory_usage_mb: Option<f64>,
    pub cpu_usage_percent: Option<f64>,
}

/// Business KPIs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessMetrics {
    pub monthly_active_users: u64,
    pub daily_active_users: u64,
    pub message_volume_growth: f64,
    pub user_retention_rate: f64,
    pub average_conversation_duration_minutes: f64,
    pub conversion_rate: Option<f64>,
}

/// Comprehensive dashboard metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardMetrics {
    pub messaging: MessagingMetrics,
    pub contacts: ContactMetrics,
    pub system: SystemMetrics,
    pub business: BusinessMetrics,
    pub generated_at: DateTime<Utc>,
    pub time_range: TimeRange,
}

/// Alert thresholds for monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricThreshold {
    pub metric_name: String,
    pub threshold_type: ThresholdType,
    pub value: f64,
    pub severity: AlertSeverity,
    pub enabled: bool,
}

/// Threshold comparison types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ThresholdType {
    GreaterThan,
    LessThan,
    Equals,
    NotEquals,
}

/// Alert severity levels
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AlertSeverity {
    Info,
    Warning,
    Critical,
}

/// Metric alert
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricAlert {
    pub id: Uuid,
    pub metric_name: String,
    pub current_value: f64,
    pub threshold: MetricThreshold,
    pub triggered_at: DateTime<Utc>,
    pub message: String,
    pub acknowledged: bool,
}

/// Metric summary statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricSummary {
    pub metric_name: String,
    pub count: usize,
    pub min: f64,
    pub max: f64,
    pub average: f64,
    pub sum: f64,
    pub last_value: Option<f64>,
    pub time_range: TimeRange,
}

impl DefaultMetricsService {
    /// Create new metrics service  
    pub fn new() -> Self {
        Self {}
    }
    
    /// Get comprehensive dashboard metrics
    pub async fn get_dashboard_metrics(&self, time_range: TimeRange) -> CoreResult<DashboardMetrics> {
        info!("Generating dashboard metrics for time range: {:?}", time_range);
        
        let messaging = self.get_messaging_metrics(&time_range).await?;
        let contacts = self.get_contact_metrics(&time_range).await?;
        let system = self.get_system_metrics().await?;
        let business = self.get_business_metrics(&time_range).await?;
        
        Ok(DashboardMetrics {
            messaging,
            contacts,
            system,
            business,
            generated_at: Utc::now(),
            time_range,
        })
    }
    
    /// Get messaging metrics
    pub async fn get_messaging_metrics(&self, time_range: &TimeRange) -> CoreResult<MessagingMetrics> {
        debug!("Calculating messaging metrics for: {:?}", time_range);
        
        // In real implementation, this would query the database
        // For now, return mock data that looks realistic
        let (total_messages, inbound, outbound) = match time_range {
            TimeRange::LastHour => (127, 73, 54),
            TimeRange::Last24Hours => (2840, 1620, 1220),
            TimeRange::Last7Days => (18500, 10800, 7700),
            TimeRange::Last30Days => (85000, 48000, 37000),
            _ => (2840, 1620, 1220),
        };
        
        Ok(MessagingMetrics {
            total_messages,
            inbound_messages: inbound,
            outbound_messages: outbound,
            delivery_rate: 0.942, // 94.2%
            read_rate: 0.784,     // 78.4%
            failed_rate: 0.021,   // 2.1%
            average_response_time_seconds: Some(14.7),
            peak_messages_per_hour: 380,
            active_conversations: 156,
        })
    }
    
    /// Get contact metrics
    pub async fn get_contact_metrics(&self, time_range: &TimeRange) -> CoreResult<ContactMetrics> {
        debug!("Calculating contact metrics for: {:?}", time_range);
        
        let contacts_added = match time_range {
            TimeRange::LastHour => 12,
            TimeRange::Last24Hours => 89,
            TimeRange::Last7Days => 450,
            TimeRange::Last30Days => 1850,
            _ => 89,
        };
        
        Ok(ContactMetrics {
            total_contacts: 12847,
            whatsapp_contacts: 9632,
            sync_success_rate: 0.987, // 98.7%
            last_sync_timestamp: Some(Utc::now() - Duration::minutes(23)),
            contacts_added_today: contacts_added,
            contact_verification_rate: 0.924, // 92.4%
        })
    }
    
    /// Get system performance metrics
    pub async fn get_system_metrics(&self) -> CoreResult<SystemMetrics> {
        debug!("Calculating system performance metrics");
        
        let mut queue_sizes = HashMap::new();
        queue_sizes.insert("inbound".to_string(), 12);
        queue_sizes.insert("outbound".to_string(), 8);
        queue_sizes.insert("status".to_string(), 3);
        queue_sizes.insert("contacts".to_string(), 5);
        queue_sizes.insert("notifications".to_string(), 14);
        
        Ok(SystemMetrics {
            api_requests_per_minute: 234.7,
            average_response_time_ms: 87.3,
            error_rate: 0.012, // 1.2%
            active_websocket_connections: 47,
            queue_size: queue_sizes,
            memory_usage_mb: Some(342.8),
            cpu_usage_percent: Some(23.4),
        })
    }
    
    /// Get business KPIs
    pub async fn get_business_metrics(&self, time_range: &TimeRange) -> CoreResult<BusinessMetrics> {
        debug!("Calculating business metrics for: {:?}", time_range);
        
        let (mau, dau) = match time_range {
            TimeRange::Last30Days => (1247, 456),
            TimeRange::Last7Days => (892, 387),
            _ => (892, 387),
        };
        
        Ok(BusinessMetrics {
            monthly_active_users: mau,
            daily_active_users: dau,
            message_volume_growth: 0.127, // 12.7% growth
            user_retention_rate: 0.834,   // 83.4%
            average_conversation_duration_minutes: 8.7,
            conversion_rate: Some(0.067), // 6.7%
        })
    }
    
    /// Get time series data for a specific metric
    pub async fn get_time_series(
        &self,
        metric_name: &str,
        time_range: TimeRange,
        aggregation: AggregationType,
        interval_minutes: u32,
    ) -> CoreResult<TimeSeries> {
        debug!("Getting time series for metric: {}", metric_name);
        
        let (start, end) = self.get_time_range_bounds(&time_range)?;
        let mut data_points = Vec::new();
        
        // Generate mock time series data
        let mut current = start;
        while current <= end {
            let value = self.generate_mock_metric_value(metric_name, current);
            data_points.push(MetricDataPoint {
                timestamp: current,
                value,
                metadata: HashMap::new(),
            });
            current = current + Duration::minutes(interval_minutes as i64);
        }
        
        Ok(TimeSeries {
            metric_name: metric_name.to_string(),
            data_points: data_points.clone(),
            total_count: data_points.len(),
            aggregation,
        })
    }
    
    /// Record a custom metric
    pub async fn record_metric(
        &self,
        metric_name: &str,
        value: f64,
        _metadata: Option<HashMap<String, serde_json::Value>>,
    ) -> CoreResult<()> {
        debug!("Recording metric: {} = {}", metric_name, value);
        
        // In real implementation, this would store to time-series database
        info!("Recorded metric: {} = {} at {}", metric_name, value, Utc::now());
        Ok(())
    }
    
    /// Get metric alerts
    pub async fn get_active_alerts(&self) -> CoreResult<Vec<MetricAlert>> {
        debug!("Getting active metric alerts");
        
        // Mock alerts for demonstration
        let alerts = vec![
            MetricAlert {
                id: Uuid::new_v4(),
                metric_name: "error_rate".to_string(),
                current_value: 0.045,
                threshold: MetricThreshold {
                    metric_name: "error_rate".to_string(),
                    threshold_type: ThresholdType::GreaterThan,
                    value: 0.03,
                    severity: AlertSeverity::Warning,
                    enabled: true,
                },
                triggered_at: Utc::now() - Duration::minutes(15),
                message: "Error rate is above threshold (4.5% > 3%)".to_string(),
                acknowledged: false,
            },
        ];
        
        Ok(alerts)
    }
    
    /// Acknowledge an alert
    pub async fn acknowledge_alert(&self, alert_id: Uuid) -> CoreResult<()> {
        info!("Acknowledging alert: {}", alert_id);
        
        // In real implementation, this would update the database
        Ok(())
    }
    
    /// Get metric summary for a specific metric
    pub async fn get_metric_summary(
        &self,
        metric_name: &str,
        time_range: TimeRange,
    ) -> CoreResult<MetricSummary> {
        debug!("Getting summary for metric: {}", metric_name);
        
        let time_series = self.get_time_series(
            metric_name,
            time_range,
            AggregationType::Average,
            15, // 15-minute intervals
        ).await?;
        
        let values: Vec<f64> = time_series.data_points.iter().map(|dp| dp.value).collect();
        
        if values.is_empty() {
            return Ok(MetricSummary {
                metric_name: metric_name.to_string(),
                count: 0,
                sum: 0.0,
                average: 0.0,
                min: 0.0,
                max: 0.0,
                last_value: None,
                time_range: TimeRange::LastHour,
            });
        }
        
        let sum: f64 = values.iter().sum();
        let count = values.len();
        let average = sum / count as f64;
        let min = values.iter().fold(f64::INFINITY, |a, &b| a.min(b));
        let max = values.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b));
        let last_value = values.last().copied();
        
        Ok(MetricSummary {
            metric_name: metric_name.to_string(),
            count,
            sum,
            average,
            min,
            max,
            last_value,
            time_range: TimeRange::LastHour,
        })
    }
    
    /// Helper to get time range bounds
    fn get_time_range_bounds(&self, time_range: &TimeRange) -> CoreResult<(DateTime<Utc>, DateTime<Utc>)> {
        let now = Utc::now();
        let bounds = match time_range {
            TimeRange::LastHour => (now - Duration::hours(1), now),
            TimeRange::Last24Hours => (now - Duration::hours(24), now),
            TimeRange::Last7Days => (now - Duration::days(7), now),
            TimeRange::Last30Days => (now - Duration::days(30), now),
            TimeRange::LastYear => (now - Duration::days(365), now),
            TimeRange::Custom { start, end } => (*start, *end),
        };
        
        Ok(bounds)
    }
    
    /// Generate mock metric values for demonstration
    fn generate_mock_metric_value(&self, metric_name: &str, timestamp: DateTime<Utc>) -> f64 {
        use std::f64::consts::PI;
        
        let hour = timestamp.hour() as f64;
        let base_value = match metric_name {
            "messages_per_hour" => {
                // Peak during business hours
                let business_hours_factor = ((hour - 12.0) * PI / 12.0).cos() * 0.3 + 0.7;
                150.0 * business_hours_factor + (timestamp.timestamp() % 100) as f64
            },
            "response_time_ms" => {
                // Higher during peak hours
                let load_factor = ((hour - 14.0) * PI / 8.0).cos() * 0.2 + 0.8;
                80.0 * load_factor + (timestamp.timestamp() % 50) as f64
            },
            "error_rate" => {
                // Generally low with occasional spikes
                let base = 0.02;
                let spike = if timestamp.timestamp() % 300 < 10 { 0.03 } else { 0.0 };
                base + spike + (timestamp.timestamp() % 7) as f64 * 0.001
            },
            "active_users" => {
                // More users during day time
                let day_factor = ((hour - 14.0) * PI / 10.0).cos() * 0.4 + 0.6;
                200.0 * day_factor + (timestamp.timestamp() % 30) as f64
            },
            _ => {
                // Default pattern
                100.0 + ((timestamp.timestamp() as f64) * 0.01).sin() * 20.0
            }
        };
        
        base_value.max(0.0) // Ensure non-negative values
    }
}

#[async_trait]
impl MetricsService for DefaultMetricsService {
    async fn record_metric(&self, metric_type: MetricType, value: MetricValue, metadata: Option<HashMap<String, serde_json::Value>>) -> CoreResult<()> {
        let metric_name = match &metric_type {
            MetricType::Counter(name) | MetricType::Gauge(name) | MetricType::Histogram(name) | MetricType::Timer(name) => name,
        };
        
        let numeric_value = match value {
            MetricValue::Count(c) => c as f64,
            MetricValue::Value(v) => v,
            MetricValue::Duration(d) => d.num_milliseconds() as f64,
        };
        
        info!("Recording metric {}: {}", metric_name, numeric_value);
        Ok(())
    }
    
    async fn get_time_series(&self, metric_name: &str, time_range: TimeRange, aggregation: AggregationType) -> CoreResult<TimeSeries> {
        let (start, end) = self.get_time_range_bounds(&time_range)?;
        let mut data_points = Vec::new();
        
        // Generate mock time series data
        let mut current = start;
        let interval_minutes = 15;
        while current <= end {
            let value = self.generate_mock_metric_value(metric_name, current);
            data_points.push(MetricDataPoint {
                timestamp: current,
                value,
                metadata: std::collections::HashMap::new(),
            });
            current = current + chrono::Duration::minutes(interval_minutes);
        }
        
        Ok(TimeSeries {
            metric_name: metric_name.to_string(),
            data_points: data_points.clone(),
            total_count: data_points.len(),
            aggregation,
        })
    }
    
    async fn get_metric_summary(&self, metric_name: &str, time_range: TimeRange) -> CoreResult<MetricSummary> {
        debug!("Getting metric summary for: {}", metric_name);
        
        // Generate mock summary data
        Ok(MetricSummary {
            metric_name: metric_name.to_string(),
            count: 100,
            min: 10.0,
            max: 500.0,
            average: 150.0,
            sum: 15000.0,
            last_value: Some(175.0),
            time_range,
        })
    }
    
    async fn get_available_metrics(&self) -> CoreResult<Vec<String>> {
        Ok(vec![
            "messages_per_hour".to_string(),
            "response_time_ms".to_string(),
            "error_rate".to_string(),
            "active_users".to_string(),
            "queue_size".to_string(),
            "memory_usage_mb".to_string(),
            "cpu_usage_percent".to_string(),
        ])
    }
    
    async fn get_dashboard_metrics(&self) -> CoreResult<DashboardMetrics> {
        let time_range = TimeRange::Last24Hours;
        info!("Generating dashboard metrics for time range: {:?}", time_range);
        
        let messaging = self.get_messaging_metrics(&time_range).await?;
        let contacts = self.get_contact_metrics(&time_range).await?;
        let system = self.get_system_metrics().await?;
        let business = self.get_business_metrics(&time_range).await?;
        
        Ok(DashboardMetrics {
            messaging,
            contacts,
            system,
            business,
            generated_at: chrono::Utc::now(),
            time_range,
        })
    }
}

impl Default for DefaultMetricsService {
    fn default() -> Self {
        Self::new()
    }
}

impl TimeRange {
    /// Get a human-readable description of the time range
    pub fn description(&self) -> String {
        match self {
            TimeRange::LastHour => "Last Hour".to_string(),
            TimeRange::Last24Hours => "Last 24 Hours".to_string(),
            TimeRange::Last7Days => "Last 7 Days".to_string(),
            TimeRange::Last30Days => "Last 30 Days".to_string(),
            TimeRange::LastYear => "Last Year".to_string(),
            TimeRange::Custom { start, end } => {
                format!("Custom: {} to {}", start.format("%Y-%m-%d"), end.format("%Y-%m-%d"))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_dashboard_metrics() {
        let service = DefaultMetricsService::new();
        
        let metrics = service.get_dashboard_metrics(TimeRange::Last24Hours).await.unwrap();
        
        assert!(metrics.messaging.total_messages > 0);
        assert!(metrics.contacts.total_contacts > 0);
        assert!(metrics.system.api_requests_per_minute > 0.0);
        assert!(metrics.business.daily_active_users > 0);
    }
    
    #[tokio::test]
    async fn test_get_time_series() {
        let service = DefaultMetricsService::new();
        
        let time_series = service.get_time_series(
            "messages_per_hour",
            TimeRange::LastHour,
            AggregationType::Average,
            15,
        ).await.unwrap();
        
        assert_eq!(time_series.metric_name, "messages_per_hour");
        assert!(!time_series.data_points.is_empty());
    }
    
    #[tokio::test]
    async fn test_record_metric() {
        let service = DefaultMetricsService::new();
        
        let result = service.record_metric("test_metric", 42.0, None).await;
        assert!(result.is_ok());
    }
    
    #[tokio::test]
    async fn test_get_metric_summary() {
        let service = DefaultMetricsService::new();
        
        let summary = service.get_metric_summary(
            "response_time_ms",
            TimeRange::LastHour,
        ).await.unwrap();
        
        assert_eq!(summary.metric_name, "response_time_ms");
        assert!(summary.count > 0);
        assert!(summary.average > 0.0);
    }
    
    #[test]
    fn test_time_range_description() {
        assert_eq!(TimeRange::LastHour.description(), "Last Hour");
        assert_eq!(TimeRange::Last24Hours.description(), "Last 24 Hours");
        assert_eq!(TimeRange::Last7Days.description(), "Last 7 Days");
    }
}