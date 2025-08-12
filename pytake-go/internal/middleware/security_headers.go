package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeadersConfig holds configuration for security headers
type SecurityHeadersConfig struct {
	// Content Security Policy
	CSP string

	// X-Frame-Options (DENY, SAMEORIGIN, ALLOW-FROM)
	FrameOptions string

	// Referrer-Policy
	ReferrerPolicy string

	// Permissions-Policy (formerly Feature-Policy)
	PermissionsPolicy string

	// X-Content-Type-Options
	ContentTypeOptions string

	// X-XSS-Protection
	XSSProtection string

	// Strict-Transport-Security (HSTS)
	HSTS string

	// Expect-CT
	ExpectCT string

	// Additional custom headers
	CustomHeaders map[string]string

	// Whether to remove server identification headers
	RemoveServerHeaders bool
}

// DefaultSecurityHeadersConfig returns default security headers configuration
func DefaultSecurityHeadersConfig() *SecurityHeadersConfig {
	return &SecurityHeadersConfig{
		CSP: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: ws:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
		FrameOptions:        "DENY",
		ReferrerPolicy:      "strict-origin-when-cross-origin",
		PermissionsPolicy:   "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=(), vibrate=(), fullscreen=(self)",
		ContentTypeOptions:  "nosniff",
		XSSProtection:       "1; mode=block",
		HSTS:                "max-age=31536000; includeSubDomains; preload",
		ExpectCT:            "max-age=86400, enforce",
		RemoveServerHeaders: true,
		CustomHeaders:       make(map[string]string),
	}
}

// APISecurityHeadersConfig returns security headers configuration optimized for API endpoints
func APISecurityHeadersConfig() *SecurityHeadersConfig {
	config := DefaultSecurityHeadersConfig()
	
	// More restrictive CSP for API endpoints
	config.CSP = "default-src 'none'; connect-src 'self';"
	config.FrameOptions = "DENY"
	config.ReferrerPolicy = "no-referrer"
	
	// API-specific headers
	config.CustomHeaders["X-API-Version"] = "1.0"
	config.CustomHeaders["X-Robots-Tag"] = "noindex, nofollow, noarchive, nosnippet, noimageindex"
	
	return config
}

// WebhookSecurityHeadersConfig returns security headers configuration for webhook endpoints
func WebhookSecurityHeadersConfig() *SecurityHeadersConfig {
	config := DefaultSecurityHeadersConfig()
	
	// Minimal headers for webhook endpoints
	config.CSP = "default-src 'none';"
	config.FrameOptions = "DENY"
	config.ReferrerPolicy = "no-referrer"
	config.HSTS = "" // May interfere with external webhook calls
	config.ExpectCT = ""
	
	// Webhook-specific headers
	config.CustomHeaders["X-Webhook-Version"] = "1.0"
	config.CustomHeaders["X-Robots-Tag"] = "noindex, nofollow"
	
	return config
}

// SecurityHeaders creates middleware that adds security headers to responses
func SecurityHeaders(config *SecurityHeadersConfig) gin.HandlerFunc {
	if config == nil {
		config = DefaultSecurityHeadersConfig()
	}

	return func(c *gin.Context) {
		// Remove server identification headers if configured
		if config.RemoveServerHeaders {
			c.Header("Server", "")
			c.Header("X-Powered-By", "")
			c.Header("X-AspNet-Version", "")
			c.Header("X-AspNetMvc-Version", "")
		}

		// Content Security Policy
		if config.CSP != "" {
			c.Header("Content-Security-Policy", config.CSP)
		}

		// X-Frame-Options
		if config.FrameOptions != "" {
			c.Header("X-Frame-Options", config.FrameOptions)
		}

		// Referrer Policy
		if config.ReferrerPolicy != "" {
			c.Header("Referrer-Policy", config.ReferrerPolicy)
		}

		// Permissions Policy
		if config.PermissionsPolicy != "" {
			c.Header("Permissions-Policy", config.PermissionsPolicy)
		}

		// X-Content-Type-Options
		if config.ContentTypeOptions != "" {
			c.Header("X-Content-Type-Options", config.ContentTypeOptions)
		}

		// X-XSS-Protection
		if config.XSSProtection != "" {
			c.Header("X-XSS-Protection", config.XSSProtection)
		}

		// Strict-Transport-Security (HSTS)
		if config.HSTS != "" && c.Request.TLS != nil {
			c.Header("Strict-Transport-Security", config.HSTS)
		}

		// Expect-CT
		if config.ExpectCT != "" && c.Request.TLS != nil {
			c.Header("Expect-CT", config.ExpectCT)
		}

		// Add custom headers
		for key, value := range config.CustomHeaders {
			c.Header(key, value)
		}

		c.Next()
	}
}

// StrictSecurityHeaders creates middleware with strict security headers for sensitive endpoints
func StrictSecurityHeaders() gin.HandlerFunc {
	config := &SecurityHeadersConfig{
		CSP:                "default-src 'none'; connect-src 'self';",
		FrameOptions:       "DENY",
		ReferrerPolicy:     "no-referrer",
		PermissionsPolicy:  "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=(), vibrate=(), fullscreen=(), encrypted-media=(), picture-in-picture=()",
		ContentTypeOptions: "nosniff",
		XSSProtection:      "1; mode=block",
		HSTS:               "max-age=63072000; includeSubDomains; preload",
		ExpectCT:           "max-age=86400, enforce",
		RemoveServerHeaders: true,
		CustomHeaders: map[string]string{
			"X-Robots-Tag":    "noindex, nofollow, noarchive, nosnippet, noimageindex",
			"Cache-Control":   "no-store, no-cache, must-revalidate, proxy-revalidate",
			"Pragma":          "no-cache",
			"Expires":         "0",
		},
	}

	return SecurityHeaders(config)
}


// NoCache adds headers to prevent caching of responses
func NoCache() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Header("Surrogate-Control", "no-store")
		
		c.Next()
	}
}

// SecureJSON sets headers for secure JSON responses
func SecureJSON() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Content-Type", "application/json; charset=utf-8")
		c.Header("X-Content-Type-Options", "nosniff")
		
		// Prevent JSON hijacking
		c.Header("X-Frame-Options", "DENY")
		
		c.Next()
	}
}


// generateRequestID generates a simple request ID
func generateRequestID() string {
	// Simple implementation - in production, use proper UUID generation
	return "req_" + randomString(16)
}

// randomString generates a random string of specified length
func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[randomInt()%int64(len(charset))]
	}
	return string(b)
}

// SecurityHeadersForEnvironment returns security headers configuration based on environment
func SecurityHeadersForEnvironment(environment string, isHTTPS bool) *SecurityHeadersConfig {
	config := DefaultSecurityHeadersConfig()

	switch environment {
	case "development":
		// Relaxed headers for development
		config.CSP = "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss:;"
		config.HSTS = "" // Disable HSTS in development
		config.ExpectCT = ""
		
	case "staging":
		// Moderate security for staging
		config.CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss:;"
		if !isHTTPS {
			config.HSTS = ""
			config.ExpectCT = ""
		}
		
	case "production":
		// Strict security for production
		config.CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' wss:; object-src 'none';"
		if !isHTTPS {
			config.HSTS = ""
			config.ExpectCT = ""
		}
	}

	return config
}