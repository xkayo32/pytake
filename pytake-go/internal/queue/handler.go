package queue

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/logger"
)

// HTTPHandler handles queue-related HTTP requests
type HTTPHandler struct {
	manager Manager
	log     *logger.Logger
}

// NewHTTPHandler creates a new queue HTTP handler
func NewHTTPHandler(manager Manager, log *logger.Logger) *HTTPHandler {
	return &HTTPHandler{
		manager: manager,
		log:     log,
	}
}

// EnqueueJob enqueues a new job
// @Summary Enqueue job
// @Description Add a new job to the queue
// @Tags Queue
// @Accept json
// @Produce json
// @Security Bearer
// @Param job body EnqueueJobRequest true \"Job data\"
// @Success 201 {object} Job
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /queue/jobs [post]
func (h *HTTPHandler) EnqueueJob(c *gin.Context) {
	var req EnqueueJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create job
	job := &Job{
		ID:         uuid.New(),
		Type:       req.Type,
		Queue:      req.Queue,
		Payload:    req.Payload,
		Priority:   req.Priority,
		MaxRetries: req.MaxRetries,
		Timeout:    time.Duration(req.TimeoutSeconds) * time.Second,
		Metadata:   req.Metadata,
		CreatedAt:  time.Now(),
	}

	// Set tenant context if available
	if tenantID := c.GetString("tenant_id"); tenantID != "" {
		if tid, err := uuid.Parse(tenantID); err == nil {
			job.TenantID = &tid
		}
	}

	// Set default values
	if job.Queue == "" {
		job.Queue = "default"
	}
	if job.MaxRetries == 0 {
		job.MaxRetries = 3
	}
	if job.Timeout == 0 {
		job.Timeout = 5 * time.Minute
	}

	// Enqueue job
	var err error
	if req.DelaySeconds > 0 {
		delay := time.Duration(req.DelaySeconds) * time.Second
		err = h.manager.EnqueueDelayed(c.Request.Context(), job, delay)
	} else if req.ScheduledAt != "" {
		scheduledAt, parseErr := time.Parse(time.RFC3339, req.ScheduledAt)
		if parseErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid scheduled_at format, use RFC3339"})
			return
		}
		err = h.manager.EnqueueAt(c.Request.Context(), job, scheduledAt)
	} else {
		err = h.manager.Enqueue(c.Request.Context(), job)
	}

	if err != nil {
		h.log.Error("Failed to enqueue job", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enqueue job"})
		return
	}

	c.JSON(http.StatusCreated, job)
}

// GetJob retrieves a specific job
// @Summary Get job
// @Description Get job details by ID
// @Tags Queue
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true \"Job ID\" format(uuid)
// @Success 200 {object} Job
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /queue/jobs/{id} [get]
func (h *HTTPHandler) GetJob(c *gin.Context) {
	jobID := c.Param("id")
	jid, err := uuid.Parse(jobID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job ID"})
		return
	}

	job, err := h.manager.GetJob(c.Request.Context(), jid)
	if err != nil {
		if err.Error() == "job not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
			return
		}
		h.log.Error("Failed to get job", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get job"})
		return
	}

	c.JSON(http.StatusOK, job)
}

// ListJobs lists jobs with filtering and pagination
// @Summary List jobs
// @Description Get list of jobs with filtering and pagination
// @Tags Queue
// @Accept json
// @Produce json
// @Security Bearer
// @Param queue query string false \"Filter by queue name\"
// @Param type query string false \"Filter by job type\"
// @Param status query string false \"Filter by status\"
// @Param page query int false \"Page number\" default(1)
// @Param limit query int false \"Items per page\" default(20)
// @Success 200 {array} Job
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /queue/jobs [get]
func (h *HTTPHandler) ListJobs(c *gin.Context) {
	// Parse query parameters
	queue := c.Query("queue")
	jobType := c.Query("type")
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Build filter
	filter := &JobFilter{
		Queue:  queue,
		Type:   jobType,
		Limit:  limit,
		Offset: (page - 1) * limit,
	}

	if status != "" {
		filter.Status = JobStatus(status)
	}

	// Set tenant context if available
	if tenantID := c.GetString("tenant_id"); tenantID != "" {
		if tid, err := uuid.Parse(tenantID); err == nil {
			filter.TenantID = &tid
		}
	}

	jobs, total, err := h.manager.ListJobs(c.Request.Context(), filter)
	if err != nil {
		h.log.Error("Failed to list jobs", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list jobs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"jobs":     jobs,
		"total":    total,
		"page":     page,
		"limit":    limit,
		"has_more": total > int64(page*limit),
	})
}

// CancelJob cancels a pending or running job
// @Summary Cancel job
// @Description Cancel a job by ID
// @Tags Queue
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true \"Job ID\" format(uuid)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /queue/jobs/{id}/cancel [post]
func (h *HTTPHandler) CancelJob(c *gin.Context) {
	jobID := c.Param("id")
	jid, err := uuid.Parse(jobID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job ID"})
		return
	}

	// Get the job
	job, err := h.manager.GetJob(c.Request.Context(), jid)
	if err != nil {
		if err.Error() == "job not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
			return
		}
		h.log.Error("Failed to get job", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get job"})
		return
	}

	// Check if job can be cancelled
	if job.Status != JobStatusPending && job.Status != JobStatusRunning && job.Status != JobStatusRetrying {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Job cannot be cancelled in current status: " + string(job.Status)})
		return
	}

	// Cancel the job
	job.Status = JobStatusCancelled
	now := time.Now()
	job.CompletedAt = &now

	if err := h.manager.UpdateJob(c.Request.Context(), job); err != nil {
		h.log.Error("Failed to cancel job", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel job"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"message":     "Job cancelled successfully",
		"job_id":      job.ID,
		"cancelled_at": job.CompletedAt,
	})
}

// GetQueueStats retrieves queue statistics
// @Summary Get queue stats
// @Description Get statistics for a specific queue
// @Tags Queue
// @Accept json
// @Produce json
// @Security Bearer
// @Param name path string true \"Queue name\"
// @Success 200 {object} QueueStats
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /queue/stats/{name} [get]
func (h *HTTPHandler) GetQueueStats(c *gin.Context) {
	queueName := c.Param("name")

	stats, err := h.manager.GetQueueStats(c.Request.Context(), queueName)
	if err != nil {
		h.log.Error("Failed to get queue stats", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get queue stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetSystemStats retrieves system-wide statistics
// @Summary Get system stats
// @Description Get overall queue system statistics
// @Tags Queue
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} SystemStats
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /queue/stats [get]
func (h *HTTPHandler) GetSystemStats(c *gin.Context) {
	stats, err := h.manager.GetSystemStats(c.Request.Context())
	if err != nil {
		h.log.Error("Failed to get system stats", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get system stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetHealthStatus retrieves system health status
// @Summary Get health status
// @Description Get queue system health status
// @Tags Queue
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} HealthStatus
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /queue/health [get]
func (h *HTTPHandler) GetHealthStatus(c *gin.Context) {
	health, err := h.manager.HealthCheck(c.Request.Context())
	if err != nil {
		h.log.Error("Failed to get health status", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get health status"})
		return
	}

	statusCode := http.StatusOK
	if !health.Healthy {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, health)
}

// PurgeQueue removes all jobs from a queue
// @Summary Purge queue
// @Description Remove all jobs from a specific queue
// @Tags Queue
// @Accept json
// @Produce json
// @Security Bearer
// @Param name path string true \"Queue name\"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /queue/{name}/purge [post]
func (h *HTTPHandler) PurgeQueue(c *gin.Context) {
	queueName := c.Param("name")

	if err := h.manager.PurgeQueue(c.Request.Context(), queueName); err != nil {
		h.log.Error("Failed to purge queue", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to purge queue"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Queue purged successfully",
		"queue":   queueName,
	})
}

// CreateSchedule creates a scheduled job
// @Summary Create schedule
// @Description Create a recurring job schedule
// @Tags Queue
// @Accept json
// @Produce json
// @Security Bearer
// @Param schedule body ScheduleRequest true \"Schedule configuration\"
// @Success 201 {object} ScheduleSpec
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /queue/schedules [post]
func (h *HTTPHandler) CreateSchedule(c *gin.Context) {
	var req ScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create schedule spec
	schedule := &ScheduleSpec{
		Name:     req.Name,
		CronSpec: req.CronSpec,
		JobType:  req.JobType,
		Queue:    req.Queue,
		Payload:  req.Payload,
		Timezone: req.Timezone,
		Enabled:  req.Enabled,
		Metadata: req.Metadata,
	}

	// Set defaults
	if schedule.Queue == "" {
		schedule.Queue = "default"
	}
	if schedule.Timezone == "" {
		schedule.Timezone = "UTC"
	}

	if err := h.manager.Schedule(c.Request.Context(), schedule); err != nil {
		h.log.Error("Failed to create schedule", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create schedule"})
		return
	}

	c.JSON(http.StatusCreated, schedule)
}

// ListSchedules lists all scheduled jobs
// @Summary List schedules
// @Description Get list of all scheduled jobs
// @Tags Queue
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {array} ScheduleSpec
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /queue/schedules [get]
func (h *HTTPHandler) ListSchedules(c *gin.Context) {
	schedules, err := h.manager.ListSchedules(c.Request.Context())
	if err != nil {
		h.log.Error("Failed to list schedules", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list schedules"})
		return
	}

	c.JSON(http.StatusOK, schedules)
}

// DeleteSchedule removes a scheduled job
// @Summary Delete schedule
// @Description Remove a scheduled job by name
// @Tags Queue
// @Accept json
// @Produce json
// @Security Bearer
// @Param name path string true \"Schedule name\"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /queue/schedules/{name} [delete]
func (h *HTTPHandler) DeleteSchedule(c *gin.Context) {
	scheduleName := c.Param("name")

	if err := h.manager.Unschedule(c.Request.Context(), scheduleName); err != nil {
		if err.Error() == "schedule '"+scheduleName+"' not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Schedule not found"})
			return
		}
		h.log.Error("Failed to delete schedule", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete schedule"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Schedule deleted successfully",
		"name":    scheduleName,
	})
}

// Request/Response types
type EnqueueJobRequest struct {
	Type           string                 `json:"type" binding:"required"`
	Queue          string                 `json:"queue,omitempty"`
	Payload        map[string]interface{} `json:"payload" binding:"required"`
	Priority       JobPriority            `json:"priority,omitempty"`
	MaxRetries     int                    `json:"max_retries,omitempty"`
	TimeoutSeconds int                    `json:"timeout_seconds,omitempty"`
	DelaySeconds   int                    `json:"delay_seconds,omitempty"`
	ScheduledAt    string                 `json:"scheduled_at,omitempty"` // RFC3339 format
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
}

type ScheduleRequest struct {
	Name     string                 `json:"name" binding:"required"`
	CronSpec string                 `json:"cron_spec" binding:"required"`
	JobType  string                 `json:"job_type" binding:"required"`
	Queue    string                 `json:"queue,omitempty"`
	Payload  map[string]interface{} `json:"payload" binding:"required"`
	Timezone string                 `json:"timezone,omitempty"`
	Enabled  bool                   `json:"enabled"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}