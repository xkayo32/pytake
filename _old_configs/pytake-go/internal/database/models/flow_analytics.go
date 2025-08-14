package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// FlowAnalytics stores flow performance metrics
type FlowAnalytics struct {
	BaseModel
	TenantID uuid.UUID `gorm:"type:uuid;index;not null" json:"tenant_id"`
	FlowID   uuid.UUID `gorm:"type:uuid;not null;index" json:"flow_id"`

	// Time period for metrics
	Period      string    `gorm:"not null" json:"period"` // hourly, daily, weekly, monthly
	PeriodStart time.Time `gorm:"not null;index" json:"period_start"`
	PeriodEnd   time.Time `gorm:"not null" json:"period_end"`

	// Execution metrics
	TotalExecutions      int     `gorm:"default:0" json:"total_executions"`
	SuccessfulExecutions int     `gorm:"default:0" json:"successful_executions"`
	FailedExecutions     int     `gorm:"default:0" json:"failed_executions"`
	AvgExecutionTime     float64 `gorm:"default:0" json:"avg_execution_time"` // in seconds

	// Node performance
	NodeMetrics JSON `gorm:"type:jsonb" json:"node_metrics"` // Performance per node

	// Conversion metrics
	ConversionRate float64        `gorm:"default:0" json:"conversion_rate"`
	DropOffNodes   pq.StringArray `gorm:"type:text[]" json:"drop_off_nodes"`

	// User engagement metrics
	UniqueUsers       int     `gorm:"default:0" json:"unique_users"`
	ReturnUsers       int     `gorm:"default:0" json:"return_users"`
	AvgResponseTime   float64 `gorm:"default:0" json:"avg_response_time"` // in seconds
	CompletionRate    float64 `gorm:"default:0" json:"completion_rate"`
	DropOffRate       float64 `gorm:"default:0" json:"drop_off_rate"`

	// Message metrics
	MessagesSent     int     `gorm:"default:0" json:"messages_sent"`
	MessagesReceived int     `gorm:"default:0" json:"messages_received"`
	AvgMessagesPerFlow float64 `gorm:"default:0" json:"avg_messages_per_flow"`

	// Error metrics
	ErrorRate        float64 `gorm:"default:0" json:"error_rate"`
	TimeoutRate      float64 `gorm:"default:0" json:"timeout_rate"`
	RetryRate        float64 `gorm:"default:0" json:"retry_rate"`

	// Relations
	Flow Flow `gorm:"foreignKey:FlowID" json:"flow,omitempty"`
}

// FlowNodeAnalytics stores performance metrics for individual flow nodes
type FlowNodeAnalytics struct {
	BaseModel
	TenantID uuid.UUID `gorm:"type:uuid;index;not null" json:"tenant_id"`
	FlowID   uuid.UUID `gorm:"type:uuid;not null;index" json:"flow_id"`
	NodeID   string    `gorm:"not null;index" json:"node_id"`
	NodeType string    `gorm:"not null" json:"node_type"`

	// Time period
	Period      string    `gorm:"not null" json:"period"`
	PeriodStart time.Time `gorm:"not null;index" json:"period_start"`
	PeriodEnd   time.Time `gorm:"not null" json:"period_end"`

	// Node execution metrics
	TotalExecutions int     `gorm:"default:0" json:"total_executions"`
	SuccessCount    int     `gorm:"default:0" json:"success_count"`
	FailureCount    int     `gorm:"default:0" json:"failure_count"`
	SkipCount       int     `gorm:"default:0" json:"skip_count"`
	RetryCount      int     `gorm:"default:0" json:"retry_count"`

	// Performance metrics
	AvgExecutionTime float64 `gorm:"default:0" json:"avg_execution_time"` // in milliseconds
	MinExecutionTime float64 `gorm:"default:0" json:"min_execution_time"`
	MaxExecutionTime float64 `gorm:"default:0" json:"max_execution_time"`

	// Success and error rates
	SuccessRate float64 `gorm:"default:0" json:"success_rate"`
	ErrorRate   float64 `gorm:"default:0" json:"error_rate"`
	RetryRate   float64 `gorm:"default:0" json:"retry_rate"`

	// User engagement for this node
	UniqueVisitors int `gorm:"default:0" json:"unique_visitors"`
	DropOffCount   int `gorm:"default:0" json:"drop_off_count"`

	// Node-specific metrics (stored as JSON for flexibility)
	CustomMetrics JSON `gorm:"type:jsonb" json:"custom_metrics"`

	// Relations
	Flow Flow `gorm:"foreignKey:FlowID" json:"flow,omitempty"`
}

// FlowUserJourney tracks user paths through flows
type FlowUserJourney struct {
	BaseModel
	TenantID    uuid.UUID  `gorm:"type:uuid;index;not null" json:"tenant_id"`
	ContactID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"contact_id"`
	FlowID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"flow_id"`
	ExecutionID uuid.UUID  `gorm:"type:uuid;not null;unique" json:"execution_id"`

	// Journey tracking
	StartNodeID    string         `gorm:"not null" json:"start_node_id"`
	EndNodeID      *string        `json:"end_node_id,omitempty"`
	Path           pq.StringArray `gorm:"type:text[]" json:"path"` // Array of node IDs visited
	CompletedNodes pq.StringArray `gorm:"type:text[]" json:"completed_nodes"`
	FailedNodes    pq.StringArray `gorm:"type:text[]" json:"failed_nodes"`

	// Journey metrics
	TotalNodes        int           `gorm:"default:0" json:"total_nodes"`
	CompletedSteps    int           `gorm:"default:0" json:"completed_steps"`
	TotalDuration     time.Duration `json:"total_duration"` // Total time spent in flow
	IsCompleted       bool          `gorm:"default:false" json:"is_completed"`
	CompletionRate    float64       `gorm:"default:0" json:"completion_rate"`

	// Journey data
	Variables JSON `gorm:"type:jsonb" json:"variables"` // Variables collected during journey
	Events    JSON `gorm:"type:jsonb" json:"events"`    // Important events during journey

	// Relations
	Flow      Flow            `gorm:"foreignKey:FlowID" json:"flow,omitempty"`
	Contact   Contact         `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	Execution FlowExecution   `gorm:"foreignKey:ExecutionID" json:"execution,omitempty"`
}

// FlowABTest stores A/B testing configurations and results
type FlowABTest struct {
	TenantModel
	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`

	// Test configuration
	FlowAID      uuid.UUID `gorm:"type:uuid;not null" json:"flow_a_id"`
	FlowBID      uuid.UUID `gorm:"type:uuid;not null" json:"flow_b_id"`
	TrafficSplit float64   `gorm:"default:0.5" json:"traffic_split"` // 0.5 means 50-50 split

	// Test status and duration
	Status    string     `gorm:"default:'draft'" json:"status"` // draft, running, completed, paused
	StartedAt *time.Time `json:"started_at,omitempty"`
	EndedAt   *time.Time `json:"ended_at,omitempty"`

	// Success metrics configuration
	SuccessMetric       string  `gorm:"not null" json:"success_metric"` // completion_rate, conversion_rate, engagement_time
	MinSampleSize       int     `gorm:"default:100" json:"min_sample_size"`
	StatisticalSignificance float64 `gorm:"default:0.95" json:"statistical_significance"`

	// Test results
	FlowAExecutions      int     `gorm:"default:0" json:"flow_a_executions"`
	FlowBExecutions      int     `gorm:"default:0" json:"flow_b_executions"`
	FlowASuccessRate     float64 `gorm:"default:0" json:"flow_a_success_rate"`
	FlowBSuccessRate     float64 `gorm:"default:0" json:"flow_b_success_rate"`
	WinningFlow          *string `json:"winning_flow,omitempty"` // "A" or "B"
	IsStatisticallySignificant bool `gorm:"default:false" json:"is_statistically_significant"`

	// Additional metrics
	ResultsData JSON `gorm:"type:jsonb" json:"results_data"`

	// Relations
	FlowA     Flow `gorm:"foreignKey:FlowAID" json:"flow_a,omitempty"`
	FlowB     Flow `gorm:"foreignKey:FlowBID" json:"flow_b,omitempty"`
	CreatedBy User `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
}

// FlowPerformanceAlert stores performance alerts and thresholds
type FlowPerformanceAlert struct {
	TenantModel
	FlowID uuid.UUID `gorm:"type:uuid;not null;index" json:"flow_id"`

	// Alert configuration
	Name        string  `gorm:"not null" json:"name"`
	Description string  `json:"description"`
	Metric      string  `gorm:"not null" json:"metric"` // error_rate, execution_time, completion_rate, etc.
	Operator    string  `gorm:"not null" json:"operator"` // greater_than, less_than, equals
	Threshold   float64 `gorm:"not null" json:"threshold"`
	TimeWindow  int     `gorm:"default:300" json:"time_window"` // in seconds

	// Alert status
	IsActive        bool       `gorm:"default:true" json:"is_active"`
	LastTriggeredAt *time.Time `json:"last_triggered_at,omitempty"`
	TriggerCount    int        `gorm:"default:0" json:"trigger_count"`

	// Notification settings
	NotificationChannels pq.StringArray `gorm:"type:text[]" json:"notification_channels"` // email, slack, webhook
	Recipients          pq.StringArray `gorm:"type:text[]" json:"recipients"`

	// Relations
	Flow      Flow `gorm:"foreignKey:FlowID" json:"flow,omitempty"`
	CreatedBy User `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
}

// FlowReport stores generated reports
type FlowReport struct {
	TenantModel
	Name        string  `gorm:"not null" json:"name"`
	Type        string  `gorm:"not null" json:"type"` // summary, detailed, comparison, performance
	FlowIDs     pq.StringArray `gorm:"type:text[]" json:"flow_ids"` // UUIDs as strings

	// Report configuration
	DateFrom    time.Time `gorm:"not null" json:"date_from"`
	DateTo      time.Time `gorm:"not null" json:"date_to"`
	Granularity string    `gorm:"default:'daily'" json:"granularity"` // hourly, daily, weekly, monthly

	// Report data
	ReportData   JSON   `gorm:"type:jsonb" json:"report_data"`
	ChartData    JSON   `gorm:"type:jsonb" json:"chart_data"`
	Summary      JSON   `gorm:"type:jsonb" json:"summary"`

	// Report metadata
	Status      string     `gorm:"default:'generating'" json:"status"` // generating, completed, failed
	GeneratedAt *time.Time `json:"generated_at,omitempty"`
	FileURL     *string    `json:"file_url,omitempty"` // For downloadable reports
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`

	// Access control
	IsPublic    bool           `gorm:"default:false" json:"is_public"`
	SharedWith  pq.StringArray `gorm:"type:text[]" json:"shared_with"` // User IDs

	// Relations
	CreatedBy User `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
}

// Methods for FlowAnalytics
func (fa *FlowAnalytics) CalculateSuccessRate() float64 {
	if fa.TotalExecutions == 0 {
		return 0
	}
	return float64(fa.SuccessfulExecutions) / float64(fa.TotalExecutions)
}

func (fa *FlowAnalytics) CalculateFailureRate() float64 {
	if fa.TotalExecutions == 0 {
		return 0
	}
	return float64(fa.FailedExecutions) / float64(fa.TotalExecutions)
}

// Methods for FlowNodeAnalytics
func (fna *FlowNodeAnalytics) CalculateSuccessRate() float64 {
	if fna.TotalExecutions == 0 {
		return 0
	}
	return float64(fna.SuccessCount) / float64(fna.TotalExecutions)
}

func (fna *FlowNodeAnalytics) IsPerformant() bool {
	return fna.SuccessRate >= 0.8 && fna.AvgExecutionTime < 5000 // 5 seconds
}

// Methods for FlowABTest
func (abt *FlowABTest) IsRunning() bool {
	return abt.Status == "running"
}

func (abt *FlowABTest) HasMinimumSampleSize() bool {
	return (abt.FlowAExecutions + abt.FlowBExecutions) >= abt.MinSampleSize
}

func (abt *FlowABTest) CalculateWinner() *string {
	if !abt.HasMinimumSampleSize() {
		return nil
	}

	if abt.FlowASuccessRate > abt.FlowBSuccessRate {
		winner := "A"
		return &winner
	} else if abt.FlowBSuccessRate > abt.FlowASuccessRate {
		winner := "B"
		return &winner
	}

	return nil // Tie
}

// Analytics Period Types
const (
	AnalyticsPeriodHourly  = "hourly"
	AnalyticsPeriodDaily   = "daily"
	AnalyticsPeriodWeekly  = "weekly"
	AnalyticsPeriodMonthly = "monthly"
)

// Flow Metrics
const (
	FlowMetricExecutionTime   = "execution_time"
	FlowMetricCompletionRate  = "completion_rate"
	FlowMetricErrorRate       = "error_rate"
	FlowMetricConversionRate  = "conversion_rate"
	FlowMetricDropOffRate     = "drop_off_rate"
	FlowMetricRetryRate       = "retry_rate"
	FlowMetricResponseTime    = "response_time"
	FlowMetricUniqueUsers     = "unique_users"
	FlowMetricMessagesSent    = "messages_sent"
	FlowMetricEngagementTime  = "engagement_time"
)