// +build integration

package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

type WhatsAppIntegrationTestSuite struct {
	TestSuite
}

func TestWhatsAppSuite(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration tests in short mode")
	}
	suite.Run(t, new(WhatsAppIntegrationTestSuite))
}

func (suite *WhatsAppIntegrationTestSuite) TestWhatsAppWebhookVerification() {
	// Test webhook verification (GET request)
	req := httptest.NewRequest("GET", "/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=test-challenge", nil)
	w := httptest.NewRecorder()
	
	suite.app.ServeHTTP(w, req)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	assert.Equal(suite.T(), "test-challenge", w.Body.String())
}

func (suite *WhatsAppIntegrationTestSuite) TestWhatsAppWebhookInvalidVerification() {
	// Test webhook verification with wrong token
	req := httptest.NewRequest("GET", "/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=test-challenge", nil)
	w := httptest.NewRecorder()
	
	suite.app.ServeHTTP(w, req)
	
	assert.Equal(suite.T(), http.StatusForbidden, w.Code)
}

func (suite *WhatsAppIntegrationTestSuite) TestWhatsAppMessageReceived() {
	// Create authenticated user
	token := suite.CreateTestUser("whatsapp@example.com", "WhatsApp User")
	
	// Test webhook message received
	payload := map[string]interface{}{
		"object": "whatsapp_business_account",
		"entry": []map[string]interface{}{
			{
				"id": "123456789",
				"changes": []map[string]interface{}{
					{
						"value": map[string]interface{}{
							"messaging_product": "whatsapp",
							"metadata": map[string]interface{}{
								"display_phone_number": "15551234567",
								"phone_number_id":      "phone123",
							},
							"messages": []map[string]interface{}{
								{
									"from":      "5511999999999",
									"id":        "msg_123",
									"timestamp": "1234567890",
									"type":      "text",
									"text": map[string]interface{}{
										"body": "Hello from WhatsApp!",
									},
								},
							},
						},
						"field": "messages",
					},
				},
			},
		},
	}

	headers := map[string]string{
		"Authorization":        "Bearer " + token,
		"X-Hub-Signature-256":  suite.GenerateWebhookSignature(payload),
		"Content-Type":         "application/json",
	}

	w := suite.MakeRequest("POST", "/api/v1/whatsapp/webhook", payload, headers)
	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Verify message was stored
	time.Sleep(100 * time.Millisecond) // Allow async processing
	
	w = suite.MakeRequest("GET", "/api/v1/messages", nil, map[string]string{
		"Authorization": "Bearer " + token,
	})
	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var messages map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &messages)
	
	data, ok := messages["data"].([]interface{})
	assert.True(suite.T(), ok)
	assert.Greater(suite.T(), len(data), 0)
}

func (suite *WhatsAppIntegrationTestSuite) TestSendWhatsAppMessage() {
	// Create authenticated user
	token := suite.CreateTestUser("sender@example.com", "Sender User")

	// Test sending message
	payload := map[string]interface{}{
		"to":   "5511999999999",
		"type": "text",
		"text": map[string]interface{}{
			"body": "Hello from PyTake!",
		},
	}

	headers := map[string]string{
		"Authorization": "Bearer " + token,
		"Content-Type":  "application/json",
	}

	w := suite.MakeRequest("POST", "/api/v1/whatsapp/send", payload, headers)
	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	assert.Contains(suite.T(), response, "message_id")
	assert.Equal(suite.T(), "sent", response["status"])
}

func (suite *WhatsAppIntegrationTestSuite) TestSendWhatsAppMessageValidation() {
	// Create authenticated user
	token := suite.CreateTestUser("validation@example.com", "Validation User")

	headers := map[string]string{
		"Authorization": "Bearer " + token,
		"Content-Type":  "application/json",
	}

	tests := []struct {
		name           string
		payload        map[string]interface{}
		expectedStatus int
		description    string
	}{
		{
			name: "Missing recipient",
			payload: map[string]interface{}{
				"type": "text",
				"text": map[string]interface{}{
					"body": "Hello!",
				},
			},
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject message without recipient",
		},
		{
			name: "Invalid phone number",
			payload: map[string]interface{}{
				"to":   "invalid-phone",
				"type": "text",
				"text": map[string]interface{}{
					"body": "Hello!",
				},
			},
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject invalid phone number format",
		},
		{
			name: "Empty message body",
			payload: map[string]interface{}{
				"to":   "5511999999999",
				"type": "text",
				"text": map[string]interface{}{
					"body": "",
				},
			},
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject empty message body",
		},
		{
			name: "Unsupported message type",
			payload: map[string]interface{}{
				"to":   "5511999999999",
				"type": "unsupported",
			},
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject unsupported message types",
		},
	}

	for _, tt := range tests {
		suite.T().Run(tt.name, func(t *testing.T) {
			w := suite.MakeRequest("POST", "/api/v1/whatsapp/send", tt.payload, headers)
			assert.Equal(t, tt.expectedStatus, w.Code, tt.description)
		})
	}
}

func (suite *WhatsAppIntegrationTestSuite) TestWhatsAppTemplateMessage() {
	// Create authenticated user
	token := suite.CreateTestUser("template@example.com", "Template User")

	// Test sending template message
	payload := map[string]interface{}{
		"to":   "5511999999999",
		"type": "template",
		"template": map[string]interface{}{
			"name": "hello_world",
			"language": map[string]interface{}{
				"code": "en_US",
			},
		},
	}

	headers := map[string]string{
		"Authorization": "Bearer " + token,
		"Content-Type":  "application/json",
	}

	w := suite.MakeRequest("POST", "/api/v1/whatsapp/send", payload, headers)
	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	assert.Contains(suite.T(), response, "message_id")
}

func (suite *WhatsAppIntegrationTestSuite) TestWhatsAppMediaMessage() {
	// Create authenticated user
	token := suite.CreateTestUser("media@example.com", "Media User")

	// Test sending image message
	payload := map[string]interface{}{
		"to":   "5511999999999",
		"type": "image",
		"image": map[string]interface{}{
			"link":    "https://example.com/image.jpg",
			"caption": "Test image",
		},
	}

	headers := map[string]string{
		"Authorization": "Bearer " + token,
		"Content-Type":  "application/json",
	}

	w := suite.MakeRequest("POST", "/api/v1/whatsapp/send", payload, headers)
	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Test sending document
	payload = map[string]interface{}{
		"to":   "5511999999999",
		"type": "document",
		"document": map[string]interface{}{
			"link":     "https://example.com/document.pdf",
			"filename": "document.pdf",
			"caption":  "Test document",
		},
	}

	w = suite.MakeRequest("POST", "/api/v1/whatsapp/send", payload, headers)
	assert.Equal(suite.T(), http.StatusOK, w.Code)
}

func (suite *WhatsAppIntegrationTestSuite) TestWhatsAppWebhookSecurity() {
	// Test webhook without signature
	payload := map[string]interface{}{
		"object": "whatsapp_business_account",
		"entry":  []map[string]interface{}{},
	}

	w := suite.MakeRequest("POST", "/api/v1/whatsapp/webhook", payload, nil)
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)

	// Test webhook with invalid signature
	headers := map[string]string{
		"X-Hub-Signature-256": "sha256=invalid_signature",
		"Content-Type":        "application/json",
	}

	w = suite.MakeRequest("POST", "/api/v1/whatsapp/webhook", payload, headers)
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
}

func (suite *WhatsAppIntegrationTestSuite) TestWhatsAppConfiguration() {
	// Create authenticated user
	token := suite.CreateTestUser("config@example.com", "Config User")

	headers := map[string]string{
		"Authorization": "Bearer " + token,
		"Content-Type":  "application/json",
	}

	// Test creating WhatsApp configuration
	configPayload := map[string]interface{}{
		"name":               "Test Configuration",
		"phone_number_id":    "123456789",
		"access_token":       "test_access_token",
		"webhook_verify_token": "test_verify_token",
		"webhook_secret":     "test_webhook_secret",
		"business_account_id": "business_123",
	}

	w := suite.MakeRequest("POST", "/api/v1/whatsapp-configs", configPayload, headers)
	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)

	configID := response["id"].(string)
	assert.NotEmpty(suite.T(), configID)

	// Test getting configuration
	w = suite.MakeRequest("GET", "/api/v1/whatsapp-configs/"+configID, nil, headers)
	assert.Equal(suite.T(), http.StatusOK, w.Code)

	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Test Configuration", response["name"])

	// Test updating configuration
	updatePayload := map[string]interface{}{
		"name": "Updated Configuration",
	}

	w = suite.MakeRequest("PUT", "/api/v1/whatsapp-configs/"+configID, updatePayload, headers)
	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Test testing configuration
	w = suite.MakeRequest("POST", "/api/v1/whatsapp-configs/"+configID+"/test", nil, headers)
	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Test deleting configuration
	w = suite.MakeRequest("DELETE", "/api/v1/whatsapp-configs/"+configID, nil, headers)
	assert.Equal(suite.T(), http.StatusNoContent, w.Code)
}

func (suite *WhatsAppIntegrationTestSuite) TestMessageStatusUpdate() {
	// Create authenticated user
	token := suite.CreateTestUser("status@example.com", "Status User")

	// Test webhook status update
	payload := map[string]interface{}{
		"object": "whatsapp_business_account",
		"entry": []map[string]interface{}{
			{
				"id": "123456789",
				"changes": []map[string]interface{}{
					{
						"value": map[string]interface{}{
							"messaging_product": "whatsapp",
							"metadata": map[string]interface{}{
								"phone_number_id": "phone123",
							},
							"statuses": []map[string]interface{}{
								{
									"id":          "msg_123",
									"status":      "delivered",
									"timestamp":   "1234567890",
									"recipient_id": "5511999999999",
								},
							},
						},
						"field": "messages",
					},
				},
			},
		},
	}

	headers := map[string]string{
		"Authorization":        "Bearer " + token,
		"X-Hub-Signature-256":  suite.GenerateWebhookSignature(payload),
		"Content-Type":         "application/json",
	}

	w := suite.MakeRequest("POST", "/api/v1/whatsapp/webhook", payload, headers)
	assert.Equal(suite.T(), http.StatusOK, w.Code)
}

func (suite *WhatsAppIntegrationTestSuite) GenerateWebhookSignature(payload map[string]interface{}) string {
	// This would generate a proper HMAC signature in a real implementation
	// For testing, we'll return a mock signature
	return "sha256=test_signature_hash"
}

func (suite *WhatsAppIntegrationTestSuite) CreateTestUser(email, name string) string {
	registerReq := map[string]interface{}{
		"name":     name,
		"email":    email,
		"password": "password123",
	}

	w := suite.MakeRequest("POST", "/api/v1/auth/register", registerReq, nil)
	
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	
	tokens := response["tokens"].(map[string]interface{})
	return tokens["access_token"].(string)
}