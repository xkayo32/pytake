package analytics

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// AnalyticsCollector defines the interface for collecting flow analytics
type AnalyticsCollector interface {
	// Flow Events
	RecordFlowStarted(ctx context.Context, tenantID, flowID, executionID uuid.UUID, triggerType string) error
	RecordFlowCompleted(ctx context.Context, tenantID, flowID, executionID uuid.UUID, duration time.Duration, success bool) error
	RecordFlowFailed(ctx context.Context, tenantID, flowID, executionID uuid.UUID, duration time.Duration, errorMessage string) error
	
	// Node Events
	RecordNodeStarted(ctx context.Context, tenantID, flowID, executionID uuid.UUID, nodeID, nodeType string) error
	RecordNodeCompleted(ctx context.Context, tenantID, flowID, executionID uuid.UUID, nodeID, nodeType string, duration time.Duration, success bool) error
	RecordNodeFailed(ctx context.Context, tenantID, flowID, executionID uuid.UUID, nodeID, nodeType string, duration time.Duration, errorMessage string) error
	
	// Message Events
	RecordMessageSent(ctx context.Context, tenantID, flowID, executionID uuid.UUID, nodeID, messageType string, success bool) error
	RecordMessageReceived(ctx context.Context, tenantID uuid.UUID, messageType string, triggerCount int) error
	
	// Trigger Events
	RecordTriggerMatched(ctx context.Context, tenantID, triggerID, flowID uuid.UUID, eventType string) error
	RecordTriggerExecuted(ctx context.Context, tenantID, triggerID, flowID, executionID uuid.UUID, success bool, duration time.Duration) error
	
	// User Journey Events
	RecordUserJourneyStep(ctx context.Context, tenantID, contactID, flowID, executionID uuid.UUID, step string, metadata map[string]interface{}) error
	RecordUserJourneyCompleted(ctx context.Context, tenantID, contactID, flowID, executionID uuid.UUID, success bool, totalSteps int, duration time.Duration) error
}

// AnalyticsReporter defines the interface for generating analytics reports
type AnalyticsReporter interface {
	// Flow Reports
	GetFlowAnalytics(ctx context.Context, tenantID uuid.UUID, filter *FlowAnalyticsFilter) (*FlowAnalyticsReport, error)
	GetFlowPerformance(ctx context.Context, tenantID uuid.UUID, flowIDs []uuid.UUID, dateRange *DateRange) ([]*FlowPerformanceData, error)
	GetFlowTrends(ctx context.Context, tenantID uuid.UUID, flowIDs []uuid.UUID, dateRange *DateRange, granularity string) (*FlowTrendsReport, error)
	
	// Node Reports
	GetNodeAnalytics(ctx context.Context, tenantID uuid.UUID, flowID uuid.UUID, dateRange *DateRange) ([]*NodeAnalyticsData, error)
	GetNodePerformance(ctx context.Context, tenantID uuid.UUID, nodeTypes []string, dateRange *DateRange) ([]*NodePerformanceData, error)
	
	// User Journey Reports
	GetUserJourneyAnalytics(ctx context.Context, tenantID uuid.UUID, filter *UserJourneyFilter) (*UserJourneyReport, error)
	GetConversionFunnels(ctx context.Context, tenantID uuid.UUID, flowIDs []uuid.UUID, dateRange *DateRange) ([]*ConversionFunnel, error)
	
	// Trigger Reports
	GetTriggerAnalytics(ctx context.Context, tenantID uuid.UUID, filter *TriggerAnalyticsFilter) (*TriggerAnalyticsReport, error)
	GetTriggerPerformance(ctx context.Context, tenantID uuid.UUID, triggerIDs []uuid.UUID, dateRange *DateRange) ([]*TriggerPerformanceData, error)
	
	// Dashboard Reports
	GetDashboardSummary(ctx context.Context, tenantID uuid.UUID, dateRange *DateRange) (*DashboardSummary, error)
	GetRealTimeMetrics(ctx context.Context, tenantID uuid.UUID) (*RealTimeMetrics, error)
}

// AnalyticsAggregator defines the interface for aggregating analytics data
type AnalyticsAggregator interface {
	// Aggregate daily data
	AggregateDailyData(ctx context.Context, date time.Time) error
	AggregateWeeklyData(ctx context.Context, weekStart time.Time) error
	AggregateMonthlyData(ctx context.Context, month time.Time) error
	
	// Clean old data
	CleanOldRawData(ctx context.Context, retentionDays int) error
	CleanOldAggregatedData(ctx context.Context, retentionMonths int) error
}

// Data structures

// DateRange represents a date range for analytics queries
type DateRange struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}

// FlowAnalyticsFilter represents filters for flow analytics
type FlowAnalyticsFilter struct {
	FlowIDs     []uuid.UUID `json:"flow_ids,omitempty"`
	DateRange   *DateRange  `json:"date_range,omitempty"`
	TriggerType *string     `json:"trigger_type,omitempty"`
	Status      *string     `json:"status,omitempty"`
	Granularity string      `json:"granularity"` // hour, day, week, month
}

// FlowAnalyticsReport represents aggregated flow analytics data
type FlowAnalyticsReport struct {
	TenantID  uuid.UUID            `json:"tenant_id"`
	Period    string               `json:"period"`
	Summary   FlowAnalyticsSummary `json:"summary"`
	Flows     []*FlowAnalyticsData `json:"flows"`
	TimeSeries []*TimeSeriesPoint  `json:"time_series"`
}

// FlowAnalyticsSummary represents summary statistics
type FlowAnalyticsSummary struct {
	TotalExecutions      int     `json:"total_executions"`
	SuccessfulExecutions int     `json:"successful_executions"`
	FailedExecutions     int     `json:"failed_executions"`
	SuccessRate          float64 `json:"success_rate"`
	AverageExecutionTime float64 `json:"average_execution_time_ms"`
	AverageDuration      float64 `json:"average_duration_ms"`
	TotalMessages        int     `json:"total_messages"`
	UniqueUsers          int     `json:"unique_users"`
}

// FlowAnalyticsData represents analytics data for a specific flow
type FlowAnalyticsData struct {
	FlowID               uuid.UUID `json:"flow_id"`
	FlowName             string    `json:"flow_name"`
	TotalExecutions      int       `json:"total_executions"`
	SuccessfulExecutions int       `json:"successful_executions"`
	FailedExecutions     int       `json:"failed_executions"`
	SuccessRate          float64   `json:"success_rate"`
	AverageExecutionTime float64   `json:"average_execution_time_ms"`
	TotalMessages        int       `json:"total_messages"`
	UniqueUsers          int       `json:"unique_users"`
	LastExecuted         *time.Time `json:"last_executed,omitempty"`
}

// FlowPerformanceData represents performance metrics for a flow
type FlowPerformanceData struct {
	FlowID              uuid.UUID `json:"flow_id"`
	FlowName            string    `json:"flow_name"`
	Executions          int       `json:"executions"`
	SuccessRate         float64   `json:"success_rate"`
	AverageDuration     float64   `json:"average_duration_ms"`
	P95Duration         float64   `json:"p95_duration_ms"`
	P99Duration         float64   `json:"p99_duration_ms"`
	MessagesSent        int       `json:"messages_sent"`
	ErrorRate           float64   `json:"error_rate"`
	MostCommonError     *string   `json:"most_common_error,omitempty"`
	TrendDirection      string    `json:"trend_direction"` // up, down, stable
	TrendPercentage     float64   `json:"trend_percentage"`
}

// FlowTrendsReport represents trend analysis for flows
type FlowTrendsReport struct {
	TenantID    uuid.UUID           `json:"tenant_id"`
	Period      string              `json:"period"`
	Granularity string              `json:"granularity"`
	FlowTrends  []*FlowTrendData    `json:"flow_trends"`
	TimeSeries  []*TimeSeriesPoint  `json:"time_series"`
}

// FlowTrendData represents trend data for a flow
type FlowTrendData struct {
	FlowID         uuid.UUID          `json:"flow_id"`
	FlowName       string             `json:"flow_name"`
	TrendDirection string             `json:"trend_direction"`
	GrowthRate     float64            `json:"growth_rate"`
	DataPoints     []*TimeSeriesPoint `json:"data_points"`
}

// TimeSeriesPoint represents a data point in time series
type TimeSeriesPoint struct {
	Timestamp   time.Time `json:"timestamp"`
	Executions  int       `json:"executions"`
	Successes   int       `json:"successes"`
	Failures    int       `json:"failures"`
	Duration    float64   `json:"average_duration_ms"`
	Messages    int       `json:"messages"`
	UniqueUsers int       `json:"unique_users"`
}

// Node Analytics

// NodeAnalyticsData represents analytics data for flow nodes
type NodeAnalyticsData struct {
	NodeID              string    `json:"node_id"`
	NodeType            string    `json:"node_type"`
	NodeName            string    `json:"node_name"`
	TotalExecutions     int       `json:"total_executions"`
	SuccessfulExecutions int      `json:"successful_executions"`
	FailedExecutions    int       `json:"failed_executions"`
	SuccessRate         float64   `json:"success_rate"`
	AverageExecutionTime float64  `json:"average_execution_time_ms"`
	DropoffRate         float64   `json:"dropoff_rate"`
	ConversionRate      float64   `json:"conversion_rate"`
	LastExecuted        *time.Time `json:"last_executed,omitempty"`
}

// NodePerformanceData represents performance metrics for node types
type NodePerformanceData struct {
	NodeType            string  `json:"node_type"`
	TotalExecutions     int     `json:"total_executions"`
	AverageExecutionTime float64 `json:"average_execution_time_ms"`
	SuccessRate         float64 `json:"success_rate"`
	ErrorRate           float64 `json:"error_rate"`
	MostCommonError     *string `json:"most_common_error,omitempty"`
}

// User Journey Analytics

// UserJourneyFilter represents filters for user journey analytics
type UserJourneyFilter struct {
	ContactIDs  []uuid.UUID `json:"contact_ids,omitempty"`
	FlowIDs     []uuid.UUID `json:"flow_ids,omitempty"`
	DateRange   *DateRange  `json:"date_range,omitempty"`
	Completed   *bool       `json:"completed,omitempty"`
}

// UserJourneyReport represents user journey analytics
type UserJourneyReport struct {
	TenantID        uuid.UUID              `json:"tenant_id"`
	Period          string                 `json:"period"`
	Summary         UserJourneySummary     `json:"summary"`
	JourneySteps    []*JourneyStepData     `json:"journey_steps"`
	ConversionFunnel []*ConversionStepData `json:"conversion_funnel"`
	DropoffPoints   []*DropoffPointData    `json:"dropoff_points"`
}

// UserJourneySummary represents user journey summary statistics
type UserJourneySummary struct {
	TotalJourneys        int     `json:"total_journeys"`
	CompletedJourneys    int     `json:"completed_journeys"`
	AbandonedJourneys    int     `json:"abandoned_journeys"`
	CompletionRate       float64 `json:"completion_rate"`
	AverageJourneyTime   float64 `json:"average_journey_time_ms"`
	AverageSteps         float64 `json:"average_steps"`
	UniqueUsers          int     `json:"unique_users"`
	ReturningUsers       int     `json:"returning_users"`
}

// JourneyStepData represents data for a journey step
type JourneyStepData struct {
	StepName        string  `json:"step_name"`
	StepOrder       int     `json:"step_order"`
	Entries         int     `json:"entries"`
	Completions     int     `json:"completions"`
	Dropoffs        int     `json:"dropoffs"`
	CompletionRate  float64 `json:"completion_rate"`
	DropoffRate     float64 `json:"dropoff_rate"`
	AverageTime     float64 `json:"average_time_ms"`
}

// ConversionFunnel represents a conversion funnel for flows
type ConversionFunnel struct {
	FlowID    uuid.UUID              `json:"flow_id"`
	FlowName  string                 `json:"flow_name"`
	Steps     []*ConversionStepData  `json:"steps"`
	OverallRate float64              `json:"overall_conversion_rate"`
}

// ConversionStepData represents data for a conversion step
type ConversionStepData struct {
	StepName        string  `json:"step_name"`
	StepOrder       int     `json:"step_order"`
	Entries         int     `json:"entries"`
	Conversions     int     `json:"conversions"`
	ConversionRate  float64 `json:"conversion_rate"`
}

// DropoffPointData represents data for dropoff points
type DropoffPointData struct {
	NodeID      string  `json:"node_id"`
	NodeType    string  `json:"node_type"`
	NodeName    string  `json:"node_name"`
	Entries     int     `json:"entries"`
	Dropoffs    int     `json:"dropoffs"`
	DropoffRate float64 `json:"dropoff_rate"`
}

// Trigger Analytics

// TriggerAnalyticsFilter represents filters for trigger analytics
type TriggerAnalyticsFilter struct {
	TriggerIDs  []uuid.UUID `json:"trigger_ids,omitempty"`
	FlowIDs     []uuid.UUID `json:"flow_ids,omitempty"`
	TriggerType *string     `json:"trigger_type,omitempty"`
	DateRange   *DateRange  `json:"date_range,omitempty"`
	Granularity string      `json:"granularity"`
}

// TriggerAnalyticsReport represents trigger analytics data
type TriggerAnalyticsReport struct {
	TenantID   uuid.UUID               `json:"tenant_id"`
	Period     string                  `json:"period"`
	Summary    TriggerAnalyticsSummary `json:"summary"`
	Triggers   []*TriggerAnalyticsData `json:"triggers"`
	TimeSeries []*TimeSeriesPoint      `json:"time_series"`
}

// TriggerAnalyticsSummary represents trigger summary statistics
type TriggerAnalyticsSummary struct {
	TotalEvents          int     `json:"total_events"`
	MatchedEvents        int     `json:"matched_events"`
	TriggeredExecutions  int     `json:"triggered_executions"`
	MatchRate            float64 `json:"match_rate"`
	ExecutionSuccessRate float64 `json:"execution_success_rate"`
	AverageProcessTime   float64 `json:"average_process_time_ms"`
}

// TriggerAnalyticsData represents analytics data for a specific trigger
type TriggerAnalyticsData struct {
	TriggerID           uuid.UUID `json:"trigger_id"`
	TriggerName         string    `json:"trigger_name"`
	TriggerType         string    `json:"trigger_type"`
	FlowID              uuid.UUID `json:"flow_id"`
	TotalEvents         int       `json:"total_events"`
	MatchedEvents       int       `json:"matched_events"`
	TriggeredExecutions int       `json:"triggered_executions"`
	MatchRate           float64   `json:"match_rate"`
	ExecutionSuccessRate float64  `json:"execution_success_rate"`
	AverageProcessTime  float64   `json:"average_process_time_ms"`
	LastTriggered       *time.Time `json:"last_triggered,omitempty"`
}

// TriggerPerformanceData represents performance metrics for triggers
type TriggerPerformanceData struct {
	TriggerID           uuid.UUID `json:"trigger_id"`
	TriggerName         string    `json:"trigger_name"`
	TriggerType         string    `json:"trigger_type"`
	EventsProcessed     int       `json:"events_processed"`
	MatchRate           float64   `json:"match_rate"`
	ExecutionSuccessRate float64  `json:"execution_success_rate"`
	AverageProcessTime  float64   `json:"average_process_time_ms"`
	ErrorRate           float64   `json:"error_rate"`
	TrendDirection      string    `json:"trend_direction"`
}

// Dashboard Analytics

// DashboardSummary represents dashboard summary metrics
type DashboardSummary struct {
	TenantID            uuid.UUID              `json:"tenant_id"`
	Period              string                 `json:"period"`
	FlowMetrics         FlowDashboardMetrics   `json:"flow_metrics"`
	MessageMetrics      MessageDashboardMetrics `json:"message_metrics"`
	UserMetrics         UserDashboardMetrics   `json:"user_metrics"`
	TriggerMetrics      TriggerDashboardMetrics `json:"trigger_metrics"`
	TopFlows            []*FlowPerformanceData `json:"top_flows"`
	RecentActivity      []*ActivityData        `json:"recent_activity"`
	Alerts              []*AlertData           `json:"alerts"`
}

// FlowDashboardMetrics represents flow metrics for dashboard
type FlowDashboardMetrics struct {
	TotalFlows          int     `json:"total_flows"`
	ActiveFlows         int     `json:"active_flows"`
	TotalExecutions     int     `json:"total_executions"`
	SuccessfulExecutions int    `json:"successful_executions"`
	FailedExecutions    int     `json:"failed_executions"`
	SuccessRate         float64 `json:"success_rate"`
	AverageExecutionTime float64 `json:"average_execution_time_ms"`
}

// MessageDashboardMetrics represents message metrics for dashboard
type MessageDashboardMetrics struct {
	MessagesSent        int     `json:"messages_sent"`
	MessagesReceived    int     `json:"messages_received"`
	MessageDeliveryRate float64 `json:"message_delivery_rate"`
	ResponseRate        float64 `json:"response_rate"`
	AverageResponseTime float64 `json:"average_response_time_ms"`
}

// UserDashboardMetrics represents user metrics for dashboard
type UserDashboardMetrics struct {
	ActiveUsers         int     `json:"active_users"`
	NewUsers            int     `json:"new_users"`
	ReturningUsers      int     `json:"returning_users"`
	AverageSessionTime  float64 `json:"average_session_time_ms"`
	EngagementRate      float64 `json:"engagement_rate"`
}

// TriggerDashboardMetrics represents trigger metrics for dashboard
type TriggerDashboardMetrics struct {
	ActiveTriggers      int     `json:"active_triggers"`
	TotalEvents         int     `json:"total_events"`
	MatchedEvents       int     `json:"matched_events"`
	MatchRate           float64 `json:"match_rate"`
	AverageProcessTime  float64 `json:"average_process_time_ms"`
}

// RealTimeMetrics represents real-time metrics
type RealTimeMetrics struct {
	TenantID            uuid.UUID              `json:"tenant_id"`
	Timestamp           time.Time              `json:"timestamp"`
	ActiveExecutions    int                    `json:"active_executions"`
	ExecutionsPerMinute int                    `json:"executions_per_minute"`
	MessagesPerMinute   int                    `json:"messages_per_minute"`
	EventsPerMinute     int                    `json:"events_per_minute"`
	ErrorRate           float64                `json:"error_rate"`
	SystemHealth        map[string]interface{} `json:"system_health"`
}

// ActivityData represents recent activity data
type ActivityData struct {
	Type        string                 `json:"type"`
	Description string                 `json:"description"`
	Data        map[string]interface{} `json:"data"`
	Timestamp   time.Time              `json:"timestamp"`
}

// AlertData represents alert data
type AlertData struct {
	ID          uuid.UUID `json:"id"`
	Type        string    `json:"type"`
	Severity    string    `json:"severity"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Data        map[string]interface{} `json:"data"`
	CreatedAt   time.Time `json:"created_at"`
	Resolved    bool      `json:"resolved"`
}