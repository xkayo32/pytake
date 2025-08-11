package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// FlowTrigger represents a trigger configuration for automated flow execution
type FlowTrigger struct {
	BaseModel
	TenantModel

	// Basic Information
	FlowID      uuid.UUID `gorm:"type:uuid;not null;index" json:"flow_id"`
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description"`
	
	// Trigger Configuration
	Type     string `gorm:"not null;index" json:"type"`           // TriggerType (message_received, keyword_match, etc.)
	Status   string `gorm:"default:'active';index" json:"status"` // TriggerStatus (active, inactive, paused)
	Priority int    `gorm:"default:0" json:"priority"`            // Higher priority triggers are processed first
	
	// Configuration and Conditions
	Config JSON `gorm:"type:jsonb;not null" json:"config"` // Trigger configuration (conditions, settings, etc.)
	
	// Statistics
	TriggerCount int       `gorm:"default:0" json:"trigger_count"`       // Number of times this trigger was fired
	ErrorCount   int       `gorm:"default:0" json:"error_count"`         // Number of errors
	LastError    *string   `json:"last_error,omitempty"`                 // Last error message
	LastTriggered *time.Time `json:"last_triggered,omitempty"`           // Last time this trigger was fired
	
	// Metadata
	Tags        pq.StringArray `gorm:"type:text[]" json:"tags"`
	CreatedByID uuid.UUID      `gorm:"type:uuid;not null" json:"created_by_id"`
	
	// Relationships
	Flow *Flow `gorm:"foreignKey:FlowID;constraint:OnDelete:CASCADE" json:"flow,omitempty"`
}

// TableName returns the table name for FlowTrigger
func (FlowTrigger) TableName() string {
	return "flow_triggers"
}

// TriggerCondition represents a condition for trigger matching
type TriggerCondition struct {
	BaseModel
	TenantModel

	TriggerID uuid.UUID `gorm:"type:uuid;not null;index" json:"trigger_id"`
	
	// Condition Configuration
	Field    string      `gorm:"not null" json:"field"`         // Field to check (e.g., "message_text", "contact_tag")
	Operator string      `gorm:"not null" json:"operator"`      // Operator (equals, contains, matches, etc.)
	Value    interface{} `gorm:"type:jsonb" json:"value"`       // Value to compare against
	
	// Logical Operators
	LogicalOperator string `gorm:"default:'AND'" json:"logical_operator"` // AND, OR for combining conditions
	GroupID         *int   `json:"group_id,omitempty"`                     // For grouping conditions
	
	// Relationships
	Trigger *FlowTrigger `gorm:"foreignKey:TriggerID;constraint:OnDelete:CASCADE" json:"trigger,omitempty"`
}

// TableName returns the table name for TriggerCondition
func (TriggerCondition) TableName() string {
	return "trigger_conditions"
}

// TriggerEvent represents an event that could trigger flows
type TriggerEvent struct {
	BaseModel
	TenantModel

	// Event Information
	Type           string                 `gorm:"not null;index" json:"type"`      // Event type
	Source         string                 `gorm:"not null" json:"source"`          // Event source (webhook, api, schedule, etc.)
	EventData      JSON                   `gorm:"type:jsonb" json:"event_data"`    // Event payload
	Metadata       JSON                   `gorm:"type:jsonb" json:"metadata"`      // Additional metadata
	
	// Context
	ContactID      *uuid.UUID `gorm:"type:uuid;index" json:"contact_id,omitempty"`
	ConversationID *uuid.UUID `gorm:"type:uuid;index" json:"conversation_id,omitempty"`
	
	// Processing Status
	Status      string     `gorm:"default:'pending';index" json:"status"` // pending, processed, failed
	ProcessedAt *time.Time `json:"processed_at,omitempty"`
	ErrorMsg    *string    `json:"error_msg,omitempty"`
	
	// Execution Results
	TriggeredFlows []uuid.UUID    `gorm:"type:uuid[]" json:"triggered_flows"` // List of flows that were triggered
	ExecutionIDs   []uuid.UUID    `gorm:"type:uuid[]" json:"execution_ids"`   // List of executions started
}

// TableName returns the table name for TriggerEvent
func (TriggerEvent) TableName() string {
	return "trigger_events"
}

// TriggerExecution represents the execution of a trigger
type TriggerExecution struct {
	BaseModel
	TenantModel

	TriggerID uuid.UUID `gorm:"type:uuid;not null;index" json:"trigger_id"`
	EventID   uuid.UUID `gorm:"type:uuid;not null;index" json:"event_id"`
	FlowID    uuid.UUID `gorm:"type:uuid;not null;index" json:"flow_id"`
	
	// Execution Info
	ExecutionID *uuid.UUID `gorm:"type:uuid;index" json:"execution_id,omitempty"` // Reference to FlowExecution
	Status      string     `gorm:"not null;index" json:"status"`                  // success, failed, skipped
	
	// Context and Variables
	MatchedConditions JSON                   `gorm:"type:jsonb" json:"matched_conditions"` // Conditions that matched
	Variables         JSON                   `gorm:"type:jsonb" json:"variables"`          // Variables extracted from event
	Context           JSON                   `gorm:"type:jsonb" json:"context"`            // Execution context
	
	// Timing
	StartedAt   time.Time  `gorm:"not null" json:"started_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	Duration    *int64     `json:"duration,omitempty"` // Duration in milliseconds
	
	// Error Info
	ErrorMsg   *string `json:"error_msg,omitempty"`
	RetryCount int     `gorm:"default:0" json:"retry_count"`
	
	// Relationships
	Trigger   *FlowTrigger   `gorm:"foreignKey:TriggerID;constraint:OnDelete:CASCADE" json:"trigger,omitempty"`
	Event     *TriggerEvent  `gorm:"foreignKey:EventID;constraint:OnDelete:CASCADE" json:"event,omitempty"`
	Flow      *Flow          `gorm:"foreignKey:FlowID;constraint:OnDelete:CASCADE" json:"flow,omitempty"`
	Execution *FlowExecution `gorm:"foreignKey:ExecutionID" json:"execution,omitempty"`
}

// TableName returns the table name for TriggerExecution
func (TriggerExecution) TableName() string {
	return "trigger_executions"
}

// TriggerSchedule represents scheduled triggers
type TriggerSchedule struct {
	BaseModel
	TenantModel

	TriggerID uuid.UUID `gorm:"type:uuid;not null;index" json:"trigger_id"`
	
	// Schedule Configuration
	ScheduleType string    `gorm:"not null" json:"schedule_type"` // once, recurring, cron
	ExecuteAt    time.Time `gorm:"not null;index" json:"execute_at"`
	CronExpression *string `json:"cron_expression,omitempty"`
	
	// Recurring Configuration
	RecurringType *string `json:"recurring_type,omitempty"` // daily, weekly, monthly
	RecurringDays pq.Int32Array `gorm:"type:integer[]" json:"recurring_days,omitempty"` // Days of week (0=Sunday)
	RecurringInterval *int `json:"recurring_interval,omitempty"` // Interval for recurring (every N days/weeks/months)
	
	// Status and Limits
	Status       string     `gorm:"default:'active';index" json:"status"` // active, paused, completed, expired
	MaxExecution *int       `json:"max_execution,omitempty"`               // Max number of executions (null = unlimited)
	ExecCount    int        `gorm:"default:0" json:"exec_count"`           // Current execution count
	LastExecAt   *time.Time `json:"last_exec_at,omitempty"`                // Last execution time
	NextExecAt   *time.Time `gorm:"index" json:"next_exec_at,omitempty"`   // Next scheduled execution
	
	// Timezone and Context
	Timezone    string `gorm:"default:'UTC'" json:"timezone"`
	Context     JSON   `gorm:"type:jsonb" json:"context"`     // Additional context for execution
	Description string `json:"description"`
	
	// Relationships
	Trigger *FlowTrigger `gorm:"foreignKey:TriggerID;constraint:OnDelete:CASCADE" json:"trigger,omitempty"`
}

// TableName returns the table name for TriggerSchedule
func (TriggerSchedule) TableName() string {
	return "trigger_schedules"
}

// TriggerStats represents aggregated statistics for triggers
type TriggerStats struct {
	BaseModel
	TenantModel

	TriggerID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_trigger_stats_date" json:"trigger_id"`
	Date      time.Time `gorm:"type:date;not null;uniqueIndex:idx_trigger_stats_date" json:"date"`
	
	// Event Statistics
	EventsReceived int `gorm:"default:0" json:"events_received"` // Number of events that could match this trigger
	EventsMatched  int `gorm:"default:0" json:"events_matched"`  // Number of events that actually matched
	EventsIgnored  int `gorm:"default:0" json:"events_ignored"`  // Number of events ignored (conditions not met)
	
	// Execution Statistics
	ExecutionsStarted  int `gorm:"default:0" json:"executions_started"`
	ExecutionsSuccess  int `gorm:"default:0" json:"executions_success"`
	ExecutionsFailed   int `gorm:"default:0" json:"executions_failed"`
	
	// Performance Metrics
	AvgProcessingTime float64 `gorm:"default:0" json:"avg_processing_time"` // Average time to process event (ms)
	AvgExecutionTime  float64 `gorm:"default:0" json:"avg_execution_time"`  // Average flow execution time (ms)
	
	// Error Tracking
	ErrorCount   int     `gorm:"default:0" json:"error_count"`
	LastErrorMsg *string `json:"last_error_msg,omitempty"`
	
	// Relationships
	Trigger *FlowTrigger `gorm:"foreignKey:TriggerID;constraint:OnDelete:CASCADE" json:"trigger,omitempty"`
}

// TableName returns the table name for TriggerStats
func (TriggerStats) TableName() string {
	return "trigger_stats"
}