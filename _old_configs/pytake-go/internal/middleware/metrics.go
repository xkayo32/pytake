package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTP metrics
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint", "status"},
	)

	httpRequestSize = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_size_bytes",
			Help:    "HTTP request size in bytes",
			Buckets: []float64{1, 10, 100, 1000, 10000, 100000, 1000000},
		},
		[]string{"method", "endpoint"},
	)

	httpResponseSize = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_response_size_bytes",
			Help:    "HTTP response size in bytes",
			Buckets: []float64{1, 10, 100, 1000, 10000, 100000, 1000000},
		},
		[]string{"method", "endpoint", "status"},
	)

	// Rate limiting metrics
	rateLimitHits = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "rate_limit_hits_total",
			Help: "Total number of rate limit hits",
		},
		[]string{"endpoint", "limit_type"},
	)

	// Authentication metrics
	authAttempts = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "auth_attempts_total",
			Help: "Total number of authentication attempts",
		},
		[]string{"method", "result"},
	)

	// Webhook metrics
	webhookEvents = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "webhook_events_total",
			Help: "Total number of webhook events received",
		},
		[]string{"source", "event_type", "status"},
	)

	webhookProcessingTime = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "webhook_processing_duration_seconds",
			Help:    "Webhook processing duration in seconds",
			Buckets: []float64{0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
		[]string{"source", "event_type"},
	)

	// Business metrics
	activeConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_connections",
			Help: "Number of active connections",
		},
	)

	whatsappMessages = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "whatsapp_messages_total",
			Help: "Total number of WhatsApp messages",
		},
		[]string{"direction", "type", "status"},
	)

	activeTenants = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_tenants",
			Help: "Number of active tenants",
		},
	)

	// Error metrics
	httpErrors = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_errors_total",
			Help: "Total number of HTTP errors",
		},
		[]string{"method", "endpoint", "status", "error_type"},
	)

	panicRecoveries = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "panic_recoveries_total",
			Help: "Total number of panic recoveries",
		},
		[]string{"endpoint"},
	)
)

// MetricsConfig holds configuration for metrics collection
type MetricsConfig struct {
	// Skip paths from metrics collection
	SkipPaths []string

	// Enable detailed endpoint metrics (can create high cardinality)
	DetailedEndpoints bool

	// Group similar endpoints (e.g., /users/:id -> /users/{id})
	NormalizeEndpoints bool

	// Maximum number of endpoint labels to track
	MaxEndpointLabels int
}

// DefaultMetricsConfig returns default metrics configuration
func DefaultMetricsConfig() *MetricsConfig {
	return &MetricsConfig{
		SkipPaths: []string{
			"/health",
			"/health/live", 
			"/health/ready",
			"/metrics",
		},
		DetailedEndpoints:  false,
		NormalizeEndpoints: true,
		MaxEndpointLabels:  100,
	}
}

// PrometheusMetrics creates middleware for Prometheus metrics collection
func PrometheusMetrics(config *MetricsConfig) gin.HandlerFunc {
	if config == nil {
		config = DefaultMetricsConfig()
	}

	return func(c *gin.Context) {
		// Skip certain paths
		path := c.Request.URL.Path
		for _, skipPath := range config.SkipPaths {
			if path == skipPath {
				c.Next()
				return
			}
		}

		start := time.Now()
		method := c.Request.Method
		
		// Normalize endpoint for metrics
		endpoint := path
		if config.NormalizeEndpoints {
			endpoint = normalizeEndpoint(path)
		}

		// Record request size
		if c.Request.ContentLength > 0 {
			httpRequestSize.WithLabelValues(method, endpoint).Observe(float64(c.Request.ContentLength))
		}

		c.Next()

		// Record metrics after request completion
		duration := time.Since(start)
		status := strconv.Itoa(c.Writer.Status())
		
		// HTTP request metrics
		httpRequestsTotal.WithLabelValues(method, endpoint, status).Inc()
		httpRequestDuration.WithLabelValues(method, endpoint, status).Observe(duration.Seconds())
		
		// Response size metrics
		if c.Writer.Size() > 0 {
			httpResponseSize.WithLabelValues(method, endpoint, status).Observe(float64(c.Writer.Size()))
		}

		// Error metrics
		if c.Writer.Status() >= 400 {
			errorType := getErrorType(c.Writer.Status())
			httpErrors.WithLabelValues(method, endpoint, status, errorType).Inc()
		}
	}
}

// normalizeEndpoint normalizes endpoint paths for metrics
func normalizeEndpoint(path string) string {
	// Simple normalization - replace UUIDs and numeric IDs with placeholders
	// In a real implementation, you might use regex or a more sophisticated approach
	
	// This is a basic implementation - extend based on your routing patterns
	normalizedPath := path
	
	// Common patterns to normalize:
	// /users/123 -> /users/{id}
	// /tenants/abc-def-ghi -> /tenants/{id}
	// /webhooks/whatsapp/xyz -> /webhooks/whatsapp/{id}
	
	// For now, return the original path
	// TODO: Implement proper path normalization based on your routes
	return normalizedPath
}

// getErrorType categorizes HTTP errors
func getErrorType(statusCode int) string {
	switch {
	case statusCode >= 500:
		return "server_error"
	case statusCode == 429:
		return "rate_limit"
	case statusCode == 401:
		return "unauthorized"
	case statusCode == 403:
		return "forbidden"
	case statusCode == 404:
		return "not_found"
	case statusCode >= 400:
		return "client_error"
	default:
		return "unknown"
	}
}

// RecordRateLimitHit records a rate limit hit
func RecordRateLimitHit(endpoint, limitType string) {
	rateLimitHits.WithLabelValues(endpoint, limitType).Inc()
}

// RecordAuthAttempt records an authentication attempt
func RecordAuthAttempt(method, result string) {
	authAttempts.WithLabelValues(method, result).Inc()
}

// RecordWebhookEvent records a webhook event
func RecordWebhookEvent(source, eventType, status string) {
	webhookEvents.WithLabelValues(source, eventType, status).Inc()
}

// RecordWebhookProcessingTime records webhook processing time
func RecordWebhookProcessingTime(source, eventType string, duration time.Duration) {
	webhookProcessingTime.WithLabelValues(source, eventType).Observe(duration.Seconds())
}

// RecordWhatsAppMessage records a WhatsApp message
func RecordWhatsAppMessage(direction, messageType, status string) {
	whatsappMessages.WithLabelValues(direction, messageType, status).Inc()
}

// SetActiveConnections sets the number of active connections
func SetActiveConnections(count float64) {
	activeConnections.Set(count)
}

// SetActiveTenants sets the number of active tenants
func SetActiveTenants(count float64) {
	activeTenants.Set(count)
}

// RecordPanicRecovery records a panic recovery
func RecordPanicRecovery(endpoint string) {
	panicRecoveries.WithLabelValues(endpoint).Inc()
}

// MetricsEnhancedRateLimiter creates a rate limiter with metrics
func MetricsEnhancedRateLimiter(originalMiddleware gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		
		// Store original status for metrics
		originalWriter := c.Writer
		
		originalMiddleware(c)
		
		// Check if rate limit was hit (status 429)
		if c.Writer.Status() == 429 {
			RecordRateLimitHit(normalizeEndpoint(path), "ip_based")
		}
		
		c.Writer = originalWriter
	}
}

// MetricsEnhancedAuth creates auth middleware with metrics
func MetricsEnhancedAuth(originalMiddleware gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		
		originalMiddleware(c)
		
		// Record authentication attempt
		method := "jwt_token"
		if c.Request.URL.Path == "/auth/login" {
			method = "password"
		}
		
		result := "success"
		if c.Writer.Status() == 401 || c.Writer.Status() == 403 {
			result = "failure"
		}
		
		RecordAuthAttempt(method, result)
		
		// Record processing time for auth operations
		if c.Request.URL.Path == "/auth/login" || c.Request.URL.Path == "/auth/refresh" {
			duration := time.Since(start)
			httpRequestDuration.WithLabelValues(c.Request.Method, c.Request.URL.Path, strconv.Itoa(c.Writer.Status())).Observe(duration.Seconds())
		}
	}
}

// WebhookMetrics creates middleware specifically for webhook metrics
func WebhookMetrics(source string) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		
		c.Next()
		
		duration := time.Since(start)
		status := "success"
		
		if c.Writer.Status() >= 400 {
			status = "error"
		}
		
		// Try to determine event type from context or path
		eventType := "unknown"
		if c.Request.Method == "GET" {
			eventType = "verification"
		} else if c.Request.Method == "POST" {
			eventType = "webhook"
		}
		
		RecordWebhookEvent(source, eventType, status)
		RecordWebhookProcessingTime(source, eventType, duration)
	}
}

// InitCustomMetrics initializes custom business metrics
func InitCustomMetrics() {
	// Register custom collectors if needed
	// This function can be called during application startup
	
	// Initialize gauges with default values
	activeConnections.Set(0)
	activeTenants.Set(0)
}