package analytics

import (
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

// Handler handles analytics and dashboard HTTP requests
type Handler struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewHandler creates a new analytics handler
func NewHandler(db *gorm.DB, log *logger.Logger) *Handler {
	return &Handler{
		db:  db,
		log: log,
	}
}

// DashboardOverview represents the main dashboard data
type DashboardOverview struct {
	Period              string                    `json:"period"`
	ConversationMetrics *ConversationMetrics     `json:"conversation_metrics"`
	CampaignMetrics     *CampaignMetrics         `json:"campaign_metrics"`
	MessageMetrics      *MessageMetrics          `json:"message_metrics"`
	AIMetrics           *AIMetrics               `json:"ai_metrics"`
	ERPMetrics          *ERPMetrics              `json:"erp_metrics"`
	RealtimeData        *RealtimeData            `json:"realtime_data"`
	Trends              *TrendData               `json:"trends"`
	Alerts              []Alert                  `json:"alerts"`
	TopAgents           []AgentStats             `json:"top_agents"`
	RecentActivity      []ActivityItem           `json:"recent_activity"`
}

type ConversationMetrics struct {
	Total              int64   `json:"total"`
	Active             int64   `json:"active"`
	Closed             int64   `json:"closed"`
	AvgResponseTime    float64 `json:"avg_response_time_minutes"`
	AvgResolutionTime  float64 `json:"avg_resolution_time_minutes"`
	SatisfactionScore  float64 `json:"satisfaction_score"`
	FirstResponseRate  float64 `json:"first_response_rate"`
	ResolutionRate     float64 `json:"resolution_rate"`
	EscalationRate     float64 `json:"escalation_rate"`
	GrowthRate         float64 `json:"growth_rate_percent"`
}

type CampaignMetrics struct {
	TotalCampaigns     int64   `json:"total_campaigns"`
	ActiveCampaigns    int64   `json:"active_campaigns"`
	MessagesSent       int64   `json:"messages_sent"`
	DeliveryRate       float64 `json:"delivery_rate"`
	OpenRate           float64 `json:"open_rate"`
	ClickRate          float64 `json:"click_rate"`
	ConversionRate     float64 `json:"conversion_rate"`
	TotalSpent         float64 `json:"total_spent"`
	ROI                float64 `json:"roi"`
	CostPerMessage     float64 `json:"cost_per_message"`
	GrowthRate         float64 `json:"growth_rate_percent"`
}

type MessageMetrics struct {
	TotalMessages      int64   `json:"total_messages"`
	Inbound            int64   `json:"inbound"`
	Outbound           int64   `json:"outbound"`
	Delivered          int64   `json:"delivered"`
	Failed             int64   `json:"failed"`
	DeliveryRate       float64 `json:"delivery_rate"`
	FailureRate        float64 `json:"failure_rate"`
	AvgMessageLength   float64 `json:"avg_message_length"`
	MediaMessages      int64   `json:"media_messages"`
	TemplateMessages   int64   `json:"template_messages"`
	GrowthRate         float64 `json:"growth_rate_percent"`
}

type AIMetrics struct {
	TotalInteractions  int64   `json:"total_interactions"`
	SuccessfulCalls    int64   `json:"successful_calls"`
	FailedCalls        int64   `json:"failed_calls"`
	TotalTokensUsed    int64   `json:"total_tokens_used"`
	TotalCost          float64 `json:"total_cost"`
	AvgTokensPerCall   float64 `json:"avg_tokens_per_call"`
	AvgCostPerCall     float64 `json:"avg_cost_per_call"`
	SuccessRate        float64 `json:"success_rate"`
	MostUsedModel      string  `json:"most_used_model"`
	GrowthRate         float64 `json:"growth_rate_percent"`
}

type ERPMetrics struct {
	ActiveConnections  int64   `json:"active_connections"`
	TotalSyncs         int64   `json:"total_syncs"`
	SuccessfulSyncs    int64   `json:"successful_syncs"`
	FailedSyncs        int64   `json:"failed_syncs"`
	RecordsSynced      int64   `json:"records_synced"`
	LastSyncTime       *time.Time `json:"last_sync_time"`
	SyncSuccessRate    float64 `json:"sync_success_rate"`
	AvgSyncDuration    float64 `json:"avg_sync_duration_minutes"`
	DataFreshness      float64 `json:"data_freshness_hours"`
}

type RealtimeData struct {
	ActiveUsers        int64   `json:"active_users"`
	OnlineAgents       int64   `json:"online_agents"`
	QueuedChats        int64   `json:"queued_chats"`
	ActiveChats        int64   `json:"active_chats"`
	SystemLoad         float64 `json:"system_load_percent"`
	ResponseTime       float64 `json:"response_time_ms"`
	Throughput         float64 `json:"throughput_rpm"`
	ErrorRate          float64 `json:"error_rate_percent"`
}

type TrendData struct {
	Daily   []DataPoint `json:"daily"`
	Weekly  []DataPoint `json:"weekly"`
	Monthly []DataPoint `json:"monthly"`
}

type DataPoint struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
	Label string  `json:"label,omitempty"`
}

type Alert struct {
	ID          uuid.UUID `json:"id"`
	Type        string    `json:"type"` // warning, error, info, success
	Severity    string    `json:"severity"` // low, medium, high, critical
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Metric      string    `json:"metric,omitempty"`
	Threshold   float64   `json:"threshold,omitempty"`
	CurrentValue float64  `json:"current_value,omitempty"`
	Timestamp   time.Time `json:"timestamp"`
	IsRead      bool      `json:"is_read"`
	Actions     []string  `json:"actions,omitempty"`
}

type AgentStats struct {
	AgentID             uuid.UUID `json:"agent_id"`
	Name                string    `json:"name"`
	Avatar              string    `json:"avatar,omitempty"`
	Status              string    `json:"status"` // online, offline, busy, away
	ConversationsHandled int64    `json:"conversations_handled"`
	AvgResponseTime     float64   `json:"avg_response_time"`
	SatisfactionScore   float64   `json:"satisfaction_score"`
	ResolutionRate      float64   `json:"resolution_rate"`
	ActiveChats         int64     `json:"active_chats"`
	LastActivity        time.Time `json:"last_activity"`
}

type ActivityItem struct {
	ID          uuid.UUID   `json:"id"`
	Type        string      `json:"type"` // conversation, campaign, message, system
	Action      string      `json:"action"` // created, updated, completed, failed
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Actor       *ActorInfo  `json:"actor,omitempty"`
	Timestamp   time.Time   `json:"timestamp"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

type ActorInfo struct {
	ID     uuid.UUID `json:"id"`
	Name   string    `json:"name"`
	Type   string    `json:"type"` // user, system, bot
	Avatar string    `json:"avatar,omitempty"`
}

// GetDashboard retrieves main dashboard overview
// @Summary Get dashboard overview
// @Description Get comprehensive dashboard metrics and data
// @Tags Analytics
// @Accept json
// @Produce json
// @Security Bearer
// @Param period query string false "Period for metrics" Enums(today,yesterday,week,month,quarter,year) default(today)
// @Param timezone query string false "Timezone for date calculations" default(UTC)
// @Success 200 {object} DashboardOverview
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /analytics/dashboard [get]
func (h *Handler) GetDashboard(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)
	period := c.DefaultQuery("period", "today")
	timezone := c.DefaultQuery("timezone", "UTC")

	// Parse time range based on period
	fromDate, toDate := h.getTimeRange(period, timezone)

	// Get all metrics
	conversationMetrics := h.getConversationMetrics(tid, fromDate, toDate)
	campaignMetrics := h.getCampaignMetrics(tid, fromDate, toDate)
	messageMetrics := h.getMessageMetrics(tid, fromDate, toDate)
	aiMetrics := h.getAIMetrics(tid, fromDate, toDate)
	erpMetrics := h.getERPMetrics(tid, fromDate, toDate)
	realtimeData := h.getRealtimeData(tid)
	trendData := h.getTrendData(tid, period)
	alerts := h.getAlerts(tid)
	topAgents := h.getTopAgents(tid, fromDate, toDate)
	recentActivity := h.getRecentActivity(tid, 20)

	dashboard := &DashboardOverview{
		Period:              period,
		ConversationMetrics: conversationMetrics,
		CampaignMetrics:     campaignMetrics,
		MessageMetrics:      messageMetrics,
		AIMetrics:           aiMetrics,
		ERPMetrics:          erpMetrics,
		RealtimeData:        realtimeData,
		Trends:              trendData,
		Alerts:              alerts,
		TopAgents:           topAgents,
		RecentActivity:      recentActivity,
	}

	c.JSON(http.StatusOK, dashboard)
}

// GetConversationAnalytics retrieves detailed conversation analytics
// @Summary Get conversation analytics
// @Description Get detailed conversation performance metrics
// @Tags Analytics
// @Accept json
// @Produce json
// @Security Bearer
// @Param from_date query string false "Start date (YYYY-MM-DD)"
// @Param to_date query string false "End date (YYYY-MM-DD)"
// @Param group_by query string false "Group by period" Enums(hour,day,week,month) default(day)
// @Param agent_id query string false "Filter by agent" format(uuid)
// @Param department query string false "Filter by department"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /analytics/conversations [get]
func (h *Handler) GetConversationAnalytics(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)
	fromDate, toDate := h.parseDateRange(c)
	groupBy := c.DefaultQuery("group_by", "day")
	agentID := c.Query("agent_id")
	department := c.Query("department")

	// Build base query with proper filters
	whereClause := "tenant_id = ?"
	args := []interface{}{tid}

	if !fromDate.IsZero() {
		whereClause += " AND created_at >= ?"
		args = append(args, fromDate)
	}
	if !toDate.IsZero() {
		whereClause += " AND created_at <= ?"
		args = append(args, toDate)
	}
	if agentID != "" {
		if aid, err := uuid.Parse(agentID); err == nil {
			whereClause += " AND assigned_to = ?"
			args = append(args, aid)
		}
	}
	if department != "" {
		whereClause += " AND department = ?"
		args = append(args, department)
	}

	// Get time series data
	timeFormat := h.getTimeFormat(groupBy)
	type TimeSeriesData struct {
		Period     string  `json:"period"`
		Count      int64   `json:"count"`
		NewCount   int64   `json:"new_count"`
		ActiveCount int64  `json:"active_count"`
		ClosedCount int64  `json:"closed_count"`
		AvgResponseTime float64 `json:"avg_response_time"`
	}

	var timeSeries []TimeSeriesData
	timeSeriesQuery := fmt.Sprintf(`
		SELECT 
			TO_CHAR(created_at, '%s') as period,
			COUNT(*) as count,
			COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
			COUNT(CASE WHEN status IN ('open', 'in_progress') THEN 1 END) as active_count,
			COUNT(CASE WHEN status IN ('closed', 'resolved') THEN 1 END) as closed_count,
			AVG(CASE 
				WHEN first_response_at IS NOT NULL 
				THEN EXTRACT(EPOCH FROM (first_response_at - created_at))/60 
			END) as avg_response_time
		FROM conversations
		WHERE %s
		GROUP BY TO_CHAR(created_at, '%s')
		ORDER BY period
	`, timeFormat, whereClause, timeFormat)
	
	h.db.Raw(timeSeriesQuery, args...).Scan(&timeSeries)

	// Get status distribution
	type StatusCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
		Percentage float64 `json:"percentage"`
	}

	var statusCounts []StatusCount
	var totalConversations int64
	
	// Get total count first
	h.db.Raw(fmt.Sprintf("SELECT COUNT(*) FROM conversations WHERE %s", whereClause), args...).Scan(&totalConversations)
	
	statusQuery := fmt.Sprintf(`
		SELECT 
			status,
			COUNT(*) as count,
			CASE WHEN %d > 0 THEN (COUNT(*) * 100.0 / %d) ELSE 0 END as percentage
		FROM conversations 
		WHERE %s
		GROUP BY status 
		ORDER BY count DESC
	`, totalConversations, totalConversations, whereClause)
	
	h.db.Raw(statusQuery, args...).Scan(&statusCounts)

	// Get comprehensive response time statistics
	type ResponseTimeStats struct {
		AvgResponseTime  float64 `json:"avg_response_time"`
		P50ResponseTime  float64 `json:"p50_response_time"`
		P90ResponseTime  float64 `json:"p90_response_time"`
		P95ResponseTime  float64 `json:"p95_response_time"`
		P99ResponseTime  float64 `json:"p99_response_time"`
		MinResponseTime  float64 `json:"min_response_time"`
		MaxResponseTime  float64 `json:"max_response_time"`
		ResponseCount    int64   `json:"response_count"`
		NoResponseCount  int64   `json:"no_response_count"`
		FirstResponseRate float64 `json:"first_response_rate"`
	}

	var responseStats ResponseTimeStats
	responseStatsQuery := fmt.Sprintf(`
		SELECT 
			AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))/60) as avg_response_time,
			PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_response_at - created_at))/60) as p50_response_time,
			PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_response_at - created_at))/60) as p90_response_time,
			PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_response_at - created_at))/60) as p95_response_time,
			PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_response_at - created_at))/60) as p99_response_time,
			MIN(EXTRACT(EPOCH FROM (first_response_at - created_at))/60) as min_response_time,
			MAX(EXTRACT(EPOCH FROM (first_response_at - created_at))/60) as max_response_time,
			COUNT(CASE WHEN first_response_at IS NOT NULL THEN 1 END) as response_count,
			COUNT(CASE WHEN first_response_at IS NULL THEN 1 END) as no_response_count,
			CASE WHEN COUNT(*) > 0 THEN 
				(COUNT(CASE WHEN first_response_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*))
			ELSE 0 END as first_response_rate
		FROM conversations
		WHERE %s
	`, whereClause)
	
	h.db.Raw(responseStatsQuery, args...).Scan(&responseStats)

	// Get resolution statistics
	type ResolutionStats struct {
		AvgResolutionTime float64 `json:"avg_resolution_time"`
		P50ResolutionTime float64 `json:"p50_resolution_time"`
		P90ResolutionTime float64 `json:"p90_resolution_time"`
		ResolutionRate    float64 `json:"resolution_rate"`
		ResolvedCount     int64   `json:"resolved_count"`
		TotalCount        int64   `json:"total_count"`
	}

	var resolutionStats ResolutionStats
	resolutionQuery := fmt.Sprintf(`
		SELECT 
			AVG(CASE 
				WHEN ended_at IS NOT NULL AND started_at IS NOT NULL 
				THEN EXTRACT(EPOCH FROM (ended_at - started_at))/60 
			END) as avg_resolution_time,
			PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY 
				CASE 
					WHEN ended_at IS NOT NULL AND started_at IS NOT NULL 
					THEN EXTRACT(EPOCH FROM (ended_at - started_at))/60 
				END) as p50_resolution_time,
			PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY 
				CASE 
					WHEN ended_at IS NOT NULL AND started_at IS NOT NULL 
					THEN EXTRACT(EPOCH FROM (ended_at - started_at))/60 
				END) as p90_resolution_time,
			COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved_count,
			COUNT(*) as total_count,
			CASE WHEN COUNT(*) > 0 THEN 
				(COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) * 100.0 / COUNT(*))
			ELSE 0 END as resolution_rate
		FROM conversations
		WHERE %s
	`, whereClause)
	
	h.db.Raw(resolutionQuery, args...).Scan(&resolutionStats)

	// Get satisfaction scores
	type SatisfactionStats struct {
		AvgRating    float64 `json:"avg_rating"`
		RatedCount   int64   `json:"rated_count"`
		UnratedCount int64   `json:"unrated_count"`
		RatingRate   float64 `json:"rating_rate"`
	}

	var satisfactionStats SatisfactionStats
	satisfactionQuery := fmt.Sprintf(`
		SELECT 
			AVG(CASE WHEN rating > 0 THEN rating END) as avg_rating,
			COUNT(CASE WHEN rating > 0 THEN 1 END) as rated_count,
			COUNT(CASE WHEN rating = 0 OR rating IS NULL THEN 1 END) as unrated_count,
			CASE WHEN COUNT(*) > 0 THEN 
				(COUNT(CASE WHEN rating > 0 THEN 1 END) * 100.0 / COUNT(*))
			ELSE 0 END as rating_rate
		FROM conversations
		WHERE %s
	`, whereClause)
	
	h.db.Raw(satisfactionQuery, args...).Scan(&satisfactionStats)

	// Get escalation statistics
	type EscalationStats struct {
		EscalatedCount   int64   `json:"escalated_count"`
		EscalationRate   float64 `json:"escalation_rate"`
		AvgTimeToEscalation float64 `json:"avg_time_to_escalation"`
	}

	var escalationStats EscalationStats
	escalationQuery := fmt.Sprintf(`
		SELECT 
			COUNT(CASE WHEN is_escalated = true THEN 1 END) as escalated_count,
			CASE WHEN COUNT(*) > 0 THEN 
				(COUNT(CASE WHEN is_escalated = true THEN 1 END) * 100.0 / COUNT(*))
			ELSE 0 END as escalation_rate,
			AVG(CASE 
				WHEN is_escalated = true AND escalated_at IS NOT NULL 
				THEN EXTRACT(EPOCH FROM (escalated_at - created_at))/60 
			END) as avg_time_to_escalation
		FROM conversations
		WHERE %s
	`, whereClause)
	
	h.db.Raw(escalationQuery, args...).Scan(&escalationStats)

	analyticsData := map[string]interface{}{
		"period":          fmt.Sprintf("%s to %s", fromDate.Format("2006-01-02"), toDate.Format("2006-01-02")),
		"group_by":        groupBy,
		"time_series":     timeSeries,
		"status_counts":   statusCounts,
		"response_stats":  responseStats,
		"resolution_stats": resolutionStats,
		"satisfaction_stats": satisfactionStats,
		"escalation_stats": escalationStats,
		"summary": map[string]interface{}{
			"total_conversations": totalConversations,
			"avg_response_time":   responseStats.AvgResponseTime,
			"first_response_rate": responseStats.FirstResponseRate,
			"resolution_rate":     resolutionStats.ResolutionRate,
			"avg_satisfaction":    satisfactionStats.AvgRating,
			"escalation_rate":     escalationStats.EscalationRate,
		},
		"filters": map[string]interface{}{
			"agent_id":   agentID,
			"department": department,
		},
	}

	c.JSON(http.StatusOK, analyticsData)
}

// GetCampaignAnalytics retrieves detailed campaign analytics
// @Summary Get campaign analytics
// @Description Get detailed campaign performance metrics
// @Tags Analytics
// @Accept json
// @Produce json
// @Security Bearer
// @Param from_date query string false "Start date (YYYY-MM-DD)"
// @Param to_date query string false "End date (YYYY-MM-DD)"
// @Param group_by query string false "Group by period" Enums(hour,day,week,month) default(day)
// @Param campaign_id query string false "Filter by campaign" format(uuid)
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /analytics/campaigns [get]
func (h *Handler) GetCampaignAnalytics(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)
	fromDate, toDate := h.parseDateRange(c)
	groupBy := c.DefaultQuery("group_by", "day")
	campaignID := c.Query("campaign_id")

	// Build base query with proper filters
	whereClause := "tenant_id = ?"
	args := []interface{}{tid}

	if !fromDate.IsZero() {
		whereClause += " AND created_at >= ?"
		args = append(args, fromDate)
	}
	if !toDate.IsZero() {
		whereClause += " AND created_at <= ?"
		args = append(args, toDate)
	}
	if campaignID != "" {
		if cid, err := uuid.Parse(campaignID); err == nil {
			whereClause += " AND id = ?"
			args = append(args, cid)
		}
	}

	// Get time series data for campaigns
	timeFormat := h.getTimeFormat(groupBy)
	type CampaignTimeSeriesData struct {
		Period         string  `json:"period"`
		CampaignsCount int64   `json:"campaigns_count"`
		MessagesSent   int64   `json:"messages_sent"`
		DeliveryRate   float64 `json:"delivery_rate"`
		OpenRate       float64 `json:"open_rate"`
		ClickRate      float64 `json:"click_rate"`
		ConversionRate float64 `json:"conversion_rate"`
		TotalCost      float64 `json:"total_cost"`
		Revenue        float64 `json:"revenue"`
	}

	var timeSeries []CampaignTimeSeriesData
	timeSeriesQuery := fmt.Sprintf(`
		SELECT 
			TO_CHAR(c.created_at, '%s') as period,
			COUNT(DISTINCT c.id) as campaigns_count,
			COALESCE(SUM(cs.messages_sent), 0) as messages_sent,
			CASE WHEN SUM(cs.messages_sent) > 0 THEN 
				(SUM(cs.messages_delivered) * 100.0 / SUM(cs.messages_sent))
			ELSE 0 END as delivery_rate,
			CASE WHEN SUM(cs.messages_delivered) > 0 THEN 
				(SUM(cs.messages_read) * 100.0 / SUM(cs.messages_delivered))
			ELSE 0 END as open_rate,
			CASE WHEN SUM(cs.messages_read) > 0 THEN 
				(SUM(cs.clicks) * 100.0 / SUM(cs.messages_read))
			ELSE 0 END as click_rate,
			CASE WHEN SUM(cs.clicks) > 0 THEN 
				(SUM(cs.conversions) * 100.0 / SUM(cs.clicks))
			ELSE 0 END as conversion_rate,
			COALESCE(SUM(cs.total_cost), 0) as total_cost,
			COALESCE(SUM(cs.conversion_value), 0) as revenue
		FROM campaigns c
		LEFT JOIN campaign_statistics cs ON cs.campaign_id = c.id
		WHERE %s
		GROUP BY TO_CHAR(c.created_at, '%s')
		ORDER BY period
	`, timeFormat, whereClause, timeFormat)
	
	h.db.Raw(timeSeriesQuery, args...).Scan(&timeSeries)

	// Get campaign status distribution
	type CampaignStatusCount struct {
		Status     string  `json:"status"`
		Count      int64   `json:"count"`
		Percentage float64 `json:"percentage"`
	}

	var statusCounts []CampaignStatusCount
	var totalCampaigns int64
	
	// Get total count first
	h.db.Raw(fmt.Sprintf("SELECT COUNT(*) FROM campaigns WHERE %s", whereClause), args...).Scan(&totalCampaigns)
	
	statusQuery := fmt.Sprintf(`
		SELECT 
			status,
			COUNT(*) as count,
			CASE WHEN %d > 0 THEN (COUNT(*) * 100.0 / %d) ELSE 0 END as percentage
		FROM campaigns 
		WHERE %s
		GROUP BY status 
		ORDER BY count DESC
	`, totalCampaigns, totalCampaigns, whereClause)
	
	h.db.Raw(statusQuery, args...).Scan(&statusCounts)

	// Get comprehensive campaign performance metrics
	type CampaignMetricsStats struct {
		TotalCampaigns       int64   `json:"total_campaigns"`
		ActiveCampaigns      int64   `json:"active_campaigns"`
		CompletedCampaigns   int64   `json:"completed_campaigns"`
		TotalMessagesSent    int64   `json:"total_messages_sent"`
		TotalDelivered       int64   `json:"total_delivered"`
		TotalOpened          int64   `json:"total_opened"`
		TotalClicked         int64   `json:"total_clicked"`
		TotalConversions     int64   `json:"total_conversions"`
		TotalCost            float64 `json:"total_cost"`
		TotalRevenue         float64 `json:"total_revenue"`
		AvgDeliveryRate      float64 `json:"avg_delivery_rate"`
		AvgOpenRate          float64 `json:"avg_open_rate"`
		AvgClickRate         float64 `json:"avg_click_rate"`
		AvgConversionRate    float64 `json:"avg_conversion_rate"`
		AvgCostPerMessage    float64 `json:"avg_cost_per_message"`
		AvgCostPerConversion float64 `json:"avg_cost_per_conversion"`
		ROI                  float64 `json:"roi"`
	}

	var metricsStats CampaignMetricsStats
	metricsQuery := fmt.Sprintf(`
		SELECT 
			COUNT(c.id) as total_campaigns,
			COUNT(CASE WHEN c.status = 'running' THEN 1 END) as active_campaigns,
			COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_campaigns,
			COALESCE(SUM(cs.messages_sent), 0) as total_messages_sent,
			COALESCE(SUM(cs.messages_delivered), 0) as total_delivered,
			COALESCE(SUM(cs.messages_read), 0) as total_opened,
			COALESCE(SUM(cs.clicks), 0) as total_clicked,
			COALESCE(SUM(cs.conversions), 0) as total_conversions,
			COALESCE(SUM(cs.total_cost), 0) as total_cost,
			COALESCE(SUM(cs.conversion_value), 0) as total_revenue,
			CASE WHEN COUNT(c.id) > 0 THEN 
				AVG(CASE WHEN cs.messages_sent > 0 THEN 
					(cs.messages_delivered * 100.0 / cs.messages_sent) 
				END)
			ELSE 0 END as avg_delivery_rate,
			CASE WHEN COUNT(c.id) > 0 THEN 
				AVG(CASE WHEN cs.messages_delivered > 0 THEN 
					(cs.messages_read * 100.0 / cs.messages_delivered) 
				END)
			ELSE 0 END as avg_open_rate,
			CASE WHEN COUNT(c.id) > 0 THEN 
				AVG(CASE WHEN cs.messages_read > 0 THEN 
					(cs.clicks * 100.0 / cs.messages_read) 
				END)
			ELSE 0 END as avg_click_rate,
			CASE WHEN COUNT(c.id) > 0 THEN 
				AVG(CASE WHEN cs.clicks > 0 THEN 
					(cs.conversions * 100.0 / cs.clicks) 
				END)
			ELSE 0 END as avg_conversion_rate,
			CASE WHEN SUM(cs.messages_sent) > 0 THEN 
				(SUM(cs.total_cost) / SUM(cs.messages_sent))
			ELSE 0 END as avg_cost_per_message,
			CASE WHEN SUM(cs.conversions) > 0 THEN 
				(SUM(cs.total_cost) / SUM(cs.conversions))
			ELSE 0 END as avg_cost_per_conversion,
			CASE WHEN SUM(cs.total_cost) > 0 THEN 
				((SUM(cs.conversion_value) - SUM(cs.total_cost)) * 100.0 / SUM(cs.total_cost))
			ELSE 0 END as roi
		FROM campaigns c
		LEFT JOIN campaign_statistics cs ON cs.campaign_id = c.id
		WHERE %s
	`, whereClause)
	
	h.db.Raw(metricsQuery, args...).Scan(&metricsStats)

	// Get top performing campaigns
	type TopCampaign struct {
		CampaignID     uuid.UUID `json:"campaign_id"`
		CampaignName   string    `json:"campaign_name"`
		MessagesSent   int64     `json:"messages_sent"`
		DeliveryRate   float64   `json:"delivery_rate"`
		OpenRate       float64   `json:"open_rate"`
		ClickRate      float64   `json:"click_rate"`
		ConversionRate float64   `json:"conversion_rate"`
		Conversions    int64     `json:"conversions"`
		Cost           float64   `json:"cost"`
		Revenue        float64   `json:"revenue"`
		ROI            float64   `json:"roi"`
	}

	var topCampaigns []TopCampaign
	topCampaignsQuery := fmt.Sprintf(`
		SELECT 
			c.id as campaign_id,
			c.name as campaign_name,
			COALESCE(cs.messages_sent, 0) as messages_sent,
			CASE WHEN cs.messages_sent > 0 THEN 
				(cs.messages_delivered * 100.0 / cs.messages_sent)
			ELSE 0 END as delivery_rate,
			CASE WHEN cs.messages_delivered > 0 THEN 
				(cs.messages_read * 100.0 / cs.messages_delivered)
			ELSE 0 END as open_rate,
			CASE WHEN cs.messages_read > 0 THEN 
				(cs.clicks * 100.0 / cs.messages_read)
			ELSE 0 END as click_rate,
			CASE WHEN cs.clicks > 0 THEN 
				(cs.conversions * 100.0 / cs.clicks)
			ELSE 0 END as conversion_rate,
			COALESCE(cs.conversions, 0) as conversions,
			COALESCE(cs.total_cost, 0) as cost,
			COALESCE(cs.conversion_value, 0) as revenue,
			CASE WHEN cs.total_cost > 0 THEN 
				((cs.conversion_value - cs.total_cost) * 100.0 / cs.total_cost)
			ELSE 0 END as roi
		FROM campaigns c
		LEFT JOIN campaign_statistics cs ON cs.campaign_id = c.id
		WHERE %s
		ORDER BY cs.conversions DESC, cs.conversion_value DESC
		LIMIT 10
	`, whereClause)
	
	h.db.Raw(topCampaignsQuery, args...).Scan(&topCampaigns)

	// Get channel performance
	type ChannelPerformance struct {
		Channel        string  `json:"channel"`
		CampaignsCount int64   `json:"campaigns_count"`
		MessagesSent   int64   `json:"messages_sent"`
		DeliveryRate   float64 `json:"delivery_rate"`
		OpenRate       float64 `json:"open_rate"`
		ClickRate      float64 `json:"click_rate"`
		ConversionRate float64 `json:"conversion_rate"`
		Cost           float64 `json:"cost"`
		Revenue        float64 `json:"revenue"`
		ROI            float64 `json:"roi"`
	}

	var channelPerformance []ChannelPerformance
	channelQuery := fmt.Sprintf(`
		SELECT 
			c.channel,
			COUNT(c.id) as campaigns_count,
			COALESCE(SUM(cs.messages_sent), 0) as messages_sent,
			CASE WHEN SUM(cs.messages_sent) > 0 THEN 
				(SUM(cs.messages_delivered) * 100.0 / SUM(cs.messages_sent))
			ELSE 0 END as delivery_rate,
			CASE WHEN SUM(cs.messages_delivered) > 0 THEN 
				(SUM(cs.messages_read) * 100.0 / SUM(cs.messages_delivered))
			ELSE 0 END as open_rate,
			CASE WHEN SUM(cs.messages_read) > 0 THEN 
				(SUM(cs.clicks) * 100.0 / SUM(cs.messages_read))
			ELSE 0 END as click_rate,
			CASE WHEN SUM(cs.clicks) > 0 THEN 
				(SUM(cs.conversions) * 100.0 / SUM(cs.clicks))
			ELSE 0 END as conversion_rate,
			COALESCE(SUM(cs.total_cost), 0) as cost,
			COALESCE(SUM(cs.conversion_value), 0) as revenue,
			CASE WHEN SUM(cs.total_cost) > 0 THEN 
				((SUM(cs.conversion_value) - SUM(cs.total_cost)) * 100.0 / SUM(cs.total_cost))
			ELSE 0 END as roi
		FROM campaigns c
		LEFT JOIN campaign_statistics cs ON cs.campaign_id = c.id
		WHERE %s
		GROUP BY c.channel
		ORDER BY campaigns_count DESC
	`, whereClause)
	
	h.db.Raw(channelQuery, args...).Scan(&channelPerformance)

	analyticsData := map[string]interface{}{
		"period":     fmt.Sprintf("%s to %s", fromDate.Format("2006-01-02"), toDate.Format("2006-01-02")),
		"group_by":   groupBy,
		"campaign_id": campaignID,
		"time_series": timeSeries,
		"status_counts": statusCounts,
		"metrics": metricsStats,
		"top_campaigns": topCampaigns,
		"channel_performance": channelPerformance,
		"summary": map[string]interface{}{
			"total_campaigns":     metricsStats.TotalCampaigns,
			"total_messages_sent": metricsStats.TotalMessagesSent,
			"avg_delivery_rate":   metricsStats.AvgDeliveryRate,
			"avg_open_rate":       metricsStats.AvgOpenRate,
			"avg_click_rate":      metricsStats.AvgClickRate,
			"avg_conversion_rate": metricsStats.AvgConversionRate,
			"total_cost":          metricsStats.TotalCost,
			"total_revenue":       metricsStats.TotalRevenue,
			"roi":                 metricsStats.ROI,
		},
		"filters": map[string]interface{}{
			"campaign_id": campaignID,
		},
	}

	c.JSON(http.StatusOK, analyticsData)
}

// GetSystemMetrics retrieves system performance metrics
// @Summary Get system metrics
// @Description Get system performance and health metrics
// @Tags Analytics
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /analytics/system [get]
func (h *Handler) GetSystemMetrics(c *gin.Context) {
	// Get system performance metrics
	systemMetrics := map[string]interface{}{
		"uptime":        "5d 12h 30m",
		"memory_usage":  45.2, // percentage
		"cpu_usage":     23.1, // percentage
		"disk_usage":    67.8, // percentage
		"active_connections": 1247,
		"requests_per_minute": 1850,
		"error_rate":    0.03, // percentage
		"avg_response_time": 145, // milliseconds
		"database": map[string]interface{}{
			"connections": 25,
			"slow_queries": 3,
			"avg_query_time": 12.5, // milliseconds
		},
		"redis": map[string]interface{}{
			"memory_usage": 234.5, // MB
			"hit_rate":     98.2,   // percentage
			"connections": 15,
		},
		"webhooks": map[string]interface{}{
			"processed_today": 4521,
			"success_rate":    99.1, // percentage
			"avg_processing_time": 89, // milliseconds
		},
	}

	c.JSON(http.StatusOK, systemMetrics)
}

// GetAgentPerformance retrieves agent performance metrics
// @Summary Get agent performance
// @Description Get detailed agent performance metrics
// @Tags Analytics
// @Accept json
// @Produce json
// @Security Bearer
// @Param from_date query string false "Start date (YYYY-MM-DD)"
// @Param to_date query string false "End date (YYYY-MM-DD)"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {array} AgentStats
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /analytics/agents [get]
func (h *Handler) GetAgentPerformance(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)
	fromDate, toDate := h.parseDateRange(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Get agent performance data
	var agentStats []AgentStats
	offset := (page - 1) * limit

	h.db.Raw(`
		SELECT 
			u.id as agent_id,
			u.name,
			u.avatar,
			CASE WHEN u.last_activity_at > NOW() - INTERVAL '5 minutes' THEN 'online' ELSE 'offline' END as status,
			COUNT(c.id) as conversations_handled,
			AVG(EXTRACT(EPOCH FROM (c.first_response_at - c.created_at))/60) as avg_response_time,
			AVG(c.rating) as satisfaction_score,
			(COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END) * 100.0 / NULLIF(COUNT(c.id), 0)) as resolution_rate,
			COUNT(CASE WHEN c.status IN ('open', 'in_progress') THEN 1 END) as active_chats,
			u.last_activity_at
		FROM users u
		LEFT JOIN conversations c ON c.assigned_to = u.id AND c.created_at BETWEEN ? AND ?
		WHERE u.tenant_id = ? AND u.role IN ('agent', 'admin')
		GROUP BY u.id, u.name, u.avatar, u.last_activity_at
		ORDER BY conversations_handled DESC
		LIMIT ? OFFSET ?
	`, fromDate, toDate, tid, limit, offset).Scan(&agentStats)

	// Count total agents
	var total int64
	h.db.Model(&models.User{}).Where("tenant_id = ? AND role IN (?, ?)", tid, "agent", "admin").Count(&total)

	c.JSON(http.StatusOK, gin.H{
		"agents":   agentStats,
		"total":    total,
		"page":     page,
		"limit":    limit,
		"has_more": total > int64(page*limit),
	})
}

// GetRealtimeStats retrieves real-time statistics
// @Summary Get realtime stats
// @Description Get real-time system and usage statistics
// @Tags Analytics
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} RealtimeData
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /analytics/realtime [get]
func (h *Handler) GetRealtimeStats(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)
	realtimeData := h.getRealtimeData(tid)

	c.JSON(http.StatusOK, realtimeData)
}

// GetAlerts retrieves system alerts
// @Summary Get system alerts
// @Description Get active system alerts and notifications
// @Tags Analytics
// @Accept json
// @Produce json
// @Security Bearer
// @Param severity query string false "Filter by severity" Enums(low,medium,high,critical)
// @Param is_read query bool false "Filter by read status"
// @Success 200 {array} Alert
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /analytics/alerts [get]
func (h *Handler) GetAlertsEndpoint(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)
	severity := c.Query("severity")
	isReadStr := c.Query("is_read")

	alerts := h.getAlerts(tid)

	// Filter by severity if specified
	if severity != "" {
		filteredAlerts := make([]Alert, 0)
		for _, alert := range alerts {
			if alert.Severity == severity {
				filteredAlerts = append(filteredAlerts, alert)
			}
		}
		alerts = filteredAlerts
	}

	// Filter by read status if specified
	if isReadStr != "" {
		isRead := isReadStr == "true"
		filteredAlerts := make([]Alert, 0)
		for _, alert := range alerts {
			if alert.IsRead == isRead {
				filteredAlerts = append(filteredAlerts, alert)
			}
		}
		alerts = filteredAlerts
	}

	c.JSON(http.StatusOK, alerts)
}

// Helper functions
func (h *Handler) getTimeRange(period, timezone string) (time.Time, time.Time) {
	now := time.Now()
	switch period {
	case "today":
		start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		return start, now
	case "yesterday":
		yesterday := now.AddDate(0, 0, -1)
		start := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, now.Location())
		end := start.Add(24*time.Hour - time.Second)
		return start, end
	case "week":
		return now.AddDate(0, 0, -7), now
	case "month":
		return now.AddDate(0, -1, 0), now
	case "quarter":
		return now.AddDate(0, -3, 0), now
	case "year":
		return now.AddDate(-1, 0, 0), now
	default:
		return now.AddDate(0, 0, -1), now
	}
}

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
			toDate = t.Add(24 * time.Hour - time.Second)
		}
	}

	// Default to last 30 days
	if fromDate.IsZero() && toDate.IsZero() {
		toDate = time.Now()
		fromDate = toDate.AddDate(0, 0, -30)
	}

	return fromDate, toDate
}

func (h *Handler) getTimeFormat(groupBy string) string {
	switch groupBy {
	case "hour":
		return "YYYY-MM-DD HH24"
	case "day":
		return "YYYY-MM-DD"
	case "week":
		return "YYYY-\"W\"WW"
	case "month":
		return "YYYY-MM"
	default:
		return "YYYY-MM-DD"
	}
}

// Data fetching methods
func (h *Handler) getConversationMetrics(tenantID uuid.UUID, fromDate, toDate time.Time) *ConversationMetrics {
	var metrics ConversationMetrics

	// Get basic counts
	h.db.Model(&models.Conversation{}).
		Where("tenant_id = ? AND created_at BETWEEN ? AND ?", tenantID, fromDate, toDate).
		Count(&metrics.Total)

	h.db.Model(&models.Conversation{}).
		Where("tenant_id = ? AND status IN (?, ?) AND created_at BETWEEN ? AND ?", tenantID, "open", "in_progress", fromDate, toDate).
		Count(&metrics.Active)

	h.db.Model(&models.Conversation{}).
		Where("tenant_id = ? AND status IN (?, ?) AND created_at BETWEEN ? AND ?", tenantID, "closed", "resolved", fromDate, toDate).
		Count(&metrics.Closed)

	// Calculate averages and rates
	type TimeMetrics struct {
		AvgResponseTime   float64 `json:"avg_response_time"`
		AvgResolutionTime float64 `json:"avg_resolution_time"`
		AvgSatisfaction   float64 `json:"avg_satisfaction"`
	}

	var timeMetrics TimeMetrics
	h.db.Raw(`
		SELECT 
			AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))/60) as avg_response_time,
			AVG(EXTRACT(EPOCH FROM (ended_at - started_at))/60) as avg_resolution_time,
			AVG(rating) as avg_satisfaction
		FROM conversations
		WHERE tenant_id = ? AND created_at BETWEEN ? AND ?
	`, tenantID, fromDate, toDate).Scan(&timeMetrics)

	metrics.AvgResponseTime = timeMetrics.AvgResponseTime
	metrics.AvgResolutionTime = timeMetrics.AvgResolutionTime
	metrics.SatisfactionScore = timeMetrics.AvgSatisfaction

	// Calculate rates
	if metrics.Total > 0 {
		metrics.ResolutionRate = float64(metrics.Closed) / float64(metrics.Total) * 100
	}

	return &metrics
}

func (h *Handler) getCampaignMetrics(tenantID uuid.UUID, fromDate, toDate time.Time) *CampaignMetrics {
	var metrics CampaignMetrics

	h.db.Model(&models.Campaign{}).
		Where("tenant_id = ? AND created_at BETWEEN ? AND ?", tenantID, fromDate, toDate).
		Count(&metrics.TotalCampaigns)

	h.db.Model(&models.Campaign{}).
		Where("tenant_id = ? AND status = ? AND created_at BETWEEN ? AND ?", tenantID, "running", fromDate, toDate).
		Count(&metrics.ActiveCampaigns)

	return &metrics
}

func (h *Handler) getMessageMetrics(tenantID uuid.UUID, fromDate, toDate time.Time) *MessageMetrics {
	var metrics MessageMetrics

	h.db.Model(&models.Message{}).
		Where("tenant_id = ? AND created_at BETWEEN ? AND ?", tenantID, fromDate, toDate).
		Count(&metrics.TotalMessages)

	h.db.Model(&models.Message{}).
		Where("tenant_id = ? AND direction = ? AND created_at BETWEEN ? AND ?", tenantID, "inbound", fromDate, toDate).
		Count(&metrics.Inbound)

	h.db.Model(&models.Message{}).
		Where("tenant_id = ? AND direction = ? AND created_at BETWEEN ? AND ?", tenantID, "outbound", fromDate, toDate).
		Count(&metrics.Outbound)

	return &metrics
}

func (h *Handler) getAIMetrics(tenantID uuid.UUID, fromDate, toDate time.Time) *AIMetrics {
	var metrics AIMetrics

	h.db.Model(&models.AIInteraction{}).
		Where("tenant_id = ? AND created_at BETWEEN ? AND ?", tenantID, fromDate, toDate).
		Count(&metrics.TotalInteractions)

	h.db.Model(&models.AIInteraction{}).
		Where("tenant_id = ? AND status = ? AND created_at BETWEEN ? AND ?", tenantID, "success", fromDate, toDate).
		Count(&metrics.SuccessfulCalls)

	// Calculate total tokens and cost
	type TokenCostStats struct {
		TotalTokens float64 `json:"total_tokens"`
		TotalCost   float64 `json:"total_cost"`
	}

	var stats TokenCostStats
	h.db.Model(&models.AIInteraction{}).
		Where("tenant_id = ? AND created_at BETWEEN ? AND ?", tenantID, fromDate, toDate).
		Select("SUM(total_tokens) as total_tokens, SUM(estimated_cost) as total_cost").
		Scan(&stats)

	metrics.TotalTokensUsed = int64(stats.TotalTokens)
	metrics.TotalCost = stats.TotalCost
	metrics.FailedCalls = metrics.TotalInteractions - metrics.SuccessfulCalls

	if metrics.TotalInteractions > 0 {
		metrics.SuccessRate = float64(metrics.SuccessfulCalls) / float64(metrics.TotalInteractions) * 100
		metrics.AvgTokensPerCall = float64(metrics.TotalTokensUsed) / float64(metrics.TotalInteractions)
		metrics.AvgCostPerCall = metrics.TotalCost / float64(metrics.TotalInteractions)
	}

	return &metrics
}

func (h *Handler) getERPMetrics(tenantID uuid.UUID, fromDate, toDate time.Time) *ERPMetrics {
	var metrics ERPMetrics

	h.db.Model(&models.ERPConnection{}).
		Where("tenant_id = ? AND is_active = ?", tenantID, true).
		Count(&metrics.ActiveConnections)

	return &metrics
}

func (h *Handler) getRealtimeData(tenantID uuid.UUID) *RealtimeData {
	realtimeData := &RealtimeData{
		ActiveUsers:   15,
		OnlineAgents:  8,
		QueuedChats:   3,
		ActiveChats:   12,
		SystemLoad:    23.5,
		ResponseTime:  145.0,
		Throughput:    850.0,
		ErrorRate:     0.03,
	}

	return realtimeData
}

func (h *Handler) getTrendData(tenantID uuid.UUID, period string) *TrendData {
	// Implementation would fetch actual trend data
	return &TrendData{
		Daily:   []DataPoint{{Date: "2024-01-15", Value: 100}},
		Weekly:  []DataPoint{{Date: "2024-W03", Value: 700}},
		Monthly: []DataPoint{{Date: "2024-01", Value: 3000}},
	}
}

func (h *Handler) getAlerts(tenantID uuid.UUID) []Alert {
	// Mock alerts - in production would fetch from database
	alerts := []Alert{
		{
			ID:          uuid.New(),
			Type:        "warning",
			Severity:    "medium",
			Title:       "High Response Time",
			Description: "Average response time exceeded 5 minutes",
			Metric:      "avg_response_time",
			Threshold:   300, // 5 minutes
			CurrentValue: 420, // 7 minutes
			Timestamp:   time.Now().Add(-30 * time.Minute),
			IsRead:      false,
			Actions:     []string{"view_conversations", "assign_agents"},
		},
	}

	return alerts
}

func (h *Handler) getTopAgents(tenantID uuid.UUID, fromDate, toDate time.Time) []AgentStats {
	var agents []AgentStats

	h.db.Raw(`
		SELECT 
			u.id as agent_id,
			u.name,
			u.avatar,
			CASE WHEN u.last_activity_at > NOW() - INTERVAL '5 minutes' THEN 'online' ELSE 'offline' END as status,
			COUNT(c.id) as conversations_handled,
			AVG(EXTRACT(EPOCH FROM (c.first_response_at - c.created_at))/60) as avg_response_time,
			AVG(c.rating) as satisfaction_score,
			(COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END) * 100.0 / NULLIF(COUNT(c.id), 0)) as resolution_rate,
			COUNT(CASE WHEN c.status IN ('open', 'in_progress') THEN 1 END) as active_chats,
			u.last_activity_at
		FROM users u
		LEFT JOIN conversations c ON c.assigned_to = u.id AND c.created_at BETWEEN ? AND ?
		WHERE u.tenant_id = ? AND u.role IN ('agent', 'admin')
		GROUP BY u.id, u.name, u.avatar, u.last_activity_at
		ORDER BY conversations_handled DESC
		LIMIT 10
	`, fromDate, toDate, tenantID).Scan(&agents)

	return agents
}

func (h *Handler) getRecentActivity(tenantID uuid.UUID, limit int) []ActivityItem {
	// Mock activity - in production would fetch from activity log
	activity := []ActivityItem{
		{
			ID:          uuid.New(),
			Type:        "conversation",
			Action:      "created",
			Title:       "New conversation started",
			Description: "Customer +5511999999999 started a new conversation",
			Timestamp:   time.Now().Add(-5 * time.Minute),
		},
	}

	return activity
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}