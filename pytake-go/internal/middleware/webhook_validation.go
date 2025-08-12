package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pytake/pytake-go/internal/logger"
)

// WebhookValidationConfig holds configuration for webhook validation
type WebhookValidationConfig struct {
	SignatureHeader    string        // Header name for signature (e.g., "X-Hub-Signature-256")
	SignaturePrefix    string        // Prefix for signature (e.g., "sha256=")
	TimestampHeader    string        // Header name for timestamp (e.g., "X-Request-Timestamp")
	TimestampTolerance time.Duration // Maximum age allowed for requests
	RequireTimestamp   bool          // Whether timestamp validation is required
	RequireSignature   bool          // Whether signature validation is required
}

// WhatsAppWebhookValidation creates middleware for WhatsApp webhook validation
func WhatsAppWebhookValidation(log *logger.Logger) gin.HandlerFunc {
	config := &WebhookValidationConfig{
		SignatureHeader:    "X-Hub-Signature-256",
		SignaturePrefix:    "sha256=",
		TimestampHeader:    "X-Request-Timestamp",
		TimestampTolerance: 5 * time.Minute,
		RequireTimestamp:   false, // WhatsApp doesn't send timestamps
		RequireSignature:   true,
	}
	
	return createWebhookValidator(config, log)
}

// GenericWebhookValidation creates middleware for generic webhook validation with custom config
func GenericWebhookValidation(config *WebhookValidationConfig, log *logger.Logger) gin.HandlerFunc {
	return createWebhookValidator(config, log)
}

// createWebhookValidator creates the actual webhook validation middleware
func createWebhookValidator(config *WebhookValidationConfig, log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Read request body
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			log.Error("Failed to read webhook body", "error", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Failed to read request body",
			})
			c.Abort()
			return
		}

		// Restore body for downstream handlers
		c.Request.Body = io.NopCloser(bytes.NewReader(body))

		// Store raw body in context for signature validation
		c.Set("webhook_raw_body", body)

		// Validate timestamp if required
		if config.RequireTimestamp {
			if !validateTimestamp(c, config, log) {
				return
			}
		}

		// Validate signature if required
		if config.RequireSignature {
			signature := c.GetHeader(config.SignatureHeader)
			if signature == "" {
				log.Warn("Missing webhook signature",
					"header", config.SignatureHeader,
					"path", c.Request.URL.Path,
					"ip", c.ClientIP())
				
				c.JSON(http.StatusUnauthorized, gin.H{
					"error":   "Missing signature",
					"message": "Webhook signature is required",
				})
				c.Abort()
				return
			}

			// Store signature in context for later validation with secret
			c.Set("webhook_signature", signature)
			c.Set("webhook_signature_config", config)
		}

		c.Next()
	}
}

// ValidateWebhookSignature validates the webhook signature with a provided secret
func ValidateWebhookSignature(c *gin.Context, secret string) bool {
	// Get raw body from context
	rawBody, exists := c.Get("webhook_raw_body")
	if !exists {
		return false
	}

	body, ok := rawBody.([]byte)
	if !ok {
		return false
	}

	// Get signature from context
	signature, exists := c.Get("webhook_signature")
	if !exists {
		return false
	}

	sig, ok := signature.(string)
	if !ok {
		return false
	}

	// Get config from context
	configInterface, exists := c.Get("webhook_signature_config")
	if !exists {
		return false
	}

	config, ok := configInterface.(*WebhookValidationConfig)
	if !ok {
		return false
	}

	return verifyHMACSignature(body, sig, secret, config)
}

// validateTimestamp validates the request timestamp
func validateTimestamp(c *gin.Context, config *WebhookValidationConfig, log *logger.Logger) bool {
	timestampHeader := c.GetHeader(config.TimestampHeader)
	if timestampHeader == "" {
		log.Warn("Missing webhook timestamp",
			"header", config.TimestampHeader,
			"path", c.Request.URL.Path,
			"ip", c.ClientIP())
		
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Missing timestamp",
			"message": "Webhook timestamp is required",
		})
		c.Abort()
		return false
	}

	// Parse timestamp (assuming Unix timestamp)
	var requestTime time.Time

	// Try parsing as Unix timestamp first
	if timestamp, parseErr := time.Parse("1609459200", timestampHeader); parseErr == nil {
		requestTime = timestamp
	} else if timestamp, parseErr := time.Parse(time.RFC3339, timestampHeader); parseErr == nil {
		requestTime = timestamp
	} else {
		log.Warn("Invalid timestamp format",
			"timestamp", timestampHeader,
			"path", c.Request.URL.Path,
			"ip", c.ClientIP())
		
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid timestamp format",
			"message": "Timestamp must be Unix timestamp or RFC3339 format",
		})
		c.Abort()
		return false
	}

	// Check if timestamp is within tolerance
	now := time.Now()
	age := now.Sub(requestTime)

	if age < 0 {
		age = -age // Handle future timestamps
	}

	if age > config.TimestampTolerance {
		log.Warn("Webhook timestamp too old",
			"timestamp", timestampHeader,
			"age_seconds", age.Seconds(),
			"tolerance_seconds", config.TimestampTolerance.Seconds(),
			"path", c.Request.URL.Path,
			"ip", c.ClientIP())
		
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Request too old",
			"message": "Webhook request timestamp is outside tolerance window",
		})
		c.Abort()
		return false
	}

	return true
}

// verifyHMACSignature verifies HMAC signature
func verifyHMACSignature(body []byte, signature, secret string, config *WebhookValidationConfig) bool {
	// Remove prefix if present
	signature = strings.TrimPrefix(signature, config.SignaturePrefix)
	
	// Calculate expected signature
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))
	
	// Compare signatures using constant-time comparison
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// WebhookSignatureValidator is a helper that can be used in handlers
type WebhookSignatureValidator struct {
	config *WebhookValidationConfig
	log    *logger.Logger
}

// NewWebhookSignatureValidator creates a new webhook signature validator
func NewWebhookSignatureValidator(config *WebhookValidationConfig, log *logger.Logger) *WebhookSignatureValidator {
	return &WebhookSignatureValidator{
		config: config,
		log:    log,
	}
}

// ValidateSignature validates webhook signature in a handler
func (v *WebhookSignatureValidator) ValidateSignature(body []byte, signature, secret string) bool {
	if signature == "" {
		v.log.Warn("Empty signature provided for validation")
		return false
	}

	if secret == "" {
		v.log.Warn("Empty secret provided for validation")
		return false
	}

	return verifyHMACSignature(body, signature, secret, v.config)
}

// ValidateWithMultipleSecrets validates signature against multiple possible secrets
func (v *WebhookSignatureValidator) ValidateWithMultipleSecrets(body []byte, signature string, secrets []string) bool {
	for _, secret := range secrets {
		if v.ValidateSignature(body, signature, secret) {
			return true
		}
	}
	return false
}

// LogValidationAttempt logs webhook validation attempts for security monitoring
func (v *WebhookSignatureValidator) LogValidationAttempt(c *gin.Context, success bool, reason string) {
	fields := []interface{}{
		"path", c.Request.URL.Path,
		"method", c.Request.Method,
		"ip", c.ClientIP(),
		"user_agent", c.GetHeader("User-Agent"),
		"success", success,
	}

	if reason != "" {
		fields = append(fields, "reason", reason)
	}

	if success {
		v.log.Info("Webhook validation successful")
	} else {
		v.log.Warn("Webhook validation failed")
	}
}

// WebhookRateLimiter creates a specialized rate limiter for webhooks
func WebhookRateLimiter(rdb interface{}, requestsPerMinute int, log *logger.Logger) gin.HandlerFunc {
	// Simple pass-through for now - the actual rate limiting will be handled by the main rate limiter
	return func(c *gin.Context) {
		c.Next()
	}
}

// WebhookSecurityHeaders adds security headers specific to webhook endpoints
func WebhookSecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Remove headers that might leak information
		c.Header("Server", "")
		c.Header("X-Powered-By", "")
		
		// Add webhook-specific security headers
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "no-referrer")
		
		// Don't cache webhook responses
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")

		c.Next()
	}
}