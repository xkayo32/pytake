package whatsapp

// Swagger documentation for WhatsApp endpoints

// SendMessageRequestDoc represents the message sending request
// @Description Send WhatsApp message request
type SendMessageRequestDoc struct {
	// Recipient phone number with country code
	// required: true
	// example: +5511999999999
	To string `json:"to" binding:"required" example:"+5511999999999"`
	
	// Message type
	// required: true
	// enum: text,image,document,audio,video,location,template
	// example: text
	Type string `json:"type" binding:"required" example:"text"`
	
	// Text message content (required if type is text)
	Text *TextMessageDoc `json:"text,omitempty"`
	
	// Image message content (required if type is image)
	Image *MediaMessageDoc `json:"image,omitempty"`
	
	// Document message content (required if type is document)
	Document *MediaMessageDoc `json:"document,omitempty"`
	
	// Audio message content (required if type is audio)
	Audio *MediaMessageDoc `json:"audio,omitempty"`
	
	// Video message content (required if type is video)
	Video *MediaMessageDoc `json:"video,omitempty"`
	
	// Location message content (required if type is location)
	Location *LocationMessageDoc `json:"location,omitempty"`
	
	// Template message content (required if type is template)
	Template *TemplateMessageDoc `json:"template,omitempty"`
	
	// Context for reply messages
	Context *MessageContextDoc `json:"context,omitempty"`
}

// TextMessageDoc represents text message content
// @Description Text message body
type TextMessageDoc struct {
	// Message text body
	// required: true
	// maxLength: 4096
	// example: Hello! How can I help you today?
	Body string `json:"body" binding:"required" example:"Hello! How can I help you today?"`
	
	// Preview URL metadata extraction
	// example: true
	PreviewURL bool `json:"preview_url,omitempty" example:"true"`
}

// MediaMessageDoc represents media message content
// @Description Media message with URL or ID
type MediaMessageDoc struct {
	// Media URL or ID
	// required: true
	// example: https://example.com/image.jpg
	Link string `json:"link,omitempty" example:"https://example.com/image.jpg"`
	
	// Media ID from WhatsApp
	// example: media_123456
	ID string `json:"id,omitempty" example:"media_123456"`
	
	// Caption for media
	// maxLength: 1024
	// example: Check out this image!
	Caption string `json:"caption,omitempty" example:"Check out this image!"`
	
	// Filename for documents
	// example: document.pdf
	Filename string `json:"filename,omitempty" example:"document.pdf"`
}

// LocationMessageDoc represents location message content
// @Description Location coordinates message
type LocationMessageDoc struct {
	// Latitude
	// required: true
	// example: -23.5505
	Latitude float64 `json:"latitude" binding:"required" example:"-23.5505"`
	
	// Longitude
	// required: true
	// example: -46.6333
	Longitude float64 `json:"longitude" binding:"required" example:"-46.6333"`
	
	// Location name
	// example: São Paulo
	Name string `json:"name,omitempty" example:"São Paulo"`
	
	// Location address
	// example: São Paulo, SP, Brazil
	Address string `json:"address,omitempty" example:"São Paulo, SP, Brazil"`
}

// TemplateMessageDoc represents template message content
// @Description WhatsApp template message
type TemplateMessageDoc struct {
	// Template name
	// required: true
	// example: order_confirmation
	Name string `json:"name" binding:"required" example:"order_confirmation"`
	
	// Template language
	// required: true
	// example: pt_BR
	Language TemplateLanguageDoc `json:"language" binding:"required"`
	
	// Template components with parameters
	Components []TemplateComponentDoc `json:"components,omitempty"`
}

// TemplateLanguageDoc represents template language
// @Description Template language configuration
type TemplateLanguageDoc struct {
	// Language code
	// required: true
	// example: pt_BR
	Code string `json:"code" binding:"required" example:"pt_BR"`
}

// TemplateComponentDoc represents template component
// @Description Template component with parameters
type TemplateComponentDoc struct {
	// Component type
	// enum: header,body,button
	// example: body
	Type string `json:"type" example:"body"`
	
	// Component parameters
	Parameters []TemplateParameterDoc `json:"parameters"`
}

// TemplateParameterDoc represents template parameter
// @Description Template parameter value
type TemplateParameterDoc struct {
	// Parameter type
	// enum: text,image,document,video
	// example: text
	Type string `json:"type" example:"text"`
	
	// Text value
	// example: John Doe
	Text string `json:"text,omitempty" example:"John Doe"`
	
	// Media details
	Image *MediaMessageDoc `json:"image,omitempty"`
	Document *MediaMessageDoc `json:"document,omitempty"`
	Video *MediaMessageDoc `json:"video,omitempty"`
}

// MessageContextDoc represents message context for replies
// @Description Context for reply messages
type MessageContextDoc struct {
	// Message ID to reply to
	// required: true
	// example: wamid.123456789
	MessageID string `json:"message_id" binding:"required" example:"wamid.123456789"`
}

// SendMessageResponseDoc represents the message sending response
// @Description Response after sending a message
type SendMessageResponseDoc struct {
	// Operation success status
	// example: true
	Success bool `json:"success" example:"true"`
	
	// WhatsApp message ID
	// example: wamid.987654321
	MessageID string `json:"message_id" example:"wamid.987654321"`
	
	// Message delivery status
	// enum: sent,delivered,read,failed
	// example: sent
	Status string `json:"status" example:"sent"`
	
	// Error message if failed
	// example: 
	Error string `json:"error,omitempty"`
	
	// Timestamp
	// example: 2024-01-15T10:30:00Z
	Timestamp string `json:"timestamp" example:"2024-01-15T10:30:00Z"`
}

// WhatsAppConfigDoc represents WhatsApp configuration
// @Description WhatsApp Business API configuration
type WhatsAppConfigDoc struct {
	// Configuration ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	ID string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Configuration name
	// required: true
	// example: Main WhatsApp
	Name string `json:"name" binding:"required" example:"Main WhatsApp"`
	
	// WhatsApp Phone Number ID
	// required: true
	// example: 123456789012345
	PhoneNumberID string `json:"phone_number_id" binding:"required" example:"123456789012345"`
	
	// WhatsApp Business Account ID
	// required: true
	// example: 987654321098765
	BusinessAccountID string `json:"business_account_id" binding:"required" example:"987654321098765"`
	
	// Access Token
	// required: true
	// example: EAABx...
	AccessToken string `json:"access_token" binding:"required" example:"EAABx..."`
	
	// Webhook URL
	// required: true
	// example: https://api.example.com/webhook/whatsapp
	WebhookURL string `json:"webhook_url" binding:"required" example:"https://api.example.com/webhook/whatsapp"`
	
	// Webhook Verify Token
	// required: true
	// example: my_verify_token_123
	WebhookVerifyToken string `json:"webhook_verify_token" binding:"required" example:"my_verify_token_123"`
	
	// API Version
	// example: v18.0
	APIVersion string `json:"api_version" example:"v18.0"`
	
	// Configuration active status
	// example: true
	IsActive bool `json:"is_active" example:"true"`
	
	// Provider type
	// enum: official,evolution
	// example: official
	Provider string `json:"provider" example:"official"`
	
	// Phone number
	// example: +5511999999999
	PhoneNumber string `json:"phone_number" example:"+5511999999999"`
	
	// Business name
	// example: My Business
	BusinessName string `json:"business_name" example:"My Business"`
	
	// Creation timestamp
	// example: 2024-01-15T10:30:00Z
	CreatedAt string `json:"created_at" example:"2024-01-15T10:30:00Z"`
	
	// Last update timestamp
	// example: 2024-01-15T10:30:00Z
	UpdatedAt string `json:"updated_at" example:"2024-01-15T10:30:00Z"`
}

// WebhookPayloadDoc represents incoming webhook data
// @Description WhatsApp webhook payload
type WebhookPayloadDoc struct {
	// Object type
	// example: whatsapp_business_account
	Object string `json:"object" example:"whatsapp_business_account"`
	
	// Entry array
	Entry []WebhookEntryDoc `json:"entry"`
}

// WebhookEntryDoc represents webhook entry
// @Description Webhook entry data
type WebhookEntryDoc struct {
	// Entry ID
	// example: 123456789
	ID string `json:"id" example:"123456789"`
	
	// Changes array
	Changes []WebhookChangeDoc `json:"changes"`
}

// WebhookChangeDoc represents webhook change
// @Description Webhook change data
type WebhookChangeDoc struct {
	// Field type
	// example: messages
	Field string `json:"field" example:"messages"`
	
	// Value object
	Value WebhookValueDoc `json:"value"`
}

// WebhookValueDoc represents webhook value
// @Description Webhook value containing messages and statuses
type WebhookValueDoc struct {
	// Messaging product
	// example: whatsapp
	MessagingProduct string `json:"messaging_product" example:"whatsapp"`
	
	// Metadata
	Metadata WebhookMetadataDoc `json:"metadata"`
	
	// Messages array
	Messages []IncomingMessageDoc `json:"messages,omitempty"`
	
	// Statuses array
	Statuses []MessageStatusDoc `json:"statuses,omitempty"`
}

// WebhookMetadataDoc represents webhook metadata
// @Description Webhook metadata
type WebhookMetadataDoc struct {
	// Display phone number
	// example: +5511999999999
	DisplayPhoneNumber string `json:"display_phone_number" example:"+5511999999999"`
	
	// Phone number ID
	// example: 123456789012345
	PhoneNumberID string `json:"phone_number_id" example:"123456789012345"`
}

// IncomingMessageDoc represents incoming message
// @Description Incoming WhatsApp message
type IncomingMessageDoc struct {
	// Message ID
	// example: wamid.123456789
	ID string `json:"id" example:"wamid.123456789"`
	
	// Sender phone number
	// example: +5511888888888
	From string `json:"from" example:"+5511888888888"`
	
	// Message type
	// enum: text,image,document,audio,video,location,button,interactive
	// example: text
	Type string `json:"type" example:"text"`
	
	// Timestamp
	// example: 1705320600
	Timestamp string `json:"timestamp" example:"1705320600"`
	
	// Text content
	Text *TextContentDoc `json:"text,omitempty"`
	
	// Image content
	Image *MediaContentDoc `json:"image,omitempty"`
	
	// Context for replies
	Context *MessageContextDoc `json:"context,omitempty"`
}

// TextContentDoc represents text content
// @Description Text message content
type TextContentDoc struct {
	// Message body
	// example: Hello, I need help
	Body string `json:"body" example:"Hello, I need help"`
}

// MediaContentDoc represents media content
// @Description Media message content
type MediaContentDoc struct {
	// Media ID
	// example: media_123456
	ID string `json:"id" example:"media_123456"`
	
	// MIME type
	// example: image/jpeg
	MimeType string `json:"mime_type" example:"image/jpeg"`
	
	// SHA256 hash
	// example: abc123...
	SHA256 string `json:"sha256" example:"abc123..."`
	
	// Caption
	// example: Product image
	Caption string `json:"caption,omitempty" example:"Product image"`
}

// MessageStatusDoc represents message status update
// @Description Message delivery status update
type MessageStatusDoc struct {
	// Message ID
	// example: wamid.987654321
	ID string `json:"id" example:"wamid.987654321"`
	
	// Recipient ID
	// example: +5511999999999
	RecipientID string `json:"recipient_id" example:"+5511999999999"`
	
	// Status
	// enum: sent,delivered,read,failed
	// example: delivered
	Status string `json:"status" example:"delivered"`
	
	// Timestamp
	// example: 1705320600
	Timestamp string `json:"timestamp" example:"1705320600"`
	
	// Error details
	Errors []ErrorDetailDoc `json:"errors,omitempty"`
}

// ErrorDetailDoc represents error details
// @Description Error details for failed messages
type ErrorDetailDoc struct {
	// Error code
	// example: 131051
	Code int `json:"code" example:"131051"`
	
	// Error title
	// example: Message Undeliverable
	Title string `json:"title" example:"Message Undeliverable"`
	
	// Error details
	// example: User's phone is not registered on WhatsApp
	Details string `json:"details" example:"User's phone is not registered on WhatsApp"`
}

// SendMessage godoc
// @Summary Send WhatsApp message
// @Description Send a WhatsApp message to a recipient
// @Tags WhatsApp
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body SendMessageRequestDoc true "Message data"
// @Success 200 {object} SendMessageResponseDoc "Message sent successfully"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 429 {object} ErrorResponseDoc "Rate limit exceeded"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /whatsapp/send [post]
func SendMessageDoc() {}

// Webhook godoc
// @Summary WhatsApp webhook
// @Description Receive WhatsApp webhook events
// @Tags WhatsApp
// @Accept json
// @Produce json
// @Param X-Hub-Signature-256 header string false "HMAC signature for validation"
// @Param payload body WebhookPayloadDoc true "Webhook payload"
// @Success 200 {string} string "OK"
// @Failure 400 {object} ErrorResponseDoc "Invalid payload"
// @Failure 401 {object} ErrorResponseDoc "Invalid signature"
// @Failure 500 {object} ErrorResponseDoc "Processing error"
// @Router /whatsapp/webhook [post]
func WebhookDoc() {}

// WebhookVerify godoc
// @Summary Verify webhook
// @Description Verify WhatsApp webhook configuration
// @Tags WhatsApp
// @Produce plain
// @Param hub.mode query string true "Mode (subscribe)"
// @Param hub.verify_token query string true "Verification token"
// @Param hub.challenge query string true "Challenge string"
// @Success 200 {string} string "Challenge"
// @Failure 403 {string} string "Forbidden"
// @Router /whatsapp/webhook [get]
func WebhookVerifyDoc() {}

// GetConfigs godoc
// @Summary List WhatsApp configurations
// @Description Get all WhatsApp configurations for the tenant
// @Tags WhatsApp
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {array} WhatsAppConfigDoc "List of configurations"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /whatsapp/configs [get]
func GetConfigsDoc() {}

// GetConfig godoc
// @Summary Get WhatsApp configuration
// @Description Get a specific WhatsApp configuration
// @Tags WhatsApp
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Configuration ID" format(uuid)
// @Success 200 {object} WhatsAppConfigDoc "Configuration details"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Configuration not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /whatsapp/configs/{id} [get]
func GetConfigDoc() {}

// CreateConfig godoc
// @Summary Create WhatsApp configuration
// @Description Create a new WhatsApp configuration
// @Tags WhatsApp
// @Accept json
// @Produce json
// @Security Bearer
// @Param config body WhatsAppConfigDoc true "Configuration data"
// @Success 201 {object} WhatsAppConfigDoc "Created configuration"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 409 {object} ErrorResponseDoc "Configuration already exists"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /whatsapp/configs [post]
func CreateConfigDoc() {}

// UpdateConfig godoc
// @Summary Update WhatsApp configuration
// @Description Update an existing WhatsApp configuration
// @Tags WhatsApp
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Configuration ID" format(uuid)
// @Param config body WhatsAppConfigDoc true "Updated configuration"
// @Success 200 {object} WhatsAppConfigDoc "Updated configuration"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Configuration not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /whatsapp/configs/{id} [put]
func UpdateConfigDoc() {}

// DeleteConfig godoc
// @Summary Delete WhatsApp configuration
// @Description Delete a WhatsApp configuration
// @Tags WhatsApp
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Configuration ID" format(uuid)
// @Success 204 "Configuration deleted"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Configuration not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /whatsapp/configs/{id} [delete]
func DeleteConfigDoc() {}

// TestConfig godoc
// @Summary Test WhatsApp configuration
// @Description Test a WhatsApp configuration by sending a test message
// @Tags WhatsApp
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Configuration ID" format(uuid)
// @Param request body map[string]string true "Test parameters" example({"to":"+5511999999999"})
// @Success 200 {object} map[string]interface{} "Test result"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Configuration not found"
// @Failure 500 {object} ErrorResponseDoc "Test failed"
// @Router /whatsapp/configs/{id}/test [post]
func TestConfigDoc() {}

// ErrorResponseDoc represents an error response
// @Description Standard error response format
type ErrorResponseDoc struct {
	// Error code
	// example: INVALID_REQUEST
	Code string `json:"code" example:"INVALID_REQUEST"`
	
	// Error message
	// example: Invalid phone number format
	Message string `json:"message" example:"Invalid phone number format"`
	
	// Additional error details
	Details map[string]interface{} `json:"details,omitempty"`
}