package server

import (
	"github.com/gin-gonic/gin"
	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/logger"
	"github.com/pytake/pytake-go/internal/middleware"
	"github.com/pytake/pytake-go/internal/redis"
	"github.com/pytake/pytake-go/internal/routes"
	"github.com/pytake/pytake-go/internal/websocket"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Server represents the HTTP server
type Server struct {
	Config     *config.Config
	DB         *gorm.DB
	Redis      *redis.Client
	Logger     *logger.Logger
	Router     *gin.Engine
	WSHub      *websocket.Hub
	WSService  *websocket.Service
}

// New creates a new server instance
func New(cfg *config.Config, db *gorm.DB, rdb *redis.Client, log *logger.Logger) *Server {
	// Set Gin mode
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Create WebSocket hub
	zapLogger := zap.NewNop().Sugar()
	wsHub := websocket.NewHub(zapLogger)
	wsService := websocket.NewService(wsHub, zapLogger)

	// Start WebSocket hub
	go wsHub.Run()

	// Create server
	srv := &Server{
		Config:    cfg,
		DB:        db,
		Redis:     rdb,
		Logger:    log,
		Router:    router,
		WSHub:     wsHub,
		WSService: wsService,
	}

	// Setup middleware
	srv.setupMiddleware()

	// Setup routes
	srv.setupRoutes()

	return srv
}

func (s *Server) setupMiddleware() {
	// Recovery middleware
	s.Router.Use(gin.Recovery())

	// Logger middleware
	s.Router.Use(middleware.Logger(s.Logger))

	// CORS middleware
	s.Router.Use(middleware.CORS(s.Config))

	// Request ID middleware
	s.Router.Use(middleware.RequestID())

	// Rate limiter middleware
	s.Router.Use(middleware.RateLimiter(s.Redis, s.Config))
}

func (s *Server) setupRoutes() {
	// Health check
	s.Router.GET("/health", s.healthCheck)

	// API v1 routes
	v1 := s.Router.Group("/api/v1")
	{
		routes.SetupRoutes(v1, s.DB, s.Redis, s.Config, s.Logger, s.WSHub, s.WSService)
	}
}

func (s *Server) healthCheck(c *gin.Context) {
	// Check database
	sqlDB, err := s.DB.DB()
	dbHealthy := err == nil && sqlDB.Ping() == nil

	// Check Redis
	redisHealthy := s.Redis.Ping(c.Request.Context()).Err() == nil

	status := "healthy"
	if !dbHealthy || !redisHealthy {
		status = "unhealthy"
	}

	c.JSON(200, gin.H{
		"status":   status,
		"version":  s.Config.AppVersion,
		"database": dbHealthy,
		"redis":    redisHealthy,
	})
}