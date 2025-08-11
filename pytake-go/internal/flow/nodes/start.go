package nodes

import (
	"context"

	"github.com/pytake/pytake-go/internal/flow/engine"
)

// StartNode represents the starting point of a flow
type StartNode struct {
	*BaseNode
}

// NewStartNode creates a new start node
func NewStartNode(config map[string]interface{}) (engine.FlowNode, error) {
	base := NewBaseNode(engine.NodeTypeStart, config)
	node := &StartNode{
		BaseNode: base,
	}
	
	if err := node.Validate(); err != nil {
		return nil, err
	}
	
	return node, nil
}

// Execute executes the start node
func (n *StartNode) Execute(ctx context.Context, execCtx *engine.ExecutionContext) (*engine.NodeResult, error) {
	n.LogExecution(execCtx, "Starting flow execution")
	
	// Initialize any start-specific variables
	variables := make(map[string]interface{})
	
	// Add trigger information to variables
	if execCtx.TriggerType != "" {
		variables["trigger_type"] = execCtx.TriggerType
	}
	
	if execCtx.TriggerData != nil {
		variables["trigger_data"] = execCtx.TriggerData
	}
	
	// Add execution metadata
	variables["execution_started_at"] = execCtx.StartTime
	variables["flow_version"] = execCtx.FlowDefinition.Version
	
	// Get the next node ID
	nextNodeID := n.GetNextNodeID(nil, "")
	if nextNodeID == "" && len(n.NextNodes) > 0 {
		nextNodeID = n.NextNodes[0]
	}
	
	return &engine.NodeResult{
		Success:    true,
		NextNodeID: nextNodeID,
		Variables:  variables,
		Message:    "Flow started successfully",
	}, nil
}

// Validate validates the start node configuration
func (n *StartNode) Validate() error {
	if err := n.BaseNode.Validate(); err != nil {
		return err
	}
	
	// Start node should have at least one next node
	if len(n.NextNodes) == 0 {
		return engine.NewValidationError("start node must have at least one next node")
	}
	
	return nil
}