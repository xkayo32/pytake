package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/database"
	"github.com/pytake/pytake-go/internal/logger"
	"github.com/pytake/pytake-go/internal/redis"
	"github.com/pytake/pytake-go/internal/server"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// Initialize logger
	log := logger.New(cfg.LogLevel)
	log.Info("Starting PyTake API Server", "version", cfg.AppVersion)

	// Connect to database
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database", "error", err)
	}

	// Run migrations
	if err := database.Migrate(db); err != nil {
		log.Fatal("Failed to run migrations", "error", err)
	}

	// Connect to Redis
	rdb, err := redis.Connect(cfg)
	if err != nil {
		log.Fatal("Failed to connect to Redis", "error", err)
	}

	// Create server
	srv := server.New(cfg, db, rdb, log)

	// Start server
	httpServer := &http.Server{
		Addr:           fmt.Sprintf(":%s", cfg.AppPort),
		Handler:        srv.Router,
		ReadTimeout:    15 * time.Second,
		WriteTimeout:   15 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB
	}

	// Graceful shutdown
	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server", "error", err)
		}
	}()

	log.Info("Server started", "port", cfg.AppPort)

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown", "error", err)
	}

	log.Info("Server exited")
}