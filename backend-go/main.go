package main

import (
	"database/sql"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

var db *sql.DB

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Set Gin mode
	if os.Getenv("NODE_ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database
	var err error
	db, err = InitDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Initialize Redis
	redis := InitRedis()
	defer redis.Close()

	// Create router
	router := gin.Default()

	// Setup CORS (using manual middleware instead)
	
	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin == "https://app.pytake.net" || origin == "http://app.pytake.net" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"service": "pytake-backend",
			"version": "1.0.0",
		})
	})

	// Create services
	flowService := NewFlowService(db, redis)
	whatsappService := NewWhatsAppService(db, redis)
	authService := NewAuthService(db, redis)
	conversationService := NewConversationService(db, flowService)
	queueService := NewQueueService(db, redis)
	
	// Create and configure FlowSessionManager
	sessionManager := NewFlowSessionManager(db, redis, whatsappService)
	flowService.SetSessionManager(sessionManager)
	
	// Start flow expiration monitor
	sessionManager.StartExpirationMonitor()
	
	// Start automatic queue distribution
	queueService.manager.StartAutoDistribution()
	
	// Start periodic template validation (every 30 minutes)
	go func() {
		ticker := time.NewTicker(30 * time.Minute)
		defer ticker.Stop()
		
		// Initial validation after 1 minute
		time.Sleep(1 * time.Minute)
		whatsappService.ValidateAllTemplates()
		
		for range ticker.C {
			whatsappService.ValidateAllTemplates()
		}
	}()

	// Setup routes
	api := router.Group("/api/v1")
	{
		// Auth routes
		api.POST("/auth/login", authService.Login)
		api.GET("/auth/me", authService.Me)
		api.POST("/auth/logout", authService.Logout)

		// Flow routes
		api.GET("/flows", flowService.GetFlows)
		api.POST("/flows", flowService.CreateFlow)
		api.GET("/flows/:id", flowService.GetFlow)
		api.PUT("/flows/:id", flowService.UpdateFlow)
		api.DELETE("/flows/:id", flowService.DeleteFlow)
		api.PATCH("/flows/:id/status", flowService.UpdateFlowStatus)
		api.POST("/flows/:id/test", flowService.TestFlow)
		api.POST("/flows/test-template", flowService.TestTemplate)
		api.GET("/flows/:id/test/:execution_id/logs", flowService.GetFlowTestLogs)
		api.GET("/flows/window-status", flowService.CheckConversationWindow)
		api.GET("/flows/templates", flowService.GetAvailableTemplates)

		// WhatsApp routes
		api.GET("/whatsapp/numbers", whatsappService.GetNumbers)
		api.GET("/whatsapp/phone-numbers", whatsappService.GetPhoneNumbers)
		api.GET("/whatsapp-configs", whatsappService.GetConfigs)
		api.POST("/whatsapp-configs", whatsappService.SaveConfig)
		api.PUT("/whatsapp-configs/:id", whatsappService.UpdateConfig)
		api.DELETE("/whatsapp-configs/:id", whatsappService.DeleteConfig)
		api.POST("/whatsapp-configs/:id/test", whatsappService.TestConfig)
		api.PUT("/whatsapp-configs/:id/default", whatsappService.SetDefaultConfig)
		api.GET("/whatsapp/templates", whatsappService.GetTemplates)
		api.GET("/whatsapp/templates/manage", whatsappService.GetAllTemplates) // All templates for management
		api.POST("/whatsapp/templates/sync", whatsappService.SyncTemplates)
		api.POST("/whatsapp/templates", whatsappService.CreateTemplate)
		api.PUT("/whatsapp/templates/:id", whatsappService.UpdateTemplate)
		api.DELETE("/whatsapp/templates/:id", whatsappService.DeleteTemplate)
		api.POST("/whatsapp/templates/:id/submit", whatsappService.SubmitTemplate)
		api.PUT("/whatsapp/templates/:id/toggle", whatsappService.ToggleTemplateStatus)
		
		// Conversation routes
		api.GET("/conversations", conversationService.GetConversations)
		api.GET("/conversations/stats", conversationService.GetConversationStats)
		api.GET("/conversations/unread-count", conversationService.GetUnreadCount)
		api.POST("/conversations/sync", conversationService.SyncConversations)
		api.DELETE("/conversations/clear", conversationService.ClearAllConversations)
		api.POST("/conversations/update-phone-numbers", conversationService.UpdateConversationsWithPhoneNumbers)
		api.GET("/conversations/:id/messages", conversationService.GetMessages)
		api.POST("/conversations/:id/messages", conversationService.SendMessage)
		api.GET("/conversations/ws", conversationService.WebSocketHandler)
		
		// Queue routes
		api.GET("/queues", queueService.GetQueues)
		api.POST("/queues", queueService.CreateQueue)
		api.GET("/queues/:id/items", queueService.GetQueueItems)
		api.POST("/queues/:id/add", queueService.AddToQueue)
		api.POST("/queues/items/:itemId/assign", queueService.AssignItem)
		api.POST("/queues/items/:itemId/complete", queueService.CompleteItem)
		api.GET("/queues/:id/metrics", queueService.GetQueueMetrics)
		api.GET("/queues/history", queueService.GetQueueHistory)
		api.GET("/queues/dashboard", queueService.GetDashboardStats)
		api.GET("/agents", queueService.GetAgents)
		api.PUT("/agents/:id/status", queueService.UpdateAgentStatus)
		
		// Contact routes
		api.GET("/contacts", GetContacts)
		api.POST("/contacts", CreateContact)
		api.PUT("/contacts/:id", UpdateContact)
		api.DELETE("/contacts/:id", DeleteContact)
		
		// Contact Groups routes
		api.GET("/contact-groups", GetContactGroups)
		api.POST("/contact-groups", CreateContactGroup)
		api.GET("/contact-groups/:id", GetContactGroup)
		api.PUT("/contact-groups/:id", UpdateContactGroup)
		api.DELETE("/contact-groups/:id", DeleteContactGroup)
		
		// Reports routes
		api.GET("/reports/dashboard-metrics", GetDashboardMetrics)
		api.GET("/reports/agent-comparison", GetAgentComparison)
		api.GET("/reports/export", ExportReport)
		
		// Gamification routes
		api.GET("/gamification/profile/:id", GetGamificationProfile)
		api.GET("/gamification/leaderboard", GetLeaderboard)
		api.GET("/gamification/stats", GetGameStats)
		api.POST("/gamification/achievements/award", AwardAchievement)
		api.PUT("/gamification/agents/:id/score", UpdateAgentScore)
		
		// Webhook routes
		webhookService := NewWebhookService(db, redis)
		api.POST("/whatsapp-configs/:id/webhook/validate", webhookService.ValidateWebhookConfig)
		api.POST("/whatsapp-configs/:id/webhook/subscribe", webhookService.SubscribeWebhook)
		api.GET("/webhook/logs", webhookService.GetWebhookLogs)
	}
	
	// Webhook endpoints (outside auth group - Meta needs to access these)
	router.GET("/webhook/whatsapp", conversationService.WhatsAppWebhook)
	router.POST("/webhook/whatsapp", conversationService.WhatsAppWebhook)
	
	// Alternative webhook routes for backwards compatibility
	api.GET("/whatsapp/webhook", conversationService.WhatsAppWebhook)
	api.POST("/whatsapp/webhook", conversationService.WhatsAppWebhook)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server starting on port %s", port)
	log.Fatal(router.Run(":" + port))
}

// Helper functions for contact and group handlers
func getDB() *sql.DB {
	return db
}

func getTenantID(c *gin.Context) string {
	// Por enquanto, usar tenant ID padrão
	// TODO: Implementar autenticação e extrair tenant do JWT
	return "00000000-0000-0000-0000-000000000000"
}

func extractEmailFromCustomFields(customFields string) string {
	// Implementação simples para extrair email do JSON custom_fields
	// Em um sistema real, você usaria json.Unmarshal
	if customFields == "" {
		return ""
	}
	// Para o exemplo, retornar vazio
	return ""
}