package health

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"pytake-backend/internal/logger"
)

// Mock dependencies for testing
type MockDB struct {
	mock.Mock
}

func (m *MockDB) PingContext(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

type MockRedis struct {
	mock.Mock
}

func (m *MockRedis) Ping(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

type MockQueue struct {
	mock.Mock
}

func (m *MockQueue) HealthCheck(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func TestHealthHandler_GetHealth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupMocks     func(*MockDB, *MockRedis, *MockQueue)
		expectedStatus int
		expectedHealth bool
		description    string
	}{
		{
			name: "All services healthy",
			setupMocks: func(db *MockDB, redis *MockRedis, queue *MockQueue) {
				db.On("PingContext", mock.Anything).Return(nil)
				redis.On("Ping", mock.Anything).Return(nil)
				queue.On("HealthCheck", mock.Anything).Return(nil)
			},
			expectedStatus: http.StatusOK,
			expectedHealth: true,
			description:    "Should return healthy when all services are available",
		},
		{
			name: "Database unhealthy",
			setupMocks: func(db *MockDB, redis *MockRedis, queue *MockQueue) {
				db.On("PingContext", mock.Anything).Return(assert.AnError)
				redis.On("Ping", mock.Anything).Return(nil)
				queue.On("HealthCheck", mock.Anything).Return(nil)
			},
			expectedStatus: http.StatusServiceUnavailable,
			expectedHealth: false,
			description:    "Should return unhealthy when database is down",
		},
		{
			name: "Redis unhealthy",
			setupMocks: func(db *MockDB, redis *MockRedis, queue *MockQueue) {
				db.On("PingContext", mock.Anything).Return(nil)
				redis.On("Ping", mock.Anything).Return(assert.AnError)
				queue.On("HealthCheck", mock.Anything).Return(nil)
			},
			expectedStatus: http.StatusServiceUnavailable,
			expectedHealth: false,
			description:    "Should return unhealthy when Redis is down",
		},
		{
			name: "Queue unhealthy",
			setupMocks: func(db *MockDB, redis *MockRedis, queue *MockQueue) {
				db.On("PingContext", mock.Anything).Return(nil)
				redis.On("Ping", mock.Anything).Return(nil)
				queue.On("HealthCheck", mock.Anything).Return(assert.AnError)
			},
			expectedStatus: http.StatusServiceUnavailable,
			expectedHealth: false,
			description:    "Should return unhealthy when queue is down",
		},
		{
			name: "Multiple services unhealthy",
			setupMocks: func(db *MockDB, redis *MockRedis, queue *MockQueue) {
				db.On("PingContext", mock.Anything).Return(assert.AnError)
				redis.On("Ping", mock.Anything).Return(assert.AnError)
				queue.On("HealthCheck", mock.Anything).Return(nil)
			},
			expectedStatus: http.StatusServiceUnavailable,
			expectedHealth: false,
			description:    "Should return unhealthy when multiple services are down",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mocks
			mockDB := new(MockDB)
			mockRedis := new(MockRedis)
			mockQueue := new(MockQueue)
			
			tt.setupMocks(mockDB, mockRedis, mockQueue)

			// Create handler
			log := logger.New("test")
			handler := &Handler{
				db:     mockDB,
				redis:  mockRedis,
				queue:  mockQueue,
				logger: log,
			}

			// Setup router
			router := gin.New()
			router.GET("/health", handler.GetHealth)

			// Make request
			w := httptest.NewRecorder()
			req, err := http.NewRequest("GET", "/health", nil)
			require.NoError(t, err)

			router.ServeHTTP(w, req)

			// Verify response
			assert.Equal(t, tt.expectedStatus, w.Code, tt.description)

			var response HealthResponse
			err = json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Equal(t, tt.expectedHealth, response.Healthy, tt.description)
			assert.NotEmpty(t, response.Timestamp)
			assert.Contains(t, response.Checks, "database")
			assert.Contains(t, response.Checks, "redis")
			assert.Contains(t, response.Checks, "queue_system")

			// Verify mocks were called
			mockDB.AssertExpectations(t)
			mockRedis.AssertExpectations(t)
			mockQueue.AssertExpectations(t)
		})
	}
}

func TestHealthHandler_GetHealthLive(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	log := logger.New("test")
	handler := &Handler{
		logger: log,
	}

	router := gin.New()
	router.GET("/health/live", handler.GetHealthLive)

	w := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "/health/live", nil)
	require.NoError(t, err)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "ok", response["status"])
	assert.NotEmpty(t, response["timestamp"])
}

func TestHealthHandler_GetHealthReady(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupMocks     func(*MockDB, *MockRedis)
		expectedStatus int
		description    string
	}{
		{
			name: "Ready - all dependencies available",
			setupMocks: func(db *MockDB, redis *MockRedis) {
				db.On("PingContext", mock.Anything).Return(nil)
				redis.On("Ping", mock.Anything).Return(nil)
			},
			expectedStatus: http.StatusOK,
			description:    "Should return ready when all dependencies are available",
		},
		{
			name: "Not ready - database unavailable",
			setupMocks: func(db *MockDB, redis *MockRedis) {
				db.On("PingContext", mock.Anything).Return(assert.AnError)
				redis.On("Ping", mock.Anything).Return(nil)
			},
			expectedStatus: http.StatusServiceUnavailable,
			description:    "Should return not ready when database is unavailable",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockDB := new(MockDB)
			mockRedis := new(MockRedis)
			
			tt.setupMocks(mockDB, mockRedis)

			log := logger.New("test")
			handler := &Handler{
				db:     mockDB,
				redis:  mockRedis,
				logger: log,
			}

			router := gin.New()
			router.GET("/health/ready", handler.GetHealthReady)

			w := httptest.NewRecorder()
			req, err := http.NewRequest("GET", "/health/ready", nil)
			require.NoError(t, err)

			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code, tt.description)

			mockDB.AssertExpectations(t)
			mockRedis.AssertExpectations(t)
		})
	}
}

func TestHealthHandler_Timeout(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create a mock that will timeout
	mockDB := new(MockDB)
	mockDB.On("PingContext", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		ctx := args.Get(0).(context.Context)
		select {
		case <-ctx.Done():
			return
		case <-time.After(2 * time.Second): // Simulate slow response
			return
		}
	})

	log := logger.New("test")
	handler := &Handler{
		db:      mockDB,
		logger:  log,
		timeout: 100 * time.Millisecond, // Short timeout for testing
	}

	router := gin.New()
	router.GET("/health", handler.GetHealth)

	start := time.Now()
	w := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "/health", nil)
	require.NoError(t, err)

	router.ServeHTTP(w, req)
	duration := time.Since(start)

	// Should timeout and return quickly
	assert.Less(t, duration, 200*time.Millisecond)
	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func TestHealthResponse_Structure(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockDB := new(MockDB)
	mockRedis := new(MockRedis)
	mockQueue := new(MockQueue)

	mockDB.On("PingContext", mock.Anything).Return(nil)
	mockRedis.On("Ping", mock.Anything).Return(nil)
	mockQueue.On("HealthCheck", mock.Anything).Return(nil)

	log := logger.New("test")
	handler := &Handler{
		db:     mockDB,
		redis:  mockRedis,
		queue:  mockQueue,
		logger: log,
	}

	router := gin.New()
	router.GET("/health", handler.GetHealth)

	w := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "/health", nil)
	require.NoError(t, err)

	router.ServeHTTP(w, req)

	var response HealthResponse
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// Verify response structure
	assert.True(t, response.Healthy)
	assert.NotEmpty(t, response.Timestamp)
	assert.NotEmpty(t, response.Version)
	assert.NotEmpty(t, response.Uptime)

	// Verify checks structure
	assert.NotEmpty(t, response.Checks)
	for _, check := range response.Checks {
		assert.NotEmpty(t, check.Name)
		assert.Contains(t, []string{"healthy", "unhealthy"}, check.Status)
		assert.NotEmpty(t, check.Timestamp)
		assert.GreaterOrEqual(t, check.ResponseTime, time.Duration(0))
	}
}

func TestHealthHandler_ExternalServices(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Mock external service calls
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/whatsapp/health":
			w.WriteHeader(http.StatusOK)
		case "/openai/health":
			w.WriteHeader(http.StatusServiceUnavailable)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	mockDB := new(MockDB)
	mockRedis := new(MockRedis)
	mockQueue := new(MockQueue)

	mockDB.On("PingContext", mock.Anything).Return(nil)
	mockRedis.On("Ping", mock.Anything).Return(nil)
	mockQueue.On("HealthCheck", mock.Anything).Return(nil)

	log := logger.New("test")
	handler := &Handler{
		db:               mockDB,
		redis:            mockRedis,
		queue:            mockQueue,
		logger:           log,
		externalServices: map[string]string{
			"whatsapp": server.URL + "/whatsapp/health",
			"openai":   server.URL + "/openai/health",
		},
	}

	router := gin.New()
	router.GET("/health", handler.GetHealth)

	w := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "/health", nil)
	require.NoError(t, err)

	router.ServeHTTP(w, req)

	var response HealthResponse
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// Should be unhealthy because external service (OpenAI) is down
	assert.False(t, response.Healthy)
	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	// Find external service checks
	var whatsappCheck, openaiCheck *HealthCheck
	for _, check := range response.Checks {
		if check.Name == "external_services.whatsapp" {
			whatsappCheck = &check
		}
		if check.Name == "external_services.openai" {
			openaiCheck = &check
		}
	}

	assert.NotNil(t, whatsappCheck)
	assert.NotNil(t, openaiCheck)
	assert.Equal(t, "healthy", whatsappCheck.Status)
	assert.Equal(t, "unhealthy", openaiCheck.Status)
}

func BenchmarkHealthCheck(b *testing.B) {
	gin.SetMode(gin.TestMode)

	mockDB := new(MockDB)
	mockRedis := new(MockRedis)
	mockQueue := new(MockQueue)

	// Setup fast returning mocks
	mockDB.On("PingContext", mock.Anything).Return(nil)
	mockRedis.On("Ping", mock.Anything).Return(nil)
	mockQueue.On("HealthCheck", mock.Anything).Return(nil)

	log := logger.New("test")
	handler := &Handler{
		db:     mockDB,
		redis:  mockRedis,
		queue:  mockQueue,
		logger: log,
	}

	router := gin.New()
	router.GET("/health", handler.GetHealth)

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/health", nil)
			router.ServeHTTP(w, req)
		}
	})
}

// Test helper types
type HealthResponse struct {
	Healthy   bool          `json:"healthy"`
	Timestamp string        `json:"timestamp"`
	Version   string        `json:"version"`
	Uptime    string        `json:"uptime"`
	Checks    []HealthCheck `json:"checks"`
}

type HealthCheck struct {
	Name         string        `json:"name"`
	Status       string        `json:"status"`
	Timestamp    string        `json:"timestamp"`
	ResponseTime time.Duration `json:"response_time"`
	Message      string        `json:"message,omitempty"`
}