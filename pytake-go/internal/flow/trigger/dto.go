package trigger

import (
	"time"

	"github.com/google/uuid"
)

// DTOs for trigger API endpoints

// CreateTriggerRequest represents a request to create a trigger
type CreateTriggerRequest struct {
	FlowID      uuid.UUID              `json:"flow_id" validate:"required"`
	Name        string                 `json:"name" validate:"required,min=3,max=255"`
	Description string                 `json:"description"`
	Type        TriggerType            `json:"type" validate:"required"`
	Priority    int                    `json:"priority" validate:"min=0,max=100"`
	Config      map[string]interface{} `json:"config" validate:"required"`
	Enabled     bool                   `json:"enabled"`
}

// UpdateTriggerRequest represents a request to update a trigger
type UpdateTriggerRequest struct {
	Name        *string                `json:"name,omitempty" validate:"omitempty,min=3,max=255"`
	Description *string                `json:"description,omitempty"`
	Priority    *int                   `json:"priority,omitempty" validate:"omitempty,min=0,max=100"`
	Config      map[string]interface{} `json:"config,omitempty"`
	Enabled     *bool                  `json:"enabled,omitempty"`
}

// TriggerResponse represents a trigger in API responses
type TriggerResponse struct {
	ID            uuid.UUID              `json:"id"`
	TenantID      uuid.UUID              `json:"tenant_id"`
	FlowID        uuid.UUID              `json:"flow_id"`
	FlowName      string                 `json:"flow_name,omitempty"`
	Name          string                 `json:"name"`
	Description   string                 `json:"description"`
	Type          TriggerType            `json:"type"`
	Status        TriggerStatus          `json:"status"`
	Priority      int                    `json:"priority"`
	Config        map[string]interface{} `json:"config"`
	LastTriggered *time.Time             `json:"last_triggered,omitempty"`
	TriggerCount  int                    `json:"trigger_count"`
	ErrorCount    int                    `json:"error_count"`
	LastError     *string                `json:"last_error,omitempty"`
	CreatedAt     time.Time              `json:"created_at"`
	UpdatedAt     time.Time              `json:"updated_at"`
	CreatedByID   uuid.UUID              `json:"created_by_id"`
}

// TriggerSummaryResponse represents a trigger summary for lists
type TriggerSummaryResponse struct {
	ID            uuid.UUID     `json:"id"`
	FlowID        uuid.UUID     `json:"flow_id"`
	FlowName      string        `json:"flow_name,omitempty"`
	Name          string        `json:"name"`
	Type          TriggerType   `json:"type"`
	Status        TriggerStatus `json:"status"`
	Priority      int           `json:"priority"`
	TriggerCount  int           `json:"trigger_count"`
	LastTriggered *time.Time    `json:"last_triggered,omitempty"`
	CreatedAt     time.Time     `json:"created_at"`
}

// TriggerFilterRequest represents filters for trigger queries
type TriggerFilterRequest struct {
	FlowID   *uuid.UUID    `form:"flow_id"`
	Type     TriggerType   `form:"type"`
	Status   TriggerStatus `form:"status"`
	Enabled  *bool         `form:"enabled"`
	Search   string        `form:"search"`
	SortBy   string        `form:"sort_by"`
	SortDesc bool          `form:"sort_desc"`
	Limit    int           `form:"limit"`
	Offset   int           `form:"offset"`
}

// TriggerEventRequest represents a request to emit a trigger event
type TriggerEventRequest struct {
	Type           TriggerType            `json:"type" validate:"required"`
	ContactID      *uuid.UUID             `json:"contact_id,omitempty"`
	ConversationID *uuid.UUID             `json:"conversation_id,omitempty"`
	Data           map[string]interface{} `json:"data" validate:"required"`
	Metadata       map[string]interface{} `json:"metadata"`
}

// TriggerEventResponse represents a trigger event in API responses
type TriggerEventResponse struct {
	ID              uuid.UUID              `json:"id"`
	TenantID        uuid.UUID              `json:"tenant_id"`
	Type            TriggerType            `json:"type"`
	ContactID       *uuid.UUID             `json:"contact_id,omitempty"`
	ConversationID  *uuid.UUID             `json:"conversation_id,omitempty"`
	Data            map[string]interface{} `json:"data"`
	Metadata        map[string]interface{} `json:"metadata"`
	Timestamp       time.Time              `json:"timestamp"`
	ProcessedAt     *time.Time             `json:"processed_at,omitempty"`
	TriggeredFlows  []uuid.UUID            `json:"triggered_flows"`
	ExecutionCount  int                    `json:"execution_count"`
}

// TriggerStatsResponse represents trigger statistics
type TriggerStatsResponse struct {
	TenantID        uuid.UUID `json:"tenant_id"`
	TotalTriggers   int       `json:"total_triggers"`
	ActiveTriggers  int       `json:"active_triggers"`
	InactiveTriggers int      `json:"inactive_triggers"`
	TotalEvents     int64     `json:"total_events"`
	ProcessedEvents int64     `json:"processed_events"`
	FailedEvents    int64     `json:"failed_events"`
	SuccessRate     float64   `json:"success_rate"`
	TotalExecutions int64     `json:"total_executions"`
	AvgProcessTime  float64   `json:"avg_process_time_ms"`
	TopTriggers     []TriggerPerformanceData `json:"top_triggers"`
}

// TriggerPerformanceData represents performance data for a trigger
type TriggerPerformanceData struct {
	TriggerID       uuid.UUID `json:"trigger_id"`
	TriggerName     string    `json:"trigger_name"`
	FlowID          uuid.UUID `json:"flow_id"`
	FlowName        string    `json:"flow_name"`
	Type            TriggerType `json:"type"`
	EventsProcessed int       `json:"events_processed"`
	ExecutionsStarted int     `json:"executions_started"`
	SuccessRate     float64   `json:"success_rate"`
	AvgProcessTime  float64   `json:"avg_process_time_ms"`
	LastTriggered   *time.Time `json:"last_triggered,omitempty"`
}

// TriggerTestRequest represents a request to test a trigger
type TriggerTestRequest struct {
	Config    map[string]interface{} `json:"config" validate:"required"`
	EventData map[string]interface{} `json:"event_data" validate:"required"`
}

// TriggerTestResponse represents the result of trigger testing
type TriggerTestResponse struct {
	IsMatch      bool                   `json:"is_match"`
	MatchReason  string                 `json:"match_reason,omitempty"`
	Variables    map[string]interface{} `json:"variables,omitempty"`
	Context      map[string]interface{} `json:"context,omitempty"`
	ProcessTime  int64                  `json:"process_time_ms"`
	ErrorMessage *string                `json:"error_message,omitempty"`
}

// TriggerTemplateResponse represents predefined trigger templates
type TriggerTemplateResponse struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Type        TriggerType            `json:"type"`
	Category    string                 `json:"category"`
	Tags        []string               `json:"tags"`
	Config      map[string]interface{} `json:"config"`
	Variables   []TriggerTemplateVariable `json:"variables"`
	UsageCount  int                    `json:"usage_count"`
}

// TriggerTemplateVariable represents a configurable variable in a trigger template
type TriggerTemplateVariable struct {
	Key          string      `json:"key"`
	Name         string      `json:"name"`
	Description  string      `json:"description"`
	Type         string      `json:"type"` // string, number, boolean, array
	Required     bool        `json:"required"`
	DefaultValue interface{} `json:"default_value,omitempty"`
	Options      []string    `json:"options,omitempty"` // For select/enum types
}

// CreateTriggerFromTemplateRequest represents a request to create a trigger from a template
type CreateTriggerFromTemplateRequest struct {
	TemplateID   string                 `json:"template_id" validate:"required"`
	FlowID       uuid.UUID              `json:"flow_id" validate:"required"`
	Name         string                 `json:"name" validate:"required,min=3,max=255"`
	Description  string                 `json:"description"`
	Variables    map[string]interface{} `json:"variables"`
	Priority     int                    `json:"priority" validate:"min=0,max=100"`
}

// BulkTriggerOperation represents bulk operations on triggers
type BulkTriggerOperationRequest struct {
	TriggerIDs []uuid.UUID `json:"trigger_ids" validate:"required,min=1"`
	Operation  string      `json:"operation" validate:"required,oneof=enable disable delete"`
}

// BulkTriggerOperationResponse represents the result of bulk operations
type BulkTriggerOperationResponse struct {
	SuccessCount int         `json:"success_count"`
	FailureCount int         `json:"failure_count"`
	Errors       []BulkError `json:"errors,omitempty"`
}

// BulkError represents an error in bulk operations
type BulkError struct {
	TriggerID uuid.UUID `json:"trigger_id"`
	Error     string    `json:"error"`
}

// TriggerValidationRequest represents a request to validate trigger configuration
type TriggerValidationRequest struct {
	Type   TriggerType            `json:"type" validate:"required"`
	Config map[string]interface{} `json:"config" validate:"required"`
}

// TriggerValidationResponse represents the result of trigger validation
type TriggerValidationResponse struct {
	IsValid      bool                    `json:"is_valid"`
	Errors       []TriggerValidationError `json:"errors,omitempty"`
	Warnings     []TriggerValidationWarning `json:"warnings,omitempty"`
	Suggestions  []string                `json:"suggestions,omitempty"`
}

// TriggerValidationError represents a validation error
type TriggerValidationError struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// TriggerValidationWarning represents a validation warning
type TriggerValidationWarning struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// TriggerAnalyticsRequest represents a request for trigger analytics
type TriggerAnalyticsRequest struct {
	TriggerIDs  []uuid.UUID `json:"trigger_ids"`
	DateFrom    time.Time   `json:"date_from"`
	DateTo      time.Time   `json:"date_to"`
	Granularity string      `json:"granularity"` // hourly, daily, weekly
	Metrics     []string    `json:"metrics"`     // events, executions, success_rate, etc.
}

// TriggerAnalyticsResponse represents trigger analytics data
type TriggerAnalyticsResponse struct {
	TriggerID      uuid.UUID               `json:"trigger_id"`
	TriggerName    string                  `json:"trigger_name"`
	Period         string                  `json:"period"`
	TotalEvents    int                     `json:"total_events"`
	MatchedEvents  int                     `json:"matched_events"`
	Executions     int                     `json:"executions"`
	SuccessRate    float64                 `json:"success_rate"`
	AvgProcessTime float64                 `json:"avg_process_time_ms"`
	TimeSeriesData []TriggerAnalyticsPoint `json:"time_series_data"`
}

// TriggerAnalyticsPoint represents a data point in time series
type TriggerAnalyticsPoint struct {
	Timestamp      time.Time `json:"timestamp"`
	Events         int       `json:"events"`
	Matches        int       `json:"matches"`
	Executions     int       `json:"executions"`
	Successes      int       `json:"successes"`
	Failures       int       `json:"failures"`
	AvgProcessTime float64   `json:"avg_process_time_ms"`
}

// Helper response wrappers

// PaginatedTriggerResponse represents a paginated list of triggers
type PaginatedTriggerResponse struct {
	Data       []TriggerSummaryResponse `json:"data"`
	Total      int64                    `json:"total"`
	Page       int                      `json:"page"`
	PerPage    int                      `json:"per_page"`
	TotalPages int                      `json:"total_pages"`
}

// APIResponse represents a standard API response for triggers
type APITriggerResponse[T any] struct {
	Success bool   `json:"success"`
	Data    T      `json:"data,omitempty"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}