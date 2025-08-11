package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/redis"
)

// RateLimiter middleware
func RateLimiter(rdb *redis.Client, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		clientIP := c.ClientIP()
		key := fmt.Sprintf("rate_limit:%s", clientIP)

		// Increment counter
		count, err := rdb.Incr(ctx, key).Result()
		if err != nil {
			c.Next()
			return
		}

		// Set expiration on first request
		if count == 1 {
			rdb.Expire(ctx, key, cfg.RateLimitDuration)
		}

		// Check if limit exceeded
		if count > int64(cfg.RateLimitRequests) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
			})
			c.Abort()
			return
		}

		// Add rate limit headers
		c.Writer.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", cfg.RateLimitRequests))
		c.Writer.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", cfg.RateLimitRequests-int(count)))
		c.Writer.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(cfg.RateLimitDuration).Unix()))

		c.Next()
	}
}