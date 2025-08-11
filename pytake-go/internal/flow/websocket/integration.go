package websocket

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/flow/engine"
)

// FlowWebSocketIntegration integrates flow execution with WebSocket broadcasting
type FlowWebSocketIntegration struct {
	broadcaster *FlowWebSocketBroadcaster
	logger      engine.Logger
}

// NewFlowWebSocketIntegration creates a new flow WebSocket integration
func NewFlowWebSocketIntegration(broadcaster *FlowWebSocketBroadcaster, logger engine.Logger) *FlowWebSocketIntegration {
	return &FlowWebSocketIntegration{
		broadcaster: broadcaster,
		logger:      logger,
	}
}

// Flow Execution Hooks - these methods should be called from the flow engine

// OnFlowExecutionStarted is called when a flow execution starts
func (i *FlowWebSocketIntegration) OnFlowExecutionStarted(ctx *engine.ExecutionContext) {
	data := FlowExecutionStartedEvent{
		ExecutionID:    ctx.ExecutionID,
		FlowID:         ctx.FlowID,
		FlowName:       i.getFlowName(ctx),
		ContactID:      ctx.ContactID,
		ConversationID: ctx.ConversationID,
		TriggerType:    ctx.TriggerType,
		Variables:      ctx.Variables,
		StartedAt:      ctx.StartTime,
	}
	
	i.broadcaster.BroadcastFlowStarted(ctx.TenantID, data)
}

// OnFlowExecutionCompleted is called when a flow execution completes successfully
func (i *FlowWebSocketIntegration) OnFlowExecutionCompleted(ctx *engine.ExecutionContext, result *engine.ExecutionResult) {
	data := FlowExecutionCompletedEvent{
		ExecutionID:    ctx.ExecutionID,
		FlowID:         ctx.FlowID,
		FlowName:       i.getFlowName(ctx),
		Status:         string(result.Status),
		Duration:       time.Since(ctx.StartTime).Milliseconds(),
		FinalVariables: result.FinalVariables,
		NodesExecuted:  i.countNodesExecuted(result),
		MessagesSent:   i.countMessagesSent(result),
		CompletedAt:    time.Now(),
	}
	
	i.broadcaster.BroadcastFlowCompleted(ctx.TenantID, data)
}

// OnFlowExecutionFailed is called when a flow execution fails
func (i *FlowWebSocketIntegration) OnFlowExecutionFailed(ctx *engine.ExecutionContext, err error, errorNodeID *string) {
	data := FlowExecutionFailedEvent{
		ExecutionID:   ctx.ExecutionID,
		FlowID:        ctx.FlowID,
		FlowName:      i.getFlowName(ctx),
		ErrorMessage:  err.Error(),
		ErrorNodeID:   errorNodeID,
		ErrorNodeName: i.getNodeName(ctx, errorNodeID),
		Duration:      time.Since(ctx.StartTime).Milliseconds(),
		FailedAt:      time.Now(),
	}
	
	i.broadcaster.BroadcastFlowFailed(ctx.TenantID, data)
}

// OnFlowExecutionPaused is called when a flow execution is paused
func (i *FlowWebSocketIntegration) OnFlowExecutionPaused(ctx *engine.ExecutionContext) {
	i.broadcaster.BroadcastFlowPaused(
		ctx.TenantID,
		ctx.ExecutionID,
		ctx.FlowID,
		i.getFlowName(ctx),
	)
}

// OnFlowExecutionResumed is called when a flow execution is resumed
func (i *FlowWebSocketIntegration) OnFlowExecutionResumed(ctx *engine.ExecutionContext) {
	i.broadcaster.BroadcastFlowResumed(
		ctx.TenantID,
		ctx.ExecutionID,
		ctx.FlowID,
		i.getFlowName(ctx),
	)
}

// OnFlowExecutionCancelled is called when a flow execution is cancelled
func (i *FlowWebSocketIntegration) OnFlowExecutionCancelled(ctx *engine.ExecutionContext) {
	i.broadcaster.BroadcastFlowCancelled(
		ctx.TenantID,
		ctx.ExecutionID,
		ctx.FlowID,
		i.getFlowName(ctx),
	)
}

// Flow Node Hooks

// OnNodeExecutionStarted is called when a node execution starts
func (i *FlowWebSocketIntegration) OnNodeExecutionStarted(ctx *engine.ExecutionContext, node engine.FlowNode) {
	data := FlowNodeStartedEvent{
		ExecutionID: ctx.ExecutionID,
		FlowID:      ctx.FlowID,
		NodeID:      node.GetID(),
		NodeType:    string(node.GetType()),
		NodeName:    i.getNodeNameFromNode(node),
		Variables:   ctx.Variables,
		StartedAt:   time.Now(),
	}
	
	i.broadcaster.BroadcastNodeStarted(ctx.TenantID, data)
}

// OnNodeExecutionCompleted is called when a node execution completes
func (i *FlowWebSocketIntegration) OnNodeExecutionCompleted(ctx *engine.ExecutionContext, node engine.FlowNode, result *engine.NodeResult, duration time.Duration) {
	data := FlowNodeCompletedEvent{
		ExecutionID: ctx.ExecutionID,
		FlowID:      ctx.FlowID,
		NodeID:      node.GetID(),
		NodeType:    string(node.GetType()),
		NodeName:    i.getNodeNameFromNode(node),
		Duration:    duration.Milliseconds(),
		Variables:   ctx.Variables,
		Output:      result.Data,
		NextNodes:   result.NextNodes,
		CompletedAt: time.Now(),
	}
	
	i.broadcaster.BroadcastNodeCompleted(ctx.TenantID, data)
}

// OnNodeExecutionFailed is called when a node execution fails
func (i *FlowWebSocketIntegration) OnNodeExecutionFailed(ctx *engine.ExecutionContext, node engine.FlowNode, err error, duration time.Duration, retryCount int) {
	data := FlowNodeFailedEvent{
		ExecutionID:  ctx.ExecutionID,
		FlowID:       ctx.FlowID,
		NodeID:       node.GetID(),
		NodeType:     string(node.GetType()),
		NodeName:     i.getNodeNameFromNode(node),
		ErrorMessage: err.Error(),
		Duration:     duration.Milliseconds(),
		RetryCount:   retryCount,
		FailedAt:     time.Now(),
	}
	
	i.broadcaster.BroadcastNodeFailed(ctx.TenantID, data)
}

// OnNodeExecutionSkipped is called when a node execution is skipped
func (i *FlowWebSocketIntegration) OnNodeExecutionSkipped(ctx *engine.ExecutionContext, node engine.FlowNode, reason string) {
	i.broadcaster.BroadcastNodeSkipped(
		ctx.TenantID,
		ctx.ExecutionID,
		ctx.FlowID,
		node.GetID(),
		string(node.GetType()),
		i.getNodeNameFromNode(node),
		reason,
	)
}

// Message Hooks

// OnMessageSent is called when a message is sent from a flow
func (i *FlowWebSocketIntegration) OnMessageSent(ctx *engine.ExecutionContext, nodeID, messageID, messageType string, messageData map[string]interface{}) {
	if ctx.ContactID == nil || ctx.ConversationID == nil {
		i.logger.Warn("Cannot broadcast message sent event: missing contact or conversation ID")
		return
	}
	
	data := MessageSentEvent{
		ExecutionID:    ctx.ExecutionID,
		FlowID:         ctx.FlowID,
		NodeID:         nodeID,
		MessageID:      messageID,
		MessageType:    messageType,
		ContactID:      *ctx.ContactID,
		ConversationID: *ctx.ConversationID,
		MessageData:    messageData,
		SentAt:         time.Now(),
	}
	
	i.broadcaster.BroadcastMessageSent(ctx.TenantID, data)
}

// OnMessageReceived is called when a message is received (from trigger system)
func (i *FlowWebSocketIntegration) OnMessageReceived(tenantID, contactID, conversationID uuid.UUID, messageID, messageType string, messageData map[string]interface{}, triggerCount int) {
	data := MessageReceivedEvent{
		MessageID:      messageID,
		MessageType:    messageType,
		ContactID:      contactID,
		ConversationID: conversationID,
		MessageData:    messageData,
		TriggerCount:   triggerCount,
		ReceivedAt:     time.Now(),
	}
	
	i.broadcaster.BroadcastMessageReceived(tenantID, data)
}

// OnMessageFailed is called when a message fails to send
func (i *FlowWebSocketIntegration) OnMessageFailed(ctx *engine.ExecutionContext, nodeID, messageType string, err error) {
	i.broadcaster.BroadcastMessageFailed(
		ctx.TenantID,
		ctx.ExecutionID,
		ctx.FlowID,
		nodeID,
		messageType,
		err.Error(),
	)
}

// Variable Hooks

// OnVariableUpdated is called when a variable is updated during flow execution
func (i *FlowWebSocketIntegration) OnVariableUpdated(ctx *engine.ExecutionContext, nodeID *string, variable string, oldValue, newValue interface{}) {
	data := VariableUpdatedEvent{
		ExecutionID: ctx.ExecutionID,
		FlowID:      ctx.FlowID,
		NodeID:      nodeID,
		Variable:    variable,
		OldValue:    oldValue,
		NewValue:    newValue,
		UpdatedAt:   time.Now(),
	}
	
	i.broadcaster.BroadcastVariableUpdated(ctx.TenantID, data)
}

// OnVariableDeleted is called when a variable is deleted during flow execution
func (i *FlowWebSocketIntegration) OnVariableDeleted(ctx *engine.ExecutionContext, nodeID *string, variable string, oldValue interface{}) {
	i.broadcaster.BroadcastVariableDeleted(
		ctx.TenantID,
		ctx.ExecutionID,
		ctx.FlowID,
		nodeID,
		variable,
		oldValue,
	)
}

// Trigger Hooks - these methods should be called from the trigger system

// OnTriggerMatched is called when a trigger matches an event
func (i *FlowWebSocketIntegration) OnTriggerMatched(tenantID, triggerID, flowID, eventID uuid.UUID, triggerName, triggerType, flowName string, eventData, variables map[string]interface{}, priority int) {
	data := TriggerMatchedEvent{
		TriggerID:   triggerID,
		TriggerName: triggerName,
		TriggerType: triggerType,
		FlowID:      flowID,
		FlowName:    flowName,
		EventID:     eventID,
		EventData:   eventData,
		Variables:   variables,
		Priority:    priority,
		MatchedAt:   time.Now(),
	}
	
	i.broadcaster.BroadcastTriggerMatched(tenantID, data)
}

// OnTriggerExecuted is called when a trigger executes a flow
func (i *FlowWebSocketIntegration) OnTriggerExecuted(tenantID, triggerID, flowID, executionID uuid.UUID, triggerName, triggerType string, success bool, errorMessage *string) {
	data := TriggerExecutedEvent{
		TriggerID:    triggerID,
		TriggerName:  triggerName,
		TriggerType:  triggerType,
		FlowID:       flowID,
		ExecutionID:  executionID,
		Success:      success,
		ErrorMessage: errorMessage,
		ExecutedAt:   time.Now(),
	}
	
	i.broadcaster.BroadcastTriggerExecuted(tenantID, data)
}

// System Hooks

// OnSystemError is called when a system error occurs
func (i *FlowWebSocketIntegration) OnSystemError(tenantID uuid.UUID, component, message string, details map[string]interface{}) {
	i.broadcaster.BroadcastError(tenantID, component, message, details)
}

// OnSystemWarning is called when a system warning occurs
func (i *FlowWebSocketIntegration) OnSystemWarning(tenantID uuid.UUID, component, message string, details map[string]interface{}) {
	i.broadcaster.BroadcastWarning(tenantID, component, message, details)
}

// OnSystemInfo is called when a system info event occurs
func (i *FlowWebSocketIntegration) OnSystemInfo(tenantID uuid.UUID, component, message string, details map[string]interface{}) {
	i.broadcaster.BroadcastInfo(tenantID, component, message, details)
}

// OnSystemStatusChange is called when a system component status changes
func (i *FlowWebSocketIntegration) OnSystemStatusChange(tenantID uuid.UUID, component, status, message string, details map[string]interface{}) {
	data := SystemStatusEvent{
		Component: component,
		Status:    status,
		Message:   message,
		Details:   details,
		Timestamp: time.Now(),
	}
	
	i.broadcaster.BroadcastSystemStatus(tenantID, data)
}

// Helper methods

func (i *FlowWebSocketIntegration) getFlowName(ctx *engine.ExecutionContext) string {
	if ctx.FlowDefinition != nil && ctx.FlowDefinition.Name != "" {
		return ctx.FlowDefinition.Name
	}
	return "Unnamed Flow"
}

func (i *FlowWebSocketIntegration) getNodeName(ctx *engine.ExecutionContext, nodeID *string) *string {
	if nodeID == nil || ctx.FlowDefinition == nil {
		return nil
	}
	
	for _, node := range ctx.FlowDefinition.Nodes {
		if node.ID == *nodeID {
			if node.Name != "" {
				return &node.Name
			}
			break
		}
	}
	
	return nodeID // Return node ID as fallback
}

func (i *FlowWebSocketIntegration) getNodeNameFromNode(node engine.FlowNode) string {
	// This would need to be implemented based on how nodes store their names
	// For now, return the node ID as a fallback
	return node.GetID()
}

func (i *FlowWebSocketIntegration) countNodesExecuted(result *engine.ExecutionResult) int {
	// This would need to be tracked during execution
	// For now, return 0 as a placeholder
	return 0
}

func (i *FlowWebSocketIntegration) countMessagesSent(result *engine.ExecutionResult) int {
	// This would need to be tracked during execution
	// For now, return 0 as a placeholder
	return 0
}

// Statistics

// GetIntegrationStats returns integration statistics
func (i *FlowWebSocketIntegration) GetIntegrationStats() map[string]interface{} {
	stats := map[string]interface{}{
		"broadcaster_stats": i.broadcaster.GetStats(),
	}
	
	return stats
}