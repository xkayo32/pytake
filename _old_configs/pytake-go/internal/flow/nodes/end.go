package nodes

import (
	"context"

	"github.com/pytake/pytake-go/internal/flow/engine"
)

// EndNode represents the end point of a flow
type EndNode struct {
	*BaseNode
}

// EndType defines different types of flow endings
type EndType string

const (
	EndTypeSuccess   EndType = "success"
	EndTypeFailure   EndType = "failure"
	EndTypeCompleted EndType = "completed"
	EndTypeCancelled EndType = "cancelled"
)

// EndConfig represents the configuration for an end node
type EndConfig struct {
	EndType     EndType                `json:"end_type"`
	Message     string                 `json:"message"`
	Variables   map[string]interface{} `json:"variables,omitempty"`
	Actions     []EndAction            `json:"actions,omitempty"`
	SaveResults bool                   `json:"save_results"`
}

// EndAction represents an action to perform when flow ends
type EndAction struct {
	Type   string                 `json:"type"`   // "save_variable", "send_webhook", "update_contact"
	Config map[string]interface{} `json:"config"`
}

// NewEndNode creates a new end node
func NewEndNode(config map[string]interface{}) (engine.FlowNode, error) {
	base := NewBaseNode(engine.NodeTypeEnd, config)
	node := &EndNode{
		BaseNode: base,
	}
	
	if err := node.Validate(); err != nil {
		return nil, err
	}
	
	return node, nil
}

// Execute executes the end node
func (n *EndNode) Execute(ctx context.Context, execCtx *engine.ExecutionContext) (*engine.NodeResult, error) {
	n.LogExecution(execCtx, "Executing end node")
	
	// Parse end configuration
	endConfig, err := n.parseEndConfig()
	if err != nil {
		n.LogError(execCtx, "Failed to parse end config", err)
		return nil, engine.NewNodeError(n.ID, "invalid end configuration: "+err.Error())
	}
	
	// Interpolate message
	message := n.InterpolateString(endConfig.Message, execCtx)
	
	n.LogExecution(execCtx, "Flow ending", 
		"end_type", string(endConfig.EndType),
		"message", message)
	
	// Execute end actions
	if err := n.executeEndActions(ctx, endConfig.Actions, execCtx); err != nil {
		n.LogError(execCtx, "Failed to execute end actions", err)
		// Don't return error, just log it - flow should still end
	}
	
	// Prepare final variables
	finalVariables := make(map[string]interface{})
	
	// Copy execution variables
	if execCtx.Variables != nil {
		for key, value := range execCtx.Variables {
			finalVariables[key] = value
		}
	}
	
	// Add end-specific variables
	if endConfig.Variables != nil {
		for key, value := range endConfig.Variables {
			// Interpolate string values
			if strValue, ok := value.(string); ok {
				finalVariables[key] = n.InterpolateString(strValue, execCtx)
			} else {
				finalVariables[key] = value
			}
		}
	}
	
	// Add flow completion metadata
	finalVariables["flow_end_type"] = string(endConfig.EndType)
	finalVariables["flow_end_message"] = message
	finalVariables["flow_completed_at"] = execCtx.LastActivity
	finalVariables["flow_total_steps"] = execCtx.ExecutionStep
	
	// Save results if configured
	if endConfig.SaveResults {
		if err := n.saveFlowResults(ctx, execCtx, finalVariables); err != nil {
			n.LogError(execCtx, "Failed to save flow results", err)
		}
	}
	
	n.LogExecution(execCtx, "Flow ended successfully", 
		"end_type", string(endConfig.EndType),
		"total_steps", execCtx.ExecutionStep)
	
	// Return result with no next node (flow ends here)
	return &engine.NodeResult{
		Success:    endConfig.EndType != EndTypeFailure,
		NextNodeID: "", // Empty means flow ends
		Variables:  finalVariables,
		Message:    message,
		Metadata: map[string]interface{}{
			"end_type":         string(endConfig.EndType),
			"actions_executed": len(endConfig.Actions),
			"results_saved":    endConfig.SaveResults,
		},
	}, nil
}

// Validate validates the end node configuration
func (n *EndNode) Validate() error {
	if err := n.BaseNode.Validate(); err != nil {
		return err
	}
	
	// Validate end type
	endType := n.GetConfigString("end_type", "success")
	if !n.isValidEndType(endType) {
		return engine.NewValidationError("invalid end_type: " + endType)
	}
	
	// Validate actions if present
	if actions := n.GetConfigArray("actions"); len(actions) > 0 {
		for i, action := range actions {
			actionMap, ok := action.(map[string]interface{})
			if !ok {
				return engine.NewValidationError("action " + string(rune(i)) + " must be an object")
			}
			
			actionType, ok := actionMap["type"].(string)
			if !ok || actionType == "" {
				return engine.NewValidationError("action " + string(rune(i)) + " must have a type")
			}
			
			if !n.isValidActionType(actionType) {
				return engine.NewValidationError("invalid action type: " + actionType)
			}
		}
	}
	
	return nil
}

// parseEndConfig parses the node configuration into EndConfig
func (n *EndNode) parseEndConfig() (*EndConfig, error) {
	config := &EndConfig{
		EndType:     EndType(n.GetConfigString("end_type", "success")),
		Message:     n.GetConfigString("message", "Flow completed successfully"),
		Variables:   n.GetConfigMap("variables"),
		SaveResults: n.GetConfigBool("save_results", true),
	}
	
	// Parse actions
	if actionsArray := n.GetConfigArray("actions"); len(actionsArray) > 0 {
		for _, action := range actionsArray {
			if actionMap, ok := action.(map[string]interface{}); ok {
				endAction := EndAction{
					Type:   n.getStringFromMap(actionMap, "type"),
					Config: n.getMapFromMap(actionMap, "config"),
				}
				config.Actions = append(config.Actions, endAction)
			}
		}
	}
	
	return config, nil
}

// executeEndActions executes all configured end actions
func (n *EndNode) executeEndActions(ctx context.Context, actions []EndAction, execCtx *engine.ExecutionContext) error {
	for _, action := range actions {
		if err := n.executeEndAction(ctx, &action, execCtx); err != nil {
			n.LogError(execCtx, "Failed to execute end action", err, "action_type", action.Type)
			// Continue with other actions even if one fails
		}
	}
	return nil
}

// executeEndAction executes a single end action
func (n *EndNode) executeEndAction(ctx context.Context, action *EndAction, execCtx *engine.ExecutionContext) error {
	switch action.Type {
	case "save_variable":
		return n.executeSaveVariableAction(action, execCtx)
		
	case "send_webhook":
		return n.executeSendWebhookAction(ctx, action, execCtx)
		
	case "update_contact":
		return n.executeUpdateContactAction(ctx, action, execCtx)
		
	case "send_notification":
		return n.executeSendNotificationAction(ctx, action, execCtx)
		
	default:
		return engine.NewValidationError("unsupported action type: " + action.Type)
	}
}

// executeSaveVariableAction saves a variable to the execution context
func (n *EndNode) executeSaveVariableAction(action *EndAction, execCtx *engine.ExecutionContext) error {
	variableName := n.getStringFromMap(action.Config, "name")
	variableValue := action.Config["value"]
	
	if variableName == "" {
		return engine.NewValidationError("save_variable action requires a name")
	}
	
	// Interpolate string values
	if strValue, ok := variableValue.(string); ok {
		variableValue = n.InterpolateString(strValue, execCtx)
	}
	
	n.SetVariable(execCtx, variableName, variableValue)
	
	n.LogExecution(execCtx, "Variable saved", "name", variableName, "value", variableValue)
	return nil
}

// executeSendWebhookAction sends a webhook notification
func (n *EndNode) executeSendWebhookAction(ctx context.Context, action *EndAction, execCtx *engine.ExecutionContext) error {
	// This would integrate with the webhook service
	// For now, just log the action
	n.LogExecution(execCtx, "Webhook action executed", "config", action.Config)
	return nil
}

// executeUpdateContactAction updates contact information
func (n *EndNode) executeUpdateContactAction(ctx context.Context, action *EndAction, execCtx *engine.ExecutionContext) error {
	if execCtx.ContactID == nil {
		return engine.NewValidationError("no contact ID available for update")
	}
	
	updates := make(map[string]interface{})
	if updateMap := n.getMapFromMap(action.Config, "updates"); len(updateMap) > 0 {
		for key, value := range updateMap {
			// Interpolate string values
			if strValue, ok := value.(string); ok {
				updates[key] = n.InterpolateString(strValue, execCtx)
			} else {
				updates[key] = value
			}
		}
	}
	
	if len(updates) > 0 && execCtx.Services.ContactService != nil {
		if err := execCtx.Services.ContactService.UpdateContact(ctx, *execCtx.ContactID, updates); err != nil {
			return err
		}
		n.LogExecution(execCtx, "Contact updated", "contact_id", *execCtx.ContactID, "updates", updates)
	}
	
	return nil
}

// executeSendNotificationAction sends a notification
func (n *EndNode) executeSendNotificationAction(ctx context.Context, action *EndAction, execCtx *engine.ExecutionContext) error {
	// This would integrate with the notification service
	// For now, just log the action
	n.LogExecution(execCtx, "Notification action executed", "config", action.Config)
	return nil
}

// saveFlowResults saves the flow results for analytics
func (n *EndNode) saveFlowResults(ctx context.Context, execCtx *engine.ExecutionContext, finalVariables map[string]interface{}) error {
	if execCtx.Services.AnalyticsCollector == nil {
		return nil
	}
	
	data := map[string]interface{}{
		"execution_id":     execCtx.ExecutionID,
		"flow_id":          execCtx.FlowID,
		"tenant_id":        execCtx.TenantID,
		"contact_id":       execCtx.ContactID,
		"conversation_id":  execCtx.ConversationID,
		"final_variables":  finalVariables,
		"total_steps":      execCtx.ExecutionStep,
		"end_node_id":      n.ID,
		"completed_at":     execCtx.LastActivity,
	}
	
	return execCtx.Services.AnalyticsCollector.RecordExecution(ctx, data)
}

// isValidEndType checks if the end type is valid
func (n *EndNode) isValidEndType(endType string) bool {
	validTypes := []string{
		string(EndTypeSuccess),
		string(EndTypeFailure),
		string(EndTypeCompleted),
		string(EndTypeCancelled),
	}
	
	for _, validType := range validTypes {
		if endType == validType {
			return true
		}
	}
	
	return false
}

// isValidActionType checks if the action type is valid
func (n *EndNode) isValidActionType(actionType string) bool {
	validTypes := []string{
		"save_variable",
		"send_webhook",
		"update_contact",
		"send_notification",
	}
	
	for _, validType := range validTypes {
		if actionType == validType {
			return true
		}
	}
	
	return false
}

// Helper methods for extracting values from maps
func (n *EndNode) getStringFromMap(m map[string]interface{}, key string) string {
	if value, ok := m[key]; ok {
		if str, ok := value.(string); ok {
			return str
		}
	}
	return ""
}

func (n *EndNode) getMapFromMap(m map[string]interface{}, key string) map[string]interface{} {
	if value, ok := m[key]; ok {
		if mapValue, ok := value.(map[string]interface{}); ok {
			return mapValue
		}
	}
	return map[string]interface{}{}
}