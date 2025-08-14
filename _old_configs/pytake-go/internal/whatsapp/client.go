package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/pytake/pytake-go/internal/database/models"
	"go.uber.org/zap"
)

const (
	WhatsAppAPIBaseURL = "https://graph.facebook.com/v18.0"
	DefaultTimeout     = 30 * time.Second
	MaxRetries         = 3
	RetryDelay         = 2 * time.Second
)

// Client represents a WhatsApp API client
type Client struct {
	httpClient *http.Client
	logger     *zap.SugaredLogger
	baseURL    string
}

// NewClient creates a new WhatsApp API client
func NewClient(logger *zap.SugaredLogger) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: DefaultTimeout,
		},
		logger:  logger,
		baseURL: WhatsAppAPIBaseURL,
	}
}

// SendTextMessage sends a text message via WhatsApp
func (c *Client) SendTextMessage(ctx context.Context, config *models.WhatsAppConfig, msg *TextMessage) (*WhatsAppAPIResponse, error) {
	request := &WhatsAppAPIRequest{
		MessagingProduct: "whatsapp",
		RecipientType:    "individual",
		To:               msg.To,
		Type:             MessageTypeText,
		Text: &APIText{
			PreviewURL: msg.PreviewURL,
			Body:       msg.Text,
		},
	}

	return c.sendMessage(ctx, config, request)
}

// SendMediaMessage sends a media message via WhatsApp
func (c *Client) SendMediaMessage(ctx context.Context, config *models.WhatsAppConfig, msg *MediaMessage) (*WhatsAppAPIResponse, error) {
	media := &APIMedia{
		Link:     msg.MediaURL,
		Caption:  msg.Caption,
		Filename: msg.Filename,
	}

	request := &WhatsAppAPIRequest{
		MessagingProduct: "whatsapp",
		RecipientType:    "individual",
		To:               msg.To,
		Type:             msg.Type,
	}

	// Set the appropriate media field based on type
	switch msg.Type {
	case MessageTypeImage:
		request.Image = media
	case MessageTypeDocument:
		request.Document = media
	case MessageTypeAudio:
		request.Audio = media
	case MessageTypeVideo:
		request.Video = media
	default:
		return nil, fmt.Errorf("unsupported media type: %s", msg.Type)
	}

	return c.sendMessage(ctx, config, request)
}

// SendTemplateMessage sends a template message via WhatsApp
func (c *Client) SendTemplateMessage(ctx context.Context, config *models.WhatsAppConfig, msg *TemplateMessage) (*WhatsAppAPIResponse, error) {
	// Convert components to API format
	apiComponents := make([]APITemplateComponent, 0, len(msg.Components))
	for _, comp := range msg.Components {
		apiParams := make([]APITemplateParameter, 0, len(comp.Parameters))
		for _, param := range comp.Parameters {
			apiParam := APITemplateParameter{
				Type: param.Type,
				Text: param.Text,
			}
			if param.Image != nil {
				apiParam.Image = &APIMedia{
					Link:    param.Image.Link,
					Caption: param.Image.Caption,
				}
			}
			if param.Document != nil {
				apiParam.Document = &APIMedia{
					Link:     param.Document.Link,
					Filename: param.Document.Filename,
				}
			}
			if param.Video != nil {
				apiParam.Video = &APIMedia{
					Link:    param.Video.Link,
					Caption: param.Video.Caption,
				}
			}
			apiParams = append(apiParams, apiParam)
		}
		
		apiComponents = append(apiComponents, APITemplateComponent{
			Type:       comp.Type,
			Parameters: apiParams,
		})
	}

	request := &WhatsAppAPIRequest{
		MessagingProduct: "whatsapp",
		RecipientType:    "individual",
		To:               msg.To,
		Type:             MessageTypeTemplate,
		Template: &APITemplate{
			Name: msg.TemplateName,
			Language: APITemplateLanguage{
				Code: msg.Language,
			},
			Components: apiComponents,
		},
	}

	return c.sendMessage(ctx, config, request)
}

// sendMessage sends a message to the WhatsApp API with retry logic
func (c *Client) sendMessage(ctx context.Context, config *models.WhatsAppConfig, request *WhatsAppAPIRequest) (*WhatsAppAPIResponse, error) {
	url := fmt.Sprintf("%s/%s/messages", c.baseURL, config.PhoneNumberID)
	
	// Marshal request to JSON
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	var lastErr error
	for attempt := 1; attempt <= MaxRetries; attempt++ {
		// Create HTTP request
		req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}

		// Set headers
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", config.AccessToken))

		// Log the attempt
		c.logger.Debugw("Sending WhatsApp message",
			"attempt", attempt,
			"to", request.To,
			"type", request.Type,
			"config_id", config.ID,
		)

		// Send request
		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("request failed: %w", err)
			c.logger.Warnw("WhatsApp API request failed",
				"attempt", attempt,
				"error", err,
			)
			
			if attempt < MaxRetries {
				time.Sleep(RetryDelay * time.Duration(attempt))
				continue
			}
			break
		}
		defer resp.Body.Close()

		// Read response body
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			lastErr = fmt.Errorf("failed to read response: %w", err)
			continue
		}

		// Parse response
		var apiResp WhatsAppAPIResponse
		if err := json.Unmarshal(body, &apiResp); err != nil {
			lastErr = fmt.Errorf("failed to parse response: %w", err)
			continue
		}

		// Check for API errors
		if apiResp.Error != nil {
			lastErr = fmt.Errorf("API error: %s (code: %d)", apiResp.Error.Message, apiResp.Error.Code)
			
			// Don't retry on certain error codes
			if apiResp.Error.Code == 100 || apiResp.Error.Code == 190 { // Invalid parameter or token
				break
			}
			
			if attempt < MaxRetries {
				time.Sleep(RetryDelay * time.Duration(attempt))
				continue
			}
			break
		}

		// Success
		if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
			c.logger.Infow("WhatsApp message sent successfully",
				"to", request.To,
				"type", request.Type,
				"message_id", getMessageID(&apiResp),
			)
			return &apiResp, nil
		}

		// Unexpected status code
		lastErr = fmt.Errorf("unexpected status code: %d", resp.StatusCode)
		
		if attempt < MaxRetries {
			time.Sleep(RetryDelay * time.Duration(attempt))
			continue
		}
	}

	return nil, fmt.Errorf("failed after %d attempts: %w", MaxRetries, lastErr)
}

// GetMediaURL retrieves a media URL from WhatsApp
func (c *Client) GetMediaURL(ctx context.Context, config *models.WhatsAppConfig, mediaID string) (string, error) {
	url := fmt.Sprintf("%s/%s", c.baseURL, mediaID)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", config.AccessToken))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		URL      string `json:"url"`
		MimeType string `json:"mime_type"`
		SHA256   string `json:"sha256"`
		FileSize int    `json:"file_size"`
		ID       string `json:"id"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	return result.URL, nil
}

// DownloadMedia downloads media from WhatsApp
func (c *Client) DownloadMedia(ctx context.Context, config *models.WhatsAppConfig, mediaURL string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", mediaURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", config.AccessToken))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	return data, nil
}

// TestConnection tests the WhatsApp API connection
func (c *Client) TestConnection(ctx context.Context, config *models.WhatsAppConfig) error {
	url := fmt.Sprintf("%s/%s", c.baseURL, config.PhoneNumberID)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", config.AccessToken))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("connection test failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("connection test failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// getMessageID extracts message ID from API response
func getMessageID(resp *WhatsAppAPIResponse) string {
	if resp != nil && len(resp.Messages) > 0 {
		return resp.Messages[0].ID
	}
	return ""
}