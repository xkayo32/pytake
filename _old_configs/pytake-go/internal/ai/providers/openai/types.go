package openai

import (
	"time"
)

// CompletionRequest represents an OpenAI completion request
type CompletionRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float32   `json:"temperature,omitempty"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	TopP        float32   `json:"top_p,omitempty"`
	Stream      bool      `json:"stream,omitempty"`
}

// CompletionResponse represents an OpenAI completion response
type CompletionResponse struct {
	ID           string      `json:"id"`
	Object       string      `json:"object"`
	Created      int64       `json:"created"`
	Model        string      `json:"model"`
	Choices      []Choice    `json:"choices"`
	Usage        TokenUsage  `json:"usage"`
	Content      string      // Extracted from first choice
	PromptTokens int         // From usage
	CompletionTokens int     // From usage
	TokensUsed   int         // Total tokens
}

// Choice represents a completion choice
type Choice struct {
	Index        int     `json:"index"`
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
}

// Message represents a chat message
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
	Name    string `json:"name,omitempty"`
}

// TokenUsage represents token usage
type TokenUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// StreamChunk represents a streaming chunk
type StreamChunk struct {
	Content    string
	Error      error
	IsComplete bool
}

// TextMessage represents a text message for WhatsApp
type TextMessage struct {
	To         string `json:"to"`
	Text       string `json:"text"`
	PreviewURL bool   `json:"preview_url,omitempty"`
}

// MediaMessage represents a media message for WhatsApp
type MediaMessage struct {
	To       string `json:"to"`
	Type     string `json:"type"`
	MediaURL string `json:"media_url"`
	Caption  string `json:"caption,omitempty"`
	Filename string `json:"filename,omitempty"`
}

// TemplateMessage represents a template message for WhatsApp
type TemplateMessage struct {
	To           string                   `json:"to"`
	TemplateName string                   `json:"template_name"`
	Language     string                   `json:"language"`
	Components   []map[string]interface{} `json:"components,omitempty"`
}

// WhatsAppAPIResponse represents WhatsApp API response
type WhatsAppAPIResponse struct {
	Messages []struct {
		ID string `json:"id"`
	} `json:"messages"`
}

// ChatResponse represents a simplified chat response for the handler
type ChatResponse struct {
	ID           string                 `json:"id"`
	Content      string                 `json:"content"`
	Model        string                 `json:"model"`
	Usage        *TokenUsage            `json:"usage"`
	FinishReason string                 `json:"finish_reason"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
}

// ChatRequest represents a simplified chat request for compatibility
type ChatRequest struct {
	Messages     []Message              `json:"messages"`
	Model        string                 `json:"model"`
	Temperature  float32                `json:"temperature,omitempty"`
	MaxTokens    int                    `json:"max_tokens,omitempty"`
	TopP         float32                `json:"top_p,omitempty"`
	Stream       bool                   `json:"stream"`
	SystemPrompt string                 `json:"system_prompt,omitempty"`
	Options      map[string]interface{} `json:"options,omitempty"`
}