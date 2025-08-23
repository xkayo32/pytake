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
}

// UpdateFlowRequest represents the request to update a flow
type UpdateFlowRequest struct {
	Name        *string         `json:"name,omitempty"`
	Description *string         `json:"description,omitempty"`
	Status      *string         `json:"status,omitempty"`
	Flow        json.RawMessage `json:"flow,omitempty"`
	Trigger     json.RawMessage `json:"trigger,omitempty"`
	WhatsappNumbers []string    `json:"whatsappNumbers,omitempty"`
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
	ID       string `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category"`
	Language string `json:"language"`
	Status   string `json:"status"`
	Components []WhatsAppTemplateComponent `json:"components"`
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