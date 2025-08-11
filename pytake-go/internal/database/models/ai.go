package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// AIContext represents a conversation context for AI
type AIContext struct {
	BaseModel
	TenantModel

	// Context Information
	ConversationID uuid.UUID  `gorm:"type:uuid;index" json:"conversation_id"`
	CustomerID     uuid.UUID  `gorm:"type:uuid;index" json:"customer_id"`
	
	// Context Configuration
	WindowSize     int    `gorm:"default:10" json:"window_size"`
	MaxMessages    int    `gorm:"default:100" json:"max_messages"`
	RetentionDays  int    `gorm:"default:30" json:"retention_days"`
	
	// Context Data
	Summary        string         `gorm:"type:text" json:"summary"`
	Topics         string         `gorm:"type:text" json:"topics"` // JSON array
	Entities       JSON           `gorm:"type:jsonb" json:"entities"`
	Embedding      string         `gorm:"type:text" json:"embedding"` // JSON array of floats
	
	// Customer Profile
	CustomerName   string         `json:"customer_name"`
	CustomerEmail  string         `json:"customer_email"`
	CustomerPhone  string         `json:"customer_phone"`
	CustomerLang   string         `gorm:"default:'pt'" json:"customer_language"`
	CustomerData   JSON           `gorm:"type:jsonb" json:"customer_data"`
	
	// Business Context
	BusinessData   JSON           `gorm:"type:jsonb" json:"business_data"`
	
	// Features and Settings
	Features       pq.StringArray `gorm:"type:text[]" json:"features"`
	Metadata       JSON           `gorm:"type:jsonb" json:"metadata"`
	
	// Status
	IsActive       bool           `gorm:"default:true" json:"is_active"`
	LastActivity   time.Time      `json:"last_activity"`
	
	// Relationships
	Messages       []*AIMessage   `gorm:"foreignKey:AIContextID" json:"messages,omitempty"`
	Conversation   *Conversation  `gorm:"foreignKey:ID;references:ConversationID" json:"conversation,omitempty"`
}

// TableName returns the table name for AIContext
func (AIContext) TableName() string {
	return "ai_contexts"
}

// AIMessage represents a message in the AI context
type AIMessage struct {
	BaseModel
	
	AIContextID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"ai_context_id"`
	
	// Message Content
	Role           string     `gorm:"not null" json:"role"` // system, user, assistant
	Content        string     `gorm:"type:text;not null" json:"content"`
	Name           string     `json:"name,omitempty"`
	
	// Token Usage
	TokenCount     int        `json:"token_count"`
	
	// Metadata
	Metadata       JSON       `gorm:"type:jsonb" json:"metadata"`
	
	// Relationships
	AIContext      *AIContext `gorm:"foreignKey:AIContextID;constraint:OnDelete:CASCADE" json:"ai_context,omitempty"`
}

// TableName returns the table name for AIMessage
func (AIMessage) TableName() string {
	return "ai_messages"
}

// AIPromptTemplate represents a reusable prompt template
type AIPromptTemplate struct {
	BaseModel
	TenantModel
	
	// Template Information
	Name           string         `gorm:"not null;uniqueIndex:idx_tenant_template_name" json:"name"`
	Description    string         `json:"description"`
	Category       string         `gorm:"index" json:"category"`
	
	// Template Content
	Template       string         `gorm:"type:text;not null" json:"template"`
	SystemPrompt   string         `gorm:"type:text" json:"system_prompt"`
	Variables      pq.StringArray `gorm:"type:text[]" json:"variables"`
	
	// Configuration
	Model          string         `gorm:"default:'gpt-3.5-turbo'" json:"model"`
	Temperature    float32        `gorm:"default:0.7" json:"temperature"`
	MaxTokens      int            `gorm:"default:500" json:"max_tokens"`
	
	// Persona
	PersonaID      *uuid.UUID     `gorm:"type:uuid" json:"persona_id,omitempty"`
	
	// Language and Localization
	Language       string         `gorm:"default:'pt'" json:"language"`
	Translations   JSON           `gorm:"type:jsonb" json:"translations"`
	
	// Usage Statistics
	UsageCount     int64          `gorm:"default:0" json:"usage_count"`
	LastUsedAt     *time.Time     `json:"last_used_at,omitempty"`
	
	// Status
	IsActive       bool           `gorm:"default:true" json:"is_active"`
	IsDefault      bool           `gorm:"default:false" json:"is_default"`
	
	// Metadata
	Tags           pq.StringArray `gorm:"type:text[]" json:"tags"`
	Metadata       JSON           `gorm:"type:jsonb" json:"metadata"`
	
	// Relationships
	Persona        *AIPersona     `gorm:"foreignKey:PersonaID" json:"persona,omitempty"`
	CreatedByID    uuid.UUID      `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy      *User          `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
}

// TableName returns the table name for AIPromptTemplate
func (AIPromptTemplate) TableName() string {
	return "ai_prompt_templates"
}

// AIPersona represents an AI personality
type AIPersona struct {
	BaseModel
	TenantModel
	
	// Persona Information
	Name           string         `gorm:"not null;uniqueIndex:idx_tenant_persona_name" json:"name"`
	Description    string         `json:"description"`
	Avatar         string         `json:"avatar"`
	
	// Personality Configuration
	Personality    string         `gorm:"type:text" json:"personality"`
	Tone           string         `json:"tone"` // professional, friendly, casual, formal
	Style          string         `json:"style"` // concise, detailed, creative, technical
	
	// Instructions and Rules
	Instructions   pq.StringArray `gorm:"type:text[]" json:"instructions"`
	Constraints    pq.StringArray `gorm:"type:text[]" json:"constraints"`
	Capabilities   pq.StringArray `gorm:"type:text[]" json:"capabilities"`
	
	// Example Interactions
	Examples       JSON           `gorm:"type:jsonb" json:"examples"`
	
	// Language Settings
	Language       string         `gorm:"default:'pt'" json:"language"`
	Vocabulary     pq.StringArray `gorm:"type:text[]" json:"vocabulary"`
	
	// Status
	IsActive       bool           `gorm:"default:true" json:"is_active"`
	IsDefault      bool           `gorm:"default:false" json:"is_default"`
	
	// Usage Statistics
	UsageCount     int64          `gorm:"default:0" json:"usage_count"`
	LastUsedAt     *time.Time     `json:"last_used_at,omitempty"`
	
	// Metadata
	Tags           pq.StringArray `gorm:"type:text[]" json:"tags"`
	Metadata       JSON           `gorm:"type:jsonb" json:"metadata"`
	
	// Relationships
	Templates      []*AIPromptTemplate `gorm:"foreignKey:PersonaID" json:"templates,omitempty"`
	CreatedByID    uuid.UUID      `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy      *User          `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
}

// TableName returns the table name for AIPersona
func (AIPersona) TableName() string {
	return "ai_personas"
}

// AIInteraction represents an AI interaction log
type AIInteraction struct {
	BaseModel
	TenantModel
	
	// Interaction Context
	ConversationID uuid.UUID      `gorm:"type:uuid;index" json:"conversation_id"`
	ContextID      uuid.UUID      `gorm:"type:uuid;index" json:"context_id"`
	CustomerID     uuid.UUID      `gorm:"type:uuid;index" json:"customer_id"`
	
	// Request Information
	RequestType    string         `json:"request_type"` // chat, completion, embedding
	Model          string         `json:"model"`
	Provider       string         `json:"provider"` // openai, anthropic, custom
	
	// Request Data
	Request        JSON           `gorm:"type:jsonb" json:"request"`
	SystemPrompt   string         `gorm:"type:text" json:"system_prompt"`
	Messages       JSON           `gorm:"type:jsonb" json:"messages"`
	
	// Response Data
	Response       JSON           `gorm:"type:jsonb" json:"response"`
	ResponseText   string         `gorm:"type:text" json:"response_text"`
	
	// Token Usage
	PromptTokens   int            `json:"prompt_tokens"`
	CompletionTokens int          `json:"completion_tokens"`
	TotalTokens    int            `json:"total_tokens"`
	EstimatedCost  float64        `json:"estimated_cost"`
	
	// Performance Metrics
	Latency        int            `json:"latency_ms"`
	Duration       int            `json:"duration_ms"`
	
	// Status and Error Handling
	Status         string         `gorm:"not null;default:'pending'" json:"status"` // pending, success, failed
	Error          string         `gorm:"type:text" json:"error,omitempty"`
	RetryCount     int            `gorm:"default:0" json:"retry_count"`
	
	// Intent and Sentiment
	DetectedIntent string         `json:"detected_intent"`
	Sentiment      string         `json:"sentiment"`
	SentimentScore float32        `json:"sentiment_score"`
	
	// Moderation
	IsFlagged      bool           `gorm:"default:false" json:"is_flagged"`
	FlagReason     string         `json:"flag_reason,omitempty"`
	ModerationScore float32       `json:"moderation_score"`
	
	// Metadata
	Metadata       JSON           `gorm:"type:jsonb" json:"metadata"`
	
	// Relationships
	Context        *AIContext     `gorm:"foreignKey:ContextID" json:"context,omitempty"`
	Conversation   *Conversation  `gorm:"foreignKey:ConversationID" json:"conversation,omitempty"`
}

// TableName returns the table name for AIInteraction
func (AIInteraction) TableName() string {
	return "ai_interactions"
}

// AISafetyLog represents safety and moderation logs
type AISafetyLog struct {
	BaseModel
	TenantModel
	
	// Context
	InteractionID  uuid.UUID      `gorm:"type:uuid;index" json:"interaction_id"`
	ConversationID uuid.UUID      `gorm:"type:uuid;index" json:"conversation_id"`
	
	// Content Information
	ContentType    string         `json:"content_type"` // input, output
	Content        string         `gorm:"type:text" json:"content"`
	
	// Moderation Results
	IsSafe         bool           `gorm:"default:true" json:"is_safe"`
	IsFlagged      bool           `gorm:"default:false" json:"is_flagged"`
	
	// Categories and Scores
	Categories     JSON           `gorm:"type:jsonb" json:"categories"`
	Scores         JSON           `gorm:"type:jsonb" json:"scores"`
	
	// PII Detection
	ContainsPII    bool           `gorm:"default:false" json:"contains_pii"`
	PIITypes       pq.StringArray `gorm:"type:text[]" json:"pii_types"`
	RedactedContent string        `gorm:"type:text" json:"redacted_content"`
	
	// Actions Taken
	ActionTaken    string         `json:"action_taken"` // allowed, blocked, modified, escalated
	ModifiedContent string        `gorm:"type:text" json:"modified_content"`
	
	// Compliance
	ComplianceRules pq.StringArray `gorm:"type:text[]" json:"compliance_rules"`
	Violations     pq.StringArray `gorm:"type:text[]" json:"violations"`
	
	// Review Status
	NeedsReview    bool           `gorm:"default:false" json:"needs_review"`
	ReviewedAt     *time.Time     `json:"reviewed_at,omitempty"`
	ReviewedBy     *uuid.UUID     `gorm:"type:uuid" json:"reviewed_by,omitempty"`
	ReviewNotes    string         `gorm:"type:text" json:"review_notes"`
	
	// Metadata
	Metadata       JSON           `gorm:"type:jsonb" json:"metadata"`
	
	// Relationships
	Interaction    *AIInteraction `gorm:"foreignKey:InteractionID" json:"interaction,omitempty"`
	Reviewer       *User          `gorm:"foreignKey:ReviewedBy" json:"reviewer,omitempty"`
}

// TableName returns the table name for AISafetyLog
func (AISafetyLog) TableName() string {
	return "ai_safety_logs"
}

// AIKnowledgeBase represents knowledge base entries for AI
type AIKnowledgeBase struct {
	BaseModel
	TenantModel
	
	// Entry Information
	Title          string         `gorm:"not null" json:"title"`
	Category       string         `gorm:"index" json:"category"`
	Type           string         `json:"type"` // faq, product, policy, guide
	
	// Content
	Question       string         `gorm:"type:text" json:"question"`
	Answer         string         `gorm:"type:text;not null" json:"answer"`
	Content        string         `gorm:"type:text" json:"content"`
	
	// Embedding for Similarity Search
	Embedding      string         `gorm:"type:text" json:"embedding"` // JSON array
	
	// Keywords and Tags
	Keywords       pq.StringArray `gorm:"type:text[]" json:"keywords"`
	Tags           pq.StringArray `gorm:"type:text[]" json:"tags"`
	
	// Language
	Language       string         `gorm:"default:'pt'" json:"language"`
	Translations   JSON           `gorm:"type:jsonb" json:"translations"`
	
	// Usage Statistics
	UsageCount     int64          `gorm:"default:0" json:"usage_count"`
	HelpfulCount   int64          `gorm:"default:0" json:"helpful_count"`
	NotHelpfulCount int64         `gorm:"default:0" json:"not_helpful_count"`
	LastUsedAt     *time.Time     `json:"last_used_at,omitempty"`
	
	// Status
	IsActive       bool           `gorm:"default:true" json:"is_active"`
	IsVerified     bool           `gorm:"default:false" json:"is_verified"`
	
	// Metadata
	Metadata       JSON           `gorm:"type:jsonb" json:"metadata"`
	
	// Relationships
	CreatedByID    uuid.UUID      `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy      *User          `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
}

// TableName returns the table name for AIKnowledgeBase
func (AIKnowledgeBase) TableName() string {
	return "ai_knowledge_base"
}