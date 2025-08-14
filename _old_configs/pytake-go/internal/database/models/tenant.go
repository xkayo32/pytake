package models

import (
	"time"
	
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Tenant represents a multi-tenant organization
type Tenant struct {
	BaseModel
	Name        string    `json:"name" gorm:"not null;size:255" validate:"required,min=2,max=255"`
	Domain      string    `json:"domain" gorm:"uniqueIndex;size:100" validate:"omitempty,fqdn,max=100"`
	Status      string    `json:"status" gorm:"not null;default:'active'" validate:"oneof=active inactive suspended"`
	Plan        string    `json:"plan" gorm:"not null;default:'basic'" validate:"oneof=basic premium enterprise"`
	Settings    JSON      `json:"settings" gorm:"type:jsonb"`
	ExpiresAt   *time.Time     `json:"expires_at"`
	
	// Owner relationship
	OwnerID     uuid.UUID `json:"owner_id" gorm:"not null"`
	Owner       User      `json:"owner" gorm:"foreignKey:OwnerID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
	
	// Members relationship
	Members     []User    `json:"members,omitempty" gorm:"many2many:tenant_users;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	
	// Audit fields
	CreatedBy   uuid.UUID `json:"created_by"`
	UpdatedBy   *uuid.UUID `json:"updated_by"`
}

// TenantSettings contains configurable tenant settings
type TenantSettings struct {
	MaxUsers        int               `json:"max_users" validate:"min=1"`
	MaxWhatsAppConfigs int           `json:"max_whatsapp_configs" validate:"min=1"`
	Features        map[string]bool   `json:"features"`
	Branding        BrandingSettings  `json:"branding"`
	RateLimit       RateLimitSettings `json:"rate_limit"`
}

// BrandingSettings for tenant customization
type BrandingSettings struct {
	Logo      string `json:"logo"`
	PrimaryColor string `json:"primary_color" validate:"omitempty,hexcolor"`
	Theme     string `json:"theme" validate:"oneof=light dark auto"`
}

// RateLimitSettings for tenant-specific rate limits
type RateLimitSettings struct {
	RequestsPerSecond int `json:"requests_per_second" validate:"min=1"`
	BurstLimit        int `json:"burst_limit" validate:"min=1"`
}

// TenantUser represents the many-to-many relationship between tenants and users
type TenantUser struct {
	TenantID    uuid.UUID `gorm:"primaryKey"`
	UserID      uuid.UUID `gorm:"primaryKey"`
	Role        string    `json:"role" gorm:"not null;default:'member'" validate:"oneof=admin member viewer"`
	Status      string    `json:"status" gorm:"not null;default:'active'" validate:"oneof=active inactive pending"`
	JoinedAt    time.Time `json:"joined_at" gorm:"autoCreateTime"`
	InvitedBy   *uuid.UUID `json:"invited_by"`
	
	// Relationships
	Tenant      Tenant    `json:"tenant" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	User        User      `json:"user" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

// TenantInvite represents pending tenant invitations
type TenantInvite struct {
	BaseModel
	TenantID    uuid.UUID `json:"tenant_id" gorm:"not null"`
	Email       string    `json:"email" gorm:"not null;size:255" validate:"required,email"`
	Role        string    `json:"role" gorm:"not null;default:'member'" validate:"oneof=admin member viewer"`
	Status      string    `json:"status" gorm:"not null;default:'pending'" validate:"oneof=pending accepted rejected expired"`
	Token       string    `json:"-" gorm:"not null;uniqueIndex"`
	ExpiresAt   time.Time `json:"expires_at" gorm:"not null"`
	InvitedBy   uuid.UUID `json:"invited_by" gorm:"not null"`
	AcceptedAt  *time.Time `json:"accepted_at"`
	
	// Relationships
	Tenant      Tenant    `json:"tenant" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	InvitedByUser User    `json:"invited_by_user" gorm:"foreignKey:InvitedBy;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
}

// BeforeCreate sets default settings
func (t *Tenant) BeforeCreate(tx *gorm.DB) error {
	if err := t.BaseModel.BeforeCreate(tx); err != nil {
		return err
	}
	
	// Set default settings if empty
	if t.Settings == nil {
		t.Settings = make(JSON)
	}
	
	// Set defaults
	if t.Settings["max_users"] == nil {
		t.Settings["max_users"] = 10
	}
	if t.Settings["max_whatsapp_configs"] == nil {
		t.Settings["max_whatsapp_configs"] = 1
	}
	if t.Settings["features"] == nil {
		t.Settings["features"] = map[string]bool{
			"whatsapp":     true,
			"ai_assistant": false,
			"campaigns":    false,
			"flows":        true,
		}
	}
	if t.Settings["rate_limit"] == nil {
		t.Settings["rate_limit"] = map[string]int{
			"requests_per_second": 10,
			"burst_limit":         20,
		}
	}
	if t.Settings["branding"] == nil {
		t.Settings["branding"] = map[string]string{
			"theme": "light",
		}
	}
	
	return nil
}

// TableName returns the table name
func (Tenant) TableName() string {
	return "tenants"
}

// TableName returns the table name
func (TenantUser) TableName() string {
	return "tenant_users"
}

// TableName returns the table name
func (TenantInvite) TableName() string {
	return "tenant_invites"
}

// IsActive checks if tenant is active
func (t *Tenant) IsActive() bool {
	if t.Status != "active" {
		return false
	}
	if t.ExpiresAt != nil && t.ExpiresAt.Before(time.Now()) {
		return false
	}
	return true
}

// CanInviteUsers checks if tenant can invite more users
func (t *Tenant) CanInviteUsers(currentCount int) bool {
	if !t.IsActive() {
		return false
	}
	maxUsers, ok := t.Settings["max_users"].(float64)
	if !ok {
		maxUsers = 10 // default
	}
	return currentCount < int(maxUsers)
}

// HasFeature checks if tenant has a specific feature enabled
func (t *Tenant) HasFeature(feature string) bool {
	if !t.IsActive() {
		return false
	}
	features, ok := t.Settings["features"].(map[string]interface{})
	if !ok {
		return false
	}
	enabled, exists := features[feature].(bool)
	return exists && enabled
}

// GetUserRole returns user role within tenant
func (t *Tenant) GetUserRole(userID uuid.UUID) (string, bool) {
	for _, member := range t.Members {
		if member.ID == userID {
			// This would typically be fetched from TenantUser pivot table
			return "member", true
		}
	}
	return "", false
}