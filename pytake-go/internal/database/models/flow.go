package models

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// Flow represents a conversation automation flow
type Flow struct {
	TenantModel
	Name        string         `gorm:"not null" json:"name"`
	Description string         `json:"description"`
	Version     int            `gorm:"default:1" json:"version"`
	Status      string         `gorm:"default:'draft'" json:"status"` // draft, active, inactive, archived
	Category    string         `json:"category"`                      // marketing, support, sales, etc.

	// Flow definition in JSON format
	Definition JSON `gorm:"type:jsonb;not null" json:"definition"`

	// Flow metadata
	Tags     pq.StringArray `gorm:"type:text[]" json:"tags"`
	Priority int            `gorm:"default:0" json:"priority"`

	// Trigger configuration
	Triggers JSON `gorm:"type:jsonb" json:"triggers"`

	// Analytics and stats
	ExecutionCount int        `gorm:"default:0" json:"execution_count"`
	SuccessCount   int        `gorm:"default:0" json:"success_count"`
	LastExecutedAt *time.Time `json:"last_executed_at"`

	// Access control
	CreatedByID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`
	IsPublic    bool      `gorm:"default:false" json:"is_public"`

	// Relations
	CreatedBy      User            `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
	FlowExecutions []FlowExecution `gorm:"foreignKey:FlowID" json:"executions,omitempty"`
	FlowVariables  []FlowVariable  `gorm:"foreignKey:FlowID" json:"variables,omitempty"`
}

// FlowExecution tracks individual flow runs
type FlowExecution struct {
	TenantModel
	FlowID         uuid.UUID  `gorm:"type:uuid;not null;index" json:"flow_id"`
	ConversationID *uuid.UUID `gorm:"type:uuid;index" json:"conversation_id,omitempty"`
	ContactID      *uuid.UUID `gorm:"type:uuid;index" json:"contact_id,omitempty"`

	// Execution state
	Status        string  `gorm:"not null" json:"status"` // running, completed, failed, paused, cancelled
	CurrentNodeID *string `json:"current_node_id,omitempty"`

	// Execution context and variables
	Variables JSON `gorm:"type:jsonb" json:"variables"`
	Context   JSON `gorm:"type:jsonb" json:"context"`

	// Execution metadata
	StartedAt   time.Time  `gorm:"not null" json:"started_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	PausedAt    *time.Time `json:"paused_at,omitempty"`

	// Error handling
	ErrorMessage *string `json:"error_message,omitempty"`
	ErrorNodeID  *string `json:"error_node_id,omitempty"`
	RetryCount   int     `gorm:"default:0" json:"retry_count"`

	// Trigger information
	TriggerType string `json:"trigger_type"` // message, keyword, schedule, webhook, manual
	TriggerData JSON   `gorm:"type:jsonb" json:"trigger_data"`

	// Relations
	Flow            Flow                 `gorm:"foreignKey:FlowID" json:"flow,omitempty"`
	Conversation    *Conversation        `gorm:"foreignKey:ConversationID" json:"conversation,omitempty"`
	Contact         *Contact             `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	ExecutionSteps  []FlowExecutionStep  `gorm:"foreignKey:ExecutionID" json:"steps,omitempty"`
	ExecutionEvents []FlowExecutionEvent `gorm:"foreignKey:ExecutionID" json:"events,omitempty"`
}

// FlowExecutionStep tracks individual step executions within a flow
type FlowExecutionStep struct {
	BaseModel
	ExecutionID uuid.UUID `gorm:"type:uuid;not null;index" json:"execution_id"`
	NodeID      string    `gorm:"not null" json:"node_id"`
	NodeType    string    `gorm:"not null" json:"node_type"`

	// Step execution details
	Status      string     `gorm:"not null" json:"status"` // pending, running, completed, failed, skipped
	StartedAt   time.Time  `gorm:"not null" json:"started_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`

	// Step data
	InputData  JSON `gorm:"type:jsonb" json:"input_data"`
	OutputData JSON `gorm:"type:jsonb" json:"output_data"`

	// Error handling
	ErrorMessage *string `json:"error_message,omitempty"`
	RetryCount   int     `gorm:"default:0" json:"retry_count"`

	// Performance metrics
	ExecutionTime int64 `json:"execution_time"` // in milliseconds

	// Relations
	Execution FlowExecution `gorm:"foreignKey:ExecutionID" json:"execution,omitempty"`
}

// FlowExecutionEvent tracks events during flow execution
type FlowExecutionEvent struct {
	BaseModel
	ExecutionID uuid.UUID `gorm:"type:uuid;not null;index" json:"execution_id"`
	NodeID      *string   `json:"node_id,omitempty"`

	// Event details
	EventType   string    `gorm:"not null" json:"event_type"` // started, completed, failed, paused, resumed, node_entered, node_completed, variable_updated
	EventData   JSON      `gorm:"type:jsonb" json:"event_data"`
	Message     string    `json:"message"`
	Timestamp   time.Time `gorm:"not null" json:"timestamp"`
	Severity    string    `gorm:"default:'info'" json:"severity"` // info, warning, error, debug

	// Relations
	Execution FlowExecution `gorm:"foreignKey:ExecutionID" json:"execution,omitempty"`
}

// FlowVariable stores dynamic variables for flows
type FlowVariable struct {
	TenantModel
	FlowID       uuid.UUID `gorm:"type:uuid;not null;index" json:"flow_id"`
	Name         string    `gorm:"not null" json:"name"`
	Type         string    `gorm:"not null" json:"type"` // string, number, boolean, object, array
	DefaultValue *string   `json:"default_value,omitempty"`
	Description  string    `json:"description"`
	IsRequired   bool      `gorm:"default:false" json:"is_required"`
	IsGlobal     bool      `gorm:"default:false" json:"is_global"` // Available across all flows in tenant

	// Validation rules
	ValidationRules JSON `gorm:"type:jsonb" json:"validation_rules"`

	// Relations
	Flow Flow `gorm:"foreignKey:FlowID" json:"flow,omitempty"`
}

// FlowTemplate provides pre-built flow templates
type FlowTemplate struct {
	BaseModel
	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`
	Category    string `gorm:"not null" json:"category"`
	Industry    string `json:"industry"`

	// Template definition
	Definition   JSON    `gorm:"type:jsonb;not null" json:"definition"`
	PreviewImage *string `json:"preview_image,omitempty"`

	// Template metadata
	Tags          pq.StringArray `gorm:"type:text[]" json:"tags"`
	Difficulty    string         `json:"difficulty"`     // beginner, intermediate, advanced
	EstimatedTime int            `json:"estimated_time"` // setup time in minutes

	// Usage statistics
	UsageCount int     `gorm:"default:0" json:"usage_count"`
	Rating     float64 `gorm:"default:0" json:"rating"`

	// Access control
	IsPublic    bool       `gorm:"default:true" json:"is_public"`
	CreatedByID *uuid.UUID `gorm:"type:uuid" json:"created_by_id,omitempty"`

	// Relations
	CreatedBy *User `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
}

// FlowTrigger stores trigger configurations
type FlowTrigger struct {
	TenantModel
	FlowID uuid.UUID `gorm:"type:uuid;not null;index" json:"flow_id"`

	// Trigger configuration
	Name        string `gorm:"not null" json:"name"`
	Type        string `gorm:"not null" json:"type"`        // message, keyword, schedule, webhook, manual
	Status      string `gorm:"default:'active'" json:"status"` // active, inactive
	Priority    int    `gorm:"default:0" json:"priority"`
	Conditions  JSON   `gorm:"type:jsonb" json:"conditions"`
	Schedule    *string `json:"schedule,omitempty"` // Cron expression for scheduled triggers

	// Statistics
	TriggerCount    int        `gorm:"default:0" json:"trigger_count"`
	LastTriggeredAt *time.Time `json:"last_triggered_at"`

	// Relations
	Flow Flow `gorm:"foreignKey:FlowID" json:"flow,omitempty"`
}

// FlowVersion tracks flow versions for rollback capabilities
type FlowVersion struct {
	BaseModel
	FlowID      uuid.UUID `gorm:"type:uuid;not null;index" json:"flow_id"`
	Version     int       `gorm:"not null" json:"version"`
	Definition  JSON      `gorm:"type:jsonb;not null" json:"definition"`
	ChangeLog   string    `json:"change_log"`
	CreatedByID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`

	// Relations
	Flow      Flow `gorm:"foreignKey:FlowID" json:"flow,omitempty"`
	CreatedBy User `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
}

// FlowExecutionStatus represents the status of a flow execution
type FlowExecutionStatus string

const (
	FlowExecutionStatusPending   FlowExecutionStatus = "pending"
	FlowExecutionStatusRunning   FlowExecutionStatus = "running"
	FlowExecutionStatusCompleted FlowExecutionStatus = "completed"
	FlowExecutionStatusFailed    FlowExecutionStatus = "failed"
	FlowExecutionStatusPaused    FlowExecutionStatus = "paused"
	FlowExecutionStatusCancelled FlowExecutionStatus = "cancelled"
)

// FlowStatus represents the status of a flow
type FlowStatus string

const (
	FlowStatusDraft    FlowStatus = "draft"
	FlowStatusActive   FlowStatus = "active"
	FlowStatusInactive FlowStatus = "inactive"
	FlowStatusArchived FlowStatus = "archived"
)

// FlowTriggerType represents the type of flow trigger
type FlowTriggerType string

const (
	FlowTriggerTypeMessage  FlowTriggerType = "message"
	FlowTriggerTypeKeyword  FlowTriggerType = "keyword"
	FlowTriggerTypeSchedule FlowTriggerType = "schedule"
	FlowTriggerTypeWebhook  FlowTriggerType = "webhook"
	FlowTriggerTypeManual   FlowTriggerType = "manual"
)

// Validate validates the flow model
func (f *Flow) Validate() error {
	if f.Name == "" {
		return ErrInvalidFlowName
	}
	if f.Definition == nil {
		return ErrInvalidFlowDefinition
	}
	return nil
}

// Validate validates the flow execution model
func (fe *FlowExecution) Validate() error {
	if fe.FlowID == uuid.Nil {
		return ErrInvalidFlowID
	}
	if fe.Status == "" {
		return ErrInvalidExecutionStatus
	}
	return nil
}

// IsCompleted checks if the execution is completed
func (fe *FlowExecution) IsCompleted() bool {
	return fe.Status == string(FlowExecutionStatusCompleted)
}

// IsFailed checks if the execution has failed
func (fe *FlowExecution) IsFailed() bool {
	return fe.Status == string(FlowExecutionStatusFailed)
}

// IsRunning checks if the execution is currently running
func (fe *FlowExecution) IsRunning() bool {
	return fe.Status == string(FlowExecutionStatusRunning)
}

// CanRetry checks if the execution can be retried
func (fe *FlowExecution) CanRetry() bool {
	return fe.IsFailed() && fe.RetryCount < 3 // Max 3 retries
}

// GetDuration calculates the execution duration
func (fe *FlowExecution) GetDuration() time.Duration {
	if fe.CompletedAt != nil {
		return fe.CompletedAt.Sub(fe.StartedAt)
	}
	if fe.IsRunning() {
		return time.Since(fe.StartedAt)
	}
	return 0
}

// Custom errors for flow models
var (
	ErrInvalidFlowName        = errors.New("flow name is required")
	ErrInvalidFlowDefinition  = errors.New("flow definition is required")
	ErrInvalidFlowID          = errors.New("flow ID is required")
	ErrInvalidExecutionStatus = errors.New("execution status is required")
)