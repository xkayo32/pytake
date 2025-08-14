package analytics

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// CampaignAnalyzer defines the interface for campaign analytics and tracking
type CampaignAnalyzer interface {
	// Message Tracking
	RecordMessageSent(ctx context.Context, campaignID, contactID uuid.UUID, messageID string) error
	RecordMessageDelivered(ctx context.Context, messageID string, timestamp time.Time) error
	RecordMessageRead(ctx context.Context, messageID string, timestamp time.Time) error
	RecordMessageReplied(ctx context.Context, messageID string, timestamp time.Time) error
	RecordMessageClicked(ctx context.Context, messageID string, url string, timestamp time.Time) error
	RecordMessageFailed(ctx context.Context, messageID string, errorReason string, timestamp time.Time) error
	RecordMessageUnsubscribed(ctx context.Context, messageID string, timestamp time.Time) error

	// Campaign Analytics
	GetCampaignSummary(ctx context.Context, campaignID uuid.UUID) (*CampaignSummary, error)
	GetCampaignMetrics(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) (*CampaignMetrics, error)
	GetCampaignTrends(ctx context.Context, campaignID uuid.UUID, granularity string) ([]*TrendDataPoint, error)
	GetCampaignPerformance(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) (*CampaignPerformance, error)

	// Real-time Analytics
	GetRealTimeStats(ctx context.Context, campaignID uuid.UUID) (*RealTimeStats, error)
	GetLiveMessageStats(ctx context.Context, campaignID uuid.UUID, duration time.Duration) (*LiveMessageStats, error)

	// Segmentation Analytics
	GetSegmentPerformance(ctx context.Context, tenantID uuid.UUID, segmentID uuid.UUID, dateRange *DateRange) (*SegmentPerformance, error)
	GetContactEngagement(ctx context.Context, tenantID uuid.UUID, contactID uuid.UUID, dateRange *DateRange) (*ContactEngagement, error)

	// Comparative Analytics
	CompareCampaigns(ctx context.Context, campaignIDs []uuid.UUID) (*CampaignComparison, error)
	GetIndustryBenchmarks(ctx context.Context, industry string) (*IndustryBenchmarks, error)
	GetTenantBenchmarks(ctx context.Context, tenantID uuid.UUID, dateRange *DateRange) (*TenantBenchmarks, error)

	// A/B Test Analytics
	GetABTestResults(ctx context.Context, testID uuid.UUID) (*ABTestResults, error)
	CalculateStatisticalSignificance(ctx context.Context, testID uuid.UUID) (*StatisticalSignificance, error)

	// Revenue Analytics
	RecordConversion(ctx context.Context, messageID string, conversionType string, value float64, timestamp time.Time) error
	GetRevenueAnalytics(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) (*RevenueAnalytics, error)

	// Attribution Analytics
	TrackAttributionPath(ctx context.Context, contactID uuid.UUID, touchpoint *AttributionTouchpoint) error
	GetAttributionAnalysis(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) (*AttributionAnalysis, error)

	// Export and Reporting
	ExportCampaignData(ctx context.Context, campaignID uuid.UUID, format string, dateRange *DateRange) (*ExportResult, error)
	ScheduleReport(ctx context.Context, tenantID uuid.UUID, config *ReportConfig) (*ScheduledReport, error)
	GenerateInsights(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) (*CampaignInsights, error)
}

// Data Structures

// Campaign Analytics

// CampaignSummary represents a summary of campaign metrics
type CampaignSummary struct {
	CampaignID        uuid.UUID `json:"campaign_id"`
	TotalTargets      int       `json:"total_targets"`
	MessagesSent      int       `json:"messages_sent"`
	MessagesDelivered int       `json:"messages_delivered"`
	MessagesRead      int       `json:"messages_read"`
	MessagesReplied   int       `json:"messages_replied"`
	MessagesClicked   int       `json:"messages_clicked"`
	MessagesFailed    int       `json:"messages_failed"`
	MessagesUnsubscribed int    `json:"messages_unsubscribed"`
	
	// Calculated Rates
	DeliveryRate      float64   `json:"delivery_rate"`
	OpenRate          float64   `json:"open_rate"`
	ClickRate         float64   `json:"click_rate"`
	ResponseRate      float64   `json:"response_rate"`
	UnsubscribeRate   float64   `json:"unsubscribe_rate"`
	
	// Engagement Metrics
	TotalEngagements  int       `json:"total_engagements"`
	UniqueEngagers    int       `json:"unique_engagers"`
	AvgEngagementTime float64   `json:"avg_engagement_time_seconds"`
	
	// Performance Scores
	PerformanceScore  float64   `json:"performance_score"`
	QualityScore      float64   `json:"quality_score"`
	
	LastUpdated       time.Time `json:"last_updated"`
}

// CampaignMetrics represents detailed campaign metrics
type CampaignMetrics struct {
	CampaignID      uuid.UUID         `json:"campaign_id"`
	DateRange       DateRange         `json:"date_range"`
	Summary         CampaignSummary   `json:"summary"`
	DailyMetrics    []*DailyMetrics   `json:"daily_metrics"`
	HourlyMetrics   []*HourlyMetrics  `json:"hourly_metrics"`
	SegmentBreakdown []*SegmentMetrics `json:"segment_breakdown"`
	DeviceBreakdown  map[string]int    `json:"device_breakdown"`
	LocationBreakdown map[string]int   `json:"location_breakdown"`
	EngagementFunnel EngagementFunnel  `json:"engagement_funnel"`
}

// DailyMetrics represents daily campaign metrics
type DailyMetrics struct {
	Date              time.Time `json:"date"`
	MessagesSent      int       `json:"messages_sent"`
	MessagesDelivered int       `json:"messages_delivered"`
	MessagesRead      int       `json:"messages_read"`
	MessagesReplied   int       `json:"messages_replied"`
	MessagesClicked   int       `json:"messages_clicked"`
	MessagesFailed    int       `json:"messages_failed"`
	Conversions       int       `json:"conversions"`
	Revenue           float64   `json:"revenue"`
	DeliveryRate      float64   `json:"delivery_rate"`
	OpenRate          float64   `json:"open_rate"`
	ClickRate         float64   `json:"click_rate"`
	ResponseRate      float64   `json:"response_rate"`
	ConversionRate    float64   `json:"conversion_rate"`
}

// HourlyMetrics represents hourly campaign metrics
type HourlyMetrics struct {
	Hour              int     `json:"hour"` // 0-23
	MessagesSent      int     `json:"messages_sent"`
	MessagesDelivered int     `json:"messages_delivered"`
	MessagesRead      int     `json:"messages_read"`
	ResponseRate      float64 `json:"response_rate"`
	EngagementRate    float64 `json:"engagement_rate"`
}

// SegmentMetrics represents metrics for a specific segment
type SegmentMetrics struct {
	SegmentID         uuid.UUID       `json:"segment_id"`
	SegmentName       string          `json:"segment_name"`
	ContactCount      int             `json:"contact_count"`
	Summary           CampaignSummary `json:"summary"`
	PerformanceRank   int             `json:"performance_rank"`
	RevenueGenerated  float64         `json:"revenue_generated"`
}

// TrendDataPoint represents a data point in campaign trends
type TrendDataPoint struct {
	Timestamp         time.Time `json:"timestamp"`
	MessagesSent      int       `json:"messages_sent"`
	MessagesDelivered int       `json:"messages_delivered"`
	MessagesRead      int       `json:"messages_read"`
	MessagesReplied   int       `json:"messages_replied"`
	MessagesClicked   int       `json:"messages_clicked"`
	DeliveryRate      float64   `json:"delivery_rate"`
	OpenRate          float64   `json:"open_rate"`
	ResponseRate      float64   `json:"response_rate"`
	ClickRate         float64   `json:"click_rate"`
	ConversionRate    float64   `json:"conversion_rate"`
	Revenue           float64   `json:"revenue"`
	CumulativeRevenue float64   `json:"cumulative_revenue"`
}

// EngagementFunnel represents the engagement funnel
type EngagementFunnel struct {
	Sent      FunnelStep `json:"sent"`
	Delivered FunnelStep `json:"delivered"`
	Read      FunnelStep `json:"read"`
	Clicked   FunnelStep `json:"clicked"`
	Replied   FunnelStep `json:"replied"`
	Converted FunnelStep `json:"converted"`
}

// FunnelStep represents a step in the engagement funnel
type FunnelStep struct {
	Count       int     `json:"count"`
	Rate        float64 `json:"rate"`
	DropoffRate float64 `json:"dropoff_rate"`
	DropoffCount int    `json:"dropoff_count"`
}

// CampaignPerformance represents detailed performance metrics
type CampaignPerformance struct {
	CampaignID          uuid.UUID            `json:"campaign_id"`
	DateRange           DateRange            `json:"date_range"`
	OverallPerformance  PerformanceMetrics   `json:"overall_performance"`
	SegmentPerformance  []SegmentPerformance `json:"segment_performance"`
	TimeBasedPerformance []TimePerformance   `json:"time_based_performance"`
	ContentPerformance  ContentPerformance   `json:"content_performance"`
	ChannelPerformance  map[string]PerformanceMetrics `json:"channel_performance"`
	BenchmarkComparison BenchmarkComparison  `json:"benchmark_comparison"`
}

// PerformanceMetrics represents performance metrics
type PerformanceMetrics struct {
	DeliveryRate        float64 `json:"delivery_rate"`
	OpenRate            float64 `json:"open_rate"`
	ClickRate           float64 `json:"click_rate"`
	ResponseRate        float64 `json:"response_rate"`
	ConversionRate      float64 `json:"conversion_rate"`
	UnsubscribeRate     float64 `json:"unsubscribe_rate"`
	EngagementRate      float64 `json:"engagement_rate"`
	RevenuePerMessage   float64 `json:"revenue_per_message"`
	CostPerAcquisition  float64 `json:"cost_per_acquisition"`
	ReturnOnInvestment  float64 `json:"return_on_investment"`
}

// SegmentPerformance represents performance metrics for a segment
type SegmentPerformance struct {
	SegmentID   uuid.UUID          `json:"segment_id"`
	SegmentName string             `json:"segment_name"`
	Metrics     PerformanceMetrics `json:"metrics"`
	Rank        int                `json:"rank"`
	Insights    []string           `json:"insights"`
}

// TimePerformance represents performance metrics by time period
type TimePerformance struct {
	Period      string             `json:"period"` // "morning", "afternoon", "evening", "night"
	StartHour   int                `json:"start_hour"`
	EndHour     int                `json:"end_hour"`
	Metrics     PerformanceMetrics `json:"metrics"`
	MessageCount int               `json:"message_count"`
}

// ContentPerformance represents performance metrics for content
type ContentPerformance struct {
	MessageType     string             `json:"message_type"`
	TemplateID      *uuid.UUID         `json:"template_id,omitempty"`
	TemplateName    *string            `json:"template_name,omitempty"`
	Metrics         PerformanceMetrics `json:"metrics"`
	TopPerforming   bool               `json:"top_performing"`
	EngagementScore float64            `json:"engagement_score"`
}

// BenchmarkComparison represents comparison with benchmarks
type BenchmarkComparison struct {
	Industry    IndustryBenchmarks `json:"industry"`
	Tenant      TenantBenchmarks   `json:"tenant"`
	Historical  HistoricalBenchmarks `json:"historical"`
	Percentile  int                `json:"percentile"` // What percentile this campaign is in
	Insights    []string           `json:"insights"`
}

// Real-time Analytics

// RealTimeStats represents real-time campaign statistics
type RealTimeStats struct {
	CampaignID        uuid.UUID `json:"campaign_id"`
	CurrentStatus     string    `json:"current_status"`
	MessagesInQueue   int       `json:"messages_in_queue"`
	MessagesPerMinute float64   `json:"messages_per_minute"`
	CurrentHourSent   int       `json:"current_hour_sent"`
	CurrentHourDelivered int    `json:"current_hour_delivered"`
	CurrentHourFailed int       `json:"current_hour_failed"`
	LastMessageSentAt time.Time `json:"last_message_sent_at"`
	EstimatedCompletion *time.Time `json:"estimated_completion,omitempty"`
	ActiveContacts    int       `json:"active_contacts"`
	ErrorRate         float64   `json:"error_rate"`
	LastUpdated       time.Time `json:"last_updated"`
}

// LiveMessageStats represents live message statistics
type LiveMessageStats struct {
	CampaignID      uuid.UUID             `json:"campaign_id"`
	Duration        time.Duration         `json:"duration"`
	MessageEvents   []*MessageEvent       `json:"message_events"`
	EventSummary    map[string]int        `json:"event_summary"`
	TrendPoints     []*LiveTrendPoint     `json:"trend_points"`
	AverageLatency  time.Duration         `json:"average_latency"`
	SuccessRate     float64               `json:"success_rate"`
	GeneratedAt     time.Time             `json:"generated_at"`
}

// MessageEvent represents a message event
type MessageEvent struct {
	EventID     uuid.UUID `json:"event_id"`
	MessageID   string    `json:"message_id"`
	ContactID   uuid.UUID `json:"contact_id"`
	EventType   string    `json:"event_type"` // sent, delivered, read, clicked, replied, failed
	Timestamp   time.Time `json:"timestamp"`
	Latency     *time.Duration `json:"latency,omitempty"` // time from sent to this event
	ErrorReason *string   `json:"error_reason,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// LiveTrendPoint represents a live trend data point
type LiveTrendPoint struct {
	Timestamp   time.Time `json:"timestamp"`
	SentCount   int       `json:"sent_count"`
	DeliveredCount int    `json:"delivered_count"`
	FailedCount int       `json:"failed_count"`
	SuccessRate float64   `json:"success_rate"`
}

// Comparative Analytics

// CampaignComparison represents comparison between campaigns
type CampaignComparison struct {
	Campaigns   []CampaignComparisonItem `json:"campaigns"`
	Metrics     []string                 `json:"metrics"`
	BestPerforming CampaignComparisonItem `json:"best_performing"`
	Insights    []ComparisonInsight      `json:"insights"`
	GeneratedAt time.Time                `json:"generated_at"`
}

// CampaignComparisonItem represents a campaign in comparison
type CampaignComparisonItem struct {
	CampaignID   uuid.UUID          `json:"campaign_id"`
	CampaignName string             `json:"campaign_name"`
	CampaignType string             `json:"campaign_type"`
	Metrics      PerformanceMetrics `json:"metrics"`
	Ranking      map[string]int     `json:"ranking"` // metric name -> rank
	Score        float64            `json:"score"`
}

// ComparisonInsight represents an insight from campaign comparison
type ComparisonInsight struct {
	Type        string    `json:"type"` // "performance", "audience", "timing", "content"
	Metric      string    `json:"metric"`
	Message     string    `json:"message"`
	Confidence  float64   `json:"confidence"`
	ActionItems []string  `json:"action_items,omitempty"`
}

// IndustryBenchmarks represents industry benchmarks
type IndustryBenchmarks struct {
	Industry            string  `json:"industry"`
	SampleSize          int     `json:"sample_size"`
	AvgDeliveryRate     float64 `json:"avg_delivery_rate"`
	AvgOpenRate         float64 `json:"avg_open_rate"`
	AvgClickRate        float64 `json:"avg_click_rate"`
	AvgResponseRate     float64 `json:"avg_response_rate"`
	AvgConversionRate   float64 `json:"avg_conversion_rate"`
	AvgUnsubscribeRate  float64 `json:"avg_unsubscribe_rate"`
	TopPercentileThresholds PerformanceMetrics `json:"top_percentile_thresholds"`
	LastUpdated         time.Time `json:"last_updated"`
}

// TenantBenchmarks represents tenant historical benchmarks
type TenantBenchmarks struct {
	TenantID            uuid.UUID `json:"tenant_id"`
	DateRange           DateRange `json:"date_range"`
	CampaignCount       int       `json:"campaign_count"`
	AvgMetrics          PerformanceMetrics `json:"avg_metrics"`
	BestMetrics         PerformanceMetrics `json:"best_metrics"`
	TrendDirection      map[string]string  `json:"trend_direction"` // metric -> "up", "down", "stable"
	SeasonalPatterns    map[string]float64 `json:"seasonal_patterns"`
	LastUpdated         time.Time `json:"last_updated"`
}

// HistoricalBenchmarks represents historical benchmarks
type HistoricalBenchmarks struct {
	Period      string             `json:"period"` // "last_30_days", "last_quarter", "last_year"
	Metrics     PerformanceMetrics `json:"metrics"`
	Improvement map[string]float64 `json:"improvement"` // metric -> percentage improvement
}

// A/B Test Analytics

// ABTestResults represents A/B test results
type ABTestResults struct {
	TestID              uuid.UUID               `json:"test_id"`
	CampaignID          uuid.UUID               `json:"campaign_id"`
	Status              string                  `json:"status"`
	StartDate           time.Time               `json:"start_date"`
	EndDate             *time.Time              `json:"end_date,omitempty"`
	Winner              *string                 `json:"winner,omitempty"`
	WinnerConfidence    float64                 `json:"winner_confidence"`
	GroupResults        []ABTestGroupResults    `json:"group_results"`
	StatisticalTest     StatisticalTestResult   `json:"statistical_test"`
	Insights            []ABTestInsight         `json:"insights"`
	Recommendations     []string                `json:"recommendations"`
	GeneratedAt         time.Time               `json:"generated_at"`
}

// ABTestGroupResults represents results for a test group
type ABTestGroupResults struct {
	GroupName        string             `json:"group_name"`
	GroupSize        int                `json:"group_size"`
	Metrics          PerformanceMetrics `json:"metrics"`
	IsWinner         bool               `json:"is_winner"`
	PerformanceScore float64            `json:"performance_score"`
	SignificanceLevel float64           `json:"significance_level"`
	ConfidenceInterval ConfidenceInterval `json:"confidence_interval"`
}

// StatisticalTestResult represents statistical test results
type StatisticalTestResult struct {
	TestType        string  `json:"test_type"` // "t_test", "chi_squared", "z_test"
	PValue          float64 `json:"p_value"`
	TestStatistic   float64 `json:"test_statistic"`
	DegreesOfFreedom *int   `json:"degrees_of_freedom,omitempty"`
	IsSignificant   bool    `json:"is_significant"`
	AlphaLevel      float64 `json:"alpha_level"`
	Power           float64 `json:"power"`
	EffectSize      float64 `json:"effect_size"`
}

// StatisticalSignificance represents statistical significance analysis
type StatisticalSignificance struct {
	TestID          uuid.UUID `json:"test_id"`
	IsSignificant   bool      `json:"is_significant"`
	PValue          float64   `json:"p_value"`
	ConfidenceLevel float64   `json:"confidence_level"`
	SampleSizeAdequate bool   `json:"sample_size_adequate"`
	MinimumSampleSize int    `json:"minimum_sample_size"`
	RecommendedAction string `json:"recommended_action"`
	PowerAnalysis     PowerAnalysis `json:"power_analysis"`
}

// PowerAnalysis represents power analysis results
type PowerAnalysis struct {
	CurrentPower      float64 `json:"current_power"`
	DesiredPower      float64 `json:"desired_power"`
	DetectableEffect  float64 `json:"detectable_effect"`
	RecommendedSize   int     `json:"recommended_size"`
	TimeToSignificance *time.Duration `json:"time_to_significance,omitempty"`
}

// ConfidenceInterval represents a confidence interval
type ConfidenceInterval struct {
	LowerBound float64 `json:"lower_bound"`
	UpperBound float64 `json:"upper_bound"`
	Level      float64 `json:"level"` // e.g., 0.95 for 95%
}

// ABTestInsight represents an A/B test insight
type ABTestInsight struct {
	Type        string  `json:"type"` // "performance", "audience", "statistical"
	Message     string  `json:"message"`
	Metric      string  `json:"metric"`
	Difference  float64 `json:"difference"`
	Significance string `json:"significance"` // "high", "medium", "low", "none"
}

// Revenue Analytics

// RevenueAnalytics represents revenue analytics
type RevenueAnalytics struct {
	CampaignID         uuid.UUID           `json:"campaign_id"`
	DateRange          DateRange           `json:"date_range"`
	TotalRevenue       float64             `json:"total_revenue"`
	RevenuePerMessage  float64             `json:"revenue_per_message"`
	RevenuePerContact  float64             `json:"revenue_per_contact"`
	ConversionRevenue  map[string]float64  `json:"conversion_revenue"` // conversion type -> revenue
	DailyRevenue       []*DailyRevenue     `json:"daily_revenue"`
	RevenueBySegment   []*SegmentRevenue   `json:"revenue_by_segment"`
	RevenueByChannel   map[string]float64  `json:"revenue_by_channel"`
	CostAnalysis       CostAnalysis        `json:"cost_analysis"`
	ROIAnalysis        ROIAnalysis         `json:"roi_analysis"`
	RevenueAttribution AttributionAnalysis `json:"revenue_attribution"`
}

// DailyRevenue represents daily revenue metrics
type DailyRevenue struct {
	Date        time.Time `json:"date"`
	Revenue     float64   `json:"revenue"`
	Conversions int       `json:"conversions"`
	Orders      int       `json:"orders"`
	AvgOrderValue float64 `json:"avg_order_value"`
}

// SegmentRevenue represents revenue by segment
type SegmentRevenue struct {
	SegmentID   uuid.UUID `json:"segment_id"`
	SegmentName string    `json:"segment_name"`
	Revenue     float64   `json:"revenue"`
	Conversions int       `json:"conversions"`
	ContactCount int      `json:"contact_count"`
	RevenuePerContact float64 `json:"revenue_per_contact"`
	ConversionRate float64 `json:"conversion_rate"`
}

// CostAnalysis represents cost analysis
type CostAnalysis struct {
	TotalCost           float64 `json:"total_cost"`
	CostPerMessage      float64 `json:"cost_per_message"`
	CostPerConversion   float64 `json:"cost_per_conversion"`
	CostPerAcquisition  float64 `json:"cost_per_acquisition"`
	CostBreakdown       map[string]float64 `json:"cost_breakdown"`
}

// ROIAnalysis represents ROI analysis
type ROIAnalysis struct {
	ROI                 float64 `json:"roi"`
	ROAS                float64 `json:"roas"` // Return on Ad Spend
	PaybackPeriod       int     `json:"payback_period_days"`
	BreakevenPoint      int     `json:"breakeven_messages"`
	LifetimeValue       float64 `json:"customer_lifetime_value"`
	ProfitMargin        float64 `json:"profit_margin"`
}

// Attribution Analytics

// AttributionTouchpoint represents an attribution touchpoint
type AttributionTouchpoint struct {
	TouchpointID   uuid.UUID              `json:"touchpoint_id"`
	ContactID      uuid.UUID              `json:"contact_id"`
	CampaignID     *uuid.UUID             `json:"campaign_id,omitempty"`
	MessageID      *string                `json:"message_id,omitempty"`
	Channel        string                 `json:"channel"`
	TouchpointType string                 `json:"touchpoint_type"`
	Timestamp      time.Time              `json:"timestamp"`
	Value          float64                `json:"value"`
	Position       int                    `json:"position"` // position in attribution path
	Metadata       map[string]interface{} `json:"metadata"`
}

// AttributionAnalysis represents attribution analysis
type AttributionAnalysis struct {
	CampaignID        uuid.UUID                  `json:"campaign_id"`
	DateRange         DateRange                  `json:"date_range"`
	AttributionModel  string                     `json:"attribution_model"` // "first_click", "last_click", "linear", "time_decay"
	TotalConversions  int                        `json:"total_conversions"`
	TotalRevenue      float64                    `json:"total_revenue"`
	AttributedRevenue float64                    `json:"attributed_revenue"`
	AttributionPaths  []*AttributionPath         `json:"attribution_paths"`
	ChannelAttribution map[string]ChannelAttribution `json:"channel_attribution"`
	TimeToConversion  TimeToConversion           `json:"time_to_conversion"`
	TouchpointAnalysis TouchpointAnalysis        `json:"touchpoint_analysis"`
}

// AttributionPath represents an attribution path
type AttributionPath struct {
	PathID        uuid.UUID             `json:"path_id"`
	ContactID     uuid.UUID             `json:"contact_id"`
	Touchpoints   []*AttributionTouchpoint `json:"touchpoints"`
	ConversionValue float64             `json:"conversion_value"`
	PathLength    int                   `json:"path_length"`
	TimeToConvert time.Duration         `json:"time_to_convert"`
	FirstTouch    time.Time             `json:"first_touch"`
	LastTouch     time.Time             `json:"last_touch"`
	ConversionTime time.Time            `json:"conversion_time"`
}

// ChannelAttribution represents attribution by channel
type ChannelAttribution struct {
	Channel           string  `json:"channel"`
	Conversions       int     `json:"conversions"`
	Revenue           float64 `json:"revenue"`
	AttributedRevenue float64 `json:"attributed_revenue"`
	AttributionRate   float64 `json:"attribution_rate"`
	AssistConversions int     `json:"assist_conversions"`
	DirectConversions int     `json:"direct_conversions"`
}

// TimeToConversion represents time to conversion analysis
type TimeToConversion struct {
	AvgTimeToConvert time.Duration          `json:"avg_time_to_convert"`
	MedianTimeToConvert time.Duration       `json:"median_time_to_convert"`
	ConversionTimeDistribution map[string]int `json:"conversion_time_distribution"`
	FastestConversion time.Duration         `json:"fastest_conversion"`
	SlowestConversion time.Duration         `json:"slowest_conversion"`
}

// TouchpointAnalysis represents touchpoint analysis
type TouchpointAnalysis struct {
	AvgTouchpoints    float64               `json:"avg_touchpoints"`
	TouchpointDistribution map[int]int      `json:"touchpoint_distribution"`
	MostCommonPaths   []CommonPath          `json:"most_common_paths"`
	HighValuePaths    []CommonPath          `json:"high_value_paths"`
}

// CommonPath represents a common attribution path
type CommonPath struct {
	Path        []string `json:"path"`
	Frequency   int      `json:"frequency"`
	AvgRevenue  float64  `json:"avg_revenue"`
	Percentage  float64  `json:"percentage"`
}

// Contact Engagement

// ContactEngagement represents contact engagement metrics
type ContactEngagement struct {
	ContactID         uuid.UUID                  `json:"contact_id"`
	TenantID          uuid.UUID                  `json:"tenant_id"`
	DateRange         DateRange                  `json:"date_range"`
	EngagementScore   float64                    `json:"engagement_score"`
	EngagementLevel   string                     `json:"engagement_level"` // "high", "medium", "low"
	CampaignHistory   []*ContactCampaignHistory  `json:"campaign_history"`
	InteractionSummary InteractionSummary        `json:"interaction_summary"`
	PreferenceProfile PreferenceProfile          `json:"preference_profile"`
	EngagementTrends  []*EngagementTrendPoint    `json:"engagement_trends"`
	Predictions       ContactPredictions         `json:"predictions"`
}

// ContactCampaignHistory represents contact's campaign history
type ContactCampaignHistory struct {
	CampaignID      uuid.UUID `json:"campaign_id"`
	CampaignName    string    `json:"campaign_name"`
	CampaignType    string    `json:"campaign_type"`
	ParticipatedAt  time.Time `json:"participated_at"`
	MessagesReceived int      `json:"messages_received"`
	MessagesOpened  int       `json:"messages_opened"`
	MessagesClicked int       `json:"messages_clicked"`
	MessagesReplied int       `json:"messages_replied"`
	Conversions     int       `json:"conversions"`
	Revenue         float64   `json:"revenue"`
	EngagementRate  float64   `json:"engagement_rate"`
}

// InteractionSummary represents interaction summary
type InteractionSummary struct {
	TotalInteractions int                    `json:"total_interactions"`
	InteractionTypes  map[string]int         `json:"interaction_types"`
	LastInteraction   time.Time              `json:"last_interaction"`
	AvgResponseTime   time.Duration          `json:"avg_response_time"`
	PreferredChannels []string               `json:"preferred_channels"`
	ActiveHours       map[int]int            `json:"active_hours"` // hour -> interaction count
	ActiveDays        map[string]int         `json:"active_days"`  // day name -> interaction count
}

// PreferenceProfile represents contact preference profile
type PreferenceProfile struct {
	PreferredMessageTypes []string           `json:"preferred_message_types"`
	PreferredTopics      []string            `json:"preferred_topics"`
	PreferredTiming      PreferredTiming     `json:"preferred_timing"`
	ContentPreferences   ContentPreferences  `json:"content_preferences"`
	CommunicationStyle   string              `json:"communication_style"`
	OptimizationScore    float64             `json:"optimization_score"`
}

// PreferredTiming represents preferred timing
type PreferredTiming struct {
	BestHours    []int    `json:"best_hours"`    // hours of day
	BestDays     []string `json:"best_days"`     // days of week
	TimeZone     string   `json:"time_zone"`
	Frequency    string   `json:"frequency"`     // "daily", "weekly", "monthly"
	AvoidTimes   []TimeWindow `json:"avoid_times"`
}

// TimeWindow represents a time window
type TimeWindow struct {
	StartHour int    `json:"start_hour"`
	EndHour   int    `json:"end_hour"`
	Days      []string `json:"days,omitempty"`
}

// ContentPreferences represents content preferences
type ContentPreferences struct {
	PreferredLength   string   `json:"preferred_length"`   // "short", "medium", "long"
	PreferredTone     string   `json:"preferred_tone"`     // "formal", "casual", "friendly"
	PreferredLanguage string   `json:"preferred_language"`
	Interests         []string `json:"interests"`
	Dislikes          []string `json:"dislikes"`
	MediaPreferences  []string `json:"media_preferences"`  // "text", "image", "video", "audio"
}

// EngagementTrendPoint represents an engagement trend point
type EngagementTrendPoint struct {
	Date            time.Time `json:"date"`
	EngagementScore float64   `json:"engagement_score"`
	InteractionCount int      `json:"interaction_count"`
	ResponseRate    float64   `json:"response_rate"`
	SentimentScore  float64   `json:"sentiment_score"`
}

// ContactPredictions represents contact predictions
type ContactPredictions struct {
	ChurnRisk         ChurnPrediction    `json:"churn_risk"`
	ConversionLikelihood float64         `json:"conversion_likelihood"`
	OptimalSendTime   time.Time          `json:"optimal_send_time"`
	EngagementForecast []EngagementForecast `json:"engagement_forecast"`
	LifetimeValue     float64            `json:"predicted_lifetime_value"`
	NextBestAction    string             `json:"next_best_action"`
}

// ChurnPrediction represents churn prediction
type ChurnPrediction struct {
	Risk        float64   `json:"risk"`        // 0.0 to 1.0
	RiskLevel   string    `json:"risk_level"`  // "low", "medium", "high"
	Factors     []string  `json:"factors"`
	PredictedChurnDate time.Time `json:"predicted_churn_date,omitempty"`
	Confidence  float64   `json:"confidence"`
}

// EngagementForecast represents engagement forecast
type EngagementForecast struct {
	Date               time.Time `json:"date"`
	PredictedEngagement float64  `json:"predicted_engagement"`
	Confidence         float64   `json:"confidence"`
	Factors            []string  `json:"factors"`
}

// Export and Reporting

// ExportResult represents export result
type ExportResult struct {
	ExportID    uuid.UUID `json:"export_id"`
	Format      string    `json:"format"`
	FileURL     string    `json:"file_url"`
	FileName    string    `json:"file_name"`
	FileSize    int64     `json:"file_size"`
	RecordCount int       `json:"record_count"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`
	Status      string    `json:"status"`
}

// ReportConfig represents report configuration
type ReportConfig struct {
	Name         string            `json:"name"`
	Description  string            `json:"description"`
	ReportType   string            `json:"report_type"`
	Format       string            `json:"format"`
	Schedule     string            `json:"schedule"` // cron expression
	Recipients   []string          `json:"recipients"`
	CampaignIDs  []uuid.UUID       `json:"campaign_ids,omitempty"`
	Filters      map[string]interface{} `json:"filters"`
	Metrics      []string          `json:"metrics"`
	IsActive     bool              `json:"is_active"`
}

// ScheduledReport represents a scheduled report
type ScheduledReport struct {
	ReportID     uuid.UUID    `json:"report_id"`
	TenantID     uuid.UUID    `json:"tenant_id"`
	Config       ReportConfig `json:"config"`
	LastRun      *time.Time   `json:"last_run,omitempty"`
	NextRun      time.Time    `json:"next_run"`
	RunCount     int          `json:"run_count"`
	Status       string       `json:"status"`
	CreatedAt    time.Time    `json:"created_at"`
}

// CampaignInsights represents campaign insights
type CampaignInsights struct {
	CampaignID   uuid.UUID         `json:"campaign_id"`
	GeneratedAt  time.Time         `json:"generated_at"`
	Insights     []Insight         `json:"insights"`
	Recommendations []Recommendation `json:"recommendations"`
	KeyFindings  []KeyFinding      `json:"key_findings"`
	Performance  InsightSummary    `json:"performance"`
	Opportunities []Opportunity    `json:"opportunities"`
	RiskFactors  []RiskFactor      `json:"risk_factors"`
}

// Insight represents an insight
type Insight struct {
	ID          uuid.UUID `json:"id"`
	Type        string    `json:"type"` // "performance", "audience", "timing", "content", "anomaly"
	Category    string    `json:"category"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Impact      string    `json:"impact"` // "high", "medium", "low"
	Confidence  float64   `json:"confidence"`
	Data        map[string]interface{} `json:"data"`
	Suggestions []string  `json:"suggestions"`
	CreatedAt   time.Time `json:"created_at"`
}

// Recommendation represents a recommendation
type Recommendation struct {
	ID          uuid.UUID `json:"id"`
	Type        string    `json:"type"`
	Priority    string    `json:"priority"` // "high", "medium", "low"
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Actions     []Action  `json:"actions"`
	ExpectedImpact string `json:"expected_impact"`
	Effort      string    `json:"effort"` // "low", "medium", "high"
	Category    string    `json:"category"`
}

// Action represents an action
type Action struct {
	Type        string                 `json:"type"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
	AutoApply   bool                   `json:"auto_apply"`
}

// KeyFinding represents a key finding
type KeyFinding struct {
	Finding     string  `json:"finding"`
	Metric      string  `json:"metric"`
	Value       float64 `json:"value"`
	Comparison  string  `json:"comparison"`
	Significance string `json:"significance"`
	Context     string  `json:"context"`
}

// InsightSummary represents insight summary
type InsightSummary struct {
	OverallScore    float64            `json:"overall_score"`
	StrengthAreas   []string           `json:"strength_areas"`
	ImprovementAreas []string          `json:"improvement_areas"`
	Benchmarks      map[string]float64 `json:"benchmarks"`
	Trends          map[string]string  `json:"trends"`
}

// Opportunity represents an opportunity
type Opportunity struct {
	Type            string  `json:"type"`
	Description     string  `json:"description"`
	PotentialImpact float64 `json:"potential_impact"`
	Feasibility     string  `json:"feasibility"`
	TimeFrame       string  `json:"time_frame"`
	Requirements    []string `json:"requirements"`
}

// RiskFactor represents a risk factor
type RiskFactor struct {
	Type        string  `json:"type"`
	Description string  `json:"description"`
	Severity    string  `json:"severity"`
	Probability float64 `json:"probability"`
	Impact      string  `json:"impact"`
	Mitigation  []string `json:"mitigation"`
}

// Common Structures

// DateRange represents a date range
type DateRange struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}