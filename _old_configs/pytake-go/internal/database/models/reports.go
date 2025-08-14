package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// Report represents a generated report
type Report struct {
	BaseModel
	TenantModel

	// Report Information
	Name        string    `json:"name" gorm:"not null;size:255" validate:"required,min=2,max=255"`
	Type        string    `json:"type" gorm:"not null" validate:"required,oneof=conversations messages campaigns erp custom"`
	Format      string    `json:"format" gorm:"not null" validate:"required,oneof=json csv pdf excel"`
	Description string    `json:"description" gorm:"size:1000"`

	// Generation Status
	Status      string     `json:"status" gorm:"not null;default:'pending'" validate:"oneof=pending generating completed failed expired"`
	Progress    int        `json:"progress" gorm:"default:0"`
	Error       *string    `json:"error,omitempty"`
	GeneratedAt *time.Time `json:"generated_at,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`

	// File Information
	FilePath    string `json:"file_path"`
	FileSize    int64  `json:"file_size" gorm:"default:0"`
	DownloadURL string `json:"download_url"`
	RowCount    int64  `json:"row_count" gorm:"default:0"`

	// Report Configuration
	FromDate time.Time              `json:"from_date" gorm:"not null"`
	ToDate   time.Time              `json:"to_date" gorm:"not null"`
	Filters  JSON                   `json:"filters" gorm:"type:jsonb"`
	GroupBy  pq.StringArray         `json:"group_by" gorm:"type:text[]"`
	Metrics  pq.StringArray         `json:"metrics" gorm:"type:text[]"`
	Settings map[string]interface{} `json:"settings" gorm:"type:jsonb"`

	// Access Control
	RequestedBy  uuid.UUID `json:"requested_by" gorm:"type:uuid;not null"`
	IsPublic     bool      `json:"is_public" gorm:"default:false"`
	SharedWith   JSON      `json:"shared_with" gorm:"type:jsonb"`
	AccessLevel  string    `json:"access_level" gorm:"default:'private'" validate:"oneof=private shared public"`

	// Performance Metrics
	GenerationTime *time.Duration `json:"generation_time,omitempty"`
	DownloadCount  int64          `json:"download_count" gorm:"default:0"`
	LastDownloadAt *time.Time     `json:"last_download_at,omitempty"`

	// Metadata
	Metadata JSON `json:"metadata" gorm:"type:jsonb"`
	Tags     pq.StringArray `json:"tags" gorm:"type:text[]"`

	// Relationships
	RequestedUser *User `json:"requested_user,omitempty" gorm:"foreignKey:RequestedBy;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
}

// TableName returns the table name for Report
func (Report) TableName() string {
	return "reports"
}

// ScheduledReport represents a recurring report configuration
type ScheduledReport struct {
	BaseModel
	TenantModel

	// Schedule Information
	Name        string `json:"name" gorm:"not null;size:255" validate:"required,min=2,max=255"`
	Description string `json:"description" gorm:"size:1000"`
	Type        string `json:"type" gorm:"not null" validate:"required,oneof=conversations messages campaigns erp custom"`
	Format      string `json:"format" gorm:"not null" validate:"required,oneof=json csv pdf excel"`

	// Schedule Configuration
	Frequency   string `json:"frequency" gorm:"not null" validate:"required,oneof=daily weekly monthly quarterly yearly"`
	DayOfWeek   int    `json:"day_of_week" gorm:"default:1"`   // 1-7, Monday=1
	DayOfMonth  int    `json:"day_of_month" gorm:"default:1"`  // 1-31
	DayOfYear   int    `json:"day_of_year" gorm:"default:1"`   // 1-365
	Time        string `json:"time" gorm:"default:'08:00'"`    // HH:MM format
	Timezone    string `json:"timezone" gorm:"default:'UTC'"`

	// Report Configuration
	DateRange   string                 `json:"date_range" gorm:"default:'last_30_days'"` // last_7_days, last_30_days, last_month, etc.
	Filters     JSON                   `json:"filters" gorm:"type:jsonb"`
	GroupBy     pq.StringArray         `json:"group_by" gorm:"type:text[]"`
	Metrics     pq.StringArray         `json:"metrics" gorm:"type:text[]"`
	Settings    map[string]interface{} `json:"settings" gorm:"type:jsonb"`

	// Email Configuration
	EmailEnabled     bool           `json:"email_enabled" gorm:"default:true"`
	EmailRecipients  pq.StringArray `json:"email_recipients" gorm:"type:text[]"`
	EmailSubject     string         `json:"email_subject"`
	EmailMessage     string         `json:"email_message" gorm:"type:text"`
	EmailFormat      string         `json:"email_format" gorm:"default:'html'" validate:"oneof=html text"`
	IncludeAttachment bool          `json:"include_attachment" gorm:"default:true"`

	// Status and Control
	IsActive       bool       `json:"is_active" gorm:"default:true"`
	LastRun        *time.Time `json:"last_run,omitempty"`
	NextRun        *time.Time `json:"next_run,omitempty"`
	RunCount       int64      `json:"run_count" gorm:"default:0"`
	SuccessCount   int64      `json:"success_count" gorm:"default:0"`
	FailureCount   int64      `json:"failure_count" gorm:"default:0"`
	LastError      *string    `json:"last_error,omitempty"`
	LastErrorAt    *time.Time `json:"last_error_at,omitempty"`

	// Access Control
	CreatedBy   uuid.UUID      `json:"created_by" gorm:"type:uuid;not null"`
	SharedWith  JSON           `json:"shared_with" gorm:"type:jsonb"`
	AccessLevel string         `json:"access_level" gorm:"default:'private'" validate:"oneof=private shared public"`

	// Storage Configuration
	RetentionDays int  `json:"retention_days" gorm:"default:30"`
	AutoCleanup   bool `json:"auto_cleanup" gorm:"default:true"`

	// Metadata
	Metadata JSON           `json:"metadata" gorm:"type:jsonb"`
	Tags     pq.StringArray `json:"tags" gorm:"type:text[]"`

	// Relationships
	Creator        *User   `json:"creator,omitempty" gorm:"foreignKey:CreatedBy;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
	GeneratedReports []Report `json:"generated_reports,omitempty" gorm:"foreignKey:ScheduleID"`
}

// TableName returns the table name for ScheduledReport
func (ScheduledReport) TableName() string {
	return "scheduled_reports"
}

// ReportTemplate represents a reusable report template
type ReportTemplate struct {
	BaseModel

	// Template Information
	Name        string `json:"name" gorm:"not null;size:255" validate:"required,min=2,max=255"`
	Description string `json:"description" gorm:"size:1000"`
	Type        string `json:"type" gorm:"not null" validate:"required,oneof=conversations messages campaigns erp custom"`
	Category    string `json:"category" gorm:"not null"`
	Industry    string `json:"industry"`

	// Template Configuration
	Definition  JSON           `json:"definition" gorm:"type:jsonb;not null"`
	Variables   JSON           `json:"variables" gorm:"type:jsonb"`
	DefaultFilters JSON        `json:"default_filters" gorm:"type:jsonb"`
	DefaultMetrics pq.StringArray `json:"default_metrics" gorm:"type:text[]"`

	// Template Metadata
	Tags          pq.StringArray `json:"tags" gorm:"type:text[]"`
	Difficulty    string         `json:"difficulty" gorm:"default:'beginner'" validate:"oneof=beginner intermediate advanced"`
	EstimatedTime int            `json:"estimated_time"` // in minutes
	PreviewImage  *string        `json:"preview_image,omitempty"`

	// Usage Statistics
	UsageCount   int     `json:"usage_count" gorm:"default:0"`
	Rating       float64 `json:"rating" gorm:"default:0"`
	RatingCount  int     `json:"rating_count" gorm:"default:0"`

	// Access Control
	IsPublic    bool       `json:"is_public" gorm:"default:false"`
	CreatedBy   *uuid.UUID `json:"created_by,omitempty" gorm:"type:uuid"`
	AccessLevel string     `json:"access_level" gorm:"default:'public'" validate:"oneof=private shared public"`

	// Versioning
	Version     int    `json:"version" gorm:"default:1"`
	ChangeLog   string `json:"change_log" gorm:"type:text"`
	IsLatest    bool   `json:"is_latest" gorm:"default:true"`

	// Metadata
	Metadata JSON `json:"metadata" gorm:"type:jsonb"`

	// Relationships
	Creator *User `json:"creator,omitempty" gorm:"foreignKey:CreatedBy;constraint:OnUpdate:CASCADE,OnDelete:SET NULL"`
}

// TableName returns the table name for ReportTemplate
func (ReportTemplate) TableName() string {
	return "report_templates"
}

// ReportSubscription represents a user's subscription to scheduled reports
type ReportSubscription struct {
	BaseModel
	TenantModel

	// Subscription Information
	ScheduleID  uuid.UUID `json:"schedule_id" gorm:"type:uuid;not null;index"`
	UserID      uuid.UUID `json:"user_id" gorm:"type:uuid;not null;index"`
	Email       string    `json:"email" gorm:"not null;size:255"`

	// Subscription Settings
	IsActive        bool   `json:"is_active" gorm:"default:true"`
	DeliveryFormat  string `json:"delivery_format" gorm:"default:'email'" validate:"oneof=email webhook dashboard"`
	NotifyOnFailure bool   `json:"notify_on_failure" gorm:"default:true"`
	NotifyOnSuccess bool   `json:"notify_on_success" gorm:"default:false"`

	// Webhook Configuration (if delivery_format = webhook)
	WebhookURL    *string `json:"webhook_url,omitempty"`
	WebhookSecret *string `json:"webhook_secret,omitempty"`

	// Statistics
	DeliveryCount   int64      `json:"delivery_count" gorm:"default:0"`
	LastDelivery    *time.Time `json:"last_delivery,omitempty"`
	FailureCount    int64      `json:"failure_count" gorm:"default:0"`
	LastFailure     *time.Time `json:"last_failure,omitempty"`

	// Metadata
	Metadata JSON `json:"metadata" gorm:"type:jsonb"`

	// Relationships
	Schedule *ScheduledReport `json:"schedule,omitempty" gorm:"foreignKey:ScheduleID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	User     *User            `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

// TableName returns the table name for ReportSubscription
func (ReportSubscription) TableName() string {
	return "report_subscriptions"
}

// ReportExport represents a report export job
type ReportExport struct {
	BaseModel
	TenantModel

	// Export Information
	ReportID    uuid.UUID `json:"report_id" gorm:"type:uuid;not null;index"`
	ExportType  string    `json:"export_type" gorm:"not null" validate:"required,oneof=pdf excel csv json"`
	Status      string    `json:"status" gorm:"not null;default:'pending'" validate:"oneof=pending processing completed failed"`

	// Export Configuration
	Parameters  JSON    `json:"parameters" gorm:"type:jsonb"`
	Template    *string `json:"template,omitempty"`
	Formatting  JSON    `json:"formatting" gorm:"type:jsonb"`

	// File Information
	FilePath    string `json:"file_path"`
	FileSize    int64  `json:"file_size" gorm:"default:0"`
	DownloadURL string `json:"download_url"`
	ContentType string `json:"content_type"`

	// Processing Information
	StartedAt    *time.Time     `json:"started_at,omitempty"`
	CompletedAt  *time.Time     `json:"completed_at,omitempty"`
	ExpiresAt    *time.Time     `json:"expires_at,omitempty"`
	ProcessingTime *time.Duration `json:"processing_time,omitempty"`
	Progress     int            `json:"progress" gorm:"default:0"`
	Error        *string        `json:"error,omitempty"`

	// Access Control
	RequestedBy  uuid.UUID `json:"requested_by" gorm:"type:uuid;not null"`
	DownloadCount int64    `json:"download_count" gorm:"default:0"`
	LastDownloadAt *time.Time `json:"last_download_at,omitempty"`

	// Metadata
	Metadata JSON `json:"metadata" gorm:"type:jsonb"`

	// Relationships
	Report        *Report `json:"report,omitempty" gorm:"foreignKey:ReportID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	RequestedUser *User   `json:"requested_user,omitempty" gorm:"foreignKey:RequestedBy;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
}

// TableName returns the table name for ReportExport
func (ReportExport) TableName() string {
	return "report_exports"
}

// ReportStatus represents the status of a report
type ReportStatus string

const (
	ReportStatusPending    ReportStatus = "pending"
	ReportStatusGenerating ReportStatus = "generating"
	ReportStatusCompleted  ReportStatus = "completed"
	ReportStatusFailed     ReportStatus = "failed"
	ReportStatusExpired    ReportStatus = "expired"
)

// ReportType represents the type of report
type ReportType string

const (
	ReportTypeConversations ReportType = "conversations"
	ReportTypeMessages      ReportType = "messages"
	ReportTypeCampaigns     ReportType = "campaigns"
	ReportTypeERP           ReportType = "erp"
	ReportTypeCustom        ReportType = "custom"
)

// ReportFormat represents the format of a report
type ReportFormat string

const (
	ReportFormatJSON  ReportFormat = "json"
	ReportFormatCSV   ReportFormat = "csv"
	ReportFormatPDF   ReportFormat = "pdf"
	ReportFormatExcel ReportFormat = "excel"
)

// ScheduleFrequency represents the frequency of scheduled reports
type ScheduleFrequency string

const (
	FrequencyDaily     ScheduleFrequency = "daily"
	FrequencyWeekly    ScheduleFrequency = "weekly"
	FrequencyMonthly   ScheduleFrequency = "monthly"
	FrequencyQuarterly ScheduleFrequency = "quarterly"
	FrequencyYearly    ScheduleFrequency = "yearly"
)

// IsExpired checks if the report has expired
func (r *Report) IsExpired() bool {
	return r.ExpiresAt != nil && r.ExpiresAt.Before(time.Now())
}

// IsCompleted checks if the report generation is completed
func (r *Report) IsCompleted() bool {
	return r.Status == string(ReportStatusCompleted)
}

// CanBeDownloaded checks if the report can be downloaded
func (r *Report) CanBeDownloaded() bool {
	return r.IsCompleted() && !r.IsExpired() && r.FilePath != ""
}

// GetEstimatedSize estimates the report size based on row count
func (r *Report) GetEstimatedSize() int64 {
	if r.FileSize > 0 {
		return r.FileSize
	}
	
	// Rough estimation based on format and row count
	switch r.Format {
	case string(ReportFormatCSV):
		return r.RowCount * 100 // ~100 bytes per row
	case string(ReportFormatJSON):
		return r.RowCount * 200 // ~200 bytes per row
	case string(ReportFormatExcel):
		return r.RowCount * 150 // ~150 bytes per row
	case string(ReportFormatPDF):
		return r.RowCount * 50 // ~50 bytes per row
	default:
		return r.RowCount * 100
	}
}

// ShouldRun checks if a scheduled report should run now
func (sr *ScheduledReport) ShouldRun() bool {
	if !sr.IsActive {
		return false
	}
	
	if sr.NextRun == nil {
		return true
	}
	
	return sr.NextRun.Before(time.Now())
}

// CalculateNextRun calculates the next run time for a scheduled report
func (sr *ScheduledReport) CalculateNextRun() time.Time {
	now := time.Now()
	
	switch sr.Frequency {
	case string(FrequencyDaily):
		return now.AddDate(0, 0, 1)
	case string(FrequencyWeekly):
		return now.AddDate(0, 0, 7)
	case string(FrequencyMonthly):
		return now.AddDate(0, 1, 0)
	case string(FrequencyQuarterly):
		return now.AddDate(0, 3, 0)
	case string(FrequencyYearly):
		return now.AddDate(1, 0, 0)
	default:
		return now.AddDate(0, 0, 1) // Default to daily
	}
}

// UpdateStats updates the run statistics
func (sr *ScheduledReport) UpdateStats(success bool, errorMsg *string) {
	sr.RunCount++
	sr.LastRun = &time.Time{}
	*sr.LastRun = time.Now()
	
	if success {
		sr.SuccessCount++
		sr.LastError = nil
		sr.LastErrorAt = nil
	} else {
		sr.FailureCount++
		sr.LastError = errorMsg
		now := time.Now()
		sr.LastErrorAt = &now
	}
	
	// Calculate next run
	nextRun := sr.CalculateNextRun()
	sr.NextRun = &nextRun
}

// GetSuccessRate calculates the success rate of scheduled report runs
func (sr *ScheduledReport) GetSuccessRate() float64 {
	if sr.RunCount == 0 {
		return 0
	}
	return float64(sr.SuccessCount) / float64(sr.RunCount) * 100
}