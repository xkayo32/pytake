package nodes

import (
	"context"
	"fmt"

	"github.com/pytake/pytake-go/internal/flow/engine"
)

// BaseNode provides common functionality for all node types
type BaseNode struct {
	ID          string
	Name        string
	Description string
	NodeType    engine.NodeType
	Config      map[string]interface{}
	NextNodes   []string
}

// NewBaseNode creates a new base node
func NewBaseNode(nodeType engine.NodeType, config map[string]interface{}) *BaseNode {
	node := &BaseNode{
		NodeType:  nodeType,
		Config:    config,
		NextNodes: []string{},
	}
	
	// Extract common fields from config
	if id, ok := config["id"].(string); ok {
		node.ID = id
	}
	if name, ok := config["name"].(string); ok {
		node.Name = name
	}
	if desc, ok := config["description"].(string); ok {
		node.Description = desc
	}
	if nextNodes, ok := config["next_nodes"].([]interface{}); ok {
		for _, next := range nextNodes {
			if nextStr, ok := next.(string); ok {
				node.NextNodes = append(node.NextNodes, nextStr)
			}
		}
	}
	
	return node
}

// GetID returns the node ID
func (b *BaseNode) GetID() string {
	return b.ID
}

// GetType returns the node type
func (b *BaseNode) GetType() engine.NodeType {
	return b.NodeType
}

// GetName returns the node name
func (b *BaseNode) GetName() string {
	return b.Name
}

// GetDescription returns the node description
func (b *BaseNode) GetDescription() string {
	return b.Description
}

// GetNextNodes returns the list of next node IDs
func (b *BaseNode) GetNextNodes() []string {
	return b.NextNodes
}

// GetConfig returns the node configuration
func (b *BaseNode) GetConfig() map[string]interface{} {
	return b.Config
}

// SetConfig updates the node configuration
func (b *BaseNode) SetConfig(config map[string]interface{}) error {
	b.Config = config
	
	// Update common fields
	if id, ok := config["id"].(string); ok {
		b.ID = id
	}
	if name, ok := config["name"].(string); ok {
		b.Name = name
	}
	if desc, ok := config["description"].(string); ok {
		b.Description = desc
	}
	
	return nil
}

// Validate performs basic validation
func (b *BaseNode) Validate() error {
	if b.ID == "" {
		return engine.NewValidationError("node ID cannot be empty")
	}
	if b.NodeType == "" {
		return engine.NewValidationError("node type cannot be empty")
	}
	return nil
}

// Execute is a placeholder that should be overridden by specific node types
func (b *BaseNode) Execute(ctx context.Context, execCtx *engine.ExecutionContext) (*engine.NodeResult, error) {
	return nil, fmt.Errorf("execute method must be implemented by specific node type")
}

// Helper methods for node implementations

// GetConfigString extracts a string value from config with default
func (b *BaseNode) GetConfigString(key string, defaultValue string) string {
	if value, ok := b.Config[key].(string); ok {
		return value
	}
	return defaultValue
}

// GetConfigInt extracts an int value from config with default
func (b *BaseNode) GetConfigInt(key string, defaultValue int) int {
	if value, ok := b.Config[key].(float64); ok {
		return int(value)
	}
	if value, ok := b.Config[key].(int); ok {
		return value
	}
	return defaultValue
}

// GetConfigBool extracts a bool value from config with default
func (b *BaseNode) GetConfigBool(key string, defaultValue bool) bool {
	if value, ok := b.Config[key].(bool); ok {
		return value
	}
	return defaultValue
}

// GetConfigFloat extracts a float64 value from config with default
func (b *BaseNode) GetConfigFloat(key string, defaultValue float64) float64 {
	if value, ok := b.Config[key].(float64); ok {
		return value
	}
	return defaultValue
}

// GetConfigMap extracts a map value from config
func (b *BaseNode) GetConfigMap(key string) map[string]interface{} {
	if value, ok := b.Config[key].(map[string]interface{}); ok {
		return value
	}
	return map[string]interface{}{}
}

// GetConfigArray extracts an array value from config
func (b *BaseNode) GetConfigArray(key string) []interface{} {
	if value, ok := b.Config[key].([]interface{}); ok {
		return value
	}
	return []interface{}{}
}

// SetVariable is a helper to set a variable in the execution context
func (b *BaseNode) SetVariable(execCtx *engine.ExecutionContext, name string, value interface{}) {
	if execCtx.Variables == nil {
		execCtx.Variables = make(map[string]interface{})
	}
	execCtx.Variables[name] = value
}

// GetVariable is a helper to get a variable from the execution context
func (b *BaseNode) GetVariable(execCtx *engine.ExecutionContext, name string) (interface{}, bool) {
	if execCtx.Variables == nil {
		return nil, false
	}
	value, exists := execCtx.Variables[name]
	return value, exists
}

// InterpolateString replaces variables in a string template
func (b *BaseNode) InterpolateString(template string, execCtx *engine.ExecutionContext) string {
	// Simple variable interpolation - replace {{variable_name}} with actual values
	result := template
	
	if execCtx.Variables != nil {
		for varName, varValue := range execCtx.Variables {
			placeholder := fmt.Sprintf("{{%s}}", varName)
			replacement := fmt.Sprintf("%v", varValue)
			result = replaceAll(result, placeholder, replacement)
		}
	}
	
	// Also support some built-in variables
	builtInVars := map[string]string{
		"{{contact_id}}":      formatUUID(execCtx.ContactID),
		"{{conversation_id}}": formatUUID(execCtx.ConversationID),
		"{{execution_id}}":    execCtx.ExecutionID.String(),
		"{{flow_id}}":         execCtx.FlowID.String(),
		"{{tenant_id}}":       execCtx.TenantID.String(),
	}
	
	for placeholder, replacement := range builtInVars {
		result = replaceAll(result, placeholder, replacement)
	}
	
	return result
}

// GetNextNodeID determines the next node based on conditions or default
func (b *BaseNode) GetNextNodeID(conditions []NodeCondition, defaultNodeID string) string {
	// Evaluate conditions in order and return first matching node
	for _, condition := range conditions {
		if condition.Evaluate() {
			return condition.NextNodeID
		}
	}
	
	// Return default next node
	if defaultNodeID != "" {
		return defaultNodeID
	}
	
	// Return first next node if available
	if len(b.NextNodes) > 0 {
		return b.NextNodes[0]
	}
	
	return ""
}

// NodeCondition represents a condition for node transitions
type NodeCondition struct {
	Expression string
	NextNodeID string
	Variables  map[string]interface{}
}

// Evaluate evaluates the condition expression
func (nc *NodeCondition) Evaluate() bool {
	// Simple condition evaluation - can be extended
	// For now, just return true if expression is not empty
	return nc.Expression != ""
}

// LogExecution logs node execution details
func (b *BaseNode) LogExecution(execCtx *engine.ExecutionContext, message string, fields ...interface{}) {
	if execCtx.Services != nil && execCtx.Logger != nil {
		logger := execCtx.Logger.With("node_id", b.ID, "node_type", b.NodeType)
		logger.Info(message, fields...)
	}
}

// LogError logs node execution errors
func (b *BaseNode) LogError(execCtx *engine.ExecutionContext, message string, err error, fields ...interface{}) {
	if execCtx.Services != nil && execCtx.Logger != nil {
		logger := execCtx.Logger.With("node_id", b.ID, "node_type", b.NodeType, "error", err)
		logger.Error(message, fields...)
	}
}

// Helper functions

func replaceAll(s, old, new string) string {
	// Simple string replacement - can use strings.ReplaceAll in Go 1.12+
	for i := 0; i < len(s); i++ {
		if i+len(old) <= len(s) && s[i:i+len(old)] == old {
			s = s[:i] + new + s[i+len(old):]
			i += len(new) - 1
		}
	}
	return s
}

func formatUUID(uuid interface{}) string {
	if uuid == nil {
		return ""
	}
	return fmt.Sprintf("%v", uuid)
}

// ValidationResult represents the result of node validation
type ValidationResult struct {
	IsValid bool
	Errors  []string
}

// AddError adds an error to the validation result
func (vr *ValidationResult) AddError(message string) {
	vr.IsValid = false
	vr.Errors = append(vr.Errors, message)
}

// ValidateRequired validates that a required field is present in config
func ValidateRequired(config map[string]interface{}, field string) *ValidationResult {
	result := &ValidationResult{IsValid: true}
	
	if value, exists := config[field]; !exists || value == nil {
		result.AddError(fmt.Sprintf("required field '%s' is missing", field))
	}
	
	return result
}

// ValidateStringField validates a string field in config
func ValidateStringField(config map[string]interface{}, field string, required bool, minLen, maxLen int) *ValidationResult {
	result := &ValidationResult{IsValid: true}
	
	value, exists := config[field]
	if !exists {
		if required {
			result.AddError(fmt.Sprintf("required field '%s' is missing", field))
		}
		return result
	}
	
	strValue, ok := value.(string)
	if !ok {
		result.AddError(fmt.Sprintf("field '%s' must be a string", field))
		return result
	}
	
	if minLen > 0 && len(strValue) < minLen {
		result.AddError(fmt.Sprintf("field '%s' must be at least %d characters", field, minLen))
	}
	
	if maxLen > 0 && len(strValue) > maxLen {
		result.AddError(fmt.Sprintf("field '%s' must be at most %d characters", field, maxLen))
	}
	
	return result
}

// ValidateIntField validates an integer field in config
func ValidateIntField(config map[string]interface{}, field string, required bool, min, max int) *ValidationResult {
	result := &ValidationResult{IsValid: true}
	
	value, exists := config[field]
	if !exists {
		if required {
			result.AddError(fmt.Sprintf("required field '%s' is missing", field))
		}
		return result
	}
	
	var intValue int
	switch v := value.(type) {
	case int:
		intValue = v
	case float64:
		intValue = int(v)
	default:
		result.AddError(fmt.Sprintf("field '%s' must be an integer", field))
		return result
	}
	
	if min != 0 && intValue < min {
		result.AddError(fmt.Sprintf("field '%s' must be at least %d", field, min))
	}
	
	if max != 0 && intValue > max {
		result.AddError(fmt.Sprintf("field '%s' must be at most %d", field, max))
	}
	
	return result
}