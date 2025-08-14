package queue

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/pytake/pytake-go/internal/logger"
)

// Config holds queue system configuration
type Config struct {
	RedisPrefix     string `json:"redis_prefix" mapstructure:"redis_prefix"`
	MaxRetries      int    `json:"max_retries" mapstructure:"max_retries"`
	DefaultTimeout  string `json:"default_timeout" mapstructure:"default_timeout"`
	WorkerPoolSizes map[string]int `json:"worker_pool_sizes" mapstructure:"worker_pool_sizes"`
}

// DefaultConfig returns default queue configuration
func DefaultConfig() *Config {
	return &Config{
		RedisPrefix:    "pytake:queue",
		MaxRetries:     3,
		DefaultTimeout: "5m",
		WorkerPoolSizes: map[string]int{
			"default": 5,
			"email":   3,
			"webhook": 10,
			"sync":    2,
			"cleanup": 1,
		},
	}
}

// System holds the initialized queue system components
type System struct {
	Manager   Manager
	Workers   []Worker
	Config    *Config
	ctx       context.Context
	cancel    context.CancelFunc
	log       *logger.Logger
}

// NewSystem creates and initializes a new queue system
func NewSystem(db *gorm.DB, rdb *redis.Client, cfg *Config, log *logger.Logger) (*System, error) {
	if cfg == nil {
		cfg = DefaultConfig()
	}

	// Create queue and scheduler
	redisQueue := NewRedisQueue(rdb, cfg.RedisPrefix)
	scheduler := NewScheduler(redisQueue)
	manager := NewManager(redisQueue, scheduler)

	// Setup middleware and event listeners
	setupMiddleware(manager, log)
	setupEventListeners(manager, log)
	
	// Set retry strategy
	manager.SetRetryStrategy(&DefaultRetryStrategy{
		MaxRetries:  cfg.MaxRetries,
		BaseDelay:   30 * time.Second,
		MaxDelay:    10 * time.Minute,
		Multiplier:  2.0,
		Jitter:      true,
	})

	// Create job handlers
	handlers := createJobHandlers(db)

	// Create and configure workers
	workers := createWorkers(manager, handlers, cfg, log)

	ctx, cancel := context.WithCancel(context.Background())

	system := &System{
		Manager: manager,
		Workers: workers,
		Config:  cfg,
		ctx:     ctx,
		cancel:  cancel,
		log:     log,
	}

	return system, nil
}

// Start starts all workers and the scheduler
func (s *System) Start() error {
	s.log.Info("Starting queue system...")

	// Start scheduler
	if err := s.Manager.Start(s.ctx); err != nil {
		return fmt.Errorf("failed to start scheduler: %w", err)
	}

	// Start all workers
	for i, worker := range s.Workers {
		if err := worker.Start(s.ctx); err != nil {
			// Stop previously started workers
			for j := 0; j < i; j++ {
				s.Workers[j].Stop(context.Background())
			}
			return fmt.Errorf("failed to start worker %d: %w", i, err)
		}
	}

	// Schedule default cleanup jobs
	s.scheduleDefaultJobs()

	s.log.Info("Queue system started successfully", 
		"workers", len(s.Workers), 
		"redis_prefix", s.Config.RedisPrefix)

	return nil
}

// Stop gracefully stops all workers and the scheduler
func (s *System) Stop() error {
	s.log.Info("Stopping queue system...")

	// Cancel context to signal shutdown
	s.cancel()

	// Stop all workers with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	for i, worker := range s.Workers {
		if err := worker.Stop(ctx); err != nil {
			s.log.Error("Failed to stop worker", "worker_index", i, "error", err)
		}
	}

	// Stop scheduler
	if err := s.Manager.Stop(ctx); err != nil {
		s.log.Error("Failed to stop scheduler", "error", err)
		return err
	}

	s.log.Info("Queue system stopped")
	return nil
}

// GetStats returns system statistics
func (s *System) GetStats() (*SystemStats, error) {
	return s.Manager.GetSystemStats(s.ctx)
}

// HealthCheck performs a health check
func (s *System) HealthCheck() (*HealthStatus, error) {
	return s.Manager.HealthCheck(s.ctx)
}

// setupMiddleware configures queue middleware
func setupMiddleware(manager Manager, log *logger.Logger) {
	// Logging middleware
	manager.RegisterMiddleware(NewLoggingMiddleware(func(level, message string, fields ...interface{}) {
		switch level {
		case "error":
			log.Error(message, fields...)
		case "warn":
			log.Warn(message, fields...)
		case "info":
			log.Info(message, fields...)
		default:
			log.Debug(message, fields...)
		}
	}))

	// Metrics middleware
	manager.RegisterMiddleware(NewMetricsMiddleware())
}

// setupEventListeners configures event listeners
func setupEventListeners(manager Manager, log *logger.Logger) {
	// Job lifecycle listener
	manager.AddEventListener(NewSimpleEventListener(
		[]string{"enqueued", "started", "completed", "failed", "retried"},
		func(event *JobEvent) error {
			log.Debug("Job event",
				"job_id", event.JobID,
				"event_type", event.EventType,
				"timestamp", event.Timestamp,
				"worker_id", event.WorkerID,
			)
			return nil
		},
	))

	// Error tracking listener
	manager.AddEventListener(NewSimpleEventListener(
		[]string{"failed"},
		func(event *JobEvent) error {
			log.Error("Job failed",
				"job_id", event.JobID,
				"worker_id", event.WorkerID,
				"error", event.Data["error"],
				"retry_count", event.Data["retry_count"],
			)
			return nil
		},
	))
}

// createJobHandlers creates and returns all job handlers
func createJobHandlers(db *gorm.DB) map[string]JobHandler {
	return map[string]JobHandler{
		"email":   NewEmailJobHandler(db),
		"webhook": NewWebhookJobHandler(db),
		"sync":    NewSyncJobHandler(db),
		"cleanup": NewCleanupJobHandler(db),
	}
}

// createWorkers creates and configures all workers
func createWorkers(manager Manager, handlers map[string]JobHandler, cfg *Config, log *logger.Logger) []Worker {
	var workers []Worker

	// Default worker (handles multiple job types)
	defaultWorker := manager.CreateWorker(
		"default-worker",
		[]string{"default", "high", "low"},
		cfg.WorkerPoolSizes["default"],
	)
	defaultWorker.RegisterHandler(handlers["email"])
	defaultWorker.RegisterHandler(handlers["webhook"])
	workers = append(workers, defaultWorker)

	// Specialized workers
	workerConfigs := []struct {
		id       string
		queues   []string
		handlers []string
		poolSize int
	}{
		{"email-worker", []string{"email"}, []string{"email"}, cfg.WorkerPoolSizes["email"]},
		{"webhook-worker", []string{"webhook"}, []string{"webhook"}, cfg.WorkerPoolSizes["webhook"]},
		{"sync-worker", []string{"sync"}, []string{"sync"}, cfg.WorkerPoolSizes["sync"]},
		{"cleanup-worker", []string{"cleanup"}, []string{"cleanup"}, cfg.WorkerPoolSizes["cleanup"]},
	}

	for _, config := range workerConfigs {
		worker := manager.CreateWorker(config.id, config.queues, config.poolSize)
		
		// Register handlers
		for _, handlerType := range config.handlers {
			if handler, exists := handlers[handlerType]; exists {
				worker.RegisterHandler(handler)
			}
		}
		
		workers = append(workers, worker)
	}

	return workers
}

// scheduleDefaultJobs schedules essential system jobs
func (s *System) scheduleDefaultJobs() {
	ctx := context.Background()

	// Daily cleanup job
	cleanupSchedule := &ScheduleSpec{
		Name:     "daily-cleanup",
		CronSpec: "0 2 * * *", // 2 AM daily
		JobType:  "cleanup",
		Queue:    "cleanup",
		Payload: map[string]interface{}{
			"cleanup": map[string]interface{}{
				"type":       "logs",
				"older_than": "7d",
				"batch_size": 1000,
				"dry_run":    false,
			},
		},
		Timezone: "UTC",
		Enabled:  true,
		Metadata: map[string]interface{}{
			"description": "Daily log cleanup",
			"category":    "maintenance",
		},
	}

	if err := s.Manager.Schedule(ctx, cleanupSchedule); err != nil {
		s.log.Error("Failed to schedule daily cleanup", "error", err)
	}

	// Weekly file cleanup
	fileCleanupSchedule := &ScheduleSpec{
		Name:     "weekly-file-cleanup",
		CronSpec: "0 3 * * 0", // 3 AM on Sundays
		JobType:  "cleanup",
		Queue:    "cleanup",
		Payload: map[string]interface{}{
			"cleanup": map[string]interface{}{
				"type":       "files",
				"older_than": "30d",
				"file_path":  "/tmp/pytake",
				"dry_run":    false,
			},
		},
		Timezone: "UTC",
		Enabled:  true,
		Metadata: map[string]interface{}{
			"description": "Weekly temporary file cleanup",
			"category":    "maintenance",
		},
	}

	if err := s.Manager.Schedule(ctx, fileCleanupSchedule); err != nil {
		s.log.Error("Failed to schedule weekly file cleanup", "error", err)
	}

	// Monthly job cleanup
	jobCleanupSchedule := &ScheduleSpec{
		Name:     "monthly-job-cleanup",
		CronSpec: "0 1 1 * *", // 1 AM on the 1st of each month
		JobType:  "cleanup",
		Queue:    "cleanup",
		Payload: map[string]interface{}{
			"cleanup": map[string]interface{}{
				"type":       "jobs",
				"older_than": "60d",
				"batch_size": 500,
				"dry_run":    false,
			},
		},
		Timezone: "UTC",
		Enabled:  true,
		Metadata: map[string]interface{}{
			"description": "Monthly completed job cleanup",
			"category":    "maintenance",
		},
	}

	if err := s.Manager.Schedule(ctx, jobCleanupSchedule); err != nil {
		s.log.Error("Failed to schedule monthly job cleanup", "error", err)
	}

	s.log.Info("Default scheduled jobs configured")
}