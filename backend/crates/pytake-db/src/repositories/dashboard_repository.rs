use crate::entities::prelude::*;
use sea_orm::*;
use uuid::Uuid;
use chrono::{DateTime, Utc, Duration};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug)]
pub struct DashboardRepository {
    db: DatabaseConnection,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardMetrics {
    pub total_conversations: i64,
    pub active_conversations: i64,
    pub pending_conversations: i64,
    pub resolved_conversations: i64,
    pub messages_sent: i64,
    pub messages_received: i64,
    pub avg_response_time: f64,
    pub total_contacts: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversationChartData {
    pub date: String,
    pub total: i32,
    pub active: i32,
    pub resolved: i32,
    pub pending: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResponseTimeData {
    pub date: String,
    pub avg_response_time: f64,
    pub min_response_time: f64,
    pub max_response_time: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlatformDistribution {
    pub platform: String,
    pub count: i64,
    pub percentage: f64,
}

impl DashboardRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Get dashboard metrics for a time period
    pub async fn get_metrics(
        &self,
        organization_id: Uuid,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
    ) -> Result<DashboardMetrics, DbErr> {
        // Total conversations
        let total_conversations = conversation::Entity::find()
            .filter(conversation::Column::OrganizationId.eq(organization_id))
            .filter(conversation::Column::CreatedAt.between(start_date, end_date))
            .count(&self.db)
            .await? as i64;

        // Active conversations
        let active_conversations = conversation::Entity::find()
            .filter(conversation::Column::OrganizationId.eq(organization_id))
            .filter(conversation::Column::Status.eq("active"))
            .count(&self.db)
            .await? as i64;

        // Pending conversations
        let pending_conversations = conversation::Entity::find()
            .filter(conversation::Column::OrganizationId.eq(organization_id))
            .filter(conversation::Column::Status.eq("pending"))
            .count(&self.db)
            .await? as i64;

        // Resolved conversations
        let resolved_conversations = conversation::Entity::find()
            .filter(conversation::Column::OrganizationId.eq(organization_id))
            .filter(conversation::Column::Status.eq("resolved"))
            .filter(conversation::Column::ResolvedAt.between(start_date, end_date))
            .count(&self.db)
            .await? as i64;

        // Messages sent (outbound)
        let messages_sent = message::Entity::find()
            .inner_join(conversation::Entity)
            .filter(conversation::Column::OrganizationId.eq(organization_id))
            .filter(message::Column::Direction.eq("outbound"))
            .filter(message::Column::CreatedAt.between(start_date, end_date))
            .count(&self.db)
            .await? as i64;

        // Messages received (inbound)
        let messages_received = message::Entity::find()
            .inner_join(conversation::Entity)
            .filter(conversation::Column::OrganizationId.eq(organization_id))
            .filter(message::Column::Direction.eq("inbound"))
            .filter(message::Column::CreatedAt.between(start_date, end_date))
            .count(&self.db)
            .await? as i64;

        // Average response time (simplified - would need more complex query in production)
        let avg_response_time = self.calculate_avg_response_time(
            organization_id,
            start_date,
            end_date
        ).await?;

        // Total contacts
        let total_contacts = contact::Entity::find()
            .filter(contact::Column::OrganizationId.eq(organization_id))
            .count(&self.db)
            .await? as i64;

        Ok(DashboardMetrics {
            total_conversations,
            active_conversations,
            pending_conversations,
            resolved_conversations,
            messages_sent,
            messages_received,
            avg_response_time,
            total_contacts,
        })
    }

    /// Get conversation chart data
    pub async fn get_conversation_chart_data(
        &self,
        organization_id: Uuid,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
        interval: &str,
    ) -> Result<Vec<ConversationChartData>, DbErr> {
        // For simplicity, we'll generate daily data
        // In production, this would use proper SQL GROUP BY with date truncation
        
        let mut data = Vec::new();
        let mut current_date = start_date.date_naive();
        let end_date_naive = end_date.date_naive();

        while current_date <= end_date_naive {
            let day_start = current_date.and_hms_opt(0, 0, 0).unwrap().and_utc();
            let day_end = current_date.and_hms_opt(23, 59, 59).unwrap().and_utc();

            // Count conversations by status for this day
            let total = conversation::Entity::find()
                .filter(conversation::Column::OrganizationId.eq(organization_id))
                .filter(conversation::Column::CreatedAt.lte(day_end))
                .count(&self.db)
                .await? as i32;

            let active = conversation::Entity::find()
                .filter(conversation::Column::OrganizationId.eq(organization_id))
                .filter(conversation::Column::Status.eq("active"))
                .filter(conversation::Column::CreatedAt.lte(day_end))
                .count(&self.db)
                .await? as i32;

            let resolved = conversation::Entity::find()
                .filter(conversation::Column::OrganizationId.eq(organization_id))
                .filter(conversation::Column::Status.eq("resolved"))
                .filter(conversation::Column::ResolvedAt.between(day_start, day_end))
                .count(&self.db)
                .await? as i32;

            let pending = conversation::Entity::find()
                .filter(conversation::Column::OrganizationId.eq(organization_id))
                .filter(conversation::Column::Status.eq("pending"))
                .filter(conversation::Column::CreatedAt.lte(day_end))
                .count(&self.db)
                .await? as i32;

            data.push(ConversationChartData {
                date: current_date.format("%Y-%m-%d").to_string(),
                total,
                active,
                resolved,
                pending,
            });

            current_date += Duration::days(1).to_std().unwrap();
        }

        Ok(data)
    }

    /// Get platform distribution
    pub async fn get_platform_distribution(
        &self,
        organization_id: Uuid,
    ) -> Result<Vec<PlatformDistribution>, DbErr> {
        // Raw SQL for GROUP BY platform
        let results = conversation::Entity::find()
            .select_only()
            .column(conversation::Column::Platform)
            .column_as(conversation::Column::Id.count(), "count")
            .filter(conversation::Column::OrganizationId.eq(organization_id))
            .group_by(conversation::Column::Platform)
            .into_tuple::<(String, i64)>()
            .all(&self.db)
            .await?;

        let total: i64 = results.iter().map(|(_, count)| count).sum();

        let distribution = results
            .into_iter()
            .map(|(platform, count)| PlatformDistribution {
                platform,
                count,
                percentage: if total > 0 {
                    (count as f64 / total as f64) * 100.0
                } else {
                    0.0
                },
            })
            .collect();

        Ok(distribution)
    }

    /// Calculate average response time
    async fn calculate_avg_response_time(
        &self,
        organization_id: Uuid,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
    ) -> Result<f64, DbErr> {
        // This is a simplified calculation
        // In production, you'd want to track actual response times between messages
        
        // For now, return a mock value based on resolved conversations
        let resolved_count = conversation::Entity::find()
            .filter(conversation::Column::OrganizationId.eq(organization_id))
            .filter(conversation::Column::Status.eq("resolved"))
            .filter(conversation::Column::ResolvedAt.between(start_date, end_date))
            .count(&self.db)
            .await?;

        // Mock calculation: assume average of 15 minutes per resolved conversation
        Ok(if resolved_count > 0 { 15.0 } else { 0.0 })
    }

    /// Get response time chart data
    pub async fn get_response_time_data(
        &self,
        organization_id: Uuid,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
    ) -> Result<Vec<ResponseTimeData>, DbErr> {
        // Mock implementation - in production would calculate from actual message timestamps
        let mut data = Vec::new();
        let mut current_date = start_date.date_naive();
        let end_date_naive = end_date.date_naive();

        while current_date <= end_date_naive {
            // Generate mock data with some variation
            let base_time = 15.0;
            let variation = (current_date.day() % 5) as f64;
            
            data.push(ResponseTimeData {
                date: current_date.format("%Y-%m-%d").to_string(),
                avg_response_time: base_time + variation,
                min_response_time: base_time - 5.0 + variation,
                max_response_time: base_time + 10.0 + variation,
            });

            current_date += Duration::days(1).to_std().unwrap();
        }

        Ok(data)
    }

    /// Get recent activity
    pub async fn get_recent_activity(
        &self,
        organization_id: Uuid,
        limit: u64,
    ) -> Result<Vec<serde_json::Value>, DbErr> {
        // Get recent messages
        let recent_messages = message::Entity::find()
            .inner_join(conversation::Entity)
            .inner_join(contact::Entity)
            .filter(conversation::Column::OrganizationId.eq(organization_id))
            .order_by_desc(message::Column::CreatedAt)
            .limit(limit)
            .all(&self.db)
            .await?;

        // Convert to activity format
        let activities: Vec<serde_json::Value> = recent_messages
            .into_iter()
            .map(|msg| {
                serde_json::json!({
                    "id": msg.id.to_string(),
                    "type": if msg.direction == "inbound" { "message_received" } else { "message_sent" },
                    "title": format!(
                        "{} message",
                        if msg.direction == "inbound" { "Received" } else { "Sent" }
                    ),
                    "description": msg.content.unwrap_or_default(),
                    "timestamp": msg.created_at.to_rfc3339(),
                    "platform": "whatsapp", // Would come from conversation join
                    "avatar": null,
                })
            })
            .collect();

        Ok(activities)
    }
}