package trigger

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/flow/engine"
)

// Processor implements the TriggerProcessor interface
type Processor struct {
	manager    TriggerManager
	scheduler  TriggerScheduler
	flowEngine engine.FlowEngine
	logger     engine.Logger
	
	// Matchers by trigger type
	matchers map[TriggerType]TriggerMatcher
	
	// Event processing
	eventQueue chan *TriggerEvent
	workers    int
	
	// Control
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
	mu     sync.RWMutex
	
	// Stats
	stats struct {
		EventsProcessed int64
		EventsFailed    int64
		FlowsTriggered  int64
		LastProcessTime time.Time
	}
}

// NewProcessor creates a new trigger processor
func NewProcessor(manager TriggerManager, scheduler TriggerScheduler, flowEngine engine.FlowEngine, logger engine.Logger, workers int) *Processor {
	if workers <= 0 {
		workers = 5 // default worker count
	}
	
	return &Processor{
		manager:    manager,
		scheduler:  scheduler,
		flowEngine: flowEngine,
		logger:     logger,
		matchers:   make(map[TriggerType]TriggerMatcher),
		eventQueue: make(chan *TriggerEvent, 1000), // buffer for 1000 events
		workers:    workers,
	}
}

// Start starts the trigger processor
func (p *Processor) Start(ctx context.Context) error {
	p.ctx, p.cancel = context.WithCancel(ctx)
	
	// Start worker goroutines
	for i := 0; i < p.workers; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
	
	// Start scheduler if available
	if p.scheduler != nil {
		if err := p.scheduler.Start(p.ctx); err != nil {
			p.logger.Error("Failed to start trigger scheduler", "error", err)
			return fmt.Errorf("failed to start scheduler: %w", err)
		}
	}
	
	p.logger.Info("Trigger processor started", "workers", p.workers)
	return nil
}

// Stop stops the trigger processor
func (p *Processor) Stop(ctx context.Context) error {
	if p.cancel != nil {
		p.cancel()
	}
	
	// Close event queue
	close(p.eventQueue)
	
	// Wait for workers to finish
	p.wg.Wait()
	
	// Stop scheduler if available
	if p.scheduler != nil {
		if err := p.scheduler.Stop(ctx); err != nil {
			p.logger.Error("Failed to stop trigger scheduler", "error", err)
		}
	}
	
	p.logger.Info("Trigger processor stopped")
	return nil
}

// RegisterMatcher registers a new trigger matcher
func (p *Processor) RegisterMatcher(matcher TriggerMatcher) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	
	supportedTypes := matcher.GetSupportedTypes()
	for _, triggerType := range supportedTypes {
		p.matchers[triggerType] = matcher
		p.logger.Debug("Registered trigger matcher", "type", triggerType)
	}
	
	return nil
}

// ProcessEvent processes a trigger event
func (p *Processor) ProcessEvent(ctx context.Context, event *TriggerEvent) error {
	if event == nil {
		return fmt.Errorf("event cannot be nil")
	}
	
	select {
	case p.eventQueue <- event:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	default:
		// Queue is full, drop event or handle overflow
		p.logger.Warn("Event queue full, dropping event", "event_id", event.ID)
		return fmt.Errorf("event queue full")
	}
}

// worker processes events from the queue
func (p *Processor) worker(workerID int) {
	defer p.wg.Done()
	
	p.logger.Debug("Trigger worker started", "worker_id", workerID)
	
	for {
		select {
		case event, ok := <-p.eventQueue:
			if !ok {
				p.logger.Debug("Event queue closed, worker stopping", "worker_id", workerID)
				return
			}
			
			p.processEventInternal(event)
			
		case <-p.ctx.Done():
			p.logger.Debug("Worker context cancelled", "worker_id", workerID)
			return
		}
	}
}

// processEventInternal processes a single event
func (p *Processor) processEventInternal(event *TriggerEvent) {
	startTime := time.Now()
	
	defer func() {
		p.mu.Lock()
		p.stats.LastProcessTime = time.Now()
		p.mu.Unlock()
	}()
	
	// Get active triggers for the tenant
	triggers, err := p.manager.GetActiveTriggers(p.ctx, event.TenantID)
	if err != nil {
		p.logger.Error("Failed to get active triggers", "error", err, "tenant_id", event.TenantID)
		p.incrementFailedEvents()
		return
	}
	
	// Find matching triggers
	matches := p.findMatches(event, triggers)
	if len(matches) == 0 {
		p.logger.Debug("No matching triggers found", "event_type", event.TriggerType, "tenant_id", event.TenantID)
		p.incrementProcessedEvents()
		return
	}
	
	// Sort matches by priority (higher priority first)
	sort.Slice(matches, func(i, j int) bool {
		return matches[i].Priority > matches[j].Priority
	})
	
	// Execute flows for matches
	executedFlows := 0
	for _, match := range matches {
		if err := p.executeFlowForMatch(match); err != nil {
			p.logger.Error("Failed to execute flow for trigger match", 
				"error", err, 
				"flow_id", match.FlowID, 
				"trigger_id", match.TriggerID)
			continue
		}
		executedFlows++
	}
	
	p.logger.Info("Processed trigger event", 
		"event_id", event.ID,
		"event_type", event.TriggerType,
		"matches_found", len(matches),
		"flows_executed", executedFlows,
		"process_time_ms", time.Since(startTime).Milliseconds())
	
	p.incrementProcessedEvents()
	p.mu.Lock()
	p.stats.FlowsTriggered += int64(executedFlows)
	p.mu.Unlock()
	
	// Mark event as processed
	now := time.Now()
	event.ProcessedAt = &now
}

// findMatches finds triggers that match the given event
func (p *Processor) findMatches(event *TriggerEvent, triggers []*FlowTrigger) []*TriggerMatch {
	var matches []*TriggerMatch
	
	p.mu.RLock()
	matcher, exists := p.matchers[event.TriggerType]
	p.mu.RUnlock()
	
	if !exists {
		p.logger.Debug("No matcher found for trigger type", "type", event.TriggerType)
		return matches
	}
	
	for _, trigger := range triggers {
		// Skip if trigger is not for this event type
		if trigger.Type != event.TriggerType {
			continue
		}
		
		// Skip if trigger is not active
		if trigger.Status != TriggerStatusActive {
			continue
		}
		
		// Check if trigger matches the event
		match, err := matcher.Match(p.ctx, event, &trigger.Config)
		if err != nil {
			p.logger.Error("Error matching trigger", 
				"error", err, 
				"trigger_id", trigger.ID, 
				"event_id", event.ID)
			continue
		}
		
		if match != nil {
			match.TriggerID = trigger.ID
			match.FlowID = trigger.FlowID
			match.Priority = trigger.Priority
			matches = append(matches, match)
			
			p.logger.Debug("Trigger match found", 
				"trigger_id", trigger.ID, 
				"flow_id", trigger.FlowID,
				"event_id", event.ID)
		}
	}
	
	return matches
}

// executeFlowForMatch executes a flow for a trigger match
func (p *Processor) executeFlowForMatch(match *TriggerMatch) error {
	// Create execution context
	execCtx := &engine.ExecutionContext{
		FlowID:         match.FlowID,
		ExecutionID:    uuid.New(), // Will be updated by the flow service
		TenantID:       match.Event.TenantID,
		ContactID:      match.Event.ContactID,
		ConversationID: match.Event.ConversationID,
		Variables:      match.Variables,
		Context:        match.Context,
		StartTime:      time.Now(),
		LastActivity:   time.Now(),
		TriggerType:    string(match.Event.TriggerType),
		TriggerData:    match.Event.Data,
	}
	
	// Execute the flow asynchronously
	go func() {
		_, err := p.flowEngine.ExecuteFlow(p.ctx, match.FlowID, execCtx)
		if err != nil {
			p.logger.Error("Flow execution failed", 
				"error", err, 
				"flow_id", match.FlowID, 
				"trigger_id", match.TriggerID,
				"execution_id", execCtx.ExecutionID)
		} else {
			p.logger.Info("Flow executed successfully", 
				"flow_id", match.FlowID, 
				"trigger_id", match.TriggerID,
				"execution_id", execCtx.ExecutionID)
		}
	}()
	
	return nil
}

// incrementProcessedEvents increments the processed events counter
func (p *Processor) incrementProcessedEvents() {
	p.mu.Lock()
	p.stats.EventsProcessed++
	p.mu.Unlock()
}

// incrementFailedEvents increments the failed events counter
func (p *Processor) incrementFailedEvents() {
	p.mu.Lock()
	p.stats.EventsFailed++
	p.mu.Unlock()
}

// GetStats returns current processor statistics
func (p *Processor) GetStats() map[string]interface{} {
	p.mu.RLock()
	defer p.mu.RUnlock()
	
	return map[string]interface{}{
		"events_processed":  p.stats.EventsProcessed,
		"events_failed":     p.stats.EventsFailed,
		"flows_triggered":   p.stats.FlowsTriggered,
		"last_process_time": p.stats.LastProcessTime,
		"queue_size":        len(p.eventQueue),
		"workers":           p.workers,
	}
}