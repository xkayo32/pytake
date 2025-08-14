package nodes

import (
	"context"
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/pytake/pytake-go/internal/flow/engine"
)

// ConditionNode evaluates conditions and determines flow path
type ConditionNode struct {
	*BaseNode
}

// ConditionConfig represents the configuration for a condition node
type ConditionConfig struct {
	Rules       []ConditionRule           `json:"rules"`
	DefaultPath string                    `json:"default_path"`
	LogicType   string                    `json:"logic_type"` // "AND" or "OR"
}

// ConditionRule represents a single condition rule
type ConditionRule struct {
	Variable    string      `json:"variable"`
	Operator    string      `json:"operator"`
	Value       interface{} `json:"value"`
	NextNodeID  string      `json:"next_node_id"`
	Description string      `json:"description"`
}

// ConditionOperator defines supported operators
type ConditionOperator string

const (
	OpEquals              ConditionOperator = "equals"
	OpNotEquals           ConditionOperator = "not_equals"
	OpGreaterThan         ConditionOperator = "greater_than"
	OpGreaterThanOrEqual  ConditionOperator = "greater_than_or_equal"
	OpLessThan            ConditionOperator = "less_than"
	OpLessThanOrEqual     ConditionOperator = "less_than_or_equal"
	OpContains            ConditionOperator = "contains"
	OpNotContains         ConditionOperator = "not_contains"
	OpStartsWith          ConditionOperator = "starts_with"
	OpEndsWith            ConditionOperator = "ends_with"
	OpIsEmpty             ConditionOperator = "is_empty"
	OpIsNotEmpty          ConditionOperator = "is_not_empty"
	OpRegexMatch          ConditionOperator = "regex_match"
	OpInList              ConditionOperator = "in_list"
	OpNotInList           ConditionOperator = "not_in_list"
	OpBetween             ConditionOperator = "between"
	OpIsTrue              ConditionOperator = "is_true"
	OpIsFalse             ConditionOperator = "is_false"
	OpDateBefore          ConditionOperator = "date_before"
	OpDateAfter           ConditionOperator = "date_after"
	OpDateEquals          ConditionOperator = "date_equals"
)

// NewConditionNode creates a new condition node
func NewConditionNode(config map[string]interface{}) (engine.FlowNode, error) {
	base := NewBaseNode(engine.NodeTypeCondition, config)
	node := &ConditionNode{
		BaseNode: base,
	}
	
	if err := node.Validate(); err != nil {
		return nil, err
	}
	
	return node, nil
}

// Execute executes the condition node
func (n *ConditionNode) Execute(ctx context.Context, execCtx *engine.ExecutionContext) (*engine.NodeResult, error) {
	n.LogExecution(execCtx, "Executing condition node")
	
	// Parse condition configuration
	conditionConfig, err := n.parseConditionConfig()
	if err != nil {
		n.LogError(execCtx, "Failed to parse condition config", err)
		return nil, engine.NewNodeError(n.ID, fmt.Sprintf("invalid condition configuration: %v", err))
	}
	
	// Evaluate conditions
	nextNodeID, matchedRule, err := n.evaluateConditions(conditionConfig, execCtx)
	if err != nil {
		n.LogError(execCtx, "Failed to evaluate conditions", err)
		return nil, engine.NewNodeError(n.ID, fmt.Sprintf("condition evaluation failed: %v", err))
	}
	
	// Log the evaluation result
	if matchedRule != nil {
		n.LogExecution(execCtx, "Condition matched", 
			"rule", matchedRule.Description, 
			"variable", matchedRule.Variable,
			"operator", matchedRule.Operator,
			"value", matchedRule.Value,
			"next_node", nextNodeID)
	} else {
		n.LogExecution(execCtx, "No condition matched, using default path", "next_node", nextNodeID)
	}
	
	// Update variables with evaluation result
	variables := make(map[string]interface{})
	variables["last_condition_result"] = nextNodeID != conditionConfig.DefaultPath
	variables["last_condition_node"] = n.ID
	
	if matchedRule != nil {
		variables["matched_rule"] = map[string]interface{}{
			"variable":    matchedRule.Variable,
			"operator":    matchedRule.Operator,
			"value":       matchedRule.Value,
			"description": matchedRule.Description,
		}
	}
	
	return &engine.NodeResult{
		Success:    true,
		NextNodeID: nextNodeID,
		Variables:  variables,
		Message:    "Condition evaluated successfully",
		Metadata: map[string]interface{}{
			"matched_rule":  matchedRule != nil,
			"default_used":  nextNodeID == conditionConfig.DefaultPath,
			"rules_count":   len(conditionConfig.Rules),
		},
	}, nil
}

// Validate validates the condition node configuration
func (n *ConditionNode) Validate() error {
	if err := n.BaseNode.Validate(); err != nil {
		return err
	}
	
	// Validate that rules are defined
	rulesArray := n.GetConfigArray("rules")
	if len(rulesArray) == 0 {
		return engine.NewValidationError("condition node must have at least one rule")
	}
	
	// Validate each rule
	for i, rule := range rulesArray {
		ruleMap, ok := rule.(map[string]interface{})
		if !ok {
			return engine.NewValidationError(fmt.Sprintf("rule %d must be an object", i))
		}
		
		// Check required fields
		if ruleMap["variable"] == "" {
			return engine.NewValidationError(fmt.Sprintf("rule %d must have a variable", i))
		}
		if ruleMap["operator"] == "" {
			return engine.NewValidationError(fmt.Sprintf("rule %d must have an operator", i))
		}
		if ruleMap["next_node_id"] == "" {
			return engine.NewValidationError(fmt.Sprintf("rule %d must have a next_node_id", i))
		}
		
		// Validate operator
		operator := fmt.Sprintf("%v", ruleMap["operator"])
		if !n.isValidOperator(operator) {
			return engine.NewValidationError(fmt.Sprintf("rule %d has invalid operator: %s", i, operator))
		}
	}
	
	// Validate default path
	if n.GetConfigString("default_path", "") == "" {
		return engine.NewValidationError("condition node must have a default_path")
	}
	
	return nil
}

// parseConditionConfig parses the node configuration into ConditionConfig
func (n *ConditionNode) parseConditionConfig() (*ConditionConfig, error) {
	config := &ConditionConfig{
		DefaultPath: n.GetConfigString("default_path", ""),
		LogicType:   n.GetConfigString("logic_type", "AND"),
	}
	
	// Parse rules
	rulesArray := n.GetConfigArray("rules")
	for _, rule := range rulesArray {
		ruleMap, ok := rule.(map[string]interface{})
		if !ok {
			continue
		}
		
		conditionRule := ConditionRule{
			Variable:    fmt.Sprintf("%v", ruleMap["variable"]),
			Operator:    fmt.Sprintf("%v", ruleMap["operator"]),
			Value:       ruleMap["value"],
			NextNodeID:  fmt.Sprintf("%v", ruleMap["next_node_id"]),
			Description: fmt.Sprintf("%v", ruleMap["description"]),
		}
		
		config.Rules = append(config.Rules, conditionRule)
	}
	
	return config, nil
}

// evaluateConditions evaluates all conditions and returns the next node ID
func (n *ConditionNode) evaluateConditions(config *ConditionConfig, execCtx *engine.ExecutionContext) (string, *ConditionRule, error) {
	if config.LogicType == "OR" {
		// OR logic: return first matching rule
		for _, rule := range config.Rules {
			match, err := n.evaluateRule(&rule, execCtx)
			if err != nil {
				return "", nil, err
			}
			if match {
				return rule.NextNodeID, &rule, nil
			}
		}
	} else {
		// AND logic: all rules must match, return the last rule's next node
		var lastRule *ConditionRule
		for _, rule := range config.Rules {
			match, err := n.evaluateRule(&rule, execCtx)
			if err != nil {
				return "", nil, err
			}
			if !match {
				// If any rule fails in AND logic, use default path
				return config.DefaultPath, nil, nil
			}
			lastRule = &rule
		}
		// All rules matched
		if lastRule != nil {
			return lastRule.NextNodeID, lastRule, nil
		}
	}
	
	// No rules matched, use default path
	return config.DefaultPath, nil, nil
}

// evaluateRule evaluates a single condition rule
func (n *ConditionNode) evaluateRule(rule *ConditionRule, execCtx *engine.ExecutionContext) (bool, error) {
	// Get variable value
	varValue, exists := n.GetVariable(execCtx, rule.Variable)
	if !exists {
		// Handle built-in variables
		if builtInValue := n.getBuiltInVariable(rule.Variable, execCtx); builtInValue != nil {
			varValue = builtInValue
		} else {
			// Variable doesn't exist, treat as empty
			varValue = nil
		}
	}
	
	// Evaluate based on operator
	switch ConditionOperator(rule.Operator) {
	case OpEquals:
		return n.compareValues(varValue, rule.Value, "=="), nil
		
	case OpNotEquals:
		return !n.compareValues(varValue, rule.Value, "=="), nil
		
	case OpGreaterThan:
		return n.compareValues(varValue, rule.Value, ">"), nil
		
	case OpGreaterThanOrEqual:
		return n.compareValues(varValue, rule.Value, ">="), nil
		
	case OpLessThan:
		return n.compareValues(varValue, rule.Value, "<"), nil
		
	case OpLessThanOrEqual:
		return n.compareValues(varValue, rule.Value, "<="), nil
		
	case OpContains:
		return n.stringContains(varValue, rule.Value), nil
		
	case OpNotContains:
		return !n.stringContains(varValue, rule.Value), nil
		
	case OpStartsWith:
		return n.stringStartsWith(varValue, rule.Value), nil
		
	case OpEndsWith:
		return n.stringEndsWith(varValue, rule.Value), nil
		
	case OpIsEmpty:
		return n.isEmpty(varValue), nil
		
	case OpIsNotEmpty:
		return !n.isEmpty(varValue), nil
		
	case OpInList:
		return n.inList(varValue, rule.Value), nil
		
	case OpNotInList:
		return !n.inList(varValue, rule.Value), nil
		
	case OpIsTrue:
		return n.isTrue(varValue), nil
		
	case OpIsFalse:
		return !n.isTrue(varValue), nil
		
	default:
		return false, fmt.Errorf("unsupported operator: %s", rule.Operator)
	}
}

// getBuiltInVariable returns built-in variable values
func (n *ConditionNode) getBuiltInVariable(varName string, execCtx *engine.ExecutionContext) interface{} {
	switch varName {
	case "contact_id":
		return execCtx.ContactID
	case "conversation_id":
		return execCtx.ConversationID
	case "execution_id":
		return execCtx.ExecutionID
	case "flow_id":
		return execCtx.FlowID
	case "tenant_id":
		return execCtx.TenantID
	case "execution_step":
		return execCtx.ExecutionStep
	case "current_time":
		return time.Now()
	case "execution_start_time":
		return execCtx.StartTime
	default:
		return nil
	}
}

// compareValues compares two values using the specified operator
func (n *ConditionNode) compareValues(left, right interface{}, operator string) bool {
	// Handle nil cases
	if left == nil && right == nil {
		return operator == "=="
	}
	if left == nil || right == nil {
		return operator == "!="
	}
	
	// Try numeric comparison first
	leftNum, leftIsNum := n.toFloat64(left)
	rightNum, rightIsNum := n.toFloat64(right)
	
	if leftIsNum && rightIsNum {
		switch operator {
		case "==":
			return leftNum == rightNum
		case ">":
			return leftNum > rightNum
		case ">=":
			return leftNum >= rightNum
		case "<":
			return leftNum < rightNum
		case "<=":
			return leftNum <= rightNum
		}
	}
	
	// String comparison
	leftStr := fmt.Sprintf("%v", left)
	rightStr := fmt.Sprintf("%v", right)
	
	switch operator {
	case "==":
		return leftStr == rightStr
	case ">":
		return leftStr > rightStr
	case ">=":
		return leftStr >= rightStr
	case "<":
		return leftStr < rightStr
	case "<=":
		return leftStr <= rightStr
	}
	
	return false
}

// stringContains checks if the variable contains the value
func (n *ConditionNode) stringContains(variable, value interface{}) bool {
	varStr := strings.ToLower(fmt.Sprintf("%v", variable))
	valStr := strings.ToLower(fmt.Sprintf("%v", value))
	return strings.Contains(varStr, valStr)
}

// stringStartsWith checks if the variable starts with the value
func (n *ConditionNode) stringStartsWith(variable, value interface{}) bool {
	varStr := strings.ToLower(fmt.Sprintf("%v", variable))
	valStr := strings.ToLower(fmt.Sprintf("%v", value))
	return strings.HasPrefix(varStr, valStr)
}

// stringEndsWith checks if the variable ends with the value
func (n *ConditionNode) stringEndsWith(variable, value interface{}) bool {
	varStr := strings.ToLower(fmt.Sprintf("%v", variable))
	valStr := strings.ToLower(fmt.Sprintf("%v", value))
	return strings.HasSuffix(varStr, valStr)
}

// isEmpty checks if the variable is empty
func (n *ConditionNode) isEmpty(variable interface{}) bool {
	if variable == nil {
		return true
	}
	
	switch v := variable.(type) {
	case string:
		return strings.TrimSpace(v) == ""
	case []interface{}:
		return len(v) == 0
	case map[string]interface{}:
		return len(v) == 0
	default:
		return reflect.ValueOf(variable).IsZero()
	}
}

// inList checks if the variable is in the list of values
func (n *ConditionNode) inList(variable, value interface{}) bool {
	varStr := fmt.Sprintf("%v", variable)
	
	// Handle array of values
	if valueArray, ok := value.([]interface{}); ok {
		for _, item := range valueArray {
			if fmt.Sprintf("%v", item) == varStr {
				return true
			}
		}
		return false
	}
	
	// Handle comma-separated string
	if valueStr, ok := value.(string); ok {
		items := strings.Split(valueStr, ",")
		for _, item := range items {
			if strings.TrimSpace(item) == varStr {
				return true
			}
		}
	}
	
	return false
}

// isTrue checks if the variable is true
func (n *ConditionNode) isTrue(variable interface{}) bool {
	switch v := variable.(type) {
	case bool:
		return v
	case string:
		lower := strings.ToLower(strings.TrimSpace(v))
		return lower == "true" || lower == "yes" || lower == "1"
	case int, int64, float64:
		num, _ := n.toFloat64(v)
		return num != 0
	default:
		return false
	}
}

// toFloat64 converts a value to float64 if possible
func (n *ConditionNode) toFloat64(value interface{}) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case string:
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f, true
		}
	}
	return 0, false
}

// isValidOperator checks if the operator is valid
func (n *ConditionNode) isValidOperator(operator string) bool {
	validOps := []string{
		string(OpEquals), string(OpNotEquals),
		string(OpGreaterThan), string(OpGreaterThanOrEqual),
		string(OpLessThan), string(OpLessThanOrEqual),
		string(OpContains), string(OpNotContains),
		string(OpStartsWith), string(OpEndsWith),
		string(OpIsEmpty), string(OpIsNotEmpty),
		string(OpRegexMatch), string(OpInList), string(OpNotInList),
		string(OpBetween), string(OpIsTrue), string(OpIsFalse),
		string(OpDateBefore), string(OpDateAfter), string(OpDateEquals),
	}
	
	for _, validOp := range validOps {
		if operator == validOp {
			return true
		}
	}
	
	return false
}