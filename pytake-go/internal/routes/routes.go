package routes

import (
	"time"
	
	"github.com/gin-gonic/gin"
	"github.com/pytake/pytake-go/internal/ai"
	"github.com/pytake/pytake-go/internal/ai/context"
	"github.com/pytake/pytake-go/internal/ai/providers/openai"
	"github.com/pytake/pytake-go/internal/analytics"
	"github.com/pytake/pytake-go/internal/auth"
	"github.com/pytake/pytake-go/internal/campaign"
	"github.com/pytake/pytake-go/internal/campaign/analytics"
	"github.com/pytake/pytake-go/internal/campaign/engine"
	"github.com/pytake/pytake-go/internal/campaign/segmentation"
	"github.com/pytake/pytake-go/internal/campaign/templates"
	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/conversation"
	"github.com/pytake/pytake-go/internal/erp"
	"github.com/pytake/pytake-go/internal/erp/auth"
	"github.com/pytake/pytake-go/internal/erp/mapping"
	"github.com/pytake/pytake-go/internal/erp/sync"
	"github.com/pytake/pytake-go/internal/erp/webhooks"
	"github.com/pytake/pytake-go/internal/flow"
	flowEngine "github.com/pytake/pytake-go/internal/flow/engine"
	"github.com/pytake/pytake-go/internal/health"
	"github.com/pytake/pytake-go/internal/logger"
	"github.com/pytake/pytake-go/internal/middleware"
	"github.com/pytake/pytake-go/internal/queue"
	"github.com/redis/go-redis/v9"
	"github.com/pytake/pytake-go/internal/reports"
	"github.com/pytake/pytake-go/internal/tenant"
	"github.com/pytake/pytake-go/internal/settings"
	"github.com/pytake/pytake-go/internal/websocket"
	"github.com/pytake/pytake-go/internal/whatsapp"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"gorm.io/gorm"
)

// SetupRoutes configures all API routes
func SetupRoutes(router *gin.RouterGroup, db *gorm.DB, rdb *redis.Client, cfg *config.Config, log *logger.Logger, wsHub *websocket.Hub, wsService *websocket.Service) {
	// Initialize custom metrics
	middleware.InitCustomMetrics()
	
	// Add global middlewares in order of importance
	router.Use(middleware.ErrorRecoveryLogging(log))
	router.Use(middleware.RequestID())
	
	// Add security headers based on environment
	securityConfig := middleware.SecurityHeadersForEnvironment(cfg.AppEnv, cfg.ServerTLS.Enabled)
	router.Use(middleware.SecurityHeaders(securityConfig))
	
	// Add metrics collection
	router.Use(middleware.PrometheusMetrics(middleware.DefaultMetricsConfig()))
	
	// Add structured logging
	loggingConfig := middleware.DefaultLoggingConfig()
	if cfg.AppEnv == "development" {
		loggingConfig.LogRequestBody = false // Keep false for security even in dev
		loggingConfig.ErrorsOnly = false
	} else {
		loggingConfig.ErrorsOnly = false // Log all requests in production for audit
	}
	router.Use(middleware.StructuredLogging(log, loggingConfig))
	
	// Add security logging
	router.Use(middleware.SecurityLogging(log))
	
	// Add audit logging
	router.Use(middleware.AuditLogging(log))
	
	// Add performance monitoring (5 second threshold)
	router.Use(middleware.PerformanceLogging(log, 5*time.Second))
	
	// Base route for testing
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "PyTake API v1",
			"version": cfg.AppVersion,
		})
	})

	// Health check routes (public)
	healthRoutes := router.Group("/health")
	{
		healthRoutes.GET("/", healthHandler.GetHealth)
		healthRoutes.GET("/live", healthHandler.GetLiveness)
		healthRoutes.GET("/ready", healthHandler.GetReadiness)
	}

	// Metrics endpoint (public but should be restricted in production)
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Create service container for flows
	services := &flowEngine.ServiceContainer{
		WhatsAppService:     nil, // Would need to implement interface adapter
		ConversationService: nil, // Would need to implement interface adapter
		ContactService:      nil, // Would need to implement interface adapter
		WebSocketService:    wsService,
		RedisClient:         rdb,
		Database:           nil, // Would need to implement interface adapter
		TriggerManager:     nil, // Would need to implement
		AnalyticsCollector: nil, // Would need to implement
	}

	// Create AI services
	contextManager := context.NewManagerImpl(db, log)
	openaiClient := openai.NewClientImpl(cfg.OpenAI.APIKey, log)

	// Create ERP services
	erpAuthManager := auth.NewManagerImpl(cfg.ERP.EncryptionKey)
	mappingEngine := mapping.NewEngineImpl(db, log)
	syncEngine := sync.NewEngineImpl(db, log)
	webhookProcessor := webhooks.NewProcessorImpl(db, log)

	// Create Campaign services
	campaignEngine := engine.NewEngineImpl(db, log)
	segmentEngine := segmentation.NewEngineImpl(db, log)
	templateEngine := templates.NewEngineImpl(db, log)
	campaignAnalytics := analytics.NewEngineImpl(db, log)

	// Create Queue System
	redisQueue := queue.NewRedisQueue(rdb, "pytake:queue")
	scheduler := queue.NewScheduler(redisQueue)
	queueManager := queue.NewManager(redisQueue, scheduler)
	
	// Setup queue middleware and event listeners
	queueManager.RegisterMiddleware(queue.NewLoggingMiddleware(func(level, message string, fields ...interface{}) {
		log.Info(message, fields...)
	}))
	queueManager.RegisterMiddleware(queue.NewMetricsMiddleware())
	queueManager.SetRetryStrategy(queue.NewDefaultRetryStrategy())
	
	// Register job handlers
	emailHandler := queue.NewEmailJobHandler(db)
	webhookHandler := queue.NewWebhookJobHandler(db)
	syncHandler := queue.NewSyncJobHandler(db)
	cleanupHandler := queue.NewCleanupJobHandler(db)
	
	// Create and configure workers
	defaultWorker := queueManager.CreateWorker("default-worker", []string{"default", "high", "low"}, 5)
	emailWorker := queueManager.CreateWorker("email-worker", []string{"email"}, 3)
	webhookWorker := queueManager.CreateWorker("webhook-worker", []string{"webhook"}, 10)
	syncWorker := queueManager.CreateWorker("sync-worker", []string{"sync"}, 2)
	cleanupWorker := queueManager.CreateWorker("cleanup-worker", []string{"cleanup"}, 1)
	
	// Register handlers with workers
	defaultWorker.RegisterHandler(emailHandler)
	defaultWorker.RegisterHandler(webhookHandler)
	emailWorker.RegisterHandler(emailHandler)
	webhookWorker.RegisterHandler(webhookHandler)
	syncWorker.RegisterHandler(syncHandler)
	cleanupWorker.RegisterHandler(cleanupHandler)

	// Create settings service
	settingsService := settings.NewService(db, rdb, log)
	
	// Create handlers
	authHandler := auth.NewHandler(db, rdb, cfg, log)
	tenantHandler := tenant.NewHandler(db, cfg, log)
	settingsHandler := settings.NewHandler(settingsService)
	whatsappHandler := whatsapp.NewHandler(db, rdb, cfg, log)
	conversationHandler := conversation.NewHandler(db, rdb, cfg, log)
	wsHandler := websocket.NewHandler(wsHub, cfg, log)
	flowHandler := flow.NewHandler(db, services, log)
	aiHandler := ai.NewHandler(db, contextManager, openaiClient, log)
	erpHandler := erp.NewHandler(db, erpAuthManager, mappingEngine, syncEngine, webhookProcessor, log)
	campaignHandler := campaign.NewHandler(db, campaignEngine, segmentEngine, templateEngine, campaignAnalytics, log)
	reportsHandler := reports.NewHandler(db, log)
	analyticsHandler := analytics.NewHandler(db, log)
	queueHandler := queue.NewHTTPHandler(queueManager, log)
	healthHandler := health.NewHandler(db, rdb, log)

	// Auth routes (public)
	authRoutes := router.Group("/auth")
	{
		authRoutes.POST("/register", authHandler.Register)
		authRoutes.POST("/login", authHandler.Login)
		authRoutes.POST("/refresh", authHandler.RefreshToken)
		authRoutes.POST("/logout", middleware.AuthMiddleware(db, rdb, cfg), authHandler.Logout)
		authRoutes.GET("/me", middleware.AuthMiddleware(db, rdb, cfg), authHandler.Me)
	}

	// Tenant routes (authenticated)
	tenantRoutes := router.Group("/tenants")
	tenantRoutes.Use(middleware.AuthMiddleware(db, rdb, cfg))
	{
		// Tenant management
		tenantRoutes.POST("/", tenantHandler.CreateTenant)
		tenantRoutes.GET("/my", tenantHandler.GetMyTenants)
		tenantRoutes.GET("/:id", tenantHandler.GetTenant)
		tenantRoutes.PUT("/:id", tenantHandler.UpdateTenant)
		
		// Tenant membership
		tenantRoutes.POST("/:id/invite", tenantHandler.InviteUser)
		tenantRoutes.POST("/invites/:token/accept", tenantHandler.AcceptInvite)
		
		// Tenant switching
		tenantRoutes.POST("/switch", tenantHandler.SwitchTenant)
		tenantRoutes.GET("/current", middleware.TenantMiddleware(db), tenantHandler.GetCurrentTenant)
	}

	// Protected routes (require authentication and tenant context)
	protected := router.Group("/")
	protected.Use(middleware.AuthMiddleware(db, rdb, cfg))
	protected.Use(middleware.OptionalTenantMiddleware(db))
	{
		// User routes
		users := protected.Group("/users")
		{
			users.GET("/profile", authHandler.Me)
		}

		// WhatsApp routes (require tenant context)
		whatsappRoutes := protected.Group("/whatsapp")
		whatsappRoutes.Use(middleware.TenantMiddleware(db))
		{
			// Configuration management
			whatsappRoutes.POST("/configs", whatsappHandler.CreateConfig)
			whatsappRoutes.GET("/configs", whatsappHandler.GetConfigs)
			whatsappRoutes.GET("/configs/:id", whatsappHandler.GetConfig)
			whatsappRoutes.PUT("/configs/:id", whatsappHandler.UpdateConfig)
			whatsappRoutes.DELETE("/configs/:id", whatsappHandler.DeleteConfig)
			whatsappRoutes.POST("/configs/:id/test", whatsappHandler.TestConfig)
			
			// Message sending
			whatsappRoutes.POST("/send", whatsappHandler.SendMessage)
		}

		// Conversation routes (require tenant context)
		conversationRoutes := protected.Group("/conversations")
		conversationRoutes.Use(middleware.TenantMiddleware(db))
		{
			// Conversation management
			conversationRoutes.POST("/", conversationHandler.CreateConversation)
			conversationRoutes.GET("/", conversationHandler.GetConversations)
			conversationRoutes.GET("/stats", conversationHandler.GetConversationStats)
			conversationRoutes.GET("/:id", conversationHandler.GetConversation)
			conversationRoutes.PUT("/:id", conversationHandler.UpdateConversation)
			conversationRoutes.DELETE("/:id", conversationHandler.DeleteConversation)
			conversationRoutes.POST("/:id/read", conversationHandler.MarkAsRead)
			
			// Conversation tags
			conversationRoutes.POST("/:id/tags", conversationHandler.AddConversationTag)
			conversationRoutes.DELETE("/:id/tags/:tag", conversationHandler.RemoveConversationTag)
		}

		// Contact routes (require tenant context)
		contactRoutes := protected.Group("/contacts")
		contactRoutes.Use(middleware.TenantMiddleware(db))
		{
			// Contact management
			contactRoutes.POST("/", conversationHandler.CreateContact)
			contactRoutes.GET("/", conversationHandler.GetContacts)
			contactRoutes.GET("/stats", conversationHandler.GetContactStats)
			contactRoutes.GET("/:id", conversationHandler.GetContact)
			contactRoutes.PUT("/:id", conversationHandler.UpdateContact)
			contactRoutes.DELETE("/:id", conversationHandler.DeleteContact)
			
			// Contact tags
			contactRoutes.POST("/:id/tags", conversationHandler.AddContactTag)
			contactRoutes.DELETE("/:id/tags/:tag", conversationHandler.RemoveContactTag)
			
			// Contact notes
			contactRoutes.POST("/:id/notes", conversationHandler.AddContactNote)
		}

		// Flow routes (require tenant context)
		flowRoutes := protected.Group("/flows")
		flowRoutes.Use(middleware.TenantMiddleware(db))
		{
			// Flow management
			flowRoutes.POST("/", flowHandler.CreateFlow)
			flowRoutes.GET("/", flowHandler.ListFlows)
			flowRoutes.GET("/:id", flowHandler.GetFlow)
			flowRoutes.PUT("/:id", flowHandler.UpdateFlow)
			flowRoutes.DELETE("/:id", flowHandler.DeleteFlow)
			
			// Flow execution
			flowRoutes.POST("/:id/execute", flowHandler.ExecuteFlow)
			
			// Flow builder
			flowRoutes.POST("/validate", flowHandler.ValidateFlow)
			flowRoutes.GET("/builder/nodes", flowHandler.GetAvailableNodes)
		}

		// Flow execution routes (require tenant context)
		executionRoutes := protected.Group("/executions")
		executionRoutes.Use(middleware.TenantMiddleware(db))
		{
			executionRoutes.GET("/", flowHandler.ListExecutions)
			executionRoutes.GET("/:id", flowHandler.GetExecution)
			executionRoutes.POST("/:id/stop", flowHandler.StopExecution)
			executionRoutes.POST("/:id/pause", flowHandler.PauseExecution)
			executionRoutes.POST("/:id/resume", flowHandler.ResumeExecution)
		}

		// Campaign routes (require tenant context)
		campaignRoutes := protected.Group("/campaigns")
		campaignRoutes.Use(middleware.TenantMiddleware(db))
		{
			// Campaign CRUD
			campaignRoutes.POST("/", campaignHandler.CreateCampaign)
			campaignRoutes.GET("/", campaignHandler.GetCampaigns)
			campaignRoutes.GET("/:id", campaignHandler.GetCampaign)
			campaignRoutes.PUT("/:id", campaignHandler.UpdateCampaign)
			campaignRoutes.DELETE("/:id", campaignHandler.DeleteCampaign)
			
			// Campaign execution
			campaignRoutes.POST("/:id/start", campaignHandler.StartCampaign)
			campaignRoutes.POST("/:id/pause", campaignHandler.PauseCampaign)
			campaignRoutes.POST("/:id/stop", campaignHandler.StopCampaign)
			campaignRoutes.POST("/:id/test", campaignHandler.TestCampaign)
			campaignRoutes.POST("/:id/duplicate", campaignHandler.DuplicateCampaign)
			
			// Campaign analytics
			campaignRoutes.GET("/:id/stats", campaignHandler.GetCampaignStats)
			campaignRoutes.GET("/:id/recipients", campaignHandler.GetCampaignRecipients)
		}

		// AI routes (require tenant context)
		aiRoutes := protected.Group("/ai")
		aiRoutes.Use(middleware.TenantMiddleware(db))
		{
			// AI chat
			aiRoutes.POST("/chat", aiHandler.Chat)
			
			// AI contexts
			aiRoutes.GET("/contexts", aiHandler.GetContexts)
			aiRoutes.GET("/contexts/:id", aiHandler.GetContext)
			aiRoutes.POST("/contexts/:id/clear", aiHandler.ClearContext)
			
			// AI personas
			aiRoutes.GET("/personas", aiHandler.GetPersonas)
			aiRoutes.POST("/personas", aiHandler.CreatePersona)
			
			// AI templates
			aiRoutes.GET("/templates", aiHandler.GetTemplates)
			
			// AI analytics
			aiRoutes.GET("/interactions", aiHandler.GetInteractions)
			aiRoutes.GET("/stats", aiHandler.GetUsageStats)
		}

		// ERP routes (require tenant context)
		erpRoutes := protected.Group("/erp")
		erpRoutes.Use(middleware.TenantMiddleware(db))
		{
			// ERP connections
			erpRoutes.POST("/connections", erpHandler.CreateConnection)
			erpRoutes.GET("/connections", erpHandler.GetConnections)
			erpRoutes.GET("/connections/:id", erpHandler.GetConnection)
			erpRoutes.PUT("/connections/:id", erpHandler.UpdateConnection)
			erpRoutes.DELETE("/connections/:id", erpHandler.DeleteConnection)
			erpRoutes.POST("/connections/:id/test", erpHandler.TestConnectionEndpoint)
			
			// ERP synchronization
			erpRoutes.POST("/connections/:id/sync", erpHandler.SyncData)
			erpRoutes.GET("/connections/:id/sync/:sync_id", erpHandler.GetSyncStatus)
			erpRoutes.GET("/connections/:id/sync-history", erpHandler.GetSyncHistory)
			
			// ERP field mappings
			erpRoutes.GET("/connections/:id/mappings", erpHandler.GetMappings)
			erpRoutes.POST("/connections/:id/mappings", erpHandler.CreateMapping)
		}

		// Reports routes (require tenant context)
		reportsRoutes := protected.Group("/reports")
		reportsRoutes.Use(middleware.TenantMiddleware(db))
		{
			// Report generation
			reportsRoutes.POST("/generate", reportsHandler.GenerateReport)
			reportsRoutes.GET("/", reportsHandler.GetReports)
			reportsRoutes.GET("/:id", reportsHandler.GetReport)
			reportsRoutes.GET("/:id/download", reportsHandler.DownloadReport)
			reportsRoutes.DELETE("/:id", reportsHandler.DeleteReport)
			
			// Quick reports
			reportsRoutes.GET("/conversations", reportsHandler.GetConversationReport)
			reportsRoutes.GET("/campaigns", reportsHandler.GetCampaignReport)
			
			// Scheduled reports
			reportsRoutes.POST("/schedule", reportsHandler.ScheduleReport)
		}

		// Analytics routes (require tenant context)
		analyticsRoutes := protected.Group("/analytics")
		analyticsRoutes.Use(middleware.TenantMiddleware(db))
		{
			// Dashboard
			analyticsRoutes.GET("/dashboard", analyticsHandler.GetDashboard)
			analyticsRoutes.GET("/realtime", analyticsHandler.GetRealtimeStats)
			analyticsRoutes.GET("/alerts", analyticsHandler.GetAlertsEndpoint)
			
			// Detailed analytics
			analyticsRoutes.GET("/conversations", analyticsHandler.GetConversationAnalytics)
			analyticsRoutes.GET("/campaigns", analyticsHandler.GetCampaignAnalytics)
			analyticsRoutes.GET("/agents", analyticsHandler.GetAgentPerformance)
			analyticsRoutes.GET("/system", analyticsHandler.GetSystemMetrics)
		}

		// Queue routes (require authentication)
		queueRoutes := protected.Group("/queue")
		{
			// Job management
			queueRoutes.POST("/jobs", queueHandler.EnqueueJob)
			queueRoutes.GET("/jobs", queueHandler.ListJobs)
			queueRoutes.GET("/jobs/:id", queueHandler.GetJob)
			queueRoutes.POST("/jobs/:id/cancel", queueHandler.CancelJob)
			
			// Queue statistics and monitoring
			queueRoutes.GET("/stats", queueHandler.GetSystemStats)
			queueRoutes.GET("/stats/:name", queueHandler.GetQueueStats)
			queueRoutes.GET("/health", queueHandler.GetHealthStatus)
			queueRoutes.POST("/:name/purge", middleware.RequireRole("admin"), queueHandler.PurgeQueue)
			
			// Scheduled jobs
			queueRoutes.POST("/schedules", queueHandler.CreateSchedule)
			queueRoutes.GET("/schedules", queueHandler.ListSchedules)
			queueRoutes.DELETE("/schedules/:name", queueHandler.DeleteSchedule)
		}

		// Settings routes (require authentication)
		settingsRoutes := protected.Group("/settings")
		{
			// System settings (admin only)
			systemSettings := settingsRoutes.Group("/system")
			systemSettings.Use(middleware.RequireRole("admin"))
			{
				systemSettings.GET("/", settingsHandler.GetSystemSettings)
				systemSettings.GET("/:key", settingsHandler.GetSystemSetting)
				systemSettings.PUT("/:key", settingsHandler.UpdateSystemSetting)
			}
			
			// Tenant settings (require tenant context)
			tenantSettings := settingsRoutes.Group("/tenant")
			tenantSettings.Use(middleware.TenantMiddleware(db))
			{
				tenantSettings.GET("/", settingsHandler.GetTenantSettings)
				tenantSettings.GET("/:key", settingsHandler.GetTenantSetting)
				tenantSettings.PUT("/:key", settingsHandler.UpdateTenantSetting)
				tenantSettings.DELETE("/:key", settingsHandler.DeleteTenantSetting)
			}
			
			// User settings
			userSettings := settingsRoutes.Group("/user")
			{
				userSettings.GET("/", settingsHandler.GetUserSettings)
				userSettings.PUT("/:key", settingsHandler.UpdateUserSetting)
			}
			
			// Configuration templates (admin only)
			templates := settingsRoutes.Group("/templates")
			templates.Use(middleware.RequireRole("admin"))
			{
				templates.GET("/", settingsHandler.GetConfigurationTemplates)
				templates.POST("/:template_id/apply", middleware.TenantMiddleware(db), settingsHandler.ApplyConfigurationTemplate)
			}
			
			// Feature flags
			featureFlags := settingsRoutes.Group("/features")
			{
				featureFlags.GET("/", settingsHandler.GetFeatureFlags)
				featureFlags.GET("/:key", settingsHandler.GetFeatureFlag)
				featureFlags.PUT("/:key", middleware.RequireRole("admin"), settingsHandler.UpdateFeatureFlag)
			}
			
			// Audit logs (admin only)
			audit := settingsRoutes.Group("/audit")
			audit.Use(middleware.RequireRole("admin"))
			{
				audit.GET("/", settingsHandler.GetSettingAuditLog)
			}
			
			// Effective setting (combines all levels)
			settingsRoutes.GET("/effective/:key", settingsHandler.GetEffectiveSetting)
		}

		// Admin routes (require admin role)
		admin := protected.Group("/admin")
		admin.Use(middleware.RequireRole("admin"))
		{
			admin.GET("/users", func(c *gin.Context) {
				c.JSON(200, gin.H{"message": "Admin users endpoint"})
			})
		}
	}
	
	// WebSocket routes (require authentication)
	router.GET("/ws", middleware.AuthMiddleware(db, rdb, cfg), wsHandler.HandleWebSocket)
	router.GET("/ws/stats", middleware.OptionalAuthMiddleware(db, rdb, cfg), wsHandler.GetStats)

	// Webhook routes (public but with signature verification)
	webhooks := router.Group("/webhooks")
	webhooks.Use(middleware.SecurityHeaders(middleware.WebhookSecurityHeadersConfig()))
	webhooks.Use(middleware.NoCache())
	{
		// WhatsApp webhooks
		whatsappWebhooks := webhooks.Group("/whatsapp")
		whatsappWebhooks.Use(middleware.WebhookMetrics("whatsapp"))
		whatsappWebhooks.Use(middleware.WhatsAppWebhookValidation(log))
		whatsappWebhooks.Use(middleware.WebhookRateLimiter(rdb, 100, log)) // 100 requests per minute for webhooks
		{
			whatsappWebhooks.GET("", whatsappHandler.VerifyWebhook)
			whatsappWebhooks.POST("", whatsappHandler.HandleWebhook)
		}
		
		// ERP webhooks
		erpWebhooks := webhooks.Group("/erp")
		erpWebhooks.Use(middleware.WebhookMetrics("erp"))
		erpWebhooks.Use(middleware.GenericWebhookValidation(&middleware.WebhookValidationConfig{
			SignatureHeader:    "X-Hub-Signature-256",
			SignaturePrefix:    "sha256=",
			TimestampHeader:    "X-Request-Timestamp",
			TimestampTolerance: 5 * time.Minute,
			RequireTimestamp:   true,
			RequireSignature:   true,
		}, log))
		erpWebhooks.Use(middleware.WebhookRateLimiter(rdb, 50, log)) // 50 requests per minute for ERP webhooks
		{
			erpWebhooks.POST("/:id", erpHandler.WebhookHandler)
		}
	}

	// Test authenticated endpoint
	router.GET("/test-auth", middleware.OptionalAuthMiddleware(db, rdb, cfg), func(c *gin.Context) {
		user, exists := c.Get("user")
		if exists {
			claims := user.(*auth.Claims)
			c.JSON(200, gin.H{
				"message":      "Hello authenticated user!",
				"user_id":      claims.UserID,
				"email":        claims.Email,
				"role":         claims.Role,
				"authenticated": true,
			})
		} else {
			c.JSON(200, gin.H{
				"message":       "Hello anonymous user!",
				"authenticated": false,
			})
		}
	})
}