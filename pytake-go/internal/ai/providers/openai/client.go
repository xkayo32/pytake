package openai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	openAIAPIURL = "https://api.openai.com/v1"
	defaultModel = "gpt-3.5-turbo"
)

// Client implements the AIProvider interface for OpenAI
type Client struct {
	apiKey     string
	apiURL     string
	httpClient *http.Client
	logger     Logger
	
	// Rate limiting
	rateLimiter RateLimiter
	
	// Configuration
	defaultModel     string
	maxRetries       int
	timeout          time.Duration
	organizationID   string
}

// Logger interface for OpenAI client logging
type Logger interface {
	Debug(msg string, fields ...interface{})
	Info(msg string, fields ...interface{})
	Warn(msg string, fields ...interface{})
	Error(msg string, fields ...interface{})
}

// RateLimiter interface for rate limiting
type RateLimiter interface {
	Allow() bool
	Wait(ctx context.Context) error
}

// NewClient creates a new OpenAI client
func NewClient(apiKey string, logger Logger, rateLimiter RateLimiter) *Client {
	return &Client{
		apiKey:      apiKey,
		apiURL:      openAIAPIURL,
		httpClient:  &http.Client{Timeout: 30 * time.Second},
		logger:      logger,
		rateLimiter: rateLimiter,
		defaultModel: defaultModel,
		maxRetries:  3,
		timeout:     30 * time.Second,
	}
}

// SetOrganization sets the organization ID for API calls
func (c *Client) SetOrganization(orgID string) {
	c.organizationID = orgID
}

// Chat Operations

// GenerateResponse generates a chat completion response
func (c *Client) GenerateResponse(ctx context.Context, request *ai.ChatRequest) (*ai.ChatResponse, error) {
	// Apply rate limiting
	if c.rateLimiter != nil && !c.rateLimiter.Allow() {
		if err := c.rateLimiter.Wait(ctx); err != nil {
			return nil, fmt.Errorf("rate limit wait failed: %w", err)
		}
	}

	// Prepare OpenAI request
	openAIRequest := c.buildOpenAIRequest(request)

	// Make API call with retries
	var lastErr error
	for attempt := 0; attempt < c.maxRetries; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt) * time.Second)
		}

		response, err := c.callOpenAI(ctx, "/chat/completions", openAIRequest)
		if err != nil {
			lastErr = err
			c.logger.Warn("OpenAI API call failed", "attempt", attempt+1, "error", err)
			continue
		}

		return c.parseOpenAIResponse(response)
	}

	return nil, fmt.Errorf("failed after %d attempts: %w", c.maxRetries, lastErr)
}

// StreamResponse generates a streaming chat completion response
func (c *Client) StreamResponse(ctx context.Context, request *ai.ChatRequest) (<-chan *ai.StreamChunk, error) {
	// Apply rate limiting
	if c.rateLimiter != nil && !c.rateLimiter.Allow() {
		if err := c.rateLimiter.Wait(ctx); err != nil {
			return nil, fmt.Errorf("rate limit wait failed: %w", err)
		}
	}

	// Prepare OpenAI request with streaming
	openAIRequest := c.buildOpenAIRequest(request)
	openAIRequest["stream"] = true

	// Create response channel
	chunkChan := make(chan *ai.StreamChunk, 100)

	// Start streaming in goroutine
	go func() {
		defer close(chunkChan)

		// Make streaming API call
		response, err := c.callOpenAIStream(ctx, "/chat/completions", openAIRequest)
		if err != nil {
			chunkChan <- &ai.StreamChunk{
				Error:      err,
				IsComplete: true,
			}
			return
		}
		defer response.Body.Close()

		// Process stream
		c.processStream(response.Body, chunkChan)
	}()

	return chunkChan, nil
}

// Model Management

// ListModels lists available models
func (c *Client) ListModels(ctx context.Context) ([]*ai.Model, error) {
	response, err := c.callOpenAI(ctx, "/models", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to list models: %w", err)
	}

	var modelsResponse struct {
		Data []struct {
			ID      string `json:"id"`
			Object  string `json:"object"`
			Created int64  `json:"created"`
			OwnedBy string `json:"owned_by"`
		} `json:"data"`
	}

	if err := json.Unmarshal(response, &modelsResponse); err != nil {
		return nil, fmt.Errorf("failed to parse models response: %w", err)
	}

	models := make([]*ai.Model, 0, len(modelsResponse.Data))
	for _, m := range modelsResponse.Data {
		if strings.Contains(m.ID, "gpt") {
			model := &ai.Model{
				ID:          m.ID,
				Name:        m.ID,
				Provider:    "openai",
				IsAvailable: true,
			}

			// Set model-specific properties
			switch {
			case strings.Contains(m.ID, "gpt-4"):
				model.MaxTokens = 8192
				model.CostPerToken = 0.00003
				model.Capabilities = []string{"chat", "completion", "function_calling"}
			case strings.Contains(m.ID, "gpt-3.5"):
				model.MaxTokens = 4096
				model.CostPerToken = 0.000002
				model.Capabilities = []string{"chat", "completion", "function_calling"}
			}

			models = append(models, model)
		}
	}

	return models, nil
}

// GetModel gets information about a specific model
func (c *Client) GetModel(ctx context.Context, modelID string) (*ai.Model, error) {
	response, err := c.callOpenAI(ctx, fmt.Sprintf("/models/%s", modelID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get model: %w", err)
	}

	var modelResponse struct {
		ID      string `json:"id"`
		Object  string `json:"object"`
		Created int64  `json:"created"`
		OwnedBy string `json:"owned_by"`
	}

	if err := json.Unmarshal(response, &modelResponse); err != nil {
		return nil, fmt.Errorf("failed to parse model response: %w", err)
	}

	model := &ai.Model{
		ID:          modelResponse.ID,
		Name:        modelResponse.ID,
		Provider:    "openai",
		IsAvailable: true,
	}

	// Set model-specific properties
	if strings.Contains(modelID, "gpt-4") {
		model.MaxTokens = 8192
		model.CostPerToken = 0.00003
		model.Capabilities = []string{"chat", "completion", "function_calling"}
	} else if strings.Contains(modelID, "gpt-3.5") {
		model.MaxTokens = 4096
		model.CostPerToken = 0.000002
		model.Capabilities = []string{"chat", "completion", "function_calling"}
	}

	return model, nil
}

// Token Management

// CountTokens counts tokens in text for a specific model
func (c *Client) CountTokens(ctx context.Context, text string, model string) (int, error) {
	// This is a simplified token counting
	// In production, use tiktoken library for accurate counting
	words := strings.Fields(text)
	// Rough approximation: 1 word ≈ 1.3 tokens
	return int(float64(len(words)) * 1.3), nil
}

// GetUsage gets token usage statistics
func (c *Client) GetUsage(ctx context.Context, timeRange *ai.TimeRange) (*ai.Usage, error) {
	// OpenAI doesn't provide usage API directly
	// This would need to be tracked separately
	return &ai.Usage{
		TotalTokens:    0,
		TotalRequests:  0,
		TotalCost:      0,
		AverageLatency: 0,
		SuccessRate:    100,
	}, nil
}

// Provider Info

// GetProviderInfo returns OpenAI provider information
func (c *Client) GetProviderInfo() *ai.ProviderInfo {
	return &ai.ProviderInfo{
		Name:    "OpenAI",
		Type:    "llm",
		Version: "v1",
		Capabilities: []string{
			"chat_completion",
			"text_completion",
			"embeddings",
			"function_calling",
			"vision",
		},
		Models: []string{
			"gpt-4",
			"gpt-4-turbo",
			"gpt-3.5-turbo",
			"gpt-3.5-turbo-16k",
		},
		Languages: []string{
			"en", "pt", "es", "fr", "de", "it", "nl", "ru", "zh", "ja", "ko",
		},
	}
}

// IsAvailable checks if the provider is available
func (c *Client) IsAvailable(ctx context.Context) bool {
	// Try to list models as a health check
	_, err := c.ListModels(ctx)
	return err == nil
}

// GetRateLimits returns OpenAI rate limits
func (c *Client) GetRateLimits() *ai.RateLimits {
	// These are typical rate limits for OpenAI
	// Actual limits depend on the account tier
	return &ai.RateLimits{
		RequestsPerMinute: 60,
		TokensPerMinute:   90000,
		RequestsPerDay:    10000,
		TokensPerDay:      2000000,
	}
}

// Helper Methods

func (c *Client) buildOpenAIRequest(request *ai.ChatRequest) map[string]interface{} {
	openAIRequest := map[string]interface{}{
		"model": request.Model,
	}

	if request.Model == "" {
		openAIRequest["model"] = c.defaultModel
	}

	// Build messages
	messages := make([]map[string]interface{}, 0)

	// Add system prompt if provided
	if request.SystemPrompt != "" {
		messages = append(messages, map[string]interface{}{
			"role":    "system",
			"content": request.SystemPrompt,
		})
	}

	// Add conversation messages
	for _, msg := range request.Messages {
		message := map[string]interface{}{
			"role":    msg.Role,
			"content": msg.Content,
		}
		if msg.Name != "" {
			message["name"] = msg.Name
		}
		messages = append(messages, message)
	}

	openAIRequest["messages"] = messages

	// Set optional parameters
	if request.Temperature > 0 {
		openAIRequest["temperature"] = request.Temperature
	}
	if request.MaxTokens > 0 {
		openAIRequest["max_tokens"] = request.MaxTokens
	}
	if request.TopP > 0 {
		openAIRequest["top_p"] = request.TopP
	}

	return openAIRequest
}

func (c *Client) callOpenAI(ctx context.Context, endpoint string, body interface{}) ([]byte, error) {
	url := c.apiURL + endpoint

	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request: %w", err)
		}
		bodyReader = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	if c.organizationID != "" {
		req.Header.Set("OpenAI-Organization", c.organizationID)
	}

	// Make request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		var errorResponse struct {
			Error struct {
				Message string `json:"message"`
				Type    string `json:"type"`
				Code    string `json:"code"`
			} `json:"error"`
		}
		if err := json.Unmarshal(responseBody, &errorResponse); err == nil {
			return nil, fmt.Errorf("OpenAI API error: %s", errorResponse.Error.Message)
		}
		return nil, fmt.Errorf("OpenAI API error: HTTP %d", resp.StatusCode)
	}

	return responseBody, nil
}

func (c *Client) callOpenAIStream(ctx context.Context, endpoint string, body interface{}) (*http.Response, error) {
	url := c.apiURL + endpoint

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")
	if c.organizationID != "" {
		req.Header.Set("OpenAI-Organization", c.organizationID)
	}

	return c.httpClient.Do(req)
}

func (c *Client) parseOpenAIResponse(response []byte) (*ai.ChatResponse, error) {
	var openAIResponse struct {
		ID      string `json:"id"`
		Object  string `json:"object"`
		Created int64  `json:"created"`
		Model   string `json:"model"`
		Choices []struct {
			Index   int `json:"index"`
			Message struct {
				Role    string `json:"role"`
				Content string `json:"content"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(response, &openAIResponse); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(openAIResponse.Choices) == 0 {
		return nil, fmt.Errorf("no choices in response")
	}

	choice := openAIResponse.Choices[0]

	// Calculate estimated cost
	costPerToken := 0.000002 // Default for GPT-3.5
	if strings.Contains(openAIResponse.Model, "gpt-4") {
		costPerToken = 0.00003
	}
	estimatedCost := float64(openAIResponse.Usage.TotalTokens) * costPerToken

	return &ai.ChatResponse{
		ID:           openAIResponse.ID,
		Content:      choice.Message.Content,
		Model:        openAIResponse.Model,
		FinishReason: choice.FinishReason,
		Usage: &ai.TokenUsage{
			PromptTokens:     openAIResponse.Usage.PromptTokens,
			CompletionTokens: openAIResponse.Usage.CompletionTokens,
			TotalTokens:      openAIResponse.Usage.TotalTokens,
			EstimatedCost:    estimatedCost,
		},
		CreatedAt: time.Now(),
	}, nil
}

func (c *Client) processStream(reader io.Reader, chunkChan chan<- *ai.StreamChunk) {
	scanner := bufio.NewScanner(reader)
	var totalTokens int

	for scanner.Scan() {
		line := scanner.Text()
		
		// Skip empty lines
		if line == "" {
			continue
		}

		// Check for SSE data prefix
		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		// Extract JSON data
		data := strings.TrimPrefix(line, "data: ")
		
		// Check for stream end
		if data == "[DONE]" {
			chunkChan <- &ai.StreamChunk{
				IsComplete: true,
				Usage: &ai.TokenUsage{
					TotalTokens: totalTokens,
				},
			}
			return
		}

		// Parse chunk
		var chunk struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
				FinishReason string `json:"finish_reason"`
			} `json:"choices"`
		}

		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			c.logger.Warn("Failed to parse stream chunk", "error", err)
			continue
		}

		if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
			content := chunk.Choices[0].Delta.Content
			totalTokens += len(strings.Fields(content))
			
			chunkChan <- &ai.StreamChunk{
				Content:    content,
				IsComplete: false,
			}
		}
	}

	if err := scanner.Err(); err != nil {
		chunkChan <- &ai.StreamChunk{
			Error:      err,
			IsComplete: true,
		}
	}
}

