package erp

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ERPIntegrationManager defines the main interface for ERP integration management
type ERPIntegrationManager interface {
	// Connection Management
	CreateConnection(ctx context.Context, tenantID uuid.UUID, config *ConnectionConfig) (*ERPConnection, error)
	UpdateConnection(ctx context.Context, tenantID, connectionID uuid.UUID, config *UpdateConnectionConfig) (*ERPConnection, error)
	DeleteConnection(ctx context.Context, tenantID, connectionID uuid.UUID) error
	GetConnection(ctx context.Context, tenantID, connectionID uuid.UUID) (*ERPConnection, error)
	ListConnections(ctx context.Context, tenantID uuid.UUID, filter *ConnectionFilter) ([]*ERPConnection, error)
	
	// Connection Testing
	TestConnection(ctx context.Context, tenantID, connectionID uuid.UUID) (*TestResult, error)
	ValidateCredentials(ctx context.Context, config *ConnectionConfig) (*ValidationResult, error)
	
	// Data Mapping Management
	CreateDataMapping(ctx context.Context, tenantID uuid.UUID, mapping *DataMappingConfig) (*DataMapping, error)
	UpdateDataMapping(ctx context.Context, tenantID, mappingID uuid.UUID, config *UpdateDataMappingConfig) (*DataMapping, error)
	DeleteDataMapping(ctx context.Context, tenantID, mappingID uuid.UUID) error
	GetDataMapping(ctx context.Context, tenantID, mappingID uuid.UUID) (*DataMapping, error)
	ListDataMappings(ctx context.Context, tenantID uuid.UUID, filter *MappingFilter) ([]*DataMapping, error)
	
	// Field Mapping Operations
	TestMappingTransformation(ctx context.Context, tenantID, mappingID uuid.UUID, sampleData map[string]interface{}, direction TransformDirection) (*MappingTestResult, error)
	ValidateMappingConfig(ctx context.Context, config *DataMappingConfig) ([]*ValidationError, error)
	GetSupportedTransformations(ctx context.Context) ([]*TransformationInfo, error)
	GetMappingStats(ctx context.Context, tenantID uuid.UUID, dateRange *DateRange) (*MappingStats, error)
	
	// Synchronization
	StartSync(ctx context.Context, tenantID uuid.UUID, request *SyncRequest) (*SyncOperation, error)
	GetSyncStatus(ctx context.Context, tenantID uuid.UUID, syncID uuid.UUID) (*SyncStatus, error)
	CancelSync(ctx context.Context, tenantID uuid.UUID, syncID uuid.UUID) error
	
	// Real-time Data Sync
	SyncEntity(ctx context.Context, tenantID uuid.UUID, request *EntitySyncRequest) (*EntitySyncResult, error)
	ResolveSyncConflict(ctx context.Context, tenantID uuid.UUID, syncID uuid.UUID, resolution *ConflictResolution) error
	
	// Webhook Management
	RegisterWebhook(ctx context.Context, tenantID uuid.UUID, webhook *WebhookConfig) (*Webhook, error)
	ProcessWebhook(ctx context.Context, tenantID uuid.UUID, payload *WebhookPayload) (*WebhookResult, error)
	
	// Health and Monitoring
	GetConnectionHealth(ctx context.Context, tenantID, connectionID uuid.UUID) (*HealthStatus, error)
	GetSyncMetrics(ctx context.Context, tenantID uuid.UUID, dateRange *DateRange) (*SyncMetrics, error)
	GetSystemStatus(ctx context.Context, tenantID uuid.UUID) (*SystemStatus, error)
}

// ERPConnector defines the interface for specific ERP system connectors
type ERPConnector interface {
	// Connection Operations
	Connect(ctx context.Context, config *ConnectionConfig) error
	Disconnect(ctx context.Context) error
	IsConnected(ctx context.Context) bool
	TestConnection(ctx context.Context) (*TestResult, error)
	
	// Data Operations
	GetEntity(ctx context.Context, entityType string, entityID string) (map[string]interface{}, error)
	CreateEntity(ctx context.Context, entityType string, data map[string]interface{}) (string, error)
	UpdateEntity(ctx context.Context, entityType string, entityID string, data map[string]interface{}) error
	DeleteEntity(ctx context.Context, entityType string, entityID string) error
	ListEntities(ctx context.Context, entityType string, filters map[string]interface{}) ([]map[string]interface{}, error)
	
	// Batch Operations
	BulkCreate(ctx context.Context, entityType string, entities []map[string]interface{}) (*BulkResult, error)
	BulkUpdate(ctx context.Context, entityType string, entities []map[string]interface{}) (*BulkResult, error)
	BulkDelete(ctx context.Context, entityType string, entityIDs []string) (*BulkResult, error)
	
	// Schema and Metadata
	GetEntitySchema(ctx context.Context, entityType string) (*EntitySchema, error)
	GetSupportedEntities(ctx context.Context) ([]string, error)
	GetCapabilities(ctx context.Context) (*ConnectorCapabilities, error)
	
	// Webhook Support
	SupportsWebhooks() bool
	RegisterWebhook(ctx context.Context, config *WebhookConfig) error
	UnregisterWebhook(ctx context.Context, webhookID string) error
	
	// Authentication
	RefreshAuth(ctx context.Context) error
	GetAuthInfo(ctx context.Context) (*AuthInfo, error)
}

// SyncEngine defines the interface for data synchronization
type SyncEngine interface {
	// Sync Operations
	ExecuteSync(ctx context.Context, request *SyncRequest) (*SyncOperation, error)
	ScheduleSync(ctx context.Context, schedule *SyncSchedule) error
	CancelSync(ctx context.Context, syncID uuid.UUID) error
	
	// Monitoring
	GetSyncStatus(ctx context.Context, syncID uuid.UUID) (*SyncStatus, error)
	GetSyncHistory(ctx context.Context, filter *SyncHistoryFilter) ([]*SyncOperation, error)
	
	// Conflict Resolution
	DetectConflicts(ctx context.Context, data1, data2 map[string]interface{}) ([]*DataConflict, error)
	ResolveConflicts(ctx context.Context, conflicts []*DataConflict, strategy ConflictResolutionStrategy) error
	
	// Real-time Sync
	StartRealTimeSync(ctx context.Context, tenantID uuid.UUID) error
	StopRealTimeSync(ctx context.Context, tenantID uuid.UUID) error
	ProcessRealTimeEvent(ctx context.Context, event *SyncEvent) error
}

// WebhookProcessor defines the interface for webhook processing
type WebhookProcessor interface {
	// Webhook Registration
	RegisterWebhook(ctx context.Context, webhook *WebhookConfig) (*Webhook, error)
	UnregisterWebhook(ctx context.Context, webhookID uuid.UUID) error
	ListWebhooks(ctx context.Context, tenantID uuid.UUID) ([]*Webhook, error)
	
	// Webhook Processing
	ProcessIncomingWebhook(ctx context.Context, payload *WebhookPayload) (*WebhookResult, error)
	SendOutgoingWebhook(ctx context.Context, webhook *Webhook, data map[string]interface{}) error
	
	// Webhook Validation
	ValidateSignature(ctx context.Context, payload []byte, signature string, secret string) bool
	ValidatePayload(ctx context.Context, payload *WebhookPayload, rules *ValidationRules) error
}

// CredentialManager defines the interface for secure credential management
type CredentialManager interface {
	// Credential Operations
	StoreCredentials(ctx context.Context, tenantID uuid.UUID, creds *Credentials) (*CredentialInfo, error)
	GetCredentials(ctx context.Context, tenantID uuid.UUID, credID uuid.UUID) (*Credentials, error)
	UpdateCredentials(ctx context.Context, tenantID uuid.UUID, credID uuid.UUID, creds *Credentials) error
	DeleteCredentials(ctx context.Context, tenantID uuid.UUID, credID uuid.UUID) error
	
	// OAuth2 Support
	GetOAuth2URL(ctx context.Context, config *OAuth2Config) (string, error)
	ExchangeOAuth2Code(ctx context.Context, config *OAuth2Config, code string) (*OAuth2Token, error)
	RefreshOAuth2Token(ctx context.Context, config *OAuth2Config, refreshToken string) (*OAuth2Token, error)
	
	// Credential Validation
	ValidateCredentials(ctx context.Context, creds *Credentials) (*ValidationResult, error)
	TestCredentials(ctx context.Context, creds *Credentials, config *ConnectionConfig) (*TestResult, error)
}

// Data Structures

// ERPConnection represents an ERP connection
type ERPConnection struct {
	ID              uuid.UUID              `json:"id"`
	TenantID        uuid.UUID              `json:"tenant_id"`
	Name            string                 `json:"name"`
	Description     string                 `json:"description"`
	ERPType         ERPType                `json:"erp_type"`
	Version         string                 `json:"version"`
	BaseURL         string                 `json:"base_url"`
	Status          ConnectionStatus       `json:"status"`
	HealthScore     float64                `json:"health_score"`
	LastSyncAt      *time.Time             `json:"last_sync_at,omitempty"`
	LastErrorAt     *time.Time             `json:"last_error_at,omitempty"`
	LastErrorMsg    *string                `json:"last_error_message,omitempty"`
	Config          map[string]interface{} `json:"config"`
	SupportedFeatures []string             `json:"supported_features"`
	EnabledFeatures   []string             `json:"enabled_features"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
	CreatedByID     uuid.UUID              `json:"created_by_id"`
}

// ERPType represents supported ERP systems
type ERPType string

const (
	ERPTypeHubSoft     ERPType = "hubsoft"
	ERPTypeIXCSoft     ERPType = "ixcsoft"
	ERPTypeMKSolutions ERPType = "mksolutions"
	ERPTypeSisGP       ERPType = "sisgp"
	ERPTypeCustom      ERPType = "custom"
)

// ConnectionStatus represents connection status
type ConnectionStatus string

const (
	StatusActive   ConnectionStatus = "active"
	StatusInactive ConnectionStatus = "inactive"
	StatusError    ConnectionStatus = "error"
	StatusTesting  ConnectionStatus = "testing"
)

// ConnectionConfig represents ERP connection configuration
type ConnectionConfig struct {
	Name            string                 `json:"name" validate:"required"`
	Description     string                 `json:"description"`
	ERPType         ERPType                `json:"erp_type" validate:"required"`
	Version         string                 `json:"version"`
	BaseURL         string                 `json:"base_url" validate:"required"`
	APIEndpoint     string                 `json:"api_endpoint"`
	AuthConfig      AuthConfig             `json:"auth_config" validate:"required"`
	ConnectionSettings ConnectionSettings   `json:"connection_settings"`
	WebhookConfig   *WebhookConfig         `json:"webhook_config,omitempty"`
	CustomConfig    map[string]interface{} `json:"custom_config,omitempty"`
	EnabledFeatures []string               `json:"enabled_features"`
}

// UpdateConnectionConfig represents update configuration
type UpdateConnectionConfig struct {
	Name            *string                `json:"name,omitempty"`
	Description     *string                `json:"description,omitempty"`
	Version         *string                `json:"version,omitempty"`
	BaseURL         *string                `json:"base_url,omitempty"`
	APIEndpoint     *string                `json:"api_endpoint,omitempty"`
	AuthConfig      *AuthConfig            `json:"auth_config,omitempty"`
	ConnectionSettings *ConnectionSettings  `json:"connection_settings,omitempty"`
	WebhookConfig   *WebhookConfig         `json:"webhook_config,omitempty"`
	CustomConfig    map[string]interface{} `json:"custom_config,omitempty"`
	EnabledFeatures []string               `json:"enabled_features,omitempty"`
}

// AuthConfig represents authentication configuration
type AuthConfig struct {
	Type        AuthType               `json:"type" validate:"required"`
	APIKey      *string                `json:"api_key,omitempty"`
	APISecret   *string                `json:"api_secret,omitempty"`
	Username    *string                `json:"username,omitempty"`
	Password    *string                `json:"password,omitempty"`
	OAuth2      *OAuth2Config          `json:"oauth2,omitempty"`
	Headers     map[string]string      `json:"headers,omitempty"`
	CustomAuth  map[string]interface{} `json:"custom_auth,omitempty"`
}

// AuthType represents authentication types
type AuthType string

const (
	AuthTypeAPIKey    AuthType = "api_key"
	AuthTypeOAuth2    AuthType = "oauth2"
	AuthTypeBasicAuth AuthType = "basic_auth"
	AuthTypeDatabase  AuthType = "database"
	AuthTypeCustom    AuthType = "custom"
)

// OAuth2Config represents OAuth2 configuration
type OAuth2Config struct {
	ClientID     string   `json:"client_id"`
	ClientSecret string   `json:"client_secret"`
	AuthURL      string   `json:"auth_url"`
	TokenURL     string   `json:"token_url"`
	RedirectURL  string   `json:"redirect_url"`
	Scopes       []string `json:"scopes"`
}

// OAuth2Token represents OAuth2 token
type OAuth2Token struct {
	AccessToken  string    `json:"access_token"`
	TokenType    string    `json:"token_type"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresIn    int       `json:"expires_in"`
	ExpiresAt    time.Time `json:"expires_at"`
	Scope        string    `json:"scope"`
}

// ConnectionSettings represents connection settings
type ConnectionSettings struct {
	Timeout       int  `json:"timeout_seconds"`
	RetryAttempts int  `json:"retry_attempts"`
	RateLimitRPS  int  `json:"rate_limit_rps"`
	UseSSL        bool `json:"use_ssl"`
	SkipSSLVerify bool `json:"skip_ssl_verify"`
}

// DataMapping represents data field mapping
type DataMapping struct {
	ID              uuid.UUID              `json:"id"`
	ERPConnectionID uuid.UUID              `json:"erp_connection_id"`
	MappingName     string                 `json:"mapping_name"`
	Description     string                 `json:"description"`
	DataType        string                 `json:"data_type"`
	Direction       SyncDirection          `json:"direction"`
	PyTakeEntity    string                 `json:"pytake_entity"`
	ERPEntity       string                 `json:"erp_entity"`
	FieldMappings   map[string]interface{} `json:"field_mappings"`
	TransformRules  map[string]interface{} `json:"transform_rules,omitempty"`
	ValidationRules map[string]interface{} `json:"validation_rules,omitempty"`
	SyncSettings    SyncSettings           `json:"sync_settings"`
	IsActive        bool                   `json:"is_active"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

// DataMappingConfig represents data mapping configuration
type DataMappingConfig struct {
	ERPConnectionID uuid.UUID              `json:"erp_connection_id" validate:"required"`
	MappingName     string                 `json:"mapping_name" validate:"required"`
	Description     string                 `json:"description"`
	DataType        string                 `json:"data_type" validate:"required"`
	Direction       SyncDirection          `json:"direction" validate:"required"`
	PyTakeEntity    string                 `json:"pytake_entity" validate:"required"`
	ERPEntity       string                 `json:"erp_entity" validate:"required"`
	FieldMappings   map[string]interface{} `json:"field_mappings" validate:"required"`
	TransformRules  map[string]interface{} `json:"transform_rules,omitempty"`
	ValidationRules map[string]interface{} `json:"validation_rules,omitempty"`
	SyncSettings    SyncSettings           `json:"sync_settings"`
	IsActive        bool                   `json:"is_active"`
}

// UpdateDataMappingConfig represents update data mapping configuration
type UpdateDataMappingConfig struct {
	MappingName     *string                `json:"mapping_name,omitempty"`
	Description     *string                `json:"description,omitempty"`
	Direction       *SyncDirection         `json:"direction,omitempty"`
	FieldMappings   map[string]interface{} `json:"field_mappings,omitempty"`
	TransformRules  map[string]interface{} `json:"transform_rules,omitempty"`
	ValidationRules map[string]interface{} `json:"validation_rules,omitempty"`
	SyncSettings    *SyncSettings          `json:"sync_settings,omitempty"`
	IsActive        *bool                  `json:"is_active,omitempty"`
}

// SyncDirection represents sync direction
type SyncDirection string

const (
	SyncDirectionBidirectional SyncDirection = "bidirectional"
	SyncDirectionPyTakeToERP   SyncDirection = "pytake_to_erp"
	SyncDirectionERPToPyTake   SyncDirection = "erp_to_pytake"
)

// SyncSettings represents sync settings
type SyncSettings struct {
	Priority      int                        `json:"priority"`
	SyncFrequency int                        `json:"sync_frequency_seconds"`
	BatchSize     int                        `json:"batch_size"`
	ConflictStrategy ConflictResolutionStrategy `json:"conflict_strategy"`
}

// ConflictResolutionStrategy represents conflict resolution strategies
type ConflictResolutionStrategy string

const (
	ConflictStrategyERPWins        ConflictResolutionStrategy = "erp_wins"
	ConflictStrategyPyTakeWins     ConflictResolutionStrategy = "pytake_wins"
	ConflictStrategyManual         ConflictResolutionStrategy = "manual"
	ConflictStrategyLatestTimestamp ConflictResolutionStrategy = "latest_timestamp"
)

// SyncRequest represents a sync request
type SyncRequest struct {
	ConnectionID    uuid.UUID     `json:"connection_id" validate:"required"`
	MappingIDs      []uuid.UUID   `json:"mapping_ids,omitempty"`
	SyncType        SyncType      `json:"sync_type" validate:"required"`
	Direction       SyncDirection `json:"direction,omitempty"`
	EntityFilters   map[string]interface{} `json:"entity_filters,omitempty"`
	ForceSync       bool          `json:"force_sync"`
	DryRun          bool          `json:"dry_run"`
}

// SyncType represents sync types
type SyncType string

const (
	SyncTypeFull        SyncType = "full"
	SyncTypeIncremental SyncType = "incremental"
	SyncTypeManual      SyncType = "manual"
	SyncTypeRealTime    SyncType = "realtime"
)

// SyncOperation represents a sync operation
type SyncOperation struct {
	ID              uuid.UUID              `json:"id"`
	TenantID        uuid.UUID              `json:"tenant_id"`
	ConnectionID    uuid.UUID              `json:"connection_id"`
	SyncType        SyncType               `json:"sync_type"`
	Direction       SyncDirection          `json:"direction"`
	Status          SyncStatus             `json:"status"`
	StartedAt       time.Time              `json:"started_at"`
	CompletedAt     *time.Time             `json:"completed_at,omitempty"`
	Duration        *time.Duration         `json:"duration,omitempty"`
	Progress        SyncProgress           `json:"progress"`
	Results         SyncResults            `json:"results"`
	ErrorMessage    *string                `json:"error_message,omitempty"`
	Config          map[string]interface{} `json:"config,omitempty"`
}

// SyncStatus represents sync status
type SyncStatus string

const (
	SyncStatusPending   SyncStatus = "pending"
	SyncStatusRunning   SyncStatus = "running"
	SyncStatusCompleted SyncStatus = "completed"
	SyncStatusFailed    SyncStatus = "failed"
	SyncStatusCancelled SyncStatus = "cancelled"
	SyncStatusPartial   SyncStatus = "partial"
)

// SyncProgress represents sync progress
type SyncProgress struct {
	TotalEntities    int     `json:"total_entities"`
	ProcessedEntities int    `json:"processed_entities"`
	SuccessfulEntities int   `json:"successful_entities"`
	FailedEntities   int     `json:"failed_entities"`
	SkippedEntities  int     `json:"skipped_entities"`
	ProgressPercent  float64 `json:"progress_percent"`
	CurrentEntity    string  `json:"current_entity"`
	EstimatedTimeRemaining *time.Duration `json:"estimated_time_remaining,omitempty"`
}

// SyncResults represents sync results
type SyncResults struct {
	RecordsProcessed int                    `json:"records_processed"`
	RecordsSucceeded int                    `json:"records_succeeded"`
	RecordsFailed    int                    `json:"records_failed"`
	RecordsSkipped   int                    `json:"records_skipped"`
	DataSummary      map[string]interface{} `json:"data_summary"`
	FailedRecords    []FailedRecord         `json:"failed_records,omitempty"`
}

// FailedRecord represents a failed sync record
type FailedRecord struct {
	EntityType   string                 `json:"entity_type"`
	EntityID     string                 `json:"entity_id"`
	Operation    string                 `json:"operation"`
	ErrorMessage string                 `json:"error_message"`
	Data         map[string]interface{} `json:"data,omitempty"`
}

// EntitySyncRequest represents entity sync request
type EntitySyncRequest struct {
	ConnectionID uuid.UUID              `json:"connection_id" validate:"required"`
	MappingID    uuid.UUID              `json:"mapping_id" validate:"required"`
	EntityType   string                 `json:"entity_type" validate:"required"`
	EntityID     string                 `json:"entity_id" validate:"required"`
	Operation    string                 `json:"operation" validate:"required"` // create, update, delete
	Data         map[string]interface{} `json:"data"`
	ForceSync    bool                   `json:"force_sync"`
}

// EntitySyncResult represents entity sync result
type EntitySyncResult struct {
	Success      bool                   `json:"success"`
	EntityID     string                 `json:"entity_id"`
	ERPEntityID  string                 `json:"erp_entity_id,omitempty"`
	Operation    string                 `json:"operation"`
	SyncedData   map[string]interface{} `json:"synced_data,omitempty"`
	HasConflict  bool                   `json:"has_conflict"`
	ConflictData *DataConflict          `json:"conflict_data,omitempty"`
	ErrorMessage *string                `json:"error_message,omitempty"`
	ProcessedAt  time.Time              `json:"processed_at"`
}

// DataConflict represents a data conflict
type DataConflict struct {
	Field        string      `json:"field"`
	PyTakeValue  interface{} `json:"pytake_value"`
	ERPValue     interface{} `json:"erp_value"`
	ConflictType string      `json:"conflict_type"`
	Severity     string      `json:"severity"`
}

// ConflictResolution represents conflict resolution
type ConflictResolution struct {
	SyncID         uuid.UUID                  `json:"sync_id"`
	Strategy       ConflictResolutionStrategy `json:"strategy"`
	ManualChoices  map[string]interface{}     `json:"manual_choices,omitempty"`
	ApplyToFuture  bool                       `json:"apply_to_future"`
}

// Webhook represents a webhook configuration
type Webhook struct {
	ID              uuid.UUID              `json:"id"`
	ERPConnectionID uuid.UUID              `json:"erp_connection_id"`
	EventType       string                 `json:"event_type"`
	Direction       WebhookDirection       `json:"direction"`
	TargetURL       *string                `json:"target_url,omitempty"`
	Secret          *string                `json:"secret,omitempty"`
	IsActive        bool                   `json:"is_active"`
	Config          map[string]interface{} `json:"config,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

// WebhookDirection represents webhook direction
type WebhookDirection string

const (
	WebhookDirectionIncoming WebhookDirection = "incoming"
	WebhookDirectionOutgoing WebhookDirection = "outgoing"
)

// WebhookConfig represents webhook configuration
type WebhookConfig struct {
	EventType       string            `json:"event_type" validate:"required"`
	Direction       WebhookDirection  `json:"direction" validate:"required"`
	TargetURL       *string           `json:"target_url,omitempty"`
	Secret          *string           `json:"secret,omitempty"`
	Headers         map[string]string `json:"headers,omitempty"`
	RetryAttempts   int               `json:"retry_attempts"`
	RetryDelay      int               `json:"retry_delay_seconds"`
	Timeout         int               `json:"timeout_seconds"`
	IsActive        bool              `json:"is_active"`
}

// WebhookPayload represents webhook payload
type WebhookPayload struct {
	EventType   string                 `json:"event_type"`
	EntityType  string                 `json:"entity_type"`
	EntityID    string                 `json:"entity_id"`
	Operation   string                 `json:"operation"`
	Data        map[string]interface{} `json:"data"`
	Timestamp   time.Time              `json:"timestamp"`
	Signature   string                 `json:"signature,omitempty"`
	Headers     map[string]string      `json:"headers,omitempty"`
	RequestID   string                 `json:"request_id,omitempty"`
}

// WebhookResult represents webhook processing result
type WebhookResult struct {
	Success      bool                   `json:"success"`
	ProcessedAt  time.Time              `json:"processed_at"`
	EntityID     string                 `json:"entity_id,omitempty"`
	SyncedData   map[string]interface{} `json:"synced_data,omitempty"`
	ErrorMessage *string                `json:"error_message,omitempty"`
	ShouldRetry  bool                   `json:"should_retry"`
}

// TestResult represents connection test result
type TestResult struct {
	Success      bool          `json:"success"`
	ResponseTime time.Duration `json:"response_time"`
	StatusCode   int           `json:"status_code,omitempty"`
	Message      string        `json:"message"`
	Details      map[string]interface{} `json:"details,omitempty"`
	TestedAt     time.Time     `json:"tested_at"`
}

// ValidationResult represents validation result
type ValidationResult struct {
	Valid    bool     `json:"valid"`
	Errors   []string `json:"errors,omitempty"`
	Warnings []string `json:"warnings,omitempty"`
}

// HealthStatus represents connection health status
type HealthStatus struct {
	ConnectionID    uuid.UUID              `json:"connection_id"`
	Status          ConnectionStatus       `json:"status"`
	HealthScore     float64                `json:"health_score"`
	LastCheckAt     time.Time              `json:"last_check_at"`
	ResponseTime    time.Duration          `json:"response_time"`
	ErrorRate       float64                `json:"error_rate"`
	Uptime          time.Duration          `json:"uptime"`
	Issues          []HealthIssue          `json:"issues,omitempty"`
	Metrics         map[string]interface{} `json:"metrics"`
}

// HealthIssue represents a health issue
type HealthIssue struct {
	Type        string    `json:"type"`
	Severity    string    `json:"severity"`
	Message     string    `json:"message"`
	DetectedAt  time.Time `json:"detected_at"`
	Suggestion  string    `json:"suggestion,omitempty"`
}

// SyncMetrics represents sync metrics
type SyncMetrics struct {
	TenantID        uuid.UUID              `json:"tenant_id"`
	DateRange       DateRange              `json:"date_range"`
	TotalSyncs      int                    `json:"total_syncs"`
	SuccessfulSyncs int                    `json:"successful_syncs"`
	FailedSyncs     int                    `json:"failed_syncs"`
	AvgSyncTime     time.Duration          `json:"avg_sync_time"`
	TotalRecords    int64                  `json:"total_records"`
	ErrorRate       float64                `json:"error_rate"`
	ByConnection    map[string]interface{} `json:"by_connection"`
	ByEntity        map[string]interface{} `json:"by_entity"`
	Trends          []MetricTrend          `json:"trends"`
}

// MetricTrend represents a metric trend
type MetricTrend struct {
	Date        time.Time `json:"date"`
	SyncCount   int       `json:"sync_count"`
	SuccessRate float64   `json:"success_rate"`
	RecordCount int64     `json:"record_count"`
	AvgTime     time.Duration `json:"avg_time"`
}

// SystemStatus represents overall system status
type SystemStatus struct {
	TenantID            uuid.UUID                      `json:"tenant_id"`
	OverallStatus       string                         `json:"overall_status"`
	ActiveConnections   int                            `json:"active_connections"`
	InactiveConnections int                            `json:"inactive_connections"`
	ErrorConnections    int                            `json:"error_connections"`
	RunningSyncs        int                            `json:"running_syncs"`
	QueuedSyncs         int                            `json:"queued_syncs"`
	LastSyncAt          *time.Time                     `json:"last_sync_at,omitempty"`
	ConnectionStatuses  map[string]ConnectionStatus    `json:"connection_statuses"`
	SystemHealth        float64                        `json:"system_health"`
	Issues              []SystemIssue                  `json:"issues,omitempty"`
	Recommendations     []string                       `json:"recommendations,omitempty"`
}

// SystemIssue represents a system issue
type SystemIssue struct {
	Type        string    `json:"type"`
	Severity    string    `json:"severity"`
	Component   string    `json:"component"`
	Message     string    `json:"message"`
	DetectedAt  time.Time `json:"detected_at"`
	Suggestion  string    `json:"suggestion,omitempty"`
}

// Filter Structures

// ConnectionFilter represents connection filter
type ConnectionFilter struct {
	ERPType     *ERPType          `json:"erp_type,omitempty"`
	Status      *ConnectionStatus `json:"status,omitempty"`
	Search      string            `json:"search,omitempty"`
	CreatedFrom *time.Time        `json:"created_from,omitempty"`
	CreatedTo   *time.Time        `json:"created_to,omitempty"`
}

// MappingFilter represents mapping filter
type MappingFilter struct {
	ConnectionID *uuid.UUID     `json:"connection_id,omitempty"`
	DataType     string         `json:"data_type,omitempty"`
	Direction    *SyncDirection `json:"direction,omitempty"`
	IsActive     *bool          `json:"is_active,omitempty"`
}

// SyncHistoryFilter represents sync history filter
type SyncHistoryFilter struct {
	ConnectionID *uuid.UUID  `json:"connection_id,omitempty"`
	SyncType     *SyncType   `json:"sync_type,omitempty"`
	Status       *SyncStatus `json:"status,omitempty"`
	From         *time.Time  `json:"from,omitempty"`
	To           *time.Time  `json:"to,omitempty"`
	Limit        int         `json:"limit,omitempty"`
	Offset       int         `json:"offset,omitempty"`
}

// Additional Structures

// EntitySchema represents entity schema information
type EntitySchema struct {
	EntityType  string                 `json:"entity_type"`
	Fields      map[string]FieldSchema `json:"fields"`
	Required    []string               `json:"required"`
	PrimaryKey  string                 `json:"primary_key"`
	Indexes     []string               `json:"indexes"`
	Relations   []RelationSchema       `json:"relations"`
}

// FieldSchema represents field schema
type FieldSchema struct {
	Type        string      `json:"type"`
	MaxLength   *int        `json:"max_length,omitempty"`
	Nullable    bool        `json:"nullable"`
	Default     interface{} `json:"default,omitempty"`
	Options     []string    `json:"options,omitempty"`
	Format      string      `json:"format,omitempty"`
	Description string      `json:"description"`
}

// RelationSchema represents relation schema
type RelationSchema struct {
	Type         string `json:"type"`
	TargetEntity string `json:"target_entity"`
	ForeignKey   string `json:"foreign_key"`
	Required     bool   `json:"required"`
}

// ConnectorCapabilities represents connector capabilities
type ConnectorCapabilities struct {
	SupportedOperations []string          `json:"supported_operations"`
	SupportedEntities   []string          `json:"supported_entities"`
	MaxBatchSize        int               `json:"max_batch_size"`
	RateLimit           int               `json:"rate_limit"`
	SupportsWebhooks    bool              `json:"supports_webhooks"`
	SupportsRealTime    bool              `json:"supports_real_time"`
	Features            map[string]bool   `json:"features"`
	Limitations         []string          `json:"limitations"`
}

// BulkResult represents bulk operation result
type BulkResult struct {
	TotalRecords     int            `json:"total_records"`
	SuccessfulRecords int           `json:"successful_records"`
	FailedRecords    int            `json:"failed_records"`
	Errors           []BulkError    `json:"errors,omitempty"`
	ProcessingTime   time.Duration  `json:"processing_time"`
}

// BulkError represents bulk operation error
type BulkError struct {
	Index        int    `json:"index"`
	EntityID     string `json:"entity_id,omitempty"`
	ErrorMessage string `json:"error_message"`
	ErrorCode    string `json:"error_code,omitempty"`
}

// Credentials represents authentication credentials
type Credentials struct {
	Type         AuthType               `json:"type"`
	Data         map[string]interface{} `json:"data"`
	ExpiresAt    *time.Time             `json:"expires_at,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// CredentialInfo represents credential information
type CredentialInfo struct {
	ID          uuid.UUID  `json:"id"`
	Type        AuthType   `json:"type"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
}

// AuthInfo represents authentication information
type AuthInfo struct {
	Type        AuthType   `json:"type"`
	Valid       bool       `json:"valid"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	Scopes      []string   `json:"scopes,omitempty"`
	LastRefresh *time.Time `json:"last_refresh,omitempty"`
}

// SyncEvent represents a real-time sync event
type SyncEvent struct {
	EventType   string                 `json:"event_type"`
	EntityType  string                 `json:"entity_type"`
	EntityID    string                 `json:"entity_id"`
	Operation   string                 `json:"operation"`
	Data        map[string]interface{} `json:"data"`
	Source      string                 `json:"source"`
	Timestamp   time.Time              `json:"timestamp"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// SyncSchedule represents sync schedule
type SyncSchedule struct {
	ConnectionID uuid.UUID     `json:"connection_id"`
	SyncType     SyncType      `json:"sync_type"`
	Direction    SyncDirection `json:"direction"`
	Schedule     string        `json:"schedule"` // cron expression
	IsActive     bool          `json:"is_active"`
	Config       map[string]interface{} `json:"config,omitempty"`
}

// DateRange represents a date range
type DateRange struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}

// ValidationRules represents validation rules
type ValidationRules struct {
	RequiredFields []string               `json:"required_fields"`
	FieldTypes     map[string]string      `json:"field_types"`
	CustomRules    map[string]interface{} `json:"custom_rules"`
}

// Field Mapping Types

// TransformDirection represents transformation direction
type TransformDirection string

const (
	TransformDirectionPyTakeToERP TransformDirection = "pytake_to_erp"
	TransformDirectionERPToPyTake TransformDirection = "erp_to_pytake"
)

// ValidationError represents a validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Type    string `json:"type"`
}

// MappingTestResult represents mapping test result
type MappingTestResult struct {
	MappingID          uuid.UUID              `json:"mapping_id"`
	Direction          TransformDirection     `json:"direction"`
	SourceData         map[string]interface{} `json:"source_data"`
	TransformedData    map[string]interface{} `json:"transformed_data,omitempty"`
	Success            bool                   `json:"success"`
	ErrorMessage       *string                `json:"error_message,omitempty"`
	TransformationTime time.Duration          `json:"transformation_time"`
	Analysis           map[string]interface{} `json:"analysis,omitempty"`
	TestedAt           time.Time              `json:"tested_at"`
}

// TransformationInfo represents transformation information
type TransformationInfo struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
	Examples    []string               `json:"examples"`
}

// MappingStats represents mapping statistics
type MappingStats struct {
	TenantID                   uuid.UUID              `json:"tenant_id"`
	DateRange                  *DateRange             `json:"date_range,omitempty"`
	TotalMappings              int64                  `json:"total_mappings"`
	ActiveMappings             int64                  `json:"active_mappings"`
	MappingsByDirection        map[string]int64       `json:"mappings_by_direction"`
	TotalTransformations       int64                  `json:"total_transformations"`
	SuccessfulTransformations  int64                  `json:"successful_transformations"`
	FailedTransformations      int64                  `json:"failed_transformations"`
	AvgTransformationTime      float64                `json:"avg_transformation_time_ms"`
}

// MappingUsage represents mapping usage analytics
type MappingUsage struct {
	MappingID       uuid.UUID  `json:"mapping_id"`
	DateRange       *DateRange `json:"date_range,omitempty"`
	TotalUsage      int64      `json:"total_usage"`
	SuccessfulUsage int64      `json:"successful_usage"`
	FailedUsage     int64      `json:"failed_usage"`
	LastUsedAt      *time.Time `json:"last_used_at,omitempty"`
}