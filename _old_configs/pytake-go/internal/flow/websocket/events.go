package websocket

import (
	"time"

	"github.com/google/uuid"
)

// WebSocketEventType represents types of WebSocket events for flows
type WebSocketEventType string

const (
	// Flow Events
	EventTypeFlowStarted   WebSocketEventType = "flow_started"
	EventTypeFlowCompleted WebSocketEventType = "flow_completed"
	EventTypeFlowFailed    WebSocketEventType = "flow_failed"
	EventTypeFlowPaused    WebSocketEventType = "flow_paused"
	EventTypeFlowResumed   WebSocketEventType = "flow_resumed"
	EventTypeFlowCancelled WebSocketEventType = "flow_cancelled"
	
	// Flow Node Events
	EventTypeNodeStarted   WebSocketEventType = "node_started"
	EventTypeNodeCompleted WebSocketEventType = "node_completed"
	EventTypeNodeFailed    WebSocketEventType = "node_failed"
	EventTypeNodeSkipped   WebSocketEventType = "node_skipped"
	
	// Trigger Events
	EventTypeTriggerMatched  WebSocketEventType = "trigger_matched"
	EventTypeTriggerExecuted WebSocketEventType = "trigger_executed"
	EventTypeTriggerFailed   WebSocketEventType = "trigger_failed"
	
	// Message Events
	EventTypeMessageSent     WebSocketEventType = "message_sent"
	EventTypeMessageReceived WebSocketEventType = "message_received"
	EventTypeMessageFailed   WebSocketEventType = "message_failed"
	
	// Variable Events
	EventTypeVariableUpdated WebSocketEventType = "variable_updated"
	EventTypeVariableDeleted WebSocketEventType = "variable_deleted"
	
	// System Events
	EventTypeSystemStatus    WebSocketEventType = "system_status"
	EventTypeError           WebSocketEventType = "error"
	EventTypeWarning         WebSocketEventType = "warning"
	EventTypeInfo            WebSocketEventType = "info"
)

// WebSocketEvent represents a real-time event for flows
type WebSocketEvent struct {
	ID        uuid.UUID              `json:"id"`
	Type      WebSocketEventType     `json:"type"`
	Timestamp time.Time              `json:"timestamp"`
	TenantID  uuid.UUID              `json:"tenant_id"`
	UserID    *uuid.UUID             `json:"user_id,omitempty"`
	Data      map[string]interface{} `json:"data"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// Flow execution events

// FlowExecutionStartedEvent represents a flow execution started event
type FlowExecutionStartedEvent struct {
	ExecutionID    uuid.UUID              `json:"execution_id"`
	FlowID         uuid.UUID              `json:"flow_id"`
	FlowName       string                 `json:"flow_name"`
	ContactID      *uuid.UUID             `json:"contact_id,omitempty"`
	ConversationID *uuid.UUID             `json:"conversation_id,omitempty"`
	TriggerType    string                 `json:"trigger_type"`
	Variables      map[string]interface{} `json:"variables"`
	StartedAt      time.Time              `json:"started_at"`
}

// FlowExecutionCompletedEvent represents a flow execution completed event
type FlowExecutionCompletedEvent struct {
	ExecutionID     uuid.UUID              `json:"execution_id"`
	FlowID          uuid.UUID              `json:"flow_id"`
	FlowName        string                 `json:"flow_name"`
	Status          string                 `json:"status"`
	Duration        int64                  `json:"duration_ms"`
	FinalVariables  map[string]interface{} `json:"final_variables"`
	NodesExecuted   int                    `json:"nodes_executed"`
	MessagesSent    int                    `json:"messages_sent"`
	CompletedAt     time.Time              `json:"completed_at"`
}

// FlowExecutionFailedEvent represents a flow execution failed event
type FlowExecutionFailedEvent struct {
	ExecutionID   uuid.UUID `json:"execution_id"`
	FlowID        uuid.UUID `json:"flow_id"`
	FlowName      string    `json:"flow_name"`
	ErrorMessage  string    `json:"error_message"`
	ErrorNodeID   *string   `json:"error_node_id,omitempty"`
	ErrorNodeName *string   `json:"error_node_name,omitempty"`
	Duration      int64     `json:"duration_ms"`
	FailedAt      time.Time `json:"failed_at"`
}

// Flow node events

// FlowNodeStartedEvent represents a flow node started event
type FlowNodeStartedEvent struct {
	ExecutionID uuid.UUID              `json:"execution_id"`
	FlowID      uuid.UUID              `json:"flow_id"`
	NodeID      string                 `json:"node_id"`
	NodeType    string                 `json:"node_type"`
	NodeName    string                 `json:"node_name"`
	Variables   map[string]interface{} `json:"variables"`
	StartedAt   time.Time              `json:"started_at"`
}

// FlowNodeCompletedEvent represents a flow node completed event
type FlowNodeCompletedEvent struct {
	ExecutionID   uuid.UUID              `json:"execution_id"`
	FlowID        uuid.UUID              `json:"flow_id"`
	NodeID        string                 `json:"node_id"`
	NodeType      string                 `json:"node_type"`
	NodeName      string                 `json:"node_name"`
	Duration      int64                  `json:"duration_ms"`
	Variables     map[string]interface{} `json:"variables"`
	Output        interface{}            `json:"output,omitempty"`
	NextNodes     []string               `json:"next_nodes,omitempty"`
	CompletedAt   time.Time              `json:"completed_at"`
}

// FlowNodeFailedEvent represents a flow node failed event
type FlowNodeFailedEvent struct {
	ExecutionID  uuid.UUID `json:"execution_id"`
	FlowID       uuid.UUID `json:"flow_id"`
	NodeID       string    `json:"node_id"`
	NodeType     string    `json:"node_type"`
	NodeName     string    `json:"node_name"`
	ErrorMessage string    `json:"error_message"`
	Duration     int64     `json:"duration_ms"`
	RetryCount   int       `json:"retry_count"`
	FailedAt     time.Time `json:"failed_at"`
}

// Trigger events

// TriggerMatchedEvent represents a trigger matched event
type TriggerMatchedEvent struct {
	TriggerID      uuid.UUID              `json:"trigger_id"`
	TriggerName    string                 `json:"trigger_name"`
	TriggerType    string                 `json:"trigger_type"`
	FlowID         uuid.UUID              `json:"flow_id"`
	FlowName       string                 `json:"flow_name"`
	EventID        uuid.UUID              `json:"event_id"`
	EventData      map[string]interface{} `json:"event_data"`
	Variables      map[string]interface{} `json:"variables"`
	Priority       int                    `json:"priority"`
	MatchedAt      time.Time              `json:"matched_at"`
}

// TriggerExecutedEvent represents a trigger executed event
type TriggerExecutedEvent struct {
	TriggerID    uuid.UUID `json:"trigger_id"`
	TriggerName  string    `json:"trigger_name"`
	TriggerType  string    `json:"trigger_type"`
	FlowID       uuid.UUID `json:"flow_id"`
	ExecutionID  uuid.UUID `json:"execution_id"`
	Success      bool      `json:"success"`
	ErrorMessage *string   `json:"error_message,omitempty"`
	ExecutedAt   time.Time `json:"executed_at"`
}

// Message events

// MessageSentEvent represents a message sent event
type MessageSentEvent struct {
	ExecutionID    uuid.UUID              `json:"execution_id"`
	FlowID         uuid.UUID              `json:"flow_id"`
	NodeID         string                 `json:"node_id"`
	MessageID      string                 `json:"message_id"`
	MessageType    string                 `json:"message_type"`
	ContactID      uuid.UUID              `json:"contact_id"`
	ConversationID uuid.UUID              `json:"conversation_id"`
	MessageData    map[string]interface{} `json:"message_data"`
	SentAt         time.Time              `json:"sent_at"`
}

// MessageReceivedEvent represents a message received event
type MessageReceivedEvent struct {
	MessageID      string                 `json:"message_id"`
	MessageType    string                 `json:"message_type"`
	ContactID      uuid.UUID              `json:"contact_id"`
	ConversationID uuid.UUID              `json:"conversation_id"`
	MessageData    map[string]interface{} `json:"message_data"`
	TriggerCount   int                    `json:"trigger_count"`
	ReceivedAt     time.Time              `json:"received_at"`
}

// Variable events

// VariableUpdatedEvent represents a variable updated event
type VariableUpdatedEvent struct {
	ExecutionID uuid.UUID   `json:"execution_id"`
	FlowID      uuid.UUID   `json:"flow_id"`
	NodeID      *string     `json:"node_id,omitempty"`
	Variable    string      `json:"variable"`
	OldValue    interface{} `json:"old_value"`
	NewValue    interface{} `json:"new_value"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

// System events

// SystemStatusEvent represents a system status event
type SystemStatusEvent struct {
	Component     string                 `json:"component"`
	Status        string                 `json:"status"`
	Message       string                 `json:"message"`
	Details       map[string]interface{} `json:"details,omitempty"`
	Timestamp     time.Time              `json:"timestamp"`
}

// Event builders

// NewFlowExecutionStartedEvent creates a new flow execution started event
func NewFlowExecutionStartedEvent(tenantID uuid.UUID, data FlowExecutionStartedEvent) *WebSocketEvent {
	return &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeFlowStarted,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id":    data.ExecutionID,
			"flow_id":         data.FlowID,
			"flow_name":       data.FlowName,
			"contact_id":      data.ContactID,
			"conversation_id": data.ConversationID,
			"trigger_type":    data.TriggerType,
			"variables":       data.Variables,
			"started_at":      data.StartedAt,
		},
	}
}

// NewFlowExecutionCompletedEvent creates a new flow execution completed event
func NewFlowExecutionCompletedEvent(tenantID uuid.UUID, data FlowExecutionCompletedEvent) *WebSocketEvent {
	return &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeFlowCompleted,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id":    data.ExecutionID,
			"flow_id":         data.FlowID,
			"flow_name":       data.FlowName,
			"status":          data.Status,
			"duration_ms":     data.Duration,
			"final_variables": data.FinalVariables,
			"nodes_executed":  data.NodesExecuted,
			"messages_sent":   data.MessagesSent,
			"completed_at":    data.CompletedAt,
		},
	}
}

// NewFlowExecutionFailedEvent creates a new flow execution failed event
func NewFlowExecutionFailedEvent(tenantID uuid.UUID, data FlowExecutionFailedEvent) *WebSocketEvent {
	return &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeFlowFailed,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id":    data.ExecutionID,
			"flow_id":         data.FlowID,
			"flow_name":       data.FlowName,
			"error_message":   data.ErrorMessage,
			"error_node_id":   data.ErrorNodeID,
			"error_node_name": data.ErrorNodeName,
			"duration_ms":     data.Duration,
			"failed_at":       data.FailedAt,
		},
	}
}

// NewFlowNodeStartedEvent creates a new flow node started event
func NewFlowNodeStartedEvent(tenantID uuid.UUID, data FlowNodeStartedEvent) *WebSocketEvent {
	return &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeNodeStarted,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id": data.ExecutionID,
			"flow_id":      data.FlowID,
			"node_id":      data.NodeID,
			"node_type":    data.NodeType,
			"node_name":    data.NodeName,
			"variables":    data.Variables,
			"started_at":   data.StartedAt,
		},
	}
}

// NewFlowNodeCompletedEvent creates a new flow node completed event
func NewFlowNodeCompletedEvent(tenantID uuid.UUID, data FlowNodeCompletedEvent) *WebSocketEvent {
	return &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeNodeCompleted,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id": data.ExecutionID,
			"flow_id":      data.FlowID,
			"node_id":      data.NodeID,
			"node_type":    data.NodeType,
			"node_name":    data.NodeName,
			"duration_ms":  data.Duration,
			"variables":    data.Variables,
			"output":       data.Output,
			"next_nodes":   data.NextNodes,
			"completed_at": data.CompletedAt,
		},
	}
}

// NewTriggerMatchedEvent creates a new trigger matched event
func NewTriggerMatchedEvent(tenantID uuid.UUID, data TriggerMatchedEvent) *WebSocketEvent {
	return &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeTriggerMatched,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"trigger_id":   data.TriggerID,
			"trigger_name": data.TriggerName,
			"trigger_type": data.TriggerType,
			"flow_id":      data.FlowID,
			"flow_name":    data.FlowName,
			"event_id":     data.EventID,
			"event_data":   data.EventData,
			"variables":    data.Variables,
			"priority":     data.Priority,
			"matched_at":   data.MatchedAt,
		},
	}
}

// NewMessageSentEvent creates a new message sent event
func NewMessageSentEvent(tenantID uuid.UUID, data MessageSentEvent) *WebSocketEvent {
	return &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeMessageSent,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id":    data.ExecutionID,
			"flow_id":         data.FlowID,
			"node_id":         data.NodeID,
			"message_id":      data.MessageID,
			"message_type":    data.MessageType,
			"contact_id":      data.ContactID,
			"conversation_id": data.ConversationID,
			"message_data":    data.MessageData,
			"sent_at":         data.SentAt,
		},
	}
}

// NewVariableUpdatedEvent creates a new variable updated event
func NewVariableUpdatedEvent(tenantID uuid.UUID, data VariableUpdatedEvent) *WebSocketEvent {
	return &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeVariableUpdated,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id": data.ExecutionID,
			"flow_id":      data.FlowID,
			"node_id":      data.NodeID,
			"variable":     data.Variable,
			"old_value":    data.OldValue,
			"new_value":    data.NewValue,
			"updated_at":   data.UpdatedAt,
		},
	}
}

// NewSystemStatusEvent creates a new system status event
func NewSystemStatusEvent(tenantID uuid.UUID, data SystemStatusEvent) *WebSocketEvent {
	return &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeSystemStatus,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"component": data.Component,
			"status":    data.Status,
			"message":   data.Message,
			"details":   data.Details,
			"timestamp": data.Timestamp,
		},
	}
}