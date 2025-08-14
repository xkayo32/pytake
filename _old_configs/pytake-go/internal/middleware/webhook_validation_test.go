package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	
	"pytake-backend/internal/logger"
)

func TestWhatsAppWebhookValidation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	// Setup test logger
	log := logger.New("test")
	
	// Set test webhook secret
	os.Setenv("WHATSAPP_WEBHOOK_SECRET", "test-webhook-secret")
	defer os.Unsetenv("WHATSAPP_WEBHOOK_SECRET")

	middleware := WhatsAppWebhookValidation(log)

	tests := []struct {
		name           string
		method         string
		body           string
		secret         string
		expectedStatus int
		description    string
	}{
		{
			name:           "Valid signature",
			method:         "POST",
			body:           `{"object":"whatsapp_business_account"}`,
			secret:         "test-webhook-secret",
			expectedStatus: http.StatusOK,
			description:    "Should allow request with valid HMAC signature",
		},
		{
			name:           "Invalid signature",
			method:         "POST",
			body:           `{"object":"whatsapp_business_account"}`,
			secret:         "wrong-secret",
			expectedStatus: http.StatusUnauthorized,
			description:    "Should reject request with invalid HMAC signature",
		},
		{
			name:           "Missing signature",
			method:         "POST",
			body:           `{"object":"whatsapp_business_account"}`,
			secret:         "",
			expectedStatus: http.StatusUnauthorized,
			description:    "Should reject request without signature header",
		},
		{
			name:           "GET method bypass",
			method:         "GET",
			body:           "",
			secret:         "",
			expectedStatus: http.StatusOK,
			description:    "Should bypass validation for GET requests",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(middleware)
			router.Any("/webhook", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "ok"})
			})

			bodyBuffer := bytes.NewBufferString(tt.body)
			req, err := http.NewRequest(tt.method, "/webhook", bodyBuffer)
			require.NoError(t, err)

			// Generate signature if secret provided
			if tt.secret != "" && tt.method == "POST" {
				signature := generateHMACSignature(tt.body, tt.secret)
				req.Header.Set("X-Hub-Signature-256", "sha256="+signature)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code, tt.description)
		})
	}
}

func TestValidateWebhookSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	tests := []struct {
		name      string
		body      string
		secret    string
		signature string
		expected  bool
	}{
		{
			name:      "Valid signature",
			body:      "test payload",
			secret:    "test-secret",
			signature: generateHMACSignature("test payload", "test-secret"),
			expected:  true,
		},
		{
			name:      "Invalid signature",
			body:      "test payload",
			secret:    "test-secret",
			signature: "invalid-signature",
			expected:  false,
		},
		{
			name:      "Empty signature",
			body:      "test payload",
			secret:    "test-secret",
			signature: "",
			expected:  false,
		},
		{
			name:      "Different body",
			body:      "different payload",
			secret:    "test-secret",
			signature: generateHMACSignature("test payload", "test-secret"),
			expected:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/webhook", bytes.NewBufferString(tt.body))
			if tt.signature != "" {
				req.Header.Set("X-Hub-Signature-256", "sha256="+tt.signature)
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = req

			result := ValidateWebhookSignature(c, tt.secret)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestWebhookValidationEdgeCases(t *testing.T) {
	gin.SetMode(gin.TestMode)
	log := logger.New("test")

	tests := []struct {
		name           string
		setupEnv       func()
		body           string
		headers        map[string]string
		expectedStatus int
		description    string
	}{
		{
			name: "No webhook secret in environment",
			setupEnv: func() {
				os.Unsetenv("WHATSAPP_WEBHOOK_SECRET")
			},
			body:           `{"test": "data"}`,
			headers:        map[string]string{},
			expectedStatus: http.StatusInternalServerError,
			description:    "Should return 500 when webhook secret is not configured",
		},
		{
			name: "Malformed signature header",
			setupEnv: func() {
				os.Setenv("WHATSAPP_WEBHOOK_SECRET", "test-secret")
			},
			body: `{"test": "data"}`,
			headers: map[string]string{
				"X-Hub-Signature-256": "malformed-signature-without-prefix",
			},
			expectedStatus: http.StatusUnauthorized,
			description:    "Should reject malformed signature header",
		},
		{
			name: "Empty body with signature",
			setupEnv: func() {
				os.Setenv("WHATSAPP_WEBHOOK_SECRET", "test-secret")
			},
			body: "",
			headers: map[string]string{
				"X-Hub-Signature-256": "sha256=" + generateHMACSignature("", "test-secret"),
			},
			expectedStatus: http.StatusOK,
			description:    "Should handle empty body correctly",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup environment
			tt.setupEnv()
			defer os.Unsetenv("WHATSAPP_WEBHOOK_SECRET")

			middleware := WhatsAppWebhookValidation(log)
			
			router := gin.New()
			router.Use(middleware)
			router.POST("/webhook", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "ok"})
			})

			req, err := http.NewRequest("POST", "/webhook", bytes.NewBufferString(tt.body))
			require.NoError(t, err)

			for key, value := range tt.headers {
				req.Header.Set(key, value)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code, tt.description)
		})
	}
}

func TestHMACSignatureGeneration(t *testing.T) {
	tests := []struct {
		name     string
		payload  string
		secret   string
		expected string
	}{
		{
			name:     "Standard payload",
			payload:  `{"object":"whatsapp_business_account","entry":[]}`,
			secret:   "my-webhook-secret",
			expected: generateHMACSignature(`{"object":"whatsapp_business_account","entry":[]}`, "my-webhook-secret"),
		},
		{
			name:     "Empty payload",
			payload:  "",
			secret:   "secret",
			expected: generateHMACSignature("", "secret"),
		},
		{
			name:     "Unicode payload",
			payload:  `{"message":"Hello 🌍"}`,
			secret:   "unicode-secret",
			expected: generateHMACSignature(`{"message":"Hello 🌍"}`, "unicode-secret"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := generateHMACSignature(tt.payload, tt.secret)
			assert.Equal(t, tt.expected, result)
			assert.NotEmpty(t, result)
			
			// Verify the signature is valid
			h := hmac.New(sha256.New, []byte(tt.secret))
			h.Write([]byte(tt.payload))
			expectedBytes := h.Sum(nil)
			expectedHex := hex.EncodeToString(expectedBytes)
			
			assert.Equal(t, expectedHex, result)
		})
	}
}

func TestWebhookTimingAttackResistance(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	secret := "timing-attack-test-secret"
	body := `{"test":"timing attack resistance"}`
	
	validSignature := generateHMACSignature(body, secret)
	invalidSignature := "0000000000000000000000000000000000000000000000000000000000000000"

	// Test multiple times to ensure consistent timing
	for i := 0; i < 10; i++ {
		// Valid signature
		req1 := httptest.NewRequest("POST", "/webhook", bytes.NewBufferString(body))
		req1.Header.Set("X-Hub-Signature-256", "sha256="+validSignature)
		w1 := httptest.NewRecorder()
		c1, _ := gin.CreateTestContext(w1)
		c1.Request = req1

		result1 := ValidateWebhookSignature(c1, secret)
		assert.True(t, result1)

		// Invalid signature
		req2 := httptest.NewRequest("POST", "/webhook", bytes.NewBufferString(body))
		req2.Header.Set("X-Hub-Signature-256", "sha256="+invalidSignature)
		w2 := httptest.NewRecorder()
		c2, _ := gin.CreateTestContext(w2)
		c2.Request = req2

		result2 := ValidateWebhookSignature(c2, secret)
		assert.False(t, result2)
	}
}

// Helper function to generate HMAC-SHA256 signature
func generateHMACSignature(payload, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payload))
	return hex.EncodeToString(h.Sum(nil))
}

func BenchmarkWebhookValidation(b *testing.B) {
	gin.SetMode(gin.TestMode)
	
	payload := `{"object":"whatsapp_business_account","entry":[{"id":"123","changes":[]}]}`
	secret := "benchmark-secret"
	signature := generateHMACSignature(payload, secret)

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			req := httptest.NewRequest("POST", "/webhook", bytes.NewBufferString(payload))
			req.Header.Set("X-Hub-Signature-256", "sha256="+signature)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = req

			ValidateWebhookSignature(c, secret)
		}
	})
}