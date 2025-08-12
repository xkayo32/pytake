package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// SettingCategory represents the category of a setting
type SettingCategory string

const (
	SettingCategoryGeneral      SettingCategory = "general"
	SettingCategoryWhatsApp     SettingCategory = "whatsapp"
	SettingCategoryEmail        SettingCategory = "email"
	SettingCategorySMS          SettingCategory = "sms"
	SettingCategoryAI           SettingCategory = "ai"
	SettingCategoryERP          SettingCategory = "erp"
	SettingCategoryNotification SettingCategory = "notification"
	SettingCategoryIntegration  SettingCategory = "integration"
	SettingCategorySecurity     SettingCategory = "security"
	SettingCategoryLimits       SettingCategory = "limits"
	SettingCategoryBilling      SettingCategory = "billing"
	SettingCategoryCustom       SettingCategory = "custom"
)

// SettingValueType represents the data type of a setting value
type SettingValueType string

const (
	SettingTypeString   SettingValueType = "string"
	SettingTypeNumber   SettingValueType = "number"
	SettingTypeBoolean  SettingValueType = "boolean"
	SettingTypeJSON     SettingValueType = "json"
	SettingTypeEncrypted SettingValueType = "encrypted"
)

// SystemSetting represents a global system configuration
type SystemSetting struct {
	ID          uuid.UUID        `gorm:"type:uuid;primary_key" json:"id"`
	Key         string           `gorm:"uniqueIndex;not null" json:"key"`
	Value       datatypes.JSON   `gorm:"type:jsonb" json:"value"`
	ValueType   SettingValueType `gorm:"not null;default:'string'" json:"value_type"`
	Category    SettingCategory  `gorm:"not null;index" json:"category"`
	Label       string           `gorm:"not null" json:"label"`
	Description string           `json:"description"`
	IsPublic    bool             `gorm:"default:false" json:"is_public"` // If true, can be read without admin
	IsEditable  bool             `gorm:"default:true" json:"is_editable"` // If false, only system can change
	Validation  datatypes.JSON   `gorm:"type:jsonb" json:"validation,omitempty"` // JSON schema for validation
	DefaultValue datatypes.JSON   `gorm:"type:jsonb" json:"default_value,omitempty"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
	UpdatedBy   *uuid.UUID       `gorm:"type:uuid" json:"updated_by,omitempty"`
}

// TenantSetting represents a tenant-specific configuration override
type TenantSetting struct {
	ID           uuid.UUID        `gorm:"type:uuid;primary_key" json:"id"`
	TenantID     uuid.UUID        `gorm:"type:uuid;not null;index:idx_tenant_key" json:"tenant_id"`
	Tenant       *Tenant          `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Key          string           `gorm:"not null;index:idx_tenant_key" json:"key"`
	Value        datatypes.JSON   `gorm:"type:jsonb" json:"value"`
	ValueType    SettingValueType `gorm:"not null;default:'string'" json:"value_type"`
	Category     SettingCategory  `gorm:"not null;index" json:"category"`
	Label        string           `gorm:"not null" json:"label"`
	Description  string           `json:"description"`
	IsActive     bool             `gorm:"default:true" json:"is_active"`
	Validation   datatypes.JSON   `gorm:"type:jsonb" json:"validation,omitempty"`
	CreatedAt    time.Time        `json:"created_at"`
	UpdatedAt    time.Time        `json:"updated_at"`
	UpdatedBy    uuid.UUID        `gorm:"type:uuid" json:"updated_by"`
}

// UserSetting represents a user-specific preference
type UserSetting struct {
	ID          uuid.UUID        `gorm:"type:uuid;primary_key" json:"id"`
	UserID      uuid.UUID        `gorm:"type:uuid;not null;index:idx_user_key" json:"user_id"`
	User        *User            `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Key         string           `gorm:"not null;index:idx_user_key" json:"key"`
	Value       datatypes.JSON   `gorm:"type:jsonb" json:"value"`
	ValueType   SettingValueType `gorm:"not null;default:'string'" json:"value_type"`
	Category    SettingCategory  `gorm:"not null;index" json:"category"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

// ConfigurationTemplate represents predefined configuration sets
type ConfigurationTemplate struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	Name        string         `gorm:"not null;uniqueIndex" json:"name"`
	Description string         `json:"description"`
	Category    string         `gorm:"not null;index" json:"category"`
	Settings    datatypes.JSON `gorm:"type:jsonb;not null" json:"settings"` // Map of key->value
	IsDefault   bool           `gorm:"default:false" json:"is_default"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	Tags        datatypes.JSON `gorm:"type:jsonb" json:"tags,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// SettingAuditLog tracks all changes to settings
type SettingAuditLog struct {
	ID         uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	SettingKey string         `gorm:"not null;index" json:"setting_key"`
	SettingType string        `gorm:"not null" json:"setting_type"` // system, tenant, user
	EntityID   *uuid.UUID     `gorm:"type:uuid;index" json:"entity_id,omitempty"` // tenant_id or user_id
	OldValue   datatypes.JSON `gorm:"type:jsonb" json:"old_value,omitempty"`
	NewValue   datatypes.JSON `gorm:"type:jsonb" json:"new_value"`
	Action     string         `gorm:"not null" json:"action"` // create, update, delete
	Reason     string         `json:"reason,omitempty"`
	IP         string         `json:"ip,omitempty"`
	UserAgent  string         `json:"user_agent,omitempty"`
	ChangedBy  uuid.UUID      `gorm:"type:uuid;not null" json:"changed_by"`
	ChangedAt  time.Time      `gorm:"not null;index" json:"changed_at"`
}

// FeatureFlag represents feature toggles
type FeatureFlag struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	Key         string         `gorm:"uniqueIndex;not null" json:"key"`
	Name        string         `gorm:"not null" json:"name"`
	Description string         `json:"description"`
	IsEnabled   bool           `gorm:"default:false" json:"is_enabled"`
	Rollout     int            `gorm:"default:0" json:"rollout"` // Percentage of users (0-100)
	Conditions  datatypes.JSON `gorm:"type:jsonb" json:"conditions,omitempty"` // JSON conditions for enabling
	Metadata    datatypes.JSON `gorm:"type:jsonb" json:"metadata,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// SettingValidation represents validation rules for a setting
type SettingValidation struct {
	Required bool                   `json:"required,omitempty"`
	Min      *float64               `json:"min,omitempty"`
	Max      *float64               `json:"max,omitempty"`
	Pattern  string                 `json:"pattern,omitempty"`
	Enum     []interface{}          `json:"enum,omitempty"`
	Custom   map[string]interface{} `json:"custom,omitempty"`
}

// GetValue extracts the actual value from JSON based on ValueType
func (s *SystemSetting) GetValue() (interface{}, error) {
	return extractValue(s.Value, s.ValueType)
}

// GetValue extracts the actual value from JSON based on ValueType
func (s *TenantSetting) GetValue() (interface{}, error) {
	return extractValue(s.Value, s.ValueType)
}

// GetValue extracts the actual value from JSON based on ValueType
func (s *UserSetting) GetValue() (interface{}, error) {
	return extractValue(s.Value, s.ValueType)
}

// extractValue helper function to extract typed values from JSON
func extractValue(data datatypes.JSON, valueType SettingValueType) (interface{}, error) {
	var result interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}

	switch valueType {
	case SettingTypeString, SettingTypeEncrypted:
		if str, ok := result.(string); ok {
			return str, nil
		}
		return "", errors.New("value is not a string")
		
	case SettingTypeNumber:
		if num, ok := result.(float64); ok {
			return num, nil
		}
		return 0, errors.New("value is not a number")
		
	case SettingTypeBoolean:
		if b, ok := result.(bool); ok {
			return b, nil
		}
		return false, errors.New("value is not a boolean")
		
	case SettingTypeJSON:
		return result, nil
		
	default:
		return result, nil
	}
}

// SetValue sets the value as JSON based on ValueType
func (s *SystemSetting) SetValue(value interface{}) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	s.Value = datatypes.JSON(data)
	return nil
}

// SetValue sets the value as JSON based on ValueType
func (s *TenantSetting) SetValue(value interface{}) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	s.Value = datatypes.JSON(data)
	return nil
}

// SetValue sets the value as JSON based on ValueType
func (s *UserSetting) SetValue(value interface{}) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	s.Value = datatypes.JSON(data)
	return nil
}

// TableName for GORM
func (SystemSetting) TableName() string {
	return "system_settings"
}

func (TenantSetting) TableName() string {
	return "tenant_settings"
}

func (UserSetting) TableName() string {
	return "user_settings"
}

func (ConfigurationTemplate) TableName() string {
	return "configuration_templates"
}

func (SettingAuditLog) TableName() string {
	return "setting_audit_logs"
}

func (FeatureFlag) TableName() string {
	return "feature_flags"
}

// DefaultSystemSettings returns the default system settings
func DefaultSystemSettings() []SystemSetting {
	return []SystemSetting{
		// General Settings
		{
			Key:         "app.name",
			Value:       datatypes.JSON(`"PyTake"`),
			ValueType:   SettingTypeString,
			Category:    SettingCategoryGeneral,
			Label:       "Application Name",
			Description: "The name of the application",
			IsPublic:    true,
			IsEditable:  true,
		},
		{
			Key:         "app.timezone",
			Value:       datatypes.JSON(`"America/Sao_Paulo"`),
			ValueType:   SettingTypeString,
			Category:    SettingCategoryGeneral,
			Label:       "Default Timezone",
			Description: "Default timezone for the application",
			IsPublic:    true,
			IsEditable:  true,
		},
		{
			Key:         "app.locale",
			Value:       datatypes.JSON(`"pt-BR"`),
			ValueType:   SettingTypeString,
			Category:    SettingCategoryGeneral,
			Label:       "Default Locale",
			Description: "Default locale for the application",
			IsPublic:    true,
			IsEditable:  true,
		},
		
		// WhatsApp Settings
		{
			Key:         "whatsapp.api.version",
			Value:       datatypes.JSON(`"v17.0"`),
			ValueType:   SettingTypeString,
			Category:    SettingCategoryWhatsApp,
			Label:       "WhatsApp API Version",
			Description: "WhatsApp Business API version",
			IsPublic:    false,
			IsEditable:  true,
		},
		{
			Key:         "whatsapp.webhook.timeout",
			Value:       datatypes.JSON(`30`),
			ValueType:   SettingTypeNumber,
			Category:    SettingCategoryWhatsApp,
			Label:       "Webhook Timeout",
			Description: "Webhook processing timeout in seconds",
			IsPublic:    false,
			IsEditable:  true,
		},
		{
			Key:         "whatsapp.message.retry.enabled",
			Value:       datatypes.JSON(`true`),
			ValueType:   SettingTypeBoolean,
			Category:    SettingCategoryWhatsApp,
			Label:       "Message Retry Enabled",
			Description: "Enable automatic message retry on failure",
			IsPublic:    false,
			IsEditable:  true,
		},
		{
			Key:         "whatsapp.message.retry.max_attempts",
			Value:       datatypes.JSON(`3`),
			ValueType:   SettingTypeNumber,
			Category:    SettingCategoryWhatsApp,
			Label:       "Max Retry Attempts",
			Description: "Maximum number of retry attempts for failed messages",
			IsPublic:    false,
			IsEditable:  true,
		},
		
		// AI Settings
		{
			Key:         "ai.provider",
			Value:       datatypes.JSON(`"openai"`),
			ValueType:   SettingTypeString,
			Category:    SettingCategoryAI,
			Label:       "AI Provider",
			Description: "AI service provider (openai, anthropic, etc)",
			IsPublic:    false,
			IsEditable:  true,
		},
		{
			Key:         "ai.model",
			Value:       datatypes.JSON(`"gpt-4-turbo-preview"`),
			ValueType:   SettingTypeString,
			Category:    SettingCategoryAI,
			Label:       "AI Model",
			Description: "AI model to use for responses",
			IsPublic:    false,
			IsEditable:  true,
		},
		{
			Key:         "ai.temperature",
			Value:       datatypes.JSON(`0.7`),
			ValueType:   SettingTypeNumber,
			Category:    SettingCategoryAI,
			Label:       "AI Temperature",
			Description: "AI response temperature (0-1)",
			IsPublic:    false,
			IsEditable:  true,
		},
		{
			Key:         "ai.max_tokens",
			Value:       datatypes.JSON(`500`),
			ValueType:   SettingTypeNumber,
			Category:    SettingCategoryAI,
			Label:       "Max Tokens",
			Description: "Maximum tokens per AI response",
			IsPublic:    false,
			IsEditable:  true,
		},
		
		// Security Settings
		{
			Key:         "security.session.timeout",
			Value:       datatypes.JSON(`3600`),
			ValueType:   SettingTypeNumber,
			Category:    SettingCategorySecurity,
			Label:       "Session Timeout",
			Description: "Session timeout in seconds",
			IsPublic:    false,
			IsEditable:  true,
		},
		{
			Key:         "security.password.min_length",
			Value:       datatypes.JSON(`8`),
			ValueType:   SettingTypeNumber,
			Category:    SettingCategorySecurity,
			Label:       "Minimum Password Length",
			Description: "Minimum required password length",
			IsPublic:    true,
			IsEditable:  true,
		},
		{
			Key:         "security.2fa.enabled",
			Value:       datatypes.JSON(`false`),
			ValueType:   SettingTypeBoolean,
			Category:    SettingCategorySecurity,
			Label:       "2FA Enabled",
			Description: "Enable two-factor authentication",
			IsPublic:    false,
			IsEditable:  true,
		},
		
		// Limits Settings
		{
			Key:         "limits.api.rate_limit",
			Value:       datatypes.JSON(`100`),
			ValueType:   SettingTypeNumber,
			Category:    SettingCategoryLimits,
			Label:       "API Rate Limit",
			Description: "API requests per minute per user",
			IsPublic:    false,
			IsEditable:  true,
		},
		{
			Key:         "limits.file.max_size",
			Value:       datatypes.JSON(`10485760`),
			ValueType:   SettingTypeNumber,
			Category:    SettingCategoryLimits,
			Label:       "Max File Size",
			Description: "Maximum file upload size in bytes",
			IsPublic:    true,
			IsEditable:  true,
		},
		{
			Key:         "limits.conversation.max_messages",
			Value:       datatypes.JSON(`1000`),
			ValueType:   SettingTypeNumber,
			Category:    SettingCategoryLimits,
			Label:       "Max Messages per Conversation",
			Description: "Maximum messages retained per conversation",
			IsPublic:    false,
			IsEditable:  true,
		},
		
		// Notification Settings
		{
			Key:         "notification.email.enabled",
			Value:       datatypes.JSON(`true`),
			ValueType:   SettingTypeBoolean,
			Category:    SettingCategoryNotification,
			Label:       "Email Notifications",
			Description: "Enable email notifications",
			IsPublic:    false,
			IsEditable:  true,
		},
		{
			Key:         "notification.webhook.enabled",
			Value:       datatypes.JSON(`false`),
			ValueType:   SettingTypeBoolean,
			Category:    SettingCategoryNotification,
			Label:       "Webhook Notifications",
			Description: "Enable webhook notifications",
			IsPublic:    false,
			IsEditable:  true,
		},
	}
}

// Scan implements the Scanner interface for SettingCategory
func (s *SettingCategory) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	if str, ok := value.(string); ok {
		*s = SettingCategory(str)
		return nil
	}
	return errors.New("cannot scan SettingCategory")
}

// Value implements the Valuer interface for SettingCategory
func (s SettingCategory) Value() (driver.Value, error) {
	return string(s), nil
}

// Scan implements the Scanner interface for SettingValueType
func (s *SettingValueType) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	if str, ok := value.(string); ok {
		*s = SettingValueType(str)
		return nil
	}
	return errors.New("cannot scan SettingValueType")
}

// Value implements the Valuer interface for SettingValueType
func (s SettingValueType) Value() (driver.Value, error) {
	return string(s), nil
}