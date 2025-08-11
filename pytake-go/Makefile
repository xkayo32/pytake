.PHONY: help build run test clean docker-up docker-down migrate

# Variables
APP_NAME=pytake-api
MAIN_PATH=cmd/api/main.go
BUILD_DIR=bin
DOCKER_COMPOSE=docker-compose.yml

# Colors for output
GREEN=\033[0;32m
RED=\033[0;31m
NC=\033[0m # No Color

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  ${GREEN}%-15s${NC} %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install dependencies
	@echo "Installing dependencies..."
	@go mod download
	@go mod tidy

build: ## Build the application
	@echo "Building $(APP_NAME)..."
	@go build -o $(BUILD_DIR)/$(APP_NAME) $(MAIN_PATH)
	@echo "${GREEN}Build complete!${NC}"

run: ## Run the application
	@echo "Starting $(APP_NAME)..."
	@go run $(MAIN_PATH)

dev: docker-up ## Start development environment
	@echo "Starting development environment..."
	@air -c .air.toml || go run $(MAIN_PATH)

test: ## Run tests
	@echo "Running tests..."
	@go test -v -cover ./...

test-integration: docker-up ## Run integration tests
	@echo "Running integration tests..."
	@go test -v -tags=integration ./tests/...

test-coverage: ## Run tests with coverage report
	@echo "Running tests with coverage..."
	@go test -v -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "${GREEN}Coverage report generated: coverage.html${NC}"

lint: ## Run linter
	@echo "Running linter..."
	@golangci-lint run ./... || echo "Install golangci-lint: https://golangci-lint.run/usage/install/"

fmt: ## Format code
	@echo "Formatting code..."
	@go fmt ./...
	@echo "${GREEN}Code formatted!${NC}"

clean: ## Clean build artifacts
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@rm -f coverage.out coverage.html
	@echo "${GREEN}Clean complete!${NC}"

docker-up: ## Start Docker services
	@echo "Starting Docker services..."
	@docker-compose -f $(DOCKER_COMPOSE) up -d
	@echo "${GREEN}Docker services started!${NC}"

docker-down: ## Stop Docker services
	@echo "Stopping Docker services..."
	@docker-compose -f $(DOCKER_COMPOSE) down
	@echo "${GREEN}Docker services stopped!${NC}"

docker-logs: ## Show Docker logs
	@docker-compose -f $(DOCKER_COMPOSE) logs -f

migrate-up: ## Run database migrations
	@echo "Running migrations..."
	@go run cmd/migrate/main.go up

migrate-down: ## Rollback database migrations
	@echo "Rolling back migrations..."
	@go run cmd/migrate/main.go down

seed: ## Seed database with test data
	@echo "Seeding database..."
	@go run cmd/seed/main.go

check: fmt lint test ## Run all checks

all: clean install build test ## Build and test everything