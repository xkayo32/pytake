#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App};
    use crate::handlers::dashboard::*;

    #[actix_web::test]
    async fn test_dashboard_metrics_default_period() {
        let app = test::init_service(
            App::new()
                .route("/metrics", web::get().to(get_dashboard_metrics))
        ).await;

        let req = test::TestRequest::get()
            .uri("/metrics")
            .to_request();
            
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
        
        let body: DashboardMetrics = test::read_body_json(resp).await;
        assert_eq!(body.period, "7d");
        assert!(body.total_conversations >= 0);
        assert!(body.active_conversations >= 0);
        assert!(body.messages_sent >= 0);
        assert!(body.messages_received >= 0);
    }

    #[actix_web::test]
    async fn test_dashboard_metrics_custom_period() {
        let app = test::init_service(
            App::new()
                .route("/metrics", web::get().to(get_dashboard_metrics))
        ).await;

        let req = test::TestRequest::get()
            .uri("/metrics?period=30d")
            .to_request();
            
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
        
        let body: DashboardMetrics = test::read_body_json(resp).await;
        assert_eq!(body.period, "30d");
    }

    #[actix_web::test]
    async fn test_conversation_chart_data() {
        let app = test::init_service(
            App::new()
                .route("/chart/conversations", web::get().to(get_conversation_chart))
        ).await;

        let req = test::TestRequest::get()
            .uri("/chart/conversations?period=7d")
            .to_request();
            
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
        
        let body: ConversationChartResponse = test::read_body_json(resp).await;
        assert_eq!(body.period, "7d");
        assert!(!body.data.is_empty());
        
        // Verify data structure
        for point in &body.data {
            assert!(!point.date.is_empty());
            assert!(point.total >= 0);
            assert!(point.active >= 0);
            assert!(point.resolved >= 0);
            assert!(point.pending >= 0);
            assert!(point.total >= point.active + point.resolved + point.pending);
        }
    }

    #[actix_web::test]
    async fn test_response_time_chart() {
        let app = test::init_service(
            App::new()
                .route("/chart/response-time", web::get().to(get_response_time_chart))
        ).await;

        let req = test::TestRequest::get()
            .uri("/chart/response-time?period=7d")
            .to_request();
            
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
        
        let body: ResponseTimeChartResponse = test::read_body_json(resp).await;
        assert_eq!(body.period, "7d");
        assert!(!body.data.is_empty());
        
        // Verify data structure
        for point in &body.data {
            assert!(!point.date.is_empty());
            assert!(point.avg_response_time >= 0.0);
            assert!(point.min_response_time >= 0.0);
            assert!(point.max_response_time >= 0.0);
            assert!(point.min_response_time <= point.avg_response_time);
            assert!(point.avg_response_time <= point.max_response_time);
        }
    }

    #[actix_web::test]
    async fn test_platform_distribution() {
        let app = test::init_service(
            App::new()
                .route("/chart/platforms", web::get().to(get_platform_distribution))
        ).await;

        let req = test::TestRequest::get()
            .uri("/chart/platforms")
            .to_request();
            
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
        
        let body: PlatformDistributionResponse = test::read_body_json(resp).await;
        assert!(!body.platforms.is_empty());
        
        let total: i32 = body.platforms.iter().map(|p| p.count).sum();
        assert_eq!(total, body.total);
        
        // Verify percentages
        for platform in &body.platforms {
            assert!(platform.percentage >= 0.0);
            assert!(platform.percentage <= 100.0);
        }
    }

    #[actix_web::test]
    async fn test_recent_activity() {
        let app = test::init_service(
            App::new()
                .route("/activity/recent", web::get().to(get_recent_activity))
        ).await;

        let req = test::TestRequest::get()
            .uri("/activity/recent?limit=10")
            .to_request();
            
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
        
        let body: RecentActivityResponse = test::read_body_json(resp).await;
        assert!(body.activities.len() <= 10);
        
        // Verify activity structure
        for activity in &body.activities {
            assert!(!activity.id.is_empty());
            assert!(!activity.activity_type.is_empty());
            assert!(!activity.title.is_empty());
            assert!(!activity.timestamp.is_empty());
            assert!(!activity.platform.is_empty());
        }
    }

    #[test]
    fn test_date_range_calculation() {
        let (start_7d, end_7d) = calculate_date_range("7d");
        let diff_7d = end_7d - start_7d;
        assert_eq!(diff_7d.num_days(), 7);
        
        let (start_30d, end_30d) = calculate_date_range("30d");
        let diff_30d = end_30d - start_30d;
        assert_eq!(diff_30d.num_days(), 30);
        
        let (start_24h, end_24h) = calculate_date_range("24h");
        let diff_24h = end_24h - start_24h;
        assert_eq!(diff_24h.num_hours(), 24);
    }

    #[test]
    fn test_invalid_period_defaults() {
        let (start, end) = calculate_date_range("invalid");
        let diff = end - start;
        assert_eq!(diff.num_days(), 7); // Should default to 7 days
    }
}