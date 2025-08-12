package middleware

import (
	"bytes"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pytake/pytake-go/internal/logger"
)

// LoggingConfig holds configuration for request logging
type LoggingConfig struct {
	// Skip paths from logging
	SkipPaths []string

	// Skip health check endpoints
	SkipHealthChecks bool

	// Log request body (be careful with sensitive data)
	LogRequestBody bool

	// Log response body (be careful with sensitive data)
	LogResponseBody bool

	// Maximum body size to log (in bytes)
	MaxBodySize int64

	// Skip paths with specific methods
	SkipMethods []string

	// Log only errors (4xx, 5xx status codes)
	ErrorsOnly bool
}

// DefaultLoggingConfig returns default logging configuration
func DefaultLoggingConfig() *LoggingConfig {
	return &LoggingConfig{
		SkipPaths: []string{
			"/health",
			"/health/live",
			"/health/ready",
			"/metrics",
		},
		SkipHealthChecks: true,
		LogRequestBody:   false, // Disabled by default for security
		LogResponseBody:  false, // Disabled by default for security
		MaxBodySize:      1024,  // 1KB max
		SkipMethods:      []string{"OPTIONS"},
		ErrorsOnly:       false,
	}
}

// responseWriter wraps gin.ResponseWriter to capture response body
type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *responseWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// StructuredLogging creates a structured logging middleware
func StructuredLogging(log *logger.Logger, config *LoggingConfig) gin.HandlerFunc {
	if config == nil {
		config = DefaultLoggingConfig()
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

		// Skip certain methods
		method := c.Request.Method
		for _, skipMethod := range config.SkipMethods {
			if method == skipMethod {
				c.Next()
				return
			}
		}

		start := time.Now()

		// Capture request body if configured
		var requestBody []byte
		if config.LogRequestBody {
			if c.Request.Body != nil {
				requestBody, _ = io.ReadAll(c.Request.Body)
				if int64(len(requestBody)) > config.MaxBodySize {
					requestBody = requestBody[:config.MaxBodySize]
				}
				// Restore body for handlers
				c.Request.Body = io.NopCloser(bytes.NewReader(requestBody))
			}
		}

		// Capture response body if configured
		var respWriter *responseWriter
		if config.LogResponseBody {
			respWriter = &responseWriter{
				ResponseWriter: c.Writer,
				body:           bytes.NewBuffer(nil),
			}
			c.Writer = respWriter
		}

		// Process request
		c.Next()

		// Calculate request duration
		duration := time.Since(start)
		statusCode := c.Writer.Status()

		// Skip logging non-errors if configured
		if config.ErrorsOnly && statusCode < 400 {
			return
		}

		// Build log fields
		fields := []interface{}{
			"method", method,
			"path", path,
			"status", statusCode,
			"duration", duration,
			"duration_ms", float64(duration.Nanoseconds()) / 1e6,
			"ip", c.ClientIP(),
			"user_agent", c.GetHeader("User-Agent"),
			"request_id", c.GetString("request_id"),
		}

		// Add tenant information if available
		if tenantID := c.GetString("tenant_id"); tenantID != "" {
			fields = append(fields, "tenant_id", tenantID)
		}

		// Add user information if available
		if userID := c.GetString("user_id"); userID != "" {
			fields = append(fields, "user_id", userID)
		}

		// Add request size
		if c.Request.ContentLength > 0 {
			fields = append(fields, "request_size", c.Request.ContentLength)
		}

		// Add response size
		fields = append(fields, "response_size", c.Writer.Size())

		// Add query parameters (be careful with sensitive data)
		if len(c.Request.URL.RawQuery) > 0 {
			fields = append(fields, "query", c.Request.URL.RawQuery)
		}

		// Add important headers
		if referer := c.GetHeader("Referer"); referer != "" {
			fields = append(fields, "referer", referer)
		}

		if forwarded := c.GetHeader("X-Forwarded-For"); forwarded != "" {
			fields = append(fields, "x_forwarded_for", forwarded)
		}

		// Add request body if configured
		if config.LogRequestBody && len(requestBody) > 0 {
			fields = append(fields, "request_body", string(requestBody))
		}

		// Add response body if configured
		if config.LogResponseBody && respWriter != nil {
			responseBody := respWriter.body.Bytes()
			if int64(len(responseBody)) > config.MaxBodySize {
				responseBody = responseBody[:config.MaxBodySize]
			}
			if len(responseBody) > 0 {
				fields = append(fields, "response_body", string(responseBody))
			}
		}

		// Add error information if present
		if len(c.Errors) > 0 {
			errors := make([]string, len(c.Errors))
			for i, err := range c.Errors {
				errors[i] = err.Error()
			}
			fields = append(fields, "errors", errors)
		}

		// Log based on status code
		switch {
		case statusCode >= 500:
			log.Error("HTTP request completed with server error")
		case statusCode >= 400:
			log.Warn("HTTP request completed with client error")
		case statusCode >= 300:
			log.Info("HTTP request completed with redirect")
		default:
			log.Info("HTTP request completed")
		}
	}
}

// SecurityLogging creates middleware for security event logging
func SecurityLogging(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// Track security-sensitive endpoints
		securityEndpoints := map[string]bool{
			"/auth/login":    true,
			"/auth/register": true,
			"/auth/refresh":  true,
			"/webhooks":      true,
		}

		isSecurityEndpoint := false
		for endpoint := range securityEndpoints {
			if path == endpoint || (endpoint == "/webhooks" && len(path) > 9 && path[:9] == "/webhooks") {
				isSecurityEndpoint = true
				break
			}
		}

		if isSecurityEndpoint {
			start := time.Now()
			c.Next()
			duration := time.Since(start)

			fields := []interface{}{
				"event", "security_endpoint_access",
				"method", c.Request.Method,
				"path", path,
				"status", c.Writer.Status(),
				"duration", duration,
				"ip", c.ClientIP(),
				"user_agent", c.GetHeader("User-Agent"),
				"request_id", c.GetString("request_id"),
			}

			// Add authentication context
			if userID := c.GetString("user_id"); userID != "" {
				fields = append(fields, "authenticated_user", userID)
			}

			// Add tenant context
			if tenantID := c.GetString("tenant_id"); tenantID != "" {
				fields = append(fields, "tenant_id", tenantID)
			}

			// Check for suspicious patterns
			userAgent := c.GetHeader("User-Agent")
			if userAgent == "" {
				fields = append(fields, "suspicious", "missing_user_agent")
			}

			// Check for failed authentication
			if c.Writer.Status() == 401 || c.Writer.Status() == 403 {
				log.Warn("Security event: authentication failure")
			} else {
				log.Info("Security event: endpoint access")
			}
		} else {
			c.Next()
		}
	}
}

// AuditLogging creates middleware for audit logging
func AuditLogging(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		path := c.Request.URL.Path

		// Track operations that should be audited
		shouldAudit := false
		auditActions := []string{"POST", "PUT", "DELETE", "PATCH"}
		for _, action := range auditActions {
			if method == action {
				shouldAudit = true
				break
			}
		}

		// Skip health checks and read-only operations from audit
		if path == "/health" || path == "/health/live" || path == "/health/ready" {
			shouldAudit = false
		}

		if shouldAudit {
			start := time.Now()
			c.Next()
			duration := time.Since(start)

			fields := []interface{}{
				"event", "audit_log",
				"method", method,
				"path", path,
				"status", c.Writer.Status(),
				"duration", duration,
				"ip", c.ClientIP(),
				"user_agent", c.GetHeader("User-Agent"),
				"request_id", c.GetString("request_id"),
				"timestamp", start.UTC(),
			}

			// Add user context
			if userID := c.GetString("user_id"); userID != "" {
				fields = append(fields, "user_id", userID)
			}

			if email := c.GetString("user_email"); email != "" {
				fields = append(fields, "user_email", email)
			}

			// Add tenant context
			if tenantID := c.GetString("tenant_id"); tenantID != "" {
				fields = append(fields, "tenant_id", tenantID)
			}

			// Add resource information if available from URL params
			if id := c.Param("id"); id != "" {
				fields = append(fields, "resource_id", id)
			}

			// Log success or failure
			if c.Writer.Status() >= 400 {
				log.Warn("Audit: operation failed")
			} else {
				log.Info("Audit: operation completed")
			}
		} else {
			c.Next()
		}
	}
}

// ErrorRecoveryLogging creates middleware for logging panic recoveries
func ErrorRecoveryLogging(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				fields := []interface{}{
					"event", "panic_recovery",
					"error", err,
					"method", c.Request.Method,
					"path", c.Request.URL.Path,
					"ip", c.ClientIP(),
					"user_agent", c.GetHeader("User-Agent"),
					"request_id", c.GetString("request_id"),
				}

				if userID := c.GetString("user_id"); userID != "" {
					fields = append(fields, "user_id", userID)
				}

				if tenantID := c.GetString("tenant_id"); tenantID != "" {
					fields = append(fields, "tenant_id", tenantID)
				}

				log.Error("Panic recovered in HTTP handler")
				
				c.JSON(500, gin.H{
					"error":      "Internal server error",
					"request_id": c.GetString("request_id"),
				})
			}
		}()

		c.Next()
	}
}

// PerformanceLogging creates middleware for performance monitoring
func PerformanceLogging(log *logger.Logger, slowThreshold time.Duration) gin.HandlerFunc {
	if slowThreshold == 0 {
		slowThreshold = 5 * time.Second // Default 5 seconds
	}

	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		duration := time.Since(start)

		if duration > slowThreshold {
			fields := []interface{}{
				"event", "slow_request",
				"method", c.Request.Method,
				"path", c.Request.URL.Path,
				"duration", duration,
				"duration_ms", float64(duration.Nanoseconds()) / 1e6,
				"threshold_ms", float64(slowThreshold.Nanoseconds()) / 1e6,
				"status", c.Writer.Status(),
				"ip", c.ClientIP(),
				"request_id", c.GetString("request_id"),
			}

			if userID := c.GetString("user_id"); userID != "" {
				fields = append(fields, "user_id", userID)
			}

			if tenantID := c.GetString("tenant_id"); tenantID != "" {
				fields = append(fields, "tenant_id", tenantID)
			}

			log.Warn("Performance: slow request detected")
		}
	}
}