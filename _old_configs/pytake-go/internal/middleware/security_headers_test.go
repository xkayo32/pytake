package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSecurityHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name     string
		config   *SecurityHeadersConfig
		expected map[string]string
	}{
		{
			name: "Development configuration",
			config: &SecurityHeadersConfig{
				CSPPolicy:         "default-src 'self'; script-src 'self' 'unsafe-inline'",
				HSTSMaxAge:        0,
				HSTSIncludeSubdomains: false,
				FrameOptions:      "DENY",
				ContentTypeOptions: true,
				ReferrerPolicy:    "same-origin",
				PermissionsPolicy: "geolocation=(), microphone=(), camera=()",
			},
			expected: map[string]string{
				"Content-Security-Policy":   "default-src 'self'; script-src 'self' 'unsafe-inline'",
				"X-Frame-Options":          "DENY",
				"X-Content-Type-Options":   "nosniff",
				"Referrer-Policy":          "same-origin",
				"Permissions-Policy":       "geolocation=(), microphone=(), camera=()",
				"X-XSS-Protection":         "1; mode=block",
			},
		},
		{
			name: "Production configuration with HTTPS",
			config: &SecurityHeadersConfig{
				CSPPolicy:         "default-src 'self'",
				HSTSMaxAge:        31536000,
				HSTSIncludeSubdomains: true,
				FrameOptions:      "SAMEORIGIN",
				ContentTypeOptions: true,
				ReferrerPolicy:    "strict-origin-when-cross-origin",
			},
			expected: map[string]string{
				"Content-Security-Policy":     "default-src 'self'",
				"Strict-Transport-Security":   "max-age=31536000; includeSubDomains",
				"X-Frame-Options":            "SAMEORIGIN",
				"X-Content-Type-Options":     "nosniff",
				"Referrer-Policy":            "strict-origin-when-cross-origin",
				"X-XSS-Protection":           "1; mode=block",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			middleware := SecurityHeaders(tt.config)

			router := gin.New()
			router.Use(middleware)
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "ok"})
			})

			w := httptest.NewRecorder()
			req, err := http.NewRequest("GET", "/test", nil)
			require.NoError(t, err)

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			// Check all expected headers are present
			for header, expectedValue := range tt.expected {
				actualValue := w.Header().Get(header)
				assert.Equal(t, expectedValue, actualValue, "Header %s should match", header)
			}
		})
	}
}

func TestSecurityHeadersForEnvironment(t *testing.T) {
	tests := []struct {
		name        string
		environment string
		isHTTPS     bool
		checks      func(*testing.T, *SecurityHeadersConfig)
	}{
		{
			name:        "Development environment",
			environment: "development",
			isHTTPS:     false,
			checks: func(t *testing.T, config *SecurityHeadersConfig) {
				assert.Equal(t, int64(0), config.HSTSMaxAge, "HSTS should be disabled in development")
				assert.Contains(t, config.CSPPolicy, "unsafe-inline", "CSP should allow unsafe-inline in development")
				assert.Equal(t, "same-origin", config.ReferrerPolicy)
			},
		},
		{
			name:        "Production environment with HTTPS",
			environment: "production",
			isHTTPS:     true,
			checks: func(t *testing.T, config *SecurityHeadersConfig) {
				assert.Greater(t, config.HSTSMaxAge, int64(0), "HSTS should be enabled in production with HTTPS")
				assert.True(t, config.HSTSIncludeSubdomains, "HSTS should include subdomains in production")
				assert.NotContains(t, config.CSPPolicy, "unsafe-inline", "CSP should not allow unsafe-inline in production")
				assert.Equal(t, "strict-origin-when-cross-origin", config.ReferrerPolicy)
			},
		},
		{
			name:        "Production environment without HTTPS",
			environment: "production",
			isHTTPS:     false,
			checks: func(t *testing.T, config *SecurityHeadersConfig) {
				assert.Equal(t, int64(0), config.HSTSMaxAge, "HSTS should be disabled without HTTPS")
			},
		},
		{
			name:        "Staging environment",
			environment: "staging",
			isHTTPS:     true,
			checks: func(t *testing.T, config *SecurityHeadersConfig) {
				assert.Greater(t, config.HSTSMaxAge, int64(0), "HSTS should be enabled in staging with HTTPS")
				assert.False(t, config.HSTSIncludeSubdomains, "HSTS should not include subdomains in staging")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := SecurityHeadersForEnvironment(tt.environment, tt.isHTTPS)
			require.NotNil(t, config)
			tt.checks(t, config)
		})
	}
}

func TestSecurityHeadersCSPNonce(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := &SecurityHeadersConfig{
		CSPPolicy: "default-src 'self'; script-src 'self' 'nonce-{{nonce}}'",
	}

	middleware := SecurityHeaders(config)

	router := gin.New()
	router.Use(middleware)
	router.GET("/test", func(c *gin.Context) {
		nonce, exists := c.Get("csp-nonce")
		assert.True(t, exists, "CSP nonce should be available in context")
		assert.NotEmpty(t, nonce, "CSP nonce should not be empty")
		c.JSON(http.StatusOK, gin.H{"nonce": nonce})
	})

	w := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "/test", nil)
	require.NoError(t, err)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	cspHeader := w.Header().Get("Content-Security-Policy")
	assert.Contains(t, cspHeader, "nonce-", "CSP header should contain nonce")
	assert.NotContains(t, cspHeader, "{{nonce}}", "CSP header should not contain template placeholder")
}

func TestSecurityHeadersDisabled(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := &SecurityHeadersConfig{
		CSPPolicy:         "",
		HSTSMaxAge:        0,
		FrameOptions:      "",
		ContentTypeOptions: false,
		ReferrerPolicy:    "",
	}

	middleware := SecurityHeaders(config)

	router := gin.New()
	router.Use(middleware)
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "/test", nil)
	require.NoError(t, err)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Check that disabled headers are not present
	assert.Empty(t, w.Header().Get("Content-Security-Policy"))
	assert.Empty(t, w.Header().Get("Strict-Transport-Security"))
	assert.Empty(t, w.Header().Get("X-Frame-Options"))
	assert.Empty(t, w.Header().Get("X-Content-Type-Options"))
	assert.Empty(t, w.Header().Get("Referrer-Policy"))
}

func TestSecurityHeadersCORS(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := &SecurityHeadersConfig{
		CSPPolicy: "default-src 'self'",
	}

	middleware := SecurityHeaders(config)

	router := gin.New()
	router.Use(middleware)
	router.OPTIONS("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	tests := []struct {
		name   string
		origin string
		method string
	}{
		{
			name:   "Preflight request",
			origin: "https://app.pytake.com",
			method: "POST",
		},
		{
			name:   "Simple CORS request",
			origin: "https://dashboard.pytake.com",
			method: "GET",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			req, err := http.NewRequest("OPTIONS", "/test", nil)
			require.NoError(t, err)

			req.Header.Set("Origin", tt.origin)
			req.Header.Set("Access-Control-Request-Method", tt.method)

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			// Security headers should still be present even for CORS requests
			assert.NotEmpty(t, w.Header().Get("Content-Security-Policy"))
		})
	}
}

func TestSecurityHeadersHSTSVariations(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name               string
		maxAge             int64
		includeSubdomains  bool
		preload            bool
		expectedHeader     string
	}{
		{
			name:              "Basic HSTS",
			maxAge:            31536000,
			includeSubdomains: false,
			preload:           false,
			expectedHeader:    "max-age=31536000",
		},
		{
			name:              "HSTS with subdomains",
			maxAge:            31536000,
			includeSubdomains: true,
			preload:           false,
			expectedHeader:    "max-age=31536000; includeSubDomains",
		},
		{
			name:              "HSTS with preload",
			maxAge:            63072000,
			includeSubdomains: true,
			preload:           true,
			expectedHeader:    "max-age=63072000; includeSubDomains; preload",
		},
		{
			name:              "HSTS disabled",
			maxAge:            0,
			includeSubdomains: false,
			preload:           false,
			expectedHeader:    "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := &SecurityHeadersConfig{
				HSTSMaxAge:            tt.maxAge,
				HSTSIncludeSubdomains: tt.includeSubdomains,
				HSTSPreload:           tt.preload,
			}

			middleware := SecurityHeaders(config)

			router := gin.New()
			router.Use(middleware)
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "ok"})
			})

			w := httptest.NewRecorder()
			req, err := http.NewRequest("GET", "/test", nil)
			require.NoError(t, err)

			router.ServeHTTP(w, req)

			hstsHeader := w.Header().Get("Strict-Transport-Security")
			assert.Equal(t, tt.expectedHeader, hstsHeader)
		})
	}
}

func BenchmarkSecurityHeaders(b *testing.B) {
	gin.SetMode(gin.TestMode)

	config := SecurityHeadersForEnvironment("production", true)
	middleware := SecurityHeaders(config)

	router := gin.New()
	router.Use(middleware)
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/test", nil)
			router.ServeHTTP(w, req)
		}
	})
}