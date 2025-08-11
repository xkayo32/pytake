package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// ERPConnection represents an ERP system connection configuration
type ERPConnection struct {
	BaseModel
	TenantModel

	// Connection Information
	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`
	ERPType     string `gorm:"not null" json:"erp_type"` // hubsoft, ixcsoft, mksolutions, sisgp, custom
	Version     string `json:"version"`
	
	// Connection Details
	BaseURL      string `gorm:"not null" json:"base_url"`
	APIEndpoint  string `json:"api_endpoint"`
	DatabaseHost *string `json:"database_host,omitempty"`
	DatabaseName *string `json:"database_name,omitempty"`
	DatabasePort *int    `json:"database_port,omitempty"`
	
	// Authentication
	AuthType        string `gorm:"not null;default:'api_key'" json:"auth_type"` // api_key, oauth2, basic_auth, database, custom
	APIKey          *string `json:"api_key,omitempty"`
	APISecret       *string `json:"api_secret,omitempty"`
	Username        *string `json:"username,omitempty"`
	Password        *string `json:"password,omitempty"`
	OAuth2Config    JSON   `gorm:"type:jsonb" json:"oauth2_config,omitempty"`
	AuthHeaders     JSON   `gorm:"type:jsonb" json:"auth_headers,omitempty"`
	CustomAuthData  JSON   `gorm:"type:jsonb" json:"custom_auth_data,omitempty"`
	
	// Connection Settings
	Timeout         int    `gorm:"default:30" json:"timeout_seconds"`
	RetryAttempts   int    `gorm:"default:3" json:"retry_attempts"`
	RateLimitRPS    int    `gorm:"default:10" json:"rate_limit_rps"`
	ConnectionPool  int    `gorm:"default:5" json:"connection_pool_size"`
	
	// SSL/TLS Configuration
	UseSSL          bool    `gorm:"default:true" json:"use_ssl"`
	SSLCertPath     *string `json:"ssl_cert_path,omitempty"`
	SkipSSLVerify   bool    `gorm:"default:false" json:"skip_ssl_verify"`
	
	// Status and Health
	Status          string     `gorm:"not null;default:'inactive'" json:"status"` // active, inactive, error, testing
	LastTestAt      *time.Time `json:"last_test_at,omitempty"`
	LastSyncAt      *time.Time `json:"last_sync_at,omitempty"`
	LastErrorAt     *time.Time `json:"last_error_at,omitempty"`
	LastErrorMsg    *string    `json:"last_error_message,omitempty"`
	HealthScore     float64    `gorm:"default:0" json:"health_score"` // 0-100
	
	// Sync Configuration
	AutoSync        bool `gorm:"default:true" json:"auto_sync"`
	SyncInterval    int  `gorm:"default:300" json:"sync_interval_seconds"` // 5 minutes default
	FullSyncHour    int  `gorm:"default:2" json:"full_sync_hour"` // 2 AM default
	
	// Webhook Configuration
	WebhookURL      string         `json:"webhook_url"`
	WebhookSecret   *string        `json:"webhook_secret,omitempty"`
	WebhookEvents   pq.StringArray `gorm:"type:text[]" json:"webhook_events"`
	
	// Feature Flags
	SupportedFeatures   pq.StringArray `gorm:"type:text[]" json:"supported_features"`
	EnabledFeatures     pq.StringArray `gorm:"type:text[]" json:"enabled_features"`
	
	// Performance Metrics
	TotalRequests      int64   `gorm:"default:0" json:"total_requests"`
	SuccessfulRequests int64   `gorm:"default:0" json:"successful_requests"`
	FailedRequests     int64   `gorm:"default:0" json:"failed_requests"`
	AvgResponseTime    float64 `gorm:"default:0" json:"avg_response_time_ms"`
	
	// Custom Configuration
	CustomConfig    JSON           `gorm:"type:jsonb" json:"custom_config"`
	Tags            pq.StringArray `gorm:"type:text[]" json:"tags"`
	
	// Metadata
	CreatedByID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`
	
	// Relationships
	CreatedBy     *User            `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
	DataMappings  []*ERPDataMapping `gorm:"foreignKey:ERPConnectionID" json:"data_mappings,omitempty"`
	SyncLogs      []*ERPSyncLog     `gorm:"foreignKey:ERPConnectionID" json:"sync_logs,omitempty"`
	Webhooks      []*ERPWebhook     `gorm:"foreignKey:ERPConnectionID" json:"webhooks,omitempty"`
}

// TableName returns the table name for ERPConnection
func (ERPConnection) TableName() string {
	return "erp_connections"
}

// ERPDataMapping represents field mapping between PyTake and ERP systems
type ERPDataMapping struct {
	BaseModel
	TenantModel

	ERPConnectionID uuid.UUID `gorm:"type:uuid;not null;index" json:"erp_connection_id"`
	
	// Mapping Configuration
	MappingName     string `gorm:"not null" json:"mapping_name"`
	Description     string `json:"description"`
	DataType        string `gorm:"not null" json:"data_type"` // customer, product, invoice, payment, etc.
	Direction       string `gorm:"not null" json:"direction"` // bidirectional, pytake_to_erp, erp_to_pytake
	
	// PyTake Side Configuration
	PyTakeEntity    string `gorm:"not null" json:"pytake_entity"` // contacts, conversations, messages, etc.
	PyTakeFields    JSON   `gorm:"type:jsonb;not null" json:"pytake_fields"`
	
	// ERP Side Configuration
	ERPEntity       string `gorm:"not null" json:"erp_entity"` // customers, products, invoices, etc.
	ERPEndpoint     string `json:"erp_endpoint"`
	ERPFields       JSON   `gorm:"type:jsonb;not null" json:"erp_fields"`
	ERPFilters      JSON   `gorm:"type:jsonb" json:"erp_filters,omitempty"`
	
	// Field Mappings
	FieldMappings   JSON   `gorm:"type:jsonb;not null" json:"field_mappings"`
	
	// Transformation Rules
	TransformRules  JSON   `gorm:"type:jsonb" json:"transform_rules,omitempty"`
	ValidationRules JSON   `gorm:"type:jsonb" json:"validation_rules,omitempty"`
	
	// Sync Settings
	Priority        int    `gorm:"default:5" json:"priority"` // 1-10, higher = more important
	IsActive        bool   `gorm:"default:true" json:"is_active"`
	SyncFrequency   int    `gorm:"default:300" json:"sync_frequency_seconds"`
	BatchSize       int    `gorm:"default:100" json:"batch_size"`
	
	// Conflict Resolution
	ConflictStrategy string `gorm:"default:'erp_wins'" json:"conflict_strategy"` // erp_wins, pytake_wins, manual, latest_timestamp
	
	// Performance Tracking
	LastSyncAt      *time.Time `json:"last_sync_at,omitempty"`
	TotalSynced     int64      `gorm:"default:0" json:"total_synced"`
	SyncErrors      int64      `gorm:"default:0" json:"sync_errors"`
	LastSyncDuration time.Duration `json:"last_sync_duration"`
	
	// Metadata
	CreatedByID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`
	
	// Relationships
	ERPConnection *ERPConnection `gorm:"foreignKey:ERPConnectionID;constraint:OnDelete:CASCADE" json:"erp_connection,omitempty"`
	CreatedBy     *User          `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
	SyncLogs      []*ERPSyncLog  `gorm:"foreignKey:DataMappingID" json:"sync_logs,omitempty"`
}

// TableName returns the table name for ERPDataMapping
func (ERPDataMapping) TableName() string {
	return "erp_data_mappings"
}

// ERPSyncLog represents sync operation logs
type ERPSyncLog struct {
	BaseModel
	TenantModel

	ERPConnectionID uuid.UUID  `gorm:"type:uuid;not null;index" json:"erp_connection_id"`
	DataMappingID   *uuid.UUID `gorm:"type:uuid;index" json:"data_mapping_id,omitempty"`
	
	// Sync Operation Details
	SyncType        string    `gorm:"not null" json:"sync_type"` // full, incremental, manual, webhook
	Operation       string    `gorm:"not null" json:"operation"` // create, update, delete, read
	Direction       string    `gorm:"not null" json:"direction"` // pytake_to_erp, erp_to_pytake, bidirectional
	
	// Execution Details
	StartedAt       time.Time  `gorm:"not null" json:"started_at"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
	Duration        *time.Duration `json:"duration,omitempty"`
	Status          string     `gorm:"not null;default:'running'" json:"status"` // running, completed, failed, partial
	
	// Results
	RecordsProcessed int `gorm:"default:0" json:"records_processed"`
	RecordsSucceeded int `gorm:"default:0" json:"records_succeeded"`
	RecordsFailed    int `gorm:"default:0" json:"records_failed"`
	RecordsSkipped   int `gorm:"default:0" json:"records_skipped"`
	
	// Error Handling
	ErrorMessage    *string `json:"error_message,omitempty"`
	ErrorDetails    JSON    `gorm:"type:jsonb" json:"error_details,omitempty"`
	FailedRecords   JSON    `gorm:"type:jsonb" json:"failed_records,omitempty"`
	
	// Performance Metrics
	AverageProcessingTime float64 `gorm:"default:0" json:"avg_processing_time_ms"`
	ThroughputPerSecond   float64 `gorm:"default:0" json:"throughput_per_second"`
	
	// Data Summary
	DataSummary     JSON `gorm:"type:jsonb" json:"data_summary,omitempty"`
	ChangesSummary  JSON `gorm:"type:jsonb" json:"changes_summary,omitempty"`
	
	// Metadata
	TriggeredBy     string     `json:"triggered_by"` // scheduler, webhook, manual, api
	TriggeredByUser *uuid.UUID `gorm:"type:uuid" json:"triggered_by_user,omitempty"`
	
	// Relationships
	ERPConnection *ERPConnection  `gorm:"foreignKey:ERPConnectionID;constraint:OnDelete:CASCADE" json:"erp_connection,omitempty"`
	DataMapping   *ERPDataMapping `gorm:"foreignKey:DataMappingID" json:"data_mapping,omitempty"`
	TriggeredUser *User           `gorm:"foreignKey:TriggeredByUser" json:"triggered_user,omitempty"`
}

// TableName returns the table name for ERPSyncLog
func (ERPSyncLog) TableName() string {
	return "erp_sync_logs"
}

// ERPWebhook represents ERP webhook configurations and logs
type ERPWebhook struct {
	BaseModel
	TenantModel

	ERPConnectionID uuid.UUID `gorm:"type:uuid;not null;index" json:"erp_connection_id"`
	
	// Webhook Configuration
	EventType       string         `gorm:"not null" json:"event_type"`
	Direction       string         `gorm:"not null" json:"direction"` // incoming, outgoing
	
	// For Incoming Webhooks (from ERP to PyTake)
	SourceURL       *string        `json:"source_url,omitempty"`
	Secret          *string        `json:"secret,omitempty"`
	SignatureHeader *string        `json:"signature_header,omitempty"`
	
	// For Outgoing Webhooks (from PyTake to ERP)
	TargetURL       *string        `json:"target_url,omitempty"`
	HTTPMethod      string         `gorm:"default:'POST'" json:"http_method"`
	Headers         JSON           `gorm:"type:jsonb" json:"headers,omitempty"`
	AuthConfig      JSON           `gorm:"type:jsonb" json:"auth_config,omitempty"`
	
	// Processing Configuration
	ProcessingRules JSON           `gorm:"type:jsonb" json:"processing_rules,omitempty"`
	ResponseMapping JSON           `gorm:"type:jsonb" json:"response_mapping,omitempty"`
	
	// Status and Settings
	IsActive        bool           `gorm:"default:true" json:"is_active"`
	RetryAttempts   int            `gorm:"default:3" json:"retry_attempts"`
	RetryDelay      int            `gorm:"default:5" json:"retry_delay_seconds"`
	Timeout         int            `gorm:"default:30" json:"timeout_seconds"`
	
	// Performance Metrics
	TotalReceived   int64          `gorm:"default:0" json:"total_received"`
	TotalProcessed  int64          `gorm:"default:0" json:"total_processed"`
	TotalFailed     int64          `gorm:"default:0" json:"total_failed"`
	AvgProcessingTime float64      `gorm:"default:0" json:"avg_processing_time_ms"`
	
	// Last Activity
	LastReceivedAt  *time.Time     `json:"last_received_at,omitempty"`
	LastProcessedAt *time.Time     `json:"last_processed_at,omitempty"`
	LastErrorAt     *time.Time     `json:"last_error_at,omitempty"`
	LastErrorMsg    *string        `json:"last_error_message,omitempty"`
	
	// Metadata
	CreatedByID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`
	
	// Relationships
	ERPConnection *ERPConnection     `gorm:"foreignKey:ERPConnectionID;constraint:OnDelete:CASCADE" json:"erp_connection,omitempty"`
	CreatedBy     *User              `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
	WebhookLogs   []*ERPWebhookLog   `gorm:"foreignKey:ERPWebhookID" json:"webhook_logs,omitempty"`
}

// TableName returns the table name for ERPWebhook
func (ERPWebhook) TableName() string {
	return "erp_webhooks"
}

// ERPWebhookLog represents individual webhook execution logs
type ERPWebhookLog struct {
	BaseModel
	TenantModel

	ERPWebhookID    uuid.UUID `gorm:"type:uuid;not null;index" json:"erp_webhook_id"`
	ERPConnectionID uuid.UUID `gorm:"type:uuid;not null;index" json:"erp_connection_id"`
	
	// Request Details
	EventType       string    `gorm:"not null" json:"event_type"`
	Direction       string    `gorm:"not null" json:"direction"`
	RequestID       string    `json:"request_id"`
	
	// HTTP Details
	Method          string    `json:"http_method"`
	URL             string    `json:"url"`
	Headers         JSON      `gorm:"type:jsonb" json:"headers"`
	RequestBody     JSON      `gorm:"type:jsonb" json:"request_body"`
	ResponseBody    JSON      `gorm:"type:jsonb" json:"response_body"`
	StatusCode      int       `json:"status_code"`
	
	// Processing Details
	ReceivedAt      time.Time  `gorm:"not null" json:"received_at"`
	ProcessedAt     *time.Time `json:"processed_at,omitempty"`
	ProcessingTime  *time.Duration `json:"processing_time,omitempty"`
	Status          string     `gorm:"not null;default:'pending'" json:"status"` // pending, processing, completed, failed
	
	// Results
	ProcessingResult JSON      `gorm:"type:jsonb" json:"processing_result,omitempty"`
	ErrorMessage     *string   `json:"error_message,omitempty"`
	RetryCount       int       `gorm:"default:0" json:"retry_count"`
	
	// Validation and Security
	SignatureValid   bool      `gorm:"default:false" json:"signature_valid"`
	IPAddress        string    `json:"ip_address"`
	UserAgent        string    `json:"user_agent"`
	
	// Relationships
	ERPWebhook    *ERPWebhook    `gorm:"foreignKey:ERPWebhookID;constraint:OnDelete:CASCADE" json:"erp_webhook,omitempty"`
	ERPConnection *ERPConnection `gorm:"foreignKey:ERPConnectionID" json:"erp_connection,omitempty"`
}

// TableName returns the table name for ERPWebhookLog
func (ERPWebhookLog) TableName() string {
	return "erp_webhook_logs"
}

// ERPDataSync represents real-time data synchronization records
type ERPDataSync struct {
	BaseModel
	TenantModel

	ERPConnectionID uuid.UUID  `gorm:"type:uuid;not null;index" json:"erp_connection_id"`
	DataMappingID   *uuid.UUID `gorm:"type:uuid;index" json:"data_mapping_id,omitempty"`
	
	// Sync Record Details
	EntityType      string     `gorm:"not null" json:"entity_type"`
	EntityID        string     `gorm:"not null;index" json:"entity_id"` // ID in PyTake
	ERPEntityID     string     `json:"erp_entity_id"`                   // ID in ERP
	
	// Operation Details
	Operation       string     `gorm:"not null" json:"operation"` // create, update, delete
	Direction       string     `gorm:"not null" json:"direction"` // pytake_to_erp, erp_to_pytake
	SyncTrigger     string     `gorm:"not null" json:"sync_trigger"` // manual, auto, webhook, scheduled
	
	// Data States
	PyTakeData      JSON       `gorm:"type:jsonb" json:"pytake_data"`
	ERPData         JSON       `gorm:"type:jsonb" json:"erp_data"`
	SyncedData      JSON       `gorm:"type:jsonb" json:"synced_data"`
	ConflictData    JSON       `gorm:"type:jsonb" json:"conflict_data,omitempty"`
	
	// Status and Timing
	Status          string     `gorm:"not null;default:'pending'" json:"status"` // pending, syncing, completed, failed, conflict
	StartedAt       time.Time  `gorm:"not null" json:"started_at"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
	Duration        *time.Duration `json:"duration,omitempty"`
	
	// Conflict Resolution
	HasConflict     bool       `gorm:"default:false" json:"has_conflict"`
	ConflictReason  *string    `json:"conflict_reason,omitempty"`
	ResolvedAt      *time.Time `json:"resolved_at,omitempty"`
	ResolvedBy      *uuid.UUID `gorm:"type:uuid" json:"resolved_by,omitempty"`
	ResolutionType  *string    `json:"resolution_type,omitempty"` // manual, auto, rule_based
	
	// Error Handling
	ErrorMessage    *string    `json:"error_message,omitempty"`
	RetryCount      int        `gorm:"default:0" json:"retry_count"`
	NextRetryAt     *time.Time `json:"next_retry_at,omitempty"`
	
	// Checksum for Data Integrity
	PyTakeChecksum  string     `json:"pytake_checksum"`
	ERPChecksum     string     `json:"erp_checksum"`
	
	// Metadata
	TriggeredBy     *uuid.UUID `gorm:"type:uuid" json:"triggered_by,omitempty"`
	
	// Relationships
	ERPConnection *ERPConnection  `gorm:"foreignKey:ERPConnectionID;constraint:OnDelete:CASCADE" json:"erp_connection,omitempty"`
	DataMapping   *ERPDataMapping `gorm:"foreignKey:DataMappingID" json:"data_mapping,omitempty"`
	TriggeredUser *User           `gorm:"foreignKey:TriggeredBy" json:"triggered_user,omitempty"`
	ResolvedUser  *User           `gorm:"foreignKey:ResolvedBy" json:"resolved_user,omitempty"`
}

// TableName returns the table name for ERPDataSync
func (ERPDataSync) TableName() string {
	return "erp_data_syncs"
}

// ERPCredential represents secure credential storage for ERP connections
type ERPCredential struct {
	BaseModel
	TenantModel

	ERPConnectionID uuid.UUID `gorm:"type:uuid;not null;index" json:"erp_connection_id"`
	
	// Credential Information
	CredentialType  string `gorm:"not null" json:"credential_type"` // api_key, oauth2, database, certificate
	Name            string `gorm:"not null" json:"name"`
	Description     string `json:"description"`
	
	// Encrypted Credential Data
	EncryptedData   []byte    `gorm:"not null" json:"-"` // Never expose in JSON
	Salt            []byte    `gorm:"not null" json:"-"`
	KeyVersion      int       `gorm:"not null" json:"key_version"`
	
	// OAuth2 Specific
	AccessToken     *string    `json:"-"` // Encrypted
	RefreshToken    *string    `json:"-"` // Encrypted
	TokenExpiry     *time.Time `json:"token_expiry,omitempty"`
	TokenScope      *string    `json:"token_scope,omitempty"`
	
	// Status and Validation
	Status          string     `gorm:"not null;default:'active'" json:"status"` // active, expired, revoked, invalid
	LastValidatedAt *time.Time `json:"last_validated_at,omitempty"`
	LastUsedAt      *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt       *time.Time `json:"expires_at,omitempty"`
	
	// Security
	Usage           int64      `gorm:"default:0" json:"usage_count"`
	MaxUsage        *int64     `json:"max_usage,omitempty"`
	IPRestrictions  pq.StringArray `gorm:"type:text[]" json:"ip_restrictions,omitempty"`
	
	// Metadata
	CreatedByID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`
	
	// Relationships
	ERPConnection *ERPConnection `gorm:"foreignKey:ERPConnectionID;constraint:OnDelete:CASCADE" json:"erp_connection,omitempty"`
	CreatedBy     *User          `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
}

// TableName returns the table name for ERPCredential
func (ERPCredential) TableName() string {
	return "erp_credentials"
}

// ERPConnectionStatus represents ERP connection status constants
type ERPConnectionStatus string

const (
	ERPStatusActive   ERPConnectionStatus = "active"
	ERPStatusInactive ERPConnectionStatus = "inactive"
	ERPStatusError    ERPConnectionStatus = "error"
	ERPStatusTesting  ERPConnectionStatus = "testing"
)

// ERPType represents supported ERP systems
type ERPType string

const (
	ERPTypeHubSoft     ERPType = "hubsoft"
	ERPTypeIXCSoft     ERPType = "ixcsoft"
	ERPTypeMKSolutions ERPType = "mksolutions"
	ERPTypeSisGP       ERPType = "sisgp"
	ERPTypeCustom      ERPType = "custom"
)

// SyncDirection represents data sync direction
type SyncDirection string

const (
	SyncDirectionBidirectional SyncDirection = "bidirectional"
	SyncDirectionPyTakeToERP   SyncDirection = "pytake_to_erp"
	SyncDirectionERPToPyTake   SyncDirection = "erp_to_pytake"
)

// ConflictStrategy represents conflict resolution strategies
type ConflictStrategy string

const (
	ConflictStrategyERPWins        ConflictStrategy = "erp_wins"
	ConflictStrategyPyTakeWins     ConflictStrategy = "pytake_wins"
	ConflictStrategyManual         ConflictStrategy = "manual"
	ConflictStrategyLatestTimestamp ConflictStrategy = "latest_timestamp"
)