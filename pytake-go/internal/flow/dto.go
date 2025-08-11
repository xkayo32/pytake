package flow

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/pytake/pytake-go/internal/flow/engine"
)

// Flow Management DTOs

// CreateFlowRequest represents a request to create a new flow
type CreateFlowRequest struct {
	Name        string                 `json:"name" validate:"required,min=3,max=255"`
	Description string                 `json:"description"`
	Category    string                 `json:"category"`
	Status      string                 `json:"status" validate:"oneof=draft active inactive"`
	Priority    int                    `json:"priority"`
	Tags        pq.StringArray         `json:"tags"`
	IsPublic    bool                   `json:"is_public"`
	CreatedByID uuid.UUID             `json:"created_by_id" validate:"required"`
	Definition  *engine.FlowDefinition `json:"definition" validate:"required"`
	Triggers    interface{}            `json:"triggers"`
}

// UpdateFlowRequest represents a request to update an existing flow
type UpdateFlowRequest struct {
	Name        *string                `json:"name,omitempty" validate:"omitempty,min=3,max=255"`
	Description *string                `json:"description,omitempty"`
	Category    *string                `json:"category,omitempty"`
	Status      *string                `json:"status,omitempty" validate:"omitempty,oneof=draft active inactive archived"`
	Priority    *int                   `json:"priority,omitempty"`
	Tags        *pq.StringArray        `json:"tags,omitempty"`
	IsPublic    *bool                  `json:"is_public,omitempty"`
	Definition  *engine.FlowDefinition `json:"definition,omitempty"`
	Triggers    interface{}            `json:"triggers,omitempty"`
}

// FlowResponse represents a flow in API responses
type FlowResponse struct {
	ID                uuid.UUID              `json:"id"`
	TenantID          uuid.UUID              `json:"tenant_id"`
	Name              string                 `json:"name"`
	Description       string                 `json:"description"`
	Category          string                 `json:"category"`
	Status            string                 `json:"status"`
	Version           int                    `json:"version"`
	Priority          int                    `json:"priority"`
	Tags              pq.StringArray         `json:"tags"`
	IsPublic          bool                   `json:"is_public"`
	ExecutionCount    int                    `json:"execution_count"`
	SuccessCount      int                    `json:"success_count"`
	LastExecutedAt    *time.Time             `json:"last_executed_at"`
	CreatedAt         time.Time              `json:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at"`
	CreatedByID       uuid.UUID              `json:"created_by_id"`
	Definition        *engine.FlowDefinition `json:"definition,omitempty"`
	Triggers          interface{}            `json:"triggers,omitempty"`
}

// FlowSummaryResponse represents a flow summary for lists
type FlowSummaryResponse struct {
	ID             uuid.UUID      `json:"id"`
	Name           string         `json:"name"`
	Description    string         `json:"description"`
	Category       string         `json:"category"`
	Status         string         `json:"status"`
	Version        int            `json:"version"`
	Priority       int            `json:"priority"`
	Tags           pq.StringArray `json:"tags"`
	ExecutionCount int            `json:"execution_count"`
	SuccessCount   int            `json:"success_count"`
	LastExecutedAt *time.Time     `json:"last_executed_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

// FlowFilter represents filters for flow queries
type FlowFilter struct {
	Status   string `form:"status"`
	Category string `form:"category"`
	Search   string `form:"search"`
	SortBy   string `form:"sort_by"`
	SortDesc bool   `form:"sort_desc"`
	Limit    int    `form:"limit"`
	Offset   int    `form:"offset"`
}

// Flow Execution DTOs

// ExecuteFlowRequest represents a request to execute a flow
type ExecuteFlowRequest struct {
	ConversationID *uuid.UUID             `json:"conversation_id,omitempty"`
	ContactID      *uuid.UUID             `json:"contact_id,omitempty"`
	UserID         *uuid.UUID             `json:"user_id,omitempty"`
	TriggerType    string                 `json:"trigger_type" validate:"required"`
	TriggerData    map[string]interface{} `json:"trigger_data"`
	Variables      map[string]interface{} `json:"variables"`
	Context        map[string]interface{} `json:"context"`
}

// FlowExecutionResponse represents a flow execution in API responses
type FlowExecutionResponse struct {
	ID             uuid.UUID              `json:"id"`
	TenantID       uuid.UUID              `json:"tenant_id"`
	FlowID         uuid.UUID              `json:"flow_id"`
	ConversationID *uuid.UUID             `json:"conversation_id,omitempty"`
	ContactID      *uuid.UUID             `json:"contact_id,omitempty"`
	Status         string                 `json:"status"`
	CurrentNodeID  *string                `json:"current_node_id,omitempty"`
	Variables      map[string]interface{} `json:"variables"`
	Context        map[string]interface{} `json:"context"`
	StartedAt      time.Time              `json:"started_at"`
	CompletedAt    *time.Time             `json:"completed_at,omitempty"`
	PausedAt       *time.Time             `json:"paused_at,omitempty"`
	ErrorMessage   *string                `json:"error_message,omitempty"`
	ErrorNodeID    *string                `json:"error_node_id,omitempty"`
	RetryCount     int                    `json:"retry_count"`
	TriggerType    string                 `json:"trigger_type"`
	TriggerData    map[string]interface{} `json:"trigger_data"`
	Duration       *int64                 `json:"duration,omitempty"` // in milliseconds
}

// ExecutionSummaryResponse represents an execution summary for lists
type ExecutionSummaryResponse struct {
	ID             uuid.UUID  `json:"id"`
	FlowID         uuid.UUID  `json:"flow_id"`
	FlowName       string     `json:"flow_name"`
	Status         string     `json:"status"`
	StartedAt      time.Time  `json:"started_at"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
	Duration       *int64     `json:"duration,omitempty"`
	TriggerType    string     `json:"trigger_type"`
	ContactID      *uuid.UUID `json:"contact_id,omitempty"`
	ConversationID *uuid.UUID `json:"conversation_id,omitempty"`
	ErrorMessage   *string    `json:"error_message,omitempty"`
}

// ExecutionFilter represents filters for execution queries
type ExecutionFilter struct {
	FlowID        *uuid.UUID `form:"flow_id"`
	Status        string     `form:"status"`
	ContactID     *uuid.UUID `form:"contact_id"`
	TriggerType   string     `form:"trigger_type"`
	StartDateFrom *time.Time `form:"start_date_from"`
	StartDateTo   *time.Time `form:"start_date_to"`
	Limit         int        `form:"limit"`
	Offset        int        `form:"offset"`
}

// Flow Template DTOs

// FlowTemplateResponse represents a flow template in API responses
type FlowTemplateResponse struct {
	ID            uuid.UUID              `json:"id"`
	Name          string                 `json:"name"`
	Description   string                 `json:"description"`
	Category      string                 `json:"category"`
	Industry      string                 `json:"industry"`
	Tags          pq.StringArray         `json:"tags"`
	Difficulty    string                 `json:"difficulty"`
	EstimatedTime int                    `json:"estimated_time"`
	UsageCount    int                    `json:"usage_count"`
	Rating        float64                `json:"rating"`
	PreviewImage  *string                `json:"preview_image,omitempty"`
	Definition    *engine.FlowDefinition `json:"definition,omitempty"`
	CreatedAt     time.Time              `json:"created_at"`
	UpdatedAt     time.Time              `json:"updated_at"`
}

// CreateFlowFromTemplateRequest represents a request to create a flow from a template
type CreateFlowFromTemplateRequest struct {
	TemplateID  uuid.UUID              `json:"template_id" validate:"required"`
	Name        string                 `json:"name" validate:"required,min=3,max=255"`
	Description string                 `json:"description"`
	Category    string                 `json:"category"`
	Variables   map[string]interface{} `json:"variables"` // Template variable substitutions
}

// Flow Builder DTOs

// ValidateFlowRequest represents a request to validate a flow definition
type ValidateFlowRequest struct {
	Definition *engine.FlowDefinition `json:"definition" validate:"required"`
}

// ValidateFlowResponse represents the result of flow validation
type ValidateFlowResponse struct {
	IsValid bool                    `json:"is_valid"`
	Errors  []ValidationError       `json:"errors,omitempty"`
	Warnings []ValidationWarning    `json:"warnings,omitempty"`
	Summary ValidationSummary       `json:"summary"`
}

// ValidationError represents a validation error
type ValidationError struct {
	Code     string `json:"code"`
	Message  string `json:"message"`
	NodeID   string `json:"node_id,omitempty"`
	Field    string `json:"field,omitempty"`
	Severity string `json:"severity"`
}

// ValidationWarning represents a validation warning
type ValidationWarning struct {
	Code     string `json:"code"`
	Message  string `json:"message"`
	NodeID   string `json:"node_id,omitempty"`
	Severity string `json:"severity"`
}

// ValidationSummary provides a summary of the validation
type ValidationSummary struct {
	TotalNodes    int `json:"total_nodes"`
	StartNodes    int `json:"start_nodes"`
	EndNodes      int `json:"end_nodes"`
	MessageNodes  int `json:"message_nodes"`
	ConditionNodes int `json:"condition_nodes"`
	ActionNodes   int `json:"action_nodes"`
	DelayNodes    int `json:"delay_nodes"`
	Variables     int `json:"variables"`
	Connections   int `json:"connections"`
}

// TestFlowRequest represents a request to test a flow
type TestFlowRequest struct {
	FlowID         uuid.UUID              `json:"flow_id" validate:"required"`
	TestVariables  map[string]interface{} `json:"test_variables"`
	TestContext    map[string]interface{} `json:"test_context"`
	SimulateDelay  bool                   `json:"simulate_delay"`
	MaxSteps       int                    `json:"max_steps"`
}

// TestFlowResponse represents the result of flow testing
type TestFlowResponse struct {
	Success       bool                   `json:"success"`
	ExecutionID   uuid.UUID              `json:"execution_id"`
	Steps         []TestStepResult       `json:"steps"`
	FinalVariables map[string]interface{} `json:"final_variables"`
	Duration      int64                  `json:"duration"` // in milliseconds
	ErrorMessage  *string                `json:"error_message,omitempty"`
	ErrorNodeID   *string                `json:"error_node_id,omitempty"`
}

// TestStepResult represents the result of a single test step
type TestStepResult struct {
	NodeID       string                 `json:"node_id"`
	NodeType     string                 `json:"node_type"`
	NodeName     string                 `json:"node_name"`
	Success      bool                   `json:"success"`
	Duration     int64                  `json:"duration"` // in milliseconds
	Variables    map[string]interface{} `json:"variables"`
	Output       interface{}            `json:"output,omitempty"`
	ErrorMessage *string                `json:"error_message,omitempty"`
	StartTime    time.Time              `json:"start_time"`
	EndTime      *time.Time             `json:"end_time,omitempty"`
}

// Flow Analytics DTOs

// FlowAnalyticsRequest represents a request for flow analytics
type FlowAnalyticsRequest struct {
	FlowIDs     []uuid.UUID `json:"flow_ids"`
	DateFrom    time.Time   `json:"date_from"`
	DateTo      time.Time   `json:"date_to"`
	Granularity string      `json:"granularity"` // hourly, daily, weekly, monthly
}

// FlowAnalyticsResponse represents flow analytics data
type FlowAnalyticsResponse struct {
	FlowID             uuid.UUID                  `json:"flow_id"`
	FlowName           string                     `json:"flow_name"`
	Period             string                     `json:"period"`
	TotalExecutions    int                        `json:"total_executions"`
	SuccessfulExecutions int                      `json:"successful_executions"`
	FailedExecutions   int                        `json:"failed_executions"`
	AvgExecutionTime   float64                    `json:"avg_execution_time"`
	SuccessRate        float64                    `json:"success_rate"`
	ConversionRate     float64                    `json:"conversion_rate"`
	DropOffRate        float64                    `json:"drop_off_rate"`
	UniqueUsers        int                        `json:"unique_users"`
	MessagesSent       int                        `json:"messages_sent"`
	TimeSeriesData     []AnalyticsDataPoint       `json:"time_series_data"`
	NodeMetrics        []NodeAnalyticsData        `json:"node_metrics"`
}

// AnalyticsDataPoint represents a data point in time series
type AnalyticsDataPoint struct {
	Timestamp   time.Time `json:"timestamp"`
	Executions  int       `json:"executions"`
	Successes   int       `json:"successes"`
	Failures    int       `json:"failures"`
	AvgDuration float64   `json:"avg_duration"`
}

// NodeAnalyticsData represents analytics data for a specific node
type NodeAnalyticsData struct {
	NodeID           string  `json:"node_id"`
	NodeType         string  `json:"node_type"`
	NodeName         string  `json:"node_name"`
	Executions       int     `json:"executions"`
	Successes        int     `json:"successes"`
	Failures         int     `json:"failures"`
	SuccessRate      float64 `json:"success_rate"`
	AvgDuration      float64 `json:"avg_duration"`
	DropOffCount     int     `json:"drop_off_count"`
	UniqueVisitors   int     `json:"unique_visitors"`
}

// Dashboard DTOs

// FlowDashboardResponse represents dashboard data for flows
type FlowDashboardResponse struct {
	Summary         FlowDashboardSummary    `json:"summary"`
	RecentExecutions []ExecutionSummaryResponse `json:"recent_executions"`
	TopFlows        []FlowPerformanceData   `json:"top_flows"`
	ExecutionTrends []AnalyticsDataPoint    `json:"execution_trends"`
	StatusDistribution map[string]int       `json:"status_distribution"`
}

// FlowDashboardSummary represents summary statistics for the dashboard
type FlowDashboardSummary struct {
	TotalFlows       int     `json:"total_flows"`
	ActiveFlows      int     `json:"active_flows"`
	TotalExecutions  int     `json:"total_executions"`
	SuccessfulExecutions int `json:"successful_executions"`
	FailedExecutions int     `json:"failed_executions"`
	RunningExecutions int    `json:"running_executions"`
	SuccessRate      float64 `json:"success_rate"`
	AvgExecutionTime float64 `json:"avg_execution_time"`
}

// FlowPerformanceData represents performance data for a flow
type FlowPerformanceData struct {
	FlowID          uuid.UUID `json:"flow_id"`
	FlowName        string    `json:"flow_name"`
	Executions      int       `json:"executions"`
	SuccessRate     float64   `json:"success_rate"`
	AvgDuration     float64   `json:"avg_duration"`
	LastExecutedAt  *time.Time `json:"last_executed_at"`
}

// Pagination and Response wrappers

// PaginatedResponse represents a paginated API response
type PaginatedResponse[T any] struct {
	Data       []T   `json:"data"`
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	TotalPages int   `json:"total_pages"`
}

// APIResponse represents a standard API response
type APIResponse[T any] struct {
	Success bool   `json:"success"`
	Data    T      `json:"data,omitempty"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

// Helper function to create paginated response
func NewPaginatedResponse[T any](data []T, total int64, page, perPage int) *PaginatedResponse[T] {
	totalPages := int((total + int64(perPage) - 1) / int64(perPage))
	
	return &PaginatedResponse[T]{
		Data:       data,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}
}

// Helper function to create success response
func NewSuccessResponse[T any](data T, message string) *APIResponse[T] {
	return &APIResponse[T]{
		Success: true,
		Data:    data,
		Message: message,
	}
}

// Helper function to create error response
func NewErrorResponse[T any](error string) *APIResponse[T] {
	var zero T
	return &APIResponse[T]{
		Success: false,
		Data:    zero,
		Error:   error,
	}
}