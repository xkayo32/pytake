package ai

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// AIProvider defines the interface for AI service providers
type AIProvider interface {
	// Chat Operations
	GenerateResponse(ctx context.Context, request *ChatRequest) (*ChatResponse, error)
	StreamResponse(ctx context.Context, request *ChatRequest) (<-chan *StreamChunk, error)
	
	// Model Management
	ListModels(ctx context.Context) ([]*Model, error)
	GetModel(ctx context.Context, modelID string) (*Model, error)
	
	// Token Management
	CountTokens(ctx context.Context, text string, model string) (int, error)
	GetUsage(ctx context.Context, timeRange *TimeRange) (*Usage, error)
	
	// Provider Info
	GetProviderInfo() *ProviderInfo
	IsAvailable(ctx context.Context) bool
	GetRateLimits() *RateLimits
}

// ContextManager defines the interface for managing conversation context
type ContextManager interface {
	// Context Operations
	CreateContext(ctx context.Context, tenantID uuid.UUID, config *ContextConfig) (*ConversationContext, error)
	UpdateContext(ctx context.Context, contextID uuid.UUID, update *ContextUpdate) error
	GetContext(ctx context.Context, contextID uuid.UUID) (*ConversationContext, error)
	DeleteContext(ctx context.Context, contextID uuid.UUID) error
	
	// Message History
	AddMessage(ctx context.Context, contextID uuid.UUID, message *Message) error
	GetMessages(ctx context.Context, contextID uuid.UUID, limit int) ([]*Message, error)
	ClearMessages(ctx context.Context, contextID uuid.UUID) error
	
	// Context Search
	SearchSimilar(ctx context.Context, tenantID uuid.UUID, query string, limit int) ([]*ConversationContext, error)
	GetRelevantContext(ctx context.Context, tenantID uuid.UUID, message string) (*EnrichedContext, error)
	
	// Embeddings
	GenerateEmbedding(ctx context.Context, text string) ([]float32, error)
	StoreEmbedding(ctx context.Context, contextID uuid.UUID, embedding []float32) error
}

// PromptEngine defines the interface for prompt management
type PromptEngine interface {
	// Template Management
	CreateTemplate(ctx context.Context, template *PromptTemplate) (*PromptTemplate, error)
	GetTemplate(ctx context.Context, templateID uuid.UUID) (*PromptTemplate, error)
	ListTemplates(ctx context.Context, filter *TemplateFilter) ([]*PromptTemplate, error)
	UpdateTemplate(ctx context.Context, templateID uuid.UUID, update *TemplateUpdate) error
	DeleteTemplate(ctx context.Context, templateID uuid.UUID) error
	
	// Prompt Generation
	GeneratePrompt(ctx context.Context, templateID uuid.UUID, variables map[string]interface{}) (string, error)
	BuildPrompt(ctx context.Context, request *PromptRequest) (*BuiltPrompt, error)
	
	// Persona Management
	CreatePersona(ctx context.Context, persona *Persona) (*Persona, error)
	GetPersona(ctx context.Context, personaID uuid.UUID) (*Persona, error)
	ApplyPersona(ctx context.Context, prompt string, personaID uuid.UUID) (string, error)
}

// ResponseProcessor defines the interface for processing AI responses
type ResponseProcessor interface {
	// Intent & Entity
	DetectIntent(ctx context.Context, message string) (*Intent, error)
	ExtractEntities(ctx context.Context, message string) ([]*Entity, error)
	ClassifyMessage(ctx context.Context, message string, categories []string) (*Classification, error)
	
	// Sentiment Analysis
	AnalyzeSentiment(ctx context.Context, message string) (*Sentiment, error)
	DetectEmotion(ctx context.Context, message string) (*Emotion, error)
	
	// Action Detection
	ExtractActions(ctx context.Context, response string) ([]*Action, error)
	RecommendNextSteps(ctx context.Context, conversation *ConversationContext) ([]*Recommendation, error)
	
	// Language Detection
	DetectLanguage(ctx context.Context, text string) (*Language, error)
	Translate(ctx context.Context, text string, targetLang string) (string, error)
}

// SafetyManager defines the interface for content safety
type SafetyManager interface {
	// Content Moderation
	ModerateContent(ctx context.Context, content string) (*ModerationResult, error)
	FilterResponse(ctx context.Context, response string) (string, error)
	CheckCompliance(ctx context.Context, content string, rules []string) (*ComplianceResult, error)
	
	// PII Protection
	DetectPII(ctx context.Context, text string) ([]*PIIEntity, error)
	RedactPII(ctx context.Context, text string) (string, error)
	
	// Validation
	ValidateResponse(ctx context.Context, response string, criteria *ValidationCriteria) (*ValidationResult, error)
	VerifyFactualAccuracy(ctx context.Context, statement string, context *ConversationContext) (bool, error)
	
	// Audit
	LogInteraction(ctx context.Context, interaction *AIInteraction) error
	GetAuditLog(ctx context.Context, filter *AuditFilter) ([]*AuditEntry, error)
}

// Data Structures

// ChatRequest represents a chat completion request
type ChatRequest struct {
	Messages     []*Message             `json:"messages"`
	Model        string                 `json:"model"`
	Temperature  float32                `json:"temperature,omitempty"`
	MaxTokens    int                    `json:"max_tokens,omitempty"`
	TopP         float32                `json:"top_p,omitempty"`
	Stream       bool                   `json:"stream"`
	SystemPrompt string                 `json:"system_prompt,omitempty"`
	Context      *ConversationContext   `json:"context,omitempty"`
	Options      map[string]interface{} `json:"options,omitempty"`
}

// ChatResponse represents a chat completion response
type ChatResponse struct {
	ID           string                 `json:"id"`
	Content      string                 `json:"content"`
	Model        string                 `json:"model"`
	Usage        *TokenUsage            `json:"usage"`
	FinishReason string                 `json:"finish_reason"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
}

// StreamChunk represents a streaming response chunk
type StreamChunk struct {
	Content      string    `json:"content"`
	IsComplete   bool      `json:"is_complete"`
	Error        error     `json:"error,omitempty"`
	Usage        *TokenUsage `json:"usage,omitempty"`
}

// Message represents a conversation message
type Message struct {
	Role      string                 `json:"role"` // system, user, assistant
	Content   string                 `json:"content"`
	Name      string                 `json:"name,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

// ConversationContext represents conversation context
type ConversationContext struct {
	ID              uuid.UUID              `json:"id"`
	TenantID        uuid.UUID              `json:"tenant_id"`
	ConversationID  uuid.UUID              `json:"conversation_id"`
	CustomerID      uuid.UUID              `json:"customer_id"`
	Messages        []*Message             `json:"messages"`
	Summary         string                 `json:"summary"`
	Topics          []string               `json:"topics"`
	Entities        map[string]interface{} `json:"entities"`
	CustomerProfile *CustomerProfile       `json:"customer_profile,omitempty"`
	BusinessContext *BusinessContext       `json:"business_context,omitempty"`
	Metadata        map[string]interface{} `json:"metadata"`
	WindowSize      int                    `json:"window_size"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

// EnrichedContext represents context with additional information
type EnrichedContext struct {
	Context         *ConversationContext   `json:"context"`
	RelatedContexts []*ConversationContext `json:"related_contexts"`
	RelevantFAQs    []*FAQ                 `json:"relevant_faqs"`
	ProductInfo     []*Product             `json:"product_info"`
	CustomerHistory *CustomerHistory       `json:"customer_history"`
}

// CustomerProfile represents customer information
type CustomerProfile struct {
	ID              uuid.UUID              `json:"id"`
	Name            string                 `json:"name"`
	Email           string                 `json:"email"`
	Phone           string                 `json:"phone"`
	PreferredLang   string                 `json:"preferred_language"`
	Preferences     map[string]interface{} `json:"preferences"`
	Tags            []string               `json:"tags"`
	LifetimeValue   float64                `json:"lifetime_value"`
	LastInteraction time.Time              `json:"last_interaction"`
}

// BusinessContext represents business-specific context
type BusinessContext struct {
	CompanyName   string                 `json:"company_name"`
	Industry      string                 `json:"industry"`
	Products      []*Product             `json:"products"`
	Services      []*Service             `json:"services"`
	FAQs          []*FAQ                 `json:"faqs"`
	BusinessRules map[string]interface{} `json:"business_rules"`
	WorkingHours  *WorkingHours          `json:"working_hours"`
}

// PromptTemplate represents a reusable prompt template
type PromptTemplate struct {
	ID          uuid.UUID              `json:"id"`
	TenantID    uuid.UUID              `json:"tenant_id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Template    string                 `json:"template"`
	Variables   []string               `json:"variables"`
	Category    string                 `json:"category"`
	Language    string                 `json:"language"`
	PersonaID   *uuid.UUID             `json:"persona_id,omitempty"`
	IsActive    bool                   `json:"is_active"`
	Metadata    map[string]interface{} `json:"metadata"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// Persona represents an AI personality
type Persona struct {
	ID           uuid.UUID              `json:"id"`
	TenantID     uuid.UUID              `json:"tenant_id"`
	Name         string                 `json:"name"`
	Description  string                 `json:"description"`
	Personality  string                 `json:"personality"`
	Tone         string                 `json:"tone"`
	Style        string                 `json:"style"`
	Instructions []string               `json:"instructions"`
	Examples     []*Example             `json:"examples"`
	Constraints  []string               `json:"constraints"`
	IsDefault    bool                   `json:"is_default"`
	CreatedAt    time.Time              `json:"created_at"`
}

// Intent represents detected user intent
type Intent struct {
	Name       string                 `json:"name"`
	Confidence float32                `json:"confidence"`
	Parameters map[string]interface{} `json:"parameters"`
	Examples   []string               `json:"examples"`
}

// Entity represents an extracted entity
type Entity struct {
	Type       string  `json:"type"`
	Value      string  `json:"value"`
	Confidence float32 `json:"confidence"`
	Start      int     `json:"start"`
	End        int     `json:"end"`
}

// Sentiment represents sentiment analysis result
type Sentiment struct {
	Score     float32 `json:"score"` // -1 to 1
	Label     string  `json:"label"` // positive, negative, neutral
	Magnitude float32 `json:"magnitude"`
}

// Action represents a detected action
type Action struct {
	Type        string                 `json:"type"`
	Name        string                 `json:"name"`
	Parameters  map[string]interface{} `json:"parameters"`
	Confidence  float32                `json:"confidence"`
	Required    bool                   `json:"required"`
	Description string                 `json:"description"`
}

// ModerationResult represents content moderation result
type ModerationResult struct {
	IsSafe       bool                   `json:"is_safe"`
	Flagged      bool                   `json:"flagged"`
	Categories   map[string]float32     `json:"categories"`
	Reason       string                 `json:"reason,omitempty"`
	Suggestions  []string               `json:"suggestions,omitempty"`
	Confidence   float32                `json:"confidence"`
}

// PIIEntity represents personally identifiable information
type PIIEntity struct {
	Type     string `json:"type"`
	Value    string `json:"value"`
	Start    int    `json:"start"`
	End      int    `json:"end"`
	Redacted string `json:"redacted"`
}

// Model represents an AI model
type Model struct {
	ID            string                 `json:"id"`
	Name          string                 `json:"name"`
	Provider      string                 `json:"provider"`
	Capabilities  []string               `json:"capabilities"`
	MaxTokens     int                    `json:"max_tokens"`
	CostPerToken  float64                `json:"cost_per_token"`
	IsAvailable   bool                   `json:"is_available"`
	Metadata      map[string]interface{} `json:"metadata"`
}

// TokenUsage represents token usage statistics
type TokenUsage struct {
	PromptTokens     int     `json:"prompt_tokens"`
	CompletionTokens int     `json:"completion_tokens"`
	TotalTokens      int     `json:"total_tokens"`
	EstimatedCost    float64 `json:"estimated_cost"`
}

// ProviderInfo represents AI provider information
type ProviderInfo struct {
	Name         string   `json:"name"`
	Type         string   `json:"type"`
	Version      string   `json:"version"`
	Capabilities []string `json:"capabilities"`
	Models       []string `json:"models"`
	Languages    []string `json:"languages"`
}

// RateLimits represents API rate limits
type RateLimits struct {
	RequestsPerMinute int `json:"requests_per_minute"`
	TokensPerMinute   int `json:"tokens_per_minute"`
	RequestsPerDay    int `json:"requests_per_day"`
	TokensPerDay      int `json:"tokens_per_day"`
}

// Additional helper types

type ContextConfig struct {
	WindowSize      int                    `json:"window_size"`
	RetentionPeriod time.Duration          `json:"retention_period"`
	MaxMessages     int                    `json:"max_messages"`
	Features        []string               `json:"features"`
	Metadata        map[string]interface{} `json:"metadata"`
}

type ContextUpdate struct {
	Summary  *string                `json:"summary,omitempty"`
	Topics   []string               `json:"topics,omitempty"`
	Entities map[string]interface{} `json:"entities,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

type TemplateFilter struct {
	Category  string     `json:"category,omitempty"`
	Language  string     `json:"language,omitempty"`
	PersonaID *uuid.UUID `json:"persona_id,omitempty"`
	IsActive  *bool      `json:"is_active,omitempty"`
}

type TemplateUpdate struct {
	Name        *string                `json:"name,omitempty"`
	Description *string                `json:"description,omitempty"`
	Template    *string                `json:"template,omitempty"`
	Variables   []string               `json:"variables,omitempty"`
	IsActive    *bool                  `json:"is_active,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

type PromptRequest struct {
	TemplateID uuid.UUID              `json:"template_id"`
	Variables  map[string]interface{} `json:"variables"`
	PersonaID  *uuid.UUID             `json:"persona_id,omitempty"`
	Context    *ConversationContext   `json:"context,omitempty"`
	Language   string                 `json:"language,omitempty"`
}

type BuiltPrompt struct {
	Content    string                 `json:"content"`
	TokenCount int                    `json:"token_count"`
	Metadata   map[string]interface{} `json:"metadata"`
}

type Classification struct {
	Category   string  `json:"category"`
	Confidence float32 `json:"confidence"`
	Secondary  string  `json:"secondary,omitempty"`
}

type Emotion struct {
	Primary   string             `json:"primary"`
	Secondary string             `json:"secondary,omitempty"`
	Intensity float32            `json:"intensity"`
	Emotions  map[string]float32 `json:"emotions"`
}

type Recommendation struct {
	Type        string                 `json:"type"`
	Action      string                 `json:"action"`
	Reason      string                 `json:"reason"`
	Priority    int                    `json:"priority"`
	Parameters  map[string]interface{} `json:"parameters"`
}

type Language struct {
	Code       string  `json:"code"`
	Name       string  `json:"name"`
	Confidence float32 `json:"confidence"`
}

type ValidationCriteria struct {
	CheckFactuality bool     `json:"check_factuality"`
	CheckTone       bool     `json:"check_tone"`
	CheckLength     bool     `json:"check_length"`
	MaxLength       int      `json:"max_length,omitempty"`
	AllowedTopics   []string `json:"allowed_topics,omitempty"`
	ProhibitedTerms []string `json:"prohibited_terms,omitempty"`
}

type ValidationResult struct {
	IsValid    bool                   `json:"is_valid"`
	Issues     []string               `json:"issues"`
	Score      float32                `json:"score"`
	Details    map[string]interface{} `json:"details"`
}

type ComplianceResult struct {
	IsCompliant bool                   `json:"is_compliant"`
	Violations  []string               `json:"violations"`
	Warnings    []string               `json:"warnings"`
	Details     map[string]interface{} `json:"details"`
}

type AIInteraction struct {
	ID             uuid.UUID              `json:"id"`
	TenantID       uuid.UUID              `json:"tenant_id"`
	ConversationID uuid.UUID              `json:"conversation_id"`
	Request        *ChatRequest           `json:"request"`
	Response       *ChatResponse          `json:"response"`
	Duration       time.Duration          `json:"duration"`
	Status         string                 `json:"status"`
	Error          string                 `json:"error,omitempty"`
	Metadata       map[string]interface{} `json:"metadata"`
	Timestamp      time.Time              `json:"timestamp"`
}

type AuditEntry struct {
	ID          uuid.UUID              `json:"id"`
	TenantID    uuid.UUID              `json:"tenant_id"`
	Type        string                 `json:"type"`
	Action      string                 `json:"action"`
	Actor       string                 `json:"actor"`
	Resource    string                 `json:"resource"`
	Details     map[string]interface{} `json:"details"`
	Timestamp   time.Time              `json:"timestamp"`
}

type AuditFilter struct {
	TenantID  uuid.UUID  `json:"tenant_id"`
	Type      string     `json:"type,omitempty"`
	Action    string     `json:"action,omitempty"`
	StartTime *time.Time `json:"start_time,omitempty"`
	EndTime   *time.Time `json:"end_time,omitempty"`
	Limit     int        `json:"limit,omitempty"`
}

type TimeRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

type Usage struct {
	TotalTokens      int64   `json:"total_tokens"`
	TotalRequests    int64   `json:"total_requests"`
	TotalCost        float64 `json:"total_cost"`
	AverageLatency   float64 `json:"average_latency_ms"`
	SuccessRate      float64 `json:"success_rate"`
}

type FAQ struct {
	ID       uuid.UUID `json:"id"`
	Question string    `json:"question"`
	Answer   string    `json:"answer"`
	Category string    `json:"category"`
	Keywords []string  `json:"keywords"`
}

type Product struct {
	ID          uuid.UUID              `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Price       float64                `json:"price"`
	Category    string                 `json:"category"`
	Features    []string               `json:"features"`
	Metadata    map[string]interface{} `json:"metadata"`
}

type Service struct {
	ID          uuid.UUID              `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Category    string                 `json:"category"`
	Metadata    map[string]interface{} `json:"metadata"`
}

type WorkingHours struct {
	Timezone string                 `json:"timezone"`
	Schedule map[string][]TimeSlot `json:"schedule"`
}

type TimeSlot struct {
	Start string `json:"start"`
	End   string `json:"end"`
}

type CustomerHistory struct {
	TotalInteractions int                    `json:"total_interactions"`
	LastInteraction   time.Time              `json:"last_interaction"`
	PurchaseHistory   []*Purchase            `json:"purchase_history"`
	SupportTickets    []*Ticket              `json:"support_tickets"`
	Preferences       map[string]interface{} `json:"preferences"`
}

type Purchase struct {
	ID        uuid.UUID `json:"id"`
	ProductID uuid.UUID `json:"product_id"`
	Amount    float64   `json:"amount"`
	Date      time.Time `json:"date"`
}

type Ticket struct {
	ID       uuid.UUID `json:"id"`
	Subject  string    `json:"subject"`
	Status   string    `json:"status"`
	Priority string    `json:"priority"`
	Created  time.Time `json:"created"`
}

type Example struct {
	Input  string `json:"input"`
	Output string `json:"output"`
}