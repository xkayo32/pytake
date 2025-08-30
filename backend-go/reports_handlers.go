package main

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// DashboardMetrics representa as métricas consolidadas do dashboard
type DashboardMetrics struct {
	Overview            OverviewMetrics            `json:"overview"`
	AgentPerformance    []AgentPerformanceData     `json:"agentPerformance"`
	ConversationTrends  []ConversationTrendData    `json:"conversationTrends"`
	SatisfactionTrends  []SatisfactionTrendData    `json:"satisfactionTrends"`
	ResponseTimes       []ResponseTimeData         `json:"responseTimes"`
	QueueMetrics        []QueueMetricData          `json:"queueMetrics"`
	TopIssues          []TopIssueData             `json:"topIssues"`
}

type OverviewMetrics struct {
	TotalAgents      int     `json:"totalAgents"`
	ActiveAgents     int     `json:"activeAgents"`
	TotalConversations int   `json:"totalConversations"`
	AvgSatisfaction  float64 `json:"avgSatisfaction"`
	AvgResponseTime  float64 `json:"avgResponseTime"`
	SlaCompliance    float64 `json:"slaCompliance"`
	QueueWaitTime    float64 `json:"queueWaitTime"`
	ResolutionRate   float64 `json:"resolutionRate"`
}

type AgentPerformanceData struct {
	ID                   string  `json:"id"`
	Name                 string  `json:"name"`
	Avatar               string  `json:"avatar,omitempty"`
	Status               string  `json:"status"`
	TodayConversations   int     `json:"todayConversations"`
	AvgResponseTime      float64 `json:"avgResponseTime"`
	Satisfaction         float64 `json:"satisfaction"`
	ActiveConversations  int     `json:"activeConversations"`
	Efficiency          float64 `json:"efficiency"`
	SlaCompliance       float64 `json:"slaCompliance"`
}

type ConversationTrendData struct {
	Date         string `json:"date"`
	Conversations int   `json:"conversations"`
	Resolved     int    `json:"resolved"`
	Transferred  int    `json:"transferred"`
	Abandoned    int    `json:"abandoned"`
}

type SatisfactionTrendData struct {
	Date         string  `json:"date"`
	Satisfaction float64 `json:"satisfaction"`
	Responses    int     `json:"responses"`
}

type ResponseTimeData struct {
	Hour           string  `json:"hour"`
	AvgResponseTime float64 `json:"avgResponseTime"`
	SlaTarget      float64 `json:"slaTarget"`
}

type QueueMetricData struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Waiting     int     `json:"waiting"`
	AvgWaitTime float64 `json:"avgWaitTime"`
	Agents      int     `json:"agents"`
	SlaBreaches int     `json:"slaBreaches"`
}

type TopIssueData struct {
	Category           string  `json:"category"`
	Count             int     `json:"count"`
	AvgResolutionTime float64 `json:"avgResolutionTime"`
	Trend             string  `json:"trend"`
}

// GetDashboardMetrics retorna métricas consolidadas do dashboard
func GetDashboardMetrics(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)

	// Parse date filters
	fromParam := c.Query("from")
	toParam := c.Query("to")
	
	var fromDate, toDate time.Time
	var err error
	
	if fromParam != "" {
		fromDate, err = time.Parse(time.RFC3339, fromParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid from date format"})
			return
		}
	} else {
		fromDate = time.Now().AddDate(0, 0, -7) // Last 7 days by default
	}
	
	if toParam != "" {
		toDate, err = time.Parse(time.RFC3339, toParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid to date format"})
			return
		}
	} else {
		toDate = time.Now()
	}

	// Generate mock data (in a real implementation, you would fetch from database)
	metrics := generateMockDashboardMetrics(db, tenantID, fromDate, toDate)
	
	c.JSON(http.StatusOK, metrics)
}

// GetAgentComparison retorna dados comparativos entre agentes
func GetAgentComparison(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)

	// Parse date filters
	fromParam := c.Query("from")
	toParam := c.Query("to")
	
	var fromDate, toDate time.Time
	var err error
	
	if fromParam != "" {
		fromDate, err = time.Parse(time.RFC3339, fromParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid from date format"})
			return
		}
	} else {
		fromDate = time.Now().AddDate(0, 0, -7)
	}
	
	if toParam != "" {
		toDate, err = time.Parse(time.RFC3339, toParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid to date format"})
			return
		}
	} else {
		toDate = time.Now()
	}

	// Generate mock agent comparison data
	agents := generateMockAgentPerformance(db, tenantID, fromDate, toDate)
	
	c.JSON(http.StatusOK, agents)
}

// ExportReport handles report export in different formats
func ExportReport(c *gin.Context) {
	format := c.Query("format")
	reportType := c.Query("type")
	
	if format == "" {
		format = "csv"
	}
	if reportType == "" {
		reportType = "summary"
	}

	// Parse date filters
	fromParam := c.Query("from")
	toParam := c.Query("to")
	
	var fromDate, toDate time.Time
	var err error
	
	if fromParam != "" {
		fromDate, err = time.Parse(time.RFC3339, fromParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid from date format"})
			return
		}
	} else {
		fromDate = time.Now().AddDate(0, 0, -7)
	}
	
	if toParam != "" {
		toDate, err = time.Parse(time.RFC3339, toParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid to date format"})
			return
		}
	} else {
		toDate = time.Now()
	}

	// Get data for export
	db := getDB()
	tenantID := getTenantID(c)
	metrics := generateMockDashboardMetrics(db, tenantID, fromDate, toDate)

	switch format {
	case "csv":
		exportCSV(c, metrics, reportType)
	case "excel":
		exportExcel(c, metrics, reportType)
	case "pdf":
		exportPDF(c, metrics, reportType)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported format"})
	}
}

// Generate mock dashboard metrics
func generateMockDashboardMetrics(db *sql.DB, tenantID string, fromDate, toDate time.Time) DashboardMetrics {
	// In a real implementation, these would be database queries
	agents := []AgentPerformanceData{
		{ID: "1", Name: "Maria Silva", Status: "online", TodayConversations: 18, AvgResponseTime: 35, Satisfaction: 4.7, ActiveConversations: 2, Efficiency: 92.5, SlaCompliance: 95.2},
		{ID: "2", Name: "João Santos", Status: "busy", TodayConversations: 22, AvgResponseTime: 42, Satisfaction: 4.5, ActiveConversations: 3, Efficiency: 88.3, SlaCompliance: 91.8},
		{ID: "3", Name: "Ana Costa", Status: "online", TodayConversations: 15, AvgResponseTime: 28, Satisfaction: 4.8, ActiveConversations: 1, Efficiency: 94.1, SlaCompliance: 97.3},
		{ID: "4", Name: "Pedro Oliveira", Status: "away", TodayConversations: 12, AvgResponseTime: 55, Satisfaction: 4.2, ActiveConversations: 0, Efficiency: 78.6, SlaCompliance: 84.5},
		{ID: "5", Name: "Carlos Lima", Status: "break", TodayConversations: 8, AvgResponseTime: 48, Satisfaction: 4.4, ActiveConversations: 0, Efficiency: 81.2, SlaCompliance: 87.9},
		{ID: "6", Name: "Fernanda Souza", Status: "offline", TodayConversations: 0, AvgResponseTime: 0, Satisfaction: 0, ActiveConversations: 0, Efficiency: 0, SlaCompliance: 0},
	}

	// Generate conversation trends for the date range
	days := int(toDate.Sub(fromDate).Hours()/24) + 1
	conversationTrends := make([]ConversationTrendData, days)
	satisfactionTrends := make([]SatisfactionTrendData, days)
	
	for i := 0; i < days; i++ {
		date := fromDate.AddDate(0, 0, i)
		conversations := 20 + i*3 + (i%3)*5 // Simulate growth trend
		
		conversationTrends[i] = ConversationTrendData{
			Date:         date.Format("2006-01-02"),
			Conversations: conversations,
			Resolved:     int(float64(conversations) * (0.85 + float64(i%3)*0.03)),
			Transferred:  int(float64(conversations) * 0.08),
			Abandoned:    int(float64(conversations) * 0.07),
		}
		
		satisfactionTrends[i] = SatisfactionTrendData{
			Date:         date.Format("2006-01-02"),
			Satisfaction: 4.2 + float64(i%4)*0.15,
			Responses:    15 + i*2,
		}
	}

	// Generate hourly response times
	responseTimes := make([]ResponseTimeData, 24)
	for i := 0; i < 24; i++ {
		baseTime := 40.0
		if i >= 9 && i <= 17 { // Business hours
			baseTime += 20.0
		}
		if i >= 19 && i <= 22 { // Evening peak
			baseTime += 15.0
		}
		
		responseTimes[i] = ResponseTimeData{
			Hour:           strconv.Itoa(i) + ":00",
			AvgResponseTime: baseTime + float64(i%3)*5,
			SlaTarget:      90.0,
		}
	}

	return DashboardMetrics{
		Overview: OverviewMetrics{
			TotalAgents:        6,
			ActiveAgents:       3,
			TotalConversations: 234,
			AvgSatisfaction:    4.5,
			AvgResponseTime:    42.5,
			SlaCompliance:     91.2,
			QueueWaitTime:     2.8,
			ResolutionRate:    89.3,
		},
		AgentPerformance: agents,
		ConversationTrends: conversationTrends,
		SatisfactionTrends: satisfactionTrends,
		ResponseTimes: responseTimes,
		QueueMetrics: []QueueMetricData{
			{ID: "1", Name: "Suporte Técnico", Waiting: 3, AvgWaitTime: 2.5, Agents: 2, SlaBreaches: 0},
			{ID: "2", Name: "Vendas", Waiting: 1, AvgWaitTime: 1.2, Agents: 1, SlaBreaches: 0},
			{ID: "3", Name: "Atendimento Geral", Waiting: 5, AvgWaitTime: 3.8, Agents: 2, SlaBreaches: 1},
			{ID: "4", Name: "Reclamações", Waiting: 2, AvgWaitTime: 4.2, Agents: 1, SlaBreaches: 1},
		},
		TopIssues: []TopIssueData{
			{Category: "Problemas Técnicos", Count: 45, AvgResolutionTime: 12.5, Trend: "up"},
			{Category: "Dúvidas Comerciais", Count: 38, AvgResolutionTime: 8.2, Trend: "stable"},
			{Category: "Solicitações de Suporte", Count: 32, AvgResolutionTime: 15.3, Trend: "down"},
			{Category: "Reclamações", Count: 18, AvgResolutionTime: 22.1, Trend: "up"},
			{Category: "Cancelamentos", Count: 12, AvgResolutionTime: 18.7, Trend: "stable"},
		},
	}
}

func generateMockAgentPerformance(db *sql.DB, tenantID string, fromDate, toDate time.Time) []AgentPerformanceData {
	return []AgentPerformanceData{
		{ID: "1", Name: "Maria Silva", Status: "online", TodayConversations: 18, AvgResponseTime: 35, Satisfaction: 4.7, ActiveConversations: 2, Efficiency: 92.5, SlaCompliance: 95.2},
		{ID: "2", Name: "João Santos", Status: "busy", TodayConversations: 22, AvgResponseTime: 42, Satisfaction: 4.5, ActiveConversations: 3, Efficiency: 88.3, SlaCompliance: 91.8},
		{ID: "3", Name: "Ana Costa", Status: "online", TodayConversations: 15, AvgResponseTime: 28, Satisfaction: 4.8, ActiveConversations: 1, Efficiency: 94.1, SlaCompliance: 97.3},
		{ID: "4", Name: "Pedro Oliveira", Status: "away", TodayConversations: 12, AvgResponseTime: 55, Satisfaction: 4.2, ActiveConversations: 0, Efficiency: 78.6, SlaCompliance: 84.5},
		{ID: "5", Name: "Carlos Lima", Status: "break", TodayConversations: 8, AvgResponseTime: 48, Satisfaction: 4.4, ActiveConversations: 0, Efficiency: 81.2, SlaCompliance: 87.9},
		{ID: "6", Name: "Fernanda Souza", Status: "offline", TodayConversations: 0, AvgResponseTime: 0, Satisfaction: 0, ActiveConversations: 0, Efficiency: 0, SlaCompliance: 0},
	}
}

// Export functions (simplified implementations)
func exportCSV(c *gin.Context, metrics DashboardMetrics, reportType string) {
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=relatorio.csv")
	
	csv := "Nome,Status,Conversas,Tempo Resposta,Satisfacao,SLA\n"
	for _, agent := range metrics.AgentPerformance {
		csv += agent.Name + "," + agent.Status + "," + 
			   strconv.Itoa(agent.TodayConversations) + "," +
			   strconv.FormatFloat(agent.AvgResponseTime, 'f', 1, 64) + "," +
			   strconv.FormatFloat(agent.Satisfaction, 'f', 1, 64) + "," +
			   strconv.FormatFloat(agent.SlaCompliance, 'f', 1, 64) + "\n"
	}
	
	c.String(http.StatusOK, csv)
}

func exportExcel(c *gin.Context, metrics DashboardMetrics, reportType string) {
	// In a real implementation, you would use a library like excelize
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=relatorio.xlsx")
	c.String(http.StatusOK, "Excel export not yet implemented")
}

func exportPDF(c *gin.Context, metrics DashboardMetrics, reportType string) {
	// In a real implementation, you would use a library like gofpdf
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename=relatorio.pdf")
	c.String(http.StatusOK, "PDF export not yet implemented")
}