package queue

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// JobStatus represents the status of a job
type JobStatus string

const (
	JobStatusPending   JobStatus = "pending"
	JobStatusRunning   JobStatus = "running"
	JobStatusCompleted JobStatus = "completed"
	JobStatusFailed    JobStatus = "failed"
	JobStatusRetrying  JobStatus = "retrying"
	JobStatusCancelled JobStatus = "cancelled"
)

// JobPriority represents job priority levels
type JobPriority int

const (
	PriorityLow    JobPriority = 0
	PriorityNormal JobPriority = 1
	PriorityHigh   JobPriority = 2
	PriorityCritical JobPriority = 3
)

// Job represents a background job
type Job struct {
	ID           uuid.UUID              `json:"id"`
	Type         string                 `json:"type"`
	Queue        string                 `json:"queue"`
	Payload      map[string]interface{} `json:"payload"`
	Priority     JobPriority            `json:"priority"`
	MaxRetries   int                    `json:"max_retries"`
	RetryCount   int                    `json:"retry_count"`
	Status       JobStatus              `json:"status"`
	Error        string                 `json:"error,omitempty"`
	Result       map[string]interface{} `json:"result,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
	ScheduledAt  *time.Time             `json:"scheduled_at,omitempty"`
	StartedAt    *time.Time             `json:"started_at,omitempty"`
	CompletedAt  *time.Time             `json:"completed_at,omitempty"`
	ProcessedBy  string                 `json:"processed_by,omitempty"`
	Timeout      time.Duration          `json:"timeout"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
	TenantID     *uuid.UUID             `json:"tenant_id,omitempty"`
}

// JobHandler defines the interface for job processors
type JobHandler interface {
	Handle(ctx context.Context, job *Job) error
	GetType() string
	GetTimeout() time.Duration
}

// Queue defines the interface for job queue operations
type Queue interface {
	// Enqueue adds a job to the queue
	Enqueue(ctx context.Context, job *Job) error
	
	// EnqueueDelayed adds a job to be processed after a delay
	EnqueueDelayed(ctx context.Context, job *Job, delay time.Duration) error
	
	// EnqueueAt schedules a job to be processed at a specific time
	EnqueueAt(ctx context.Context, job *Job, at time.Time) error
	
	// Dequeue retrieves a job from the queue for processing
	Dequeue(ctx context.Context, queues []string) (*Job, error)
	
	// Ack acknowledges successful job completion
	Ack(ctx context.Context, job *Job) error
	
	// Nack marks a job as failed and potentially retries it
	Nack(ctx context.Context, job *Job, err error) error
	
	// GetJob retrieves a job by ID
	GetJob(ctx context.Context, jobID uuid.UUID) (*Job, error)
	
	// UpdateJob updates job status and metadata
	UpdateJob(ctx context.Context, job *Job) error
	
	// DeleteJob removes a job from the queue
	DeleteJob(ctx context.Context, jobID uuid.UUID) error
	
	// GetQueueStats returns queue statistics
	GetQueueStats(ctx context.Context, queueName string) (*QueueStats, error)
	
	// ListJobs returns paginated list of jobs
	ListJobs(ctx context.Context, filter *JobFilter) ([]*Job, int64, error)
	
	// PurgeQueue removes all jobs from a queue
	PurgeQueue(ctx context.Context, queueName string) error
	
	// Close closes the queue connection
	Close() error
}

// Worker defines the interface for job workers
type Worker interface {
	// Start begins processing jobs
	Start(ctx context.Context) error
	
	// Stop gracefully stops the worker
	Stop(ctx context.Context) error
	
	// RegisterHandler registers a job handler
	RegisterHandler(handler JobHandler)
	
	// GetStats returns worker statistics
	GetStats() *WorkerStats
}

// Scheduler defines the interface for scheduled jobs
type Scheduler interface {
	// Schedule adds a recurring job
	Schedule(ctx context.Context, spec *ScheduleSpec) error
	
	// Unschedule removes a scheduled job
	Unschedule(ctx context.Context, name string) error
	
	// ListSchedules returns all scheduled jobs
	ListSchedules(ctx context.Context) ([]*ScheduleSpec, error)
	
	// Start begins the scheduler
	Start(ctx context.Context) error
	
	// Stop stops the scheduler
	Stop(ctx context.Context) error
}

// QueueStats represents queue statistics
type QueueStats struct {
	Name          string            `json:"name"`
	Pending       int64             `json:"pending"`
	Running       int64             `json:"running"`
	Completed     int64             `json:"completed"`
	Failed        int64             `json:"failed"`
	Scheduled     int64             `json:"scheduled"`
	Throughput    float64           `json:"throughput"`    // jobs per minute
	AvgDuration   time.Duration     `json:"avg_duration"`  // average job duration
	ErrorRate     float64           `json:"error_rate"`    // percentage of failed jobs
	OldestPending *time.Time        `json:"oldest_pending,omitempty"`
	Priorities    map[int]int64     `json:"priorities"`    // count by priority
	JobTypes      map[string]int64  `json:"job_types"`     // count by job type
	UpdatedAt     time.Time         `json:"updated_at"`
}

// WorkerStats represents worker statistics
type WorkerStats struct {
	ID               string            `json:"id"`
	Status           string            `json:"status"`
	Queues           []string          `json:"queues"`
	CurrentJob       *Job              `json:"current_job,omitempty"`
	JobsProcessed    int64             `json:"jobs_processed"`
	JobsSucceeded    int64             `json:"jobs_succeeded"`
	JobsFailed       int64             `json:"jobs_failed"`
	LastActivity     time.Time         `json:"last_activity"`
	StartedAt        time.Time         `json:"started_at"`
	ProcessingTime   time.Duration     `json:"processing_time"` // total processing time
	HandlerTypes     []string          `json:"handler_types"`
}

// ScheduleSpec represents a scheduled job specification
type ScheduleSpec struct {
	Name        string                 `json:"name"`
	CronSpec    string                 `json:"cron_spec"` // e.g., "0 0 * * *" for daily at midnight
	JobType     string                 `json:"job_type"`
	Queue       string                 `json:"queue"`
	Payload     map[string]interface{} `json:"payload"`
	Timezone    string                 `json:"timezone"`
	Enabled     bool                   `json:"enabled"`
	NextRun     *time.Time             `json:"next_run,omitempty"`
	LastRun     *time.Time             `json:"last_run,omitempty"`
	RunCount    int64                  `json:"run_count"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// JobFilter represents filters for listing jobs
type JobFilter struct {
	Queue       string     `json:"queue,omitempty"`
	Type        string     `json:"type,omitempty"`
	Status      JobStatus  `json:"status,omitempty"`
	TenantID    *uuid.UUID `json:"tenant_id,omitempty"`
	CreatedFrom *time.Time `json:"created_from,omitempty"`
	CreatedTo   *time.Time `json:"created_to,omitempty"`
	Limit       int        `json:"limit"`
	Offset      int        `json:"offset"`
	SortBy      string     `json:"sort_by"` // created_at, priority, status
	SortOrder   string     `json:"sort_order"` // asc, desc
}

// JobEvent represents a job lifecycle event
type JobEvent struct {
	JobID     uuid.UUID              `json:"job_id"`
	EventType string                 `json:"event_type"` // enqueued, started, completed, failed, retried
	Timestamp time.Time              `json:"timestamp"`
	Data      map[string]interface{} `json:"data,omitempty"`
	WorkerID  string                 `json:"worker_id,omitempty"`
}

// JobMiddleware defines middleware for job processing
type JobMiddleware interface {
	Before(ctx context.Context, job *Job) error
	After(ctx context.Context, job *Job, result error) error
}

// RetryStrategy defines retry behavior for failed jobs
type RetryStrategy interface {
	ShouldRetry(job *Job, err error) bool
	NextRetryDelay(job *Job) time.Duration
}

// JobEventListener defines the interface for job event listeners
type JobEventListener interface {
	OnJobEvent(event *JobEvent) error
	GetEventTypes() []string
}

// Manager defines the main interface for queue management
type Manager interface {
	Queue
	Scheduler
	
	// CreateWorker creates a new worker instance
	CreateWorker(id string, queues []string, concurrency int) Worker
	
	// RegisterMiddleware registers global middleware
	RegisterMiddleware(middleware JobMiddleware)
	
	// SetRetryStrategy sets the retry strategy
	SetRetryStrategy(strategy RetryStrategy)
	
	// AddEventListener adds an event listener
	AddEventListener(listener JobEventListener)
	
	// GetSystemStats returns overall system statistics
	GetSystemStats(ctx context.Context) (*SystemStats, error)
	
	// HealthCheck returns system health status
	HealthCheck(ctx context.Context) (*HealthStatus, error)
}

// SystemStats represents overall queue system statistics
type SystemStats struct {
	Queues        map[string]*QueueStats `json:"queues"`
	Workers       []*WorkerStats         `json:"workers"`
	ActiveWorkers int                    `json:"active_workers"`
	TotalJobs     int64                  `json:"total_jobs"`
	TotalQueues   int                    `json:"total_queues"`
	SystemUptime  time.Duration          `json:"system_uptime"`
	MemoryUsage   int64                  `json:"memory_usage_bytes"`
	RedisInfo     map[string]interface{} `json:"redis_info"`
	UpdatedAt     time.Time              `json:"updated_at"`
}

// HealthStatus represents system health
type HealthStatus struct {
	Healthy      bool                   `json:"healthy"`
	Status       string                 `json:"status"`
	Message      string                 `json:"message,omitempty"`
	Checks       map[string]CheckResult `json:"checks"`
	LastCheck    time.Time              `json:"last_check"`
}

type CheckResult struct {
	Healthy   bool          `json:"healthy"`
	Message   string        `json:"message,omitempty"`
	Duration  time.Duration `json:"duration"`
	Timestamp time.Time     `json:"timestamp"`
}