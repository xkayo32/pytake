package main

import (
	"encoding/json"
	"time"
)

// Flow represents a workflow/automation flow
type Flow struct {
	ID            string          `json:"id" db:"id"`
	TenantID      *string         `json:"tenantId,omitempty" db:"tenant_id"`
	Name          string          `json:"name" db:"name"`
	Description   string          `json:"description" db:"description"`
	TriggerType   string          `json:"triggerType" db:"trigger_type"`
	TriggerValue  *string         `json:"triggerValue" db:"trigger_value"`
	Nodes         json.RawMessage `json:"nodes" db:"nodes"`
	Edges         json.RawMessage `json:"edges" db:"edges"`
	IsActive      bool            `json:"isActive" db:"is_active"`
	Version       int             `json:"version" db:"version"`
	CreatedBy     *string         `json:"createdBy,omitempty" db:"created_by"`
	CreatedAt     time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time       `json:"updatedAt" db:"updated_at"`
	
	// Derived fields for frontend compatibility
	Status          string          `json:"status"`           // computed from is_active
	Flow            json.RawMessage `json:"flow"`            // computed from nodes/edges
	Trigger         json.RawMessage `json:"trigger"`         // computed from trigger_type/value
	WhatsappNumbers []string        `json:"whatsappNumbers,omitempty"`
}

// FlowStats represents flow execution statistics
type FlowStats struct {
	Executions     int     `json:"executions"`
	SuccessRate    float64 `json:"successRate"`
	LastExecution  *string `json:"lastExecution,omitempty"`
}

// FlowWithStats combines Flow with its statistics
type FlowWithStats struct {
	Flow
	Stats FlowStats `json:"stats"`
	Tags  []string  `json:"tags"`
}

// CreateFlowRequest represents the request to create a new flow
type CreateFlowRequest struct {
	Name            string          `json:"name" binding:"required"`
	Description     string          `json:"description"`
	TriggerType     string          `json:"triggerType"`
	TriggerValue    *string         `json:"triggerValue"`
	Nodes           json.RawMessage `json:"nodes"`
	Edges           json.RawMessage `json:"edges"`
	IsActive        bool            `json:"isActive"`
	
	// Legacy fields for frontend compatibility
	Status          string          `json:"status"`
	Flow            json.RawMessage `json:"flow"`
	Trigger         json.RawMessage `json:"trigger"`
	WhatsappNumbers []string        `json:"whatsappNumbers,omitempty"`
	
	// Expiration configuration
	ExpirationMinutes        int    `json:"expiration_minutes,omitempty"`
	SendWarningAfterMinutes  int    `json:"send_warning_after_minutes,omitempty"`
	InactivityWarningMessage string `json:"inactivity_warning_message,omitempty"`
	ExpirationMessage        string `json:"expiration_message,omitempty"`
	RedirectFlowID           string `json:"redirect_flow_id,omitempty"`
}

// UpdateFlowRequest represents the request to update a flow
type UpdateFlowRequest struct {
	Name                       *string         `json:"name,omitempty"`
	Description                *string         `json:"description,omitempty"`
	Status                     *string         `json:"status,omitempty"`
	Flow                       json.RawMessage `json:"flow,omitempty"`
	Trigger                    json.RawMessage `json:"trigger,omitempty"`
	WhatsappNumbers            []string        `json:"whatsappNumbers,omitempty"`
	ExpirationMinutes          *int            `json:"expiration_minutes,omitempty"`
	SendWarningAfterMinutes    *int            `json:"send_warning_after_minutes,omitempty"`
	InactivityWarningMessage   *string         `json:"inactivity_warning_message,omitempty"`
	ExpirationMessage          *string         `json:"expiration_message,omitempty"`
	RedirectFlowID             *string         `json:"redirect_flow_id,omitempty"`
}

// WhatsAppNumber represents a WhatsApp Business number
type WhatsAppNumber struct {
	ID              string `json:"id"`
	Phone           string `json:"phone"`
	Number          string `json:"number"`
	Name            string `json:"name"`
	Label           string `json:"label"`
	Status          string `json:"status"`
	Verified        bool   `json:"verified"`
	IsVerified      bool   `json:"isVerified"`
	BusinessName    string `json:"businessName"`
	QualityRating   string `json:"quality_rating,omitempty"`
	PlatformType    string `json:"platform_type,omitempty"`
	WebhookConfigured bool `json:"webhook_configured"`
	BusinessAccountID string `json:"business_account_id,omitempty"`
	CreatedAt       *time.Time `json:"created_at,omitempty"`
	UpdatedAt       *time.Time `json:"updated_at,omitempty"`
	LastSeen        string `json:"lastSeen"`
}

// WhatsAppConfig represents WhatsApp API configuration
type WhatsAppConfig struct {
	ID                string     `json:"id" db:"id"`
	Name              string     `json:"name" db:"name"`
	PhoneNumber       string     `json:"phone_number" db:"phone_number"`
	PhoneNumberID     string     `json:"phone_number_id" db:"phone_number_id"`
	BusinessAccountID string     `json:"business_account_id" db:"business_account_id"`
	AccessToken       string     `json:"access_token,omitempty" db:"access_token"`
	IsDefault         bool       `json:"is_default" db:"is_default"`
	Status            string     `json:"status"` // calculated field: connected, disconnected, error
	WebhookVerifyToken string    `json:"webhook_verify_token" db:"webhook_verify_token"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
}

// WhatsAppPhoneNumber represents a phone number from WhatsApp Business API
type WhatsAppPhoneNumber struct {
	ID                   string `json:"id"`
	DisplayPhoneNumber   string `json:"display_phone_number"`
	VerifiedName         string `json:"verified_name"`
	QualityRating        string `json:"quality_rating"`
	PlatformType         string `json:"platform_type"`
	BusinessAccountID    string `json:"business_account_id,omitempty"`
}

// WhatsAppTemplate represents a WhatsApp message template
type WhatsAppTemplate struct {
	ID              string                      `json:"id"`
	TenantID        string                      `json:"tenant_id,omitempty"`
	WhatsAppConfigID string                     `json:"whatsapp_config_id,omitempty"`
	MetaTemplateID  string                      `json:"meta_template_id,omitempty"`
	Name            string                      `json:"name"`
	Status          string                      `json:"status"`
	Category        string                      `json:"category"`
	Language        string                      `json:"language"`
	HeaderType      string                      `json:"header_type,omitempty"`
	HeaderText      string                      `json:"header_text,omitempty"`
	HeaderMediaURL  string                      `json:"header_media_url,omitempty"`
	BodyText        string                      `json:"body_text"`
	FooterText      string                      `json:"footer_text,omitempty"`
	Buttons         []map[string]interface{}    `json:"buttons"`
	Variables       []string                    `json:"variables"`
	Components      []WhatsAppTemplateComponent `json:"components"`
	UsageCount      int                         `json:"usage_count"`
	LastUsedAt      *string                     `json:"last_used_at,omitempty"`
	QualityScore    string                      `json:"quality_score,omitempty"`
	RejectionReason string                      `json:"rejection_reason,omitempty"`
	ApprovedAt      *string                     `json:"approved_at,omitempty"`
	IsCustom        bool                        `json:"is_custom"`
	Tags            []string                    `json:"tags"`
	Description     string                      `json:"description,omitempty"`
	CreatedAt       *string                     `json:"created_at,omitempty"`
	UpdatedAt       *string                     `json:"updated_at,omitempty"`
	IsEnabled       bool                        `json:"is_enabled"`
}

// WhatsAppTemplateComponent represents a component of a WhatsApp template
type WhatsAppTemplateComponent struct {
	Type       string                 `json:"type"`
	Format     string                 `json:"format,omitempty"`
	Text       string                 `json:"text,omitempty"`
	Example    map[string]interface{} `json:"example,omitempty"`
	Buttons    []WhatsAppTemplateButton `json:"buttons,omitempty"`
}

// WhatsAppTemplateButton represents a button in a WhatsApp template
type WhatsAppTemplateButton struct {
	Type string `json:"type"`
	Text string `json:"text"`
	URL  string `json:"url,omitempty"`
}