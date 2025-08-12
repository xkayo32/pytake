package queue

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

// WorkerImpl implements the Worker interface
type WorkerImpl struct {
	id          string
	queue       Queue
	queues      []string
	concurrency int
	handlers    map[string]JobHandler
	middleware  []JobMiddleware
	
	// Worker state
	status    string
	stats     *WorkerStats
	cancel    context.CancelFunc
	wg        sync.WaitGroup
	mu        sync.RWMutex
	
	// Current job tracking
	currentJob *Job
	
	// Shutdown signal
	shutdown chan struct{}
}

// NewWorker creates a new worker instance
func NewWorker(id string, queue Queue, queues []string, concurrency int) Worker {
	return &WorkerImpl{
		id:          id,
		queue:       queue,
		queues:      queues,
		concurrency: concurrency,
		handlers:    make(map[string]JobHandler),
		middleware:  make([]JobMiddleware, 0),
		status:      "stopped",
		shutdown:    make(chan struct{}),
		stats: &WorkerStats{
			ID:           id,
			Status:       "stopped",
			Queues:       queues,
			StartedAt:    time.Now(),
			HandlerTypes: make([]string, 0),
		},
	}
}

// Start begins processing jobs
func (w *WorkerImpl) Start(ctx context.Context) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	
	if w.status == "running" {
		return fmt.Errorf("worker is already running")
	}
	
	// Create cancellable context
	workerCtx, cancel := context.WithCancel(ctx)
	w.cancel = cancel
	w.status = "running"
	w.stats.Status = "running"
	w.stats.StartedAt = time.Now()
	
	// Start worker goroutines
	for i := 0; i < w.concurrency; i++ {
		w.wg.Add(1)
		go w.processJobs(workerCtx, i)
	}
	
	return nil
}

// Stop gracefully stops the worker
func (w *WorkerImpl) Stop(ctx context.Context) error {
	w.mu.Lock()
	if w.status != "running" {
		w.mu.Unlock()
		return fmt.Errorf("worker is not running")
	}
	
	w.status = "stopping"
	w.stats.Status = "stopping"
	w.mu.Unlock()
	
	// Signal shutdown
	close(w.shutdown)
	
	// Cancel context to stop processing new jobs
	if w.cancel != nil {
		w.cancel()
	}
	
	// Wait for all goroutines to finish with timeout
	done := make(chan struct{})
	go func() {
		w.wg.Wait()
		close(done)
	}()
	
	select {
	case <-done:
		// All workers stopped gracefully
	case <-ctx.Done():
		// Timeout reached, force shutdown
		return ctx.Err()
	}
	
	w.mu.Lock()
	w.status = "stopped"
	w.stats.Status = "stopped"
	w.mu.Unlock()
	
	return nil
}

// RegisterHandler registers a job handler
func (w *WorkerImpl) RegisterHandler(handler JobHandler) {
	w.mu.Lock()
	defer w.mu.Unlock()
	
	w.handlers[handler.GetType()] = handler
	
	// Update handler types in stats
	handlerTypes := make([]string, 0, len(w.handlers))
	for handlerType := range w.handlers {
		handlerTypes = append(handlerTypes, handlerType)
	}
	w.stats.HandlerTypes = handlerTypes
}

// RegisterMiddleware registers middleware for job processing
func (w *WorkerImpl) RegisterMiddleware(middleware JobMiddleware) {
	w.mu.Lock()
	defer w.mu.Unlock()
	
	w.middleware = append(w.middleware, middleware)
}

// GetStats returns worker statistics
func (w *WorkerImpl) GetStats() *WorkerStats {
	w.mu.RLock()
	defer w.mu.RUnlock()
	
	// Create a copy to avoid data races
	stats := *w.stats
	if w.currentJob != nil {
		jobCopy := *w.currentJob
		stats.CurrentJob = &jobCopy
	}
	
	return &stats
}

// processJobs is the main worker loop
func (w *WorkerImpl) processJobs(ctx context.Context, workerID int) {
	defer w.wg.Done()
	
	for {
		select {
		case <-ctx.Done():
			return
		case <-w.shutdown:
			return
		default:
			// Try to get a job
			job, err := w.queue.Dequeue(ctx, w.queues)
			if err != nil {
				// Log error and continue
				time.Sleep(1 * time.Second)
				continue
			}
			
			if job == nil {
				// No jobs available, wait a bit
				time.Sleep(100 * time.Millisecond)
				continue
			}
			
			// Process the job
			w.processJob(ctx, job, workerID)
		}
	}
}

// processJob processes a single job
func (w *WorkerImpl) processJob(ctx context.Context, job *Job, workerID int) {
	w.mu.Lock()
	w.currentJob = job
	w.stats.JobsProcessed++
	w.stats.LastActivity = time.Now()
	job.ProcessedBy = fmt.Sprintf("%s-%d", w.id, workerID)
	w.mu.Unlock()
	
	defer func() {
		w.mu.Lock()
		w.currentJob = nil
		w.mu.Unlock()
	}()
	
	// Create job-specific context with timeout
	jobCtx := ctx
	var cancel context.CancelFunc
	
	if job.Timeout > 0 {
		jobCtx, cancel = context.WithTimeout(ctx, job.Timeout)
		defer cancel()
	}
	
	// Get handler for this job type
	w.mu.RLock()
	handler, exists := w.handlers[job.Type]
	middleware := w.middleware
	w.mu.RUnlock()
	
	if !exists {
		// No handler found, fail the job
		err := fmt.Errorf("no handler registered for job type: %s", job.Type)
		w.handleJobError(ctx, job, err)
		return
	}
	
	// Apply before middleware
	for _, mw := range middleware {
		if err := mw.Before(jobCtx, job); err != nil {
			w.handleJobError(ctx, job, fmt.Errorf("middleware before error: %w", err))
			return
		}
	}
	
	// Process the job
	startTime := time.Now()
	var jobErr error
	
	// Recover from panics
	defer func() {
		if r := recover(); r != nil {
			jobErr = fmt.Errorf("job panicked: %v", r)
		}
		
		duration := time.Since(startTime)
		w.mu.Lock()
		w.stats.ProcessingTime += duration
		w.mu.Unlock()
		
		// Apply after middleware
		for i := len(middleware) - 1; i >= 0; i-- {
			middleware[i].After(jobCtx, job, jobErr)
		}
		
		// Handle job completion
		if jobErr != nil {
			w.handleJobError(ctx, job, jobErr)
		} else {
			w.handleJobSuccess(ctx, job)
		}
	}()
	
	// Execute the job
	jobErr = handler.Handle(jobCtx, job)
}

// handleJobSuccess handles successful job completion
func (w *WorkerImpl) handleJobSuccess(ctx context.Context, job *Job) {
	if err := w.queue.Ack(ctx, job); err != nil {
		// Log error acknowledging job, but don't fail it
		// In production, you might want to implement dead letter queues
	}
	
	w.mu.Lock()
	w.stats.JobsSucceeded++
	w.mu.Unlock()
}

// handleJobError handles job failures
func (w *WorkerImpl) handleJobError(ctx context.Context, job *Job, err error) {
	if nackErr := w.queue.Nack(ctx, job, err); nackErr != nil {
		// Log error handling failure
		// In production, you'd want proper error handling here
	}
	
	w.mu.Lock()
	w.stats.JobsFailed++
	w.mu.Unlock()
}

// DefaultRetryStrategy implements exponential backoff retry strategy
type DefaultRetryStrategy struct {
	MaxRetries  int
	BaseDelay   time.Duration
	MaxDelay    time.Duration
	Multiplier  float64
	Jitter      bool
}

// NewDefaultRetryStrategy creates a new default retry strategy
func NewDefaultRetryStrategy() RetryStrategy {
	return &DefaultRetryStrategy{
		MaxRetries: 3,
		BaseDelay:  30 * time.Second,
		MaxDelay:   10 * time.Minute,
		Multiplier: 2.0,
		Jitter:     true,
	}
}

// ShouldRetry determines if a job should be retried
func (s *DefaultRetryStrategy) ShouldRetry(job *Job, err error) bool {
	return job.RetryCount < job.MaxRetries && job.RetryCount < s.MaxRetries
}

// NextRetryDelay calculates the next retry delay
func (s *DefaultRetryStrategy) NextRetryDelay(job *Job) time.Duration {
	delay := s.BaseDelay
	
	// Exponential backoff
	for i := 0; i < job.RetryCount; i++ {
		delay = time.Duration(float64(delay) * s.Multiplier)
		if delay > s.MaxDelay {
			delay = s.MaxDelay
			break
		}
	}
	
	// Add jitter to avoid thundering herd
	if s.Jitter {
		jitter := time.Duration(float64(delay) * 0.1 * (2*time.Now().UnixNano()%1000/1000.0 - 1))
		delay += jitter
	}
	
	return delay
}

// LoggingMiddleware logs job processing
type LoggingMiddleware struct {
	logFunc func(level, message string, fields ...interface{})
}

// NewLoggingMiddleware creates a new logging middleware
func NewLoggingMiddleware(logFunc func(level, message string, fields ...interface{})) JobMiddleware {
	return &LoggingMiddleware{
		logFunc: logFunc,
	}
}

// Before is called before job processing
func (m *LoggingMiddleware) Before(ctx context.Context, job *Job) error {
	m.logFunc("info", "Starting job processing",
		"job_id", job.ID,
		"type", job.Type,
		"queue", job.Queue,
		"retry_count", job.RetryCount,
	)
	return nil
}

// After is called after job processing
func (m *LoggingMiddleware) After(ctx context.Context, job *Job, result error) error {
	if result != nil {
		m.logFunc("error", "Job processing failed",
			"job_id", job.ID,
			"type", job.Type,
			"queue", job.Queue,
			"error", result.Error(),
		)
	} else {
		m.logFunc("info", "Job processing completed",
			"job_id", job.ID,
			"type", job.Type,
			"queue", job.Queue,
		)
	}
	return nil
}

// MetricsMiddleware collects job metrics
type MetricsMiddleware struct {
	startTimes map[uuid.UUID]time.Time
	mu         sync.RWMutex
}

// NewMetricsMiddleware creates a new metrics middleware
func NewMetricsMiddleware() JobMiddleware {
	return &MetricsMiddleware{
		startTimes: make(map[uuid.UUID]time.Time),
	}
}

// Before is called before job processing
func (m *MetricsMiddleware) Before(ctx context.Context, job *Job) error {
	m.mu.Lock()
	m.startTimes[job.ID] = time.Now()
	m.mu.Unlock()
	
	// In production, you'd emit metrics here
	return nil
}

// After is called after job processing
func (m *MetricsMiddleware) After(ctx context.Context, job *Job, result error) error {
	m.mu.Lock()
	startTime, exists := m.startTimes[job.ID]
	if exists {
		delete(m.startTimes, job.ID)
	}
	m.mu.Unlock()
	
	if exists {
		duration := time.Since(startTime)
		// In production, you'd emit duration metrics here
		_ = duration
	}
	
	// Emit success/failure metrics
	if result != nil {
		// Emit failure metric
	} else {
		// Emit success metric
	}
	
	return nil
}

// SimpleEventListener is a basic event listener
type SimpleEventListener struct {
	eventTypes []string
	handler    func(*JobEvent) error
}

// NewSimpleEventListener creates a new simple event listener
func NewSimpleEventListener(eventTypes []string, handler func(*JobEvent) error) JobEventListener {
	return &SimpleEventListener{
		eventTypes: eventTypes,
		handler:    handler,
	}
}

// OnJobEvent handles job events
func (l *SimpleEventListener) OnJobEvent(event *JobEvent) error {
	return l.handler(event)
}

// GetEventTypes returns the event types this listener is interested in
func (l *SimpleEventListener) GetEventTypes() []string {
	return l.eventTypes
}