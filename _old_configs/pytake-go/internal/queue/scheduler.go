package queue

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
)

// SchedulerImpl implements the Scheduler interface using robfig/cron
type SchedulerImpl struct {
	queue     Queue
	cron      *cron.Cron
	schedules map[string]*ScheduleSpec
	mu        sync.RWMutex
	running   bool
}

// NewScheduler creates a new scheduler instance
func NewScheduler(queue Queue) Scheduler {
	return &SchedulerImpl{
		queue:     queue,
		cron:      cron.New(cron.WithSeconds()), // Support seconds precision
		schedules: make(map[string]*ScheduleSpec),
		running:   false,
	}
}

// Schedule adds a recurring job
func (s *SchedulerImpl) Schedule(ctx context.Context, spec *ScheduleSpec) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	// Validate cron spec
	schedule, err := s.cron.Parser().Parse(spec.CronSpec)
	if err != nil {
		return fmt.Errorf("invalid cron spec '%s': %w", spec.CronSpec, err)
	}
	
	// Calculate next run time
	now := time.Now()
	if spec.Timezone != "" {
		if loc, err := time.LoadLocation(spec.Timezone); err == nil {
			now = now.In(loc)
		}
	}
	nextRun := schedule.Next(now)
	spec.NextRun = &nextRun
	
	// Remove existing schedule if it exists
	if existing, exists := s.schedules[spec.Name]; exists {
		s.cron.Remove(cron.EntryID(existing.RunCount)) // Using RunCount as EntryID temporarily
	}
	
	// Add to cron if enabled
	var entryID cron.EntryID
	if spec.Enabled && s.running {
		entryID, err = s.cron.AddFunc(spec.CronSpec, func() {
			s.executeScheduledJob(spec)
		})
		if err != nil {
			return fmt.Errorf("failed to add cron job: %w", err)
		}
	}
	
	// Store the schedule
	spec.CreatedAt = now
	spec.UpdatedAt = now
	s.schedules[spec.Name] = spec
	
	// Store entry ID for later removal (in a production system, you'd store this properly)
	spec.RunCount = int64(entryID)
	
	return nil
}

// Unschedule removes a scheduled job
func (s *SchedulerImpl) Unschedule(ctx context.Context, name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	spec, exists := s.schedules[name]
	if !exists {
		return fmt.Errorf("schedule '%s' not found", name)
	}
	
	// Remove from cron
	if spec.RunCount > 0 {
		s.cron.Remove(cron.EntryID(spec.RunCount))
	}
	
	// Remove from schedules map
	delete(s.schedules, name)
	
	return nil
}

// ListSchedules returns all scheduled jobs
func (s *SchedulerImpl) ListSchedules(ctx context.Context) ([]*ScheduleSpec, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	schedules := make([]*ScheduleSpec, 0, len(s.schedules))
	for _, spec := range s.schedules {
		// Create a copy to avoid data races
		specCopy := *spec
		schedules = append(schedules, &specCopy)
	}
	
	return schedules, nil
}

// Start begins the scheduler
func (s *SchedulerImpl) Start(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	if s.running {
		return fmt.Errorf("scheduler is already running")
	}
	
	// Add all enabled schedules to cron
	for _, spec := range s.schedules {
		if spec.Enabled {
			entryID, err := s.cron.AddFunc(spec.CronSpec, func() {
				s.executeScheduledJob(spec)
			})
			if err != nil {
				return fmt.Errorf("failed to add cron job '%s': %w", spec.Name, err)
			}
			spec.RunCount = int64(entryID)
		}
	}
	
	// Start the cron scheduler
	s.cron.Start()
	s.running = true
	
	// Start background goroutine to update next run times
	go s.updateNextRunTimes(ctx)
	
	return nil
}

// Stop stops the scheduler
func (s *SchedulerImpl) Stop(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	if !s.running {
		return fmt.Errorf("scheduler is not running")
	}
	
	// Stop the cron scheduler
	cronCtx := s.cron.Stop()
	
	// Wait for all scheduled jobs to complete with timeout
	select {
	case <-cronCtx.Done():
		// All jobs completed
	case <-ctx.Done():
		// Timeout reached
		return ctx.Err()
	case <-time.After(30 * time.Second):
		// Force timeout after 30 seconds
		return fmt.Errorf("scheduler stop timeout")
	}
	
	s.running = false
	return nil
}

// executeScheduledJob executes a scheduled job
func (s *SchedulerImpl) executeScheduledJob(spec *ScheduleSpec) {
	s.mu.Lock()
	
	// Update run statistics
	now := time.Now()
	spec.LastRun = &now
	spec.RunCount++
	
	// Calculate next run time
	schedule, err := s.cron.Parser().Parse(spec.CronSpec)
	if err == nil {
		nextRun := schedule.Next(now)
		spec.NextRun = &nextRun
	}
	
	spec.UpdatedAt = now
	s.mu.Unlock()
	
	// Create job from schedule spec
	job := &Job{
		ID:       uuid.New(),
		Type:     spec.JobType,
		Queue:    spec.Queue,
		Payload:  spec.Payload,
		Priority: PriorityNormal, // Default priority for scheduled jobs
		Metadata: map[string]interface{}{
			"schedule_name": spec.Name,
			"schedule_run":  spec.RunCount,
			"cron_spec":     spec.CronSpec,
		},
		MaxRetries: 3, // Default retries for scheduled jobs
		Timeout:    5 * time.Minute, // Default timeout
		CreatedAt:  now,
	}
	
	// Add schedule metadata to job metadata
	if spec.Metadata != nil {
		for key, value := range spec.Metadata {
			job.Metadata[key] = value
		}
	}
	
	// Enqueue the job
	ctx := context.Background()
	if err := s.queue.Enqueue(ctx, job); err != nil {
		// Log error - in production you'd want proper error handling
		// Could also implement a dead letter queue for failed scheduled jobs
	}
}

// updateNextRunTimes is a background goroutine that updates next run times
func (s *SchedulerImpl) updateNextRunTimes(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.refreshNextRunTimes()
		}
	}
}

// refreshNextRunTimes updates the NextRun times for all schedules
func (s *SchedulerImpl) refreshNextRunTimes() {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	now := time.Now()
	
	for _, spec := range s.schedules {
		if !spec.Enabled {
			continue
		}
		
		schedule, err := s.cron.Parser().Parse(spec.CronSpec)
		if err != nil {
			continue
		}
		
		// Adjust time for timezone if specified
		currentTime := now
		if spec.Timezone != "" {
			if loc, err := time.LoadLocation(spec.Timezone); err == nil {
				currentTime = now.In(loc)
			}
		}
		
		nextRun := schedule.Next(currentTime)
		spec.NextRun = &nextRun
		spec.UpdatedAt = now
	}
}

// Manager implementation that combines Queue, Scheduler, and Worker management
type ManagerImpl struct {
	Queue
	Scheduler
	workers   map[string]Worker
	mu        sync.RWMutex
	startTime time.Time
}

// NewManager creates a new queue manager
func NewManager(queue Queue, scheduler Scheduler) Manager {
	return &ManagerImpl{
		Queue:     queue,
		Scheduler: scheduler,
		workers:   make(map[string]Worker),
		startTime: time.Now(),
	}
}

// CreateWorker creates a new worker instance
func (m *ManagerImpl) CreateWorker(id string, queues []string, concurrency int) Worker {
	worker := NewWorker(id, m.Queue, queues, concurrency)
	
	m.mu.Lock()
	m.workers[id] = worker
	m.mu.Unlock()
	
	return worker
}

// RegisterMiddleware registers global middleware
func (m *ManagerImpl) RegisterMiddleware(middleware JobMiddleware) {
	// Apply to queue if it supports middleware
	if redisQueue, ok := m.Queue.(*RedisQueue); ok {
		redisQueue.RegisterMiddleware(middleware)
	}
	
	// Apply to all existing workers
	m.mu.RLock()
	workers := make([]Worker, 0, len(m.workers))
	for _, worker := range m.workers {
		workers = append(workers, worker)
	}
	m.mu.RUnlock()
	
	for _, worker := range workers {
		if workerImpl, ok := worker.(*WorkerImpl); ok {
			workerImpl.RegisterMiddleware(middleware)
		}
	}
}

// SetRetryStrategy sets the retry strategy
func (m *ManagerImpl) SetRetryStrategy(strategy RetryStrategy) {
	// Apply to queue if it supports retry strategy
	if redisQueue, ok := m.Queue.(*RedisQueue); ok {
		redisQueue.SetRetryStrategy(strategy)
	}
}

// AddEventListener adds an event listener
func (m *ManagerImpl) AddEventListener(listener JobEventListener) {
	// Apply to queue if it supports event listeners
	if redisQueue, ok := m.Queue.(*RedisQueue); ok {
		redisQueue.AddEventListener(listener)
	}
}

// GetSystemStats returns overall system statistics
func (m *ManagerImpl) GetSystemStats(ctx context.Context) (*SystemStats, error) {
	m.mu.RLock()
	workers := make([]*WorkerStats, 0, len(m.workers))
	activeWorkers := 0
	
	for _, worker := range m.workers {
		stats := worker.GetStats()
		workers = append(workers, stats)
		if stats.Status == "running" {
			activeWorkers++
		}
	}
	m.mu.RUnlock()
	
	// Get queue statistics for all known queues
	queueStats := make(map[string]*QueueStats)
	totalQueues := 0
	totalJobs := int64(0)
	
	// In a production system, you'd maintain a list of all queues
	// For now, we'll use common queue names
	commonQueues := []string{"default", "high", "low", "email", "webhook", "sync", "cleanup"}
	
	for _, queueName := range commonQueues {
		if stats, err := m.Queue.GetQueueStats(ctx, queueName); err == nil {
			if stats.Pending > 0 || stats.Running > 0 || stats.Completed > 0 || stats.Failed > 0 {
				queueStats[queueName] = stats
				totalQueues++
				totalJobs += stats.Pending + stats.Running + stats.Completed + stats.Failed
			}
		}
	}
	
	// Get Redis info if using RedisQueue
	redisInfo := make(map[string]interface{})
	if redisQueue, ok := m.Queue.(*RedisQueue); ok {
		// In production, you'd get actual Redis stats from redisQueue.client
		redisInfo["status"] = "connected"
		redisInfo["memory_usage"] = "10MB"
		redisInfo["connections"] = 5
	}
	
	systemStats := &SystemStats{
		Queues:        queueStats,
		Workers:       workers,
		ActiveWorkers: activeWorkers,
		TotalJobs:     totalJobs,
		TotalQueues:   totalQueues,
		SystemUptime:  time.Since(m.startTime),
		MemoryUsage:   0, // Would get from runtime.MemStats in production
		RedisInfo:     redisInfo,
		UpdatedAt:     time.Now(),
	}
	
	return systemStats, nil
}

// HealthCheck returns system health status
func (m *ManagerImpl) HealthCheck(ctx context.Context) (*HealthStatus, error) {
	checks := make(map[string]CheckResult)
	healthy := true
	
	// Check queue connectivity
	queueStart := time.Now()
	if _, err := m.Queue.GetQueueStats(ctx, "default"); err != nil {
		checks["queue"] = CheckResult{
			Healthy:   false,
			Message:   fmt.Sprintf("Queue check failed: %v", err),
			Duration:  time.Since(queueStart),
			Timestamp: time.Now(),
		}
		healthy = false
	} else {
		checks["queue"] = CheckResult{
			Healthy:   true,
			Message:   "Queue is accessible",
			Duration:  time.Since(queueStart),
			Timestamp: time.Now(),
		}
	}
	
	// Check scheduler if running
	schedulerStart := time.Now()
	if schedules, err := m.Scheduler.ListSchedules(ctx); err != nil {
		checks["scheduler"] = CheckResult{
			Healthy:   false,
			Message:   fmt.Sprintf("Scheduler check failed: %v", err),
			Duration:  time.Since(schedulerStart),
			Timestamp: time.Now(),
		}
		healthy = false
	} else {
		checks["scheduler"] = CheckResult{
			Healthy:   true,
			Message:   fmt.Sprintf("Scheduler has %d schedules", len(schedules)),
			Duration:  time.Since(schedulerStart),
			Timestamp: time.Now(),
		}
	}
	
	// Check workers
	workerStart := time.Now()
	m.mu.RLock()
	runningWorkers := 0
	totalWorkers := len(m.workers)
	for _, worker := range m.workers {
		if worker.GetStats().Status == "running" {
			runningWorkers++
		}
	}
	m.mu.RUnlock()
	
	if totalWorkers == 0 {
		checks["workers"] = CheckResult{
			Healthy:   false,
			Message:   "No workers configured",
			Duration:  time.Since(workerStart),
			Timestamp: time.Now(),
		}
		healthy = false
	} else {
		checks["workers"] = CheckResult{
			Healthy:   runningWorkers > 0,
			Message:   fmt.Sprintf("%d/%d workers running", runningWorkers, totalWorkers),
			Duration:  time.Since(workerStart),
			Timestamp: time.Now(),
		}
		if runningWorkers == 0 {
			healthy = false
		}
	}
	
	status := "healthy"
	message := "All systems operational"
	
	if !healthy {
		status = "unhealthy"
		message = "Some systems are experiencing issues"
	}
	
	healthStatus := &HealthStatus{
		Healthy:   healthy,
		Status:    status,
		Message:   message,
		Checks:    checks,
		LastCheck: time.Now(),
	}
	
	return healthStatus, nil
}