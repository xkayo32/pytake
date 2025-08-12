package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/logger"
)

// RateLimitConfig holds configuration for rate limiting
type RateLimitConfig struct {
	KeyPrefix        string
	RequestsPerSecond int
	BurstSize        int
	WindowSize       time.Duration
	SkipPaths        []string
	SkipIPs          []string
	TenantBased      bool
	UserBased        bool
	Enabled          bool
}

// DefaultRateLimitConfig returns default rate limiting configuration
func DefaultRateLimitConfig() *RateLimitConfig {
	return &RateLimitConfig{
		KeyPrefix:        "rate_limit",
		RequestsPerSecond: 10,
		BurstSize:        20,
		WindowSize:       time.Minute,
		SkipPaths:        []string{"/health", "/health/live", "/health/ready", "/metrics"},
		SkipIPs:          []string{"127.0.0.1", "::1"},
		TenantBased:      false,
		UserBased:        false,
		Enabled:          true,
	}
}

// RateLimiter creates a new rate limiting middleware
func RateLimiter(rdb *redis.Client, cfg *config.Config, log *logger.Logger) gin.HandlerFunc {
	rateCfg := DefaultRateLimitConfig()
	
	// Override with config values if available
	if cfg.RateLimitRequests > 0 {
		rateCfg.RequestsPerSecond = cfg.RateLimitRequests
		rateCfg.BurstSize = cfg.RateLimitRequests * 2
	}
	if cfg.RateLimitDuration > 0 {
		rateCfg.WindowSize = cfg.RateLimitDuration
	}

	return createRateLimiter(rdb, rateCfg, log)
}

// TenantRateLimiter creates a tenant-based rate limiting middleware
func TenantRateLimiter(rdb *redis.Client, requestsPerMinute int, log *logger.Logger) gin.HandlerFunc {
	rateCfg := DefaultRateLimitConfig()
	rateCfg.TenantBased = true
	rateCfg.RequestsPerSecond = requestsPerMinute
	rateCfg.BurstSize = requestsPerMinute * 2
	rateCfg.KeyPrefix = "tenant_rate_limit"

	return createRateLimiter(rdb, rateCfg, log)
}

// UserRateLimiter creates a user-based rate limiting middleware
func UserRateLimiter(rdb *redis.Client, requestsPerMinute int, log *logger.Logger) gin.HandlerFunc {
	rateCfg := DefaultRateLimitConfig()
	rateCfg.UserBased = true
	rateCfg.RequestsPerSecond = requestsPerMinute
	rateCfg.BurstSize = requestsPerMinute * 2
	rateCfg.KeyPrefix = "user_rate_limit"

	return createRateLimiter(rdb, rateCfg, log)
}

// createRateLimiter creates the actual rate limiting function
func createRateLimiter(rdb *redis.Client, cfg *RateLimitConfig, log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip if rate limiting is disabled
		if !cfg.Enabled {
			c.Next()
			return
		}

		// Skip health check and metrics endpoints
		path := c.Request.URL.Path
		for _, skipPath := range cfg.SkipPaths {
			if strings.HasPrefix(path, skipPath) {
				c.Next()
				return
			}
		}

		// Skip certain IPs
		clientIP := c.ClientIP()
		for _, skipIP := range cfg.SkipIPs {
			if clientIP == skipIP {
				c.Next()
				return
			}
		}

		// Generate rate limiting key
		key := generateRateLimitKey(c, cfg)
		if key == "" {
			c.Next()
			return
		}

		// Check rate limit using sliding window
		allowed, remaining, resetTime, err := checkRateLimit(rdb, key, cfg)
		if err != nil {
			log.Error("Rate limiting error", "error", err, "key", key)
			// On error, allow request but log the issue
			c.Next()
			return
		}

		// Add rate limit headers
		c.Header("X-RateLimit-Limit", strconv.Itoa(cfg.RequestsPerSecond))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(resetTime, 10))
		c.Header("X-RateLimit-Window", cfg.WindowSize.String())

		if !allowed {
			log.Warn("Rate limit exceeded",
				"ip", clientIP,
				"path", path,
				"key", key,
				"limit", cfg.RequestsPerSecond)

			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":     "Rate limit exceeded",
				"message":   "Too many requests. Please try again later.",
				"limit":     cfg.RequestsPerSecond,
				"remaining": remaining,
				"reset_at":  resetTime,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// generateRateLimitKey generates the rate limiting key based on configuration
func generateRateLimitKey(c *gin.Context, cfg *RateLimitConfig) string {
	var keyParts []string
	keyParts = append(keyParts, cfg.KeyPrefix)

	if cfg.TenantBased {
		tenantID := c.GetString("tenant_id")
		if tenantID != "" {
			keyParts = append(keyParts, "tenant", tenantID)
		} else {
			// Fall back to IP if no tenant
			keyParts = append(keyParts, "ip", c.ClientIP())
		}
	} else if cfg.UserBased {
		userID := c.GetString("user_id")
		if userID != "" {
			keyParts = append(keyParts, "user", userID)
		} else {
			// Fall back to IP if no user
			keyParts = append(keyParts, "ip", c.ClientIP())
		}
	} else {
		// IP-based rate limiting
		keyParts = append(keyParts, "ip", c.ClientIP())
	}

	return strings.Join(keyParts, ":")
}

// checkRateLimit implements sliding window rate limiting using Redis
func checkRateLimit(rdb *redis.Client, key string, cfg *RateLimitConfig) (allowed bool, remaining int, resetTime int64, err error) {
	ctx := context.Background()
	now := time.Now()
	windowStart := now.Add(-cfg.WindowSize)
	
	pipe := rdb.Pipeline()

	// Remove old entries outside the window
	pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart.UnixNano(), 10))

	// Count current requests in window
	pipe.ZCard(ctx, key)

	// Add current request
	pipe.ZAdd(ctx, key, redis.Z{
		Score:  float64(now.UnixNano()),
		Member: fmt.Sprintf("%d-%d", now.UnixNano(), randomInt()),
	})

	// Set expiration
	pipe.Expire(ctx, key, cfg.WindowSize+time.Minute)

	results, err := pipe.Exec(ctx)
	if err != nil {
		return false, 0, 0, err
	}

	// Get the count before adding the current request
	currentCount := results[1].(*redis.IntCmd).Val()
	
	// Calculate remaining and reset time
	remaining = cfg.RequestsPerSecond - int(currentCount)
	if remaining < 0 {
		remaining = 0
	}
	
	resetTime = now.Add(cfg.WindowSize).Unix()
	
	// Check if request is allowed
	allowed = currentCount < int64(cfg.RequestsPerSecond)

	return allowed, remaining, resetTime, nil
}

// randomInt generates a random integer for unique request identifiers
func randomInt() int64 {
	return time.Now().UnixNano() % 1000000
}