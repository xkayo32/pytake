package templates

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// TemplateEngine defines the interface for message template management
type TemplateEngine interface {
	// Template Management
	CreateTemplate(ctx context.Context, tenantID uuid.UUID, request *CreateTemplateRequest) (*MessageTemplate, error)
	UpdateTemplate(ctx context.Context, tenantID, templateID uuid.UUID, request *UpdateTemplateRequest) (*MessageTemplate, error)
	DeleteTemplate(ctx context.Context, tenantID, templateID uuid.UUID) error
	GetTemplate(ctx context.Context, tenantID, templateID uuid.UUID) (*MessageTemplate, error)
	ListTemplates(ctx context.Context, tenantID uuid.UUID, filter *TemplateFilter) ([]*MessageTemplate, int64, error)

	// Template Processing
	RenderTemplate(ctx context.Context, tenantID, templateID uuid.UUID, variables map[string]interface{}) (*RenderedTemplate, error)
	ValidateTemplate(ctx context.Context, template *MessageTemplate) (*ValidationResult, error)
	PreviewTemplate(ctx context.Context, tenantID, templateID uuid.UUID, sampleData map[string]interface{}) (*TemplatePreview, error)

	// Variable Management
	ExtractVariables(content *TemplateContent) ([]string, error)
	ValidateVariables(content *TemplateContent, variables map[string]interface{}) error
	GetRequiredVariables(ctx context.Context, tenantID, templateID uuid.UUID) ([]VariableDefinition, error)

	// WhatsApp Integration
	SyncWhatsAppTemplates(ctx context.Context, tenantID uuid.UUID) error
	SubmitWhatsAppTemplate(ctx context.Context, tenantID, templateID uuid.UUID) error
	CheckWhatsAppTemplateStatus(ctx context.Context, tenantID, templateID uuid.UUID) (*WhatsAppTemplateStatus, error)

	// Usage Statistics
	RecordTemplateUsage(ctx context.Context, tenantID, templateID uuid.UUID, context string) error
	GetTemplateStatistics(ctx context.Context, tenantID, templateID uuid.UUID, dateRange *DateRange) (*TemplateStatistics, error)
}

// Data Structures

// MessageTemplate represents a message template
type MessageTemplate struct {
	ID                   uuid.UUID             `json:"id"`
	TenantID             uuid.UUID             `json:"tenant_id"`
	Name                 string                `json:"name"`
	Description          string                `json:"description"`
	Category             string                `json:"category"`
	Type                 TemplateType          `json:"type"`
	Content              *TemplateContent      `json:"content"`
	Variables            []string              `json:"variables"`
	PreviewText          *string               `json:"preview_text,omitempty"`
	WhatsAppTemplateID   *string               `json:"whatsapp_template_id,omitempty"`
	WhatsAppTemplateName *string               `json:"whatsapp_template_name,omitempty"`
	WhatsAppStatus       *WhatsAppTemplateStatus `json:"whatsapp_status,omitempty"`
	WhatsAppLanguage     *string               `json:"whatsapp_language,omitempty"`
	RequireApproval      bool                  `json:"require_approval"`
	IsActive             bool                  `json:"is_active"`
	Tags                 []string              `json:"tags"`
	UsageCount           int                   `json:"usage_count"`
	LastUsedAt           *time.Time            `json:"last_used_at,omitempty"`
	CreatedAt            time.Time             `json:"created_at"`
	UpdatedAt            time.Time             `json:"updated_at"`
	CreatedByID          uuid.UUID             `json:"created_by_id"`
}

// TemplateType represents the type of template
type TemplateType string

const (
	TemplateTypeText        TemplateType = "text"
	TemplateTypeMedia       TemplateType = "media"
	TemplateTypeInteractive TemplateType = "interactive"
	TemplateTypeWhatsApp    TemplateType = "whatsapp_template"
)

// TemplateContent represents the content structure of a template
type TemplateContent struct {
	// Text Content
	Text *string `json:"text,omitempty"`

	// Media Content
	MediaType *string `json:"media_type,omitempty"` // image, video, audio, document
	MediaURL  *string `json:"media_url,omitempty"`
	Caption   *string `json:"caption,omitempty"`

	// WhatsApp Template Content
	Header     *TemplateHeader     `json:"header,omitempty"`
	Body       *TemplateBody       `json:"body,omitempty"`
	Footer     *TemplateFooter     `json:"footer,omitempty"`
	Buttons    []TemplateButton    `json:"buttons,omitempty"`
	Components []TemplateComponent `json:"components,omitempty"`

	// Interactive Content
	Interactive *InteractiveTemplate `json:"interactive,omitempty"`

	// Metadata
	Language    string                 `json:"language"`
	Variables   []VariableDefinition   `json:"variables,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// Template Components

// TemplateHeader represents a template header
type TemplateHeader struct {
	Type     string                 `json:"type"` // text, media
	Text     *string                `json:"text,omitempty"`
	MediaURL *string                `json:"media_url,omitempty"`
	Variables map[string]interface{} `json:"variables,omitempty"`
}

// TemplateBody represents a template body
type TemplateBody struct {
	Text      string                 `json:"text"`
	Variables map[string]interface{} `json:"variables,omitempty"`
}

// TemplateFooter represents a template footer
type TemplateFooter struct {
	Text string `json:"text"`
}

// TemplateButton represents a template button
type TemplateButton struct {
	Type         string  `json:"type"` // quick_reply, url, phone_number
	Text         string  `json:"text"`
	URL          *string `json:"url,omitempty"`
	PhoneNumber  *string `json:"phone_number,omitempty"`
	VariableName *string `json:"variable_name,omitempty"` // for dynamic URLs
}

// TemplateComponent represents a WhatsApp template component
type TemplateComponent struct {
	Type       string                   `json:"type"`
	Format     *string                  `json:"format,omitempty"`
	Text       *string                  `json:"text,omitempty"`
	Parameters []TemplateParameter      `json:"parameters,omitempty"`
	Buttons    []TemplateButton         `json:"buttons,omitempty"`
	Examples   [][]TemplateExample      `json:"examples,omitempty"`
}

// TemplateParameter represents a template parameter
type TemplateParameter struct {
	Type    string      `json:"type"` // text, currency, date_time, image, document, video
	Text    *string     `json:"text,omitempty"`
	Currency *Currency  `json:"currency,omitempty"`
	DateTime *DateTime  `json:"date_time,omitempty"`
	Image    *MediaItem `json:"image,omitempty"`
	Document *MediaItem `json:"document,omitempty"`
	Video    *MediaItem `json:"video,omitempty"`
}

// Supporting Types

type Currency struct {
	FallbackValue string  `json:"fallback_value"`
	Code          string  `json:"code"`
	Amount1000    int     `json:"amount_1000"`
}

type DateTime struct {
	FallbackValue string `json:"fallback_value"`
	DayOfWeek     *int   `json:"day_of_week,omitempty"`
	Year          *int   `json:"year,omitempty"`
	Month         *int   `json:"month,omitempty"`
	DayOfMonth    *int   `json:"day_of_month,omitempty"`
	Hour          *int   `json:"hour,omitempty"`
	Minute        *int   `json:"minute,omitempty"`
	Calendar      string `json:"calendar"`
}

type MediaItem struct {
	Link     *string `json:"link,omitempty"`
	Filename *string `json:"filename,omitempty"`
	Caption  *string `json:"caption,omitempty"`
}

type TemplateExample struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

// InteractiveTemplate represents interactive message content
type InteractiveTemplate struct {
	Type    string               `json:"type"` // buttons, list, product, product_list
	Header  *InteractiveHeader   `json:"header,omitempty"`
	Body    InteractiveBody      `json:"body"`
	Footer  *InteractiveFooter   `json:"footer,omitempty"`
	Action  InteractiveAction    `json:"action"`
}

type InteractiveHeader struct {
	Type      string `json:"type"` // text, image, video, document
	Text      *string `json:"text,omitempty"`
	Image     *MediaItem `json:"image,omitempty"`
	Video     *MediaItem `json:"video,omitempty"`
	Document  *MediaItem `json:"document,omitempty"`
}

type InteractiveBody struct {
	Text string `json:"text"`
}

type InteractiveFooter struct {
	Text string `json:"text"`
}

type InteractiveAction struct {
	Buttons    []InteractiveButton `json:"buttons,omitempty"`
	Button     *string             `json:"button,omitempty"` // for list messages
	Sections   []InteractiveSection `json:"sections,omitempty"`
	CatalogID  *string             `json:"catalog_id,omitempty"` // for product messages
	ProductRetailerID *string      `json:"product_retailer_id,omitempty"`
}

type InteractiveButton struct {
	Type  string                  `json:"type"` // reply
	Reply InteractiveButtonReply  `json:"reply"`
}

type InteractiveButtonReply struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

type InteractiveSection struct {
	Title string                `json:"title"`
	Rows  []InteractiveSectionRow `json:"rows"`
}

type InteractiveSectionRow struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
}

// Variable Management

// VariableDefinition represents a template variable definition
type VariableDefinition struct {
	Name         string      `json:"name"`
	Type         string      `json:"type"` // text, number, date, boolean, url, phone
	Required     bool        `json:"required"`
	DefaultValue interface{} `json:"default_value,omitempty"`
	Description  string      `json:"description"`
	Format       *string     `json:"format,omitempty"` // for date/number formatting
	Validation   *VariableValidation `json:"validation,omitempty"`
	Examples     []string    `json:"examples,omitempty"`
}

// VariableValidation represents validation rules for variables
type VariableValidation struct {
	Pattern   *string  `json:"pattern,omitempty"`    // regex pattern
	MinLength *int     `json:"min_length,omitempty"`
	MaxLength *int     `json:"max_length,omitempty"`
	MinValue  *float64 `json:"min_value,omitempty"`  // for numeric values
	MaxValue  *float64 `json:"max_value,omitempty"`
	Options   []string `json:"options,omitempty"`    // for enum validation
}

// Request/Response Structures

// CreateTemplateRequest represents a request to create a template
type CreateTemplateRequest struct {
	Name                 string            `json:"name" validate:"required,min=3,max=255"`
	Description          string            `json:"description"`
	Category             string            `json:"category"`
	Type                 TemplateType      `json:"type" validate:"required"`
	Content              *TemplateContent  `json:"content" validate:"required"`
	PreviewText          *string           `json:"preview_text,omitempty"`
	WhatsAppTemplateName *string           `json:"whatsapp_template_name,omitempty"`
	WhatsAppLanguage     *string           `json:"whatsapp_language,omitempty"`
	RequireApproval      bool              `json:"require_approval"`
	IsActive             bool              `json:"is_active"`
	Tags                 []string          `json:"tags"`
}

// UpdateTemplateRequest represents a request to update a template
type UpdateTemplateRequest struct {
	Name            *string          `json:"name,omitempty" validate:"omitempty,min=3,max=255"`
	Description     *string          `json:"description,omitempty"`
	Category        *string          `json:"category,omitempty"`
	Content         *TemplateContent `json:"content,omitempty"`
	PreviewText     *string          `json:"preview_text,omitempty"`
	RequireApproval *bool            `json:"require_approval,omitempty"`
	IsActive        *bool            `json:"is_active,omitempty"`
	Tags            []string         `json:"tags,omitempty"`
}

// TemplateFilter represents filters for listing templates
type TemplateFilter struct {
	Type           *TemplateType `json:"type,omitempty"`
	Category       string        `json:"category,omitempty"`
	Search         string        `json:"search,omitempty"`
	Tags           []string      `json:"tags,omitempty"`
	IsActive       *bool         `json:"is_active,omitempty"`
	RequireApproval *bool        `json:"require_approval,omitempty"`
	WhatsAppStatus *string       `json:"whatsapp_status,omitempty"`
	CreatedByID    *uuid.UUID    `json:"created_by_id,omitempty"`
	CreatedFrom    *time.Time    `json:"created_from,omitempty"`
	CreatedTo      *time.Time    `json:"created_to,omitempty"`
	SortBy         string        `json:"sort_by,omitempty"`
	SortDesc       bool          `json:"sort_desc,omitempty"`
	Limit          int           `json:"limit,omitempty"`
	Offset         int           `json:"offset,omitempty"`
}

// Template Processing

// RenderedTemplate represents a rendered template
type RenderedTemplate struct {
	TemplateID     uuid.UUID              `json:"template_id"`
	Content        *ProcessedContent      `json:"content"`
	Variables      map[string]interface{} `json:"variables"`
	RenderedAt     time.Time              `json:"rendered_at"`
	PreviewURL     *string                `json:"preview_url,omitempty"`
	EstimatedSize  int                    `json:"estimated_size_bytes"`
}

// ProcessedContent represents processed template content
type ProcessedContent struct {
	Text        *string                `json:"text,omitempty"`
	MediaURL    *string                `json:"media_url,omitempty"`
	MediaType   *string                `json:"media_type,omitempty"`
	Caption     *string                `json:"caption,omitempty"`
	Interactive *ProcessedInteractive  `json:"interactive,omitempty"`
	WhatsApp    *ProcessedWhatsApp     `json:"whatsapp,omitempty"`
}

type ProcessedInteractive struct {
	Type    string                    `json:"type"`
	Header  *ProcessedHeader          `json:"header,omitempty"`
	Body    string                    `json:"body"`
	Footer  *string                   `json:"footer,omitempty"`
	Buttons []ProcessedButton         `json:"buttons,omitempty"`
	List    *ProcessedList            `json:"list,omitempty"`
}

type ProcessedHeader struct {
	Type     string  `json:"type"`
	Text     *string `json:"text,omitempty"`
	MediaURL *string `json:"media_url,omitempty"`
}

type ProcessedButton struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Type  string `json:"type"`
	URL   *string `json:"url,omitempty"`
	Phone *string `json:"phone,omitempty"`
}

type ProcessedList struct {
	ButtonText string                   `json:"button_text"`
	Sections   []ProcessedListSection   `json:"sections"`
}

type ProcessedListSection struct {
	Title string                `json:"title"`
	Rows  []ProcessedListRow    `json:"rows"`
}

type ProcessedListRow struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
}

type ProcessedWhatsApp struct {
	Name       string                     `json:"name"`
	Language   string                     `json:"language"`
	Components []ProcessedWhatsAppComponent `json:"components"`
}

type ProcessedWhatsAppComponent struct {
	Type       string                        `json:"type"`
	Parameters []ProcessedWhatsAppParameter  `json:"parameters,omitempty"`
}

type ProcessedWhatsAppParameter struct {
	Type     string      `json:"type"`
	Text     *string     `json:"text,omitempty"`
	Currency *Currency   `json:"currency,omitempty"`
	DateTime *DateTime   `json:"date_time,omitempty"`
	Image    *MediaItem  `json:"image,omitempty"`
	Document *MediaItem  `json:"document,omitempty"`
	Video    *MediaItem  `json:"video,omitempty"`
}

// TemplatePreview represents a template preview
type TemplatePreview struct {
	TemplateID     uuid.UUID              `json:"template_id"`
	PreviewHTML    string                 `json:"preview_html"`
	PreviewText    string                 `json:"preview_text"`
	Variables      map[string]interface{} `json:"variables"`
	Warnings       []string               `json:"warnings,omitempty"`
	EstimatedSize  int                    `json:"estimated_size_bytes"`
	GeneratedAt    time.Time              `json:"generated_at"`
}

// WhatsApp Integration

// WhatsAppTemplateStatus represents WhatsApp template status
type WhatsAppTemplateStatus struct {
	Status      string     `json:"status"` // pending, approved, rejected, disabled
	Reason      *string    `json:"reason,omitempty"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Quality     *string    `json:"quality,omitempty"` // high, medium, low
	Category    string     `json:"category"`
	Language    string     `json:"language"`
}

// Template Statistics

// TemplateStatistics represents template usage statistics
type TemplateStatistics struct {
	TemplateID       uuid.UUID         `json:"template_id"`
	DateRange        DateRange         `json:"date_range"`
	TotalUsage       int               `json:"total_usage"`
	UniqueUsers      int               `json:"unique_users"`
	UniqueCampaigns  int               `json:"unique_campaigns"`
	UsageByDay       []DailyUsage      `json:"usage_by_day"`
	UsageByChannel   map[string]int    `json:"usage_by_channel"`
	UsageByContext   map[string]int    `json:"usage_by_context"`
	PerformanceMetrics *TemplatePerformance `json:"performance_metrics,omitempty"`
	LastUpdated      time.Time         `json:"last_updated"`
}

// DailyUsage represents daily template usage
type DailyUsage struct {
	Date  time.Time `json:"date"`
	Count int       `json:"count"`
}

// TemplatePerformance represents template performance metrics
type TemplatePerformance struct {
	DeliveryRate    float64 `json:"delivery_rate"`
	OpenRate        float64 `json:"open_rate"`
	ClickRate       float64 `json:"click_rate"`
	ResponseRate    float64 `json:"response_rate"`
	ConversionRate  float64 `json:"conversion_rate"`
	UnsubscribeRate float64 `json:"unsubscribe_rate"`
	AvgEngagementTime float64 `json:"avg_engagement_time_seconds"`
}

// Common Structures

// DateRange represents a date range
type DateRange struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}

// ValidationResult represents template validation result
type ValidationResult struct {
	IsValid  bool              `json:"is_valid"`
	Errors   []ValidationError `json:"errors,omitempty"`
	Warnings []ValidationWarning `json:"warnings,omitempty"`
}

// ValidationError represents a validation error
type ValidationError struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ValidationWarning represents a validation warning
type ValidationWarning struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Predefined Templates

// PredefinedTemplate represents a predefined template
type PredefinedTemplate struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Category    string           `json:"category"`
	Type        TemplateType     `json:"type"`
	Content     *TemplateContent `json:"content"`
	Variables   []VariableDefinition `json:"variables"`
	Tags        []string         `json:"tags"`
	UseCase     string           `json:"use_case"`
	Language    string           `json:"language"`
}

// Common predefined templates
var CommonPredefinedTemplates = []*PredefinedTemplate{
	{
		ID:          "welcome_message",
		Name:        "Welcome Message",
		Description: "Welcome message for new contacts",
		Category:    "Onboarding",
		Type:        TemplateTypeText,
		Content: &TemplateContent{
			Text:     stringPtr("Olá {{name}}! Bem-vindo(a) à {{company_name}}. Estamos aqui para ajudar você! 🎉"),
			Language: "pt_BR",
			Variables: []VariableDefinition{
				{Name: "name", Type: "text", Required: true, Description: "Contact name"},
				{Name: "company_name", Type: "text", Required: true, Description: "Company name"},
			},
		},
		Variables: []VariableDefinition{
			{Name: "name", Type: "text", Required: true, Description: "Contact name"},
			{Name: "company_name", Type: "text", Required: true, Description: "Company name"},
		},
		Tags:     []string{"welcome", "onboarding"},
		UseCase:  "Send welcome message to new contacts",
		Language: "pt_BR",
	},
	{
		ID:          "appointment_reminder",
		Name:        "Appointment Reminder",
		Description: "Reminder for scheduled appointments",
		Category:    "Reminders",
		Type:        TemplateTypeText,
		Content: &TemplateContent{
			Text:     stringPtr("Lembrete: Você tem um compromisso agendado para {{date}} às {{time}}. Local: {{location}}. Confirme sua presença respondendo SIM."),
			Language: "pt_BR",
			Variables: []VariableDefinition{
				{Name: "date", Type: "date", Required: true, Description: "Appointment date"},
				{Name: "time", Type: "text", Required: true, Description: "Appointment time"},
				{Name: "location", Type: "text", Required: true, Description: "Appointment location"},
			},
		},
		Variables: []VariableDefinition{
			{Name: "date", Type: "date", Required: true, Description: "Appointment date"},
			{Name: "time", Type: "text", Required: true, Description: "Appointment time"},
			{Name: "location", Type: "text", Required: true, Description: "Appointment location"},
		},
		Tags:     []string{"appointment", "reminder"},
		UseCase:  "Send appointment reminders",
		Language: "pt_BR",
	},
}

// Helper functions
func stringPtr(s string) *string {
	return &s
}