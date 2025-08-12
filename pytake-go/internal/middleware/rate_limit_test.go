package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Mock Redis client for testing
type mockRedisClient struct {
	data map[string]string
}

func (m *mockRedisClient) Get(ctx context.Context, key string) *redis.StringCmd {
	cmd := redis.NewStringCmd(ctx, "GET", key)
	if val, exists := m.data[key]; exists {
		cmd.SetVal(val)
	} else {
		cmd.SetErr(redis.Nil)
	}
	return cmd
}

func (m *mockRedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.StatusCmd {
	cmd := redis.NewStatusCmd(ctx, "SET", key, value)
	m.data[key] = value.(string)
	cmd.SetVal("OK")
	return cmd
}

func (m *mockRedisClient) Del(ctx context.Context, keys ...string) *redis.IntCmd {
	cmd := redis.NewIntCmd(ctx, "DEL", keys)
	deleted := int64(0)
	for _, key := range keys {
		if _, exists := m.data[key]; exists {
			delete(m.data, key)
			deleted++
		}
	}
	cmd.SetVal(deleted)
	return cmd
}

func (m *mockRedisClient) ZAdd(ctx context.Context, key string, members ...*redis.Z) *redis.IntCmd {
	cmd := redis.NewIntCmd(ctx, "ZADD", key)
	cmd.SetVal(int64(len(members)))
	return cmd
}

func (m *mockRedisClient) ZRemRangeByScore(ctx context.Context, key string, min, max string) *redis.IntCmd {
	cmd := redis.NewIntCmd(ctx, "ZREMRANGEBYSCORE", key, min, max)
	cmd.SetVal(0)
	return cmd
}

func (m *mockRedisClient) ZCard(ctx context.Context, key string) *redis.IntCmd {
	cmd := redis.NewIntCmd(ctx, "ZCARD", key)
	cmd.SetVal(1)
	return cmd
}

func newMockRedisClient() *mockRedisClient {
	return &mockRedisClient{
		data: make(map[string]string),
	}
}

func TestRateLimitMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		requests       int
		rps           int
		window        time.Duration
		expectedStatus int
		description    string
	}{
		{
			name:           "Allow within limit",
			requests:       5,
			rps:           10,
			window:        time.Minute,
			expectedStatus: http.StatusOK,
			description:    "Should allow requests within the rate limit",
		},
		{
			name:           "Block over limit",
			requests:       15,
			rps:           10,
			window:        time.Minute,
			expectedStatus: http.StatusTooManyRequests,
			description:    "Should block requests exceeding the rate limit",
		},
		{
			name:           "Allow single request",
			requests:       1,
			rps:           1,
			window:        time.Second,
			expectedStatus: http.StatusOK,
			description:    "Should allow the first request",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRedis := newMockRedisClient()
			
			config := &RateLimitConfig{
				RPS:    tt.rps,
				Window: tt.window,
				KeyFunc: func(c *gin.Context) string {
					return "test-key"
				},
			}

			middleware := RateLimit(config, mockRedis)

			// Create test router
			router := gin.New()
			router.Use(middleware)
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "ok"})
			})

			// Make requests
			var lastStatus int
			for i := 0; i < tt.requests; i++ {
				w := httptest.NewRecorder()
				req, err := http.NewRequest("GET", "/test", nil)
				require.NoError(t, err)

				router.ServeHTTP(w, req)
				lastStatus = w.Code
			}

			assert.Equal(t, tt.expectedStatus, lastStatus, tt.description)
		})
	}
}

func TestRateLimitKeyFunction(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name     string
		ip       string
		expected string
	}{
		{
			name:     "Standard IP",
			ip:       "192.168.1.1",
			expected: "rate_limit:192.168.1.1",
		},
		{
			name:     "Localhost",
			ip:       "127.0.0.1",
			expected: "rate_limit:127.0.0.1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test", nil)
			req.RemoteAddr = tt.ip + ":12345"
			
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = req

			key := defaultKeyFunc(c)
			assert.Equal(t, tt.expected, key)
		})
	}
}

func TestRateLimitDisabled(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	config := &RateLimitConfig{
		Enabled: false,
		RPS:     1,
		Window:  time.Second,
		KeyFunc: defaultKeyFunc,
	}

	mockRedis := newMockRedisClient()
	middleware := RateLimit(config, mockRedis)

	router := gin.New()
	router.Use(middleware)
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Make multiple requests rapidly
	for i := 0; i < 10; i++ {
		w := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/test", nil)
		require.NoError(t, err)

		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code, "All requests should pass when rate limiting is disabled")
	}
}

func TestGetClientIP(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name       string
		headers    map[string]string
		remoteAddr string
		expected   string
	}{
		{
			name: "X-Forwarded-For header",
			headers: map[string]string{
				"X-Forwarded-For": "203.0.113.1, 198.51.100.1",
			},
			remoteAddr: "192.168.1.1:12345",
			expected:   "203.0.113.1",
		},
		{
			name: "X-Real-IP header",
			headers: map[string]string{
				"X-Real-IP": "203.0.113.1",
			},
			remoteAddr: "192.168.1.1:12345",
			expected:   "203.0.113.1",
		},
		{
			name:       "Remote address only",
			headers:    map[string]string{},
			remoteAddr: "192.168.1.1:12345",
			expected:   "192.168.1.1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test", nil)
			req.RemoteAddr = tt.remoteAddr
			
			for key, value := range tt.headers {
				req.Header.Set(key, value)
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = req

			ip := getClientIP(c)
			assert.Equal(t, tt.expected, ip)
		})
	}
}

func BenchmarkRateLimitMiddleware(b *testing.B) {
	gin.SetMode(gin.TestMode)
	
	mockRedis := newMockRedisClient()
	config := &RateLimitConfig{
		Enabled: true,
		RPS:     1000,
		Window:  time.Minute,
		KeyFunc: defaultKeyFunc,
	}

	middleware := RateLimit(config, mockRedis)
	
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