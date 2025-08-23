package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"context"
	"strings"

	_ "github.com/lib/pq"
	"github.com/go-redis/redis/v8"
)

// InitDB initializes the PostgreSQL database connection
func InitDB() (*sql.DB, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL != "" {
		// Add sslmode=disable to DATABASE_URL if not present
		if dbURL != "" && !strings.Contains(dbURL, "sslmode=") {
			dbURL += "?sslmode=disable"
		}
	} else {
		// Fallback to individual env vars
		host := os.Getenv("POSTGRES_HOST")
		if host == "" {
			host = "localhost"
		}
		user := os.Getenv("POSTGRES_USER")
		if user == "" {
			user = "pytake_user"
		}
		password := os.Getenv("POSTGRES_PASSWORD")
		if password == "" {
			password = "Odc7/ffNnTnG4hkbwV+Sx2ZgK61rXW2r9U2o7Rd25DU="
		}
		dbname := os.Getenv("POSTGRES_DB")
		if dbname == "" {
			dbname = "pytake"
		}
		port := os.Getenv("POSTGRES_PORT")
		if port == "" {
			port = "5432"
		}

		dbURL = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", 
			host, port, user, password, dbname)
		log.Printf("🔍 Database connection - Host: %s, Port: %s, User: %s, DB: %s", host, port, user, dbname)
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %v", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %v", err)
	}

	log.Println("✅ Connected to PostgreSQL database")
	return db, nil
}

// InitRedis initializes the Redis connection
func InitRedis() *redis.Client {
	redisURL := os.Getenv("REDIS_URL")
	var rdb *redis.Client

	if redisURL != "" {
		opt, err := redis.ParseURL(redisURL)
		if err != nil {
			log.Printf("Failed to parse REDIS_URL: %v", err)
		} else {
			rdb = redis.NewClient(opt)
		}
	}

	if rdb == nil {
		// Fallback to individual env vars
		rdb = redis.NewClient(&redis.Options{
			Addr:     "localhost:6379",
			Password: os.Getenv("REDIS_PASSWORD"),
			DB:       0,
		})
	}

	ctx := context.Background()
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		log.Printf("⚠️ Failed to connect to Redis: %v", err)
	} else {
		log.Println("✅ Connected to Redis")
	}

	return rdb
}

