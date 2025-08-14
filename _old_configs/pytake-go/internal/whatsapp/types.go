package whatsapp

import (
	"time"

	"github.com/google/uuid"
)

// MessageType represents the type of WhatsApp message
type MessageType string

const (
	MessageTypeText     MessageType = "text"
	MessageTypeImage    MessageType = "image"
	MessageTypeDocument MessageType = "document"
	MessageTypeAudio    MessageType = "audio"
	MessageTypeVideo    MessageType = "video"
	MessageTypeLocation MessageType = "location"
	MessageTypeTemplate MessageType = "template"
	MessageTypeButtons  MessageType = "interactive"
)

// MessageStatus represents the delivery status of a message
type MessageStatus string

const (
	MessageStatusPending   MessageStatus = "pending"
	MessageStatusSent      MessageStatus = "sent"
	MessageStatusDelivered MessageStatus = "delivered"
	MessageStatusRead      MessageStatus = "read"
	MessageStatusFailed    MessageStatus = "failed"
)

// TextMessage represents a text message to send
type TextMessage struct {
	To         string `json:"to" validate:"required"`
	Text       string `json:"text" validate:"required,max=4096"`
	PreviewURL bool   `json:"preview_url,omitempty"`
}

// MediaMessage represents a media message to send
type MediaMessage struct {
	To       string      `json:"to" validate:"required"`
	Type     MessageType `json:"type" validate:"required,oneof=image document audio video"`
	MediaURL string      `json:"media_url" validate:"required,url"`
	Caption  string      `json:"caption,omitempty" validate:"max=1024"`
	Filename string      `json:"filename,omitempty"`
}

// TemplateMessage represents a template message to send
type TemplateMessage struct {
	To           string                 `json:"to" validate:"required"`
	TemplateName string                 `json:"template_name" validate:"required"`
	Language     string                 `json:"language" validate:"required"`
	Components   []TemplateComponent    `json:"components,omitempty"`
}

// TemplateComponent represents a component of a template message
type TemplateComponent struct {
	Type       string              `json:"type" validate:"required,oneof=header body button"`
	Parameters []TemplateParameter `json:"parameters,omitempty"`
}

// TemplateParameter represents a parameter in a template component
type TemplateParameter struct {
	Type     string      `json:"type" validate:"required,oneof=text currency date_time image document video"`
	Text     string      `json:"text,omitempty"`
	Image    *MediaInfo  `json:"image,omitempty"`
	Document *MediaInfo  `json:"document,omitempty"`
	Video    *MediaInfo  `json:"video,omitempty"`
}

// MediaInfo contains media information
type MediaInfo struct {
	Link     string `json:"link,omitempty"`
	Caption  string `json:"caption,omitempty"`
	Filename string `json:"filename,omitempty"`
}

// SendMessageRequest is the generic request for sending messages
type SendMessageRequest struct {
	ConfigID uuid.UUID   `json:"config_id" validate:"required"`
	Type     MessageType `json:"type" validate:"required"`
	To       string      `json:"to" validate:"required"`
	
	// Message content based on type
	Text     *TextContent     `json:"text,omitempty"`
	Media    *MediaContent    `json:"media,omitempty"`
	Template *TemplateContent `json:"template,omitempty"`
}

// TextContent for text messages
type TextContent struct {
	Body       string `json:"body" validate:"required,max=4096"`
	PreviewURL bool   `json:"preview_url,omitempty"`
}

// MediaContent for media messages
type MediaContent struct {
	URL      string `json:"url" validate:"required,url"`
	Caption  string `json:"caption,omitempty" validate:"max=1024"`
	Filename string `json:"filename,omitempty"`
}

// TemplateContent for template messages
type TemplateContent struct {
	Name       string              `json:"name" validate:"required"`
	Language   string              `json:"language" validate:"required"`
	Components []TemplateComponent `json:"components,omitempty"`
}

// SendMessageResponse represents the response after sending a message
type SendMessageResponse struct {
	MessageID    string        `json:"message_id"`
	Status       MessageStatus `json:"status"`
	To           string        `json:"to"`
	Timestamp    time.Time     `json:"timestamp"`
	ConfigID     uuid.UUID     `json:"config_id"`
	ErrorMessage string        `json:"error_message,omitempty"`
}

// WebhookEvent represents an incoming webhook event from WhatsApp
type WebhookEvent struct {
	Object string      `json:"object"`
	Entry  []Entry     `json:"entry"`
}

// Entry represents a webhook entry
type Entry struct {
	ID      string   `json:"id"`
	Changes []Change `json:"changes"`
}

// Change represents a change in the webhook
type Change struct {
	Value ChangeValue `json:"value"`
	Field string      `json:"field"`
}

// ChangeValue contains the actual webhook data
type ChangeValue struct {
	MessagingProduct string     `json:"messaging_product"`
	Metadata         Metadata   `json:"metadata"`
	Contacts         []Contact  `json:"contacts,omitempty"`
	Messages         []Message  `json:"messages,omitempty"`
	Statuses         []Status   `json:"statuses,omitempty"`
	Errors           []Error    `json:"errors,omitempty"`
}

// Metadata contains metadata about the webhook
type Metadata struct {
	DisplayPhoneNumber string `json:"display_phone_number"`
	PhoneNumberID      string `json:"phone_number_id"`
}

// Contact represents a WhatsApp contact
type Contact struct {
	Profile Profile `json:"profile"`
	WaID    string  `json:"wa_id"`
}

// Profile represents a contact's profile
type Profile struct {
	Name string `json:"name"`
}

// Message represents an incoming WhatsApp message
type Message struct {
	From      string          `json:"from"`
	ID        string          `json:"id"`
	Timestamp string          `json:"timestamp"`
	Type      MessageType     `json:"type"`
	Text      *TextBody       `json:"text,omitempty"`
	Image     *MediaBody      `json:"image,omitempty"`
	Document  *MediaBody      `json:"document,omitempty"`
	Audio     *MediaBody      `json:"audio,omitempty"`
	Video     *MediaBody      `json:"video,omitempty"`
	Location  *LocationBody   `json:"location,omitempty"`
	Context   *MessageContext `json:"context,omitempty"`
}

// TextBody represents text message content
type TextBody struct {
	Body string `json:"body"`
}

// MediaBody represents media message content
type MediaBody struct {
	ID       string `json:"id"`
	MimeType string `json:"mime_type"`
	SHA256   string `json:"sha256"`
	Caption  string `json:"caption,omitempty"`
	Filename string `json:"filename,omitempty"`
}

// LocationBody represents location message content
type LocationBody struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Name      string  `json:"name,omitempty"`
	Address   string  `json:"address,omitempty"`
}

// MessageContext represents message context (for replies)
type MessageContext struct {
	From string `json:"from"`
	ID   string `json:"id"`
}

// Status represents a message status update
type Status struct {
	ID          string        `json:"id"`
	RecipientID string        `json:"recipient_id"`
	Status      MessageStatus `json:"status"`
	Timestamp   string        `json:"timestamp"`
	Errors      []Error       `json:"errors,omitempty"`
}

// Error represents a WhatsApp API error
type Error struct {
	Code    int    `json:"code"`
	Title   string `json:"title"`
	Message string `json:"message,omitempty"`
	Details string `json:"error_data,omitempty"`
}

// WhatsAppAPIRequest represents the API request format
type WhatsAppAPIRequest struct {
	MessagingProduct string      `json:"messaging_product"`
	RecipientType    string      `json:"recipient_type,omitempty"`
	To               string      `json:"to"`
	Type             MessageType `json:"type"`
	Text             *APIText    `json:"text,omitempty"`
	Image            *APIMedia   `json:"image,omitempty"`
	Document         *APIMedia   `json:"document,omitempty"`
	Audio            *APIMedia   `json:"audio,omitempty"`
	Video            *APIMedia   `json:"video,omitempty"`
	Template         *APITemplate `json:"template,omitempty"`
}

// APIText represents text in API format
type APIText struct {
	PreviewURL bool   `json:"preview_url,omitempty"`
	Body       string `json:"body"`
}

// APIMedia represents media in API format
type APIMedia struct {
	Link     string `json:"link,omitempty"`
	ID       string `json:"id,omitempty"`
	Caption  string `json:"caption,omitempty"`
	Filename string `json:"filename,omitempty"`
}

// APITemplate represents template in API format
type APITemplate struct {
	Name       string                `json:"name"`
	Language   APITemplateLanguage   `json:"language"`
	Components []APITemplateComponent `json:"components,omitempty"`
}

// APITemplateLanguage represents template language
type APITemplateLanguage struct {
	Code string `json:"code"`
}

// APITemplateComponent represents a template component in API format
type APITemplateComponent struct {
	Type       string                   `json:"type"`
	Parameters []APITemplateParameter   `json:"parameters,omitempty"`
}

// APITemplateParameter represents a template parameter in API format
type APITemplateParameter struct {
	Type     string    `json:"type"`
	Text     string    `json:"text,omitempty"`
	Image    *APIMedia `json:"image,omitempty"`
	Document *APIMedia `json:"document,omitempty"`
	Video    *APIMedia `json:"video,omitempty"`
}

// WhatsAppAPIResponse represents the API response
type WhatsAppAPIResponse struct {
	MessagingProduct string            `json:"messaging_product"`
	Contacts         []APIContact      `json:"contacts"`
	Messages         []APIMessage      `json:"messages"`
	Error            *APIError         `json:"error,omitempty"`
}

// APIContact represents a contact in API response
type APIContact struct {
	Input string `json:"input"`
	WaID  string `json:"wa_id"`
}

// APIMessage represents a message in API response
type APIMessage struct {
	ID string `json:"id"`
}

// APIError represents an error in API response
type APIError struct {
	Message   string `json:"message"`
	Type      string `json:"type"`
	Code      int    `json:"code"`
	FbTraceID string `json:"fbtrace_id,omitempty"`
}

// WebhookVerification for webhook setup
type WebhookVerification struct {
	Mode      string `form:"hub.mode" binding:"required"`
	Token     string `form:"hub.verify_token" binding:"required"`
	Challenge string `form:"hub.challenge" binding:"required"`
}