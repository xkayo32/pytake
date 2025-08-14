package trigger

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// TriggerType represents different types of triggers
type TriggerType string

const (
	// Message-based triggers
	TriggerTypeMessageReceived TriggerType = "message_received"
	TriggerTypeKeywordMatch    TriggerType = "keyword_match"
	TriggerTypeButtonClick     TriggerType = "button_click"
	TriggerTypeListSelection   TriggerType = "list_selection"
	
	// Time-based triggers
	TriggerTypeScheduled       TriggerType = "scheduled"
	TriggerTypeDelay           TriggerType = "delay"
	TriggerTypeRecurring       TriggerType = "recurring"
	
	// Event-based triggers
	TriggerTypeWebhook         TriggerType = "webhook"
	TriggerTypeAPI             TriggerType = "api"
	TriggerTypeContactCreated  TriggerType = "contact_created"
	TriggerTypeContactUpdated  TriggerType = "contact_updated"
	
	// Campaign triggers
	TriggerTypeCampaignStart   TriggerType = "campaign_start"
	TriggerTypeCampaignEnd     TriggerType = "campaign_end"
	
	// Custom triggers
	TriggerTypeCustomEvent     TriggerType = "custom_event"
)

// TriggerStatus represents the status of a trigger
type TriggerStatus string

const (
	TriggerStatusActive   TriggerStatus = "active"
	TriggerStatusInactive TriggerStatus = "inactive"
	TriggerStatusPaused   TriggerStatus = "paused"
	TriggerStatusExpired  TriggerStatus = "expired"
)

// TriggerEvent represents an event that can trigger a flow
type TriggerEvent struct {
	ID              uuid.UUID              `json:"id"`
	TenantID        uuid.UUID              `json:"tenant_id"`
	TriggerType     TriggerType            `json:"trigger_type"`
	ContactID       *uuid.UUID             `json:"contact_id,omitempty"`
	ConversationID  *uuid.UUID             `json:"conversation_id,omitempty"`
	Data            map[string]interface{} `json:"data"`
	Metadata        map[string]interface{} `json:"metadata"`
	Timestamp       time.Time              `json:"timestamp"`
	ProcessedAt     *time.Time             `json:"processed_at,omitempty"`
}

// TriggerConfig represents the configuration for a trigger
type TriggerConfig struct {
	Type       TriggerType            `json:"type"`
	Conditions map[string]interface{} `json:"conditions"`
	Settings   map[string]interface{} `json:"settings"`
	Priority   int                    `json:"priority"`
	Enabled    bool                   `json:"enabled"`
}

// TriggerMatch represents a successful trigger match
type TriggerMatch struct {
	TriggerID      uuid.UUID              `json:"trigger_id"`
	FlowID         uuid.UUID              `json:"flow_id"`
	Event          *TriggerEvent          `json:"event"`
	Variables      map[string]interface{} `json:"variables"`
	Context        map[string]interface{} `json:"context"`
	MatchedAt      time.Time              `json:"matched_at"`
	Priority       int                    `json:"priority"`
}

// TriggerMatcher defines the interface for trigger matching logic
type TriggerMatcher interface {
	// Match checks if an event matches this trigger
	Match(ctx context.Context, event *TriggerEvent, config *TriggerConfig) (*TriggerMatch, error)
	
	// GetSupportedTypes returns the trigger types this matcher supports
	GetSupportedTypes() []TriggerType
	
	// Validate validates the trigger configuration
	Validate(config *TriggerConfig) error
}

// TriggerProcessor defines the interface for processing trigger events
type TriggerProcessor interface {
	// ProcessEvent processes a trigger event and executes matching flows
	ProcessEvent(ctx context.Context, event *TriggerEvent) error
	
	// RegisterMatcher registers a new trigger matcher
	RegisterMatcher(matcher TriggerMatcher) error
	
	// Start starts the trigger processor
	Start(ctx context.Context) error
	
	// Stop stops the trigger processor
	Stop(ctx context.Context) error
}

// TriggerManager defines the interface for managing triggers
type TriggerManager interface {
	// CreateTrigger creates a new trigger for a flow
	CreateTrigger(ctx context.Context, tenantID, flowID uuid.UUID, config *TriggerConfig) (*FlowTrigger, error)
	
	// UpdateTrigger updates an existing trigger
	UpdateTrigger(ctx context.Context, triggerID uuid.UUID, config *TriggerConfig) error
	
	// DeleteTrigger deletes a trigger
	DeleteTrigger(ctx context.Context, triggerID uuid.UUID) error
	
	// GetTrigger retrieves a trigger by ID
	GetTrigger(ctx context.Context, triggerID uuid.UUID) (*FlowTrigger, error)
	
	// ListTriggers lists triggers with filtering
	ListTriggers(ctx context.Context, filter *TriggerFilter) ([]*FlowTrigger, error)
	
	// EnableTrigger enables a trigger
	EnableTrigger(ctx context.Context, triggerID uuid.UUID) error
	
	// DisableTrigger disables a trigger
	DisableTrigger(ctx context.Context, triggerID uuid.UUID) error
	
	// GetActiveTriggers gets all active triggers for a tenant
	GetActiveTriggers(ctx context.Context, tenantID uuid.UUID) ([]*FlowTrigger, error)
}

// TriggerScheduler defines the interface for scheduling time-based triggers
type TriggerScheduler interface {
	// ScheduleTrigger schedules a trigger for future execution
	ScheduleTrigger(ctx context.Context, trigger *FlowTrigger, executeAt time.Time) error
	
	// CancelScheduledTrigger cancels a scheduled trigger
	CancelScheduledTrigger(ctx context.Context, triggerID uuid.UUID) error
	
	// Start starts the scheduler
	Start(ctx context.Context) error
	
	// Stop stops the scheduler
	Stop(ctx context.Context) error
}

// TriggerEventEmitter defines the interface for emitting trigger events
type TriggerEventEmitter interface {
	// EmitEvent emits a trigger event
	EmitEvent(ctx context.Context, event *TriggerEvent) error
	
	// EmitMessageReceived emits a message received event
	EmitMessageReceived(ctx context.Context, tenantID, conversationID, contactID uuid.UUID, message map[string]interface{}) error
	
	// EmitWebhookEvent emits a webhook event
	EmitWebhookEvent(ctx context.Context, tenantID uuid.UUID, webhookType string, data map[string]interface{}) error
	
	// EmitContactEvent emits a contact-related event
	EmitContactEvent(ctx context.Context, tenantID, contactID uuid.UUID, eventType TriggerType, data map[string]interface{}) error
	
	// EmitCustomEvent emits a custom event
	EmitCustomEvent(ctx context.Context, tenantID uuid.UUID, eventName string, data map[string]interface{}) error
}

// FlowTrigger represents a trigger configuration for a flow
type FlowTrigger struct {
	ID             uuid.UUID      `json:"id"`
	TenantID       uuid.UUID      `json:"tenant_id"`
	FlowID         uuid.UUID      `json:"flow_id"`
	Name           string         `json:"name"`
	Description    string         `json:"description"`
	Type           TriggerType    `json:"type"`
	Status         TriggerStatus  `json:"status"`
	Priority       int            `json:"priority"`
	Config         TriggerConfig  `json:"config"`
	LastTriggered  *time.Time     `json:"last_triggered,omitempty"`
	TriggerCount   int            `json:"trigger_count"`
	ErrorCount     int            `json:"error_count"`
	LastError      *string        `json:"last_error,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	CreatedByID    uuid.UUID      `json:"created_by_id"`
}

// TriggerFilter represents filters for trigger queries
type TriggerFilter struct {
	FlowID      *uuid.UUID    `json:"flow_id,omitempty"`
	Type        TriggerType   `json:"type,omitempty"`
	Status      TriggerStatus `json:"status,omitempty"`
	Enabled     *bool         `json:"enabled,omitempty"`
	Limit       int           `json:"limit"`
	Offset      int           `json:"offset"`
}

// TriggerStats represents statistics about triggers
type TriggerStats struct {
	TotalTriggers   int     `json:"total_triggers"`
	ActiveTriggers  int     `json:"active_triggers"`
	TotalEvents     int     `json:"total_events"`
	ProcessedEvents int     `json:"processed_events"`
	FailedEvents    int     `json:"failed_events"`
	SuccessRate     float64 `json:"success_rate"`
	AvgProcessTime  float64 `json:"avg_process_time"`
}