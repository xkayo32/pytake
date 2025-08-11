package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/pytake/pytake-go/internal/auth"
	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/conversation"
	"github.com/pytake/pytake-go/internal/logger"
	"github.com/pytake/pytake-go/internal/middleware"
	"github.com/pytake/pytake-go/internal/redis"
	"github.com/pytake/pytake-go/internal/tenant"
	"github.com/pytake/pytake-go/internal/websocket"
	"github.com/pytake/pytake-go/internal/whatsapp"
	"gorm.io/gorm"
)

// SetupRoutes configures all API routes
func SetupRoutes(router *gin.RouterGroup, db *gorm.DB, rdb *redis.Client, cfg *config.Config, log *logger.Logger, wsHub *websocket.Hub, wsService *websocket.Service) {
	// Base route for testing
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "PyTake API v1",
			"version": cfg.AppVersion,
		})
	})

	// Create handlers
	authHandler := auth.NewHandler(db, rdb, cfg, log)
	tenantHandler := tenant.NewHandler(db, cfg, log)
	whatsappHandler := whatsapp.NewHandler(db, rdb, cfg, log)
	conversationHandler := conversation.NewHandler(db, rdb, cfg, log)
	wsHandler := websocket.NewHandler(wsHub, cfg, log)

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
	{
		webhooks.GET("/whatsapp", whatsappHandler.VerifyWebhook)
		webhooks.POST("/whatsapp", whatsappHandler.HandleWebhook)
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