package websocket

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/flow/engine"
	"github.com/pytake/pytake-go/internal/websocket"
)

// FlowWebSocketBroadcaster handles real-time broadcasting of flow events
type FlowWebSocketBroadcaster struct {
	wsService websocket.Service
	logger    engine.Logger
	
	// Event channels for different types
	flowEventChan    chan *WebSocketEvent
	triggerEventChan chan *WebSocketEvent
	systemEventChan  chan *WebSocketEvent
	
	// Control
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
	
	// Configuration
	bufferSize int
}

// NewFlowWebSocketBroadcaster creates a new flow WebSocket broadcaster
func NewFlowWebSocketBroadcaster(wsService websocket.Service, logger engine.Logger) *FlowWebSocketBroadcaster {
	return &FlowWebSocketBroadcaster{
		wsService:        wsService,
		logger:          logger,
		flowEventChan:   make(chan *WebSocketEvent, 1000),
		triggerEventChan: make(chan *WebSocketEvent, 500),
		systemEventChan: make(chan *WebSocketEvent, 200),
		bufferSize:      1000,
	}
}

// Start starts the broadcaster
func (b *FlowWebSocketBroadcaster) Start(ctx context.Context) error {
	b.ctx, b.cancel = context.WithCancel(ctx)
	
	// Start event processing goroutines
	b.wg.Add(3)
	go b.processFlowEvents()
	go b.processTriggerEvents()
	go b.processSystemEvents()
	
	b.logger.Info("Flow WebSocket broadcaster started")
	return nil
}

// Stop stops the broadcaster
func (b *FlowWebSocketBroadcaster) Stop(ctx context.Context) error {
	if b.cancel != nil {
		b.cancel()
	}
	
	// Close channels
	close(b.flowEventChan)
	close(b.triggerEventChan)
	close(b.systemEventChan)
	
	// Wait for goroutines to finish
	b.wg.Wait()
	
	b.logger.Info("Flow WebSocket broadcaster stopped")
	return nil
}

// Flow execution event broadcasters

// BroadcastFlowStarted broadcasts a flow execution started event
func (b *FlowWebSocketBroadcaster) BroadcastFlowStarted(tenantID uuid.UUID, data FlowExecutionStartedEvent) {
	event := NewFlowExecutionStartedEvent(tenantID, data)
	b.broadcastFlowEvent(event)
}

// BroadcastFlowCompleted broadcasts a flow execution completed event
func (b *FlowWebSocketBroadcaster) BroadcastFlowCompleted(tenantID uuid.UUID, data FlowExecutionCompletedEvent) {
	event := NewFlowExecutionCompletedEvent(tenantID, data)
	b.broadcastFlowEvent(event)
}

// BroadcastFlowFailed broadcasts a flow execution failed event
func (b *FlowWebSocketBroadcaster) BroadcastFlowFailed(tenantID uuid.UUID, data FlowExecutionFailedEvent) {
	event := NewFlowExecutionFailedEvent(tenantID, data)
	b.broadcastFlowEvent(event)
}

// BroadcastFlowPaused broadcasts a flow execution paused event
func (b *FlowWebSocketBroadcaster) BroadcastFlowPaused(tenantID, executionID, flowID uuid.UUID, flowName string) {
	event := &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeFlowPaused,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id": executionID,
			"flow_id":      flowID,
			"flow_name":    flowName,
			"paused_at":    time.Now(),
		},
	}
	b.broadcastFlowEvent(event)
}

// BroadcastFlowResumed broadcasts a flow execution resumed event
func (b *FlowWebSocketBroadcaster) BroadcastFlowResumed(tenantID, executionID, flowID uuid.UUID, flowName string) {
	event := &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeFlowResumed,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id": executionID,
			"flow_id":      flowID,
			"flow_name":    flowName,
			"resumed_at":   time.Now(),
		},
	}
	b.broadcastFlowEvent(event)
}

// BroadcastFlowCancelled broadcasts a flow execution cancelled event
func (b *FlowWebSocketBroadcaster) BroadcastFlowCancelled(tenantID, executionID, flowID uuid.UUID, flowName string) {
	event := &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeFlowCancelled,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id": executionID,
			"flow_id":      flowID,
			"flow_name":    flowName,
			"cancelled_at": time.Now(),
		},
	}
	b.broadcastFlowEvent(event)
}

// Flow node event broadcasters

// BroadcastNodeStarted broadcasts a flow node started event
func (b *FlowWebSocketBroadcaster) BroadcastNodeStarted(tenantID uuid.UUID, data FlowNodeStartedEvent) {
	event := NewFlowNodeStartedEvent(tenantID, data)
	b.broadcastFlowEvent(event)
}

// BroadcastNodeCompleted broadcasts a flow node completed event
func (b *FlowWebSocketBroadcaster) BroadcastNodeCompleted(tenantID uuid.UUID, data FlowNodeCompletedEvent) {
	event := NewFlowNodeCompletedEvent(tenantID, data)
	b.broadcastFlowEvent(event)
}

// BroadcastNodeFailed broadcasts a flow node failed event
func (b *FlowWebSocketBroadcaster) BroadcastNodeFailed(tenantID uuid.UUID, data FlowNodeFailedEvent) {
	event := &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeNodeFailed,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id":  data.ExecutionID,
			"flow_id":       data.FlowID,
			"node_id":       data.NodeID,
			"node_type":     data.NodeType,
			"node_name":     data.NodeName,
			"error_message": data.ErrorMessage,
			"duration_ms":   data.Duration,
			"retry_count":   data.RetryCount,
			"failed_at":     data.FailedAt,
		},
	}
	b.broadcastFlowEvent(event)
}

// BroadcastNodeSkipped broadcasts a flow node skipped event
func (b *FlowWebSocketBroadcaster) BroadcastNodeSkipped(tenantID, executionID, flowID uuid.UUID, nodeID, nodeType, nodeName, reason string) {
	event := &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeNodeSkipped,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id": executionID,
			"flow_id":      flowID,
			"node_id":      nodeID,
			"node_type":    nodeType,
			"node_name":    nodeName,
			"reason":       reason,
			"skipped_at":   time.Now(),
		},
	}
	b.broadcastFlowEvent(event)
}

// Trigger event broadcasters

// BroadcastTriggerMatched broadcasts a trigger matched event
func (b *FlowWebSocketBroadcaster) BroadcastTriggerMatched(tenantID uuid.UUID, data TriggerMatchedEvent) {
	event := NewTriggerMatchedEvent(tenantID, data)
	b.broadcastTriggerEvent(event)
}

// BroadcastTriggerExecuted broadcasts a trigger executed event
func (b *FlowWebSocketBroadcaster) BroadcastTriggerExecuted(tenantID uuid.UUID, data TriggerExecutedEvent) {
	event := &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeTriggerExecuted,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"trigger_id":    data.TriggerID,
			"trigger_name":  data.TriggerName,
			"trigger_type":  data.TriggerType,
			"flow_id":       data.FlowID,
			"execution_id":  data.ExecutionID,
			"success":       data.Success,
			"error_message": data.ErrorMessage,
			"executed_at":   data.ExecutedAt,
		},
	}
	b.broadcastTriggerEvent(event)
}

// Message event broadcasters

// BroadcastMessageSent broadcasts a message sent event
func (b *FlowWebSocketBroadcaster) BroadcastMessageSent(tenantID uuid.UUID, data MessageSentEvent) {
	event := NewMessageSentEvent(tenantID, data)
	b.broadcastFlowEvent(event)
}

// BroadcastMessageReceived broadcasts a message received event
func (b *FlowWebSocketBroadcaster) BroadcastMessageReceived(tenantID uuid.UUID, data MessageReceivedEvent) {
	event := &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeMessageReceived,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"message_id":      data.MessageID,
			"message_type":    data.MessageType,
			"contact_id":      data.ContactID,
			"conversation_id": data.ConversationID,
			"message_data":    data.MessageData,
			"trigger_count":   data.TriggerCount,
			"received_at":     data.ReceivedAt,
		},
	}
	b.broadcastFlowEvent(event)
}

// BroadcastMessageFailed broadcasts a message failed event
func (b *FlowWebSocketBroadcaster) BroadcastMessageFailed(tenantID, executionID, flowID uuid.UUID, nodeID, messageType, errorMessage string) {
	event := &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeMessageFailed,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id":  executionID,
			"flow_id":       flowID,
			"node_id":       nodeID,
			"message_type":  messageType,
			"error_message": errorMessage,
			"failed_at":     time.Now(),
		},
	}
	b.broadcastFlowEvent(event)
}

// Variable event broadcasters

// BroadcastVariableUpdated broadcasts a variable updated event
func (b *FlowWebSocketBroadcaster) BroadcastVariableUpdated(tenantID uuid.UUID, data VariableUpdatedEvent) {
	event := NewVariableUpdatedEvent(tenantID, data)
	b.broadcastFlowEvent(event)
}

// BroadcastVariableDeleted broadcasts a variable deleted event
func (b *FlowWebSocketBroadcaster) BroadcastVariableDeleted(tenantID, executionID, flowID uuid.UUID, nodeID *string, variable string, oldValue interface{}) {
	event := &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeVariableDeleted,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"execution_id": executionID,
			"flow_id":      flowID,
			"node_id":      nodeID,
			"variable":     variable,
			"old_value":    oldValue,
			"deleted_at":   time.Now(),
		},
	}
	b.broadcastFlowEvent(event)
}

// System event broadcasters

// BroadcastSystemStatus broadcasts a system status event
func (b *FlowWebSocketBroadcaster) BroadcastSystemStatus(tenantID uuid.UUID, data SystemStatusEvent) {
	event := NewSystemStatusEvent(tenantID, data)
	b.broadcastSystemEvent(event)
}

// BroadcastError broadcasts an error event
func (b *FlowWebSocketBroadcaster) BroadcastError(tenantID uuid.UUID, component, message string, details map[string]interface{}) {
	event := &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeError,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"component": component,
			"message":   message,
			"details":   details,
			"timestamp": time.Now(),
		},
	}
	b.broadcastSystemEvent(event)
}

// BroadcastWarning broadcasts a warning event
func (b *FlowWebSocketBroadcaster) BroadcastWarning(tenantID uuid.UUID, component, message string, details map[string]interface{}) {
	event := &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeWarning,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"component": component,
			"message":   message,
			"details":   details,
			"timestamp": time.Now(),
		},
	}
	b.broadcastSystemEvent(event)
}

// BroadcastInfo broadcasts an info event
func (b *FlowWebSocketBroadcaster) BroadcastInfo(tenantID uuid.UUID, component, message string, details map[string]interface{}) {
	event := &WebSocketEvent{
		ID:        uuid.New(),
		Type:      EventTypeInfo,
		Timestamp: time.Now(),
		TenantID:  tenantID,
		Data: map[string]interface{}{
			"component": component,
			"message":   message,
			"details":   details,
			"timestamp": time.Now(),
		},
	}
	b.broadcastSystemEvent(event)
}

// Internal broadcasting methods

func (b *FlowWebSocketBroadcaster) broadcastFlowEvent(event *WebSocketEvent) {
	select {
	case b.flowEventChan <- event:
		// Event queued successfully
	default:
		// Channel is full, drop event or handle overflow
		b.logger.Warn("Flow event channel full, dropping event", "event_type", event.Type, "event_id", event.ID)
	}
}

func (b *FlowWebSocketBroadcaster) broadcastTriggerEvent(event *WebSocketEvent) {
	select {
	case b.triggerEventChan <- event:
		// Event queued successfully
	default:
		// Channel is full, drop event or handle overflow
		b.logger.Warn("Trigger event channel full, dropping event", "event_type", event.Type, "event_id", event.ID)
	}
}

func (b *FlowWebSocketBroadcaster) broadcastSystemEvent(event *WebSocketEvent) {
	select {
	case b.systemEventChan <- event:
		// Event queued successfully
	default:
		// Channel is full, drop event or handle overflow
		b.logger.Warn("System event channel full, dropping event", "event_type", event.Type, "event_id", event.ID)
	}
}

// Event processing goroutines

func (b *FlowWebSocketBroadcaster) processFlowEvents() {
	defer b.wg.Done()
	
	for {
		select {
		case event, ok := <-b.flowEventChan:
			if !ok {
				b.logger.Debug("Flow event channel closed")
				return
			}
			b.processEvent(event, "flows")
			
		case <-b.ctx.Done():
			b.logger.Debug("Flow event processor context cancelled")
			return
		}
	}
}

func (b *FlowWebSocketBroadcaster) processTriggerEvents() {
	defer b.wg.Done()
	
	for {
		select {
		case event, ok := <-b.triggerEventChan:
			if !ok {
				b.logger.Debug("Trigger event channel closed")
				return
			}
			b.processEvent(event, "triggers")
			
		case <-b.ctx.Done():
			b.logger.Debug("Trigger event processor context cancelled")
			return
		}
	}
}

func (b *FlowWebSocketBroadcaster) processSystemEvents() {
	defer b.wg.Done()
	
	for {
		select {
		case event, ok := <-b.systemEventChan:
			if !ok {
				b.logger.Debug("System event channel closed")
				return
			}
			b.processEvent(event, "system")
			
		case <-b.ctx.Done():
			b.logger.Debug("System event processor context cancelled")
			return
		}
	}
}

func (b *FlowWebSocketBroadcaster) processEvent(event *WebSocketEvent, category string) {
	// Serialize event to JSON
	eventJSON, err := json.Marshal(event)
	if err != nil {
		b.logger.Error("Failed to serialize WebSocket event", 
			"error", err, 
			"event_type", event.Type, 
			"event_id", event.ID)
		return
	}
	
	// Create WebSocket message
	wsMessage := &websocket.Message{
		Type: string(event.Type),
		Data: eventJSON,
	}
	
	// Broadcast to tenant
	if err := b.wsService.BroadcastToTenant(event.TenantID, wsMessage); err != nil {
		b.logger.Error("Failed to broadcast WebSocket event", 
			"error", err, 
			"event_type", event.Type, 
			"event_id", event.ID,
			"tenant_id", event.TenantID)
		return
	}
	
	b.logger.Debug("WebSocket event broadcasted", 
		"category", category,
		"event_type", event.Type, 
		"event_id", event.ID,
		"tenant_id", event.TenantID)
}

// GetStats returns broadcaster statistics
func (b *FlowWebSocketBroadcaster) GetStats() map[string]interface{} {
	return map[string]interface{}{
		"flow_event_queue_size":    len(b.flowEventChan),
		"trigger_event_queue_size": len(b.triggerEventChan),
		"system_event_queue_size":  len(b.systemEventChan),
		"buffer_size":              b.bufferSize,
	}
}