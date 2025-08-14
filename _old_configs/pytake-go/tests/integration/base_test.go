package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/database"
	"github.com/pytake/pytake-go/internal/logger"
	"github.com/pytake/pytake-go/internal/redis"
	"github.com/pytake/pytake-go/internal/server"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"
)

// TestSuite is the base test suite for integration tests
type TestSuite struct {
	suite.Suite
	Config *config.Config
	DB     *gorm.DB
	Redis  *redis.Client
	Server *server.Server
	Router *gin.Engine
}

// SetupSuite runs once before all tests
func (suite *TestSuite) SetupSuite() {
	// Load test environment
	godotenv.Load(".env.test")

	// Load configuration
	cfg, err := config.Load()
	suite.NoError(err)
	suite.Config = cfg

	// Connect to test database
	db, err := database.Connect(cfg)
	suite.NoError(err)
	suite.DB = db

	// Run migrations
	err = database.Migrate(db)
	suite.NoError(err)

	// Connect to Redis
	rdb, err := redis.Connect(cfg)
	suite.NoError(err)
	suite.Redis = rdb

	// Create logger
	log := logger.New("error")

	// Create server
	suite.Server = server.New(cfg, db, rdb, log)
	suite.Router = suite.Server.Router
}

// TearDownSuite runs once after all tests
func (suite *TestSuite) TearDownSuite() {
	// Clean up database
	sqlDB, _ := suite.DB.DB()
	sqlDB.Close()

	// Clean up Redis
	suite.Redis.Close()
}

// SetupTest runs before each test
func (suite *TestSuite) SetupTest() {
	// Clean database tables
	suite.CleanDatabase()
}

// CleanDatabase removes all data from tables
func (suite *TestSuite) CleanDatabase() {
	tables := []string{
		"messages",
		"conversations",
		"contacts",
		"whats_app_configs",
		"users",
		"tenants",
	}

	for _, table := range tables {
		suite.DB.Exec(fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
	}
}

// MakeRequest helper for making HTTP requests
func (suite *TestSuite) MakeRequest(method, path string, body interface{}, headers map[string]string) *httptest.ResponseRecorder {
	var req *http.Request

	if body != nil {
		jsonBody, _ := json.Marshal(body)
		req = httptest.NewRequest(method, path, bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}

	// Add headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	w := httptest.NewRecorder()
	suite.Router.ServeHTTP(w, req)

	return w
}

// AssertJSONResponse helper for asserting JSON responses
func (suite *TestSuite) AssertJSONResponse(w *httptest.ResponseRecorder, expectedStatus int, response interface{}) {
	suite.Equal(expectedStatus, w.Code)

	if response != nil {
		err := json.Unmarshal(w.Body.Bytes(), response)
		suite.NoError(err)
	}
}

// WaitForCondition waits for a condition to be true
func (suite *TestSuite) WaitForCondition(condition func() bool, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if condition() {
			return true
		}
		time.Sleep(100 * time.Millisecond)
	}
	return false
}