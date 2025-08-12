package reports

import (
	"bytes"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/logger"
	"gorm.io/gorm"
)

// Handler handles reports-related HTTP requests
type Handler struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewHandler creates a new reports handler
func NewHandler(db *gorm.DB, log *logger.Logger) *Handler {
	return &Handler{
		db:  db,
		log: log,
	}
}

// ReportRequest represents a report generation request
type ReportRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Type        string                 `json:"type" binding:"required,oneof=conversations messages campaigns erp custom"`
	Format      string                 `json:"format" binding:"required,oneof=json csv pdf excel"`
	DateRange   *DateRange             `json:"date_range,omitempty"`
	Filters     map[string]interface{} `json:"filters,omitempty"`
	GroupBy     []string               `json:"group_by,omitempty"`
	Metrics     []string               `json:"metrics,omitempty"`
	Schedule    *ScheduleConfig        `json:"schedule,omitempty"`
	Email       *EmailConfig           `json:"email,omitempty"`
}

type DateRange struct {
	From     string `json:"from" binding:"required"`
	To       string `json:"to" binding:"required"`
	Timezone string `json:"timezone,omitempty"`
}

type ScheduleConfig struct {
	Enabled   bool   `json:"enabled"`
	Frequency string `json:"frequency,omitempty"` // daily, weekly, monthly
	DayOfWeek int    `json:"day_of_week,omitempty"` // 0-6, Sunday=0
	DayOfMonth int   `json:"day_of_month,omitempty"` // 1-31
	Time       string `json:"time,omitempty"` // HH:MM format
}

type EmailConfig struct {
	Recipients []string `json:"recipients" binding:"required,min=1"`
	Subject    string   `json:"subject"`
	Message    string   `json:"message,omitempty"`
}

// ReportResponse represents a report generation response
type ReportResponse struct {
	ID          uuid.UUID              `json:"id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	Format      string                 `json:"format"`
	Status      string                 `json:"status"`
	Progress    int                    `json:"progress"`
	URL         string                 `json:"url,omitempty"`
	Size        int64                  `json:"size,omitempty"`
	RowCount    int64                  `json:"row_count,omitempty"`
	Error       string                 `json:"error,omitempty"`
	GeneratedAt *time.Time             `json:"generated_at,omitempty"`
	ExpiresAt   *time.Time             `json:"expires_at,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// ConversationReportData represents conversation report data
type ConversationReportData struct {
	Period                string    `json:"period"`
	TotalConversations    int64     `json:"total_conversations"`
	NewConversations      int64     `json:"new_conversations"`
	ActiveConversations   int64     `json:"active_conversations"`
	ClosedConversations   int64     `json:"closed_conversations"`
	AverageResponseTime   float64   `json:"avg_response_time_minutes"`
	AverageResolutionTime float64   `json:"avg_resolution_time_minutes"`
	CustomerSatisfaction  float64   `json:"customer_satisfaction"`
	AgentPerformance      []AgentPerformance `json:"agent_performance,omitempty"`
}

type AgentPerformance struct {
	AgentID             uuid.UUID `json:"agent_id"`
	AgentName           string    `json:"agent_name"`
	ConversationsHandled int64    `json:"conversations_handled"`
	AverageResponseTime float64   `json:"avg_response_time"`
	CustomerRating      float64   `json:"customer_rating"`
	ResolutionRate      float64   `json:"resolution_rate"`
}

// CampaignReportData represents campaign report data
type CampaignReportData struct {
	Period            string              `json:"period"`
	TotalCampaigns    int64               `json:"total_campaigns"`
	ActiveCampaigns   int64               `json:"active_campaigns"`
	CompletedCampaigns int64              `json:"completed_campaigns"`
	TotalMessagesSent int64               `json:"total_messages_sent"`
	DeliveryRate      float64             `json:"delivery_rate"`
	OpenRate          float64             `json:"open_rate"`
	ClickRate         float64             `json:"click_rate"`
	ConversionRate    float64             `json:"conversion_rate"`
	CampaignDetails   []CampaignDetail    `json:"campaign_details,omitempty"`
}

type CampaignDetail struct {
	CampaignID    uuid.UUID `json:"campaign_id"`
	CampaignName  string    `json:"campaign_name"`
	MessagesSent  int64     `json:"messages_sent"`
	Delivered     int64     `json:"delivered"`
	Opened        int64     `json:"opened"`
	Clicked       int64     `json:"clicked"`
	Converted     int64     `json:"converted"`
	Cost          float64   `json:"cost"`
	ROI           float64   `json:"roi"`
}

// GenerateReport generates a new report
// @Summary Generate report
// @Description Generate a new report based on specified criteria
// @Tags Reports
// @Accept json
// @Produce json
// @Security Bearer
// @Param report body ReportRequest true "Report configuration"
// @Success 202 {object} ReportResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /reports/generate [post]
func (h *Handler) GenerateReport(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	var req ReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tid, _ := uuid.Parse(tenantID)
	userID := c.GetString("user_id")
	uid, _ := uuid.Parse(userID)

	// Parse date range
	var fromDate, toDate time.Time
	var err error
	if req.DateRange != nil {
		fromDate, err = time.Parse("2006-01-02", req.DateRange.From)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid from date format (YYYY-MM-DD expected)"})
			return
		}
		toDate, err = time.Parse("2006-01-02", req.DateRange.To)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid to date format (YYYY-MM-DD expected)"})
			return
		}
	} else {
		// Default to last 30 days
		toDate = time.Now()
		fromDate = toDate.AddDate(0, 0, -30)
	}

	// Create report record
	reportID := uuid.New()
	expiresAt := time.Now().Add(7 * 24 * time.Hour) // 7 days

	report := &models.Report{
		Name:        req.Name,
		Type:        req.Type,
		Format:      req.Format,
		Status:      "pending",
		Progress:    0,
		FromDate:    fromDate,
		ToDate:      toDate,
		Filters:     req.Filters,
		GroupBy:     req.GroupBy,
		Metrics:     req.Metrics,
		RequestedBy: uid,
		ExpiresAt:   &expiresAt,
	}
	report.ID = reportID
	report.TenantID = tid

	if err := h.db.Create(report).Error; err != nil {
		h.log.Error("Failed to create report", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create report"})
		return
	}

	// Start report generation asynchronously
	go h.generateReportAsync(report, req)

	c.JSON(http.StatusAccepted, ReportResponse{
		ID:          reportID,
		Name:        req.Name,
		Type:        req.Type,
		Format:      req.Format,
		Status:      "pending",
		Progress:    0,
		ExpiresAt:   &expiresAt,
	})
}

// GetReports retrieves all reports
// @Summary List reports
// @Description Get list of generated reports
// @Tags Reports
// @Accept json
// @Produce json
// @Security Bearer
// @Param type query string false "Filter by report type"
// @Param status query string false "Filter by status" Enums(pending,generating,completed,failed,expired)
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {array} models.Report
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /reports [get]
func (h *Handler) GetReports(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)

	// Parse query parameters
	reportType := c.Query("type")
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Build query
	query := h.db.Model(&models.Report{}).Where("tenant_id = ?", tid)

	if reportType != "" {
		query = query.Where("type = ?", reportType)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Count total
	var total int64
	query.Count(&total)

	// Fetch reports
	var reports []models.Report
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&reports).Error; err != nil {
		h.log.Error("Failed to fetch reports", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reports"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reports":  reports,
		"total":    total,
		"page":     page,
		"limit":    limit,
		"has_more": total > int64(page*limit),
	})
}

// GetReport retrieves a specific report
// @Summary Get report
// @Description Get report details and status
// @Tags Reports
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Report ID" format(uuid)
// @Success 200 {object} models.Report
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /reports/{id} [get]
func (h *Handler) GetReport(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	reportID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	rid, err := uuid.Parse(reportID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report ID"})
		return
	}

	var report models.Report
	if err := h.db.Where("id = ? AND tenant_id = ?", rid, tid).First(&report).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Report not found"})
			return
		}
		h.log.Error("Failed to fetch report", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch report"})
		return
	}

	c.JSON(http.StatusOK, report)
}

// DownloadReport downloads a generated report file
// @Summary Download report
// @Description Download generated report file
// @Tags Reports
// @Produce application/octet-stream
// @Security Bearer
// @Param id path string true "Report ID" format(uuid)
// @Success 200 {file} binary
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /reports/{id}/download [get]
func (h *Handler) DownloadReport(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	reportID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	rid, err := uuid.Parse(reportID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report ID"})
		return
	}

	var report models.Report
	if err := h.db.Where("id = ? AND tenant_id = ?", rid, tid).First(&report).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Report not found"})
			return
		}
		h.log.Error("Failed to fetch report", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch report"})
		return
	}

	if report.Status != "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Report not ready for download"})
		return
	}

	if report.FilePath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Report file not found"})
		return
	}

	// Set appropriate headers
	filename := fmt.Sprintf("%s_%s.%s", report.Name, report.CreatedAt.Format("20060102"), report.Format)
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Header("Content-Type", h.getContentType(report.Format))

	// Serve file
	c.File(report.FilePath)
}

// DeleteReport deletes a report
// @Summary Delete report
// @Description Delete a generated report
// @Tags Reports
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Report ID" format(uuid)
// @Success 204 "Report deleted"
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /reports/{id} [delete]
func (h *Handler) DeleteReport(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	reportID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	rid, err := uuid.Parse(reportID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report ID"})
		return
	}

	result := h.db.Where("id = ? AND tenant_id = ?", rid, tid).Delete(&models.Report{})
	if result.Error != nil {
		h.log.Error("Failed to delete report", "error", result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete report"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Report not found"})
		return
	}

	c.Status(http.StatusNoContent)
}

// GetConversationReport generates conversation analytics report
// @Summary Get conversation report
// @Description Get conversation analytics for specified period
// @Tags Reports
// @Accept json
// @Produce json
// @Security Bearer
// @Param from_date query string false "Start date (YYYY-MM-DD)"
// @Param to_date query string false "End date (YYYY-MM-DD)"
// @Param agent_id query string false "Filter by agent ID" format(uuid)
// @Param department query string false "Filter by department"
// @Success 200 {object} ConversationReportData
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /reports/conversations [get]
func (h *Handler) GetConversationReport(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)

	// Parse date range
	fromDate, toDate := h.parseDateRange(c)
	agentID := c.Query("agent_id")
	department := c.Query("department")

	// Base query for conversations
	query := h.db.Model(&models.Conversation{}).Where("tenant_id = ?", tid)

	if !fromDate.IsZero() {
		query = query.Where("created_at >= ?", fromDate)
	}
	if !toDate.IsZero() {
		query = query.Where("created_at <= ?", toDate)
	}
	if agentID != "" {
		if aid, err := uuid.Parse(agentID); err == nil {
			query = query.Where("assigned_to = ?", aid)
		}
	}
	if department != "" {
		query = query.Where("department = ?", department)
	}

	// Get conversation counts by status
	type ConversationCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}

	var statusCounts []ConversationCount
	query.Select("status, COUNT(*) as count").Group("status").Scan(&statusCounts)

	var totalConversations, activeConversations, closedConversations int64
	for _, sc := range statusCounts {
		totalConversations += sc.Count
		if sc.Status == "open" || sc.Status == "in_progress" || sc.Status == "waiting" {
			activeConversations += sc.Count
		} else if sc.Status == "closed" || sc.Status == "resolved" {
			closedConversations += sc.Count
		}
	}

	// Calculate average response and resolution times
	type TimeStats struct {
		AvgResponseTime   float64 `json:"avg_response_time"`
		AvgResolutionTime float64 `json:"avg_resolution_time"`
	}

	var timeStats TimeStats
	h.db.Raw(`
		SELECT 
			AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))/60) as avg_response_time,
			AVG(CASE WHEN ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (ended_at - started_at))/60 END) as avg_resolution_time
		FROM conversations 
		WHERE tenant_id = ? AND created_at BETWEEN ? AND ?
	`, tid, fromDate, toDate).Scan(&timeStats)

	// Get agent performance if not filtered by specific agent
	var agentPerformance []AgentPerformance
	if agentID == "" {
		h.db.Raw(`
			SELECT 
				u.id as agent_id,
				u.name as agent_name,
				COUNT(c.id) as conversations_handled,
				AVG(EXTRACT(EPOCH FROM (c.first_response_at - c.created_at))/60) as avg_response_time,
				AVG(c.rating) as customer_rating,
				(COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END) * 100.0 / COUNT(c.id)) as resolution_rate
			FROM conversations c
			JOIN users u ON u.id = c.assigned_to
			WHERE c.tenant_id = ? AND c.created_at BETWEEN ? AND ?
			GROUP BY u.id, u.name
			ORDER BY conversations_handled DESC
		`, tid, fromDate, toDate).Scan(&agentPerformance)
	}

	// Calculate average customer satisfaction
	var avgSatisfaction float64
	h.db.Model(&models.Conversation{}).
		Where("tenant_id = ? AND rating > 0 AND created_at BETWEEN ? AND ?", tid, fromDate, toDate).
		Select("AVG(rating)").Scan(&avgSatisfaction)

	report := ConversationReportData{
		Period:                fmt.Sprintf("%s to %s", fromDate.Format("2006-01-02"), toDate.Format("2006-01-02")),
		TotalConversations:    totalConversations,
		NewConversations:      totalConversations, // For now, assuming all are new in the period
		ActiveConversations:   activeConversations,
		ClosedConversations:   closedConversations,
		AverageResponseTime:   timeStats.AvgResponseTime,
		AverageResolutionTime: timeStats.AvgResolutionTime,
		CustomerSatisfaction:  avgSatisfaction,
		AgentPerformance:      agentPerformance,
	}

	c.JSON(http.StatusOK, report)
}

// GetCampaignReport generates campaign analytics report
// @Summary Get campaign report
// @Description Get campaign analytics for specified period
// @Tags Reports
// @Accept json
// @Produce json
// @Security Bearer
// @Param from_date query string false "Start date (YYYY-MM-DD)"
// @Param to_date query string false "End date (YYYY-MM-DD)"
// @Param campaign_id query string false "Filter by campaign ID" format(uuid)
// @Success 200 {object} CampaignReportData
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /reports/campaigns [get]
func (h *Handler) GetCampaignReport(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)

	// Parse date range
	fromDate, toDate := h.parseDateRange(c)
	campaignID := c.Query("campaign_id")

	// Base query for campaigns
	query := h.db.Model(&models.Campaign{}).Where("tenant_id = ?", tid)

	if !fromDate.IsZero() {
		query = query.Where("created_at >= ?", fromDate)
	}
	if !toDate.IsZero() {
		query = query.Where("created_at <= ?", toDate)
	}
	if campaignID != "" {
		if cid, err := uuid.Parse(campaignID); err == nil {
			query = query.Where("id = ?", cid)
		}
	}

	// Get campaign counts by status
	type CampaignCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}

	var statusCounts []CampaignCount
	query.Select("status, COUNT(*) as count").Group("status").Scan(&statusCounts)

	var totalCampaigns, activeCampaigns, completedCampaigns int64
	for _, sc := range statusCounts {
		totalCampaigns += sc.Count
		if sc.Status == "running" || sc.Status == "scheduled" {
			activeCampaigns += sc.Count
		} else if sc.Status == "completed" {
			completedCampaigns += sc.Count
		}
	}

	// Get campaign statistics
	type CampaignStats struct {
		TotalMessagesSent int64   `json:"total_messages_sent"`
		TotalDelivered    int64   `json:"total_delivered"`
		TotalOpened       int64   `json:"total_opened"`
		TotalClicked      int64   `json:"total_clicked"`
		TotalConverted    int64   `json:"total_converted"`
	}

	var stats CampaignStats
	h.db.Raw(`
		SELECT 
			SUM(cs.messages_sent) as total_messages_sent,
			SUM(cs.messages_delivered) as total_delivered,
			SUM(cs.messages_read) as total_opened,
			SUM(cs.clicks) as total_clicked,
			SUM(cs.conversions) as total_converted
		FROM campaign_statistics cs
		JOIN campaigns c ON c.id = cs.campaign_id
		WHERE c.tenant_id = ? AND c.created_at BETWEEN ? AND ?
	`, tid, fromDate, toDate).Scan(&stats)

	// Calculate rates
	var deliveryRate, openRate, clickRate, conversionRate float64
	if stats.TotalMessagesSent > 0 {
		deliveryRate = float64(stats.TotalDelivered) / float64(stats.TotalMessagesSent) * 100
		if stats.TotalDelivered > 0 {
			openRate = float64(stats.TotalOpened) / float64(stats.TotalDelivered) * 100
			if stats.TotalOpened > 0 {
				clickRate = float64(stats.TotalClicked) / float64(stats.TotalOpened) * 100
				if stats.TotalClicked > 0 {
					conversionRate = float64(stats.TotalConverted) / float64(stats.TotalClicked) * 100
				}
			}
		}
	}

	// Get campaign details if not filtered by specific campaign
	var campaignDetails []CampaignDetail
	if campaignID == "" {
		h.db.Raw(`
			SELECT 
				c.id as campaign_id,
				c.name as campaign_name,
				COALESCE(cs.messages_sent, 0) as messages_sent,
				COALESCE(cs.messages_delivered, 0) as delivered,
				COALESCE(cs.messages_read, 0) as opened,
				COALESCE(cs.clicks, 0) as clicked,
				COALESCE(cs.conversions, 0) as converted,
				COALESCE(cs.total_cost, 0) as cost,
				CASE WHEN cs.total_cost > 0 AND cs.conversions > 0 
					THEN (cs.conversion_value - cs.total_cost) / cs.total_cost * 100
					ELSE 0 
				END as roi
			FROM campaigns c
			LEFT JOIN campaign_statistics cs ON cs.campaign_id = c.id
			WHERE c.tenant_id = ? AND c.created_at BETWEEN ? AND ?
			ORDER BY c.created_at DESC
			LIMIT 20
		`, tid, fromDate, toDate).Scan(&campaignDetails)
	}

	report := CampaignReportData{
		Period:             fmt.Sprintf("%s to %s", fromDate.Format("2006-01-02"), toDate.Format("2006-01-02")),
		TotalCampaigns:     totalCampaigns,
		ActiveCampaigns:    activeCampaigns,
		CompletedCampaigns: completedCampaigns,
		TotalMessagesSent:  stats.TotalMessagesSent,
		DeliveryRate:       deliveryRate,
		OpenRate:           openRate,
		ClickRate:          clickRate,
		ConversionRate:     conversionRate,
		CampaignDetails:    campaignDetails,
	}

	c.JSON(http.StatusOK, report)
}

// ScheduleReport schedules a recurring report
// @Summary Schedule report
// @Description Schedule a recurring report generation
// @Tags Reports
// @Accept json
// @Produce json
// @Security Bearer
// @Param report body ReportRequest true "Scheduled report configuration"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /reports/schedule [post]
func (h *Handler) ScheduleReport(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	var req ReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Schedule == nil || !req.Schedule.Enabled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Schedule configuration required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)
	userID := c.GetString("user_id")
	uid, _ := uuid.Parse(userID)

	// Create scheduled report
	scheduleID := uuid.New()
	scheduledReport := &models.ScheduledReport{
		Name:        req.Name,
		Type:        req.Type,
		Format:      req.Format,
		Frequency:   req.Schedule.Frequency,
		DayOfWeek:   req.Schedule.DayOfWeek,
		DayOfMonth:  req.Schedule.DayOfMonth,
		Time:        req.Schedule.Time,
		Filters:     req.Filters,
		GroupBy:     req.GroupBy,
		Metrics:     req.Metrics,
		IsActive:    true,
		CreatedBy:   uid,
	}
	scheduledReport.ID = scheduleID
	scheduledReport.TenantID = tid

	if req.Email != nil {
		scheduledReport.EmailRecipients = req.Email.Recipients
		scheduledReport.EmailSubject = req.Email.Subject
		scheduledReport.EmailMessage = req.Email.Message
	}

	if err := h.db.Create(scheduledReport).Error; err != nil {
		h.log.Error("Failed to create scheduled report", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to schedule report"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"schedule_id": scheduleID,
		"message": "Report scheduled successfully",
		"next_run": h.calculateNextRun(req.Schedule),
	})
}

// generateReportAsync generates a report asynchronously
func (h *Handler) generateReportAsync(report *models.Report, req ReportRequest) {
	defer func() {
		if r := recover(); r != nil {
			h.log.Error("Report generation panic", "error", r)
			h.updateReportStatus(report.ID, "failed", fmt.Sprintf("Generation failed: %v", r))
		}
	}()

	// Update status to generating
	h.updateReportStatus(report.ID, "generating", "")

	// Generate report data based on type
	var data interface{}
	var err error

	switch report.Type {
	case "conversations":
		data, err = h.generateConversationReportData(report)
	case "campaigns":
		data, err = h.generateCampaignReportData(report)
	case "messages":
		data, err = h.generateMessageReportData(report)
	case "erp":
		data, err = h.generateERPReportData(report)
	default:
		err = fmt.Errorf("unsupported report type: %s", report.Type)
	}

	if err != nil {
		h.log.Error("Failed to generate report data", "error", err)
		h.updateReportStatus(report.ID, "failed", err.Error())
		return
	}

	// Export data to requested format
	filePath, size, err := h.exportReportData(report, data)
	if err != nil {
		h.log.Error("Failed to export report", "error", err)
		h.updateReportStatus(report.ID, "failed", err.Error())
		return
	}

	// Update report with completion info
	now := time.Now()
	updates := map[string]interface{}{
		"status":       "completed",
		"progress":     100,
		"file_path":    filePath,
		"file_size":    size,
		"generated_at": &now,
	}

	h.db.Model(&models.Report{}).Where("id = ?", report.ID).Updates(updates)

	// Send email if configured
	if req.Email != nil && len(req.Email.Recipients) > 0 {
		h.sendReportEmail(report, req.Email, filePath)
	}
}

// Helper functions
func (h *Handler) parseDateRange(c *gin.Context) (time.Time, time.Time) {
	fromStr := c.Query("from_date")
	toStr := c.Query("to_date")

	var fromDate, toDate time.Time

	if fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			fromDate = t
		}
	}

	if toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			toDate = t.Add(24 * time.Hour - time.Second) // End of day
		}
	}

	// Default to last 30 days if not specified
	if fromDate.IsZero() && toDate.IsZero() {
		toDate = time.Now()
		fromDate = toDate.AddDate(0, 0, -30)
	}

	return fromDate, toDate
}

func (h *Handler) updateReportStatus(reportID uuid.UUID, status, errorMsg string) {
	updates := map[string]interface{}{
		"status": status,
	}
	if errorMsg != "" {
		updates["error"] = errorMsg
	}
	h.db.Model(&models.Report{}).Where("id = ?", reportID).Updates(updates)
}

func (h *Handler) getContentType(format string) string {
	switch format {
	case "pdf":
		return "application/pdf"
	case "csv":
		return "text/csv"
	case "excel":
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case "json":
		return "application/json"
	default:
		return "application/octet-stream"
	}
}

func (h *Handler) calculateNextRun(schedule *ScheduleConfig) time.Time {
	// Simplified next run calculation - in production would use a proper scheduler
	now := time.Now()
	switch schedule.Frequency {
	case "daily":
		return now.AddDate(0, 0, 1)
	case "weekly":
		return now.AddDate(0, 0, 7)
	case "monthly":
		return now.AddDate(0, 1, 0)
	default:
		return now.AddDate(0, 0, 1)
	}
}

// Placeholder implementations for data generation
func (h *Handler) generateConversationReportData(report *models.Report) (interface{}, error) {
	// Implementation would generate detailed conversation report data
	return map[string]interface{}{"type": "conversations"}, nil
}

func (h *Handler) generateCampaignReportData(report *models.Report) (interface{}, error) {
	// Implementation would generate detailed campaign report data
	return map[string]interface{}{"type": "campaigns"}, nil
}

func (h *Handler) generateMessageReportData(report *models.Report) (interface{}, error) {
	// Implementation would generate detailed message report data
	return map[string]interface{}{"type": "messages"}, nil
}

func (h *Handler) generateERPReportData(report *models.Report) (interface{}, error) {
	// Implementation would generate detailed ERP report data
	return map[string]interface{}{"type": "erp"}, nil
}

func (h *Handler) exportReportData(report *models.Report, data interface{}) (string, int64, error) {
	// Implementation would export data to the requested format
	// For now, return mock values
	filePath := fmt.Sprintf("/tmp/reports/%s_%s.%s", report.ID, report.Type, report.Format)
	size := int64(1024) // Mock size
	return filePath, size, nil
}

func (h *Handler) sendReportEmail(report *models.Report, emailConfig *EmailConfig, filePath string) {
	// Implementation would send email with report attachment
	h.log.Info("Sending report email", "report_id", report.ID, "recipients", emailConfig.Recipients)
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}