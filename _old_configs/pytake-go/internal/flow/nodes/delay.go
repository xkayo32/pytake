package nodes

import (
	"context"
	"fmt"
	"time"

	"github.com/pytake/pytake-go/internal/flow/engine"
)

// DelayNode introduces a delay in flow execution
type DelayNode struct {
	*BaseNode
}

// DelayType defines different types of delays
type DelayType string

const (
	DelayTypeFixed    DelayType = "fixed"    // Fixed duration delay
	DelayTypeVariable DelayType = "variable" // Variable-based delay
	DelayTypeDynamic  DelayType = "dynamic"  // Calculated delay
	DelayTypeSchedule DelayType = "schedule" // Schedule-based delay (specific time)
)

// DelayConfig represents the configuration for a delay node
type DelayConfig struct {
	DelayType    DelayType `json:"delay_type"`
	Duration     string    `json:"duration"`      // Duration string (e.g., "5m", "1h", "30s")
	DurationMs   int64     `json:"duration_ms"`   // Duration in milliseconds
	Variable     string    `json:"variable"`      // Variable name for variable delays
	ScheduleTime string    `json:"schedule_time"` // ISO time string for scheduled delays
	TimeZone     string    `json:"timezone"`      // Timezone for schedule delays
	MinDelay     string    `json:"min_delay"`     // Minimum delay for dynamic delays
	MaxDelay     string    `json:"max_delay"`     // Maximum delay for dynamic delays
	Message      string    `json:"message"`       // Optional message to log during delay
}

// NewDelayNode creates a new delay node
func NewDelayNode(config map[string]interface{}) (engine.FlowNode, error) {
	base := NewBaseNode(engine.NodeTypeDelay, config)
	node := &DelayNode{
		BaseNode: base,
	}
	
	if err := node.Validate(); err != nil {
		return nil, err
	}
	
	return node, nil
}

// Execute executes the delay node
func (n *DelayNode) Execute(ctx context.Context, execCtx *engine.ExecutionContext) (*engine.NodeResult, error) {
	n.LogExecution(execCtx, "Executing delay node")
	
	// Parse delay configuration
	delayConfig, err := n.parseDelayConfig()
	if err != nil {
		n.LogError(execCtx, "Failed to parse delay config", err)
		return nil, engine.NewNodeError(n.ID, "invalid delay configuration: "+err.Error())
	}
	
	// Calculate delay duration
	delayDuration, err := n.calculateDelayDuration(delayConfig, execCtx)
	if err != nil {
		n.LogError(execCtx, "Failed to calculate delay duration", err)
		return nil, engine.NewNodeError(n.ID, "delay calculation failed: "+err.Error())
	}
	
	// Log delay start
	message := delayConfig.Message
	if message == "" {
		message = fmt.Sprintf("Delaying execution for %v", delayDuration)
	} else {
		message = n.InterpolateString(message, execCtx)
	}
	
	n.LogExecution(execCtx, "Starting delay", 
		"duration", delayDuration,
		"delay_type", string(delayConfig.DelayType),
		"message", message)
	
	// Handle different delay strategies
	var shouldWait bool
	var waitTimeout time.Duration
	
	switch delayConfig.DelayType {
	case DelayTypeSchedule:
		// For scheduled delays, we might need to pause execution until the scheduled time
		targetTime, err := n.parseScheduleTime(delayConfig.ScheduleTime, delayConfig.TimeZone)
		if err != nil {
			return nil, engine.NewNodeError(n.ID, "invalid schedule time: "+err.Error())
		}
		
		now := time.Now()
		if targetTime.After(now) {
			// If scheduled time is in the future, pause execution
			delayDuration = targetTime.Sub(now)
			shouldWait = true
			waitTimeout = delayDuration
		} else {
			// If scheduled time has passed, continue immediately
			delayDuration = 0
		}
		
	default:
		// For other delay types, use the calculated duration
		if delayDuration > 0 {
			shouldWait = true
			waitTimeout = delayDuration
		}
	}
	
	// Update variables
	variables := make(map[string]interface{})
	variables["delay_duration_ms"] = delayDuration.Milliseconds()
	variables["delay_type"] = string(delayConfig.DelayType)
	variables["delay_started_at"] = time.Now()
	
	// Get next node
	nextNodeID := n.GetNextNodeID(nil, "")
	if nextNodeID == "" && len(n.NextNodes) > 0 {
		nextNodeID = n.NextNodes[0]
	}
	
	result := &engine.NodeResult{
		Success:     true,
		NextNodeID:  nextNodeID,
		Variables:   variables,
		Message:     message,
		ShouldWait:  shouldWait,
		WaitTimeout: waitTimeout,
		Metadata: map[string]interface{}{
			"delay_type":        string(delayConfig.DelayType),
			"duration_ms":       delayDuration.Milliseconds(),
			"scheduled_resume":  time.Now().Add(delayDuration),
		},
	}
	
	return result, nil
}

// Validate validates the delay node configuration
func (n *DelayNode) Validate() error {
	if err := n.BaseNode.Validate(); err != nil {
		return err
	}
	
	delayType := n.GetConfigString("delay_type", "fixed")
	if !n.isValidDelayType(delayType) {
		return engine.NewValidationError("invalid delay_type: " + delayType)
	}
	
	switch DelayType(delayType) {
	case DelayTypeFixed:
		duration := n.GetConfigString("duration", "")
		durationMs := n.GetConfigInt("duration_ms", 0)
		if duration == "" && durationMs == 0 {
			return engine.NewValidationError("fixed delay requires either duration or duration_ms")
		}
		
	case DelayTypeVariable:
		variable := n.GetConfigString("variable", "")
		if variable == "" {
			return engine.NewValidationError("variable delay requires a variable name")
		}
		
	case DelayTypeSchedule:
		scheduleTime := n.GetConfigString("schedule_time", "")
		if scheduleTime == "" {
			return engine.NewValidationError("schedule delay requires schedule_time")
		}
		
	case DelayTypeDynamic:
		minDelay := n.GetConfigString("min_delay", "")
		maxDelay := n.GetConfigString("max_delay", "")
		if minDelay == "" || maxDelay == "" {
			return engine.NewValidationError("dynamic delay requires both min_delay and max_delay")
		}
	}
	
	return nil
}

// parseDelayConfig parses the node configuration into DelayConfig
func (n *DelayNode) parseDelayConfig() (*DelayConfig, error) {
	return &DelayConfig{
		DelayType:    DelayType(n.GetConfigString("delay_type", "fixed")),
		Duration:     n.GetConfigString("duration", ""),
		DurationMs:   int64(n.GetConfigInt("duration_ms", 0)),
		Variable:     n.GetConfigString("variable", ""),
		ScheduleTime: n.GetConfigString("schedule_time", ""),
		TimeZone:     n.GetConfigString("timezone", "UTC"),
		MinDelay:     n.GetConfigString("min_delay", ""),
		MaxDelay:     n.GetConfigString("max_delay", ""),
		Message:      n.GetConfigString("message", ""),
	}, nil
}

// calculateDelayDuration calculates the actual delay duration based on configuration
func (n *DelayNode) calculateDelayDuration(config *DelayConfig, execCtx *engine.ExecutionContext) (time.Duration, error) {
	switch config.DelayType {
	case DelayTypeFixed:
		return n.parseFixedDelay(config)
		
	case DelayTypeVariable:
		return n.parseVariableDelay(config, execCtx)
		
	case DelayTypeDynamic:
		return n.parseDynamicDelay(config, execCtx)
		
	case DelayTypeSchedule:
		return n.parseScheduleDelay(config)
		
	default:
		return 0, fmt.Errorf("unsupported delay type: %s", config.DelayType)
	}
}

// parseFixedDelay parses a fixed delay duration
func (n *DelayNode) parseFixedDelay(config *DelayConfig) (time.Duration, error) {
	if config.DurationMs > 0 {
		return time.Duration(config.DurationMs) * time.Millisecond, nil
	}
	
	if config.Duration != "" {
		return time.ParseDuration(config.Duration)
	}
	
	return 0, fmt.Errorf("no valid duration specified for fixed delay")
}

// parseVariableDelay parses a variable-based delay duration
func (n *DelayNode) parseVariableDelay(config *DelayConfig, execCtx *engine.ExecutionContext) (time.Duration, error) {
	value, exists := n.GetVariable(execCtx, config.Variable)
	if !exists {
		return 0, fmt.Errorf("variable %s not found", config.Variable)
	}
	
	switch v := value.(type) {
	case int:
		return time.Duration(v) * time.Second, nil
	case int64:
		return time.Duration(v) * time.Second, nil
	case float64:
		return time.Duration(v) * time.Second, nil
	case string:
		return time.ParseDuration(v)
	default:
		return 0, fmt.Errorf("variable %s has invalid type for delay: %T", config.Variable, value)
	}
}

// parseDynamicDelay calculates a dynamic delay based on execution context
func (n *DelayNode) parseDynamicDelay(config *DelayConfig, execCtx *engine.ExecutionContext) (time.Duration, error) {
	minDuration, err := time.ParseDuration(config.MinDelay)
	if err != nil {
		return 0, fmt.Errorf("invalid min_delay: %v", err)
	}
	
	maxDuration, err := time.ParseDuration(config.MaxDelay)
	if err != nil {
		return 0, fmt.Errorf("invalid max_delay: %v", err)
	}
	
	if maxDuration <= minDuration {
		return minDuration, nil
	}
	
	// Simple dynamic calculation based on execution step
	// Could be enhanced with more sophisticated algorithms
	progress := float64(execCtx.ExecutionStep) / 10.0 // Normalize to 0-1 range roughly
	if progress > 1.0 {
		progress = 1.0
	}
	
	range_ := maxDuration - minDuration
	dynamicDelay := minDuration + time.Duration(float64(range_)*progress)
	
	return dynamicDelay, nil
}

// parseScheduleDelay calculates delay for scheduled execution
func (n *DelayNode) parseScheduleDelay(config *DelayConfig) (time.Duration, error) {
	targetTime, err := n.parseScheduleTime(config.ScheduleTime, config.TimeZone)
	if err != nil {
		return 0, err
	}
	
	now := time.Now()
	if targetTime.Before(now) {
		return 0, nil // No delay if scheduled time has passed
	}
	
	return targetTime.Sub(now), nil
}

// parseScheduleTime parses a schedule time string with timezone
func (n *DelayNode) parseScheduleTime(scheduleTime, timezone string) (time.Time, error) {
	// Load timezone
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc = time.UTC // Fallback to UTC
	}
	
	// Try different time formats
	formats := []string{
		time.RFC3339,
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"15:04:05",
		"15:04",
	}
	
	for _, format := range formats {
		if t, err := time.ParseInLocation(format, scheduleTime, loc); err == nil {
			// For time-only formats, set to today
			if format == "15:04:05" || format == "15:04" {
				now := time.Now().In(loc)
				t = time.Date(now.Year(), now.Month(), now.Day(), 
					t.Hour(), t.Minute(), t.Second(), 0, loc)
				
				// If the time has already passed today, schedule for tomorrow
				if t.Before(now) {
					t = t.Add(24 * time.Hour)
				}
			}
			return t, nil
		}
	}
	
	return time.Time{}, fmt.Errorf("unable to parse schedule time: %s", scheduleTime)
}

// isValidDelayType checks if the delay type is valid
func (n *DelayNode) isValidDelayType(delayType string) bool {
	validTypes := []string{
		string(DelayTypeFixed),
		string(DelayTypeVariable),
		string(DelayTypeDynamic),
		string(DelayTypeSchedule),
	}
	
	for _, validType := range validTypes {
		if delayType == validType {
			return true
		}
	}
	
	return false
}