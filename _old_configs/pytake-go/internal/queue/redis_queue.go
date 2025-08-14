package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/google/uuid"
)

// RedisQueue implements Queue interface using Redis
type RedisQueue struct {
	client     *redis.Client
	keyPrefix  string
	middleware []JobMiddleware
	listeners  []JobEventListener
	strategy   RetryStrategy
}

// NewRedisQueue creates a new Redis-based queue
func NewRedisQueue(client *redis.Client, keyPrefix string) *RedisQueue {
	return &RedisQueue{
		client:    client,
		keyPrefix: keyPrefix,
		middleware: make([]JobMiddleware, 0),
		listeners:  make([]JobEventListener, 0),
	}
}

// Enqueue adds a job to the queue
func (q *RedisQueue) Enqueue(ctx context.Context, job *Job) error {
	if job.ID == uuid.Nil {
		job.ID = uuid.New()
	}
	
	job.Status = JobStatusPending
	job.CreatedAt = time.Now()
	
	// Serialize job
	jobData, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("failed to marshal job: %w", err)
	}
	
	// Add to pending queue with priority
	queueKey := q.getQueueKey(job.Queue)
	score := q.calculateScore(job)
	
	pipe := q.client.Pipeline()
	pipe.ZAdd(ctx, queueKey, &redis.Z{
		Score:  score,
		Member: string(jobData),
	})
	
	// Store job data
	jobKey := q.getJobKey(job.ID)
	pipe.Set(ctx, jobKey, jobData, 24*time.Hour) // TTL 24 hours
	
	// Update stats
	statsKey := q.getStatsKey(job.Queue)
	pipe.HIncrBy(ctx, statsKey, "pending", 1)
	pipe.HIncrBy(ctx, statsKey, "total", 1)
	pipe.HIncrBy(ctx, statsKey, fmt.Sprintf("priority_%d", int(job.Priority)), 1)
	pipe.HIncrBy(ctx, statsKey, fmt.Sprintf("type_%s", job.Type), 1)
	
	_, err = pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to enqueue job: %w", err)
	}
	
	// Emit event
	q.emitEvent(&JobEvent{
		JobID:     job.ID,
		EventType: "enqueued",
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"queue":    job.Queue,
			"type":     job.Type,
			"priority": job.Priority,
		},
	})
	
	return nil
}

// EnqueueDelayed adds a job to be processed after a delay
func (q *RedisQueue) EnqueueDelayed(ctx context.Context, job *Job, delay time.Duration) error {
	scheduledAt := time.Now().Add(delay)
	return q.EnqueueAt(ctx, job, scheduledAt)
}

// EnqueueAt schedules a job to be processed at a specific time
func (q *RedisQueue) EnqueueAt(ctx context.Context, job *Job, at time.Time) error {
	if job.ID == uuid.Nil {
		job.ID = uuid.New()
	}
	
	job.Status = JobStatusPending
	job.CreatedAt = time.Now()
	job.ScheduledAt = &at
	
	// Serialize job
	jobData, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("failed to marshal job: %w", err)
	}
	
	// Add to delayed queue
	delayedKey := q.getDelayedKey()
	score := float64(at.Unix())
	
	pipe := q.client.Pipeline()
	pipe.ZAdd(ctx, delayedKey, &redis.Z{
		Score:  score,
		Member: string(jobData),
	})
	
	// Store job data
	jobKey := q.getJobKey(job.ID)
	pipe.Set(ctx, jobKey, jobData, time.Until(at)+24*time.Hour)
	
	// Update stats
	statsKey := q.getStatsKey(job.Queue)
	pipe.HIncrBy(ctx, statsKey, "scheduled", 1)
	pipe.HIncrBy(ctx, statsKey, "total", 1)
	
	_, err = pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to schedule job: %w", err)
	}
	
	// Emit event
	q.emitEvent(&JobEvent{
		JobID:     job.ID,
		EventType: "scheduled",
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"queue":       job.Queue,
			"type":        job.Type,
			"scheduled_at": at,
		},
	})
	
	return nil
}

// Dequeue retrieves a job from the queue for processing
func (q *RedisQueue) Dequeue(ctx context.Context, queues []string) (*Job, error) {
	// First, move any ready scheduled jobs to pending
	q.moveScheduledJobs(ctx)
	
	// Try to get a job from any of the specified queues (priority order)
	for _, queueName := range queues {
		queueKey := q.getQueueKey(queueName)
		
		// Pop highest priority job
		result := q.client.ZPopMax(ctx, queueKey, 1)
		if result.Err() != nil {
			if result.Err() == redis.Nil {
				continue // Try next queue
			}
			return nil, fmt.Errorf("failed to dequeue from %s: %w", queueName, result.Err())
		}
		
		if len(result.Val()) == 0 {
			continue // Queue is empty, try next
		}
		
		// Deserialize job
		jobData := result.Val()[0].Member.(string)
		var job Job
		if err := json.Unmarshal([]byte(jobData), &job); err != nil {
			return nil, fmt.Errorf("failed to unmarshal job: %w", err)
		}
		
		// Update job status
		job.Status = JobStatusRunning
		now := time.Now()
		job.StartedAt = &now
		
		// Update job in storage
		if err := q.UpdateJob(ctx, &job); err != nil {
			return nil, fmt.Errorf("failed to update job status: %w", err)
		}
		
		// Update stats
		statsKey := q.getStatsKey(queueName)
		pipe := q.client.Pipeline()
		pipe.HIncrBy(ctx, statsKey, "pending", -1)
		pipe.HIncrBy(ctx, statsKey, "running", 1)
		pipe.Exec(ctx)
		
		// Emit event
		q.emitEvent(&JobEvent{
			JobID:     job.ID,
			EventType: "started",
			Timestamp: time.Now(),
			Data: map[string]interface{}{
				"queue": job.Queue,
				"type":  job.Type,
			},
		})
		
		return &job, nil
	}
	
	return nil, nil // No jobs available
}

// Ack acknowledges successful job completion
func (q *RedisQueue) Ack(ctx context.Context, job *Job) error {
	job.Status = JobStatusCompleted
	now := time.Now()
	job.CompletedAt = &now
	
	// Update job
	if err := q.UpdateJob(ctx, job); err != nil {
		return fmt.Errorf("failed to update job: %w", err)
	}
	
	// Update stats
	statsKey := q.getStatsKey(job.Queue)
	pipe := q.client.Pipeline()
	pipe.HIncrBy(ctx, statsKey, "running", -1)
	pipe.HIncrBy(ctx, statsKey, "completed", 1)
	
	// Calculate and update duration stats
	if job.StartedAt != nil {
		duration := job.CompletedAt.Sub(*job.StartedAt).Minutes()
		pipe.LPush(ctx, q.getDurationKey(job.Queue), duration)
		pipe.LTrim(ctx, q.getDurationKey(job.Queue), 0, 999) // Keep last 1000 durations
	}
	
	pipe.Exec(ctx)
	
	// Emit event
	q.emitEvent(&JobEvent{
		JobID:     job.ID,
		EventType: "completed",
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"queue":    job.Queue,
			"type":     job.Type,
			"duration": job.CompletedAt.Sub(*job.StartedAt).Seconds(),
		},
	})
	
	return nil
}

// Nack marks a job as failed and potentially retries it
func (q *RedisQueue) Nack(ctx context.Context, job *Job, err error) error {
	job.Error = err.Error()
	job.RetryCount++
	
	// Check if we should retry
	shouldRetry := false
	if q.strategy != nil {
		shouldRetry = q.strategy.ShouldRetry(job, err)
	} else {
		shouldRetry = job.RetryCount <= job.MaxRetries
	}
	
	if shouldRetry {
		job.Status = JobStatusRetrying
		
		// Calculate retry delay
		var retryDelay time.Duration
		if q.strategy != nil {
			retryDelay = q.strategy.NextRetryDelay(job)
		} else {
			// Exponential backoff: 30s, 60s, 120s, 240s, ...
			retryDelay = time.Duration(30*job.RetryCount) * time.Second
		}
		
		// Schedule for retry
		retryAt := time.Now().Add(retryDelay)
		job.ScheduledAt = &retryAt
		
		if err := q.EnqueueAt(ctx, job, retryAt); err != nil {
			return fmt.Errorf("failed to schedule retry: %w", err)
		}
		
		// Emit retry event
		q.emitEvent(&JobEvent{
			JobID:     job.ID,
			EventType: "retried",
			Timestamp: time.Now(),
			Data: map[string]interface{}{
				"queue":        job.Queue,
				"type":         job.Type,
				"retry_count":  job.RetryCount,
				"retry_delay":  retryDelay.Seconds(),
				"scheduled_at": retryAt,
				"error":        err.Error(),
			},
		})
	} else {
		job.Status = JobStatusFailed
		now := time.Now()
		job.CompletedAt = &now
		
		// Update job
		if err := q.UpdateJob(ctx, job); err != nil {
			return fmt.Errorf("failed to update failed job: %w", err)
		}
		
		// Update stats
		statsKey := q.getStatsKey(job.Queue)
		pipe := q.client.Pipeline()
		pipe.HIncrBy(ctx, statsKey, "running", -1)
		pipe.HIncrBy(ctx, statsKey, "failed", 1)
		pipe.Exec(ctx)
		
		// Emit failed event
		q.emitEvent(&JobEvent{
			JobID:     job.ID,
			EventType: "failed",
			Timestamp: time.Now(),
			Data: map[string]interface{}{
				"queue":       job.Queue,
				"type":        job.Type,
				"retry_count": job.RetryCount,
				"error":       err.Error(),
			},
		})
	}
	
	// Update stats
	statsKey := q.getStatsKey(job.Queue)
	q.client.HIncrBy(ctx, statsKey, "running", -1)
	
	return nil
}

// GetJob retrieves a job by ID
func (q *RedisQueue) GetJob(ctx context.Context, jobID uuid.UUID) (*Job, error) {
	jobKey := q.getJobKey(jobID)
	result := q.client.Get(ctx, jobKey)
	if result.Err() != nil {
		if result.Err() == redis.Nil {
			return nil, fmt.Errorf("job not found")
		}
		return nil, fmt.Errorf("failed to get job: %w", result.Err())
	}
	
	var job Job
	if err := json.Unmarshal([]byte(result.Val()), &job); err != nil {
		return nil, fmt.Errorf("failed to unmarshal job: %w", err)
	}
	
	return &job, nil
}

// UpdateJob updates job status and metadata
func (q *RedisQueue) UpdateJob(ctx context.Context, job *Job) error {
	jobData, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("failed to marshal job: %w", err)
	}
	
	jobKey := q.getJobKey(job.ID)
	ttl := 24 * time.Hour
	if job.CompletedAt != nil {
		// Keep completed jobs for 7 days
		ttl = 7 * 24 * time.Hour
	}
	
	if err := q.client.Set(ctx, jobKey, jobData, ttl).Err(); err != nil {
		return fmt.Errorf("failed to update job: %w", err)
	}
	
	return nil
}

// DeleteJob removes a job from the queue
func (q *RedisQueue) DeleteJob(ctx context.Context, jobID uuid.UUID) error {
	jobKey := q.getJobKey(jobID)
	if err := q.client.Del(ctx, jobKey).Err(); err != nil {
		return fmt.Errorf("failed to delete job: %w", err)
	}
	
	return nil
}

// GetQueueStats returns queue statistics
func (q *RedisQueue) GetQueueStats(ctx context.Context, queueName string) (*QueueStats, error) {
	statsKey := q.getStatsKey(queueName)
	durationKey := q.getDurationKey(queueName)
	queueKey := q.getQueueKey(queueName)
	
	// Get basic stats
	stats := q.client.HGetAll(ctx, statsKey)
	if stats.Err() != nil {
		return nil, fmt.Errorf("failed to get stats: %w", stats.Err())
	}
	
	// Parse stats
	queueStats := &QueueStats{
		Name:       queueName,
		Priorities: make(map[int]int64),
		JobTypes:   make(map[string]int64),
		UpdatedAt:  time.Now(),
	}
	
	for key, value := range stats.Val() {
		val, _ := strconv.ParseInt(value, 10, 64)
		switch key {
		case "pending":
			queueStats.Pending = val
		case "running":
			queueStats.Running = val
		case "completed":
			queueStats.Completed = val
		case "failed":
			queueStats.Failed = val
		case "scheduled":
			queueStats.Scheduled = val
		case "total":
			// Total is calculated from other fields
		default:
			if strings.HasPrefix(key, "priority_") {
				priority, _ := strconv.Atoi(strings.TrimPrefix(key, "priority_"))
				queueStats.Priorities[priority] = val
			} else if strings.HasPrefix(key, "type_") {
				jobType := strings.TrimPrefix(key, "type_")
				queueStats.JobTypes[jobType] = val
			}
		}
	}
	
	// Calculate throughput and error rate
	total := queueStats.Completed + queueStats.Failed
	if total > 0 {
		queueStats.ErrorRate = float64(queueStats.Failed) / float64(total) * 100
		
		// Simple throughput calculation (jobs per minute in last hour)
		// In production, you'd want more sophisticated time-windowed calculations
		queueStats.Throughput = float64(total) / 60.0
	}
	
	// Get average duration
	durations := q.client.LRange(ctx, durationKey, 0, -1)
	if durations.Err() == nil && len(durations.Val()) > 0 {
		var totalDuration float64
		var validCount int
		
		for _, d := range durations.Val() {
			if duration, err := strconv.ParseFloat(d, 64); err == nil {
				totalDuration += duration
				validCount++
			}
		}
		
		if validCount > 0 {
			queueStats.AvgDuration = time.Duration(totalDuration/float64(validCount)) * time.Minute
		}
	}
	
	// Get oldest pending job
	oldest := q.client.ZRange(ctx, queueKey, 0, 0)
	if oldest.Err() == nil && len(oldest.Val()) > 0 {
		var job Job
		if err := json.Unmarshal([]byte(oldest.Val()[0]), &job); err == nil {
			queueStats.OldestPending = &job.CreatedAt
		}
	}
	
	return queueStats, nil
}

// ListJobs returns paginated list of jobs
func (q *RedisQueue) ListJobs(ctx context.Context, filter *JobFilter) ([]*Job, int64, error) {
	// This is a simplified implementation
	// In production, you'd want more sophisticated filtering and pagination
	
	pattern := q.keyPrefix + ":job:*"
	keys := q.client.Keys(ctx, pattern)
	if keys.Err() != nil {
		return nil, 0, fmt.Errorf("failed to list jobs: %w", keys.Err())
	}
	
	var jobs []*Job
	var total int64
	
	for _, key := range keys.Val() {
		result := q.client.Get(ctx, key)
		if result.Err() != nil {
			continue
		}
		
		var job Job
		if err := json.Unmarshal([]byte(result.Val()), &job); err != nil {
			continue
		}
		
		// Apply filters
		if filter.Queue != "" && job.Queue != filter.Queue {
			continue
		}
		if filter.Type != "" && job.Type != filter.Type {
			continue
		}
		if filter.Status != "" && job.Status != filter.Status {
			continue
		}
		if filter.TenantID != nil && (job.TenantID == nil || *job.TenantID != *filter.TenantID) {
			continue
		}
		if filter.CreatedFrom != nil && job.CreatedAt.Before(*filter.CreatedFrom) {
			continue
		}
		if filter.CreatedTo != nil && job.CreatedAt.After(*filter.CreatedTo) {
			continue
		}
		
		total++
		
		// Apply pagination
		if len(jobs) >= filter.Offset && len(jobs) < filter.Offset+filter.Limit {
			jobs = append(jobs, &job)
		}
	}
	
	return jobs, total, nil
}

// PurgeQueue removes all jobs from a queue
func (q *RedisQueue) PurgeQueue(ctx context.Context, queueName string) error {
	queueKey := q.getQueueKey(queueName)
	statsKey := q.getStatsKey(queueName)
	durationKey := q.getDurationKey(queueName)
	
	pipe := q.client.Pipeline()
	pipe.Del(ctx, queueKey)
	pipe.Del(ctx, statsKey)
	pipe.Del(ctx, durationKey)
	
	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to purge queue: %w", err)
	}
	
	return nil
}

// Close closes the queue connection
func (q *RedisQueue) Close() error {
	return q.client.Close()
}

// Helper methods
func (q *RedisQueue) calculateScore(job *Job) float64 {
	// Higher priority = higher score = processed first
	// Add timestamp component to maintain FIFO within same priority
	priorityScore := float64(job.Priority) * 1000000
	timeScore := float64(job.CreatedAt.Unix())
	return priorityScore + timeScore
}

func (q *RedisQueue) moveScheduledJobs(ctx context.Context) {
	delayedKey := q.getDelayedKey()
	now := float64(time.Now().Unix())
	
	// Get jobs ready to be processed
	result := q.client.ZRangeByScoreWithScores(ctx, delayedKey, &redis.ZRangeBy{
		Min: "-inf",
		Max: fmt.Sprintf("%.0f", now),
	})
	
	if result.Err() != nil || len(result.Val()) == 0 {
		return
	}
	
	pipe := q.client.Pipeline()
	
	for _, z := range result.Val() {
		jobData := z.Member.(string)
		var job Job
		if err := json.Unmarshal([]byte(jobData), &job); err != nil {
			continue
		}
		
		// Remove from delayed queue
		pipe.ZRem(ctx, delayedKey, jobData)
		
		// Add to regular queue
		queueKey := q.getQueueKey(job.Queue)
		score := q.calculateScore(&job)
		pipe.ZAdd(ctx, queueKey, &redis.Z{
			Score:  score,
			Member: jobData,
		})
		
		// Update stats
		statsKey := q.getStatsKey(job.Queue)
		pipe.HIncrBy(ctx, statsKey, "scheduled", -1)
		pipe.HIncrBy(ctx, statsKey, "pending", 1)
	}
	
	pipe.Exec(ctx)
}

func (q *RedisQueue) emitEvent(event *JobEvent) {
	for _, listener := range q.listeners {
		// Check if listener is interested in this event type
		for _, eventType := range listener.GetEventTypes() {
			if eventType == event.EventType || eventType == "*" {
				go func(l JobEventListener, e *JobEvent) {
					l.OnJobEvent(e)
				}(listener, event)
				break
			}
		}
	}
}

// Key generation methods
func (q *RedisQueue) getQueueKey(queueName string) string {
	return fmt.Sprintf("%s:queue:%s", q.keyPrefix, queueName)
}

func (q *RedisQueue) getJobKey(jobID uuid.UUID) string {
	return fmt.Sprintf("%s:job:%s", q.keyPrefix, jobID.String())
}

func (q *RedisQueue) getStatsKey(queueName string) string {
	return fmt.Sprintf("%s:stats:%s", q.keyPrefix, queueName)
}

func (q *RedisQueue) getDurationKey(queueName string) string {
	return fmt.Sprintf("%s:duration:%s", q.keyPrefix, queueName)
}

func (q *RedisQueue) getDelayedKey() string {
	return fmt.Sprintf("%s:delayed", q.keyPrefix)
}

// Additional methods to implement Manager interface methods
func (q *RedisQueue) RegisterMiddleware(middleware JobMiddleware) {
	q.middleware = append(q.middleware, middleware)
}

func (q *RedisQueue) SetRetryStrategy(strategy RetryStrategy) {
	q.strategy = strategy
}

func (q *RedisQueue) AddEventListener(listener JobEventListener) {
	q.listeners = append(q.listeners, listener)
}