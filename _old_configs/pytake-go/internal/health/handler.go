package health

import (
	"context"
	"database/sql"
	"net/http"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/pytake/pytake-go/internal/logger"
)

// Handler handles health check requests
type Handler struct {
	db  *gorm.DB
	rdb *redis.Client
	log *logger.Logger
}

// NewHandler creates a new health check handler
func NewHandler(db *gorm.DB, rdb *redis.Client, log *logger.Logger) *Handler {
	return &Handler{
		db:  db,
		rdb: rdb,
		log: log,
	}
}

// HealthStatus represents the overall health status
type HealthStatus struct {
	Status    string                 `json:"status"`
	Timestamp time.Time              `json:"timestamp"`
	Version   string                 `json:"version"`
	Uptime    time.Duration          `json:"uptime"`
	Checks    map[string]CheckResult `json:"checks"`
	System    SystemInfo             `json:"system"`
}

// CheckResult represents the result of a health check
type CheckResult struct {
	Status    string        `json:"status"`
	Message   string        `json:"message,omitempty"`
	Duration  time.Duration `json:"duration"`
	Timestamp time.Time     `json:"timestamp"`
	Details   interface{}   `json:"details,omitempty"`
}

// SystemInfo contains system information
type SystemInfo struct {
	GoVersion      string `json:"go_version"`
	NumGoroutine   int    `json:"num_goroutine"`
	NumCPU         int    `json:"num_cpu"`
	MemoryAlloc    uint64 `json:"memory_alloc_bytes"`
	MemorySys      uint64 `json:"memory_sys_bytes"`
	MemoryNumGC    uint32 `json:"memory_num_gc"`
	LastGC         string `json:"last_gc,omitempty"`
}

var startTime = time.Now()

// GetHealth performs comprehensive health checks
// @Summary Health check
// @Description Get system health status with detailed checks
// @Tags Health
// @Accept json
// @Produce json
// @Success 200 {object} HealthStatus "System is healthy"
// @Failure 503 {object} HealthStatus "System is unhealthy"
// @Router /health [get]
func (h *Handler) GetHealth(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	checks := make(map[string]CheckResult)
	overallStatus := "healthy"

	// Database health check
	dbResult := h.checkDatabase(ctx)
	checks["database"] = dbResult
	if dbResult.Status != "healthy" {
		overallStatus = "unhealthy"
	}

	// Redis health check
	redisResult := h.checkRedis(ctx)
	checks["redis"] = redisResult
	if redisResult.Status != "healthy" {
		overallStatus = "unhealthy"
	}

	// External services health check
	externalResult := h.checkExternalServices(ctx)
	checks["external_services"] = externalResult
	if externalResult.Status != "degraded" && externalResult.Status != "healthy" {
		overallStatus = "unhealthy"
	}

	// Queue system health check
	queueResult := h.checkQueue(ctx)
	checks["queue"] = queueResult
	if queueResult.Status != "healthy" {
		overallStatus = "degraded" // Queue issues shouldn't make the whole system unhealthy
	}

	// System resources check
	systemResult := h.checkSystemResources()
	checks["system_resources"] = systemResult
	if systemResult.Status == "critical" {
		overallStatus = "unhealthy"
	}

	// Get system info
	systemInfo := h.getSystemInfo()

	healthStatus := HealthStatus{
		Status:    overallStatus,
		Timestamp: time.Now(),
		Version:   "1.0.0", // TODO: Get from build info
		Uptime:    time.Since(startTime),
		Checks:    checks,
		System:    systemInfo,
	}

	statusCode := http.StatusOK
	if overallStatus == "unhealthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, healthStatus)
}

// GetLiveness provides a simple liveness check
// @Summary Liveness check
// @Description Simple liveness probe for orchestrators
// @Tags Health
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /health/live [get]
func (h *Handler) GetLiveness(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "alive",
		"timestamp": time.Now(),
	})
}

// GetReadiness provides a readiness check
// @Summary Readiness check
// @Description Readiness probe for orchestrators
// @Tags Health
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 503 {object} map[string]interface{}
// @Router /health/ready [get]
func (h *Handler) GetReadiness(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Quick checks for essential services
	dbHealthy := h.quickDBCheck(ctx)
	redisHealthy := h.quickRedisCheck(ctx)

	if dbHealthy && redisHealthy {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ready",
			"timestamp": time.Now(),
		})
	} else {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":    "not_ready",
			"timestamp": time.Now(),
			"database":  dbHealthy,
			"redis":     redisHealthy,
		})
	}
}

// checkDatabase performs database health check
func (h *Handler) checkDatabase(ctx context.Context) CheckResult {
	start := time.Now()
	result := CheckResult{
		Timestamp: start,
	}

	if h.db == nil {
		result.Status = "unhealthy"
		result.Message = "Database connection not initialized"
		result.Duration = time.Since(start)
		return result
	}

	sqlDB, err := h.db.DB()
	if err != nil {
		result.Status = "unhealthy"
		result.Message = "Failed to get database instance: " + err.Error()
		result.Duration = time.Since(start)
		return result
	}

	// Ping database
	if err := sqlDB.PingContext(ctx); err != nil {
		result.Status = "unhealthy"
		result.Message = "Database ping failed: " + err.Error()
		result.Duration = time.Since(start)
		return result
	}

	// Get database stats
	stats := sqlDB.Stats()
	details := map[string]interface{}{
		"open_connections":     stats.OpenConnections,
		"in_use_connections":   stats.InUse,
		"idle_connections":     stats.Idle,
		"max_open_connections": stats.MaxOpenConnections,
		"wait_count":           stats.WaitCount,
		"wait_duration":        stats.WaitDuration,
	}

	// Check connection pool health
	if stats.OpenConnections > stats.MaxOpenConnections*8/10 {
		result.Status = "degraded"
		result.Message = "Database connection pool usage high"
	} else {
		result.Status = "healthy"
		result.Message = "Database is responsive"
	}

	result.Duration = time.Since(start)
	result.Details = details
	return result
}

// checkRedis performs Redis health check
func (h *Handler) checkRedis(ctx context.Context) CheckResult {
	start := time.Now()
	result := CheckResult{
		Timestamp: start,
	}

	if h.rdb == nil {
		result.Status = "unhealthy"
		result.Message = "Redis connection not initialized"
		result.Duration = time.Since(start)
		return result
	}

	// Ping Redis
	pong, err := h.rdb.Ping(ctx).Result()
	if err != nil {
		result.Status = "unhealthy"
		result.Message = "Redis ping failed: " + err.Error()
		result.Duration = time.Since(start)
		return result
	}

	// Get Redis info
	info, err := h.rdb.Info(ctx).Result()
	if err != nil {
		result.Status = "degraded"
		result.Message = "Redis info command failed: " + err.Error()
	} else {
		result.Status = "healthy"
		result.Message = "Redis is responsive"
		result.Details = map[string]interface{}{
			"ping_response": pong,
			"info_available": true,
		}
	}

	result.Duration = time.Since(start)
	return result
}

// checkExternalServices performs external services health check
func (h *Handler) checkExternalServices(ctx context.Context) CheckResult {
	start := time.Now()
	result := CheckResult{
		Timestamp: start,
		Status:    "healthy",
		Message:   "External services check completed",
	}

	services := make(map[string]string)
	unhealthyCount := 0

	// WhatsApp API check
	if err := h.checkWhatsAppAPI(ctx); err != nil {
		services["whatsapp_api"] = "unhealthy: " + err.Error()
		unhealthyCount++
	} else {
		services["whatsapp_api"] = "healthy"
	}

	// OpenAI API check
	if err := h.checkOpenAIAPI(ctx); err != nil {
		services["openai_api"] = "unhealthy: " + err.Error()
		unhealthyCount++
	} else {
		services["openai_api"] = "healthy"
	}

	// Determine overall external services status
	totalServices := len(services)
	if unhealthyCount == totalServices {
		result.Status = "unhealthy"
		result.Message = "All external services are unhealthy"
	} else if unhealthyCount > 0 {
		result.Status = "degraded"
		result.Message = "Some external services are unhealthy"
	}

	result.Duration = time.Since(start)
	result.Details = services
	return result
}

// checkQueue performs queue system health check
func (h *Handler) checkQueue(ctx context.Context) CheckResult {
	start := time.Now()
	result := CheckResult{
		Timestamp: start,
	}

	// Check if queue keys exist in Redis
	pattern := "pytake:queue:*"
	keys, err := h.rdb.Keys(ctx, pattern).Result()
	if err != nil {
		result.Status = "degraded"
		result.Message = "Failed to check queue keys: " + err.Error()
		result.Duration = time.Since(start)
		return result
	}

	// Basic queue health indicators
	queueCount := len(keys)
	details := map[string]interface{}{
		"queue_keys_found": queueCount,
		"pattern":          pattern,
	}

	result.Status = "healthy"
	result.Message = "Queue system is accessible"
	result.Duration = time.Since(start)
	result.Details = details
	return result
}

// checkSystemResources performs system resources health check
func (h *Handler) checkSystemResources() CheckResult {
	start := time.Now()
	result := CheckResult{
		Timestamp: start,
	}

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	// Check memory usage (simplified)
	memoryUsageMB := float64(m.Alloc) / 1024 / 1024
	goroutineCount := runtime.NumGoroutine()

	details := map[string]interface{}{
		"memory_usage_mb":   memoryUsageMB,
		"goroutine_count":   goroutineCount,
		"gc_runs":          m.NumGC,
		"heap_objects":     m.HeapObjects,
	}

	// Simple thresholds (adjust based on your requirements)
	if memoryUsageMB > 1000 || goroutineCount > 10000 {
		result.Status = "critical"
		result.Message = "High resource usage detected"
	} else if memoryUsageMB > 500 || goroutineCount > 5000 {
		result.Status = "warning"
		result.Message = "Moderate resource usage"
	} else {
		result.Status = "healthy"
		result.Message = "System resources are normal"
	}

	result.Duration = time.Since(start)
	result.Details = details
	return result
}

// getSystemInfo collects system information
func (h *Handler) getSystemInfo() SystemInfo {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	info := SystemInfo{
		GoVersion:    runtime.Version(),
		NumGoroutine: runtime.NumGoroutine(),
		NumCPU:       runtime.NumCPU(),
		MemoryAlloc:  m.Alloc,
		MemorySys:    m.Sys,
		MemoryNumGC:  m.NumGC,
	}

	if m.LastGC > 0 {
		info.LastGC = time.Unix(0, int64(m.LastGC)).Format(time.RFC3339)
	}

	return info
}

// Quick health check methods for readiness probe
func (h *Handler) quickDBCheck(ctx context.Context) bool {
	if h.db == nil {
		return false
	}
	
	sqlDB, err := h.db.DB()
	if err != nil {
		return false
	}
	
	return sqlDB.PingContext(ctx) == nil
}

func (h *Handler) quickRedisCheck(ctx context.Context) bool {
	if h.rdb == nil {
		return false
	}
	
	return h.rdb.Ping(ctx).Err() == nil
}

// External service check methods (simplified implementations)
func (h *Handler) checkWhatsAppAPI(ctx context.Context) error {
	// TODO: Implement actual WhatsApp API health check
	// For now, return nil (healthy) - implement based on your WhatsApp client
	return nil
}

func (h *Handler) checkOpenAIAPI(ctx context.Context) error {
	// TODO: Implement actual OpenAI API health check
	// For now, return nil (healthy) - implement based on your OpenAI client
	return nil
}