package engine

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// NodeType defines the type of flow node
type NodeType string

const (
	NodeTypeStart       NodeType = "start"
	NodeTypeMessage     NodeType = "message"
	NodeTypeCondition   NodeType = "condition"
	NodeTypeAction      NodeType = "action"
	NodeTypeDelay       NodeType = "delay"
	NodeTypeWebhook     NodeType = "webhook"
	NodeTypeAI          NodeType = "ai"
	NodeTypeIntegration NodeType = "integration"
	NodeTypeInput       NodeType = "input"
	NodeTypeSplit       NodeType = "split"
	NodeTypeMerge       NodeType = "merge"
	NodeTypeEnd         NodeType = "end"
)

// FlowNode represents a single node in a flow
type FlowNode interface {
	GetID() string
	GetType() NodeType
	GetName() string
	GetDescription() string
	Execute(ctx context.Context, execCtx *ExecutionContext) (*NodeResult, error)
	Validate() error
	GetNextNodes() []string
	GetConfig() map[string]interface{}
	SetConfig(config map[string]interface{}) error
}

// NodeResult represents the result of a node execution
type NodeResult struct {
	Success      bool                   `json:"success"`
	NextNodeID   string                 `json:"next_node_id,omitempty"`
	Variables    map[string]interface{} `json:"variables,omitempty"`
	Message      string                 `json:"message,omitempty"`
	Data         interface{}            `json:"data,omitempty"`
	ShouldWait   bool                   `json:"should_wait"`
	WaitTimeout  time.Duration          `json:"wait_timeout,omitempty"`
	ShouldPause  bool                   `json:"should_pause"`
	ErrorCode    string                 `json:"error_code,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// ExecutionContext holds the context for flow execution
type ExecutionContext struct {
	FlowID         uuid.UUID
	ExecutionID    uuid.UUID
	TenantID       uuid.UUID
	ContactID      *uuid.UUID
	ConversationID *uuid.UUID
	UserID         *uuid.UUID
	
	// Execution state
	Variables      map[string]interface{}
	Context        map[string]interface{}
	CurrentNodeID  string
	ExecutionStep  int
	
	// Services access
	Services       *ServiceContainer
	Logger         Logger
	
	// Flow definition
	FlowDefinition *FlowDefinition
	
	// Execution metadata
	StartTime      time.Time
	LastActivity   time.Time
	TriggerType    string
	TriggerData    map[string]interface{}
}

// FlowEngine defines the main flow execution engine interface
type FlowEngine interface {
	// Flow execution
	ExecuteFlow(ctx context.Context, flowID uuid.UUID, execCtx *ExecutionContext) (*ExecutionResult, error)
	ResumeExecution(ctx context.Context, executionID uuid.UUID) (*ExecutionResult, error)
	PauseExecution(ctx context.Context, executionID uuid.UUID) error
	CancelExecution(ctx context.Context, executionID uuid.UUID) error
	
	// Flow management
	ValidateFlow(flowDef *FlowDefinition) error
	GetExecution(ctx context.Context, executionID uuid.UUID) (*ExecutionInfo, error)
	ListExecutions(ctx context.Context, filter *ExecutionFilter) ([]*ExecutionInfo, error)
	
	// Node management
	RegisterNode(nodeType NodeType, factory NodeFactory) error
	GetRegisteredNodes() []NodeType
	CreateNode(nodeType NodeType, config map[string]interface{}) (FlowNode, error)
}

// NodeFactory creates instances of specific node types
type NodeFactory func(config map[string]interface{}) (FlowNode, error)

// ExecutionResult represents the final result of a flow execution
type ExecutionResult struct {
	ExecutionID    uuid.UUID              `json:"execution_id"`
	Status         ExecutionStatus        `json:"status"`
	CompletedAt    *time.Time            `json:"completed_at,omitempty"`
	Duration       time.Duration         `json:"duration"`
	FinalVariables map[string]interface{} `json:"final_variables"`
	LastNodeID     string                `json:"last_node_id"`
	ErrorMessage   string                `json:"error_message,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
}

// ExecutionInfo provides information about a flow execution
type ExecutionInfo struct {
	ExecutionID    uuid.UUID              `json:"execution_id"`
	FlowID         uuid.UUID              `json:"flow_id"`
	Status         ExecutionStatus        `json:"status"`
	CurrentNodeID  *string               `json:"current_node_id,omitempty"`
	Variables      map[string]interface{} `json:"variables"`
	StartedAt      time.Time             `json:"started_at"`
	CompletedAt    *time.Time            `json:"completed_at,omitempty"`
	ErrorMessage   *string               `json:"error_message,omitempty"`
	Progress       float64               `json:"progress"` // 0.0 to 1.0
}

// ExecutionFilter for filtering execution queries
type ExecutionFilter struct {
	FlowID         *uuid.UUID
	ContactID      *uuid.UUID
	Status         *ExecutionStatus
	StartDateFrom  *time.Time
	StartDateTo    *time.Time
	Limit          int
	Offset         int
}

// ExecutionStatus represents the status of a flow execution
type ExecutionStatus string

const (
	ExecutionStatusPending   ExecutionStatus = "pending"
	ExecutionStatusRunning   ExecutionStatus = "running"
	ExecutionStatusCompleted ExecutionStatus = "completed"
	ExecutionStatusFailed    ExecutionStatus = "failed"
	ExecutionStatusPaused    ExecutionStatus = "paused"
	ExecutionStatusCancelled ExecutionStatus = "cancelled"
	ExecutionStatusWaiting   ExecutionStatus = "waiting"
)

// FlowDefinition represents the complete flow structure
type FlowDefinition struct {
	Version     string                 `json:"version"`
	StartNodeID string                 `json:"start_node_id"`
	Nodes       map[string]NodeDef     `json:"nodes"`
	Variables   []VariableDef          `json:"variables"`
	Settings    FlowSettings           `json:"settings"`
	Metadata    FlowMetadata           `json:"metadata"`
}

// NodeDef defines a node in the flow
type NodeDef struct {
	ID          string                 `json:"id"`
	Type        NodeType               `json:"type"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Config      map[string]interface{} `json:"config"`
	Position    NodePosition           `json:"position"`
	Connections []NodeConnection       `json:"connections"`
}

// NodePosition for visual builder
type NodePosition struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// NodeConnection defines connections between nodes
type NodeConnection struct {
	TargetNodeID string `json:"target_node_id"`
	Condition    string `json:"condition,omitempty"`
	Label        string `json:"label,omitempty"`
}

// VariableDef defines a flow variable
type VariableDef struct {
	Name         string      `json:"name"`
	Type         string      `json:"type"`
	DefaultValue interface{} `json:"default_value,omitempty"`
	Description  string      `json:"description"`
	IsRequired   bool        `json:"is_required"`
	Validation   *VariableValidation `json:"validation,omitempty"`
}

// VariableValidation defines validation rules for variables
type VariableValidation struct {
	Pattern    string      `json:"pattern,omitempty"`    // Regex pattern
	MinLength  *int        `json:"min_length,omitempty"`
	MaxLength  *int        `json:"max_length,omitempty"`
	MinValue   *float64    `json:"min_value,omitempty"`
	MaxValue   *float64    `json:"max_value,omitempty"`
	Options    []string    `json:"options,omitempty"`    // For enum-like validation
	CustomRule string      `json:"custom_rule,omitempty"` // Custom validation rule
}

// FlowSettings contains flow-wide settings
type FlowSettings struct {
	MaxExecutionTime    time.Duration `json:"max_execution_time"`
	RetryAttempts       int           `json:"retry_attempts"`
	EnableAnalytics     bool          `json:"enable_analytics"`
	TimeoutAction       string        `json:"timeout_action"`  // continue, fail, retry
	ErrorHandling       string        `json:"error_handling"`  // stop, continue, retry
	ConcurrentExecution bool          `json:"concurrent_execution"`
	RateLimiting        *RateLimitSettings `json:"rate_limiting,omitempty"`
}

// RateLimitSettings defines rate limiting for flow execution
type RateLimitSettings struct {
	MaxExecutionsPerHour   int `json:"max_executions_per_hour"`
	MaxExecutionsPerDay    int `json:"max_executions_per_day"`
	MaxExecutionsPerContact int `json:"max_executions_per_contact"`
}

// FlowMetadata contains metadata about the flow
type FlowMetadata struct {
	CreatedBy     uuid.UUID `json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedBy     uuid.UUID `json:"updated_by"`
	UpdatedAt     time.Time `json:"updated_at"`
	Version       int       `json:"version"`
	Description   string    `json:"description"`
	Tags          []string  `json:"tags"`
	Category      string    `json:"category"`
}

// Logger interface for flow engine logging
type Logger interface {
	Debug(msg string, fields ...interface{})
	Info(msg string, fields ...interface{})
	Warn(msg string, fields ...interface{})
	Error(msg string, fields ...interface{})
	With(fields ...interface{}) Logger
}

// ServiceContainer provides access to system services
type ServiceContainer struct {
	WhatsAppService    WhatsAppService
	ConversationService ConversationService
	ContactService     ContactService
	WebSocketService   WebSocketService
	RedisClient        RedisClient
	Database          Database
	TriggerManager    TriggerManager
	AnalyticsCollector AnalyticsCollector
}

// Service interfaces for dependency injection
type WhatsAppService interface {
	SendMessage(ctx context.Context, config map[string]interface{}) error
	SendTemplate(ctx context.Context, config map[string]interface{}) error
}

type ConversationService interface {
	GetConversation(ctx context.Context, id uuid.UUID) (interface{}, error)
	CreateMessage(ctx context.Context, config map[string]interface{}) error
	UpdateConversationStatus(ctx context.Context, id uuid.UUID, status string) error
}

type ContactService interface {
	GetContact(ctx context.Context, id uuid.UUID) (interface{}, error)
	UpdateContact(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error
	AddTag(ctx context.Context, contactID uuid.UUID, tag string) error
}

type WebSocketService interface {
	BroadcastFlowEvent(ctx context.Context, event interface{}) error
}

type RedisClient interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
}

type Database interface {
	SaveExecution(ctx context.Context, execution interface{}) error
	UpdateExecution(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error
	GetExecution(ctx context.Context, id uuid.UUID) (interface{}, error)
	SaveExecutionStep(ctx context.Context, step interface{}) error
}

type TriggerManager interface {
	ProcessTrigger(ctx context.Context, triggerData map[string]interface{}) error
}

type AnalyticsCollector interface {
	RecordExecution(ctx context.Context, data map[string]interface{}) error
	RecordNodeExecution(ctx context.Context, data map[string]interface{}) error
}

// FlowError represents errors that can occur during flow execution
type FlowError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	NodeID    string `json:"node_id,omitempty"`
	Retryable bool   `json:"retryable"`
}

func (e *FlowError) Error() string {
	return e.Message
}

// Common flow error codes
const (
	ErrCodeNodeNotFound      = "NODE_NOT_FOUND"
	ErrCodeInvalidConfig     = "INVALID_CONFIG"
	ErrCodeExecutionTimeout  = "EXECUTION_TIMEOUT"
	ErrCodeNodeExecutionFailed = "NODE_EXECUTION_FAILED"
	ErrCodeInvalidTransition = "INVALID_TRANSITION"
	ErrCodeVariableNotFound  = "VARIABLE_NOT_FOUND"
	ErrCodeValidationFailed  = "VALIDATION_FAILED"
	ErrCodeServiceUnavailable = "SERVICE_UNAVAILABLE"
	ErrCodeRateLimitExceeded = "RATE_LIMIT_EXCEEDED"
)

// Helper functions for creating common errors
func NewFlowError(code, message, nodeID string, retryable bool) *FlowError {
	return &FlowError{
		Code:      code,
		Message:   message,
		NodeID:    nodeID,
		Retryable: retryable,
	}
}

func NewNodeError(nodeID, message string) *FlowError {
	return NewFlowError(ErrCodeNodeExecutionFailed, message, nodeID, true)
}

func NewValidationError(message string) *FlowError {
	return NewFlowError(ErrCodeValidationFailed, message, "", false)
}