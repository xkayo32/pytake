package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// MockService is a mock implementation of the WhatsApp service
type MockService struct {
	mock.Mock
}

func (m *MockService) SendMessage(ctx context.Context, tenantID uuid.UUID, req *SendMessageRequest) (*SendMessageResponse, error) {
	args := m.Called(ctx, tenantID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*SendMessageResponse), args.Error(1)
}

func (m *MockService) ProcessWebhook(ctx context.Context, payload *WebhookPayload) error {
	args := m.Called(ctx, payload)
	return args.Error(0)
}

func (m *MockService) VerifyWebhook(mode, token, challenge string) (string, error) {
	args := m.Called(mode, token, challenge)
	return args.String(0), args.Error(1)
}

func (m *MockService) GetConfig(ctx context.Context, tenantID, configID uuid.UUID) (*models.WhatsAppConfig, error) {
	args := m.Called(ctx, tenantID, configID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.WhatsAppConfig), args.Error(1)
}

func (m *MockService) CreateConfig(ctx context.Context, tenantID uuid.UUID, config *models.WhatsAppConfig) error {
	args := m.Called(ctx, tenantID, config)
	return args.Error(0)
}

func (m *MockService) UpdateConfig(ctx context.Context, tenantID, configID uuid.UUID, config *models.WhatsAppConfig) error {
	args := m.Called(ctx, tenantID, configID, config)
	return args.Error(0)
}

// Setup test router
func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	return router
}

// Setup test database
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// Auto migrate models
	err = db.AutoMigrate(
		&models.WhatsAppConfig{},
		&models.Message{},
		&models.Conversation{},
		&models.Contact{},
	)
	assert.NoError(t, err)

	return db
}

// Test SendMessage endpoint
func TestHandler_SendMessage(t *testing.T) {
	router := setupTestRouter()
	mockService := new(MockService)
	handler := NewHandler(mockService)

	// Setup route with tenant middleware mock
	router.POST("/messages/send", func(c *gin.Context) {
		// Mock tenant ID in context
		c.Set("tenant_id", uuid.New())
		handler.SendMessage(c)
	})

	t.Run("Successful Send", func(t *testing.T) {
		tenantID := uuid.New()
		req := &SendMessageRequest{
			To:   "+5511999999999",
			Type: "text",
			Text: &TextMessage{
				Body: "Test message",
			},
		}

		expectedResponse := &SendMessageResponse{
			Success: true,
			MessageID: "msg_123",
			Status: "sent",
		}

		mockService.On("SendMessage", mock.Anything, mock.AnythingOfType("uuid.UUID"), req).
			Return(expectedResponse, nil).Once()

		body, _ := json.Marshal(req)
		request := httptest.NewRequest("POST", "/messages/send", bytes.NewBuffer(body))
		request.Header.Set("Content-Type", "application/json")
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, request)

		assert.Equal(t, http.StatusOK, w.Code)
		
		var response SendMessageResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Equal(t, "msg_123", response.MessageID)
	})

	t.Run("Invalid Request Body", func(t *testing.T) {
		request := httptest.NewRequest("POST", "/messages/send", bytes.NewBuffer([]byte("invalid json")))
		request.Header.Set("Content-Type", "application/json")
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, request)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Missing Required Fields", func(t *testing.T) {
		req := &SendMessageRequest{
			// Missing 'To' field
			Type: "text",
		}

		body, _ := json.Marshal(req)
		request := httptest.NewRequest("POST", "/messages/send", bytes.NewBuffer(body))
		request.Header.Set("Content-Type", "application/json")
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, request)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	mockService.AssertExpectations(t)
}

// Test Webhook endpoint
func TestHandler_Webhook(t *testing.T) {
	router := setupTestRouter()
	mockService := new(MockService)
	handler := NewHandler(mockService)

	router.POST("/webhook", handler.Webhook)
	router.GET("/webhook", handler.Webhook)

	t.Run("Webhook Verification", func(t *testing.T) {
		challenge := "test_challenge_123"
		token := "test_token"
		
		mockService.On("VerifyWebhook", "subscribe", token, challenge).
			Return(challenge, nil).Once()

		request := httptest.NewRequest("GET", 
			"/webhook?hub.mode=subscribe&hub.verify_token="+token+"&hub.challenge="+challenge, 
			nil)
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, request)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, challenge, w.Body.String())
	})

	t.Run("Process Webhook Message", func(t *testing.T) {
		payload := &WebhookPayload{
			Object: "whatsapp_business_account",
			Entry: []WebhookEntry{
				{
					ID: "entry_123",
					Changes: []WebhookChange{
						{
							Field: "messages",
							Value: WebhookValue{
								MessagingProduct: "whatsapp",
								Messages: []IncomingMessage{
									{
										ID:   "msg_123",
										From: "+5511999999999",
										Type: "text",
										Text: &TextContent{
											Body: "Hello",
										},
										Timestamp: "1234567890",
									},
								},
							},
						},
					},
				},
			},
		}

		mockService.On("ProcessWebhook", mock.Anything, mock.AnythingOfType("*whatsapp.WebhookPayload")).
			Return(nil).Once()

		body, _ := json.Marshal(payload)
		request := httptest.NewRequest("POST", "/webhook", bytes.NewBuffer(body))
		request.Header.Set("Content-Type", "application/json")
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, request)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Invalid Webhook Payload", func(t *testing.T) {
		request := httptest.NewRequest("POST", "/webhook", bytes.NewBuffer([]byte("invalid json")))
		request.Header.Set("Content-Type", "application/json")
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, request)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	mockService.AssertExpectations(t)
}

// Test GetConfig endpoint
func TestHandler_GetConfig(t *testing.T) {
	router := setupTestRouter()
	mockService := new(MockService)
	handler := NewHandler(mockService)

	router.GET("/configs/:id", func(c *gin.Context) {
		c.Set("tenant_id", uuid.New())
		handler.GetConfig(c)
	})

	t.Run("Successful Get", func(t *testing.T) {
		tenantID := uuid.New()
		configID := uuid.New()
		
		expectedConfig := &models.WhatsAppConfig{
			Name:          "Test Config",
			PhoneNumberID: "123456789",
			AccessToken:   "token_123",
			WebhookURL:    "https://api.example.com/webhook",
			IsActive:      true,
		}
		expectedConfig.ID = configID
		expectedConfig.TenantID = tenantID

		mockService.On("GetConfig", mock.Anything, mock.AnythingOfType("uuid.UUID"), configID).
			Return(expectedConfig, nil).Once()

		request := httptest.NewRequest("GET", "/configs/"+configID.String(), nil)
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, request)

		assert.Equal(t, http.StatusOK, w.Code)
		
		var response models.WhatsAppConfig
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, expectedConfig.Name, response.Name)
		assert.Equal(t, expectedConfig.PhoneNumberID, response.PhoneNumberID)
	})

	t.Run("Config Not Found", func(t *testing.T) {
		configID := uuid.New()
		
		mockService.On("GetConfig", mock.Anything, mock.AnythingOfType("uuid.UUID"), configID).
			Return(nil, gorm.ErrRecordNotFound).Once()

		request := httptest.NewRequest("GET", "/configs/"+configID.String(), nil)
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, request)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("Invalid UUID", func(t *testing.T) {
		request := httptest.NewRequest("GET", "/configs/invalid-uuid", nil)
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, request)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	mockService.AssertExpectations(t)
}

// Test CreateConfig endpoint
func TestHandler_CreateConfig(t *testing.T) {
	router := setupTestRouter()
	mockService := new(MockService)
	handler := NewHandler(mockService)

	router.POST("/configs", func(c *gin.Context) {
		c.Set("tenant_id", uuid.New())
		handler.CreateConfig(c)
	})

	t.Run("Successful Create", func(t *testing.T) {
		config := &models.WhatsAppConfig{
			Name:          "New Config",
			PhoneNumberID: "987654321",
			AccessToken:   "new_token",
			WebhookURL:    "https://api.example.com/webhook",
			IsActive:      true,
		}

		mockService.On("CreateConfig", mock.Anything, mock.AnythingOfType("uuid.UUID"), mock.AnythingOfType("*models.WhatsAppConfig")).
			Return(nil).Once()

		body, _ := json.Marshal(config)
		request := httptest.NewRequest("POST", "/configs", bytes.NewBuffer(body))
		request.Header.Set("Content-Type", "application/json")
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, request)

		assert.Equal(t, http.StatusCreated, w.Code)
	})

	t.Run("Invalid Config Data", func(t *testing.T) {
		config := &models.WhatsAppConfig{
			// Missing required fields
			Name: "Incomplete Config",
		}

		body, _ := json.Marshal(config)
		request := httptest.NewRequest("POST", "/configs", bytes.NewBuffer(body))
		request.Header.Set("Content-Type", "application/json")
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, request)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	mockService.AssertExpectations(t)
}

// Test message type validation
func TestValidateMessageType(t *testing.T) {
	tests := []struct {
		name    string
		msgType string
		wantErr bool
	}{
		{"Valid text", "text", false},
		{"Valid image", "image", false},
		{"Valid document", "document", false},
		{"Valid audio", "audio", false},
		{"Valid video", "video", false},
		{"Valid location", "location", false},
		{"Valid template", "template", false},
		{"Invalid type", "invalid", true},
		{"Empty type", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateMessageType(tt.msgType)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// Test phone number validation
func TestValidatePhoneNumber(t *testing.T) {
	tests := []struct {
		name    string
		phone   string
		wantErr bool
	}{
		{"Valid BR number", "+5511999999999", false},
		{"Valid US number", "+12025551234", false},
		{"Without plus", "5511999999999", true},
		{"Invalid format", "11999999999", true},
		{"Empty", "", true},
		{"With spaces", "+55 11 99999 9999", true},
		{"With dashes", "+55-11-99999-9999", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePhoneNumber(tt.phone)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// Benchmark SendMessage
func BenchmarkHandler_SendMessage(b *testing.B) {
	router := setupTestRouter()
	mockService := new(MockService)
	handler := NewHandler(mockService)

	router.POST("/messages/send", func(c *gin.Context) {
		c.Set("tenant_id", uuid.New())
		handler.SendMessage(c)
	})

	req := &SendMessageRequest{
		To:   "+5511999999999",
		Type: "text",
		Text: &TextMessage{
			Body: "Benchmark message",
		},
	}

	expectedResponse := &SendMessageResponse{
		Success:   true,
		MessageID: "bench_msg",
		Status:    "sent",
	}

	mockService.On("SendMessage", mock.Anything, mock.Anything, mock.Anything).
		Return(expectedResponse, nil)

	body, _ := json.Marshal(req)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		request := httptest.NewRequest("POST", "/messages/send", bytes.NewBuffer(body))
		request.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, request)
	}
}

// Helper validation functions (implement these in your actual code)
func validateMessageType(msgType string) error {
	validTypes := []string{"text", "image", "document", "audio", "video", "location", "template"}
	for _, valid := range validTypes {
		if msgType == valid {
			return nil
		}
	}
	return fmt.Errorf("invalid message type: %s", msgType)
}

func validatePhoneNumber(phone string) error {
	if phone == "" {
		return fmt.Errorf("phone number is required")
	}
	if !strings.HasPrefix(phone, "+") {
		return fmt.Errorf("phone number must start with +")
	}
	if strings.ContainsAny(phone, " -()") {
		return fmt.Errorf("phone number must not contain spaces or special characters")
	}
	if len(phone) < 10 || len(phone) > 15 {
		return fmt.Errorf("invalid phone number length")
	}
	return nil
}

