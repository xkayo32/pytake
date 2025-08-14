package engine

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Engine implements the FlowEngine interface
type Engine struct {
	nodeFactories map[NodeType]NodeFactory
	services      *ServiceContainer
	logger        Logger
	mutex         sync.RWMutex
	
	// Execution tracking
	executions    map[uuid.UUID]*runningExecution
	execMutex     sync.RWMutex
}

// runningExecution tracks a currently running execution
type runningExecution struct {
	ID         uuid.UUID
	FlowID     uuid.UUID
	Context    *ExecutionContext
	CancelFunc context.CancelFunc
	StartTime  time.Time
	Status     ExecutionStatus
	mutex      sync.RWMutex
}

// NewEngine creates a new flow engine instance
func NewEngine(services *ServiceContainer, logger Logger) *Engine {
	engine := &Engine{
		nodeFactories: make(map[NodeType]NodeFactory),
		services:      services,
		logger:        logger,
		executions:    make(map[uuid.UUID]*runningExecution),
	}
	
	// Register built-in node types
	engine.registerBuiltinNodes()
	
	return engine
}

// RegisterNode registers a node factory for a specific node type
func (e *Engine) RegisterNode(nodeType NodeType, factory NodeFactory) error {
	e.mutex.Lock()
	defer e.mutex.Unlock()
	
	if _, exists := e.nodeFactories[nodeType]; exists {
		return fmt.Errorf("node type %s already registered", nodeType)
	}
	
	e.nodeFactories[nodeType] = factory
	e.logger.Info("Registered node type", "type", nodeType)
	
	return nil
}

// GetRegisteredNodes returns all registered node types
func (e *Engine) GetRegisteredNodes() []NodeType {
	e.mutex.RLock()
	defer e.mutex.RUnlock()
	
	types := make([]NodeType, 0, len(e.nodeFactories))
	for nodeType := range e.nodeFactories {
		types = append(types, nodeType)
	}
	
	return types
}

// CreateNode creates a node instance of the specified type
func (e *Engine) CreateNode(nodeType NodeType, config map[string]interface{}) (FlowNode, error) {
	e.mutex.RLock()
	factory, exists := e.nodeFactories[nodeType]
	e.mutex.RUnlock()
	
	if !exists {
		return nil, NewFlowError(ErrCodeNodeNotFound, fmt.Sprintf("node type %s not found", nodeType), "", false)
	}
	
	return factory(config)
}

// ValidateFlow validates a flow definition
func (e *Engine) ValidateFlow(flowDef *FlowDefinition) error {
	if flowDef == nil {
		return NewValidationError("flow definition cannot be nil")
	}
	
	// Validate start node exists
	if flowDef.StartNodeID == "" {
		return NewValidationError("start node ID cannot be empty")
	}
	
	if _, exists := flowDef.Nodes[flowDef.StartNodeID]; !exists {
		return NewValidationError(fmt.Sprintf("start node %s not found in flow", flowDef.StartNodeID))
	}
	
	// Validate all nodes
	for nodeID, nodeDef := range flowDef.Nodes {
		if err := e.validateNodeDef(nodeID, &nodeDef, flowDef); err != nil {
			return err
		}
	}
	
	// Check for cycles (simplified version)
	if err := e.checkForCycles(flowDef); err != nil {
		return err
	}
	
	// Validate variables
	for _, varDef := range flowDef.Variables {
		if err := e.validateVariableDef(&varDef); err != nil {
			return err
		}
	}
	
	return nil
}

// ExecuteFlow starts a new flow execution
func (e *Engine) ExecuteFlow(ctx context.Context, flowID uuid.UUID, execCtx *ExecutionContext) (*ExecutionResult, error) {
	// Create execution ID if not provided
	if execCtx.ExecutionID == uuid.Nil {
		execCtx.ExecutionID = uuid.New()
	}
	
	// Validate flow definition
	if err := e.ValidateFlow(execCtx.FlowDefinition); err != nil {
		return nil, fmt.Errorf("flow validation failed: %w", err)
	}
	
	// Create cancellable context
	execCtx.StartTime = time.Now()
	execCtx.LastActivity = time.Now()
	
	ctx, cancel := context.WithCancel(ctx)
	
	// Track execution
	running := &runningExecution{
		ID:         execCtx.ExecutionID,
		FlowID:     flowID,
		Context:    execCtx,
		CancelFunc: cancel,
		StartTime:  time.Now(),
		Status:     ExecutionStatusRunning,
	}
	
	e.execMutex.Lock()
	e.executions[execCtx.ExecutionID] = running
	e.execMutex.Unlock()
	
	// Start execution in background
	result := make(chan *ExecutionResult, 1)
	go func() {
		defer func() {
			e.execMutex.Lock()
			delete(e.executions, execCtx.ExecutionID)
			e.execMutex.Unlock()
		}()
		
		execResult := e.runFlow(ctx, execCtx)
		result <- execResult
	}()
	
	// Wait for completion or context cancellation
	select {
	case execResult := <-result:
		return execResult, nil
	case <-ctx.Done():
		cancel()
		return &ExecutionResult{
			ExecutionID:  execCtx.ExecutionID,
			Status:       ExecutionStatusCancelled,
			Duration:     time.Since(execCtx.StartTime),
			ErrorMessage: "execution cancelled",
		}, ctx.Err()
	}
}

// runFlow executes the flow logic
func (e *Engine) runFlow(ctx context.Context, execCtx *ExecutionContext) *ExecutionResult {
	logger := e.logger.With("execution_id", execCtx.ExecutionID, "flow_id", execCtx.FlowID)
	logger.Info("Starting flow execution")
	
	// Initialize variables
	if execCtx.Variables == nil {
		execCtx.Variables = make(map[string]interface{})
	}
	if execCtx.Context == nil {
		execCtx.Context = make(map[string]interface{})
	}
	
	// Initialize variables from flow definition
	for _, varDef := range execCtx.FlowDefinition.Variables {
		if _, exists := execCtx.Variables[varDef.Name]; !exists && varDef.DefaultValue != nil {
			execCtx.Variables[varDef.Name] = varDef.DefaultValue
		}
	}
	
	// Start from the start node
	currentNodeID := execCtx.FlowDefinition.StartNodeID
	execCtx.CurrentNodeID = currentNodeID
	execCtx.ExecutionStep = 0
	
	// Save initial execution state
	if err := e.saveExecutionState(ctx, execCtx, ExecutionStatusRunning); err != nil {
		logger.Error("Failed to save initial execution state", "error", err)
	}
	
	// Main execution loop
	for currentNodeID != "" {
		select {
		case <-ctx.Done():
			logger.Info("Execution cancelled")
			return &ExecutionResult{
				ExecutionID:  execCtx.ExecutionID,
				Status:       ExecutionStatusCancelled,
				Duration:     time.Since(execCtx.StartTime),
				ErrorMessage: "execution cancelled",
			}
		default:
		}
		
		// Get node definition
		nodeDef, exists := execCtx.FlowDefinition.Nodes[currentNodeID]
		if !exists {
			logger.Error("Node not found", "node_id", currentNodeID)
			return &ExecutionResult{
				ExecutionID:  execCtx.ExecutionID,
				Status:       ExecutionStatusFailed,
				Duration:     time.Since(execCtx.StartTime),
				LastNodeID:   currentNodeID,
				ErrorMessage: fmt.Sprintf("node %s not found", currentNodeID),
			}
		}
		
		// Create node instance
		node, err := e.CreateNode(nodeDef.Type, nodeDef.Config)
		if err != nil {
			logger.Error("Failed to create node", "node_id", currentNodeID, "error", err)
			return &ExecutionResult{
				ExecutionID:  execCtx.ExecutionID,
				Status:       ExecutionStatusFailed,
				Duration:     time.Since(execCtx.StartTime),
				LastNodeID:   currentNodeID,
				ErrorMessage: fmt.Sprintf("failed to create node %s: %v", currentNodeID, err),
			}
		}
		
		// Execute node
		logger.Debug("Executing node", "node_id", currentNodeID, "node_type", nodeDef.Type)
		
		nodeStart := time.Now()
		result, err := node.Execute(ctx, execCtx)
		nodeDuration := time.Since(nodeStart)
		
		// Record node execution
		if err := e.recordNodeExecution(ctx, execCtx, currentNodeID, result, err, nodeDuration); err != nil {
			logger.Warn("Failed to record node execution", "error", err)
		}
		
		if err != nil {
			logger.Error("Node execution failed", "node_id", currentNodeID, "error", err)
			
			// Handle error based on flow settings
			if e.shouldRetry(execCtx, err) {
				logger.Info("Retrying node execution", "node_id", currentNodeID)
				continue
			}
			
			return &ExecutionResult{
				ExecutionID:  execCtx.ExecutionID,
				Status:       ExecutionStatusFailed,
				Duration:     time.Since(execCtx.StartTime),
				LastNodeID:   currentNodeID,
				ErrorMessage: err.Error(),
			}
		}
		
		// Update variables
		if result.Variables != nil {
			for key, value := range result.Variables {
				execCtx.Variables[key] = value
			}
		}
		
		// Check if should pause
		if result.ShouldPause {
			logger.Info("Execution paused by node", "node_id", currentNodeID)
			return &ExecutionResult{
				ExecutionID:    execCtx.ExecutionID,
				Status:         ExecutionStatusPaused,
				Duration:       time.Since(execCtx.StartTime),
				LastNodeID:     currentNodeID,
				FinalVariables: execCtx.Variables,
			}
		}
		
		// Check if should wait
		if result.ShouldWait {
			logger.Info("Node requested wait", "node_id", currentNodeID, "timeout", result.WaitTimeout)
			
			select {
			case <-time.After(result.WaitTimeout):
				// Continue execution after timeout
			case <-ctx.Done():
				return &ExecutionResult{
					ExecutionID:  execCtx.ExecutionID,
					Status:       ExecutionStatusCancelled,
					Duration:     time.Since(execCtx.StartTime),
					ErrorMessage: "execution cancelled during wait",
				}
			}
		}
		
		// Determine next node
		if result.NextNodeID == "" {
			// Flow completed
			logger.Info("Flow execution completed", "final_node", currentNodeID)
			
			if err := e.saveExecutionState(ctx, execCtx, ExecutionStatusCompleted); err != nil {
				logger.Error("Failed to save final execution state", "error", err)
			}
			
			return &ExecutionResult{
				ExecutionID:    execCtx.ExecutionID,
				Status:         ExecutionStatusCompleted,
				CompletedAt:    &[]time.Time{time.Now()}[0],
				Duration:       time.Since(execCtx.StartTime),
				LastNodeID:     currentNodeID,
				FinalVariables: execCtx.Variables,
			}
		}
		
		// Move to next node
		currentNodeID = result.NextNodeID
		execCtx.CurrentNodeID = currentNodeID
		execCtx.ExecutionStep++
		execCtx.LastActivity = time.Now()
		
		// Save execution state periodically
		if execCtx.ExecutionStep%5 == 0 {
			if err := e.saveExecutionState(ctx, execCtx, ExecutionStatusRunning); err != nil {
				logger.Warn("Failed to save execution state", "error", err)
			}
		}
	}
	
	// Should not reach here
	logger.Error("Unexpected end of execution loop")
	return &ExecutionResult{
		ExecutionID:  execCtx.ExecutionID,
		Status:       ExecutionStatusFailed,
		Duration:     time.Since(execCtx.StartTime),
		ErrorMessage: "unexpected end of execution",
	}
}

// ResumeExecution resumes a paused execution
func (e *Engine) ResumeExecution(ctx context.Context, executionID uuid.UUID) (*ExecutionResult, error) {
	// Load execution state from database
	execData, err := e.services.Database.GetExecution(ctx, executionID)
	if err != nil {
		return nil, fmt.Errorf("failed to load execution: %w", err)
	}
	
	// Convert to execution context (this would need proper implementation)
	execCtx, err := e.convertToExecutionContext(execData)
	if err != nil {
		return nil, fmt.Errorf("failed to convert execution data: %w", err)
	}
	
	// Resume execution
	return e.ExecuteFlow(ctx, execCtx.FlowID, execCtx)
}

// PauseExecution pauses a running execution
func (e *Engine) PauseExecution(ctx context.Context, executionID uuid.UUID) error {
	e.execMutex.RLock()
	running, exists := e.executions[executionID]
	e.execMutex.RUnlock()
	
	if !exists {
		return fmt.Errorf("execution %s not found or not running", executionID)
	}
	
	running.mutex.Lock()
	running.Status = ExecutionStatusPaused
	running.mutex.Unlock()
	
	// Save paused state
	return e.saveExecutionState(ctx, running.Context, ExecutionStatusPaused)
}

// CancelExecution cancels a running execution
func (e *Engine) CancelExecution(ctx context.Context, executionID uuid.UUID) error {
	e.execMutex.RLock()
	running, exists := e.executions[executionID]
	e.execMutex.RUnlock()
	
	if !exists {
		return fmt.Errorf("execution %s not found or not running", executionID)
	}
	
	running.mutex.Lock()
	running.Status = ExecutionStatusCancelled
	running.CancelFunc()
	running.mutex.Unlock()
	
	return e.saveExecutionState(ctx, running.Context, ExecutionStatusCancelled)
}

// GetExecution returns information about an execution
func (e *Engine) GetExecution(ctx context.Context, executionID uuid.UUID) (*ExecutionInfo, error) {
	// Check if execution is currently running
	e.execMutex.RLock()
	running, isRunning := e.executions[executionID]
	e.execMutex.RUnlock()
	
	if isRunning {
		running.mutex.RLock()
		defer running.mutex.RUnlock()
		
		return &ExecutionInfo{
			ExecutionID:   running.ID,
			FlowID:        running.FlowID,
			Status:        running.Status,
			CurrentNodeID: &running.Context.CurrentNodeID,
			Variables:     running.Context.Variables,
			StartedAt:     running.StartTime,
			Progress:      e.calculateProgress(running.Context),
		}, nil
	}
	
	// Load from database
	execData, err := e.services.Database.GetExecution(ctx, executionID)
	if err != nil {
		return nil, fmt.Errorf("failed to load execution: %w", err)
	}
	
	return e.convertToExecutionInfo(execData), nil
}

// ListExecutions returns a list of executions matching the filter
func (e *Engine) ListExecutions(ctx context.Context, filter *ExecutionFilter) ([]*ExecutionInfo, error) {
	// This would query the database and return execution info
	// Implementation would depend on the database interface
	return nil, fmt.Errorf("not implemented")
}

// Helper methods

func (e *Engine) validateNodeDef(nodeID string, nodeDef *NodeDef, flowDef *FlowDefinition) error {
	if nodeDef.Type == "" {
		return NewValidationError(fmt.Sprintf("node %s has no type", nodeID))
	}
	
	// Check if node type is registered
	e.mutex.RLock()
	_, exists := e.nodeFactories[nodeDef.Type]
	e.mutex.RUnlock()
	
	if !exists {
		return NewValidationError(fmt.Sprintf("node type %s not registered", nodeDef.Type))
	}
	
	// Validate connections
	for _, conn := range nodeDef.Connections {
		if _, exists := flowDef.Nodes[conn.TargetNodeID]; !exists {
			return NewValidationError(fmt.Sprintf("node %s has connection to non-existent node %s", nodeID, conn.TargetNodeID))
		}
	}
	
	return nil
}

func (e *Engine) checkForCycles(flowDef *FlowDefinition) error {
	// Simple cycle detection using DFS
	visited := make(map[string]bool)
	recStack := make(map[string]bool)
	
	var dfs func(string) bool
	dfs = func(nodeID string) bool {
		visited[nodeID] = true
		recStack[nodeID] = true
		
		nodeDef := flowDef.Nodes[nodeID]
		for _, conn := range nodeDef.Connections {
			if !visited[conn.TargetNodeID] {
				if dfs(conn.TargetNodeID) {
					return true
				}
			} else if recStack[conn.TargetNodeID] {
				return true
			}
		}
		
		recStack[nodeID] = false
		return false
	}
	
	if dfs(flowDef.StartNodeID) {
		return NewValidationError("cycle detected in flow")
	}
	
	return nil
}

func (e *Engine) validateVariableDef(varDef *VariableDef) error {
	if varDef.Name == "" {
		return NewValidationError("variable name cannot be empty")
	}
	
	if varDef.Type == "" {
		return NewValidationError(fmt.Sprintf("variable %s has no type", varDef.Name))
	}
	
	// Add more validation as needed
	return nil
}

func (e *Engine) shouldRetry(execCtx *ExecutionContext, err error) bool {
	flowErr, ok := err.(*FlowError)
	if !ok {
		return false
	}
	
	return flowErr.Retryable && execCtx.ExecutionStep < execCtx.FlowDefinition.Settings.RetryAttempts
}

func (e *Engine) saveExecutionState(ctx context.Context, execCtx *ExecutionContext, status ExecutionStatus) error {
	// Convert execution context to database format and save
	// Implementation depends on database interface
	return nil
}

func (e *Engine) recordNodeExecution(ctx context.Context, execCtx *ExecutionContext, nodeID string, result *NodeResult, err error, duration time.Duration) error {
	// Record node execution for analytics
	data := map[string]interface{}{
		"execution_id": execCtx.ExecutionID,
		"flow_id":     execCtx.FlowID,
		"node_id":     nodeID,
		"duration":    duration.Milliseconds(),
		"success":     err == nil,
		"timestamp":   time.Now(),
	}
	
	if err != nil {
		data["error"] = err.Error()
	}
	
	return e.services.AnalyticsCollector.RecordNodeExecution(ctx, data)
}

func (e *Engine) calculateProgress(execCtx *ExecutionContext) float64 {
	totalNodes := len(execCtx.FlowDefinition.Nodes)
	if totalNodes == 0 {
		return 0
	}
	
	return float64(execCtx.ExecutionStep) / float64(totalNodes)
}

func (e *Engine) convertToExecutionContext(execData interface{}) (*ExecutionContext, error) {
	// Convert database execution data back to ExecutionContext
	// Implementation depends on database format
	return nil, fmt.Errorf("not implemented")
}

func (e *Engine) convertToExecutionInfo(execData interface{}) *ExecutionInfo {
	// Convert database execution data to ExecutionInfo
	// Implementation depends on database format
	return &ExecutionInfo{}
}

// registerBuiltinNodes registers the built-in node types
func (e *Engine) registerBuiltinNodes() {
	// Import nodes package (this would be done at the top of the file)
	// For now, we'll implement direct registration
	
	// Register start node
	e.RegisterNode(NodeTypeStart, func(config map[string]interface{}) (FlowNode, error) {
		// This would call nodes.NewStartNode(config) when properly imported
		return nil, fmt.Errorf("start node factory not implemented")
	})
	
	// Register message node
	e.RegisterNode(NodeTypeMessage, func(config map[string]interface{}) (FlowNode, error) {
		return nil, fmt.Errorf("message node factory not implemented")
	})
	
	// Register condition node
	e.RegisterNode(NodeTypeCondition, func(config map[string]interface{}) (FlowNode, error) {
		return nil, fmt.Errorf("condition node factory not implemented")
	})
	
	// Register delay node
	e.RegisterNode(NodeTypeDelay, func(config map[string]interface{}) (FlowNode, error) {
		return nil, fmt.Errorf("delay node factory not implemented")
	})
	
	// Register end node
	e.RegisterNode(NodeTypeEnd, func(config map[string]interface{}) (FlowNode, error) {
		return nil, fmt.Errorf("end node factory not implemented")
	})
	
	e.logger.Info("Registered built-in node types", "count", len(e.nodeFactories))
}