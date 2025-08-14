package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pytake/pytake-go/internal/logger"
)

// Logger middleware
func Logger(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Log request details
		latency := time.Since(start)
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()

		if raw != "" {
			path = path + "?" + raw
		}

		log.Infow("Request",
			"method", method,
			"path", path,
			"status", statusCode,
			"latency", latency,
			"ip", clientIP,
			"user_agent", c.Request.UserAgent(),
			"request_id", c.GetString("request_id"),
		)
	}
}