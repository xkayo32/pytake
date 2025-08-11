package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BaseModel contains common fields for all models
type BaseModel struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate will set a UUID rather than numeric ID
func (base *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if base.ID == uuid.Nil {
		base.ID = uuid.New()
	}
	return nil
}

// TenantModel adds tenant isolation to BaseModel
type TenantModel struct {
	BaseModel
	TenantID uuid.UUID `gorm:"type:uuid;index;not null" json:"tenant_id"`
}

// GetTenantID returns the tenant ID
func (t *TenantModel) GetTenantID() *uuid.UUID {
	return &t.TenantID
}

// SetTenantID sets the tenant ID
func (t *TenantModel) SetTenantID(tenantID uuid.UUID) {
	t.TenantID = tenantID
}


// User represents a system user with tenant relationships
type User struct {
	BaseModel
	Email          string     `gorm:"uniqueIndex;not null" json:"email" validate:"required,email"`
	Password       string     `gorm:"not null" json:"-" validate:"required,min=6"`
	Name           string     `gorm:"not null" json:"name" validate:"required,min=2,max=255"`
	Role           string     `gorm:"default:'user'" json:"role" validate:"oneof=user admin super_admin"`
	IsActive       bool       `gorm:"default:true" json:"is_active"`
	EmailVerified  bool       `gorm:"default:false" json:"email_verified"`
	LastLoginAt    *time.Time `json:"last_login_at"`
	
	// Default tenant (for backwards compatibility)
	DefaultTenantID *uuid.UUID `gorm:"type:uuid;index" json:"default_tenant_id,omitempty"`
	
	// Fields not stored in database
	RefreshToken   string     `gorm:"-" json:"-"`
}

// WhatsAppConfig stores WhatsApp configuration per tenant
type WhatsAppConfig struct {
	TenantModel
	Name               string `gorm:"not null" json:"name"`
	PhoneNumberID      string `gorm:"not null" json:"phone_number_id"`
	AccessToken        string `gorm:"not null" json:"-"`
	WebhookVerifyToken string `json:"webhook_verify_token"`
	IsActive           bool   `gorm:"default:true" json:"is_active"`
	Settings           JSON   `gorm:"type:jsonb" json:"settings"`
}

// NOTE: Contact, Conversation, and Message models have been moved to their respective files:
// - contact.go
// - conversation.go  
// - message.go